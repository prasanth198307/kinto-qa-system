import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Plus, Gift, Clock, AlertTriangle } from "lucide-react";
import { useTenantConfig, formatCurrency as fmtCur } from "@/hooks/use-tenant-config";

const api = (m: string, p: string, b?: any) =>
  fetch(p, { method: m, headers: { "Content-Type": "application/json" }, body: b ? JSON.stringify(b) : undefined }).then((r) => r.json());

export default function RetailLoyaltyPage() {
  const qc = useQueryClient();
  const tenantConfig = useTenantConfig();
  const sym = tenantConfig.currency_symbol;
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "" });
  const [cfg, setCfg] = useState<any>({ points_per_50_rupees: 1, redemption_value_per_point: 0.5, expiry_days: 365 });
  const [pointsDialog, setPointsDialog] = useState<{ id: number; mode: "earn" | "redeem" } | null>(null);
  const [pts, setPts] = useState("");

  const { data: customers = [] } = useQuery<any[]>({ queryKey: ["retail-loyalty"], queryFn: () => api("GET", "/api/pos/loyalty/customers") });
  const { data: config } = useQuery<any>({ queryKey: ["retail-loyalty-cfg"], queryFn: () => api("GET", "/api/pos/loyalty/config") });
  const { data: expiry } = useQuery<any>({ queryKey: ["retail-loyalty-expiry"], queryFn: () => api("GET", "/api/pos/loyalty/expiry-stats") });

  useEffect(() => { if (config) setCfg((p: any) => ({ ...p, ...config })); }, [config]);

  const addMut = useMutation({
    mutationFn: () => api("POST", "/api/pos/loyalty/customers", form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["retail-loyalty"] }); setOpen(false); setForm({ name: "", phone: "", email: "" }); toast({ title: "Member enrolled" }); },
  });
  const cfgMut = useMutation({
    mutationFn: () => api("PUT", "/api/pos/loyalty/config", { points_per_50_rupees: Number(cfg.points_per_50_rupees), redemption_value_per_point: Number(cfg.redemption_value_per_point), expiry_days: Number(cfg.expiry_days) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["retail-loyalty-cfg"] }); qc.invalidateQueries({ queryKey: ["retail-loyalty-expiry"] }); toast({ title: "Config saved" }); },
  });
  const pointsMut = useMutation({
    mutationFn: () => api("POST", `/api/pos/loyalty/customers/${pointsDialog!.id}/${pointsDialog!.mode}`, { points: Number(pts) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["retail-loyalty"] }); setPointsDialog(null); setPts(""); toast({ title: "Points updated" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const expireMut = useMutation({
    mutationFn: () => api("POST", "/api/pos/loyalty/expire-now", {}),
    onSuccess: (d: any) => { qc.invalidateQueries({ queryKey: ["retail-loyalty"] }); qc.invalidateQueries({ queryKey: ["retail-loyalty-expiry"] }); toast({ title: `Expired points for ${d.customers_expired} inactive customers` }); },
  });

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2"><Gift className="w-6 h-6 text-purple-600" /><h1 className="text-2xl font-bold">Loyalty Program</h1></div>
        <Button size="sm" onClick={() => setOpen(true)}><Plus className="w-4 h-4 mr-1" />Enroll Member</Button>
      </div>

      {expiry && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">Active Members</div><div className="text-xl font-bold">{expiry.active_members}</div></CardContent></Card>
          <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">Points Outstanding</div><div className="text-xl font-bold">{Number(expiry.total_points_outstanding).toLocaleString()}</div></CardContent></Card>
          <Card className={Number(expiry.already_expired) > 0 ? "border-red-300" : ""}><CardContent className="p-3"><div className="text-xs text-muted-foreground">Past Expiry</div><div className="text-xl font-bold text-red-600">{expiry.already_expired}</div></CardContent></Card>
          <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">Expiring in 7d</div><div className="text-xl font-bold text-amber-600">{expiry.expiring_7d}</div></CardContent></Card>
          <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">Expiring in 30d</div><div className="text-xl font-bold">{expiry.expiring_30d}</div></CardContent></Card>
        </div>
      )}

      {expiry && Number(expiry.already_expired) > 0 && (
        <div className="border border-red-300 bg-red-50 rounded p-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-red-800 text-sm font-medium">
            <AlertTriangle className="w-4 h-4" />{expiry.already_expired} customers have points past the {expiry.expiry_days}-day expiry window (daily scheduler will clear them tonight).
          </div>
          <Button size="sm" variant="destructive" onClick={() => expireMut.mutate()} disabled={expireMut.isPending}>Expire Now</Button>
        </div>
      )}

      <Tabs defaultValue="members">
        <TabsList>
          <TabsTrigger value="members">Members ({customers.length})</TabsTrigger>
          <TabsTrigger value="expiring">Expiring Soon</TabsTrigger>
          <TabsTrigger value="config">Config</TabsTrigger>
        </TabsList>

        <TabsContent value="members">
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Phone</TableHead><TableHead>Points</TableHead><TableHead>Value</TableHead><TableHead>Last Activity</TableHead><TableHead></TableHead></TableRow></TableHeader>
              <TableBody>
                {customers.map((c: any) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="text-sm">{c.phone}</TableCell>
                    <TableCell className="font-semibold">{Number(c.points_balance)}</TableCell>
                    <TableCell className="text-sm">{sym}{(Number(c.points_balance) * Number(cfg.redemption_value_per_point || 0.5)).toFixed(0)}</TableCell>
                    <TableCell className="text-sm">{c.updated_at ? String(c.updated_at).slice(0, 10) : "—"}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => { setPointsDialog({ id: c.id, mode: "earn" }); setPts(""); }}>+ Earn</Button>
                        <Button size="sm" variant="ghost" onClick={() => { setPointsDialog({ id: c.id, mode: "redeem" }); setPts(""); }}>− Redeem</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {!customers.length && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No loyalty members</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="expiring">
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Phone</TableHead><TableHead>Points at Risk</TableHead><TableHead>Expiry Date</TableHead></TableRow></TableHeader>
              <TableBody>
                {(expiry?.expiring_soon || []).map((c: any) => (
                  <TableRow key={c.id} className={new Date(c.expiry_date) < new Date() ? "bg-red-50" : ""}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="text-sm">{c.phone}</TableCell>
                    <TableCell className="font-semibold">{Number(c.points_balance)}</TableCell>
                    <TableCell><Badge variant={new Date(c.expiry_date) < new Date() ? "destructive" : "outline"}>{c.expiry_date}</Badge></TableCell>
                  </TableRow>
                ))}
                {!(expiry?.expiring_soon?.length) && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No points expiring in the next 30 days ✓</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="config">
          <Card className="max-w-md"><CardHeader><CardTitle className="text-base flex items-center gap-2"><Clock className="w-4 h-4" />Earning, Redemption & Expiry</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div><Label className="text-xs">Points per ${sym}50 spent</Label><Input type="number" value={cfg.points_per_50_rupees} onChange={e => setCfg((p: any) => ({ ...p, points_per_50_rupees: e.target.value }))} className="h-8" /></div>
              <div><Label className="text-xs">Redemption value per point (${sym})</Label><Input type="number" step="0.1" value={cfg.redemption_value_per_point} onChange={e => setCfg((p: any) => ({ ...p, redemption_value_per_point: e.target.value }))} className="h-8" /></div>
              <div><Label className="text-xs">Points expiry (days of inactivity, 0 = never)</Label><Input type="number" value={cfg.expiry_days ?? 365} onChange={e => setCfg((p: any) => ({ ...p, expiry_days: e.target.value }))} className="h-8" /></div>
              <Button size="sm" onClick={() => cfgMut.mutate()} disabled={cfgMut.isPending}>Save Config</Button>
              <p className="text-xs text-muted-foreground">The expiry scheduler runs daily at server boot + every 24h and zeroes points for members inactive longer than the expiry window.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Enroll Loyalty Member</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs">Name</Label><Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="h-8" /></div>
            <div><Label className="text-xs">Phone</Label><Input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} className="h-8" /></div>
            <div><Label className="text-xs">Email</Label><Input value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} className="h-8" /></div>
          </div>
          <div className="flex gap-2 justify-end mt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => addMut.mutate()} disabled={addMut.isPending || !form.name || !form.phone}>Enroll</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!pointsDialog} onOpenChange={() => setPointsDialog(null)}>
        <DialogContent className="max-w-xs">
          <DialogHeader><DialogTitle>{pointsDialog?.mode === "earn" ? "Add Points" : "Redeem Points"}</DialogTitle></DialogHeader>
          <div><Label className="text-xs">Points</Label><Input type="number" value={pts} onChange={e => setPts(e.target.value)} className="h-8" /></div>
          <div className="flex gap-2 justify-end mt-2">
            <Button variant="outline" onClick={() => setPointsDialog(null)}>Cancel</Button>
            <Button onClick={() => pointsMut.mutate()} disabled={pointsMut.isPending || !pts}>Confirm</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
