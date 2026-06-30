// Payment terminal settlements, vendor payments, and cash register transfers all reference bank accounts.
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

type Bank = { id: number; name: string; ifsc_prefix?: string; account_number?: string; branch_name?: string; is_active?: boolean };
const empty: Omit<Bank, "id"> = { name: "", ifsc_prefix: "", account_number: "", branch_name: "", is_active: true };

export default function BankMasterPage() {
  const [editing, setEditing] = useState<Bank | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<Omit<Bank, "id">>(empty);
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data } = useQuery({ queryKey: ["/api/masters/banks"], queryFn: () => api("GET", "/api/masters/banks") });
  const rows: Bank[] = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];

  const save = useMutation({
    mutationFn: (v: any) => editing ? api("PUT", `/api/masters/banks/${editing.id}`, v) : api("POST", "/api/masters/banks", v),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/masters/banks"] }); setEditing(null); setAdding(false); setForm(empty); toast({ title: "Saved" }); },
    onError: () => toast({ title: "Error", variant: "destructive" }),
  });

  const startEdit = (r: Bank) => { setEditing(r); setForm({ name: r.name, ifsc_prefix: r.ifsc_prefix ?? "", account_number: r.account_number ?? "", branch_name: r.branch_name ?? "", is_active: r.is_active ?? true }); setAdding(false); };
  const cancel = () => { setEditing(null); setAdding(false); setForm(empty); };
  const f = (k: keyof typeof empty) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(p => ({ ...p, [k]: e.target.value }));

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Bank Master</h1>
          <p className="text-sm text-muted-foreground mt-1">Payment terminal settlements, vendor payments, and cash register transfers all reference bank accounts.</p>
        </div>
        <Button onClick={() => { setAdding(true); setEditing(null); setForm(empty); }}><Plus className="w-4 h-4 mr-2" />Add Bank</Button>
      </div>

      {(adding || editing) && (
        <Card>
          <CardHeader><CardTitle>{editing ? "Edit Bank" : "Add Bank"}</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-sm font-medium">Bank Name *</label><Input value={form.name} onChange={f("name")} placeholder="e.g. HDFC Bank" /></div>
              <div><label className="text-sm font-medium">IFSC Prefix</label><Input value={form.ifsc_prefix} onChange={f("ifsc_prefix")} placeholder="e.g. HDFC" /></div>
              <div><label className="text-sm font-medium">Account Number</label><Input value={form.account_number} onChange={f("account_number")} /></div>
              <div><label className="text-sm font-medium">Branch Name</label><Input value={form.branch_name} onChange={f("branch_name")} /></div>
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
                <th className="text-left p-3 font-medium">Bank Name</th>
                <th className="text-left p-3 font-medium">IFSC Prefix</th>
                <th className="text-left p-3 font-medium">Account Number</th>
                <th className="text-left p-3 font-medium">Branch</th>
                <th className="text-left p-3 font-medium">Status</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No banks configured</td></tr>}
              {rows.map(r => (
                <tr key={r.id} className="border-b hover:bg-muted/30">
                  <td className="p-3 font-medium">{r.name}</td>
                  <td className="p-3 font-mono">{r.ifsc_prefix || "-"}</td>
                  <td className="p-3 font-mono">{r.account_number ? `****${r.account_number.slice(-4)}` : "-"}</td>
                  <td className="p-3">{r.branch_name || "-"}</td>
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
