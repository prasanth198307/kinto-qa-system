// Branches are used as cost centers across all ERPs. Restaurant outlets, hotel properties,
// and pharmacy stores all map to branches.
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

type Branch = { id: number; branch_code: string; branch_name: string; address?: string; city?: string; state?: string; pincode?: string; phone?: string; email?: string; gstin?: string; is_head_office?: boolean; is_active?: boolean };
const empty: Omit<Branch, "id"> = { branch_code: "", branch_name: "", address: "", city: "", state: "", pincode: "", phone: "", email: "", gstin: "", is_head_office: false, is_active: true };

export default function BranchesPage() {
  const [editing, setEditing] = useState<Branch | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<Omit<Branch, "id">>(empty);
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data } = useQuery({ queryKey: ["/api/masters/branches"], queryFn: () => api("GET", "/api/masters/branches") });
  const rows: Branch[] = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];

  const save = useMutation({
    mutationFn: (v: any) => editing ? api("PUT", `/api/masters/branches/${editing.id}`, v) : api("POST", "/api/masters/branches", v),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/masters/branches"] }); setEditing(null); setAdding(false); setForm(empty); toast({ title: "Saved" }); },
    onError: () => toast({ title: "Error", variant: "destructive" }),
  });

  const startEdit = (r: Branch) => { setEditing(r); setForm({ branch_code: r.branch_code, branch_name: r.branch_name, address: r.address ?? "", city: r.city ?? "", state: r.state ?? "", pincode: r.pincode ?? "", phone: r.phone ?? "", email: r.email ?? "", gstin: r.gstin ?? "", is_head_office: r.is_head_office ?? false, is_active: r.is_active ?? true }); setAdding(false); };
  const cancel = () => { setEditing(null); setAdding(false); setForm(empty); };
  const f = (k: keyof typeof empty) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(p => ({ ...p, [k]: e.target.value }));

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Branches</h1>
          <p className="text-sm text-muted-foreground mt-1">Branches are used as cost centers across all ERPs. Restaurant outlets, hotel properties, and pharmacy stores all map to branches.</p>
        </div>
        <Button onClick={() => { setAdding(true); setEditing(null); setForm(empty); }}><Plus className="w-4 h-4 mr-2" />Add Branch</Button>
      </div>

      {(adding || editing) && (
        <Card>
          <CardHeader><CardTitle>{editing ? "Edit Branch" : "Add Branch"}</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div><label className="text-sm font-medium">Branch Code *</label><Input value={form.branch_code} onChange={f("branch_code")} /></div>
              <div className="col-span-2"><label className="text-sm font-medium">Branch Name *</label><Input value={form.branch_name} onChange={f("branch_name")} /></div>
              <div className="col-span-3"><label className="text-sm font-medium">Address</label><Input value={form.address} onChange={f("address")} /></div>
              <div><label className="text-sm font-medium">City</label><Input value={form.city} onChange={f("city")} /></div>
              <div><label className="text-sm font-medium">State</label><Input value={form.state} onChange={f("state")} /></div>
              <div><label className="text-sm font-medium">Pincode</label><Input value={form.pincode} onChange={f("pincode")} /></div>
              <div><label className="text-sm font-medium">Phone</label><Input value={form.phone} onChange={f("phone")} /></div>
              <div><label className="text-sm font-medium">Email</label><Input value={form.email} onChange={f("email")} /></div>
              <div><label className="text-sm font-medium">GSTIN</label><Input value={form.gstin} onChange={f("gstin")} /></div>
              <div className="flex items-center gap-2 mt-2">
                <input type="checkbox" id="ho" checked={!!form.is_head_office} onChange={e => setForm(p => ({ ...p, is_head_office: e.target.checked }))} />
                <label htmlFor="ho" className="text-sm">Head Office</label>
              </div>
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
                <th className="text-left p-3 font-medium">Code</th>
                <th className="text-left p-3 font-medium">Name</th>
                <th className="text-left p-3 font-medium">City</th>
                <th className="text-left p-3 font-medium">Phone</th>
                <th className="text-left p-3 font-medium">GSTIN</th>
                <th className="text-left p-3 font-medium">Type</th>
                <th className="text-left p-3 font-medium">Status</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && <tr><td colSpan={8} className="p-6 text-center text-muted-foreground">No branches found</td></tr>}
              {rows.map(r => (
                <tr key={r.id} className="border-b hover:bg-muted/30">
                  <td className="p-3 font-mono">{r.branch_code}</td>
                  <td className="p-3 font-medium">{r.branch_name}</td>
                  <td className="p-3">{r.city || "-"}</td>
                  <td className="p-3">{r.phone || "-"}</td>
                  <td className="p-3 font-mono text-xs">{r.gstin || "-"}</td>
                  <td className="p-3">{r.is_head_office && <Badge variant="default">HO</Badge>}</td>
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
