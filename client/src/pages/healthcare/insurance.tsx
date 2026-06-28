import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const api = (m: string, u: string, b?: any) =>
  fetch(u, { method: m, headers: { "Content-Type": "application/json" }, body: b ? JSON.stringify(b) : undefined, credentials: "include" }).then(r => r.json());
const fmt = (n: any) => Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

const STATUS_COLORS: Record<string,any> = { submitted: "outline", "under-review": "secondary", approved: "default", rejected: "destructive", settled: "secondary" };

export default function HealthcareInsurancePage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ patient_id: "", insurance_company: "", tpa_name: "", policy_no: "", diagnosis_code: "", claimed_amount: "" });

  const { data: claims = [] } = useQuery({ queryKey: ["/api/healthcare/insurance-claims"], queryFn: () => api("GET", "/api/healthcare/insurance-claims") });

  const add = useMutation({
    mutationFn: (d: any) => api("POST", "/api/healthcare/insurance-claims", d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/healthcare/insurance-claims"] }); setShowForm(false); toast({ title: "Claim submitted" }); }
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Insurance & TPA</h1>
        <Button onClick={() => setShowForm(!showForm)}>+ New Claim</Button>
      </div>

      {showForm && (
        <Card><CardHeader><CardTitle>New Insurance Claim</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            {[["patient_id","Patient ID"],["insurance_company","Insurance Company"],["tpa_name","TPA Name"],["policy_no","Policy No"],["diagnosis_code","Diagnosis Code"],["claimed_amount","Claimed Amount","number"]].map(([k,l,t]) => (
              <div key={k as string}><label className="text-sm font-medium">{l as string}</label>
                <Input value={(form as any)[k as string]} onChange={e => setForm(p => ({ ...p, [k as string]: e.target.value }))} type={(t as string)||"text"} /></div>
            ))}
            <div className="col-span-2 flex gap-2">
              <Button onClick={() => add.mutate(form)}>Submit</Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent></Card>
      )}

      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Claim No</TableHead><TableHead>Patient</TableHead><TableHead>Insurance Co</TableHead>
            <TableHead>TPA</TableHead><TableHead>Policy No</TableHead><TableHead>Claimed</TableHead><TableHead>Approved</TableHead><TableHead>Status</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {claims.map((c: any) => (
              <TableRow key={c.id}>
                <TableCell className="font-mono">{c.claim_no}</TableCell>
                <TableCell className="font-medium">{c.patient_name}</TableCell>
                <TableCell>{c.insurance_company}</TableCell>
                <TableCell>{c.tpa_name}</TableCell>
                <TableCell>{c.policy_no}</TableCell>
                <TableCell className="text-right">{fmt(c.claimed_amount)}</TableCell>
                <TableCell className="text-right">{c.approved_amount ? fmt(c.approved_amount) : "—"}</TableCell>
                <TableCell><Badge variant={STATUS_COLORS[c.status]||"secondary"}>{c.status}</Badge></TableCell>
              </TableRow>
            ))}
            {claims.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No claims</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
}
