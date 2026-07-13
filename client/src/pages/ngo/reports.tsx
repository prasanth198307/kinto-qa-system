import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, BarChart3 } from "lucide-react";
import { useTenantConfig, formatCurrency as fmtCur } from "@/hooks/use-tenant-config";
let sym = "₹"; // overridden per-component via useTenantConfig

const get = (p: string) => fetch(p).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); });
const fmt = (n: any) => `${sym}${Number(n || 0).toLocaleString("en-IN")}`;

export default function NGOReportsPage() {
  const { data: summary80g } = useQuery<any>({ queryKey: ["ngo-rpt-80g"], queryFn: () => get("/api/ngo/reports/80g-summary") });
  const { data: donorWise = [] } = useQuery<any[]>({ queryKey: ["ngo-rpt-donor"], queryFn: () => get("/api/ngo/reports/donor-wise") });
  const { data: budgetActual = [] } = useQuery<any[]>({ queryKey: ["ngo-rpt-budget"], queryFn: () => get("/api/ngo/reports/project-budget-actual") });
  const { data: fcraSummary } = useQuery<any>({ queryKey: ["ngo-rpt-fcra"], queryFn: () => get("/api/ngo/reports/fcra-summary") });
  const { data: annual } = useQuery<any>({ queryKey: ["ngo-rpt-annual"], queryFn: () => get("/api/ngo/reports/annual-report") });
  const { data: csr } = useQuery<any>({ queryKey: ["ngo-rpt-csr"], queryFn: () => get("/api/ngo/reports/csr") });

  const exportCSV = (rows: any[], filename: string) => {
    if (!rows?.length) return;
    const keys = Object.keys(rows[0]);
    const csv = [keys.join(","), ...rows.map(r => keys.map(k => `"${r[k] ?? ""}"`).join(","))].join("\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); a.download = filename; a.click();
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-2"><BarChart3 className="w-6 h-6 text-blue-600" /><h1 className="text-2xl font-bold">NGO Reports</h1></div>

      {annual && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">Total Donations</div><div className="text-lg font-bold">{fmt(annual.total_donations)}</div></CardContent></Card>
          <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">Donors</div><div className="text-lg font-bold">{annual.donor_count ?? 0}</div></CardContent></Card>
          <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">Active Projects</div><div className="text-lg font-bold">{annual.active_projects ?? 0}</div></CardContent></Card>
          <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">Beneficiaries</div><div className="text-lg font-bold">{annual.beneficiary_count ?? 0}</div></CardContent></Card>
          <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">Volunteers</div><div className="text-lg font-bold">{annual.volunteer_count ?? 0}</div></CardContent></Card>
        </div>
      )}

      <Tabs defaultValue="donor-wise">
        <TabsList className="flex-wrap">
          <TabsTrigger value="donor-wise">Donor-wise</TabsTrigger>
          <TabsTrigger value="budget">Project Budget vs Actual</TabsTrigger>
          <TabsTrigger value="80g">80G Summary</TabsTrigger>
          <TabsTrigger value="fcra">FCRA Summary</TabsTrigger>
          <TabsTrigger value="csr">CSR</TabsTrigger>
        </TabsList>

        <TabsContent value="donor-wise">
          <div className="flex justify-end mb-2"><Button size="sm" variant="outline" onClick={() => exportCSV(donorWise, "donor-wise.csv")}><Download className="w-3 h-3 mr-1" />CSV</Button></div>
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>Donor</TableHead><TableHead>Type</TableHead><TableHead>PAN</TableHead><TableHead>Donations</TableHead><TableHead>Total</TableHead></TableRow></TableHeader>
              <TableBody>
                {donorWise.slice(0, 100).map((d: any, i: number) => (
                  <TableRow key={i}><TableCell className="font-medium">{d.name || d.donor_name}</TableCell><TableCell className="text-sm uppercase">{d.donor_type}</TableCell><TableCell className="font-mono text-sm">{d.pan_number || "—"}</TableCell><TableCell>{d.donation_count}</TableCell><TableCell className="font-semibold">{fmt(d.total_amount)}</TableCell></TableRow>
                ))}
                {!donorWise.length && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No data</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="budget">
          <div className="flex justify-end mb-2"><Button size="sm" variant="outline" onClick={() => exportCSV(budgetActual, "project-budget.csv")}><Download className="w-3 h-3 mr-1" />CSV</Button></div>
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>Project</TableHead><TableHead>Target</TableHead><TableHead>Raised</TableHead><TableHead>Utilized</TableHead><TableHead>Progress</TableHead></TableRow></TableHeader>
              <TableBody>
                {budgetActual.map((p: any, i: number) => {
                  const target = Number(p.target_amount || 0), raised = Number(p.raised ?? p.total_donations ?? 0);
                  const pct = target > 0 ? Math.min(100, Math.round(raised / target * 100)) : 0;
                  return (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell>{fmt(target)}</TableCell>
                      <TableCell className="font-semibold">{fmt(raised)}</TableCell>
                      <TableCell>{fmt(p.utilized ?? p.total_expenses)}</TableCell>
                      <TableCell><div className="flex items-center gap-2"><div className="w-24 h-2 bg-muted rounded-full overflow-hidden"><div className="h-full bg-green-500" style={{ width: `${pct}%` }} /></div><span className="text-xs">{pct}%</span></div></TableCell>
                    </TableRow>
                  );
                })}
                {!budgetActual.length && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No projects</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="80g">
          <div className="grid grid-cols-3 gap-3 max-w-xl">
            <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">Eligible Donations</div><div className="text-xl font-bold">{summary80g?.eligible_count ?? 0}</div></CardContent></Card>
            <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">Eligible Amount</div><div className="text-xl font-bold">{fmt(summary80g?.eligible_amount)}</div></CardContent></Card>
            <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">Receipts Issued</div><div className="text-xl font-bold">{summary80g?.receipts_issued ?? 0}</div></CardContent></Card>
          </div>
        </TabsContent>

        <TabsContent value="fcra">
          <div className="grid grid-cols-3 gap-3 max-w-xl">
            <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">Foreign Receipts</div><div className="text-xl font-bold">{fcraSummary?.count ?? 0}</div></CardContent></Card>
            <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">Total INR</div><div className="text-xl font-bold">{fmt(fcraSummary?.total_inr)}</div></CardContent></Card>
            <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">Countries</div><div className="text-xl font-bold">{fcraSummary?.country_count ?? 0}</div></CardContent></Card>
          </div>
          {Array.isArray(fcraSummary?.by_country) && fcraSummary.by_country.length > 0 && (
            <Card className="mt-3 max-w-xl"><CardContent className="p-0">
              <Table>
                <TableHeader><TableRow><TableHead>Country</TableHead><TableHead>Receipts</TableHead><TableHead>INR</TableHead></TableRow></TableHeader>
                <TableBody>{fcraSummary.by_country.map((c: any, i: number) => <TableRow key={i}><TableCell>{c.country}</TableCell><TableCell>{c.count}</TableCell><TableCell className="font-semibold">{fmt(c.total_inr)}</TableCell></TableRow>)}</TableBody>
              </Table>
            </CardContent></Card>
          )}
        </TabsContent>

        <TabsContent value="csr">
          <div className="grid grid-cols-3 gap-3 max-w-xl">
            <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">CSR Projects</div><div className="text-xl font-bold">{csr?.project_count ?? 0}</div></CardContent></Card>
            <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">Total Budget</div><div className="text-xl font-bold">{fmt(csr?.total_budget)}</div></CardContent></Card>
            <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">Total Spent</div><div className="text-xl font-bold">{fmt(csr?.total_spent)}</div></CardContent></Card>
          </div>
          {Array.isArray(csr?.by_client) && csr.by_client.length > 0 && (
            <Card className="mt-3 max-w-xl"><CardContent className="p-0">
              <Table>
                <TableHeader><TableRow><TableHead>CSR Client</TableHead><TableHead>Projects</TableHead><TableHead>Spend</TableHead></TableRow></TableHeader>
                <TableBody>{csr.by_client.map((c: any, i: number) => <TableRow key={i}><TableCell>{c.client_name}</TableCell><TableCell>{c.count}</TableCell><TableCell className="font-semibold">{fmt(c.total)}</TableCell></TableRow>)}</TableBody>
              </Table>
            </CardContent></Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
