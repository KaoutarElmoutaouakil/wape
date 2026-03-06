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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Phone, Mail, Eye, X } from "lucide-react";

export default function Subcontractors() {
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [showProfile, setShowProfile] = useState(null);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const queryClient = useQueryClient();

  const { data: subs = [], isLoading } = useQuery({
    queryKey: ["subcontractors"],
    queryFn: () => base44.entities.Subcontractor.list("-created_date"),
  });
  const { data: projects = [] } = useQuery({ queryKey: ["projects"], queryFn: () => base44.entities.Project.list() });
  const { data: tasks = [] } = useQuery({ queryKey: ["tasks"], queryFn: () => base44.entities.Task.list() });
  const { data: invoices = [] } = useQuery({ queryKey: ["invoices"], queryFn: () => base44.entities.Invoice.list() });

  const saveMutation = useMutation({
    mutationFn: (data) => editing
      ? base44.entities.Subcontractor.update(editing.id, data)
      : base44.entities.Subcontractor.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subcontractors"] });
      setShowForm(false);
      setEditing(null);
    },
  });

  const openForm = (sub = null) => {
    setEditing(sub);
    setForm(sub || { status: "active" });
    setShowForm(true);
  };

  const filtered = subs.filter(s =>
    !search || s.company_name?.toLowerCase().includes(search.toLowerCase()) || s.specialty?.toLowerCase().includes(search.toLowerCase())
  );

  const columns = [
    { header: "Company", cell: (row) => (
      <div>
        <p className="font-medium">{row.company_name}</p>
        <p className="text-xs text-muted-foreground">{row.specialty}</p>
      </div>
    )},
    { header: "Contact", cell: (row) => (
      <div className="text-xs">
        <p>{row.contact_person}</p>
        <p className="text-muted-foreground">{row.email}</p>
      </div>
    )},
    { header: "Phone", accessor: "phone" },
    { header: "Contract Value", cell: (row) => row.contract_value ? `€${row.contract_value.toLocaleString()}` : "—" },
    { header: "Projects", cell: (row) => <span className="text-xs">{(row.assigned_project_names || []).slice(0, 2).join(", ") || "—"}</span> },
    { header: "Status", cell: (row) => <StatusBadge status={row.status} /> },
    { header: "", cell: (row) => (
      <div className="flex gap-1">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowProfile(row)}><Eye className="w-4 h-4" /></Button>
        <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => openForm(row)}>Edit</Button>
      </div>
    )},
  ];

  return (
    <div className="space-y-4">
      <PageHeader title="Subcontractors" subtitle={`${subs.length} subcontractors`} onAdd={() => openForm()} addLabel="New Subcontractor" searchValue={search} onSearch={setSearch} />
      <DataTable columns={columns} data={filtered} isLoading={isLoading} />

      {/* Profile Modal */}
      {showProfile && (
        <FormDialog open={!!showProfile} onOpenChange={() => setShowProfile(null)} title={showProfile.company_name}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2"><Building2 className="w-4 h-4 text-muted-foreground" /><span>{showProfile.specialty || "—"}</span></div>
              <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-muted-foreground" /><span>{showProfile.phone || "—"}</span></div>
              <div className="flex items-center gap-2"><Mail className="w-4 h-4 text-muted-foreground" /><span>{showProfile.email || "—"}</span></div>
              <div><span className="text-muted-foreground">Contract: </span><span className="font-medium">€{(showProfile.contract_value || 0).toLocaleString()}</span></div>
            </div>
            
            <div>
              <h4 className="text-sm font-semibold mb-2">Assigned Tasks</h4>
              {tasks.filter(t => (t.assigned_subcontractors || []).some(s => s.id === showProfile.id)).length === 0
                ? <p className="text-xs text-muted-foreground">No tasks assigned</p>
                : tasks.filter(t => (t.assigned_subcontractors || []).some(s => s.id === showProfile.id)).map(t => (
                    <div key={t.id} className="flex items-center justify-between p-2 rounded bg-muted/30 mb-1 text-sm">
                      <span>{t.name}</span><StatusBadge status={t.status} />
                    </div>
                  ))
              }
            </div>

            <div>
              <h4 className="text-sm font-semibold mb-2">Related Invoices</h4>
              {invoices.filter(inv => inv.recipient === showProfile.company_name).length === 0
                ? <p className="text-xs text-muted-foreground">No invoices</p>
                : invoices.filter(inv => inv.recipient === showProfile.company_name).map(inv => (
                    <div key={inv.id} className="flex items-center justify-between p-2 rounded bg-muted/30 mb-1 text-sm">
                      <span>{inv.invoice_number || inv.project_name}</span>
                      <span className="font-medium">€{(inv.amount || 0).toLocaleString()}</span>
                      <StatusBadge status={inv.status} />
                    </div>
                  ))
              }
            </div>
          </div>
        </FormDialog>
      )}

      <FormDialog open={showForm} onOpenChange={setShowForm} title={editing ? "Edit Subcontractor" : "New Subcontractor"}>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Label>Company Name</Label>
            <Input value={form.company_name || ""} onChange={(e) => setForm({ ...form, company_name: e.target.value })} />
          </div>
          <div><Label>Contact Person</Label><Input value={form.contact_person || ""} onChange={(e) => setForm({ ...form, contact_person: e.target.value })} /></div>
          <div><Label>Phone</Label><Input value={form.phone || ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          <div><Label>Email</Label><Input type="email" value={form.email || ""} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <div><Label>Specialty</Label><Input value={form.specialty || ""} onChange={(e) => setForm({ ...form, specialty: e.target.value })} /></div>
          <div><Label>Contract Value (€)</Label><Input type="number" value={form.contract_value || ""} onChange={(e) => setForm({ ...form, contract_value: parseFloat(e.target.value) || 0 })} /></div>
          <div>
            <Label>Status</Label>
            <Select value={form.status || "active"} onValueChange={(v) => setForm({ ...form, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="on_project">On Project</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2"><Label>Notes</Label><Textarea value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          <div className="col-span-2 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending}>{saveMutation.isPending ? "Saving..." : "Save"}</Button>
          </div>
        </div>
      </FormDialog>
    </div>
  );
}