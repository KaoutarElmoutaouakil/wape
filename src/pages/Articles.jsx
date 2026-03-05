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
import { AlertTriangle } from "lucide-react";

export default function Articles() {
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const queryClient = useQueryClient();

  const { data: articles = [], isLoading } = useQuery({
    queryKey: ["articles"],
    queryFn: () => base44.entities.Article.list("-created_date"),
  });

  const saveMutation = useMutation({
    mutationFn: (data) => editing
      ? base44.entities.Article.update(editing.id, data)
      : base44.entities.Article.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["articles"] });
      setShowForm(false);
      setEditing(null);
    },
  });

  const openForm = (article = null) => {
    setEditing(article);
    setForm(article || { unit: "piece", current_stock: 0, minimum_stock: 0 });
    setShowForm(true);
  };

  const filtered = articles.filter(a =>
    !search || a.name?.toLowerCase().includes(search.toLowerCase()) || a.category?.toLowerCase().includes(search.toLowerCase())
  );

  const columns = [
    { header: "Article", cell: (row) => (
      <div>
        <p className="font-medium">{row.name}</p>
        <p className="text-xs text-muted-foreground">{row.category}</p>
      </div>
    )},
    { header: "Unit", accessor: "unit" },
    { header: "Stock", cell: (row) => {
      const low = (row.current_stock || 0) <= (row.minimum_stock || 0) && row.minimum_stock > 0;
      return (
        <div className="flex items-center gap-2">
          <span className={`font-semibold ${low ? "text-destructive" : "text-foreground"}`}>{row.current_stock || 0}</span>
          {low && <AlertTriangle className="w-3 h-3 text-destructive" />}
        </div>
      );
    }},
    { header: "Min Stock", accessor: "minimum_stock" },
    { header: "Purchase Cost", cell: (row) => row.purchase_cost ? `€${row.purchase_cost}` : "—" },
    { header: "Location", accessor: "storage_location" },
    { header: "Status", cell: (row) => {
      const low = (row.current_stock || 0) <= (row.minimum_stock || 0) && row.minimum_stock > 0;
      return low
        ? <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 text-xs">Low Stock</Badge>
        : <Badge variant="outline" className="bg-success/10 text-success border-success/20 text-xs">OK</Badge>;
    }},
    { header: "", cell: (row) => (
      <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => openForm(row)}>Edit</Button>
    )},
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Articles"
        subtitle={`${articles.length} articles`}
        onAdd={() => openForm()}
        addLabel="New Article"
        searchValue={search}
        onSearch={setSearch}
      />

      <DataTable columns={columns} data={filtered} isLoading={isLoading} />

      <FormDialog open={showForm} onOpenChange={setShowForm} title={editing ? "Edit Article" : "New Article"}>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Label>Article Name</Label>
            <Input value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <Label>Category</Label>
            <Input value={form.category || ""} onChange={(e) => setForm({ ...form, category: e.target.value })} />
          </div>
          <div>
            <Label>Unit</Label>
            <Select value={form.unit || "piece"} onValueChange={(v) => setForm({ ...form, unit: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="piece">Piece</SelectItem>
                <SelectItem value="kg">Kg</SelectItem>
                <SelectItem value="m">Meter</SelectItem>
                <SelectItem value="m2">m²</SelectItem>
                <SelectItem value="m3">m³</SelectItem>
                <SelectItem value="litre">Litre</SelectItem>
                <SelectItem value="box">Box</SelectItem>
                <SelectItem value="pallet">Pallet</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Current Stock</Label>
            <Input type="number" value={form.current_stock ?? 0} onChange={(e) => setForm({ ...form, current_stock: parseFloat(e.target.value) || 0 })} />
          </div>
          <div>
            <Label>Minimum Stock</Label>
            <Input type="number" value={form.minimum_stock ?? 0} onChange={(e) => setForm({ ...form, minimum_stock: parseFloat(e.target.value) || 0 })} />
          </div>
          <div>
            <Label>Purchase Cost (€)</Label>
            <Input type="number" value={form.purchase_cost || ""} onChange={(e) => setForm({ ...form, purchase_cost: parseFloat(e.target.value) || 0 })} />
          </div>
          <div>
            <Label>Storage Location</Label>
            <Input value={form.storage_location || ""} onChange={(e) => setForm({ ...form, storage_location: e.target.value })} />
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