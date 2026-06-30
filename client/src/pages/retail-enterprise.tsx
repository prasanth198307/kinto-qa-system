import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const api = async (m: string, u: string, b?: any) => { const r = await fetch(u, { method: m, headers: {'Content-Type':'application/json'}, body: b ? JSON.stringify(b) : undefined, credentials: 'include' }); if (!r.ok) throw new Error(await r.text()); return r.json(); };
const fmt = (n: any) => Number(n||0).toLocaleString('en-IN', {maximumFractionDigits:2});

export default function RetailEnterprisePage() {
  const qc = useQueryClient();
  const [phone, setPhone] = useState(""); const [found, setFound] = useState<any>(null);
  const [bill, setBill] = useState(""); const [redeem, setRedeem] = useState("");
  const [reportType, setReportType] = useState("item-wise-sales"); const [from, setFrom] = useState(""); const [to, setTo] = useState("");
  const [reportData, setReportData] = useState<any[]>([]);
  const [hwResult, setHwResult] = useState<any>(null);
  const [shift, setShift] = useState({ cashier_name: "", opening_cash: "" });

  const { data: counters = [] } = useQuery({ queryKey: ['/api/pos/counters'], queryFn: () => api('GET', '/api/pos/counters') });
  const { data: shifts = [] } = useQuery({ queryKey: ['/api/pos/shifts'], queryFn: () => api('GET', '/api/pos/shifts') });
  const { data: expiry = [] } = useQuery({ queryKey: ['/api/pos/inventory/expiry-alerts'], queryFn: () => api('GET', '/api/pos/inventory/expiry-alerts') });
  const { data: dead = [] } = useQuery({ queryKey: ['/api/pos/inventory/dead-stock'], queryFn: () => api('GET', '/api/pos/inventory/dead-stock') });
  const { data: reorder = [] } = useQuery({ queryKey: ['/api/pos/reorder/pending'], queryFn: () => api('GET', '/api/pos/reorder/pending') });
  const { data: delivery = [] } = useQuery({ queryKey: ['/api/pos/delivery/orders'], queryFn: () => api('GET', '/api/pos/delivery/orders') });

  const openShift = useMutation({ mutationFn: (d: any) => api('POST', '/api/pos/shifts/open', d), onSuccess: () => qc.invalidateQueries({ queryKey: ['/api/pos/shifts'] }) });

  const lookup = async () => { const r = await api('GET', `/api/pos/loyalty/customers/${phone}/lookup`); setFound(r); };
  const earn = async () => { if (!found) return; const r = await api('POST', `/api/pos/loyalty/customers/${found.id}/earn`, { bill_amount: Number(bill) }); alert(`Earned ${r.points_earned} points!`); setFound({ ...found, loyalty_points: found.loyalty_points + r.points_earned }); };
  const redeemPoints = async () => { if (!found) return; await api('POST', `/api/pos/loyalty/customers/${found.id}/redeem`, { points_to_redeem: Number(redeem) }); alert("Points redeemed!"); };
  const fetchReport = async () => { const r = await api('GET', `/api/pos/reports/${reportType}?from=${from}&to=${to}`); setReportData(r); };
  const testScale = async () => { const r = await api('POST', '/api/pos/hardware/scale/read'); setHwResult(`Weight: ${r.weight} ${r.unit}`); };
  const openDrawer = async () => { const r = await api('POST', '/api/pos/hardware/cash-drawer/open'); setHwResult(r.message); };

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">Retail POS Enterprise</h1>
      <Tabs defaultValue="loyalty">
        <TabsList className="flex flex-wrap gap-1">
          <TabsTrigger value="hardware">Hardware</TabsTrigger>
          <TabsTrigger value="counters">Counters</TabsTrigger>
          <TabsTrigger value="loyalty">Loyalty</TabsTrigger>
          <TabsTrigger value="inventory">Inventory Alerts</TabsTrigger>
          <TabsTrigger value="delivery">Delivery</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="hardware">
          <Card><CardHeader><CardTitle>Hardware Integration</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {hwResult && <div className="p-3 bg-green-50 rounded text-green-800 font-medium">{hwResult}</div>}
            <div className="flex gap-3 flex-wrap">
              <Button onClick={testScale}>Test Weighing Scale</Button>
              <Button variant="outline" onClick={openDrawer}>Open Cash Drawer</Button>
              <Button variant="outline" onClick={() => api('POST','/api/pos/hardware/label-print',{qty:1}).then(()=>setHwResult('Label printed!'))}>Print Test Label</Button>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4">
              {['Essae Scale', 'Cash Drawer RJ11', 'Pole Display USB', 'Thermal Label Printer', 'Dot Matrix Printer', 'A4/A5 Invoice Printer'].map(h => (
                <div key={h} className="flex items-center justify-between p-3 border rounded">
                  <span className="text-sm">{h}</span>
                  <Badge variant="outline">Configure</Badge>
                </div>
              ))}
            </div>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="counters">
          <div className="grid grid-cols-2 gap-4">
            <Card><CardHeader><CardTitle>Counters</CardTitle></CardHeader>
            <CardContent>
              <Table><TableHeader><TableRow><TableHead>Counter</TableHead><TableHead>Code</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
              <TableBody>{(counters as any[]).map((c:any) => <TableRow key={c.id}><TableCell>{c.counter_name}</TableCell><TableCell>{c.counter_code}</TableCell><TableCell><Badge>{c.is_active?'Active':'Inactive'}</Badge></TableCell></TableRow>)}</TableBody></Table>
            </CardContent></Card>
            <Card><CardHeader><CardTitle>Open Shift</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div><Label>Cashier Name</Label><Input value={shift.cashier_name} onChange={e=>setShift({...shift,cashier_name:e.target.value})} /></div>
              <div><Label>Opening Cash (₹)</Label><Input type="number" value={shift.opening_cash} onChange={e=>setShift({...shift,opening_cash:e.target.value})} /></div>
              <Button onClick={()=>openShift.mutate({cashier_name:shift.cashier_name,opening_cash:Number(shift.opening_cash)})}>Open Shift</Button>
              <div className="mt-4">
                <h4 className="font-medium mb-2">Recent Shifts</h4>
                <Table><TableHeader><TableRow><TableHead>Cashier</TableHead><TableHead>Opening</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                <TableBody>{(shifts as any[]).slice(0,5).map((s:any)=><TableRow key={s.id}><TableCell>{s.cashier_name}</TableCell><TableCell>₹{fmt(s.opening_cash)}</TableCell><TableCell><Badge variant={s.status==='open'?'default':'secondary'}>{s.status}</Badge></TableCell></TableRow>)}</TableBody></Table>
              </div>
            </CardContent></Card>
          </div>
        </TabsContent>

        <TabsContent value="loyalty">
          <div className="grid grid-cols-2 gap-4">
            <Card><CardHeader><CardTitle>Customer Lookup</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2"><Input placeholder="Phone number" value={phone} onChange={e=>setPhone(e.target.value)} /><Button onClick={lookup}>Search</Button></div>
              {found && <div className="p-4 bg-blue-50 rounded space-y-2">
                <div className="font-bold">{found.name}</div>
                <div className="flex gap-4 text-sm">
                  <span>Points: <strong>{found.loyalty_points}</strong></span>
                  <span>Tier: <Badge>{found.loyalty_tier}</Badge></span>
                  <span>Visits: <strong>{found.total_visits}</strong></span>
                </div>
                <div className="text-sm">Total Spend: ₹{fmt(found.total_spend)}</div>
                <div className="flex gap-2 mt-2">
                  <Input placeholder="Bill amount ₹" value={bill} onChange={e=>setBill(e.target.value)} className="w-32" />
                  <Button size="sm" onClick={earn}>Earn Points</Button>
                </div>
                <div className="flex gap-2">
                  <Input placeholder="Points to redeem" value={redeem} onChange={e=>setRedeem(e.target.value)} className="w-32" />
                  <Button size="sm" variant="outline" onClick={redeemPoints}>Redeem</Button>
                </div>
              </div>}
            </CardContent></Card>
            <Card><CardHeader><CardTitle>Loyalty Config</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>Points earned: 1 point per ₹50</p>
              <p>Redemption: ₹0.25 per point</p>
              <p>Min redemption: 10 points</p>
              <p>Tiers: Bronze (0-499) | Silver (500-1999) | Gold (2000+)</p>
            </CardContent></Card>
          </div>
        </TabsContent>

        <TabsContent value="inventory">
          <Tabs defaultValue="expiry">
            <TabsList><TabsTrigger value="expiry">Expiry ({(expiry as any[]).length})</TabsTrigger><TabsTrigger value="dead">Dead Stock ({(dead as any[]).length})</TabsTrigger><TabsTrigger value="reorder">Reorder ({(reorder as any[]).length})</TabsTrigger></TabsList>
            <TabsContent value="expiry"><Card><CardContent className="pt-4">
              <Table><TableHeader><TableRow><TableHead>Product</TableHead><TableHead>Batch</TableHead><TableHead>Expiry</TableHead><TableHead>Qty</TableHead></TableRow></TableHeader>
              <TableBody>{(expiry as any[]).map((e:any,i:number)=><TableRow key={i}><TableCell>{e.product_name}</TableCell><TableCell>{e.batch_no}</TableCell><TableCell className="text-red-600">{e.expiry_date?.slice(0,10)}</TableCell><TableCell>{e.current_qty} {e.unit}</TableCell></TableRow>)}</TableBody></Table>
            </CardContent></Card></TabsContent>
            <TabsContent value="dead"><Card><CardContent className="pt-4">
              <Table><TableHeader><TableRow><TableHead>Product</TableHead><TableHead>Stock</TableHead><TableHead>Last Sale</TableHead></TableRow></TableHeader>
              <TableBody>{(dead as any[]).map((d:any,i:number)=><TableRow key={i}><TableCell>{d.product_name}</TableCell><TableCell>{d.current_stock} {d.unit}</TableCell><TableCell>{d.last_sale_date?.slice(0,10)||'Never'}</TableCell></TableRow>)}</TableBody></Table>
            </CardContent></Card></TabsContent>
            <TabsContent value="reorder"><Card><CardContent className="pt-4">
              <div className="flex justify-end mb-2"><Button size="sm" onClick={()=>api('POST','/api/pos/reorder/create-po',{product_ids:(reorder as any[]).map((r:any)=>r.id)}).then(r=>alert(r.message))}>Create PO for All</Button></div>
              <Table><TableHeader><TableRow><TableHead>Product</TableHead><TableHead>Current Stock</TableHead><TableHead>Reorder Level</TableHead></TableRow></TableHeader>
              <TableBody>{(reorder as any[]).map((r:any)=><TableRow key={r.id}><TableCell>{r.product_name}</TableCell><TableCell className="text-red-600">{r.current_stock}</TableCell><TableCell>{r.reorder_level}</TableCell></TableRow>)}</TableBody></Table>
            </CardContent></Card></TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="delivery">
          <Card><CardHeader><CardTitle>Home Delivery Orders</CardTitle></CardHeader>
          <CardContent>
            <Table><TableHeader><TableRow><TableHead>Order</TableHead><TableHead>Customer</TableHead><TableHead>Delivery Boy</TableHead><TableHead>Status</TableHead><TableHead>Action</TableHead></TableRow></TableHeader>
            <TableBody>{(delivery as any[]).map((d:any)=><TableRow key={d.id}><TableCell>{d.bill_id}</TableCell><TableCell>{d.delivery_boy_name}</TableCell><TableCell>{d.delivery_boy_phone}</TableCell><TableCell><Badge variant={d.status==='delivered'?'default':'secondary'}>{d.status}</Badge></TableCell><TableCell>{d.status!=='delivered'&&<Button size="sm" onClick={()=>api('PUT',`/api/pos/delivery/orders/${d.id}/delivered`).then(()=>qc.invalidateQueries({queryKey:['/api/pos/delivery/orders']}))}>Delivered</Button>}</TableCell></TableRow>)}</TableBody></Table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="reports">
          <Card><CardHeader><CardTitle>Reports</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3 flex-wrap items-end">
              <div><Label>Report</Label>
                <select className="border rounded px-2 py-1 text-sm" value={reportType} onChange={e=>setReportType(e.target.value)}>
                  {['item-wise-sales','category-wise','cashier-wise','gst-summary','profit-margin','expiry','dead-stock','payment-mode','hourly-sales'].map(r=><option key={r} value={r}>{r.replace(/-/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}</option>)}
                </select>
              </div>
              <div><Label>From</Label><Input type="date" value={from} onChange={e=>setFrom(e.target.value)} className="w-36" /></div>
              <div><Label>To</Label><Input type="date" value={to} onChange={e=>setTo(e.target.value)} className="w-36" /></div>
              <Button onClick={fetchReport}>Generate</Button>
            </div>
            {reportData.length > 0 && <div className="overflow-auto max-h-96">
              <Table><TableHeader><TableRow>{Object.keys(reportData[0]).map(k=><TableHead key={k}>{k}</TableHead>)}</TableRow></TableHeader>
              <TableBody>{reportData.map((row,i)=><TableRow key={i}>{Object.values(row).map((v:any,j)=><TableCell key={j}>{v}</TableCell>)}</TableRow>)}</TableBody></Table>
            </div>}
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
