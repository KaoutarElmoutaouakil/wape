import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import FormDialog from "@/components/shared/FormDialog";
import { format } from "date-fns";
import { Plus, Search, X, CheckCircle2, Clock, UserCheck, AlertCircle, Trash2, Edit, CheckSquare } from "lucide-react";
import { toast } from "sonner";

const STATUT_CONFIG = {
  present:     { label: "Présent",     cls: "bg-success/10 text-success border-success/20" },
  absent:      { label: "Absent",      cls: "bg-destructive/10 text-destructive border-destructive/20" },
  retard:      { label: "Retard",      cls: "bg-warning/10 text-warning border-warning/20" },
  demi_journee:{ label: "Demi-journée",cls: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
};

const VALIDATION_CONFIG = {
  en_attente: { label: "En attente", cls: "bg-warning/10 text-warning border-warning/20" },
  valide:     { label: "Validé",     cls: "bg-success/10 text-success border-success/20" },
  refuse:     { label: "Refusé",     cls: "bg-destructive/10 text-destructive border-destructive/20" },
};

function calcHeures(debut, fin, statut) {
  if (statut === "absent") return 0;
  if (!debut || !fin) return 0;
  const [dh, dm] = debut.split(":").map(Number);
  const [fh, fm] = fin.split(":").map(Number);
  const minutes = (fh * 60 + fm) - (dh * 60 + dm);
  if (minutes <= 0) return 0;
  return Math.round((minutes / 60) * 100) / 100;
}

function PointageForm({ editing, projects, tasks, personnel, onSave, onCancel, saving, existingPointages }) {
  const [form, setForm] = useState(() => editing || {
    date: format(new Date(), "yyyy-MM-dd"),
    heure_debut: "08:00",
    heure_fin: "17:00",
    statut_presence: "present",
    type_contrat: "CDD",
    statut_validation: "en_attente",
  });

  const f = (k, v) => setForm(p => {
    const next = { ...p, [k]: v };
    // Auto-calc heures
    const debut = k === "heure_debut" ? v : next.heure_debut;
    const fin = k === "heure_fin" ? v : next.heure_fin;
    const statut = k === "statut_presence" ? v : next.statut_presence;
    next.heures_travaillees = calcHeures(debut, fin, statut);
    return next;
  });

  const filteredTasks = tasks.filter(t => !form.projet_id || t.project_id === form.projet_id);

  const handleSave = () => {
    if (!form.date || !form.operateur_nom || !form.projet_id) {
      toast.error("Date, opérateur et projet sont requis.");
      return;
    }
    // Check double pointage (même opérateur, même date)
    const dupe = existingPointages.find(p =>
      p.operateur_id === form.operateur_id &&
      p.date === form.date &&
      (!editing || p.id !== editing.id)
    );
    if (dupe) {
      toast.error("Ce opérateur a déjà un pointage pour cette date.");
      return;
    }
    // Check anomalie > 12h
    if (form.heures_travaillees > 12) {
      toast.warning("Attention : heures travaillées > 12h détectées.");
    }
    onSave(form);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Date *</Label>
          <Input type="date" value={form.date || ""} onChange={e => f("date", e.target.value)} />
        </div>
        <div>
          <Label>Type de contrat</Label>
          <Select value={form.type_contrat || "CDD"} onValueChange={v => f("type_contrat", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="CDD">CDD</SelectItem>
              <SelectItem value="journalier">Journalier</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Opérateur *</Label>
          <Select value={form.operateur_id || ""} onValueChange={v => {
            const p = personnel.find(x => x.id === v);
            setForm(prev => ({ ...prev, operateur_id: v, operateur_nom: p?.name || "" }));
          }}>
            <SelectTrigger><SelectValue placeholder="Sélectionner…" /></SelectTrigger>
            <SelectContent>
              {personnel.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Projet *</Label>
          <Select value={form.projet_id || ""} onValueChange={v => {
            const p = projects.find(x => x.id === v);
            setForm(prev => ({ ...prev, projet_id: v, projet_nom: p?.name || "", tache_id: "", tache_nom: "" }));
          }}>
            <SelectTrigger><SelectValue placeholder="Sélectionner…" /></SelectTrigger>
            <SelectContent>
              {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-2">
          <Label>Tâche (optionnelle)</Label>
          <Select value={form.tache_id || ""} onValueChange={v => {
            const t = tasks.find(x => x.id === v);
            setForm(prev => ({ ...prev, tache_id: v, tache_nom: t?.name || "" }));
          }}>
            <SelectTrigger><SelectValue placeholder="Aucune tâche" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={null}>Aucune tâche</SelectItem>
              {filteredTasks.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Statut de présence</Label>
          <Select value={form.statut_presence || "present"} onValueChange={v => f("statut_presence", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="present">Présent</SelectItem>
              <SelectItem value="absent">Absent</SelectItem>
              <SelectItem value="retard">Retard</SelectItem>
              <SelectItem value="demi_journee">Demi-journée</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 flex flex-col items-center justify-center">
          <p className="text-xs text-muted-foreground">Heures calculées</p>
          <p className="text-2xl font-bold text-primary">{form.heures_travaillees || 0}h</p>
        </div>
        {form.statut_presence !== "absent" && (<>
          <div>
            <Label>Heure début</Label>
            <Input type="time" value={form.heure_debut || ""} onChange={e => f("heure_debut", e.target.value)} />
          </div>
          <div>
            <Label>Heure fin</Label>
            <Input type="time" value={form.heure_fin || ""} onChange={e => f("heure_fin", e.target.value)} />
          </div>
        </>)}
        {(form.heures_travaillees > 12) && (
          <div className="col-span-2 flex items-center gap-2 p-2 rounded-lg bg-destructive/10 text-destructive text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" /> Heures anormalement élevées (&gt;12h) — vérifiez les horaires.
          </div>
        )}
      </div>
      <div>
        <Label>Commentaire</Label>
        <Textarea value={form.commentaire || ""} onChange={e => f("commentaire", e.target.value)} rows={2} />
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>Annuler</Button>
        <Button onClick={handleSave} disabled={saving}>{saving ? "Enregistrement…" : "Enregistrer"}</Button>
      </div>
    </div>
  );
}

export default function PointageJournalierPage() {
  const queryClient = useQueryClient();
  const today = format(new Date(), "yyyy-MM-dd");

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState("");
  const [filterProjet, setFilterProjet] = useState("all");
  const [filterDate, setFilterDate] = useState(today);
  const [filterStatut, setFilterStatut] = useState("all");
  const [filterOp, setFilterOp] = useState("all");

  const { data: pointages = [], isLoading } = useQuery({ queryKey: ["pointages"], queryFn: () => base44.entities.PointageJournalier.list("-date") });
  const { data: projects = [] } = useQuery({ queryKey: ["projects"], queryFn: () => base44.entities.Project.list() });
  const { data: tasks = [] } = useQuery({ queryKey: ["tasks"], queryFn: () => base44.entities.Task.list() });
  const { data: personnel = [] } = useQuery({ queryKey: ["personnel"], queryFn: () => base44.entities.Personnel.list() });
  const { data: user } = useQuery({ queryKey: ["me"], queryFn: () => base44.auth.me() });

  const saveMut = useMutation({
    mutationFn: d => editing ? base44.entities.PointageJournalier.update(editing.id, d) : base44.entities.PointageJournalier.create(d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["pointages"] }); setShowForm(false); setEditing(null); },
  });

  const deleteMut = useMutation({
    mutationFn: id => base44.entities.PointageJournalier.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["pointages"] }),
  });

  const validateMut = useMutation({
    mutationFn: ({ id, statut }) => base44.entities.PointageJournalier.update(id, {
      statut_validation: statut,
      valide_par: user?.full_name || user?.email || "Responsable",
      date_validation: new Date().toISOString(),
    }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["pointages"] }),
  });

  const filtered = useMemo(() => pointages.filter(p => {
    if (filterProjet !== "all" && p.projet_id !== filterProjet) return false;
    if (filterDate && p.date !== filterDate) return false;
    if (filterStatut !== "all" && p.statut_presence !== filterStatut) return false;
    if (filterOp !== "all" && p.operateur_id !== filterOp) return false;
    if (search) {
      const q = search.toLowerCase();
      if (![p.operateur_nom, p.projet_nom, p.tache_nom].some(v => v?.toLowerCase().includes(q))) return false;
    }
    return true;
  }), [pointages, filterProjet, filterDate, filterStatut, filterOp, search]);

  // KPIs today
  const todayPointages = pointages.filter(p => p.date === today);
  const kpis = {
    presents: todayPointages.filter(p => p.statut_presence === "present").length,
    absents: todayPointages.filter(p => p.statut_presence === "absent").length,
    heures: todayPointages.reduce((s, p) => s + (p.heures_travaillees || 0), 0),
    en_attente: pointages.filter(p => p.statut_validation === "en_attente").length,
  };

  const openForm = (p = null) => { setEditing(p); setShowForm(true); };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Pointage Journalier</h1>
          <p className="text-sm text-muted-foreground">Suivi de présence des opérateurs CDD</p>
        </div>
        <Button onClick={() => openForm()} className="gap-2"><Plus className="w-4 h-4" />Nouveau Pointage</Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Présents aujourd'hui", value: kpis.presents, icon: UserCheck, color: "text-success bg-success/10" },
          { label: "Absents aujourd'hui", value: kpis.absents, icon: AlertCircle, color: "text-destructive bg-destructive/10" },
          { label: "Heures travaillées (J)", value: `${kpis.heures.toFixed(1)}h`, icon: Clock, color: "text-primary bg-primary/10" },
          { label: "En attente validation", value: kpis.en_attente, icon: CheckSquare, color: "text-warning bg-warning/10" },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`p-2 rounded-lg shrink-0 ${color}`}><Icon className="w-5 h-5" /></div>
              <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-xl font-bold">{value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-40">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Rechercher…" className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Input type="date" className="w-40" value={filterDate} onChange={e => setFilterDate(e.target.value)} title="Filtrer par date" />
        <Select value={filterProjet} onValueChange={setFilterProjet}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Tous projets" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous projets</SelectItem>
            {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatut} onValueChange={setFilterStatut}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Tous statuts" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous statuts</SelectItem>
            <SelectItem value="present">Présent</SelectItem>
            <SelectItem value="absent">Absent</SelectItem>
            <SelectItem value="retard">Retard</SelectItem>
            <SelectItem value="demi_journee">Demi-journée</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterOp} onValueChange={setFilterOp}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Tous opérateurs" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous opérateurs</SelectItem>
            {personnel.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
        {(filterProjet !== "all" || filterStatut !== "all" || filterOp !== "all" || search || filterDate !== today) && (
          <Button variant="ghost" size="sm" onClick={() => { setFilterProjet("all"); setFilterStatut("all"); setFilterOp("all"); setSearch(""); setFilterDate(today); }}>
            <X className="w-3 h-3 mr-1" />Effacer
          </Button>
        )}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  {["Date", "Opérateur", "Projet", "Tâche", "Début", "Fin", "Heures", "Présence", "Validation", "Validé par", ""].map(h => (
                    <th key={h} className="text-left px-3 py-3 text-xs font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading && <tr><td colSpan={11} className="text-center py-10 text-muted-foreground">Chargement…</td></tr>}
                {!isLoading && filtered.length === 0 && <tr><td colSpan={11} className="text-center py-10 text-muted-foreground">Aucun pointage trouvé</td></tr>}
                {filtered.map(p => {
                  const sc = STATUT_CONFIG[p.statut_presence] || {};
                  const vc = VALIDATION_CONFIG[p.statut_validation] || {};
                  const canEdit = p.statut_validation !== "valide";
                  return (
                    <tr key={p.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                      <td className="px-3 py-3 font-medium whitespace-nowrap">{p.date ? format(new Date(p.date), "dd/MM/yyyy") : "—"}</td>
                      <td className="px-3 py-3 font-medium">{p.operateur_nom || "—"}</td>
                      <td className="px-3 py-3 text-xs text-muted-foreground max-w-[120px] truncate">{p.projet_nom || "—"}</td>
                      <td className="px-3 py-3 text-xs text-muted-foreground max-w-[100px] truncate">{p.tache_nom || "—"}</td>
                      <td className="px-3 py-3 text-xs">{p.heure_debut || "—"}</td>
                      <td className="px-3 py-3 text-xs">{p.heure_fin || "—"}</td>
                      <td className="px-3 py-3 font-semibold text-primary">{p.heures_travaillees || 0}h</td>
                      <td className="px-3 py-3"><Badge variant="outline" className={`text-xs ${sc.cls}`}>{sc.label || p.statut_presence}</Badge></td>
                      <td className="px-3 py-3"><Badge variant="outline" className={`text-xs ${vc.cls}`}>{vc.label || p.statut_validation}</Badge></td>
                      <td className="px-3 py-3 text-xs text-muted-foreground">{p.valide_par || "—"}</td>
                      <td className="px-3 py-3">
                        <div className="flex gap-1 items-center">
                          {p.statut_validation === "en_attente" && (
                            <>
                              <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-success border-success/30 hover:bg-success/10"
                                onClick={() => validateMut.mutate({ id: p.id, statut: "valide" })}>
                                <CheckCircle2 className="w-3 h-3" />Valider
                              </Button>
                              <Button size="sm" variant="outline" className="h-7 text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
                                onClick={() => validateMut.mutate({ id: p.id, statut: "refuse" })}>
                                Refuser
                              </Button>
                            </>
                          )}
                          {canEdit && (
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openForm(p)}>
                              <Edit className="w-3.5 h-3.5" />
                            </Button>
                          )}
                          {canEdit && (
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => { if (confirm("Supprimer ce pointage ?")) deleteMut.mutate(p.id); }}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <FormDialog open={showForm} onOpenChange={o => { if (!o) { setShowForm(false); setEditing(null); } }} title={editing ? "Modifier Pointage" : "Nouveau Pointage"}>
        <PointageForm
          editing={editing}
          projects={projects}
          tasks={tasks}
          personnel={personnel}
          existingPointages={pointages}
          onSave={d => saveMut.mutate(d)}
          onCancel={() => { setShowForm(false); setEditing(null); }}
          saving={saveMut.isPending}
        />
      </FormDialog>
    </div>
  );
}