import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Download, RefreshCw } from "lucide-react";
import { useTenantConfig, formatCurrency as fmtCur } from "@/hooks/use-tenant-config";

const get = (p: string) => fetch(p).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); });
const post = (p: string, b: any) => fetch(p, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b) }).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); });
const today = new Date().toISOString().slice(0, 10);
const monthStart = `${today.slice(0, 7)}-01`;

export default function NidhiReportsPage() {
  const fmt = (n: any) => `${sym}${Number(n || 0).toLocaleString("en-IN")}`;
  const { toast } = useToast();
  const tenantConfig = useTenantConfig();
  const sym = tenantConfig.currency_symbol;

  const [matFrom, setMatFrom] = useState(today);
  const [matTo, setMatTo] = useState(new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10));
  const [collFrom, setCollFrom] = useState(monthStart);
  const [collTo, setCollTo] = useState(today);

  const { data: pendingEMIs = [] } = useQuery<any[]>({ queryKey: ["nidhi-rpt-pending"], queryFn: () => get("/api/nidhi/reports/pending-emis") });
  const { data: npaList = [] } = useQuery<any[]>({ queryKey: ["nidhi-rpt-npa"], queryFn: () => get("/api/nidhi/reports/npa-list") });
  const { data: maturity = [] } = useQuery<any[]>({ queryKey: ["nidhi-rpt-maturity", matFrom, matTo], queryFn: () => get(`/api/nidhi/reports/deposit-maturity?from_date=${matFrom}&to_date=${matTo}`) });
  const { data: memberWise = [] } = useQuery<any[]>({ queryKey: ["nidhi-rpt-member"], queryFn: () => get("/api/nidhi/reports/member-wise") });
  const { data: collReport = [] } = useQuery<any[]>({ queryKey: ["nidhi-rpt-coll", collFrom, collTo], queryFn: () => get(`/api/nidhi/reports/daily-collection?from_date=${collFrom}&to_date=${collTo}`) });

  const accrualMut = useMutation({
    mutationFn: () => post("/api/nidhi/interest-accrual/run", {}),
    onSuccess: (d: any) => toast({ title: `Interest accrual done · ${d.journals_posted} GL entries posted` }),
  });

  const exportCSV = (rows: any[], filename: string) => {
    if (!rows.length) return;
    const keys = Object.keys(rows[0]);
    const csv = [keys.join(","), ...rows.map(r => keys.map(k => `"${r[k] ?? ""}"`).join(","))].join("\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); a.download = filename; a.click();
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Reports</h1>
        <Button variant="outline" size="sm" onClick={() => accrualMut.mutate()} disabled={accrualMut.isPending}>
          <RefreshCw className="w-4 h-4 mr-1" />{accrualMut.isPending ? "Running..." : "Run Interest Accrual (GL)"}
        </Button>
      </div>

      <Tabs defaultValue="pending-emis">
        <TabsList className="flex-wrap">
          <TabsTrigger value="pending-emis">Pending EMIs ({pendingEMIs.length})</TabsTrigger>
          <TabsTrigger value="npa">NPA Loans ({npaList.length})</TabsTrigger>
          <TabsTrigger value="maturity">Deposit Maturity</TabsTrigger>
          <TabsTrigger value="member-wise">Member-wise</TabsTrigger>
          <TabsTrigger value="collection">Collection Report</TabsTrigger>
        </TabsList>

        <TabsContent value="pending-emis">
          <div className="flex justify-end mb-2"><Button size="sm" variant="outline" onClick={() => exportCSV(pendingEMIs, "pending-emis.csv")}><Download className="w-3 h-3 mr-1" />CSV</Button></div>
          <Card><CardContent className="p-0">
            <Table><TableHeader><TableRow><TableHead>Loan No.</TableHead><TableHead>Member</TableHead><TableHead>Phone</TableHead><TableHead>EMI Amt</TableHead><TableHead>Outstanding</TableHead><TableHead>Due Date</TableHead><TableHead>Overdue Days</TableHead></TableRow></TableHeader>
              <TableBody>
                {pendingEMIs.map((l: any) => (
                  <TableRow key={l.id} className={Number(l.days_overdue) > 30 ? "bg-red-50" : ""}>
                    <TableCell className="font-mono text-sm">{l.loan_number}</TableCell>
                    <TableCell>{l.member_name}</TableCell>
                    <TableCell>{l.member_phone}</TableCell>
                    <TableCell>{fmt(l.emi_amount)}</TableCell>
                    <TableCell className="font-semibold">{fmt(l.outstanding_principal)}</TableCell>
                    <TableCell>{l.next_emi_date}</TableCell>
                    <TableCell><Badge variant={Number(l.days_overdue) > 0 ? "destructive" : "outline"}>{l.days_overdue > 0 ? `${l.days_overdue} days` : "Today"}</Badge></TableCell>
                  </TableRow>
                ))}
                {!pendingEMIs.length && <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">All EMIs current ✓</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="npa">
          <div className="flex justify-end mb-2"><Button size="sm" variant="outline" onClick={() => exportCSV(npaList, "npa-list.csv")}><Download className="w-3 h-3 mr-1" />CSV</Button></div>
          <Card><CardContent className="p-0">
            <Table><TableHeader><TableRow><TableHead>Loan No.</TableHead><TableHead>Member</TableHead><TableHead>Outstanding</TableHead><TableHead>NPA Date</TableHead><TableHead>Reason</TableHead></TableRow></TableHeader>
              <TableBody>
                {npaList.map((l: any) => (
                  <TableRow key={l.id}>
                    <TableCell className="font-mono text-sm">{l.loan_number}</TableCell>
                    <TableCell>{l.member_name} · {l.member_phone}</TableCell>
                    <TableCell className="font-semibold text-red-600">{fmt(l.outstanding_principal)}</TableCell>
                    <TableCell>{l.npa_date}</TableCell>
                    <TableCell className="text-sm">{l.npa_reason || "—"}</TableCell>
                  </TableRow>
                ))}
                {!npaList.length && <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No NPA loans ✓</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="maturity">
          <div className="flex gap-3 items-end mb-3">
            <div><Label className="text-xs">From</Label><Input type="date" value={matFrom} onChange={e => setMatFrom(e.target.value)} className="h-8 text-sm w-36" /></div>
            <div><Label className="text-xs">To</Label><Input type="date" value={matTo} onChange={e => setMatTo(e.target.value)} className="h-8 text-sm w-36" /></div>
            <Button size="sm" variant="outline" onClick={() => exportCSV(maturity, "deposit-maturity.csv")}><Download className="w-3 h-3 mr-1" />CSV</Button>
          </div>
          <Card><CardContent className="p-0">
            <Table><TableHeader><TableRow><TableHead>Account</TableHead><TableHead>Member</TableHead><TableHead>Type</TableHead><TableHead>Principal</TableHead><TableHead>Maturity Amt</TableHead><TableHead>Maturity Date</TableHead></TableRow></TableHeader>
              <TableBody>
                {maturity.map((d: any) => <TableRow key={d.id}><TableCell className="font-mono">{d.account_number}</TableCell><TableCell>{d.member_name}</TableCell><TableCell className="uppercase text-xs">{d.deposit_type}</TableCell><TableCell>{fmt(d.principal_amount)}</TableCell><TableCell className="font-semibold">{fmt(d.maturity_amount)}</TableCell><TableCell className="font-semibold text-amber-600">{d.maturity_date}</TableCell></TableRow>)}
                {!maturity.length && <TableRow><TableCell colSpan={6} className="text-center py-6 text-muted-foreground">No deposits maturing in range</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="member-wise">
          <div className="flex justify-end mb-2"><Button size="sm" variant="outline" onClick={() => exportCSV(memberWise, "member-wise.csv")}><Download className="w-3 h-3 mr-1" />CSV</Button></div>
          <Card><CardContent className="p-0">
            <Table><TableHeader><TableRow><TableHead>Member No.</TableHead><TableHead>Name</TableHead><TableHead>Shares</TableHead><TableHead>Deposits</TableHead><TableHead>Deposit Bal.</TableHead><TableHead>Loans</TableHead><TableHead>Outstanding</TableHead></TableRow></TableHeader>
              <TableBody>
                {memberWise.slice(0, 100).map((m: any) => <TableRow key={m.id}><TableCell className="font-mono text-sm">{m.member_number}</TableCell><TableCell>{m.name}</TableCell><TableCell>{m.shares_held}</TableCell><TableCell>{m.deposit_count}</TableCell><TableCell>{fmt(m.total_deposits)}</TableCell><TableCell>{m.loan_count}</TableCell><TableCell>{fmt(m.total_outstanding)}</TableCell></TableRow>)}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="collection">
          <div className="flex gap-3 items-end mb-3">
            <div><Label className="text-xs">From</Label><Input type="date" value={collFrom} onChange={e => setCollFrom(e.target.value)} className="h-8 text-sm w-36" /></div>
            <div><Label className="text-xs">To</Label><Input type="date" value={collTo} onChange={e => setCollTo(e.target.value)} className="h-8 text-sm w-36" /></div>
            <Button size="sm" variant="outline" onClick={() => exportCSV(collReport, "collection-report.csv")}><Download className="w-3 h-3 mr-1" />CSV</Button>
          </div>
          <div className="mb-2 font-semibold text-sm">Total: {fmt(collReport.reduce((s: number, c: any) => s + Number(c.amount || 0), 0))}</div>
          <Card><CardContent className="p-0">
            <Table><TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Agent</TableHead><TableHead>Member</TableHead><TableHead>Type</TableHead><TableHead>Amount</TableHead><TableHead>Mode</TableHead></TableRow></TableHeader>
              <TableBody>
                {collReport.slice(0, 100).map((c: any) => <TableRow key={c.id}><TableCell>{c.collection_date}</TableCell><TableCell>{c.agent_name || "—"}</TableCell><TableCell>{c.member_name || `#${c.member_id}`}</TableCell><TableCell className="text-xs uppercase">{c.collection_type}</TableCell><TableCell className="font-semibold">{fmt(c.amount)}</TableCell><TableCell className="text-xs uppercase">{c.payment_mode}</TableCell></TableRow>)}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
