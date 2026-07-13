import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, CheckCircle, Clock, Play, Loader2, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { useTenantConfig, formatCurrency as fmtCur } from "@/hooks/use-tenant-config";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); });

export default function LoyaltyExpiryPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const tenantConfig = useTenantConfig();
  const sym = tenantConfig.currency_symbol;
  const [expiryDays, setExpiryDays] = useState("");

  const { data: stats, isLoading, refetch } = useQuery<any>({
    queryKey: ["loyalty-expiry-stats"],
    queryFn: () => fetch("/api/restaurant/loyalty/expiry-stats").then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); }),
    refetchInterval: 60000,
  });

  const { data: config } = useQuery<any>({
    queryKey: ["loyalty-config"],
    queryFn: () => fetch("/api/restaurant/loyalty/config").then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); }),
    onSuccess: (d: any) => { if (d?.expiry_days) setExpiryDays(String(d.expiry_days)); },
  } as any);

  const runExpiry = useMutation({
    mutationFn: () => api("POST", "/api/restaurant/loyalty/expire-now", {}),
    onSuccess: (d) => { toast({ title: d.message || "Expiry run complete" }); qc.invalidateQueries({ queryKey: ["loyalty-expiry-stats"] }); },
    onError: () => toast({ title: "Expiry run failed", variant: "destructive" }),
  });

  const saveConfig = useMutation({
    mutationFn: () => api("PUT", "/api/restaurant/loyalty/config", { ...(config || {}), expiry_days: Number(expiryDays) }),
    onSuccess: () => { toast({ title: "Expiry days updated" }); qc.invalidateQueries({ queryKey: ["loyalty-config", "loyalty-expiry-stats"] }); },
  });

  const expiringRows: any[] = Array.isArray(stats?.expiring_soon) ? stats.expiring_soon : [];
  const daysLeft = (dateStr: string) => Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Loyalty Points Expiry Engine</h1>
          <p className="text-sm text-muted-foreground">Automatic daily decay scheduler · Points expire after configured days · Manual trigger available</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => refetch()}><RefreshCw className="h-3 w-3 mr-1" />Refresh</Button>
          <Button size="sm" onClick={() => runExpiry.mutate()} disabled={runExpiry.isPending} className="bg-orange-600 hover:bg-orange-700">
            {runExpiry.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Play className="h-4 w-4 mr-1" />}
            Run Expiry Now
          </Button>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
        <p className="font-semibold mb-0.5">How it works</p>
        <p>Loyalty points expire when a customer's <code>expiry_date</code> passes with unredeemed points. The scheduler runs daily at server startup and every 24 hours after. "Run Expiry Now" processes all overdue expirations immediately and resets their balance to 0. Configure <code>expiry_days</code> to set when newly earned points expire from the loyalty config.</p>
      </div>

      <div className="grid grid-cols-5 gap-4">
        <Card className="border-red-200 bg-red-50/30"><CardContent className="pt-4">
          <p className="text-xs text-muted-foreground">Already Expired</p>
          <p className="text-2xl font-bold text-red-600">{stats?.already_expired?.customers || 0}</p>
          <p className="text-xs text-muted-foreground">{(stats?.already_expired?.points || 0).toLocaleString()} pts waiting reset</p>
        </CardContent></Card>
        <Card className="border-orange-200 bg-orange-50/30"><CardContent className="pt-4">
          <p className="text-xs text-muted-foreground">Expiring in 7 Days</p>
          <p className="text-2xl font-bold text-orange-600">{stats?.expiring_in_7_days?.customers || 0}</p>
          <p className="text-xs text-muted-foreground">{(stats?.expiring_in_7_days?.points || 0).toLocaleString()} pts at risk</p>
        </CardContent></Card>
        <Card className="border-yellow-200"><CardContent className="pt-4">
          <p className="text-xs text-muted-foreground">Expiring in 30 Days</p>
          <p className="text-2xl font-bold text-yellow-600">{stats?.expiring_in_30_days?.customers || 0}</p>
          <p className="text-xs text-muted-foreground">{(stats?.expiring_in_30_days?.points || 0).toLocaleString()} pts</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <p className="text-xs text-muted-foreground">Active Members</p>
          <p className="text-2xl font-bold text-green-600">{stats?.active_members || 0}</p>
          <p className="text-xs text-muted-foreground">with points balance</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <p className="text-xs text-muted-foreground">Total Points Outstanding</p>
          <p className="text-2xl font-bold">{(stats?.total_points_outstanding || 0).toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">liability in system</p>
        </CardContent></Card>
      </div>

      <Tabs defaultValue="expiring">
        <TabsList>
          <TabsTrigger value="expiring">Expiring Soon ({expiringRows.length})</TabsTrigger>
          <TabsTrigger value="config">Expiry Config</TabsTrigger>
          <TabsTrigger value="scheduler">Scheduler Info</TabsTrigger>
        </TabsList>

        <TabsContent value="expiring">
          {stats?.already_expired?.customers > 0 && (
            <div className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-lg mb-3">
              <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-red-800">{stats.already_expired.customers} customers have expired points not yet reset</p>
                <p className="text-xs text-red-600">{(stats?.already_expired?.points || 0).toLocaleString()} points overdue · Click "Run Expiry Now" to process</p>
              </div>
              <Button size="sm" className="ml-auto bg-red-600 hover:bg-red-700" onClick={() => runExpiry.mutate()} disabled={runExpiry.isPending}>
                {runExpiry.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null} Fix Now
              </Button>
            </div>
          )}
          <Table>
            <TableHeader><TableRow><TableHead>Customer</TableHead><TableHead>Phone</TableHead><TableHead className="text-right">Points</TableHead><TableHead>Expiry Date</TableHead><TableHead>Days Left</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={6} className="text-center py-6"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></TableCell></TableRow>}
              {expiringRows.map((r: any) => {
                const dl = daysLeft(r.expiry_date);
                return (
                  <TableRow key={r.id} className={dl <= 0 ? "bg-red-50" : dl <= 7 ? "bg-orange-50" : ""}>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell className="text-xs">{r.phone}</TableCell>
                    <TableCell className="text-right font-mono">{Number(r.loyalty_points).toLocaleString()}</TableCell>
                    <TableCell className="text-xs">{new Date(r.expiry_date).toLocaleDateString("en-IN")}</TableCell>
                    <TableCell>
                      <span className={`text-xs font-medium ${dl <= 0 ? "text-red-600" : dl <= 7 ? "text-orange-600" : "text-yellow-600"}`}>
                        {dl <= 0 ? "Expired" : `${dl}d`}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge className={`text-xs ${dl <= 0 ? "bg-red-100 text-red-700" : dl <= 7 ? "bg-orange-100 text-orange-700" : "bg-yellow-100 text-yellow-700"}`}>
                        {dl <= 0 ? "Overdue" : dl <= 7 ? "Critical" : "Warning"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
              {!isLoading && expiringRows.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6"><CheckCircle className="h-5 w-5 text-green-600 mx-auto mb-1" /><p>No points expiring in the next 30 days</p></TableCell></TableRow>}
            </TableBody>
          </Table>
        </TabsContent>

        <TabsContent value="config" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Loyalty Points Expiry Configuration</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="max-w-xs">
                <Label>Points Expiry Period (days)</Label>
                <Input type="number" value={expiryDays} onChange={e => setExpiryDays(e.target.value)} placeholder="e.g. 365" />
                <p className="text-xs text-muted-foreground mt-1">Points earned will expire after this many days. Set to a very large number (99999) to effectively disable expiry.</p>
              </div>
              <Button onClick={() => saveConfig.mutate()} disabled={!expiryDays || saveConfig.isPending}>
                {saveConfig.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                Save Expiry Configuration
              </Button>
              <div className="text-sm text-muted-foreground space-y-1 border-t pt-3">
                <p><strong>Current config:</strong> {config?.expiry_days || "Not set"} days · Points per ₹100: {config?.points_per_100 || "—"} · Redemption value: {sym}{config?.redemption_value || "—"}/point</p>
                <p><strong>Min redemption:</strong> {config?.min_redemption || "—"} points</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scheduler" className="space-y-4">
          <Card>
            <CardContent className="pt-4 space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse" />
                <div>
                  <p className="text-sm font-medium">Loyalty Expiry Scheduler — Active</p>
                  <p className="text-xs text-muted-foreground">Runs every 24 hours · Processes all tenants · Started at server boot</p>
                </div>
              </div>
              <div className="bg-muted/30 rounded-lg p-4 text-xs space-y-2 font-mono">
                <p className="text-green-700">✓ startLoyaltyExpiryScheduler() called on server start</p>
                <p className="text-green-700">✓ Initial run fires immediately at boot</p>
                <p className="text-blue-700">⟳ Next scheduled run: every 24 hours</p>
                <p className="text-muted-foreground">— Checks: restaurant_customers WHERE expiry_date &lt; TODAY AND loyalty_points &gt; 0</p>
                <p className="text-muted-foreground">— Action: SET loyalty_points = 0</p>
                <p className="text-muted-foreground">— Logs count to console: [LOYALTY EXPIRY] Expired points for N customers</p>
              </div>
              <Button variant="outline" onClick={() => runExpiry.mutate()} disabled={runExpiry.isPending} className="w-full">
                {runExpiry.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Play className="h-4 w-4 mr-1" />}
                Run Manually Now (for testing)
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
