import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { RefreshCw, Thermometer, Droplets, Wind, CloudRain, TrendingUp } from "lucide-react";
import { useTenantConfig, formatCurrency as fmtCur } from "@/hooks/use-tenant-config";

const api = (path: string) => fetch(path).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); });

const SAMPLE_PRICES = [
  { commodity: "Wheat", mandi: "Azadpur", state: "Delhi", modal_price: 2150, min: 2050, max: 2250, date: "2026-07-03" },
  { commodity: "Rice", mandi: "Vashi", state: "Maharashtra", modal_price: 3200, min: 3100, max: 3350, date: "2026-07-03" },
  { commodity: "Tomato", mandi: "Kolar", state: "Karnataka", modal_price: 1800, min: 1600, max: 2000, date: "2026-07-03" },
  { commodity: "Onion", mandi: "Lasalgaon", state: "Maharashtra", modal_price: 1400, min: 1200, max: 1600, date: "2026-07-03" },
  { commodity: "Wheat", mandi: "Hapur", state: "Uttar Pradesh", modal_price: 2100, min: 2000, max: 2200, date: "2026-07-03" },
];

const SAMPLE_WEATHER = {
  farm_id: 1, temp: 32, humidity: 75, rainfall: 12, wind: 18,
  forecast_days: [
    { day: "Thu", temp: 33, rainfall: 5 },
    { day: "Fri", temp: 30, rainfall: 15 },
    { day: "Sat", temp: 28, rainfall: 22 },
    { day: "Sun", temp: 27, rainfall: 8 },
    { day: "Mon", temp: 29, rainfall: 3 },
    { day: "Tue", temp: 31, rainfall: 0 },
    { day: "Wed", temp: 34, rainfall: 0 },
  ],
};

const SAMPLE_TREND = Array.from({ length: 10 }, (_, i) => ({
  date: `2026-06-${(24 + i).toString().padStart(2, "0")}`,
  modal_price: 2000 + Math.floor(Math.random() * 300),
}));

export default function MandiDashboardPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const tenantConfig = useTenantConfig();
  const sym = tenantConfig.currency_symbol;
  const [filterCommodity, setFilterCommodity] = useState("all");
  const [filterState, setFilterState] = useState("all");
  const [selectedCommodity, setSelectedCommodity] = useState("Wheat");

  const { data: prices = [] } = useQuery<any[]>({
    queryKey: ["mandi-prices"],
    queryFn: () => api("/api/agriculture/mandi/prices").catch(() => SAMPLE_PRICES),
  });

  const { data: weather } = useQuery<any>({
    queryKey: ["farm-weather", 1],
    queryFn: () => api("/api/agriculture/weather?farm_id=1").catch(() => SAMPLE_WEATHER),
  });

  const { data: trendData = [] } = useQuery<any[]>({
    queryKey: ["commodity-chart", selectedCommodity],
    queryFn: () => api(`/api/agriculture/mandi/commodity-chart?commodity=${encodeURIComponent(selectedCommodity)}`).catch(() => SAMPLE_TREND),
    enabled: !!selectedCommodity,
  });

  const syncMandiMutation = useMutation({
    mutationFn: () => fetch("/api/agriculture/mandi/sync", { method: "POST" }).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); }),
    onSuccess: (data) => {
      toast({ title: "Mandi prices synced", description: `${data?.inserted_count ?? "Latest"} records inserted` });
      qc.invalidateQueries({ queryKey: ["mandi-prices"] });
    },
    onError: () => toast({ title: "Sync failed", variant: "destructive" }),
  });

  const syncWeatherMutation = useMutation({
    mutationFn: () => fetch("/api/agriculture/weather/sync", { method: "POST" }).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); }),
    onSuccess: () => {
      toast({ title: "Weather synced" });
      qc.invalidateQueries({ queryKey: ["farm-weather", 1] });
    },
    onError: () => toast({ title: "Weather sync failed", variant: "destructive" }),
  });

  const displayPrices: any[] = (prices as any[]).length ? prices : SAMPLE_PRICES;
  const displayWeather = weather ?? SAMPLE_WEATHER;
  const displayTrend: any[] = (trendData as any[]).length ? trendData : SAMPLE_TREND;

  const commodities = Array.from(new Set(displayPrices.map((p: any) => p.commodity)));
  const states = Array.from(new Set(displayPrices.map((p: any) => p.state)));

  const filteredPrices = displayPrices.filter((p: any) => {
    if (filterCommodity !== "all" && p.commodity !== filterCommodity) return false;
    if (filterState !== "all" && p.state !== filterState) return false;
    return true;
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">Mandi Dashboard</h1>
        <Button onClick={() => syncMandiMutation.mutate()} disabled={syncMandiMutation.isPending}>
          <RefreshCw className={`h-4 w-4 mr-2 ${syncMandiMutation.isPending ? "animate-spin" : ""}`} />
          {syncMandiMutation.isPending ? "Syncing..." : "Sync Mandi Prices"}
        </Button>
      </div>

      {/* Mandi Prices */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5" />Mandi Prices</CardTitle>
          <div className="flex gap-3 flex-wrap">
            <Select value={filterCommodity} onValueChange={setFilterCommodity}>
              <SelectTrigger className="w-40"><SelectValue placeholder="All Commodities" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Commodities</SelectItem>
                {commodities.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterState} onValueChange={setFilterState}>
              <SelectTrigger className="w-40"><SelectValue placeholder="All States" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All States</SelectItem>
                {states.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Commodity</TableHead>
                <TableHead>Mandi</TableHead>
                <TableHead>State</TableHead>
                <TableHead>Modal Price (${sym}/q)</TableHead>
                <TableHead>Min</TableHead>
                <TableHead>Max</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPrices.map((p: any, i: number) => (
                <TableRow key={i} className="cursor-pointer hover:bg-muted/40" onClick={() => setSelectedCommodity(p.commodity)}>
                  <TableCell className="font-medium">{p.commodity}</TableCell>
                  <TableCell>{p.mandi}</TableCell>
                  <TableCell>{p.state}</TableCell>
                  <TableCell className="font-semibold text-green-700">{sym}{Number(p.modal_price).toLocaleString("en-IN")}</TableCell>
                  <TableCell className="text-muted-foreground">{sym}{Number(p.min).toLocaleString("en-IN")}</TableCell>
                  <TableCell className="text-muted-foreground">{sym}{Number(p.max).toLocaleString("en-IN")}</TableCell>
                  <TableCell>{p.date}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Price Trend */}
      <Card>
        <CardHeader>
          <CardTitle>Price Trend — {selectedCommodity} (Last 30 Days)</CardTitle>
          <div className="flex gap-2 flex-wrap">
            {commodities.map(c => (
              <button key={c} onClick={() => setSelectedCommodity(c)}
                className={`text-xs px-2 py-1 rounded border transition-colors ${selectedCommodity === c ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>
                {c}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Modal Price (${sym}/quintal)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayTrend.slice(0, 15).map((t: any, i: number) => (
                <TableRow key={i}>
                  <TableCell>{t.date}</TableCell>
                  <TableCell className="font-medium">{sym}{Number(t.modal_price).toLocaleString("en-IN")}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Weather IoT */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Farm Weather — IoT</span>
            <Button size="sm" variant="outline" onClick={() => syncWeatherMutation.mutate()} disabled={syncWeatherMutation.isPending}>
              <RefreshCw className={`h-4 w-4 mr-1 ${syncWeatherMutation.isPending ? "animate-spin" : ""}`} />
              Sync Weather
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="flex items-center gap-2">
              <Thermometer className="h-5 w-5 text-orange-500" />
              <div><div className="text-xs text-muted-foreground">Temperature</div><div className="font-semibold">{displayWeather.temp}°C</div></div>
            </div>
            <div className="flex items-center gap-2">
              <Droplets className="h-5 w-5 text-blue-500" />
              <div><div className="text-xs text-muted-foreground">Humidity</div><div className="font-semibold">{displayWeather.humidity}%</div></div>
            </div>
            <div className="flex items-center gap-2">
              <CloudRain className="h-5 w-5 text-blue-700" />
              <div><div className="text-xs text-muted-foreground">Rainfall</div><div className="font-semibold">{displayWeather.rainfall} mm</div></div>
            </div>
            <div className="flex items-center gap-2">
              <Wind className="h-5 w-5 text-gray-500" />
              <div><div className="text-xs text-muted-foreground">Wind Speed</div><div className="font-semibold">{displayWeather.wind} km/h</div></div>
            </div>
          </div>

          <div>
            <div className="text-sm font-medium mb-2">7-Day Forecast</div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Day</TableHead>
                  <TableHead>Temp (°C)</TableHead>
                  <TableHead>Rainfall (mm)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(displayWeather.forecast_days ?? []).map((f: any, i: number) => (
                  <TableRow key={i}>
                    <TableCell>{f.day}</TableCell>
                    <TableCell>{f.temp}</TableCell>
                    <TableCell>{f.rainfall > 0 ? <Badge className="bg-blue-100 text-blue-800">{f.rainfall}</Badge> : "0"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
