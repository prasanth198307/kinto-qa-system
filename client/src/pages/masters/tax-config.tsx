// Tax config drives GST rates across all modules. Restaurant uses this for menu item tax,
// pharmacy for drug GST.
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, X, Check } from "lucide-react";

const api = (m: string, u: string, b?: any) =>
  fetch(u, { method: m, headers: { "Content-Type": "application/json" }, body: b ? JSON.stringify(b) : undefined, credentials: "include" }).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); });

type TaxConfig = { id: number; name: string; tax_type: string; rate: number; is_active?: boolean };
const empty: Omit<TaxConfig, "id"> = { name: "", tax_type: "GST", rate: 0, is_active: true };

export default function TaxConfigPage() {
  const [editing, setEditing] = useState<TaxConfig | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<Omit<TaxConfig, "id">>(empty);
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data } = useQuery({ queryKey: ["/api/masters/tax-config"], queryFn: () => api("GET", "/api/masters/tax-config") });
  const rows: TaxConfig[] = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];

  const save = useMutation({
    mutationFn: (v: any) => editing ? api("PUT", `/api/masters/tax-config/${editing.id}`, v) : api("POST", "/api/masters/tax-config", v),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/masters/tax-config"] }); setEditing(null); setAdding(false); setForm(empty); toast({ title: "Saved" }); },
    onError: () => toast({ title: "Error", variant: "destructive" }),
  });

  const del = useMutation({
    mutationFn: (id: number) => api("DELETE", `/api/masters/tax-config/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/masters/tax-config"] }); toast({ title: "Deleted" }); },
    onError: () => toast({ title: "Error", variant: "destructive" }),
  });

  const startEdit = (r: TaxConfig) => { setEditing(r); setForm({ name: r.name, tax_type: r.tax_type, rate: r.rate, is_active: r.is_active ?? true }); setAdding(false); };
  const cancel = () => { setEditing(null); setAdding(false); setForm(empty); };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tax Configuration</h1>
          <p className="text-sm text-muted-foreground mt-1">Tax config drives GST rates across all modules. Restaurant uses this for menu item tax, pharmacy for drug GST.</p>
        </div>
        <Button onClick={() => { setAdding(true); setEditing(null); setForm(empty); }}><Plus className="w-4 h-4 mr-2" />Add Tax Slab</Button>
      </div>

      {(adding || editing) && (
        <Card>
          <CardHeader><CardTitle>{editing ? "Edit Tax Slab" : "Add Tax Slab"}</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              <div><label className="text-sm font-medium">Name *</label><Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. GST 18%" /></div>
              <div><label className="text-sm font-medium">Type</label>
                <select className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm" value={form.tax_type} onChange={e => setForm(p => ({ ...p, tax_type: e.target.value }))}>
                  <option value="GST">GST</option><option value="IGST">IGST</option><option value="CESS">CESS</option><option value="VAT">VAT</option><option value="TDS">TDS</option>
                </select>
              </div>
              <div><label className="text-sm font-medium">Rate (%)</label><Input type="number" step="0.01" value={form.rate} onChange={e => setForm(p => ({ ...p, rate: parseFloat(e.target.value) || 0 }))} /></div>
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
                <th className="text-left p-3 font-medium">Name</th>
                <th className="text-left p-3 font-medium">Type</th>
                <th className="text-left p-3 font-medium">Rate</th>
                <th className="text-left p-3 font-medium">Status</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">No tax slabs configured</td></tr>}
              {rows.map(r => (
                <tr key={r.id} className="border-b hover:bg-muted/30">
                  <td className="p-3 font-medium">{r.name}</td>
                  <td className="p-3"><Badge variant="outline">{r.tax_type}</Badge></td>
                  <td className="p-3 font-mono">{r.rate}%</td>
                  <td className="p-3"><Badge variant={r.is_active !== false ? "default" : "secondary"}>{r.is_active !== false ? "Active" : "Inactive"}</Badge></td>
                  <td className="p-3 flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => startEdit(r)}><Pencil className="w-3 h-3" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => del.mutate(r.id)}><Trash2 className="w-3 h-3 text-red-500" /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
