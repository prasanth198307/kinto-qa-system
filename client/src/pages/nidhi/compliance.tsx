import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle, XCircle, FileText } from "lucide-react";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then((r) => r.json());

export default function CompliancePage() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ report_type: "NDH-1", financial_year: "", period_from: "", period_to: "" });
  const qc = useQueryClient();

  const { data: nof } = useQuery({
    queryKey: ["nidhi-nof-ratio"],
    queryFn: () => api("GET", "/api/nidhi-company/compliance/nof-ratio"),
  });

  const { data: reports = [] } = useQuery({
    queryKey: ["nidhi-compliance-reports"],
    queryFn: () => api("GET", "/api/nidhi-company/compliance"),
  });

  const generateMutation = useMutation({
    mutationFn: (payload: any) => api("POST", "/api/nidhi-company/compliance/generate-report", payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["nidhi-compliance-reports"] }); setOpen(false); },
  });

  const ratio = nof?.ratio ?? 0;
  const compliant = ratio <= 20;

  const checks = [
    { label: "Minimum 200 members", ok: (nof?.member_count ?? 0) >= 200 },
    { label: "Net Owned Funds ≥ ₹10 lakhs", ok: (nof?.net_owned_funds ?? 0) >= 1000000 },
    { label: "Deposit to NOF ratio ≤ 20x", ok: compliant },
    { label: "Unencumbered term deposits ≥ 10% of outstanding deposits", ok: (nof?.term_deposit_ratio ?? 0) >= 10 },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">NDH Compliance</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><FileText className="w-4 h-4 mr-1" />Generate NDH Report</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Generate NDH Report</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Report Type</Label>
                <Select value={form.report_type} onValueChange={(v) => setForm({ ...form, report_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="NDH-1">NDH-1</SelectItem><SelectItem value="NDH-3">NDH-3</SelectItem></SelectContent>
                </Select>
              </div>
              <div><Label>Financial Year (e.g. 2024-25)</Label><Input value={form.financial_year} onChange={(e) => setForm({ ...form, financial_year: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Period From</Label><Input type="date" value={form.period_from} onChange={(e) => setForm({ ...form, period_from: e.target.value })} /></div>
                <div><Label>Period To</Label><Input type="date" value={form.period_to} onChange={(e) => setForm({ ...form, period_to: e.target.value })} /></div>
              </div>
              <Button className="w-full" onClick={() => generateMutation.mutate(form)} disabled={generateMutation.isPending}>
                {generateMutation.isPending ? "Generating..." : "Generate"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center justify-between">
              NOF Ratio
              <Badge variant={compliant ? "default" : "destructive"}>{compliant ? "Compliant" : "Non-Compliant"}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <div className="flex justify-between"><span>Net Owned Funds</span><span className="font-semibold">₹{Number(nof?.net_owned_funds ?? 0).toLocaleString("en-IN")}</span></div>
            <div className="flex justify-between"><span>Total Deposits</span><span className="font-semibold">₹{Number(nof?.total_deposits ?? 0).toLocaleString("en-IN")}</span></div>
            <div className="flex justify-between"><span>Ratio</span><span className="font-semibold">{ratio.toFixed(2)}x</span></div>
            <div className="flex justify-between"><span>Headroom</span><span className="font-semibold">₹{Number(nof?.headroom ?? 0).toLocaleString("en-IN")}</span></div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Compliance Checklist</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {checks.map((c, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                {c.ok ? <CheckCircle className="w-4 h-4 text-green-500 shrink-0" /> : <XCircle className="w-4 h-4 text-red-500 shrink-0" />}
                <span>{c.label}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="font-semibold mb-2">Report History</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Report Type</TableHead>
              <TableHead>Financial Year</TableHead>
              <TableHead>Period</TableHead>
              <TableHead>Generated At</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reports.map((r: any, i: number) => (
              <TableRow key={i}>
                <TableCell>{r.report_type}</TableCell>
                <TableCell>{r.financial_year}</TableCell>
                <TableCell>{r.period_from} – {r.period_to}</TableCell>
                <TableCell>{r.generated_at}</TableCell>
                <TableCell><Badge variant="outline">{r.status}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
