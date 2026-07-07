import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Moon, Play, CheckCircle, TrendingUp } from "lucide-react";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then(r => r.json());

export default function HotelNightAuditPage() {
  const qc = useQueryClient();
  const [running, setRunning] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);

  const { data: history = [] } = useQuery<any[]>({ queryKey: ["/api/hotel/night-audit/history"], queryFn: () => api("GET", "/api/hotel/night-audit/history") });

  const runAudit = useMutation({
    mutationFn: () => api("POST", "/api/hotel/night-audit/run", {}),
    onSuccess: (data) => { setLastResult(data); setRunning(false); qc.invalidateQueries({ queryKey: ["/api/hotel/night-audit/history"] }); },
    onError: () => setRunning(false),
  });

  const historyArr = Array.isArray(history) ? history : [];
  const today = new Date().toISOString().slice(0, 10);
  const alreadyRan = historyArr.some((h: any) => h.audit_date?.slice(0, 10) === today);

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold flex items-center gap-2"><Moon className="w-6 h-6 text-indigo-600" />Night Audit</h1>

      <Card className="border-2 border-indigo-200 bg-indigo-50">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-lg">Run Night Audit for {today}</p>
              <p className="text-sm text-gray-600 mt-1">Calculates daily occupancy, posts room charges to folios, summarises revenue, and locks the day.</p>
              {alreadyRan && <p className="text-sm text-green-600 mt-1 flex items-center gap-1"><CheckCircle className="w-4 h-4" />Already completed for today.</p>}
            </div>
            <Button size="lg" disabled={running || alreadyRan} onClick={() => { setRunning(true); runAudit.mutate(); }} className="min-w-[140px]">
              {running ? <span className="flex items-center gap-2"><span className="animate-spin">⏳</span>Running...</span> : <span className="flex items-center gap-2"><Play className="w-4 h-4" />Run Audit</span>}
            </Button>
          </div>
        </CardContent>
      </Card>

      {lastResult && (
        <Card className="border-green-300 bg-green-50">
          <CardHeader><CardTitle className="text-base text-green-700 flex items-center gap-2"><CheckCircle className="w-4 h-4" />Audit Completed</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-4 gap-4">
            <div><p className="text-xs text-gray-500">Occupancy</p><p className="text-2xl font-bold">{lastResult.occupancy_pct ?? 0}%</p></div>
            <div><p className="text-xs text-gray-500">Revenue</p><p className="text-2xl font-bold">₹{Number(lastResult.total_revenue ?? 0).toLocaleString("en-IN")}</p></div>
            <div><p className="text-xs text-gray-500">Arrivals</p><p className="text-2xl font-bold">{lastResult.arrivals ?? 0}</p></div>
            <div><p className="text-xs text-gray-500">Departures</p><p className="text-2xl font-bold">{lastResult.departures ?? 0}</p></div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="w-4 h-4" />Audit History</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full text-sm border-collapse">
            <thead><tr className="bg-gray-50">{["Date", "Rooms Occupied", "Occupancy %", "Arrivals", "Departures", "Revenue"].map(h => <th key={h} className="text-left p-2 border">{h}</th>)}</tr></thead>
            <tbody>
              {historyArr.map((h: any) => (
                <tr key={h.id} className="border-b">
                  <td className="p-2 font-medium">{h.audit_date?.slice(0, 10)}</td>
                  <td className="p-2">{h.rooms_occupied} / {h.total_rooms}</td>
                  <td className="p-2">
                    <div className="flex items-center gap-2">
                      <div className="w-20 bg-gray-200 rounded-full h-2">
                        <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${h.occupancy_pct ?? 0}%` }} />
                      </div>
                      <span>{h.occupancy_pct ?? 0}%</span>
                    </div>
                  </td>
                  <td className="p-2">{h.arrivals}</td>
                  <td className="p-2">{h.departures}</td>
                  <td className="p-2 font-medium">₹{Number(h.total_revenue ?? 0).toLocaleString("en-IN")}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {historyArr.length === 0 && <p className="text-center text-gray-400 py-6">No audit history yet. Run the first audit to begin.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
