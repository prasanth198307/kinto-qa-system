import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";

const api = (m: string, u: string, b?: any) =>
  fetch(u, { method: m, headers: { "Content-Type": "application/json" }, body: b ? JSON.stringify(b) : undefined, credentials: "include" }).then(r => r.json());
const fmt = (n: any) => Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

export default function EcommerceSettlementsPage() {
  const { toast } = useToast();
  const { data: settlements = [] } = useQuery({ queryKey: ["/api/ecommerce/settlements"], queryFn: () => api("GET", "/api/ecommerce/settlements") });
  const { data: adSpend = [] } = useQuery({ queryKey: ["/api/ecommerce/marketing/ad-spend"], queryFn: () => api("GET", "/api/ecommerce/marketing/ad-spend") });

  const rows = Array.isArray(settlements) ? settlements : [];
  const channels = [...new Set(rows.map((s: any) => s.channel))];

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Settlements</h1>
      <div className="grid grid-cols-3 gap-4">
        {channels.map(ch => {
          const chRows = rows.filter((s: any) => s.channel === ch);
          const net = chRows.reduce((sum: number, s: any) => sum + Number(s.net_settlement || 0), 0);
          return (
            <Card key={ch as string}>
              <CardHeader><CardTitle className="text-sm">{ch as string}</CardTitle></CardHeader>
              <CardContent><p className="text-xl font-bold">&#8377;{fmt(net)}</p><p className="text-xs text-muted-foreground">Net Settlement</p></CardContent>
            </Card>
          );
        })}
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Settlement ID</TableHead><TableHead>Channel</TableHead><TableHead>Period</TableHead>
              <TableHead>Gross Sales</TableHead><TableHead>Mkt Fees</TableHead><TableHead>Ad Spend</TableHead>
              <TableHead>Shipping</TableHead><TableHead>Returns</TableHead><TableHead>Net</TableHead>
              <TableHead>Status</TableHead><TableHead></TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {rows.map((s: any) => (
                <TableRow key={s.settlement_id || s.id}>
                  <TableCell>{s.settlement_id}</TableCell><TableCell>{s.channel}</TableCell><TableCell>{s.period}</TableCell>
                  <TableCell>&#8377;{fmt(s.gross_sales)}</TableCell><TableCell>&#8377;{fmt(s.marketplace_fees)}</TableCell>
                  <TableCell>&#8377;{fmt(s.ads_spend)}</TableCell><TableCell>&#8377;{fmt(s.shipping_charges)}</TableCell>
                  <TableCell>&#8377;{fmt(s.returns_deducted)}</TableCell><TableCell className="font-bold">&#8377;{fmt(s.net_settlement)}</TableCell>
                  <TableCell><Badge>{s.status}</Badge></TableCell>
                  <TableCell><Button size="sm" variant="outline" onClick={() => toast({ title: "Reconcile initiated (placeholder)" })}>Reconcile</Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
