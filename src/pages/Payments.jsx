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
import PayNowDialog from "@/components/payments/PayNowDialog";
import { format, addMonths, addYears } from "date-fns";
import {
  Plus, Search, Download, Upload, X, CreditCard, Building2,
  HardHat, AlertCircle, Clock, TrendingDown, Shield, RefreshCw,
  CheckCircle2, DollarSign
} from "lucide-react";
import { useCurrency } from "@/components/shared/currency";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

// ─── Constants ──────────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  paid:    { label: "Paid",    cls: "bg-success/10 text-success border-success/20" },
  pending: { label: "Pending", cls: "bg-warning/10 text-warning border-warning/20" },
  expired: { label: "Expired", cls: "bg-destructive/10 text-destructive border-destructive/20" },
  partial: { label: "Partial", cls: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
};

const METHOD_LABELS = {
  credit_card: "Credit Card", bank_transfer: "Bank Transfer",
  paypal: "PayPal", cmi: "CMI Morocco",
  mobile_payment: "Mobile Payment", check: "Check", cash: "Cash",
};

const TYPE_CONFIG = {
  subscription:  { label: "Subscription",  icon: CreditCard, color: "text-purple-600" },
  supplier:      { label: "Supplier",      icon: Building2,  color: "text-blue-600"   },
  subcontractor: { label: "Subcontractor", icon: HardHat,    color: "text-orange-600" },
};

const PLAN_PRICES = { starter: 299, pro: 799, enterprise: 1999 };
const PLAN_LABELS = { starter: "Starter", pro: "Pro", enterprise: "Enterprise" };

// ─── Sub-components ─────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || { label: status, cls: "" };
  return <Badge variant="outline" className={`text-xs ${cfg.cls}`}>{cfg.label}</Badge>;
}

function KpiCard({ title, value, sub, icon: Icon, color = "primary" }) {
  const colors = {
    primary: "bg-primary/10 text-primary", warning: "bg-warning/10 text-warning",
    success: "bg-success/10 text-success", destructive: "bg-destructive/10 text-destructive",
    purple: "bg-purple-500/10 text-purple-600",
  };
  return (
    <Card>
      <CardContent className="p-4 flex items-start gap-3">
        <div className={`p-2 rounded-lg shrink-0 ${colors[color]}`}><Icon className="w-5 h-5" /></div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground truncate">{title}</p>
          <p className="text-xl font-bold leading-tight">{value}</p>
          {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Payment Form ────────────────────────────────────────────────────────────────
function PaymentForm({ editing, defaultType, projects, suppliers, subcontractors, onSave, onCancel, saving }) {
  const { symbol } = useCurrency();
  const [form, setForm] = useState(() => {
    if (editing) return editing;
    return {
      type: defaultType || "supplier",
      status: "pending",
      payment_method: "bank_transfer",
      billing_type: "monthly",
      amount: "",
      amount_paid: 0,
    };
  });
  const [uploading, setUploading] = useState(false);

  const f = (field, val) => setForm(p => ({ ...p, [field]: val }));

  const remaining = form.type === "subcontractor"
    ? Math.max(0, (parseFloat(form.contract_amount) || 0) - (parseFloat(form.amount_paid) || 0))
    : null;

  // Auto-fill price and next billing date when plan/billing type changes
  const handlePlanChange = (plan) => {
    const price = PLAN_PRICES[plan] || 0;
    const monthly = form.billing_type === "monthly";
    setForm(p => ({ ...p, subscription_plan: plan, amount: monthly ? price : price * 12 }));
  };

  const handleBillingTypeChange = (bt) => {
    const price = PLAN_PRICES[form.subscription_plan] || 0;
    const amount = bt === "monthly" ? price : price * 12;
    const start = form.billing_start_date ? new Date(form.billing_start_date) : new Date();
    const next = bt === "monthly" ? addMonths(start, 1) : addYears(start, 1);
    setForm(p => ({ ...p, billing_type: bt, amount, next_billing_date: format(next, "yyyy-MM-dd") }));
  };

  const handleStartDateChange = (date) => {
    const start = new Date(date);
    const next = form.billing_type === "yearly" ? addYears(start, 1) : addMonths(start, 1);
    setForm(p => ({ ...p, billing_start_date: date, next_billing_date: format(next, "yyyy-MM-dd") }));
  };

  const uploadInvoice = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm(p => ({ ...p, invoice_url: file_url, invoice_file_name: file.name }));
    setUploading(false);
  };

  const uploadBankReceipt = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm(p => ({ ...p, bank_receipt_url: file_url, bank_receipt_name: file.name }));
    setUploading(false);
  };

  return (
    <div className="space-y-4">
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
        {/* ── Subscription ── */}
        {form.type === "subscription" && (<>
          <div className="col-span-2">
            <Label>Company Name</Label>
            <Input value={form.company_name || ""} onChange={(e) => f("company_name", e.target.value)} />
          </div>
          <div>
            <Label>Subscription Plan</Label>
            <Select value={form.subscription_plan || ""} onValueChange={handlePlanChange}>
              <SelectTrigger><SelectValue placeholder="Select plan" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="starter">Starter — {symbol} {PLAN_PRICES.starter}/mo</SelectItem>
                <SelectItem value="pro">Pro — {symbol} {PLAN_PRICES.pro}/mo</SelectItem>
                <SelectItem value="enterprise">Enterprise — {symbol} {PLAN_PRICES.enterprise}/mo</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Billing Type</Label>
            <Select value={form.billing_type || "monthly"} onValueChange={handleBillingTypeChange}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="yearly">Yearly (save ~17%)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Billing Start Date</Label>
            <Input type="date" value={form.billing_start_date || ""} onChange={(e) => handleStartDateChange(e.target.value)} />
          </div>
          <div>
            <Label>Next Billing Date</Label>
            <Input type="date" value={form.next_billing_date || ""} onChange={(e) => f("next_billing_date", e.target.value)} />
          </div>
          <div><Label>Billing Period</Label><Input value={form.billing_period || ""} onChange={(e) => f("billing_period", e.target.value)} placeholder="e.g. March 2026" /></div>
        </>)}

        {/* ── Supplier ── */}
        {form.type === "supplier" && (<>
          <div>
            <Label>Supplier</Label>
            <Select value={form.supplier_id || ""} onValueChange={(v) => {
              const s = suppliers.find(x => x.id === v);
              setForm(p => ({ ...p, supplier_id: v, supplier_name: s?.name || s?.company_name || "" }));
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
              {uploading ? "Uploading…" : form.invoice_file_name || "Upload invoice"}
              <input type="file" accept=".pdf,.jpg,.png" className="hidden" onChange={uploadInvoice} />
            </label>
          </div>
        </>)}

        {/* ── Subcontractor ── */}
        {form.type === "subcontractor" && (<>
          <div>
            <Label>Subcontractor</Label>
            <Select value={form.subcontractor_id || ""} onValueChange={(v) => {
              const s = subcontractors.find(x => x.id === v);
              setForm(p => ({ ...p, subcontractor_id: v, subcontractor_name: s?.company_name || "" }));
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
            <div className="p-3 rounded-lg bg-muted/30 text-sm flex items-center justify-between">
              <span className="text-muted-foreground">Remaining:</span>
              <span className="font-bold text-warning">{symbol} {remaining.toLocaleString()}</span>
            </div>
          )}
        </>)}

        {/* ── Shared ── */}
        <div><Label>Amount ({symbol})</Label><Input type="number" value={form.amount || ""} onChange={(e) => f("amount", parseFloat(e.target.value) || 0)} /></div>
        <div><Label>Payment Date</Label><Input type="date" value={form.payment_date || ""} onChange={(e) => f("payment_date", e.target.value)} /></div>
        <div><Label>Due Date</Label><Input type="date" value={form.due_date || ""} onChange={(e) => f("due_date", e.target.value)} /></div>
        <div>
          <Label>Payment Method</Label>
          <Select value={form.payment_method || "bank_transfer"} onValueChange={(v) => f("payment_method", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="credit_card">💳 Credit Card</SelectItem>
              <SelectItem value="paypal">🅿️ PayPal</SelectItem>
              <SelectItem value="cmi">🏦 CMI Morocco</SelectItem>
              <SelectItem value="bank_transfer">🏛 Bank Transfer</SelectItem>
              <SelectItem value="mobile_payment">📱 Mobile Payment</SelectItem>
              <SelectItem value="check">📄 Check</SelectItem>
              <SelectItem value="cash">💵 Cash</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* ── Dynamic method fields ── */}
        {form.payment_method === "credit_card" && (<>
          <div className="col-span-2"><Label className="text-xs">Cardholder Name</Label><Input value={form.card_name || ""} onChange={(e) => f("card_name", e.target.value)} placeholder="Full name on card" /></div>
          <div className="col-span-2"><Label className="text-xs">Card Number</Label><Input value={form.card_number || ""} onChange={(e) => f("card_number", e.target.value.replace(/\D/g,"").replace(/(.{4})/g,"$1 ").trim().slice(0,19))} placeholder="0000 0000 0000 0000" maxLength={19} /></div>
          <div><Label className="text-xs">Expiry (MM/YY)</Label><Input value={form.card_expiry || ""} maxLength={5} onChange={(e) => { let v = e.target.value.replace(/\D/g,""); if(v.length>=3) v=v.slice(0,2)+"/"+v.slice(2,4); f("card_expiry", v); }} placeholder="MM/YY" /></div>
          <div><Label className="text-xs">CVV</Label><Input value={form.card_cvv || ""} maxLength={4} onChange={(e) => f("card_cvv", e.target.value.replace(/\D/g,""))} placeholder="•••" type="password" /></div>
          <div className="col-span-2"><Label className="text-xs">Billing Address</Label><Input value={form.billing_address || ""} onChange={(e) => f("billing_address", e.target.value)} placeholder="123 Street, City, Country" /></div>
          <div className="col-span-2 flex items-center gap-2 p-2 rounded-lg bg-success/5 border border-success/20 text-xs text-muted-foreground">
            <Shield className="w-3.5 h-3.5 text-success shrink-0" />Card data is encrypted and never stored on our servers.
          </div>
        </>)}

        {form.payment_method === "paypal" && (<>
          <div className="col-span-2"><Label className="text-xs">PayPal Email</Label><Input type="email" value={form.paypal_email || ""} onChange={(e) => f("paypal_email", e.target.value)} placeholder="your@paypal.com" /></div>
          <div className="col-span-2 p-3 rounded-lg bg-[#003087]/5 border border-[#003087]/20 text-xs text-muted-foreground">
            🅿️ After saving, use the <strong>Pay Now</strong> button to complete payment via PayPal's secure redirect.
          </div>
        </>)}

        {form.payment_method === "cmi" && (
          <div className="col-span-2 p-3 rounded-lg bg-green-500/5 border border-green-500/20 text-xs text-muted-foreground">
            🏦 <strong>CMI Morocco</strong> — Centre Monétique Interbancaire. After saving, use the <strong>Pay Now</strong> button to be redirected to the CMI secure gateway. Accepts all Moroccan bank cards.
          </div>
        )}

        {form.payment_method === "bank_transfer" && (<>
          <div><Label className="text-xs">Bank Name</Label><Input value={form.bank_name || ""} onChange={(e) => f("bank_name", e.target.value)} placeholder="e.g. Attijariwafa Bank" /></div>
          <div><Label className="text-xs">Account Holder</Label><Input value={form.bank_account_holder || ""} onChange={(e) => f("bank_account_holder", e.target.value)} /></div>
          <div className="col-span-2">
            <Label className="text-xs">Upload Payment Receipt</Label>
            <label className="flex items-center gap-2 cursor-pointer px-3 py-2 rounded-md border border-dashed border-border hover:bg-muted/30 text-sm text-muted-foreground">
              <Upload className="w-4 h-4" />
              {uploading ? "Uploading…" : form.bank_receipt_name || "Upload receipt (PDF / image)"}
              <input type="file" accept=".pdf,.jpg,.png" className="hidden" onChange={uploadBankReceipt} />
            </label>
          </div>
        </>)}

        <div className="col-span-2"><Label>Transaction Reference</Label><Input value={form.transaction_reference || ""} onChange={(e) => f("transaction_reference", e.target.value)} placeholder="Auto-filled after online payment" /></div>
      </div>

      {/* Auto-status info */}
      <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 text-xs text-muted-foreground">
        <Clock className="w-3.5 h-3.5 shrink-0" />
        <span>Payment status is <strong>calculated automatically</strong>: Paid when payment date is set, Expired when due date passes without payment.</span>
      </div>

      <div><Label>Notes</Label><Textarea value={form.notes || ""} onChange={(e) => f("notes", e.target.value)} /></div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={() => onSave(form)} disabled={saving}>{saving ? "Saving…" : "Save Payment"}</Button>
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────────
export default function Payments() {
  const { symbol, fmt } = useCurrency();
  const queryClient = useQueryClient();
  const now = new Date();

  const [search, setSearch]           = useState("");
  const [typeFilter, setTypeFilter]   = useState("all");
  const [projectFilter, setProject]   = useState("all");
  const [dateFilter, setDate]         = useState("");
  const [showForm, setShowForm]       = useState(false);
  const [editing, setEditing]         = useState(null);
  const [defaultType, setDefaultType] = useState("supplier");
  const [activeTab, setActiveTab]     = useState("all");
  const [payNow, setPayNow]           = useState(null); // payment to pay online

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ["payments"],
    queryFn: () => base44.entities.Payment.list("-created_date"),
  });
  const { data: projects = [] }       = useQuery({ queryKey: ["projects"],       queryFn: () => base44.entities.Project.list() });
  const { data: suppliers = [] }      = useQuery({ queryKey: ["suppliers"],      queryFn: () => base44.entities.Supplier.list() });
  const { data: subcontractors = [] } = useQuery({ queryKey: ["subcontractors"], queryFn: () => base44.entities.Subcontractor.list() });

  const saveMutation = useMutation({
    mutationFn: (data) => {
      const payload = { ...data };
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
      setShowForm(false); setEditing(null);
    },
  });

  const openForm = (payment = null, type = "supplier") => {
    setEditing(payment);
    setDefaultType(payment?.type || type);
    setShowForm(true);
  };

  // After successful online payment, update record
  const handlePayNowConfirm = async (method, ref) => {
    if (!payNow) return;
    await base44.entities.Payment.update(payNow.id, {
      status: "paid",
      payment_method: method,
      transaction_reference: ref,
      payment_date: format(now, "yyyy-MM-dd"),
    });
    queryClient.invalidateQueries({ queryKey: ["payments"] });
    setPayNow(null);
    generateInvoicePDF(payNow, ref);
  };

  const generateInvoicePDF = async (payment, ref) => {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF();
    doc.setFontSize(22); doc.setTextColor(30, 64, 175);
    doc.text("PAYMENT RECEIPT", 20, 25);
    doc.setFontSize(10); doc.setTextColor(100, 100, 100);
    doc.text(`Generated: ${format(now, "PPP")}`, 20, 35);
    doc.setDrawColor(200, 200, 200); doc.line(20, 40, 190, 40);
    doc.setFontSize(11); doc.setTextColor(0, 0, 0);
    const rows = [
      ["Transaction Ref:", ref || "—"],
      ["Type:", TYPE_CONFIG[payment.type]?.label || payment.type],
      ["Beneficiary:", payment.supplier_name || payment.subcontractor_name || payment.company_name || "—"],
      ["Project:", payment.project_name || "—"],
      ["Amount:", fmt(payment.amount)],
      ["Payment Method:", METHOD_LABELS[payment.payment_method] || "—"],
      ["Date:", payment.payment_date ? format(new Date(payment.payment_date), "PPP") : format(now, "PPP")],
      ["Status:", "PAID"],
    ];
    let y = 55;
    rows.forEach(([k, v]) => {
      doc.setTextColor(100, 100, 100); doc.text(k, 20, y);
      doc.setTextColor(0, 0, 0); doc.text(v, 80, y);
      y += 10;
    });
    doc.setFillColor(34, 197, 94); doc.rect(20, y + 5, 170, 12, "F");
    doc.setTextColor(255, 255, 255); doc.setFontSize(13);
    doc.text("Payment Successfully Processed", 105, y + 14, { align: "center" });
    doc.save(`receipt_${ref || payment.id?.slice(-8)}.pdf`);
  };

  // ─── KPIs ───
  const kpis = useMemo(() => {
    const thisMonthPaid = payments.filter(p => {
      if (p.status !== "paid" || !p.payment_date) return false;
      const d = new Date(p.payment_date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    return {
      totalMonth:   thisMonthPaid.reduce((s, p) => s + (p.amount || 0), 0),
      subRevenue:   payments.filter(p => p.type === "subscription" && p.status === "paid").reduce((s, p) => s + (p.amount || 0), 0),
      supplierPaid: payments.filter(p => p.type === "supplier" && p.status === "paid").reduce((s, p) => s + (p.amount || 0), 0),
      subconPaid:   payments.filter(p => p.type === "subcontractor" && p.status === "paid").reduce((s, p) => s + (p.amount || 0), 0),
      pending:      payments.filter(p => p.status === "pending").length,
    };
  }, [payments]);

  const overduePayments = payments.filter(p =>
    p.status === "pending" && p.due_date && new Date(p.due_date) < now
  );

  // Subscriptions expiring in 3 days
  const expiringSubscriptions = payments.filter(p => {
    if (p.type !== "subscription" || p.status === "expired") return false;
    if (!p.next_billing_date) return false;
    const diff = (new Date(p.next_billing_date) - now) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff <= 3;
  });

  // ─── Chart ───
  const chartData = useMemo(() => {
    const map = {};
    payments.filter(p => p.status === "paid" && p.payment_date).forEach(p => {
      const key = p.payment_date.slice(0, 7);
      if (!map[key]) map[key] = { subscription: 0, supplier: 0, subcontractor: 0 };
      map[key][p.type] = (map[key][p.type] || 0) + (p.amount || 0);
    });
    return Object.entries(map).sort().slice(-6).map(([k, v]) => ({
      month: k.slice(5) + "/" + k.slice(2, 4), ...v,
    }));
  }, [payments]);

  // ─── Filtering ───
  const filtered = useMemo(() => payments.filter(p => {
    if (activeTab !== "all" && p.type !== activeTab) return false;
    if (typeFilter !== "all" && p.type !== typeFilter) return false;
    if (projectFilter !== "all" && p.project_id !== projectFilter) return false;
    if (dateFilter && p.payment_date && !p.payment_date.startsWith(dateFilter)) return false;
    if (search) {
      const q = search.toLowerCase();
      const fields = [p.supplier_name, p.subcontractor_name, p.company_name, p.project_name, p.invoice_number, p.transaction_reference];
      if (!fields.some(v => v?.toLowerCase().includes(q))) return false;
    }
    return true;
  }), [payments, activeTab, typeFilter, projectFilter, dateFilter, search]);

  // ─── Export PDF ───
  const exportPDF = async () => {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(14); doc.text("Payments Report", 14, 15);
    doc.setFontSize(8);
    let y = 25;
    const headers = ["ID", "Type", "Beneficiary", "Project", "Amount", "Date", "Method", "Status", "Ref"];
    const cols =    [ 14,   35,     60,             100,       135,      160,    185,      215,      245];
    doc.setFillColor(240, 240, 240); doc.rect(12, y - 5, 270, 8, "F");
    headers.forEach((h, i) => doc.text(h, cols[i], y));
    y += 8;
    filtered.forEach(p => {
      if (y > 185) { doc.addPage("a4", "landscape"); y = 20; }
      const ben = (p.supplier_name || p.subcontractor_name || p.company_name || "—").slice(0, 18);
      [
        p.id?.slice(-6), TYPE_CONFIG[p.type]?.label || p.type, ben,
        (p.project_name || "—").slice(0, 14), fmt(p.amount),
        p.payment_date ? format(new Date(p.payment_date), "dd/MM/yy") : "—",
        (METHOD_LABELS[p.payment_method] || "—").slice(0, 12),
        STATUS_CONFIG[p.status]?.label || p.status,
        (p.transaction_reference || "—").slice(0, 12),
      ].forEach((v, i) => doc.text(String(v), cols[i], y));
      y += 7;
    });
    doc.save(`payments_${format(now, "yyyy-MM-dd")}.pdf`);
  };

  const exportCSV = () => {
    const rows = [
      ["ID", "Type", "Beneficiary", "Project", "Amount", "Date", "Method", "Status", "Ref"],
      ...filtered.map(p => [
        p.id?.slice(-8),
        TYPE_CONFIG[p.type]?.label || p.type,
        p.supplier_name || p.subcontractor_name || p.company_name || "—",
        p.project_name || "—",
        p.amount || 0,
        p.payment_date || "—",
        METHOD_LABELS[p.payment_method] || "—",
        STATUS_CONFIG[p.status]?.label || p.status,
        p.transaction_reference || "—",
      ]),
    ];
    const csv = rows.map(r => r.map(v => `"${v}"`).join(",")).join("\n");
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
          <h1 className="text-2xl font-bold">Payments & Subscriptions</h1>
          <p className="text-sm text-muted-foreground">Finance → Payments</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={exportCSV}><Download className="w-3.5 h-3.5" />CSV</Button>
          <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={exportPDF}><Download className="w-3.5 h-3.5" />PDF</Button>
          <Button size="sm" className="gap-1.5" onClick={() => openForm()}><Plus className="w-4 h-4" />Add Payment</Button>
        </div>
      </div>

      {/* Alerts */}
      {expiringSubscriptions.length > 0 && (
        <div className="flex items-start gap-3 p-3 rounded-lg bg-warning/10 border border-warning/20 text-warning text-sm">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <div>
            <strong>{expiringSubscriptions.length} subscription{expiringSubscriptions.length > 1 ? "s" : ""} expiring within 3 days.</strong>
            {" "}Your WAPE subscription payment is due. Please finalize the payment to continue using the platform.
          </div>
        </div>
      )}
      {overduePayments.length > 0 && (
        <div className="flex items-start gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span><strong>{overduePayments.length} overdue payment{overduePayments.length > 1 ? "s" : ""}</strong> — past their due date.</span>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <KpiCard title="Total This Month"       value={fmt(kpis.totalMonth)}   icon={TrendingDown} color="primary" />
        <KpiCard title="Subscription Revenue"   value={fmt(kpis.subRevenue)}   icon={RefreshCw}    color="purple" />
        <KpiCard title="Supplier Payments"      value={fmt(kpis.supplierPaid)} icon={Building2}    color="warning" />
        <KpiCard title="Subcontractor Payments" value={fmt(kpis.subconPaid)}   icon={HardHat}      color="destructive" />
        <KpiCard title="Pending Payments" value={kpis.pending} sub={kpis.pending > 0 ? "Needs action" : "All clear"} icon={Clock} color={kpis.pending > 0 ? "warning" : "success"} />
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Monthly Payments by Type</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} barSize={18}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => fmt(v)} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                <Legend />
                <Bar dataKey="subscription"  fill="hsl(271,81%,56%)" name="Subscription"  radius={[4,4,0,0]} />
                <Bar dataKey="supplier"      fill="hsl(221,83%,53%)" name="Supplier"      radius={[4,4,0,0]} />
                <Bar dataKey="subcontractor" fill="hsl(25,95%,53%)"  name="Subcontractor" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Quick-add shortcuts */}
      <div className="flex gap-2 flex-wrap">
        {[
          { type: "subscription",  label: "New Subscription",        icon: RefreshCw  },
          { type: "supplier",      label: "New Supplier Payment",    icon: Building2  },
          { type: "subcontractor", label: "New Subcontractor Payment", icon: HardHat  },
        ].map(({ type, label, icon: Icon }) => (
          <Button key={type} variant="outline" size="sm" className="gap-2 text-xs" onClick={() => openForm(null, type)}>
            <Icon className="w-3.5 h-3.5" />{label}
          </Button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-44">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search payments…" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-36 bg-card"><SelectValue placeholder="All types" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="subscription">Subscription</SelectItem>
            <SelectItem value="supplier">Supplier</SelectItem>
            <SelectItem value="subcontractor">Subcontractor</SelectItem>
          </SelectContent>
        </Select>
        <Select value={projectFilter} onValueChange={setProject}>
          <SelectTrigger className="w-40 bg-card"><SelectValue placeholder="All projects" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Projects</SelectItem>
            {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input type="month" className="w-36 bg-card" value={dateFilter} onChange={(e) => setDate(e.target.value)} title="Filter by month" />
        {(typeFilter !== "all" || projectFilter !== "all" || search || dateFilter) && (
          <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => { setTypeFilter("all"); setProject("all"); setSearch(""); setDate(""); }}>
            <X className="w-3 h-3" />Clear
          </Button>
        )}
      </div>

      {/* Tabs + Table */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All ({payments.length})</TabsTrigger>
          <TabsTrigger value="subscription">Subscriptions</TabsTrigger>
          <TabsTrigger value="supplier">Suppliers</TabsTrigger>
          <TabsTrigger value="subcontractor">Subcontractors</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-3">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      {["Txn ID", "Type", "Beneficiary", "Project", "Amount", "Date", "Method", "Status", "Ref", ""].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading && <tr><td colSpan={10} className="text-center py-10 text-muted-foreground text-sm">Loading…</td></tr>}
                    {!isLoading && filtered.length === 0 && <tr><td colSpan={10} className="text-center py-10 text-muted-foreground text-sm">No payments found</td></tr>}
                    {filtered.map(p => {
                      const TypeIcon = TYPE_CONFIG[p.type]?.icon || CreditCard;
                      const ben = p.supplier_name || p.subcontractor_name || p.company_name || "—";
                      const isOverdue = p.status === "pending" && p.due_date && new Date(p.due_date) < now;
                      const canPayOnline = p.status === "pending" && ["credit_card", "paypal", "cmi"].includes(p.payment_method);
                      return (
                        <tr key={p.id} className={`border-b border-border/50 hover:bg-muted/20 transition-colors ${isOverdue ? "bg-destructive/5" : ""}`}>
                          <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{p.id?.slice(-8)}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              <TypeIcon className={`w-3.5 h-3.5 ${TYPE_CONFIG[p.type]?.color || ""}`} />
                              <span className="text-xs font-medium">{TYPE_CONFIG[p.type]?.label || p.type}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 max-w-[140px]">
                            <p className="font-medium truncate">{ben}</p>
                            {p.invoice_number && <p className="text-xs text-muted-foreground">{p.invoice_number}</p>}
                            {p.subscription_plan && <Badge variant="outline" className="text-xs mt-0.5">{PLAN_LABELS[p.subscription_plan]}</Badge>}
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">{p.project_name || "—"}</td>
                          <td className="px-4 py-3 font-semibold whitespace-nowrap">
                            <p>{fmt(p.amount)}</p>
                            {p.type === "subcontractor" && p.contract_amount && (
                              <p className="text-xs text-muted-foreground">of {fmt(p.contract_amount)}</p>
                            )}
                          </td>
                          <td className="px-4 py-3 text-xs whitespace-nowrap">
                            <p>{p.payment_date ? format(new Date(p.payment_date), "MMM d, yyyy") : "—"}</p>
                            {isOverdue && <p className="text-destructive font-medium">Overdue!</p>}
                            {p.next_billing_date && p.type === "subscription" && (
                              <p className="text-muted-foreground">Next: {format(new Date(p.next_billing_date), "MMM d")}</p>
                            )}
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{METHOD_LABELS[p.payment_method] || "—"}</td>
                          <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                          <td className="px-4 py-3 font-mono text-xs text-muted-foreground max-w-[100px] truncate">{p.transaction_reference || "—"}</td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1 items-center">
                              {canPayOnline && (
                                <Button size="sm" className="h-7 text-xs gap-1" onClick={() => setPayNow(p)}>
                                  <Shield className="w-3 h-3" />Pay Now
                                </Button>
                              )}
                              {p.invoice_url && (
                                <a href={p.invoice_url} target="_blank" rel="noopener noreferrer">
                                  <Button variant="ghost" size="icon" className="h-7 w-7"><Download className="w-3.5 h-3.5" /></Button>
                                </a>
                              )}
                              {p.status === "paid" && (
                                <Button variant="ghost" size="icon" className="h-7 w-7" title="Download receipt" onClick={() => generateInvoicePDF(p, p.transaction_reference)}>
                                  <Download className="w-3.5 h-3.5" />
                                </Button>
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

      {/* Add/Edit Payment dialog */}
      <FormDialog open={showForm} onOpenChange={setShowForm} title={editing ? "Edit Payment" : `New ${TYPE_CONFIG[defaultType]?.label || ""} Payment`}>
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

      {/* Pay Now dialog */}
      <FormDialog open={!!payNow} onOpenChange={(o) => !o && setPayNow(null)} title="Secure Payment">
        {payNow && (
          <PayNowDialog
            payment={payNow}
            fmt={fmt}
            onConfirm={handlePayNowConfirm}
            onCancel={() => setPayNow(null)}
          />
        )}
      </FormDialog>
    </div>
  );
}