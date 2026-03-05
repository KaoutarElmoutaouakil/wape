import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import StatusBadge from "@/components/shared/StatusBadge";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowLeft, Users, Package, Wrench, Receipt, MessageSquare, Send } from "lucide-react";
import { format } from "date-fns";

export default function TaskDetails() {
  const params = new URLSearchParams(window.location.search);
  const taskId = params.get("id");
  const [comment, setComment] = useState("");
  const queryClient = useQueryClient();

  const { data: task } = useQuery({
    queryKey: ["task", taskId],
    queryFn: () => base44.entities.Task.list().then(all => all.find(t => t.id === taskId)),
    enabled: !!taskId,
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ["task-expenses", taskId],
    queryFn: () => base44.entities.Expense.filter({ task_id: taskId }),
    enabled: !!taskId,
  });

  const commentMutation = useMutation({
    mutationFn: async (text) => {
      const user = await base44.auth.me();
      const comments = [...(task.comments || []), { author: user.full_name || user.email, text, date: new Date().toISOString() }];
      return base44.entities.Task.update(taskId, { comments });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task", taskId] });
      setComment("");
    },
  });

  if (!task) return <div className="text-center py-12 text-muted-foreground">Loading...</div>;

  const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to={createPageUrl("Tasks")}>
          <Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-foreground">{task.name}</h2>
          <p className="text-sm text-muted-foreground">{task.project_name}</p>
        </div>
        <StatusBadge status={task.priority} />
        <StatusBadge status={task.status} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <Card>
            <CardHeader><CardTitle className="text-sm font-semibold">Details</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted-foreground">Zone:</span> <span className="font-medium ml-2">{task.zone || "—"}</span></div>
                <div><span className="text-muted-foreground">Start:</span> <span className="font-medium ml-2">{task.start_date ? format(new Date(task.start_date), "MMM d, yyyy") : "—"}</span></div>
                <div><span className="text-muted-foreground">End:</span> <span className="font-medium ml-2">{task.end_date ? format(new Date(task.end_date), "MMM d, yyyy") : "—"}</span></div>
              </div>
              {task.description && <p className="mt-4 text-sm text-muted-foreground">{task.description}</p>}
            </CardContent>
          </Card>

          {/* Expenses */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Receipt className="w-4 h-4" /> Expenses ({expenses.length})
              </CardTitle>
              <span className="text-sm font-bold text-warning">€{totalExpenses.toLocaleString()}</span>
            </CardHeader>
            <CardContent>
              {expenses.length === 0 ? <p className="text-sm text-muted-foreground text-center py-4">No expenses</p> : (
                <div className="space-y-2">
                  {expenses.map(e => (
                    <div key={e.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                      <div>
                        <p className="text-sm font-medium">{e.name}</p>
                        <p className="text-xs text-muted-foreground">{e.category} • {e.date ? format(new Date(e.date), "MMM d") : ""}</p>
                      </div>
                      <span className="text-sm font-bold">€{(e.amount || 0).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Comments */}
          <Card>
            <CardHeader><CardTitle className="text-sm font-semibold flex items-center gap-2"><MessageSquare className="w-4 h-4" /> Comments</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3 mb-4">
                {(task.comments || []).length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No comments yet</p>}
                {(task.comments || []).map((c, i) => (
                  <div key={i} className="p-3 rounded-lg bg-muted/30">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{c.author}</span>
                      <span className="text-xs text-muted-foreground">{c.date ? format(new Date(c.date), "MMM d, HH:mm") : ""}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{c.text}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Add a comment..." className="min-h-[60px]" />
                <Button size="icon" className="shrink-0 self-end" onClick={() => comment && commentMutation.mutate(comment)} disabled={!comment}>
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-sm font-semibold flex items-center gap-2"><Users className="w-4 h-4" /> Personnel</CardTitle></CardHeader>
            <CardContent>
              {(task.assigned_personnel || []).length === 0 ? <p className="text-sm text-muted-foreground">None assigned</p> : (
                <div className="space-y-2">
                  {task.assigned_personnel.map(p => (
                    <div key={p.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                        {p.name?.[0]}
                      </div>
                      <span className="text-sm">{p.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm font-semibold flex items-center gap-2"><Package className="w-4 h-4" /> Articles</CardTitle></CardHeader>
            <CardContent>
              {(task.assigned_articles || []).length === 0 ? <p className="text-sm text-muted-foreground">None assigned</p> : (
                <div className="space-y-2">
                  {task.assigned_articles.map(a => (
                    <div key={a.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                      <span className="text-sm">{a.name}</span>
                      <span className="text-xs text-muted-foreground">qty: {a.quantity}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm font-semibold flex items-center gap-2"><Wrench className="w-4 h-4" /> Tools</CardTitle></CardHeader>
            <CardContent>
              {(task.assigned_tools || []).length === 0 ? <p className="text-sm text-muted-foreground">None assigned</p> : (
                <div className="space-y-2">
                  {task.assigned_tools.map(t => (
                    <div key={t.id} className="p-2 rounded-lg bg-muted/30 text-sm">{t.name}</div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}