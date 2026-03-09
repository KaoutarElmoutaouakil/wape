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
import { ExternalLink, Upload, Eye, Download, FileText, X } from "lucide-react";

const isImage = (url) => url && /\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?.*)?$/i.test(url);

export default function Documents() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [moduleFilter, setModuleFilter] = useState("all");
  const [projectFilter, setProjectFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [uploading, setUploading] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);
  const queryClient = useQueryClient();

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ["documents"],
    queryFn: () => base44.entities.Document.list("-created_date"),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: () => base44.entities.Project.list(),
  });

  const saveMutation = useMutation({
    mutationFn: (data) => editing
      ? base44.entities.Document.update(editing.id, data)
      : base44.entities.Document.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      setShowForm(false);
      setEditing(null);
    },
  });

  const openForm = (doc = null) => {
    setEditing(doc);
    setForm(doc || { type: "other", version: "1.0" });
    setShowForm(true);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm({ ...form, file_url, name: form.name || file.name });
    setUploading(false);
  };

  const filtered = documents.filter(d => {
    const matchSearch = !search || d.name?.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "all" || d.type === typeFilter;
    const matchModule = moduleFilter === "all" || d.source_module === moduleFilter;
    const matchProj = projectFilter === "all" || d.project_id === projectFilter;
    return matchSearch && matchType && matchModule && matchProj;
  });

  const columns = [
    { header: "Name", cell: (row) => (
      <div className="flex items-center gap-2">
        {isImage(row.file_url)
          ? <img src={row.file_url} className="w-8 h-8 rounded object-cover border border-border shrink-0" />
          : <div className="w-8 h-8 rounded bg-muted flex items-center justify-center shrink-0"><FileText className="w-4 h-4 text-muted-foreground" /></div>
        }
        <div>
          <p className="font-medium">{row.name}</p>
          <p className="text-xs text-muted-foreground">v{row.version} • {row.author}</p>
        </div>
      </div>
    )},
    { header: "Type", cell: (row) => <StatusBadge status={row.type} /> },
    { header: "Module", cell: (row) => row.source_module
      ? <Badge variant="outline" className="text-xs capitalize">{row.source_module.replace(/_/g, " ")}</Badge>
      : "—"
    },
    { header: "Project", accessor: "project_name" },
    { header: "Uploaded by", accessor: "author" },
    { header: "Date", cell: (row) => format(new Date(row.created_date), "MMM d, yyyy") },
    { header: "", cell: (row) => (
      <div className="flex gap-1">
        {row.file_url && (
          <>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setPreviewDoc(row)} title="Preview">
              <Eye className="w-4 h-4" />
            </Button>
            <a href={row.file_url} download target="_blank" rel="noopener noreferrer">
              <Button variant="ghost" size="icon" className="h-8 w-8" title="Download">
                <Download className="w-4 h-4" />
              </Button>
            </a>
          </>
        )}
        <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => openForm(row)}>Edit</Button>
      </div>
    )},
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Documents"
        subtitle={`${documents.length} documents`}
        onAdd={() => openForm()}
        addLabel="Add Document"
        searchValue={search}
        onSearch={setSearch}
      >
        <Select value={moduleFilter} onValueChange={setModuleFilter}>
          <SelectTrigger className="w-36 bg-card"><SelectValue placeholder="All Modules" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Modules</SelectItem>
            <SelectItem value="task">Task</SelectItem>
            <SelectItem value="reception">Reception</SelectItem>
            <SelectItem value="non_conformity">Non Conformity</SelectItem>
            <SelectItem value="project">Project</SelectItem>
            <SelectItem value="invoice">Invoice</SelectItem>
            <SelectItem value="purchase_order">Purchase Order</SelectItem>
            <SelectItem value="manual">Manual</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-36 bg-card"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="contract">Contract</SelectItem>
            <SelectItem value="report">Report</SelectItem>
            <SelectItem value="permit">Permit</SelectItem>
            <SelectItem value="invoice">Invoice</SelectItem>
            <SelectItem value="plan">Plan</SelectItem>
            <SelectItem value="specification">Specification</SelectItem>
            <SelectItem value="BL">BL</SelectItem>
            <SelectItem value="BC">BC</SelectItem>
            <SelectItem value="photo">Photo</SelectItem>
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

      <DataTable columns={columns} data={filtered} isLoading={isLoading} />

      {/* Preview Dialog */}
      {previewDoc && (
        <FormDialog open={!!previewDoc} onOpenChange={() => setPreviewDoc(null)} title={previewDoc.name}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-muted-foreground">Type:</span> <span className="font-medium capitalize">{previewDoc.type}</span></div>
              <div><span className="text-muted-foreground">Module:</span> <span className="font-medium capitalize">{previewDoc.source_module?.replace(/_/g, " ") || "—"}</span></div>
              <div><span className="text-muted-foreground">Project:</span> <span className="font-medium">{previewDoc.project_name || "—"}</span></div>
              <div><span className="text-muted-foreground">Upload Date:</span> <span className="font-medium">{format(new Date(previewDoc.created_date), "MMM d, yyyy")}</span></div>
              <div className="col-span-2"><span className="text-muted-foreground">Uploaded by:</span> <span className="font-medium">{previewDoc.author || "—"}</span></div>
            </div>
            {previewDoc.description && (
              <div className="p-3 rounded-lg bg-muted/30 text-sm">{previewDoc.description}</div>
            )}
            {previewDoc.file_url && (
              <div className="rounded-lg border border-border overflow-hidden">
                {isImage(previewDoc.file_url) ? (
                  <img src={previewDoc.file_url} className="w-full max-h-96 object-contain" alt={previewDoc.name} />
                ) : (
                  <div className="p-6 text-center bg-muted/20">
                    <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground mb-3">Preview not available for this file type.</p>
                    <a href={previewDoc.file_url} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" className="gap-2">
                        <ExternalLink className="w-4 h-4" /> Open in new tab
                      </Button>
                    </a>
                  </div>
                )}
              </div>
            )}
            <div className="flex gap-2 justify-end">
              <a href={previewDoc.file_url} download target="_blank" rel="noopener noreferrer">
                <Button variant="outline" className="gap-2"><Download className="w-4 h-4" /> Download</Button>
              </a>
            </div>
          </div>
        </FormDialog>
      )}

      <FormDialog open={showForm} onOpenChange={setShowForm} title={editing ? "Edit Document" : "Add Document"}>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Label>Document Name</Label>
            <Input value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <Label>Type</Label>
            <Select value={form.type || "other"} onValueChange={(v) => setForm({ ...form, type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="contract">Contract</SelectItem>
                <SelectItem value="report">Report</SelectItem>
                <SelectItem value="permit">Permit</SelectItem>
                <SelectItem value="invoice">Invoice</SelectItem>
                <SelectItem value="plan">Plan</SelectItem>
                <SelectItem value="specification">Specification</SelectItem>
                <SelectItem value="other">Other</SelectItem>
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
            <Label>File Upload</Label>
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