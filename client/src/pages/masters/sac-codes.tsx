// SAC codes apply to services (restaurant delivery charges, hotel room charges, etc.)
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, X, Check } from "lucide-react";

const api = (m: string, u: string, b?: any) =>
  fetch(u, { method: m, headers: { "Content-Type": "application/json" }, body: b ? JSON.stringify(b) : undefined, credentials: "include" }).then(r => r.json());

type SACCode = { id: number; sac_code: string; description: string; gst_rate: number; is_active?: boolean };
const empty: Omit<SACCode, "id"> = { sac_code: "", description: "", gst_rate: 0, is_active: true };

export default function SACCodesPage() {
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<SACCode | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<Omit<SACCode, "id">>(empty);
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data } = useQuery({ queryKey: ["/api/masters/sac-codes", search], queryFn: () => api("GET", `/api/masters/sac-codes?search=${encodeURIComponent(search)}`) });
  const rows: SACCode[] = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];

  const save = useMutation({
    mutationFn: (v: any) => editing ? api("PUT", `/api/masters/sac-codes/${editing.id}`, v) : api("POST", "/api/masters/sac-codes", v),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/masters/sac-codes"] }); setEditing(null); setAdding(false); setForm(empty); toast({ title: "Saved" }); },
    onError: () => toast({ title: "Error", variant: "destructive" }),
  });

  const startEdit = (r: SACCode) => { setEditing(r); setForm({ sac_code: r.sac_code, description: r.description, gst_rate: r.gst_rate, is_active: r.is_active ?? true }); setAdding(false); };
  const cancel = () => { setEditing(null); setAdding(false); setForm(empty); };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">SAC Codes</h1>
          <p className="text-sm text-muted-foreground mt-1">SAC codes apply to services (restaurant delivery charges, hotel room charges, etc.)</p>
        </div>
        <Button onClick={() => { setAdding(true); setEditing(null); setForm(empty); }}><Plus className="w-4 h-4 mr-2" />Add SAC Code</Button>
      </div>

      <Input placeholder="Search SAC code or description..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-sm" />

      {(adding || editing) && (
        <Card>
          <CardHeader><CardTitle>{editing ? "Edit SAC Code" : "Add SAC Code"}</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div><label className="text-sm font-medium">SAC Code *</label><Input value={form.sac_code} onChange={e => setForm(f => ({ ...f, sac_code: e.target.value }))} /></div>
              <div className="col-span-2"><label className="text-sm font-medium">Description *</label><Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
              <div><label className="text-sm font-medium">GST Rate (%)</label><Input type="number" value={form.gst_rate} onChange={e => setForm(f => ({ ...f, gst_rate: parseFloat(e.target.value) || 0 }))} /></div>
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
                <th className="text-left p-3 font-medium">SAC Code</th>
                <th className="text-left p-3 font-medium">Description</th>
                <th className="text-left p-3 font-medium">GST %</th>
                <th className="text-left p-3 font-medium">Status</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">No SAC codes found</td></tr>}
              {rows.map(r => (
                <tr key={r.id} className="border-b hover:bg-muted/30">
                  <td className="p-3 font-mono font-medium">{r.sac_code}</td>
                  <td className="p-3">{r.description}</td>
                  <td className="p-3">{r.gst_rate}%</td>
                  <td className="p-3"><Badge variant={r.is_active !== false ? "default" : "secondary"}>{r.is_active !== false ? "Active" : "Inactive"}</Badge></td>
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
