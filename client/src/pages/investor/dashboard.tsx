import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { RefreshCw } from "lucide-react";

function fmt(v: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(v || 0);
}

function pct(v: number) { return `${(v || 0).toFixed(1)}%`; }

export default function InvestorDashboardPage() {
  const { toast } = useToast();
  const { data: metrics, refetch } = useQuery({
    queryKey: ["/api/investor/metrics"],
    queryFn: () => fetch("/api/investor/metrics?limit=1").then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); }),
  });
  const { data: runway } = useQuery({
    queryKey: ["/api/investor/runway"],
    queryFn: () => fetch("/api/investor/runway").then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); }),
  });

  const calcMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/investor/metrics/auto-calculate", {}),
    onSuccess: () => { refetch(); toast({ title: "Metrics calculated" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const m = Array.isArray(metrics) ? metrics[0] : metrics;
  const r = runway || {};

  const kpis = [
    { label: "MRR", value: fmt(m?.mrr) },
    { label: "ARR", value: fmt(m?.arr) },
    { label: "Runway", value: `${r.runway_months || m?.runway_months || 0} mo` },
    { label: "Gross Margin", value: pct(m?.gross_margin_pct) },
    { label: "LTV:CAC", value: (m?.ltv_cac_ratio || 0).toFixed(2) },
  ];

  const mrrWaterfall = m ? [
    { label: "Opening MRR", value: m.opening_mrr },
    { label: "New MRR", value: m.new_mrr },
    { label: "Expansion MRR", value: m.expansion_mrr },
    { label: "Churn MRR", value: m.churn_mrr },
    { label: "Closing MRR", value: m.closing_mrr },
  ] : [];

  const ebitdaBridge: { label: string; value: number }[] = m?.ebitda_bridge
    ? Object.entries(m.ebitda_bridge).map(([k, v]) => ({ label: k, value: v as number }))
    : [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Investor Dashboard</h1>
        <Button size="sm" onClick={() => calcMutation.mutate()} disabled={calcMutation.isPending}>
          <RefreshCw className="h-3 w-3 mr-1" />Calculate Metrics
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {kpis.map(k => (
          <Card key={k.label}>
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground">{k.label}</div>
              <div className="text-xl font-bold mt-1">{k.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h2 className="text-lg font-semibold mb-3">MRR Waterfall</h2>
          <table className="w-full text-sm border rounded-lg overflow-hidden">
            <thead className="bg-muted"><tr>{["Metric","Amount"].map(h => <th key={h} className="text-left p-3">{h}</th>)}</tr></thead>
            <tbody>
              {mrrWaterfall.map((row, i) => (
                <tr key={i} className="border-t">
                  <td className="p-3">{row.label}</td>
                  <td className="p-3 text-right font-medium">{fmt(row.value)}</td>
                </tr>
              ))}
              {mrrWaterfall.length === 0 && <tr><td colSpan={2} className="p-4 text-center text-muted-foreground">No data</td></tr>}
            </tbody>
          </table>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-3">EBITDA Bridge</h2>
          <table className="w-full text-sm border rounded-lg overflow-hidden">
            <thead className="bg-muted"><tr>{["Item","Amount"].map(h => <th key={h} className="text-left p-3">{h}</th>)}</tr></thead>
            <tbody>
              {ebitdaBridge.map((row, i) => (
                <tr key={i} className="border-t">
                  <td className="p-3 capitalize">{row.label.replace(/_/g, " ")}</td>
                  <td className={`p-3 text-right font-medium ${row.value < 0 ? "text-red-600" : ""}`}>{fmt(row.value)}</td>
                </tr>
              ))}
              {ebitdaBridge.length === 0 && <tr><td colSpan={2} className="p-4 text-center text-muted-foreground">No data</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {r.runway_months && (
        <Card>
          <CardContent className="p-4 grid grid-cols-3 gap-4">
            <div><div className="text-xs text-muted-foreground">Runway</div><div className="text-lg font-bold">{r.runway_months} months</div></div>
            <div><div className="text-xs text-muted-foreground">Cash Balance</div><div className="text-lg font-bold">{fmt(r.cash_balance)}</div></div>
            <div><div className="text-xs text-muted-foreground">Avg Monthly Burn</div><div className="text-lg font-bold">{fmt(r.avg_monthly_burn)}</div></div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
