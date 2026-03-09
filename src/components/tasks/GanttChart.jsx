import React, { useMemo, useState } from "react";
import { format, differenceInDays, addDays, parseISO } from "date-fns";
import StatusBadge from "@/components/shared/StatusBadge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { X } from "lucide-react";

const STATUS_COLORS = {
  todo: "bg-muted-foreground/40",
  in_progress: "bg-warning",
  review: "bg-info",
  completed: "bg-success",
  blocked: "bg-destructive",
};

export default function GanttChart({ tasks, personnel = [], tools = [], articles = [] }) {
  const [filterDateStart, setFilterDateStart] = useState("");
  const [filterDateEnd, setFilterDateEnd] = useState("");
  const [filterPersonnel, setFilterPersonnel] = useState("all");
  const [filterTool, setFilterTool] = useState("all");
  const [filterArticle, setFilterArticle] = useState("all");

  const validTasks = tasks.filter(t => t.start_date && t.end_date);

  // Apply filters
  const filteredTasks = useMemo(() => {
    return validTasks.filter(t => {
      if (filterDateStart && t.end_date < filterDateStart) return false;
      if (filterDateEnd && t.start_date > filterDateEnd) return false;
      if (filterPersonnel !== "all" && !(t.assigned_personnel || []).some(p => p.id === filterPersonnel)) return false;
      if (filterTool !== "all" && !(t.assigned_tools || []).some(x => x.id === filterTool)) return false;
      if (filterArticle !== "all" && !(t.assigned_articles || []).some(x => x.id === filterArticle)) return false;
      return true;
    });
  }, [validTasks, filterDateStart, filterDateEnd, filterPersonnel, filterTool, filterArticle]);

  const { minDate, days } = useMemo(() => {
    if (!filteredTasks.length) return { minDate: new Date(), days: 30 };
    const starts = filteredTasks.map(t => parseISO(t.start_date));
    const ends = filteredTasks.map(t => parseISO(t.end_date));
    const min = new Date(Math.min(...starts));
    const max = new Date(Math.max(...ends));
    const totalDays = Math.max(differenceInDays(max, min) + 7, 30);
    return { minDate: min, days: totalDays };
  }, [filteredTasks]);

  const headerDates = useMemo(() => {
    const result = [];
    for (let i = 0; i < days; i += 7) result.push(addDays(minDate, i));
    return result;
  }, [minDate, days]);

  const hasFilters = filterDateStart || filterDateEnd || filterPersonnel !== "all" || filterTool !== "all" || filterArticle !== "all";

  const clearFilters = () => {
    setFilterDateStart("");
    setFilterDateEnd("");
    setFilterPersonnel("all");
    setFilterTool("all");
    setFilterArticle("all");
  };

  const getBar = (task) => {
    const start = parseISO(task.start_date);
    const end = parseISO(task.end_date);
    const left = (differenceInDays(start, minDate) / days) * 100;
    const width = Math.max((differenceInDays(end, start) + 1) / days * 100, 0.5);
    return { left: `${left}%`, width: `${width}%` };
  };

  return (
    <div className="space-y-3">
      {/* Filters */}
      <div className="p-3 rounded-lg bg-muted/30 border border-border space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-muted-foreground uppercase">Filters</span>
          {hasFilters && (
            <button className="text-xs text-primary flex items-center gap-1 hover:underline" onClick={clearFilters}>
              <X className="w-3 h-3" /> Clear all
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          <div>
            <Label className="text-xs mb-1 block">Start From</Label>
            <Input type="date" className="h-7 text-xs" value={filterDateStart} onChange={e => setFilterDateStart(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs mb-1 block">Start To</Label>
            <Input type="date" className="h-7 text-xs" value={filterDateEnd} onChange={e => setFilterDateEnd(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs mb-1 block">Personnel</Label>
            <Select value={filterPersonnel} onValueChange={setFilterPersonnel}>
              <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="All" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Personnel</SelectItem>
                {personnel.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs mb-1 block">Tool</Label>
            <Select value={filterTool} onValueChange={setFilterTool}>
              <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="All" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tools</SelectItem>
                {tools.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs mb-1 block">Article</Label>
            <Select value={filterArticle} onValueChange={setFilterArticle}>
              <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="All" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Articles</SelectItem>
                {articles.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {filteredTasks.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-sm">
          {validTasks.length === 0 ? "No tasks with dates. Set start and end dates on tasks to see Gantt chart." : "No tasks match the current filters."}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div style={{ minWidth: 900 }}>
            {/* Header row */}
            <div className="flex border-b border-border">
              <div className="w-56 shrink-0 px-3 py-2 text-xs font-semibold text-muted-foreground uppercase border-r border-border">Task</div>
              <div className="flex-1 relative h-8">
                {headerDates.map((d, i) => (
                  <div key={i} className="absolute top-0 text-xs text-muted-foreground py-2"
                    style={{ left: `${(differenceInDays(d, minDate) / days) * 100}%` }}>
                    {format(d, "MMM d")}
                  </div>
                ))}
              </div>
            </div>

            {/* Task rows */}
            {filteredTasks.map(task => {
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
                    <div className="absolute top-0 bottom-0 w-px bg-primary/40 z-10"
                      style={{ left: `${(differenceInDays(new Date(), minDate) / days) * 100}%` }} />
                    <div
                      className={`absolute h-6 rounded-full opacity-90 ${STATUS_COLORS[task.status] || "bg-muted-foreground/40"}`}
                      style={{ left: bar.left, width: bar.width }}
                      title={`${task.name}: ${task.start_date} → ${task.end_date}`}
                    >
                      <div className="h-full rounded-full bg-white/25" style={{ width: `${progress}%` }} />
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
              {hasFilters && <span className="ml-auto text-primary font-medium">{filteredTasks.length} of {validTasks.length} tasks shown</span>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}