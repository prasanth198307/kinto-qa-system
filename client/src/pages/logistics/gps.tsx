import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then(r => r.json());

function isOnline(lastSeen: string | null): boolean {
  if (!lastSeen) return false;
  return (Date.now() - new Date(lastSeen).getTime()) < 5 * 60 * 1000; // 5 min
}

const EMPTY_LOC = { lat: "", lon: "", speed_kmh: "", heading: "" };
const EMPTY_GEO = { name: "", center_lat: "", center_lon: "", radius_m: "" };

export default function GpsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [selectedVehicle, setSelectedVehicle] = useState<any>(null);
  const [showLocForm, setShowLocForm] = useState(false);
  const [showGeoForm, setShowGeoForm] = useState(false);
  const [locForm, setLocForm] = useState<any>(EMPTY_LOC);
  const [geoForm, setGeoForm] = useState<any>(EMPTY_GEO);

  const { data: liveMap = [] } = useQuery({
    queryKey: ["/api/logistics/vehicles/live-map"],
    queryFn: () => api("GET", "/api/logistics/vehicles/live-map"),
    refetchInterval: 30000,
  });

  const { data: routeHistory = [] } = useQuery({
    queryKey: ["/api/logistics/vehicles", selectedVehicle?.id, "route-history"],
    queryFn: () => api("GET", `/api/logistics/vehicles/${selectedVehicle.id}/route-history`),
    enabled: !!selectedVehicle,
  });

  const updateLocMut = useMutation({
    mutationFn: (data: any) => api("POST", `/api/logistics/vehicles/${selectedVehicle.id}/location`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/logistics/vehicles/live-map"] }); setShowLocForm(false); toast({ title: "Location updated" }); },
  });

  const geoMut = useMutation({
    mutationFn: (data: any) => api("POST", `/api/logistics/vehicles/${selectedVehicle.id}/geofence`, data),
    onSuccess: () => { setShowGeoForm(false); toast({ title: "Geofence configured" }); },
  });

  const vehicles = Array.isArray(liveMap) ? liveMap : [];
  const online = vehicles.filter((v: any) => isOnline(v.last_seen)).length;
  const history = Array.isArray(routeHistory) ? routeHistory : [];

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">GPS Tracking</h1>
          <p style={{ color: "#6b7280", fontSize: 13, marginTop: 4 }}>
            Note: Real-time map requires Traccar integration. Showing last known coordinates and route history.
          </p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
        <Card><CardContent style={{ paddingTop: 20 }}><div style={{ fontSize: 28, fontWeight: 700 }}>{vehicles.length}</div><div style={{ color: "#6b7280", fontSize: 13 }}>Total Tracked</div></CardContent></Card>
        <Card><CardContent style={{ paddingTop: 20 }}><div style={{ fontSize: 28, fontWeight: 700, color: "#22c55e" }}>{online}</div><div style={{ color: "#6b7280", fontSize: 13 }}>Live (last 5 min)</div></CardContent></Card>
        <Card><CardContent style={{ paddingTop: 20 }}><div style={{ fontSize: 28, fontWeight: 700, color: "#6b7280" }}>{vehicles.length - online}</div><div style={{ color: "#6b7280", fontSize: 13 }}>Offline</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Live Vehicle Map — Last Known Positions</CardTitle></CardHeader>
        <CardContent>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #e5e7eb", background: "#f9fafb" }}>
                  {["Reg No", "Status", "Latitude", "Longitude", "Speed", "Last Seen", "Actions"].map(h => (
                    <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600, whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {vehicles.map((v: any) => {
                  const live = isOnline(v.last_seen);
                  return (
                    <tr key={v.id} style={{ borderBottom: "1px solid #e5e7eb", background: selectedVehicle?.id === v.id ? "#f5f3ff" : undefined }}>
                      <td style={{ padding: "8px 12px", fontWeight: 600 }}>
                        <button onClick={() => setSelectedVehicle(v === selectedVehicle ? null : v)}
                          style={{ color: "#4f46e5", background: "none", border: "none", cursor: "pointer" }}>{v.reg_no}</button>
                      </td>
                      <td style={{ padding: "8px 12px" }}>
                        <Badge style={{ background: live ? "#22c55e" : "#6b7280", color: "#fff" }}>{live ? "Live" : "Offline"}</Badge>
                      </td>
                      <td style={{ padding: "8px 12px" }}>{v.last_lat != null ? Number(v.last_lat).toFixed(6) : "—"}</td>
                      <td style={{ padding: "8px 12px" }}>{v.last_lon != null ? Number(v.last_lon).toFixed(6) : "—"}</td>
                      <td style={{ padding: "8px 12px" }}>{v.speed_kmh != null ? `${v.speed_kmh} km/h` : "—"}</td>
                      <td style={{ padding: "8px 12px" }}>{v.last_seen ? new Date(v.last_seen).toLocaleString("en-IN") : "—"}</td>
                      <td style={{ padding: "8px 12px" }}>
                        <div style={{ display: "flex", gap: 4 }}>
                          <Button size="sm" variant="outline" onClick={() => { setSelectedVehicle(v); setLocForm(EMPTY_LOC); setShowLocForm(true); }}>Update Loc</Button>
                          <Button size="sm" variant="outline" onClick={() => { setSelectedVehicle(v); setGeoForm(EMPTY_GEO); setShowGeoForm(true); }}>Geofence</Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {vehicles.length === 0 && <tr><td colSpan={7} style={{ padding: 24, textAlign: "center", color: "#6b7280" }}>No GPS data available.</td></tr>}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {selectedVehicle && !showLocForm && !showGeoForm && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Route History — {selectedVehicle.reg_no}</CardTitle>
              <Button size="sm" variant="outline" onClick={() => setSelectedVehicle(null)}>Close</Button>
            </div>
          </CardHeader>
          <CardContent>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #e5e7eb", background: "#f9fafb" }}>
                    {["Timestamp", "Latitude", "Longitude", "Speed (km/h)", "Heading"].map(h => (
                      <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {history.slice(0, 50).map((r: any, i: number) => (
                    <tr key={i} style={{ borderBottom: "1px solid #e5e7eb" }}>
                      <td style={{ padding: "8px 12px" }}>{new Date(r.timestamp || r.recorded_at).toLocaleString("en-IN")}</td>
                      <td style={{ padding: "8px 12px" }}>{Number(r.lat).toFixed(6)}</td>
                      <td style={{ padding: "8px 12px" }}>{Number(r.lon).toFixed(6)}</td>
                      <td style={{ padding: "8px 12px" }}>{r.speed_kmh ?? "—"}</td>
                      <td style={{ padding: "8px 12px" }}>{r.heading ?? "—"}</td>
                    </tr>
                  ))}
                  {history.length === 0 && <tr><td colSpan={5} style={{ padding: 24, textAlign: "center", color: "#6b7280" }}>No route history.</td></tr>}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Update Location Dialog */}
      <Dialog open={showLocForm} onOpenChange={setShowLocForm}>
        <DialogContent style={{ maxWidth: 420 }}>
          <DialogHeader><DialogTitle>Update Location — {selectedVehicle?.reg_no}</DialogTitle></DialogHeader>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div><Label>Latitude</Label><Input type="number" step="0.000001" value={locForm.lat} onChange={e => setLocForm((f: any) => ({ ...f, lat: e.target.value }))} /></div>
            <div><Label>Longitude</Label><Input type="number" step="0.000001" value={locForm.lon} onChange={e => setLocForm((f: any) => ({ ...f, lon: e.target.value }))} /></div>
            <div><Label>Speed (km/h)</Label><Input type="number" value={locForm.speed_kmh} onChange={e => setLocForm((f: any) => ({ ...f, speed_kmh: e.target.value }))} /></div>
            <div><Label>Heading (°)</Label><Input type="number" value={locForm.heading} onChange={e => setLocForm((f: any) => ({ ...f, heading: e.target.value }))} /></div>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
            <Button variant="outline" onClick={() => setShowLocForm(false)}>Cancel</Button>
            <Button onClick={() => updateLocMut.mutate(locForm)} disabled={updateLocMut.isPending}>Update</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Geofence Dialog */}
      <Dialog open={showGeoForm} onOpenChange={setShowGeoForm}>
        <DialogContent style={{ maxWidth: 420 }}>
          <DialogHeader><DialogTitle>Set Geofence — {selectedVehicle?.reg_no}</DialogTitle></DialogHeader>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={{ gridColumn: "1/-1" }}><Label>Geofence Name</Label><Input value={geoForm.name} onChange={e => setGeoForm((f: any) => ({ ...f, name: e.target.value }))} /></div>
            <div><Label>Center Lat</Label><Input type="number" step="0.000001" value={geoForm.center_lat} onChange={e => setGeoForm((f: any) => ({ ...f, center_lat: e.target.value }))} /></div>
            <div><Label>Center Lon</Label><Input type="number" step="0.000001" value={geoForm.center_lon} onChange={e => setGeoForm((f: any) => ({ ...f, center_lon: e.target.value }))} /></div>
            <div style={{ gridColumn: "1/-1" }}><Label>Radius (meters)</Label><Input type="number" value={geoForm.radius_m} onChange={e => setGeoForm((f: any) => ({ ...f, radius_m: e.target.value }))} /></div>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
            <Button variant="outline" onClick={() => setShowGeoForm(false)}>Cancel</Button>
            <Button onClick={() => geoMut.mutate(geoForm)} disabled={geoMut.isPending}>Save Geofence</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
