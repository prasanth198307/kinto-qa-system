import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { useTenantConfig, formatCurrency as fmtCur } from "@/hooks/use-tenant-config";

const api = (method: string, path: string, body?: unknown) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); });

const PRICE_TIERS = ["Retail", "Wholesale", "Distributor"];
const PAYMENT_TERMS = ["30 days", "45 days", "60 days", "Advance"];

const MOCK_CUSTOMERS = [
  { id: 1, name: "Metro Wholesale Hub", credit_limit: 500000, used: 320000, terms: "45 days", tier: "Distributor", outstanding: 180000 },
  { id: 2, name: "Star Retail Chain", credit_limit: 200000, used: 85000, terms: "30 days", tier: "Wholesale", outstanding: 45000 },
  { id: 3, name: "City Mart Pvt Ltd", credit_limit: 150000, used: 10000, terms: "60 days", tier: "Wholesale", outstanding: 10000 },
];

const MOCK_ORDERS = [
  { id: "B2B-001", customer: "Metro Wholesale Hub", items: 12, amount: 125000, date: "2026-06-28", status: "Delivered" },
  { id: "B2B-002", customer: "Star Retail Chain", amount: 45000, items: 8, date: "2026-06-29", status: "Processing" },
];

export default function B2BPortalPage() {
  const qc = useQueryClient();
  const tenantConfig = useTenantConfig();
  const sym = tenantConfig.currency_symbol;
  const [orderOpen, setOrderOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [tier, setTier] = useState("Wholesale");

  const { data: customers = [] } = useQuery({ queryKey: ["b2b-customers"], queryFn: () => api("GET", "/api/retail/b2b-orders") });

  const placeMut = useMutation({
    mutationFn: (body: unknown) => api("POST", "/api/retail/b2b-orders", body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["b2b-customers"] }); setOrderOpen(false); },
  });

  const rows: Array<Record<string, unknown>> = Array.isArray(customers) && customers.length ? customers : MOCK_CUSTOMERS;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">B2B Portal</h1>
          <p className="text-muted-foreground">Manage B2B customers, bulk orders and credit</p>
        </div>
        <Button onClick={() => setOrderOpen(true)}><Plus className="h-4 w-4 mr-2" />Place Bulk Order</Button>
      </div>

      <Tabs defaultValue="customers">
        <TabsList>
          <TabsTrigger value="customers">B2B Customers</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="pricing">Price Lists</TabsTrigger>
        </TabsList>

        <TabsContent value="customers">
          <Card>
            <CardContent className="pt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Tier</TableHead>
                    <TableHead>Credit Limit</TableHead>
                    <TableHead>Utilization</TableHead>
                    <TableHead>Terms</TableHead>
                    <TableHead>Outstanding</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r: Record<string, unknown>, i) => {
                    const limit = Number(r.credit_limit);
                    const used = Number(r.used);
                    const utilPct = Math.round((used / limit) * 100);
                    return (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{String(r.name)}</TableCell>
                        <TableCell><Badge variant="outline">{String(r.tier)}</Badge></TableCell>
                        <TableCell>{sym}{limit.toLocaleString()}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-20 bg-gray-100 rounded-full h-2">
                              <div className={`h-2 rounded-full ${utilPct > 80 ? "bg-red-500" : "bg-blue-500"}`} style={{ width: `${utilPct}%` }} />
                            </div>
                            <span className="text-xs">{utilPct}%</span>
                          </div>
                        </TableCell>
                        <TableCell>{String(r.terms)}</TableCell>
                        <TableCell>{sym}{Number(r.outstanding).toLocaleString()}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="sm" variant="outline">Credit Note</Button>
                            <Button size="sm" variant="outline">Payment</Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="orders">
          <Card>
            <CardContent className="pt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {MOCK_ORDERS.map((o, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-mono">{o.id}</TableCell>
                      <TableCell>{o.customer}</TableCell>
                      <TableCell>{o.items} items</TableCell>
                      <TableCell>{sym}{o.amount.toLocaleString()}</TableCell>
                      <TableCell>{o.date}</TableCell>
                      <TableCell>
                        <Badge variant={o.status === "Delivered" ? "default" : "outline"}>{o.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pricing">
          <Card>
            <CardHeader><CardTitle>Price List by Tier</CardTitle></CardHeader>
            <CardContent>
              <div className="flex gap-2 mb-4">
                {PRICE_TIERS.map(t => (
                  <Button key={t} variant={tier === t ? "default" : "outline"} size="sm" onClick={() => setTier(t)}>{t}</Button>
                ))}
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>MRP</TableHead>
                    <TableHead>{tier} Price</TableHead>
                    <TableHead>Discount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[
                    { product: "Water Purifier X1", mrp: 15000, retail: 14500, wholesale: 13000, distributor: 11500 },
                    { product: "Water Can 20L", mrp: 80, retail: 75, wholesale: 65, distributor: 55 },
                    { product: "Filter Cartridge", mrp: 1200, retail: 1150, wholesale: 1000, distributor: 900 },
                  ].map((p, i) => {
                    const price = p[tier.toLowerCase() as "retail" | "wholesale" | "distributor"];
                    const disc = Math.round(((p.mrp - price) / p.mrp) * 100);
                    return (
                      <TableRow key={i}>
                        <TableCell>{p.product}</TableCell>
                        <TableCell>{sym}{p.mrp.toLocaleString()}</TableCell>
                        <TableCell>{sym}{price.toLocaleString()}</TableCell>
                        <TableCell><Badge variant="secondary">{disc}% off</Badge></TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={orderOpen} onOpenChange={setOrderOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Place Bulk Order</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium mb-1 block">Customer</label>
              <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                <SelectContent>{rows.map((r: Record<string, unknown>, i) => <SelectItem key={i} value={String(r.id)}>{String(r.name)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <p className="text-sm text-muted-foreground">Upload CSV or enter items in the grid below.</p>
            <Input type="file" accept=".csv" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOrderOpen(false)}>Cancel</Button>
            <Button onClick={() => placeMut.mutate({ customer_id: selectedCustomer })}>Place Order</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
