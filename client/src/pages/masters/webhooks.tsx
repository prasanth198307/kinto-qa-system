// Outbound webhooks for order events, payment confirmations, etc.
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, X, Check } from "lucide-react";

const api = (m: string, u: string, b?: any) =>
  fetch(u, { method: m, headers: { "Content-Type": "application/json" }, body: b ? JSON.stringify(b) : undefined, credentials: "include" }).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); });

const EVENT_OPTIONS = ["order.created", "order.completed", "payment.success", "payment.failed", "delivery.started", "delivery.completed", "invoice.generated"];

type Webhook = { id: number; webhook_name: string; url: string; events?: string[]; secret_key?: string; is_active?: boolean };
const empty: Omit<Webhook, "id"> = { webhook_name: "", url: "", events: [], secret_key: "", is_active: true };

export default function WebhooksPage() {
  const [editing, setEditing] = useState<Webhook | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<Omit<Webhook, "id">>(empty);
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data } = useQuery({ queryKey: ["/api/masters/webhooks"], queryFn: () => api("GET", "/api/masters/webhooks") });
  const rows: Webhook[] = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];

  const save = useMutation({
    mutationFn: (v: any) => editing ? api("PUT", `/api/masters/webhooks/${editing.id}`, v) : api("POST", "/api/masters/webhooks", v),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/masters/webhooks"] }); setEditing(null); setAdding(false); setForm(empty); toast({ title: "Saved" }); },
    onError: () => toast({ title: "Error", variant: "destructive" }),
  });

  const startEdit = (r: Webhook) => { setEditing(r); setForm({ webhook_name: r.webhook_name, url: r.url, events: r.events ?? [], secret_key: r.secret_key ?? "", is_active: r.is_active ?? true }); setAdding(false); };
  const cancel = () => { setEditing(null); setAdding(false); setForm(empty); };
  const toggleEvent = (ev: string) => setForm(p => ({ ...p, events: (p.events ?? []).includes(ev) ? (p.events ?? []).filter(e => e !== ev) : [...(p.events ?? []), ev] }));

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Webhooks</h1>
          <p className="text-sm text-muted-foreground mt-1">Outbound webhooks for order events, payment confirmations, etc.</p>
        </div>
        <Button onClick={() => { setAdding(true); setEditing(null); setForm(empty); }}><Plus className="w-4 h-4 mr-2" />Add Webhook</Button>
      </div>

      {(adding || editing) && (
        <Card>
          <CardHeader><CardTitle>{editing ? "Edit Webhook" : "Add Webhook"}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-sm font-medium">Name *</label><Input value={form.webhook_name} onChange={e => setForm(p => ({ ...p, webhook_name: e.target.value }))} /></div>
              <div><label className="text-sm font-medium">Secret Key</label><Input type="password" value={form.secret_key} onChange={e => setForm(p => ({ ...p, secret_key: e.target.value }))} /></div>
              <div className="col-span-2"><label className="text-sm font-medium">URL *</label><Input value={form.url} onChange={e => setForm(p => ({ ...p, url: e.target.value }))} placeholder="https://..." /></div>
            </div>
            <div>
              <label className="text-sm font-medium">Events</label>
              <div className="flex flex-wrap gap-2 mt-2">
                {EVENT_OPTIONS.map(ev => (
                  <button key={ev} onClick={() => toggleEvent(ev)}
                    className={`px-2 py-1 text-xs rounded-full border transition-colors ${(form.events ?? []).includes(ev) ? "bg-primary text-primary-foreground border-primary" : "border-muted-foreground/30 hover:border-primary"}`}>
                    {ev}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => save.mutate(form)} disabled={save.isPending}><Check className="w-4 h-4 mr-1" />Save</Button>
              <Button variant="outline" onClick={cancel}><X className="w-4 h-4 mr-1" />Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3">
        {rows.length === 0 && <p className="text-center text-muted-foreground py-8">No webhooks configured</p>}
        {rows.map(r => (
          <Card key={r.id} className="hover:shadow-sm transition-shadow">
            <CardContent className="p-4 flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium">{r.webhook_name}</span>
                  <Badge variant={r.is_active !== false ? "default" : "secondary"}>{r.is_active !== false ? "Active" : "Inactive"}</Badge>
                </div>
                <p className="text-sm text-muted-foreground font-mono truncate">{r.url}</p>
                {Array.isArray(r.events) && r.events.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">{r.events.map((ev: string) => <Badge key={ev} variant="outline" className="text-xs">{ev}</Badge>)}</div>
                )}
              </div>
              <Button size="sm" variant="outline" onClick={() => startEdit(r)}><Pencil className="w-3 h-3 mr-1" />Edit</Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
