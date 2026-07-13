import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { TrendingUp, TrendingDown, DollarSign, Target } from "lucide-react";
import { useTenantConfig, formatCurrency as fmtCur } from "@/hooks/use-tenant-config";

const api = (path: string) => fetch(path).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); });

const PROJECTS = [
  { id: "1", name: "Green Valley Phase 1" },
  { id: "2", name: "Sunrise Heights" },
  { id: "3", name: "Metro Residences" },
];

const SAMPLE_PL: Record<string, any> = {
  "1": {
    total_area: 48000, sold_pct: 67, collections: 85000000, pending: 35000000,
    land_cost: 30000000, construction: 45000000, marketing: 5000000, approvals: 3000000, interest: 4000000,
    monthly: [
      { month: "Jan", inflow: 8000000, outflow: 6000000 },
      { month: "Feb", inflow: 9000000, outflow: 7000000 },
      { month: "Mar", inflow: 12000000, outflow: 8000000 },
      { month: "Apr", inflow: 7000000, outflow: 9000000 },
      { month: "May", inflow: 10000000, outflow: 6000000 },
      { month: "Jun", inflow: 11000000, outflow: 7000000 },
    ],
  },
  "2": {
    total_area: 96000, sold_pct: 72, collections: 220000000, pending: 80000000,
    land_cost: 80000000, construction: 120000000, marketing: 15000000, approvals: 8000000, interest: 10000000,
    monthly: [
      { month: "Jan", inflow: 20000000, outflow: 18000000 },
      { month: "Feb", inflow: 25000000, outflow: 22000000 },
      { month: "Mar", inflow: 30000000, outflow: 25000000 },
      { month: "Apr", inflow: 28000000, outflow: 20000000 },
      { month: "May", inflow: 22000000, outflow: 18000000 },
      { month: "Jun", inflow: 35000000, outflow: 28000000 },
    ],
  },
};



export default function ProjectPLPage() {
  const { currency_symbol: sym } = useTenantConfig();
  const fmt = (n: number) => sym + (n / 100000).toFixed(1) + "L";
  const fmtC = (n: number) => sym + (n / 10000000).toFixed(2) + "Cr";
  const [projectId, setProjectId] = useState("1");

  const { data } = useQuery({
    queryKey: ["real-estate-project-pl", projectId],
    queryFn: () => api(`/api/real-estate/project-pl/${projectId}`).catch(() => null),
  });

  const pl = data || SAMPLE_PL[projectId] || SAMPLE_PL["1"];
  const totalCost = (pl.land_cost + pl.construction + pl.marketing + pl.approvals + pl.interest);
  const grossMargin = ((pl.collections - pl.construction - pl.marketing - pl.approvals) / pl.collections * 100).toFixed(1);
  const netMargin = ((pl.collections - totalCost) / pl.collections * 100).toFixed(1);
  const roi = ((pl.collections - totalCost) / totalCost * 100).toFixed(1);
  const breakEven = Math.ceil(totalCost / (pl.collections / (pl.total_area * pl.sold_pct / 100 / 1000)));

  const maxFlow = Math.max(...pl.monthly.map((m: any) => Math.max(m.inflow, m.outflow)));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Project P&L Dashboard</h1>
        <div className="flex items-center gap-2">
          <Label>Project:</Label>
          <Select value={projectId} onValueChange={setProjectId}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>{PROJECTS.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      {/* Revenue Section */}
      <Card>
        <CardHeader><CardTitle>Revenue</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="border rounded p-3">
              <div className="text-sm text-muted-foreground">Total Saleable Area</div>
              <div className="text-xl font-bold">{pl.total_area.toLocaleString()} sq.ft</div>
            </div>
            <div className="border rounded p-3">
              <div className="text-sm text-muted-foreground">Sold</div>
              <div className="text-xl font-bold">{pl.sold_pct}%</div>
              <div className="w-full h-1.5 bg-muted rounded mt-1"><div className="h-full bg-primary rounded" style={{ width: `${pl.sold_pct}%` }} /></div>
            </div>
            <div className="border rounded p-3">
              <div className="text-sm text-muted-foreground">Collections</div>
              <div className="text-xl font-bold">{fmtC(pl.collections)}</div>
            </div>
            <div className="border rounded p-3">
              <div className="text-sm text-muted-foreground">Pending Collections</div>
              <div className="text-xl font-bold text-orange-500">{fmtC(pl.pending)}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cost Section */}
      <Card>
        <CardHeader><CardTitle>Costs</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              ["Land Cost", pl.land_cost],
              ["Construction", pl.construction],
              ["Marketing", pl.marketing],
              ["Approval Fees", pl.approvals],
              ["Interest", pl.interest],
            ].map(([label, value]) => (
              <div key={label as string} className="border rounded p-3">
                <div className="text-xs text-muted-foreground">{label}</div>
                <div className="text-lg font-bold">{fmt(value as number)}</div>
              </div>
            ))}
          </div>
          <div className="mt-3 text-sm font-medium border-t pt-2">Total Cost: {fmtC(totalCost)}</div>
        </CardContent>
      </Card>

      {/* P&L Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Gross Margin", value: `${grossMargin}%`, icon: TrendingUp, color: "text-green-600" },
          { label: "Net Margin", value: `${netMargin}%`, icon: TrendingDown, color: Number(netMargin) > 0 ? "text-green-600" : "text-red-500" },
          { label: "ROI", value: `${roi}%`, icon: DollarSign, color: Number(roi) > 0 ? "text-green-600" : "text-red-500" },
          { label: "Break-even Units", value: `${breakEven}`, icon: Target, color: "text-primary" },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1"><Icon className="w-4 h-4" /><span className="text-sm">{label}</span></div>
              <div className={`text-2xl font-bold ${color}`}>{value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Cash Flow Chart */}
      <Card>
        <CardHeader><CardTitle>Monthly Cash Flow</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-end gap-3 h-40">
            {pl.monthly.map((m: any) => (
              <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                <div className="flex items-end gap-0.5 h-32">
                  <div className="w-4 bg-green-400 rounded-t" style={{ height: `${(m.inflow / maxFlow) * 120}px` }} title={`Inflow: ${fmtC(m.inflow)}`} />
                  <div className="w-4 bg-red-400 rounded-t" style={{ height: `${(m.outflow / maxFlow) * 120}px` }} title={`Outflow: ${fmtC(m.outflow)}`} />
                </div>
                <div className="text-xs text-muted-foreground">{m.month}</div>
              </div>
            ))}
          </div>
          <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><span className="w-3 h-3 bg-green-400 rounded inline-block" />Inflow</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 bg-red-400 rounded inline-block" />Outflow</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
