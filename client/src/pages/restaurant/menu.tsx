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

export default function RestaurantMenuPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"items"|"modifiers">("items");
  const [form, setForm] = useState({ name: "", price: "", gst_rate: "5", category: "", is_veg: true, is_available: true });

  const { data: items = [] } = useQuery({ queryKey: ["pos-menu-items"], queryFn: () => api("GET", "/api/pos/menu-items") });
  const { data: modifiers = [] } = useQuery({ queryKey: ["restaurant-modifiers"], queryFn: () => api("GET", "/api/restaurant/modifiers") });

  const addItem = useMutation({
    mutationFn: () => api("POST", "/api/pos/menu-items", { ...form, price: Number(form.price), gst_rate: Number(form.gst_rate) }),
    onSuccess: () => { toast({ title: "Item added" }); qc.invalidateQueries({ queryKey: ["pos-menu-items"] }); setForm({ name: "", price: "", gst_rate: "5", category: "", is_veg: true, is_available: true }); }
  });

  const itemList: any[] = Array.isArray(items) ? items : (items as any)?.items || [];
  const modList: any[] = Array.isArray(modifiers) ? modifiers : (modifiers as any)?.modifiers || [];

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Menu Management</h1>
      <div className="flex gap-2">
        <Button variant={tab === "items" ? "default" : "outline"} onClick={() => setTab("items")}>Items</Button>
        <Button variant={tab === "modifiers" ? "default" : "outline"} onClick={() => setTab("modifiers")}>Modifiers</Button>
      </div>
      {tab === "items" && (
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Add Menu Item</CardTitle></CardHeader>
            <CardContent>
              <div className="flex gap-3 flex-wrap">
                <Input placeholder="Item Name" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="w-48" />
                <Input placeholder="Price" type="number" value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))} className="w-32" />
                <Select value={form.gst_rate} onValueChange={v => setForm(p => ({ ...p, gst_rate: v }))}>
                  <SelectTrigger className="w-28"><SelectValue placeholder="GST%" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5%</SelectItem>
                    <SelectItem value="12">12%</SelectItem>
                    <SelectItem value="18">18%</SelectItem>
                  </SelectContent>
                </Select>
                <Input placeholder="Category" value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} className="w-36" />
                <label className="flex items-center gap-1 cursor-pointer text-sm">
                  <input type="checkbox" checked={form.is_veg} onChange={e => setForm(p => ({ ...p, is_veg: e.target.checked }))} />
                  Veg
                </label>
                <label className="flex items-center gap-1 cursor-pointer text-sm">
                  <input type="checkbox" checked={form.is_available} onChange={e => setForm(p => ({ ...p, is_available: e.target.checked }))} />
                  Available
                </label>
                <Button onClick={() => addItem.mutate()}>Add Item</Button>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Menu Items</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>GST%</TableHead>
                    <TableHead>Veg</TableHead>
                    <TableHead>Available</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {itemList.map((i: any) => (
                    <TableRow key={i.id}>
                      <TableCell>{i.name}</TableCell>
                      <TableCell>{i.category}</TableCell>
                      <TableCell>Rs {fmt(i.price)}</TableCell>
                      <TableCell>{i.gst_rate}%</TableCell>
                      <TableCell><Badge variant={i.is_veg ? "default" : "destructive"}>{i.is_veg ? "Veg" : "Non-Veg"}</Badge></TableCell>
                      <TableCell><Badge variant={i.is_available ? "default" : "secondary"}>{i.is_available ? "Yes" : "No"}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}
      {tab === "modifiers" && (
        <Card>
          <CardHeader><CardTitle>Modifiers</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Price</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {modList.map((m: any) => (
                  <TableRow key={m.id}>
                    <TableCell>{m.name}</TableCell>
                    <TableCell>{m.type}</TableCell>
                    <TableCell>Rs {fmt(m.price)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
