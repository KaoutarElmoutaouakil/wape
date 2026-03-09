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
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Upload, ArrowRight, ArrowLeft, Plus } from "lucide-react";

export default function Tools() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [showMovementForm, setShowMovementForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [movForm, setMovForm] = useState({ movement_type: "OUT" });
  const [uploading, setUploading] = useState(false);
  const queryClient = useQueryClient();

  const { data: tools = [], isLoading } = useQuery({ queryKey: ["tools"], queryFn: () => base44.entities.Tool.list("-created_date") });
  const { data: projects = [] } = useQuery({ queryKey: ["projects"], queryFn: () => base44.entities.Project.list() });
  const { data: movements = [] } = useQuery({ queryKey: ["tool-movements"], queryFn: () => base44.entities.ToolMovement.list("-created_date") });

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

  const saveMovMutation = useMutation({
    mutationFn: async (data) => {
      const mv = await base44.entities.ToolMovement.create(data);
      // Update tool status
      const newStatus = data.movement_type === "OUT" ? "in_use" : "available";
      await base44.entities.Tool.update(data.tool_id, { status: newStatus });
      queryClient.invalidateQueries({ queryKey: ["tools"] });
      return mv;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tool-movements"] });
      setShowMovementForm(false);
      setMovForm({ movement_type: "OUT" });
    },
  });

  const openForm = (tool = null) => {
    setEditing(tool);
    setForm(tool || { status: "available", category: "other" });
    setShowForm(true);
  };

  const uploadPhoto = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm(f => ({ ...f, photo_url: file_url }));
    setUploading(false);
  };

  const filtered = tools.filter(t => {
    const matchSearch = !search || t.name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || t.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const columns = [
    { header: "Tool", cell: (row) => (
      <div className="flex items-center gap-3">
        {row.photo_url
          ? <img src={row.photo_url} className="w-10 h-10 rounded-lg object-cover border border-border shrink-0" />
          : <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0 text-muted-foreground text-xs">No photo</div>
        }
        <div>
          <p className="font-medium">{row.name}</p>
          <p className="text-xs text-muted-foreground">{row.serial_number}</p>
        </div>
      </div>
    )},
    { header: "Category", cell: (row) => <span className="capitalize text-xs">{row.category?.replace("_", " ")}</span> },
    { header: "Location", accessor: "location" },
    { header: "Project", accessor: "assigned_project_name" },
    { header: "Cost", cell: (row) => row.purchase_cost ? `€${row.purchase_cost.toLocaleString()}` : "—" },
    { header: "Status", cell: (row) => <StatusBadge status={row.status} /> },
    { header: "", cell: (row) => <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => openForm(row)}>Edit</Button> },
  ];

  const movColumns = [
    { header: "Date", cell: (row) => row.date ? format(new Date(row.date), "MMM d, yyyy") : "—" },
    { header: "Tool", accessor: "tool_name" },
    { header: "Type", cell: (row) => (
      <Badge variant="outline" className={`text-xs ${row.movement_type === "OUT" ? "bg-destructive/10 text-destructive" : "bg-success/10 text-success"}`}>
        {row.movement_type === "OUT" ? <ArrowRight className="w-3 h-3 inline mr-1" /> : <ArrowLeft className="w-3 h-3 inline mr-1" />}
        {row.movement_type}
      </Badge>
    )},
    { header: "Project", accessor: "project_name" },
    { header: "Responsible", accessor: "responsible" },
    { header: "Notes", cell: (row) => <span className="text-xs text-muted-foreground">{row.notes}</span> },
  ];

  return (
    <div className="space-y-6">
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
        <Button variant="outline" onClick={() => setShowMovementForm(true)}>
          <Plus className="w-4 h-4 mr-1" /> Tool Movement
        </Button>
      </PageHeader>

      <DataTable columns={columns} data={filtered} isLoading={isLoading} />

      {/* Tool Movements Section */}
      <div>
        <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">Recent Tool Movements</h3>
        <DataTable columns={movColumns} data={movements.slice(0, 20)} />
      </div>

      {/* Tool Form */}
      <FormDialog open={showForm} onOpenChange={setShowForm} title={editing ? "Edit Tool" : "New Tool"}>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Label>Tool Name</Label>
            <Input value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="col-span-2">
            <Label>Tool Photo</Label>
            <label className="flex items-center gap-2 cursor-pointer px-3 py-2 rounded-md border border-dashed border-border hover:bg-muted/30 text-sm text-muted-foreground w-fit">
              <Upload className="w-4 h-4" /> {uploading ? "Uploading..." : form.photo_url ? "Replace photo" : "Upload photo"}
              <input type="file" accept="image/*" className="hidden" onChange={uploadPhoto} disabled={uploading} />
            </label>
            {form.photo_url && <img src={form.photo_url} className="mt-2 w-24 h-24 rounded-lg object-cover border border-border" />}
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
            <Select value={form.assigned_project_id || ""} onValueChange={(v) => {
              const proj = projects.find(p => p.id === v);
              setForm({ ...form, assigned_project_id: v, assigned_project_name: proj?.name || "" });
            }}>
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

      {/* Movement Form */}
      <FormDialog open={showMovementForm} onOpenChange={setShowMovementForm} title="New Tool Movement">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Label>Tool</Label>
            <Select value={movForm.tool_id || ""} onValueChange={(v) => {
              const t = tools.find(x => x.id === v);
              setMovForm({ ...movForm, tool_id: v, tool_name: t?.name || "" });
            }}>
              <SelectTrigger><SelectValue placeholder="Select tool" /></SelectTrigger>
              <SelectContent>
                {tools.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Movement Type</Label>
            <Select value={movForm.movement_type} onValueChange={(v) => setMovForm({ ...movForm, movement_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="OUT">OUT — Dispatched</SelectItem>
                <SelectItem value="IN">IN — Returned</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Date</Label>
            <Input type="date" value={movForm.date || ""} onChange={(e) => setMovForm({ ...movForm, date: e.target.value })} />
          </div>
          <div>
            <Label>Responsible Person</Label>
            <Input value={movForm.responsible || ""} onChange={(e) => setMovForm({ ...movForm, responsible: e.target.value })} />
          </div>
          <div>
            <Label>Project</Label>
            <Select value={movForm.project_id || ""} onValueChange={(v) => {
              const p = projects.find(x => x.id === v);
              setMovForm({ ...movForm, project_id: v, project_name: p?.name || "" });
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
            <Textarea value={movForm.notes || ""} onChange={(e) => setMovForm({ ...movForm, notes: e.target.value })} />
          </div>
          <div className="col-span-2 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowMovementForm(false)}>Cancel</Button>
            <Button onClick={() => saveMovMutation.mutate(movForm)} disabled={saveMovMutation.isPending || !movForm.tool_id}>
              {saveMovMutation.isPending ? "Saving..." : "Save Movement"}
            </Button>
          </div>
        </div>
      </FormDialog>
    </div>
  );
}