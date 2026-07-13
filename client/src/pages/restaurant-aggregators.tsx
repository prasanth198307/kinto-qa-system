import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useTenantConfig, formatCurrency as fmtCur } from "@/hooks/use-tenant-config";

const api = (m: string, u: string, b?: any) =>
  fetch(u, { method: m, headers: { "Content-Type": "application/json" }, body: b ? JSON.stringify(b) : undefined }).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); });

const PLATFORMS = [
  { id: "swiggy",    label: "Swiggy",     emoji: "🟠", color: "#FC8019", bgClass: "bg-orange-50 border-orange-200", badgeClass: "bg-orange-100 text-orange-800" },
  { id: "zomato",    label: "Zomato",     emoji: "🔴", color: "#CB202D", bgClass: "bg-red-50 border-red-200",    badgeClass: "bg-red-100 text-red-800" },
  { id: "ubereats",  label: "Uber Eats",  emoji: "⬛", color: "#000000", bgClass: "bg-gray-50 border-gray-300",  badgeClass: "bg-gray-100 text-gray-800" },
  { id: "talabat",   label: "Talabat",    emoji: "🟡", color: "#FF6B00", bgClass: "bg-amber-50 border-amber-200", badgeClass: "bg-amber-100 text-amber-800" },
  { id: "deliveroo", label: "Deliveroo",  emoji: "🟢", color: "#00CCBC", bgClass: "bg-teal-50 border-teal-200",  badgeClass: "bg-teal-100 text-teal-800" },
  { id: "ondc",      label: "ONDC",       emoji: "🔵", color: "#2563EB", bgClass: "bg-blue-50 border-blue-200",  badgeClass: "bg-blue-100 text-blue-800" },
];

const STATUS_FLOW: Record<string, string[]> = {
  new: ["accepted", "cancelled"],
  accepted: ["preparing"],
  preparing: ["ready"],
  ready: ["picked_up"],
};

const STATUS_STYLE: Record<string, string> = {
  new: "bg-blue-100 text-blue-800",
  accepted: "bg-yellow-100 text-yellow-800",
  preparing: "bg-orange-100 text-orange-800",
  ready: "bg-green-100 text-green-800",
  picked_up: "bg-gray-100 text-gray-600",
  cancelled: "bg-red-100 text-red-600",
};

function ConfigModal({ platform, cfg, onClose }: { platform: typeof PLATFORMS[0]; cfg: any; onClose: () => void }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const tenantConfig = useTenantConfig();
  const sym = tenantConfig.currency_symbol;
  const [form, setForm] = useState({ api_key: cfg?.api_key || "", api_secret: cfg?.api_secret || "", restaurant_id: cfg?.restaurant_id || "", webhook_secret: cfg?.webhook_secret || "", auto_accept: cfg?.auto_accept ?? 1 });
  const save = useMutation({
    mutationFn: () => api("POST", "/api/aggregators/config", { platform: platform.id, ...form }),
    onSuccess: () => { toast({ title: "Saved!" }); qc.invalidateQueries({ queryKey: ["/api/aggregators/config"] }); onClose(); },
    onError: () => toast({ title: "Failed to save", variant: "destructive" } as any),
  });
  const webhookUrl = `${window.location.origin}/api/aggregators/${platform.id}/webhook?tenant_id=1`;
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center gap-3 px-5 py-4 border-b">
          <span className="text-4xl">{platform.emoji}</span>
          <div><h2 className="font-bold text-lg">{platform.label} Integration</h2><p className="text-xs text-gray-500">Configure your {platform.label} merchant credentials</p></div>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <Label className="text-xs text-gray-500 uppercase tracking-wide">Webhook URL (paste this in {platform.label} Partner Dashboard)</Label>
            <div className="flex gap-2 mt-1">
              <Input value={webhookUrl} readOnly className="text-xs font-mono bg-gray-50 flex-1" />
              <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(webhookUrl); toast({ title: "Copied to clipboard!" }); }}>Copy</Button>
            </div>
            <p className="text-xs text-gray-400 mt-1">Orders will be pushed to this URL by {platform.label}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Label>Restaurant ID on {platform.label}</Label><Input className="mt-1" placeholder={`Your ${platform.label} restaurant/outlet ID`} value={form.restaurant_id} onChange={e => setForm(f => ({ ...f, restaurant_id: e.target.value }))} /></div>
            <div><Label>API Key / Client ID</Label><Input className="mt-1" placeholder="API Key" value={form.api_key} onChange={e => setForm(f => ({ ...f, api_key: e.target.value }))} /></div>
            <div><Label>API Secret</Label><Input className="mt-1" type="password" placeholder="••••••••" value={form.api_secret} onChange={e => setForm(f => ({ ...f, api_secret: e.target.value }))} /></div>
            <div className="col-span-2"><Label>Webhook Signature Secret</Label><Input className="mt-1" placeholder="Used to verify incoming webhooks" value={form.webhook_secret} onChange={e => setForm(f => ({ ...f, webhook_secret: e.target.value }))} /></div>
          </div>
          <label className="flex items-start gap-3 cursor-pointer p-3 bg-green-50 rounded-xl border border-green-200">
            <input type="checkbox" checked={!!form.auto_accept} onChange={e => setForm(f => ({ ...f, auto_accept: e.target.checked ? 1 : 0 }))} className="mt-0.5 w-4 h-4 accent-green-600" />
            <div><div className="text-sm font-semibold text-green-800">Auto-accept & create KOT</div><div className="text-xs text-green-600">Incoming orders are automatically accepted and sent to kitchen. Recommended for busy outlets.</div></div>
          </label>
        </div>
        <div className="flex gap-3 px-5 py-4 border-t bg-gray-50 rounded-b-2xl">
          <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending} className="flex-1">Save Configuration</Button>
        </div>
      </div>
    </div>
  );
}

export default function RestaurantAggregatorsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"platforms" | "orders" | "commission" | "sync">("platforms");
  const [configModal, setConfigModal] = useState<typeof PLATFORMS[0] | null>(null);
  const [filterPlatform, setFilterPlatform] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [from, setFrom] = useState(() => new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0]);
  const [to, setTo] = useState(() => new Date().toISOString().split("T")[0]);

  const configs = useQuery({ queryKey: ["/api/aggregators/config"], queryFn: () => api("GET", "/api/aggregators/config"), staleTime: 30000 });
  const orders = useQuery({ queryKey: ["/api/aggregators/orders", filterPlatform, filterStatus, from, to], queryFn: () => api("GET", `/api/aggregators/orders?platform=${filterPlatform}&status=${filterStatus}&from=${from}&to=${to}`), refetchInterval: tab === "orders" ? 30000 : false });
  const commReport = useQuery({ queryKey: ["/api/aggregators/commission-report", from, to], queryFn: () => api("GET", `/api/aggregators/commission-report?from=${from}&to=${to}`), enabled: tab === "commission" });

  const cfgList: any[] = Array.isArray(configs.data) ? configs.data : [];
  const cfgMap = new Map(cfgList.map((c: any) => [c.platform, c]));
  const orderList: any[] = Array.isArray(orders.data) ? orders.data : (orders.data as any)?.data || [];
  const commList: any[] = Array.isArray(commReport.data) ? commReport.data : (commReport.data as any)?.data || [];

  const togglePlatform = useMutation({
    mutationFn: ({ platform, enabled }: { platform: string; enabled: boolean }) => api("PUT", `/api/aggregators/config/${platform}/toggle`, { is_enabled: enabled ? 1 : 0 }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/aggregators/config"] }),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => api("PUT", `/api/aggregators/orders/${id}/status`, { status }),
    onSuccess: () => { toast({ title: "Order status updated" }); qc.invalidateQueries({ queryKey: ["/api/aggregators/orders"] }); },
  });

  const syncMenu = useMutation({
    mutationFn: (platforms: string[]) => api("POST", "/api/aggregators/menu/sync", { platform_ids: platforms }),
    onSuccess: (d: any) => toast({ title: "Menu sync queued", description: d?.message || "" }),
  });

  const enabledPlatforms = PLATFORMS.filter(p => cfgMap.get(p.id)?.is_enabled);
  const totalOrders = commList.reduce((s, r) => s + Number(r.orders || 0), 0);
  const totalRev = commList.reduce((s, r) => s + Number(r.revenue || 0), 0);
  const totalComm = commList.reduce((s, r) => s + Number(r.commission || 0), 0);
  const fmtCurr = (n: number) => `${sym}${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

  const TABS = [
    { id: "platforms", label: "🌐 Platforms" },
    { id: "orders", label: "📦 Live Orders" },
    { id: "commission", label: "💰 Commission" },
    { id: "sync", label: "🔄 Menu Sync" },
  ] as const;

  return (
    <>
      <div className="p-6 space-y-5">
        {/* KPI cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Connected Platforms", value: enabledPlatforms.length, sub: `of ${PLATFORMS.length} supported`, icon: "🌐", c: "text-indigo-600" },
            { label: "Live Orders (30d)", value: orderList.length, sub: "click Orders tab", icon: "📦", c: "text-blue-600" },
            { label: "Gross Revenue (30d)", value: fmtCurr(totalRev), sub: "from all platforms", icon: "💰", c: "text-green-600" },
            { label: "Commission Paid (30d)", value: fmtCurr(totalComm), sub: totalRev > 0 ? `${((totalComm / totalRev) * 100).toFixed(1)}% of revenue` : "—", icon: "📉", c: "text-red-500" },
          ].map(s => (
            <Card key={s.label} className="border-0 shadow-sm">
              <CardContent className="pt-4 pb-3">
                <div className="text-3xl mb-2">{s.icon}</div>
                <div className={`text-2xl font-black ${s.c}`}>{s.value}</div>
                <div className="text-xs font-medium text-gray-600 mt-0.5">{s.label}</div>
                <div className="text-xs text-gray-400 mt-0.5">{s.sub}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-0 border-b overflow-x-auto">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-5 py-2.5 text-sm font-semibold whitespace-nowrap border-b-2 -mb-px transition-colors ${tab === t.id ? "border-blue-600 text-blue-600 bg-blue-50/50" : "border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50"}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Platforms ── */}
        {tab === "platforms" && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {PLATFORMS.map(p => {
              const cfg = cfgMap.get(p.id);
              const enabled = !!cfg?.is_enabled;
              return (
                <Card key={p.id} className={`border-2 shadow-sm transition-all ${enabled ? p.bgClass : "border-gray-100 bg-white"}`}>
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-4xl">{p.emoji}</span>
                        <div>
                          <div className="font-bold text-lg leading-tight">{p.label}</div>
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${enabled ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                            {enabled ? "● Connected" : "○ Disconnected"}
                          </span>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer mt-1">
                        <input type="checkbox" className="sr-only peer" checked={enabled}
                          onChange={e => togglePlatform.mutate({ platform: p.id, enabled: e.target.checked })} />
                        <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-green-500 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all" />
                      </label>
                    </div>
                    {cfg?.restaurant_id && <p className="text-xs text-gray-500 mb-1">Restaurant ID: <span className="font-mono">{cfg.restaurant_id}</span></p>}
                    {cfg?.api_key && <p className="text-xs text-gray-500 mb-1">API Key: <span className="font-mono">****{String(cfg.api_key).slice(-4)}</span></p>}
                    <p className="text-xs text-gray-500 mb-3">Auto-accept: {cfg?.auto_accept ? "✅ Enabled" : "❌ Disabled"}</p>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="flex-1" onClick={() => setConfigModal(p)}>⚙️ Configure</Button>
                      {enabled && <Button size="sm" variant="secondary" onClick={() => syncMenu.mutate([p.id])} disabled={syncMenu.isPending}>🔄</Button>}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* ── Orders ── */}
        {tab === "orders" && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3 items-end bg-white border rounded-xl p-4">
              <div>
                <Label className="text-xs text-gray-500">Platform</Label>
                <select className="mt-0.5 border rounded-lg px-3 py-1.5 text-sm bg-white" value={filterPlatform} onChange={e => setFilterPlatform(e.target.value)}>
                  <option value="all">All Platforms</option>
                  {PLATFORMS.map(p => <option key={p.id} value={p.id}>{p.emoji} {p.label}</option>)}
                </select>
              </div>
              <div>
                <Label className="text-xs text-gray-500">Status</Label>
                <select className="mt-0.5 border rounded-lg px-3 py-1.5 text-sm bg-white" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                  {["all", "new", "accepted", "preparing", "ready", "picked_up", "cancelled"].map(s => <option key={s} value={s}>{s === "all" ? "All Statuses" : s.replace("_", " ").replace(/\b\w/g, c => c.toUpperCase())}</option>)}
                </select>
              </div>
              <div><Label className="text-xs text-gray-500">From</Label><Input type="date" className="mt-0.5 h-8 text-sm" value={from} onChange={e => setFrom(e.target.value)} /></div>
              <div><Label className="text-xs text-gray-500">To</Label><Input type="date" className="mt-0.5 h-8 text-sm" value={to} onChange={e => setTo(e.target.value)} /></div>
              <div className="ml-auto text-sm text-gray-500 self-end">{orderList.length} orders · Auto-refreshes every 30s</div>
            </div>
            <div className="space-y-3">
              {orderList.map((order: any) => {
                const platform = PLATFORMS.find(p => p.id === order.platform);
                const nextStatuses = STATUS_FLOW[order.status] || [];
                const items: any[] = Array.isArray(order.items) ? order.items : [];
                return (
                  <Card key={order.id} className="border-0 shadow-sm">
                    <CardContent className="py-4">
                      <div className="flex flex-wrap gap-4 justify-between">
                        <div className="flex gap-3">
                          <span className="text-3xl">{platform?.emoji || "📦"}</span>
                          <div>
                            <div className="flex flex-wrap items-center gap-2 mb-0.5">
                              <span className="font-bold">{platform?.label} #{order.platform_order_id}</span>
                              <Badge className={`text-xs ${STATUS_STYLE[order.status] || "bg-gray-100"}`}>{order.status?.replace("_", " ")}</Badge>
                              {order.kot_id && <Badge variant="outline" className="text-xs">KOT #{order.kot_id}</Badge>}
                            </div>
                            <div className="text-sm text-gray-700 font-medium">{order.customer_name}</div>
                            {order.customer_phone && <div className="text-xs text-gray-500">{order.customer_phone}</div>}
                            {order.delivery_address && <div className="text-xs text-gray-400 mt-0.5">📍 {order.delivery_address}</div>}
                            {order.special_instructions && <div className="text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded mt-1">📝 {order.special_instructions}</div>}
                            <div className="text-xs text-gray-500 mt-1.5">
                              {items.slice(0, 4).map((item: any, i: number) => (
                                <span key={i}>{item.name || item.item_name} ×{item.quantity || item.qty}{i < Math.min(items.length - 1, 3) ? " · " : ""}</span>
                              ))}
                              {items.length > 4 && <span> +{items.length - 4} more</span>}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-black text-gray-800">{sym}{Number(order.total_amount).toFixed(0)}</div>
                          {Number(order.platform_commission) > 0 && <div className="text-xs text-red-500">Commission: {sym}{Number(order.platform_commission).toFixed(0)}</div>}
                          {Number(order.estimated_delivery_time) > 0 && <div className="text-xs text-gray-400">ETA: {order.estimated_delivery_time} min</div>}
                          <div className="text-xs text-gray-400 mt-1">{new Date(order.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</div>
                          {nextStatuses.length > 0 && (
                            <div className="flex gap-1 mt-2 flex-wrap justify-end">
                              {nextStatuses.map(s => (
                                <Button key={s} size="sm" variant={s === "cancelled" ? "destructive" : "default"}
                                  onClick={() => updateStatus.mutate({ id: order.id, status: s })}
                                  disabled={updateStatus.isPending} className="text-xs h-7 capitalize">
                                  {s.replace("_", " ")}
                                </Button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              {orderList.length === 0 && !orders.isLoading && (
                <div className="text-center py-16 text-gray-400">
                  <div className="text-5xl mb-3">📦</div>
                  <p className="font-medium">No orders found</p>
                  <p className="text-sm mt-1">Configure and enable platforms to receive orders</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Commission ── */}
        {tab === "commission" && (
          <div className="space-y-4">
            <div className="flex gap-3 items-end bg-white border rounded-xl p-4">
              <div><Label className="text-xs text-gray-500">From</Label><Input type="date" className="mt-0.5 h-8 text-sm" value={from} onChange={e => setFrom(e.target.value)} /></div>
              <div><Label className="text-xs text-gray-500">To</Label><Input type="date" className="mt-0.5 h-8 text-sm" value={to} onChange={e => setTo(e.target.value)} /></div>
            </div>
            {commList.length > 0 && (
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: "Total Orders", value: totalOrders, icon: "📦" },
                  { label: "Gross Revenue", value: fmtCurr(totalRev), icon: "💰" },
                  { label: "Net (after commission)", value: fmtCurr(totalRev - totalComm), icon: "✅" },
                ].map(s => (
                  <Card key={s.label} className="border-0 shadow-sm">
                    <CardContent className="pt-3 pb-3 flex items-center gap-3">
                      <span className="text-2xl">{s.icon}</span>
                      <div><div className="text-xl font-black">{s.value}</div><div className="text-xs text-gray-500">{s.label}</div></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
            <Card className="border-0 shadow-sm">
              <CardContent className="pt-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        {["Platform", "Orders", "Gross Revenue", "Commission", "Net Revenue", "Commission %", "Profitability"].map(h => (
                          <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {commList.map((row: any) => {
                        const p = PLATFORMS.find(pl => pl.id === row.platform);
                        const commPct = Number(row.commission_pct || 0);
                        const isHigh = commPct > 25;
                        return (
                          <tr key={row.platform} className="hover:bg-gray-50">
                            <td className="px-4 py-3 font-semibold"><div className="flex items-center gap-2"><span>{p?.emoji}</span>{p?.label || row.platform}</div></td>
                            <td className="px-4 py-3">{row.orders}</td>
                            <td className="px-4 py-3 font-semibold">{fmtCurr(row.revenue)}</td>
                            <td className="px-4 py-3 text-red-600">{fmtCurr(row.commission)}</td>
                            <td className="px-4 py-3 font-semibold text-green-700">{fmtCurr(row.net_revenue)}</td>
                            <td className="px-4 py-3">
                              <span className={isHigh ? "text-red-600 font-bold" : "text-gray-700"}>{commPct}%</span>
                            </td>
                            <td className="px-4 py-3 w-32">
                              <div className="flex items-center gap-1.5">
                                <div className="flex-1 bg-gray-100 rounded-full h-2">
                                  <div className={`h-2 rounded-full ${isHigh ? "bg-red-400" : "bg-green-400"}`} style={{ width: `${Math.min(commPct * 2, 100)}%` }} />
                                </div>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {commList.length > 1 && (
                        <tr className="bg-gray-50 font-bold border-t-2">
                          <td className="px-4 py-3">Total</td>
                          <td className="px-4 py-3">{totalOrders}</td>
                          <td className="px-4 py-3">{fmtCurr(totalRev)}</td>
                          <td className="px-4 py-3 text-red-600">{fmtCurr(totalComm)}</td>
                          <td className="px-4 py-3 text-green-700">{fmtCurr(totalRev - totalComm)}</td>
                          <td className="px-4 py-3">{totalRev > 0 ? ((totalComm / totalRev) * 100).toFixed(1) : 0}%</td>
                          <td />
                        </tr>
                      )}
                    </tbody>
                  </table>
                  {commList.length === 0 && <div className="text-center py-12 text-gray-400"><div className="text-4xl mb-2">💰</div><p className="text-sm">No commission data for this period</p></div>}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ── Menu Sync ── */}
        {tab === "sync" && (
          <div className="space-y-4">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle>Menu Synchronization</CardTitle>
                <p className="text-sm text-gray-500">Push your SwachERP menu to all connected delivery platforms. Syncs item names, prices, descriptions, GST, and availability status.</p>
              </CardHeader>
              <CardContent className="space-y-3">
                {PLATFORMS.map(p => {
                  const cfg = cfgMap.get(p.id);
                  const enabled = !!cfg?.is_enabled;
                  return (
                    <div key={p.id} className={`flex items-center justify-between p-4 rounded-xl border-2 ${enabled ? p.bgClass : "border-gray-100 bg-gray-50 opacity-60"}`}>
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">{p.emoji}</span>
                        <div>
                          <div className="font-semibold">{p.label}</div>
                          <div className="text-xs text-gray-500">{enabled ? `Restaurant ID: ${cfg?.restaurant_id || "Not set"}` : "Not configured"}</div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {!enabled && <Button size="sm" variant="outline" onClick={() => setConfigModal(p)}>Configure →</Button>}
                        {enabled && (
                          <Button size="sm" disabled={syncMenu.isPending} onClick={() => syncMenu.mutate([p.id])}>
                            {syncMenu.isPending ? "Syncing..." : "🔄 Sync Now"}
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
                <Button className="w-full mt-4" disabled={syncMenu.isPending || enabledPlatforms.length === 0}
                  onClick={() => syncMenu.mutate(enabledPlatforms.map(p => p.id))}>
                  🔄 Sync All {enabledPlatforms.length} Connected Platform{enabledPlatforms.length !== 1 ? "s" : ""}
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
      {configModal && <ConfigModal platform={configModal} cfg={cfgMap.get(configModal.id)} onClose={() => setConfigModal(null)} />}
    </>
  );
}
