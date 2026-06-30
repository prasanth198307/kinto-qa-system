import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Edit, IndianRupee, TrendingUp, CheckCircle, Clock } from "lucide-react";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then(r => r.json());

const fmt = (n: any) => Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
const statusColor: Record<string, string> = { active: "default", closed: "secondary", pending: "outline" };

const emptyGrant = { agency_name: "", grant_title: "", amount_sanctioned: "", amount_received: "", grant_date: "", end_date: "", status: "pending", purpose: "", conditions: "" };

export default function GrantsPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ ...emptyGrant });
  const [receiptDialog, setReceiptDialog] = useState<{ id: number; amount: string } | null>(null);
  const [utilDialog, setUtilDialog] = useState<{ id: number; amount: string } | null>(null);

  const { data: grants = [] } = useQuery({ queryKey: ["ngo-grants"], queryFn: () => api("GET", "/api/ngo/grants") });

  const save = useMutation({
    mutationFn: (d: any) => editId ? api("PUT", `/api/ngo/grants/${editId}`, d) : api("POST", "/api/ngo/grants", d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["ngo-grants"] }); setOpen(false); setEditId(null); setForm({ ...emptyGrant }); }
  });

  const update = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => api("PUT", `/api/ngo/grants/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["ngo-grants"] }); setReceiptDialog(null); setUtilDialog(null); }
  });

  const totalSanctioned = grants.reduce((s: number, g: any) => s + Number(g.amount_sanctioned || 0), 0);
  const totalReceived = grants.reduce((s: number, g: any) => s + Number(g.amount_received || 0), 0);
  const totalUtilized = grants.reduce((s: number, g: any) => s + Number(g.amount_utilized || 0), 0);

  const openEdit = (g: any) => {
    setForm({ agency_name: g.agency_name, grant_title: g.grant_title, amount_sanctioned: g.amount_sanctioned, amount_received: g.amount_received, grant_date: g.grant_date?.slice(0, 10) || "", end_date: g.end_date?.slice(0, 10) || "", status: g.status, purpose: g.purpose || "", conditions: g.conditions || "" });
    setEditId(g.id);
    setOpen(true);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Grants Management</h1>
        <Button onClick={() => { setForm({ ...emptyGrant }); setEditId(null); setOpen(true); }}><Plus className="h-4 w-4 mr-2" />Add Grant</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: "Total Grants", value: grants.length, icon: <TrendingUp className="h-5 w-5 text-blue-500" /> },
          { label: "Sanctioned", value: `₹${fmt(totalSanctioned)}`, icon: <IndianRupee className="h-5 w-5 text-purple-500" /> },
          { label: "Received", value: `₹${fmt(totalReceived)}`, icon: <CheckCircle className="h-5 w-5 text-green-500" /> },
          { label: "Utilized", value: `₹${fmt(totalUtilized)}`, icon: <TrendingUp className="h-5 w-5 text-orange-500" /> },
          { label: "Balance", value: `₹${fmt(totalReceived - totalUtilized)}`, icon: <Clock className="h-5 w-5 text-red-500" /> },
        ].map(k => (
          <Card key={k.label}>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">{k.icon}<span className="text-xs text-muted-foreground">{k.label}</span></div>
              <div className="text-lg font-bold mt-1">{k.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Grant #</TableHead><TableHead>Agency</TableHead><TableHead>Title</TableHead>
                <TableHead className="text-right">Sanctioned</TableHead><TableHead className="text-right">Received</TableHead>
                <TableHead className="text-right">Utilized</TableHead><TableHead>Utilization</TableHead>
                <TableHead>Grant Date</TableHead><TableHead>End Date</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {grants.map((g: any) => {
                const pct = g.amount_sanctioned > 0 ? Math.min(100, Math.round((g.amount_utilized / g.amount_sanctioned) * 100)) : 0;
                return (
                  <TableRow key={g.id}>
                    <TableCell className="font-mono text-sm">{g.grant_number}</TableCell>
                    <TableCell>{g.agency_name}</TableCell>
                    <TableCell className="max-w-[160px] truncate">{g.grant_title}</TableCell>
                    <TableCell className="text-right">₹{fmt(g.amount_sanctioned)}</TableCell>
                    <TableCell className="text-right">₹{fmt(g.amount_received)}</TableCell>
                    <TableCell className="text-right">₹{fmt(g.amount_utilized)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-muted rounded-full h-2"><div className="bg-green-500 h-2 rounded-full" style={{ width: `${pct}%` }} /></div>
                        <span className="text-xs">{pct}%</span>
                      </div>
                    </TableCell>
                    <TableCell>{g.grant_date?.slice(0, 10)}</TableCell>
                    <TableCell>{g.end_date?.slice(0, 10)}</TableCell>
                    <TableCell><Badge variant={statusColor[g.status] as any}>{g.status}</Badge></TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => openEdit(g)}><Edit className="h-3 w-3" /></Button>
                        <Button size="sm" variant="outline" onClick={() => setReceiptDialog({ id: g.id, amount: "" })}>Receipt</Button>
                        <Button size="sm" variant="outline" onClick={() => setUtilDialog({ id: g.id, amount: "" })}>Utilize</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editId ? "Edit Grant" : "Add Grant"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            {[["agency_name","Agency Name"],["grant_title","Grant Title"],["amount_sanctioned","Amount Sanctioned"],["amount_received","Amount Received"],["grant_date","Grant Date"],["end_date","End Date"]].map(([k,l]) => (
              <div key={k} className={k === "grant_title" ? "col-span-2" : ""}>
                <Label>{l}</Label>
                <Input type={k.includes("date") ? "date" : k.includes("amount") ? "number" : "text"} value={(form as any)[k]} onChange={e => setForm(p => ({ ...p, [k]: e.target.value }))} />
              </div>
            ))}
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="pending">Pending</SelectItem><SelectItem value="active">Active</SelectItem><SelectItem value="closed">Closed</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="col-span-2"><Label>Purpose</Label><Textarea value={form.purpose} onChange={e => setForm(p => ({ ...p, purpose: e.target.value }))} rows={2} /></div>
            <div className="col-span-2"><Label>Conditions</Label><Textarea value={form.conditions} onChange={e => setForm(p => ({ ...p, conditions: e.target.value }))} rows={2} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={() => save.mutate(form)} disabled={save.isPending}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!receiptDialog} onOpenChange={() => setReceiptDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Record Receipt</DialogTitle></DialogHeader>
          <Label>Amount Received</Label>
          <Input type="number" value={receiptDialog?.amount || ""} onChange={e => setReceiptDialog(p => p ? { ...p, amount: e.target.value } : null)} />
          <DialogFooter><Button variant="outline" onClick={() => setReceiptDialog(null)}>Cancel</Button><Button onClick={() => update.mutate({ id: receiptDialog!.id, data: { amount_received: receiptDialog!.amount } })} disabled={update.isPending}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!utilDialog} onOpenChange={() => setUtilDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Record Utilization</DialogTitle></DialogHeader>
          <Label>Amount Utilized</Label>
          <Input type="number" value={utilDialog?.amount || ""} onChange={e => setUtilDialog(p => p ? { ...p, amount: e.target.value } : null)} />
          <DialogFooter><Button variant="outline" onClick={() => setUtilDialog(null)}>Cancel</Button><Button onClick={() => update.mutate({ id: utilDialog!.id, data: { amount_utilized: utilDialog!.amount } })} disabled={update.isPending}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
