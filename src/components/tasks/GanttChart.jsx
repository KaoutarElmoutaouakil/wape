import React, { useMemo } from "react";
import { format, differenceInDays, startOfDay, addDays, isWithinInterval, parseISO } from "date-fns";
import StatusBadge from "@/components/shared/StatusBadge";

const STATUS_COLORS = {
  todo: "bg-muted-foreground/40",
  in_progress: "bg-warning",
  review: "bg-info",
  completed: "bg-success",
  blocked: "bg-destructive",
};

export default function GanttChart({ tasks }) {
  const validTasks = tasks.filter(t => t.start_date && t.end_date);

  const { minDate, maxDate, days } = useMemo(() => {
    if (!validTasks.length) return { minDate: new Date(), maxDate: addDays(new Date(), 30), days: 30 };
    const starts = validTasks.map(t => parseISO(t.start_date));
    const ends = validTasks.map(t => parseISO(t.end_date));
    const min = new Date(Math.min(...starts));
    const max = new Date(Math.max(...ends));
    const totalDays = Math.max(differenceInDays(max, min) + 7, 30);
    return { minDate: min, maxDate: addDays(min, totalDays), days: totalDays };
  }, [validTasks]);

  const headerDates = useMemo(() => {
    const result = [];
    for (let i = 0; i < days; i += 7) {
      result.push(addDays(minDate, i));
    }
    return result;
  }, [minDate, days]);

  if (!validTasks.length) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        No tasks with dates. Set start and end dates on tasks to see Gantt chart.
      </div>
    );
  }

  const getBar = (task) => {
    const start = parseISO(task.start_date);
    const end = parseISO(task.end_date);
    const left = (differenceInDays(start, minDate) / days) * 100;
    const width = Math.max((differenceInDays(end, start) + 1) / days * 100, 0.5);
    return { left: `${left}%`, width: `${width}%` };
  };

  return (
    <div className="overflow-x-auto">
      <div style={{ minWidth: 900 }}>
        {/* Header row */}
        <div className="flex border-b border-border">
          <div className="w-56 shrink-0 px-3 py-2 text-xs font-semibold text-muted-foreground uppercase border-r border-border">Task</div>
          <div className="flex-1 relative h-8">
            {headerDates.map((d, i) => (
              <div
                key={i}
                className="absolute top-0 text-xs text-muted-foreground py-2"
                style={{ left: `${(differenceInDays(d, minDate) / days) * 100}%` }}
              >
                {format(d, "MMM d")}
              </div>
            ))}
          </div>
        </div>

        {/* Task rows */}
        {validTasks.map(task => {
          const bar = getBar(task);
          const progress = task.status === "completed" ? 100 : task.status === "in_progress" ? 50 : task.status === "review" ? 80 : 0;
          return (
            <div key={task.id} className="flex border-b border-border/50 hover:bg-muted/20 transition-colors">
              <div className="w-56 shrink-0 px-3 py-2 border-r border-border flex items-center gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-medium truncate">{task.name}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{task.project_name}</p>
                </div>
              </div>
              <div className="flex-1 relative h-10 py-1.5">
                {/* Today line */}
                <div
                  className="absolute top-0 bottom-0 w-px bg-primary/40 z-10"
                  style={{ left: `${(differenceInDays(new Date(), minDate) / days) * 100}%` }}
                />
                {/* Bar */}
                <div
                  className={`absolute h-6 rounded-full opacity-90 ${STATUS_COLORS[task.status] || "bg-muted-foreground/40"}`}
                  style={{ left: bar.left, width: bar.width }}
                  title={`${task.name}: ${task.start_date} → ${task.end_date}`}
                >
                  {/* Progress fill */}
                  <div
                    className="h-full rounded-full bg-white/25"
                    style={{ width: `${progress}%` }}
                  />
                  <span className="absolute inset-0 flex items-center px-2 text-[10px] font-medium text-white truncate">{task.name}</span>
                </div>
              </div>
            </div>
          );
        })}

        {/* Legend */}
        <div className="flex items-center gap-4 px-3 py-2 text-xs text-muted-foreground flex-wrap">
          {Object.entries(STATUS_COLORS).map(([s, c]) => (
            <div key={s} className="flex items-center gap-1.5">
              <div className={`w-3 h-3 rounded-full ${c}`} />
              <span className="capitalize">{s.replace("_", " ")}</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5 ml-2">
            <div className="w-px h-4 bg-primary/40" />
            <span>Today</span>
          </div>
        </div>
      </div>
    </div>
  );
}