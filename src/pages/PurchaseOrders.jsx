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
import { X, Package, Plus } from "lucide-react";
import { useCurrency } from "@/components/shared/currency";
import CurrencyInput from "@/components/shared/CurrencyInput";

export default function PurchaseOrders() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ status: "ordered", items: [] });
  const queryClient = useQueryClient();

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["purchase-orders"],
    queryFn: () => base44.entities.PurchaseOrder.list("-created_date"),
  });
  const { data: projects = [] } = useQuery({ queryKey: ["projects"], queryFn: () => base44.entities.Project.list() });
  const { data: articles = [] } = useQuery({ queryKey: ["articles"], queryFn: () => base44.entities.Article.list() });
  const { data: suppliers = [] } = useQuery({ queryKey: ["suppliers"], queryFn: () => base44.entities.Supplier.list() });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const totalAmount = (data.items || []).reduce((s, i) => s + (i.total || 0), 0);
      const payload = { ...data, total_amount: totalAmount };
      return editing
        ? base44.entities.PurchaseOrder.update(editing.id, payload)
        : base44.entities.PurchaseOrder.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      setShowForm(false);
      setEditing(null);
    },
  });

  const openForm = (order = null) => {
    setEditing(order);
    setForm(order ? { ...order } : { status: "ordered", items: [], order_date: new Date().toISOString().split("T")[0] });
    setShowForm(true);
  };

  const addItem = (article) => {
    if (form.items?.some(i => i.article_id === article.id)) return;
    setForm({
      ...form,
      items: [...(form.items || []), { article_id: article.id, article_name: article.label, quantity: 1, unit_price: 0, total: 0 }]
    });
  };

  const updateItem = (idx, field, val) => {
    const items = [...form.items];
    items[idx] = { ...items[idx], [field]: parseFloat(val) || 0 };
    items[idx].total = (items[idx].quantity || 0) * (items[idx].unit_price || 0);
    setForm({ ...form, items });
  };

  const totalAmount = (form.items || []).reduce((s, i) => s + (i.total || 0), 0);

  const filtered = orders.filter(o => {
    const matchSearch = !search || o.supplier?.toLowerCase().includes(search.toLowerCase()) || o.order_number?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || o.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const columns = [
    { header: "Order #", cell: (row) => <div><p className="font-medium">{row.order_number || `PO-${row.id?.slice(-6)}`}</p><p className="text-xs text-muted-foreground">{row.supplier}</p></div> },
    { header: "Project", accessor: "project_name" },
    { header: "Items", cell: (row) => <span className="text-xs">{(row.items || []).length} articles</span> },
    { header: "Total", cell: (row) => <span className="font-semibold text-sm">€{(row.total_amount || 0).toLocaleString()}</span> },
    { header: "Order Date", cell: (row) => row.order_date ? format(new Date(row.order_date), "MMM d, yyyy HH:mm") : "—" },
    { header: "Expected Delivery", cell: (row) => row.expected_delivery_date ? format(new Date(row.expected_delivery_date), "MMM d, yyyy") : "—" },
    { header: "Status", cell: (row) => <StatusBadge status={row.status} /> },
    { header: "", cell: (row) => <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => openForm(row)}>Edit</Button> },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Purchase Orders"
        subtitle={`${orders.length} orders`}
        onAdd={() => openForm()}
        addLabel="New Order"
        searchValue={search}
        onSearch={setSearch}
      >
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40 bg-card"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="ordered">Ordered</SelectItem>
            <SelectItem value="partially_received">Partially Received</SelectItem>
            <SelectItem value="received">Received</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </PageHeader>

      <DataTable columns={columns} data={filtered} isLoading={isLoading} />

      <FormDialog open={showForm} onOpenChange={setShowForm} title={editing ? "Edit Purchase Order" : "New Purchase Order"}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Order Number</Label>
              <Input placeholder="PO-2024-001" value={form.order_number || ""} onChange={(e) => setForm({ ...form, order_number: e.target.value })} />
            </div>
            <div>
              <Label>Supplier *</Label>
              <Select value={form.supplier_id || ""} onValueChange={(v) => {
                const s = suppliers.find(x => x.id === v);
                setForm({ ...form, supplier_id: v, supplier: s?.name || s?.company_name || "" });
              }}>
                <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
                <SelectContent>
                  {suppliers.filter(s => s.status === "active").map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}{s.company_name ? ` — ${s.company_name}` : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!form.supplier_id && (
                <Input className="mt-1" placeholder="Or type supplier name manually" value={form.supplier || ""} onChange={(e) => setForm({ ...form, supplier: e.target.value })} />
              )}
            </div>
            <div>
              <Label>Project</Label>
              <Select value={form.project_id || ""} onValueChange={(v) => { const p = projects.find(x => x.id === v); setForm({ ...form, project_id: v, project_name: p?.name || "" }); }}>
                <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
                <SelectContent>
                  {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status || "ordered"} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ordered">Ordered</SelectItem>
                  <SelectItem value="partially_received">Partially Received</SelectItem>
                  <SelectItem value="received">Received</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Order Date & Time</Label>
              <Input type="datetime-local" value={form.order_date || ""} onChange={(e) => setForm({ ...form, order_date: e.target.value })} />
            </div>
            <div>
              <Label>Expected Delivery</Label>
              <Input type="date" value={form.expected_delivery_date || ""} onChange={(e) => setForm({ ...form, expected_delivery_date: e.target.value })} />
            </div>
          </div>

          {/* Articles / Items */}
          <div>
            <Label className="mb-2 block">Order Items</Label>
            <SearchableSelect
              items={articles.map(a => ({ id: a.id, label: a.name }))}
              onSelect={addItem}
              placeholder="Add article..."
            />
            {(form.items || []).length > 0 && (
              <div className="mt-3 space-y-2">
                <div className="grid grid-cols-12 gap-2 text-xs text-muted-foreground px-2">
                  <span className="col-span-4">Article</span>
                  <span className="col-span-2">Qty</span>
                  <span className="col-span-3">Unit Price €</span>
                  <span className="col-span-2">Total €</span>
                </div>
                {form.items.map((item, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-center p-2 rounded-lg bg-muted/30">
                    <span className="col-span-4 text-sm flex items-center gap-1.5"><Package className="w-3.5 h-3.5 text-muted-foreground shrink-0" />{item.article_name}</span>
                    <Input type="number" className="col-span-2 h-7 text-xs" value={item.quantity || ""} onChange={(e) => updateItem(i, "quantity", e.target.value)} />
                    <Input type="number" className="col-span-3 h-7 text-xs" value={item.unit_price || ""} onChange={(e) => updateItem(i, "unit_price", e.target.value)} />
                    <span className="col-span-2 text-xs font-semibold">€{(item.total || 0).toFixed(0)}</span>
                    <X className="col-span-1 w-3.5 h-3.5 cursor-pointer text-muted-foreground" onClick={() => setForm({ ...form, items: form.items.filter((_, idx) => idx !== i) })} />
                  </div>
                ))}
                <div className="text-right text-sm font-bold pt-2 pr-2">Total: €{totalAmount.toLocaleString()}</div>
              </div>
            )}
          </div>

          <div>
            <Label>Notes</Label>
            <Textarea value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending || !form.supplier}>
              {saveMutation.isPending ? "Saving..." : "Save Order"}
            </Button>
          </div>
        </div>
      </FormDialog>
    </div>
  );
}