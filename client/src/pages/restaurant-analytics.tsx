import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const api = (m: string, u: string, b?: any) =>
  fetch(u, { method: m, headers: { "Content-Type": "application/json" }, body: b ? JSON.stringify(b) : undefined }).then(r => r.json());

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

function fmt(n: number) { return `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`; }
function fmtDate(s: string) { return new Date(s).toLocaleDateString("en-IN", { day: "numeric", month: "short" }); }

function Heatmap({ data }: { data: any[] }) {
  const grid: number[][] = useMemo(() => {
    const g = DAYS.map(() => HOURS.map(() => 0));
    data.forEach((r: any) => { const d = Number(r.day_of_week); const h = Number(r.hour); if (d >= 0 && d < 7 && h >= 0 && h < 24) g[d][h] = Number(r.order_count); });
    return g;
  }, [data]);
  const maxVal = useMemo(() => Math.max(...grid.flat(), 1), [grid]);

  const color = (count: number) => {
    if (count === 0) return "#f9fafb";
    const intensity = count / maxVal;
    if (intensity < 0.2) return "#dbeafe";
    if (intensity < 0.4) return "#bfdbfe";
    if (intensity < 0.6) return "#60a5fa";
    if (intensity < 0.8) return "#2563eb";
    return "#1e3a8a";
  };

  const peakHour = useMemo(() => {
    let max = 0; let ph = { day: 0, hour: 12 };
    grid.forEach((dayRow, d) => dayRow.forEach((c, h) => { if (c > max) { max = c; ph = { day: d, hour: h }; } }));
    return ph;
  }, [grid]);

  return (
    <div>
      <div className="mb-3 flex items-center gap-4 text-sm text-gray-600">
        <span>Peak: <strong>{DAYS[peakHour.day]} {peakHour.hour === 0 ? "12am" : peakHour.hour < 12 ? `${peakHour.hour}am` : peakHour.hour === 12 ? "12pm" : `${peakHour.hour - 12}pm`}</strong></span>
        <div className="flex items-center gap-1 ml-auto">
          <span className="text-xs text-gray-400">Low</span>
          {["#f9fafb","#dbeafe","#60a5fa","#2563eb","#1e3a8a"].map(c => <div key={c} className="w-5 h-3 rounded-sm" style={{backgroundColor:c}} />)}
          <span className="text-xs text-gray-400">High</span>
        </div>
      </div>
      <div className="overflow-x-auto">
        <div style={{ minWidth: 680 }}>
          <div className="grid mb-1" style={{ gridTemplateColumns: "3rem repeat(24, 1fr)", gap: "2px" }}>
            <div />
            {HOURS.map(h => (
              <div key={h} className="text-center text-xs text-gray-400">
                {h % 4 === 0 ? (h === 0 ? "12a" : h < 12 ? `${h}a` : h === 12 ? "12p" : `${h-12}p`) : ""}
              </div>
            ))}
          </div>
          {DAYS.map((day, d) => (
            <div key={day} className="grid mb-0.5" style={{ gridTemplateColumns: "3rem repeat(24, 1fr)", gap: "2px" }}>
              <div className="text-xs text-gray-500 font-medium self-center">{day}</div>
              {HOURS.map(h => (
                <div key={h} className="h-6 rounded-sm cursor-default" style={{ backgroundColor: color(grid[d][h]) }} title={`${DAYS[d]} ${h}:00 — ${grid[d][h]} orders`} />
              ))}
            </div>
          ))}
        </div>
      </div>
      {data.length === 0 && <p className="text-center text-gray-400 text-sm py-6">No data yet. Orders will populate this heatmap.</p>}
    </div>
  );
}

function MenuMatrix({ items, avgQty, avgRevenue }: { items: any[]; avgQty: number; avgRevenue: number }) {
  const [hovered, setHovered] = useState<string | null>(null);
  const catColor: Record<string, string> = { star: "#10b981", plowhorse: "#3b82f6", puzzle: "#f59e0b", dog: "#ef4444" };

  return (
    <div className="relative border-2 border-gray-100 rounded-xl bg-gray-50" style={{ height: 320 }}>
      {/* Quadrant bg colors */}
      <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 rounded-xl overflow-hidden">
        <div className="bg-amber-50 border-b border-r border-gray-200" />
        <div className="bg-emerald-50 border-b border-gray-200" />
        <div className="bg-red-50 border-r border-gray-200" />
        <div className="bg-blue-50" />
      </div>
      {/* Labels */}
      <div className="absolute top-2 left-3 text-xs font-bold text-amber-600">🧩 PUZZLES<br/><span className="font-normal">High margin, low volume</span></div>
      <div className="absolute top-2 right-3 text-right text-xs font-bold text-emerald-600">⭐ STARS<br/><span className="font-normal">High margin, high volume</span></div>
      <div className="absolute bottom-2 left-3 text-xs font-bold text-red-500">🐕 DOGS<br/><span className="font-normal">Low margin, low volume</span></div>
      <div className="absolute bottom-2 right-3 text-right text-xs font-bold text-blue-500">🐎 PLOWHORSES<br/><span className="font-normal">Low margin, high volume</span></div>
      {/* Dividers */}
      <div className="absolute inset-0 flex items-center pointer-events-none"><div className="w-full border-t-2 border-dashed border-gray-300" /></div>
      <div className="absolute inset-0 flex justify-center pointer-events-none"><div className="h-full border-l-2 border-dashed border-gray-300" /></div>
      {/* Dots */}
      {items.map((item: any) => {
        const maxQty = avgQty * 2;
        const maxRev = avgRevenue * 2;
        const x = Math.min(96, Math.max(4, (Number(item.qty_sold) / maxQty) * 100));
        const y = Math.min(96, Math.max(4, 100 - (Number(item.revenue) / maxRev) * 100));
        const isHovered = hovered === item.item_name;
        return (
          <div
            key={item.item_name}
            className="absolute rounded-full border-2 border-white shadow cursor-pointer transition-all duration-150"
            style={{
              left: `${x}%`, top: `${y}%`,
              width: isHovered ? 18 : 10, height: isHovered ? 18 : 10,
              backgroundColor: catColor[item.category] || "#6b7280",
              transform: "translate(-50%, -50%)",
              zIndex: isHovered ? 20 : 5,
            }}
            onMouseEnter={() => setHovered(item.item_name)}
            onMouseLeave={() => setHovered(null)}
          >
            {isHovered && (
              <div className="absolute left-5 top-0 bg-gray-900 text-white text-xs rounded-lg px-2 py-1.5 whitespace-nowrap z-30 shadow-xl">
                <div className="font-bold">{item.item_name}</div>
                <div>Sold: {item.qty_sold} · Rev: {fmt(item.revenue)}</div>
                <div className="capitalize text-gray-300">{item.category}</div>
              </div>
            )}
          </div>
        );
      })}
      {items.length === 0 && <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">Place some paid orders to see menu analysis</div>}
      {/* Axis labels */}
      <div className="absolute bottom-0 left-0 right-0 text-center text-xs text-gray-400 pb-0.5">← Popularity (order volume) →</div>
      <div className="absolute top-0 bottom-0 left-0 flex items-center text-xs text-gray-400" style={{ writingMode: "vertical-rl", paddingLeft: 2 }}>← Revenue Contribution →</div>
    </div>
  );
}

export default function RestaurantAnalyticsPage() {
  const [tab, setTab] = useState<"overview" | "menu" | "heatmap" | "staff" | "customers" | "forecast">("overview");
  const [from, setFrom] = useState(() => new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0]);
  const [to, setTo] = useState(() => new Date().toISOString().split("T")[0]);
  const [search, setSearch] = useState("");

  const menuEng = useQuery({ queryKey: ["/api/restaurant/analytics/menu-engineering", from, to], queryFn: () => api("GET", `/api/restaurant/analytics/menu-engineering?from=${from}&to=${to}`), staleTime: 60000 });
  const peakHours = useQuery({ queryKey: ["/api/restaurant/analytics/peak-hours", from, to], queryFn: () => api("GET", `/api/restaurant/analytics/peak-hours?from=${from}&to=${to}`), staleTime: 60000 });
  const serverPerf = useQuery({ queryKey: ["/api/restaurant/analytics/server-performance", from], queryFn: () => api("GET", `/api/restaurant/analytics/server-performance?from=${from}&to=${to}`), staleTime: 60000 });
  const customerLtv = useQuery({ queryKey: ["/api/restaurant/analytics/customer-ltv"], queryFn: () => api("GET", "/api/restaurant/analytics/customer-ltv"), staleTime: 60000 });
  const predictive = useQuery({ queryKey: ["/api/restaurant/analytics/predictive-prep"], queryFn: () => api("GET", "/api/restaurant/analytics/predictive-prep"), staleTime: 300000 });
  const forecast = useQuery({ queryKey: ["/api/restaurant/analytics/revenue-forecast"], queryFn: () => api("GET", "/api/restaurant/analytics/revenue-forecast"), staleTime: 300000 });

  const eng = (menuEng.data as any) || { items: [], avg_qty: 0, avg_revenue: 0 };
  const engItems: any[] = eng.items || [];
  const peakList: any[] = Array.isArray(peakHours.data) ? peakHours.data : (peakHours.data as any)?.data || [];
  const servers: any[] = Array.isArray(serverPerf.data) ? serverPerf.data : (serverPerf.data as any)?.data || [];
  const customers: any[] = Array.isArray(customerLtv.data) ? customerLtv.data : (customerLtv.data as any)?.data || [];
  const pred = (predictive.data as any) || { predicted_orders: 0, day: "Tomorrow", prep_list: [], confidence: "low" };
  const fc = (forecast.data as any) || { forecast: [], avg_daily: 0 };

  const stars = engItems.filter(i => i.category === "star");
  const dogs = engItems.filter(i => i.category === "dog");
  const puzzles = engItems.filter(i => i.category === "puzzle");
  const plowhorses = engItems.filter(i => i.category === "plowhorse");

  const atRisk = customers.filter(c => Number(c.days_since_last) > 30);
  const totalLTV = customers.reduce((s, c) => s + Number(c.total_spend || 0), 0);
  const totalRevServer = servers.reduce((s, r) => s + Number(r.revenue || 0), 0);

  const filteredCustomers = customers.filter(c =>
    !search || (c.customer_name || "").toLowerCase().includes(search.toLowerCase()) || (c.phone || "").includes(search)
  );

  const setPreset = (days: number) => {
    setFrom(new Date(Date.now() - days * 86400000).toISOString().split("T")[0]);
    setTo(new Date().toISOString().split("T")[0]);
  };

  const TABS = [
    { id: "overview", label: "📊 Overview" },
    { id: "menu", label: "🍽️ Menu Engineering" },
    { id: "heatmap", label: "⏰ Peak Hours" },
    { id: "staff", label: "👤 Staff Performance" },
    { id: "customers", label: "👥 Customer LTV" },
    { id: "forecast", label: "🔮 Predictive" },
  ] as const;

  return (
    <>
      <div className="p-6 space-y-5">
        {/* Date range + presets */}
        <div className="flex flex-wrap gap-3 items-end bg-white border rounded-xl p-4">
          <div className="flex gap-1">
            {[["Today", 0], ["7D", 7], ["30D", 30], ["90D", 90], ["1Y", 365]].map(([l, d]) => (
              <button key={l} onClick={() => setPreset(Number(d))} className="px-3 py-1.5 text-xs border rounded-lg hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-colors">{l}</button>
            ))}
          </div>
          <div className="flex gap-2 items-center ml-auto">
            <div><Label className="text-xs text-gray-500">From</Label><Input type="date" className="mt-0.5 h-8 text-sm" value={from} onChange={e => setFrom(e.target.value)} /></div>
            <div><Label className="text-xs text-gray-500">To</Label><Input type="date" className="mt-0.5 h-8 text-sm" value={to} onChange={e => setTo(e.target.value)} /></div>
          </div>
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

        {/* ── Overview ── */}
        {tab === "overview" && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Menu Items Tracked", value: engItems.length, sub: `${stars.length} Stars · ${dogs.length} Dogs`, icon: "🍽️", c: "text-indigo-600" },
                { label: "Total Staff Revenue", value: fmt(totalRevServer), sub: `${servers.length} active servers`, icon: "👤", c: "text-green-600" },
                { label: "Total Customers", value: customers.length, sub: `${atRisk.length} at risk`, icon: "👥", c: "text-blue-600" },
                { label: "Customer LTV Pool", value: fmt(totalLTV), sub: `Avg ${customers.length ? fmt(totalLTV / customers.length) : "₹0"} / customer`, icon: "💎", c: "text-purple-600" },
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
            <div className="grid md:grid-cols-2 gap-4">
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-2"><CardTitle className="text-sm">⭐ Stars — Promote These ({stars.length})</CardTitle></CardHeader>
                <CardContent className="space-y-1.5">
                  {stars.slice(0, 6).map((item: any) => (
                    <div key={item.item_name} className="flex justify-between items-center py-1 border-b last:border-0">
                      <span className="text-sm font-medium">{item.item_name}</span>
                      <div className="flex gap-3 text-xs text-gray-500">
                        <span>{item.qty_sold} sold</span>
                        <span className="font-semibold text-gray-800">{fmt(item.revenue)}</span>
                      </div>
                    </div>
                  ))}
                  {stars.length === 0 && <p className="text-gray-400 text-sm text-center py-3">No data yet</p>}
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-2"><CardTitle className="text-sm">🐕 Dogs — Consider Removing ({dogs.length})</CardTitle></CardHeader>
                <CardContent className="space-y-1.5">
                  {dogs.slice(0, 6).map((item: any) => (
                    <div key={item.item_name} className="flex justify-between items-center py-1 border-b last:border-0">
                      <span className="text-sm font-medium text-gray-600">{item.item_name}</span>
                      <div className="flex gap-3 text-xs text-gray-400">
                        <span>{item.qty_sold} sold</span>
                        <span>{fmt(item.revenue)}</span>
                      </div>
                    </div>
                  ))}
                  {dogs.length === 0 && <p className="text-gray-400 text-sm text-center py-3">No data yet</p>}
                </CardContent>
              </Card>
            </div>
            {atRisk.length > 0 && (
              <Card className="border-amber-200 bg-amber-50 border-0 shadow-sm">
                <CardHeader className="pb-2"><CardTitle className="text-amber-800 text-sm">⚠️ {atRisk.length} At-Risk Customers — No visit in 30+ days</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-2">
                    {atRisk.slice(0, 6).map((c: any) => (
                      <div key={c.id} className="flex justify-between text-sm bg-white rounded-lg px-3 py-2">
                        <span className="font-medium">{c.customer_name || "—"}</span>
                        <span className="text-gray-500 text-xs">{c.phone} · {Math.round(c.days_since_last)}d · {fmt(c.total_spend)}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* ── Menu Engineering ── */}
        {tab === "menu" && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Stars", count: stars.length, desc: "Promote · Premium price", icon: "⭐", bg: "bg-emerald-50 border-emerald-200" },
                { label: "Plowhorses", count: plowhorses.length, desc: "Volume drivers · Upsell", icon: "🐎", bg: "bg-blue-50 border-blue-200" },
                { label: "Puzzles", count: puzzles.length, desc: "Remarket · Bundle", icon: "🧩", bg: "bg-amber-50 border-amber-200" },
                { label: "Dogs", count: dogs.length, desc: "Remove or revamp", icon: "🐕", bg: "bg-red-50 border-red-200" },
              ].map(q => (
                <Card key={q.label} className={`border-2 shadow-sm ${q.bg}`}>
                  <CardContent className="pt-4 pb-3 text-center">
                    <div className="text-4xl mb-1">{q.icon}</div>
                    <div className="text-3xl font-black">{q.count}</div>
                    <div className="font-semibold text-sm">{q.label}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{q.desc}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <Card className="border-0 shadow-sm">
              <CardHeader><CardTitle className="text-sm">Menu Engineering Matrix — Click dots for details</CardTitle></CardHeader>
              <CardContent>
                <MenuMatrix items={engItems} avgQty={eng.avg_qty} avgRevenue={eng.avg_revenue} />
              </CardContent>
            </Card>
            <div className="grid md:grid-cols-2 gap-4">
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-1"><CardTitle className="text-sm text-emerald-700">⭐ Stars — Maximize</CardTitle></CardHeader>
                <CardContent>
                  <table className="w-full text-sm">
                    <thead className="text-xs text-gray-500"><tr><th className="text-left py-1">Item</th><th className="text-right">Qty</th><th className="text-right">Revenue</th></tr></thead>
                    <tbody>
                      {stars.map((i: any) => <tr key={i.item_name} className="border-t"><td className="py-1.5 font-medium">{i.item_name}</td><td className="text-right text-gray-500">{i.qty_sold}</td><td className="text-right font-semibold">{fmt(i.revenue)}</td></tr>)}
                      {stars.length === 0 && <tr><td colSpan={3} className="text-center py-4 text-gray-400 text-xs">Need paid orders to analyze</td></tr>}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-1"><CardTitle className="text-sm text-amber-700">🧩 Puzzles — Remarket</CardTitle></CardHeader>
                <CardContent>
                  <table className="w-full text-sm">
                    <thead className="text-xs text-gray-500"><tr><th className="text-left py-1">Item</th><th className="text-right">Qty</th><th className="text-right">Revenue</th></tr></thead>
                    <tbody>
                      {puzzles.map((i: any) => <tr key={i.item_name} className="border-t"><td className="py-1.5 font-medium">{i.item_name}</td><td className="text-right text-gray-500">{i.qty_sold}</td><td className="text-right font-semibold">{fmt(i.revenue)}</td></tr>)}
                      {puzzles.length === 0 && <tr><td colSpan={3} className="text-center py-4 text-gray-400 text-xs">No puzzles found</td></tr>}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* ── Peak Hours ── */}
        {tab === "heatmap" && (
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle>Peak Hours Heatmap</CardTitle>
              <p className="text-sm text-gray-500">Order volume by day and hour over the selected period. Use this to optimize staffing.</p>
            </CardHeader>
            <CardContent>
              <Heatmap data={peakList} />
            </CardContent>
          </Card>
        )}

        {/* ── Staff Performance ── */}
        {tab === "staff" && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <Card className="border-0 shadow-sm"><CardContent className="pt-4 pb-3 text-center"><div className="text-2xl font-black text-green-600">{servers.length}</div><div className="text-xs text-gray-500">Active Servers</div></CardContent></Card>
              <Card className="border-0 shadow-sm"><CardContent className="pt-4 pb-3 text-center"><div className="text-2xl font-black text-blue-600">{fmt(totalRevServer)}</div><div className="text-xs text-gray-500">Total Revenue</div></CardContent></Card>
              <Card className="border-0 shadow-sm"><CardContent className="pt-4 pb-3 text-center"><div className="text-2xl font-black text-purple-600">{servers.length ? fmt(totalRevServer / servers.length) : "₹0"}</div><div className="text-xs text-gray-500">Avg per Server</div></CardContent></Card>
            </div>
            <Card className="border-0 shadow-sm">
              <CardHeader><CardTitle>Staff Performance Leaderboard</CardTitle></CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 text-xs text-gray-600 uppercase">
                      <tr>
                        {["Rank", "Cashier / Server", "Orders", "Revenue", "Avg Bill", "Covers", "Performance"].map(h => (
                          <th key={h} className="text-left px-4 py-3 font-semibold">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {servers.map((s: any, i: number) => {
                        const perfPct = totalRevServer > 0 ? (Number(s.revenue) / totalRevServer) * 100 : 0;
                        return (
                          <tr key={s.cashier_name} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-lg">{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : <span className="text-gray-400 text-sm">#{i+1}</span>}</td>
                            <td className="px-4 py-3 font-semibold">{s.cashier_name}</td>
                            <td className="px-4 py-3 text-gray-700">{s.orders}</td>
                            <td className="px-4 py-3 font-bold text-green-700">{fmt(s.revenue)}</td>
                            <td className="px-4 py-3 text-gray-600">{fmt(s.avg_bill)}</td>
                            <td className="px-4 py-3 text-gray-600">{s.total_covers || "—"}</td>
                            <td className="px-4 py-3 w-32">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 bg-gray-100 rounded-full h-2">
                                  <div className="h-2 rounded-full bg-gradient-to-r from-blue-400 to-blue-600" style={{ width: `${perfPct}%` }} />
                                </div>
                                <span className="text-xs text-gray-500 w-8">{perfPct.toFixed(0)}%</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {servers.length === 0 && <div className="text-center py-12 text-gray-400"><div className="text-4xl mb-2">👤</div><p className="text-sm">No paid orders with cashier names found in this period</p></div>}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ── Customer LTV ── */}
        {tab === "customers" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Total Customers", value: customers.length, icon: "👥" },
                { label: "Total LTV", value: fmt(totalLTV), icon: "💰" },
                { label: "Avg LTV / Customer", value: customers.length ? fmt(totalLTV / customers.length) : "₹0", icon: "📊" },
                { label: "At-Risk (30+ days)", value: atRisk.length, icon: "⚠️" },
              ].map(s => (
                <Card key={s.label} className="border-0 shadow-sm">
                  <CardContent className="pt-4 pb-3">
                    <div className="text-2xl mb-1">{s.icon}</div>
                    <div className="text-2xl font-black">{s.value}</div>
                    <div className="text-xs text-gray-500">{s.label}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle>Customer Lifetime Value</CardTitle>
                  <Input placeholder="Search name or phone..." className="w-56 h-8 text-sm" value={search} onChange={e => setSearch(e.target.value)} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-xs text-gray-600 uppercase">
                      <tr>
                        {["Customer", "Phone", "Tier", "Visits", "Total Spend", "Avg Bill", "Last Visit", "Days Since", "Predicted LTV"].map(h => (
                          <th key={h} className="text-left px-3 py-3 font-semibold whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {filteredCustomers.slice(0, 25).map((c: any) => (
                        <tr key={c.id} className={`hover:bg-gray-50 ${Number(c.days_since_last) > 30 ? "bg-amber-50/50" : ""}`}>
                          <td className="px-3 py-2.5 font-medium">{c.customer_name || "—"}</td>
                          <td className="px-3 py-2.5 text-gray-500 font-mono text-xs">{c.phone}</td>
                          <td className="px-3 py-2.5"><Badge variant="secondary" className="text-xs capitalize">{c.loyalty_tier || "—"}</Badge></td>
                          <td className="px-3 py-2.5 text-center">{c.visits}</td>
                          <td className="px-3 py-2.5 font-semibold text-green-700">{fmt(c.total_spend)}</td>
                          <td className="px-3 py-2.5">{fmt(c.avg_bill)}</td>
                          <td className="px-3 py-2.5 text-gray-500 whitespace-nowrap">{c.last_visit ? new Date(c.last_visit).toLocaleDateString("en-IN") : "—"}</td>
                          <td className="px-3 py-2.5">
                            <span className={Number(c.days_since_last) > 30 ? "text-amber-600 font-semibold" : "text-gray-500"}>
                              {c.last_visit ? `${Math.round(c.days_since_last)}d` : "—"}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-purple-700 font-semibold">{fmt(c.predicted_ltv)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filteredCustomers.length === 0 && <div className="text-center py-12 text-gray-400"><div className="text-4xl mb-2">👥</div><p className="text-sm">No customer data yet</p></div>}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ── Predictive ── */}
        {tab === "forecast" && (
          <div className="space-y-5">
            <div className="grid md:grid-cols-2 gap-5">
              <Card className="border-0 shadow-sm">
                <CardHeader><CardTitle>Tomorrow's Prediction — {pred.day}</CardTitle></CardHeader>
                <CardContent>
                  <div className="text-center py-4 border-b mb-4">
                    <div className="text-7xl font-black text-blue-600">{pred.predicted_orders}</div>
                    <div className="text-gray-500 mt-1 text-sm">expected orders</div>
                    <Badge variant="secondary" className="mt-2 capitalize">Confidence: {pred.confidence}</Badge>
                  </div>
                  <h4 className="font-semibold text-sm mb-3">📋 Prep List for Tomorrow</h4>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {(pred.prep_list || []).slice(0, 15).map((item: any, i: number) => (
                      <div key={i} className="flex justify-between items-center py-1.5 border-b last:border-0">
                        <span className="text-sm">{item.item_name}</span>
                        <Badge variant="outline" className="text-xs">{Math.ceil(Number(item.avg_qty))} portions</Badge>
                      </div>
                    ))}
                    {pred.prep_list?.length === 0 && <p className="text-gray-400 text-sm text-center py-4">Need at least 2 weeks of order history</p>}
                  </div>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm">
                <CardHeader><CardTitle>7-Day Revenue Forecast</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {(fc.forecast || []).map((day: any) => {
                      const pct = fc.avg_daily > 0 ? Math.min(100, (day.predicted_revenue / (fc.avg_daily * 1.5)) * 100) : 40;
                      const ci = day.confidence_high - day.confidence_low;
                      return (
                        <div key={day.date}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-600">{fmtDate(day.date)} ({new Date(day.date).toLocaleDateString("en", { weekday: "short" })})</span>
                            <div className="text-right">
                              <span className="font-bold">{fmt(day.predicted_revenue)}</span>
                              <span className="text-xs text-gray-400 ml-2">±{fmt(ci / 2)}</span>
                            </div>
                          </div>
                          <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-2.5 rounded-full bg-gradient-to-r from-blue-400 to-blue-600 transition-all" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                    {fc.forecast?.length === 0 && <div className="text-center py-12 text-gray-400"><div className="text-4xl mb-2">🔮</div><p className="text-sm">Need order history to forecast. Start taking orders!</p></div>}
                  </div>
                  {fc.avg_daily > 0 && <div className="mt-4 pt-3 border-t text-xs text-gray-400">Based on historical average of {fmt(fc.avg_daily)}/day over {fc.history_days || 0} days</div>}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
