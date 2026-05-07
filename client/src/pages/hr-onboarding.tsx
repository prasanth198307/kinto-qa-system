import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Pencil, CheckCircle2, Clock, User } from "lucide-react";

const DEFAULT_CHECKLIST = [
  "Offer Letter Issued",
  "ID Proof Collected",
  "Address Proof Collected",
  "Photo Collected",
  "Bank Account Details",
  "PF / ESI Enrollment",
  "System / Email Account Created",
  "ID Card Issued",
  "Induction Session Completed",
  "Department Introduction Done",
  "Policy Documents Signed",
  "Training Scheduled",
];

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
  in_progress: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  completed: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
};

export default function HROnboardingPage() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [showChecklist, setShowChecklist] = useState<any>(null);
  const [form, setForm] = useState<any>({ checklist: DEFAULT_CHECKLIST.map(t => ({ task: t, done: false })) });

  const { data: records = [] } = useQuery<any[]>({ queryKey: ["/api/hr/onboarding"] });

  const saveMutation = useMutation({
    mutationFn: (data: any) => editing
      ? apiRequest("PUT", `/api/hr/onboarding/${editing.id}`, data)
      : apiRequest("POST", "/api/hr/onboarding", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/hr/onboarding"] });
      setShowForm(false); setEditing(null);
      setForm({ checklist: DEFAULT_CHECKLIST.map(t => ({ task: t, done: false })) });
      toast({ title: "Onboarding record saved" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateChecklistMutation = useMutation({
    mutationFn: ({ id, checklist }: any) => apiRequest("PUT", `/api/hr/onboarding/${id}`, { checklist }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/hr/onboarding"] }); toast({ title: "Checklist updated" }); },
  });

  const set = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));
  const filtered = records.filter((r: any) => r.employee_name?.toLowerCase().includes(search.toLowerCase()) || r.department?.toLowerCase().includes(search.toLowerCase()));

  const getProgress = (checklist: any[]) => {
    if (!Array.isArray(checklist)) return 0;
    const done = checklist.filter((c: any) => c.done).length;
    return Math.round((done / checklist.length) * 100);
  };

  const toggleTask = (record: any, idx: number) => {
    const checklist = Array.isArray(record.checklist) ? [...record.checklist] : [];
    checklist[idx] = { ...checklist[idx], done: !checklist[idx].done };
    const allDone = checklist.every((c: any) => c.done);
    updateChecklistMutation.mutate({ id: record.id, checklist, status: allDone ? "completed" : "in_progress" });
    setShowChecklist({ ...record, checklist });
  };

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-xl font-bold">Onboarding & Induction</h1>
          <p className="text-sm text-muted-foreground">Track new employee onboarding checklists</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9 w-48" placeholder="Search employee…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Button onClick={() => { setEditing(null); setForm({ checklist: DEFAULT_CHECKLIST.map(t => ({ task: t, done: false })) }); setShowForm(true); }} size="sm" data-testid="button-add-onboarding">
            <Plus className="h-4 w-4 mr-1" />New Onboarding
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((r: any) => {
          const progress = getProgress(r.checklist);
          return (
            <Card key={r.id} data-testid={`card-onboard-${r.id}`}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-blue-100 text-blue-600"><User className="h-4 w-4" /></div>
                    <div>
                      <p className="font-semibold text-sm">{r.employee_name}</p>
                      <p className="text-xs text-muted-foreground">{r.department} · {r.designation}</p>
                    </div>
                  </div>
                  <Badge className={STATUS_COLORS[r.status] || ""}>{r.status?.replace("_", " ")}</Badge>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Progress</span><span>{progress}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div className="bg-blue-500 h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">Joining: {r.joining_date || "—"}</p>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => setShowChecklist(r)} data-testid={`button-checklist-${r.id}`}>
                    <CheckCircle2 className="h-3 w-3 mr-1" />Checklist
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => { setEditing(r); setForm({ ...r }); setShowForm(true); }}>
                    <Pencil className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {filtered.length === 0 && <p className="col-span-3 text-center text-muted-foreground py-8">No onboarding records found</p>}
      </div>

      {/* New/Edit form */}
      <Dialog open={showForm} onOpenChange={v => { setShowForm(v); if (!v) setEditing(null); }}>
        <DialogContent className="max-w-md max-h-[90dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Onboarding" : "New Onboarding"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1"><Label className="text-xs">Employee Name *</Label><Input value={form.employee_name || ""} onChange={e => set("employee_name", e.target.value)} data-testid="input-onboard-name" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label className="text-xs">Department</Label><Input value={form.department || ""} onChange={e => set("department", e.target.value)} /></div>
              <div className="space-y-1"><Label className="text-xs">Designation</Label><Input value={form.designation || ""} onChange={e => set("designation", e.target.value)} /></div>
              <div className="space-y-1"><Label className="text-xs">Joining Date</Label><Input type="date" value={form.joining_date || ""} onChange={e => set("joining_date", e.target.value)} /></div>
              <div className="space-y-1"><Label className="text-xs">Assigned To</Label><Input value={form.assigned_to || ""} onChange={e => set("assigned_to", e.target.value)} placeholder="HR person name" /></div>
            </div>
            <div className="space-y-1"><Label className="text-xs">Notes</Label><Textarea value={form.notes || ""} onChange={e => set("notes", e.target.value)} rows={2} /></div>
            <div className="space-y-2">
              <Label className="text-xs">Checklist Items</Label>
              {(form.checklist || []).map((item: any, i: number) => (
                <div key={i} className="flex items-center gap-2">
                  <Checkbox checked={item.done} onCheckedChange={v => {
                    const c = [...(form.checklist || [])]; c[i] = { ...c[i], done: !!v }; set("checklist", c);
                  }} />
                  <span className="text-sm">{item.task}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-2 justify-end pt-1">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending} data-testid="button-save-onboarding">Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Checklist dialog */}
      <Dialog open={!!showChecklist} onOpenChange={v => !v && setShowChecklist(null)}>
        <DialogContent className="max-w-md max-h-[90dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>Checklist — {showChecklist?.employee_name}</DialogTitle></DialogHeader>
          <div className="space-y-2">
            {(showChecklist?.checklist || []).map((item: any, i: number) => (
              <div key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer" onClick={() => toggleTask(showChecklist, i)}>
                <Checkbox checked={item.done} onCheckedChange={() => toggleTask(showChecklist, i)} />
                <span className={`text-sm ${item.done ? "line-through text-muted-foreground" : ""}`}>{item.task}</span>
                {item.done && <CheckCircle2 className="h-4 w-4 text-green-500 ml-auto shrink-0" />}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
