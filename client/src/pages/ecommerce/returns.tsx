import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const api = (m: string, u: string, b?: any) =>
  fetch(u, { method: m, headers: { "Content-Type": "application/json" }, body: b ? JSON.stringify(b) : undefined, credentials: "include" }).then(r => r.json());
const fmt = (n: any) => Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

export default function EcommerceReturnsPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [tab, setTab] = useState<"returns"|"rto">("returns");
  const [refundMode, setRefundMode] = useState<Record<string, string>>({});

  const { data: returns = [] } = useQuery({ queryKey: ["/api/ecommerce/returns"], queryFn: () => api("GET", "/api/ecommerce/returns") });

  const processMutation = useMutation({
    mutationFn: ({ id, action, refund_mode }: any) => api("POST", "/api/ecommerce/returns/" + id + "/process", { action, refund_mode }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/ecommerce/returns"] }); toast({ title: "Return processed" }); },
  });

  const allReturns = Array.isArray(returns) ? returns : [];
  const regularReturns = allReturns.filter((r: any) => r.type !== "rto");
  const rtoReturns = allReturns.filter((r: any) => r.type === "rto");

  const rows = tab === "returns" ? regularReturns : rtoReturns;

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Returns & RTO</h1>
      <div className="flex gap-2">
        <Button variant={tab === "returns" ? "default" : "outline"} onClick={() => setTab("returns")}>Returns</Button>
        <Button variant={tab === "rto" ? "default" : "outline"} onClick={() => setTab("rto")}>RTO</Button>
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Return ID</TableHead><TableHead>Order ID</TableHead><TableHead>Channel</TableHead>
              <TableHead>Product</TableHead><TableHead>Reason</TableHead><TableHead>Date</TableHead>
              <TableHead>Status</TableHead><TableHead>Refund Amt</TableHead><TableHead>Refund Status</TableHead>
              <TableHead>Action</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {rows.map((r: any) => (
                <TableRow key={r.return_id || r.id}>
                  <TableCell>{r.return_id}</TableCell><TableCell>{r.order_id}</TableCell><TableCell>{r.channel}</TableCell>
                  <TableCell>{r.product}</TableCell><TableCell>{r.reason}</TableCell>
                  <TableCell>{r.return_date?.slice(0,10)}</TableCell>
                  <TableCell><Badge>{r.status}</Badge></TableCell>
                  <TableCell>&#8377;{fmt(r.refund_amount)}</TableCell>
                  <TableCell><Badge variant="outline">{r.refund_status}</Badge></TableCell>
                  <TableCell>
                    <div className="flex gap-1 items-center">
                      <Select value={refundMode[r.return_id] || "original"} onValueChange={v => setRefundMode(m => ({ ...m, [r.return_id]: v }))}>
                        <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="original">Original</SelectItem>
                          <SelectItem value="wallet">Wallet</SelectItem>
                          <SelectItem value="store-credit">Store Credit</SelectItem>
                        </SelectContent>
                      </Select>
                      {tab === "returns" ? (
                        <>
                          <Button size="sm" onClick={() => processMutation.mutate({ id: r.return_id, action: "accept", refund_mode: refundMode[r.return_id] || "original" })}>Accept</Button>
                          <Button size="sm" variant="destructive" onClick={() => processMutation.mutate({ id: r.return_id, action: "reject", refund_mode: "none" })}>Reject</Button>
                        </>
                      ) : (
                        <>
                          <Button size="sm" onClick={() => toast({ title: "Re-dispatch initiated" })}>Re-dispatch</Button>
                          <Button size="sm" variant="secondary" onClick={() => toast({ title: "Written off" })}>Write-off</Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
