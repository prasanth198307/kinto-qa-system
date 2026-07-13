import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Plus, Gift, Download } from "lucide-react";
import { useTenantConfig, formatCurrency as fmtCur } from "@/hooks/use-tenant-config";

const api = (m: string, p: string, b?: any) =>
  fetch(p, { method: m, headers: { "Content-Type": "application/json" }, body: b ? JSON.stringify(b) : undefined }).then((r) => r.json());
const fmt = (n: any) => `${sym}${Number(n || 0).toLocaleString("en-IN")}`;
const today = new Date().toISOString().slice(0, 10);
const BLANK = { donor_id: "", project_id: "", amount: "", donation_date: today, payment_mode: "cash", reference_number: "", purpose: "", is_80g_eligible: true, notes: "" };

export default function NGODonationsPage() {
  const qc = useQueryClient();
  const tenantConfig = useTenantConfig();
  const sym = tenantConfig.currency_symbol;
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>(BLANK);

  const { data: donations = [] } = useQuery<any[]>({ queryKey: ["ngo-donations"], queryFn: () => api("GET", "/api/ngo/donations") });
  const { data: donors = [] } = useQuery<any[]>({ queryKey: ["ngo-donors"], queryFn: () => api("GET", "/api/ngo/donors") });
  const { data: projects = [] } = useQuery<any[]>({ queryKey: ["ngo-projects"], queryFn: () => api("GET", "/api/ngo/projects") });

  const createMut = useMutation({
    mutationFn: (p: any) => api("POST", "/api/ngo/donations", { ...p, donor_id: Number(p.donor_id), project_id: p.project_id ? Number(p.project_id) : null, amount: Number(p.amount) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ngo-donations"] });
      setOpen(false); setForm(BLANK);
      toast({ title: "Donation recorded — GL journal posted (DR Cash/Bank · CR Donation Income)" });
    },
  });

  const f = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));
  const total = donations.reduce((s: number, d: any) => s + Number(d.amount || 0), 0);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2"><Gift className="w-6 h-6 text-pink-600" /><h1 className="text-2xl font-bold">Donations</h1></div>
        <Button size="sm" onClick={() => { setForm(BLANK); setOpen(true); }}><Plus className="w-4 h-4 mr-1" />Record Donation</Button>
      </div>

      <div className="grid grid-cols-3 gap-3 max-w-xl">
        <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">Total Donations</div><div className="text-xl font-bold">{donations.length}</div></CardContent></Card>
        <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">Total Amount</div><div className="text-xl font-bold text-green-600">{fmt(total)}</div></CardContent></Card>
        <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">80G Eligible</div><div className="text-xl font-bold">{donations.filter((d: any) => d.is_80g_eligible).length}</div></CardContent></Card>
      </div>

      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Donation No.</TableHead><TableHead>Donor</TableHead><TableHead>Project</TableHead><TableHead>Amount</TableHead>
            <TableHead>Date</TableHead><TableHead>Mode</TableHead><TableHead>80G</TableHead><TableHead></TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {donations.map((d: any) => (
              <TableRow key={d.id}>
                <TableCell className="font-mono text-sm">{d.donation_number}</TableCell>
                <TableCell className="font-medium">{d.donor_name || "Anonymous"}</TableCell>
                <TableCell className="text-sm">{d.project_name || "—"}</TableCell>
                <TableCell className="font-semibold">{fmt(d.amount)}</TableCell>
                <TableCell className="text-sm">{d.donation_date ? String(d.donation_date).slice(0, 10) : "—"}</TableCell>
                <TableCell className="text-sm uppercase">{d.payment_mode}</TableCell>
                <TableCell>{d.is_80g_eligible ? <Badge variant="default" className="text-xs">80G</Badge> : "—"}</TableCell>
                <TableCell>
                  {d.is_80g_eligible && (
                    <Button size="sm" variant="ghost" onClick={() => window.open(`/api/ngo/donations/${d.id}/certificate-pdf`, "_blank")}>
                      <Download className="w-3 h-3 mr-1" />80G PDF
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {!donations.length && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No donations recorded</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent></Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Record Donation</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Label className="text-xs">Donor</Label>
              <Select value={String(form.donor_id || "")} onValueChange={v => f("donor_id", v)}>
                <SelectTrigger className="h-8"><SelectValue placeholder="Select donor" /></SelectTrigger>
                <SelectContent>{donors.map((d: any) => <SelectItem key={d.id} value={String(d.id)}>{d.name} ({d.donor_code})</SelectItem>)}</SelectContent>
              </Select></div>
            <div className="col-span-2"><Label className="text-xs">Project (optional)</Label>
              <Select value={String(form.project_id || "")} onValueChange={v => f("project_id", v)}>
                <SelectTrigger className="h-8"><SelectValue placeholder="General fund" /></SelectTrigger>
                <SelectContent>{projects.map((p: any) => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}</SelectContent>
              </Select></div>
            <div><Label className="text-xs">Amount (${sym})</Label><Input type="number" value={form.amount} onChange={e => f("amount", e.target.value)} className="h-8" /></div>
            <div><Label className="text-xs">Date</Label><Input type="date" value={form.donation_date} onChange={e => f("donation_date", e.target.value)} className="h-8" /></div>
            <div><Label className="text-xs">Payment Mode</Label>
              <Select value={form.payment_mode} onValueChange={v => f("payment_mode", v)}>
                <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                <SelectContent>{["cash","cheque","neft","upi","online"].map(m => <SelectItem key={m} value={m}>{m.toUpperCase()}</SelectItem>)}</SelectContent>
              </Select></div>
            <div><Label className="text-xs">Reference No.</Label><Input value={form.reference_number} onChange={e => f("reference_number", e.target.value)} className="h-8" /></div>
            <div className="col-span-2"><Label className="text-xs">Purpose</Label><Input value={form.purpose} onChange={e => f("purpose", e.target.value)} className="h-8" /></div>
            <div className="col-span-2 flex items-center gap-2">
              <input type="checkbox" id="g80" checked={form.is_80g_eligible} onChange={e => f("is_80g_eligible", e.target.checked)} />
              <Label htmlFor="g80" className="text-sm">80G eligible (cash donations above ${sym}2,000 are NOT eligible)</Label>
            </div>
          </div>
          <div className="flex gap-2 justify-end mt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => createMut.mutate(form)} disabled={createMut.isPending || !form.donor_id || !form.amount}>Record + GL</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
