import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";

const api = (m: string, u: string, b?: any) =>
  fetch(u, { method: m, headers: { "Content-Type": "application/json" }, body: b ? JSON.stringify(b) : undefined, credentials: "include" }).then(r => r.json());

export default function PharmacyScheduleXPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ drug_name: "", batch_no: "", qty_sold: "", patient_name: "", doctor_name: "", prescription_no: "", buyer_address: "", buyer_id_proof: "", purpose: "" });

  const { data: entries = [] } = useQuery({ queryKey: ["/api/pharmacy/registers/X"], queryFn: () => api("GET", "/api/pharmacy/registers/X") });

  const add = useMutation({
    mutationFn: (d: any) => api("POST", "/api/pharmacy/registers/X", d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/pharmacy/registers/X"] }); setShowForm(false); toast({ title: "Entry added" }); }
  });

  const exportCSV = () => {
    const headers = ["Date","Drug","Batch","Qty","Patient","Doctor","Prescription No","Buyer Address","ID Proof","Purpose"];
    const rows = entries.map((e: any) => [e.created_at,e.drug_name,e.batch_no,e.qty_sold,e.patient_name,e.doctor_name,e.prescription_no,e.buyer_address,e.buyer_id_proof,e.purpose]);
    const csv = [headers,...rows].map(r => r.join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "schedule-x-register.csv";
    a.click();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Schedule X Register</h1><Badge variant="destructive" className="mt-1">Narcotic / Psychotropic</Badge></div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportCSV}>Export CSV</Button>
          <Button onClick={() => setShowForm(!showForm)}>+ Add Entry</Button>
        </div>
      </div>

      {showForm && (
        <Card><CardHeader><CardTitle>New Schedule X Entry</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            {[["drug_name","Drug Name"],["batch_no","Batch No"],["qty_sold","Qty Sold","number"],["patient_name","Patient Name"],["doctor_name","Doctor Name"],["prescription_no","Prescription No"],["buyer_address","Buyer Address"],["buyer_id_proof","Buyer ID Proof"],["purpose","Purpose"]].map(([k,l,t]) => (
              <div key={k as string}><label className="text-sm font-medium">{l as string}</label>
                <Input value={(form as any)[k as string]} onChange={e => setForm(p => ({ ...p, [k as string]: e.target.value }))} type={(t as string)||"text"} /></div>
            ))}
            <div className="col-span-2 flex gap-2">
              <Button variant="destructive" onClick={() => add.mutate(form)}>Save Entry</Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent></Card>
      )}

      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Date</TableHead><TableHead>Drug</TableHead><TableHead>Batch</TableHead>
            <TableHead>Qty</TableHead><TableHead>Patient</TableHead><TableHead>Doctor</TableHead>
            <TableHead>Prescription No</TableHead><TableHead>ID Proof</TableHead><TableHead>Purpose</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {entries.map((e: any) => (
              <TableRow key={e.id}>
                <TableCell>{e.created_at ? new Date(e.created_at).toLocaleDateString() : "—"}</TableCell>
                <TableCell className="font-medium">{e.drug_name}</TableCell>
                <TableCell>{e.batch_no}</TableCell>
                <TableCell>{e.qty_sold}</TableCell>
                <TableCell>{e.patient_name}</TableCell>
                <TableCell>{e.doctor_name}</TableCell>
                <TableCell>{e.prescription_no}</TableCell>
                <TableCell>{e.buyer_id_proof}</TableCell>
                <TableCell>{e.purpose}</TableCell>
              </TableRow>
            ))}
            {entries.length === 0 && <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">No entries</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
}
