import React, { useState, useRef } from "react";
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
import { format } from "date-fns";
import { Download, Plus, X } from "lucide-react";

export default function Invoices() {
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ type: "client", status: "draft", items: [], tax_rate: 20 });
  const queryClient = useQueryClient();

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["invoices"],
    queryFn: () => base44.entities.Invoice.list("-created_date"),
  });
  const { data: projects = [] } = useQuery({ queryKey: ["projects"], queryFn: () => base44.entities.Project.list() });
  const { data: subs = [] } = useQuery({ queryKey: ["subcontractors"], queryFn: () => base44.entities.Subcontractor.list() });

  const saveMutation = useMutation({
    mutationFn: (data) => editing
      ? base44.entities.Invoice.update(editing.id, data)
      : base44.entities.Invoice.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      setShowForm(false);
      setEditing(null);
    },
  });

  const openForm = (inv = null) => {
    setEditing(inv);
    setForm(inv || { type: "client", status: "draft", items: [], tax_rate: 20 });
    setShowForm(true);
  };

  const addItem = () => setForm({ ...form, items: [...(form.items || []), { description: "", quantity: 1, unit_price: 0 }] });
  const updateItem = (i, field, val) => {
    const items = [...(form.items || [])];
    items[i][field] = field === "description" ? val : parseFloat(val) || 0;
    setForm({ ...form, items });
  };

  const subtotal = (form.items || []).reduce((s, item) => s + (item.quantity || 0) * (item.unit_price || 0), 0);
  const tax = subtotal * ((form.tax_rate || 20) / 100);
  const total = subtotal + tax;

  const exportPDF = async (inv) => {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text("INVOICE", 20, 20);
    doc.setFontSize(12);
    doc.text(`Invoice #: ${inv.invoice_number || inv.id?.substring(0, 8)}`, 20, 35);
    doc.text(`Date: ${inv.date ? format(new Date(inv.date), "MMM d, yyyy") : "—"}`, 20, 45);
    doc.text(`Due: ${inv.due_date ? format(new Date(inv.due_date), "MMM d, yyyy") : "—"}`, 20, 55);
    doc.text(`To: ${inv.recipient}`, 20, 65);
    doc.text(`Project: ${inv.project_name || "—"}`, 20, 75);
    let y = 95;
    doc.setFillColor(240, 240, 240);
    doc.rect(20, y - 6, 170, 10, "F");
    doc.text("Description", 22, y); doc.text("Qty", 110, y); doc.text("Unit Price", 130, y); doc.text("Total", 160, y);
    y += 10;
    (inv.items || []).forEach(item => {
      doc.text(String(item.description || ""), 22, y);
      doc.text(String(item.quantity || 1), 110, y);
      doc.text(`€${item.unit_price || 0}`, 130, y);
      doc.text(`€${((item.quantity || 1) * (item.unit_price || 0)).toFixed(2)}`, 160, y);
      y += 10;
    });
    y += 10;
    doc.text(`Subtotal: €${(inv.amount || 0).toFixed(2)}`, 130, y); y += 8;
    doc.text(`Tax (${inv.tax_rate || 20}%): €${((inv.amount || 0) * (inv.tax_rate || 20) / 100).toFixed(2)}`, 130, y); y += 8;
    doc.setFontSize(14);
    doc.text(`TOTAL: €${((inv.amount || 0) * (1 + (inv.tax_rate || 20) / 100)).toFixed(2)}`, 130, y);
    doc.save(`invoice_${inv.invoice_number || inv.id?.substring(0, 8)}.pdf`);
  };

  const filtered = invoices.filter(inv =>
    !search || inv.recipient?.toLowerCase().includes(search.toLowerCase()) || inv.project_name?.toLowerCase().includes(search.toLowerCase())
  );

  const columns = [
    { header: "Invoice #", cell: (row) => <div><p className="font-medium font-mono text-xs">{row.invoice_number || row.id?.substring(0, 8)}</p><StatusBadge status={row.type} /></div> },
    { header: "Recipient", accessor: "recipient" },
    { header: "Project", accessor: "project_name" },
    { header: "Amount", cell: (row) => <span className="font-semibold">€{(row.amount || 0).toLocaleString()}</span> },
    { header: "Date", cell: (row) => row.date ? format(new Date(row.date), "MMM d, yyyy") : "—" },
    { header: "Due", cell: (row) => row.due_date ? format(new Date(row.due_date), "MMM d, yyyy") : "—" },
    { header: "Status", cell: (row) => <StatusBadge status={row.status} /> },
    { header: "", cell: (row) => (
      <div className="flex gap-1">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => exportPDF(row)}><Download className="w-4 h-4" /></Button>
        <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => openForm(row)}>Edit</Button>
      </div>
    )},
  ];

  return (
    <div className="space-y-4">
      <PageHeader title="Invoices" subtitle={`${invoices.length} invoices`} onAdd={() => openForm()} addLabel="New Invoice" searchValue={search} onSearch={setSearch} />
      <DataTable columns={columns} data={filtered} isLoading={isLoading} />

      <FormDialog open={showForm} onOpenChange={setShowForm} title={editing ? "Edit Invoice" : "New Invoice"}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Invoice Number</Label><Input value={form.invoice_number || ""} onChange={(e) => setForm({ ...form, invoice_number: e.target.value })} placeholder="INV-001" /></div>
            <div>
              <Label>Type</Label>
              <Select value={form.type || "client"} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="client">Client</SelectItem>
                  <SelectItem value="subcontractor">Subcontractor</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>Recipient</Label>
              <Input value={form.recipient || ""} onChange={(e) => setForm({ ...form, recipient: e.target.value })} placeholder="Client or subcontractor name" />
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
              <Select value={form.status || "draft"} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Invoice Date</Label><Input type="date" value={form.date || ""} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
            <div><Label>Due Date</Label><Input type="date" value={form.due_date || ""} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></div>
            <div><Label>Tax Rate (%)</Label><Input type="number" value={form.tax_rate ?? 20} onChange={(e) => setForm({ ...form, tax_rate: parseFloat(e.target.value) || 0 })} /></div>
          </div>

          {/* Line items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Line Items</Label>
              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={addItem}><Plus className="w-3 h-3" />Add Item</Button>
            </div>
            <div className="space-y-1">
              <div className="grid grid-cols-12 gap-1 px-2 py-1 text-xs text-muted-foreground font-medium">
                <span className="col-span-6">Description</span><span className="col-span-2">Qty</span><span className="col-span-3">Unit Price</span>
              </div>
              {(form.items || []).map((item, i) => (
                <div key={i} className="grid grid-cols-12 gap-1 items-center">
                  <Input className="col-span-6 h-7 text-xs" value={item.description} onChange={(e) => updateItem(i, "description", e.target.value)} />
                  <Input className="col-span-2 h-7 text-xs" type="number" value={item.quantity} onChange={(e) => updateItem(i, "quantity", e.target.value)} />
                  <Input className="col-span-3 h-7 text-xs" type="number" value={item.unit_price} onChange={(e) => updateItem(i, "unit_price", e.target.value)} />
                  <X className="w-4 h-4 cursor-pointer text-muted-foreground" onClick={() => setForm({ ...form, items: form.items.filter((_, idx) => idx !== i) })} />
                </div>
              ))}
            </div>
            <div className="mt-3 p-3 rounded-lg bg-muted/30 text-sm space-y-1 text-right">
              <p>Subtotal: <span className="font-medium">€{subtotal.toFixed(2)}</span></p>
              <p>Tax ({form.tax_rate || 20}%): <span className="font-medium">€{tax.toFixed(2)}</span></p>
              <p className="text-base font-bold">Total: €{total.toFixed(2)}</p>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Note: "Amount" field auto-filled with subtotal</p>
          </div>

          <div><Label>Notes</Label><Textarea value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={() => saveMutation.mutate({ ...form, amount: subtotal })} disabled={saveMutation.isPending}>{saveMutation.isPending ? "Saving..." : "Save"}</Button>
          </div>
        </div>
      </FormDialog>
    </div>
  );
}