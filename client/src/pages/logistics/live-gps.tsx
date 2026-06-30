import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Gauge, User, AlertTriangle, Clock } from "lucide-react";

const api = (path: string) => fetch(path).then(r => r.json());

const SAMPLE_VEHICLES = [
  { vehicle_no: "MH12AB1234", driver: "Ramesh K", lat: 19.076, lng: 72.877, speed: 65, status: "Moving", location: "Bandra, Mumbai", trip: "MUM→DEL", last_update: "2 min ago" },
  { vehicle_no: "DL3CA5678", driver: "Suresh P", lat: 28.704, lng: 77.102, speed: 0, status: "Halted", location: "Connaught Place, Delhi", trip: "DEL→AGR", last_update: "15 min ago" },
  { vehicle_no: "KA05MJ9012", driver: "Arun V", lat: 12.971, lng: 77.594, speed: 80, status: "Moving", location: "Koramangala, Bangalore", trip: "BLR→CHN", last_update: "1 min ago" },
  { vehicle_no: "TN09CD3456", driver: "Kumar S", lat: 13.082, lng: 80.27, speed: 0, status: "Offline", location: "Anna Nagar, Chennai", trip: "—", last_update: "2 hrs ago" },
  { vehicle_no: "GJ01AB7890", driver: "Mehul B", lat: 23.022, lng: 72.571, speed: 95, status: "Moving", location: "SG Highway, Ahmedabad", trip: "AMD→SRT", last_update: "30 sec ago" },
];

const ALERTS = [
  { type: "overspeeding", vehicle: "GJ01AB7890", msg: "Speed 95 km/h — limit 80 km/h", time: "30 sec ago" },
  { type: "halt", vehicle: "DL3CA5678", msg: "Halted for 15+ minutes", time: "15 min ago" },
];

const STATUS_DOT: Record<string, string> = {
  Moving: "bg-green-500",
  Halted: "bg-orange-400",
  Offline: "bg-gray-400",
};

const STATUS_BADGE: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  Moving: "default",
  Halted: "secondary",
  Offline: "outline",
};

export default function LiveGPSPage() {
  const [selected, setSelected] = useState<string | null>(null);

  const { data: positions = [], refetch } = useQuery<any[]>({
    queryKey: ["logistics-live-positions"],
    queryFn: () => api("/api/logistics/vehicles/live-positions").catch(() => []),
    refetchInterval: 30000,
  });

  const vehicles = positions.length ? positions : SAMPLE_VEHICLES;
  const selectedVehicle = vehicles.find(v => v.vehicle_no === selected) || vehicles[0];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Live GPS Tracking</h1>
        <button onClick={() => refetch()} className="text-sm text-primary underline">Refresh</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Vehicle List Sidebar */}
        <div className="space-y-2">
          <div className="font-semibold text-sm text-muted-foreground mb-2">VEHICLES ({vehicles.length})</div>
          {vehicles.map((v: any) => (
            <button key={v.vehicle_no} onClick={() => setSelected(v.vehicle_no)}
              className={`w-full text-left border rounded p-2 text-sm hover:bg-muted transition-colors ${selected === v.vehicle_no ? "border-primary bg-primary/5" : ""}`}>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_DOT[v.status]}`} />
                <span className="font-medium">{v.vehicle_no}</span>
              </div>
              <div className="text-xs text-muted-foreground mt-1">{v.driver}</div>
              <div className="text-xs text-muted-foreground">{v.status === "Moving" ? `${v.speed} km/h` : v.status}</div>
            </button>
          ))}
        </div>

        {/* Map Area */}
        <div className="lg:col-span-2">
          <Card className="h-96">
            <CardHeader><CardTitle className="text-sm">India Map (Vehicle Positions)</CardTitle></CardHeader>
            <CardContent className="relative h-72">
              {/* SVG India outline approximation */}
              <svg viewBox="0 0 400 450" className="w-full h-full">
                <rect width="400" height="450" fill="#f0f4f8" rx="8" />
                {/* Rough India border approximation */}
                <path d="M120,30 L200,20 L280,40 L320,80 L350,140 L360,200 L340,260 L300,320 L260,370 L220,400 L200,420 L180,400 L160,380 L140,340 L120,300 L90,260 L70,200 L80,140 L100,80 Z"
                  fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1.5" />
                {/* Vehicle dots */}
                {vehicles.map((v: any) => {
                  // Map lat/lng to SVG coords (rough)
                  const x = ((v.lng - 68) / (97 - 68)) * 280 + 60;
                  const y = ((37 - v.lat) / (37 - 8)) * 380 + 30;
                  return (
                    <g key={v.vehicle_no} onClick={() => setSelected(v.vehicle_no)} style={{ cursor: "pointer" }}>
                      <circle cx={x} cy={y} r={selected === v.vehicle_no ? 8 : 6}
                        fill={v.status === "Moving" ? "#22c55e" : v.status === "Halted" ? "#f97316" : "#9ca3af"}
                        stroke="white" strokeWidth="2" />
                      <text x={x + 9} y={y + 4} fontSize="9" fill="#374151">{v.vehicle_no.slice(-4)}</text>
                    </g>
                  );
                })}
              </svg>
            </CardContent>
          </Card>
        </div>

        {/* Detail Panel */}
        <div className="space-y-4">
          {selectedVehicle && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">{selectedVehicle.vehicle_no}</CardTitle>
                  <Badge variant={STATUS_BADGE[selectedVehicle.status]}>{selectedVehicle.status}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-center gap-2"><User className="w-3 h-3" />{selectedVehicle.driver}</div>
                <div className="flex items-center gap-2"><Gauge className="w-3 h-3" />{selectedVehicle.speed} km/h</div>
                <div className="flex items-center gap-2"><MapPin className="w-3 h-3" />{selectedVehicle.location}</div>
                <div className="flex items-center gap-2"><Clock className="w-3 h-3" />{selectedVehicle.last_update}</div>
                <div className="text-muted-foreground">Trip: {selectedVehicle.trip}</div>
                <div className="text-xs text-muted-foreground">
                  Lat: {selectedVehicle.lat?.toFixed(3)}, Lng: {selectedVehicle.lng?.toFixed(3)}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-orange-500" />Alerts</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {ALERTS.map((a, i) => (
                <div key={i} className="border-l-2 border-orange-400 pl-2 text-xs">
                  <div className="font-medium">{a.vehicle}</div>
                  <div className="text-muted-foreground">{a.msg}</div>
                  <div className="text-muted-foreground">{a.time}</div>
                </div>
              ))}
              {ALERTS.length === 0 && <div className="text-sm text-muted-foreground">No active alerts</div>}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
