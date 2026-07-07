import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Play, Edit, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const api = (method: string, path: string, body?: unknown) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then(r => r.json());

interface JournalLine {
  account_code: string;
  account_name: string;
  debit: string;
  credit: string;
  description: string;
}

interface RecurringJournal {
  id: number;
  name: string;
  description: string;
  frequency: string;
  day_of_month: number;
  next_run: string;
  last_run: string;
  auto_post: boolean;
  status: "active" | "inactive";
  lines: JournalLine[];
}

interface RunHistory {
  id: number;
  run_date: string;
  status: string;
  journal_entry_id: number;
}

const EMPTY_LINE: JournalLine = { account_code: "", account_name: "", debit: "", credit: "", description: "" };

export default function RecurringJournalsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [historyJournalId, setHistoryJournalId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: "", description: "", frequency: "Monthly", day_of_month: "1", auto_post: false, lines: [{ ...EMPTY_LINE }] });

  const { data: journals = [] } = useQuery<RecurringJournal[]>({
    queryKey: ["recurring-journals"],
    queryFn: () => api("GET", "/api/finance/recurring-journals"),
  });

  const { data: history = [] } = useQuery<RunHistory[]>({
    queryKey: ["recurring-journal-history", historyJournalId],
    queryFn: () => api("GET", `/api/finance/recurring-journals/${historyJournalId}/history`),
    enabled: !!historyJournalId,
  });

  const createMut = useMutation({
    mutationFn: (body: unknown) => api("POST", "/api/finance/recurring-journals", body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["recurring-journals"] }); setFormOpen(false); toast({ title: "Template created" }); },
    onError: () => toast({ title: "Failed to create", variant: "destructive" }),
  });

  const runNowMut = useMutation({
    mutationFn: (id: number) => api("POST", `/api/finance/recurring-journals/${id}/run-now`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["recurring-journals"] }); toast({ title: "Journal run successfully" }); },
    onError: () => toast({ title: "Run failed", variant: "destructive" }),
  });

  const processAllMut = useMutation({
    mutationFn: () => api("POST", "/api/finance/recurring-journals/process-due"),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["recurring-journals"] }); toast({ title: "All due journals processed" }); },
    onError: () => toast({ title: "Process failed", variant: "destructive" }),
  });

  const addLine = () => setForm(f => ({ ...f, lines: [...f.lines, { ...EMPTY_LINE }] }));
  const removeLine = (i: number) => setForm(f => ({ ...f, lines: f.lines.filter((_, idx) => idx !== i) }));
  const updateLine = (i: number, field: keyof JournalLine, val: string) =>
    setForm(f => ({ ...f, lines: f.lines.map((l, idx) => idx === i ? { ...l, [field]: val } : l) }));

  const handleSave = () => {
    createMut.mutate({ ...form, day_of_month: parseInt(form.day_of_month) });
  };

  const resetForm = () => setForm({ name: "", description: "", frequency: "Monthly", day_of_month: "1", auto_post: false, lines: [{ ...EMPTY_LINE }] });

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Recurring Journals</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => processAllMut.mutate()} disabled={processAllMut.isPending}>
            Process All Due
          </Button>
          <Button onClick={() => { resetForm(); setFormOpen(true); }}>
            <Plus className="h-4 w-4 mr-1" /> Create Template
          </Button>
        </div>
      </div>

      <Tabs defaultValue="templates">
        <TabsList>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          {historyJournalId && <TabsTrigger value="history">Run History</TabsTrigger>}
        </TabsList>

        <TabsContent value="templates">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Frequency</TableHead>
                    <TableHead>Day</TableHead>
                    <TableHead>Next Run</TableHead>
                    <TableHead>Last Run</TableHead>
                    <TableHead>Mode</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {journals.length === 0 && (
                    <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No recurring journals configured</TableCell></TableRow>
                  )}
                  {journals.map(j => (
                    <TableRow key={j.id}>
                      <TableCell className="font-medium">{j.name}</TableCell>
                      <TableCell>{j.frequency}</TableCell>
                      <TableCell>{j.day_of_month}</TableCell>
                      <TableCell>{j.next_run ? new Date(j.next_run).toLocaleDateString() : "—"}</TableCell>
                      <TableCell>{j.last_run ? new Date(j.last_run).toLocaleDateString() : "—"}</TableCell>
                      <TableCell><Badge variant="outline">{j.auto_post ? "Auto Post" : "Draft"}</Badge></TableCell>
                      <TableCell>
                        <Badge variant={j.status === "active" ? "default" : "secondary"}>{j.status}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" onClick={() => runNowMut.mutate(j.id)} disabled={runNowMut.isPending}>
                            <Play className="h-3 w-3 mr-1" /> Run
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setHistoryJournalId(j.id)}>History</Button>
                          <Button size="sm" variant="ghost"><Edit className="h-3 w-3" /></Button>
                          <Button size="sm" variant="ghost"><XCircle className="h-3 w-3" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {historyJournalId && (
          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>Run History — Journal #{historyJournalId}</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Run Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Journal Entry</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.length === 0 && (
                      <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-6">No history yet</TableCell></TableRow>
                    )}
                    {history.map(h => (
                      <TableRow key={h.id}>
                        <TableCell>{new Date(h.run_date).toLocaleDateString()}</TableCell>
                        <TableCell><Badge>{h.status}</Badge></TableCell>
                        <TableCell>{h.journal_entry_id || "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Create Recurring Journal Template</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Name</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Monthly Depreciation" />
              </div>
              <div className="space-y-1">
                <Label>Frequency</Label>
                <Select value={form.frequency} onValueChange={v => setForm(f => ({ ...f, frequency: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["Weekly", "Monthly", "Quarterly", "Yearly"].map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Day of Month (1-28)</Label>
                <Input type="number" min={1} max={28} value={form.day_of_month} onChange={e => setForm(f => ({ ...f, day_of_month: e.target.value }))} />
              </div>
              <div className="space-y-1 flex items-center gap-3 pt-5">
                <Switch checked={form.auto_post} onCheckedChange={v => setForm(f => ({ ...f, auto_post: v }))} />
                <Label>{form.auto_post ? "Auto Post" : "Create as Draft"}</Label>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Journal Lines</Label>
                <Button size="sm" variant="outline" onClick={addLine}><Plus className="h-3 w-3 mr-1" /> Add Line</Button>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account Code</TableHead>
                    <TableHead>Account Name</TableHead>
                    <TableHead>Debit (₹)</TableHead>
                    <TableHead>Credit (₹)</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {form.lines.map((line, i) => (
                    <TableRow key={i}>
                      <TableCell><Input value={line.account_code} onChange={e => updateLine(i, "account_code", e.target.value)} placeholder="1001" /></TableCell>
                      <TableCell><Input value={line.account_name} onChange={e => updateLine(i, "account_name", e.target.value)} placeholder="Account name" /></TableCell>
                      <TableCell><Input type="number" value={line.debit} onChange={e => updateLine(i, "debit", e.target.value)} placeholder="0" /></TableCell>
                      <TableCell><Input type="number" value={line.credit} onChange={e => updateLine(i, "credit", e.target.value)} placeholder="0" /></TableCell>
                      <TableCell><Input value={line.description} onChange={e => updateLine(i, "description", e.target.value)} /></TableCell>
                      <TableCell><Button size="sm" variant="ghost" onClick={() => removeLine(i)}><Trash2 className="h-3 w-3" /></Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={createMut.isPending}>Save Template</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
