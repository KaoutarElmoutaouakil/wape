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
  const { data: personnel = [] } = useQuery({ queryKey: ["personnel"], queryFn: () => base44.entities.Personnel.list() });
  const { data: allArticles = [] } = useQuery({ queryKey: ["articles"], queryFn: () => base44.entities.Article.list() });
  const { data: tools = [] } = useQuery({ queryKey: ["tools"], queryFn: () => base44.entities.Tool.list() });

  // Only show completed tasks in the task selector
  const completedTasks = tasks.filter(t => t.status === "completed");

  const selectedTask = tasks.find(t => t.id === form.task_id);
  const taskEstimatedCost = selectedTask?.estimated_cost || 0;

  // Calculate detailed cost breakdown from task resources
  const taskCostBreakdown = selectedTask ? {
    personnel: (selectedTask.assigned_personnel || []).reduce((s, p) => {
      if (p.cost) return s + p.cost;
      const found = personnel.find(x => x.id === p.id);
      return s + (found?.salary ? found.salary / 160 * (p.hours || 8) : 0);
    }, 0),
    articles: (selectedTask.assigned_articles || []).reduce((s, a) => {
      if (a.unit_cost) return s + a.unit_cost * (a.quantity || 1);
      const found = allArticles.find(x => x.id === a.id);
      return s + ((found?.purchase_cost || 0) * (a.quantity || 1));
    }, 0),
    tools: (selectedTask.assigned_tools || []).reduce((s, t) => s + (t.cost || 0), 0),
  } : null;

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const taskExpenses = expenses.filter(e => e.task_id === data.task_id);
      const expensesTotal = taskExpenses.reduce((s, e) => s + (e.amount || 0), 0);
      const real_cost = data.use_estimated_cost
        ? taskEstimatedCost
        : (data.real_personnel_cost || 0) + (data.real_materials_cost || 0) + expensesTotal;

      const wasApproved = editing?.validation_status === "approved";
      const isNowApproved = data.validation_status === "approved";

      const savedAtt = editing
        ? await base44.entities.Attachment.update(editing.id, { ...data, real_cost })
        : await base44.entities.Attachment.create({ ...data, real_cost });

      // On approval (first time) → create invoice with status "draft" (pending invoice generation)
      if (isNowApproved && !wasApproved) {
        const sub = subcontractors.find(s => s.id === data.subcontractor_id);
        await base44.entities.Invoice.create({
          invoice_number: `ATT-${savedAtt.id?.slice(-6)}`,
          type: "subcontractor",
          project_id: data.project_id,
          project_name: data.project_name,
          task_id: data.task_id,
          task_name: data.task_name,
          recipient: sub?.company_name || data.subcontractor_name || data.task_name,
          amount: real_cost,
          date: new Date().toISOString().split("T")[0],
          status: "draft",
          notes: `Auto-generated from validated attachment — Task: ${data.task_name}`,
          items: [
            ...(taskCostBreakdown?.personnel ? [{ description: "Personnel costs", quantity: 1, unit_price: taskCostBreakdown.personnel }] : []),
            ...(taskCostBreakdown?.articles ? [{ description: "Materials/Articles", quantity: 1, unit_price: taskCostBreakdown.articles }] : []),
            ...(taskCostBreakdown?.tools ? [{ description: "Tools usage", quantity: 1, unit_price: taskCostBreakdown.tools }] : []),
          ],
        });
        queryClient.invalidateQueries({ queryKey: ["invoices"] });
      }

      // Create an Expense to track "Total Spent" in Finance
      if (isNowApproved && !wasApproved && real_cost > 0 && data.project_id) {
        await base44.entities.Expense.create({
          name: `Task completion: ${data.task_name}`,
          category: "labor",
          amount: real_cost,
          date: new Date().toISOString().split("T")[0],
          project_id: data.project_id,
          project_name: data.project_name,
          task_id: data.task_id,
          task_name: data.task_name,
          notes: `Auto-created from attachment validation`,
        });
        queryClient.invalidateQueries({ queryKey: ["expenses"] });
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
              <Label>Task (Completed only)</Label>
              <Select value={form.task_id || ""} onValueChange={handleTaskChange}>
                <SelectTrigger><SelectValue placeholder="Select a completed task..." /></SelectTrigger>
                <SelectContent>
                  {completedTasks.length === 0 && <SelectItem value="_none" disabled>No completed tasks yet</SelectItem>}
                  {completedTasks.map(t => <SelectItem key={t.id} value={t.id}>{t.name} ({t.project_name})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Detailed cost breakdown from task resources */}
            {form.task_id && taskCostBreakdown && (
              <div className="col-span-2 p-3 rounded-lg bg-primary/5 border border-primary/20 space-y-2">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-primary shrink-0" />
                  <p className="text-sm font-semibold text-primary">Task Cost Breakdown</p>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="p-2 rounded bg-white/60 border border-border text-center">
                    <p className="text-muted-foreground">Personnel</p>
                    <p className="font-bold text-foreground">€{taskCostBreakdown.personnel.toLocaleString()}</p>
                  </div>
                  <div className="p-2 rounded bg-white/60 border border-border text-center">
                    <p className="text-muted-foreground">Articles</p>
                    <p className="font-bold text-foreground">€{taskCostBreakdown.articles.toLocaleString()}</p>
                  </div>
                  <div className="p-2 rounded bg-white/60 border border-border text-center">
                    <p className="text-muted-foreground">Tools</p>
                    <p className="font-bold text-foreground">€{taskCostBreakdown.tools.toLocaleString()}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-primary/20">
                  <span className="text-sm font-semibold">Total Estimated:</span>
                  <span className="text-primary font-bold text-base">€{taskEstimatedCost.toLocaleString()}</span>
                </div>
                <div className="flex gap-3 mt-1">
                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <input type="radio" checked={form.use_estimated_cost === true} onChange={() => setForm(f => ({ ...f, use_estimated_cost: true }))} />
                    Use estimated cost
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <input type="radio" checked={form.use_estimated_cost === false} onChange={() => setForm(f => ({ ...f, use_estimated_cost: false }))} />
                    Enter real cost manually
                  </label>
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