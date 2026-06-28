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

export default function HealthcareBloodBankPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showIssue, setShowIssue] = useState(false);
  const [form, setForm] = useState({ patient_id: "", blood_group: "", units: "", purpose: "" });

  const { data: stock = [] } = useQuery({ queryKey: ["/api/healthcare/blood-bank/stock"], queryFn: () => api("GET", "/api/healthcare/blood-bank/stock") });

  const issue = useMutation({
    mutationFn: (d: any) => api("POST", "/api/healthcare/blood-bank/issue", d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/healthcare/blood-bank/stock"] }); setShowIssue(false); toast({ title: "Blood issued" }); }
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Blood Bank</h1>
        <Button onClick={() => setShowIssue(!showIssue)}>+ Issue Blood</Button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {stock.filter((s: any) => s.units_available > 0).map((s: any) => (
          <Card key={s.blood_group}>
            <CardContent className="pt-6 text-center">
              <p className="text-2xl font-bold text-red-600">{s.blood_group}</p>
              <p className="text-3xl font-bold">{s.units_available}</p>
              <p className="text-sm text-muted-foreground">units</p>
              {s.expiry_date && <p className="text-xs text-muted-foreground mt-1">Exp: {new Date(s.expiry_date).toLocaleDateString()}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      {showIssue && (
        <Card><CardHeader><CardTitle>Issue Blood</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div><label className="text-sm font-medium">Patient ID</label>
              <Input value={form.patient_id} onChange={e => setForm(p => ({ ...p, patient_id: e.target.value }))} /></div>
            <div><label className="text-sm font-medium">Blood Group</label>
              <Select value={form.blood_group} onValueChange={v => setForm(p => ({ ...p, blood_group: v }))}>
                <SelectTrigger><SelectValue placeholder="Blood Group" /></SelectTrigger>
                <SelectContent>{["A+","A-","B+","B-","AB+","AB-","O+","O-"].map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
              </Select></div>
            <div><label className="text-sm font-medium">Units</label>
              <Input type="number" value={form.units} onChange={e => setForm(p => ({ ...p, units: e.target.value }))} /></div>
            <div><label className="text-sm font-medium">Purpose</label>
              <Input value={form.purpose} onChange={e => setForm(p => ({ ...p, purpose: e.target.value }))} /></div>
            <div className="col-span-2 flex gap-2">
              <Button variant="destructive" onClick={() => issue.mutate(form)}>Issue</Button>
              <Button variant="outline" onClick={() => setShowIssue(false)}>Cancel</Button>
            </div>
          </CardContent></Card>
      )}

      <Card>
        <CardHeader><CardTitle>Stock Summary</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>Blood Group</TableHead><TableHead>Units Available</TableHead><TableHead>Expiry Date</TableHead></TableRow></TableHeader>
            <TableBody>
              {stock.map((s: any) => (
                <TableRow key={s.blood_group}>
                  <TableCell><Badge variant="outline" className="text-red-600 border-red-300">{s.blood_group}</Badge></TableCell>
                  <TableCell className="font-bold">{s.units_available}</TableCell>
                  <TableCell>{s.expiry_date ? new Date(s.expiry_date).toLocaleDateString() : "—"}</TableCell>
                </TableRow>
              ))}
              {stock.length === 0 && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">No stock data</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
