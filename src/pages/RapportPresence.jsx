import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CalendrierPresence from "@/components/pointage/CalendrierPresence";
import { Download, Users, Clock, Calendar, AlertCircle } from "lucide-react";
import { format, getDaysInMonth, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

const STATUT_LABELS = { present: "Présent", absent: "Absent", retard: "Retard", demi_journee: "Demi-journée" };
const MOIS = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];

export default function RapportPresence() {
  const now = new Date();
  const [filterProjet, setFilterProjet] = useState("all");
  const [filterOp, setFilterOp] = useState("all");
  const [mois, setMois] = useState(now.getMonth() + 1);
  const [annee, setAnnee] = useState(now.getFullYear());

  const { data: pointages = [] } = useQuery({ queryKey: ["pointages"], queryFn: () => base44.entities.PointageJournalier.list("-date") });
  const { data: projects = [] } = useQuery({ queryKey: ["projects"], queryFn: () => base44.entities.Project.list() });
  const { data: personnel = [] } = useQuery({ queryKey: ["personnel"], queryFn: () => base44.entities.Personnel.list() });

  const monthPrefix = `${annee}-${String(mois).padStart(2, "0")}`;

  // Filtered by month + projet + operator
  const filtered = useMemo(() => pointages.filter(p => {
    if (!p.date?.startsWith(monthPrefix)) return false;
    if (filterProjet !== "all" && p.projet_id !== filterProjet) return false;
    if (filterOp !== "all" && p.operateur_id !== filterOp) return false;
    return true;
  }), [pointages, monthPrefix, filterProjet, filterOp]);

  // Map date → pointage (for calendar — single operator mode)
  const pointagesByDate = useMemo(() => {
    const map = {};
    filtered.forEach(p => { if (p.date) map[p.date] = p; });
    return map;
  }, [filtered]);

  const handleMonthChange = (delta) => {
    let m = mois + delta;
    let y = annee;
    if (m > 12) { m = 1; y++; }
    if (m < 1) { m = 12; y--; }
    setMois(m); setAnnee(y);
  };

  // Stats
  const stats = useMemo(() => {
    const jours = filtered.filter(p => p.statut_presence === "present").length;
    const absences = filtered.filter(p => p.statut_presence === "absent").length;
    const retards = filtered.filter(p => p.statut_presence === "retard").length;
    const demiJournees = filtered.filter(p => p.statut_presence === "demi_journee").length;
    const heures = filtered.reduce((s, p) => s + (p.heures_travaillees || 0), 0);
    return { jours, absences, retards, demiJournees, heures };
  }, [filtered]);

  // Aggregate by operator (for table view)
  const operateurStats = useMemo(() => {
    const map = {};
    filtered.forEach(p => {
      const key = p.operateur_id || p.operateur_nom;
      if (!map[key]) map[key] = { nom: p.operateur_nom, heures: 0, jours: 0, absences: 0, retards: 0, demiJ: 0 };
      map[key].heures += p.heures_travaillees || 0;
      if (p.statut_presence === "absent") map[key].absences++;
      else if (p.statut_presence === "retard") { map[key].retards++; map[key].jours++; }
      else if (p.statut_presence === "demi_journee") { map[key].demiJ++; map[key].jours++; }
      else map[key].jours++;
    });
    return Object.values(map).sort((a, b) => b.heures - a.heures);
  }, [filtered]);

  // Chart data
  const chartData = useMemo(() => {
    const daysInM = getDaysInMonth(new Date(annee, mois - 1, 1));
    return Array.from({ length: daysInM }, (_, i) => {
      const d = i + 1;
      const dateStr = `${monthPrefix}-${String(d).padStart(2, "0")}`;
      const dayPoints = filtered.filter(p => p.date === dateStr);
      return {
        label: String(d),
        heures: dayPoints.reduce((s, p) => s + (p.heures_travaillees || 0), 0),
        presents: dayPoints.filter(p => p.statut_presence !== "absent").length,
        absents: dayPoints.filter(p => p.statut_presence === "absent").length,
      };
    }).filter(d => d.heures > 0 || d.presents > 0 || d.absents > 0);
  }, [filtered, annee, mois, monthPrefix]);

  // Export PDF
  const exportPDF = async () => {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF();
    const opNom = filterOp !== "all" ? (personnel.find(p => p.id === filterOp)?.name || "Tous") : "Tous les opérateurs";
    doc.setFontSize(16); doc.setTextColor(30, 64, 175);
    doc.text("Calendrier de Présence", 20, 20);
    doc.setFontSize(10); doc.setTextColor(80, 80, 80);
    doc.text(`Opérateur : ${opNom}`, 20, 30);
    doc.text(`Mois : ${MOIS[mois - 1]} ${annee}`, 20, 37);
    doc.text(`Généré le : ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 20, 44);
    doc.setDrawColor(200, 200, 200); doc.line(20, 48, 190, 48);
    doc.setFontSize(10); doc.setTextColor(0, 0, 0);
    const statsText = `Jours travaillés: ${stats.jours}  |  Absences: ${stats.absences}  |  Retards: ${stats.retards}  |  Demi-j.: ${stats.demiJournees}  |  Total: ${stats.heures.toFixed(1)}h`;
    doc.text(statsText, 20, 57);
    // Calendar grid
    const days = getDaysInMonth(new Date(annee, mois - 1, 1));
    doc.setFontSize(8);
    let y = 70; let x = 20;
    const cellW = 25; const cellH = 14;
    ["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"].forEach((j, i) => {
      doc.setFillColor(240,240,240); doc.rect(x + i*cellW, y, cellW, 8, "F");
      doc.setTextColor(80,80,80); doc.text(j, x + i*cellW + 8, y+6);
    });
    y += 8;
    const firstDow = new Date(annee, mois-1, 1).getDay();
    const offset = firstDow === 0 ? 6 : firstDow - 1;
    let col = offset;
    for (let d = 1; d <= days; d++) {
      const dateStr = `${monthPrefix}-${String(d).padStart(2,"0")}`;
      const p = pointagesByDate[dateStr];
      const statut = p?.statut_presence;
      const colors = { present: [220,252,231], absent: [254,226,226], retard: [255,237,213], demi_journee: [254,252,232] };
      const [r,g,b] = colors[statut] || [245,245,245];
      doc.setFillColor(r,g,b); doc.rect(x + col*cellW, y, cellW, cellH, "F");
      doc.setDrawColor(200,200,200); doc.rect(x + col*cellW, y, cellW, cellH, "S");
      doc.setTextColor(0,0,0); doc.text(String(d), x + col*cellW + 2, y+5);
      if (statut) {
        const short = { present:"Prés.", absent:"Abs.", retard:"Ret.", demi_journee:"1/2J" };
        doc.setTextColor(80,80,80); doc.text(short[statut]||"", x + col*cellW + 2, y+10);
      }
      col++;
      if (col === 7) { col = 0; y += cellH; }
    }
    doc.save(`calendrier_${opNom.replace(/ /g,"_")}_${mois}_${annee}.pdf`);
  };

  // Export CSV
  const exportCSV = () => {
    const opNom = filterOp !== "all" ? (personnel.find(p => p.id === filterOp)?.name || "—") : "Tous";
    const rows = [
      [`Opérateur: ${opNom}`, `Mois: ${MOIS[mois-1]} ${annee}`],
      [],
      ["Date", "Opérateur", "Projet", "Tâche", "Début", "Fin", "Heures", "Statut", "Validation"],
      ...filtered.map(p => [
        p.date||"—", p.operateur_nom||"—", p.projet_nom||"—", p.tache_nom||"—",
        p.heure_debut||"—", p.heure_fin||"—", p.heures_travaillees||0,
        STATUT_LABELS[p.statut_presence]||p.statut_presence, p.statut_validation||"—",
      ]),
      [],
      ["Résumé","","","","","","","",""],
      ["Jours travaillés", stats.jours], ["Absences", stats.absences],
      ["Retards", stats.retards], ["Demi-journées", stats.demiJournees],
      ["Total heures", stats.heures.toFixed(1)],
    ];
    const csv = rows.map(r => r.map(v => `"${v}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a"); a.href = url; a.download = `presence_${mois}_${annee}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const years = [annee - 1, annee, annee + 1];
  const selectedOpNom = filterOp !== "all" ? personnel.find(p => p.id === filterOp)?.name : null;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Rapport de Présence</h1>
          <p className="text-sm text-muted-foreground">Calendrier mensuel & analyse des présences</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV} className="gap-1.5 text-xs"><Download className="w-3.5 h-3.5" />Excel/CSV</Button>
          <Button variant="outline" size="sm" onClick={exportPDF} className="gap-1.5 text-xs"><Download className="w-3.5 h-3.5" />PDF</Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
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
              <Label className="text-xs mb-1 block">Mois</Label>
              <Select value={String(mois)} onValueChange={v => setMois(Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MOIS.map((m, i) => <SelectItem key={i+1} value={String(i+1)}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs mb-1 block">Année</Label>
              <Select value={String(annee)} onValueChange={v => setAnnee(Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: "Jours travaillés", value: stats.jours, icon: Calendar, color: "text-success bg-success/10" },
          { label: "Total heures", value: `${stats.heures.toFixed(1)}h`, icon: Clock, color: "text-primary bg-primary/10" },
          { label: "Absences", value: stats.absences, icon: AlertCircle, color: "text-destructive bg-destructive/10" },
          { label: "Retards", value: stats.retards, icon: Clock, color: "text-orange-600 bg-orange-500/10" },
          { label: "Demi-journées", value: stats.demiJournees, icon: Users, color: "text-yellow-700 bg-yellow-400/10" },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="p-3 flex items-center gap-2">
              <div className={`p-1.5 rounded-lg ${color}`}><Icon className="w-4 h-4" /></div>
              <div><p className="text-[10px] text-muted-foreground">{label}</p><p className="text-lg font-bold leading-tight">{value}</p></div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main content */}
      <Tabs defaultValue="calendrier">
        <TabsList>
          <TabsTrigger value="calendrier">Calendrier</TabsTrigger>
          <TabsTrigger value="graphique">Graphique</TabsTrigger>
          <TabsTrigger value="tableau">Tableau opérateurs</TabsTrigger>
        </TabsList>

        <TabsContent value="calendrier" className="mt-4">
          <Card>
            <CardContent className="p-5">
              <CalendrierPresence
                pointagesByDate={pointagesByDate}
                month={mois}
                year={annee}
                onMonthChange={handleMonthChange}
                operateurNom={selectedOpNom}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="graphique" className="mt-4">
          <div className="grid grid-cols-1 gap-5">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Heures & Présences par Jour — {MOIS[mois-1]} {annee}</CardTitle></CardHeader>
              <CardContent>
                {chartData.length === 0 ? <p className="text-center text-muted-foreground text-sm py-8">Aucune donnée pour ce mois</p> : (
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={chartData} barSize={12}>
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
          </div>
        </TabsContent>

        <TabsContent value="tableau" className="mt-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Résumé par Opérateur — {MOIS[mois-1]} {annee}</CardTitle></CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      {["Opérateur", "Total Heures", "Jours Travaillés", "Absences", "Retards", "Demi-j."].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {operateurStats.length === 0 && (
                      <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">Aucun résultat pour ce mois</td></tr>
                    )}
                    {operateurStats.map((s, i) => (
                      <tr key={i} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3 font-medium">{s.nom || "—"}</td>
                        <td className="px-4 py-3 font-bold text-primary">{s.heures.toFixed(1)}h</td>
                        <td className="px-4 py-3">{s.jours}</td>
                        <td className="px-4 py-3">
                          {s.absences > 0 ? <Badge variant="outline" className="text-xs bg-destructive/10 text-destructive border-destructive/20">{s.absences}</Badge> : <span className="text-muted-foreground">0</span>}
                        </td>
                        <td className="px-4 py-3">
                          {s.retards > 0 ? <Badge variant="outline" className="text-xs bg-orange-500/10 text-orange-600 border-orange-400/20">{s.retards}</Badge> : <span className="text-muted-foreground">0</span>}
                        </td>
                        <td className="px-4 py-3">
                          {s.demiJ > 0 ? <Badge variant="outline" className="text-xs bg-yellow-400/10 text-yellow-700 border-yellow-400/20">{s.demiJ}</Badge> : <span className="text-muted-foreground">0</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}