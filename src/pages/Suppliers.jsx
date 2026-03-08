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
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { Building2, Mail, Phone, MapPin, Eye, X } from "lucide-react";

export default function Suppliers() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ status: "active" });
  const [viewingSupplier, setViewingSupplier] = useState(null);
  const queryClient = useQueryClient();

  const { data: suppliers = [], isLoading } = useQuery({
    queryKey: ["suppliers"],
    queryFn: () => base44.entities.Supplier.list("-created_date"),
  });

  const { data: purchaseOrders = [] } = useQuery({
    queryKey: ["purchase-orders"],
    queryFn: () => base44.entities.PurchaseOrder.list("-created_date"),
  });

  const saveMutation = useMutation({
    mutationFn: (data) => editing
      ? base44.entities.Supplier.update(editing.id, data)
      : base44.entities.Supplier.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      setShowForm(false);
      setEditing(null);
    },
  });

  const openForm = (supplier = null) => {
    setEditing(supplier);
    setForm(supplier || { status: "active" });
    setShowForm(true);
  };

  const filtered = suppliers.filter(s => {
    const matchSearch = !search || s.name?.toLowerCase().includes(search.toLowerCase()) ||
      s.company_name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || s.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const supplierOrders = viewingSupplier
    ? purchaseOrders.filter(o => o.supplier_id === viewingSupplier.id)
    : [];

  const columns = [
    {
      header: "Supplier", cell: (row) => (
        <div>
          <p className="font-medium">{row.name}</p>
          <p className="text-xs text-muted-foreground">{row.company_name}</p>
        </div>
      )
    },
    { header: "Contact", cell: (row) => <span className="text-sm">{row.contact_person || "—"}</span> },
    {
      header: "Email / Phone", cell: (row) => (
        <div className="text-xs space-y-0.5">
          {row.email && <div className="flex items-center gap-1"><Mail className="w-3 h-3 text-muted-foreground" />{row.email}</div>}
          {row.phone && <div className="flex items-center gap-1"><Phone className="w-3 h-3 text-muted-foreground" />{row.phone}</div>}
        </div>
      )
    },
    {
      header: "Location", cell: (row) => row.country ? (
        <div className="flex items-center gap-1 text-xs"><MapPin className="w-3 h-3 text-muted-foreground" />{row.country}</div>
      ) : "—"
    },
    { header: "Status", cell: (row) => <StatusBadge status={row.status} /> },
    {
      header: "Orders", cell: (row) => {
        const count = purchaseOrders.filter(o => o.supplier_id === row.id).length;
        return <Badge variant="outline" className="text-xs">{count} POs</Badge>;
      }
    },
    {
      header: "", cell: (row) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewingSupplier(row)}>
            <Eye className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => openForm(row)}>Edit</Button>
        </div>
      )
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Suppliers"
        subtitle={`${suppliers.filter(s => s.status === "active").length} active suppliers`}
        onAdd={() => openForm()}
        addLabel="New Supplier"
        searchValue={search}
        onSearch={setSearch}
      >
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-32 bg-card"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </PageHeader>

      <DataTable columns={columns} data={filtered} isLoading={isLoading} />

      {/* Supplier detail / PO view */}
      {viewingSupplier && (
        <FormDialog open={!!viewingSupplier} onOpenChange={() => setViewingSupplier(null)} title={`Supplier: ${viewingSupplier.name}`}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-muted-foreground">Company:</span> <span className="font-medium">{viewingSupplier.company_name || "—"}</span></div>
              <div><span className="text-muted-foreground">Contact:</span> <span className="font-medium">{viewingSupplier.contact_person || "—"}</span></div>
              <div><span className="text-muted-foreground">Email:</span> <span className="font-medium">{viewingSupplier.email || "—"}</span></div>
              <div><span className="text-muted-foreground">Phone:</span> <span className="font-medium">{viewingSupplier.phone || "—"}</span></div>
              <div><span className="text-muted-foreground">Country:</span> <span className="font-medium">{viewingSupplier.country || "—"}</span></div>
              <div><span className="text-muted-foreground">VAT:</span> <span className="font-medium">{viewingSupplier.vat_number || "—"}</span></div>
            </div>
            {viewingSupplier.address && (
              <div className="text-sm"><span className="text-muted-foreground">Address:</span> {viewingSupplier.address}</div>
            )}
            <div>
              <h4 className="font-semibold text-sm mb-2">Purchase Orders ({supplierOrders.length})</h4>
              {supplierOrders.length === 0 ? (
                <p className="text-sm text-muted-foreground">No purchase orders linked to this supplier.</p>
              ) : (
                <div className="space-y-2">
                  {supplierOrders.map(o => (
                    <div key={o.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/30 text-sm">
                      <span className="font-medium">{o.order_number || `PO-${o.id?.slice(-6)}`}</span>
                      <span className="text-muted-foreground">{o.project_name}</span>
                      <span className="font-semibold">€{(o.total_amount || 0).toLocaleString()}</span>
                      <StatusBadge status={o.status} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </FormDialog>
      )}

      {/* Create / Edit form */}
      <FormDialog open={showForm} onOpenChange={setShowForm} title={editing ? "Edit Supplier" : "New Supplier"}>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Supplier Name *</Label>
            <Input value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <Label>Company Name</Label>
            <Input value={form.company_name || ""} onChange={(e) => setForm({ ...form, company_name: e.target.value })} />
          </div>
          <div>
            <Label>Contact Person</Label>
            <Input value={form.contact_person || ""} onChange={(e) => setForm({ ...form, contact_person: e.target.value })} />
          </div>
          <div>
            <Label>Email</Label>
            <Input type="email" value={form.email || ""} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <Label>Phone</Label>
            <Input value={form.phone || ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div>
            <Label>Country</Label>
            <Input value={form.country || ""} onChange={(e) => setForm({ ...form, country: e.target.value })} />
          </div>
          <div>
            <Label>VAT / Tax Number</Label>
            <Input value={form.vat_number || ""} onChange={(e) => setForm({ ...form, vat_number: e.target.value })} />
          </div>
          <div>
            <Label>Status</Label>
            <Select value={form.status || "active"} onValueChange={(v) => setForm({ ...form, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2">
            <Label>Address</Label>
            <Input value={form.address || ""} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </div>
          <div className="col-span-2">
            <Label>Notes</Label>
            <Textarea value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <div className="col-span-2 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending || !form.name}>
              {saveMutation.isPending ? "Saving..." : "Save Supplier"}
            </Button>
          </div>
        </div>
      </FormDialog>
    </div>
  );
}