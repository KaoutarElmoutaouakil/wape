import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import StatusBadge from "@/components/shared/StatusBadge";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowLeft, MapPin, Calendar, DollarSign, Users, CheckSquare, FileText } from "lucide-react";
import { format } from "date-fns";

export default function ProjectDetails() {
  const params = new URLSearchParams(window.location.search);
  const projectId = params.get("id");

  const { data: project } = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => base44.entities.Project.list().then(all => all.find(p => p.id === projectId)),
    enabled: !!projectId,
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["project-tasks", projectId],
    queryFn: () => base44.entities.Task.filter({ project_id: projectId }),
    enabled: !!projectId,
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ["project-expenses", projectId],
    queryFn: () => base44.entities.Expense.filter({ project_id: projectId }),
    enabled: !!projectId,
  });

  const { data: plans = [] } = useQuery({
    queryKey: ["project-plans", projectId],
    queryFn: () => base44.entities.Plan.filter({ project_id: projectId }),
    enabled: !!projectId,
  });

  const { data: docs = [] } = useQuery({
    queryKey: ["project-docs", projectId],
    queryFn: () => base44.entities.Document.filter({ project_id: projectId }),
    enabled: !!projectId,
  });

  if (!project) return <div className="text-center py-12 text-muted-foreground">Loading...</div>;

  const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0);
  const remaining = (project.estimated_budget || 0) - totalExpenses;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to={createPageUrl("Projects")}>
          <Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <div>
          <h2 className="text-xl font-bold text-foreground">{project.name}</h2>
          <p className="text-sm text-muted-foreground">{project.client}</p>
        </div>
        <StatusBadge status={project.status} className="ml-auto" />
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10"><MapPin className="w-4 h-4 text-primary" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Location</p>
              <p className="text-sm font-medium">{project.location || "—"}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-success/10"><Calendar className="w-4 h-4 text-success" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Duration</p>
              <p className="text-sm font-medium">
                {project.start_date ? format(new Date(project.start_date), "MMM d") : "—"} → {project.end_date ? format(new Date(project.end_date), "MMM d, yyyy") : "—"}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-warning/10"><DollarSign className="w-4 h-4 text-warning" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Budget</p>
              <p className="text-sm font-medium">€{(project.estimated_budget || 0).toLocaleString()}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3 w-full">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Progress</p>
              <div className="flex items-center gap-2">
                <Progress value={project.progress || 0} className="h-2 flex-1 min-w-[100px]" />
                <span className="text-sm font-bold">{project.progress || 0}%</span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Financial Overview */}
      <Card>
        <CardHeader><CardTitle className="text-sm font-semibold">Financial Overview</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-primary/5">
              <p className="text-xs text-muted-foreground">Estimated Budget</p>
              <p className="text-xl font-bold text-primary">€{(project.estimated_budget || 0).toLocaleString()}</p>
            </div>
            <div className="p-4 rounded-lg bg-warning/5">
              <p className="text-xs text-muted-foreground">Actual Cost</p>
              <p className="text-xl font-bold text-warning">€{totalExpenses.toLocaleString()}</p>
            </div>
            <div className={`p-4 rounded-lg ${remaining >= 0 ? "bg-success/5" : "bg-destructive/5"}`}>
              <p className="text-xs text-muted-foreground">Remaining</p>
              <p className={`text-xl font-bold ${remaining >= 0 ? "text-success" : "text-destructive"}`}>€{remaining.toLocaleString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tasks */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold">Tasks ({tasks.length})</CardTitle>
          <Link to={createPageUrl("Tasks") + `?project=${projectId}`}>
            <Button variant="outline" size="sm" className="text-xs">View All</Button>
          </Link>
        </CardHeader>
        <CardContent>
          {tasks.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No tasks yet</p>
          ) : (
            <div className="space-y-2">
              {tasks.slice(0, 5).map(t => (
                <div key={t.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <div className="flex items-center gap-3">
                    <CheckSquare className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{t.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={t.priority} />
                    <StatusBadge status={t.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Plans & Documents */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-sm font-semibold">Plans ({plans.length})</CardTitle></CardHeader>
          <CardContent>
            {plans.length === 0 ? <p className="text-sm text-muted-foreground text-center py-4">No plans</p> : (
              <div className="space-y-2">
                {plans.map(p => (
                  <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <span className="text-sm">{p.name} <span className="text-xs text-muted-foreground">v{p.version}</span></span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm font-semibold">Documents ({docs.length})</CardTitle></CardHeader>
          <CardContent>
            {docs.length === 0 ? <p className="text-sm text-muted-foreground text-center py-4">No documents</p> : (
              <div className="space-y-2">
                {docs.map(d => (
                  <div key={d.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">{d.name}</span>
                    </div>
                    <StatusBadge status={d.type} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}