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

export default function NGODonorsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "", address: "", city: "", pan: "", is_80g_eligible: "yes" });

  const { data: donors = [] } = useQuery({ queryKey: ["/api/ngo/donors"], queryFn: () => api("GET", "/api/ngo/donors") });

  const addMutation = useMutation({
    mutationFn: (d: any) => api("POST", "/api/ngo/donors", d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/ngo/donors"] }); setShowForm(false); toast({ title: "Donor added" }); },
    onError: () => toast({ title: "Error", variant: "destructive" }),
  });

  const totalDonated = donors.reduce((s: number, d: any) => s + Number(d.total_donated || 0), 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Donors</h1>
        <Button onClick={() => setShowForm(!showForm)}>+ Add Donor</Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{donors.length}</div><div className="text-sm text-muted-foreground">Total Donors</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold text-green-600">₹{fmt(totalDonated)}</div><div className="text-sm text-muted-foreground">Total Donated</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{donors.filter((d: any) => d.is_80g_eligible).length}</div><div className="text-sm text-muted-foreground">80G Eligible</div></CardContent></Card>
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle>Add Donor</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              {["name","phone","email","address","city","pan"].map(k => (
                <div key={k}>
                  <label className="text-sm font-medium capitalize">{k}</label>
                  <Input value={(form as any)[k]} onChange={e => setForm(p => ({...p, [k]: e.target.value}))} />
                </div>
              ))}
              <div>
                <label className="text-sm font-medium">80G Eligible</label>
                <Select value={form.is_80g_eligible} onValueChange={v => setForm(p => ({...p, is_80g_eligible: v}))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">Yes</SelectItem>
                    <SelectItem value="no">No</SelectItem>
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
        <CardHeader><CardTitle>Donor List</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead><TableHead>Name</TableHead><TableHead>Phone</TableHead>
                <TableHead>City</TableHead><TableHead>Total Donated</TableHead><TableHead>Donations</TableHead>
                <TableHead>80G</TableHead><TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {donors.map((d: any) => (
                <TableRow key={d.id}>
                  <TableCell>{d.donor_id}</TableCell>
                  <TableCell>{d.name}</TableCell>
                  <TableCell>{d.phone}</TableCell>
                  <TableCell>{d.city}</TableCell>
                  <TableCell>₹{fmt(d.total_donated)}</TableCell>
                  <TableCell>{d.donations_count}</TableCell>
                  <TableCell><Badge variant={d["80g_eligible"] ? "default" : "secondary"}>{d["80g_eligible"] ? "Yes" : "No"}</Badge></TableCell>
                  <TableCell><Badge variant={d.status === "active" ? "default" : "secondary"}>{d.status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
