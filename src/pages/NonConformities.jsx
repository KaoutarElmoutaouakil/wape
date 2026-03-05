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
import { format } from "date-fns";

export default function NonConformities() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const queryClient = useQueryClient();

  const { data: ncs = [], isLoading } = useQuery({
    queryKey: ["ncs"],
    queryFn: () => base44.entities.NonConformity.list("-created_date"),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: () => base44.entities.Project.list(),
  });

  const saveMutation = useMutation({
    mutationFn: (data) => editing
      ? base44.entities.NonConformity.update(editing.id, data)
      : base44.entities.NonConformity.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ncs"] });
      setShowForm(false);
      setEditing(null);
    },
  });

  const openForm = (nc = null) => {
    setEditing(nc);
    setForm(nc || { status: "open", severity: "medium" });
    setShowForm(true);
  };

  const filtered = ncs.filter(nc => {
    const matchSearch = !search || nc.title?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || nc.status === statusFilter;
    const matchSev = severityFilter === "all" || nc.severity === severityFilter;
    return matchSearch && matchStatus && matchSev;
  });

  const columns = [
    { header: "Title", cell: (row) => (
      <div>
        <p className="font-medium">{row.title}</p>
        <p className="text-xs text-muted-foreground">{row.location}</p>
      </div>
    )},
    { header: "Project", accessor: "project_name" },
    { header: "Severity", cell: (row) => <StatusBadge status={row.severity} /> },
    { header: "Status", cell: (row) => <StatusBadge status={row.status} /> },
    { header: "Assigned To", accessor: "assigned_person" },
    { header: "Deadline", cell: (row) => row.deadline ? format(new Date(row.deadline), "MMM d, yyyy") : "—" },
    { header: "", cell: (row) => (
      <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => openForm(row)}>Edit</Button>
    )},
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Non Conformities"
        subtitle={`${ncs.filter(nc => nc.status === "open").length} open`}
        onAdd={() => openForm()}
        addLabel="New NC"
        searchValue={search}
        onSearch={setSearch}
      >
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-32 bg-card"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={severityFilter} onValueChange={setSeverityFilter}>
          <SelectTrigger className="w-32 bg-card"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Severity</SelectItem>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
          </SelectContent>
        </Select>
      </PageHeader>

      <DataTable columns={columns} data={filtered} isLoading={isLoading} />

      <FormDialog open={showForm} onOpenChange={setShowForm} title={editing ? "Edit Non Conformity" : "New Non Conformity"}>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Label>Title</Label>
            <Input value={form.title || ""} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div>
            <Label>Project</Label>
            <Select value={form.project_id || ""} onValueChange={(v) => {
              const proj = projects.find(p => p.id === v);
              setForm({ ...form, project_id: v, project_name: proj?.name || "" });
            }}>
              <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>No project</SelectItem>
                {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Location</Label>
            <Input value={form.location || ""} onChange={(e) => setForm({ ...form, location: e.target.value })} />
          </div>
          <div>
            <Label>Severity</Label>
            <Select value={form.severity || "medium"} onValueChange={(v) => setForm({ ...form, severity: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Status</Label>
            <Select value={form.status || "open"} onValueChange={(v) => setForm({ ...form, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Assigned Person</Label>
            <Input value={form.assigned_person || ""} onChange={(e) => setForm({ ...form, assigned_person: e.target.value })} />
          </div>
          <div>
            <Label>Deadline</Label>
            <Input type="date" value={form.deadline || ""} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
          </div>
          <div className="col-span-2">
            <Label>Description</Label>
            <Textarea value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="col-span-2">
            <Label>Resolution</Label>
            <Textarea value={form.resolution || ""} onChange={(e) => setForm({ ...form, resolution: e.target.value })} placeholder="How was this resolved?" />
          </div>
          <div className="col-span-2 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </FormDialog>
    </div>
  );
}