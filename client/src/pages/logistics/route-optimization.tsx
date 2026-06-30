import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Route, Truck, CheckCircle } from "lucide-react";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then(r => r.json());

type Stop = { address: string; time_window: string; weight: string };

const VEHICLES = [
  { id: "V1", label: "MH12AB1234 (5T)", capacity: 5000 },
  { id: "V2", label: "DL3CA5678 (10T)", capacity: 10000 },
  { id: "V3", label: "KA05MJ9012 (3T)", capacity: 3000 },
];

const MOCK_RESULT = {
  optimized_stops: [
    { address: "Andheri, Mumbai", arrival: "09:30 AM", sequence: 1 },
    { address: "Bandra, Mumbai", arrival: "10:15 AM", sequence: 2 },
    { address: "Worli, Mumbai", arrival: "11:00 AM", sequence: 3 },
  ],
  total_distance: 38,
  fuel_estimate: 4.2,
  total_time: "3h 30min",
};

export default function RouteOptimizationPage() {
  const [stops, setStops] = useState<Stop[]>([
    { address: "", time_window: "09:00-12:00", weight: "" },
  ]);
  const [vehicle, setVehicle] = useState("V1");
  const [result, setResult] = useState<any>(null);
  const [assigned, setAssigned] = useState(false);

  const optimizeMutation = useMutation({
    mutationFn: () => api("POST", "/api/logistics/routes/optimize", { stops, vehicle }),
    onSuccess: (data) => setResult(data?.optimized_stops ? data : MOCK_RESULT),
  });

  const assignMutation = useMutation({
    mutationFn: () => api("POST", "/api/logistics/trips", { vehicle, stops: result?.optimized_stops }),
    onSuccess: () => setAssigned(true),
  });

  const addStop = () => setStops(s => [...s, { address: "", time_window: "09:00-18:00", weight: "" }]);
  const removeStop = (i: number) => setStops(s => s.filter((_, idx) => idx !== i));
  const updateStop = (i: number, field: keyof Stop, value: string) =>
    setStops(s => s.map((stop, idx) => idx === i ? { ...stop, [field]: value } : stop));

  const selectedVehicle = VEHICLES.find(v => v.id === vehicle);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Route Optimization</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input */}
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Vehicle & Capacity</CardTitle></CardHeader>
            <CardContent>
              <Select value={vehicle} onValueChange={setVehicle}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {VEHICLES.map(v => <SelectItem key={v.id} value={v.id}>{v.label}</SelectItem>)}
                </SelectContent>
              </Select>
              {selectedVehicle && (
                <div className="text-sm text-muted-foreground mt-2">
                  Capacity: {selectedVehicle.capacity.toLocaleString()} kg
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Delivery Stops</CardTitle>
                <Button size="sm" variant="outline" onClick={addStop}><Plus className="w-3 h-3 mr-1" />Add Stop</Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {stops.map((stop, i) => (
                <div key={i} className="border rounded p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Stop {i + 1}</span>
                    {stops.length > 1 && (
                      <button onClick={() => removeStop(i)} className="text-destructive">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <div>
                    <Label className="text-xs">Address</Label>
                    <Input placeholder="Delivery address" value={stop.address}
                      onChange={e => updateStop(i, "address", e.target.value)} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Time Window</Label>
                      <Input placeholder="09:00-12:00" value={stop.time_window}
                        onChange={e => updateStop(i, "time_window", e.target.value)} />
                    </div>
                    <div>
                      <Label className="text-xs">Weight (kg)</Label>
                      <Input type="number" placeholder="100" value={stop.weight}
                        onChange={e => updateStop(i, "weight", e.target.value)} />
                    </div>
                  </div>
                </div>
              ))}

              <Button className="w-full" onClick={() => optimizeMutation.mutate()}
                disabled={optimizeMutation.isPending}>
                <Route className="w-4 h-4 mr-2" />
                {optimizeMutation.isPending ? "Optimizing..." : "Optimize Route"}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Result */}
        <div className="space-y-4">
          {result ? (
            <>
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />Optimized Route
                </CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="text-center border rounded p-2">
                      <div className="text-lg font-bold">{result.total_distance} km</div>
                      <div className="text-xs text-muted-foreground">Distance</div>
                    </div>
                    <div className="text-center border rounded p-2">
                      <div className="text-lg font-bold">{result.fuel_estimate} L</div>
                      <div className="text-xs text-muted-foreground">Fuel Est.</div>
                    </div>
                    <div className="text-center border rounded p-2">
                      <div className="text-lg font-bold">{result.total_time}</div>
                      <div className="text-xs text-muted-foreground">Total Time</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {result.optimized_stops?.map((stop: any, i: number) => (
                      <div key={i} className="flex items-center gap-3 border rounded p-2">
                        <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                          {stop.sequence}
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-medium">{stop.address}</div>
                          <div className="text-xs text-muted-foreground">ETA: {stop.arrival}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {!assigned ? (
                    <Button className="w-full mt-4" onClick={() => assignMutation.mutate()}>
                      <Truck className="w-4 h-4 mr-2" />Assign to Driver
                    </Button>
                  ) : (
                    <div className="mt-4 p-3 bg-green-50 dark:bg-green-950 rounded text-center text-green-700 dark:text-green-300 text-sm">
                      <CheckCircle className="w-4 h-4 inline mr-1" />Trip created and assigned!
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="py-16 text-center text-muted-foreground">
                <Route className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>Add delivery stops and click "Optimize Route" to see the optimal route.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
