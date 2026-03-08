import React from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Calendar, User } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const COLUMNS = [
  { id: "open", label: "Reported", color: "border-t-gray-400", bg: "bg-gray-50" },
  { id: "in_review", label: "In Review", color: "border-t-blue-400", bg: "bg-blue-50/50" },
  { id: "in_progress", label: "In Progress", color: "border-t-amber-400", bg: "bg-amber-50/50" },
  { id: "resolved", label: "Resolved", color: "border-t-green-400", bg: "bg-green-50/50" },
  { id: "closed", label: "Closed", color: "border-t-slate-400", bg: "bg-slate-50/50" },
];

const SEVERITY_COLORS = {
  low: "bg-emerald-100 text-emerald-700",
  medium: "bg-amber-100 text-amber-700",
  high: "bg-orange-100 text-orange-700",
  critical: "bg-red-100 text-red-700",
};

export default function NCKanbanBoard({ ncs, onStatusChange, onEdit }) {
  const onDragEnd = (result) => {
    if (!result.destination) return;
    const { draggableId, destination } = result;
    const newStatus = destination.droppableId;
    const nc = ncs.find(n => n.id === draggableId);
    if (nc && nc.status !== newStatus) {
      onStatusChange(draggableId, newStatus);
    }
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {COLUMNS.map(col => {
          const colNCs = ncs.filter(n => n.status === col.id);
          return (
            <div key={col.id} className="flex-shrink-0 w-64">
              <div className={cn("rounded-lg border border-border border-t-4 overflow-hidden", col.color)}>
                <div className={cn("px-3 py-2.5 flex items-center justify-between", col.bg)}>
                  <span className="text-sm font-semibold">{col.label}</span>
                  <Badge variant="secondary" className="text-xs h-5 px-1.5">{colNCs.length}</Badge>
                </div>
                <Droppable droppableId={col.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={cn(
                        "min-h-[200px] p-2 space-y-2 transition-colors",
                        snapshot.isDraggingOver ? "bg-primary/5" : "bg-background"
                      )}
                    >
                      {colNCs.map((nc, index) => (
                        <Draggable key={nc.id} draggableId={nc.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={cn(
                                "bg-card rounded-lg border border-border p-3 shadow-sm cursor-grab active:cursor-grabbing transition-shadow",
                                snapshot.isDragging && "shadow-lg ring-2 ring-primary/20"
                              )}
                            >
                              {/* Title */}
                              <div className="flex items-start gap-1.5 mb-2">
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                                <p className="text-xs font-semibold leading-tight line-clamp-2">{nc.title}</p>
                              </div>

                              {/* Severity */}
                              <div className="flex items-center gap-1.5 flex-wrap mb-2">
                                <span className={cn("text-xs px-1.5 py-0.5 rounded-md font-medium", SEVERITY_COLORS[nc.severity] || SEVERITY_COLORS.medium)}>
                                  {nc.severity}
                                </span>
                                {nc.project_name && (
                                  <span className="text-xs text-muted-foreground truncate max-w-[100px]">{nc.project_name}</span>
                                )}
                              </div>

                              {/* Personnel */}
                              {(nc.assigned_personnel || []).length > 0 && (
                                <div className="flex items-center gap-1 mb-1.5">
                                  <User className="w-3 h-3 text-muted-foreground" />
                                  <span className="text-xs text-muted-foreground truncate">
                                    {nc.assigned_personnel.map(p => p.name).join(", ")}
                                  </span>
                                </div>
                              )}

                              {/* Deadline */}
                              {nc.deadline && (
                                <div className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3 text-muted-foreground" />
                                  <span className="text-xs text-muted-foreground">
                                    {format(new Date(nc.deadline), "MMM d")}
                                  </span>
                                </div>
                              )}

                              {/* Edit button */}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="w-full h-6 text-xs mt-2 text-muted-foreground hover:text-foreground"
                                onClick={() => onEdit(nc)}
                              >
                                Edit
                              </Button>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
}