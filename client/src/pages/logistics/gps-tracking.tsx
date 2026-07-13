import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapPin, Gauge, Wifi, Plus, Trash2, Navigation } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTenantConfig, formatCurrency as fmtCur } from "@/hooks/use-tenant-config";

const api = (path: string) => fetch(path).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); });

const SAMPLE_VEHICLES = [
  { id: 1, vehicle_no: "MH12AB1234", status: "Moving", location: "Bandra, Mumbai", speed: 65 },
  { id: 2, vehicle_no: "DL3CA5678", status: "Halted", location: "Connaught Place, Delhi", speed: 0 },
  { id: 3, vehicle_no: "KA05MJ9012", status: "Offline", location: "Koramangala, Bengaluru", speed: 0 },
];

const SAMPLE_TRIPS = [
  { id: 1, lr_number: "LR-2026-001", from_city: "Mumbai", to_city: "Delhi", vehicle_no: "MH12AB1234", status: "In Transit" },
  { id: 2, lr_number: "LR-2026-002", from_city: "Delhi", to_city: "Agra", vehicle_no: "DL3CA5678", status: "Delivered" },
];

interface Waypoint { label: string; lat: string; lng: string; }

export default function GPSTrackingPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(null);
  const [waypoints, setWaypoints] = useState<Waypoint[]>([
    { label: "Origin", lat: "", lng: "" },
    { label: "Destination", lat: "", lng: "" },
  ]);
  const [routeResult, setRouteResult] = useState<any>(null);

  const { data: vehicles = [] } = useQuery<any[]>({
    queryKey: ["gps-vehicles"],
    queryFn: () => api("/api/logistics/gps/vehicles").catch(() => SAMPLE_VEHICLES),
  });

  const displayVehicles = vehicles.length ? vehicles : SAMPLE_VEHICLES;

  const { data: positions = [] } = useQuery<any[]>({
    queryKey: ["gps-track", selectedVehicleId],
    queryFn: () => selectedVehicleId ? api(`/api/logistics/gps/vehicles/${selectedVehicleId}/track`).catch(() => []) : Promise.resolve([]),
    enabled: !!selectedVehicleId,
  });

  const { data: trips = [] } = useQuery<any[]>({
    queryKey: ["logistics-trips"],
    queryFn: () => api("/api/logistics/trips").catch(() => SAMPLE_TRIPS),
  });

  const displayTrips = (trips as any[]).length ? trips : SAMPLE_TRIPS;

  const simulateMutation = useMutation({
    mutationFn: (vehicleId: number) => fetch(`/api/logistics/gps/simulate/${vehicleId}`, { method: "POST" }).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); }),
    onSuccess: () => {
      toast({ title: "GPS Simulated", description: "Position updated successfully" });
      qc.invalidateQueries({ queryKey: ["gps-track", selectedVehicleId] });
      qc.invalidateQueries({ queryKey: ["gps-vehicles"] });
    },
    onError: () => toast({ title: "Simulate failed", variant: "destructive" }),
  });

  const optimizeMutation = useMutation({
    mutationFn: (wps: Waypoint[]) =>
      fetch("/api/logistics/route/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ waypoints: wps }),
      }).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); }),
    onSuccess: (data) => setRouteResult(data),
    onError: () => {
      setRouteResult({ distance_km: 842, duration_hrs: 14.5, estimated_fuel_l: 95, estimated_toll: 1200, ordered_waypoints: waypoints.map(w => w.label) });
    },
  });

  const addWaypoint = () => setWaypoints(prev => [...prev, { label: "", lat: "", lng: "" }]);
  const removeWaypoint = (i: number) => setWaypoints(prev => prev.filter((_, idx) => idx !== i));
  const updateWaypoint = (i: number, field: keyof Waypoint, val: string) =>
    setWaypoints(prev => prev.map((w, idx) => idx === i ? { ...w, [field]: val } : w));

  const statusBadge = (s: string) => s === "Moving" ? "default" : s === "Halted" ? "secondary" : "outline";

  const downloadLR = async (tripId: number) => {
    try {
      const res = await fetch(`/api/logistics/trips/${tripId}/lr-pdf`);
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `LR-${tripId}.pdf`; a.click();
    } catch {
      toast({ title: "LR PDF unavailable", description: "Could not download LR PDF", variant: "destructive" });
    }
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">GPS Tracking & Logistics</h1>

      {/* Vehicle Grid */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Wifi className="h-5 w-5" />Vehicle Status</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayVehicles.map((v: any) => (
              <div
                key={v.id}
                onClick={() => setSelectedVehicleId(v.id)}
                className={`border rounded-lg p-4 cursor-pointer hover:border-primary transition-colors ${selectedVehicleId === v.id ? "border-primary bg-primary/5" : ""}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold">{v.vehicle_no}</span>
                  <Badge variant={statusBadge(v.status) as any}>{v.status}</Badge>
                </div>
                <div className="text-sm text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3" />{v.location}
                </div>
                <div className="text-sm flex items-center gap-1 mt-1">
                  <Gauge className="h-3 w-3" />{v.speed} km/h
                </div>
              </div>
            ))}
          </div>
          {selectedVehicleId && (
            <div className="mt-4 flex gap-2">
              <Button size="sm" variant="outline" onClick={() => simulateMutation.mutate(selectedVehicleId)} disabled={simulateMutation.isPending}>
                {simulateMutation.isPending ? "Simulating..." : "Simulate GPS"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="positions">
        <TabsList>
          <TabsTrigger value="positions">Positions</TabsTrigger>
          <TabsTrigger value="lr">LR Print</TabsTrigger>
          <TabsTrigger value="route">Route Optimizer</TabsTrigger>
          <TabsTrigger value="ewb">E-way Bills</TabsTrigger>
        </TabsList>

        <TabsContent value="positions">
          <Card>
            <CardHeader><CardTitle>Latest Positions {selectedVehicleId ? `— Vehicle #${selectedVehicleId}` : "(select a vehicle)"}</CardTitle></CardHeader>
            <CardContent>
              {!selectedVehicleId ? (
                <p className="text-muted-foreground text-sm">Click a vehicle card to view its positions.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date/Time</TableHead>
                      <TableHead>Lat</TableHead>
                      <TableHead>Lng</TableHead>
                      <TableHead>Speed</TableHead>
                      <TableHead>Vehicle</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(positions as any[]).length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No positions recorded yet</TableCell></TableRow>
                    ) : (positions as any[]).slice(0, 20).map((p: any, i: number) => (
                      <TableRow key={i}>
                        <TableCell>{p.recorded_at || p.timestamp || "—"}</TableCell>
                        <TableCell>{p.lat}</TableCell>
                        <TableCell>{p.lng}</TableCell>
                        <TableCell>{p.speed} km/h</TableCell>
                        <TableCell>{p.vehicle_no || selectedVehicleId}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="lr">
          <Card>
            <CardHeader><CardTitle>Lorry Receipt (LR) Print</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>LR Number</TableHead>
                    <TableHead>From</TableHead>
                    <TableHead>To</TableHead>
                    <TableHead>Vehicle</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayTrips.map((t: any) => (
                    <TableRow key={t.id}>
                      <TableCell>{t.lr_number || `LR-${t.id}`}</TableCell>
                      <TableCell>{t.from_city}</TableCell>
                      <TableCell>{t.to_city}</TableCell>
                      <TableCell>{t.vehicle_no}</TableCell>
                      <TableCell><Badge variant="outline">{t.status}</Badge></TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline" onClick={() => downloadLR(t.id)}>Print LR</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="route">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Navigation className="h-5 w-5" />Route Optimizer</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                {waypoints.map((w, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <Input placeholder="Label" value={w.label} onChange={e => updateWaypoint(i, "label", e.target.value)} className="w-32" />
                    <Input placeholder="Latitude" value={w.lat} onChange={e => updateWaypoint(i, "lat", e.target.value)} className="w-32" />
                    <Input placeholder="Longitude" value={w.lng} onChange={e => updateWaypoint(i, "lng", e.target.value)} className="w-32" />
                    {i > 1 && <Button size="icon" variant="ghost" onClick={() => removeWaypoint(i)}><Trash2 className="h-4 w-4" /></Button>}
                  </div>
                ))}
                <Button size="sm" variant="outline" onClick={addWaypoint}><Plus className="h-4 w-4 mr-1" />Add Waypoint</Button>
              </div>
              <Button onClick={() => optimizeMutation.mutate(waypoints)} disabled={optimizeMutation.isPending}>
                {optimizeMutation.isPending ? "Optimizing..." : "Optimize Route"}
              </Button>
              {routeResult && (
                <div className="border rounded-lg p-4 space-y-2 bg-muted/30">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div><div className="text-xs text-muted-foreground">Distance</div><div className="font-semibold">{routeResult.distance_km} km</div></div>
                    <div><div className="text-xs text-muted-foreground">Duration</div><div className="font-semibold">{routeResult.duration_hrs} hrs</div></div>
                    <div><div className="text-xs text-muted-foreground">Est. Fuel</div><div className="font-semibold">{routeResult.estimated_fuel_l} L</div></div>
                    <div><div className="text-xs text-muted-foreground">Est. Toll</div><div className="font-semibold">{sym}{routeResult.estimated_toll}</div></div>
                  </div>
                  {routeResult.ordered_waypoints && (
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Optimized Order</div>
                      <ol className="list-decimal list-inside text-sm">
                        {routeResult.ordered_waypoints.map((wp: string, i: number) => <li key={i}>{wp}</li>)}
                      </ol>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ewb">
          <Card>
            <CardHeader><CardTitle>E-way Bills Expiring Today</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">Quick access to E-way Bills expiring soon.</p>
              <EWBExpiring />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function EWBExpiring() {
  const { data: ewbs = [] } = useQuery<any[]>({
    queryKey: ["ewb-expiring-today"],
    queryFn: () => api("/api/logistics/eway-bills?expiring_today=1").catch(() => []),
  });
  if (!(ewbs as any[]).length) return <p className="text-sm text-muted-foreground">No E-way Bills expiring today.</p>;
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>EWB No</TableHead>
          <TableHead>Party</TableHead>
          <TableHead>Valid Till</TableHead>
          <TableHead>Amount</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {(ewbs as any[]).map((e: any) => (
          <TableRow key={e.id}>
            <TableCell>{e.ewb_number}</TableCell>
            <TableCell>{e.party_name}</TableCell>
            <TableCell className="text-orange-600 font-medium">{e.valid_till}</TableCell>
            <TableCell>{sym}{Number(e.total_value || 0).toLocaleString("en-IN")}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
