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

const EMPTY = { sku: "", product_name: "", description: "", mrp: "", selling_price: "", channel: "", category: "", inventory_qty: "" };

export default function EcommerceListingsPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);

  const { data: listings = [] } = useQuery({ queryKey: ["/api/ecommerce/listings"], queryFn: () => api("GET", "/api/ecommerce/listings") });

  const addMutation = useMutation({
    mutationFn: (b: any) => api("POST", "/api/ecommerce/listings", b),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/ecommerce/listings"] }); toast({ title: "Listing added" }); setShowForm(false); setForm(EMPTY); },
  });

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">E-Commerce Listings</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => toast({ title: "Sync initiated (placeholder)" })}>Sync Prices</Button>
          <Button onClick={() => setShowForm(s => !s)}>Add Listing</Button>
        </div>
      </div>
      {showForm && (
        <Card>
          <CardHeader><CardTitle>Add Listing</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-3 gap-3">
            {(["sku","product_name","description","mrp","selling_price","channel","category","inventory_qty"] as const).map(k => (
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
              <TableHead>SKU</TableHead><TableHead>Product</TableHead><TableHead>Channel</TableHead>
              <TableHead>Listing Price</TableHead><TableHead>MRP</TableHead><TableHead>Stock</TableHead><TableHead>Status</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {Array.isArray(listings) && listings.map((l: any) => (
                <TableRow key={l.id || l.sku}>
                  <TableCell>{l.sku}</TableCell><TableCell>{l.product_name}</TableCell><TableCell>{l.channel}</TableCell>
                  <TableCell>&#8377;{fmt(l.listing_price || l.selling_price)}</TableCell><TableCell>&#8377;{fmt(l.mrp)}</TableCell>
                  <TableCell>{l.stock ?? l.inventory_qty}</TableCell>
                  <TableCell><Badge variant={l.status === "active" ? "default" : "secondary"}>{l.status || "active"}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
