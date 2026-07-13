import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useTenantConfig, formatCurrency as fmtCur } from "@/hooks/use-tenant-config";

const api = (m: string, p: string, b?: any) =>
  fetch(p, { method: m, headers: { "Content-Type": "application/json" }, body: b ? JSON.stringify(b) : undefined }).then((r) => r.json());

const fmt = (n: any) => `${sym}${Number(n || 0).toLocaleString("en-IN")}`;

export default function NidhiSharesPage() {
  const qc = useQueryClient();
  const tenantConfig = useTenantConfig();
  const sym = tenantConfig.currency_symbol;
  const { toast } = useToast();
  const [allotOpen, setAllotOpen] = useState(false);
  const [dividendRate, setDividendRate] = useState("10");
  const [form, setForm] = useState({ member_id: "", shares_count: "", share_value: "10", certificate_number: "", payment_mode: "cash", narration: "" });

  const { data: txns = [] } = useQuery<any[]>({
    queryKey: ["nidhi-share-txns"],
    queryFn: () => api("GET", "/api/nidhi/shares/transactions"),
  });
  const { data: dividend } = useQuery<any>({
    queryKey: ["nidhi-dividend", dividendRate],
    queryFn: () => api("GET", `/api/nidhi/dividend/calculate?rate=${dividendRate}`),
    enabled: !!dividendRate,
  });

  const allotMut = useMutation({
    mutationFn: (p: any) => api("POST", "/api/nidhi/shares/allot", p),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["nidhi-share-txns"] }); setAllotOpen(false); toast({ title: "Shares allotted" }); },
  });
  const surrenderMut = useMutation({
    mutationFn: (p: any) => api("POST", "/api/nidhi/shares/surrender", p),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["nidhi-share-txns"] }); toast({ title: "Shares surrendered" }); },
  });

  const f = (k: string, v: string) => setForm((p: any) => ({ ...p, [k]: v }));

  const allotments = txns.filter((t: any) => t.transaction_type === "allotment");
  const surrenders = txns.filter((t: any) => t.transaction_type === "surrender");

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Share Management</h1>
        <Button size="sm" onClick={() => setAllotOpen(true)}>+ Allot Shares</Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground">Total Allotments</div>
          <div className="text-2xl font-bold">{allotments.length}</div>
          <div className="text-sm">{fmt(allotments.reduce((s: number, t: any) => s + Number(t.total_amount || 0), 0))}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground">Total Surrenders</div>
          <div className="text-2xl font-bold">{surrenders.length}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground">Net Share Capital</div>
          <div className="text-2xl font-bold">{fmt(allotments.reduce((s: number, t: any) => s + Number(t.total_amount || 0), 0) - surrenders.reduce((s: number, t: any) => s + Number(t.total_amount || 0), 0))}</div>
        </CardContent></Card>
      </div>

      <Tabs defaultValue="transactions">
        <TabsList><TabsTrigger value="transactions">Transactions</TabsTrigger><TabsTrigger value="dividend">Dividend Calculator</TabsTrigger></TabsList>
        <TabsContent value="transactions">
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Date</TableHead><TableHead>Member</TableHead><TableHead>Type</TableHead>
                <TableHead>Shares</TableHead><TableHead>Value/Share</TableHead><TableHead>Total</TableHead><TableHead>Cert No.</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {txns.map((t: any) => (
                  <TableRow key={t.id}>
                    <TableCell className="text-sm">{String(t.created_at).slice(0,10)}</TableCell>
                    <TableCell>{t.member_name}</TableCell>
                    <TableCell><Badge variant={t.transaction_type === "allotment" ? "default" : "secondary"}>{t.transaction_type}</Badge></TableCell>
                    <TableCell>{t.shares_count}</TableCell>
                    <TableCell>{sym}{t.share_value}</TableCell>
                    <TableCell className="font-semibold">{fmt(t.total_amount)}</TableCell>
                    <TableCell>{t.certificate_number || "—"}</TableCell>
                  </TableRow>
                ))}
                {!txns.length && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No transactions</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>
        <TabsContent value="dividend">
          <Card><CardHeader><CardTitle className="text-base">Dividend Calculator</CardTitle></CardHeader>
            <CardContent>
              <div className="flex gap-3 items-end mb-4">
                <div><Label className="text-xs">Dividend Rate (%)</Label><Input type="number" value={dividendRate} onChange={e => setDividendRate(e.target.value)} className="w-24 h-8 text-sm" /></div>
                <div className="text-sm text-muted-foreground">Total payout: <strong>{fmt(dividend?.totalDividend)}</strong> across {dividend?.members?.length ?? 0} members</div>
              </div>
              {dividend?.members?.length > 0 && (
                <Table>
                  <TableHeader><TableRow><TableHead>Member</TableHead><TableHead>Shares</TableHead><TableHead>Share Capital</TableHead><TableHead>Dividend</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {dividend.members.slice(0, 20).map((m: any) => (
                      <TableRow key={m.id}><TableCell>{m.name}</TableCell><TableCell>{m.shares_held}</TableCell><TableCell>{fmt(m.total_share_amount)}</TableCell><TableCell className="font-semibold">{fmt(m.dividend_amount)}</TableCell></TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={allotOpen} onOpenChange={setAllotOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Allot Shares</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Label className="text-xs">Member ID</Label><Input value={form.member_id} onChange={e => f("member_id", e.target.value)} className="h-8 text-sm" /></div>
            <div><Label className="text-xs">Shares Count</Label><Input type="number" value={form.shares_count} onChange={e => f("shares_count", e.target.value)} className="h-8 text-sm" /></div>
            <div><Label className="text-xs">Share Value (${sym})</Label><Input type="number" value={form.share_value} onChange={e => f("share_value", e.target.value)} className="h-8 text-sm" /></div>
            <div><Label className="text-xs">Certificate No.</Label><Input value={form.certificate_number} onChange={e => f("certificate_number", e.target.value)} className="h-8 text-sm" /></div>
            <div><Label className="text-xs">Payment Mode</Label>
              <Select value={form.payment_mode} onValueChange={v => f("payment_mode", v)}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>{["cash","cheque","neft","upi"].map(m => <SelectItem key={m} value={m}>{m.toUpperCase()}</SelectItem>)}</SelectContent>
              </Select></div>
          </div>
          <div className="flex gap-2 justify-end mt-2">
            <Button variant="outline" onClick={() => setAllotOpen(false)}>Cancel</Button>
            <Button onClick={() => allotMut.mutate(form)} disabled={allotMut.isPending}>Allot</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
