import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import PageHeader from "@/components/shared/PageHeader";
import DataTable from "@/components/shared/DataTable";
import StatusBadge from "@/components/shared/StatusBadge";
import FormDialog from "@/components/shared/FormDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Upload, ExternalLink, X, Package, AlertCircle } from "lucide-react";
import { uploadAndRegister } from "@/components/shared/uploadAndRegister";

const STATUS_LABELS = {
  pending: "Pending Reception",
  partial: "Partial Reception",
  complete: "Reception Completed",
  rejected: "Rejected",
};

export default function Reception() {
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ status: "pending", items: [], documents: [] });
  const [uploading, setUploading] = useState(false);
  const [itemError, setItemError] = useState("");
  const queryClient = useQueryClient();

  const { data: receptions = [], isLoading } = useQuery({
    queryKey: ["receptions"],
    queryFn: () => base44.entities.Reception.list("-created_date"),
  });
  const { data: projects = [] } = useQuery({ queryKey: ["projects"], queryFn: () => base44.entities.Project.list() });
  const { data: articles = [] } = useQuery({ queryKey: ["articles"], queryFn: () => base44.entities.Article.list() });
  const { data: purchaseOrders = [] } = useQuery({ queryKey: ["purchase-orders"], queryFn: () => base44.entities.PurchaseOrder.list() });
  const { data: suppliers = [] } = useQuery({ queryKey: ["suppliers"], queryFn: () => base44.entities.Supplier.list() });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const allItems = data.items || [];

      // Validate: received qty cannot exceed ordered qty
      for (const item of allItems) {
        if ((item.received_qty || 0) > (item.ordered_qty || 0)) {
          throw new Error(`Received quantity for "${item.article_name}" cannot exceed ordered quantity (${item.ordered_qty}).`);
        }
      }

      // Auto-determine status from quantities
      let autoStatus = "pending";
      if (allItems.length > 0) {
        const allComplete = allItems.every(i => (i.received_qty || 0) >= (i.ordered_qty || 0) && (i.ordered_qty || 0) > 0);
        const anyReceived = allItems.some(i => (i.received_qty || 0) > 0);
        if (allComplete) autoStatus = "complete";
        else if (anyReceived) autoStatus = "partial";
      }

      const payload = { ...data, status: autoStatus };
      const rec = editing
        ? await base44.entities.Reception.update(editing.id, payload)
        : await base44.entities.Reception.create(payload);

      // Create IN stock movements for newly received items only (delta)
      if (autoStatus === "complete" || autoStatus === "partial") {
        const freshArticles = await base44.entities.Article.list();
        for (const item of allItems) {
          if (!item.article_id) continue;
          const prevItem = (editing?.items || []).find(i => i.article_id === item.article_id);
          const prevReceived = prevItem?.received_qty || 0;
          const newlyReceived = (item.received_qty || 0) - prevReceived;
          if (newlyReceived > 0) {
            await base44.entities.StockMovement.create({
              article_id: item.article_id,
              article_name: item.article_name,
              movement_type: "IN",
              quantity: newlyReceived,
              date: data.delivery_date || new Date().toISOString().split("T")[0],
              project_id: data.project_id,
              project_name: data.project_name,
              purchase_order_id: data.purchase_order_id,
              responsible: data.received_by,
              notes: `Reception from ${data.supplier} — ref: ${data.purchase_order_ref || rec.id?.slice(-6)}`,
            });
            const art = freshArticles.find(a => a.id === item.article_id);
            if (art) {
              await base44.entities.Article.update(art.id, { current_stock: (art.current_stock || 0) + newlyReceived });
            }
          }
        }
        queryClient.invalidateQueries({ queryKey: ["stock-movements"] });
        queryClient.invalidateQueries({ queryKey: ["articles"] });
      }

      // Create a pending "remaining delivery" reception only when going partial for the first time:
      // - new record that is partial, OR
      // - editing a pending record that becomes partial (first partial delivery)
      // Do NOT create if editing a record that was already partial (sibling already exists)
      const isFirstPartial = autoStatus === "partial" && (!editing || editing.status === "pending");
      if (isFirstPartial) {
        const remainingItems = allItems
          .map(i => ({
            ...i,
            ordered_qty: (i.ordered_qty || 0) - (i.received_qty || 0),
            received_qty: 0,
            rejected_qty: 0,
          }))
          .filter(i => i.ordered_qty > 0);
        if (remainingItems.length > 0) {
          await base44.entities.Reception.create({
            supplier: data.supplier,
            supplier_id: data.supplier_id,
            purchase_order_id: data.purchase_order_id,
            purchase_order_ref: data.purchase_order_ref,
            project_id: data.project_id,
            project_name: data.project_name,
            status: "pending",
            items: remainingItems,
            documents: [],
            notes: `Remaining delivery — partial ref: ${rec.id?.slice(-6)}`,
          });
        }
      }

      // Update linked PO status
      if (data.purchase_order_id) {
        const newPoStatus = autoStatus === "complete" ? "received"
          : autoStatus === "partial" ? "partially_received"
          : null;
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
      setItemError("");
    },
    onError: (err) => {
      setItemError(err.message);
    },
  });

  const openForm = (rec = null) => {
    setEditing(rec);
    setItemError("");
    if (rec) {
      setForm({ ...rec, items: rec.items || [], documents: rec.documents || [] });
    } else {
      setForm({ status: "pending", items: [], documents: [] });
    }
    setShowForm(true);
  };

  const selectPO = (poId) => {
    const po = purchaseOrders.find(o => o.id === poId);
    if (!po) return;
    const items = (po.items || []).map(i => ({
      article_id: i.article_id,
      article_name: i.article_name,
      ordered_qty: i.quantity,
      received_qty: 0,
      rejected_qty: 0,
      unit: i.unit || "",
    }));
    setForm(f => ({
      ...f,
      purchase_order_id: poId,
      purchase_order_ref: po.order_number || `PO-${po.id?.slice(-6)}`,
      supplier: po.supplier,
      supplier_id: po.supplier_id,
      project_id: po.project_id,
      project_name: po.project_name,
      items,
    }));
  };

  const updateItemField = (i, field, val) => {
    setItemError("");
    const items = [...form.items];
    items[i] = { ...items[i], [field]: parseFloat(val) || 0 };
    setForm({ ...form, items });
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

  const filtered = receptions.filter(r =>
    !search || r.supplier?.toLowerCase().includes(search.toLowerCase()) || r.project_name?.toLowerCase().includes(search.toLowerCase())
  );

  const statusColor = {
    pending: "bg-warning/10 text-warning border-warning/20",
    partial: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    complete: "bg-success/10 text-success border-success/20",
    rejected: "bg-destructive/10 text-destructive border-destructive/20",
  };

  const columns = [
    { header: "Supplier", cell: (row) => <div><p className="font-medium">{row.supplier}</p><p className="text-xs text-muted-foreground">{row.purchase_order_ref}</p></div> },
    { header: "Project", accessor: "project_name" },
    { header: "Delivery Date", cell: (row) => row.delivery_date ? format(new Date(row.delivery_date), "MMM d, yyyy") : "—" },
    { header: "Received by", accessor: "received_by" },
    { header: "Items", cell: (row) => <span className="text-xs">{(row.items || []).length} articles</span> },
    { header: "Status", cell: (row) => (
      <Badge variant="outline" className={`text-xs ${statusColor[row.status] || ""}`}>
        {STATUS_LABELS[row.status] || row.status}
      </Badge>
    )},
    { header: "", cell: (row) => <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => openForm(row)}>
      {row.status === "pending" ? "Process" : "Edit"}
    </Button> },
  ];

  return (
    <div className="space-y-4">
      <PageHeader title="Reception" subtitle={`${receptions.length} receptions`} onAdd={() => openForm()} addLabel="New Reception" searchValue={search} onSearch={setSearch} />
      <DataTable columns={columns} data={filtered} isLoading={isLoading} />

      <FormDialog open={showForm} onOpenChange={setShowForm} title={editing ? `Reception — ${STATUS_LABELS[editing.status] || editing.status}` : "New Reception"}>
        <div className="space-y-4">
          {/* Link to PO */}
          <div>
            <Label>Link to Purchase Order</Label>
            <Select value={form.purchase_order_id || ""} onValueChange={selectPO}>
              <SelectTrigger><SelectValue placeholder="Select a PO to auto-fill..." /></SelectTrigger>
              <SelectContent>
                {purchaseOrders.filter(o => o.status !== "received").map(o => (
                  <SelectItem key={o.id} value={o.id}>{o.order_number || `PO-${o.id?.slice(-6)}`} — {o.supplier}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Supplier *</Label>
              <Select value={form.supplier_id || ""} onValueChange={(v) => {
                const s = suppliers.find(x => x.id === v);
                setForm({ ...form, supplier_id: v, supplier: s?.name || "" });
              }}>
                <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
                <SelectContent>
                  {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
              {!form.supplier_id && (
                <Input className="mt-1" placeholder="Or type supplier name" value={form.supplier || ""} onChange={(e) => setForm({ ...form, supplier: e.target.value })} />
              )}
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
              <Label>Project</Label>
              <Select value={form.project_id || ""} onValueChange={(v) => { const p = projects.find(x => x.id === v); setForm({ ...form, project_id: v, project_name: p?.name || "" }); }}>
                <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>No project</SelectItem>
                  {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Articles */}
          <div>
            <Label className="mb-2 block">Received Articles</Label>
            {(form.items || []).length === 0 ? (
              <p className="text-sm text-muted-foreground">Link a Purchase Order above to auto-fill articles.</p>
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-12 gap-2 text-xs text-muted-foreground px-2">
                  <span className="col-span-4">Article</span>
                  <span className="col-span-2">Ordered</span>
                  <span className="col-span-2">Received</span>
                  <span className="col-span-2">Rejected</span>
                  <span className="col-span-2">Remaining</span>
                </div>
                {form.items.map((item, i) => {
                  const remaining = (item.ordered_qty || 0) - (item.received_qty || 0) - (item.rejected_qty || 0);
                  const overQty = (item.received_qty || 0) > (item.ordered_qty || 0);
                  return (
                    <div key={i} className={`grid grid-cols-12 gap-2 items-center p-2 rounded-lg ${overQty ? "bg-destructive/10 border border-destructive/30" : "bg-muted/30"}`}>
                      <span className="col-span-4 text-sm flex items-center gap-1"><Package className="w-3 h-3 text-muted-foreground" />{item.article_name}</span>
                      <span className="col-span-2 text-sm font-medium">{item.ordered_qty || 0}</span>
                      <Input
                        type="number" min="0" max={item.ordered_qty}
                        className="col-span-2 h-7 text-xs"
                        value={item.received_qty || ""}
                        onChange={(e) => updateItemField(i, "received_qty", e.target.value)}
                      />
                      <Input
                        type="number" min="0"
                        className="col-span-2 h-7 text-xs"
                        value={item.rejected_qty || ""}
                        onChange={(e) => updateItemField(i, "rejected_qty", e.target.value)}
                      />
                      <span className={`col-span-2 text-xs font-medium ${remaining > 0 ? "text-warning" : "text-success"}`}>{Math.max(0, remaining)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {itemError && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" /> {itemError}
            </div>
          )}

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
                <X className="w-3 h-3 cursor-pointer text-muted-foreground" onClick={() => setForm({ ...form, documents: form.documents.filter((_, idx) => idx !== i) })} />
              </div>
            ))}
          </div>

          <div>
            <Label>Notes</Label>
            <Textarea value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending || (!form.supplier && !form.supplier_id)}>
              {saveMutation.isPending ? "Processing..." : "Validate Reception"}
            </Button>
          </div>
        </div>
      </FormDialog>
    </div>
  );
}