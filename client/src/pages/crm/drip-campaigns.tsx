import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, ArrowRight } from "lucide-react";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); });

const SAMPLE = [
  { id: 1, name: "Welcome Series", trigger: "New Lead", steps: 3, enrolled: 45, completed: 20, dropped: 5, active: true },
  { id: 2, name: "Re-engagement", trigger: "Stage Change", steps: 2, enrolled: 30, completed: 12, dropped: 8, active: true },
  { id: 3, name: "Trial Nurture", trigger: "Date", steps: 5, enrolled: 80, completed: 35, dropped: 10, active: false },
];

type Step = { type: string; delay: number; template: string };

const STEP_TYPES = ["Email", "SMS", "WhatsApp"];
const TRIGGERS = ["New Lead", "Stage Change", "Date"];

export default function DripCampaignsPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(0);
  const [campaign, setCampaign] = useState({ name: "", trigger: "New Lead", audience: "All Leads" });
  const [steps, setSteps] = useState<Step[]>([{ type: "Email", delay: 0, template: "" }]);

  const { data: campaigns = [] } = useQuery<any[]>({
    queryKey: ["crm-drip-campaigns"],
    queryFn: () => api("GET", "/api/crm/drip-campaigns").catch(() => []),
  });

  const createMutation = useMutation({
    mutationFn: (payload: any) => api("POST", "/api/crm/drip-campaigns", payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["crm-drip-campaigns"] }); setOpen(false); setWizardStep(0); },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) =>
      api("PUT", `/api/crm/drip-campaigns/${id}`, { active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["crm-drip-campaigns"] }),
  });

  const rows = campaigns.length ? campaigns : SAMPLE;

  const addStep = () => setSteps(s => [...s, { type: "Email", delay: 2, template: "" }]);
  const removeStep = (i: number) => setSteps(s => s.filter((_, idx) => idx !== i));
  const updateStep = (i: number, field: keyof Step, value: string | number) =>
    setSteps(s => s.map((step, idx) => idx === i ? { ...step, [field]: value } : step));

  const WIZARD_STEPS = ["Trigger", "Steps", "Audience", "Review"];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Drip Campaign Automation</h1>
        <Button onClick={() => { setOpen(true); setWizardStep(0); }}>+ New Campaign</Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Campaigns</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Trigger</TableHead>
                <TableHead>Steps</TableHead>
                <TableHead>Enrolled</TableHead>
                <TableHead>Completed</TableHead>
                <TableHead>Dropped</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((c: any) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell>{c.trigger}</TableCell>
                  <TableCell>{c.steps}</TableCell>
                  <TableCell>{c.enrolled}</TableCell>
                  <TableCell className="text-green-600">{c.completed}</TableCell>
                  <TableCell className="text-red-500">{c.dropped}</TableCell>
                  <TableCell>
                    <Badge variant={c.active ? "default" : "secondary"}>{c.active ? "Active" : "Paused"}</Badge>
                  </TableCell>
                  <TableCell>
                    <Button size="sm" variant="outline"
                      onClick={() => toggleMutation.mutate({ id: c.id, active: !c.active })}>
                      {c.active ? "Pause" : "Resume"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>New Campaign — {WIZARD_STEPS[wizardStep]}</DialogTitle>
          </DialogHeader>

          {/* Wizard progress */}
          <div className="flex gap-1 mb-4">
            {WIZARD_STEPS.map((s, i) => (
              <div key={s} className={`flex-1 h-1 rounded ${i <= wizardStep ? "bg-primary" : "bg-muted"}`} />
            ))}
          </div>

          {wizardStep === 0 && (
            <div className="space-y-3">
              <div><Label>Campaign Name</Label><Input value={campaign.name} onChange={e => setCampaign(c => ({ ...c, name: e.target.value }))} /></div>
              <div>
                <Label>Trigger</Label>
                <Select value={campaign.trigger} onValueChange={v => setCampaign(c => ({ ...c, trigger: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TRIGGERS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          )}

          {wizardStep === 1 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                {steps.map((step, i) => (
                  <div key={i} className="flex items-center gap-1">
                    <div className="border rounded p-2 text-sm min-w-[120px]">
                      <Select value={step.type} onValueChange={v => updateStep(i, "type", v)}>
                        <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>{STEP_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                      </Select>
                      <Input placeholder="Template" className="h-7 mt-1 text-xs" value={step.template}
                        onChange={e => updateStep(i, "template", e.target.value)} />
                      {i > 0 && <div className="text-xs text-muted-foreground mt-1">
                        After {step.delay}d
                        <Input type="number" className="h-6 w-12 inline ml-1 text-xs" value={step.delay}
                          onChange={e => updateStep(i, "delay", Number(e.target.value))} />
                      </div>}
                    </div>
                    <button onClick={() => removeStep(i)} className="text-destructive"><Trash2 className="w-3 h-3" /></button>
                    {i < steps.length - 1 && <ArrowRight className="w-4 h-4 text-muted-foreground" />}
                  </div>
                ))}
                <Button size="sm" variant="outline" onClick={addStep}><Plus className="w-3 h-3 mr-1" />Add Step</Button>
              </div>
            </div>
          )}

          {wizardStep === 2 && (
            <div className="space-y-3">
              <div>
                <Label>Audience</Label>
                <Select value={campaign.audience} onValueChange={v => setCampaign(c => ({ ...c, audience: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["All Leads", "Hot Leads Only", "Cold Leads", "Specific Segment"].map(a => (
                      <SelectItem key={a} value={a}>{a}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {wizardStep === 3 && (
            <div className="space-y-2 text-sm">
              <div><strong>Name:</strong> {campaign.name}</div>
              <div><strong>Trigger:</strong> {campaign.trigger}</div>
              <div><strong>Audience:</strong> {campaign.audience}</div>
              <div><strong>Steps:</strong> {steps.length} steps</div>
              <div className="flex gap-1 items-center flex-wrap mt-2">
                {steps.map((s, i) => (
                  <div key={i} className="flex items-center gap-1">
                    <Badge variant="outline">{s.type}</Badge>
                    {i < steps.length - 1 && <span className="text-muted-foreground text-xs">→ {s.delay}d →</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-between mt-4">
            <Button variant="outline" onClick={() => wizardStep > 0 ? setWizardStep(s => s - 1) : setOpen(false)}>
              {wizardStep > 0 ? "Back" : "Cancel"}
            </Button>
            {wizardStep < 3 ? (
              <Button onClick={() => setWizardStep(s => s + 1)}>Next</Button>
            ) : (
              <Button onClick={() => createMutation.mutate({ ...campaign, steps, active: true })}>Launch Campaign</Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
