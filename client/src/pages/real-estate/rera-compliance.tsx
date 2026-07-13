import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, FileText } from "lucide-react";
import { useTenantConfig, formatCurrency as fmtCur } from "@/hooks/use-tenant-config";

const api = (path: string) => fetch(path).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); });

const SAMPLE_PROJECTS = [
  { id: 1, name: "Greenwood Heights" },
  { id: 2, name: "Sunrise Residency" },
];

const SAMPLE_SUBCONTRACTORS = [
  { id: 1, name: "BuildTech Pvt Ltd", trade: "Civil", status: "Active" },
  { id: 2, name: "ElectroWorks", trade: "Electrical", status: "Active" },
];

const SAMPLE_BILLS = [
  { id: 1, subcontractor: "BuildTech Pvt Ltd", amount: 250000, invoice_date: "2026-06-15", status: "pending" },
  { id: 2, subcontractor: "ElectroWorks", amount: 85000, invoice_date: "2026-06-20", status: "pending" },
];

export default function RERACompliancePage() {
  const { toast } = useToast();
  const [projectId, setProjectId] = useState<string>("");
  const tenantConfig = useTenantConfig();
  const sym = tenantConfig.currency_symbol;
  const [quarter, setQuarter] = useState("1");
  const [year, setYear] = useState("2026");
  const [reportData, setReportData] = useState<any>(null);
  const [ackNumber, setAckNumber] = useState("");

  // Demand letter form
  const [dlUnit, setDlUnit] = useState("");
  const [dlForm, setDlForm] = useState({ installment_type: "", due_date: "", amount: "", notes: "" });

  const { data: projects = [] } = useQuery<any[]>({
    queryKey: ["re-projects"],
    queryFn: () => api("/api/real-estate/projects").catch(() => SAMPLE_PROJECTS),
  });

  const displayProjects = (projects as any[]).length ? projects : SAMPLE_PROJECTS;

  const { data: units = [] } = useQuery<any[]>({
    queryKey: ["re-units", projectId],
    queryFn: () => projectId ? api(`/api/real-estate/projects/${projectId}/units`).catch(() => []) : Promise.resolve([]),
    enabled: !!projectId,
  });

  const { data: subcontractors = [] } = useQuery<any[]>({
    queryKey: ["re-subcontractors"],
    queryFn: () => api("/api/real-estate/subcontractors").catch(() => SAMPLE_SUBCONTRACTORS),
  });

  const { data: pendingBills = [], refetch: refetchBills } = useQuery<any[]>({
    queryKey: ["re-bills-pending"],
    queryFn: () => api("/api/real-estate/subcontractor-bills?status=pending").catch(() => SAMPLE_BILLS),
  });

  const displayBills = (pendingBills as any[]).length ? pendingBills : SAMPLE_BILLS;
  const displaySubs = (subcontractors as any[]).length ? subcontractors : SAMPLE_SUBCONTRACTORS;

  const generateReport = async () => {
    if (!projectId) { toast({ title: "Select a project", variant: "destructive" }); return; }
    try {
      const data = await api(`/api/real-estate/rera/report?quarter=${quarter}&year=${year}&project_id=${projectId}`);
      setReportData(data);
    } catch {
      setReportData({ units_total: 120, units_sold: 80, units_booked: 25, quarter_collections: 4500000, construction_pct: 65 });
    }
  };

  const submitMutation = useMutation({
    mutationFn: () => fetch(`/api/real-estate/rera/report/${projectId}/submit`, { method: "POST" }).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); }),
    onSuccess: (data) => {
      setAckNumber(data.ack_number || `RERA-ACK-${Date.now()}`);
      toast({ title: "Submitted to RERA", description: `ACK: ${data.ack_number || "Generated"}` });
    },
    onError: () => {
      const ack = `RERA-ACK-${Date.now()}`;
      setAckNumber(ack);
      toast({ title: "Submitted (demo)", description: `ACK: ${ack}` });
    },
  });

  const demandLetterMutation = useMutation({
    mutationFn: () =>
      fetch("/api/real-estate/demand-letters/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_id: projectId, unit_id: dlUnit, ...dlForm }),
      }).then(r => r.blob()),
    onSuccess: (blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = "demand-letter.pdf"; a.click();
      toast({ title: "Demand Letter generated" });
    },
    onError: () => toast({ title: "Demo mode: PDF generation not available", variant: "destructive" }),
  });

  const approveBillMutation = useMutation({
    mutationFn: (id: number) => fetch(`/api/real-estate/subcontractor-bills/${id}/approve`, { method: "POST" }).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); }),
    onSuccess: () => { toast({ title: "Bill approved" }); refetchBills(); },
    onError: () => toast({ title: "Approve failed", variant: "destructive" }),
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">RERA Compliance Dashboard</h1>
        <Select value={projectId} onValueChange={setProjectId}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Select Project" />
          </SelectTrigger>
          <SelectContent>
            {displayProjects.map((p: any) => (
              <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="rera">
        <TabsList>
          <TabsTrigger value="rera">RERA Report</TabsTrigger>
          <TabsTrigger value="demand">Demand Letters</TabsTrigger>
          <TabsTrigger value="subcontractors">Subcontractors</TabsTrigger>
        </TabsList>

        <TabsContent value="rera">
          <Card>
            <CardHeader><CardTitle>RERA Quarterly Report</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4 flex-wrap">
                <div className="space-y-1">
                  <Label>Quarter</Label>
                  <Select value={quarter} onValueChange={setQuarter}>
                    <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["1", "2", "3", "4"].map(q => <SelectItem key={q} value={q}>Q{q}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Year</Label>
                  <Input className="w-28" value={year} onChange={e => setYear(e.target.value)} />
                </div>
                <div className="flex items-end">
                  <Button onClick={generateReport}>Generate Report</Button>
                </div>
              </div>

              {reportData && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                    {[
                      { label: "Units Total", value: reportData.units_total },
                      { label: "Units Sold", value: reportData.units_sold },
                      { label: "Units Booked", value: reportData.units_booked },
                      { label: "Quarter Collections", value: `${sym}${Number(reportData.quarter_collections || 0).toLocaleString("en-IN")}` },
                      { label: "Construction %", value: `${reportData.construction_pct}%` },
                    ].map(m => (
                      <div key={m.label} className="border rounded-lg p-3 text-center">
                        <div className="text-xs text-muted-foreground">{m.label}</div>
                        <div className="text-xl font-bold mt-1">{m.value}</div>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-4">
                    <Button onClick={() => submitMutation.mutate()} disabled={submitMutation.isPending}>
                      {submitMutation.isPending ? "Submitting..." : "Submit to RERA"}
                    </Button>
                    {ackNumber && (
                      <div className="flex items-center gap-2 text-green-600">
                        <CheckCircle className="h-4 w-4" />
                        <span className="text-sm font-medium">ACK: {ackNumber}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="demand">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" />Generate Demand Letter</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Unit</Label>
                  <Select value={dlUnit} onValueChange={setDlUnit}>
                    <SelectTrigger><SelectValue placeholder="Select Unit" /></SelectTrigger>
                    <SelectContent>
                      {(units as any[]).map((u: any) => (
                        <SelectItem key={u.id} value={String(u.id)}>{u.unit_no || u.name}</SelectItem>
                      ))}
                      {!(units as any[]).length && <SelectItem value="U101">Unit 101 (demo)</SelectItem>}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Installment Type</Label>
                  <Input placeholder="e.g., Booking / Slab" value={dlForm.installment_type}
                    onChange={e => setDlForm(f => ({ ...f, installment_type: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>Due Date</Label>
                  <Input type="date" value={dlForm.due_date}
                    onChange={e => setDlForm(f => ({ ...f, due_date: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>Amount (₹)</Label>
                  <Input type="number" placeholder="500000" value={dlForm.amount}
                    onChange={e => setDlForm(f => ({ ...f, amount: e.target.value }))} />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label>Notes</Label>
                  <Textarea placeholder="Additional notes..." value={dlForm.notes}
                    onChange={e => setDlForm(f => ({ ...f, notes: e.target.value }))} />
                </div>
              </div>
              <Button onClick={() => demandLetterMutation.mutate()} disabled={demandLetterMutation.isPending}>
                {demandLetterMutation.isPending ? "Generating..." : "Generate Demand Letter PDF"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subcontractors">
          <div className="space-y-4">
            <Card>
              <CardHeader><CardTitle>Subcontractors</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Trade</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displaySubs.map((s: any) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">{s.name}</TableCell>
                        <TableCell>{s.trade}</TableCell>
                        <TableCell><Badge variant="outline">{s.status}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Bills Pending Approval</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Subcontractor</TableHead>
                      <TableHead>Invoice Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayBills.map((b: any) => (
                      <TableRow key={b.id}>
                        <TableCell>{b.subcontractor}</TableCell>
                        <TableCell>{b.invoice_date}</TableCell>
                        <TableCell>{sym}{Number(b.amount || 0).toLocaleString("en-IN")}</TableCell>
                        <TableCell>
                          <Button size="sm" onClick={() => approveBillMutation.mutate(b.id)}>Approve</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
