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

export default function Personnel() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const queryClient = useQueryClient();

  const { data: personnel = [], isLoading } = useQuery({
    queryKey: ["personnel"],
    queryFn: () => base44.entities.Personnel.list("-created_date"),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: () => base44.entities.Project.list(),
  });

  const saveMutation = useMutation({
    mutationFn: (data) => editing
      ? base44.entities.Personnel.update(editing.id, data)
      : base44.entities.Personnel.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["personnel"] });
      setShowForm(false);
      setEditing(null);
    },
  });

  const openForm = (person = null) => {
    setEditing(person);
    setForm(person || { status: "active", contract_type: "CDI" });
    setShowForm(true);
  };

  const handleProjectChange = (pid) => {
    const proj = projects.find(p => p.id === pid);
    setForm({ ...form, assigned_project_id: pid, assigned_project_name: proj?.name || "" });
  };

  const filtered = personnel.filter(p => {
    const matchSearch = !search || p.name?.toLowerCase().includes(search.toLowerCase()) || p.job_title?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const columns = [
    { header: "Name", cell: (row) => (
      <div>
        <p className="font-medium">{row.name}</p>
        <p className="text-xs text-muted-foreground">{row.job_title}</p>
      </div>
    )},
    { header: "Function", accessor: "function" },
    { header: "Contract", cell: (row) => <span className="text-xs font-medium">{row.contract_type}</span> },
    { header: "Project", accessor: "assigned_project_name" },
    { header: "Hours/week", cell: (row) => row.working_hours ? `${row.working_hours}h` : "—" },
    { header: "Status", cell: (row) => <StatusBadge status={row.status} /> },
    { header: "Contact", cell: (row) => (
      <div className="text-xs text-muted-foreground">
        <p>{row.email}</p>
        <p>{row.phone}</p>
      </div>
    )},
    { header: "", cell: (row) => (
      <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => openForm(row)}>Edit</Button>
    )},
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Personnel"
        subtitle={`${personnel.length} employees`}
        onAdd={() => openForm()}
        addLabel="New Employee"
        searchValue={search}
        onSearch={setSearch}
      >
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-32 bg-card"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="on_leave">On Leave</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </PageHeader>

      <DataTable columns={columns} data={filtered} isLoading={isLoading} />

      <FormDialog open={showForm} onOpenChange={setShowForm} title={editing ? "Edit Employee" : "New Employee"}>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Label>Full Name</Label>
            <Input value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <Label>Job Title</Label>
            <Input value={form.job_title || ""} onChange={(e) => setForm({ ...form, job_title: e.target.value })} />
          </div>
          <div>
            <Label>Function</Label>
            <Input value={form.function || ""} onChange={(e) => setForm({ ...form, function: e.target.value })} />
          </div>
          <div>
            <Label>Contract Type</Label>
            <Select value={form.contract_type || "CDI"} onValueChange={(v) => setForm({ ...form, contract_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="CDI">CDI</SelectItem>
                <SelectItem value="CDD">CDD</SelectItem>
                <SelectItem value="Temporary">Temporary</SelectItem>
                <SelectItem value="Freelance">Freelance</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Status</Label>
            <Select value={form.status || "active"} onValueChange={(v) => setForm({ ...form, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="on_leave">On Leave</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Contract Start</Label>
            <Input type="date" value={form.contract_start || ""} onChange={(e) => setForm({ ...form, contract_start: e.target.value })} />
          </div>
          <div>
            <Label>Contract End</Label>
            <Input type="date" value={form.contract_end || ""} onChange={(e) => setForm({ ...form, contract_end: e.target.value })} />
          </div>
          <div>
            <Label>Salary (€)</Label>
            <Input type="number" value={form.salary || ""} onChange={(e) => setForm({ ...form, salary: parseFloat(e.target.value) || 0 })} />
          </div>
          <div>
            <Label>Weekly Hours</Label>
            <Input type="number" value={form.working_hours || ""} onChange={(e) => setForm({ ...form, working_hours: parseFloat(e.target.value) || 0 })} />
          </div>
          <div>
            <Label>Email</Label>
            <Input type="email" value={form.email || ""} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <Label>Phone</Label>
            <Input value={form.phone || ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
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