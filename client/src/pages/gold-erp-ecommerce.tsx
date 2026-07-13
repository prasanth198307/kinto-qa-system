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
import { Plus, Settings, Users, ShoppingCart, Tag, TrendingUp, Pencil, Save } from "lucide-react";
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

// ── E-Commerce Store ──────────────────────────────────────────────────────────
export function ECommerceSection() {
  const tenantConfig = useTenantConfig();
  const sym = tenantConfig.currency_symbol;
  const { toast } = useToast();
  const [tab, setTab] = useState<"config" | "customers" | "orders" | "coupons" | "rates">("config");
  const [showCouponForm, setShowCouponForm] = useState(false);
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [showRateForm, setShowRateForm] = useState(false);
  const [couponForm, setCouponForm] = useState<any>({ discount_type: "pct" });
  const [customerForm, setCustomerForm] = useState<any>({});
  const [rateForm, setRateForm] = useState<any>({ metal_type: "gold", source: "manual" });
  const [configForm, setConfigForm] = useState<any>({});
  const [configLoaded, setConfigLoaded] = useState(false);

  const { data: config = {} } = useQuery<any>({ queryKey: ["/api/gold-erp/ecom-config"] });
  const { data: customers = [] } = useQuery<any[]>({ queryKey: ["/api/gold-erp/ecom-customers"] });
  const { data: orders = [] } = useQuery<any[]>({ queryKey: ["/api/gold-erp/ecom-orders"] });
  const { data: coupons = [] } = useQuery<any[]>({ queryKey: ["/api/gold-erp/ecom-coupons"] });
  const { data: rateHistory = [] } = useQuery<any[]>({ queryKey: ["/api/gold-erp/ecom-rate-history"] });

  if (!configLoaded && config && Object.keys(config).length > 0) { setConfigForm(config); setConfigLoaded(true); }

  const configMut = useMutation({
    mutationFn: (d: any) => apiRequest("PUT", "/api/gold-erp/ecom-config", d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/gold-erp/ecom-config"] }); toast({ title: "Store config saved" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const couponMut = useMutation({
    mutationFn: (d: any) => apiRequest("POST", "/api/gold-erp/ecom-coupons", d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/gold-erp/ecom-coupons"] }); setShowCouponForm(false); setCouponForm({ discount_type: "pct" }); toast({ title: "Coupon created" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const customerMut = useMutation({
    mutationFn: (d: any) => apiRequest("POST", "/api/gold-erp/ecom-customers", d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/gold-erp/ecom-customers"] }); setShowCustomerForm(false); setCustomerForm({}); toast({ title: "Customer added" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const rateMut = useMutation({
    mutationFn: (d: any) => apiRequest("POST", "/api/gold-erp/ecom-rate-history", d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/gold-erp/ecom-rate-history"] }); setShowRateForm(false); setRateForm({ metal_type: "gold", source: "manual" }); toast({ title: "Rate recorded" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const updateOrderMut = useMutation({
    mutationFn: ({ id, status }: any) => apiRequest("PUT", `/api/gold-erp/ecom-orders/${id}`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/gold-erp/ecom-orders"] }),
  });

  const setC = (k: string, v: any) => setConfigForm((p: any) => ({ ...p, [k]: v }));

  const tabs = [
    ["config", "Store Config", Settings],
    ["customers", "Customers", Users],
    ["orders", "Orders", ShoppingCart],
    ["coupons", "Coupons", Tag],
    ["rates", "Rate History", TrendingUp],
  ] as const;

  return (
    <>
      <SH title="E-Commerce Store" action={
        tab === "coupons" ? <Button size="sm" data-testid="button-new-coupon" onClick={() => setShowCouponForm(true)}><Plus className="h-4 w-4 mr-1" />New Coupon</Button>
          : tab === "customers" ? <Button size="sm" data-testid="button-add-customer" onClick={() => setShowCustomerForm(true)}><Plus className="h-4 w-4 mr-1" />Add Customer</Button>
          : tab === "rates" ? <Button size="sm" data-testid="button-record-rate" onClick={() => setShowRateForm(true)}><Plus className="h-4 w-4 mr-1" />Record Rate</Button>
          : null
      } />

      <div className="flex border-b mb-4 gap-0 overflow-x-auto">
        {tabs.map(([k, l]) => (
          <button key={k} data-testid={`tab-ecom-${k}`} onClick={() => setTab(k)} className={`px-4 py-2 text-sm whitespace-nowrap ${tab === k ? "border-b-2 border-primary font-medium" : "text-muted-foreground"}`}>{l}</button>
        ))}
      </div>

      {tab === "config" && (
        <Card className="max-w-lg">
          <CardContent className="p-4 space-y-4">
            <FL label="Store Name"><Input value={configForm.store_name || ""} onChange={e => setC("store_name", e.target.value)} /></FL>
            <div className="grid grid-cols-2 gap-3">
              <FL label="Rate Source">
                <Select value={configForm.rate_source || "manual"} onValueChange={v => setC("rate_source", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="manual">Manual</SelectItem><SelectItem value="mcx">MCX Live</SelectItem><SelectItem value="ibja">IBJA</SelectItem></SelectContent>
                </Select>
              </FL>
              <FL label="Price Valid (mins)"><Input type="number" value={configForm.price_validity_mins || 30} onChange={e => setC("price_validity_mins", e.target.value)} /></FL>
            </div>
            <div className="flex items-center gap-3">
              <input type="checkbox" checked={!!configForm.cod_enabled} onChange={e => setC("cod_enabled", e.target.checked ? 1 : 0)} id="cod" />
              <Label htmlFor="cod" className="text-sm">Cash on Delivery Enabled</Label>
            </div>
            <FL label="Return Policy"><Textarea value={configForm.return_policy || ""} onChange={e => setC("return_policy", e.target.value)} rows={3} /></FL>
            <FL label="SEO Title"><Input value={configForm.seo_title || ""} onChange={e => setC("seo_title", e.target.value)} /></FL>
            <FL label="SEO Description"><Textarea value={configForm.seo_description || ""} onChange={e => setC("seo_description", e.target.value)} rows={2} /></FL>
            <div className="flex justify-end"><Button onClick={() => configMut.mutate(configForm)} disabled={configMut.isPending}><Save className="h-4 w-4 mr-1" />Save Config</Button></div>
          </CardContent>
        </Card>
      )}

      {tab === "customers" && (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50"><tr>{["Name", "Phone", "City", "Tier", "Orders", "Total Spent", "Joined"].map(h => <th key={h} className="px-4 py-2 text-left">{h}</th>)}</tr></thead>
            <tbody>
              {(customers as any[]).map((c: any) => (
                <tr key={c.id} data-testid={`row-ecom-customer-${c.id}`} className="border-t hover:bg-muted/30">
                  <td className="px-4 py-2 font-medium">{c.customer_name}</td>
                  <td className="px-4 py-2 text-muted-foreground">{c.phone}</td>
                  <td className="px-4 py-2 text-xs">{c.city || "—"}</td>
                  <td className="px-4 py-2"><Badge className="text-xs capitalize">{c.tier || "new"}</Badge></td>
                  <td className="px-4 py-2 text-center">{c.total_orders || 0}</td>
                  <td className="px-4 py-2">{fmtAmt(c.total_spent)}</td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">{c.created_at?.slice(0, 10)}</td>
                </tr>
              ))}
              {customers.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No customers yet</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {tab === "orders" && (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50"><tr>{["Order No.", "Customer", "Amount", "Payment", "Status", "Courier", "Tracking", "Date", ""].map(h => <th key={h} className="px-4 py-2 text-left">{h}</th>)}</tr></thead>
            <tbody>
              {(orders as any[]).map((o: any) => (
                <tr key={o.id} data-testid={`row-ecom-order-${o.id}`} className="border-t hover:bg-muted/30">
                  <td className="px-4 py-2 text-xs font-mono">{o.order_no}</td>
                  <td className="px-4 py-2">{o.customer_name}</td>
                  <td className="px-4 py-2 font-semibold">{fmtAmt(o.grand_total)}</td>
                  <td className="px-4 py-2 text-xs capitalize">{o.payment_mode}</td>
                  <td className="px-4 py-2"><Badge className="text-xs capitalize">{o.status}</Badge></td>
                  <td className="px-4 py-2 text-xs">{o.courier_name || "—"}</td>
                  <td className="px-4 py-2 text-xs font-mono">{o.tracking_no || "—"}</td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">{o.created_at?.slice(0, 10)}</td>
                  <td className="px-4 py-2">
                    <Select value={o.status} onValueChange={v => updateOrderMut.mutate({ id: o.id, status: v })}>
                      <SelectTrigger className="h-7 text-xs w-28"><SelectValue /></SelectTrigger>
                      <SelectContent>{["placed","confirmed","processing","shipped","delivered","cancelled","returned"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </td>
                </tr>
              ))}
              {orders.length === 0 && <tr><td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">No e-commerce orders yet</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {tab === "coupons" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(coupons as any[]).map((c: any) => (
            <Card key={c.id} data-testid={`card-coupon-${c.id}`} className={!c.is_active ? "opacity-60" : ""}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-mono font-bold text-primary">{c.coupon_code}</p>
                  <Badge className={`text-xs ${c.is_active ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"}`}>{c.is_active ? "Active" : "Inactive"}</Badge>
                </div>
                <div className="text-xs space-y-0.5">
                  <p><span className="text-muted-foreground">Type: </span><span className="capitalize">{c.discount_type}</span></p>
                  {c.discount_pct > 0 && <p><span className="text-muted-foreground">Discount: </span>{c.discount_pct}%</p>}
                  {c.discount_value > 0 && <p><span className="text-muted-foreground">Flat Off: </span>{fmtAmt(c.discount_value)}</p>}
                  {c.min_order_value && <p><span className="text-muted-foreground">Min Order: </span>{fmtAmt(c.min_order_value)}</p>}
                  {c.usage_limit && <p><span className="text-muted-foreground">Usage: </span>{c.times_used || 0}/{c.usage_limit}</p>}
                  {c.valid_to && <p><span className="text-muted-foreground">Valid till: </span>{c.valid_to}</p>}
                </div>
              </CardContent>
            </Card>
          ))}
          {coupons.length === 0 && <p className="col-span-3 text-center text-muted-foreground py-8">No coupons created yet</p>}
        </div>
      )}

      {tab === "rates" && (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50"><tr>{["Metal", "Purity", "Rate/g", "Source", "Recorded At"].map(h => <th key={h} className="px-4 py-2 text-left">{h}</th>)}</tr></thead>
            <tbody>
              {(rateHistory as any[]).map((r: any) => (
                <tr key={r.id} data-testid={`row-rate-${r.id}`} className="border-t hover:bg-muted/30">
                  <td className="px-4 py-2 capitalize">{r.metal_type}</td>
                  <td className="px-4 py-2">{r.purity_name || "—"}</td>
                  <td className="px-4 py-2 font-semibold">{fmtAmt(r.rate_per_gram)}</td>
                  <td className="px-4 py-2 text-xs capitalize">{r.source}</td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">{r.recorded_at ? new Date(r.recorded_at).toLocaleString("en-IN") : "—"}</td>
                </tr>
              ))}
              {rateHistory.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No rate history</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* Coupon Form */}
      <Dialog open={showCouponForm} onOpenChange={setShowCouponForm}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>New Coupon</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <FL label="Coupon Code *"><Input value={couponForm.coupon_code || ""} onChange={e => setCouponForm((p: any) => ({ ...p, coupon_code: e.target.value.toUpperCase() }))} placeholder="DIWALI20" /></FL>
            <FL label="Discount Type">
              <Select value={couponForm.discount_type || "pct"} onValueChange={v => setCouponForm((p: any) => ({ ...p, discount_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="pct">Percentage</SelectItem><SelectItem value="flat">Flat Amount</SelectItem><SelectItem value="free_making">Free Making</SelectItem></SelectContent>
              </Select>
            </FL>
            <div className="grid grid-cols-2 gap-3">
              <FL label="Discount %"><Input type="number" value={couponForm.discount_pct || 0} onChange={e => setCouponForm((p: any) => ({ ...p, discount_pct: e.target.value }))} /></FL>
              <FL label="Flat Discount "><Input type="number" value={couponForm.discount_value || 0} onChange={e => setCouponForm((p: any) => ({ ...p, discount_value: e.target.value }))} /></FL>
              <FL label="Min Order "><Input type="number" value={couponForm.min_order_value || ""} onChange={e => setCouponForm((p: any) => ({ ...p, min_order_value: e.target.value }))} /></FL>
              <FL label="Max Discount "><Input type="number" value={couponForm.max_discount || ""} onChange={e => setCouponForm((p: any) => ({ ...p, max_discount: e.target.value }))} /></FL>
              <FL label="Usage Limit"><Input type="number" value={couponForm.usage_limit || ""} onChange={e => setCouponForm((p: any) => ({ ...p, usage_limit: e.target.value }))} /></FL>
              <FL label="Valid From"><Input type="date" value={couponForm.valid_from || ""} onChange={e => setCouponForm((p: any) => ({ ...p, valid_from: e.target.value }))} /></FL>
              <FL label="Valid To"><Input type="date" value={couponForm.valid_to || ""} onChange={e => setCouponForm((p: any) => ({ ...p, valid_to: e.target.value }))} /></FL>
            </div>
            <div className="flex gap-2 justify-end"><Button variant="outline" onClick={() => setShowCouponForm(false)}>Cancel</Button><Button onClick={() => couponMut.mutate(couponForm)} disabled={couponMut.isPending}>Create</Button></div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Customer Form */}
      <Dialog open={showCustomerForm} onOpenChange={setShowCustomerForm}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add E-Commerce Customer</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <FL label="Name *"><Input value={customerForm.customer_name || ""} onChange={e => setCustomerForm((p: any) => ({ ...p, customer_name: e.target.value }))} /></FL>
            <FL label="Phone *"><Input value={customerForm.phone || ""} onChange={e => setCustomerForm((p: any) => ({ ...p, phone: e.target.value }))} /></FL>
            <FL label="Email"><Input type="email" value={customerForm.email || ""} onChange={e => setCustomerForm((p: any) => ({ ...p, email: e.target.value }))} /></FL>
            <FL label="City"><Input value={customerForm.city || ""} onChange={e => setCustomerForm((p: any) => ({ ...p, city: e.target.value }))} /></FL>
            <div className="flex gap-2 justify-end"><Button variant="outline" onClick={() => setShowCustomerForm(false)}>Cancel</Button><Button onClick={() => customerMut.mutate(customerForm)} disabled={customerMut.isPending}>Add</Button></div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Rate Form */}
      <Dialog open={showRateForm} onOpenChange={setShowRateForm}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Record Metal Rate</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <FL label="Metal">
                <Select value={rateForm.metal_type || "gold"} onValueChange={v => setRateForm((p: any) => ({ ...p, metal_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="gold">Gold</SelectItem><SelectItem value="silver">Silver</SelectItem><SelectItem value="platinum">Platinum</SelectItem></SelectContent>
                </Select>
              </FL>
              <FL label="Purity"><Input value={rateForm.purity_name || ""} onChange={e => setRateForm((p: any) => ({ ...p, purity_name: e.target.value }))} placeholder="22K (916)" /></FL>
              <FL label="Rate/g "><Input type="number" value={rateForm.rate_per_gram || ""} onChange={e => setRateForm((p: any) => ({ ...p, rate_per_gram: e.target.value }))} /></FL>
              <FL label="Source">
                <Select value={rateForm.source || "manual"} onValueChange={v => setRateForm((p: any) => ({ ...p, source: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="manual">Manual</SelectItem><SelectItem value="mcx">MCX</SelectItem><SelectItem value="ibja">IBJA</SelectItem></SelectContent>
                </Select>
              </FL>
            </div>
            <div className="flex gap-2 justify-end"><Button variant="outline" onClick={() => setShowRateForm(false)}>Cancel</Button><Button onClick={() => rateMut.mutate(rateForm)} disabled={rateMut.isPending}>Record</Button></div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
