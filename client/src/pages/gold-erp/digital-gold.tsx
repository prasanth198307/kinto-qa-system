import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Coins, ArrowDownLeft, TrendingUp, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTenantConfig, formatCurrency as fmtCur } from "@/hooks/use-tenant-config";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); });

const fmtG = (n: number) => `${Number(n || 0).toFixed(4)}g`;

export default function DigitalGoldPage() {
  const fmt = (n: number) => `${sym}${Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
  const { toast } = useToast();
  const qc = useQueryClient();
  const tenantConfig = useTenantConfig();
  const sym = tenantConfig.currency_symbol;
  const [buyOpen, setBuyOpen] = useState(false);
  const [redeemId, setRedeemId] = useState<number | null>(null);
  const [buyMode, setBuyMode] = useState<"amount" | "grams">("amount");
  const [buyForm, setBuyForm] = useState({ customer_name: "", customer_id: "", grams: "", purchase_amount: "", purchase_rate: "6850" });
  const [redeemForm, setRedeemForm] = useState({ redeem_type: "cash", redeem_amount: "" });

  const { data: holdings = [], isLoading } = useQuery<any[]>({ queryKey: ["digital-gold-holdings"], queryFn: () => fetch("/api/gold-erp/digital-gold/holdings").then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); }) });
  const { data: liveRate } = useQuery<any>({ queryKey: ["gold-live-rate"], queryFn: () => fetch("/api/gold-erp/rates/live").then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); }).catch(() => ({ rate: 6850 })), refetchInterval: 60000 });

  const rate24k = liveRate?.rate || 6850;
  const rate22k = Math.round(rate24k * 22/24);

  const activeHoldings = (holdings as any[]).filter((h: any) => h.status !== "redeemed");
  const totalGrams = activeHoldings.reduce((s, h) => s + Number(h.grams || 0), 0);
  const totalValue = activeHoldings.reduce((s, h) => s + Number(h.purchase_amount || 0), 0);
  const currentValue = totalGrams * rate22k;

  const buyMut = useMutation({
    mutationFn: (d: any) => api("POST", "/api/gold-erp/digital-gold/purchase", { ...d, grams: Number(d.grams), purchase_rate: Number(d.purchase_rate), purchase_amount: Number(d.purchase_amount) }),
    onSuccess: () => { toast({ title: "Digital gold purchased · GL posted (DR Bank / CR Digital Gold Liability)" }); qc.invalidateQueries({ queryKey: ["digital-gold-holdings"] }); setBuyOpen(false); setBuyForm({ customer_name: "", customer_id: "", grams: "", purchase_amount: "", purchase_rate: String(rate22k) }); },
    onError: (e: any) => toast({ title: "Purchase failed", description: e.message, variant: "destructive" }),
  });

  const redeemMut = useMutation({
    mutationFn: ({ id, ...d }: any) => api("POST", `/api/gold-erp/digital-gold/${id}/redeem`, { ...d, redeem_amount: Number(d.redeem_amount) }),
    onSuccess: (d) => { toast({ title: `Redeemed ${d.redeem_type === "cash" ? "as cash" : "as physical gold"} · GL posted (DR Liability / CR ${d.redeem_type === "cash" ? "Bank" : "Inventory"})` }); qc.invalidateQueries({ queryKey: ["digital-gold-holdings"] }); setRedeemId(null); },
  });

  const computeBuy = () => {
    if (buyMode === "amount" && buyForm.purchase_amount) {
      const grams = (Number(buyForm.purchase_amount) / Number(buyForm.purchase_rate)).toFixed(4);
      return { grams, amount: buyForm.purchase_amount };
    }
    if (buyMode === "grams" && buyForm.grams) {
      const amount = (Number(buyForm.grams) * Number(buyForm.purchase_rate)).toFixed(2);
      return { grams: buyForm.grams, amount };
    }
    return null;
  };
  const computed = computeBuy();

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Digital Gold</h1>
          <p className="text-sm text-muted-foreground">Accumulate gold in digital form · Redeem as cash or physical gold · GL auto-posted on every transaction</p>
        </div>
        <Button size="sm" onClick={() => { setBuyForm(f => ({ ...f, purchase_rate: String(rate22k) })); setBuyOpen(true); }}>
          <Plus className="h-3 w-3 mr-1" />Buy Digital Gold
        </Button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card className="border-yellow-200 bg-yellow-50/30"><CardContent className="pt-4">
          <p className="text-xs text-muted-foreground">Total Gold Holdings</p>
          <p className="text-2xl font-bold text-yellow-700">{fmtG(totalGrams)}</p>
          <p className="text-xs text-muted-foreground">{activeHoldings.length} active accounts</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <p className="text-xs text-muted-foreground">Purchase Value</p>
          <p className="text-xl font-bold">{fmt(totalValue)}</p>
        </CardContent></Card>
        <Card className={currentValue >= totalValue ? "border-green-200" : "border-red-200"}><CardContent className="pt-4">
          <p className="text-xs text-muted-foreground">Current Market Value</p>
          <p className={`text-xl font-bold ${currentValue >= totalValue ? "text-green-600" : "text-red-600"}`}>{fmt(currentValue)}</p>
          {totalValue > 0 && <p className={`text-xs ${currentValue >= totalValue ? "text-green-600" : "text-red-600"}`}>
            {currentValue >= totalValue ? "+" : ""}{fmt(currentValue - totalValue)} ({((currentValue - totalValue) / totalValue * 100).toFixed(1)}%)
          </p>}
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <p className="text-xs text-muted-foreground">Live 22K Rate</p>
          <p className="text-xl font-bold text-yellow-700">{fmt(rate22k)}/g</p>
          <p className="text-xs text-muted-foreground">24K: {fmt(rate24k)}/g</p>
        </CardContent></Card>
      </div>

      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active">Active Holdings ({activeHoldings.length})</TabsTrigger>
          <TabsTrigger value="all">All Accounts</TabsTrigger>
        </TabsList>

        <TabsContent value="active">
          <Table>
            <TableHeader><TableRow><TableHead>Customer</TableHead><TableHead className="text-right">Grams</TableHead><TableHead className="text-right">Purchase Rate</TableHead><TableHead className="text-right">Purchase Value</TableHead><TableHead className="text-right">Current Value</TableHead><TableHead className="text-right">P&L</TableHead><TableHead>Date</TableHead><TableHead></TableHead></TableRow></TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={8} className="text-center py-6"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></TableCell></TableRow>}
              {activeHoldings.map((h: any) => {
                const cur = Number(h.grams) * rate22k;
                const pnl = cur - Number(h.purchase_amount);
                return (
                  <TableRow key={h.id}>
                    <TableCell className="font-medium">{h.customer_name}</TableCell>
                    <TableCell className="text-right font-mono">{fmtG(h.grams)}</TableCell>
                    <TableCell className="text-right text-xs">{fmt(h.purchase_rate)}/g</TableCell>
                    <TableCell className="text-right">{fmt(h.purchase_amount)}</TableCell>
                    <TableCell className="text-right font-semibold">{fmt(cur)}</TableCell>
                    <TableCell className={`text-right text-xs ${pnl >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {pnl >= 0 ? "+" : ""}{fmt(pnl)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{h.created_at ? new Date(h.created_at).toLocaleDateString("en-IN") : "—"}</TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" className="text-xs h-7 text-blue-700" onClick={() => { setRedeemId(h.id); setRedeemForm({ redeem_type: "cash", redeem_amount: String(Math.round(cur)) }); }}>
                        <ArrowDownLeft className="h-3 w-3 mr-1" />Redeem
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {!isLoading && activeHoldings.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-6">No digital gold holdings. Click "Buy Digital Gold" to start.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </TabsContent>

        <TabsContent value="all">
          <Table>
            <TableHeader><TableRow><TableHead>Customer</TableHead><TableHead className="text-right">Grams</TableHead><TableHead className="text-right">Purchase Value</TableHead><TableHead>Status</TableHead><TableHead>Date</TableHead></TableRow></TableHeader>
            <TableBody>
              {(holdings as any[]).map((h: any) => (
                <TableRow key={h.id} className={h.status === "redeemed" ? "opacity-50" : ""}>
                  <TableCell>{h.customer_name}</TableCell>
                  <TableCell className="text-right font-mono">{fmtG(h.grams)}</TableCell>
                  <TableCell className="text-right">{fmt(h.purchase_amount)}</TableCell>
                  <TableCell><Badge className={`text-xs ${h.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>{h.status}</Badge></TableCell>
                  <TableCell className="text-xs">{h.created_at ? new Date(h.created_at).toLocaleDateString("en-IN") : "—"}</TableCell>
                </TableRow>
              ))}
              {(holdings as any[]).length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">No accounts</TableCell></TableRow>}
            </TableBody>
          </Table>
        </TabsContent>
      </Tabs>

      <Dialog open={buyOpen} onOpenChange={setBuyOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Buy Digital Gold</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Customer Name</Label><Input value={buyForm.customer_name} onChange={e => setBuyForm(f => ({ ...f, customer_name: e.target.value }))} placeholder="Customer name" /></div>
            <div><Label>Live Rate (22K ${sym}/g)</Label>
              <Input type="number" value={buyForm.purchase_rate} onChange={e => setBuyForm(f => ({ ...f, purchase_rate: e.target.value }))} />
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant={buyMode === "amount" ? "default" : "outline"} onClick={() => setBuyMode("amount")}>By Amount (${sym})</Button>
              <Button size="sm" variant={buyMode === "grams" ? "default" : "outline"} onClick={() => setBuyMode("grams")}>By Weight (g)</Button>
            </div>
            {buyMode === "amount" && (
              <div><Label>Investment Amount (${sym})</Label><Input type="number" value={buyForm.purchase_amount} onChange={e => setBuyForm(f => ({ ...f, purchase_amount: e.target.value }))} placeholder="e.g. 5000" /></div>
            )}
            {buyMode === "grams" && (
              <div><Label>Gold Weight (grams)</Label><Input type="number" step="0.001" value={buyForm.grams} onChange={e => setBuyForm(f => ({ ...f, grams: e.target.value }))} placeholder="e.g. 1.000" /></div>
            )}
            {computed && (
              <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-sm">
                <div className="flex justify-between"><span>Gold:</span><span className="font-bold">{fmtG(Number(computed.grams))}</span></div>
                <div className="flex justify-between"><span>Amount:</span><span className="font-bold">{fmt(Number(computed.amount))}</span></div>
                <p className="text-xs text-muted-foreground mt-1">GL: DR Bank 1002 / CR Digital Gold Liability 2100</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBuyOpen(false)}>Cancel</Button>
            <Button onClick={() => buyMut.mutate({ ...buyForm, grams: computed?.grams || buyForm.grams, purchase_amount: computed?.amount || buyForm.purchase_amount })} disabled={!buyForm.customer_name || !computed || buyMut.isPending} className="bg-yellow-600 hover:bg-yellow-700">
              {buyMut.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              <Coins className="h-4 w-4 mr-1" />Buy Gold
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {redeemId !== null && (
        <Dialog open onOpenChange={() => setRedeemId(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Redeem Digital Gold</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Redemption Type</Label>
                <Select value={redeemForm.redeem_type} onValueChange={v => setRedeemForm(f => ({ ...f, redeem_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash (Bank transfer) — DR Liability / CR Bank</SelectItem>
                    <SelectItem value="physical">Physical Gold — DR Liability / CR Inventory</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Redemption Amount (${sym})</Label>
                <Input type="number" value={redeemForm.redeem_amount} onChange={e => setRedeemForm(f => ({ ...f, redeem_amount: e.target.value }))} />
              </div>
              <p className="text-xs text-muted-foreground">GL journal will be auto-posted on confirmation.</p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRedeemId(null)}>Cancel</Button>
              <Button onClick={() => redeemMut.mutate({ id: redeemId, ...redeemForm })} disabled={!redeemForm.redeem_amount || redeemMut.isPending} className="bg-blue-600 hover:bg-blue-700">
                {redeemMut.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                Confirm Redemption
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
