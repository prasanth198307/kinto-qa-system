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

export default function NGOBeneficiariesPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", dob: "", gender: "", address: "", village: "", district: "", aadhaar: "", project_id: "" });

  const { data: beneficiaries = [] } = useQuery({ queryKey: ["/api/ngo/beneficiaries"], queryFn: () => api("GET", "/api/ngo/beneficiaries") });

  const addMutation = useMutation({
    mutationFn: (d: any) => api("POST", "/api/ngo/beneficiaries", d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/ngo/beneficiaries"] }); setShowForm(false); toast({ title: "Beneficiary added" }); },
    onError: () => toast({ title: "Error", variant: "destructive" }),
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Beneficiaries</h1>
        <Button onClick={() => setShowForm(!showForm)}>+ Add Beneficiary</Button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{beneficiaries.length}</div><div className="text-sm text-muted-foreground">Total Beneficiaries</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{[...new Set(beneficiaries.map((b: any) => b.project))].length}</div><div className="text-sm text-muted-foreground">Projects Served</div></CardContent></Card>
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle>Add Beneficiary</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              {["name","dob","address","village","district","aadhaar","project_id"].map(k => (
                <div key={k}>
                  <label className="text-sm font-medium capitalize">{k.replace(/_/g," ")}</label>
                  <Input type={k === "dob" ? "date" : "text"} value={(form as any)[k]} onChange={e => setForm(p => ({...p, [k]: e.target.value}))} />
                </div>
              ))}
              <div>
                <label className="text-sm font-medium">Gender</label>
                <Select value={form.gender} onValueChange={v => setForm(p => ({...p, gender: v}))}>
                  <SelectTrigger><SelectValue placeholder="Gender" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button onClick={() => addMutation.mutate(form)} disabled={addMutation.isPending}>Save</Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Beneficiary List</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead><TableHead>Age</TableHead><TableHead>Gender</TableHead>
                <TableHead>Village</TableHead><TableHead>Project</TableHead><TableHead>Services</TableHead><TableHead>Enrolled</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {beneficiaries.map((b: any) => (
                <TableRow key={b.id}>
                  <TableCell>{b.name}</TableCell>
                  <TableCell>{b.age}</TableCell>
                  <TableCell>{b.gender}</TableCell>
                  <TableCell>{b.village}</TableCell>
                  <TableCell>{b.project}</TableCell>
                  <TableCell>{b.services_received}</TableCell>
                  <TableCell>{b.enrollment_date}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
