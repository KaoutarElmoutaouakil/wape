import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { format, getDaysInMonth, startOfMonth, getDay, parseISO } from "date-fns";
import { fr } from "date-fns/locale";

const STATUT_CONFIG = {
  present:      { label: "Présent",      bg: "bg-success",               text: "text-white",          light: "bg-success/15 border-success/30 text-success" },
  absent:       { label: "Absent",       bg: "bg-destructive",           text: "text-white",          light: "bg-destructive/15 border-destructive/30 text-destructive" },
  retard:       { label: "Retard",       bg: "bg-orange-500",            text: "text-white",          light: "bg-orange-500/15 border-orange-400/30 text-orange-600" },
  demi_journee: { label: "Demi-j.",      bg: "bg-yellow-400",            text: "text-yellow-900",     light: "bg-yellow-400/15 border-yellow-400/30 text-yellow-700" },
  aucun:        { label: "—",            bg: "bg-muted",                  text: "text-muted-foreground", light: "bg-muted/30 border-border text-muted-foreground" },
};

const JOURS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

export default function CalendrierPresence({ pointagesByDate, month, year, onMonthChange, onDayClick, operateurNom }) {
  const [selected, setSelected] = useState(null);

  const daysInMonth = getDaysInMonth(new Date(year, month - 1, 1));
  // Day of week for 1st (0=Sun→convert to Mon=0)
  const firstDow = getDay(new Date(year, month - 1, 1)); // 0=Sun
  const offset = firstDow === 0 ? 6 : firstDow - 1; // Monday-based offset

  const days = [];
  for (let i = 0; i < offset; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);

  const getDateStr = (d) => `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

  const handleClick = (d) => {
    if (!d) return;
    const dateStr = getDateStr(d);
    const pointage = pointagesByDate[dateStr];
    setSelected({ day: d, dateStr, pointage });
    if (onDayClick) onDayClick(dateStr, pointage);
  };

  const monthLabel = format(new Date(year, month - 1, 1), "MMMM yyyy", { locale: fr });
  const todayStr = format(new Date(), "yyyy-MM-dd");

  return (
    <div className="space-y-3">
      {/* Nav */}
      <div className="flex items-center justify-between">
        <div>
          <p className="font-semibold text-base capitalize">{monthLabel}</p>
          {operateurNom && <p className="text-xs text-muted-foreground">{operateurNom}</p>}
        </div>
        <div className="flex gap-1">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => onMonthChange(-1)}><ChevronLeft className="w-4 h-4" /></Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => onMonthChange(1)}><ChevronRight className="w-4 h-4" /></Button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2 text-xs">
        {Object.entries(STATUT_CONFIG).filter(([k]) => k !== "aucun").map(([k, v]) => (
          <span key={k} className={`flex items-center gap-1 px-2 py-0.5 rounded-full border ${v.light}`}>
            <span className={`w-2 h-2 rounded-full ${v.bg}`} />{v.label}
          </span>
        ))}
        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full border border-border text-muted-foreground bg-muted/30">
          <span className="w-2 h-2 rounded-full bg-muted-foreground/30" />Aucun pointage
        </span>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 gap-1">
        {JOURS.map(j => (
          <div key={j} className="text-center text-xs font-semibold text-muted-foreground py-1">{j}</div>
        ))}
        {days.map((d, i) => {
          if (!d) return <div key={`empty-${i}`} />;
          const dateStr = getDateStr(d);
          const pointage = pointagesByDate[dateStr];
          const statut = pointage?.statut_presence || "aucun";
          const cfg = STATUT_CONFIG[statut] || STATUT_CONFIG.aucun;
          const isToday = dateStr === todayStr;
          const isSelected = selected?.day === d;

          return (
            <button
              key={d}
              onClick={() => handleClick(d)}
              className={`
                relative flex flex-col items-center justify-start p-1.5 rounded-lg border text-left transition-all hover:scale-105 min-h-[64px]
                ${cfg.light}
                ${isToday ? "ring-2 ring-primary ring-offset-1" : ""}
                ${isSelected ? "ring-2 ring-primary/60 ring-offset-1" : ""}
              `}
            >
              <span className={`text-xs font-bold ${isToday ? "text-primary" : ""}`}>{d}</span>
              {statut !== "aucun" ? (
                <>
                  <span className={`text-[9px] font-medium leading-tight mt-0.5 ${cfg.light.split(" ").find(c => c.startsWith("text-"))}`}>
                    {cfg.label}
                  </span>
                  {pointage?.heures_travaillees > 0 && (
                    <span className="text-[9px] font-bold mt-0.5 opacity-80">{pointage.heures_travaillees}h</span>
                  )}
                </>
              ) : (
                <span className="text-[9px] text-muted-foreground/50 mt-0.5">—</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Day detail popover */}
      {selected && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="font-semibold text-sm">
                  {format(parseISO(selected.dateStr), "EEEE d MMMM yyyy", { locale: fr })}
                </p>
                {selected.pointage ? (
                  <Badge variant="outline" className={`text-xs mt-1 ${(STATUT_CONFIG[selected.pointage.statut_presence] || STATUT_CONFIG.aucun).light}`}>
                    {STATUT_CONFIG[selected.pointage.statut_presence]?.label || "—"}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs mt-1 text-muted-foreground">Aucun pointage</Badge>
                )}
              </div>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setSelected(null)}><X className="w-3.5 h-3.5" /></Button>
            </div>
            {selected.pointage ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                {[
                  ["Projet", selected.pointage.projet_nom],
                  ["Tâche", selected.pointage.tache_nom],
                  ["Début", selected.pointage.heure_debut],
                  ["Fin", selected.pointage.heure_fin],
                  ["Heures", `${selected.pointage.heures_travaillees || 0}h`],
                  ["Validation", selected.pointage.statut_validation],
                ].map(([k, v]) => (
                  <div key={k} className="p-2 rounded-md bg-background border border-border">
                    <p className="text-muted-foreground text-[10px] mb-0.5">{k}</p>
                    <p className="font-medium">{v || "—"}</p>
                  </div>
                ))}
                {selected.pointage.commentaire && (
                  <div className="col-span-2 sm:col-span-3 p-2 rounded-md bg-background border border-border">
                    <p className="text-muted-foreground text-[10px] mb-0.5">Commentaire</p>
                    <p className="font-medium">{selected.pointage.commentaire}</p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Aucun pointage enregistré pour ce jour.</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}