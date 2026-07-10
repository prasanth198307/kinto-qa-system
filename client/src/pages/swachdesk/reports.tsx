import { apiFetch } from "@/lib/api-fetch";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Clock, TrendingUp, Star, Shield } from "lucide-react";

export default function SwachDeskReportsPage() {
  const [, setLocation] = useLocation();

  const { data: sla = [] } = useQuery<any[]>({
    queryKey: ["/api/desk/reports/sla"],
    queryFn: async () => apiFetch("/api/desk/reports/sla"),
  });

  const { data: agents = [] } = useQuery<any[]>({
    queryKey: ["/api/desk/reports/agent-performance"],
    queryFn: async () => apiFetch("/api/desk/reports/agent-performance"),
  });

  const { data: csat } = useQuery<any>({
    queryKey: ["/api/desk/reports/csat"],
    queryFn: async () => apiFetch("/api/desk/reports/csat"),
  });

  const { data: overview } = useQuery<any>({
    queryKey: ["/api/desk/reports/overview"],
    queryFn: async () => apiFetch("/api/desk/reports/overview"),
  });

  const totalSla = sla.reduce((a: number, r: any) => a + parseInt(r.total || 0), 0);
  const totalBreached = sla.reduce((a: number, r: any) => a + parseInt(r.breached || 0), 0);
  const compliancePct = totalSla > 0 ? Math.round(((totalSla - totalBreached) / totalSla) * 100) : 100;
  const avgFirstResponse = sla.length > 0
    ? Math.round(sla.reduce((a: number, r: any) => a + parseFloat(r.avg_first_response_mins || 0), 0) / sla.length)
    : 0;
  const avgResolution = sla.length > 0
    ? (sla.reduce((a: number, r: any) => a + parseFloat(r.avg_resolution_hours || 0), 0) / sla.length).toFixed(1)
    : "0";

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => setLocation("/swachdesk")}><ArrowLeft className="w-4 h-4 mr-1" />Back</Button>
        <h1 className="text-2xl font-bold">Helpdesk Reports</h1>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="border rounded-lg p-4 space-y-1">
          <div className="flex items-center gap-2 text-muted-foreground text-sm"><Clock className="w-4 h-4" />Avg First Response</div>
          <div className="text-2xl font-bold">{avgFirstResponse} min</div>
        </div>
        <div className="border rounded-lg p-4 space-y-1">
          <div className="flex items-center gap-2 text-muted-foreground text-sm"><TrendingUp className="w-4 h-4" />Avg Resolution</div>
          <div className="text-2xl font-bold">{avgResolution} hrs</div>
        </div>
        <div className="border rounded-lg p-4 space-y-1">
          <div className="flex items-center gap-2 text-muted-foreground text-sm"><Star className="w-4 h-4" />CSAT Average</div>
          <div className="text-2xl font-bold">{csat?.summary?.avg_csat ?? "N/A"}</div>
        </div>
        <div className="border rounded-lg p-4 space-y-1">
          <div className="flex items-center gap-2 text-muted-foreground text-sm"><Shield className="w-4 h-4" />SLA Compliance</div>
          <div className={`text-2xl font-bold ${compliancePct < 80 ? "text-red-600" : "text-green-600"}`}>{compliancePct}%</div>
        </div>
      </div>

      {/* Overview */}
      <div className="border rounded-lg p-4">
        <h2 className="font-semibold mb-3">Volume Overview</h2>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div><div className="text-muted-foreground">Today Opened</div><div className="font-bold text-lg">{overview?.today_opened ?? 0}</div></div>
          <div><div className="text-muted-foreground">This Week Opened</div><div className="font-bold text-lg">{overview?.week_opened ?? 0}</div></div>
          <div><div className="text-muted-foreground">This Month Opened</div><div className="font-bold text-lg">{overview?.month_opened ?? 0}</div></div>
          <div><div className="text-muted-foreground">Today Resolved</div><div className="font-bold text-lg text-green-600">{overview?.today_resolved ?? 0}</div></div>
          <div><div className="text-muted-foreground">This Week Resolved</div><div className="font-bold text-lg text-green-600">{overview?.week_resolved ?? 0}</div></div>
          <div><div className="text-muted-foreground">This Month Resolved</div><div className="font-bold text-lg text-green-600">{overview?.month_resolved ?? 0}</div></div>
        </div>
      </div>

      {/* SLA by Priority */}
      <div className="border rounded-lg overflow-hidden">
        <div className="p-4 border-b bg-muted/30">
          <h2 className="font-semibold">SLA Performance by Priority</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-muted/20">
            <tr>
              <th className="text-left px-4 py-2">Priority</th>
              <th className="text-right px-4 py-2">Total</th>
              <th className="text-right px-4 py-2">Breached</th>
              <th className="text-right px-4 py-2">Compliance %</th>
              <th className="text-right px-4 py-2">Avg First Response</th>
              <th className="text-right px-4 py-2">Avg Resolution</th>
            </tr>
          </thead>
          <tbody>
            {sla.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-6 text-muted-foreground">No data</td></tr>
            ) : sla.map((r: any) => (
              <tr key={r.priority} className="border-t">
                <td className="px-4 py-3 capitalize font-medium">{r.priority}</td>
                <td className="px-4 py-3 text-right">{r.total}</td>
                <td className="px-4 py-3 text-right text-red-600">{r.breached}</td>
                <td className={`px-4 py-3 text-right font-semibold ${parseFloat(r.compliance_pct) < 80 ? "text-red-600" : "text-green-600"}`}>{r.compliance_pct}%</td>
                <td className="px-4 py-3 text-right">{r.avg_first_response_mins ? `${r.avg_first_response_mins} min` : "-"}</td>
                <td className="px-4 py-3 text-right">{r.avg_resolution_hours ? `${r.avg_resolution_hours} hrs` : "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Agent Performance */}
      <div className="border rounded-lg overflow-hidden">
        <div className="p-4 border-b bg-muted/30">
          <h2 className="font-semibold">Agent Performance</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-muted/20">
            <tr>
              <th className="text-left px-4 py-2">Agent</th>
              <th className="text-left px-4 py-2">Team</th>
              <th className="text-right px-4 py-2">Assigned</th>
              <th className="text-right px-4 py-2">Resolved</th>
              <th className="text-right px-4 py-2">Avg Resolution</th>
              <th className="text-right px-4 py-2">CSAT</th>
            </tr>
          </thead>
          <tbody>
            {agents.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-6 text-muted-foreground">No agent data</td></tr>
            ) : agents.map((a: any, i: number) => (
              <tr key={i} className="border-t">
                <td className="px-4 py-3 font-medium">{a.agent_name}</td>
                <td className="px-4 py-3 text-muted-foreground">{a.team || "-"}</td>
                <td className="px-4 py-3 text-right">{a.assigned}</td>
                <td className="px-4 py-3 text-right text-green-600">{a.resolved}</td>
                <td className="px-4 py-3 text-right">{a.avg_resolution_hours ? `${a.avg_resolution_hours} hrs` : "-"}</td>
                <td className="px-4 py-3 text-right">{a.avg_csat ? `⭐ ${a.avg_csat}` : "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* CSAT */}
      {csat?.summary && (
        <div className="border rounded-lg p-4">
          <h2 className="font-semibold mb-3">CSAT Distribution</h2>
          <div className="grid grid-cols-5 gap-2 text-center text-sm">
            {[5,4,3,2,1].map(score => (
              <div key={score} className="border rounded p-3">
                <div className="text-lg">{"⭐".repeat(score)}</div>
                <div className="font-bold">{csat.summary[`score_${score}`] || 0}</div>
              </div>
            ))}
          </div>
          <div className="mt-3 text-sm text-muted-foreground">Total responses: {csat.summary.total_responses} | Average: {csat.summary.avg_csat}/5</div>
        </div>
      )}
    </div>
  );
}
