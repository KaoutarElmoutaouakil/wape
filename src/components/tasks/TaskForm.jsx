import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import SearchableSelect from "@/components/shared/SearchableSelect";

export default function TaskForm({ task, projects, onSave, onCancel, saving }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(task || {
    status: "todo", priority: "medium",
    assigned_personnel: [], assigned_articles: [], assigned_tools: [], assigned_subcontractors: [],
  });

  const { data: personnel = [] } = useQuery({ queryKey: ["personnel"], queryFn: () => base44.entities.Personnel.list() });
  const { data: articles = [] } = useQuery({ queryKey: ["articles"], queryFn: () => base44.entities.Article.list() });
  const { data: tools = [] } = useQuery({ queryKey: ["tools"], queryFn: () => base44.entities.Tool.list() });
  const { data: subs = [] } = useQuery({ queryKey: ["subcontractors"], queryFn: () => base44.entities.Subcontractor.list() });

  const handleProjectChange = (pid) => {
    const proj = projects.find(p => p.id === pid);
    setForm({ ...form, project_id: pid, project_name: proj?.name || "" });
  };

  const addPersonnel = (p) => {
    if (form.assigned_personnel?.some(ap => ap.id === p.id)) return;
    const found = personnel.find(x => x.id === p.id);
    const cost = found?.salary ? Math.round(found.salary / 160 * 8) : 0;
    setForm({ ...form, assigned_personnel: [...(form.assigned_personnel || []), { id: p.id, name: p.label, cost, hours: 8 }] });
  };

  const updatePersonnel = (id, field, val) => {
    setForm({ ...form, assigned_personnel: form.assigned_personnel.map(p => p.id === id ? { ...p, [field]: parseFloat(val) || 0 } : p) });
  };

  const addArticle = (a) => {
    if (form.assigned_articles?.some(aa => aa.id === a.id)) return;
    const found = articles.find(x => x.id === a.id);
    setForm({ ...form, assigned_articles: [...(form.assigned_articles || []), { id: a.id, name: a.label, quantity: 1, unit_cost: found?.purchase_cost || 0 }] });
  };

  const updateArticle = (id, field, val) => {
    setForm({ ...form, assigned_articles: form.assigned_articles.map(a => a.id === id ? { ...a, [field]: parseFloat(val) || 0 } : a) });
  };

  const addTool = (t) => {
    if (form.assigned_tools?.some(at => at.id === t.id)) return;
    const found = tools.find(x => x.id === t.id);
    setForm({ ...form, assigned_tools: [...(form.assigned_tools || []), { id: t.id, name: t.label, cost: found?.purchase_cost ? found.purchase_cost / 30 : 0 }] });
  };

  const updateTool = (id, val) => {
    setForm({ ...form, assigned_tools: form.assigned_tools.map(t => t.id === id ? { ...t, cost: parseFloat(val) || 0 } : t) });
  };

  const addSub = (s) => {
    if (form.assigned_subcontractors?.some(x => x.id === s.id)) return;
    setForm({ ...form, assigned_subcontractors: [...(form.assigned_subcontractors || []), { id: s.id, name: s.label, cost: 0 }] });
  };

  const quickCreatePersonnel = async (name) => {
    const p = await base44.entities.Personnel.create({ name, status: "active" });
    queryClient.invalidateQueries({ queryKey: ["personnel"] });
    addPersonnel({ id: p.id, label: name });
  };

  const quickCreateArticle = async (name) => {
    const a = await base44.entities.Article.create({ name, current_stock: 0 });
    queryClient.invalidateQueries({ queryKey: ["articles"] });
    addArticle({ id: a.id, label: name });
  };

  const estPersonnel = (form.assigned_personnel || []).reduce((s, p) => s + (p.cost || 0), 0);
  const estArticles = (form.assigned_articles || []).reduce((s, a) => s + (a.unit_cost || 0) * (a.quantity || 1), 0);
  const estTools = (form.assigned_tools || []).reduce((s, t) => s + (t.cost || 0), 0);
  const estSubs = (form.assigned_subcontractors || []).reduce((s, x) => s + (x.cost || 0), 0);
  const totalEst = estPersonnel + estArticles + estTools + estSubs;

  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="col-span-2">
        <Label>Task Name</Label>
        <Input value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      </div>
      <div>
        <Label>Project</Label>
        <Select value={form.project_id || ""} onValueChange={handleProjectChange}>
          <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
          <SelectContent>
            {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Zone</Label>
        <Input value={form.zone || ""} onChange={(e) => setForm({ ...form, zone: e.target.value })} />
      </div>
      <div>
        <Label>Priority</Label>
        <Select value={form.priority || "medium"} onValueChange={(v) => setForm({ ...form, priority: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Status</Label>
        <Select value={form.status || "todo"} onValueChange={(v) => setForm({ ...form, status: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todo">Todo</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="review">Review</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="blocked">Blocked</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Start Date</Label>
        <Input type="date" value={form.start_date || ""} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
      </div>
      <div>
        <Label>End Date</Label>
        <Input type="date" value={form.end_date || ""} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
      </div>

      {/* Personnel with cost */}
      <div className="col-span-2">
        <Label>Assigned Personnel</Label>
        <SearchableSelect
          items={personnel.map(p => ({ id: p.id, label: p.name }))}
          onSelect={addPersonnel}
          onQuickCreate={quickCreatePersonnel}
          placeholder="Search personnel..."
        />
        <div className="mt-2 space-y-1">
          {(form.assigned_personnel || []).map(p => (
            <div key={p.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 text-xs">
              <span className="flex-1 font-medium">{p.name}</span>
              <span className="text-muted-foreground">Hours:</span>
              <Input type="number" className="w-16 h-6 text-xs" value={p.hours || ""} onChange={(e) => updatePersonnel(p.id, "hours", e.target.value)} />
              <span className="text-muted-foreground">Cost €:</span>
              <Input type="number" className="w-20 h-6 text-xs" value={p.cost || ""} onChange={(e) => updatePersonnel(p.id, "cost", e.target.value)} />
              <X className="w-3 h-3 cursor-pointer text-muted-foreground" onClick={() => setForm({ ...form, assigned_personnel: form.assigned_personnel.filter(x => x.id !== p.id) })} />
            </div>
          ))}
        </div>
      </div>

      {/* Articles with cost */}
      <div className="col-span-2">
        <Label>Assigned Articles</Label>
        <SearchableSelect
          items={articles.map(a => ({ id: a.id, label: a.name }))}
          onSelect={addArticle}
          onQuickCreate={quickCreateArticle}
          placeholder="Search articles..."
        />
        <div className="mt-2 space-y-1">
          {(form.assigned_articles || []).map(a => (
            <div key={a.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 text-xs">
              <span className="flex-1 font-medium">{a.name}</span>
              <span className="text-muted-foreground">Qty:</span>
              <Input type="number" className="w-16 h-6 text-xs" value={a.quantity || ""} onChange={(e) => updateArticle(a.id, "quantity", e.target.value)} />
              <span className="text-muted-foreground">Unit €:</span>
              <Input type="number" className="w-20 h-6 text-xs" value={a.unit_cost || ""} onChange={(e) => updateArticle(a.id, "unit_cost", e.target.value)} />
              <X className="w-3 h-3 cursor-pointer text-muted-foreground" onClick={() => setForm({ ...form, assigned_articles: form.assigned_articles.filter(x => x.id !== a.id) })} />
            </div>
          ))}
        </div>
      </div>

      {/* Tools with cost */}
      <div className="col-span-2">
        <Label>Assigned Tools</Label>
        <SearchableSelect
          items={tools.map(t => ({ id: t.id, label: t.name }))}
          onSelect={addTool}
          placeholder="Search tools..."
        />
        <div className="mt-2 space-y-1">
          {(form.assigned_tools || []).map(t => (
            <div key={t.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 text-xs">
              <span className="flex-1 font-medium">{t.name}</span>
              <span className="text-muted-foreground">Usage Cost €:</span>
              <Input type="number" className="w-24 h-6 text-xs" value={t.cost || ""} onChange={(e) => updateTool(t.id, e.target.value)} />
              <X className="w-3 h-3 cursor-pointer text-muted-foreground" onClick={() => setForm({ ...form, assigned_tools: form.assigned_tools.filter(x => x.id !== t.id) })} />
            </div>
          ))}
        </div>
      </div>

      {/* Subcontractors */}
      <div className="col-span-2">
        <Label>Assigned Subcontractors</Label>
        <SearchableSelect
          items={subs.map(s => ({ id: s.id, label: s.company_name }))}
          onSelect={addSub}
          placeholder="Search subcontractors..."
        />
        <div className="mt-2 space-y-1">
          {(form.assigned_subcontractors || []).map(s => (
            <div key={s.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 text-xs">
              <span className="flex-1 font-medium">{s.name}</span>
              <span className="text-muted-foreground">Cost €:</span>
              <Input type="number" className="w-24 h-6 text-xs" value={s.cost || ""} onChange={(e) => setForm({ ...form, assigned_subcontractors: form.assigned_subcontractors.map(x => x.id === s.id ? { ...x, cost: parseFloat(e.target.value) || 0 } : x) })} />
              <X className="w-3 h-3 cursor-pointer text-muted-foreground" onClick={() => setForm({ ...form, assigned_subcontractors: form.assigned_subcontractors.filter(x => x.id !== s.id) })} />
            </div>
          ))}
        </div>
      </div>

      {/* Cost summary */}
      {totalEst > 0 && (
        <div className="col-span-2 p-3 rounded-lg bg-primary/5 border border-primary/10 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>Personnel: <strong>€{estPersonnel.toFixed(0)}</strong></span>
            <span>Articles: <strong>€{estArticles.toFixed(0)}</strong></span>
            <span>Tools: <strong>€{estTools.toFixed(0)}</strong></span>
            {estSubs > 0 && <span>Subcontractors: <strong>€{estSubs.toFixed(0)}</strong></span>}
          </div>
          <p className="mt-1 font-bold text-primary">Estimated Task Cost: €{totalEst.toFixed(0)}</p>
        </div>
      )}

      <div className="col-span-2">
        <Label>Description</Label>
        <Textarea value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      </div>

      <div className="col-span-2 flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={() => onSave(form)} disabled={saving}>{saving ? "Saving..." : "Save Task"}</Button>
      </div>
    </div>
  );
}