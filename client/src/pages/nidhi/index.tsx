import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Landmark, Coins, TrendingUp, AlertTriangle, CheckCircle, IndianRupee, Clock } from "lucide-react";

const fmt = (n: number) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
const api = (p: string) => fetch(p).then((r) => r.json());

export default function NidhiDashboard() {
  const { data: stats } = useQuery<any>({ queryKey: ["nidhi-stats"], queryFn: () => api("/api/nidhi/stats") });
  const { data: pending } = useQuery<any[]>({ queryKey: ["nidhi-pending-emis"], queryFn: () => api("/api/nidhi/reports/pending-emis") });
  const { data: npa } = useQuery<any[]>({ queryKey: ["nidhi-npa"], queryFn: () => api("/api/nidhi/reports/npa-list") });
  const { data: pdc } = useQuery<any>({ queryKey: ["nidhi-pdc-stats"], queryFn: () => api("/api/nidhi/pdc/stats") });

  const kpis = [
    { label: "Total Members", value: stats?.totalMembers ?? "—", icon: Users, color: "text-blue-600", sub: `${stats?.kycPending ?? 0} KYC pending` },
    { label: "Total Deposits", value: stats ? fmt(stats.totalDeposits) : "—", icon: Coins, color: "text-green-600", sub: `${stats?.totalDepositAccounts ?? 0} accounts` },
    { label: "Loan Portfolio", value: stats ? fmt(stats.totalOutstanding) : "—", icon: Landmark, color: "text-purple-600", sub: `${stats?.totalLoans ?? 0} active loans` },
    { label: "Share Capital (NOF)", value: stats ? fmt(stats.netOwnedFunds) : "—", icon: TrendingUp, color: "text-orange-600", sub: `Dep/NOF: ${stats?.depositToNofRatio ?? "—"}x` },
  ];

  const compliant = stats?.isCompliant;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Nidhi Company ERP</h1>
          <p className="text-muted-foreground text-sm mt-1">RBI-compliant Mutual Benefit Finance operations</p>
        </div>
        <Badge variant={compliant ? "default" : "destructive"} className="text-sm px-3 py-1">
          {compliant == null ? "Checking..." : compliant ? "✓ NOF Ratio Compliant" : "✗ NOF Ratio Breach"}
        </Badge>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map((k) => (
          <Card key={k.label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <k.icon className={`w-4 h-4 ${k.color}`} />
                <span className="text-xs text-muted-foreground">{k.label}</span>
              </div>
              <div className="text-xl font-bold">{k.value}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{k.sub}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${compliant ? "bg-green-100" : "bg-red-100"}`}>
              {compliant ? <CheckCircle className="w-6 h-6 text-green-600" /> : <AlertTriangle className="w-6 h-6 text-red-600" />}
            </div>
            <div>
              <div className="font-semibold">NOF Ratio</div>
              <div className="text-2xl font-bold">{stats?.depositToNofRatio ?? "—"}x</div>
              <div className="text-xs text-muted-foreground">Max allowed: 20x</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
              <Clock className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <div className="font-semibold">EMIs Due Today</div>
              <div className="text-2xl font-bold">{stats?.emisDueToday ?? 0}</div>
              <div className="text-xs text-muted-foreground">{pending?.length ?? 0} overdue</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <div className="font-semibold">NPA Loans</div>
              <div className="text-2xl font-bold">{stats?.npaCount ?? 0}</div>
              <div className="text-xs text-muted-foreground">{stats ? fmt(stats.npaAmount) : "—"} at risk</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Overdue EMIs</CardTitle></CardHeader>
          <CardContent>
            {!pending?.length ? <p className="text-sm text-muted-foreground">No overdue EMIs</p> : (
              <div className="space-y-2 max-h-56 overflow-y-auto">
                {pending.slice(0, 8).map((l: any) => (
                  <div key={l.id} className="flex items-center justify-between text-sm border rounded p-2">
                    <div>
                      <div className="font-medium">{l.member_name}</div>
                      <div className="text-xs text-muted-foreground">{l.loan_number} · {l.days_overdue} days overdue</div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">{fmt(l.emi_amount)}</div>
                      <Badge variant="destructive" className="text-xs">{l.member_phone}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">PDC Summary</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Pending", value: pdc?.pending ?? 0, color: "bg-amber-100 text-amber-700" },
                { label: "Presented", value: pdc?.presented ?? 0, color: "bg-blue-100 text-blue-700" },
                { label: "Cleared", value: pdc?.cleared ?? 0, color: "bg-green-100 text-green-700" },
                { label: "Bounced", value: pdc?.bounced ?? 0, color: "bg-red-100 text-red-700" },
              ].map((s) => (
                <div key={s.label} className={`rounded p-3 ${s.color}`}>
                  <div className="text-lg font-bold">{s.value}</div>
                  <div className="text-xs">{s.label}</div>
                </div>
              ))}
            </div>
            {pdc?.bounce_rate > 0 && (
              <div className="mt-3 text-sm text-muted-foreground">
                Bounce rate: <span className="font-semibold text-red-600">{pdc.bounce_rate}%</span> · Charges: {fmt(pdc.total_bounce_charges)}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
