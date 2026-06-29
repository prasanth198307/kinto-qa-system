import { DashboardShell } from "@/components/DashboardShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const PLATFORMS = [
  { name: "Swiggy", icon: "🍊", color: "bg-orange-100 text-orange-700", status: "connected", orders: 0, revenue: 0 },
  { name: "Zomato", icon: "🔴", color: "bg-red-100 text-red-700", status: "connected", orders: 0, revenue: 0 },
  { name: "Dunzo", icon: "🟢", color: "bg-green-100 text-green-700", status: "disconnected", orders: 0, revenue: 0 },
  { name: "Amazon Food", icon: "📦", color: "bg-yellow-100 text-yellow-700", status: "disconnected", orders: 0, revenue: 0 },
];

export default function RestaurantAggregatorsPage() {
  return (
    <DashboardShell activeNavId="restaurant-aggregators" title="Delivery Platforms">
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {PLATFORMS.map(p => (
            <Card key={p.name}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <span className="text-2xl">{p.icon}</span>
                    {p.name}
                  </span>
                  <Badge className={p.status === "connected" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}>
                    {p.status === "connected" ? "Connected" : "Not Connected"}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-gray-500 text-xs">Orders Today</div>
                    <div className="font-bold text-lg">{p.orders}</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-gray-500 text-xs">Revenue Today</div>
                    <div className="font-bold text-lg">₹{p.revenue}</div>
                  </div>
                </div>
                <button className={`mt-3 w-full py-2 rounded-lg text-sm font-semibold ${p.status === "connected" ? "bg-red-50 text-red-600 hover:bg-red-100" : "bg-blue-600 text-white hover:bg-blue-700"}`}>
                  {p.status === "connected" ? "Disconnect" : "Connect Platform"}
                </button>
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader><CardTitle>Aggregator Orders Sync</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">Orders from connected platforms automatically sync to your POS as delivery orders. Configure menu availability and pricing per platform from the Menu Management page.</p>
            <div className="mt-3 p-3 bg-blue-50 rounded-lg text-xs text-blue-700">
              💡 Tip: Keep your menu up-to-date on all platforms to avoid order rejections. Use the Menu Management page to push updates to all platforms at once.
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
