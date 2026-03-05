import React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const statusStyles = {
  // Project statuses
  planning: "bg-info/10 text-info border-info/20",
  in_progress: "bg-warning/10 text-warning border-warning/20",
  on_hold: "bg-muted text-muted-foreground border-border",
  completed: "bg-success/10 text-success border-success/20",
  cancelled: "bg-destructive/10 text-destructive border-destructive/20",
  // Task statuses
  todo: "bg-muted text-muted-foreground border-border",
  review: "bg-info/10 text-info border-info/20",
  blocked: "bg-destructive/10 text-destructive border-destructive/20",
  // Personnel
  active: "bg-success/10 text-success border-success/20",
  on_leave: "bg-warning/10 text-warning border-warning/20",
  inactive: "bg-muted text-muted-foreground border-border",
  // Tools
  available: "bg-success/10 text-success border-success/20",
  in_use: "bg-warning/10 text-warning border-warning/20",
  maintenance: "bg-info/10 text-info border-info/20",
  retired: "bg-muted text-muted-foreground border-border",
  // NC
  open: "bg-destructive/10 text-destructive border-destructive/20",
  resolved: "bg-success/10 text-success border-success/20",
  closed: "bg-muted text-muted-foreground border-border",
  // Priority
  low: "bg-success/10 text-success border-success/20",
  medium: "bg-warning/10 text-warning border-warning/20",
  high: "bg-destructive/10 text-destructive border-destructive/20",
  urgent: "bg-destructive/15 text-destructive border-destructive/30",
  critical: "bg-destructive/15 text-destructive border-destructive/30",
};

export default function StatusBadge({ status, className }) {
  const label = (status || "unknown").replace(/_/g, " ");
  return (
    <Badge variant="outline" className={cn("capitalize text-xs font-medium border", statusStyles[status] || "bg-muted text-muted-foreground", className)}>
      {label}
    </Badge>
  );
}