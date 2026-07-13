import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Plus, X, CheckCircle } from "lucide-react";
import { useTenantConfig, formatCurrency as fmtCur } from "@/hooks/use-tenant-config";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); });

const INSURERS = ["Star Health", "HDFC Ergo", "Niva Bupa", "United India", "New India Assurance", "ICICI Lombard", "Bajaj Allianz", "Oriental Insurance", "Max Bupa", "Reliance Health", "PMJAY / Ayushman Bharat"];

const STATUS_COLOR: Record<string, string> = {
  active: "bg-green-100 text-green-800",
  expired: "bg-red-100 text-red-800",
  pending: "bg-yellow-100 text-yellow-800",
  lapsed: "bg-gray-100 text-gray-600",
};

const CLAIM_STATUS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  submitted: "bg-blue-100 text-blue-800",
  pre_auth: "bg-purple-100 text-purple-800",
  approved: "bg-green-100 text-green-800",
  partially_approved: "bg-yellow-100 text-yellow-800",
  rejected: "bg-red-100 text-red-800",
  settled: "bg-emerald-100 text-emerald-800",
};

const EMPTY_POLICY = { patient_id: "", insurer: "", policy_no: "", sum_insured: "", premium: "", start_date: "", end_date: "", policy_type: "individual", card_no: "", tpa_name: "" };
const EMPTY_CLAIM = { policy_id: "", admission_id: "", claim_amount: "", diagnosis: "", treatment_summary: "", pre_auth_required: "no" };

export default function InsurancePage() {
  const qc = useQueryClient();
  const tenantConfig = useTenantConfig();
  const sym = tenantConfig.currency_symbol;
  const [showPolicyForm, setShowPolicyForm] = useState(false);
  const [showClaimForm, setShowClaimForm] = useState(false);
  const [policyForm, setPolicyForm] = useState({ ...EMPTY_POLICY });
  const [claimForm, setClaimForm] = useState({ ...EMPTY_CLAIM });
  const [selectedPatient, setSelectedPatient] = useState("");

  const { data: policies = [] } = useQuery<any[]>({ queryKey: ["/api/healthcare/insurance"], queryFn: () => api("GET", "/api/healthcare/insurance") });
  const { data: claims = [] } = useQuery<any[]>({ queryKey: ["/api/healthcare/tpa-claims"], queryFn: () => api("GET", "/api/healthcare/tpa-claims") });
  const { data: patients = [] } = useQuery<any[]>({ queryKey: ["/api/healthcare/patients"], queryFn: () => api("GET", "/api/healthcare/patients") });
  const { data: admissions = [] } = useQuery<any[]>({ queryKey: ["/api/healthcare/ipd-admissions"], queryFn: () => api("GET", "/api/healthcare/ipd-admissions") });

  const createPolicy = useMutation({
    mutationFn: (b: any) => api("POST", "/api/healthcare/insurance", b),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/healthcare/insurance"] }); setShowPolicyForm(false); setPolicyForm({ ...EMPTY_POLICY }); },
  });

  const createClaim = useMutation({
    mutationFn: (b: any) => api("POST", "/api/healthcare/tpa-claims", b),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/healthcare/tpa-claims"] }); setShowClaimForm(false); setClaimForm({ ...EMPTY_CLAIM }); },
  });

  const updateClaimStatus = useMutation({
    mutationFn: ({ id, status, approved_amount }: any) => api("PUT", `/api/healthcare/tpa-claims/${id}`, { status, approved_amount }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/healthcare/tpa-claims"] }),
  });

  const postClaimGL = useMutation({
    mutationFn: (id: number) => api("POST", `/api/healthcare/tpa-claims/${id}/post-gl`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/healthcare/tpa-claims"] }),
  });

  const pf = (k: string, v: string) => setPolicyForm(p => ({ ...p, [k]: v }));
  const cf = (k: string, v: string) => setClaimForm(p => ({ ...p, [k]: v }));

  const policiesArr = Array.isArray(policies) ? policies : [];
  const claimsArr = Array.isArray(claims) ? claims : [];
  const activePolicies = policiesArr.filter((p: any) => p.status === "active").length;
  const pendingClaims = claimsArr.filter((c: any) => ["submitted", "pre_auth"].includes(c.status)).length;
  const totalApproved = claimsArr.filter((c: any) => c.status === "approved" || c.status === "settled").reduce((s: number, c: any) => s + (c.approved_amount ?? 0), 0);

  const patientPolicies = selectedPatient ? policiesArr.filter((p: any) => p.patient_id?.toString() === selectedPatient) : policiesArr;

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold flex items-center gap-2"><Shield className="w-6 h-6 text-blue-600" />Insurance & TPA Management</h1>

      <div className="grid grid-cols-4 gap-4">
        <Card><CardContent className="pt-4"><p className="text-xs text-gray-500">Active Policies</p><p className="text-2xl font-bold text-green-600">{activePolicies}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-gray-500">Total Policies</p><p className="text-2xl font-bold">{policiesArr.length}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-gray-500">Pending Claims</p><p className="text-2xl font-bold text-yellow-600">{pendingClaims}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-gray-500">Approved Claims (${sym})</p><p className="text-2xl font-bold text-blue-600">{sym}{(totalApproved / 100).toLocaleString("en-IN")}</p></CardContent></Card>
      </div>

      <Tabs defaultValue="policies">
        <TabsList>
          <TabsTrigger value="policies">Patient Policies</TabsTrigger>
          <TabsTrigger value="claims">Claims Tracker</TabsTrigger>
        </TabsList>

        <TabsContent value="policies" className="mt-4 space-y-4">
          <div className="flex items-center gap-3">
            <Select value={selectedPatient} onValueChange={setSelectedPatient}>
              <SelectTrigger className="w-56"><SelectValue placeholder="Filter by patient" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">All patients</SelectItem>
                {Array.isArray(patients) && patients.map((p: any) => <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button onClick={() => setShowPolicyForm(true)}><Plus className="w-4 h-4 mr-1" />Add Policy</Button>
          </div>

          {showPolicyForm && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base">Add Insurance Policy</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setShowPolicyForm(false)}><X className="w-4 h-4" /></Button>
              </CardHeader>
              <CardContent className="grid grid-cols-3 gap-3">
                <div><Label>Patient</Label>
                  <Select value={policyForm.patient_id} onValueChange={v => pf("patient_id", v)}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{Array.isArray(patients) && patients.map((p: any) => <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Insurer / TPA</Label>
                  <Select value={policyForm.insurer} onValueChange={v => pf("insurer", v)}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{INSURERS.map(ins => <SelectItem key={ins} value={ins}>{ins}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Policy Number</Label><Input value={policyForm.policy_no} onChange={e => pf("policy_no", e.target.value)} /></div>
                <div><Label>Policy Type</Label>
                  <Select value={policyForm.policy_type} onValueChange={v => pf("policy_type", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="individual">Individual</SelectItem>
                      <SelectItem value="family_floater">Family Floater</SelectItem>
                      <SelectItem value="group">Group</SelectItem>
                      <SelectItem value="corporate">Corporate</SelectItem>
                      <SelectItem value="govt">Govt Scheme (Ayushman)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Sum Insured (${sym})</Label><Input type="number" value={policyForm.sum_insured} onChange={e => pf("sum_insured", e.target.value)} /></div>
                <div><Label>Annual Premium (${sym})</Label><Input type="number" value={policyForm.premium} onChange={e => pf("premium", e.target.value)} /></div>
                <div><Label>Start Date</Label><Input type="date" value={policyForm.start_date} onChange={e => pf("start_date", e.target.value)} /></div>
                <div><Label>End Date</Label><Input type="date" value={policyForm.end_date} onChange={e => pf("end_date", e.target.value)} /></div>
                <div><Label>Card / Member No.</Label><Input value={policyForm.card_no} onChange={e => pf("card_no", e.target.value)} /></div>
                <div className="col-span-3 flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setShowPolicyForm(false)}>Cancel</Button>
                  <Button onClick={() => createPolicy.mutate({ ...policyForm, patient_id: parseInt(policyForm.patient_id), sum_insured: parseFloat(policyForm.sum_insured || "0") * 100, premium: parseFloat(policyForm.premium || "0") * 100 })}>Save Policy</Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="space-y-2">
            {patientPolicies.map((p: any) => (
              <Card key={p.id}>
                <CardContent className="pt-4 flex items-start justify-between">
                  <div>
                    <p className="font-semibold">{p.patient_name ?? `Patient #${p.patient_id}`}</p>
                    <p className="text-sm text-gray-600">{p.insurer} · {p.policy_type}</p>
                    <p className="text-xs text-gray-500">Policy: {p.policy_no} · Card: {p.card_no || "—"}</p>
                    <p className="text-xs text-gray-500">SI: {sym}{((p.sum_insured ?? 0) / 100).toLocaleString("en-IN")} · Valid: {p.start_date?.slice(0, 10)} to {p.end_date?.slice(0, 10)}</p>
                  </div>
                  <Badge className={STATUS_COLOR[p.status ?? "active"]}>{p.status ?? "active"}</Badge>
                </CardContent>
              </Card>
            ))}
            {patientPolicies.length === 0 && <p className="text-center text-gray-400 py-8">No policies found.</p>}
          </div>
        </TabsContent>

        <TabsContent value="claims" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setShowClaimForm(true)}><Plus className="w-4 h-4 mr-1" />New Claim</Button>
          </div>

          {showClaimForm && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base">New Insurance Claim</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setShowClaimForm(false)}><X className="w-4 h-4" /></Button>
              </CardHeader>
              <CardContent className="grid grid-cols-3 gap-3">
                <div><Label>Policy</Label>
                  <Select value={claimForm.policy_id} onValueChange={v => cf("policy_id", v)}>
                    <SelectTrigger><SelectValue placeholder="Select policy" /></SelectTrigger>
                    <SelectContent>{policiesArr.map((p: any) => <SelectItem key={p.id} value={p.id.toString()}>{p.patient_name} — {p.insurer} ({p.policy_no})</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>IPD Admission</Label>
                  <Select value={claimForm.admission_id} onValueChange={v => cf("admission_id", v)}>
                    <SelectTrigger><SelectValue placeholder="Link admission" /></SelectTrigger>
                    <SelectContent>{Array.isArray(admissions) && admissions.map((a: any) => <SelectItem key={a.id} value={a.id.toString()}>#{a.id} {a.patient_name} ({a.admission_date?.slice(0, 10)})</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Claim Amount (${sym})</Label><Input type="number" value={claimForm.claim_amount} onChange={e => cf("claim_amount", e.target.value)} /></div>
                <div><Label>Diagnosis (ICD-10)</Label><Input value={claimForm.diagnosis} onChange={e => cf("diagnosis", e.target.value)} placeholder="e.g. I10, E11" /></div>
                <div className="col-span-2"><Label>Treatment Summary</Label><Input value={claimForm.treatment_summary} onChange={e => cf("treatment_summary", e.target.value)} /></div>
                <div><Label>Pre-Auth Required?</Label>
                  <Select value={claimForm.pre_auth_required} onValueChange={v => cf("pre_auth_required", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="yes">Yes</SelectItem><SelectItem value="no">No</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="col-span-3 flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setShowClaimForm(false)}>Cancel</Button>
                  <Button onClick={() => createClaim.mutate({ ...claimForm, policy_id: parseInt(claimForm.policy_id), admission_id: parseInt(claimForm.admission_id), claim_amount: parseFloat(claimForm.claim_amount || "0") * 100 })}>Submit Claim</Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="space-y-2">
            {claimsArr.map((c: any) => (
              <Card key={c.id}>
                <CardContent className="pt-4 flex items-start justify-between">
                  <div>
                    <p className="font-semibold">{c.patient_name ?? c.patient}</p>
                    <p className="text-sm text-gray-600">{c.insurer ?? c.tpa_name} · Policy: {c.policy_no}</p>
                    <p className="text-xs text-gray-500">Claim: {sym}{((c.claim_amount ?? c.amount ?? 0) / 100).toLocaleString("en-IN")} · {c.diagnosis}</p>
                    {c.approved_amount != null && <p className="text-xs text-green-600">Approved: {sym}{((c.approved_amount) / 100).toLocaleString("en-IN")}</p>}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge className={CLAIM_STATUS[c.status] ?? "bg-gray-100"}>{c.status}</Badge>
                    <div className="flex gap-1 flex-wrap justify-end">
                      {c.status === "draft" && <Button size="sm" variant="outline" onClick={() => updateClaimStatus.mutate({ id: c.id, status: "submitted" })}>Submit</Button>}
                      {c.status === "submitted" && <Button size="sm" variant="outline" onClick={() => updateClaimStatus.mutate({ id: c.id, status: "approved" })}>Approve</Button>}
                      {c.status === "approved" && (
                        <Button size="sm" onClick={() => postClaimGL.mutate(c.id)}>
                          <CheckCircle className="w-3 h-3 mr-1" />Settle + GL
                        </Button>
                      )}
                      {["submitted", "approved"].includes(c.status) && <Button size="sm" variant="ghost" className="text-red-500" onClick={() => updateClaimStatus.mutate({ id: c.id, status: "rejected" })}>Reject</Button>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {claimsArr.length === 0 && <p className="text-center text-gray-400 py-8">No claims submitted.</p>}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
