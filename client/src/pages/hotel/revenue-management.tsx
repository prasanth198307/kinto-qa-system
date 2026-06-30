import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const ROOM_TYPES = [
  { type: "Deluxe", total: 20, current_rate: 4500, occupancy: 92 },
  { type: "Super Deluxe", total: 15, current_rate: 6000, occupancy: 78 },
  { type: "Suite", total: 8, current_rate: 9500, occupancy: 65 },
  { type: "Presidential", total: 2, current_rate: 18000, occupancy: 50 },
];

function getRecommendation(occ: number, rate: number) {
  if (occ > 90) return { action: "Raise 20%", new_rate: Math.round(rate * 1.2), color: "text-green-600", badge: "High Demand" };
  if (occ >= 70) return { action: "Keep Rate", new_rate: rate, color: "text-blue-600", badge: "Optimal" };
  return { action: "Drop 10%", new_rate: Math.round(rate * 0.9), color: "text-orange-600", badge: "Low Demand" };
}

function KPICard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card className="p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
      {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
    </Card>
  );
}

function OccupancyForecast({ forecast }: { forecast: Array<{ date: string; occupancy: number; adr: number }> }) {
  const maxOcc = Math.max(...forecast.map(f => f.occupancy), 100);
  return (
    <Card>
      <CardHeader><CardTitle>30-Day Occupancy Forecast</CardTitle></CardHeader>
      <CardContent>
        <div className="flex items-end gap-1 h-40 overflow-x-auto pb-2">
          {forecast.map((f, i) => (
            <div key={i} className="flex flex-col items-center gap-1 min-w-[18px]">
              <div
                className={`w-4 rounded-t transition-all ${f.occupancy > 90 ? "bg-green-500" : f.occupancy >= 70 ? "bg-blue-400" : "bg-orange-400"}`}
                style={{ height: `${(f.occupancy / maxOcc) * 120}px` }}
                title={`${f.date}: ${f.occupancy}% | ₹${f.adr}`}
              />
              {i % 5 === 0 && <span className="text-[9px] text-muted-foreground rotate-45">{f.date.slice(5)}</span>}
            </div>
          ))}
        </div>
        <div className="flex gap-4 mt-2 text-xs">
          <span className="flex items-center gap-1"><span className="w-3 h-3 bg-green-500 rounded inline-block" /> &gt;90%</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 bg-blue-400 rounded inline-block" /> 70-90%</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 bg-orange-400 rounded inline-block" /> &lt;70%</span>
        </div>
      </CardContent>
    </Card>
  );
}

export default function RevenueManagementPage() {
  const { toast } = useToast();
  const { data: forecastData } = useQuery({
    queryKey: ["hotel-revenue-forecast"],
    queryFn: () => apiRequest("GET", "/api/hotel/revenue-management/forecast"),
  });

  const forecast: Array<{ date: string; occupancy: number; adr: number }> = (forecastData as any)?.forecast ?? Array.from({ length: 30 }, (_, i) => ({
    date: new Date(Date.now() + i * 86400000).toISOString().split("T")[0],
    occupancy: Math.floor(Math.random() * 40) + 55,
    adr: Math.floor(Math.random() * 2000) + 3000,
  }));

  const avgOcc = Math.round(forecast.reduce((s, f) => s + f.occupancy, 0) / forecast.length);
  const avgAdr = Math.round(forecast.reduce((s, f) => s + f.adr, 0) / forecast.length);
  const revpar = Math.round((avgOcc / 100) * avgAdr);

  const applyMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/hotel/revenue-management/apply"),
    onSuccess: () => toast({ title: "Recommendations Applied", description: "Rate adjustments applied to all room types" }),
  });

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Revenue Management</h1>
          <p className="text-muted-foreground">Dynamic pricing and yield optimization</p>
        </div>
        <Button onClick={() => applyMutation.mutate()} disabled={applyMutation.isPending}>
          {applyMutation.isPending ? "Applying..." : "Apply Recommendations"}
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <KPICard label="RevPAR" value={`₹${revpar.toLocaleString()}`} sub="Revenue Per Available Room" />
        <KPICard label="ADR" value={`₹${avgAdr.toLocaleString()}`} sub="Average Daily Rate" />
        <KPICard label="Occupancy %" value={`${avgOcc}%`} sub="30-day average forecast" />
      </div>

      <OccupancyForecast forecast={forecast} />

      <Card>
        <CardHeader><CardTitle>Yield Recommendations</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Room Type</TableHead>
                <TableHead>Occupancy</TableHead>
                <TableHead>Current Rate</TableHead>
                <TableHead>Recommendation</TableHead>
                <TableHead>Suggested Rate</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ROOM_TYPES.map(rt => {
                const rec = getRecommendation(rt.occupancy, rt.current_rate);
                return (
                  <TableRow key={rt.type}>
                    <TableCell className="font-medium">{rt.type}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-muted rounded-full h-2">
                          <div className={`h-2 rounded-full ${rt.occupancy > 90 ? "bg-green-500" : rt.occupancy >= 70 ? "bg-blue-400" : "bg-orange-400"}`} style={{ width: `${rt.occupancy}%` }} />
                        </div>
                        <span className="text-sm">{rt.occupancy}%</span>
                      </div>
                    </TableCell>
                    <TableCell>₹{rt.current_rate.toLocaleString()}</TableCell>
                    <TableCell><Badge variant="outline">{rec.badge}</Badge></TableCell>
                    <TableCell className={`font-semibold ${rec.color}`}>₹{rec.new_rate.toLocaleString()}</TableCell>
                    <TableCell><span className={`text-sm font-medium ${rec.color}`}>{rec.action}</span></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
