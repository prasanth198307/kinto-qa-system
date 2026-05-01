import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Star, Users, ChevronRight, Pencil } from "lucide-react";

const STATUS_COLORS: Record<string, string> = { draft: "secondary", active: "default", completed: "default", closed: "secondary" };
const APPRAISAL_STATUS_COLORS: Record<string, string> = { pending: "secondary", in_progress: "secondary", submitted: "default", reviewed: "default", closed: "secondary" };

function RatingStars({ value, onChange, max = 5 }: { value: number; onChange?: (v: number) => void; max?: number }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: max }, (_, i) => i + 1).map(n => (
        <button key={n} type="button" onClick={() => onChange?.(n)} className={`text-lg ${n <= value ? "text-yellow-400" : "text-muted-foreground/30"} ${onChange ? "hover-elevate" : ""}`}>
          <Star className="w-5 h-5 fill-current" />
        </button>
      ))}
      <span className="text-sm text-muted-foreground ml-1">{value > 0 ? `${value}/${max}` : "Not rated"}</span>
    </div>
  );
}

function CycleForm({ cycle, onSave, onCancel }: any) {
  const { toast } = useToast();
  const [form, setForm] = useState({ name: cycle?.name || "", periodFrom: cycle?.period_from?.split("T")[0] || "", periodTo: cycle?.period_to?.split("T")[0] || "", status: cycle?.status || "draft" });

  const mutation = useMutation({
    mutationFn: (d: any) => cycle
      ? apiRequest("PUT", `/api/hr/appraisal-cycles/${cycle.id}`, d)
      : apiRequest("POST", "/api/hr/appraisal-cycles", d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/hr/appraisal-cycles"] }); toast({ title: cycle ? "Cycle updated" : "Cycle created" }); onSave(); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-4">
      <div><Label>Cycle Name <span className="text-destructive">*</span></Label><Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Annual Appraisal FY 2025-26" data-testid="input-cycle-name" /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Period From</Label><Input type="date" value={form.periodFrom} onChange={e => setForm(p => ({ ...p, periodFrom: e.target.value }))} /></div>
        <div><Label>Period To</Label><Input type="date" value={form.periodTo} onChange={e => setForm(p => ({ ...p, periodTo: e.target.value }))} /></div>
      </div>
      {cycle && (
        <div>
          <Label>Status</Label>
          <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{["draft", "active", "completed", "closed"].map(s => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      )}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={() => mutation.mutate(form)} disabled={mutation.isPending || !form.name} data-testid="button-save-cycle">
          {mutation.isPending ? "Saving..." : "Save"}
        </Button>
      </div>
    </div>
  );
}

function AppraisalDetail({ cycleId, employees, onBack }: { cycleId: number; employees: any[]; onBack: () => void }) {
  const { toast } = useToast();
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editAppraisal, setEditAppraisal] = useState<any>(null);
  const [addForm, setAddForm] = useState({ employeeId: "", appraiserId: "", kras: [{ kra: "", weightage: "" }] });
  const [editForm, setEditForm] = useState<any>({});

  const { data, isLoading, refetch } = useQuery<any>({ queryKey: ["/api/hr/appraisals", cycleId] });
  const appraisals = data?.appraisals || [];
  const kras = data?.kras || [];

  const addMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/hr/appraisals", {
      cycleId, employeeId: Number(addForm.employeeId), appraiserId: addForm.appraiserId ? Number(addForm.appraiserId) : null,
      kras: addForm.kras.filter(k => k.kra).map(k => ({ kra: k.kra, weightage: Number(k.weightage) || null })),
    }),
    onSuccess: () => { refetch(); toast({ title: "Appraisal initiated" }); setAddOpen(false); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: any) => apiRequest("PUT", `/api/hr/appraisals/${id}`, data),
    onSuccess: () => { refetch(); toast({ title: "Appraisal updated" }); setEditOpen(false); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  if (isLoading) return <p className="text-center py-8 text-muted-foreground">Loading...</p>;

  const avgRating = appraisals.filter((a: any) => a.final_rating).length > 0
    ? (appraisals.reduce((s: number, a: any) => s + Number(a.final_rating || 0), 0) / appraisals.filter((a: any) => a.final_rating).length).toFixed(1)
    : "—";

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onBack}><ChevronRight className="w-4 h-4 rotate-180" /></Button>
        <div className="flex-1">
          <h2 className="text-lg font-semibold">Appraisals</h2>
          <p className="text-sm text-muted-foreground">{appraisals.length} employees · Avg Rating: {avgRating}</p>
        </div>
        <Button size="sm" onClick={() => setAddOpen(true)} data-testid="button-add-appraisal"><Plus className="w-3 h-3 mr-1" />Add Employee</Button>
      </div>

      {appraisals.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground"><Users className="w-10 h-10 mx-auto mb-2 opacity-40" /><p>No appraisals initiated yet</p></div>
      ) : (
        <div className="space-y-3">
          {appraisals.map((a: any) => {
            const empKras = kras.filter((k: any) => k.appraisal_id === a.id);
            return (
              <Card key={a.id}>
                <CardContent className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{a.employee_name}</p>
                      {a.appraiser_name && <p className="text-xs text-muted-foreground">Appraiser: {a.appraiser_name}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={APPRAISAL_STATUS_COLORS[a.status] as any} className="text-xs">{a.status.replace("_", " ")}</Badge>
                      <Button size="icon" variant="ghost" onClick={() => {
                        setEditAppraisal(a);
                        setEditForm({ selfRating: a.self_rating || 0, managerRating: a.manager_rating || 0, finalRating: a.final_rating || 0, strengths: a.strengths || "", improvements: a.improvements || "", goals: a.goals || "", status: a.status, kras: empKras });
                        setEditOpen(true);
                      }}><Pencil className="w-4 h-4" /></Button>
                    </div>
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-3 text-sm">
                    <div><p className="text-xs text-muted-foreground">Self</p><RatingStars value={Number(a.self_rating || 0)} max={5} /></div>
                    <div><p className="text-xs text-muted-foreground">Manager</p><RatingStars value={Number(a.manager_rating || 0)} max={5} /></div>
                    <div><p className="text-xs text-muted-foreground">Final</p><RatingStars value={Number(a.final_rating || 0)} max={5} /></div>
                  </div>
                  {empKras.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {empKras.map((k: any) => (
                        <div key={k.id} className="flex justify-between text-xs text-muted-foreground">
                          <span>{k.kra}</span>
                          <span>{k.weightage ? `${k.weightage}%` : ""} · Self: {k.self_score || "—"} · Mgr: {k.manager_score || "—"}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Appraisal Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md max-h-[90dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>Initiate Appraisal</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Employee <span className="text-destructive">*</span></Label>
              <Select value={addForm.employeeId} onValueChange={v => setAddForm(p => ({ ...p, employeeId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>{employees.map(e => <SelectItem key={e.id} value={String(e.id)}>{e.first_name} {e.last_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Appraiser</Label>
              <Select value={addForm.appraiserId} onValueChange={v => setAddForm(p => ({ ...p, appraiserId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select appraiser (manager)" /></SelectTrigger>
                <SelectContent>{employees.map(e => <SelectItem key={e.id} value={String(e.id)}>{e.first_name} {e.last_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>KRA / Goals</Label>
              {addForm.kras.map((k, idx) => (
                <div key={idx} className="flex gap-2">
                  <Input className="flex-1" placeholder="KRA description" value={k.kra} onChange={e => setAddForm(p => ({ ...p, kras: p.kras.map((k2, i) => i === idx ? { ...k2, kra: e.target.value } : k2) }))} />
                  <Input className="w-20" placeholder="Wt %" value={k.weightage} onChange={e => setAddForm(p => ({ ...p, kras: p.kras.map((k2, i) => i === idx ? { ...k2, weightage: e.target.value } : k2) }))} />
                  {addForm.kras.length > 1 && <Button size="icon" variant="ghost" onClick={() => setAddForm(p => ({ ...p, kras: p.kras.filter((_, i) => i !== idx) }))}><Trash2 className="w-4 h-4 text-destructive" /></Button>}
                </div>
              ))}
              <Button size="sm" variant="outline" onClick={() => setAddForm(p => ({ ...p, kras: [...p.kras, { kra: "", weightage: "" }] }))}>
                <Plus className="w-3 h-3 mr-1" />Add KRA
              </Button>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button onClick={() => addMutation.mutate()} disabled={addMutation.isPending || !addForm.employeeId} data-testid="button-initiate-appraisal">
                {addMutation.isPending ? "Initiating..." : "Initiate"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Appraisal Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg max-h-[90dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>Update Appraisal — {editAppraisal?.employee_name}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Self Rating</Label>
              <RatingStars value={Number(editForm.selfRating || 0)} onChange={v => setEditForm((p: any) => ({ ...p, selfRating: v }))} />
            </div>
            <div>
              <Label>Manager Rating</Label>
              <RatingStars value={Number(editForm.managerRating || 0)} onChange={v => setEditForm((p: any) => ({ ...p, managerRating: v }))} />
            </div>
            <div>
              <Label>Final Rating</Label>
              <RatingStars value={Number(editForm.finalRating || 0)} onChange={v => setEditForm((p: any) => ({ ...p, finalRating: v }))} />
            </div>
            {(editForm.kras || []).length > 0 && (
              <div className="space-y-2">
                <Label>KRA Scores</Label>
                {editForm.kras.map((k: any, idx: number) => (
                  <div key={k.id} className="flex items-center gap-2 text-sm">
                    <span className="flex-1 text-muted-foreground">{k.kra}</span>
                    <div className="flex gap-2">
                      <div className="w-20"><Label className="text-xs">Self</Label><Input type="number" min="0" max="5" step="0.5" className="h-7 text-xs" value={k.self_score || ""} onChange={e => setEditForm((p: any) => ({ ...p, kras: p.kras.map((k2: any, i: number) => i === idx ? { ...k2, self_score: e.target.value } : k2) }))} /></div>
                      <div className="w-20"><Label className="text-xs">Manager</Label><Input type="number" min="0" max="5" step="0.5" className="h-7 text-xs" value={k.manager_score || ""} onChange={e => setEditForm((p: any) => ({ ...p, kras: p.kras.map((k2: any, i: number) => i === idx ? { ...k2, manager_score: e.target.value } : k2) }))} /></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div><Label>Strengths</Label><Textarea value={editForm.strengths || ""} onChange={e => setEditForm((p: any) => ({ ...p, strengths: e.target.value }))} rows={2} /></div>
            <div><Label>Areas for Improvement</Label><Textarea value={editForm.improvements || ""} onChange={e => setEditForm((p: any) => ({ ...p, improvements: e.target.value }))} rows={2} /></div>
            <div><Label>Goals for Next Period</Label><Textarea value={editForm.goals || ""} onChange={e => setEditForm((p: any) => ({ ...p, goals: e.target.value }))} rows={2} /></div>
            <div>
              <Label>Status</Label>
              <Select value={editForm.status || "pending"} onValueChange={v => setEditForm((p: any) => ({ ...p, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["pending", "in_progress", "submitted", "reviewed", "closed"].map(s => <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button onClick={() => updateMutation.mutate({ id: editAppraisal.id, data: { selfRating: editForm.selfRating || null, managerRating: editForm.managerRating || null, finalRating: editForm.finalRating || null, strengths: editForm.strengths, improvements: editForm.improvements, goals: editForm.goals, status: editForm.status, kras: editForm.kras } })}
                disabled={updateMutation.isPending} data-testid="button-update-appraisal">
                {updateMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function PerformanceAppraisalPage() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editCycle, setEditCycle] = useState<any>(null);
  const [selectedCycleId, setSelectedCycleId] = useState<number | null>(null);

  const { data: cycles = [], isLoading } = useQuery<any[]>({ queryKey: ["/api/hr/appraisal-cycles"] });
  const { data: employees = [] } = useQuery<any[]>({ queryKey: ["/api/hr/employees"] });

  if (selectedCycleId) {
    const cycle = cycles.find((c: any) => c.id === selectedCycleId);
    return (
      <div className="p-4 sm:p-6">
        <div className="mb-4">
          <h1 className="text-xl font-semibold">{cycle?.name}</h1>
          <p className="text-sm text-muted-foreground">{cycle?.period_from ? new Date(cycle.period_from).toLocaleDateString("en-IN") : ""} — {cycle?.period_to ? new Date(cycle.period_to).toLocaleDateString("en-IN") : ""}</p>
        </div>
        <AppraisalDetail cycleId={selectedCycleId} employees={employees} onBack={() => setSelectedCycleId(null)} />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">Performance Appraisal</h1>
          <p className="text-sm text-muted-foreground">Manage appraisal cycles, KRAs, and ratings</p>
        </div>
        <Button onClick={() => { setEditCycle(null); setDialogOpen(true); }} data-testid="button-new-cycle">
          <Plus className="w-4 h-4 mr-1" />New Cycle
        </Button>
      </div>

      {isLoading ? <p className="text-center py-12 text-muted-foreground">Loading...</p> : cycles.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground"><Star className="w-10 h-10 mx-auto mb-2 opacity-40" /><p>No appraisal cycles created</p></div>
      ) : (
        <div className="space-y-3">
          {(cycles as any[]).map((c: any) => (
            <Card key={c.id} className="cursor-pointer hover-elevate" onClick={() => setSelectedCycleId(c.id)} data-testid={`card-cycle-${c.id}`}>
              <CardContent className="p-4 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium">{c.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {c.period_from ? new Date(c.period_from).toLocaleDateString("en-IN") : "No start"} —{" "}
                    {c.period_to ? new Date(c.period_to).toLocaleDateString("en-IN") : "No end"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={STATUS_COLORS[c.status] as any}>{c.status}</Badge>
                  <Button size="icon" variant="ghost" onClick={e => { e.stopPropagation(); setEditCycle(c); setDialogOpen(true); }}><Pencil className="w-4 h-4" /></Button>
                  <p className="text-xs text-muted-foreground">View appraisals <ChevronRight className="w-3 h-3 inline" /></p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editCycle ? "Edit Cycle" : "New Appraisal Cycle"}</DialogTitle></DialogHeader>
          <CycleForm cycle={editCycle} onSave={() => setDialogOpen(false)} onCancel={() => setDialogOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
