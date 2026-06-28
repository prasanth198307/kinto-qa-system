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

export default function AgricultureSchemesPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"pmkisan"|"pmfby">("pmkisan");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ farmer_id: "", aadhaar: "", bank_account: "", ifsc: "" });

  const { data: pmkisan = [] } = useQuery({ queryKey: ["/api/agriculture/schemes/pm-kisan"], queryFn: () => api("GET", "/api/agriculture/schemes/pm-kisan") });
  const { data: pmfby = [] } = useQuery({ queryKey: ["/api/agriculture/schemes/pmfby"], queryFn: () => api("GET", "/api/agriculture/schemes/pmfby") });

  const addMutation = useMutation({
    mutationFn: (data: any) => api("POST", "/api/agriculture/schemes/pm-kisan", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/agriculture/schemes/pm-kisan"] }); setShowForm(false); toast({ title: "Farmer registered" }); },
    onError: () => toast({ title: "Error", variant: "destructive" }),
  });

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Government Schemes</h1>

      <div className="flex gap-2">
        <Button variant={tab === "pmkisan" ? "default" : "outline"} onClick={() => setTab("pmkisan")}>PM Kisan</Button>
        <Button variant={tab === "pmfby" ? "default" : "outline"} onClick={() => setTab("pmfby")}>PMFBY</Button>
      </div>

      {tab === "pmkisan" && (
        <>
          <div className="flex justify-end"><Button onClick={() => setShowForm(!showForm)}>+ Register Farmer</Button></div>
          {showForm && (
            <Card>
              <CardHeader><CardTitle>Register for PM Kisan</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  {["farmer_id","aadhaar","bank_account","ifsc"].map(k => (
                    <div key={k}>
                      <label className="text-sm capitalize">{k.replace(/_/g," ")}</label>
                      <Input value={(form as any)[k]} onChange={e => setForm(p => ({...p,[k]:e.target.value}))} />
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 mt-4">
                  <Button onClick={() => addMutation.mutate(form)}>Register</Button>
                  <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
                </div>
              </CardContent>
            </Card>
          )}
          <Card>
            <CardHeader><CardTitle>PM Kisan Beneficiaries</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Farmer</TableHead><TableHead>Aadhaar</TableHead><TableHead>Account No</TableHead>
                    <TableHead>Installment</TableHead><TableHead>Amount</TableHead><TableHead>Payment Date</TableHead><TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pmkisan.map((p: any) => (
                    <TableRow key={p.id}>
                      <TableCell>{p.farmer_name}</TableCell><TableCell>{p.aadhaar}</TableCell>
                      <TableCell>{p.account_no || p.bank_account}</TableCell>
                      <TableCell>{p.installment_no}</TableCell>
                      <TableCell>₹{fmt(p.amount)}</TableCell>
                      <TableCell>{p.payment_date}</TableCell>
                      <TableCell><Badge variant={p.status === "paid" ? "default" : "secondary"}>{p.status}</Badge></TableCell>
                    </TableRow>
                  ))}
                  {pmkisan.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">No records</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      {tab === "pmfby" && (
        <Card>
          <CardHeader><CardTitle>PMFBY Insurance</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Farmer</TableHead><TableHead>Crop</TableHead><TableHead>Area</TableHead>
                  <TableHead>Premium Paid</TableHead><TableHead>Insured Amount</TableHead><TableHead>Claim Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pmfby.map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell>{p.farmer_name}</TableCell><TableCell>{p.crop}</TableCell>
                    <TableCell>{p.area}</TableCell><TableCell>₹{fmt(p.premium_paid)}</TableCell>
                    <TableCell>₹{fmt(p.insured_amount)}</TableCell>
                    <TableCell><Badge variant={p.claim_status === "approved" ? "default" : "secondary"}>{p.claim_status}</Badge></TableCell>
                  </TableRow>
                ))}
                {pmfby.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No records</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
