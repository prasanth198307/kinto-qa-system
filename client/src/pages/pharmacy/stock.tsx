import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const api = (m: string, u: string, b?: any) =>
  fetch(u, { method: m, headers: { "Content-Type": "application/json" }, body: b ? JSON.stringify(b) : undefined, credentials: "include" }).then(r => r.json());
const fmt = (n: any) => Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

export default function PharmacyStockPage() {
  const [tab, setTab] = useState<"stock"|"expiry">("stock");

  const { data: stock = [] } = useQuery({ queryKey: ["/api/pharmacy/stock"], queryFn: () => api("GET", "/api/pharmacy/stock") });
  const { data: expiryAlerts = [] } = useQuery({ queryKey: ["/api/pharmacy/stock/expiry-alerts"], queryFn: () => api("GET", "/api/pharmacy/stock/expiry-alerts") });

  const daysUntil = (d: string) => Math.floor((new Date(d).getTime() - Date.now()) / 86400000);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Stock Management</h1>

      <div className="flex gap-2">
        <button onClick={() => setTab("stock")} className={"px-4 py-2 rounded-md text-sm font-medium " + (tab==="stock" ? "bg-primary text-primary-foreground" : "bg-muted")}>Current Stock</button>
        <button onClick={() => setTab("expiry")} className={"px-4 py-2 rounded-md text-sm font-medium " + (tab==="expiry" ? "bg-primary text-primary-foreground" : "bg-muted")}>
          Expiry Alerts {expiryAlerts.length > 0 && <span className="ml-1 bg-red-500 text-white rounded-full px-1.5 text-xs">{expiryAlerts.length}</span>}
        </button>
      </div>

      {tab === "stock" && (
        <Card><CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Medicine</TableHead><TableHead>Batch No</TableHead><TableHead>Expiry</TableHead>
              <TableHead>Quantity</TableHead><TableHead>MRP</TableHead><TableHead>Purchase Price</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {stock.map((s: any) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.medicine_name}</TableCell>
                  <TableCell className="font-mono">{s.batch_no}</TableCell>
                  <TableCell>{s.expiry_date ? new Date(s.expiry_date).toLocaleDateString() : "—"}</TableCell>
                  <TableCell><Badge variant={s.quantity < 10 ? "destructive" : "secondary"}>{s.quantity}</Badge></TableCell>
                  <TableCell className="text-right">{fmt(s.mrp)}</TableCell>
                  <TableCell className="text-right">{fmt(s.purchase_price)}</TableCell>
                </TableRow>
              ))}
              {stock.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No stock data</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent></Card>
      )}

      {tab === "expiry" && (
        <Card><CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Medicine</TableHead><TableHead>Batch No</TableHead><TableHead>Expiry Date</TableHead>
              <TableHead>Days Left</TableHead><TableHead>Quantity</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {expiryAlerts.map((a: any) => {
                const days = daysUntil(a.expiry_date);
                return (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.medicine_name}</TableCell>
                    <TableCell className="font-mono">{a.batch_no}</TableCell>
                    <TableCell>{new Date(a.expiry_date).toLocaleDateString()}</TableCell>
                    <TableCell><Badge variant={days < 0 ? "destructive" : days < 30 ? "destructive" : days < 60 ? "outline" : "secondary"}>{days < 0 ? "Expired" : days + "d"}</Badge></TableCell>
                    <TableCell>{a.quantity}</TableCell>
                  </TableRow>
                );
              })}
              {expiryAlerts.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No expiry alerts</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent></Card>
      )}
    </div>
  );
}
