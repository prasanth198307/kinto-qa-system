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

export default function AgricultureFarmsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", aadhaar: "", village: "", district: "", land_area_acres: "", bank_account: "", ifsc: "" });

  const { data: members = [] } = useQuery({ queryKey: ["/api/agriculture/fpo/members"], queryFn: () => api("GET", "/api/agriculture/fpo/members") });

  const addMutation = useMutation({
    mutationFn: (data: any) => api("POST", "/api/agriculture/fpo/members", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/agriculture/fpo/members"] }); setShowForm(false); toast({ title: "Farmer added" }); },
    onError: () => toast({ title: "Error", variant: "destructive" }),
  });

  const totalArea = members.reduce((s: number, m: any) => s + Number(m.land_area_acres || 0), 0);
  const active = members.filter((m: any) => m.status === "active").length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Farms & Farmers</h1>
        <Button onClick={() => setShowForm(!showForm)}>+ Add Farmer</Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{members.length}</div><div className="text-sm text-muted-foreground">Total Farmers</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{fmt(totalArea)}</div><div className="text-sm text-muted-foreground">Total Area (Acres)</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{active}</div><div className="text-sm text-muted-foreground">Active Farmers</div></CardContent></Card>
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle>Add Farmer</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {["name","phone","aadhaar","village","district","land_area_acres","bank_account","ifsc"].map(k => (
                <div key={k}>
                  <label className="text-sm capitalize">{k.replace(/_/g," ")}</label>
                  <Input value={(form as any)[k]} onChange={e => setForm(p => ({...p,[k]:e.target.value}))} />
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-4">
              <Button onClick={() => addMutation.mutate(form)}>Save</Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Farmers / Members</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member ID</TableHead><TableHead>Name</TableHead><TableHead>Phone</TableHead>
                <TableHead>Village</TableHead><TableHead>District</TableHead><TableHead>Area (Acres)</TableHead>
                <TableHead>Crops</TableHead><TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((m: any) => (
                <TableRow key={m.id}>
                  <TableCell>{m.member_id || m.id}</TableCell>
                  <TableCell>{m.name}</TableCell>
                  <TableCell>{m.phone}</TableCell>
                  <TableCell>{m.village}</TableCell>
                  <TableCell>{m.district}</TableCell>
                  <TableCell>{fmt(m.land_area_acres)}</TableCell>
                  <TableCell>{m.crops_grown}</TableCell>
                  <TableCell><Badge variant={m.status === "active" ? "default" : "secondary"}>{m.status}</Badge></TableCell>
                </TableRow>
              ))}
              {members.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">No farmers found</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
