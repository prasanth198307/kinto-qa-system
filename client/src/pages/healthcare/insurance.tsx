import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ShieldCheck, Plus } from "lucide-react";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined })
    .then((r) => r.json())
    .catch(() => null);

const claimStatusVariant: Record<string, any> = { pending: "secondary", approved: "default", rejected: "destructive", partial: "outline" };

export default function InsurancePage() {
  const qc = useQueryClient();
  const [claimOpen, setClaimOpen] = useState(false);
  const [preAuthOpen, setPreAuthOpen] = useState(false);
  const [claimForm, setClaimForm] = useState({ patient_id: "", policy_id: "", treatment_description: "", claimed_amount: "", documents: "" });
  const [preAuthForm, setPreAuthForm] = useState({ patient_id: "", policy_id: "", treatment_description: "", estimated_amount: "" });

  const { data: policies } = useQuery({ queryKey: ["insurance-policies"], queryFn: () => api("GET", "/api/healthcare/insurance/policy") });
  const { data: claims } = useQuery({ queryKey: ["tpa-claims"], queryFn: () => api("GET", "/api/healthcare/tpa/claims") });

  const submitClaim = useMutation({
    mutationFn: (body: any) => api("POST", "/api/healthcare/tpa/claims", body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tpa-claims"] }); setClaimOpen(false); setClaimForm({ patient_id: "", policy_id: "", treatment_description: "", claimed_amount: "", documents: "" }); },
  });

  const submitPreAuth = useMutation({
    mutationFn: (body: any) => api("POST", "/api/healthcare/tpa/preauth", body),
    onSuccess: () => { setPreAuthOpen(false); setPreAuthForm({ patient_id: "", policy_id: "", treatment_description: "", estimated_amount: "" }); },
  });

  const policyList = Array.isArray(policies) ? policies : [];
  const claimList = Array.isArray(claims) ? claims : [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-6 w-6" />
          <h1 className="text-2xl font-bold">TPA / Insurance</h1>
        </div>
        <div className="flex gap-2">
          <Dialog open={preAuthOpen} onOpenChange={setPreAuthOpen}>
            <DialogTrigger asChild><Button variant="outline">Pre-Authorization</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Pre-Authorization Request</DialogTitle></DialogHeader>
              <div className="space-y-3 mt-2">
                <div><Label>Patient ID</Label><Input value={preAuthForm.patient_id} onChange={(e) => setPreAuthForm({ ...preAuthForm, patient_id: e.target.value })} /></div>
                <div><Label>Policy ID</Label><Input value={preAuthForm.policy_id} onChange={(e) => setPreAuthForm({ ...preAuthForm, policy_id: e.target.value })} /></div>
                <div><Label>Treatment Description</Label><Textarea value={preAuthForm.treatment_description} onChange={(e) => setPreAuthForm({ ...preAuthForm, treatment_description: e.target.value })} /></div>
                <div><Label>Estimated Amount (₹)</Label><Input type="number" value={preAuthForm.estimated_amount} onChange={(e) => setPreAuthForm({ ...preAuthForm, estimated_amount: e.target.value })} /></div>
                <Button className="w-full" onClick={() => submitPreAuth.mutate(preAuthForm)} disabled={submitPreAuth.isPending}>Submit Pre-Auth</Button>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={claimOpen} onOpenChange={setClaimOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" />Submit Claim</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Submit Claim</DialogTitle></DialogHeader>
              <div className="space-y-3 mt-2">
                <div><Label>Patient ID</Label><Input value={claimForm.patient_id} onChange={(e) => setClaimForm({ ...claimForm, patient_id: e.target.value })} /></div>
                <div><Label>Policy ID</Label><Input value={claimForm.policy_id} onChange={(e) => setClaimForm({ ...claimForm, policy_id: e.target.value })} /></div>
                <div><Label>Treatment Description</Label><Textarea value={claimForm.treatment_description} onChange={(e) => setClaimForm({ ...claimForm, treatment_description: e.target.value })} /></div>
                <div><Label>Claimed Amount (₹)</Label><Input type="number" value={claimForm.claimed_amount} onChange={(e) => setClaimForm({ ...claimForm, claimed_amount: e.target.value })} /></div>
                <div><Label>Documents (comma separated)</Label><Input value={claimForm.documents} onChange={(e) => setClaimForm({ ...claimForm, documents: e.target.value })} placeholder="Discharge summary, bills, reports" /></div>
                <Button className="w-full" onClick={() => submitClaim.mutate(claimForm)} disabled={submitClaim.isPending}>Submit Claim</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="policies">
        <TabsList>
          <TabsTrigger value="policies">Insurance Policies</TabsTrigger>
          <TabsTrigger value="claims">Active Claims</TabsTrigger>
        </TabsList>

        <TabsContent value="policies" className="mt-4">
          <Card>
            <CardContent className="pt-4">
              {policyList.length === 0 ? <p className="text-muted-foreground text-sm">No data</p> : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Policy Number</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>TPA</TableHead>
                      <TableHead>Valid From</TableHead>
                      <TableHead>Valid To</TableHead>
                      <TableHead>Claim Limit (₹)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {policyList.map((p: any) => (
                      <TableRow key={p.id}>
                        <TableCell>{p.policy_number}</TableCell>
                        <TableCell>{p.company_name}</TableCell>
                        <TableCell>{p.tpa_name}</TableCell>
                        <TableCell>{p.validity_from}</TableCell>
                        <TableCell>{p.validity_to}</TableCell>
                        <TableCell>₹{Number(p.claim_limit).toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="claims" className="mt-4">
          <Card>
            <CardContent className="pt-4">
              {claimList.length === 0 ? <p className="text-muted-foreground text-sm">No data</p> : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Patient</TableHead>
                      <TableHead>Policy</TableHead>
                      <TableHead>Admitted</TableHead>
                      <TableHead>Claimed (₹)</TableHead>
                      <TableHead>Approved (₹)</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {claimList.map((c: any) => (
                      <TableRow key={c.id}>
                        <TableCell>{c.patient_name ?? c.patient_id}</TableCell>
                        <TableCell>{c.policy_number}</TableCell>
                        <TableCell>{c.admitted_date}</TableCell>
                        <TableCell>₹{Number(c.claimed_amount).toLocaleString()}</TableCell>
                        <TableCell>{c.approved_amount ? `₹${Number(c.approved_amount).toLocaleString()}` : "-"}</TableCell>
                        <TableCell><Badge variant={claimStatusVariant[c.status] ?? "secondary"}>{c.status}</Badge></TableCell>
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
