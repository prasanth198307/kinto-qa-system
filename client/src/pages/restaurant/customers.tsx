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

export default function RestaurantCustomersPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [earnAmount, setEarnAmount] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);

  const { data: customers = [] } = useQuery({
    queryKey: ["restaurant-customers", search],
    queryFn: () => search
      ? api("GET", `/api/pos/loyalty/customers/search?q=${encodeURIComponent(search)}`)
      : api("GET", "/api/restaurant/customers")
  });

  const earnPoints = useMutation({
    mutationFn: () => api("POST", `/api/pos/loyalty/customers/${selectedCustomer.id}/earn`, { bill_amount: Number(earnAmount) }),
    onSuccess: () => { toast({ title: "Points earned" }); qc.invalidateQueries({ queryKey: ["restaurant-customers"] }); setEarnAmount(""); }
  });

  const redeemPoints = useMutation({
    mutationFn: () => api("POST", `/api/pos/loyalty/customers/${selectedCustomer.id}/redeem`, {}),
    onSuccess: () => { toast({ title: "Points redeemed" }); qc.invalidateQueries({ queryKey: ["restaurant-customers"] }); }
  });

  const customerList: any[] = Array.isArray(customers) ? customers : (customers as any)?.customers || [];

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Customers and Loyalty</h1>
      <div className="flex gap-3">
        <Input placeholder="Search by phone or name..." value={search} onChange={e => setSearch(e.target.value)} className="w-64" />
      </div>
      {selectedCustomer && (
        <Card className="border-blue-300">
          <CardHeader><CardTitle>Customer: {selectedCustomer.name}</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4 text-sm mb-4">
              <div><div className="text-gray-500">Tier</div><Badge>{selectedCustomer.tier || "Silver"}</Badge></div>
              <div><div className="text-gray-500">Points</div><div className="font-bold">{selectedCustomer.points || 0}</div></div>
              <div><div className="text-gray-500">Visits</div><div className="font-bold">{selectedCustomer.total_visits || 0}</div></div>
              <div><div className="text-gray-500">Total Spend</div><div className="font-bold">Rs {fmt(selectedCustomer.total_spend)}</div></div>
            </div>
            <div className="flex gap-3">
              <Input placeholder="Bill Amount" type="number" value={earnAmount} onChange={e => setEarnAmount(e.target.value)} className="w-36" />
              <Button onClick={() => earnPoints.mutate()}>Earn Points</Button>
              <Button variant="outline" onClick={() => redeemPoints.mutate()}>Redeem Points</Button>
              <Button variant="ghost" onClick={() => setSelectedCustomer(null)}>Clear</Button>
            </div>
          </CardContent>
        </Card>
      )}
      <Card>
        <CardHeader><CardTitle>Customers</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead>Points</TableHead>
                <TableHead>Visits</TableHead>
                <TableHead>Total Spend</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customerList.map((c: any) => (
                <TableRow key={c.id}>
                  <TableCell>{c.name}</TableCell>
                  <TableCell>{c.phone}</TableCell>
                  <TableCell><Badge variant="outline">{c.tier || "Silver"}</Badge></TableCell>
                  <TableCell>{c.points || 0}</TableCell>
                  <TableCell>{c.total_visits || 0}</TableCell>
                  <TableCell>Rs {fmt(c.total_spend)}</TableCell>
                  <TableCell><Button size="sm" variant="outline" onClick={() => setSelectedCustomer(c)}>Select</Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
