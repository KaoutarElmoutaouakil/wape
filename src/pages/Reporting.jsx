import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import KPICard from "@/components/shared/KPICard";
import StatusBadge from "@/components/shared/StatusBadge";
import { Progress } from "@/components/ui/progress";
import { FolderKanban, CheckSquare, Users, Package, AlertTriangle, DollarSign } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell, LineChart, Line
} from "recharts";
import { format, subDays } from "date-fns";

const COLORS = ["hsl(221,83%,53%)", "hsl(142,71%,45%)", "hsl(38,92%,50%)", "hsl(0,84%,60%)", "hsl(199,89%,48%)"];

export default function Reporting() {
  const { data: projects = [] } = useQuery({ queryKey: ["projects"], queryFn: () => base44.entities.Project.list() });
  const { data: tasks = [] } = useQuery({ queryKey: ["tasks"], queryFn: () => base44.entities.Task.list() });
  const { data: personnel = [] } = useQuery({ queryKey: ["personnel"], queryFn: () => base44.entities.Personnel.list() });
  const { data: expenses = [] } = useQuery({ queryKey: ["expenses"], queryFn: () => base44.entities.Expense.list() });
  const { data: ncs = [] } = useQuery({ queryKey: ["ncs"], queryFn: () => base44.entities.NonConformity.list() });
  const { data: tools = [] } = useQuery({ queryKey: ["tools"], queryFn: () => base44.entities.Tool.list() });

  const totalBudget = projects.reduce((s, p) => s + (p.estimated_budget || 0), 0);
  const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0);

  const tasksByStatus = ["todo", "in_progress", "review", "completed", "blocked"].map(s => ({
    name: s.replace("_", " "),
    count: tasks.filter(t => t.status === s).length,
  }));

  const ncsBySeverity = ["low", "medium", "high", "critical"].map(s => ({
    name: s,
    open: ncs.filter(nc => nc.severity === s && nc.status !== "closed").length,
    closed: ncs.filter(nc => nc.severity === s && nc.status === "closed").length,
  }));

  const expensesByCategory = ["transport", "materials", "equipment", "extra_cost", "labor", "other"].map(c => ({
    name: c.replace("_", " "),
    value: expenses.filter(e => e.category === c).reduce((s, e) => s + (e.amount || 0), 0),
  })).filter(c => c.value > 0);

  const personnelByStatus = [
    { name: "Active", value: personnel.filter(p => p.status === "active").length },
    { name: "On Leave", value: personnel.filter(p => p.status === "on_leave").length },
    { name: "Inactive", value: personnel.filter(p => p.status === "inactive").length },
  ].filter(p => p.value > 0);

  return (
    <div className="space-y-6">
      {/* Global KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <KPICard title="Projects" value={projects.length} icon={FolderKanban} color="primary" />
        <KPICard title="Tasks" value={tasks.length} icon={CheckSquare} color="info" />
        <KPICard title="Personnel" value={personnel.filter(p => p.status === "active").length} icon={Users} color="success" />
        <KPICard title="Tools" value={tools.filter(t => t.status === "available").length} icon={Package} color="warning" />
        <KPICard title="Open NCs" value={ncs.filter(nc => nc.status === "open").length} icon={AlertTriangle} color="destructive" />
        <KPICard title="Budget Used" value={totalBudget > 0 ? `${Math.round((totalExpenses/totalBudget)*100)}%` : "N/A"} icon={DollarSign} color="info" />
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-sm font-semibold">Task Distribution by Status</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={tasksByStatus}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }} />
                <Bar dataKey="count" fill="hsl(221,83%,53%)" radius={[4, 4, 0, 0]} name="Tasks" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm font-semibold">Non Conformities by Severity</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={ncsBySeverity}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }} />
                <Legend />
                <Bar dataKey="open" fill="hsl(0,84%,60%)" radius={[4, 4, 0, 0]} name="Open" />
                <Bar dataKey="closed" fill="hsl(142,71%,45%)" radius={[4, 4, 0, 0]} name="Closed" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-sm font-semibold">Expenses by Category</CardTitle></CardHeader>
          <CardContent className="flex justify-center">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={expensesByCategory} cx="50%" cy="50%" outerRadius={100} dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {expensesByCategory.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => `€${v.toLocaleString()}`} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm font-semibold">Personnel Status</CardTitle></CardHeader>
          <CardContent className="flex justify-center">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={personnelByStatus} cx="50%" cy="50%" outerRadius={100} dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {personnelByStatus.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Project health table */}
      <Card>
        <CardHeader><CardTitle className="text-sm font-semibold">Project Health Overview</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {projects.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No projects</p>}
            {projects.map(p => {
              const ptasks = tasks.filter(t => t.project_id === p.id);
              const pexpenses = expenses.filter(e => e.project_id === p.id).reduce((s, e) => s + (e.amount || 0), 0);
              const pncs = ncs.filter(nc => nc.project_id === p.id && nc.status === "open").length;
              const budgetPct = p.estimated_budget > 0 ? Math.round((pexpenses / p.estimated_budget) * 100) : 0;
              return (
                <div key={p.id} className="p-4 rounded-lg border border-border bg-card/50">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">{p.name}</p>
                      <StatusBadge status={p.status} />
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>{ptasks.length} tasks</span>
                      <span className={pncs > 0 ? "text-destructive font-medium" : ""}>{pncs} open NCs</span>
                      <span className={budgetPct > 100 ? "text-destructive font-bold" : ""}>{budgetPct}% budget used</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-20">Progress</span>
                    <Progress value={p.progress || 0} className="h-1.5 flex-1" />
                    <span className="text-xs font-medium w-10 text-right">{p.progress || 0}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}