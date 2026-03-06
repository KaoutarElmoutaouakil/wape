import React, { useState } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Edit } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import StatusBadge from "@/components/shared/StatusBadge";

const COLUMNS = [
  { id: "todo", label: "To Do", color: "border-t-slate-400" },
  { id: "in_progress", label: "In Progress", color: "border-t-blue-500" },
  { id: "review", label: "Review", color: "border-t-yellow-500" },
  { id: "completed", label: "Completed", color: "border-t-green-500" },
  { id: "blocked", label: "Blocked", color: "border-t-red-500" },
];

const PRIORITY_COLORS = {
  low: "bg-slate-100 text-slate-600",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-orange-100 text-orange-700",
  urgent: "bg-red-100 text-red-700",
};

export default function KanbanBoard({ tasks, onStatusChange, onEdit }) {
  const tasksByColumn = COLUMNS.reduce((acc, col) => {
    acc[col.id] = tasks.filter(t => t.status === col.id);
    return acc;
  }, {});

  const handleDragEnd = (result) => {
    const { source, destination, draggableId } = result;
    if (!destination || source.droppableId === destination.droppableId) return;
    onStatusChange(draggableId, destination.droppableId);
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {COLUMNS.map(col => (
          <div key={col.id} className="flex-shrink-0 w-64">
            <div className={`bg-muted/40 rounded-xl border-t-4 ${col.color}`}>
              <div className="px-3 py-3 flex items-center justify-between">
                <h3 className="font-semibold text-sm">{col.label}</h3>
                <Badge variant="secondary" className="text-xs">{tasksByColumn[col.id].length}</Badge>
              </div>
              <Droppable droppableId={col.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`min-h-[200px] px-2 pb-2 space-y-2 transition-colors ${snapshot.isDraggingOver ? "bg-primary/5" : ""}`}
                  >
                    {tasksByColumn[col.id].map((task, index) => (
                      <Draggable key={task.id} draggableId={task.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`bg-card rounded-lg p-3 shadow-sm border text-xs cursor-grab active:cursor-grabbing transition-shadow ${snapshot.isDragging ? "shadow-lg rotate-1" : ""}`}
                          >
                            <p className="font-medium text-foreground mb-1 line-clamp-2">{task.name}</p>
                            {task.project_name && (
                              <p className="text-muted-foreground mb-2 truncate">{task.project_name}</p>
                            )}
                            <div className="flex items-center justify-between">
                              {task.priority && (
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${PRIORITY_COLORS[task.priority]}`}>
                                  {task.priority}
                                </span>
                              )}
                              <div className="flex gap-1 ml-auto">
                                <Link to={createPageUrl("TaskDetails") + `?id=${task.id}`}>
                                  <button className="p-1 hover:bg-muted rounded"><Eye className="w-3 h-3 text-muted-foreground" /></button>
                                </Link>
                                <button className="p-1 hover:bg-muted rounded" onClick={() => onEdit(task)}>
                                  <Edit className="w-3 h-3 text-muted-foreground" />
                                </button>
                              </div>
                            </div>
                            {task.estimated_cost > 0 && (
                              <p className="text-warning font-semibold mt-1">€{task.estimated_cost.toLocaleString()}</p>
                            )}
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
        ))}
      </div>
    </DragDropContext>
  );
}