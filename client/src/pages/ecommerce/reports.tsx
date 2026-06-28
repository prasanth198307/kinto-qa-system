import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const api = (m: string, u: string, b?: any) =>
  fetch(u, { method: m, headers: { "Content-Type": "application/json" }, body: b ? JSON.stringify(b) : undefined, credentials: "include" }).then(r => r.json());
const fmt = (n: any) => Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

const REPORT_TYPES = [
  { value: "channel-performance", label: "Channel Performance" },
  { value: "return-rate-analysis", label: "Return Rate Analysis" },
  { value: "product-wise-sales", label: "Product-wise Sales" },
  { value: "fulfillment-tat", label: "Fulfillment TAT" },
  { value: "customer-ltv", label: "Customer LTV" },
];

export default function EcommerceReportsPage() {
  const [reportType, setReportType] = useState("channel-performance");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [channel, setChannel] = useState("all");
  const [enabled, setEnabled] = useState(false);

  const url = `/api/ecommerce/reports/${reportType}?from=${from}&to=${to}&channel=${channel}`;
  const { data: reportData, isFetching } = useQuery({
    queryKey: ["/api/ecommerce/reports", reportType, from, to, channel, enabled],
    queryFn: () => api("GET", url),
    enabled,
  });

  const rows = Array.isArray(reportData) ? reportData : [];
  const cols = rows.length > 0 ? Object.keys(rows[0]) : [];

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">E-Commerce Reports</h1>
      <div className="flex gap-2 flex-wrap">
        <Select value={reportType} onValueChange={setReportType}>
          <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
          <SelectContent>
            {REPORT_TYPES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={channel} onValueChange={setChannel}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Channel" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Channels</SelectItem>
            {["Amazon","Flipkart","Meesho","Shopify","Website"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input type="date" value={from} onChange={e => setFrom(e.target.value)} className="w-36" />
        <Input type="date" value={to} onChange={e => setTo(e.target.value)} className="w-36" />
        <Button onClick={() => setEnabled(true)} disabled={isFetching}>{isFetching ? "Loading..." : "Fetch Report"}</Button>
      </div>
      {rows.length > 0 && (
        <Card>
          <CardHeader><CardTitle>{REPORT_TYPES.find(r => r.value === reportType)?.label}</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader><TableRow>{cols.map(c => <TableHead key={c}>{c}</TableHead>)}</TableRow></TableHeader>
              <TableBody>
                {rows.map((row: any, i: number) => (
                  <TableRow key={i}>
                    {cols.map(c => <TableCell key={c}>{typeof row[c] === "number" ? fmt(row[c]) : String(row[c] ?? "")}</TableCell>)}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
