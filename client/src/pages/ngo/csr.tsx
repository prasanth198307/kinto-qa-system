import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Plus, FileText, CheckSquare, Target } from "lucide-react";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined, credentials: "include" }).then(r => r.json());

const fmt = (n: any) => Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

const S135_CHECKLIST = [
  { id: 1, item: "CSR Committee formed (3+ directors, ≥1 independent)", done: true },
  { id: 2, item: "CSR Policy formulated and approved by Board", done: true },
  { id: 3, item: "CSR Policy published on company website", done: true },
  { id: 4, item: "Annual action plan approved for current FY", done: true },
  { id: 5, item: "2% of average net profit allocated for CSR", done: true },
  { id: 6, item: "Implementing agency registered with MCA", done: false },
  { id: 7, item: "Impact assessment conducted (if ≥10 Cr CSR obligation)", done: false },
  { id: 8, item: "CSR Report included in Annual Report", done: false },
  { id: 9, item: "Unspent CSR amount transferred to Unspent CSR Account", done: true },
  { id: 10, item: "Form CSR-2 filed with ROC", done: false },
];

const BLANK_PROJECT = { project_name: "", company_donor: "", sanctioned: "", received: "", utilized: "", beneficiaries: "", outcomes: "" };

const MOCK_PROJECTS = [
  { id: 1, project: "Digital Literacy Program", company: "TechCorp India", sanctioned: 2000000, received: 1500000, utilized: 1200000, beneficiaries: 500, outcomes: "500 students trained in digital skills", milestones: [{ title: "Lab Setup", done: true }, { title: "Training Round 1", done: true }, { title: "Training Round 2", done: false }] },
  { id: 2, project: "Rural Water Supply", company: "AquaBuilds Ltd", sanctioned: 5000000, received: 5000000, utilized: 4800000, beneficiaries: 2000, outcomes: "2000 villagers with clean water access", milestones: [{ title: "Borewell Drilling", done: true }, { title: "Pipeline Installation", done: true }, { title: "Handover", done: false }] },
  { id: 3, project: "Women SHG Support", company: "Retail Galaxy", sanctioned: 1500000, received: 750000, utilized: 300000, beneficiaries: 150, outcomes: "150 women in self-help groups", milestones: [{ title: "SHG Formation", done: true }, { title: "Skills Training", done: false }, { title: "Loan Distribution", done: false }] },
];

export default function CSRPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [projects, setProjects] = useState(MOCK_PROJECTS);
  const [checklist, setChecklist] = useState(S135_CHECKLIST);
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState({ ...BLANK_PROJECT });
  const [selectedProject, setSelectedProject] = useState<typeof MOCK_PROJECTS[0] | null>(null);
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const { data: serverData } = useQuery({
    queryKey: ["csr-projects"],
    queryFn: () => api("GET", "/api/ngo/csr-projects"),
  });

  const saveProject = useMutation({
    mutationFn: () => api("POST", "/api/ngo/csr-projects", form),
    onSuccess: () => {
      setProjects(prev => [...prev, {
        id: prev.length + 1,
        project: form.project_name,
        company: form.company_donor,
        sanctioned: Number(form.sanctioned),
        received: Number(form.received),
        utilized: Number(form.utilized),
        beneficiaries: Number(form.beneficiaries),
        outcomes: form.outcomes,
        milestones: [],
      }]);
      toast({ title: "CSR project added" });
      qc.invalidateQueries({ queryKey: ["csr-projects"] });
      setForm({ ...BLANK_PROJECT });
      setShowDialog(false);
    },
    onError: () => toast({ title: "Failed to save", variant: "destructive" }),
  });

  const generateCertificate = (p: typeof MOCK_PROJECTS[0]) => {
    const certHTML = `<html><body><h2>CSR Utilization Certificate</h2>
<p>This is to certify that the funds provided by <b>${p.company}</b> under their CSR commitment
have been utilized as follows:</p>
<table border="1" cellpadding="8">
<tr><td>Project</td><td>${p.project}</td></tr>
<tr><td>Sanctioned Amount</td><td>₹${fmt(p.sanctioned)}</td></tr>
<tr><td>Amount Received</td><td>₹${fmt(p.received)}</td></tr>
<tr><td>Amount Utilized</td><td>₹${fmt(p.utilized)}</td></tr>
<tr><td>Beneficiaries</td><td>${p.beneficiaries}</td></tr>
<tr><td>Outcomes</td><td>${p.outcomes}</td></tr>
</table>
<p>Certified by: Kinto Foundation | Date: ${new Date().toLocaleDateString("en-IN")}</p>
</body></html>`;
    const win = window.open("", "_blank");
    if (win) { win.document.write(certHTML); win.print(); }
    toast({ title: "Utilization certificate generated" });
  };

  const toggleMilestone = (projId: number, mIdx: number) => {
    setProjects(prev => prev.map(p => p.id !== projId ? p : {
      ...p, milestones: p.milestones.map((m, i) => i === mIdx ? { ...m, done: !m.done } : m)
    }));
  };

  const totalSanctioned = projects.reduce((s, p) => s + p.sanctioned, 0);
  const totalUtilized = projects.reduce((s, p) => s + p.utilized, 0);
  const s135Done = checklist.filter(c => c.done).length;

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="h-6 w-6 text-blue-600" />
          <h1 className="text-2xl font-bold">CSR Module</h1>
        </div>
        <Button onClick={() => setShowDialog(true)}><Plus className="h-4 w-4 mr-1" />Add CSR Project</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4"><p className="text-xs text-gray-500">Total Projects</p><p className="text-2xl font-bold text-blue-600">{projects.length}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-gray-500">Total Sanctioned</p><p className="text-lg font-bold">₹{fmt(totalSanctioned)}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-gray-500">Total Utilized</p><p className="text-lg font-bold text-green-600">₹{fmt(totalUtilized)}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-gray-500">Sec 135 Compliance</p><p className="text-2xl font-bold text-purple-600">{s135Done}/{checklist.length}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">CSR Projects</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project</TableHead><TableHead>Company Donor</TableHead>
                <TableHead className="text-right">Sanctioned</TableHead>
                <TableHead className="text-right">Received</TableHead>
                <TableHead className="text-right">Utilized</TableHead>
                <TableHead>Beneficiaries</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.map(p => {
                const pct = p.sanctioned > 0 ? Math.round((p.utilized / p.sanctioned) * 100) : 0;
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.project}</TableCell>
                    <TableCell>{p.company}</TableCell>
                    <TableCell className="text-right">₹{fmt(p.sanctioned)}</TableCell>
                    <TableCell className="text-right">₹{fmt(p.received)}</TableCell>
                    <TableCell className="text-right">₹{fmt(p.utilized)}</TableCell>
                    <TableCell>{p.beneficiaries.toLocaleString("en-IN")}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2 w-16">
                          <div className="h-2 rounded-full bg-green-500" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs">{pct}%</span>
                      </div>
                    </TableCell>
                    <TableCell className="flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => setSelectedProject(p)}>Milestones</Button>
                      <Button size="sm" variant="ghost" onClick={() => generateCertificate(p)}>
                        <FileText className="h-3 w-3" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center gap-2">
          <CheckSquare className="h-5 w-5 text-purple-600" />
          <CardTitle className="text-base">Section 135 Compliance Checklist</CardTitle>
          <Badge className={s135Done === checklist.length ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"} >
            {s135Done}/{checklist.length} complete
          </Badge>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {checklist.map(c => (
              <div key={c.id} className="flex items-center gap-3">
                <Checkbox checked={c.done} onCheckedChange={v => setChecklist(prev => prev.map(x => x.id === c.id ? { ...x, done: Boolean(v) } : x))} />
                <span className={`text-sm ${c.done ? "line-through text-gray-400" : ""}`}>{c.item}</span>
                {c.done && <Badge className="bg-green-100 text-green-800 text-xs ml-auto">Done</Badge>}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Milestones Dialog */}
      <Dialog open={!!selectedProject} onOpenChange={() => setSelectedProject(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Milestones — {selectedProject?.project}</DialogTitle></DialogHeader>
          {selectedProject && (
            <div className="space-y-3">
              <p className="text-sm text-gray-500">Impact: {selectedProject.outcomes}</p>
              <p className="text-sm text-gray-500">Beneficiaries: {selectedProject.beneficiaries.toLocaleString("en-IN")}</p>
              <div className="space-y-2">
                {selectedProject.milestones.map((m, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Checkbox checked={m.done} onCheckedChange={() => toggleMilestone(selectedProject.id, i)} />
                    <span className={`text-sm ${m.done ? "line-through text-gray-400" : ""}`}>{m.title}</span>
                    <Badge className={m.done ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
                      {m.done ? "Complete" : "Pending"}
                    </Badge>
                  </div>
                ))}
              </div>
              <Button className="w-full" onClick={() => generateCertificate(selectedProject)}>
                <FileText className="h-4 w-4 mr-1" />Generate Utilization Certificate
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Project Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add CSR Project</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Project Name</Label><Input value={form.project_name} onChange={e => set("project_name", e.target.value)} /></div>
            <div><Label>Company Donor</Label><Input value={form.company_donor} onChange={e => set("company_donor", e.target.value)} /></div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Sanctioned (₹)</Label><Input type="number" value={form.sanctioned} onChange={e => set("sanctioned", e.target.value)} /></div>
              <div><Label>Received (₹)</Label><Input type="number" value={form.received} onChange={e => set("received", e.target.value)} /></div>
              <div><Label>Utilized (₹)</Label><Input type="number" value={form.utilized} onChange={e => set("utilized", e.target.value)} /></div>
            </div>
            <div><Label>Beneficiaries Reached</Label><Input type="number" value={form.beneficiaries} onChange={e => set("beneficiaries", e.target.value)} /></div>
            <div><Label>Impact Outcomes</Label><Input value={form.outcomes} onChange={e => set("outcomes", e.target.value)} /></div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
              <Button onClick={() => saveProject.mutate()} disabled={saveProject.isPending}>
                {saveProject.isPending ? "Saving..." : "Add Project"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
