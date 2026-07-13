import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Receipt, Download, FileText } from "lucide-react";
import { useTenantConfig, formatCurrency as fmtCur } from "@/hooks/use-tenant-config";

const api = (m: string, p: string, b?: any) =>
  fetch(p, { method: m, headers: { "Content-Type": "application/json" }, body: b ? JSON.stringify(b) : undefined }).then((r) => r.json());
const fmt = (n: any) => `${sym}${Number(n || 0).toLocaleString("en-IN")}`;
const FY = new Date().getMonth() >= 3 ? new Date().getFullYear() : new Date().getFullYear() - 1;

export default function NGO80GPage() {
  const qc = useQueryClient();
  const tenantConfig = useTenantConfig();
  const sym = tenantConfig.currency_symbol;
  const { toast } = useToast();
  const [fy, setFy] = useState(`${FY}-${String(FY + 1).slice(2)}`);

  const { data: receipts = [] } = useQuery<any[]>({ queryKey: ["ngo-80g-receipts"], queryFn: () => api("GET", "/api/ngo/receipts-80g") });
  const { data: donations = [] } = useQuery<any[]>({ queryKey: ["ngo-donations"], queryFn: () => api("GET", "/api/ngo/donations") });
  const { data: form10bd = [] } = useQuery<any[]>({ queryKey: ["ngo-10bd", fy], queryFn: () => api("GET", `/api/ngo/form-10bd/data?financial_year=${fy}`) });

  const genMut = useMutation({
    mutationFn: (donation_id: any) => api("POST", "/api/ngo/receipts/80g/generate", { donation_id }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["ngo-80g-receipts"] }); toast({ title: "80G receipt generated" }); },
  });
  const gen10beMut = useMutation({
    mutationFn: () => api("POST", "/api/ngo/form-10be/generate", { financial_year: fy }),
    onSuccess: (d: any) => toast({ title: `Form 10BE generated for ${d.count ?? "all"} donors` }),
  });

  const uncovered = donations.filter((d: any) => d.is_80g_eligible && !receipts.some((r: any) => r.donation_id === d.id));

  const exportCSV = (rows: any[], filename: string) => {
    if (!rows.length) return;
    const keys = Object.keys(rows[0]);
    const csv = [keys.join(","), ...rows.map(r => keys.map(k => `"${r[k] ?? ""}"`).join(","))].join("\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); a.download = filename; a.click();
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-2"><Receipt className="w-6 h-6 text-green-600" /><h1 className="text-2xl font-bold">80G Receipts</h1></div>

      <Tabs defaultValue="receipts">
        <TabsList>
          <TabsTrigger value="receipts">Issued ({receipts.length})</TabsTrigger>
          <TabsTrigger value="pending">Pending ({uncovered.length})</TabsTrigger>
          <TabsTrigger value="10bd">Form 10BD / 10BE</TabsTrigger>
        </TabsList>

        <TabsContent value="receipts">
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>Receipt No.</TableHead><TableHead>Donor</TableHead><TableHead>PAN</TableHead><TableHead>Amount</TableHead><TableHead>Issue Date</TableHead><TableHead></TableHead></TableRow></TableHeader>
              <TableBody>
                {receipts.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-sm">{r.receipt_number}</TableCell>
                    <TableCell>{r.donor_name}</TableCell>
                    <TableCell className="font-mono text-sm">{r.pan_number || "—"}</TableCell>
                    <TableCell className="font-semibold">{fmt(r.amount)}</TableCell>
                    <TableCell className="text-sm">{r.issue_date ? String(r.issue_date).slice(0, 10) : "—"}</TableCell>
                    <TableCell>
                      {r.donation_id && <Button size="sm" variant="ghost" onClick={() => window.open(`/api/ngo/donations/${r.donation_id}/certificate-pdf`, "_blank")}><Download className="w-3 h-3 mr-1" />PDF</Button>}
                    </TableCell>
                  </TableRow>
                ))}
                {!receipts.length && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No 80G receipts issued yet</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="pending">
          <p className="text-sm text-muted-foreground mb-2">80G-eligible donations without a receipt. Generate individually here or in bulk via the 80G Bulk Certificates page.</p>
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>Donation No.</TableHead><TableHead>Donor</TableHead><TableHead>Amount</TableHead><TableHead>Date</TableHead><TableHead></TableHead></TableRow></TableHeader>
              <TableBody>
                {uncovered.map((d: any) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-mono text-sm">{d.donation_number}</TableCell>
                    <TableCell>{d.donor_name}</TableCell>
                    <TableCell className="font-semibold">{fmt(d.amount)}</TableCell>
                    <TableCell className="text-sm">{d.donation_date ? String(d.donation_date).slice(0, 10) : "—"}</TableCell>
                    <TableCell><Button size="sm" variant="outline" onClick={() => genMut.mutate(d.id)} disabled={genMut.isPending}>Generate 80G</Button></TableCell>
                  </TableRow>
                ))}
                {!uncovered.length && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">All eligible donations have receipts ✓</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="10bd">
          <div className="flex gap-3 items-end mb-3">
            <div><Label className="text-xs">Financial Year</Label><Input value={fy} onChange={e => setFy(e.target.value)} className="h-8 w-32" placeholder="2026-27" /></div>
            <Button size="sm" variant="outline" onClick={() => exportCSV(form10bd, `form-10bd-${fy}.csv`)}><Download className="w-3 h-3 mr-1" />Export 10BD CSV</Button>
            <Button size="sm" onClick={() => gen10beMut.mutate()} disabled={gen10beMut.isPending}><FileText className="w-3 h-3 mr-1" />Generate 10BE Certificates</Button>
          </div>
          <p className="text-xs text-muted-foreground mb-2">Form 10BD is the annual donation statement filed with the Income Tax Dept; 10BE is the donor-facing certificate.</p>
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>Donor</TableHead><TableHead>PAN</TableHead><TableHead>Address</TableHead><TableHead>Mode</TableHead><TableHead>Total</TableHead></TableRow></TableHeader>
              <TableBody>
                {(Array.isArray(form10bd) ? form10bd : []).map((r: any, i: number) => (
                  <TableRow key={i}>
                    <TableCell>{r.donor_name || r.name}</TableCell>
                    <TableCell className="font-mono text-sm">{r.pan_number || "—"}</TableCell>
                    <TableCell className="text-sm truncate max-w-40">{r.address || "—"}</TableCell>
                    <TableCell className="text-sm uppercase">{r.payment_mode || "—"}</TableCell>
                    <TableCell className="font-semibold">{fmt(r.total_amount || r.amount)}</TableCell>
                  </TableRow>
                ))}
                {!(Array.isArray(form10bd) && form10bd.length) && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No 10BD data for {fy}</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
