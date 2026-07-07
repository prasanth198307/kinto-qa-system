import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Route, CheckCircle } from "lucide-react";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then(r => r.json());

type Waypoint = { label: string; lat: string; lon: string };

export default function RouteOptimizationPage() {
  const [waypoints, setWaypoints] = useState<Waypoint[]>([
    { label: "Start", lat: "17.3850", lon: "78.4867" },
    { label: "Stop 1", lat: "", lon: "" },
  ]);
  const [vehicleType, setVehicleType] = useState("truck");
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  const optimizeMutation = useMutation({
    mutationFn: () => {
      const valid = waypoints.filter(w => w.lat && w.lon);
      if (valid.length < 2) throw new Error("Enter lat/lon for at least 2 waypoints");
      return api("POST", "/api/logistics/routes/optimize", {
        waypoints: valid.map(w => ({ lat: parseFloat(w.lat), lon: parseFloat(w.lon), label: w.label })),
        vehicle_type: vehicleType,
      });
    },
    onSuccess: (data) => { setResult(data); setError(""); },
    onError: (e: any) => setError(e.message),
  });

  const addWaypoint = () => setWaypoints(ws => [...ws, { label: `Stop ${ws.length}`, lat: "", lon: "" }]);
  const removeWaypoint = (i: number) => setWaypoints(ws => ws.filter((_, idx) => idx !== i));
  const updateWaypoint = (i: number, field: keyof Waypoint, value: string) =>
    setWaypoints(ws => ws.map((w, idx) => idx === i ? { ...w, [field]: value } : w));

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Route Optimizer</h1>
      <p className="text-sm text-muted-foreground">Enter waypoints (lat/lon). Uses nearest-neighbor TSP heuristic or OSRM if configured.</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Vehicle Type</CardTitle></CardHeader>
            <CardContent>
              <Select value={vehicleType} onValueChange={setVehicleType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="truck">Truck</SelectItem>
                  <SelectItem value="van">Van</SelectItem>
                  <SelectItem value="bike">Bike</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Waypoints</CardTitle>
                <Button size="sm" variant="outline" onClick={addWaypoint}><Plus className="w-3 h-3 mr-1" />Add</Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {waypoints.map((wp, i) => (
                <div key={i} className="border rounded p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Waypoint {i + 1}</span>
                    {waypoints.length > 2 && (
                      <button onClick={() => removeWaypoint(i)} className="text-destructive"><Trash2 className="w-3 h-3" /></button>
                    )}
                  </div>
                  <div><Label className="text-xs">Label</Label><Input placeholder="e.g. Warehouse A" value={wp.label} onChange={e => updateWaypoint(i, "label", e.target.value)} /></div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><Label className="text-xs">Latitude</Label><Input placeholder="17.3850" value={wp.lat} onChange={e => updateWaypoint(i, "lat", e.target.value)} /></div>
                    <div><Label className="text-xs">Longitude</Label><Input placeholder="78.4867" value={wp.lon} onChange={e => updateWaypoint(i, "lon", e.target.value)} /></div>
                  </div>
                </div>
              ))}
              {error && <p className="text-destructive text-sm">{error}</p>}
              <Button className="w-full" onClick={() => optimizeMutation.mutate()} disabled={optimizeMutation.isPending}>
                <Route className="w-4 h-4 mr-2" />{optimizeMutation.isPending ? "Optimizing..." : "Optimize Route"}
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          {result ? (
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" />Optimized Route</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="text-center border rounded p-2">
                    <div className="text-lg font-bold">{result.total_distance_km} km</div>
                    <div className="text-xs text-muted-foreground">Total Distance</div>
                  </div>
                  <div className="text-center border rounded p-2">
                    <div className="text-lg font-bold">{result.estimated_time_mins} min</div>
                    <div className="text-xs text-muted-foreground">Est. Time</div>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground mb-3">Source: {result.source} {result.route_id ? `| Route ID: ${result.route_id}` : ""}</div>
                <div className="space-y-2">
                  {result.optimized_waypoints?.map((wp: any, i: number) => (
                    <div key={i} className="flex items-center gap-3 border rounded p-2">
                      <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">{i + 1}</div>
                      <div className="flex-1">
                        <div className="text-sm font-medium">{wp.label || `Waypoint ${i + 1}`}</div>
                        <div className="text-xs text-muted-foreground font-mono">{Number(wp.lat).toFixed(4)}, {Number(wp.lon).toFixed(4)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-16 text-center text-muted-foreground">
                <Route className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>Add waypoints (lat/lon) and click "Optimize Route".</p>
                <p className="text-xs mt-2">Set OSRM_URL env var for real routing data.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
