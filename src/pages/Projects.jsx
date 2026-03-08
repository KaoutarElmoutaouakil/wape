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
import { Progress } from "@/components/ui/progress";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Eye } from "lucide-react";

export default function Projects() {
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const queryClient = useQueryClient();

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: () => base44.entities.Project.list("-created_date"),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: () => base44.entities.Client.list(),
  });

  const { data: allTasks = [] } = useQuery({
    queryKey: ["tasks"],
    queryFn: () => base44.entities.Task.list(),
  });

  const saveMutation = useMutation({
    mutationFn: (data) => {
      // Auto-calculate progress from tasks if project exists
      if (editing) {
        const projectTasks = allTasks.filter(t => t.project_id === editing.id);
        if (projectTasks.length > 0) {
          const completed = projectTasks.filter(t => t.status === "completed").length;
          data.progress = Math.round((completed / projectTasks.length) * 100);
        }
      }
      return editing
        ? base44.entities.Project.update(editing.id, data)
        : base44.entities.Project.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setShowForm(false);
      setEditing(null);
    },
  });

  const [form, setForm] = useState({});

  const openForm = (project = null) => {
    setEditing(project);
    setForm(project || { status: "planning", progress: 0 });
    setShowForm(true);
  };

  const handleSave = () => {
    saveMutation.mutate(form);
  };

  const filtered = projects.filter(p => {
    const matchSearch = !search || p.name?.toLowerCase().includes(search.toLowerCase()) || p.client?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const columns = [
    { header: "Project", cell: (row) => (
      <div>
        <p className="font-medium text-foreground">{row.name}</p>
        <p className="text-xs text-muted-foreground">{row.client}</p>
      </div>
    )},
    { header: "Location", accessor: "location" },
    { header: "Duration", cell: (row) => (
      <span className="text-xs">
        {row.start_date ? format(new Date(row.start_date), "MMM d, yy") : "—"}
        {" → "}
        {row.end_date ? format(new Date(row.end_date), "MMM d, yy") : "—"}
      </span>
    )},
    { header: "Budget", cell: (row) => row.estimated_budget ? `€${row.estimated_budget.toLocaleString()}` : "—" },
    { header: "Status", cell: (row) => <StatusBadge status={row.status} /> },
    { header: "Progress", cell: (row) => (
      <div className="flex items-center gap-2 min-w-[120px]">
        <Progress value={row.progress || 0} className="h-2 flex-1" />
        <span className="text-xs font-medium text-muted-foreground w-8">{row.progress || 0}%</span>
      </div>
    )},
    { header: "", cell: (row) => (
      <div className="flex gap-1">
        <Link to={createPageUrl("ProjectDetails") + `?id=${row.id}`}>
          <Button variant="ghost" size="icon" className="h-8 w-8"><Eye className="w-4 h-4" /></Button>
        </Link>
        <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={(e) => { e.stopPropagation(); openForm(row); }}>
          Edit
        </Button>
      </div>
    )},
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Projects"
        subtitle={`${projects.length} total projects`}
        onAdd={() => openForm()}
        addLabel="New Project"
        searchValue={search}
        onSearch={setSearch}
      >
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36 bg-card"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="planning">Planning</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="on_hold">On Hold</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
      </PageHeader>

      <DataTable columns={columns} data={filtered} isLoading={isLoading} />

      <FormDialog open={showForm} onOpenChange={setShowForm} title={editing ? "Edit Project" : "New Project"}>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Label>Project Name</Label>
            <Input value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <Label>Client</Label>
            <Select value={form.client_id || ""} onValueChange={(v) => {
              const c = clients.find(x => x.id === v);
              setForm({ ...form, client_id: v, client: c?.name || "" });
            }}>
              <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>No client</SelectItem>
                {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}{c.company_name ? ` — ${c.company_name}` : ""}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Location</Label>
            <Input value={form.location || ""} onChange={(e) => setForm({ ...form, location: e.target.value })} />
          </div>
          <div>
            <Label>Start Date</Label>
            <Input type="date" value={form.start_date || ""} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
          </div>
          <div>
            <Label>End Date</Label>
            <Input type="date" value={form.end_date || ""} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
          </div>
          <div>
            <Label>Estimated Budget (€)</Label>
            <Input type="number" value={form.estimated_budget || ""} onChange={(e) => setForm({ ...form, estimated_budget: parseFloat(e.target.value) || 0 })} />
          </div>
          <div>
            <Label>Status</Label>
            <Select value={form.status || "planning"} onValueChange={(v) => setForm({ ...form, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="planning">Planning</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="on_hold">On Hold</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Manager</Label>
            <Input value={form.manager || ""} onChange={(e) => setForm({ ...form, manager: e.target.value })} />
          </div>
          <div>
            <Label>Progress (%)</Label>
            <Input type="number" min="0" max="100" value={form.progress || 0} onChange={(e) => setForm({ ...form, progress: parseInt(e.target.value) || 0 })} />
            {editing && (() => {
              const projectTasks = allTasks.filter(t => t.project_id === editing.id);
              if (projectTasks.length === 0) return null;
              const completed = projectTasks.filter(t => t.status === "completed").length;
              const auto = Math.round((completed / projectTasks.length) * 100);
              return <p className="text-xs text-muted-foreground mt-1">Auto from tasks: {completed}/{projectTasks.length} completed = {auto}%</p>;
            })()}
          </div>
          <div className="col-span-2">
            <Label>Description</Label>
            <Textarea value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="col-span-2 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Saving..." : "Save Project"}
            </Button>
          </div>
        </div>
      </FormDialog>
    </div>
  );
}