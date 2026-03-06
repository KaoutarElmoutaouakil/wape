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
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import SearchableSelect from "@/components/shared/SearchableSelect";

export default function Stock() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ movement_type: "IN", quantity: 1 });
  const queryClient = useQueryClient();

  const { data: movements = [], isLoading } = useQuery({
    queryKey: ["stock-movements"],
    queryFn: () => base44.entities.StockMovement.list("-created_date"),
  });

  const { data: articles = [] } = useQuery({
    queryKey: ["articles"],
    queryFn: () => base44.entities.Article.list(),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: () => base44.entities.Project.list(),
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const mv = await base44.entities.StockMovement.create(data);
      // Update article stock
      const article = articles.find(a => a.id === data.article_id);
      if (article) {
        const delta = data.movement_type === "IN" ? data.quantity : -data.quantity;
        await base44.entities.Article.update(article.id, { current_stock: Math.max(0, (article.current_stock || 0) + delta) });
      }
      return mv;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stock-movements"] });
      queryClient.invalidateQueries({ queryKey: ["articles"] });
      setShowForm(false);
      setForm({ movement_type: "IN", quantity: 1 });
    },
  });

  const filtered = movements.filter(m => {
    const matchSearch = !search || m.article_name?.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "all" || m.movement_type === typeFilter;
    return matchSearch && matchType;
  });

  const columns = [
    { header: "Date", cell: (row) => row.date ? format(new Date(row.date), "MMM d, yyyy") : format(new Date(row.created_date), "MMM d, yyyy") },
    { header: "Article", accessor: "article_name" },
    { header: "Type", cell: (row) => {
      const colors = {
        IN: "bg-success/10 text-success border-success/20",
        OUT: "bg-destructive/10 text-destructive border-destructive/20",
        RESERVED: "bg-warning/10 text-warning border-warning/20",
      };
      return <Badge variant="outline" className={`text-xs ${colors[row.movement_type] || ""}`}>{row.movement_type}</Badge>;
    }},
    { header: "Quantity", cell: (row) => {
      const color = row.movement_type === "IN" ? "text-success" : row.movement_type === "RESERVED" ? "text-warning" : "text-destructive";
      const sign = row.movement_type === "IN" ? "+" : row.movement_type === "RESERVED" ? "~" : "-";
      return <span className={`font-semibold ${color}`}>{sign}{row.quantity}</span>;
    }},
    { header: "Project", accessor: "project_name" },
    { header: "Responsible", accessor: "responsible" },
    { header: "Notes", cell: (row) => <span className="text-xs text-muted-foreground truncate max-w-[120px] block">{row.notes}</span> },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Stock Movements"
        subtitle={`${movements.length} movements`}
        onAdd={() => setShowForm(true)}
        addLabel="New Movement"
        searchValue={search}
        onSearch={setSearch}
      >
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-32 bg-card"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="IN">IN</SelectItem>
            <SelectItem value="OUT">OUT</SelectItem>
            <SelectItem value="RESERVED">RESERVED</SelectItem>
          </SelectContent>
        </Select>
      </PageHeader>

      <DataTable columns={columns} data={filtered} isLoading={isLoading} />

      <FormDialog open={showForm} onOpenChange={setShowForm} title="New Stock Movement">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Label>Article</Label>
            <SearchableSelect
              items={articles.map(a => ({ id: a.id, label: a.name }))}
              onSelect={(item) => setForm({ ...form, article_id: item.id, article_name: item.label })}
              placeholder="Search article..."
            />
            {form.article_name && <p className="text-xs text-muted-foreground mt-1">Selected: {form.article_name}</p>}
          </div>
          <div>
            <Label>Type</Label>
            <Select value={form.movement_type} onValueChange={(v) => setForm({ ...form, movement_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="IN">IN (Entry)</SelectItem>
                <SelectItem value="OUT">OUT (Exit)</SelectItem>
                <SelectItem value="RESERVED">RESERVED (Task Assignment)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Quantity</Label>
            <Input type="number" min="1" value={form.quantity || ""} onChange={(e) => setForm({ ...form, quantity: parseFloat(e.target.value) || 0 })} />
          </div>
          <div>
            <Label>Date</Label>
            <Input type="date" value={form.date || ""} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </div>
          <div>
            <Label>Responsible</Label>
            <Input value={form.responsible || ""} onChange={(e) => setForm({ ...form, responsible: e.target.value })} />
          </div>
          <div className="col-span-2">
            <Label>Project</Label>
            <Select value={form.project_id || ""} onValueChange={(v) => {
              const proj = projects.find(p => p.id === v);
              setForm({ ...form, project_id: v, project_name: proj?.name || "" });
            }}>
              <SelectTrigger><SelectValue placeholder="Select project (optional)" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>No project</SelectItem>
                {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2">
            <Label>Notes</Label>
            <Textarea value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <div className="col-span-2 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending || !form.article_id}>
              {saveMutation.isPending ? "Saving..." : "Save Movement"}
            </Button>
          </div>
        </div>
      </FormDialog>
    </div>
  );
}