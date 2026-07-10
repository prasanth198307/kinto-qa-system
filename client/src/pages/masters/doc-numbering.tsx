// Controls auto-numbering for invoices, KOTs, purchase orders, etc.
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, X, Check } from "lucide-react";

const api = (m: string, u: string, b?: any) =>
  fetch(u, { method: m, headers: { "Content-Type": "application/json" }, body: b ? JSON.stringify(b) : undefined, credentials: "include" }).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); });

type DocNum = { id: number; doc_type: string; prefix: string; suffix?: string; current_number: number; padding?: number; reset_period?: string };
const empty: Omit<DocNum, "id"> = { doc_type: "", prefix: "", suffix: "", current_number: 1, padding: 4, reset_period: "never" };

function preview(r: Pick<DocNum, "prefix" | "current_number" | "suffix" | "padding">) {
  const num = String(r.current_number).padStart(r.padding ?? 4, "0");
  return `${r.prefix}${num}${r.suffix ?? ""}`;
}

export default function DocNumberingPage() {
  const [editing, setEditing] = useState<DocNum | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<Omit<DocNum, "id">>(empty);
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data } = useQuery({ queryKey: ["/api/masters/doc-numbering"], queryFn: () => api("GET", "/api/masters/doc-numbering") });
  const rows: DocNum[] = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];

  const save = useMutation({
    mutationFn: (v: any) => editing ? api("PUT", `/api/masters/doc-numbering/${editing.id}`, v) : api("POST", "/api/masters/doc-numbering", v),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/masters/doc-numbering"] }); setEditing(null); setAdding(false); setForm(empty); toast({ title: "Saved" }); },
    onError: () => toast({ title: "Error", variant: "destructive" }),
  });

  const startEdit = (r: DocNum) => { setEditing(r); setForm({ doc_type: r.doc_type, prefix: r.prefix, suffix: r.suffix ?? "", current_number: r.current_number, padding: r.padding ?? 4, reset_period: r.reset_period ?? "never" }); setAdding(false); };
  const cancel = () => { setEditing(null); setAdding(false); setForm(empty); };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Document Numbering</h1>
          <p className="text-sm text-muted-foreground mt-1">Controls auto-numbering for invoices, KOTs, purchase orders, etc.</p>
        </div>
        <Button onClick={() => { setAdding(true); setEditing(null); setForm(empty); }}><Plus className="w-4 h-4 mr-2" />Add Config</Button>
      </div>

      {(adding || editing) && (
        <Card>
          <CardHeader><CardTitle>{editing ? "Edit Doc Numbering" : "Add Doc Numbering"}</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div><label className="text-sm font-medium">Doc Type *</label><Input value={form.doc_type} onChange={e => setForm(p => ({ ...p, doc_type: e.target.value }))} placeholder="e.g. INVOICE" /></div>
              <div><label className="text-sm font-medium">Prefix</label><Input value={form.prefix} onChange={e => setForm(p => ({ ...p, prefix: e.target.value }))} placeholder="e.g. INV-" /></div>
              <div><label className="text-sm font-medium">Suffix</label><Input value={form.suffix} onChange={e => setForm(p => ({ ...p, suffix: e.target.value }))} /></div>
              <div><label className="text-sm font-medium">Current Number</label><Input type="number" value={form.current_number} onChange={e => setForm(p => ({ ...p, current_number: parseInt(e.target.value) || 1 }))} /></div>
              <div><label className="text-sm font-medium">Padding (digits)</label><Input type="number" value={form.padding} onChange={e => setForm(p => ({ ...p, padding: parseInt(e.target.value) || 4 }))} /></div>
              <div><label className="text-sm font-medium">Reset Period</label>
                <select className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm" value={form.reset_period} onChange={e => setForm(p => ({ ...p, reset_period: e.target.value }))}>
                  <option value="never">Never</option><option value="yearly">Yearly</option><option value="monthly">Monthly</option>
                </select>
              </div>
              <div className="col-span-3"><label className="text-sm font-medium">Preview</label><div className="font-mono text-lg p-2 bg-muted rounded">{preview(form)}</div></div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button onClick={() => save.mutate(form)} disabled={save.isPending}><Check className="w-4 h-4 mr-1" />Save</Button>
              <Button variant="outline" onClick={cancel}><X className="w-4 h-4 mr-1" />Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="text-left p-3 font-medium">Doc Type</th>
                <th className="text-left p-3 font-medium">Prefix</th>
                <th className="text-left p-3 font-medium">Current #</th>
                <th className="text-left p-3 font-medium">Preview</th>
                <th className="text-left p-3 font-medium">Reset</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No document numbering configs found</td></tr>}
              {rows.map(r => (
                <tr key={r.id} className="border-b hover:bg-muted/30">
                  <td className="p-3 font-medium">{r.doc_type}</td>
                  <td className="p-3 font-mono">{r.prefix}</td>
                  <td className="p-3">{r.current_number}</td>
                  <td className="p-3 font-mono text-blue-600">{preview(r)}</td>
                  <td className="p-3 capitalize">{r.reset_period ?? "never"}</td>
                  <td className="p-3"><Button size="sm" variant="ghost" onClick={() => startEdit(r)}><Pencil className="w-3 h-3" /></Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
