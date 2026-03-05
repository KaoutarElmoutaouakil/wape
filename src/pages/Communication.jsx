import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Send, MessageSquare } from "lucide-react";
import { format } from "date-fns";

export default function Communication() {
  const [message, setMessage] = useState("");
  const [projectFilter, setProjectFilter] = useState("all");
  const [selectedProject, setSelectedProject] = useState("");
  const queryClient = useQueryClient();

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["communications"],
    queryFn: () => base44.entities.Communication.list("-created_date"),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: () => base44.entities.Project.list(),
  });

  const sendMutation = useMutation({
    mutationFn: async (text) => {
      const user = await base44.auth.me();
      const proj = projects.find(p => p.id === selectedProject);
      return base44.entities.Communication.create({
        message: text,
        author: user.full_name || user.email,
        author_email: user.email,
        type: "message",
        project_id: selectedProject || undefined,
        project_name: proj?.name || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["communications"] });
      setMessage("");
    },
  });

  const filtered = messages.filter(m =>
    projectFilter === "all" || m.project_id === projectFilter
  );

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">Communication</h2>
          <p className="text-sm text-muted-foreground">{messages.length} messages</p>
        </div>
        <Select value={projectFilter} onValueChange={setProjectFilter}>
          <SelectTrigger className="w-40 bg-card"><SelectValue placeholder="All Projects" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Projects</SelectItem>
            {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Message list */}
      <div className="space-y-3">
        {isLoading && <p className="text-center text-muted-foreground py-8">Loading...</p>}
        {!isLoading && filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground flex flex-col items-center gap-3">
            <MessageSquare className="w-10 h-10 opacity-30" />
            <p>No messages yet. Start the conversation!</p>
          </div>
        )}
        {filtered.map(msg => (
          <Card key={msg.id} className="bg-card/60">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                    {(msg.author || "?")[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{msg.author}</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(msg.created_date), "MMM d, HH:mm")}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {msg.project_name && (
                    <Badge variant="outline" className="text-xs">{msg.project_name}</Badge>
                  )}
                </div>
              </div>
              <p className="text-sm text-foreground ml-10">{msg.message}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Send message */}
      <Card className="sticky bottom-0">
        <CardContent className="p-4 space-y-3">
          <Select value={selectedProject} onValueChange={setSelectedProject}>
            <SelectTrigger className="bg-muted/30"><SelectValue placeholder="Link to project (optional)" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={null}>No project</SelectItem>
              {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message..."
              className="min-h-[60px] resize-none"
              onKeyDown={(e) => { if (e.key === "Enter" && e.ctrlKey && message) sendMutation.mutate(message); }}
            />
            <Button
              className="shrink-0 self-end"
              onClick={() => message && sendMutation.mutate(message)}
              disabled={!message || sendMutation.isPending}
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">Ctrl+Enter to send</p>
        </CardContent>
      </Card>
    </div>
  );
}