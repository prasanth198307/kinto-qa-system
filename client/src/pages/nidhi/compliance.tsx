import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";

const api = (m: string, u: string, b?: any) =>
  fetch(u, { method: m, headers: { "Content-Type": "application/json" }, body: b ? JSON.stringify(b) : undefined, credentials: "include" }).then(r => r.json());
const fmt = (n: any) => Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

export default function NidhiCompliancePage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [filingForm, setFilingForm] = useState({ filing_name: "", filing_date: "", reference_no: "", period: "" });

  const { data: compliance = [] } = useQuery({ queryKey: ["/api/nidhi/compliance"], queryFn: () => api("GET", "/api/nidhi/compliance") });

  const fileMutation = useMutation({
    mutationFn: (data: any) => api("POST", "/api/nidhi/compliance/filings", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/nidhi/compliance"] }); toast({ title: "Filing marked" }); setFilingForm({ filing_name: "", filing_date: "", reference_no: "", period: "" }); },
    onError: () => toast({ title: "Error", variant: "destructive" }),
  });

  const ratios = compliance[0]?.ratios || {};
  const filings = compliance[0]?.filings || compliance;

  const statusColor: Record<string,string> = { filed: "default", due: "secondary", overdue: "destructive", pending: "outline" };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Compliance (NDH)</h1>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-sm">Net Owned Funds</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">₹{fmt(ratios.net_owned_funds)}</div><div className="text-xs text-muted-foreground">Min required: ₹10,00,000</div></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Unencumbered Deposits Ratio</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{ratios.unencumbered_deposits_ratio ?? "--"}%</div><div className="text-xs text-muted-foreground">Min: 10%</div></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">CR Ratio</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{ratios.cr_ratio ?? "--"}%</div><div className="text-xs text-muted-foreground">Min: 15%</div></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Mark Filing</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm">Filing Name</label>
              <select className="w-full border rounded p-2 text-sm" value={filingForm.filing_name} onChange={e => setFilingForm(p => ({...p, filing_name: e.target.value}))}>
                <option value="">Select filing</option>
                {["NDH-1","NDH-2","NDH-3","NDH-4"].map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            {["period","filing_date","reference_no"].map(k => (
              <div key={k}>
                <label className="text-sm capitalize">{k.replace(/_/g," ")}</label>
                <Input type={k.includes("date") ? "date" : "text"} value={(filingForm as any)[k]} onChange={e => setFilingForm(p => ({...p,[k]:e.target.value}))} />
              </div>
            ))}
          </div>
          <Button className="mt-3" onClick={() => fileMutation.mutate(filingForm)}>Mark Filed</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Compliance Calendar</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Filing</TableHead><TableHead>Period</TableHead><TableHead>Due Date</TableHead>
                <TableHead>Filed Date</TableHead><TableHead>Reference No</TableHead><TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(Array.isArray(filings) ? filings : []).map((f: any) => (
                <TableRow key={f.id}>
                  <TableCell className="font-medium">{f.filing_name}</TableCell>
                  <TableCell>{f.period}</TableCell>
                  <TableCell>{f.due_date}</TableCell>
                  <TableCell>{f.filed_date}</TableCell>
                  <TableCell>{f.reference_no}</TableCell>
                  <TableCell><Badge variant={(statusColor[f.status] as any) || "secondary"}>{f.status}</Badge></TableCell>
                </TableRow>
              ))}
              {(!Array.isArray(filings) || filings.length === 0) && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No compliance records</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
