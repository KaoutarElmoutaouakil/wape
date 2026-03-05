import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import PageHeader from "@/components/shared/PageHeader";
import DataTable from "@/components/shared/DataTable";
import FormDialog from "@/components/shared/FormDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { ExternalLink, Upload } from "lucide-react";

export default function Plans() {
  const [search, setSearch] = useState("");
  const [projectFilter, setProjectFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [uploading, setUploading] = useState(false);
  const queryClient = useQueryClient();

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ["plans"],
    queryFn: () => base44.entities.Plan.list("-created_date"),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: () => base44.entities.Project.list(),
  });

  const saveMutation = useMutation({
    mutationFn: (data) => editing
      ? base44.entities.Plan.update(editing.id, data)
      : base44.entities.Plan.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plans"] });
      setShowForm(false);
      setEditing(null);
    },
  });

  const openForm = (plan = null) => {
    setEditing(plan);
    setForm(plan || { version: "1.0" });
    setShowForm(true);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm({ ...form, file_url });
    setUploading(false);
  };

  const filtered = plans.filter(p => {
    const matchSearch = !search || p.name?.toLowerCase().includes(search.toLowerCase());
    const matchProj = projectFilter === "all" || p.project_id === projectFilter;
    return matchSearch && matchProj;
  });

  const columns = [
    { header: "Name", cell: (row) => (
      <div>
        <p className="font-medium">{row.name}</p>
        <p className="text-xs text-muted-foreground">v{row.version} • {row.author}</p>
      </div>
    )},
    { header: "Project", accessor: "project_name" },
    { header: "Upload Date", cell: (row) => row.upload_date ? format(new Date(row.upload_date), "MMM d, yyyy") : "—" },
    { header: "Description", cell: (row) => <span className="text-xs text-muted-foreground">{row.description}</span> },
    { header: "File", cell: (row) => row.file_url ? (
      <a href={row.file_url} target="_blank" rel="noopener noreferrer">
        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-primary">
          <ExternalLink className="w-3 h-3" /> Open
        </Button>
      </a>
    ) : "—" },
    { header: "", cell: (row) => (
      <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => openForm(row)}>Edit</Button>
    )},
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Plans"
        subtitle={`${plans.length} plans`}
        onAdd={() => openForm()}
        addLabel="Upload Plan"
        searchValue={search}
        onSearch={setSearch}
      >
        <Select value={projectFilter} onValueChange={setProjectFilter}>
          <SelectTrigger className="w-40 bg-card"><SelectValue placeholder="All Projects" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Projects</SelectItem>
            {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </PageHeader>

      <DataTable columns={columns} data={filtered} isLoading={isLoading} />

      <FormDialog open={showForm} onOpenChange={setShowForm} title={editing ? "Edit Plan" : "Upload Plan"}>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Label>Plan Name</Label>
            <Input value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <Label>Project</Label>
            <Select value={form.project_id || ""} onValueChange={(v) => {
              const proj = projects.find(p => p.id === v);
              setForm({ ...form, project_id: v, project_name: proj?.name || "" });
            }}>
              <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
              <SelectContent>
                {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Version</Label>
            <Input value={form.version || "1.0"} onChange={(e) => setForm({ ...form, version: e.target.value })} />
          </div>
          <div>
            <Label>Author</Label>
            <Input value={form.author || ""} onChange={(e) => setForm({ ...form, author: e.target.value })} />
          </div>
          <div>
            <Label>Upload Date</Label>
            <Input type="date" value={form.upload_date || ""} onChange={(e) => setForm({ ...form, upload_date: e.target.value })} />
          </div>
          <div className="col-span-2">
            <Label>File</Label>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer px-3 py-2 rounded-md border border-dashed border-border hover:bg-muted/30 transition-colors text-sm text-muted-foreground">
                <Upload className="w-4 h-4" />
                {uploading ? "Uploading..." : form.file_url ? "Replace file" : "Upload file"}
                <input type="file" className="hidden" onChange={handleFileUpload} disabled={uploading} />
              </label>
              {form.file_url && <a href={form.file_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1"><ExternalLink className="w-3 h-3" /> View</a>}
            </div>
          </div>
          <div className="col-span-2">
            <Label>Description</Label>
            <Textarea value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />
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