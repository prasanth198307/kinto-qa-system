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

export default function NGOProjectsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ project_name: "", description: "", start_date: "", end_date: "", budget: "", location: "", project_manager: "" });

  const { data: projects = [] } = useQuery({ queryKey: ["/api/ngo/projects"], queryFn: () => api("GET", "/api/ngo/projects") });

  const addMutation = useMutation({
    mutationFn: (d: any) => api("POST", "/api/ngo/projects", d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/ngo/projects"] }); setShowForm(false); toast({ title: "Project added" }); },
    onError: () => toast({ title: "Error", variant: "destructive" }),
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Projects</h1>
        <Button onClick={() => setShowForm(!showForm)}>+ Add Project</Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle>Add Project</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              {["project_name","description","start_date","end_date","budget","location","project_manager"].map(k => (
                <div key={k}>
                  <label className="text-sm font-medium capitalize">{k.replace(/_/g," ")}</label>
                  <Input
                    type={k.includes("date") ? "date" : k === "budget" ? "number" : "text"}
                    value={(form as any)[k]}
                    onChange={e => setForm(p => ({...p, [k]: e.target.value}))}
                  />
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

      <div className="grid grid-cols-1 gap-4">
        {projects.map((p: any) => {
          const pct = p.budget > 0 ? Math.min(100, Math.round((p.spent / p.budget) * 100)) : 0;
          return (
            <Card key={p.id}>
              <CardContent className="pt-4">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-bold text-lg">{p.project_name}</div>
                    <div className="text-sm text-muted-foreground">{p.start_date} — {p.end_date} | {p.location}</div>
                    <div className="text-sm mt-1">Beneficiaries: {p.beneficiaries_count}</div>
                  </div>
                  <Badge variant={p.status === "active" ? "default" : p.status === "completed" ? "secondary" : "outline"}>{p.status}</Badge>
                </div>
                <div className="mt-3">
                  <div className="flex justify-between text-sm mb-1">
                    <span>Budget Utilization</span>
                    <span>₹{fmt(p.spent)} / ₹{fmt(p.budget)} ({pct}%)</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className={`h-2 rounded-full ${pct > 90 ? "bg-red-500" : pct > 70 ? "bg-yellow-500" : "bg-green-500"}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader><CardTitle>Projects Table</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project</TableHead><TableHead>Start</TableHead><TableHead>End</TableHead>
                <TableHead>Budget</TableHead><TableHead>Spent</TableHead><TableHead>Beneficiaries</TableHead><TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.map((p: any) => (
                <TableRow key={p.id}>
                  <TableCell>{p.project_name}</TableCell>
                  <TableCell>{p.start_date}</TableCell>
                  <TableCell>{p.end_date}</TableCell>
                  <TableCell>₹{fmt(p.budget)}</TableCell>
                  <TableCell>₹{fmt(p.spent)}</TableCell>
                  <TableCell>{p.beneficiaries_count}</TableCell>
                  <TableCell><Badge variant={p.status === "active" ? "default" : "secondary"}>{p.status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
