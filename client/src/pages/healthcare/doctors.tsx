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
const fmt = (n: any) => Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

export default function HealthcareDoctorsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", specialization: "", department: "", qualification: "", phone: "", email: "", consultation_fee: "", available_days: "" });

  const { data: doctors = [] } = useQuery({ queryKey: ["/api/healthcare/doctors"], queryFn: () => api("GET", "/api/healthcare/doctors") });

  const add = useMutation({
    mutationFn: (d: any) => api("POST", "/api/healthcare/doctors", d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/healthcare/doctors"] }); setShowForm(false); toast({ title: "Doctor added" }); }
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Doctor Management</h1>
        <Button onClick={() => setShowForm(!showForm)}>+ Add Doctor</Button>
      </div>

      {showForm && (
        <Card><CardHeader><CardTitle>Add Doctor</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            {[["name","Name"],["specialization","Specialization"],["department","Department"],["qualification","Qualification"],["phone","Phone"],["email","Email"],["consultation_fee","Consultation Fee","number"],["available_days","Available Days"]].map(([k,l,t]) => (
              <div key={k as string}><label className="text-sm font-medium">{l as string}</label>
                <Input value={(form as any)[k as string]} onChange={e => setForm(p => ({ ...p, [k as string]: e.target.value }))} type={(t as string)||"text"} /></div>
            ))}
            <div className="col-span-2 flex gap-2">
              <Button onClick={() => add.mutate(form)}>Save</Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent></Card>
      )}

      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>ID</TableHead><TableHead>Name</TableHead><TableHead>Specialization</TableHead>
            <TableHead>Department</TableHead><TableHead>Phone</TableHead><TableHead>Email</TableHead>
            <TableHead>Fee</TableHead><TableHead>Status</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {doctors.map((d: any) => (
              <TableRow key={d.id}>
                <TableCell className="font-mono">{d.doctor_id}</TableCell>
                <TableCell className="font-medium">{d.name}</TableCell>
                <TableCell>{d.specialization}</TableCell>
                <TableCell>{d.department}</TableCell>
                <TableCell>{d.phone}</TableCell>
                <TableCell>{d.email}</TableCell>
                <TableCell className="text-right">{fmt(d.consultation_fee)}</TableCell>
                <TableCell><Badge variant={d.status==="active"?"default":"secondary"}>{d.status||"active"}</Badge></TableCell>
              </TableRow>
            ))}
            {doctors.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No doctors</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
}
