import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import KPICard from "@/components/shared/KPICard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import StatusBadge from "@/components/shared/StatusBadge";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  FolderKanban, CheckSquare, Users, Package, AlertTriangle, DollarSign,
  ArrowRight, Clock, UserCheck, CalendarCheck
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend
} from "recharts";
import { format } from "date-fns";

const COLORS = ["hsl(221,83%,53%)", "hsl(142,71%,45%)", "hsl(38,92%,50%)", "hsl(0,84%,60%)", "hsl(199,89%,48%)"];

export default function Dashboard() {
  const { data: projects = [] } = useQuery({ queryKey: ["projects"], queryFn: () => base44.entities.Project.list() });
  const { data: tasks = [] } = useQuery({ queryKey: ["tasks"], queryFn: () => base44.entities.Task.list() });
  const { data: personnel = [] } = useQuery({ queryKey: ["personnel"], queryFn: () => base44.entities.Personnel.list() });
  const { data: articles = [] } = useQuery({ queryKey: ["articles"], queryFn: () => base44.entities.Article.list() });
  const { data: ncs = [] } = useQuery({ queryKey: ["ncs"], queryFn: () => base44.entities.NonConformity.list() });
  const { data: expenses = [] } = useQuery({ queryKey: ["expenses"], queryFn: () => base44.entities.Expense.list() });
  const { data: pointages = [] } = useQuery({ queryKey: ["pointages"], queryFn: () => base44.entities.PointageJournalier.list() });

  const activeProjects = projects.filter(p => p.status === "in_progress").length;
  const tasksInProgress = tasks.filter(t => t.status === "in_progress").length;
  const assignedPersonnel = personnel.filter(p => p.status === "active").length;
  const stockAlerts = articles.filter(a => (a.current_stock || 0) <= (a.minimum_stock || 0) && a.minimum_stock > 0).length;
  const openNCs = ncs.filter(nc => nc.status === "open" || nc.status === "in_progress").length;
  const totalBudget = projects.reduce((s, p) => s + (p.estimated_budget || 0), 0);
  const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0);
  const budgetUsage = totalBudget > 0 ? Math.round((totalExpenses / totalBudget) * 100) : 0;

  // Chart data
  const projectProgress = projects.slice(0, 6).map(p => ({
    name: p.name?.length > 12 ? p.name.substring(0, 12) + "..." : p.name,
    progress: p.progress || 0,
  }));

  const budgetVsActual = projects.slice(0, 5).map(p => {
    const projExpenses = expenses.filter(e => e.project_id === p.id).reduce((s, e) => s + (e.amount || 0), 0);
    return {
      name: p.name?.length > 10 ? p.name.substring(0, 10) + "..." : p.name,
      budget: p.estimated_budget || 0,
      actual: projExpenses,
    };
  });

  const taskStatuses = ["todo", "in_progress", "review", "completed", "blocked"].map(s => ({
    name: s.replace("_", " "),
    value: tasks.filter(t => t.status === s).length,
  })).filter(s => s.value > 0);

  const expensesByCategory = ["transport", "materials", "equipment", "extra_cost", "labor", "other"].map(c => ({
    name: c.replace("_", " "),
    value: expenses.filter(e => e.category === c).reduce((s, e) => s + (e.amount || 0), 0),
  })).filter(c => c.value > 0);

  const recentTasks = tasks.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)).slice(0, 5);

  const todayStr = format(new Date(), "yyyy-MM-dd");
  const todayPointages = pointages.filter(p => p.date === todayStr);
  const presentAujourdhui = todayPointages.filter(p => p.statut_presence === "present" || p.statut_presence === "retard" || p.statut_presence === "demi_journee").length;
  const absentAujourdhui = todayPointages.filter(p => p.statut_presence === "absent").length;
  const heuresToday = todayPointages.reduce((s, p) => s + (p.heures_travaillees || 0), 0);
  // Top projets heures
  const projetHeuresMap = {};
  pointages.forEach(p => {
    if (!p.projet_nom) return;
    projetHeuresMap[p.projet_nom] = (projetHeuresMap[p.projet_nom] || 0) + (p.heures_travaillees || 0);
  });
  const topProjetsPointage = Object.entries(projetHeuresMap).sort((a,b) => b[1]-a[1]).slice(0,5).map(([name, heures]) => ({ name: name.length > 14 ? name.slice(0,14)+"…" : name, heures }));

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <KPICard title="Active Projects" value={activeProjects} icon={FolderKanban} color="primary" />
        <KPICard title="Tasks In Progress" value={tasksInProgress} icon={CheckSquare} color="warning" />
        <KPICard title="Active Personnel" value={assignedPersonnel} icon={Users} color="success" />
        <KPICard title="Stock Alerts" value={stockAlerts} icon={Package} color={stockAlerts > 0 ? "destructive" : "success"} />
        <KPICard title="Open NC" value={openNCs} icon={AlertTriangle} color={openNCs > 0 ? "warning" : "success"} />
        <KPICard title="Budget Usage" value={`${budgetUsage}%`} icon={DollarSign} color={budgetUsage > 90 ? "destructive" : "info"} />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-foreground">Project Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={projectProgress}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }} />
                <Bar dataKey="progress" fill="hsl(221,83%,53%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-foreground">Budget vs Actual Cost</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={budgetVsActual}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }} />
                <Legend />
                <Bar dataKey="budget" fill="hsl(221,83%,53%)" name="Budget" radius={[4, 4, 0, 0]} />
                <Bar dataKey="actual" fill="hsl(38,92%,50%)" name="Actual" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-foreground">Task Completion Rate</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center">
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={taskStatuses} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {taskStatuses.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-foreground">Expenses by Category</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center">
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={expensesByCategory} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {expensesByCategory.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Pointage KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-success/10"><UserCheck className="w-5 h-5 text-success" /></div>
            <div><p className="text-xs text-muted-foreground">Présents aujourd'hui</p><p className="text-xl font-bold">{presentAujourdhui}</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-destructive/10"><AlertTriangle className="w-5 h-5 text-destructive" /></div>
            <div><p className="text-xs text-muted-foreground">Absences aujourd'hui</p><p className="text-xl font-bold">{absentAujourdhui}</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10"><Clock className="w-5 h-5 text-primary" /></div>
            <div><p className="text-xs text-muted-foreground">Heures travaillées (J)</p><p className="text-xl font-bold">{heuresToday.toFixed(1)}h</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10"><CalendarCheck className="w-5 h-5 text-purple-600" /></div>
            <div><p className="text-xs text-muted-foreground">Pointages ce mois</p><p className="text-xl font-bold">{pointages.filter(p => p.date?.startsWith(format(new Date(),"yyyy-MM"))).length}</p></div>
          </CardContent>
        </Card>
      </div>

      {/* Top Projets Pointage */}
      {topProjetsPointage.length > 0 && (
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold">Top Projets — Heures Opérateurs</CardTitle>
            <Link to={createPageUrl("RapportPresence")} className="text-xs text-primary hover:underline flex items-center gap-1">Voir rapport <ArrowRight className="w-3 h-3" /></Link>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={topProjetsPointage} layout="vertical" barSize={14}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={100} />
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} formatter={v => [`${v}h`, "Heures"]} />
                <Bar dataKey="heures" fill="hsl(271,81%,56%)" radius={[0,4,4,0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Recent Activity */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold text-foreground">Recent Activity</CardTitle>
          <Link to={createPageUrl("Tasks")} className="text-xs text-primary hover:underline flex items-center gap-1">
            View all <ArrowRight className="w-3 h-3" />
          </Link>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentTasks.length === 0 && <p className="text-sm text-muted-foreground py-4 text-center">No recent activity</p>}
            {recentTasks.map(task => (
              <div key={task.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <CheckSquare className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{task.name}</p>
                    <p className="text-xs text-muted-foreground">{task.project_name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={task.status} />
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {task.created_date ? format(new Date(task.created_date), "MMM d") : ""}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}