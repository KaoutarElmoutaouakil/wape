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
import { format } from "date-fns";

export default function Tools() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const queryClient = useQueryClient();

  const { data: tools = [], isLoading } = useQuery({
    queryKey: ["tools"],
    queryFn: () => base44.entities.Tool.list("-created_date"),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: () => base44.entities.Project.list(),
  });

  const saveMutation = useMutation({
    mutationFn: (data) => editing
      ? base44.entities.Tool.update(editing.id, data)
      : base44.entities.Tool.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tools"] });
      setShowForm(false);
      setEditing(null);
    },
  });

  const openForm = (tool = null) => {
    setEditing(tool);
    setForm(tool || { status: "available", category: "other" });
    setShowForm(true);
  };

  const handleProjectChange = (pid) => {
    const proj = projects.find(p => p.id === pid);
    setForm({ ...form, assigned_project_id: pid, assigned_project_name: proj?.name || "" });
  };

  const filtered = tools.filter(t => {
    const matchSearch = !search || t.name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || t.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const columns = [
    { header: "Tool", cell: (row) => (
      <div>
        <p className="font-medium">{row.name}</p>
        <p className="text-xs text-muted-foreground">{row.serial_number}</p>
      </div>
    )},
    { header: "Category", cell: (row) => <span className="capitalize text-xs">{row.category?.replace("_", " ")}</span> },
    { header: "Location", accessor: "location" },
    { header: "Project", accessor: "assigned_project_name" },
    { header: "Purchase Date", cell: (row) => row.purchase_date ? format(new Date(row.purchase_date), "MMM d, yyyy") : "—" },
    { header: "Cost", cell: (row) => row.purchase_cost ? `€${row.purchase_cost.toLocaleString()}` : "—" },
    { header: "Status", cell: (row) => <StatusBadge status={row.status} /> },
    { header: "", cell: (row) => (
      <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => openForm(row)}>Edit</Button>
    )},
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Tools & Equipment"
        subtitle={`${tools.length} items`}
        onAdd={() => openForm()}
        addLabel="New Tool"
        searchValue={search}
        onSearch={setSearch}
      >
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36 bg-card"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="available">Available</SelectItem>
            <SelectItem value="in_use">In Use</SelectItem>
            <SelectItem value="maintenance">Maintenance</SelectItem>
            <SelectItem value="retired">Retired</SelectItem>
          </SelectContent>
        </Select>
      </PageHeader>

      <DataTable columns={columns} data={filtered} isLoading={isLoading} />

      <FormDialog open={showForm} onOpenChange={setShowForm} title={editing ? "Edit Tool" : "New Tool"}>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Label>Tool Name</Label>
            <Input value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <Label>Category</Label>
            <Select value={form.category || "other"} onValueChange={(v) => setForm({ ...form, category: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="hand_tools">Hand Tools</SelectItem>
                <SelectItem value="power_tools">Power Tools</SelectItem>
                <SelectItem value="heavy_equipment">Heavy Equipment</SelectItem>
                <SelectItem value="safety_equipment">Safety Equipment</SelectItem>
                <SelectItem value="measurement">Measurement</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Status</Label>
            <Select value={form.status || "available"} onValueChange={(v) => setForm({ ...form, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="in_use">In Use</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
                <SelectItem value="retired">Retired</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Serial Number</Label>
            <Input value={form.serial_number || ""} onChange={(e) => setForm({ ...form, serial_number: e.target.value })} />
          </div>
          <div>
            <Label>Location</Label>
            <Input value={form.location || ""} onChange={(e) => setForm({ ...form, location: e.target.value })} />
          </div>
          <div>
            <Label>Purchase Date</Label>
            <Input type="date" value={form.purchase_date || ""} onChange={(e) => setForm({ ...form, purchase_date: e.target.value })} />
          </div>
          <div>
            <Label>Purchase Cost (€)</Label>
            <Input type="number" value={form.purchase_cost || ""} onChange={(e) => setForm({ ...form, purchase_cost: parseFloat(e.target.value) || 0 })} />
          </div>
          <div className="col-span-2">
            <Label>Assigned Project</Label>
            <Select value={form.assigned_project_id || ""} onValueChange={handleProjectChange}>
              <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>No project</SelectItem>
                {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
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