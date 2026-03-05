import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import PageHeader from "@/components/shared/PageHeader";
import DataTable from "@/components/shared/DataTable";
import StatusBadge from "@/components/shared/StatusBadge";
import FormDialog from "@/components/shared/FormDialog";
import TaskForm from "@/components/tasks/TaskForm";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Eye } from "lucide-react";

export default function Tasks() {
  const params = new URLSearchParams(window.location.search);
  const projectFilter = params.get("project") || "all";
  
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const queryClient = useQueryClient();

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["tasks"],
    queryFn: () => base44.entities.Task.list("-created_date"),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: () => base44.entities.Project.list(),
  });

  const saveMutation = useMutation({
    mutationFn: (data) => editing
      ? base44.entities.Task.update(editing.id, data)
      : base44.entities.Task.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      setShowForm(false);
      setEditing(null);
    },
  });

  const openForm = (task = null) => {
    setEditing(task);
    setShowForm(true);
  };

  const filtered = tasks.filter(t => {
    const matchSearch = !search || t.name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || t.status === statusFilter;
    const matchPriority = priorityFilter === "all" || t.priority === priorityFilter;
    const matchProject = projectFilter === "all" || t.project_id === projectFilter;
    return matchSearch && matchStatus && matchPriority && matchProject;
  });

  const columns = [
    { header: "Task", cell: (row) => (
      <div>
        <p className="font-medium text-foreground">{row.name}</p>
        <p className="text-xs text-muted-foreground">{row.project_name || "No project"}</p>
      </div>
    )},
    { header: "Zone", accessor: "zone" },
    { header: "Priority", cell: (row) => <StatusBadge status={row.priority} /> },
    { header: "Duration", cell: (row) => (
      <span className="text-xs">
        {row.start_date ? format(new Date(row.start_date), "MMM d") : "—"} → {row.end_date ? format(new Date(row.end_date), "MMM d") : "—"}
      </span>
    )},
    { header: "Status", cell: (row) => <StatusBadge status={row.status} /> },
    { header: "Assigned", cell: (row) => (
      <span className="text-xs text-muted-foreground">
        {(row.assigned_personnel || []).length} people
      </span>
    )},
    { header: "", cell: (row) => (
      <div className="flex gap-1">
        <Link to={createPageUrl("TaskDetails") + `?id=${row.id}`}>
          <Button variant="ghost" size="icon" className="h-8 w-8"><Eye className="w-4 h-4" /></Button>
        </Link>
        <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={(e) => { e.stopPropagation(); openForm(row); }}>Edit</Button>
      </div>
    )},
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Tasks"
        subtitle={`${tasks.length} total tasks`}
        onAdd={() => openForm()}
        addLabel="New Task"
        searchValue={search}
        onSearch={setSearch}
      >
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-32 bg-card"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="todo">Todo</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="review">Review</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="blocked">Blocked</SelectItem>
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-32 bg-card"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priority</SelectItem>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
          </SelectContent>
        </Select>
      </PageHeader>

      <DataTable columns={columns} data={filtered} isLoading={isLoading} />

      <FormDialog open={showForm} onOpenChange={setShowForm} title={editing ? "Edit Task" : "New Task"}>
        <TaskForm
          task={editing}
          projects={projects}
          onSave={(data) => saveMutation.mutate(data)}
          onCancel={() => setShowForm(false)}
          saving={saveMutation.isPending}
        />
      </FormDialog>
    </div>
  );
}