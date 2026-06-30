import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, AlertCircle } from "lucide-react";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then(r => r.json());

const SAMPLE_PROJECTS = [
  { id: 1, name: "Green Valley Phase 1", rera_no: "MAHA/P/2024/001", units: 48, units_sold: 32, completion: "2026-12-31", rera_balance: 4500000 },
  { id: 2, name: "Sunrise Heights", rera_no: "MAHA/P/2024/002", units: 120, units_sold: 87, completion: "2027-06-30", rera_balance: 12000000 },
];

const SAMPLE_COMPLAINTS = [
  { id: 1, complainant: "Rajesh Verma", unit: "A-301", issue: "Delayed possession", date: "2026-05-15", status: "Open" },
  { id: 2, complainant: "Sunita Patel", unit: "B-102", issue: "Construction quality", date: "2026-06-01", status: "Resolved" },
];

export default function RERAPage() {
  const qc = useQueryClient();
  const [reportOpen, setReportOpen] = useState(false);
  const [complaintOpen, setComplaintOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [report, setReport] = useState({ completion_pct: "", funds_utilized: "", units_sold: "" });
  const [complaint, setComplaint] = useState({ complainant: "", unit: "", issue: "" });

  const { data: projects = [] } = useQuery<any[]>({
    queryKey: ["rera-projects"],
    queryFn: () => api("GET", "/api/real-estate/rera/projects").catch(() => []),
  });

  const { data: complaints = [] } = useQuery<any[]>({
    queryKey: ["rera-complaints"],
    queryFn: () => api("GET", "/api/real-estate/rera/complaints").catch(() => []),
  });

  const submitReportMutation = useMutation({
    mutationFn: (payload: any) => api("POST", "/api/real-estate/rera/quarterly-report", payload),
    onSuccess: () => { setReportOpen(false); qc.invalidateQueries({ queryKey: ["rera-projects"] }); },
  });

  const addComplaintMutation = useMutation({
    mutationFn: (payload: any) => api("POST", "/api/real-estate/rera/complaints", payload),
    onSuccess: () => { setComplaintOpen(false); qc.invalidateQueries({ queryKey: ["rera-complaints"] }); },
  });

  const projectRows = projects.length ? projects : SAMPLE_PROJECTS;
  const complaintRows = complaints.length ? complaints : SAMPLE_COMPLAINTS;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Shield className="w-6 h-6" />RERA Compliance</h1>
        <Button onClick={() => setComplaintOpen(true)}><AlertCircle className="w-4 h-4 mr-1" />Log Complaint</Button>
      </div>

      <Tabs defaultValue="projects">
        <TabsList>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="complaints">Complaint Register</TabsTrigger>
        </TabsList>

        <TabsContent value="projects">
          <Card>
            <CardHeader><CardTitle>RERA Registered Projects</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Project</TableHead>
                    <TableHead>RERA No</TableHead>
                    <TableHead>Units</TableHead>
                    <TableHead>Sold</TableHead>
                    <TableHead>Completion</TableHead>
                    <TableHead>RERA A/C Balance</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projectRows.map((p: any) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell className="font-mono text-sm">{p.rera_no}</TableCell>
                      <TableCell>{p.units}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {p.units_sold}
                          <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full" style={{ width: `${(p.units_sold / p.units) * 100}%` }} />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{p.completion}</TableCell>
                      <TableCell>
                        <div className="text-sm">₹{Number(p.rera_balance).toLocaleString()}</div>
                        <div className="text-xs text-muted-foreground">70% fund lock</div>
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline" onClick={() => { setSelectedProject(p); setReportOpen(true); }}>
                          Submit Quarterly Report
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="complaints">
          <Card>
            <CardHeader><CardTitle>RERA Complaint Register</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Complainant</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Issue</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {complaintRows.map((c: any) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.complainant}</TableCell>
                      <TableCell>{c.unit}</TableCell>
                      <TableCell>{c.issue}</TableCell>
                      <TableCell>{c.date}</TableCell>
                      <TableCell>
                        <Badge variant={c.status === "Resolved" ? "outline" : "secondary"}>{c.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Quarterly Report Dialog */}
      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Quarterly Progress Report — {selectedProject?.name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Work Completion (%)</Label><Input type="number" min={0} max={100} value={report.completion_pct} onChange={e => setReport(r => ({ ...r, completion_pct: e.target.value }))} /></div>
            <div><Label>Funds Utilized (₹)</Label><Input type="number" value={report.funds_utilized} onChange={e => setReport(r => ({ ...r, funds_utilized: e.target.value }))} /></div>
            <div><Label>Units Sold (Cumulative)</Label><Input type="number" value={report.units_sold} onChange={e => setReport(r => ({ ...r, units_sold: e.target.value }))} /></div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setReportOpen(false)}>Cancel</Button>
              <Button onClick={() => submitReportMutation.mutate({ project_id: selectedProject?.id, ...report, period: "Q1-2026" })}>
                Submit to RERA
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Complaint Dialog */}
      <Dialog open={complaintOpen} onOpenChange={setComplaintOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Log RERA Complaint</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Complainant Name</Label><Input value={complaint.complainant} onChange={e => setComplaint(c => ({ ...c, complainant: e.target.value }))} /></div>
            <div><Label>Unit No</Label><Input value={complaint.unit} onChange={e => setComplaint(c => ({ ...c, unit: e.target.value }))} /></div>
            <div><Label>Issue Description</Label><Input value={complaint.issue} onChange={e => setComplaint(c => ({ ...c, issue: e.target.value }))} /></div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setComplaintOpen(false)}>Cancel</Button>
              <Button onClick={() => addComplaintMutation.mutate({ ...complaint, date: new Date().toISOString().slice(0, 10), status: "Open" })}>
                Log Complaint
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
