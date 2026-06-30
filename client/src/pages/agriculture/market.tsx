import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus } from "lucide-react";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then(r => r.json());

const PAYMENT_MODES = ["cash", "bank_transfer", "cheque", "upi"];
const EMPTY_PRICE = { commodity: "", mandi: "", price_per_unit: "", unit: "quintal", date: "" };
const EMPTY_SALE = { crop_id: "", buyer: "", quantity: "", unit: "quintal", rate: "", payment_mode: "bank_transfer", sale_date: "" };

export default function MarketPage() {
  const qc = useQueryClient();
  const [priceOpen, setPriceOpen] = useState(false);
  const [saleOpen, setSaleOpen] = useState(false);
  const [priceForm, setPriceForm] = useState({ ...EMPTY_PRICE });
  const [saleForm, setSaleForm] = useState({ ...EMPTY_SALE });

  const { data: crops = [] } = useQuery({ queryKey: ["ag-crops"], queryFn: () => api("GET", "/api/agriculture/crops") });
  const { data: prices = [] } = useQuery({ queryKey: ["ag-prices"], queryFn: () => api("GET", "/api/agriculture/market-prices") });
  const { data: sales = [] } = useQuery({ queryKey: ["ag-sales"], queryFn: () => api("GET", "/api/agriculture/sales") });

  const savePrice = useMutation({
    mutationFn: (f: any) => api("POST", "/api/agriculture/market-prices", f),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["ag-prices"] }); setPriceOpen(false); },
  });

  const saveSale = useMutation({
    mutationFn: (f: any) => api("POST", "/api/agriculture/sales", f),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["ag-sales"] }); setSaleOpen(false); },
  });

  const setP = (k: string, v: string) => setPriceForm(p => ({ ...p, [k]: v }));
  const setS = (k: string, v: string) => setSaleForm(p => ({ ...p, [k]: v }));

  const totalSales = sales.reduce((s: number, sale: any) => s + Number(sale.total_value || 0), 0);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Market & Sales</h1>

      <Tabs defaultValue="prices">
        <TabsList>
          <TabsTrigger value="prices">Market Prices</TabsTrigger>
          <TabsTrigger value="sales">Sales</TabsTrigger>
        </TabsList>

        <TabsContent value="prices" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Button onClick={() => { setPriceForm({ ...EMPTY_PRICE }); setPriceOpen(true); }}><Plus className="w-4 h-4 mr-2" />Add Price</Button>
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Commodity</TableHead><TableHead>Mandi</TableHead>
                    <TableHead>Price / Unit</TableHead><TableHead>Unit</TableHead><TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {prices.map((p: any) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.commodity}</TableCell>
                      <TableCell>{p.mandi}</TableCell>
                      <TableCell>₹{Number(p.price_per_unit).toLocaleString("en-IN")}</TableCell>
                      <TableCell>{p.unit}</TableCell>
                      <TableCell>{p.date}</TableCell>
                    </TableRow>
                  ))}
                  {prices.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No prices recorded</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sales" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Total Sales: <span className="font-bold text-foreground">₹{totalSales.toLocaleString("en-IN")}</span></p>
            <Button onClick={() => { setSaleForm({ ...EMPTY_SALE }); setSaleOpen(true); }}><Plus className="w-4 h-4 mr-2" />Add Sale</Button>
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Crop</TableHead><TableHead>Buyer</TableHead><TableHead>Quantity</TableHead>
                    <TableHead>Rate</TableHead><TableHead>Total Value</TableHead><TableHead>Payment</TableHead><TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sales.map((s: any) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.crop_name}</TableCell>
                      <TableCell>{s.buyer}</TableCell>
                      <TableCell>{s.quantity} {s.unit}</TableCell>
                      <TableCell>₹{s.rate}</TableCell>
                      <TableCell className="font-semibold">₹{Number(s.total_value).toLocaleString("en-IN")}</TableCell>
                      <TableCell><Badge variant="outline">{s.payment_mode}</Badge></TableCell>
                      <TableCell>{s.sale_date}</TableCell>
                    </TableRow>
                  ))}
                  {sales.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No sales recorded</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={priceOpen} onOpenChange={setPriceOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add Market Price</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div><label className="text-sm font-medium mb-1 block">Commodity</label><Input value={priceForm.commodity} onChange={e => setP("commodity", e.target.value)} /></div>
            <div><label className="text-sm font-medium mb-1 block">Mandi</label><Input value={priceForm.mandi} onChange={e => setP("mandi", e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-sm font-medium mb-1 block">Price / Unit</label><Input type="number" value={priceForm.price_per_unit} onChange={e => setP("price_per_unit", e.target.value)} /></div>
              <div><label className="text-sm font-medium mb-1 block">Unit</label><Input value={priceForm.unit} onChange={e => setP("unit", e.target.value)} /></div>
            </div>
            <div><label className="text-sm font-medium mb-1 block">Date</label><Input type="date" value={priceForm.date} onChange={e => setP("date", e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPriceOpen(false)}>Cancel</Button>
            <Button onClick={() => savePrice.mutate(priceForm)} disabled={savePrice.isPending}>{savePrice.isPending ? "Saving..." : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={saleOpen} onOpenChange={setSaleOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Sale</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="col-span-2"><label className="text-sm font-medium mb-1 block">Crop</label>
              <Select value={saleForm.crop_id} onValueChange={v => setS("crop_id", v)}>
                <SelectTrigger><SelectValue placeholder="Select crop" /></SelectTrigger>
                <SelectContent>{crops.map((c: any) => <SelectItem key={c.id} value={String(c.id)}>{c.crop_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><label className="text-sm font-medium mb-1 block">Buyer</label><Input value={saleForm.buyer} onChange={e => setS("buyer", e.target.value)} /></div>
            <div><label className="text-sm font-medium mb-1 block">Quantity</label><Input type="number" value={saleForm.quantity} onChange={e => setS("quantity", e.target.value)} /></div>
            <div><label className="text-sm font-medium mb-1 block">Unit</label><Input value={saleForm.unit} onChange={e => setS("unit", e.target.value)} /></div>
            <div><label className="text-sm font-medium mb-1 block">Rate (₹)</label><Input type="number" value={saleForm.rate} onChange={e => setS("rate", e.target.value)} /></div>
            <div><label className="text-sm font-medium mb-1 block">Payment Mode</label>
              <Select value={saleForm.payment_mode} onValueChange={v => setS("payment_mode", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PAYMENT_MODES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><label className="text-sm font-medium mb-1 block">Sale Date</label><Input type="date" value={saleForm.sale_date} onChange={e => setS("sale_date", e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaleOpen(false)}>Cancel</Button>
            <Button onClick={() => saveSale.mutate(saleForm)} disabled={saveSale.isPending}>{saveSale.isPending ? "Saving..." : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
