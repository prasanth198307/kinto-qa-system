import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTenantConfig, formatCurrency as fmtCur } from "@/hooks/use-tenant-config";

const apiGet = async (url: string) => {
  const r = await fetch(url, { credentials: "include" });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
};
const fmt = (n: any) => Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
const fmtShort = (sym: string, n: any) => {
  const v = Number(n || 0);
  if (v >= 100000) return `${sym}${(v / 100000).toFixed(1)}L`;
  if (v >= 1000) return `${sym}${(v / 1000).toFixed(1)}K`;
  return `${sym}${v.toFixed(0)}`;
};

function pct(a: number, b: number) {
  if (!b) return 0;
  return ((a - b) / b) * 100;
}

function KpiCard({ label, value, sub, urgent }: { label: string; value: string | number; sub?: string; urgent?: boolean }) {
  return (
    <Card className={urgent ? "border-red-400 bg-red-50" : ""}>
      <CardContent className="pt-4 pb-3">
        <div className="text-xs text-gray-500 mb-1">{label}</div>
        <div className={`text-2xl font-bold ${urgent ? "text-red-600" : "text-gray-900"}`}>{value}</div>
        {sub && <div className={`text-xs mt-1 ${sub.startsWith("+") ? "text-green-600" : sub.startsWith("-") ? "text-red-500" : "text-gray-400"}`}>{sub}</div>}
      </CardContent>
    </Card>
  );
}

function KotStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    cooking: "bg-blue-100 text-blue-800",
    ready: "bg-green-100 text-green-800",
    served: "bg-gray-100 text-gray-600",
  };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${map[status] || "bg-gray-100 text-gray-600"}`}>{status}</span>;
}

function elapsed(t: string) {
  const m = Math.floor((Date.now() - new Date(t).getTime()) / 60000);
  if (m < 1) return "just now";
  return `${m}m ago`;
}

function LiveKotFeed({ kots }: { kots: any[] }) {
  const live = kots.filter((k: any) => k.status !== "paid").slice(0, 10);
  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          Live KOT Feed
          <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 max-h-72 overflow-y-auto pr-1">
        {live.length === 0 && <div className="text-xs text-gray-400 py-6 text-center">No active KOTs</div>}
        {live.map((k: any) => (
          <div key={k.id} className="flex items-center justify-between bg-gray-50 rounded px-3 py-2 text-sm">
            <div className="font-medium">T{k.table_number || k.table_id || "?"}</div>
            <div className="text-xs text-gray-500">{(k.items || []).length} items</div>
            <KotStatusBadge status={k.status} />
            <div className="text-xs text-gray-400">{elapsed(k.created_at || new Date().toISOString())}</div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function TableGrid({ tables, onNavigate }: { tables: any[]; onNavigate: (path: string) => void }) {
  const colorClass = (s: string) => {
    if (s === "available") return "bg-green-100 border-green-400 text-green-800";
    if (s === "bill_pending" || s === "bill-pending") return "bg-red-100 border-red-400 text-red-700";
    return "bg-amber-100 border-amber-400 text-amber-800";
  };
  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Table Occupancy</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-3 mb-3 text-xs">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-200 border border-green-400 inline-block" />Available</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-200 border border-amber-400 inline-block" />Occupied</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-200 border border-red-400 inline-block" />Bill Pending</span>
        </div>
        <div className="grid grid-cols-5 gap-2 max-h-56 overflow-y-auto">
          {tables.length === 0 && <div className="col-span-5 text-xs text-gray-400 py-4 text-center">No tables configured</div>}
          {tables.map((t: any) => (
            <div
              key={t.id}
              onClick={() => onNavigate("/restaurant-pos")}
              className={`border-2 rounded p-2 text-center text-xs font-semibold cursor-pointer hover:shadow-md transition-shadow ${colorClass(t.status)}`}
            >
              T{t.table_number}
              <div className="text-xs font-normal opacity-70">{t.capacity ? `${t.capacity}p` : ""}</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function PaymentModeDonut({ modes }: { modes: any[] }) {
  const { currency_symbol: sym } = useTenantConfig();
  const total = modes.reduce((s, m) => s + Number(m.amount || 0), 0);
  const colors = ["#6366f1", "#22c55e", "#f59e0b", "#ec4899", "#06b6d4"];
  const modeLabels: Record<string, string> = { cash: "Cash", card: "Card", upi: "UPI", aggregator: "Aggregator", credit: "Credit" };
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm">Sales by Payment Mode</CardTitle></CardHeader>
      <CardContent>
        {modes.length === 0 && <div className="text-xs text-gray-400 py-4 text-center">No payment data today</div>}
        <div className="space-y-2">
          {modes.map((m: any, i: number) => {
            const share = total ? (Number(m.amount) / total) * 100 : 0;
            return (
              <div key={m.mode || i}>
                <div className="flex justify-between text-xs mb-0.5">
                  <span className="font-medium">{modeLabels[m.mode] || m.mode}</span>
                  <span className="text-gray-500">{sym}{fmt(m.amount)} ({share.toFixed(1)}%)</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div className="h-2 rounded-full transition-all" style={{ width: `${share}%`, backgroundColor: colors[i % colors.length] }} />
                </div>
              </div>
            );
          })}
          {total > 0 && <div className="text-right text-xs font-semibold text-gray-600 pt-1">Total: {sym}{fmt(total)}</div>}
        </div>
      </CardContent>
    </Card>
  );
}

function TopItems({ items }: { items: any[] }) {
  const { currency_symbol: sym } = useTenantConfig();
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm">Top Selling Items (Today)</CardTitle></CardHeader>
      <CardContent>
        {items.length === 0 && <div className="text-xs text-gray-400 py-4 text-center">No sales data today</div>}
        <div className="space-y-2">
          {items.slice(0, 8).map((item: any, i: number) => (
            <div key={item.name || i} className="flex items-center gap-2">
              <span className="text-xs text-gray-400 w-4 font-bold">{i + 1}</span>
              <span className="flex-1 text-sm truncate">{item.name}</span>
              <span className="text-xs text-gray-500">{item.qty} sold</span>
              <span className="text-xs font-semibold text-gray-700">{sym}{fmt(item.revenue)}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function AggregatorOrders({ agg, onNavigate }: { agg: any; onNavigate: (path: string) => void }) {
  const platforms = [
    { key: "swiggy", label: "Swiggy", color: "bg-orange-500" },
    { key: "zomato", label: "Zomato", color: "bg-red-500" },
    { key: "uber", label: "Uber Eats", color: "bg-black" },
  ];
  return (
    <Card>
      <CardHeader className="pb-2 flex-row items-center justify-between">
        <CardTitle className="text-sm">Delivery Orders (Live)</CardTitle>
        <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => onNavigate("/restaurant-aggregators")}>View All</Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {platforms.map(p => (
          <div key={p.key} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${p.color} inline-block`} />
              <span className="text-sm font-medium">{p.label}</span>
            </div>
            <span className={`font-bold text-lg ${(agg[p.key] || 0) > 0 ? "text-amber-600" : "text-gray-400"}`}>
              {agg[p.key] || 0}
            </span>
          </div>
        ))}
        {!agg.swiggy && !agg.zomato && !agg.uber && (
          <div className="text-xs text-gray-400 text-center">No pending delivery orders</div>
        )}
      </CardContent>
    </Card>
  );
}

function WeeklyChart({ weekly }: { weekly: any[] }) {
  const { currency_symbol: sym } = useTenantConfig();
  const max = Math.max(...weekly.map((d: any) => Number(d.revenue || 0)), 1);
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const data = weekly.length === 7 ? weekly : days.map((d, i) => ({ day: d, revenue: weekly[i]?.revenue || 0 }));
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm">Weekly Revenue Trend</CardTitle></CardHeader>
      <CardContent>
        <div className="flex items-end gap-2 h-32">
          {data.map((d: any, i: number) => {
            const h = Math.max((Number(d.revenue || 0) / max) * 112, 4);
            const isToday = i === new Date().getDay() - 1;
            return (
              <div key={i} className="flex flex-col items-center flex-1 gap-1">
                <span className="text-xs text-gray-500">{fmtShort(sym, d.revenue)}</span>
                <div
                  className={`w-full rounded-t transition-all ${isToday ? "bg-indigo-500" : "bg-indigo-200"}`}
                  style={{ height: `${h}px` }}
                  title={`${d.day || days[i]}: ${sym}${fmt(d.revenue)}`}
                />
                <span className="text-xs text-gray-500">{d.day || days[i]}</span>
              </div>
            );
          })}
        </div>
        <div className="mt-2 text-xs text-gray-400 text-right">Total: {sym}{fmt(data.reduce((s: number, d: any) => s + Number(d.revenue || 0), 0))}</div>
      </CardContent>
    </Card>
  );
}

function QuickActions({ onNavigate }: { onNavigate: (path: string) => void }) {
  const actions = [
    { label: "New KOT", path: "/restaurant-pos", icon: "🧾", color: "bg-indigo-50 hover:bg-indigo-100 border-indigo-200" },
    { label: "Kitchen View", path: "/restaurant-kitchen", icon: "👨‍🍳", color: "bg-orange-50 hover:bg-orange-100 border-orange-200" },
    { label: "Table Map", path: "/restaurant-tables", icon: "🗺️", color: "bg-green-50 hover:bg-green-100 border-green-200" },
    { label: "Today's Report", path: "/restaurant-reports", icon: "📊", color: "bg-blue-50 hover:bg-blue-100 border-blue-200" },
    { label: "Staff Schedule", path: "/restaurant-staff", icon: "👥", color: "bg-purple-50 hover:bg-purple-100 border-purple-200" },
    { label: "Shift Status", path: "/restaurant-shifts", icon: "⏱️", color: "bg-amber-50 hover:bg-amber-100 border-amber-200" },
  ];
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm">Quick Actions</CardTitle></CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-2">
          {actions.map(a => (
            <button
              key={a.path}
              onClick={() => onNavigate(a.path)}
              className={`border rounded-lg p-3 text-center cursor-pointer transition-colors ${a.color}`}
            >
              <div className="text-2xl mb-1">{a.icon}</div>
              <div className="text-xs font-medium text-gray-700">{a.label}</div>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function StaffOnDuty({ staff }: { staff: any[] }) {
  const roleBadge: Record<string, string> = {
    cashier: "bg-blue-100 text-blue-700",
    waiter: "bg-green-100 text-green-700",
    chef: "bg-orange-100 text-orange-700",
    manager: "bg-purple-100 text-purple-700",
    captain: "bg-indigo-100 text-indigo-700",
  };
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm">Staff on Duty</CardTitle></CardHeader>
      <CardContent className="max-h-52 overflow-y-auto space-y-2">
        {staff.length === 0 && <div className="text-xs text-gray-400 py-4 text-center">No staff clocked in</div>}
        {staff.map((s: any, i: number) => (
          <div key={s.id || i} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">
                {(s.name || s.cashier_name || "?")[0].toUpperCase()}
              </div>
              <span className="text-sm">{s.name || s.cashier_name}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${roleBadge[s.role] || "bg-gray-100 text-gray-600"}`}>
                {s.role || "staff"}
              </span>
              <span className="text-xs text-gray-400">{s.shift_start || s.clock_in || ""}</span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function RecentActivity({ customers }: { customers: any[] }) {
  const { currency_symbol: sym } = useTenantConfig();
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm">Recent Customer Activity</CardTitle></CardHeader>
      <CardContent className="space-y-2 max-h-52 overflow-y-auto">
        {customers.length === 0 && <div className="text-xs text-gray-400 py-4 text-center">No recent activity</div>}
        {customers.slice(0, 5).map((c: any, i: number) => (
          <div key={c.id || i} className="flex items-center justify-between text-sm">
            <div>
              <div className="font-medium">{c.name || "Guest"}</div>
              <div className="text-xs text-gray-400">{c.phone || ""}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-600">{c.activity || c.transaction_type || "Visit"}</div>
              <div className="text-xs text-indigo-600 font-semibold">{c.points ? `+${c.points} pts` : c.amount ? `${sym}${fmt(c.amount)}` : ""}</div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export default function RestaurantEnterprisePage() {
  const { currency_symbol: sym } = useTenantConfig();
  const [, navigate] = useLocation();

  const { data: summary = {} } = useQuery({
    queryKey: ["/api/restaurant/dashboard/summary"],
    queryFn: () => apiGet("/api/restaurant/dashboard/summary"),
    refetchInterval: 30000,
    retry: false,
  });

  const { data: kots = [] } = useQuery({
    queryKey: ["/api/restaurant/kot"],
    queryFn: () => apiGet("/api/restaurant/kot"),
    refetchInterval: 30000,
    retry: false,
  });

  const { data: tables = [] } = useQuery({
    queryKey: ["/api/restaurant/floor-plan"],
    queryFn: () => apiGet("/api/restaurant/floor-plan"),
    refetchInterval: 30000,
    retry: false,
  });

  const { data: paymentModes = [] } = useQuery({
    queryKey: ["/api/restaurant/dashboard/payment-modes"],
    queryFn: () => apiGet("/api/restaurant/dashboard/payment-modes"),
    refetchInterval: 30000,
    retry: false,
  });

  const { data: topItems = [] } = useQuery({
    queryKey: ["/api/restaurant/dashboard/top-items"],
    queryFn: () => apiGet("/api/restaurant/dashboard/top-items"),
    retry: false,
  });

  const { data: weekly = [] } = useQuery({
    queryKey: ["/api/restaurant/dashboard/weekly"],
    queryFn: () => apiGet("/api/restaurant/dashboard/weekly"),
    retry: false,
  });

  const { data: activeStaff = [] } = useQuery({
    queryKey: ["/api/restaurant/shifts/active"],
    queryFn: () => apiGet("/api/restaurant/shifts/active"),
    refetchInterval: 60000,
    retry: false,
  });

  const { data: aggPending = {} } = useQuery({
    queryKey: ["/api/restaurant/dashboard/aggregator-pending"],
    queryFn: () => apiGet("/api/restaurant/dashboard/aggregator-pending"),
    refetchInterval: 30000,
    retry: false,
  });

  const { data: recentCustomers = [] } = useQuery({
    queryKey: ["/api/restaurant/customers/recent"],
    queryFn: () => apiGet("/api/restaurant/customers/recent"),
    retry: false,
  });

  const todayRev = Number(summary.today_revenue || 0);
  const yestRev = Number(summary.yesterday_revenue || 0);
  const revChange = pct(todayRev, yestRev);
  const todayOrders = Number(summary.order_count || 0);
  const yestOrders = Number(summary.yesterday_orders || 0);
  const ordersChange = pct(todayOrders, yestOrders);

  const availableTables = tables.filter((t: any) => t.status === "available").length;
  const totalTables = tables.length;

  const pendingKots = kots.filter((k: any) => k.status === "pending").length;
  const staffCount = Array.isArray(activeStaff) ? activeStaff.length : 0;

  return (
    <div className="p-4 space-y-4 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Restaurant Overview</h1>
          <p className="text-sm text-gray-500">{new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
        </div>
        <Button onClick={() => navigate("/restaurant-pos")} className="bg-indigo-600 hover:bg-indigo-700 text-white">
          + New KOT
        </Button>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-5 gap-3">
        <KpiCard
          label="Today's Revenue"
          value={fmtShort(sym, todayRev)}
          sub={yestRev ? `${revChange >= 0 ? "+" : ""}${revChange.toFixed(1)}% vs yesterday` : undefined}
        />
        <KpiCard
          label="Orders Today"
          value={todayOrders}
          sub={yestOrders ? `${ordersChange >= 0 ? "+" : ""}${ordersChange.toFixed(1)}% vs yesterday` : undefined}
        />
        <KpiCard
          label="Active Tables"
          value={`${totalTables - availableTables} / ${totalTables}`}
          sub={totalTables ? `${availableTables} available` : undefined}
        />
        <KpiCard
          label="Pending KOTs"
          value={pendingKots}
          sub={pendingKots > 5 ? "Kitchen overload!" : pendingKots > 0 ? "In queue" : "All clear"}
          urgent={pendingKots > 5}
        />
        <KpiCard
          label="Staff on Duty"
          value={staffCount}
          sub="Active shifts"
        />
      </div>

      {/* Real-time: KOT feed + Table grid */}
      <div className="grid grid-cols-2 gap-4">
        <LiveKotFeed kots={kots} />
        <TableGrid tables={tables} onNavigate={navigate} />
      </div>

      {/* Row 2: Payment modes + Top items + Delivery */}
      <div className="grid grid-cols-3 gap-4">
        <PaymentModeDonut modes={paymentModes} />
        <TopItems items={topItems} />
        <AggregatorOrders agg={aggPending} onNavigate={navigate} />
      </div>

      {/* Row 3: Weekly chart + Quick actions */}
      <div className="grid grid-cols-2 gap-4">
        <WeeklyChart weekly={weekly} />
        <QuickActions onNavigate={navigate} />
      </div>

      {/* Bottom row: Staff + Recent customers */}
      <div className="grid grid-cols-2 gap-4 pb-4">
        <StaffOnDuty staff={Array.isArray(activeStaff) ? activeStaff : []} />
        <RecentActivity customers={Array.isArray(recentCustomers) ? recentCustomers : []} />
      </div>
    </div>
  );
}
