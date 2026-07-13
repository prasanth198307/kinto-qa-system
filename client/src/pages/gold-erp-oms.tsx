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
import { Plus, Pencil, CheckCircle, Bell, MessageSquare, Search } from "lucide-react";
import { useTenantConfig, formatCurrency as fmtCur } from "@/hooks/use-tenant-config";

const fmt = (n: any, d = 2) => Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: d });
const fmtAmt = (n: any) => `${sym}${fmt(n)}`;
const today = () => new Date().toISOString().slice(0, 10);

function FL({ label, children }: any) {
  return <div className="space-y-1"><Label className="text-xs">{label}</Label>{children}</div>;
}
function SH({ title, action }: any) {
  return <div className="flex items-center justify-between gap-2 flex-wrap mb-4"><h2 className="text-lg font-semibold">{title}</h2>{action}</div>;
}

const STATUS_STEPS = ["booked", "design_approved", "in_production", "qc", "ready", "dispatched", "delivered"];

function StatusTimeline({ current }: { current: string }) {
  const idx = STATUS_STEPS.indexOf(current);
  const tenantConfig = useTenantConfig();
  const sym = tenantConfig.currency_symbol;
  return (
    <div className="flex items-center gap-1 mt-2">
      {STATUS_STEPS.map((s, i) => (
        <div key={s} className="flex items-center gap-0.5">
          <div className={`w-2 h-2 rounded-full ${i <= idx ? "bg-primary" : "bg-muted"}`} title={s} />
          {i < STATUS_STEPS.length - 1 && <div className={`h-0.5 w-4 ${i < idx ? "bg-primary" : "bg-muted"}`} />}
        </div>
      ))}
      <span className="text-xs text-muted-foreground ml-1 capitalize">{current?.replace(/_/g, " ")}</span>
    </div>
  );
}

// ── OMS Orders ────────────────────────────────────────────────────────────────
export function OMSOrdersSection() {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [showTimeline, setShowTimeline] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<any>({ order_type: "new_design", metal_type: "gold", advance_mode: "cash" });
  const { data: orders = [] } = useQuery<any[]>({ queryKey: ["/api/gold-erp/oms-orders"] });
  const { data: timeline = [] } = useQuery<any[]>({
    queryKey: ["/api/gold-erp/oms-orders", selectedOrder?.id, "timeline"],
    queryFn: () => selectedOrder ? fetch(`/api/gold-erp/oms-orders/${selectedOrder.id}/timeline`).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); }) : Promise.resolve([]),
    enabled: !!selectedOrder,
  });
  const set = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));

  const saveMut = useMutation({
    mutationFn: (d: any) => apiRequest("POST", "/api/gold-erp/oms-orders", d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gold-erp/oms-orders"] });
      setShowForm(false); setForm({ order_type: "new_design", metal_type: "gold", advance_mode: "cash" });
      toast({ title: "Order created" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, status }: any) => apiRequest("PUT", `/api/gold-erp/oms-orders/${id}`, { status, changed_by: "staff" }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/gold-erp/oms-orders"] }); queryClient.invalidateQueries({ queryKey: ["/api/gold-erp/oms-orders", selectedOrder?.id, "timeline"] }); toast({ title: "Status updated" }); },
  });

  const filtered = (orders as any[]).filter(o =>
    o.customer_name?.toLowerCase().includes(search.toLowerCase()) || o.order_no?.includes(search));

  const NEXT_STATUS: Record<string, string> = {
    booked: "design_approved", design_approved: "in_production", in_production: "qc",
    qc: "ready", ready: "dispatched", dispatched: "delivered"
  };

  return (
    <>
      <SH title="Order Management System (OMS)" action={
        <div className="flex items-center gap-2">
          <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9 w-44" placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} /></div>
          <Button size="sm" data-testid="button-new-oms-order" onClick={() => setShowForm(true)}><Plus className="h-4 w-4 mr-1" />New Order</Button>
        </div>
      } />
      <div className="space-y-3">
        {filtered.map((o: any) => (
          <Card key={o.id} data-testid={`card-oms-order-${o.id}`}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <p className="font-semibold">{o.order_no} <Badge className="text-xs ml-2 capitalize">{o.order_type?.replace(/_/g, " ")}</Badge></p>
                  <p className="font-medium text-sm mt-0.5">{o.customer_name}</p>
                  <p className="text-xs text-muted-foreground">{o.customer_phone}{o.customer_email ? ` · ${o.customer_email}` : ""}</p>
                  {o.design_ref && <p className="text-xs text-muted-foreground">Design: {o.design_ref}</p>}
                  <StatusTimeline current={o.status} />
                </div>
                <div className="text-right space-y-1">
                  <p className="text-sm"><span className="text-muted-foreground">Advance: </span><span className="font-semibold">{fmtAmt(o.advance_paid)}</span></p>
                  {o.expected_delivery && <p className="text-xs text-muted-foreground">By {o.expected_delivery}</p>}
                  <div className="flex gap-1 justify-end">
                    {NEXT_STATUS[o.status] && (
                      <Button size="sm" data-testid={`button-advance-${o.id}`} onClick={() => updateMut.mutate({ id: o.id, status: NEXT_STATUS[o.status] })}>
                        → {NEXT_STATUS[o.status]?.replace(/_/g, " ")}
                      </Button>
                    )}
                    <Button size="sm" variant="outline" data-testid={`button-timeline-${o.id}`} onClick={() => { setSelectedOrder(o); setShowTimeline(true); }}>Timeline</Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && <p className="text-center text-muted-foreground py-8">No OMS orders found</p>}
      </div>

      {/* New Order Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg max-h-[90dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Customer Order</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <FL label="Customer Name *"><Input value={form.customer_name || ""} onChange={e => set("customer_name", e.target.value)} /></FL>
              <FL label="Phone *"><Input value={form.customer_phone || ""} onChange={e => set("customer_phone", e.target.value)} /></FL>
              <FL label="Email"><Input type="email" value={form.customer_email || ""} onChange={e => set("customer_email", e.target.value)} /></FL>
              <FL label="Order Type">
                <Select value={form.order_type || "new_design"} onValueChange={v => set("order_type", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="new_design">New Design</SelectItem><SelectItem value="catalogue">From Catalogue</SelectItem><SelectItem value="repair">Repair</SelectItem><SelectItem value="resize">Resize</SelectItem><SelectItem value="custom">Custom</SelectItem></SelectContent>
                </Select>
              </FL>
              <FL label="Metal">
                <Select value={form.metal_type || "gold"} onValueChange={v => set("metal_type", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="gold">Gold</SelectItem><SelectItem value="silver">Silver</SelectItem><SelectItem value="platinum">Platinum</SelectItem></SelectContent>
                </Select>
              </FL>
              <FL label="Purity"><Input value={form.purity_name || ""} onChange={e => set("purity_name", e.target.value)} placeholder="22K (916)" /></FL>
              <FL label="Approx Weight (g)"><Input type="number" value={form.approx_weight_gm || ""} onChange={e => set("approx_weight_gm", e.target.value)} /></FL>
              <FL label="Making Charges Quoted "><Input type="number" value={form.making_charges_quoted || ""} onChange={e => set("making_charges_quoted", e.target.value)} /></FL>
              <FL label="Advance Paid "><Input type="number" value={form.advance_paid || ""} onChange={e => set("advance_paid", e.target.value)} /></FL>
              <FL label="Advance Mode">
                <Select value={form.advance_mode || "cash"} onValueChange={v => set("advance_mode", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="cash">Cash</SelectItem><SelectItem value="upi">UPI</SelectItem><SelectItem value="card">Card</SelectItem><SelectItem value="bank">Bank Transfer</SelectItem></SelectContent>
                </Select>
              </FL>
              <FL label="Expected Delivery"><Input type="date" value={form.expected_delivery || ""} onChange={e => set("expected_delivery", e.target.value)} /></FL>
              <FL label="Counter Staff"><Input value={form.counter_staff || ""} onChange={e => set("counter_staff", e.target.value)} /></FL>
            </div>
            <FL label="Design Reference"><Input value={form.design_ref || ""} onChange={e => set("design_ref", e.target.value)} placeholder="Design code or catalogue ref" /></FL>
            <FL label="Stone Requirements"><Textarea value={form.stone_requirements || ""} onChange={e => set("stone_requirements", e.target.value)} rows={2} /></FL>
            <FL label="Customisation Notes"><Textarea value={form.customisation_notes || ""} onChange={e => set("customisation_notes", e.target.value)} rows={2} /></FL>
            <div className="flex gap-2 justify-end"><Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button><Button onClick={() => saveMut.mutate(form)} disabled={saveMut.isPending}>Create Order</Button></div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Timeline Dialog */}
      <Dialog open={showTimeline} onOpenChange={v => { setShowTimeline(v); if (!v) setSelectedOrder(null); }}>
        <DialogContent className="max-w-md max-h-[90dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>Order Timeline — {selectedOrder?.order_no}</DialogTitle></DialogHeader>
          <div className="space-y-2">
            {(timeline as any[]).map((t: any, i: number) => (
              <div key={t.id} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center"><CheckCircle className="h-3 w-3 text-primary-foreground" /></div>
                  {i < timeline.length - 1 && <div className="w-0.5 h-8 bg-muted mt-1" />}
                </div>
                <div className="pb-2">
                  <p className="text-sm font-medium capitalize">{t.status?.replace(/_/g, " ")}</p>
                  <p className="text-xs text-muted-foreground">{t.changed_by} · {new Date(t.changed_at).toLocaleString("en-IN")}</p>
                  {t.notes && <p className="text-xs text-muted-foreground mt-0.5">{t.notes}</p>}
                </div>
              </div>
            ))}
            {timeline.length === 0 && <p className="text-center text-muted-foreground py-4">No timeline events</p>}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── OMS Notification Config ───────────────────────────────────────────────────
export function OMSNotifyConfigSection() {
  const { toast } = useToast();
  const { data: config = {} } = useQuery<any>({ queryKey: ["/api/gold-erp/oms-notify-config"] });
  const [form, setForm] = useState<any>({});
  const [loaded, setLoaded] = useState(false);

  if (!loaded && config && Object.keys(config).length > 0) { setForm(config); setLoaded(true); }

  const set = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));

  const saveMut = useMutation({
    mutationFn: (d: any) => apiRequest("PUT", "/api/gold-erp/oms-notify-config", d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/gold-erp/oms-notify-config"] }); toast({ title: "Notification config saved" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const EVENTS = [
    { key: "notify_booked", label: "Order Booked" },
    { key: "notify_in_prod", label: "In Production" },
    { key: "notify_qc", label: "QC Stage" },
    { key: "notify_ready", label: "Order Ready" },
    { key: "notify_dispatched", label: "Dispatched" },
    { key: "notify_delivered", label: "Delivered" },
  ];

  return (
    <>
      <SH title="OMS Notification Configuration" />
      <Card className="max-w-lg">
        <CardContent className="p-4 space-y-4">
          <FL label="Notification Channel">
            <Select value={form.channel || "whatsapp"} onValueChange={v => set("channel", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="whatsapp">WhatsApp</SelectItem><SelectItem value="sms">SMS</SelectItem><SelectItem value="email">Email</SelectItem><SelectItem value="all">All Channels</SelectItem></SelectContent>
            </Select>
          </FL>
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Notify Customer When:</p>
            {EVENTS.map(({ key, label }) => (
              <label key={key} className="flex items-center gap-3 cursor-pointer hover:bg-muted/30 rounded px-2 py-1">
                <input type="checkbox" checked={!!form[key]} onChange={e => set(key, e.target.checked ? 1 : 0)} />
                <div>
                  <p className="text-sm">{label}</p>
                </div>
              </label>
            ))}
          </div>
          <div className="flex justify-end">
            <Button onClick={() => saveMut.mutate(form)} disabled={saveMut.isPending}><Bell className="h-4 w-4 mr-1" />Save Config</Button>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
