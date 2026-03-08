import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import PageHeader from "@/components/shared/PageHeader";
import DataTable from "@/components/shared/DataTable";
import StatusBadge from "@/components/shared/StatusBadge";
import FormDialog from "@/components/shared/FormDialog";
import TaskForm from "@/components/tasks/TaskForm";
import GanttChart from "@/components/tasks/GanttChart";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Eye, BarChart2, List, Kanban } from "lucide-react";
import KanbanBoard from "@/components/tasks/KanbanBoard";

export default function Tasks() {
  const params = new URLSearchParams(window.location.search);
  const projectFilter = params.get("project") || "all";

  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [view, setView] = useState("list");
  const queryClient = useQueryClient();

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["tasks"],
    queryFn: () => base44.entities.Task.list("-created_date"),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: () => base44.entities.Project.list(),
  });

  const { data: personnel = [] } = useQuery({ queryKey: ["personnel"], queryFn: () => base44.entities.Personnel.list() });
  const { data: articles = [] } = useQuery({ queryKey: ["articles"], queryFn: () => base44.entities.Article.list() });
  const { data: tools = [] } = useQuery({ queryKey: ["tools"], queryFn: () => base44.entities.Tool.list() });

  const updateTaskStatusMutation = useMutation({
    mutationFn: async ({ id, status }) => {
      await base44.entities.Task.update(id, { status });
      // Auto-update project progress
      const task = tasks.find(t => t.id === id);
      if (task?.project_id) {
        const projectTasks = tasks.map(t => t.id === id ? { ...t, status } : t).filter(t => t.project_id === task.project_id);
        const completed = projectTasks.filter(t => t.status === "completed").length;
        const progress = projectTasks.length > 0 ? Math.round((completed / projectTasks.length) * 100) : 0;
        await base44.entities.Project.update(task.project_id, { progress });
        queryClient.invalidateQueries({ queryKey: ["projects"] });
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      // Auto-calculate estimated cost
      const personnelCost = (data.assigned_personnel || []).reduce((s, p) => {
        if (p.cost) return s + p.cost;
        const found = personnel.find(x => x.id === p.id);
        return s + (found?.salary ? found.salary / 160 * (p.hours || 8) : 0);
      }, 0);
      const articlesCost = (data.assigned_articles || []).reduce((s, a) => {
        if (a.unit_cost) return s + a.unit_cost * (a.quantity || 1);
        const found = articles.find(x => x.id === a.id);
        return s + ((found?.purchase_cost || 0) * (a.quantity || 1));
      }, 0);
      const toolsCost = (data.assigned_tools || []).reduce((s, t) => s + (t.cost || 0), 0);
      const estimated_cost = personnelCost + articlesCost + toolsCost;

      const savedTask = editing
        ? await base44.entities.Task.update(editing.id, { ...data, estimated_cost })
        : await base44.entities.Task.create({ ...data, estimated_cost });

      // Create RESERVED stock movements for newly assigned articles
      const prevArticleIds = (editing?.assigned_articles || []).map(a => a.id);
      const newArticles = (data.assigned_articles || []).filter(a => !prevArticleIds.includes(a.id));
      for (const art of newArticles) {
        await base44.entities.StockMovement.create({
          article_id: art.id,
          article_name: art.name,
          movement_type: "RESERVED",
          quantity: art.quantity || 1,
          date: new Date().toISOString().split("T")[0],
          project_id: data.project_id,
          project_name: data.project_name,
          task_id: savedTask.id,
          task_name: data.name,
          notes: `Reserved for task "${data.name}"`,
        });
      }
      if (newArticles.length) queryClient.invalidateQueries({ queryKey: ["stock-movements"] });

      // Notify assigned personnel
      if (!editing && data.assigned_personnel?.length) {
        for (const p of data.assigned_personnel) {
          await base44.entities.Communication.create({
            message: `✅ You have been assigned to task: "${data.name}"${data.project_name ? ` on project "${data.project_name}"` : ""}`,
            author: "WAPE System",
            type: "notification",
            project_id: data.project_id,
            project_name: data.project_name,
          });
        }
        queryClient.invalidateQueries({ queryKey: ["communications"] });
      }

      // Auto-update project progress when task status changes
      if (savedTask.project_id) {
        const allProjectTasks = tasks.filter(t => t.project_id === savedTask.project_id);
        // Include updated task in calculation
        const updatedTasks = allProjectTasks.map(t => t.id === savedTask.id ? savedTask : t);
        if (!editing) updatedTasks.push(savedTask);
        const completedCount = updatedTasks.filter(t => t.status === "completed").length;
        const progress = updatedTasks.length > 0 ? Math.round((completedCount / updatedTasks.length) * 100) : 0;
        await base44.entities.Project.update(savedTask.project_id, { progress });
        queryClient.invalidateQueries({ queryKey: ["projects"] });
      }

      return savedTask;
    },
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
    { header: "Est. Cost", cell: (row) => row.estimated_cost
      ? <span className="text-xs font-semibold text-warning">€{row.estimated_cost.toLocaleString()}</span>
      : <span className="text-xs text-muted-foreground">—</span>
    },
    { header: "Assigned", cell: (row) => <span className="text-xs text-muted-foreground">{(row.assigned_personnel || []).length} people</span> },
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
      <PageHeader title="Tasks" subtitle={`${tasks.length} total tasks`} onAdd={() => openForm()} addLabel="New Task" searchValue={search} onSearch={setSearch}>
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
        <div className="flex border border-border rounded-md overflow-hidden">
          <Button variant={view === "list" ? "default" : "ghost"} size="sm" className="h-9 rounded-none gap-1" onClick={() => setView("list")}><List className="w-4 h-4" /></Button>
          <Button variant={view === "kanban" ? "default" : "ghost"} size="sm" className="h-9 rounded-none gap-1" onClick={() => setView("kanban")}><Kanban className="w-4 h-4" />Kanban</Button>
          <Button variant={view === "gantt" ? "default" : "ghost"} size="sm" className="h-9 rounded-none gap-1" onClick={() => setView("gantt")}><BarChart2 className="w-4 h-4" />Gantt</Button>
        </div>
      </PageHeader>

      {view === "list" && <DataTable columns={columns} data={filtered} isLoading={isLoading} />}

      {view === "kanban" && (
        <KanbanBoard
          tasks={filtered}
          onStatusChange={(id, status) => updateTaskStatusMutation.mutate({ id, status })}
          onEdit={openForm}
        />
      )}

      {view === "gantt" && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Gantt Chart — Project Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <GanttChart tasks={filtered} />
          </CardContent>
        </Card>
      )}

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