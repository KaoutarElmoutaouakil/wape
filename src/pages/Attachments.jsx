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
import { Upload, X, ExternalLink, Info } from "lucide-react";

export default function Attachments() {
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ validation_status: "pending", photos: [], documents: [], use_estimated_cost: true });
  const [uploading, setUploading] = useState(false);
  const queryClient = useQueryClient();

  const { data: attachments = [], isLoading } = useQuery({ queryKey: ["attachments"], queryFn: () => base44.entities.Attachment.list("-created_date") });
  const { data: tasks = [] } = useQuery({ queryKey: ["tasks"], queryFn: () => base44.entities.Task.list() });
  const { data: expenses = [] } = useQuery({ queryKey: ["expenses"], queryFn: () => base44.entities.Expense.list() });
  const { data: subcontractors = [] } = useQuery({ queryKey: ["subcontractors"], queryFn: () => base44.entities.Subcontractor.list() });
  const { data: projects = [] } = useQuery({ queryKey: ["projects"], queryFn: () => base44.entities.Project.list() });

  const selectedTask = tasks.find(t => t.id === form.task_id);
  const taskEstimatedCost = selectedTask?.estimated_cost || 0;

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const taskExpenses = expenses.filter(e => e.task_id === data.task_id);
      const expensesTotal = taskExpenses.reduce((s, e) => s + (e.amount || 0), 0);
      const real_cost = data.use_estimated_cost
        ? taskEstimatedCost
        : (data.real_personnel_cost || 0) + (data.real_materials_cost || 0) + expensesTotal;

      const savedAtt = editing
        ? await base44.entities.Attachment.update(editing.id, { ...data, real_cost })
        : await base44.entities.Attachment.create({ ...data, real_cost });

      // If validated and subcontractor linked → create/update invoice
      if (data.validation_status === "approved" && data.subcontractor_id) {
        const sub = subcontractors.find(s => s.id === data.subcontractor_id);
        await base44.entities.Invoice.create({
          invoice_number: `ATT-${savedAtt.id?.slice(-6)}`,
          type: "subcontractor",
          project_id: data.project_id,
          project_name: data.project_name,
          task_id: data.task_id,
          task_name: data.task_name,
          recipient: sub?.company_name || data.subcontractor_name,
          amount: real_cost,
          date: new Date().toISOString().split("T")[0],
          status: "sent",
          notes: `Auto-generated from validated attachment ${savedAtt.id?.slice(-6)}`,
        });
        queryClient.invalidateQueries({ queryKey: ["invoices"] });
      }

      // Reduce project budget if cost changed
      if (real_cost && data.project_id) {
        const project = projects.find(p => p.id === data.project_id);
        if (project && project.estimated_budget) {
          const prevCost = editing?.real_cost || 0;
          const delta = real_cost - prevCost;
          if (delta !== 0) {
            await base44.entities.Project.update(data.project_id, {
              estimated_budget: Math.max(0, (project.estimated_budget || 0) - delta),
            });
            queryClient.invalidateQueries({ queryKey: ["projects"] });
          }
        }
      }

      return savedAtt;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attachments"] });
      setShowForm(false);
      setEditing(null);
    },
  });

  const openForm = (att = null) => {
    setEditing(att);
    setForm(att
      ? { ...att, photos: att.photos || [], documents: att.documents || [], use_estimated_cost: true }
      : { validation_status: "pending", photos: [], documents: [], use_estimated_cost: true }
    );
    setShowForm(true);
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

  const uploadDoc = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm(f => ({ ...f, documents: [...(f.documents || []), { name: file.name, url: file_url }] }));
    setUploading(false);
  };

  const handleTaskChange = (tid) => {
    const t = tasks.find(x => x.id === tid);
    setForm(f => ({ ...f, task_id: tid, task_name: t?.name || "", project_id: t?.project_id || "", project_name: t?.project_name || "", use_estimated_cost: true }));
  };

  const filtered = attachments.filter(a =>
    !search || a.task_name?.toLowerCase().includes(search.toLowerCase()) || a.project_name?.toLowerCase().includes(search.toLowerCase())
  );

  const columns = [
    { header: "Task", cell: (row) => <div><p className="font-medium">{row.task_name}</p><p className="text-xs text-muted-foreground">{row.project_name}</p></div> },
    { header: "Photos", cell: (row) => <span className="text-xs">{(row.photos || []).length} photos</span> },
    { header: "Documents", cell: (row) => <span className="text-xs">{(row.documents || []).length} docs</span> },
    { header: "Validation", cell: (row) => <StatusBadge status={row.validation_status} /> },
    { header: "Verified by", accessor: "verified_by" },
    { header: "Real Cost", cell: (row) => row.real_cost ? <span className="font-semibold text-warning">€{row.real_cost.toLocaleString()}</span> : "—" },
    { header: "Date", cell: (row) => row.validation_date ? format(new Date(row.validation_date), "MMM d, yyyy") : "—" },
    { header: "", cell: (row) => <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => openForm(row)}>Edit</Button> },
  ];

  return (
    <div className="space-y-4">
      <PageHeader title="Attachments & Validation" subtitle={`${attachments.length} entries`} onAdd={() => openForm()} addLabel="New Attachment" searchValue={search} onSearch={setSearch} />
      <DataTable columns={columns} data={filtered} isLoading={isLoading} />

      <FormDialog open={showForm} onOpenChange={setShowForm} title={editing ? "Edit Attachment" : "New Attachment"}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Task</Label>
              <Select value={form.task_id || ""} onValueChange={handleTaskChange}>
                <SelectTrigger><SelectValue placeholder="Select task" /></SelectTrigger>
                <SelectContent>
                  {tasks.map(t => <SelectItem key={t.id} value={t.id}>{t.name} ({t.project_name})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Estimated cost display */}
            {form.task_id && taskEstimatedCost > 0 && (
              <div className="col-span-2 p-3 rounded-lg bg-primary/5 border border-primary/20 flex items-start gap-2">
                <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Task Estimated Cost: <span className="text-primary font-bold">€{taskEstimatedCost.toLocaleString()}</span></p>
                  <div className="flex gap-3 mt-2">
                    <label className="flex items-center gap-2 cursor-pointer text-sm">
                      <input type="radio" checked={form.use_estimated_cost === true} onChange={() => setForm(f => ({ ...f, use_estimated_cost: true }))} />
                      Use estimated cost
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-sm">
                      <input type="radio" checked={form.use_estimated_cost === false} onChange={() => setForm(f => ({ ...f, use_estimated_cost: false }))} />
                      Enter real cost
                    </label>
                  </div>
                </div>
              </div>
            )}

            <div>
              <Label>Validation Status</Label>
              <Select value={form.validation_status || "pending"} onValueChange={(v) => setForm({ ...form, validation_status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Verified By</Label><Input value={form.verified_by || ""} onChange={(e) => setForm({ ...form, verified_by: e.target.value })} /></div>
            <div><Label>Validation Date</Label><Input type="date" value={form.validation_date || ""} onChange={(e) => setForm({ ...form, validation_date: e.target.value })} /></div>

            {/* Subcontractor linking for invoice */}
            <div>
              <Label>Linked Subcontractor (for invoice)</Label>
              <Select value={form.subcontractor_id || ""} onValueChange={(v) => {
                const s = subcontractors.find(x => x.id === v);
                setForm({ ...form, subcontractor_id: v, subcontractor_name: s?.company_name || "" });
              }}>
                <SelectTrigger><SelectValue placeholder="Optional — triggers invoice on approval" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>None</SelectItem>
                  {subcontractors.map(s => <SelectItem key={s.id} value={s.id}>{s.company_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Real Cost breakdown (shown when not using estimated) */}
          {(!form.use_estimated_cost || !taskEstimatedCost) && (
            <div className="p-3 rounded-lg bg-muted/30 space-y-2">
              <Label className="text-xs font-semibold uppercase text-muted-foreground">Real Cost Breakdown</Label>
              <div className="grid grid-cols-3 gap-2">
                <div><Label className="text-xs">Personnel Cost (€)</Label><Input type="number" value={form.real_personnel_cost || ""} onChange={(e) => setForm({ ...form, real_personnel_cost: parseFloat(e.target.value) || 0 })} /></div>
                <div><Label className="text-xs">Materials Cost (€)</Label><Input type="number" value={form.real_materials_cost || ""} onChange={(e) => setForm({ ...form, real_materials_cost: parseFloat(e.target.value) || 0 })} /></div>
                <div><Label className="text-xs">Hours Worked</Label><Input type="number" value={form.real_hours || ""} onChange={(e) => setForm({ ...form, real_hours: parseFloat(e.target.value) || 0 })} /></div>
              </div>
            </div>
          )}

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
                  <img src={url} className="w-16 h-16 object-cover rounded-lg border border-border" />
                  <button className="absolute -top-1 -right-1 bg-destructive rounded-full p-0.5" onClick={() => setForm(f => ({ ...f, photos: f.photos.filter((_, idx) => idx !== i) }))}>
                    <X className="w-2.5 h-2.5 text-white" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Supporting docs */}
          <div>
            <Label className="mb-1 block">Supporting Documents</Label>
            <label className="flex items-center gap-2 cursor-pointer px-3 py-2 rounded-md border border-dashed border-border hover:bg-muted/30 text-sm text-muted-foreground w-fit">
              <Upload className="w-4 h-4" /> Upload document
              <input type="file" className="hidden" onChange={uploadDoc} />
            </label>
            <div className="mt-2 space-y-1">
              {(form.documents || []).map((doc, i) => (
                <div key={i} className="flex items-center gap-2 p-2 rounded bg-muted/30 text-xs">
                  <span className="flex-1 truncate">{doc.name}</span>
                  <a href={doc.url} target="_blank" rel="noopener noreferrer"><ExternalLink className="w-3 h-3 text-primary" /></a>
                  <X className="w-3 h-3 cursor-pointer text-muted-foreground" onClick={() => setForm(f => ({ ...f, documents: f.documents.filter((_, idx) => idx !== i) }))} />
                </div>
              ))}
            </div>
          </div>

          <div><Label>Notes</Label><Textarea value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending}>{saveMutation.isPending ? "Saving..." : "Save"}</Button>
          </div>
        </div>
      </FormDialog>
    </div>
  );
}