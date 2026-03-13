import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import FormDialog from "@/components/shared/FormDialog";
import { format } from "date-fns";
import {
  Plus, Search, Download, Upload, X, CreditCard, Building2,
  HardHat, AlertCircle, CheckCircle2, Clock, TrendingDown, Filter
} from "lucide-react";
import { useCurrency } from "@/components/shared/currency";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";

const STATUS_CONFIG = {
  paid:    { label: "Paid",         class: "bg-success/10 text-success border-success/20" },
  pending: { label: "Pending",      class: "bg-warning/10 text-warning border-warning/20" },
  expired: { label: "Expired",      class: "bg-destructive/10 text-destructive border-destructive/20" },
  partial: { label: "Partial",      class: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
};

const METHOD_LABELS = {
  credit_card:    "Credit Card",
  bank_transfer:  "Bank Transfer",
  mobile_payment: "Mobile Payment",
  check:          "Check",
  cash:           "Cash",
};

const TYPE_CONFIG = {
  subscription:   { label: "Subscription",   icon: CreditCard,  color: "text-purple-600" },
  supplier:       { label: "Supplier",        icon: Building2,   color: "text-blue-600"   },
  subcontractor:  { label: "Subcontractor",   icon: HardHat,     color: "text-orange-600" },
};

const PLAN_LABELS = { basic: "Basic", pro: "Pro", enterprise: "Enterprise" };

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || { label: status, class: "" };
  return <Badge variant="outline" className={`text-xs ${cfg.class}`}>{cfg.label}</Badge>;
}

function KpiCard({ title, value, sub, icon: Icon, color = "primary" }) {
  const colors = {
    primary:     "bg-primary/10 text-primary",
    warning:     "bg-warning/10 text-warning",
    success:     "bg-success/10 text-success",
    destructive: "bg-destructive/10 text-destructive",
    purple:      "bg-purple-500/10 text-purple-600",
  };
  return (
    <Card>
      <CardContent className="p-4 flex items-start gap-3">
        <div className={`p-2 rounded-lg ${colors[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground truncate">{title}</p>
          <p className="text-xl font-bold text-foreground leading-tight">{value}</p>
          {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Payment Form ──────────────────────────────────────────────────────────────
function PaymentForm({ editing, defaultType, projects, suppliers, subcontractors, onSave, onCancel, saving }) {
  const { symbol } = useCurrency();
  const [form, setForm] = useState(editing || {
    type: defaultType || "supplier",
    status: "pending",
    payment_method: "bank_transfer",
    amount: "",
    amount_paid: 0,
  });
  const [uploading, setUploading] = useState(false);

  const remaining = form.type === "subcontractor"
    ? Math.max(0, (parseFloat(form.contract_amount) || 0) - (parseFloat(form.amount_paid) || 0))
    : null;

  const uploadInvoice = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm(f => ({ ...f, invoice_url: file_url, invoice_file_name: file.name }));
    setUploading(false);
  };

  const f = (field, val) => setForm(prev => ({ ...prev, [field]: val }));

  return (
    <div className="space-y-4">
      {/* Type */}
      <div>
        <Label>Payment Type</Label>
        <Select value={form.type} onValueChange={(v) => f("type", v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="subscription">Subscription</SelectItem>
            <SelectItem value="supplier">Supplier</SelectItem>
            <SelectItem value="subcontractor">Subcontractor</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Subscription fields */}
        {form.type === "subscription" && (
          <>
            <div className="col-span-2"><Label>Company Name</Label><Input value={form.company_name || ""} onChange={(e) => f("company_name", e.target.value)} /></div>
            <div>
              <Label>Subscription Plan</Label>
              <Select value={form.subscription_plan || ""} onValueChange={(v) => f("subscription_plan", v)}>
                <SelectTrigger><SelectValue placeholder="Select plan" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="basic">Basic</SelectItem>
                  <SelectItem value="pro">Pro</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Billing Period</Label><Input value={form.billing_period || ""} onChange={(e) => f("billing_period", e.target.value)} placeholder="e.g. March 2026" /></div>
          </>
        )}

        {/* Supplier fields */}
        {form.type === "supplier" && (
          <>
            <div>
              <Label>Supplier</Label>
              <Select value={form.supplier_id || ""} onValueChange={(v) => {
                const s = suppliers.find(x => x.id === v);
                setForm(prev => ({ ...prev, supplier_id: v, supplier_name: s?.name || s?.company_name || "" }));
              }}>
                <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
                <SelectContent>
                  {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name || s.company_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Project</Label>
              <Select value={form.project_id || ""} onValueChange={(v) => {
                const p = projects.find(x => x.id === v);
                setForm(prev => ({ ...prev, project_id: v, project_name: p?.name || "" }));
              }}>
                <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>No project</SelectItem>
                  {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Invoice Number</Label><Input value={form.invoice_number || ""} onChange={(e) => f("invoice_number", e.target.value)} /></div>
            <div>
              <Label>Supplier Invoice (PDF)</Label>
              <label className="flex items-center gap-2 cursor-pointer px-3 py-2 rounded-md border border-dashed border-border hover:bg-muted/30 text-sm text-muted-foreground">
                <Upload className="w-4 h-4" />
                {uploading ? "Uploading..." : form.invoice_file_name || "Upload invoice"}
                <input type="file" accept=".pdf,.jpg,.png" className="hidden" onChange={uploadInvoice} />
              </label>
            </div>
          </>
        )}

        {/* Subcontractor fields */}
        {form.type === "subcontractor" && (
          <>
            <div>
              <Label>Subcontractor</Label>
              <Select value={form.subcontractor_id || ""} onValueChange={(v) => {
                const s = subcontractors.find(x => x.id === v);
                setForm(prev => ({ ...prev, subcontractor_id: v, subcontractor_name: s?.company_name || "" }));
              }}>
                <SelectTrigger><SelectValue placeholder="Select subcontractor" /></SelectTrigger>
                <SelectContent>
                  {subcontractors.map(s => <SelectItem key={s.id} value={s.id}>{s.company_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Project</Label>
              <Select value={form.project_id || ""} onValueChange={(v) => {
                const p = projects.find(x => x.id === v);
                setForm(prev => ({ ...prev, project_id: v, project_name: p?.name || "" }));
              }}>
                <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>No project</SelectItem>
                  {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Task / Work Package</Label><Input value={form.task_name || ""} onChange={(e) => f("task_name", e.target.value)} /></div>
            <div><Label>Contract Amount ({symbol})</Label><Input type="number" value={form.contract_amount || ""} onChange={(e) => f("contract_amount", parseFloat(e.target.value) || 0)} /></div>
            <div><Label>Amount Paid ({symbol})</Label><Input type="number" value={form.amount_paid || ""} onChange={(e) => f("amount_paid", parseFloat(e.target.value) || 0)} /></div>
            {remaining !== null && (
              <div className="p-3 rounded-lg bg-muted/30 text-sm flex items-center justify-between col-span-1">
                <span className="text-muted-foreground">Remaining:</span>
                <span className="font-bold text-warning">{symbol} {remaining.toLocaleString()}</span>
              </div>
            )}
          </>
        )}

        {/* Shared fields */}
        <div><Label>Amount ({symbol})</Label><Input type="number" value={form.amount || ""} onChange={(e) => f("amount", parseFloat(e.target.value) || 0)} /></div>
        <div><Label>Payment Date</Label><Input type="date" value={form.payment_date || ""} onChange={(e) => f("payment_date", e.target.value)} /></div>
        <div><Label>Due Date</Label><Input type="date" value={form.due_date || ""} onChange={(e) => f("due_date", e.target.value)} /></div>
        <div>
          <Label>Payment Method</Label>
          <Select value={form.payment_method || "bank_transfer"} onValueChange={(v) => f("payment_method", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="credit_card">Credit Card</SelectItem>
              <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
              <SelectItem value="mobile_payment">Mobile Payment</SelectItem>
              <SelectItem value="check">Check</SelectItem>
              <SelectItem value="cash">Cash</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Status</Label>
          <Select value={form.status || "pending"} onValueChange={(v) => f("status", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="partial">Partial</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div><Label>Notes</Label><Textarea value={form.notes || ""} onChange={(e) => f("notes", e.target.value)} /></div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={() => onSave(form)} disabled={saving}>{saving ? "Saving..." : "Save Payment"}</Button>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function Payments() {
  const { symbol, fmt } = useCurrency();
  const queryClient = useQueryClient();

  const [search, setSearch]             = useState("");
  const [typeFilter, setTypeFilter]     = useState("all");
  const [projectFilter, setProjectFilter] = useState("all");
  const [showForm, setShowForm]         = useState(false);
  const [editing, setEditing]           = useState(null);
  const [defaultType, setDefaultType]   = useState("supplier");
  const [activeTab, setActiveTab]       = useState("all");

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ["payments"],
    queryFn: () => base44.entities.Payment.list("-created_date"),
  });
  const { data: projects = [] }      = useQuery({ queryKey: ["projects"],      queryFn: () => base44.entities.Project.list() });
  const { data: suppliers = [] }     = useQuery({ queryKey: ["suppliers"],     queryFn: () => base44.entities.Supplier.list() });
  const { data: subcontractors = [] } = useQuery({ queryKey: ["subcontractors"], queryFn: () => base44.entities.Subcontractor.list() });

  const saveMutation = useMutation({
    mutationFn: (data) => {
      // Auto-compute status for subcontractor partial payments
      let payload = { ...data };
      if (payload.type === "subcontractor" && payload.contract_amount) {
        const paid = parseFloat(payload.amount_paid) || 0;
        const contract = parseFloat(payload.contract_amount) || 0;
        if (paid >= contract) payload.status = "paid";
        else if (paid > 0) payload.status = "partial";
      }
      return editing
        ? base44.entities.Payment.update(editing.id, payload)
        : base44.entities.Payment.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      setShowForm(false);
      setEditing(null);
    },
  });

  const openForm = (payment = null, type = "supplier") => {
    setEditing(payment);
    setDefaultType(payment?.type || type);
    setShowForm(true);
  };

  // ─── KPIs ───
  const now = new Date();
  const thisMonth = payments.filter(p => {
    const d = p.payment_date || p.created_date;
    if (!d) return false;
    const pd = new Date(d);
    return pd.getMonth() === now.getMonth() && pd.getFullYear() === now.getFullYear();
  });
  const kpis = useMemo(() => ({
    totalMonth:    thisMonth.filter(p => p.status === "paid").reduce((s, p) => s + (p.amount || 0), 0),
    supplierTotal: payments.filter(p => p.type === "supplier" && p.status === "paid").reduce((s, p) => s + (p.amount || 0), 0),
    subTotal:      payments.filter(p => p.type === "subcontractor" && p.status === "paid").reduce((s, p) => s + (p.amount || 0), 0),
    activeSubs:    payments.filter(p => p.type === "subscription" && p.status !== "expired").length,
    pending:       payments.filter(p => p.status === "pending").length,
  }), [payments]);

  // ─── Overdue alerts ───
  const overduePayments = payments.filter(p =>
    p.status === "pending" && p.due_date && new Date(p.due_date) < now
  );

  // ─── Chart: monthly paid ───
  const chartData = useMemo(() => {
    const map = {};
    payments.filter(p => p.status === "paid" && p.payment_date).forEach(p => {
      const key = p.payment_date.slice(0, 7);
      map[key] = (map[key] || 0) + (p.amount || 0);
    });
    return Object.entries(map).sort().slice(-6).map(([k, v]) => ({
      month: k.slice(5) + "/" + k.slice(2, 4),
      total: v,
    }));
  }, [payments]);

  // ─── Filtering ───
  const filtered = useMemo(() => {
    return payments.filter(p => {
      const matchTab     = activeTab === "all" || p.type === activeTab;
      const matchType    = typeFilter === "all" || p.type === typeFilter;
      const matchProject = projectFilter === "all" || p.project_id === projectFilter;
      const matchSearch  = !search || [p.supplier_name, p.subcontractor_name, p.company_name, p.project_name, p.invoice_number]
        .some(v => v?.toLowerCase().includes(search.toLowerCase()));
      return matchTab && matchType && matchProject && matchSearch;
    });
  }, [payments, activeTab, typeFilter, projectFilter, search]);

  // ─── Export PDF ───
  const exportPDF = async () => {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Payments Report", 20, 20);
    doc.setFontSize(9);
    let y = 35;
    doc.setFillColor(240, 240, 240);
    doc.rect(20, y - 5, 170, 8, "F");
    ["Type", "Beneficiary", "Project", "Amount", "Date", "Status"].forEach((h, i) => {
      doc.text(h, 20 + [0, 22, 55, 90, 115, 145][i], y);
    });
    y += 8;
    filtered.forEach(p => {
      if (y > 270) { doc.addPage(); y = 20; }
      const ben = p.supplier_name || p.subcontractor_name || p.company_name || "—";
      doc.text(TYPE_CONFIG[p.type]?.label || p.type, 20, y);
      doc.text(ben.slice(0, 16), 42, y);
      doc.text((p.project_name || "—").slice(0, 16), 75, y);
      doc.text(fmt(p.amount), 110, y);
      doc.text(p.payment_date ? format(new Date(p.payment_date), "dd/MM/yy") : "—", 135, y);
      doc.text(STATUS_CONFIG[p.status]?.label || p.status, 155, y);
      y += 7;
    });
    doc.save(`payments_${format(now, "yyyy-MM-dd")}.pdf`);
  };

  const exportExcel = async () => {
    const rows = [
      ["ID", "Type", "Beneficiary", "Project", "Amount", "Date", "Method", "Status"],
      ...filtered.map(p => [
        p.id?.slice(-8),
        TYPE_CONFIG[p.type]?.label || p.type,
        p.supplier_name || p.subcontractor_name || p.company_name || "—",
        p.project_name || "—",
        p.amount || 0,
        p.payment_date || "—",
        METHOD_LABELS[p.payment_method] || p.payment_method || "—",
        STATUS_CONFIG[p.status]?.label || p.status,
      ]),
    ];
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `payments_${format(now, "yyyy-MM-dd")}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Payments</h1>
          <p className="text-sm text-muted-foreground">Finance → Payments</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={exportExcel}><Download className="w-3.5 h-3.5" />CSV</Button>
          <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={exportPDF}><Download className="w-3.5 h-3.5" />PDF</Button>
          <Button size="sm" className="gap-1" onClick={() => openForm()}><Plus className="w-4 h-4" />Add Payment</Button>
        </div>
      </div>

      {/* Overdue alerts */}
      {overduePayments.length > 0 && (
        <div className="flex items-start gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span><strong>{overduePayments.length} overdue payment{overduePayments.length > 1 ? "s" : ""}</strong> — please review pending payments past their due date.</span>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <KpiCard title="Total This Month" value={fmt(kpis.totalMonth)} icon={TrendingDown} color="primary" />
        <KpiCard title="Supplier Payments" value={fmt(kpis.supplierTotal)} icon={Building2} color="warning" />
        <KpiCard title="Subcontractor Payments" value={fmt(kpis.subTotal)} icon={HardHat} color="destructive" />
        <KpiCard title="Active Subscriptions" value={kpis.activeSubs} icon={CreditCard} color="purple" />
        <KpiCard title="Pending Payments" sub={kpis.pending > 0 ? "Needs action" : "All clear"} value={kpis.pending} icon={Clock} color={kpis.pending > 0 ? "warning" : "success"} />
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Monthly Payments (Paid)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => fmt(v)} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="total" fill="hsl(221,83%,53%)" name="Paid" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Quick-add buttons by type */}
      <div className="flex gap-2 flex-wrap">
        {[
          { type: "subscription", label: "New Subscription", icon: CreditCard },
          { type: "supplier",     label: "New Supplier Payment", icon: Building2 },
          { type: "subcontractor",label: "New Subcontractor Payment", icon: HardHat },
        ].map(({ type, label, icon: Icon }) => (
          <Button key={type} variant="outline" size="sm" className="gap-2 text-xs" onClick={() => openForm(null, type)}>
            <Icon className="w-3.5 h-3.5" />{label}
          </Button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search payments..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-40 bg-card"><SelectValue placeholder="All types" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="subscription">Subscription</SelectItem>
            <SelectItem value="supplier">Supplier</SelectItem>
            <SelectItem value="subcontractor">Subcontractor</SelectItem>
          </SelectContent>
        </Select>
        <Select value={projectFilter} onValueChange={setProjectFilter}>
          <SelectTrigger className="w-44 bg-card"><SelectValue placeholder="All projects" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Projects</SelectItem>
            {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
        {(typeFilter !== "all" || projectFilter !== "all" || search) && (
          <Button variant="ghost" size="sm" className="gap-1 text-xs text-muted-foreground" onClick={() => { setTypeFilter("all"); setProjectFilter("all"); setSearch(""); }}>
            <X className="w-3 h-3" /> Clear
          </Button>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All ({payments.length})</TabsTrigger>
          <TabsTrigger value="subscription">Subscriptions</TabsTrigger>
          <TabsTrigger value="supplier">Suppliers</TabsTrigger>
          <TabsTrigger value="subcontractor">Subcontractors</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">ID</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Type</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Beneficiary</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Project</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Amount</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Date</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Method</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Status</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading && (
                      <tr><td colSpan={9} className="text-center py-10 text-muted-foreground text-sm">Loading...</td></tr>
                    )}
                    {!isLoading && filtered.length === 0 && (
                      <tr><td colSpan={9} className="text-center py-10 text-muted-foreground text-sm">No payments found</td></tr>
                    )}
                    {filtered.map(p => {
                      const TypeIcon = TYPE_CONFIG[p.type]?.icon || CreditCard;
                      const ben = p.supplier_name || p.subcontractor_name || p.company_name || "—";
                      const isOverdue = p.status === "pending" && p.due_date && new Date(p.due_date) < now;
                      return (
                        <tr key={p.id} className={`border-b border-border/50 hover:bg-muted/20 transition-colors ${isOverdue ? "bg-destructive/5" : ""}`}>
                          <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{p.id?.slice(-8)}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              <TypeIcon className={`w-3.5 h-3.5 ${TYPE_CONFIG[p.type]?.color || ""}`} />
                              <span className="text-xs font-medium">{TYPE_CONFIG[p.type]?.label || p.type}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 font-medium max-w-[140px] truncate">
                            <div>
                              <p className="truncate">{ben}</p>
                              {p.invoice_number && <p className="text-xs text-muted-foreground">{p.invoice_number}</p>}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">{p.project_name || "—"}</td>
                          <td className="px-4 py-3 font-semibold">
                            <div>
                              <p>{fmt(p.amount)}</p>
                              {p.type === "subcontractor" && p.contract_amount && p.amount_paid < p.contract_amount && (
                                <p className="text-xs text-muted-foreground">Paid: {fmt(p.amount_paid)}</p>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-xs">
                            <div>
                              <p>{p.payment_date ? format(new Date(p.payment_date), "MMM d, yyyy") : "—"}</p>
                              {isOverdue && <p className="text-destructive font-medium">Overdue!</p>}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">{METHOD_LABELS[p.payment_method] || "—"}</td>
                          <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1">
                              {p.invoice_url && (
                                <a href={p.invoice_url} target="_blank" rel="noopener noreferrer">
                                  <Button variant="ghost" size="icon" className="h-7 w-7"><Download className="w-3.5 h-3.5" /></Button>
                                </a>
                              )}
                              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => openForm(p)}>Edit</Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Form dialog */}
      <FormDialog
        open={showForm}
        onOpenChange={setShowForm}
        title={editing ? "Edit Payment" : `New ${TYPE_CONFIG[defaultType]?.label || ""} Payment`}
      >
        <PaymentForm
          editing={editing}
          defaultType={defaultType}
          projects={projects}
          suppliers={suppliers}
          subcontractors={subcontractors}
          onSave={(data) => saveMutation.mutate(data)}
          onCancel={() => { setShowForm(false); setEditing(null); }}
          saving={saveMutation.isPending}
        />
      </FormDialog>
    </div>
  );
}