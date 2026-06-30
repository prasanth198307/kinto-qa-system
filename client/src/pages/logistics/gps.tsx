import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, MapPin, Truck, Radio } from "lucide-react";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then((r) => r.json());

export default function GpsPage() {
  const qc = useQueryClient();

  const { data, isLoading, isError, dataUpdatedAt } = useQuery({
    queryKey: ["logistics-gps"],
    queryFn: () => api("GET", "/api/logistics/gps"),
    refetchInterval: 30000,
  });
  const vehicles: any[] = Array.isArray(data) ? data : [];

  const active = vehicles.filter((v) => v.speed > 0).length;
  const lastUpdated = dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString() : "—";

  function refresh() { qc.invalidateQueries({ queryKey: ["logistics-gps"] }); }

  function speedColor(speed: number): string {
    if (speed === 0) return "text-muted-foreground";
    if (speed > 80) return "text-red-500 font-semibold";
    return "text-green-600";
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">GPS Tracking</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">Last updated: {lastUpdated}</span>
          <Button variant="outline" onClick={refresh}><RefreshCw className="w-4 h-4 mr-2" />Refresh</Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Total Tracked</CardTitle><Truck className="w-4 h-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{vehicles.length}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">In Motion</CardTitle><Radio className="w-4 h-4 text-green-500" /></CardHeader><CardContent><div className="text-2xl font-bold text-green-600">{active}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Halted</CardTitle><MapPin className="w-4 h-4 text-orange-500" /></CardHeader><CardContent><div className="text-2xl font-bold text-orange-600">{vehicles.length - active}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><MapPin className="w-4 h-4" />Live Map (Text View)</CardTitle></CardHeader>
        <CardContent>
          <div className="rounded-lg border bg-muted/30 p-4 min-h-32 flex items-center justify-center">
            {vehicles.length === 0 ? (
              <p className="text-muted-foreground text-sm">No active vehicles to display.</p>
            ) : (
              <div className="grid grid-cols-2 gap-3 w-full">
                {vehicles.slice(0, 6).map((v) => (
                  <div key={v.id} className="bg-background rounded border p-3 text-sm">
                    <p className="font-semibold">{v.vehicle_number}</p>
                    <p className="text-muted-foreground text-xs">{v.lat?.toFixed(4)}, {v.lng?.toFixed(4)}</p>
                    <p className={`text-xs ${speedColor(v.speed)}`}>{v.speed} km/h</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {isLoading && <p className="text-center text-muted-foreground py-8">Loading...</p>}
      {isError && <p className="text-center text-destructive py-8">Failed to load GPS data.</p>}

      {!isLoading && !isError && (
        <Card>
          <Table>
            <TableHeader><TableRow><TableHead>Vehicle No.</TableHead><TableHead>Driver</TableHead><TableHead>Latitude</TableHead><TableHead>Longitude</TableHead><TableHead>Speed (km/h)</TableHead><TableHead>Last Seen</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody>
              {vehicles.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">No GPS data available.</TableCell></TableRow>}
              {vehicles.map((v) => (
                <TableRow key={v.id}>
                  <TableCell className="font-medium">{v.vehicle_number}</TableCell>
                  <TableCell>{v.driver_name || "—"}</TableCell>
                  <TableCell>{v.lat?.toFixed(6) ?? "—"}</TableCell>
                  <TableCell>{v.lng?.toFixed(6) ?? "—"}</TableCell>
                  <TableCell className={speedColor(v.speed)}>{v.speed ?? "—"}</TableCell>
                  <TableCell>{v.last_seen || "—"}</TableCell>
                  <TableCell>
                    <Badge variant={v.speed > 0 ? "default" : "secondary"}>{v.speed > 0 ? "Moving" : "Halted"}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
