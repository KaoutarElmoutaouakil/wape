import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import PageHeader from "@/components/shared/PageHeader";
import DataTable from "@/components/shared/DataTable";
import StatusBadge from "@/components/shared/StatusBadge";
import FormDialog from "@/components/shared/FormDialog";
import SearchableSelect from "@/components/shared/SearchableSelect";
import PlanAnnotator from "@/components/nc/PlanAnnotator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Upload, X, Image, List, Kanban } from "lucide-react";
import NCKanbanBoard from "@/components/nc/NCKanbanBoard";
import PlanViewer from "@/components/nc/PlanViewer";

function ImagePreviewModal({ url, onClose }) {
  if (!url) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80" onClick={onClose}>
      <div className="relative max-w-4xl max-h-[90vh] p-2" onClick={e => e.stopPropagation()}>
        <button className="absolute top-0 right-0 bg-white/20 hover:bg-white/40 rounded-full p-1 m-1" onClick={onClose}>
          <X className="w-5 h-5 text-white" />
        </button>
        <img src={url} className="max-w-full max-h-[85vh] object-contain rounded-lg" alt="Preview" />
      </div>
    </div>
  );
}

export default function NonConformities() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ status: "open", severity: "medium", photos: [], assigned_personnel: [] });
  const [uploading, setUploading] = useState(false);
  const [view, setView] = useState("list");
  const [previewImage, setPreviewImage] = useState(null);
  const [planViewerNC, setPlanViewerNC] = useState(null);
  const queryClient = useQueryClient();

  const { data: ncs = [], isLoading } = useQuery({ queryKey: ["ncs"], queryFn: () => base44.entities.NonConformity.list("-created_date") });
  const { data: projects = [] } = useQuery({ queryKey: ["projects"], queryFn: () => base44.entities.Project.list() });
  const { data: plans = [] } = useQuery({ queryKey: ["plans"], queryFn: () => base44.entities.Plan.list() });
  const { data: personnel = [] } = useQuery({ queryKey: ["personnel"], queryFn: () => base44.entities.Personnel.list() });

  const projectPlans = plans.filter(p => p.project_id === form.project_id);
  const selectedPlan = plans.find(p => p.id === form.plan_id);

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.NonConformity.update(id, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ncs"] }),
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const nc = editing
        ? await base44.entities.NonConformity.update(editing.id, data)
        : await base44.entities.NonConformity.create(data);

      // Notify assigned personnel via Communication
      if (data.assigned_personnel?.length) {
        for (const person of data.assigned_personnel) {
          await base44.entities.Communication.create({
            message: `🚨 You have been assigned to Non Conformity: "${data.title}" (Severity: ${data.severity})`,
            author: "WAPE System",
            type: "notification",
            project_id: data.project_id,
            project_name: data.project_name,
          });
        }
        queryClient.invalidateQueries({ queryKey: ["communications"] });
      }
      return nc;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ncs"] });
      setShowForm(false);
      setEditing(null);
    },
  });

  const openForm = (nc = null) => {
    setEditing(nc);
    setForm(nc ? { ...nc, photos: nc.photos || [], assigned_personnel: nc.assigned_personnel || [] } : { status: "open", severity: "medium", photos: [], assigned_personnel: [] });
    setShowForm(true);
  };

  const addPerson = (p) => {
    if (form.assigned_personnel?.some(ap => ap.id === p.id)) return;
    setForm({ ...form, assigned_personnel: [...(form.assigned_personnel || []), { id: p.id, name: p.label }] });
  };

  const uploadPhoto = async (e) => {
    const files = Array.from(e.target.files);
    setUploading(true);
    for (const file of files) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setForm(f => ({ ...f, photos: [...(f.photos || []), file_url] }));
    }
    setUploading(false);
  };

  const filtered = ncs.filter(nc => {
    const matchSearch = !search || nc.title?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || nc.status === statusFilter;
    const matchSev = severityFilter === "all" || nc.severity === severityFilter;
    return matchSearch && matchStatus && matchSev;
  });

  const columns = [
    { header: "Title", cell: (row) => <div><p className="font-medium">{row.title}</p><p className="text-xs text-muted-foreground">{row.location}</p></div> },
    { header: "Project", accessor: "project_name" },
    { header: "Plan", accessor: "plan_name" },
    { header: "Severity", cell: (row) => <StatusBadge status={row.severity} /> },
    { header: "Status", cell: (row) => <StatusBadge status={row.status || "open"} /> },
    { header: "Assigned", cell: (row) => <span className="text-xs">{(row.assigned_personnel || []).map(p => p.name).join(", ") || row.assigned_person || "—"}</span> },
    { header: "Photos", cell: (row) => (
      <div className="flex gap-1">
        {(row.photos || []).slice(0, 3).map((url, i) => (
          <img key={i} src={url} className="w-8 h-8 rounded object-cover border border-border cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setPreviewImage(url)} />
        ))}
        {(row.photos || []).length > 3 && <span className="text-xs text-muted-foreground self-center">+{row.photos.length - 3}</span>}
        {(row.photos || []).length === 0 && <span className="text-xs text-muted-foreground">—</span>}
      </div>
    )},
    { header: "Deadline", cell: (row) => row.deadline ? format(new Date(row.deadline), "MMM d, yyyy") : "—" },
    { header: "", cell: (row) => (
      <div className="flex gap-1">
        {row.plan_id && row.plan_annotation && (
          <Button variant="ghost" size="sm" className="h-8 text-xs text-primary" onClick={() => setPlanViewerNC(row)}>View Plan</Button>
        )}
        <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => openForm(row)}>Edit</Button>
      </div>
    )},
  ];

  return (
    <div className="space-y-4">
      <ImagePreviewModal url={previewImage} onClose={() => setPreviewImage(null)} />
      {planViewerNC && (
        <PlanViewer
          planUrl={plans.find(p => p.id === planViewerNC.plan_id)?.file_url}
          annotations={planViewerNC.plan_annotation}
          onClose={() => setPlanViewerNC(null)}
        />
      )}
      <PageHeader title="Non Conformities" subtitle={`${ncs.filter(nc => nc.status === "open").length} open`} onAdd={() => openForm()} addLabel="New NC" searchValue={search} onSearch={setSearch}>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36 bg-card"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="in_review">In Review</SelectItem>
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
        <div className="flex border border-border rounded-md overflow-hidden">
          <Button variant={view === "list" ? "default" : "ghost"} size="sm" className="h-9 rounded-none" onClick={() => setView("list")}><List className="w-4 h-4" /></Button>
          <Button variant={view === "kanban" ? "default" : "ghost"} size="sm" className="h-9 rounded-none gap-1" onClick={() => setView("kanban")}><Kanban className="w-4 h-4" />Kanban</Button>
        </div>
      </PageHeader>

      {view === "list" && <DataTable columns={columns} data={filtered} isLoading={isLoading} />}
      {view === "kanban" && (
        <NCKanbanBoard
          ncs={filtered}
          onStatusChange={(id, status) => updateStatusMutation.mutate({ id, status })}
          onEdit={openForm}
        />
      )}

      <FormDialog open={showForm} onOpenChange={setShowForm} title={editing ? "Edit Non Conformity" : "New Non Conformity"}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2"><Label>Title</Label><Input value={form.title || ""} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div>
              <Label>Project</Label>
              <Select value={form.project_id || ""} onValueChange={(v) => { const p = projects.find(x => x.id === v); setForm({ ...form, project_id: v, project_name: p?.name || "", plan_id: "", plan_name: "" }); }}>
                <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>No project</SelectItem>
                  {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Location</Label><Input value={form.location || ""} onChange={(e) => setForm({ ...form, location: e.target.value })} /></div>
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
                  <SelectItem value="in_review">In Review</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Deadline</Label><Input type="date" value={form.deadline || ""} onChange={(e) => setForm({ ...form, deadline: e.target.value })} /></div>
          </div>

          {/* Plan selection + annotation */}
          <div>
            <Label className="mb-1 block">Related Plan</Label>
            {form.project_id ? (
              <Select value={form.plan_id || ""} onValueChange={(v) => { const pl = plans.find(x => x.id === v); setForm({ ...form, plan_id: v, plan_name: pl?.name || "", plan_annotation: "" }); }}>
                <SelectTrigger><SelectValue placeholder="Select plan" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>No plan</SelectItem>
                  {projectPlans.map(pl => <SelectItem key={pl.id} value={pl.id}>{pl.name}</SelectItem>)}
                </SelectContent>
              </Select>
            ) : <p className="text-xs text-muted-foreground">Select a project first</p>}

            {form.plan_id && selectedPlan?.file_url && (
              <div className="mt-3">
                <Label className="text-xs text-muted-foreground mb-1 block">Annotate Plan — mark the NC location</Label>
                <PlanAnnotator
                  planUrl={selectedPlan.file_url}
                  annotations={form.plan_annotation ? JSON.parse(form.plan_annotation) : []}
                  onChange={(paths) => setForm({ ...form, plan_annotation: JSON.stringify(paths) })}
                />
              </div>
            )}
          </div>

          {/* Personnel */}
          <div>
            <Label className="mb-1 block">Assigned Personnel</Label>
            <SearchableSelect items={personnel.map(p => ({ id: p.id, label: p.name }))} onSelect={addPerson} placeholder="Search personnel..." />
            <div className="flex flex-wrap gap-1 mt-2">
              {(form.assigned_personnel || []).map(p => (
                <Badge key={p.id} variant="secondary" className="flex items-center gap-1 text-xs">
                  {p.name}
                  <X className="w-3 h-3 cursor-pointer" onClick={() => setForm({ ...form, assigned_personnel: form.assigned_personnel.filter(x => x.id !== p.id) })} />
                </Badge>
              ))}
            </div>
          </div>

          {/* Photos */}
          <div>
            <Label className="mb-1 block">Photos</Label>
            <label className="flex items-center gap-2 cursor-pointer px-3 py-2 rounded-md border border-dashed border-border hover:bg-muted/30 text-sm text-muted-foreground w-fit">
              <Upload className="w-4 h-4" /> {uploading ? "Uploading..." : "Upload photos"}
              <input type="file" multiple accept="image/*" className="hidden" onChange={uploadPhoto} />
            </label>
            <div className="flex flex-wrap gap-2 mt-2">
              {(form.photos || []).map((url, i) => (
                <div key={i} className="relative">
                  <img src={url} className="w-16 h-16 object-cover rounded-lg border border-border cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setPreviewImage(url)} />
                  <button className="absolute -top-1 -right-1 bg-destructive rounded-full p-0.5" onClick={() => setForm(f => ({ ...f, photos: f.photos.filter((_, idx) => idx !== i) }))}>
                    <X className="w-2.5 h-2.5 text-white" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div><Label>Description</Label><Textarea value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div><Label>Resolution</Label><Textarea value={form.resolution || ""} onChange={(e) => setForm({ ...form, resolution: e.target.value })} placeholder="How was this resolved?" /></div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Saving..." : "Save & Notify"}
            </Button>
          </div>
        </div>
      </FormDialog>
    </div>
  );
}