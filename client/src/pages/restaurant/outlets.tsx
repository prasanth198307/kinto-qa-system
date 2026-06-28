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

export default function RestaurantOutletsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [form, setForm] = useState({ outlet_name: "", address: "", phone: "", manager_name: "" });

  const { data: outlets = [] } = useQuery({ queryKey: ["restaurant-outlets"], queryFn: () => api("GET", "/api/restaurant/outlets") });

  const addOutlet = useMutation({
    mutationFn: () => api("POST", "/api/restaurant/outlets", form),
    onSuccess: () => { toast({ title: "Outlet added" }); qc.invalidateQueries({ queryKey: ["restaurant-outlets"] }); setForm({ outlet_name: "", address: "", phone: "", manager_name: "" }); }
  });

  const outletList: any[] = Array.isArray(outlets) ? outlets : (outlets as any)?.outlets || [];

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Outlets and Terminals</h1>
      <Card>
        <CardHeader><CardTitle>Add Outlet</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-3 flex-wrap">
            <Input placeholder="Outlet Name" value={form.outlet_name} onChange={e => setForm(p => ({ ...p, outlet_name: e.target.value }))} className="w-40" />
            <Input placeholder="Address" value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} className="w-56" />
            <Input placeholder="Phone" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} className="w-36" />
            <Input placeholder="Manager Name" value={form.manager_name} onChange={e => setForm(p => ({ ...p, manager_name: e.target.value }))} className="w-40" />
            <Button onClick={() => addOutlet.mutate()}>Add Outlet</Button>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Outlets</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Outlet Name</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Manager</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {outletList.map((o: any) => (
                <TableRow key={o.id}>
                  <TableCell className="font-medium">{o.outlet_name}</TableCell>
                  <TableCell>{o.address}</TableCell>
                  <TableCell>{o.phone}</TableCell>
                  <TableCell>{o.manager_name}</TableCell>
                  <TableCell><Badge variant={o.status === "active" ? "default" : "secondary"}>{o.status || "active"}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
