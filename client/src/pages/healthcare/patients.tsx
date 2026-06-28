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

export default function HealthcarePatientsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", dob: "", gender: "", phone: "", blood_group: "", address: "", emergency_contact: "" });

  const { data: patients = [] } = useQuery({ queryKey: ["/api/healthcare/patients"], queryFn: () => api("GET", "/api/healthcare/patients") });

  const add = useMutation({
    mutationFn: (d: any) => api("POST", "/api/healthcare/patients", d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/healthcare/patients"] }); setShowForm(false); toast({ title: "Patient registered" }); }
  });

  const filtered = patients.filter((p: any) =>
    p.name?.toLowerCase().includes(search.toLowerCase()) || p.patient_id?.toLowerCase().includes(search.toLowerCase())
  );

  const today = new Date().toDateString();
  const totalPatients = patients.length;
  const newToday = patients.filter((p: any) => new Date(p.created_at).toDateString() === today).length;
  const opdToday = patients.filter((p: any) => p.last_visit && new Date(p.last_visit).toDateString() === today).length;
  const ipdToday = patients.filter((p: any) => p.status === "IPD").length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Patient Registration</h1>
        <Button onClick={() => setShowForm(!showForm)}>+ Add Patient</Button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[{ label: "Total Patients", value: totalPatients }, { label: "New Today", value: newToday }, { label: "OPD Today", value: opdToday }, { label: "IPD Today", value: ipdToday }].map(s => (
          <Card key={s.label}><CardContent className="pt-6"><p className="text-sm text-muted-foreground">{s.label}</p><p className="text-3xl font-bold">{s.value}</p></CardContent></Card>
        ))}
      </div>

      {showForm && (
        <Card><CardHeader><CardTitle>New Patient</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            {["name","dob","phone","address","emergency_contact"].map(k => (
              <div key={k}><label className="text-sm font-medium capitalize">{k.replace("_"," ")}</label>
                <Input value={(form as any)[k]} onChange={e => setForm(p => ({ ...p, [k]: e.target.value }))} type={k==="dob"?"date":"text"} /></div>
            ))}
            <div><label className="text-sm font-medium">Gender</label>
              <Select value={form.gender} onValueChange={v => setForm(p => ({ ...p, gender: v }))}>
                <SelectTrigger><SelectValue placeholder="Gender" /></SelectTrigger>
                <SelectContent><SelectItem value="male">Male</SelectItem><SelectItem value="female">Female</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent>
              </Select></div>
            <div><label className="text-sm font-medium">Blood Group</label>
              <Select value={form.blood_group} onValueChange={v => setForm(p => ({ ...p, blood_group: v }))}>
                <SelectTrigger><SelectValue placeholder="Blood Group" /></SelectTrigger>
                <SelectContent>{["A+","A-","B+","B-","AB+","AB-","O+","O-"].map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
              </Select></div>
            <div className="col-span-2 flex gap-2">
              <Button onClick={() => add.mutate(form)}>Save</Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent></Card>
      )}

      <div className="flex gap-2">
        <Input placeholder="Search by name or UHID..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-sm" />
      </div>

      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>UHID</TableHead><TableHead>Name</TableHead><TableHead>Age</TableHead><TableHead>Gender</TableHead>
            <TableHead>Phone</TableHead><TableHead>Blood Group</TableHead><TableHead>Last Visit</TableHead><TableHead>Status</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {filtered.map((p: any) => (
              <TableRow key={p.id}>
                <TableCell className="font-mono">{p.patient_id}</TableCell>
                <TableCell className="font-medium">{p.name}</TableCell>
                <TableCell>{p.age}</TableCell>
                <TableCell className="capitalize">{p.gender}</TableCell>
                <TableCell>{p.phone}</TableCell>
                <TableCell>{p.blood_group && <Badge variant="outline">{p.blood_group}</Badge>}</TableCell>
                <TableCell>{p.last_visit ? new Date(p.last_visit).toLocaleDateString() : "—"}</TableCell>
                <TableCell><Badge variant={p.status==="IPD"?"destructive":"secondary"}>{p.status||"OPD"}</Badge></TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No patients found</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
}
