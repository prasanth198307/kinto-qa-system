import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Barcode, Scale, Printer, DollarSign, CheckCircle, XCircle } from "lucide-react";

const api = (m: string, p: string, b?: any) =>
  fetch(p, { method: m, headers: { "Content-Type": "application/json" }, body: b ? JSON.stringify(b) : undefined }).then(async (r) => {
    const d = await r.json();
    if (!r.ok) throw new Error(d.message || "Request failed");
    return d;
  });

export default function RetailPOSHardwarePage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [cfg, setCfg] = useState<any>({ scale_type: "none", cash_drawer: "printer_kick", pole_display: "none", label_printer: "none" });
  const [scanValue, setScanValue] = useState("");
  const [scanResult, setScanResult] = useState<any>(null);
  const [labelProductId, setLabelProductId] = useState("");
  const [labelQty, setLabelQty] = useState("1");
  const scanRef = useRef<HTMLInputElement>(null);

  const { data: config } = useQuery<any>({ queryKey: ["pos-hw-config"], queryFn: () => api("GET", "/api/pos/hardware/config") });
  useEffect(() => { if (config && Object.keys(config).length) setCfg((p: any) => ({ ...p, ...config })); }, [config]);

  const cfgMut = useMutation({
    mutationFn: () => api("POST", "/api/pos/hardware/config", cfg),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["pos-hw-config"] }); toast({ title: "Hardware config saved" }); },
  });
  const scaleMut = useMutation({
    mutationFn: () => api("POST", "/api/pos/hardware/scale/read", {}),
    onSuccess: (d: any) => toast({ title: `Scale reads ${d.weight} ${d.unit}` }),
  });
  const drawerMut = useMutation({
    mutationFn: () => api("POST", "/api/pos/hardware/cash-drawer/open", {}),
    onSuccess: () => toast({ title: "Cash drawer kick sent" }),
  });
  const labelMut = useMutation({
    mutationFn: () => api("POST", "/api/pos/hardware/label-print", { product_id: Number(labelProductId), qty: Number(labelQty) }),
    onSuccess: (d: any) => toast({ title: `${d.qty} label(s) queued for ${d.product.name} (${d.product.barcode || "no barcode"})` }),
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const testScan = async (code: string) => {
    if (!code.trim()) return;
    try {
      const r = await fetch(`/api/pos/products/barcode/${encodeURIComponent(code.trim())}`, { credentials: "include" });
      const d = await r.json();
      setScanResult(r.ok ? { ok: true, product: d } : { ok: false, code });
    } catch {
      setScanResult({ ok: false, code });
    }
    setScanValue("");
    scanRef.current?.focus();
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-2"><Barcode className="w-6 h-6 text-blue-600" /><h1 className="text-2xl font-bold">POS Hardware</h1></div>
      <p className="text-sm text-muted-foreground">USB and Bluetooth barcode scanners work in keyboard-wedge mode — scan into the test field below or directly into the POS billing screen (input is auto-focused during an active session).</p>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Barcode className="w-4 h-4" />Scanner Test</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Input
              ref={scanRef}
              value={scanValue}
              onChange={e => setScanValue(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") testScan(scanValue); }}
              placeholder="Focus here and scan a barcode..."
              autoFocus
            />
            {scanResult && (
              scanResult.ok ? (
                <div className="border border-green-300 bg-green-50 rounded p-3 flex items-center gap-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <div><strong>{scanResult.product.name}</strong> — ₹{Number(scanResult.product.selling_price || scanResult.product.price || 0)} · SKU {scanResult.product.sku || "—"}</div>
                </div>
              ) : (
                <div className="border border-red-300 bg-red-50 rounded p-3 flex items-center gap-2 text-sm">
                  <XCircle className="w-4 h-4 text-red-600" />
                  <div>No product found for barcode <span className="font-mono">{scanResult.code}</span></div>
                </div>
              )
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Printer className="w-4 h-4" />Label Printing</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs">Product ID</Label><Input type="number" value={labelProductId} onChange={e => setLabelProductId(e.target.value)} className="h-8" /></div>
              <div><Label className="text-xs">Qty</Label><Input type="number" value={labelQty} onChange={e => setLabelQty(e.target.value)} className="h-8" /></div>
            </div>
            <Button size="sm" onClick={() => labelMut.mutate()} disabled={labelMut.isPending || !labelProductId}>Print Barcode Labels</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Device Configuration</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {[
              { key: "scale_type", label: "Weighing Scale", options: ["none", "serial_rs232", "usb_hid", "bluetooth"] },
              { key: "cash_drawer", label: "Cash Drawer", options: ["none", "printer_kick", "usb_trigger"] },
              { key: "pole_display", label: "Pole Display", options: ["none", "serial", "usb"] },
              { key: "label_printer", label: "Label Printer", options: ["none", "tsc", "zebra", "citizen"] },
            ].map(d => (
              <div key={d.key}><Label className="text-xs">{d.label}</Label>
                <Select value={cfg[d.key] || "none"} onValueChange={v => setCfg((p: any) => ({ ...p, [d.key]: v }))}>
                  <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>{d.options.map(o => <SelectItem key={o} value={o}>{o.replace("_", " ").toUpperCase()}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            ))}
            <Button size="sm" onClick={() => cfgMut.mutate()} disabled={cfgMut.isPending}>Save Config</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Device Tests</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <Button size="sm" variant="outline" className="w-full justify-start" onClick={() => scaleMut.mutate()} disabled={scaleMut.isPending}>
              <Scale className="w-4 h-4 mr-2" />Read Weighing Scale
            </Button>
            <Button size="sm" variant="outline" className="w-full justify-start" onClick={() => drawerMut.mutate()} disabled={drawerMut.isPending}>
              <DollarSign className="w-4 h-4 mr-2" />Open Cash Drawer
            </Button>
            <div className="text-xs text-muted-foreground pt-2">
              Scanner: <Badge variant="outline" className="text-xs">keyboard-wedge (no config needed)</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
