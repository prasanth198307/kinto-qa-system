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

export default function RestaurantInventoryPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [form, setForm] = useState({ item_name: "", quantity: "", unit: "", reason: "", cost_per_unit: "" });

  const { data: wastage = [] } = useQuery({ queryKey: ["restaurant-wastage"], queryFn: () => api("GET", "/api/restaurant/wastage") });

  const addWastage = useMutation({
    mutationFn: () => api("POST", "/api/restaurant/wastage", { ...form, quantity: Number(form.quantity), cost_per_unit: Number(form.cost_per_unit) }),
    onSuccess: () => { toast({ title: "Wastage logged" }); qc.invalidateQueries({ queryKey: ["restaurant-wastage"] }); setForm({ item_name: "", quantity: "", unit: "", reason: "", cost_per_unit: "" }); }
  });

  const wastageList: any[] = Array.isArray(wastage) ? wastage : (wastage as any)?.wastage || [];

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Inventory and Recipes</h1>
      <Card>
        <CardHeader><CardTitle>Log Wastage</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-3 flex-wrap">
            <Input placeholder="Item Name" value={form.item_name} onChange={e => setForm(p => ({ ...p, item_name: e.target.value }))} className="w-40" />
            <Input placeholder="Quantity" type="number" value={form.quantity} onChange={e => setForm(p => ({ ...p, quantity: e.target.value }))} className="w-28" />
            <Input placeholder="Unit (kg/L/pcs)" value={form.unit} onChange={e => setForm(p => ({ ...p, unit: e.target.value }))} className="w-28" />
            <Select value={form.reason} onValueChange={v => setForm(p => ({ ...p, reason: v }))}>
              <SelectTrigger className="w-36"><SelectValue placeholder="Reason" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="spoilage">Spoilage</SelectItem>
                <SelectItem value="preparation">Preparation</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
            <Input placeholder="Cost/Unit" type="number" value={form.cost_per_unit} onChange={e => setForm(p => ({ ...p, cost_per_unit: e.target.value }))} className="w-28" />
            <Button onClick={() => addWastage.mutate()}>Log Wastage</Button>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Wastage Log</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Item</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Cost</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {wastageList.map((w: any) => (
                <TableRow key={w.id}>
                  <TableCell>{w.created_at ? new Date(w.created_at).toLocaleDateString() : "-"}</TableCell>
                  <TableCell>{w.item_name}</TableCell>
                  <TableCell>{w.quantity} {w.unit}</TableCell>
                  <TableCell>{w.unit}</TableCell>
                  <TableCell><Badge variant="outline">{w.reason}</Badge></TableCell>
                  <TableCell>Rs {fmt(w.quantity * w.cost_per_unit)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Recipes</CardTitle></CardHeader>
        <CardContent><div className="text-gray-400 py-8 text-center">Recipe management coming soon</div></CardContent>
      </Card>
    </div>
  );
}
