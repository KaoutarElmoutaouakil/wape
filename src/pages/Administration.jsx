import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Users, ShieldCheck, Mail, UserPlus } from "lucide-react";
import { format } from "date-fns";

export default function Administration() {
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("user");
  const [inviting, setInviting] = useState(false);
  const [inviteMsg, setInviteMsg] = useState("");

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: () => base44.entities.Project.list(),
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks"],
    queryFn: () => base44.entities.Task.list(),
  });

  const { data: personnel = [] } = useQuery({
    queryKey: ["personnel"],
    queryFn: () => base44.entities.Personnel.list(),
  });

  const handleInvite = async () => {
    if (!inviteEmail) return;
    setInviting(true);
    setInviteMsg("");
    await base44.users.inviteUser(inviteEmail, inviteRole);
    setInviteMsg(`Invitation sent to ${inviteEmail}`);
    setInviteEmail("");
    setInviting(false);
  };

  const stats = [
    { label: "Total Users", value: users.length, icon: Users, color: "text-primary" },
    { label: "Projects", value: projects.length, icon: ShieldCheck, color: "text-success" },
    { label: "Tasks", value: tasks.length, icon: Mail, color: "text-warning" },
    { label: "Personnel", value: personnel.length, icon: UserPlus, color: "text-info" },
  ];

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(s => (
          <Card key={s.label} className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-muted ${s.color}`}><s.icon className="w-4 h-4" /></div>
              <div>
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="text-xl font-bold">{s.value}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Invite User */}
        <Card>
          <CardHeader><CardTitle className="text-sm font-semibold flex items-center gap-2"><UserPlus className="w-4 h-4" /> Invite User</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Email Address</Label>
              <Input
                type="email"
                placeholder="user@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>
            <div>
              <Label>Role</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {inviteMsg && <p className="text-sm text-success">{inviteMsg}</p>}
            <Button onClick={handleInvite} disabled={inviting || !inviteEmail} className="w-full">
              {inviting ? "Sending..." : "Send Invitation"}
            </Button>
          </CardContent>
        </Card>

        {/* Users list */}
        <Card>
          <CardHeader><CardTitle className="text-sm font-semibold flex items-center gap-2"><Users className="w-4 h-4" /> App Users ({users.length})</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-sm text-muted-foreground text-center py-4">Loading...</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {users.map(u => (
                  <div key={u.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                        {(u.full_name || u.email || "?")[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{u.full_name || "—"}</p>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className={u.role === "admin" ? "bg-primary/10 text-primary border-primary/20 text-xs" : "text-xs"}>
                      {u.role || "user"}
                    </Badge>
                  </div>
                ))}
                {users.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No users found</p>}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Data summary */}
      <Card>
        <CardHeader><CardTitle className="text-sm font-semibold">Platform Overview</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-center">
            {[
              { label: "Active Projects", value: projects.filter(p => p.status === "in_progress").length },
              { label: "Completed Projects", value: projects.filter(p => p.status === "completed").length },
              { label: "Tasks Completed", value: tasks.filter(t => t.status === "completed").length },
              { label: "Tasks Blocked", value: tasks.filter(t => t.status === "blocked").length },
              { label: "Active Personnel", value: personnel.filter(p => p.status === "active").length },
              { label: "Personnel on Leave", value: personnel.filter(p => p.status === "on_leave").length },
            ].map(item => (
              <div key={item.label} className="p-4 rounded-lg bg-muted/30">
                <p className="text-2xl font-bold text-foreground">{item.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{item.label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}