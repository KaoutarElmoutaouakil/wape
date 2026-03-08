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
import { Mail, Phone, MapPin, Eye } from "lucide-react";

export default function Clients() {
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [viewingClient, setViewingClient] = useState(null);
  const queryClient = useQueryClient();

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ["clients"],
    queryFn: () => base44.entities.Client.list("-created_date"),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: () => base44.entities.Project.list(),
  });

  const saveMutation = useMutation({
    mutationFn: (data) => editing
      ? base44.entities.Client.update(editing.id, data)
      : base44.entities.Client.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      setShowForm(false);
      setEditing(null);
    },
  });

  const openForm = (client = null) => {
    setEditing(client);
    setForm(client || {});
    setShowForm(true);
  };

  const filtered = clients.filter(c =>
    !search || c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.company_name?.toLowerCase().includes(search.toLowerCase())
  );

  const clientProjects = viewingClient
    ? projects.filter(p => p.client_id === viewingClient.id)
    : [];

  const columns = [
    {
      header: "Client", cell: (row) => (
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
      header: "Country", cell: (row) => row.country ? (
        <div className="flex items-center gap-1 text-xs"><MapPin className="w-3 h-3 text-muted-foreground" />{row.country}</div>
      ) : "—"
    },
    {
      header: "Projects", cell: (row) => {
        const count = projects.filter(p => p.client_id === row.id).length;
        return <Badge variant="outline" className="text-xs">{count} projects</Badge>;
      }
    },
    {
      header: "", cell: (row) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewingClient(row)}>
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
        title="Clients"
        subtitle={`${clients.length} clients`}
        onAdd={() => openForm()}
        addLabel="New Client"
        searchValue={search}
        onSearch={setSearch}
      />

      <DataTable columns={columns} data={filtered} isLoading={isLoading} />

      {/* Client detail / projects view */}
      {viewingClient && (
        <FormDialog open={!!viewingClient} onOpenChange={() => setViewingClient(null)} title={`Client: ${viewingClient.name}`}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-muted-foreground">Company:</span> <span className="font-medium">{viewingClient.company_name || "—"}</span></div>
              <div><span className="text-muted-foreground">Contact:</span> <span className="font-medium">{viewingClient.contact_person || "—"}</span></div>
              <div><span className="text-muted-foreground">Email:</span> <span className="font-medium">{viewingClient.email || "—"}</span></div>
              <div><span className="text-muted-foreground">Phone:</span> <span className="font-medium">{viewingClient.phone || "—"}</span></div>
              <div><span className="text-muted-foreground">Country:</span> <span className="font-medium">{viewingClient.country || "—"}</span></div>
            </div>
            {viewingClient.address && (
              <div className="text-sm"><span className="text-muted-foreground">Address:</span> {viewingClient.address}</div>
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

      {/* Create / Edit form */}
      <FormDialog open={showForm} onOpenChange={setShowForm} title={editing ? "Edit Client" : "New Client"}>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Client Name *</Label>
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
              {saveMutation.isPending ? "Saving..." : "Save Client"}
            </Button>
          </div>
        </div>
      </FormDialog>
    </div>
  );
}