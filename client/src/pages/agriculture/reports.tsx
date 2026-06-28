import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const api = (m: string, u: string, b?: any) =>
  fetch(u, { method: m, headers: { "Content-Type": "application/json" }, body: b ? JSON.stringify(b) : undefined, credentials: "include" }).then(r => r.json());

const REPORT_TYPES = ["farmer-summary","crop-production","input-utilization","harvest-report","scheme-beneficiaries"];

export default function AgricultureReportsPage() {
  const [type, setType] = useState("farmer-summary");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [enabled, setEnabled] = useState(false);

  const { data = [], isFetching } = useQuery({
    queryKey: ["/api/agriculture/reports", type, from, to],
    queryFn: () => api("GET", `/api/agriculture/reports/${type}?from=${from}&to=${to}`),
    enabled,
  });

  const cols = data.length > 0 ? Object.keys(data[0]) : [];

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Agriculture Reports</h1>
      <Card>
        <CardContent className="pt-4">
          <div className="flex gap-3 flex-wrap">
            <Select value={type} onValueChange={v => { setType(v); setEnabled(false); }}>
              <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
              <SelectContent>{REPORT_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace(/-/g," ")}</SelectItem>)}</SelectContent>
            </Select>
            <Input type="date" value={from} onChange={e => setFrom(e.target.value)} className="w-40" placeholder="From" />
            <Input type="date" value={to} onChange={e => setTo(e.target.value)} className="w-40" placeholder="To" />
            <Button onClick={() => setEnabled(true)}>Generate</Button>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="capitalize">{type.replace(/-/g," ")}</CardTitle></CardHeader>
        <CardContent>
          {isFetching ? <p className="text-muted-foreground">Loading...</p> : (
            <Table>
              <TableHeader>
                <TableRow>{cols.map(c => <TableHead key={c} className="capitalize">{c.replace(/_/g," ")}</TableHead>)}</TableRow>
              </TableHeader>
              <TableBody>
                {data.map((row: any, i: number) => (
                  <TableRow key={i}>{cols.map(c => <TableCell key={c}>{row[c]}</TableCell>)}</TableRow>
                ))}
                {data.length === 0 && <TableRow><TableCell colSpan={Math.max(cols.length,1)} className="text-center text-muted-foreground">No data — generate a report above</TableCell></TableRow>}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
