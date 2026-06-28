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

export default function EcommerceOrdersPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [channel, setChannel] = useState("all");
  const [status, setStatus] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [detail, setDetail] = useState<any>(null);

  const { data: orders = [] } = useQuery({ queryKey: ["/api/ecommerce/orders"], queryFn: () => api("GET", "/api/ecommerce/orders") });

  const allocateMutation = useMutation({
    mutationFn: (id: string) => api("PUT", ),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/ecommerce/orders"] }); toast({ title: "Stock allocated" }); },
  });

  const filtered = Array.isArray(orders) ? orders.filter((o: any) => {
    if (channel !== "all" && o.channel !== channel) return false;
    if (status !== "all" && o.fulfillment_status !== status) return false;
    if (from && o.order_date < from) return false;
    if (to && o.order_date > to) return false;
    return true;
  }) : [];

  const toggleSelect = (id: string) => setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">E-Commerce Orders</h1>
      <div className="flex gap-2 flex-wrap">
        <Select value={channel} onValueChange={setChannel}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Channel" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Channels</SelectItem>
            {["Amazon","Flipkart","Meesho","Shopify","Website"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {["pending","shipped","delivered","returned","cancelled"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input type="date" value={from} onChange={e => setFrom(e.target.value)} className="w-36" />
        <Input type="date" value={to} onChange={e => setTo(e.target.value)} className="w-36" />
        {selected.length > 0 && (
          <>
            <Button variant="outline" onClick={() => toast({ title: "Marked Ready to Ship" })}>Mark Ready to Ship</Button>
            <Button variant="outline" onClick={() => selected.forEach(id => allocateMutation.mutate(id))}>Allocate Stock</Button>
          </>
        )}
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead></TableHead><TableHead>Order ID</TableHead><TableHead>Channel</TableHead><TableHead>Customer</TableHead>
              <TableHead>Products</TableHead><TableHead>Date</TableHead><TableHead>Total</TableHead>
              <TableHead>Payment</TableHead><TableHead>Fulfillment</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {filtered.map((o: any) => (
                <TableRow key={o.order_id || o.id} className="cursor-pointer" onClick={() => setDetail(o)}>
                  <TableCell onClick={e => { e.stopPropagation(); toggleSelect(o.order_id); }}>
                    <input type="checkbox" checked={selected.includes(o.order_id)} readOnly />
                  </TableCell>
                  <TableCell>{o.order_id}</TableCell><TableCell>{o.channel}</TableCell><TableCell>{o.customer_name}</TableCell>
                  <TableCell>{o.products}</TableCell><TableCell>{o.order_date?.slice(0,10)}</TableCell>
                  <TableCell>&#8377;{fmt(o.total)}</TableCell>
                  <TableCell><Badge>{o.payment_status}</Badge></TableCell>
                  <TableCell><Badge variant="outline">{o.fulfillment_status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      {detail && (
        <Card>
          <CardHeader><CardTitle>Order Detail: {detail.order_id}</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <p><strong>Products:</strong> {detail.products}</p>
            <p><strong>Shipping Address:</strong> {detail.shipping_address}</p>
            <p><strong>Payment Info:</strong> {detail.payment_status} — &#8377;{fmt(detail.total)}</p>
            <Button variant="outline" onClick={() => setDetail(null)}>Close</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
