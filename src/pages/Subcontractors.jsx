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
import { Building2, Phone, Mail, Eye, Upload, X, ExternalLink } from "lucide-react";

export default function Subcontractors() {
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [showProfile, setShowProfile] = useState(null);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ documents: [] });
  const [uploading, setUploading] = useState(false);
  const queryClient = useQueryClient();

  const { data: subs = [], isLoading } = useQuery({ queryKey: ["subcontractors"], queryFn: () => base44.entities.Subcontractor.list("-created_date") });
  const { data: projects = [] } = useQuery({ queryKey: ["projects"], queryFn: () => base44.entities.Project.list() });
  const { data: tasks = [] } = useQuery({ queryKey: ["tasks"], queryFn: () => base44.entities.Task.list() });
  const { data: invoices = [] } = useQuery({ queryKey: ["invoices"], queryFn: () => base44.entities.Invoice.list() });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const result = editing
        ? await base44.entities.Subcontractor.update(editing.id, data)
        : await base44.entities.Subcontractor.create(data);
      for (const doc of (data.documents || [])) {
        if (doc._new) {
          await base44.entities.Document.create({
            name: doc.name,
            type: doc.type || "other",
            source_module: "manual",
            file_url: doc.file_url,
            description: `Subcontractor document: ${data.company_name}`,
            author: data.contact_person || data.company_name,
          });
        }
      }
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subcontractors"] });
      setShowForm(false);
      setEditing(null);
    },
  });

  const openForm = (sub = null) => {
    setEditing(sub);
    setForm(sub ? { ...sub, documents: sub.documents || [] } : { status: "active", documents: [] });
    setShowForm(true);
  };

  const uploadDoc = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm(f => ({ ...f, documents: [...(f.documents || []), { name: file.name, type: "other", file_url, _new: true }] }));
    setUploading(false);
  };

  const filtered = subs.filter(s =>
    !search || s.company_name?.toLowerCase().includes(search.toLowerCase()) || s.specialty?.toLowerCase().includes(search.toLowerCase())
  );

  const columns = [
    { header: "Company", cell: (row) => <div><p className="font-medium">{row.company_name}</p><p className="text-xs text-muted-foreground">{row.specialty}</p></div> },
    { header: "Contact", cell: (row) => <div className="text-xs"><p>{row.contact_person}</p><p className="text-muted-foreground">{row.email}</p></div> },
    { header: "IF / ICE", cell: (row) => (
      <div className="text-xs space-y-0.5">
        {row.if_number && <div><span className="text-muted-foreground">IF:</span> {row.if_number}</div>}
        {row.ice && <div><span className="text-muted-foreground">ICE:</span> {row.ice}</div>}
      </div>
    )},
    { header: "Contract Value", cell: (row) => row.contract_value ? `€${row.contract_value.toLocaleString()}` : "—" },
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

      {showProfile && (
        <FormDialog open={!!showProfile} onOpenChange={() => setShowProfile(null)} title={showProfile.company_name}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2"><Building2 className="w-4 h-4 text-muted-foreground" /><span>{showProfile.specialty || "—"}</span></div>
              <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-muted-foreground" /><span>{showProfile.phone || "—"}</span></div>
              <div className="flex items-center gap-2"><Mail className="w-4 h-4 text-muted-foreground" /><span>{showProfile.email || "—"}</span></div>
              <div><span className="text-muted-foreground">Contract: </span><span className="font-medium">€{(showProfile.contract_value || 0).toLocaleString()}</span></div>
              {showProfile.if_number && <div><span className="text-muted-foreground">IF: </span><span className="font-medium">{showProfile.if_number}</span></div>}
              {showProfile.ice && <div><span className="text-muted-foreground">ICE: </span><span className="font-medium">{showProfile.ice}</span></div>}
              {showProfile.raison_sociale && <div className="col-span-2"><span className="text-muted-foreground">Raison Sociale: </span><span className="font-medium">{showProfile.raison_sociale}</span></div>}
            </div>
            {(showProfile.documents || []).length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2">Documents</h4>
                <div className="space-y-1">
                  {showProfile.documents.map((doc, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 rounded bg-muted/30 text-xs">
                      <span className="flex-1 truncate">{doc.name}</span>
                      <a href={doc.file_url} target="_blank" rel="noopener noreferrer"><ExternalLink className="w-3 h-3 text-primary" /></a>
                    </div>
                  ))}
                </div>
              </div>
            )}
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
          </div>
        </FormDialog>
      )}

      <FormDialog open={showForm} onOpenChange={setShowForm} title={editing ? "Edit Subcontractor" : "New Subcontractor"}>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2"><Label>Company Name</Label><Input value={form.company_name || ""} onChange={(e) => setForm({ ...form, company_name: e.target.value })} /></div>
          <div className="col-span-2"><Label>Raison Sociale (Legal Name)</Label><Input value={form.raison_sociale || ""} onChange={(e) => setForm({ ...form, raison_sociale: e.target.value })} /></div>
          <div><Label>IF (Fiscal Identifier)</Label><Input value={form.if_number || ""} onChange={(e) => setForm({ ...form, if_number: e.target.value })} /></div>
          <div><Label>ICE (Company ID)</Label><Input value={form.ice || ""} onChange={(e) => setForm({ ...form, ice: e.target.value })} /></div>
          <div><Label>Contact Person</Label><Input value={form.contact_person || ""} onChange={(e) => setForm({ ...form, contact_person: e.target.value })} /></div>
          <div><Label>Phone</Label><Input value={form.phone || ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          <div><Label>Email</Label><Input type="email" value={form.email || ""} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <div><Label>Specialty</Label><Input value={form.specialty || ""} onChange={(e) => setForm({ ...form, specialty: e.target.value })} /></div>
          <div><Label>Contract Value (€)</Label><Input type="number" value={form.contract_value || ""} onChange={(e) => setForm({ ...form, contract_value: parseFloat(e.target.value) || 0 })} /></div>
          <div><Label>Status</Label>
            <Select value={form.status || "active"} onValueChange={(v) => setForm({ ...form, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="on_project">On Project</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2">
            <Label className="mb-1 block">Documents (contracts, agreements, legal)</Label>
            <label className="flex items-center gap-2 cursor-pointer px-3 py-2 rounded-md border border-dashed border-border hover:bg-muted/30 text-sm text-muted-foreground w-fit">
              <Upload className="w-4 h-4" /> {uploading ? "Uploading..." : "Upload document"}
              <input type="file" className="hidden" onChange={uploadDoc} disabled={uploading} />
            </label>
            <div className="mt-2 space-y-1">
              {(form.documents || []).map((doc, i) => (
                <div key={i} className="flex items-center gap-2 p-2 rounded bg-muted/30 text-xs">
                  <span className="flex-1 truncate">{doc.name}</span>
                  <a href={doc.file_url} target="_blank" rel="noopener noreferrer"><ExternalLink className="w-3 h-3 text-primary" /></a>
                  <X className="w-3 h-3 cursor-pointer text-muted-foreground" onClick={() => setForm(f => ({ ...f, documents: f.documents.filter((_, idx) => idx !== i) }))} />
                </div>
              ))}
            </div>
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