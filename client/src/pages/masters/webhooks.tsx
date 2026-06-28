import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";

const api = (m: string, u: string, b?: any) =>
  fetch(u, { method: m, headers: { "Content-Type": "application/json" }, body: b ? JSON.stringify(b) : undefined, credentials: "include" }).then(r => r.json());
const fmt = (n: any) => Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

const WEBHOOK_EVENTS = ["invoice.created","payment.received","order.placed","shipment.dispatched","return.initiated","stock.low","user.created"];
const EMPTY = { url: "", events: [] as string[], secret: "" };

export default function MastersWebhooksPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [testResults, setTestResults] = useState<Record<string, any>>({});

  const { data: webhooks = [] } = useQuery({ queryKey: ["/api/masters/webhooks"], queryFn: () => api("GET", "/api/masters/webhooks") });

  const addMutation = useMutation({
    mutationFn: (b: any) => api("POST", "/api/masters/webhooks", b),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/masters/webhooks"] }); toast({ title: "Webhook added" }); setShowForm(false); setForm(EMPTY); },
  });

  const testMutation = useMutation({
    mutationFn: (id: string) => api("PUT", `/api/masters/webhooks/${id}/test`),
    onSuccess: (data, id) => { setTestResults(r => ({ ...r, [id]: data })); toast({ title: "Test sent" }); },
  });

  const toggleEvent = (ev: string) => setForm(f => ({
    ...f,
    events: f.events.includes(ev) ? f.events.filter(e => e !== ev) : [...f.events, ev],
  }));

  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Webhooks</h1>
        <Button onClick={() => setShowForm(s => !s)}>Add Webhook</Button>
      </div>
      {showForm && (
        <Card>
          <CardHeader><CardTitle>Add Webhook</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder="Webhook URL" value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} />
              <Input placeholder="Secret" type="password" value={form.secret} onChange={e => setForm(f => ({ ...f, secret: e.target.value }))} />
            </div>
            <div>
              <p className="text-sm font-medium mb-2">Events</p>
              <div className="flex flex-wrap gap-2">
                {WEBHOOK_EVENTS.map(ev => (
                  <label key={ev} className="flex items-center gap-1 text-sm cursor-pointer">
                    <input type="checkbox" checked={form.events.includes(ev)} onChange={() => toggleEvent(ev)} />
                    {ev}
                  </label>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => addMutation.mutate(form)}>Save</Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>URL</TableHead><TableHead>Events</TableHead><TableHead>Secret</TableHead>
              <TableHead>Status</TableHead><TableHead>Last Triggered</TableHead><TableHead>Last Status</TableHead><TableHead>Action</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {Array.isArray(webhooks) && webhooks.map((w: any) => (
                <TableRow key={w.id}>
                  <TableCell className="max-w-xs truncate">{w.url}</TableCell>
                  <TableCell className="max-w-xs">
                    <div className="flex flex-wrap gap-1">
                      {(Array.isArray(w.events) ? w.events : []).map((ev: string) => <Badge key={ev} variant="outline" className="text-xs">{ev}</Badge>)}
                    </div>
                  </TableCell>
                  <TableCell>{"•".repeat(8)}</TableCell>
                  <TableCell><Badge variant={w.status === "active" ? "default" : "secondary"}>{w.status}</Badge></TableCell>
                  <TableCell>{w.last_triggered?.slice(0,16)}</TableCell>
                  <TableCell>{w.last_status}</TableCell>
                  <TableCell>
                    <Button size="sm" variant="outline" onClick={() => testMutation.mutate(w.id)}>Test</Button>
                    {testResults[w.id] && <span className="ml-2 text-xs text-muted-foreground">{JSON.stringify(testResults[w.id])}</span>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
