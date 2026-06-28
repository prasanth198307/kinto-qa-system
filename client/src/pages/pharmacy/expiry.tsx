import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";

const api = (m: string, u: string, b?: any) =>
  fetch(u, { method: m, headers: { "Content-Type": "application/json" }, body: b ? JSON.stringify(b) : undefined, credentials: "include" }).then(r => r.json());
const fmt = (n: any) => Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

type FilterTab = "expired" | "30" | "60" | "90";

export default function PharmacyExpiryPage() {
  const { toast } = useToast();
  const [tab, setTab] = useState<FilterTab>("30");

  const { data: alerts = [] } = useQuery({ queryKey: ["/api/pharmacy/stock/expiry-alerts"], queryFn: () => api("GET", "/api/pharmacy/stock/expiry-alerts") });

  const daysUntil = (d: string) => Math.floor((new Date(d).getTime() - Date.now()) / 86400000);

  const filtered = alerts.filter((a: any) => {
    const days = daysUntil(a.expiry_date);
    if (tab === "expired") return days < 0;
    if (tab === "30") return days >= 0 && days < 30;
    if (tab === "60") return days >= 30 && days < 60;
    if (tab === "90") return days >= 60 && days < 90;
    return false;
  });

  const TABS: { id: FilterTab; label: string }[] = [
    { id: "expired", label: "Expired" },
    { id: "30", label: "< 30 Days" },
    { id: "60", label: "30-60 Days" },
    { id: "90", label: "60-90 Days" },
  ];

  const tabCount = (t: FilterTab) => alerts.filter((a: any) => {
    const days = daysUntil(a.expiry_date);
    if (t === "expired") return days < 0;
    if (t === "30") return days >= 0 && days < 30;
    if (t === "60") return days >= 30 && days < 60;
    if (t === "90") return days >= 60 && days < 90;
    return false;
  }).length;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Expiry Alerts</h1>

      <div className="flex gap-2">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={"px-4 py-2 rounded-md text-sm font-medium " + (tab===t.id ? "bg-primary text-primary-foreground" : "bg-muted")}>
            {t.label} {tabCount(t.id) > 0 && <span className="ml-1 bg-red-500 text-white rounded-full px-1.5 text-xs">{tabCount(t.id)}</span>}
          </button>
        ))}
      </div>

      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Drug Name</TableHead><TableHead>Batch No</TableHead><TableHead>Expiry Date</TableHead>
            <TableHead>Days</TableHead><TableHead>Quantity</TableHead><TableHead>Value</TableHead><TableHead>Supplier</TableHead><TableHead>Action</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {filtered.map((a: any) => {
              const days = daysUntil(a.expiry_date);
              return (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.drug_name}</TableCell>
                  <TableCell className="font-mono">{a.batch_no}</TableCell>
                  <TableCell>{new Date(a.expiry_date).toLocaleDateString()}</TableCell>
                  <TableCell><Badge variant={days < 0 ? "destructive" : days < 30 ? "destructive" : "outline"}>{days < 0 ? "Expired" : days + "d"}</Badge></TableCell>
                  <TableCell>{a.quantity}</TableCell>
                  <TableCell className="text-right">{fmt(a.value)}</TableCell>
                  <TableCell>{a.supplier}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => toast({ title: "Return initiated for " + a.drug_name })}>Return</Button>
                      <Button size="sm" variant="destructive" onClick={() => toast({ title: "Marked for destroy: " + a.drug_name })}>Destroy</Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {filtered.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No items in this category</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
}
