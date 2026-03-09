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
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { format } from "date-fns";
import { Mail, Phone, MapPin, Eye, Upload, X, ExternalLink } from "lucide-react";

export default function Clients() {
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ documents: [] });
  const [viewingClient, setViewingClient] = useState(null);
  const [uploading, setUploading] = useState(false);
  const queryClient = useQueryClient();

  const { data: clients = [], isLoading } = useQuery({ queryKey: ["clients"], queryFn: () => base44.entities.Client.list("-created_date") });
  const { data: projects = [] } = useQuery({ queryKey: ["projects"], queryFn: () => base44.entities.Project.list() });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const result = editing
        ? await base44.entities.Client.update(editing.id, data)
        : await base44.entities.Client.create(data);
      // Register docs in Documents module
      for (const doc of (data.documents || [])) {
        if (doc._new) {
          await base44.entities.Document.create({
            name: doc.name,
            type: doc.type || "other",
            source_module: "manual",
            file_url: doc.file_url,
            description: `Client document: ${data.name}`,
            author: data.contact_person || data.name,
          });
        }
      }
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      setShowForm(false);
      setEditing(null);
    },
  });

  const openForm = (client = null) => {
    setEditing(client);
    setForm(client ? { ...client, documents: client.documents || [] } : { documents: [] });
    setShowForm(true);
  };

  const uploadDoc = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm(f => ({ ...f, documents: [...(f.documents || []), { name: file.name, type: "other", file_url, _new: true }] }));
    setUploading(false);
  };

  const filtered = clients.filter(c =>
    !search || c.name?.toLowerCase().includes(search.toLowerCase()) || c.company_name?.toLowerCase().includes(search.toLowerCase())
  );

  const clientProjects = viewingClient ? projects.filter(p => p.client_id === viewingClient.id) : [];

  const columns = [
    { header: "Client", cell: (row) => <div><p className="font-medium">{row.name}</p><p className="text-xs text-muted-foreground">{row.company_name}</p></div> },
    { header: "Contact", cell: (row) => <span className="text-sm">{row.contact_person || "—"}</span> },
    { header: "Email / Phone", cell: (row) => (
      <div className="text-xs space-y-0.5">
        {row.email && <div className="flex items-center gap-1"><Mail className="w-3 h-3 text-muted-foreground" />{row.email}</div>}
        {row.phone && <div className="flex items-center gap-1"><Phone className="w-3 h-3 text-muted-foreground" />{row.phone}</div>}
      </div>
    )},
    { header: "IF / ICE", cell: (row) => (
      <div className="text-xs space-y-0.5">
        {row.if_number && <div><span className="text-muted-foreground">IF:</span> {row.if_number}</div>}
        {row.ice && <div><span className="text-muted-foreground">ICE:</span> {row.ice}</div>}
      </div>
    )},
    { header: "Projects", cell: (row) => {
      const count = projects.filter(p => p.client_id === row.id).length;
      return <Badge variant="outline" className="text-xs">{count} projects</Badge>;
    }},
    { header: "", cell: (row) => (
      <div className="flex gap-1">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewingClient(row)}><Eye className="w-4 h-4" /></Button>
        <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => openForm(row)}>Edit</Button>
      </div>
    )},
  ];

  return (
    <div className="space-y-4">
      <PageHeader title="Clients" subtitle={`${clients.length} clients`} onAdd={() => openForm()} addLabel="New Client" searchValue={search} onSearch={setSearch} />
      <DataTable columns={columns} data={filtered} isLoading={isLoading} />

      {viewingClient && (
        <FormDialog open={!!viewingClient} onOpenChange={() => setViewingClient(null)} title={`Client: ${viewingClient.name}`}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-muted-foreground">Company:</span> <span className="font-medium">{viewingClient.company_name || "—"}</span></div>
              <div><span className="text-muted-foreground">Raison Sociale:</span> <span className="font-medium">{viewingClient.raison_sociale || "—"}</span></div>
              <div><span className="text-muted-foreground">IF:</span> <span className="font-medium">{viewingClient.if_number || "—"}</span></div>
              <div><span className="text-muted-foreground">ICE:</span> <span className="font-medium">{viewingClient.ice || "—"}</span></div>
              <div><span className="text-muted-foreground">Email:</span> <span className="font-medium">{viewingClient.email || "—"}</span></div>
              <div><span className="text-muted-foreground">Phone:</span> <span className="font-medium">{viewingClient.phone || "—"}</span></div>
            </div>
            {(viewingClient.documents || []).length > 0 && (
              <div>
                <h4 className="font-semibold text-sm mb-2">Documents ({viewingClient.documents.length})</h4>
                <div className="space-y-1">
                  {viewingClient.documents.map((doc, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 rounded bg-muted/30 text-xs">
                      <span className="flex-1 truncate">{doc.name}</span>
                      <a href={doc.file_url} target="_blank" rel="noopener noreferrer"><ExternalLink className="w-3 h-3 text-primary" /></a>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div>
              <h4 className="font-semibold text-sm mb-2">Projects ({clientProjects.length})</h4>
              {clientProjects.length === 0 ? (
                <p className="text-sm text-muted-foreground">No projects linked to this client.</p>
              ) : (
                <div className="space-y-2">
                  {clientProjects.map(p => (
                    <div key={p.id} className="p-2 rounded-lg bg-muted/30 text-sm">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium">{p.name}</span>
                        <StatusBadge status={p.status} />
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress value={p.progress || 0} className="h-1.5 flex-1" />
                        <span className="text-xs text-muted-foreground">{p.progress || 0}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </FormDialog>
      )}

      <FormDialog open={showForm} onOpenChange={setShowForm} title={editing ? "Edit Client" : "New Client"}>
        <div className="grid grid-cols-2 gap-4">
          <div><Label>Client Name *</Label><Input value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div><Label>Company Name</Label><Input value={form.company_name || ""} onChange={(e) => setForm({ ...form, company_name: e.target.value })} /></div>
          <div className="col-span-2"><Label>Raison Sociale (Legal Name)</Label><Input value={form.raison_sociale || ""} onChange={(e) => setForm({ ...form, raison_sociale: e.target.value })} /></div>
          <div><Label>IF (Fiscal Identifier)</Label><Input value={form.if_number || ""} onChange={(e) => setForm({ ...form, if_number: e.target.value })} /></div>
          <div><Label>ICE (Company ID)</Label><Input value={form.ice || ""} onChange={(e) => setForm({ ...form, ice: e.target.value })} /></div>
          <div><Label>Contact Person</Label><Input value={form.contact_person || ""} onChange={(e) => setForm({ ...form, contact_person: e.target.value })} /></div>
          <div><Label>Email</Label><Input type="email" value={form.email || ""} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <div><Label>Phone</Label><Input value={form.phone || ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          <div><Label>Country</Label><Input value={form.country || ""} onChange={(e) => setForm({ ...form, country: e.target.value })} /></div>
          <div className="col-span-2"><Label>Address</Label><Input value={form.address || ""} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
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
            <Button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending || !form.name}>
              {saveMutation.isPending ? "Saving..." : "Save Client"}
            </Button>
          </div>
        </div>
      </FormDialog>
    </div>
  );
}