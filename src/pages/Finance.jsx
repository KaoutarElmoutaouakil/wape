import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import KPICard from "@/components/shared/KPICard";
import { Progress } from "@/components/ui/progress";
import StatusBadge from "@/components/shared/StatusBadge";
import { DollarSign, TrendingUp, TrendingDown, AlertCircle } from "lucide-react";
import { useCurrency } from "@/components/shared/currency";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell
} from "recharts";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

const COLORS = ["hsl(221,83%,53%)", "hsl(142,71%,45%)", "hsl(38,92%,50%)", "hsl(0,84%,60%)", "hsl(199,89%,48%)"];

export default function Finance() {
  const { data: projects = [] } = useQuery({ queryKey: ["projects"], queryFn: () => base44.entities.Project.list() });
  const { data: expenses = [] } = useQuery({ queryKey: ["expenses"], queryFn: () => base44.entities.Expense.list() });
  const { data: attachments = [] } = useQuery({ queryKey: ["attachments"], queryFn: () => base44.entities.Attachment.list() });

  const totalBudget = projects.reduce((s, p) => s + (p.estimated_budget || 0), 0);
  // Total spent = expenses (includes auto-created ones from approved attachments)
  const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0);
  const remaining = totalBudget - totalExpenses;
  const usagePercent = totalBudget > 0 ? Math.round((totalExpenses / totalBudget) * 100) : 0;

  const projectFinance = projects.map(p => {
    const spent = expenses.filter(e => e.project_id === p.id).reduce((s, e) => s + (e.amount || 0), 0);
    const budget = p.estimated_budget || 0;
    const pct = budget > 0 ? Math.round((spent / budget) * 100) : 0;
    return { ...p, spent, remaining: budget - spent, pct };
  }).sort((a, b) => (b.estimated_budget || 0) - (a.estimated_budget || 0));

  const byCategory = ["transport", "materials", "equipment", "extra_cost", "labor", "other"].map(c => ({
    name: c.replace("_", " "),
    value: expenses.filter(e => e.category === c).reduce((s, e) => s + (e.amount || 0), 0),
  })).filter(c => c.value > 0);

  const budgetVsActual = projectFinance.slice(0, 6).map(p => ({
    name: p.name?.length > 10 ? p.name.substring(0, 10) + "..." : p.name,
    budget: p.estimated_budget || 0,
    spent: p.spent,
  }));

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Total Budget" value={`€${totalBudget.toLocaleString()}`} icon={DollarSign} color="primary" subtitle={`${projects.length} projects`} />
        <KPICard title="Total Spent" value={`€${totalExpenses.toLocaleString()}`} icon={TrendingDown} color="warning" subtitle={`${expenses.length} expenses`} />
        <KPICard title="Remaining Budget" value={`€${remaining.toLocaleString()}`} icon={TrendingUp} color={remaining >= 0 ? "success" : "destructive"} subtitle={remaining < 0 ? "Over budget!" : "Available"} />
        <KPICard title="Budget Used" value={`${usagePercent}%`} icon={AlertCircle} color={usagePercent > 90 ? "destructive" : usagePercent > 70 ? "warning" : "success"} subtitle={`${100 - usagePercent}% remaining`} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-sm font-semibold">Budget vs Actual by Project</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={budgetVsActual}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }} />
                <Legend />
                <Bar dataKey="budget" fill="hsl(221,83%,53%)" name="Budget" radius={[4, 4, 0, 0]} />
                <Bar dataKey="spent" fill="hsl(38,92%,50%)" name="Spent" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm font-semibold">Expenses by Category</CardTitle></CardHeader>
          <CardContent className="flex justify-center">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={byCategory} cx="50%" cy="50%" outerRadius={110} dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {byCategory.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => `€${v.toLocaleString()}`} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Per-project breakdown */}
      <Card>
        <CardHeader><CardTitle className="text-sm font-semibold">Project Budget Breakdown</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-4">
            {projectFinance.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No projects</p>}
            {projectFinance.map(p => (
              <div key={p.id} className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Link to={createPageUrl("ProjectDetails") + `?id=${p.id}`} className="text-sm font-medium hover:text-primary transition-colors">{p.name}</Link>
                    <StatusBadge status={p.status} />
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    <span className="text-warning font-semibold">€{p.spent.toLocaleString()}</span>
                    <span> / €{(p.estimated_budget || 0).toLocaleString()}</span>
                    <span className={`ml-2 font-bold ${p.pct > 100 ? "text-destructive" : p.pct > 80 ? "text-warning" : "text-success"}`}>{p.pct}%</span>
                  </div>
                </div>
                <Progress value={Math.min(p.pct, 100)} className={`h-2 ${p.pct > 100 ? "[&>div]:bg-destructive" : p.pct > 80 ? "[&>div]:bg-warning" : ""}`} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}