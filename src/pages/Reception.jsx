import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import PageHeader from "@/components/shared/PageHeader";
import DataTable from "@/components/shared/DataTable";
import StatusBadge from "@/components/shared/StatusBadge";
import FormDialog from "@/components/shared/FormDialog";
import SearchableSelect from "@/components/shared/SearchableSelect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Upload, ExternalLink, Plus, X, Package, Link as LinkIcon } from "lucide-react";
import { uploadAndRegister } from "@/components/shared/uploadAndRegister";

export default function Reception() {
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ status: "pending", items: [], documents: [] });
  const [uploading, setUploading] = useState(false);
  const queryClient = useQueryClient();

  const { data: receptions = [], isLoading } = useQuery({
    queryKey: ["receptions"],
    queryFn: () => base44.entities.Reception.list("-created_date"),
  });
  const { data: projects = [] } = useQuery({ queryKey: ["projects"], queryFn: () => base44.entities.Project.list() });
  const { data: articles = [] } = useQuery({ queryKey: ["articles"], queryFn: () => base44.entities.Article.list() });
  const { data: purchaseOrders = [] } = useQuery({ queryKey: ["purchase-orders"], queryFn: () => base44.entities.PurchaseOrder.list() });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const rec = editing
        ? await base44.entities.Reception.update(editing.id, data)
        : await base44.entities.Reception.create(data);

      // Auto-create IN stock movements for received items (only for new or status changes)
      const prevStatus = editing?.status;
      const isNewOrStatusChanged = !editing || data.status !== prevStatus;
      if (isNewOrStatusChanged && (data.status === "complete" || data.status === "partial")) {
        for (const item of (data.items || [])) {
          if (item.article_id && item.received_qty > 0) {
            await base44.entities.StockMovement.create({
              article_id: item.article_id,
              article_name: item.article_name,
              movement_type: "IN",
              quantity: item.received_qty,
              date: data.delivery_date || new Date().toISOString().split("T")[0],
              project_id: data.project_id,
              project_name: data.project_name,
              responsible: data.received_by,
              notes: `Auto from reception — ${data.supplier}`,
            });
            // Update article stock
            const art = articles.find(a => a.id === item.article_id);
            if (art) {
              await base44.entities.Article.update(art.id, {
                current_stock: (art.current_stock || 0) + item.received_qty,
              });
            }
          }
        }
        queryClient.invalidateQueries({ queryKey: ["stock-movements"] });
        queryClient.invalidateQueries({ queryKey: ["articles"] });
      }

      // Update linked purchase order status
      if (data.purchase_order_id) {
        const newPoStatus = data.status === "complete" ? "received" : data.status === "partial" ? "partially_received" : null;
        if (newPoStatus) {
          await base44.entities.PurchaseOrder.update(data.purchase_order_id, { status: newPoStatus });
          queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
        }
      }

      return rec;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["receptions"] });
      setShowForm(false);
      setEditing(null);
    },
  });

  const openForm = (rec = null) => {
    setEditing(rec);
    setForm(rec || { status: "pending", items: [], documents: [] });
    setShowForm(true);
  };

  const addItem = (article) => {
    if (form.items?.some(i => i.article_id === article.id)) return;
    setForm({ ...form, items: [...(form.items || []), { article_id: article.id, article_name: article.label, ordered_qty: 1, received_qty: 0 }] });
  };

  const uploadDoc = async (e, docType) => {
    const file = e.target.files[0]; if (!file) return;
    setUploading(true);
    const { file_url } = await uploadAndRegister(file, {
      module: "reception",
      projectId: form.project_id,
      projectName: form.project_name,
      docType,
    });
    setForm(prev => ({ ...prev, documents: [...(prev.documents || []), { name: file.name, type: docType, file_url }] }));
    setUploading(false);
  };

  const removeDoc = (i) => setForm({ ...form, documents: form.documents.filter((_, idx) => idx !== i) });

  const filtered = receptions.filter(r =>
    !search || r.supplier?.toLowerCase().includes(search.toLowerCase()) || r.project_name?.toLowerCase().includes(search.toLowerCase())
  );

  const columns = [
    { header: "Supplier", cell: (row) => <div><p className="font-medium">{row.supplier}</p><p className="text-xs text-muted-foreground">{row.purchase_order_ref}</p></div> },
    { header: "Project", accessor: "project_name" },
    { header: "Delivery Date", cell: (row) => row.delivery_date ? format(new Date(row.delivery_date), "MMM d, yyyy") : "—" },
    { header: "Received by", accessor: "received_by" },
    { header: "Items", cell: (row) => <span className="text-xs">{(row.items || []).length} articles</span> },
    { header: "Docs", cell: (row) => <span className="text-xs">{(row.documents || []).length} files</span> },
    { header: "Status", cell: (row) => <StatusBadge status={row.status} /> },
    { header: "", cell: (row) => <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => openForm(row)}>Edit</Button> },
  ];

  return (
    <div className="space-y-4">
      <PageHeader title="Reception" subtitle={`${receptions.length} receptions`} onAdd={() => openForm()} addLabel="New Reception" searchValue={search} onSearch={setSearch} />
      <DataTable columns={columns} data={filtered} isLoading={isLoading} />

      <FormDialog open={showForm} onOpenChange={setShowForm} title={editing ? "Edit Reception" : "New Reception"}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Supplier</Label>
              <Input value={form.supplier || ""} onChange={(e) => setForm({ ...form, supplier: e.target.value })} />
            </div>
            <div>
              <Label>Purchase Order Ref.</Label>
              <Input value={form.purchase_order_ref || ""} onChange={(e) => setForm({ ...form, purchase_order_ref: e.target.value })} />
            </div>
            <div>
              <Label>Delivery Date</Label>
              <Input type="date" value={form.delivery_date || ""} onChange={(e) => setForm({ ...form, delivery_date: e.target.value })} />
            </div>
            <div>
              <Label>Received By</Label>
              <Input value={form.received_by || ""} onChange={(e) => setForm({ ...form, received_by: e.target.value })} />
            </div>
            <div>
              <Label>Linked Purchase Order</Label>
              <Select value={form.purchase_order_id || ""} onValueChange={(v) => setForm({ ...form, purchase_order_id: v || "" })}>
                <SelectTrigger><SelectValue placeholder="Link to PO (optional)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>None</SelectItem>
                  {purchaseOrders.filter(o => o.status !== "received").map(o => (
                    <SelectItem key={o.id} value={o.id}>{o.order_number || `PO-${o.id?.slice(-6)}`} — {o.supplier}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Project</Label>
              <Select value={form.project_id || ""} onValueChange={(v) => { const p = projects.find(x => x.id === v); setForm({ ...form, project_id: v, project_name: p?.name || "" }); }}>
                <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>No project</SelectItem>
                  {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status || "pending"} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                  <SelectItem value="complete">Complete</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Articles */}
          <div>
            <Label className="mb-1 block">Received Articles</Label>
            <SearchableSelect items={articles.map(a => ({ id: a.id, label: a.name }))} onSelect={addItem} placeholder="Add article..." />
            {(form.items || []).length > 0 && (
              <div className="mt-2 space-y-2">
                {form.items.map((item, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
                    <Package className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className="flex-1 text-sm">{item.article_name}</span>
                    <div className="flex items-center gap-2">
                      <Input type="number" className="w-20 h-7 text-xs" placeholder="Ordered" value={item.ordered_qty || ""} onChange={(e) => { const items = [...form.items]; items[i].ordered_qty = parseFloat(e.target.value) || 0; setForm({ ...form, items }); }} />
                      <Input type="number" className="w-20 h-7 text-xs" placeholder="Received" value={item.received_qty || ""} onChange={(e) => { const items = [...form.items]; items[i].received_qty = parseFloat(e.target.value) || 0; setForm({ ...form, items }); }} />
                      <X className="w-4 h-4 cursor-pointer text-muted-foreground" onClick={() => setForm({ ...form, items: form.items.filter((_, idx) => idx !== i) })} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Documents */}
          <div>
            <Label className="mb-1 block">Documents</Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {["BL", "BC", "invoice", "other"].map(type => (
                <label key={type} className="flex items-center gap-1.5 cursor-pointer px-3 py-1.5 rounded-md border border-dashed border-border hover:bg-muted/30 text-xs text-muted-foreground">
                  <Upload className="w-3 h-3" /> {type}
                  <input type="file" className="hidden" onChange={(e) => uploadDoc(e, type)} />
                </label>
              ))}
              {uploading && <span className="text-xs text-muted-foreground self-center">Uploading...</span>}
            </div>
            {(form.documents || []).map((doc, i) => (
              <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 mb-1">
                <Badge variant="outline" className="text-xs">{doc.type}</Badge>
                <span className="flex-1 text-xs truncate">{doc.name}</span>
                <a href={doc.file_url} target="_blank" rel="noopener noreferrer"><ExternalLink className="w-3 h-3 text-primary" /></a>
                <X className="w-3 h-3 cursor-pointer text-muted-foreground" onClick={() => removeDoc(i)} />
              </div>
            ))}
          </div>

          <div>
            <Label>Notes</Label>
            <Textarea value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Saving..." : "Save & Create Stock Movements"}
            </Button>
          </div>
        </div>
      </FormDialog>
    </div>
  );
}