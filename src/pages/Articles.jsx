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
import { AlertTriangle, Barcode, Eye } from "lucide-react";

function generateBarcodeId(name) {
  const base = name.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4).padEnd(4, "X");
  const rand = Math.floor(Math.random() * 900000) + 100000;
  return `${base}-${rand}`;
}

export default function Articles() {
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [showDetail, setShowDetail] = useState(null);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const queryClient = useQueryClient();

  const { data: articles = [], isLoading } = useQuery({
    queryKey: ["articles"],
    queryFn: () => base44.entities.Article.list("-created_date"),
  });

  const { data: movements = [] } = useQuery({
    queryKey: ["stock-movements"],
    queryFn: () => base44.entities.StockMovement.list("-created_date"),
  });

  const saveMutation = useMutation({
    mutationFn: (data) => {
      const payload = { ...data };
      if (!payload.barcode_id && payload.name) {
        payload.barcode_id = generateBarcodeId(payload.name);
      }
      return editing
        ? base44.entities.Article.update(editing.id, payload)
        : base44.entities.Article.create(payload);
    },
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

  const getArticleStats = (articleId) => {
    const artMovements = movements.filter(m => m.article_id === articleId);
    const inQty = artMovements.filter(m => m.movement_type === "IN").reduce((s, m) => s + (m.quantity || 0), 0);
    const reserved = artMovements.filter(m => m.movement_type === "RESERVED").reduce((s, m) => s + (m.quantity || 0), 0);
    const out = artMovements.filter(m => m.movement_type === "OUT").reduce((s, m) => s + (m.quantity || 0), 0);
    return { inQty, reserved, consumed: out };
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
    { header: "Barcode", cell: (row) => row.barcode_id
      ? <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded flex items-center gap-1"><Barcode className="w-3 h-3" />{row.barcode_id}</span>
      : <span className="text-xs text-muted-foreground">—</span>
    },
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
    { header: "Status", cell: (row) => {
      const low = (row.current_stock || 0) <= (row.minimum_stock || 0) && row.minimum_stock > 0;
      return low
        ? <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 text-xs">Low Stock</Badge>
        : <Badge variant="outline" className="bg-success/10 text-success border-success/20 text-xs">OK</Badge>;
    }},
    { header: "", cell: (row) => (
      <div className="flex gap-1">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowDetail(row)}><Eye className="w-4 h-4" /></Button>
        <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => openForm(row)}>Edit</Button>
      </div>
    )},
  ];

  const detailArticle = showDetail;
  const stats = detailArticle ? getArticleStats(detailArticle.id) : {};

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

      {/* Detail Dialog */}
      {showDetail && (
        <FormDialog open={!!showDetail} onOpenChange={() => setShowDetail(null)} title={showDetail.name}>
          <div className="space-y-4">
            {showDetail.barcode_id && (
              <div className="p-4 rounded-lg bg-muted/30 text-center">
                <p className="text-xs text-muted-foreground mb-1">Barcode ID</p>
                <p className="font-mono text-xl font-bold tracking-widest">{showDetail.barcode_id}</p>
                <div className="mt-2 flex justify-center gap-0.5">
                  {showDetail.barcode_id.split("").map((c, i) => (
                    <div key={i} className={`bg-foreground rounded-sm ${c === "-" ? "w-3 h-6 opacity-0" : `w-${Math.random() > 0.5 ? "1" : "0.5"} h-8`}`} style={{ width: `${2 + Math.random() * 2}px`, height: "32px" }} />
                  ))}
                </div>
              </div>
            )}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-lg bg-success/10 border border-success/20 text-center">
                <p className="text-2xl font-bold text-success">{showDetail.current_stock || 0}</p>
                <p className="text-xs text-muted-foreground mt-1">Total Stock</p>
              </div>
              <div className="p-3 rounded-lg bg-warning/10 border border-warning/20 text-center">
                <p className="text-2xl font-bold text-warning">{stats.reserved || 0}</p>
                <p className="text-xs text-muted-foreground mt-1">Reserved</p>
              </div>
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-center">
                <p className="text-2xl font-bold text-destructive">{stats.consumed || 0}</p>
                <p className="text-xs text-muted-foreground mt-1">Consumed (OUT)</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-muted-foreground">Category:</span> <span className="font-medium">{showDetail.category || "—"}</span></div>
              <div><span className="text-muted-foreground">Unit:</span> <span className="font-medium">{showDetail.unit || "—"}</span></div>
              <div><span className="text-muted-foreground">Min Stock:</span> <span className="font-medium">{showDetail.minimum_stock || 0}</span></div>
              <div><span className="text-muted-foreground">Purchase Cost:</span> <span className="font-medium">{showDetail.purchase_cost ? `€${showDetail.purchase_cost}` : "—"}</span></div>
              <div className="col-span-2"><span className="text-muted-foreground">Location:</span> <span className="font-medium">{showDetail.storage_location || "—"}</span></div>
            </div>
          </div>
        </FormDialog>
      )}

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
            <Label>Barcode ID</Label>
            <div className="flex gap-2">
              <Input value={form.barcode_id || ""} onChange={(e) => setForm({ ...form, barcode_id: e.target.value })} placeholder="Auto-generated on save" />
              <Button type="button" variant="outline" size="sm" onClick={() => setForm({ ...form, barcode_id: generateBarcodeId(form.name || "ART") })}>
                <Barcode className="w-4 h-4" />
              </Button>
            </div>
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