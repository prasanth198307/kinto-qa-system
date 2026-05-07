import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Save, TrendingUp, Award, Truck, Shield, FileText, Zap, Microscope } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus } from "lucide-react";

function FL({ label, children }: any) {
  return <div className="space-y-1"><Label className="text-xs">{label}</Label>{children}</div>;
}
function SH({ title, action }: any) {
  return <div className="flex items-center justify-between gap-2 flex-wrap mb-4"><h2 className="text-lg font-semibold">{title}</h2>{action}</div>;
}
const today = () => new Date().toISOString().slice(0, 10);
const fmt = (n: any, d = 2) => Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: d });
const fmtWt = (n: any) => `${fmt(n, 3)} g`;

// ── Integration Configurations ────────────────────────────────────────────────
export function IntegrationConfigsSection() {
  const { toast } = useToast();
  const [tab, setTab] = useState<"mcx" | "bis" | "shipping" | "insurance" | "traces" | "xrf">("mcx");

  const { data: mcx = {} } = useQuery<any>({ queryKey: ["/api/gold-erp/config/mcx"] });
  const { data: bis = {} } = useQuery<any>({ queryKey: ["/api/gold-erp/config/bis"] });
  const { data: shipping = {} } = useQuery<any>({ queryKey: ["/api/gold-erp/config/shipping"] });
  const { data: insurance = {} } = useQuery<any>({ queryKey: ["/api/gold-erp/config/insurance"] });
  const { data: traces = {} } = useQuery<any>({ queryKey: ["/api/gold-erp/config/traces"] });
  const { data: xrfReadings = [] } = useQuery<any[]>({ queryKey: ["/api/gold-erp/config/xrf"] });

  const [mcxForm, setMcxForm] = useState<any>({});
  const [bisForm, setBisForm] = useState<any>({});
  const [shipForm, setShipForm] = useState<any>({});
  const [insForm, setInsForm] = useState<any>({});
  const [tracesForm, setTracesForm] = useState<any>({});
  const [xrfForm, setXrfForm] = useState<any>({});
  const [showXrfForm, setShowXrfForm] = useState(false);

  const [mcxLoaded, setMcxLoaded] = useState(false);
  const [bisLoaded, setBisLoaded] = useState(false);
  const [shipLoaded, setShipLoaded] = useState(false);
  const [insLoaded, setInsLoaded] = useState(false);
  const [tracesLoaded, setTracesLoaded] = useState(false);

  if (!mcxLoaded && mcx && Object.keys(mcx).length > 0) { setMcxForm(mcx); setMcxLoaded(true); }
  if (!bisLoaded && bis && Object.keys(bis).length > 0) { setBisForm(bis); setBisLoaded(true); }
  if (!shipLoaded && shipping && Object.keys(shipping).length > 0) { setShipForm(shipping); setShipLoaded(true); }
  if (!insLoaded && insurance && Object.keys(insurance).length > 0) { setInsForm(insurance); setInsLoaded(true); }
  if (!tracesLoaded && traces && Object.keys(traces).length > 0) { setTracesForm(traces); setTracesLoaded(true); }

  const mkMut = (endpoint: string, qk: string) => useMutation({
    mutationFn: (d: any) => apiRequest("PUT", `/api/gold-erp/config/${endpoint}`, d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: [qk] }); toast({ title: "Configuration saved" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const mcxMut = mkMut("mcx", "/api/gold-erp/config/mcx");
  const bisMut = mkMut("bis", "/api/gold-erp/config/bis");
  const shipMut = mkMut("shipping", "/api/gold-erp/config/shipping");
  const insMut = mkMut("insurance", "/api/gold-erp/config/insurance");
  const tracesMut = mkMut("traces", "/api/gold-erp/config/traces");
  const xrfMut = useMutation({
    mutationFn: (d: any) => apiRequest("POST", "/api/gold-erp/config/xrf", d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/gold-erp/config/xrf"] }); setShowXrfForm(false); setXrfForm({}); toast({ title: "XRF reading saved" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const tabs = [
    { key: "mcx", label: "MCX Rates", icon: TrendingUp },
    { key: "bis", label: "BIS / HUID", icon: Award },
    { key: "shipping", label: "Shipping", icon: Truck },
    { key: "insurance", label: "Insurance", icon: Shield },
    { key: "traces", label: "TDS / TRACES", icon: FileText },
    { key: "xrf", label: "XRF Readings", icon: Microscope },
  ] as const;

  const setM = (setter: any) => (k: string, v: any) => setter((p: any) => ({ ...p, [k]: v }));

  return (
    <>
      <SH title="Integration Configurations" action={tab === "xrf" ? <Button size="sm" onClick={() => setShowXrfForm(true)}><Plus className="h-4 w-4 mr-1" />Add Reading</Button> : null} />

      <div className="flex border-b mb-4 gap-0 overflow-x-auto">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key as any)} className={`px-4 py-2 text-sm whitespace-nowrap flex items-center gap-1 ${tab === key ? "border-b-2 border-primary font-medium" : "text-muted-foreground"}`}>
            <Icon className="h-3.5 w-3.5" />{label}
          </button>
        ))}
      </div>

      {/* MCX Rate Config */}
      {tab === "mcx" && (
        <Card className="max-w-lg">
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4" />MCX / Live Rate Integration</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <FL label="Rate Source">
              <Select value={mcxForm.rate_source || "manual"} onValueChange={v => setM(setMcxForm)("rate_source", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual Entry</SelectItem>
                  <SelectItem value="mcx">MCX API</SelectItem>
                  <SelectItem value="ibja">IBJA</SelectItem>
                  <SelectItem value="custom">Custom API</SelectItem>
                </SelectContent>
              </Select>
            </FL>
            {mcxForm.rate_source !== "manual" && (
              <FL label="API URL"><Input value={mcxForm.api_url || ""} onChange={e => setM(setMcxForm)("api_url", e.target.value)} placeholder="https://api.example.com/gold-rate" /></FL>
            )}
            <div className="grid grid-cols-2 gap-3">
              <FL label="Poll Interval (mins)"><Input type="number" value={mcxForm.poll_interval_mins || 60} onChange={e => setM(setMcxForm)("poll_interval_mins", e.target.value)} /></FL>
              <FL label="Fallback Source">
                <Select value={mcxForm.fallback_source || "manual"} onValueChange={v => setM(setMcxForm)("fallback_source", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="manual">Manual</SelectItem><SelectItem value="last_known">Last Known Rate</SelectItem></SelectContent>
                </Select>
              </FL>
            </div>
            <div className="flex items-center gap-3">
              <input type="checkbox" checked={!!mcxForm.auto_update} onChange={e => setM(setMcxForm)("auto_update", e.target.checked ? 1 : 0)} id="auto_update" />
              <Label htmlFor="auto_update" className="text-sm">Auto-update rates when polled</Label>
            </div>
            <div className="flex justify-end"><Button onClick={() => mcxMut.mutate(mcxForm)} disabled={mcxMut.isPending}><Save className="h-4 w-4 mr-1" />Save Config</Button></div>
          </CardContent>
        </Card>
      )}

      {/* BIS / HUID Config */}
      {tab === "bis" && (
        <Card className="max-w-lg">
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Award className="h-4 w-4" />BIS Hallmarking & HUID Configuration</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <FL label="BIS Login ID"><Input value={bisForm.bis_login_id || ""} onChange={e => setM(setBisForm)("bis_login_id", e.target.value)} /></FL>
              <FL label="BIS Licence No."><Input value={bisForm.bis_licence_no || ""} onChange={e => setM(setBisForm)("bis_licence_no", e.target.value)} /></FL>
            </div>
            <FL label="Hallmarking Centre Name"><Input value={bisForm.hallmarking_centre || ""} onChange={e => setM(setBisForm)("hallmarking_centre", e.target.value)} /></FL>
            <FL label="Centre Address"><Textarea value={bisForm.centre_address || ""} onChange={e => setM(setBisForm)("centre_address", e.target.value)} rows={3} /></FL>
            <div className="flex items-center gap-3">
              <input type="checkbox" checked={!!bisForm.auto_submit} onChange={e => setM(setBisForm)("auto_submit", e.target.checked ? 1 : 0)} id="auto_submit_bis" />
              <Label htmlFor="auto_submit_bis" className="text-sm">Auto-submit batches to BIS portal</Label>
            </div>
            <div className="flex justify-end"><Button onClick={() => bisMut.mutate(bisForm)} disabled={bisMut.isPending}><Save className="h-4 w-4 mr-1" />Save Config</Button></div>
          </CardContent>
        </Card>
      )}

      {/* Shipping Config */}
      {tab === "shipping" && (
        <Card className="max-w-lg">
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Truck className="h-4 w-4" />Armoured Van / Shipping Integration</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <FL label="Provider">
                <Select value={shipForm.provider || "shiprocket"} onValueChange={v => setM(setShipForm)("provider", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="shiprocket">Shiprocket</SelectItem>
                    <SelectItem value="delhivery">Delhivery</SelectItem>
                    <SelectItem value="bluedart">Blue Dart</SelectItem>
                    <SelectItem value="brinks">Brinks (Armoured)</SelectItem>
                    <SelectItem value="prosegur">Prosegur (Armoured)</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </FL>
              <FL label="Default Parcel Weight (kg)"><Input type="number" value={shipForm.default_weight_kg || 0.1} onChange={e => setM(setShipForm)("default_weight_kg", e.target.value)} /></FL>
            </div>
            <FL label="API / Booking URL"><Input value={shipForm.api_url || ""} onChange={e => setM(setShipForm)("api_url", e.target.value)} placeholder="https://api.shiprocket.in/v1" /></FL>
            <div className="flex items-center gap-3">
              <input type="checkbox" checked={!!shipForm.auto_book} onChange={e => setM(setShipForm)("auto_book", e.target.checked ? 1 : 0)} id="auto_book_ship" />
              <Label htmlFor="auto_book_ship" className="text-sm">Auto-book shipment when order dispatched</Label>
            </div>
            <div className="flex justify-end"><Button onClick={() => shipMut.mutate(shipForm)} disabled={shipMut.isPending}><Save className="h-4 w-4 mr-1" />Save Config</Button></div>
          </CardContent>
        </Card>
      )}

      {/* Insurance Config */}
      {tab === "insurance" && (
        <Card className="max-w-lg">
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Shield className="h-4 w-4" />Jewellery Insurance Configuration</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <FL label="Insurance Provider"><Input value={insForm.provider || ""} onChange={e => setM(setInsForm)("provider", e.target.value)} placeholder="New India / National" /></FL>
              <FL label="Policy No."><Input value={insForm.policy_no || ""} onChange={e => setM(setInsForm)("policy_no", e.target.value)} /></FL>
              <FL label="Coverage per gram (₹)"><Input type="number" value={insForm.coverage_per_gm || ""} onChange={e => setM(setInsForm)("coverage_per_gm", e.target.value)} /></FL>
              <FL label="Max Coverage (₹)"><Input type="number" value={insForm.max_coverage || ""} onChange={e => setM(setInsForm)("max_coverage", e.target.value)} /></FL>
              <FL label="Premium %"><Input type="number" value={insForm.premium_pct || ""} onChange={e => setM(setInsForm)("premium_pct", e.target.value)} /></FL>
              <FL label="Auto-insure above (g)"><Input type="number" value={insForm.auto_insure_above_gm || 100} onChange={e => setM(setInsForm)("auto_insure_above_gm", e.target.value)} /></FL>
              <FL label="Contact Name"><Input value={insForm.contact_name || ""} onChange={e => setM(setInsForm)("contact_name", e.target.value)} /></FL>
              <FL label="Contact Phone"><Input value={insForm.contact_phone || ""} onChange={e => setM(setInsForm)("contact_phone", e.target.value)} /></FL>
            </div>
            <div className="flex justify-end"><Button onClick={() => insMut.mutate(insForm)} disabled={insMut.isPending}><Save className="h-4 w-4 mr-1" />Save Config</Button></div>
          </CardContent>
        </Card>
      )}

      {/* TDS / TRACES Config */}
      {tab === "traces" && (
        <Card className="max-w-lg">
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4" />TDS / TRACES Configuration (Section 194Q)</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <FL label="TAN No."><Input value={tracesForm.tan_no || ""} onChange={e => setM(setTracesForm)("tan_no", e.target.value)} placeholder="AAAA99999A" /></FL>
              <FL label="Deductor Name"><Input value={tracesForm.deductor_name || ""} onChange={e => setM(setTracesForm)("deductor_name", e.target.value)} /></FL>
              <FL label="Deductor Type">
                <Select value={tracesForm.deductor_type || "company"} onValueChange={v => setM(setTracesForm)("deductor_type", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="company">Company</SelectItem><SelectItem value="individual">Individual</SelectItem><SelectItem value="firm">Firm</SelectItem><SelectItem value="huf">HUF</SelectItem></SelectContent>
                </Select>
              </FL>
              <FL label="TDS Rate %"><Input type="number" value={tracesForm.tds_rate_pct || 1} onChange={e => setM(setTracesForm)("tds_rate_pct", e.target.value)} /></FL>
              <FL label="Threshold per Buyer (₹)"><Input type="number" value={tracesForm.threshold_inr || 10000} onChange={e => setM(setTracesForm)("threshold_inr", e.target.value)} /></FL>
            </div>
            <div className="flex items-center gap-3">
              <input type="checkbox" checked={!!tracesForm.auto_deduct} onChange={e => setM(setTracesForm)("auto_deduct", e.target.checked ? 1 : 0)} id="auto_deduct_tds" />
              <Label htmlFor="auto_deduct_tds" className="text-sm">Auto-deduct TDS on qualifying invoices</Label>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-xs space-y-1">
              <p className="font-medium">Section 194Q Guide</p>
              <p className="text-muted-foreground">TDS @ 0.1% applies to purchases above ₹50 lakh per buyer per FY. For gold purchases, threshold is typically ₹10,000 under Section 194Q.</p>
            </div>
            <div className="flex justify-end"><Button onClick={() => tracesMut.mutate(tracesForm)} disabled={tracesMut.isPending}><Save className="h-4 w-4 mr-1" />Save Config</Button></div>
          </CardContent>
        </Card>
      )}

      {/* XRF Readings */}
      {tab === "xrf" && (
        <>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50"><tr>{["Device", "Sample ID", "Gold%", "Silver%", "Copper%", "Zinc%", "Total Purity%", "Date"].map(h => <th key={h} className="px-4 py-2 text-left">{h}</th>)}</tr></thead>
              <tbody>
                {(xrfReadings as any[]).map((r: any) => (
                  <tr key={r.id} className={`border-t hover:bg-muted/30 ${r.total_purity_pct && Number(r.total_purity_pct) < 91 ? "bg-red-50/50" : ""}`}>
                    <td className="px-4 py-2 text-xs">{r.device_id || "—"}</td>
                    <td className="px-4 py-2 text-xs font-mono">{r.sample_id || "—"}</td>
                    <td className="px-4 py-2 font-semibold text-amber-700">{r.gold_pct ? `${fmt(r.gold_pct, 2)}%` : "—"}</td>
                    <td className="px-4 py-2">{r.silver_pct ? `${fmt(r.silver_pct, 2)}%` : "—"}</td>
                    <td className="px-4 py-2">{r.copper_pct ? `${fmt(r.copper_pct, 2)}%` : "—"}</td>
                    <td className="px-4 py-2">{r.zinc_pct ? `${fmt(r.zinc_pct, 2)}%` : "—"}</td>
                    <td className="px-4 py-2 font-bold">{r.total_purity_pct ? `${fmt(r.total_purity_pct, 2)}%` : "—"}</td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">{r.reading_date?.slice(0, 10)}</td>
                  </tr>
                ))}
                {xrfReadings.length === 0 && <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">No XRF readings recorded</td></tr>}
              </tbody>
            </table>
          </div>

          <Dialog open={showXrfForm} onOpenChange={setShowXrfForm}>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle>Add XRF Purity Reading</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <FL label="Device ID"><Input value={xrfForm.device_id || ""} onChange={e => setXrfForm((p: any) => ({ ...p, device_id: e.target.value }))} placeholder="XRF-001" /></FL>
                  <FL label="Sample ID"><Input value={xrfForm.sample_id || ""} onChange={e => setXrfForm((p: any) => ({ ...p, sample_id: e.target.value }))} /></FL>
                  <FL label="Gold %"><Input type="number" value={xrfForm.gold_pct || ""} onChange={e => setXrfForm((p: any) => ({ ...p, gold_pct: e.target.value }))} /></FL>
                  <FL label="Silver %"><Input type="number" value={xrfForm.silver_pct || ""} onChange={e => setXrfForm((p: any) => ({ ...p, silver_pct: e.target.value }))} /></FL>
                  <FL label="Copper %"><Input type="number" value={xrfForm.copper_pct || ""} onChange={e => setXrfForm((p: any) => ({ ...p, copper_pct: e.target.value }))} /></FL>
                  <FL label="Zinc %"><Input type="number" value={xrfForm.zinc_pct || ""} onChange={e => setXrfForm((p: any) => ({ ...p, zinc_pct: e.target.value }))} /></FL>
                </div>
                <div className="flex gap-2 justify-end"><Button variant="outline" onClick={() => setShowXrfForm(false)}>Cancel</Button><Button onClick={() => xrfMut.mutate(xrfForm)} disabled={xrfMut.isPending}>Save Reading</Button></div>
              </div>
            </DialogContent>
          </Dialog>
        </>
      )}
    </>
  );
}
