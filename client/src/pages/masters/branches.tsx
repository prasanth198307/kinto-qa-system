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

const EMPTY = { branch_name: "", branch_code: "", address: "", city: "", state: "", phone: "", email: "", manager_name: "" };

export default function MastersBranchesPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);

  const { data: branches = [] } = useQuery({ queryKey: ["/api/masters/branches"], queryFn: () => api("GET", "/api/masters/branches") });

  const addMutation = useMutation({
    mutationFn: (b: any) => api("POST", "/api/masters/branches", b),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/masters/branches"] }); toast({ title: "Branch added" }); setShowForm(false); setForm(EMPTY); },
  });

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Branches</h1>
        <Button onClick={() => setShowForm(s => !s)}>Add Branch</Button>
      </div>
      {showForm && (
        <Card>
          <CardHeader><CardTitle>Add Branch</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-3 gap-3">
            {(["branch_name","branch_code","address","city","state","phone","email","manager_name"] as const).map(k => (
              <Input key={k} placeholder={k.replace(/_/g," ")} value={(form as any)[k]} onChange={e => set(k, e.target.value)} />
            ))}
            <div className="col-span-3 flex gap-2">
              <Button onClick={() => addMutation.mutate(form)}>Save</Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Branch Name</TableHead><TableHead>Code</TableHead><TableHead>Address</TableHead>
              <TableHead>City</TableHead><TableHead>State</TableHead><TableHead>Phone</TableHead>
              <TableHead>Manager</TableHead><TableHead>Status</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {Array.isArray(branches) && branches.map((b: any) => (
                <TableRow key={b.id || b.branch_code}>
                  <TableCell>{b.branch_name}</TableCell><TableCell>{b.branch_code}</TableCell>
                  <TableCell>{b.address}</TableCell><TableCell>{b.city}</TableCell>
                  <TableCell>{b.state}</TableCell><TableCell>{b.phone}</TableCell>
                  <TableCell>{b.manager || b.manager_name}</TableCell>
                  <TableCell><Badge variant={b.status === "active" ? "default" : "secondary"}>{b.status || "active"}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
