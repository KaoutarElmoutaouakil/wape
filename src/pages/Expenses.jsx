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

export default function Expenses() {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [projectFilter, setProjectFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const queryClient = useQueryClient();

  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ["expenses"],
    queryFn: () => base44.entities.Expense.list("-created_date"),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: () => base44.entities.Project.list(),
  });

  const saveMutation = useMutation({
    mutationFn: (data) => editing
      ? base44.entities.Expense.update(editing.id, data)
      : base44.entities.Expense.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      setShowForm(false);
      setEditing(null);
    },
  });

  const openForm = (expense = null) => {
    setEditing(expense);
    setForm(expense || { category: "materials" });
    setShowForm(true);
  };

  const filtered = expenses.filter(e => {
    const matchSearch = !search || e.name?.toLowerCase().includes(search.toLowerCase());
    const matchCat = categoryFilter === "all" || e.category === categoryFilter;
    const matchProj = projectFilter === "all" || e.project_id === projectFilter;
    return matchSearch && matchCat && matchProj;
  });

  const totalFiltered = filtered.reduce((s, e) => s + (e.amount || 0), 0);

  const columns = [
    { header: "Name", cell: (row) => (
      <div>
        <p className="font-medium">{row.name}</p>
        <p className="text-xs text-muted-foreground">{row.responsible}</p>
      </div>
    )},
    { header: "Category", cell: (row) => <span className="capitalize text-xs">{row.category?.replace("_", " ")}</span> },
    { header: "Amount", cell: (row) => <span className="font-semibold">€{(row.amount || 0).toLocaleString()}</span> },
    { header: "Date", cell: (row) => row.date ? format(new Date(row.date), "MMM d, yyyy") : "—" },
    { header: "Project", accessor: "project_name" },
    { header: "Task", accessor: "task_name" },
    { header: "Notes", cell: (row) => <span className="text-xs text-muted-foreground">{row.notes}</span> },
    { header: "", cell: (row) => (
      <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => openForm(row)}>Edit</Button>
    )},
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Expenses"
        subtitle={`${expenses.length} expenses • Total: €${expenses.reduce((s, e) => s + (e.amount || 0), 0).toLocaleString()}`}
        onAdd={() => openForm()}
        addLabel="New Expense"
        searchValue={search}
        onSearch={setSearch}
      >
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-36 bg-card"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="transport">Transport</SelectItem>
            <SelectItem value="materials">Materials</SelectItem>
            <SelectItem value="equipment">Equipment</SelectItem>
            <SelectItem value="extra_cost">Extra Cost</SelectItem>
            <SelectItem value="labor">Labor</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
        <Select value={projectFilter} onValueChange={setProjectFilter}>
          <SelectTrigger className="w-40 bg-card"><SelectValue placeholder="All Projects" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Projects</SelectItem>
            {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </PageHeader>

      {filtered.length > 0 && (
        <div className="text-sm text-muted-foreground px-1">
          Showing <span className="font-semibold text-foreground">{filtered.length}</span> results • Total: <span className="font-semibold text-warning">€{totalFiltered.toLocaleString()}</span>
        </div>
      )}

      <DataTable columns={columns} data={filtered} isLoading={isLoading} />

      <FormDialog open={showForm} onOpenChange={setShowForm} title={editing ? "Edit Expense" : "New Expense"}>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Label>Expense Name</Label>
            <Input value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <Label>Category</Label>
            <Select value={form.category || "materials"} onValueChange={(v) => setForm({ ...form, category: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="transport">Transport</SelectItem>
                <SelectItem value="materials">Materials</SelectItem>
                <SelectItem value="equipment">Equipment</SelectItem>
                <SelectItem value="extra_cost">Extra Cost</SelectItem>
                <SelectItem value="labor">Labor</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Amount (€)</Label>
            <Input type="number" value={form.amount || ""} onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })} />
          </div>
          <div>
            <Label>Date</Label>
            <Input type="date" value={form.date || ""} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </div>
          <div>
            <Label>Responsible</Label>
            <Input value={form.responsible || ""} onChange={(e) => setForm({ ...form, responsible: e.target.value })} />
          </div>
          <div className="col-span-2">
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
          <div className="col-span-2">
            <Label>Notes</Label>
            <Textarea value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
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