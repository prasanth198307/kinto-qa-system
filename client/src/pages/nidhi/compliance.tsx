import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, AlertTriangle, Shield } from "lucide-react";

const get = (p: string) => fetch(p).then(r => r.json());

const fmt = (n: any) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
const FY = new Date().getFullYear();

export default function NidhiCompliancePage() {
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: nof } = useQuery<any>({ queryKey: ["nidhi-nof"], queryFn: () => get("/api/nidhi/compliance/nof-ratio") });
  const { data: unenc } = useQuery<any>({ queryKey: ["nidhi-unenc"], queryFn: () => get("/api/nidhi/compliance/unencumbered-check") });
  const { data: reports = [] } = useQuery<any[]>({ queryKey: ["nidhi-compliance-reports"], queryFn: () => get("/api/nidhi/compliance/reports") });

  const ndh1Mut = useMutation({
    mutationFn: () => fetch("/api/nidhi/compliance/ndh1", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ financial_year: `${FY}-${FY+1}`, period_from: `${FY}-04-01`, period_to: `${FY+1}-03-31` }) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["nidhi-compliance-reports"] }); toast({ title: "NDH-1 generated" }); },
  });

  const downloadNDH = (type: string, year: number) => window.open(`/api/nidhi/rbi-returns/${type.toLowerCase()}/${year}?format=xml`, "_blank");

  const CHECKLIST = [
    { label: "NDH-1 Annual Return", due: `30 Sep ${FY}`, done: reports.some(r => r.report_type === "NDH-1") },
    { label: "NDH-2 Half-Yearly (Apr–Sep)", due: `30 Oct ${FY}`, done: false },
    { label: "NDH-2 Half-Yearly (Oct–Mar)", due: `30 Apr ${FY+1}`, done: false },
    { label: "NOF Ratio ≤ 20x", due: "Ongoing", done: nof?.isCompliant },
    { label: "Unencumbered deposits ≥ 10%", due: "Ongoing", done: unenc?.isCompliant },
  ];

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-3">
        <Shield className="w-6 h-6 text-blue-600" />
        <h1 className="text-2xl font-bold">Compliance (NDH)</h1>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card className={nof?.isCompliant ? "border-green-300" : "border-red-300"}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              {nof?.isCompliant ? <CheckCircle className="w-5 h-5 text-green-600" /> : <AlertTriangle className="w-5 h-5 text-red-600" />}
              <span className="font-semibold">Net Owned Funds Ratio</span>
            </div>
            <div className="text-3xl font-bold">{nof?.ratio ?? "—"}x</div>
            <div className="text-sm text-muted-foreground mt-1">Maximum allowed: 20x</div>
            <div className="text-xs mt-2">NOF: {fmt(nof?.netOwnedFunds)} · Deposits: {fmt(nof?.totalDeposits)}</div>
            <Badge className="mt-2" variant={nof?.isCompliant ? "default" : "destructive"}>{nof?.isCompliant ? "Compliant" : "BREACH"}</Badge>
          </CardContent>
        </Card>

        <Card className={unenc?.isCompliant ? "border-green-300" : "border-amber-300"}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              {unenc?.isCompliant ? <CheckCircle className="w-5 h-5 text-green-600" /> : <AlertTriangle className="w-5 h-5 text-amber-600" />}
              <span className="font-semibold">Unencumbered Deposits</span>
            </div>
            <div className="text-3xl font-bold">{unenc?.percentage ?? "—"}%</div>
            <div className="text-sm text-muted-foreground mt-1">Minimum required: 10%</div>
            <div className="text-xs mt-2">Term deposits: {fmt(unenc?.termDeposits)} / {fmt(unenc?.totalDeposits)}</div>
            <Badge className="mt-2" variant={unenc?.isCompliant ? "default" : "secondary"}>{unenc?.isCompliant ? "Compliant" : "Review Needed"}</Badge>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="checklist">
        <TabsList><TabsTrigger value="checklist">Checklist</TabsTrigger><TabsTrigger value="ndh-returns">NDH Returns</TabsTrigger><TabsTrigger value="history">History</TabsTrigger></TabsList>

        <TabsContent value="checklist">
          <Card><CardContent className="p-4 space-y-3">
            {CHECKLIST.map((item, i) => (
              <div key={i} className="flex items-center justify-between p-3 border rounded">
                <div className="flex items-center gap-3">
                  {item.done ? <CheckCircle className="w-5 h-5 text-green-600" /> : <AlertTriangle className="w-5 h-5 text-amber-500" />}
                  <div>
                    <div className="font-medium text-sm">{item.label}</div>
                    <div className="text-xs text-muted-foreground">Due: {item.due}</div>
                  </div>
                </div>
                <Badge variant={item.done ? "default" : "secondary"}>{item.done ? "✓ Done" : "Pending"}</Badge>
              </div>
            ))}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="ndh-returns">
          <Card><CardHeader><CardTitle className="text-base">Generate & Download RBI Returns</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-3 border rounded">
                <div><div className="font-medium">NDH-1 Annual Return</div><div className="text-xs text-muted-foreground">Annual · FY {FY}-{FY+1}</div></div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => ndh1Mut.mutate()} disabled={ndh1Mut.isPending}>Generate</Button>
                  <Button size="sm" onClick={() => downloadNDH("ndh1", FY)}>Download XML</Button>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 border rounded">
                <div><div className="font-medium">NDH-2 Half-Yearly Return (Deposits)</div><div className="text-xs text-muted-foreground">Half-yearly · {FY}</div></div>
                <Button size="sm" onClick={() => downloadNDH("ndh2", FY)}>Download XML</Button>
              </div>
              <div className="flex items-center justify-between p-3 border rounded">
                <div><div className="font-medium">NDH-3 Half-Yearly Return (Loans)</div><div className="text-xs text-muted-foreground">Half-yearly · {FY}</div></div>
                <Button size="sm" onClick={() => downloadNDH("ndh3", FY)}>Download XML</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>Type</TableHead><TableHead>Period</TableHead><TableHead>Generated</TableHead><TableHead>By</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
              <TableBody>
                {reports.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell><Badge variant="outline">{r.report_type}</Badge></TableCell>
                    <TableCell className="text-sm">{r.financial_year || `${r.period_from} – ${r.period_to}`}</TableCell>
                    <TableCell className="text-sm">{String(r.generated_at).slice(0,10)}</TableCell>
                    <TableCell>{r.generated_by}</TableCell>
                    <TableCell><Badge variant={r.is_compliant ? "default" : "destructive"}>{r.is_compliant ? "Compliant" : "Breach"}</Badge></TableCell>
                  </TableRow>
                ))}
                {!reports.length && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">No reports generated yet</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
