import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Users, Clock, Calendar, AlertCircle } from "lucide-react";
import { format, parseISO, differenceInDays } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

const STATUT_LABELS = { present: "Présent", absent: "Absent", retard: "Retard", demi_journee: "Demi-journée" };

export default function RapportPresence() {
  const today = format(new Date(), "yyyy-MM-dd");
  const firstDay = format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), "yyyy-MM-dd");

  const [filterProjet, setFilterProjet] = useState("all");
  const [filterOp, setFilterOp] = useState("all");
  const [dateDebut, setDateDebut] = useState(firstDay);
  const [dateFin, setDateFin] = useState(today);

  const { data: pointages = [] } = useQuery({ queryKey: ["pointages"], queryFn: () => base44.entities.PointageJournalier.list("-date") });
  const { data: projects = [] } = useQuery({ queryKey: ["projects"], queryFn: () => base44.entities.Project.list() });
  const { data: personnel = [] } = useQuery({ queryKey: ["personnel"], queryFn: () => base44.entities.Personnel.list() });

  const filtered = useMemo(() => pointages.filter(p => {
    if (filterProjet !== "all" && p.projet_id !== filterProjet) return false;
    if (filterOp !== "all" && p.operateur_id !== filterOp) return false;
    if (dateDebut && p.date < dateDebut) return false;
    if (dateFin && p.date > dateFin) return false;
    return true;
  }), [pointages, filterProjet, filterOp, dateDebut, dateFin]);

  // Aggregate by operator
  const operateurStats = useMemo(() => {
    const map = {};
    filtered.forEach(p => {
      const key = p.operateur_id || p.operateur_nom;
      if (!map[key]) map[key] = { nom: p.operateur_nom, heures: 0, jours: 0, absences: 0, retards: 0, points: [] };
      map[key].heures += p.heures_travaillees || 0;
      map[key].points.push(p);
      if (p.statut_presence === "absent") map[key].absences++;
      else if (p.statut_presence === "retard") map[key].retards++;
      else map[key].jours++;
    });
    return Object.values(map).sort((a, b) => b.heures - a.heures);
  }, [filtered]);

  // Top projets par heures
  const projetStats = useMemo(() => {
    const map = {};
    filtered.forEach(p => {
      const key = p.projet_id || p.projet_nom;
      if (!map[key]) map[key] = { nom: p.projet_nom, heures: 0, effectif: new Set() };
      map[key].heures += p.heures_travaillees || 0;
      if (p.operateur_id) map[key].effectif.add(p.operateur_id);
    });
    return Object.values(map).map(x => ({ ...x, effectif: x.effectif.size })).sort((a, b) => b.heures - a.heures).slice(0, 8);
  }, [filtered]);

  // Chart: heures par jour
  const chartData = useMemo(() => {
    const map = {};
    filtered.forEach(p => {
      if (!p.date) return;
      if (!map[p.date]) map[p.date] = { date: p.date, heures: 0, presents: 0, absents: 0 };
      map[p.date].heures += p.heures_travaillees || 0;
      if (p.statut_presence === "present" || p.statut_presence === "retard" || p.statut_presence === "demi_journee") map[p.date].presents++;
      if (p.statut_presence === "absent") map[p.date].absents++;
    });
    return Object.values(map).sort((a, b) => a.date.localeCompare(b.date)).map(d => ({
      ...d, label: format(parseISO(d.date), "dd/MM"),
    }));
  }, [filtered]);

  const totalHeures = filtered.reduce((s, p) => s + (p.heures_travaillees || 0), 0);
  const totalJours = new Set(filtered.filter(p => p.statut_presence !== "absent").map(p => p.date)).size;
  const totalAbsences = filtered.filter(p => p.statut_presence === "absent").length;

  // Export PDF
  const exportPDF = async () => {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF();
    doc.setFontSize(18); doc.setTextColor(30, 64, 175);
    doc.text("Rapport de Présence", 20, 20);
    doc.setFontSize(10); doc.setTextColor(100, 100, 100);
    doc.text(`Période : ${dateDebut} → ${dateFin}`, 20, 30);
    doc.text(`Généré le : ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 20, 37);
    doc.setDrawColor(200, 200, 200); doc.line(20, 42, 190, 42);
    doc.setFontSize(11); doc.setTextColor(0, 0, 0);
    doc.text(`Total heures : ${totalHeures.toFixed(1)}h   Jours travaillés : ${totalJours}   Absences : ${totalAbsences}`, 20, 52);
    doc.setFontSize(9);
    const headers = ["Opérateur", "Heures", "Jours", "Absences", "Retards"];
    const cols = [20, 80, 110, 140, 165];
    let y = 65;
    doc.setFillColor(240, 240, 240); doc.rect(18, y - 5, 172, 8, "F");
    headers.forEach((h, i) => { doc.setTextColor(80, 80, 80); doc.text(h, cols[i], y); });
    y += 8;
    operateurStats.forEach(s => {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.setTextColor(0, 0, 0);
      [s.nom, `${s.heures.toFixed(1)}h`, String(s.jours), String(s.absences), String(s.retards)].forEach((v, i) => doc.text(String(v).slice(0, 22), cols[i], y));
      y += 8;
    });
    doc.save(`rapport_presence_${dateDebut}_${dateFin}.pdf`);
  };

  // Export CSV
  const exportCSV = () => {
    const rows = [
      ["Opérateur", "Projet", "Date", "Début", "Fin", "Heures", "Statut", "Validation"],
      ...filtered.map(p => [
        p.operateur_nom || "—", p.projet_nom || "—", p.date || "—",
        p.heure_debut || "—", p.heure_fin || "—", p.heures_travaillees || 0,
        STATUT_LABELS[p.statut_presence] || p.statut_presence,
        p.statut_validation || "—",
      ]),
    ];
    const csv = rows.map(r => r.map(v => `"${v}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a"); a.href = url; a.download = `rapport_presence_${dateDebut}_${dateFin}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Rapport de Présence</h1>
          <p className="text-sm text-muted-foreground">Analyse des heures et présences opérateurs</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV} className="gap-1.5 text-xs"><Download className="w-3.5 h-3.5" />CSV</Button>
          <Button variant="outline" size="sm" onClick={exportPDF} className="gap-1.5 text-xs"><Download className="w-3.5 h-3.5" />PDF</Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <Label className="text-xs mb-1 block">Date début</Label>
              <Input type="date" value={dateDebut} onChange={e => setDateDebut(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs mb-1 block">Date fin</Label>
              <Input type="date" value={dateFin} onChange={e => setDateFin(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs mb-1 block">Projet</Label>
              <Select value={filterProjet} onValueChange={setFilterProjet}>
                <SelectTrigger><SelectValue placeholder="Tous" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les projets</SelectItem>
                  {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs mb-1 block">Opérateur</Label>
              <Select value={filterOp} onValueChange={setFilterOp}>
                <SelectTrigger><SelectValue placeholder="Tous" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les opérateurs</SelectItem>
                  {personnel.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total heures travaillées", value: `${totalHeures.toFixed(1)}h`, icon: Clock, color: "text-primary bg-primary/10" },
          { label: "Jours travaillés", value: totalJours, icon: Calendar, color: "text-success bg-success/10" },
          { label: "Total absences", value: totalAbsences, icon: AlertCircle, color: "text-destructive bg-destructive/10" },
          { label: "Opérateurs impliqués", value: operateurStats.length, icon: Users, color: "text-purple-600 bg-purple-500/10" },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`p-2 rounded-lg ${color}`}><Icon className="w-5 h-5" /></div>
              <div><p className="text-xs text-muted-foreground">{label}</p><p className="text-xl font-bold">{value}</p></div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Heures & Présences par Jour</CardTitle></CardHeader>
          <CardContent>
            {chartData.length === 0 ? <p className="text-center text-muted-foreground text-sm py-8">Aucune donnée</p> : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData} barSize={14}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                  <Legend />
                  <Bar dataKey="heures" fill="hsl(221,83%,53%)" name="Heures" radius={[3,3,0,0]} />
                  <Bar dataKey="presents" fill="hsl(142,71%,45%)" name="Présents" radius={[3,3,0,0]} />
                  <Bar dataKey="absents" fill="hsl(0,84%,60%)" name="Absents" radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Top Projets par Heures</CardTitle></CardHeader>
          <CardContent>
            {projetStats.length === 0 ? <p className="text-center text-muted-foreground text-sm py-8">Aucune donnée</p> : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={projetStats} layout="vertical" barSize={14}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis dataKey="nom" type="category" tick={{ fontSize: 10 }} width={90} />
                  <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="heures" fill="hsl(38,92%,50%)" name="Heures" radius={[0,3,3,0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tableau par opérateur */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Résumé par Opérateur</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  {["Opérateur", "Total Heures", "Jours Travaillés", "Absences", "Retards"].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {operateurStats.length === 0 && <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">Aucun résultat</td></tr>}
                {operateurStats.map((s, i) => (
                  <tr key={i} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-medium">{s.nom || "—"}</td>
                    <td className="px-4 py-3 font-bold text-primary">{s.heures.toFixed(1)}h</td>
                    <td className="px-4 py-3">{s.jours}</td>
                    <td className="px-4 py-3">
                      {s.absences > 0 ? <Badge variant="outline" className="text-xs bg-destructive/10 text-destructive border-destructive/20">{s.absences}</Badge> : <span className="text-muted-foreground">0</span>}
                    </td>
                    <td className="px-4 py-3">
                      {s.retards > 0 ? <Badge variant="outline" className="text-xs bg-warning/10 text-warning border-warning/20">{s.retards}</Badge> : <span className="text-muted-foreground">0</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}