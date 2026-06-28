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

const STATUS_COLORS: Record<string, any> = {
  applied: "secondary", "document-pending": "secondary", approved: "default", rejected: "destructive", enrolled: "default"
};

export default function EducationAdmissionsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ student_name: "", dob: "", gender: "", applied_class: "", previous_school: "", tc_number: "", parent_name: "", phone: "", email: "" });

  const { data: admissions = [] } = useQuery({ queryKey: ["/api/education/admissions"], queryFn: () => api("GET", "/api/education/admissions") });

  const addMutation = useMutation({
    mutationFn: (d: any) => api("POST", "/api/education/admissions", d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/education/admissions"] }); setShowForm(false); toast({ title: "Admission submitted" }); },
    onError: () => toast({ title: "Error", variant: "destructive" }),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: any) => api("PATCH", `/api/education/admissions/${id}`, { status }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/education/admissions"] }); toast({ title: "Status updated" }); },
    onError: () => toast({ title: "Error", variant: "destructive" }),
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Admissions</h1>
        <Button onClick={() => setShowForm(!showForm)}>+ New Application</Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle>New Admission Application</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              {["student_name","dob","applied_class","previous_school","tc_number","parent_name","phone","email"].map(k => (
                <div key={k}>
                  <label className="text-sm font-medium capitalize">{k.replace(/_/g," ")}</label>
                  <Input value={(form as any)[k]} onChange={e => setForm(p => ({...p, [k]: e.target.value}))} />
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
              <Button onClick={() => addMutation.mutate(form)} disabled={addMutation.isPending}>Submit</Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Applications</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>App No</TableHead><TableHead>Student Name</TableHead><TableHead>Class</TableHead>
                <TableHead>Date</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {admissions.map((a: any) => (
                <TableRow key={a.id}>
                  <TableCell>{a.application_no}</TableCell>
                  <TableCell>{a.student_name}</TableCell>
                  <TableCell>{a.applied_class}</TableCell>
                  <TableCell>{a.date}</TableCell>
                  <TableCell><Badge variant={STATUS_COLORS[a.status] || "secondary"}>{a.status}</Badge></TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button size="sm" variant="default" onClick={() => updateStatus.mutate({ id: a.id, status: "approved" })}>Approve</Button>
                      <Button size="sm" variant="destructive" onClick={() => updateStatus.mutate({ id: a.id, status: "rejected" })}>Reject</Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
