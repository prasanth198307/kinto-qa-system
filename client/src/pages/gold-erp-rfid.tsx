import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, AlertTriangle, CheckCircle, Wifi, Truck, Shield, Scan } from "lucide-react";

const fmt = (n: any, d = 2) => Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: d });
const fmtWt = (n: any) => `${fmt(n, 3)} g`;
const today = () => new Date().toISOString().slice(0, 10);

function FL({ label, children }: any) {
  return <div className="space-y-1"><Label className="text-xs">{label}</Label>{children}</div>;
}
function SH({ title, action }: any) {
  return <div className="flex items-center justify-between gap-2 flex-wrap mb-4"><h2 className="text-lg font-semibold">{title}</h2>{action}</div>;
}

// ── RFID Main ─────────────────────────────────────────────────────────────────
export function RFIDSection() {
  const { toast } = useToast();
  const [tab, setTab] = useState<"tags" | "sessions" | "alerts" | "dispatch" | "movements">("tags");
  const [showTagForm, setShowTagForm] = useState(false);
  const [showSessionForm, setShowSessionForm] = useState(false);
  const [showAlertForm, setShowAlertForm] = useState(false);
  const [showDispatchForm, setShowDispatchForm] = useState(false);
  const [tagForm, setTagForm] = useState<any>({ tag_type: "uhf", location: "showroom" });
  const [sessionForm, setSessionForm] = useState<any>({ scan_mode: "full_audit" });
  const [alertForm, setAlertForm] = useState<any>({ alert_type: "missing" });
  const [dispatchForm, setDispatchForm] = useState<any>({ expected_items: [], scanned_items: [] });

  const { data: tags = [] } = useQuery<any[]>({ queryKey: ["/api/gold-erp/rfid-tags"] });
  const { data: sessions = [] } = useQuery<any[]>({ queryKey: ["/api/gold-erp/rfid-sessions"] });
  const { data: alerts = [] } = useQuery<any[]>({ queryKey: ["/api/gold-erp/rfid-alerts"] });
  const { data: dispatches = [] } = useQuery<any[]>({ queryKey: ["/api/gold-erp/rfid-dispatch"] });
  const { data: movements = [] } = useQuery<any[]>({ queryKey: ["/api/gold-erp/rfid-gate-movements"] });

  const tagMut = useMutation({
    mutationFn: (d: any) => apiRequest("POST", "/api/gold-erp/rfid-tags", d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/gold-erp/rfid-tags"] }); setShowTagForm(false); setTagForm({ tag_type: "uhf", location: "showroom" }); toast({ title: "Tag registered" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const sessionMut = useMutation({
    mutationFn: (d: any) => apiRequest("POST", "/api/gold-erp/rfid-sessions", d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/gold-erp/rfid-sessions"] }); setShowSessionForm(false); toast({ title: "Scan session started" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const alertAckMut = useMutation({
    mutationFn: ({ id }: any) => apiRequest("PUT", `/api/gold-erp/rfid-alerts/${id}/acknowledge`, { acknowledged_by: "staff", action_taken: "Reviewed" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/gold-erp/rfid-alerts"] }),
  });
  const dispatchMut = useMutation({
    mutationFn: (d: any) => apiRequest("POST", "/api/gold-erp/rfid-dispatch", d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/gold-erp/rfid-dispatch"] }); setShowDispatchForm(false); toast({ title: "Dispatch validated" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const unacknowledgedAlerts = (alerts as any[]).filter(a => !a.acknowledged);

  const tabDef = [
    ["tags", "Tag Registry", Wifi],
    ["sessions", "Scan Sessions", Scan],
    ["alerts", `Alerts${unacknowledgedAlerts.length > 0 ? ` (${unacknowledgedAlerts.length})` : ""}`, AlertTriangle],
    ["dispatch", "Dispatch Validation", Truck],
    ["movements", "Gate Movements", Shield],
  ] as const;

  return (
    <>
      <SH title="RFID Management" action={
        tab === "tags" ? <Button size="sm" onClick={() => setShowTagForm(true)}><Plus className="h-4 w-4 mr-1" />Register Tag</Button>
          : tab === "sessions" ? <Button size="sm" onClick={() => setShowSessionForm(true)}><Plus className="h-4 w-4 mr-1" />Start Session</Button>
          : tab === "dispatch" ? <Button size="sm" onClick={() => setShowDispatchForm(true)}><Plus className="h-4 w-4 mr-1" />Validate Dispatch</Button>
          : null
      } />

      <div className="flex border-b mb-4 gap-0 overflow-x-auto">
        {tabDef.map(([k, l]) => (
          <button key={k} onClick={() => setTab(k as any)} className={`px-3 py-2 text-sm whitespace-nowrap ${tab === k ? "border-b-2 border-primary font-medium" : "text-muted-foreground"}`}>{l}</button>
        ))}
      </div>

      {tab === "tags" && (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50"><tr>{["Tag ID", "EPC Code", "Design", "Metal", "Weight", "HUID", "Location", "Type", "Active"].map(h => <th key={h} className="px-4 py-2 text-left">{h}</th>)}</tr></thead>
            <tbody>
              {(tags as any[]).map((t: any) => (
                <tr key={t.id} className="border-t hover:bg-muted/30">
                  <td className="px-4 py-2 font-mono text-xs font-semibold">{t.tag_id}</td>
                  <td className="px-4 py-2 font-mono text-xs">{t.epc_code || "—"}</td>
                  <td className="px-4 py-2 text-xs">{t.design_code || "—"}</td>
                  <td className="px-4 py-2 capitalize text-xs">{t.metal_type || "—"}</td>
                  <td className="px-4 py-2">{t.weight_gm ? fmtWt(t.weight_gm) : "—"}</td>
                  <td className="px-4 py-2 font-mono text-xs text-blue-600">{t.huid_no || "—"}</td>
                  <td className="px-4 py-2"><Badge className="text-xs capitalize">{t.location}</Badge></td>
                  <td className="px-4 py-2 text-xs uppercase">{t.tag_type}</td>
                  <td className="px-4 py-2">{t.is_active ? <CheckCircle className="h-4 w-4 text-green-500" /> : "—"}</td>
                </tr>
              ))}
              {tags.length === 0 && <tr><td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">No RFID tags registered</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {tab === "sessions" && (
        <div className="space-y-3">
          {(sessions as any[]).map((s: any) => (
            <Card key={s.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <p className="font-semibold">{s.session_code}</p>
                    <p className="text-xs text-muted-foreground">{s.location} · {s.scanner_device || "Unknown device"} · {s.scan_mode?.replace(/_/g, " ")}</p>
                    <p className="text-xs text-muted-foreground">{s.scan_date?.slice(0, 10)}</p>
                  </div>
                  <Badge className={`text-xs ${s.status === "completed" ? "bg-green-100 text-green-700" : s.status === "discrepancy" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"}`}>{s.status}</Badge>
                </div>
                {s.tags_scanned > 0 && (
                  <div className="grid grid-cols-4 gap-2 mt-3 text-xs text-center">
                    <div className="bg-muted/50 rounded p-2"><p className="text-muted-foreground">Scanned</p><p className="font-bold">{s.tags_scanned}</p></div>
                    <div className="bg-green-50 dark:bg-green-900/20 rounded p-2"><p className="text-muted-foreground">Matched</p><p className="font-bold text-green-700">{s.tags_matched}</p></div>
                    <div className="bg-red-50 dark:bg-red-900/10 rounded p-2"><p className="text-muted-foreground">Missing</p><p className="font-bold text-red-600">{s.tags_missing}</p></div>
                    <div className="bg-amber-50 dark:bg-amber-900/10 rounded p-2"><p className="text-muted-foreground">Extra</p><p className="font-bold text-amber-700">{s.tags_extra}</p></div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
          {sessions.length === 0 && <p className="text-center text-muted-foreground py-8">No scan sessions yet</p>}
        </div>
      )}

      {tab === "alerts" && (
        <div className="space-y-3">
          {(alerts as any[]).map((a: any) => (
            <Card key={a.id} className={!a.acknowledged ? "border-red-200 dark:border-red-800" : ""}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <AlertTriangle className={`h-4 w-4 ${!a.acknowledged ? "text-red-500" : "text-muted-foreground"}`} />
                      <p className="font-semibold capitalize">{a.alert_type?.replace(/_/g, " ")} Alert</p>
                      {a.acknowledged && <Badge className="bg-green-100 text-green-700 text-xs">Acknowledged</Badge>}
                    </div>
                    <p className="text-sm">{a.description || "—"}</p>
                    {a.tag_id && <p className="text-xs text-muted-foreground mt-0.5">Tag: {a.tag_id} · Item: {a.item_code || "—"} · Location: {a.location || "—"}</p>}
                    <p className="text-xs text-muted-foreground">{a.triggered_at ? new Date(a.triggered_at).toLocaleString("en-IN") : "—"}</p>
                  </div>
                  {!a.acknowledged && (
                    <Button size="sm" variant="outline" onClick={() => alertAckMut.mutate({ id: a.id })}>Acknowledge</Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
          {alerts.length === 0 && <div className="flex flex-col items-center py-12 gap-2 text-muted-foreground"><CheckCircle className="h-10 w-10 text-green-500" /><p>No RFID alerts — all clear!</p></div>}
        </div>
      )}

      {tab === "dispatch" && (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50"><tr>{["No.", "Customer", "Expected", "Scanned", "Missing", "Extra", "Status", "Seal", "Date"].map(h => <th key={h} className="px-4 py-2 text-left">{h}</th>)}</tr></thead>
            <tbody>
              {(dispatches as any[]).map((d: any) => (
                <tr key={d.id} className="border-t hover:bg-muted/30">
                  <td className="px-4 py-2 text-xs font-mono">{d.validation_no}</td>
                  <td className="px-4 py-2">{d.customer_name || "—"}</td>
                  <td className="px-4 py-2 text-center">{d.expected_items?.length || 0}</td>
                  <td className="px-4 py-2 text-center">{d.scanned_items?.length || 0}</td>
                  <td className="px-4 py-2 text-center text-red-600 font-semibold">{d.missing_count || 0}</td>
                  <td className="px-4 py-2 text-center text-amber-600">{d.extra_count || 0}</td>
                  <td className="px-4 py-2"><Badge className={`text-xs ${d.all_matched ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>{d.status}</Badge></td>
                  <td className="px-4 py-2 font-mono text-xs">{d.seal_no || "—"}</td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">{d.created_at?.slice(0, 10)}</td>
                </tr>
              ))}
              {dispatches.length === 0 && <tr><td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">No dispatch validations yet</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {tab === "movements" && (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50"><tr>{["Tag ID", "Item Code", "From", "To", "Weight", "Date"].map(h => <th key={h} className="px-4 py-2 text-left">{h}</th>)}</tr></thead>
            <tbody>
              {(movements as any[]).map((m: any) => (
                <tr key={m.id} className="border-t hover:bg-muted/30">
                  <td className="px-4 py-2 font-mono text-xs">{m.tag_id}</td>
                  <td className="px-4 py-2 text-xs">{m.item_code || "—"}</td>
                  <td className="px-4 py-2 capitalize text-xs">{m.from_location}</td>
                  <td className="px-4 py-2 capitalize text-xs">{m.to_location}</td>
                  <td className="px-4 py-2">{m.weight_gm ? fmtWt(m.weight_gm) : "—"}</td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">{m.movement_date?.slice(0, 10)}</td>
                </tr>
              ))}
              {movements.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No gate movements recorded</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* Tag Form */}
      <Dialog open={showTagForm} onOpenChange={setShowTagForm}>
        <DialogContent className="max-w-md max-h-[90dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>Register RFID Tag</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <FL label="Tag ID *"><Input value={tagForm.tag_id || ""} onChange={e => setTagForm((p: any) => ({ ...p, tag_id: e.target.value }))} placeholder="Scan or enter tag ID" /></FL>
              <FL label="EPC Code"><Input value={tagForm.epc_code || ""} onChange={e => setTagForm((p: any) => ({ ...p, epc_code: e.target.value }))} /></FL>
              <FL label="Tag Type">
                <Select value={tagForm.tag_type || "uhf"} onValueChange={v => setTagForm((p: any) => ({ ...p, tag_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="uhf">UHF</SelectItem><SelectItem value="hf">HF</SelectItem><SelectItem value="nfc">NFC</SelectItem></SelectContent>
                </Select>
              </FL>
              <FL label="Location">
                <Select value={tagForm.location || "showroom"} onValueChange={v => setTagForm((p: any) => ({ ...p, location: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="showroom">Showroom</SelectItem><SelectItem value="vault">Vault</SelectItem><SelectItem value="workshop">Workshop</SelectItem><SelectItem value="dispatch">Dispatch</SelectItem></SelectContent>
                </Select>
              </FL>
              <FL label="Design Code"><Input value={tagForm.design_code || ""} onChange={e => setTagForm((p: any) => ({ ...p, design_code: e.target.value }))} /></FL>
              <FL label="Metal"><Input value={tagForm.metal_type || ""} onChange={e => setTagForm((p: any) => ({ ...p, metal_type: e.target.value }))} placeholder="gold / silver" /></FL>
              <FL label="Weight (g)"><Input type="number" value={tagForm.weight_gm || ""} onChange={e => setTagForm((p: any) => ({ ...p, weight_gm: e.target.value }))} /></FL>
              <FL label="HUID No."><Input value={tagForm.huid_no || ""} onChange={e => setTagForm((p: any) => ({ ...p, huid_no: e.target.value }))} /></FL>
              <FL label="Encoded By"><Input value={tagForm.encoded_by || ""} onChange={e => setTagForm((p: any) => ({ ...p, encoded_by: e.target.value }))} /></FL>
            </div>
            <div className="flex gap-2 justify-end"><Button variant="outline" onClick={() => setShowTagForm(false)}>Cancel</Button><Button onClick={() => tagMut.mutate(tagForm)} disabled={tagMut.isPending}>Register Tag</Button></div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Session Form */}
      <Dialog open={showSessionForm} onOpenChange={setShowSessionForm}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Start Scan Session</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <FL label="Location"><Input value={sessionForm.location || ""} onChange={e => setSessionForm((p: any) => ({ ...p, location: e.target.value }))} placeholder="Showroom / Vault" /></FL>
            <FL label="Scanner Device"><Input value={sessionForm.scanner_device || ""} onChange={e => setSessionForm((p: any) => ({ ...p, scanner_device: e.target.value }))} /></FL>
            <FL label="Scan Mode">
              <Select value={sessionForm.scan_mode || "full_audit"} onValueChange={v => setSessionForm((p: any) => ({ ...p, scan_mode: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="full_audit">Full Audit</SelectItem><SelectItem value="spot_check">Spot Check</SelectItem><SelectItem value="dispatch">Dispatch</SelectItem><SelectItem value="receipt">Receipt</SelectItem></SelectContent>
              </Select>
            </FL>
            <FL label="Scanned By"><Input value={sessionForm.scanned_by || ""} onChange={e => setSessionForm((p: any) => ({ ...p, scanned_by: e.target.value }))} /></FL>
            <div className="flex gap-2 justify-end"><Button variant="outline" onClick={() => setShowSessionForm(false)}>Cancel</Button><Button onClick={() => sessionMut.mutate(sessionForm)} disabled={sessionMut.isPending}>Start Session</Button></div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dispatch Validation Form */}
      <Dialog open={showDispatchForm} onOpenChange={setShowDispatchForm}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Dispatch Validation</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <FL label="Customer Name"><Input value={dispatchForm.customer_name || ""} onChange={e => setDispatchForm((p: any) => ({ ...p, customer_name: e.target.value }))} /></FL>
            <FL label="Invoice ID"><Input type="number" value={dispatchForm.invoice_id || ""} onChange={e => setDispatchForm((p: any) => ({ ...p, invoice_id: parseInt(e.target.value) }))} /></FL>
            <FL label="Authorised By"><Input value={dispatchForm.authorised_by || ""} onChange={e => setDispatchForm((p: any) => ({ ...p, authorised_by: e.target.value }))} /></FL>
            <FL label="Seal No."><Input value={dispatchForm.seal_no || ""} onChange={e => setDispatchForm((p: any) => ({ ...p, seal_no: e.target.value }))} /></FL>
            <p className="text-xs text-muted-foreground">Note: Tag arrays are scanned via hardware in production. This form records a manual validation.</p>
            <div className="flex gap-2 justify-end"><Button variant="outline" onClick={() => setShowDispatchForm(false)}>Cancel</Button><Button onClick={() => dispatchMut.mutate(dispatchForm)} disabled={dispatchMut.isPending}>Validate</Button></div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
