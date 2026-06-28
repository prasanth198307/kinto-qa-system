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

export default function NGOVolunteersPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "", skills: "", availability: "", address: "" });

  const { data: volunteers = [] } = useQuery({ queryKey: ["/api/ngo/volunteers"], queryFn: () => api("GET", "/api/ngo/volunteers") });
  const { data: hoursLog = [] } = useQuery({ queryKey: ["/api/ngo/volunteers/hours"], queryFn: () => api("GET", "/api/ngo/volunteers/hours") });

  const addMutation = useMutation({
    mutationFn: (d: any) => api("POST", "/api/ngo/volunteers", d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/ngo/volunteers"] }); setShowForm(false); toast({ title: "Volunteer added" }); },
    onError: () => toast({ title: "Error", variant: "destructive" }),
  });

  const totalHours = volunteers.reduce((s: number, v: any) => s + Number(v.hours_contributed || 0), 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Volunteers</h1>
        <Button onClick={() => setShowForm(!showForm)}>+ Add Volunteer</Button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{volunteers.length}</div><div className="text-sm text-muted-foreground">Total Volunteers</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold text-blue-600">{totalHours}</div><div className="text-sm text-muted-foreground">Total Hours Contributed</div></CardContent></Card>
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle>Add Volunteer</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              {["name","phone","email","skills","availability","address"].map(k => (
                <div key={k}>
                  <label className="text-sm font-medium capitalize">{k}</label>
                  <Input value={(form as any)[k]} onChange={e => setForm(p => ({...p, [k]: e.target.value}))} />
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-4">
              <Button onClick={() => addMutation.mutate(form)} disabled={addMutation.isPending}>Save</Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Volunteers</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead><TableHead>Phone</TableHead><TableHead>Skills</TableHead>
                <TableHead>Hours</TableHead><TableHead>Projects</TableHead><TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {volunteers.map((v: any) => (
                <TableRow key={v.id}>
                  <TableCell>{v.name}</TableCell>
                  <TableCell>{v.phone}</TableCell>
                  <TableCell>{v.skills}</TableCell>
                  <TableCell>{v.hours_contributed}</TableCell>
                  <TableCell>{v.projects}</TableCell>
                  <TableCell><Badge variant={v.status === "active" ? "default" : "secondary"}>{v.status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Hours Log</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow><TableHead>Volunteer</TableHead><TableHead>Date</TableHead><TableHead>Hours</TableHead><TableHead>Activity</TableHead><TableHead>Project</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {hoursLog.map((h: any) => (
                <TableRow key={h.id}>
                  <TableCell>{h.volunteer}</TableCell>
                  <TableCell>{h.date}</TableCell>
                  <TableCell>{h.hours}</TableCell>
                  <TableCell>{h.activity}</TableCell>
                  <TableCell>{h.project}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
