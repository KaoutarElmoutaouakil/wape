import React from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function KPICard({ title, value, icon: Icon, trend, trendLabel, color = "primary" }) {
  const colorMap = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success/10 text-success",
    warning: "bg-warning/10 text-warning",
    destructive: "bg-destructive/10 text-destructive",
    info: "bg-info/10 text-info",
  };

  return (
    <Card className="p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold text-foreground">{value}</p>
          {trendLabel && (
            <p className={cn("text-xs font-medium", trend > 0 ? "text-success" : trend < 0 ? "text-destructive" : "text-muted-foreground")}>
              {trend > 0 ? "↑" : trend < 0 ? "↓" : "→"} {trendLabel}
            </p>
          )}
        </div>
        <div className={cn("p-3 rounded-xl", colorMap[color])}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </Card>
  );
}