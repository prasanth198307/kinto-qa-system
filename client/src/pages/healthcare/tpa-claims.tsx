import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Plus, CheckCircle, IndianRupee } from "lucide-react";
import { useTenantConfig, formatCurrency as fmtCur } from "@/hooks/use-tenant-config";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined, credentials: "include" }).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); });

const TPA_LIST = ["Star Health", "HDFC Ergo", "Niva Bupa", "United India", "New India Assurance", "ICICI Lombard", "Bajaj Allianz", "Oriental Insurance"];

const STATUS_COLOR: Record<string, string> = {
  Pending: "bg-yellow-100 text-yellow-800",
  Approved: "bg-blue-100 text-blue-800",
  Rejected: "bg-red-100 text-red-800",
  Settled: "bg-green-100 text-green-800",
  "Pre-Auth": "bg-purple-100 text-purple-800",
};

const BLANK_CLAIM = { patient_name: "", tpa_name: "", policy_no: "", diagnosis: "", treatment: "", claim_amount: "", pre_auth: false };

const MOCK_CLAIMS = [
  { id: 1, patient: "Ravi Kumar", tpa: "Star Health", policy_no: "SH-2024-001", amount: 45000, status: "Approved", approved_amount: 40000 },
  { id: 2, patient: "Meena Devi", tpa: "HDFC Ergo", policy_no: "HE-2024-055", amount: 120000, status: "Pending", approved_amount: null },
  { id: 3, patient: "Suresh Babu", tpa: "Niva Bupa", policy_no: "NB-2024-112", amount: 75000, status: "Pre-Auth", approved_amount: null },
  { id: 4, patient: "Anitha S", tpa: "ICICI Lombard", policy_no: "IL-2024-033", amount: 30000, status: "Settled", approved_amount: 28000 },
  { id: 5, patient: "Manoj K", tpa: "United India", policy_no: "UI-2024-071", amount: 95000, status: "Rejected", approved_amount: 0 },
];

export default function TPAClaimsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const tenantConfig = useTenantConfig();
  const sym = tenantConfig.currency_symbol;
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState({ ...BLANK_CLAIM });
  const [claims, setClaims] = useState(MOCK_CLAIMS);
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const { data: serverClaims } = useQuery({
    queryKey: ["tpa-claims"],
    queryFn: () => api("GET", "/api/healthcare/tpa-claims"),
  });

  const createClaim = useMutation({
    mutationFn: () => api("POST", "/api/healthcare/tpa-claims", form),
    onSuccess: () => {
      toast({ title: "Claim submitted successfully" });
      qc.invalidateQueries({ queryKey: ["tpa-claims"] });
      setClaims(prev => [...prev, {
        id: prev.length + 1,
        patient: form.patient_name,
        tpa: form.tpa_name,
        policy_no: form.policy_no,
        amount: Number(form.claim_amount),
        status: form.pre_auth ? "Pre-Auth" : "Pending",
        approved_amount: null,
      }]);
      setForm({ ...BLANK_CLAIM });
      setShowDialog(false);
    },
    onError: () => toast({ title: "Failed to submit claim", variant: "destructive" }),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => api("PUT", `/api/healthcare/tpa-claims/${id}`, { status }),
    onSuccess: (_, { id, status }) => {
      setClaims(prev => prev.map(c => c.id === id ? { ...c, status } : c));
      toast({ title: `Claim marked as ${status}` });
      qc.invalidateQueries({ queryKey: ["tpa-claims"] });
    },
  });

  const postGL = (id: number) => {
    toast({ title: "GL Journal Posted", description: "Dr TPA Receivable / Cr Revenue" });
    setClaims(prev => prev.map(c => c.id === id ? { ...c, status: "Settled" } : c));
  };

  const fmt = (n: number | null) => n != null ? `${sym}${n.toLocaleString("en-IN")}` : "—";

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <IndianRupee className="h-6 w-6 text-blue-600" />
          <h1 className="text-2xl font-bold">Insurance TPA Claims</h1>
        </div>
        <Button onClick={() => setShowDialog(true)}><Plus className="h-4 w-4 mr-1" />New Claim</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Claims", value: claims.length, color: "text-blue-600" },
          { label: "Pending", value: claims.filter(c => c.status === "Pending" || c.status === "Pre-Auth").length, color: "text-yellow-600" },
          { label: "Approved", value: claims.filter(c => c.status === "Approved").length, color: "text-blue-600" },
          { label: "Settled", value: claims.filter(c => c.status === "Settled").length, color: "text-green-600" },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="pt-4">
              <p className="text-xs text-gray-500">{s.label}</p>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="pt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Patient</TableHead><TableHead>TPA</TableHead>
                <TableHead>Policy No</TableHead><TableHead>Claim Amount</TableHead>
                <TableHead>Approved</TableHead><TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {claims.map(c => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.patient}</TableCell>
                  <TableCell>{c.tpa}</TableCell>
                  <TableCell className="font-mono text-sm">{c.policy_no}</TableCell>
                  <TableCell>{fmt(c.amount)}</TableCell>
                  <TableCell>{fmt(c.approved_amount)}</TableCell>
                  <TableCell><Badge className={STATUS_COLOR[c.status]}>{c.status}</Badge></TableCell>
                  <TableCell className="flex gap-1 flex-wrap">
                    {c.status === "Pre-Auth" && (
                      <Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ id: c.id, status: "Pending" })}>Submit Claim</Button>
                    )}
                    {c.status === "Pending" && (
                      <Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ id: c.id, status: "Approved" })}>Approve</Button>
                    )}
                    {c.status === "Approved" && (
                      <Button size="sm" onClick={() => postGL(c.id)}>
                        <CheckCircle className="h-3 w-3 mr-1" />Settle + GL
                      </Button>
                    )}
                    {(c.status === "Pending" || c.status === "Approved") && (
                      <Button size="sm" variant="ghost" onClick={() => updateStatus.mutate({ id: c.id, status: "Rejected" })}>Reject</Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>New TPA Claim</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Patient Name</Label>
              <Input value={form.patient_name} onChange={e => set("patient_name", e.target.value)} placeholder="Search patient..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>TPA</Label>
                <Select value={form.tpa_name} onValueChange={v => set("tpa_name", v)}>
                  <SelectTrigger><SelectValue placeholder="Select TPA" /></SelectTrigger>
                  <SelectContent>{TPA_LIST.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Policy Number</Label>
                <Input value={form.policy_no} onChange={e => set("policy_no", e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Diagnosis Codes (ICD-10)</Label>
              <Input value={form.diagnosis} onChange={e => set("diagnosis", e.target.value)} placeholder="e.g. I10, E11" />
            </div>
            <div>
              <Label>Treatment Items</Label>
              <Input value={form.treatment} onChange={e => set("treatment", e.target.value)} placeholder="Surgery, Medicines, Tests..." />
            </div>
            <div>
              <Label>Claim Amount (${sym})</Label>
              <Input type="number" value={form.claim_amount} onChange={e => set("claim_amount", e.target.value)} />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox checked={form.pre_auth} onCheckedChange={v => set("pre_auth", Boolean(v))} id="pre-auth" />
              <Label htmlFor="pre-auth">Pre-Authorization Required</Label>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
              <Button onClick={() => createClaim.mutate()} disabled={createClaim.isPending}>
                {createClaim.isPending ? "Submitting..." : "Submit Claim"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
