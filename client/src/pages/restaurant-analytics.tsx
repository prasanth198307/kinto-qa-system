import { DashboardShell } from "@/components/DashboardShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";

const api = (m: string, u: string, b?: any) =>
  fetch(u, { method: m, headers: b ? { "Content-Type": "application/json" } : {}, body: b ? JSON.stringify(b) : undefined }).then(r => r.json());

export default function RestaurantAnalyticsPage() {
  const { data: summary } = useQuery({
    queryKey: ["/api/restaurant/analytics/summary"],
    queryFn: () => api("GET", "/api/restaurant/analytics/summary"),
  });

  const s = (summary as any) || {};

  const metrics = [
    { label: "Revenue Today", value: `₹${Number(s.revenue_today || 0).toFixed(0)}`, icon: "💰", color: "text-green-600" },
    { label: "Orders Today", value: s.orders_today || 0, icon: "🧾", color: "text-blue-600" },
    { label: "Avg Order Value", value: `₹${Number(s.avg_order_value || 0).toFixed(0)}`, icon: "📊", color: "text-purple-600" },
    { label: "Table Turnover", value: `${Number(s.table_turnover || 0).toFixed(1)}x`, icon: "🔄", color: "text-orange-600" },
    { label: "Revenue This Month", value: `₹${Number(s.revenue_month || 0).toFixed(0)}`, icon: "📅", color: "text-indigo-600" },
    { label: "Top Item", value: s.top_item || "—", icon: "⭐", color: "text-yellow-600" },
  ];

  return (
    <DashboardShell activeNavId="restaurant-analytics" title="Analytics & Business Intelligence">
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {metrics.map(m => (
            <Card key={m.label}>
              <CardContent className="pt-4 pb-3">
                <div className="text-2xl mb-1">{m.icon}</div>
                <div className={`text-2xl font-black ${m.color}`}>{m.value}</div>
                <div className="text-xs text-gray-500 mt-0.5">{m.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader><CardTitle>Sales by Category</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-gray-400 text-center py-8">Chart visualization coming soon. Data is available via Reports.</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Hourly Sales Pattern</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-gray-400 text-center py-8">Chart visualization coming soon. Configure peak hours in Settings.</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle>Quick Insights</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {[
              { icon: "📈", text: "Revenue trend and comparison vs last week available in Reports." },
              { icon: "🍽️", text: "Most popular items and slowest movers tracked automatically from KOT data." },
              { icon: "👥", text: "Customer return rate and loyalty metrics shown in Customers & Loyalty page." },
              { icon: "🚚", text: "Delivery platform performance breakdown available in Delivery Platforms page." },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <span className="text-xl">{item.icon}</span>
                <p className="text-sm text-gray-700">{item.text}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
