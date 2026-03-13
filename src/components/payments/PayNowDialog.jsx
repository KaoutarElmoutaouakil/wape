import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Shield, CheckCircle2, Loader2 } from "lucide-react";

const METHOD_TABS = [
  { id: "credit_card", label: "Credit Card", icon: "💳" },
  { id: "paypal",      label: "PayPal",       icon: "🅿️" },
  { id: "cmi",         label: "CMI Morocco",  icon: "🏦" },
];

export default function PayNowDialog({ payment, fmt, onConfirm, onCancel }) {
  const [method, setMethod]     = useState("credit_card");
  const [step, setStep]         = useState("form"); // form | confirming | success
  const [cardForm, setCardForm] = useState({ name: "", number: "", expiry: "", cvv: "", address: "" });
  const [error, setError]       = useState("");

  const validate = () => {
    if (method === "credit_card") {
      if (!cardForm.name) return "Cardholder name is required.";
      if (cardForm.number.replace(/\s/g, "").length < 13) return "Invalid card number.";
      if (!cardForm.expiry.match(/^\d{2}\/\d{2}$/)) return "Expiry must be MM/YY.";
      if (cardForm.cvv.length < 3) return "Invalid CVV.";
    }
    return "";
  };

  const handlePay = () => {
    const err = validate();
    if (err) { setError(err); return; }
    setError("");
    setStep("confirming");
    // Simulate payment processing (2s)
    setTimeout(() => setStep("success"), 2000);
  };

  const formatCard = (val) => {
    const digits = val.replace(/\D/g, "").slice(0, 16);
    return digits.replace(/(.{4})/g, "$1 ").trim();
  };

  if (step === "success") {
    const ref = `TXN-${Date.now().toString(36).toUpperCase()}`;
    return (
      <div className="text-center py-6 space-y-4">
        <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-8 h-8 text-success" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-success">Payment Successful!</h3>
          <p className="text-sm text-muted-foreground mt-1">Your payment of <strong>{fmt(payment.amount)}</strong> has been processed.</p>
        </div>
        <div className="p-3 rounded-lg bg-muted/30 text-sm space-y-1">
          <div className="flex justify-between"><span className="text-muted-foreground">Transaction Ref:</span><span className="font-mono font-semibold">{ref}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Method:</span><span>{METHOD_TABS.find(m => m.id === method)?.label}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Amount:</span><span className="font-bold">{fmt(payment.amount)}</span></div>
        </div>
        <div className="flex gap-2 justify-center">
          <Button variant="outline" size="sm" onClick={onCancel}>Close</Button>
          <Button size="sm" onClick={() => onConfirm(method, ref)}>Save & Generate Invoice</Button>
        </div>
      </div>
    );
  }

  if (step === "confirming") {
    return (
      <div className="text-center py-10 space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto" />
        <p className="text-sm font-medium">Processing payment securely…</p>
        <p className="text-xs text-muted-foreground">Please do not close this window.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Amount banner */}
      <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">Amount to Pay</p>
          <p className="text-2xl font-bold text-primary">{fmt(payment.amount)}</p>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Shield className="w-3.5 h-3.5" /> Secure Payment
        </div>
      </div>

      {/* Method selector */}
      <div>
        <Label className="mb-2 block">Payment Method</Label>
        <div className="grid grid-cols-3 gap-2">
          {METHOD_TABS.map(m => (
            <button
              key={m.id}
              onClick={() => setMethod(m.id)}
              className={`flex flex-col items-center gap-1 p-3 rounded-lg border-2 text-xs font-medium transition-all ${
                method === m.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
              }`}
            >
              <span className="text-lg">{m.icon}</span>
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Credit Card form */}
      {method === "credit_card" && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label className="text-xs">Cardholder Name</Label>
              <Input placeholder="John Doe" value={cardForm.name} onChange={(e) => setCardForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="col-span-2">
              <Label className="text-xs">Card Number</Label>
              <div className="relative">
                <Input
                  placeholder="0000 0000 0000 0000"
                  value={cardForm.number}
                  onChange={(e) => setCardForm(f => ({ ...f, number: formatCard(e.target.value) }))}
                  maxLength={19}
                  className="pr-10"
                />
                <CreditCard className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Expiry (MM/YY)</Label>
              <Input
                placeholder="MM/YY"
                value={cardForm.expiry}
                maxLength={5}
                onChange={(e) => {
                  let v = e.target.value.replace(/\D/g, "");
                  if (v.length >= 3) v = v.slice(0, 2) + "/" + v.slice(2, 4);
                  setCardForm(f => ({ ...f, expiry: v }));
                }}
              />
            </div>
            <div>
              <Label className="text-xs">CVV</Label>
              <Input placeholder="•••" maxLength={4} value={cardForm.cvv} onChange={(e) => setCardForm(f => ({ ...f, cvv: e.target.value.replace(/\D/g, "") }))} />
            </div>
            <div className="col-span-2">
              <Label className="text-xs">Billing Address</Label>
              <Input placeholder="123 Main St, City, Country" value={cardForm.address} onChange={(e) => setCardForm(f => ({ ...f, address: e.target.value }))} />
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground p-2 rounded-lg bg-muted/30">
            <Shield className="w-3.5 h-3.5 text-success shrink-0" />
            Card information is encrypted and processed securely. We do not store card details.
          </div>
        </div>
      )}

      {/* PayPal */}
      {method === "paypal" && (
        <div className="p-6 rounded-lg bg-[#003087]/5 border border-[#003087]/20 text-center space-y-3">
          <p className="text-4xl">🅿️</p>
          <p className="text-sm font-medium">You will be redirected to PayPal to complete your payment securely.</p>
          <p className="text-xs text-muted-foreground">Amount: <strong>{fmt(payment.amount)}</strong></p>
        </div>
      )}

      {/* CMI Morocco */}
      {method === "cmi" && (
        <div className="p-6 rounded-lg bg-green-500/5 border border-green-500/20 text-center space-y-3">
          <p className="text-4xl">🏦</p>
          <p className="text-sm font-medium">CMI Morocco — Centre Monétique Interbancaire</p>
          <p className="text-xs text-muted-foreground">Pay securely using your Moroccan bank card via the CMI gateway.</p>
          <Badge variant="outline" className="text-xs">Accepts: CIH, Banque Populaire, Attijariwafa, BMCE…</Badge>
        </div>
      )}

      {error && (
        <p className="text-sm text-destructive bg-destructive/10 p-2 rounded-md">{error}</p>
      )}

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={handlePay} className="gap-2">
          <Shield className="w-4 h-4" /> Pay {fmt(payment.amount)}
        </Button>
      </div>
    </div>
  );
}