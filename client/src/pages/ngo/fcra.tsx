import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Shield, Plus, Download, Send } from "lucide-react";
import { useTenantConfig, formatCurrency as fmtCur } from "@/hooks/use-tenant-config";

const api = (m: string, p: string, b?: any) =>
  fetch(p, { method: m, headers: { "Content-Type": "application/json" }, body: b ? JSON.stringify(b) : undefined }).then((r) => r.json());
const fmt = (n: any) => `${sym}${Number(n || 0).toLocaleString("en-IN")}`;
const YEAR = new Date().getFullYear();
const FC_BLANK = { donor_name: "", country: "", currency: "USD", amount: "", inr_amount: "", receipt_date: new Date().toISOString().slice(0, 10) };

export default function NGOFCRAPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [reg, setReg] = useState<any>({ registration_no: "", validity_date: "", account_no: "", bank_name: "", bank_branch: "", ifsc: "" });
  const [fcOpen, setFcOpen] = useState(false);
  const [fc, setFc] = useState<any>(FC_BLANK);
  const [quarter, setQuarter] = useState("Q1");
  const [year, setYear] = useState(String(YEAR));

  const { data: registration } = useQuery<any>({ queryKey: ["ngo-fcra-reg"], queryFn: () => api("GET", "/api/ngo/fcra/registration") });
  const { data: contributions = [] } = useQuery<any[]>({ queryKey: ["ngo-fcra-fc"], queryFn: () => api("GET", "/api/ngo/fcra/foreign-contributions") });
  const { data: annual } = useQuery<any>({ queryKey: ["ngo-fcra-annual"], queryFn: () => api("GET", "/api/ngo/fcra/annual-return-data") });
  const { data: quarterly } = useQuery<any>({ queryKey: ["ngo-fcra-quarterly", quarter], queryFn: () => api("GET", `/api/ngo/fcra/quarterly-report?quarter=${quarter}`) });

  useEffect(() => { if (registration?.registration_no) setReg((p: any) => ({ ...p, ...registration })); }, [registration]);

  const regMut = useMutation({
    mutationFn: () => api("PUT", "/api/ngo/fcra/registration", reg),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["ngo-fcra-reg"] }); toast({ title: "FCRA registration saved" }); },
  });
  const fcMut = useMutation({
    mutationFn: () => api("POST", "/api/ngo/fcra/foreign-contributions", { ...fc, amount: Number(fc.amount), inr_amount: Number(fc.inr_amount) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["ngo-fcra-fc"] }); qc.invalidateQueries({ queryKey: ["ngo-fcra-annual"] }); setFcOpen(false); setFc(FC_BLANK); toast({ title: "Foreign contribution recorded" }); },
  });
  const submitFC4Mut = useMutation({
    mutationFn: () => api("POST", `/api/ngo/fcra/fc4/${year}/submit`, {}),
    onSuccess: (d: any) => toast({ title: d.message || `FC-4 for ${year} submitted — acknowledgment ${d.acknowledgment_no || "recorded"}` }),
  });

  const r = (k: string, v: string) => setReg((p: any) => ({ ...p, [k]: v }));
  const validityExpiring = reg.validity_date && new Date(reg.validity_date) < new Date(Date.now() + 90 * 86400000);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-2"><Shield className="w-6 h-6 text-blue-600" /><h1 className="text-2xl font-bold">FCRA Compliance</h1></div>

      {validityExpiring && (
        <div className="border border-red-300 bg-red-50 text-red-800 rounded p-3 text-sm font-medium">
          ⚠ FCRA registration validity {reg.validity_date} is within 90 days — file renewal (Form FC-3C) with MHA now.
        </div>
      )}

      <Tabs defaultValue="registration">
        <TabsList>
          <TabsTrigger value="registration">Registration</TabsTrigger>
          <TabsTrigger value="contributions">Foreign Contributions ({contributions.length})</TabsTrigger>
          <TabsTrigger value="fc4">FC-4 Annual Return</TabsTrigger>
          <TabsTrigger value="quarterly">Quarterly Disclosure</TabsTrigger>
        </TabsList>

        <TabsContent value="registration">
          <Card><CardHeader><CardTitle className="text-base">FCRA Registration Details</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 max-w-2xl">
                <div><Label className="text-xs">FCRA Registration No.</Label><Input value={reg.registration_no || ""} onChange={e => r("registration_no", e.target.value)} className="h-8 font-mono" /></div>
                <div><Label className="text-xs">Validity Date</Label><Input type="date" value={reg.validity_date ? String(reg.validity_date).slice(0,10) : ""} onChange={e => r("validity_date", e.target.value)} className="h-8" /></div>
                <div><Label className="text-xs">SBI NDMB Account No.</Label><Input value={reg.account_no || ""} onChange={e => r("account_no", e.target.value)} className="h-8 font-mono" /></div>
                <div><Label className="text-xs">Bank Name</Label><Input value={reg.bank_name || ""} onChange={e => r("bank_name", e.target.value)} className="h-8" placeholder="SBI New Delhi Main Branch (mandatory)" /></div>
                <div><Label className="text-xs">Branch</Label><Input value={reg.bank_branch || ""} onChange={e => r("bank_branch", e.target.value)} className="h-8" /></div>
                <div><Label className="text-xs">IFSC</Label><Input value={reg.ifsc || ""} onChange={e => r("ifsc", e.target.value.toUpperCase())} className="h-8 font-mono" /></div>
              </div>
              <Button className="mt-3" size="sm" onClick={() => regMut.mutate()} disabled={regMut.isPending}>Save Registration</Button>
              <p className="text-xs text-muted-foreground mt-2">All foreign contributions must be received only in the designated SBI New Delhi Main Branch FCRA account (FCRA Amendment 2020).</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contributions">
          <div className="flex justify-end mb-2"><Button size="sm" onClick={() => setFcOpen(true)}><Plus className="w-4 h-4 mr-1" />Record Contribution</Button></div>
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Donor</TableHead><TableHead>Country</TableHead><TableHead>Foreign Amt</TableHead><TableHead>INR Amount</TableHead></TableRow></TableHeader>
              <TableBody>
                {contributions.map((c: any) => (
                  <TableRow key={c.id}>
                    <TableCell className="text-sm">{String(c.receipt_date).slice(0, 10)}</TableCell>
                    <TableCell className="font-medium">{c.donor_name}</TableCell>
                    <TableCell>{c.country}</TableCell>
                    <TableCell>{c.currency} {Number(c.amount).toLocaleString()}</TableCell>
                    <TableCell className="font-semibold">{fmt(c.inr_amount)}</TableCell>
                  </TableRow>
                ))}
                {!contributions.length && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No foreign contributions recorded</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="fc4">
          <Card><CardHeader><CardTitle className="text-base">FC-4 Annual Return {annual?.fy && `— FY ${annual.fy}`}</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3 max-w-md">
                <div className="border rounded p-3"><div className="text-xs text-muted-foreground">Total Receipts</div><div className="text-xl font-bold">{annual?.count ?? 0}</div></div>
                <div className="border rounded p-3"><div className="text-xs text-muted-foreground">Total INR</div><div className="text-xl font-bold">{fmt(annual?.total_inr)}</div></div>
              </div>
              <div className="flex gap-2 items-end">
                <div><Label className="text-xs">Year</Label><Input value={year} onChange={e => setYear(e.target.value)} className="h-8 w-24" /></div>
                <Button size="sm" variant="outline" onClick={() => window.open(`/api/ngo/fcra/fc4-return/${year}`, "_blank")}><Download className="w-3 h-3 mr-1" />Download FC-4 Data</Button>
                <Button size="sm" onClick={() => submitFC4Mut.mutate()} disabled={submitFC4Mut.isPending}><Send className="w-3 h-3 mr-1" />{submitFC4Mut.isPending ? "Submitting..." : "Submit FC-4 to MHA"}</Button>
              </div>
              <p className="text-xs text-muted-foreground">FC-4 is due by 31 December following the financial year. Submission is recorded here; upload the generated data to fcraonline.nic.in.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="quarterly">
          <div className="flex gap-2 items-end mb-3">
            <div><Label className="text-xs">Quarter</Label>
              <Select value={quarter} onValueChange={setQuarter}>
                <SelectTrigger className="h-8 w-24"><SelectValue /></SelectTrigger>
                <SelectContent>{["Q1","Q2","Q3","Q4"].map(q => <SelectItem key={q} value={q}>{q}</SelectItem>)}</SelectContent>
              </Select></div>
            <div className="text-sm text-muted-foreground pb-1.5">{quarterly?.from} → {quarterly?.to}</div>
          </div>
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Donor</TableHead><TableHead>Country</TableHead><TableHead>INR Amount</TableHead></TableRow></TableHeader>
              <TableBody>
                {(quarterly?.contributions || []).map((c: any, i: number) => (
                  <TableRow key={i}><TableCell className="text-sm">{String(c.receipt_date).slice(0,10)}</TableCell><TableCell>{c.donor_name}</TableCell><TableCell>{c.country}</TableCell><TableCell className="font-semibold">{fmt(c.inr_amount)}</TableCell></TableRow>
                ))}
                {!(quarterly?.contributions?.length) && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No contributions in {quarter}</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent></Card>
          <p className="text-xs text-muted-foreground mt-2">Quarterly disclosure of foreign receipts must be published on your NGO website within 15 days of quarter end.</p>
        </TabsContent>
      </Tabs>

      <Dialog open={fcOpen} onOpenChange={setFcOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Record Foreign Contribution</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs">Donor Name</Label><Input value={fc.donor_name} onChange={e => setFc((p: any) => ({ ...p, donor_name: e.target.value }))} className="h-8" /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs">Country</Label><Input value={fc.country} onChange={e => setFc((p: any) => ({ ...p, country: e.target.value }))} className="h-8" /></div>
              <div><Label className="text-xs">Currency</Label><Input value={fc.currency} onChange={e => setFc((p: any) => ({ ...p, currency: e.target.value.toUpperCase() }))} maxLength={3} className="h-8" /></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs">Foreign Amount</Label><Input type="number" value={fc.amount} onChange={e => setFc((p: any) => ({ ...p, amount: e.target.value }))} className="h-8" /></div>
              <div><Label className="text-xs">INR Amount</Label><Input type="number" value={fc.inr_amount} onChange={e => setFc((p: any) => ({ ...p, inr_amount: e.target.value }))} className="h-8" /></div>
            </div>
            <div><Label className="text-xs">Receipt Date</Label><Input type="date" value={fc.receipt_date} onChange={e => setFc((p: any) => ({ ...p, receipt_date: e.target.value }))} className="h-8" /></div>
          </div>
          <div className="flex gap-2 justify-end mt-2">
            <Button variant="outline" onClick={() => setFcOpen(false)}>Cancel</Button>
            <Button onClick={() => fcMut.mutate()} disabled={fcMut.isPending || !fc.donor_name || !fc.inr_amount}>Record</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
