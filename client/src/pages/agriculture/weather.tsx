import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

const api = (m: string, u: string, b?: any) =>
  fetch(u, { method: m, headers: { "Content-Type": "application/json" }, credentials: "include", body: b ? JSON.stringify(b) : undefined }).then(r => r.json());

const SENSOR_ICONS: Record<string, string> = {
  soil_moisture: "💧", temperature: "🌡", humidity: "🌫", rainfall: "🌧",
  light: "☀️", wind_speed: "💨", co2: "🌿", ph: "🧪",
};

export default function WeatherPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [selectedFarm, setSelectedFarm] = useState<string>("");
  const [syncLat, setSyncLat] = useState("17.3850");
  const [syncLon, setSyncLon] = useState("78.4867");
  const [provName, setProvName] = useState("");
  const [provFarm, setProvFarm] = useState("");
  const [newDevice, setNewDevice] = useState<any>(null);

  const { data: farms = [] } = useQuery<any[]>({ queryKey: ["/api/agriculture/farms"], queryFn: () => api("GET", "/api/agriculture/farms") });

  const { data: weather } = useQuery<any>({
    queryKey: ["/api/agriculture/weather/latest", selectedFarm],
    queryFn: () => api("GET", `/api/agriculture/weather/latest?farm_id=${selectedFarm}`),
    refetchInterval: 300_000,
  });

  const { data: sensorStatus } = useQuery<any>({
    queryKey: ["/api/agriculture/iot/devices/status", selectedFarm],
    queryFn: () => selectedFarm ? api("GET", `/api/agriculture/iot/devices/${selectedFarm}/status`) : Promise.resolve(null),
    enabled: !!selectedFarm,
    refetchInterval: 60_000,
  });

  const { data: iotStatus } = useQuery<any>({ queryKey: ["/api/agriculture/iot/api-status"], queryFn: () => api("GET", "/api/agriculture/iot/api-status") });

  const { data: devices = [] } = useQuery<any[]>({ queryKey: ["/api/agriculture/iot/devices"], queryFn: () => api("GET", "/api/agriculture/iot/devices") });

  const { data: history = [] } = useQuery<any[]>({
    queryKey: ["/api/agriculture/weather/history", selectedFarm],
    queryFn: () => api("GET", `/api/agriculture/weather/history?farm_id=${selectedFarm}&days=7`),
    enabled: !!selectedFarm,
  });

  const syncWeather = useMutation({
    mutationFn: () => api("POST", "/api/agriculture/weather/sync", { lat: parseFloat(syncLat), lon: parseFloat(syncLon), farm_id: selectedFarm || undefined }),
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ["/api/agriculture/weather/latest"] });
      qc.invalidateQueries({ queryKey: ["/api/agriculture/weather/history"] });
      toast({ title: d.source === "live" ? "Weather synced from OpenWeather API" : "Using cached weather data", description: d.source === "live" ? "Live data fetched" : "Configure OPENWEATHER_API_KEY in Integration Credentials for live data" });
    },
  });

  const provisionDevice = useMutation({
    mutationFn: () => api("POST", "/api/agriculture/iot/devices", { farm_id: provFarm || null, device_name: provName, sensor_types: ["soil_moisture", "temperature", "humidity"] }),
    onSuccess: (d) => {
      setNewDevice(d);
      qc.invalidateQueries({ queryKey: ["/api/agriculture/iot/devices"] });
      toast({ title: "Device provisioned", description: `Device key generated — save it now, shown once` });
    },
  });

  return (
    <div style={{ padding: "1.5rem", maxWidth: 1100 }}>
      <div style={{ marginBottom: "1rem", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Weather & IoT Sensors</h2>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 2 }}>Live OpenWeather API + IoT soil/temperature/humidity sensor readings</p>
        </div>
        {iotStatus && (
          <Badge style={{ background: iotStatus.configured ? "#EAF3DE" : "#f1f0ec", color: iotStatus.configured ? "#3B6D11" : "#898781", fontSize: 11 }}>
            IoT: {iotStatus.mode === "external_platform" ? "External Platform ✓" : "HTTP Push mode"}
          </Badge>
        )}
      </div>

      {/* Farm selector + weather sync */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <Card>
          <CardHeader style={{ paddingBottom: 8 }}><CardTitle style={{ fontSize: 14 }}>Farm Selection</CardTitle></CardHeader>
          <CardContent>
            <Label style={{ fontSize: 12 }}>Select Farm</Label>
            <select value={selectedFarm} onChange={e => setSelectedFarm(e.target.value)} style={{ width: "100%", border: "1px solid #d1d5db", borderRadius: 6, padding: "6px 8px", fontSize: 13, marginTop: 4 }}>
              <option value="">All farms</option>
              {farms.map((f: any) => <option key={f.id} value={f.id}>{f.name} — {f.location}</option>)}
            </select>
          </CardContent>
        </Card>

        <Card>
          <CardHeader style={{ paddingBottom: 8 }}><CardTitle style={{ fontSize: 14 }}>Sync Weather (OpenWeather API)</CardTitle></CardHeader>
          <CardContent>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
              <div>
                <Label style={{ fontSize: 11 }}>Latitude</Label>
                <Input value={syncLat} onChange={e => setSyncLat(e.target.value)} style={{ fontSize: 12, marginTop: 2 }} />
              </div>
              <div>
                <Label style={{ fontSize: 11 }}>Longitude</Label>
                <Input value={syncLon} onChange={e => setSyncLon(e.target.value)} style={{ fontSize: 12, marginTop: 2 }} />
              </div>
            </div>
            <Button size="sm" onClick={() => syncWeather.mutate()} disabled={syncWeather.isPending} style={{ width: "100%" }}>
              {syncWeather.isPending ? "Syncing…" : "Sync Weather Now"}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Current weather */}
      {weather && (
        <Card style={{ marginBottom: 16 }}>
          <CardHeader style={{ paddingBottom: 8 }}><CardTitle style={{ fontSize: 14 }}>Current Weather {weather.source === "live" ? <Badge style={{ background: "#EAF3DE", color: "#3B6D11", fontSize: 10 }}>Live</Badge> : <Badge style={{ background: "#fde9bb", color: "#7c5300", fontSize: 10 }}>Cached</Badge>}</CardTitle></CardHeader>
          <CardContent>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 12 }}>
              {[
                { label: "Temperature", value: weather.temp_current != null ? `${weather.temp_current}°C` : "—", sub: `${weather.temp_min ?? "?"}–${weather.temp_max ?? "?"}°C` },
                { label: "Humidity", value: weather.humidity != null ? `${weather.humidity}%` : "—" },
                { label: "Rainfall", value: weather.rainfall_mm != null ? `${weather.rainfall_mm} mm` : "0 mm" },
                { label: "Wind", value: weather.wind_speed != null ? `${weather.wind_speed} m/s` : "—" },
                { label: "Condition", value: weather.condition_desc || "—" },
                { label: "Date", value: weather.fetch_date || "—" },
              ].map(s => (
                <div key={s.label} style={{ textAlign: "center", padding: 8, background: "#f8faff", borderRadius: 6 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#1a56db" }}>{s.value}</div>
                  {s.sub && <div style={{ fontSize: 10, color: "#888" }}>{s.sub}</div>}
                  <div style={{ fontSize: 11, color: "#555" }}>{s.label}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* IoT sensor readings */}
      {selectedFarm && sensorStatus && (
        <Card style={{ marginBottom: 16 }}>
          <CardHeader style={{ paddingBottom: 8 }}>
            <CardTitle style={{ fontSize: 14, display: "flex", justifyContent: "space-between" }}>
              <span>IoT Sensor Readings — Farm {selectedFarm}</span>
              <Badge style={{ fontSize: 10, background: sensorStatus.source === "external_polled" ? "#EAF3DE" : "#dbeafe", color: sensorStatus.source === "external_polled" ? "#3B6D11" : "#1e40af" }}>
                {sensorStatus.source === "external_polled" ? "External Platform" : "HTTP Push"}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sensorStatus.alerts?.length > 0 && (
              <div style={{ background: "#fef3c7", border: "1px solid #fcd34d", borderRadius: 6, padding: "8px 12px", marginBottom: 12, fontSize: 12 }}>
                {sensorStatus.alerts.map((a: string, i: number) => <div key={i}>{a}</div>)}
              </div>
            )}
            {sensorStatus.readings?.length > 0 ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
                {sensorStatus.readings.map((r: any) => (
                  <div key={r.id} style={{ textAlign: "center", padding: 10, background: "#f0f4ff", borderRadius: 6, border: "1px solid #d0daf5" }}>
                    <div style={{ fontSize: 22 }}>{SENSOR_ICONS[r.sensor_type] || "📡"}</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: "#1a56db" }}>{parseFloat(r.value).toFixed(1)}<span style={{ fontSize: 11 }}> {r.unit || ""}</span></div>
                    <div style={{ fontSize: 11, color: "#555", textTransform: "capitalize" }}>{r.sensor_type?.replace(/_/g, " ")}</div>
                    <div style={{ fontSize: 10, color: "#888" }}>Sensor: {r.sensor_id || "unknown"}</div>
                    <div style={{ fontSize: 10, color: "#aaa" }}>{new Date(r.recorded_at).toLocaleString()}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: 13, color: "#888", textAlign: "center", padding: 24 }}>No sensor readings yet. Provision a device below and push data via HTTP or configure an external IoT platform.</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* 7-day weather history */}
      {history.length > 0 && (
        <Card style={{ marginBottom: 16 }}>
          <CardHeader style={{ paddingBottom: 8 }}><CardTitle style={{ fontSize: 14 }}>7-Day Weather History</CardTitle></CardHeader>
          <CardContent>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead><tr style={{ background: "#eef2ff" }}>{["Date","Min°C","Max°C","Humidity%","Rainfall mm","Wind m/s","Condition"].map(h => <th key={h} style={{ padding: "4px 8px", textAlign: "left", borderBottom: "1px solid #d0daf5" }}>{h}</th>)}</tr></thead>
              <tbody>
                {history.map((h: any, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #e2e8f0", background: i % 2 ? "#f8faff" : "#fff" }}>
                    <td style={{ padding: "4px 8px" }}>{h.fetch_date}</td>
                    <td style={{ padding: "4px 8px" }}>{h.temp_min ?? "—"}</td>
                    <td style={{ padding: "4px 8px" }}>{h.temp_max ?? "—"}</td>
                    <td style={{ padding: "4px 8px" }}>{h.humidity ?? "—"}</td>
                    <td style={{ padding: "4px 8px" }}>{h.rainfall_mm ?? "0"}</td>
                    <td style={{ padding: "4px 8px" }}>{h.wind_speed ?? "—"}</td>
                    <td style={{ padding: "4px 8px" }}>{h.condition_desc ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* IoT Device Provisioning */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Card>
          <CardHeader style={{ paddingBottom: 8 }}><CardTitle style={{ fontSize: 14 }}>Provision New IoT Device</CardTitle></CardHeader>
          <CardContent>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div>
                <Label style={{ fontSize: 11 }}>Device Name</Label>
                <Input value={provName} onChange={e => setProvName(e.target.value)} placeholder="Sensor Node A1" style={{ fontSize: 12, marginTop: 2 }} />
              </div>
              <div>
                <Label style={{ fontSize: 11 }}>Farm ID (optional)</Label>
                <Input value={provFarm} onChange={e => setProvFarm(e.target.value)} placeholder="Leave blank to assign later" style={{ fontSize: 12, marginTop: 2 }} />
              </div>
              <Button size="sm" onClick={() => provisionDevice.mutate()} disabled={provisionDevice.isPending}>
                {provisionDevice.isPending ? "Provisioning…" : "Provision Device"}
              </Button>
            </div>
            {newDevice && (
              <div style={{ marginTop: 12, background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 6, padding: 10, fontSize: 12 }}>
                <strong>Device provisioned!</strong><br />
                Device ID: <code>{newDevice.device_id}</code><br />
                <span style={{ color: "#dc2626" }}>Device Key (save now — shown once!):</span><br />
                <code style={{ wordBreak: "break-all", fontSize: 11 }}>{newDevice.device_key}</code><br />
                <br />
                Push readings to: <code>POST /api/agriculture/sensors/reading</code><br />
                Body: <code>{`{"tenant_id":1,"farm_id":${newDevice.farm_id||1},"device_key":"<key>","sensor_type":"soil_moisture","value":45,"unit":"%"}`}</code>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader style={{ paddingBottom: 8 }}><CardTitle style={{ fontSize: 14 }}>Registered Devices</CardTitle></CardHeader>
          <CardContent>
            {devices.length === 0 ? (
              <p style={{ fontSize: 12, color: "#888" }}>No devices provisioned yet.</p>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead><tr style={{ background: "#eef2ff" }}>{["Device","Farm","Platform","Last Seen","Status"].map(h => <th key={h} style={{ padding: "4px 6px", textAlign: "left" }}>{h}</th>)}</tr></thead>
                <tbody>
                  {devices.map((d: any, i) => (
                    <tr key={d.id} style={{ borderBottom: "1px solid #e2e8f0", background: i % 2 ? "#f8faff" : "#fff" }}>
                      <td style={{ padding: "4px 6px" }}>{d.device_name}</td>
                      <td style={{ padding: "4px 6px" }}>{d.farm_id || "—"}</td>
                      <td style={{ padding: "4px 6px", textTransform: "capitalize" }}>{d.platform}</td>
                      <td style={{ padding: "4px 6px" }}>{d.last_seen ? new Date(d.last_seen).toLocaleDateString() : "Never"}</td>
                      <td style={{ padding: "4px 6px" }}><Badge style={{ fontSize: 10, background: d.is_active ? "#EAF3DE" : "#fde0e0", color: d.is_active ? "#3B6D11" : "#991b1b" }}>{d.is_active ? "Active" : "Inactive"}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
