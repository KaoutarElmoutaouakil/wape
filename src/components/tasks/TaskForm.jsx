import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X, Plus } from "lucide-react";
import SearchableSelect from "@/components/shared/SearchableSelect";
import { base44 } from "@/api/base44Client";

export default function TaskForm({ task, projects, onSave, onCancel, saving }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(task || {
    status: "todo", priority: "medium",
    assigned_personnel: [], assigned_articles: [], assigned_tools: [],
  });

  const { data: personnel = [] } = useQuery({ queryKey: ["personnel"], queryFn: () => base44.entities.Personnel.list() });
  const { data: articles = [] } = useQuery({ queryKey: ["articles"], queryFn: () => base44.entities.Article.list() });
  const { data: tools = [] } = useQuery({ queryKey: ["tools"], queryFn: () => base44.entities.Tool.list() });

  const handleProjectChange = (pid) => {
    const proj = projects.find(p => p.id === pid);
    setForm({ ...form, project_id: pid, project_name: proj?.name || "" });
  };

  const addPersonnel = (p) => {
    if (form.assigned_personnel?.some(ap => ap.id === p.id)) return;
    setForm({ ...form, assigned_personnel: [...(form.assigned_personnel || []), { id: p.id, name: p.name }] });
  };

  const removePersonnel = (id) => {
    setForm({ ...form, assigned_personnel: form.assigned_personnel.filter(p => p.id !== id) });
  };

  const addArticle = (a) => {
    if (form.assigned_articles?.some(aa => aa.id === a.id)) return;
    setForm({ ...form, assigned_articles: [...(form.assigned_articles || []), { id: a.id, name: a.name, quantity: 1 }] });
  };

  const removeArticle = (id) => {
    setForm({ ...form, assigned_articles: form.assigned_articles.filter(a => a.id !== id) });
  };

  const addTool = (t) => {
    if (form.assigned_tools?.some(at => at.id === t.id)) return;
    setForm({ ...form, assigned_tools: [...(form.assigned_tools || []), { id: t.id, name: t.name }] });
  };

  const removeTool = (id) => {
    setForm({ ...form, assigned_tools: form.assigned_tools.filter(t => t.id !== id) });
  };

  const quickCreatePersonnel = async (name) => {
    const p = await base44.entities.Personnel.create({ name, status: "active" });
    queryClient.invalidateQueries({ queryKey: ["personnel"] });
    addPersonnel({ id: p.id, name });
  };

  const quickCreateArticle = async (name) => {
    const a = await base44.entities.Article.create({ name, current_stock: 0 });
    queryClient.invalidateQueries({ queryKey: ["articles"] });
    addArticle({ id: a.id, name });
  };

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

      {/* Personnel */}
      <div className="col-span-2">
        <Label>Assigned Personnel</Label>
        <SearchableSelect
          items={personnel.map(p => ({ id: p.id, label: p.name }))}
          onSelect={(item) => addPersonnel({ id: item.id, name: item.label })}
          onQuickCreate={quickCreatePersonnel}
          placeholder="Search personnel..."
        />
        <div className="flex flex-wrap gap-1 mt-2">
          {(form.assigned_personnel || []).map(p => (
            <Badge key={p.id} variant="secondary" className="flex items-center gap-1">
              {p.name}
              <X className="w-3 h-3 cursor-pointer" onClick={() => removePersonnel(p.id)} />
            </Badge>
          ))}
        </div>
      </div>

      {/* Articles */}
      <div className="col-span-2">
        <Label>Assigned Articles</Label>
        <SearchableSelect
          items={articles.map(a => ({ id: a.id, label: a.name }))}
          onSelect={(item) => addArticle({ id: item.id, name: item.label })}
          onQuickCreate={quickCreateArticle}
          placeholder="Search articles..."
        />
        <div className="flex flex-wrap gap-1 mt-2">
          {(form.assigned_articles || []).map(a => (
            <Badge key={a.id} variant="secondary" className="flex items-center gap-1">
              {a.name}
              <X className="w-3 h-3 cursor-pointer" onClick={() => removeArticle(a.id)} />
            </Badge>
          ))}
        </div>
      </div>

      {/* Tools */}
      <div className="col-span-2">
        <Label>Assigned Tools</Label>
        <SearchableSelect
          items={tools.map(t => ({ id: t.id, label: t.name }))}
          onSelect={(item) => addTool({ id: item.id, name: item.label })}
          placeholder="Search tools..."
        />
        <div className="flex flex-wrap gap-1 mt-2">
          {(form.assigned_tools || []).map(t => (
            <Badge key={t.id} variant="secondary" className="flex items-center gap-1">
              {t.name}
              <X className="w-3 h-3 cursor-pointer" onClick={() => removeTool(t.id)} />
            </Badge>
          ))}
        </div>
      </div>

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