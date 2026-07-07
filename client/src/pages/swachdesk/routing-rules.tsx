import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, ChevronUp, ChevronDown, Play, Settings2 } from "lucide-react";

interface Condition { field: string; operator: string; value: string; }
interface Actions { assign_agent_id?: number; assign_team?: string; set_priority?: string; set_category?: string; add_tag?: string; send_auto_reply?: string; }

const FIELDS = ["subject", "description", "channel", "priority"];
const OPERATORS = ["contains", "equals", "starts_with"];

function ConditionBuilder({ conditions, onChange }: { conditions: Condition[]; onChange: (c: Condition[]) => void }) {
  function update(i: number, key: keyof Condition, val: string) {
    const next = conditions.map((c, idx) => idx === i ? { ...c, [key]: val } : c);
    onChange(next);
  }
  function addCond() { onChange([...conditions, { field: "subject", operator: "contains", value: "" }]); }
  function removeCond(i: number) { onChange(conditions.filter((_, idx) => idx !== i)); }

  return (
    <div className="space-y-2">
      {conditions.map((c, i) => (
        <div key={i} className="flex items-center gap-2">
          <Select value={c.field} onValueChange={v => update(i, "field", v)}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>{FIELDS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={c.operator} onValueChange={v => update(i, "operator", v)}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>{OPERATORS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
          </Select>
          <Input className="flex-1" value={c.value} onChange={e => update(i, "value", e.target.value)} placeholder="Value..." />
          <Button size="icon" variant="ghost" onClick={() => removeCond(i)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={addCond}><Plus className="w-3 h-3 mr-1" />Add Condition</Button>
    </div>
  );
}

function ActionsEditor({ actions, onChange }: { actions: Actions; onChange: (a: Actions) => void }) {
  function set(key: keyof Actions, val: string) { onChange({ ...actions, [key]: val || undefined }); }
  return (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <Label className="text-xs">Assign Team</Label>
        <Input value={actions.assign_team || ""} onChange={e => set("assign_team", e.target.value)} placeholder="e.g. billing" />
      </div>
      <div>
        <Label className="text-xs">Set Priority</Label>
        <Select value={actions.set_priority || ""} onValueChange={v => set("set_priority", v)}>
          <SelectTrigger><SelectValue placeholder="No change" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">No change</SelectItem>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-xs">Set Category</Label>
        <Input value={actions.set_category || ""} onChange={e => set("set_category", e.target.value)} placeholder="e.g. billing" />
      </div>
      <div>
        <Label className="text-xs">Add Tag</Label>
        <Input value={actions.add_tag || ""} onChange={e => set("add_tag", e.target.value)} placeholder="e.g. urgent" />
      </div>
      <div className="col-span-2">
        <Label className="text-xs">Auto-reply message</Label>
        <Input value={actions.send_auto_reply || ""} onChange={e => set("send_auto_reply", e.target.value)} placeholder="Auto-reply text..." />
      </div>
    </div>
  );
}

export default function RoutingRulesPage() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [editingRule, setEditingRule] = useState<any>(null);
  const [form, setForm] = useState({ name: "", priority: 10, conditions: [] as Condition[], actions: {} as Actions, is_active: true });
  const [showTest, setShowTest] = useState(false);
  const [testInput, setTestInput] = useState({ subject: "", description: "", channel: "portal", priority: "medium" });
  const [testResult, setTestResult] = useState<any>(null);

  const { data: rules = [] } = useQuery<any[]>({
    queryKey: ["/api/desk/routing-rules"],
    queryFn: async () => (await fetch("/api/desk/routing-rules")).json(),
  });

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const url = editingRule ? `/api/desk/routing-rules/${editingRule.id}` : "/api/desk/routing-rules";
      const method = editingRule ? "PUT" : "POST";
      const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    onSuccess: () => { toast({ title: "Rule saved" }); setShowForm(false); setEditingRule(null); resetForm(); qc.invalidateQueries({ queryKey: ["/api/desk/routing-rules"] }); },
    onError: () => toast({ title: "Error", variant: "destructive" }),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: number; is_active: boolean }) => {
      const r = await fetch(`/api/desk/routing-rules/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ is_active }) });
      return r.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/desk/routing-rules"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => fetch(`/api/desk/routing-rules/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/desk/routing-rules"] }),
  });

  const moveMutation = useMutation({
    mutationFn: async ({ id, priority }: { id: number; priority: number }) => {
      await fetch(`/api/desk/routing-rules/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ priority }) });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/desk/routing-rules"] }),
  });

  function resetForm() {
    setForm({ name: "", priority: 10, conditions: [], actions: {}, is_active: true });
  }

  function openEdit(rule: any) {
    setEditingRule(rule);
    setForm({
      name: rule.name,
      priority: rule.priority,
      conditions: Array.isArray(rule.conditions) ? rule.conditions : [],
      actions: rule.actions || {},
      is_active: rule.is_active,
    });
    setShowForm(true);
  }

  function conditionsSummary(conditions: Condition[]): string {
    if (!Array.isArray(conditions) || conditions.length === 0) return "No conditions";
    return conditions.map(c => `${c.field} ${c.operator} "${c.value}"`).join(" AND ");
  }

  function actionsSummary(actions: Actions): string {
    const parts: string[] = [];
    if (actions.assign_team) parts.push(`Team: ${actions.assign_team}`);
    if (actions.set_priority) parts.push(`Priority: ${actions.set_priority}`);
    if (actions.set_category) parts.push(`Category: ${actions.set_category}`);
    if (actions.add_tag) parts.push(`Tag: ${actions.add_tag}`);
    if (actions.send_auto_reply) parts.push("Auto-reply");
    return parts.length ? parts.join(", ") : "No actions";
  }

  async function runTest() {
    const r = await fetch("/api/desk/routing-rules/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(testInput),
    });
    const data = await r.json();
    setTestResult(data);
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Auto-Routing Rules</h1>
          <p className="text-muted-foreground text-sm">Keyword-based ticket routing without AI dependencies</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowTest(true)}><Play className="w-4 h-4 mr-2" />Test Rules</Button>
          <Button onClick={() => { setEditingRule(null); resetForm(); setShowForm(true); }}><Plus className="w-4 h-4 mr-2" />Add Rule</Button>
        </div>
      </div>

      {/* Rules list */}
      <div className="space-y-3">
        {(rules as any[]).length === 0 ? (
          <div className="text-center py-12 text-muted-foreground border rounded-lg">
            <Settings2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
            No routing rules yet. Click "Add Rule" to get started.
          </div>
        ) : (rules as any[]).map((rule: any, idx: number) => (
          <div key={rule.id} className="border rounded-lg p-4 bg-white space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="text-xs font-mono bg-muted px-2 py-0.5 rounded">P{rule.priority}</div>
                <span className="font-semibold">{rule.name}</span>
                <Badge className={rule.is_active ? "bg-green-100 text-green-800 text-xs" : "bg-gray-100 text-gray-600 text-xs"}>
                  {rule.is_active ? "Active" : "Inactive"}
                </Badge>
                <span className="text-xs text-muted-foreground">{rule.match_count || 0} matches</span>
              </div>
              <div className="flex items-center gap-2">
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => moveMutation.mutate({ id: rule.id, priority: Math.max(1, rule.priority - 1) })} disabled={idx === 0}><ChevronUp className="w-3 h-3" /></Button>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => moveMutation.mutate({ id: rule.id, priority: rule.priority + 1 })} disabled={idx === (rules as any[]).length - 1}><ChevronDown className="w-3 h-3" /></Button>
                <Switch checked={rule.is_active} onCheckedChange={v => toggleMutation.mutate({ id: rule.id, is_active: v })} />
                <Button size="sm" variant="outline" onClick={() => openEdit(rule)}>Edit</Button>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => { if (confirm("Delete?")) deleteMutation.mutate(rule.id); }}><Trash2 className="w-4 h-4" /></Button>
              </div>
            </div>
            <div className="text-sm text-muted-foreground space-y-1">
              <div><span className="font-medium text-foreground">If: </span>{conditionsSummary(rule.conditions)}</div>
              <div><span className="font-medium text-foreground">Then: </span>{actionsSummary(rule.actions)}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Rule Form Dialog */}
      <Dialog open={showForm} onOpenChange={v => { setShowForm(v); if (!v) { setEditingRule(null); resetForm(); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingRule ? "Edit Rule" : "New Routing Rule"}</DialogTitle></DialogHeader>
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Rule Name *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
              <div><Label>Priority (lower = higher priority)</Label><Input type="number" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: parseInt(e.target.value) || 10 }))} /></div>
            </div>
            <div>
              <Label className="mb-2 block">Conditions (ALL must match)</Label>
              <ConditionBuilder conditions={form.conditions} onChange={c => setForm(f => ({ ...f, conditions: c }))} />
            </div>
            <div>
              <Label className="mb-2 block">Actions to apply</Label>
              <ActionsEditor actions={form.actions} onChange={a => setForm(f => ({ ...f, actions: a }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowForm(false); setEditingRule(null); resetForm(); }}>Cancel</Button>
            <Button onClick={() => saveMutation.mutate(form)} disabled={!form.name || form.conditions.length === 0 || saveMutation.isPending}>
              {saveMutation.isPending ? "Saving..." : "Save Rule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Test Dialog */}
      <Dialog open={showTest} onOpenChange={setShowTest}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Test Routing Rules</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Subject</Label><Input value={testInput.subject} onChange={e => setTestInput(f => ({ ...f, subject: e.target.value }))} /></div>
            <div><Label>Description</Label><Input value={testInput.description} onChange={e => setTestInput(f => ({ ...f, description: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Channel</Label>
                <Select value={testInput.channel} onValueChange={v => setTestInput(f => ({ ...f, channel: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["portal", "email", "phone", "whatsapp", "chat"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Priority</Label>
                <Select value={testInput.priority} onValueChange={v => setTestInput(f => ({ ...f, priority: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["low", "medium", "high", "critical"].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {testResult && (
              <div className="border rounded-lg p-3 bg-muted/30">
                <p className="text-sm font-medium mb-2">Matched rules ({testResult.matched?.length || 0}):</p>
                {testResult.matched?.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No rules matched</p>
                ) : testResult.matched?.map((m: any) => (
                  <div key={m.rule_id} className="text-sm">
                    <span className="font-medium">{m.rule_name}</span>: {JSON.stringify(m.actions)}
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTest(false)}>Close</Button>
            <Button onClick={runTest}><Play className="w-4 h-4 mr-1" />Run Test</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
