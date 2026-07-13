import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RefreshCw, Bell, TrendingUp, TrendingDown, Wifi, WifiOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTenantConfig, formatCurrency as fmtCur } from "@/hooks/use-tenant-config";

interface RateData { rate: number; silver: number; platinum: number; updatedAt: string | Date; }

const fmt = (n: number) => `${sym}${Number(n).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

const PURITIY_FACTOR: Record<string, number> = { "24K": 1, "22K": 22/24, "18K": 18/24, "14K": 14/24 };

export default function LiveGoldRatesPage() {
  const { toast } = useToast();
  const [live, setLive] = useState<RateData | null>(null);
  const tenantConfig = useTenantConfig();
  const sym = tenantConfig.currency_symbol;
  const [connected, setConnected] = useState(false);
  const [weight, setWeight] = useState("");
  const [purity, setPurity] = useState("22K");
  const [makingPct, setMakingPct] = useState("12");
  const [gstPct, setGstPct] = useState("3");
  const [alertPrice, setAlertPrice] = useState("");
  const [alertActive, setAlertActive] = useState(false);
  const esRef = useRef<EventSource | null>(null);
  const alertRef = useRef<{ price: number; fired: boolean }>({ price: 0, fired: false });

  const { data: history = [] } = useQuery<any[]>({
    queryKey: ["gold-rate-history"],
    queryFn: () => fetch("/api/gold-erp/rates/history").then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); }).catch(() => []),
    refetchInterval: 300000,
  });

  useEffect(() => {
    const startSSE = () => {
      if (esRef.current) { esRef.current.close(); }
      const es = new EventSource("/api/gold-erp/rates/stream");
      esRef.current = es;
      es.onopen = () => setConnected(true);
      es.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          setLive(data);
          setConnected(true);
          if (alertRef.current.price > 0 && !alertRef.current.fired) {
            const rate22k = (data.rate || 0) * (22/24);
            if (rate22k >= alertRef.current.price) {
              toast({ title: `Gold Rate Alert!`, description: `22K gold hit ${sym}${Math.round(rate22k)}/g — your alert at ${sym}${alertRef.current.price}/g triggered` });
              alertRef.current.fired = true;
            }
          }
        } catch {}
      };
      es.onerror = () => { setConnected(false); es.close(); setTimeout(startSSE, 5000); };
    };
    startSSE();
    return () => { esRef.current?.close(); };
  }, []);

  const fetchManual = async () => {
    try {
      const data: any = await fetch("/api/gold-erp/rates/live").then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); });
      setLive(data);
      toast({ title: "Rates refreshed" });
    } catch { toast({ title: "Failed to fetch rates", variant: "destructive" }); }
  };

  const rate24k = live?.rate || 7250;
  const rateSilver999 = live?.silver || 85;
  const ratePlatinum = live?.platinum || 2800;
  const updatedAt = live?.updatedAt ? new Date(live.updatedAt).toLocaleTimeString("en-IN") : "—";

  const rateFor = (p: string) => Math.round(rate24k * (PURITIY_FACTOR[p] || 1));

  const calcMaking = () => {
    if (!weight || !Number(weight)) return null;
    const ratePerGram = rateFor(purity);
    const baseValue = Number(weight) * ratePerGram;
    const making = baseValue * (Number(makingPct) / 100);
    const subtotal = baseValue + making;
    const gst = subtotal * (Number(gstPct) / 100);
    return { base: baseValue, making, subtotal, gst, total: subtotal + gst };
  };
  const calc = calcMaking();

  const setAlert = () => {
    if (!alertPrice) return;
    alertRef.current = { price: Number(alertPrice), fired: false };
    setAlertActive(true);
    toast({ title: `Alert set for ${sym}${alertPrice}/g on 22K gold`, description: "You'll be notified when the live rate reaches this price." });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Live Gold & Silver Rates</h1>
          <p className="text-sm text-muted-foreground">MCX / IBJA / GoldAPI.io live feed · SSE real-time stream · IBJA daily fix · Making charges calculator</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            {connected ? <Wifi className="h-4 w-4 text-green-600" /> : <WifiOff className="h-4 w-4 text-red-600" />}
            <Badge className={`text-xs ${connected ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
              {connected ? "LIVE" : "Connecting..."}
            </Badge>
          </div>
          <span className="text-xs text-muted-foreground">Updated: {updatedAt}</span>
          <Button size="sm" variant="outline" onClick={fetchManual}><RefreshCw className="h-3 w-3 mr-1" />Refresh</Button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {(["24K", "22K", "18K", "14K"] as const).map(p => {
          const r = rateFor(p);
          return (
            <Card key={p} className="border-yellow-200 bg-yellow-50/30">
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground font-medium">Gold {p}</p>
                <p className="text-2xl font-bold text-yellow-700">{fmt(r)}/g</p>
                <p className="text-sm text-muted-foreground">{fmt(r * 10)} / 10g</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Silver 999</p>
            <p className="text-xl font-bold text-gray-600">{fmt(rateSilver999)}/g &nbsp; <span className="text-sm font-normal text-muted-foreground">{fmt(rateSilver999 * 1000)} / kg</span></p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Platinum 950</p>
            <p className="text-xl font-bold text-slate-600">{fmt(ratePlatinum)}/g</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-sm">Making Charges Calculator</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Weight (grams)</Label><Input type="number" value={weight} onChange={e => setWeight(e.target.value)} placeholder="e.g. 10.500" step="0.001" /></div>
              <div><Label>Making Charges %</Label><Input type="number" value={makingPct} onChange={e => setMakingPct(e.target.value)} step="0.1" /></div>
              <div><Label>GST %</Label><Input type="number" value={gstPct} onChange={e => setGstPct(e.target.value)} step="0.5" /></div>
            </div>
            <div className="flex gap-2">
              {["24K", "22K", "18K", "14K"].map(p => (
                <Button key={p} size="sm" variant={purity === p ? "default" : "outline"} onClick={() => setPurity(p)} className="text-xs">{p}</Button>
              ))}
            </div>
            {calc && (
              <div className="bg-muted/50 rounded-lg p-3 space-y-1 text-sm border">
                <div className="flex justify-between"><span className="text-muted-foreground">Gold value ({weight}g × {fmt(rateFor(purity))}):</span><span>{fmt(calc.base)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Making charges ({makingPct}%):</span><span>{fmt(calc.making)}</span></div>
                <div className="flex justify-between border-t pt-1"><span>Subtotal:</span><span>{fmt(calc.subtotal)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">GST ({gstPct}%):</span><span>{fmt(calc.gst)}</span></div>
                <div className="flex justify-between font-bold text-base border-t pt-1"><span>Total:</span><span className="text-yellow-700">{fmt(calc.total)}</span></div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Rate Alert</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">Get notified when 22K gold reaches your target price. Alert fires in real-time via the live SSE stream.</p>
            <div>
              <Label>Alert when 22K gold goes above (${sym}/g)</Label>
              <Input type="number" value={alertPrice} onChange={e => { setAlertPrice(e.target.value); setAlertActive(false); alertRef.current.fired = false; }} placeholder="e.g. 7000" />
            </div>
            <Button onClick={setAlert} disabled={!alertPrice} className="w-full">
              <Bell className="h-4 w-4 mr-2" /> {alertActive ? "Alert Active ✓" : "Set Alert"}
            </Button>
            {alertActive && <p className="text-xs text-green-600">Alert active: notify when 22K ≥ {sym}{alertPrice}/g</p>}
            <div className="bg-blue-50 rounded p-2 text-xs text-blue-700">
              <p className="font-medium mb-0.5">Live Rate Source</p>
              <p>Connected to GoldAPI.io (MCX-correlated) via Server-Sent Events. Rate refreshes every 60 seconds from live API when GOLDAPI_KEY is configured; otherwise uses ±0.2% random walk simulation for demo.</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {Array.isArray(history) && history.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Rate History</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Date / Time</TableHead><TableHead>Metal</TableHead><TableHead>Purity</TableHead><TableHead className="text-right">Rate (${sym}/g)</TableHead><TableHead>Source</TableHead></TableRow></TableHeader>
              <TableBody>
                {history.slice(0, 20).map((h: any, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-xs">{h.recorded_at ? new Date(h.recorded_at).toLocaleString("en-IN") : "—"}</TableCell>
                    <TableCell className="capitalize text-xs">{h.metal}</TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{h.purity}</Badge></TableCell>
                    <TableCell className="text-right font-mono">{fmt(h.rate_per_gram)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{h.source}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
