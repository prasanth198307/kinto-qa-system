// Used by all modules for order confirmations, OTPs, campaigns.
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

type EmailTemplate = { id: number; name: string; subject: string; body: string; template_type?: string; variables?: string[]; is_active?: boolean };
const empty: Omit<EmailTemplate, "id"> = { name: "", subject: "", body: "", template_type: "", variables: [], is_active: true };

export default function EmailTemplatesPage() {
  const [editing, setEditing] = useState<EmailTemplate | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<Omit<EmailTemplate, "id">>(empty);
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data } = useQuery({ queryKey: ["/api/masters/email-templates"], queryFn: () => api("GET", "/api/masters/email-templates") });
  const rows: EmailTemplate[] = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];

  const save = useMutation({
    mutationFn: (v: any) => editing ? api("PUT", `/api/masters/email-templates/${editing.id}`, v) : api("POST", "/api/masters/email-templates", v),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/masters/email-templates"] }); setEditing(null); setAdding(false); setForm(empty); toast({ title: "Saved" }); },
    onError: () => toast({ title: "Error", variant: "destructive" }),
  });

  const startEdit = (r: EmailTemplate) => {
    setEditing(r);
    setForm({ name: r.name, subject: r.subject, body: r.body, template_type: r.template_type ?? "", variables: r.variables ?? [], is_active: r.is_active ?? true });
    setAdding(false);
  };
  const cancel = () => { setEditing(null); setAdding(false); setForm(empty); };

  const vars: string[] = Array.isArray(form.variables) ? form.variables : [];

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Email Templates</h1>
          <p className="text-sm text-muted-foreground mt-1">Used by all modules for order confirmations, OTPs, campaigns.</p>
        </div>
        <Button onClick={() => { setAdding(true); setEditing(null); setForm(empty); }}><Plus className="w-4 h-4 mr-2" />Add Template</Button>
      </div>

      {(adding || editing) && (
        <Card>
          <CardHeader><CardTitle>{editing ? "Edit Email Template" : "Add Email Template"}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-sm font-medium">Name *</label><Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
              <div><label className="text-sm font-medium">Type</label><Input value={form.template_type} onChange={e => setForm(p => ({ ...p, template_type: e.target.value }))} placeholder="e.g. order_confirmation" /></div>
              <div className="col-span-2"><label className="text-sm font-medium">Subject *</label><Input value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))} /></div>
            </div>
            <div><label className="text-sm font-medium">Body *</label>
              <textarea className="flex min-h-32 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1" value={form.body} onChange={e => setForm(p => ({ ...p, body: e.target.value }))} />
            </div>
            {vars.length > 0 && (
              <div><label className="text-sm font-medium">Available Variables</label>
                <div className="flex flex-wrap gap-1 mt-1">{vars.map(v => <Badge key={v} variant="secondary">{"{{" + v + "}}"}</Badge>)}</div>
              </div>
            )}
            <div className="flex gap-2">
              <Button onClick={() => save.mutate(form)} disabled={save.isPending}><Check className="w-4 h-4 mr-1" />Save</Button>
              <Button variant="outline" onClick={cancel}><X className="w-4 h-4 mr-1" />Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3">
        {rows.length === 0 && <p className="text-center text-muted-foreground py-8">No email templates found</p>}
        {rows.map(r => (
          <Card key={r.id} className="hover:shadow-sm transition-shadow">
            <CardContent className="p-4 flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium">{r.name}</span>
                  {r.template_type && <Badge variant="outline">{r.template_type}</Badge>}
                  <Badge variant={r.is_active !== false ? "default" : "secondary"}>{r.is_active !== false ? "Active" : "Inactive"}</Badge>
                </div>
                <p className="text-sm text-muted-foreground truncate">Subject: {r.subject}</p>
                {Array.isArray(r.variables) && r.variables.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">{r.variables.map((v: string) => <Badge key={v} variant="secondary" className="text-xs">{"{{" + v + "}}"}</Badge>)}</div>
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
