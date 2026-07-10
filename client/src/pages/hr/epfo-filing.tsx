import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, Send, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const apiPost = (path: string, body: any) =>
  fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); });

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const CUR_YEAR = new Date().getFullYear();

const PT_SLABS = [
  { range: "0 – 10,000", tax: 0 },
  { range: "10,001 – 15,000", tax: 110 },
  { range: "15,001 – 20,000", tax: 130 },
  { range: "20,001 – 25,000", tax: 150 },
  { range: "25,001+", tax: 200 },
];

const STATUS_COLOR: Record<string, string> = {
  submitted: "bg-green-100 text-green-700",
  pending: "bg-yellow-100 text-yellow-700",
  failed: "bg-red-100 text-red-700",
  Filed: "bg-green-100 text-green-700",
};

export default function EPFOFilingPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [month, setMonth] = useState(String(new Date().getMonth() + 1));
  const [year, setYear] = useState(String(CUR_YEAR));

  const { data: submissions = [], isLoading: loadingSubs } = useQuery<any[]>({
    queryKey: ["epfo-submissions"],
    queryFn: () => fetch("/api/hr/payroll/epfo-submissions").then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); }),
  });

  const epfoSubmit = useMutation({
    mutationFn: () => apiPost("/api/hr/payroll/epfo-submit", { month: Number(month), year: Number(year) }),
    onSuccess: (data: any) => {
      if (data.trrn) {
        toast({ title: `ECR Submitted — TRRN: ${data.trrn}`, description: `${data.member_count} members, ${data.message}` });
        qc.invalidateQueries({ queryKey: ["epfo-submissions"] });
      } else {
        toast({ title: "Error", description: data.message || "Submission failed", variant: "destructive" });
      }
    },
  });

  const esiSubmit = useMutation({
    mutationFn: () => apiPost("/api/hr/payroll/esi-submit", { month: Number(month), year: Number(year) }),
    onSuccess: (data: any) => {
      if (data.challan_no) {
        toast({ title: `ESI Challan — ${data.challan_no}`, description: `Members: ${data.member_count} · Total ESI: ₹${(data.total_esi / 100).toFixed(2)}` });
        qc.invalidateQueries({ queryKey: ["epfo-submissions"] });
      } else {
        toast({ title: "Error", description: data.message || "ESI submission failed", variant: "destructive" });
      }
    },
  });

  const downloadECR = async () => {
    const url = `/api/hr/statutory-filings/ecr-text?month=${month}&year=${year}`;
    const resp = await fetch(url);
    const text = await resp.text();
    const blob = new Blob([text], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `ECR_${MONTHS[Number(month)-1]}_${year}.txt`;
    a.click();
  };

  const lastECR = (submissions as any[]).find((s: any) => s.type === "ECR" || s.filing_type === "ECR");
  const lastESI = (submissions as any[]).find((s: any) => s.type === "ESI" || s.filing_type === "ESI");

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">EPFO / ESI Filing</h1>
          <p className="text-sm text-muted-foreground">Generate ECR, ESI challan and PT returns · Submit to statutory portals</p>
        </div>
        <div className="flex gap-2">
          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>{MONTHS.map((m, i) => <SelectItem key={i} value={String(i+1)}>{m}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
            <SelectContent>{[CUR_YEAR, CUR_YEAR-1, CUR_YEAR-2].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">EPFO Last Filed</p>
            <p className="font-semibold">{lastECR ? `TRRN: ${lastECR.trrn || lastECR.reference_no || "—"}` : "Not filed this period"}</p>
            {lastECR && <Badge className={`mt-1 text-xs ${STATUS_COLOR[lastECR.status] || ""}`}>{lastECR.status}</Badge>}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">ESI Last Filed</p>
            <p className="font-semibold">{lastESI ? `Challan: ${lastESI.challan_no || lastESI.reference_no || "—"}` : "Not filed this period"}</p>
            {lastESI && <Badge className={`mt-1 text-xs ${STATUS_COLOR[lastESI.status] || ""}`}>{lastESI.status}</Badge>}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Filing Period</p>
            <p className="font-semibold">{MONTHS[Number(month)-1]} {year}</p>
            <p className="text-xs text-muted-foreground mt-1">Due: 15th of next month</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="ecr">
        <TabsList>
          <TabsTrigger value="ecr">ECR (EPFO)</TabsTrigger>
          <TabsTrigger value="esi">ESI Challan</TabsTrigger>
          <TabsTrigger value="pt">PT Returns</TabsTrigger>
          <TabsTrigger value="history">Filing History</TabsTrigger>
        </TabsList>

        <TabsContent value="ecr" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                Electronic Challan cum Return (ECR2)
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={downloadECR}><Download className="h-4 w-4 mr-1" />Download ECR</Button>
                  <Button size="sm" onClick={() => epfoSubmit.mutate()} disabled={epfoSubmit.isPending}>
                    {epfoSubmit.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Send className="h-4 w-4 mr-1" />}
                    Submit to EPFO
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {epfoSubmit.data?.ecr_preview && (
                <pre className="bg-muted rounded p-3 text-xs overflow-x-auto mb-4 max-h-48">{epfoSubmit.data.ecr_preview}</pre>
              )}
              <p className="text-sm text-muted-foreground">
                ECR2 format: <code>#~#</code> header with UAN, name, basic, EE PF, EPS per row.
                Clicking "Submit to EPFO" generates the file and records TRRN.
                Use "Download ECR" to save the .txt file for manual upload to Shram Suvidha portal.
              </p>
              <div className="mt-3 p-3 bg-blue-50 rounded text-sm text-blue-800">
                <strong>Shram Suvidha Portal:</strong> Upload the downloaded ECR .txt at{" "}
                <span className="font-mono">https://shramsuvidha.gov.in</span> → Unified Portal → ECR Upload
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="esi" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                ESI Challan (EE: 0.75% · ER: 3.25%)
                <Button size="sm" onClick={() => esiSubmit.mutate()} disabled={esiSubmit.isPending}>
                  {esiSubmit.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Send className="h-4 w-4 mr-1" />}
                  Generate ESI Challan
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {esiSubmit.data?.challan_no && (
                <div className="bg-green-50 border border-green-200 rounded p-3 mb-4">
                  <p className="font-semibold text-green-800">Challan No: {esiSubmit.data.challan_no}</p>
                  <div className="grid grid-cols-3 gap-2 mt-2 text-sm">
                    <div><span className="text-muted-foreground">Members:</span> {esiSubmit.data.member_count}</div>
                    <div><span className="text-muted-foreground">Employee ESI:</span> ₹{((esiSubmit.data.employee_esi||0)/100).toFixed(2)}</div>
                    <div><span className="text-muted-foreground">Employer ESI:</span> ₹{((esiSubmit.data.employer_esi||0)/100).toFixed(2)}</div>
                    <div className="col-span-3 font-semibold text-green-700">Total ESI: ₹{((esiSubmit.data.total_esi||0)/100).toFixed(2)}</div>
                  </div>
                </div>
              )}
              <p className="text-sm text-muted-foreground">
                ESI contributions are computed from gross wages. Employee contribution: 0.75%, Employer: 3.25%.
                Wage ceiling: ₹21,000/month. Challan is generated as CSV for upload to ESIC portal.
              </p>
              <div className="mt-3 p-3 bg-blue-50 rounded text-sm text-blue-800">
                <strong>ESIC Portal:</strong> Upload challan at{" "}
                <span className="font-mono">https://www.esic.in</span> → Employer Login → File Monthly Contribution
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pt" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Professional Tax Slabs (Maharashtra)</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Monthly Salary Range</TableHead>
                    <TableHead>PT Amount (₹/month)</TableHead>
                    <TableHead>Annual PT</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {PT_SLABS.map((s, i) => (
                    <TableRow key={i}>
                      <TableCell>{s.range}</TableCell>
                      <TableCell>{s.tax === 0 ? "Nil" : `₹${s.tax}`}</TableCell>
                      <TableCell>{s.tax === 0 ? "Nil" : `₹${s.tax * 12}`}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <p className="text-sm text-muted-foreground mt-3">
                PT is deducted from employee salary and paid to the State Government. Rate varies by state.
                Configure your state's slabs in HR Masters → PT Configuration.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Filing History</CardTitle></CardHeader>
            <CardContent>
              {loadingSubs ? (
                <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
              ) : (submissions as any[]).length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No filings recorded yet. Submit ECR or ESI challan to see history.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead>Reference / TRRN</TableHead>
                      <TableHead>Members</TableHead>
                      <TableHead>Filed On</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(submissions as any[]).map((f: any, i: number) => (
                      <TableRow key={i}>
                        <TableCell><Badge variant="outline">{f.filing_type || f.type}</Badge></TableCell>
                        <TableCell>{MONTHS[(f.month||1)-1]} {f.year}</TableCell>
                        <TableCell className="font-mono text-xs">{f.trrn || f.challan_no || f.reference_no || "—"}</TableCell>
                        <TableCell>{f.member_count || "—"}</TableCell>
                        <TableCell>{f.filed_on || f.created_at ? new Date(f.filed_on || f.created_at).toLocaleDateString("en-IN") : "—"}</TableCell>
                        <TableCell><Badge className={`text-xs ${STATUS_COLOR[f.status] || "bg-gray-100 text-gray-700"}`}>{f.status}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
