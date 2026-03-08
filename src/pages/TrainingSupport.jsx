import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import StatusBadge from "@/components/shared/StatusBadge";
import FormDialog from "@/components/shared/FormDialog";
import { format } from "date-fns";
import {
  BookOpen, Video, FileText, HelpCircle, Plus, Upload,
  CheckCircle2, Clock, AlertCircle, LifeBuoy, GraduationCap,
  FolderKanban, Package, DollarSign
} from "lucide-react";

const TUTORIALS = [
  {
    icon: FolderKanban, title: "Getting Started with Projects",
    description: "Learn how to create and manage construction projects, assign teams, and track progress.",
    category: "Projects", duration: "5 min"
  },
  {
    icon: CheckCircle2, title: "Task Management & Kanban",
    description: "Use tasks, assign resources, set deadlines, and visualize work with Kanban and Gantt views.",
    category: "Tasks", duration: "7 min"
  },
  {
    icon: Package, title: "Stock & Inventory Management",
    description: "Track articles, create purchase orders, manage receptions, and monitor stock movements.",
    category: "Stock", duration: "8 min"
  },
  {
    icon: AlertCircle, title: "Non Conformities Workflow",
    description: "Report, assign, and resolve non-conformities. Annotate plans and link photos.",
    category: "Quality", duration: "6 min"
  },
  {
    icon: DollarSign, title: "Finance & Invoicing",
    description: "Track expenses, create invoices, and monitor project budgets.",
    category: "Finance", duration: "6 min"
  },
  {
    icon: FileText, title: "Document Centralization",
    description: "All files uploaded anywhere in the platform are automatically indexed here.",
    category: "Documents", duration: "4 min"
  },
];

export default function TrainingSupport() {
  const [tab, setTab] = useState("tutorials");
  const [showTicketForm, setShowTicketForm] = useState(false);
  const [ticketForm, setTicketForm] = useState({ status: "open" });
  const [uploading, setUploading] = useState(false);
  const queryClient = useQueryClient();

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ["support-tickets"],
    queryFn: () => base44.entities.SupportTicket.list("-created_date"),
  });

  const { data: user } = useQuery({
    queryKey: ["me"],
    queryFn: () => base44.auth.me(),
  });

  const createTicketMutation = useMutation({
    mutationFn: (data) => base44.entities.SupportTicket.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["support-tickets"] });
      setShowTicketForm(false);
      setTicketForm({ status: "open" });
    },
  });

  const uploadAttachment = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setTicketForm(f => ({ ...f, attachment_url: file_url }));
    setUploading(false);
  };

  const openTickets = tickets.filter(t => t.status === "open").length;
  const resolvedTickets = tickets.filter(t => t.status === "resolved").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Training & Support</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Tutorials, guides and technical support</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={tab === "tutorials" ? "default" : "outline"}
            size="sm"
            className="gap-2"
            onClick={() => setTab("tutorials")}
          >
            <GraduationCap className="w-4 h-4" /> Tutorials
          </Button>
          <Button
            variant={tab === "support" ? "default" : "outline"}
            size="sm"
            className="gap-2"
            onClick={() => setTab("support")}
          >
            <LifeBuoy className="w-4 h-4" /> Support
          </Button>
        </div>
      </div>

      {/* Tutorials Tab */}
      {tab === "tutorials" && (
        <div className="space-y-6">
          {/* Quick stats */}
          <div className="grid grid-cols-3 gap-4">
            <Card className="bg-primary/5 border-primary/10">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{TUTORIALS.length}</p>
                  <p className="text-xs text-muted-foreground">Guides available</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                  <Video className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold">6</p>
                  <p className="text-xs text-muted-foreground">Video tutorials</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                  <FileText className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold">12</p>
                  <p className="text-xs text-muted-foreground">Documentation pages</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tutorial cards */}
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Onboarding Guides</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {TUTORIALS.map((tut, i) => (
                <Card key={i} className="hover:shadow-md transition-shadow cursor-pointer group">
                  <CardHeader className="pb-2">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <tut.icon className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-sm font-semibold leading-tight">{tut.title}</CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">{tut.category}</Badge>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />{tut.duration}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-xs text-muted-foreground leading-relaxed">{tut.description}</p>
                    <Button variant="ghost" size="sm" className="mt-2 h-7 text-xs w-full group-hover:bg-primary/5">
                      <Video className="w-3 h-3 mr-1" /> Watch Tutorial
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Documentation section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2"><FileText className="w-4 h-4" /> Platform Documentation</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {["User Manual", "Admin Guide", "API Reference", "Integrations Guide", "Reporting Guide", "Mobile App Guide", "Data Export", "Troubleshooting"].map(doc => (
                  <Button key={doc} variant="outline" size="sm" className="h-8 text-xs justify-start gap-2">
                    <FileText className="w-3 h-3" />{doc}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Support Tab */}
      {tab === "support" && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <AlertCircle className="w-8 h-8 text-amber-500" />
                <div><p className="text-2xl font-bold">{openTickets}</p><p className="text-xs text-muted-foreground">Open tickets</p></div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <Clock className="w-8 h-8 text-blue-500" />
                <div><p className="text-2xl font-bold">{tickets.filter(t => t.status === "in_progress").length}</p><p className="text-xs text-muted-foreground">In progress</p></div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <CheckCircle2 className="w-8 h-8 text-green-500" />
                <div><p className="text-2xl font-bold">{resolvedTickets}</p><p className="text-xs text-muted-foreground">Resolved</p></div>
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-between items-center">
            <h2 className="font-semibold">Support Tickets</h2>
            <Button size="sm" className="gap-2" onClick={() => setShowTicketForm(true)}>
              <Plus className="w-4 h-4" /> New Ticket
            </Button>
          </div>

          <div className="space-y-2">
            {tickets.length === 0 && (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  <HelpCircle className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p>No support tickets yet. Create one if you need help.</p>
                </CardContent>
              </Card>
            )}
            {tickets.map(ticket => (
              <Card key={ticket.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-muted-foreground font-mono">#{ticket.id?.slice(-6)}</span>
                        <StatusBadge status={ticket.status} />
                      </div>
                      <p className="font-medium text-sm">{ticket.subject}</p>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{ticket.message}</p>
                    </div>
                    <div className="text-right text-xs text-muted-foreground shrink-0">
                      <p>{ticket.user_name || ticket.created_by}</p>
                      <p>{ticket.created_date ? format(new Date(ticket.created_date), "MMM d, yyyy") : ""}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* New Ticket Form */}
      <FormDialog open={showTicketForm} onOpenChange={setShowTicketForm} title="New Support Ticket">
        <div className="space-y-4">
          <div>
            <Label>Subject *</Label>
            <Input value={ticketForm.subject || ""} onChange={(e) => setTicketForm({ ...ticketForm, subject: e.target.value })} placeholder="Briefly describe your issue" />
          </div>
          <div>
            <Label>Message *</Label>
            <Textarea
              value={ticketForm.message || ""}
              onChange={(e) => setTicketForm({ ...ticketForm, message: e.target.value })}
              placeholder="Describe your issue in detail..."
              className="min-h-[100px]"
            />
          </div>
          <div>
            <Label>Attachment (optional)</Label>
            <label className="flex items-center gap-2 cursor-pointer px-3 py-2 rounded-md border border-dashed border-border hover:bg-muted/30 text-sm text-muted-foreground w-fit">
              <Upload className="w-4 h-4" /> {uploading ? "Uploading..." : ticketForm.attachment_url ? "File attached ✓" : "Upload file"}
              <input type="file" className="hidden" onChange={uploadAttachment} />
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowTicketForm(false)}>Cancel</Button>
            <Button
              onClick={() => createTicketMutation.mutate({
                ...ticketForm,
                user_name: user?.full_name || user?.email,
                user_email: user?.email,
              })}
              disabled={createTicketMutation.isPending || !ticketForm.subject || !ticketForm.message}
            >
              {createTicketMutation.isPending ? "Submitting..." : "Submit Ticket"}
            </Button>
          </div>
        </div>
      </FormDialog>
    </div>
  );
}