import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, Download, Zap } from "lucide-react";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined, credentials: "include" }).then(r => r.json());

const fmt = (n: any) => Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
const fmtDate = (d: any) => d ? new Date(d).toLocaleDateString("en-IN") : "-";

const currentYear = new Date().getFullYear();
const FY_OPTIONS = Array.from({ length: 5 }, (_, i) => {
  const y = currentYear - i;
  return `${y - 1}-${String(y).slice(2)}`;
});

export default function EightyGPage() {
  const qc = useQueryClient();
  const [fyFilter, setFyFilter] = useState("all");
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkFY, setBulkFY] = useState(FY_OPTIONS[0]);

  const { data: receipts = [] } = useQuery({ queryKey: ["ngo-80g"], queryFn: () => api("GET", "/api/ngo/80g") });

  const bulkGenerate = useMutation({
    mutationFn: (financial_year: string) => api("POST", "/api/ngo/80g/bulk-generate", { financial_year }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["ngo-80g"] }); setBulkOpen(false); alert("Bulk 80G generation initiated"); },
  });

  const list = Array.isArray(receipts) ? receipts : [];
  const filtered = fyFilter === "all" ? list : list.filter((r: any) => r.financial_year === fyFilter);

  const totalAmount = filtered.reduce((s: number, r: any) => s + Number(r.amount || 0), 0);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">80G Receipts</h1>
        <Button onClick={() => setBulkOpen(true)}><Zap className="w-4 h-4 mr-1" />Bulk Generate</Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card><CardHeader className="pb-1"><CardTitle className="text-sm text-muted-foreground flex items-center gap-1"><FileText className="w-4 h-4" />Total Receipts</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{filtered.length}</p></CardContent></Card>
        <Card><CardHeader className="pb-1"><CardTitle className="text-sm text-muted-foreground">Total Amount</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">₹{fmt(totalAmount)}</p></CardContent></Card>
        <Card><CardHeader className="pb-1"><CardTitle className="text-sm text-muted-foreground">Financial Year</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{fyFilter === "all" ? "All" : fyFilter}</p></CardContent></Card>
      </div>

      <div className="flex gap-2">
        <Select value={fyFilter} onValueChange={setFyFilter}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Years</SelectItem>
            {FY_OPTIONS.map(fy => <SelectItem key={fy} value={fy}>{fy}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="border rounded-lg overflow-auto">
        <Table>
          <TableHeader><TableRow><TableHead>Receipt #</TableHead><TableHead>Donor Name</TableHead><TableHead>Donation Amount</TableHead><TableHead>Issued Date</TableHead><TableHead>Financial Year</TableHead><TableHead></TableHead></TableRow></TableHeader>
          <TableBody>
            {filtered.map((r: any) => (
              <TableRow key={r.id}>
                <TableCell className="font-mono text-xs">{r.receipt_number}</TableCell>
                <TableCell className="font-medium">{r.donor_name || r.donor?.name || "-"}</TableCell>
                <TableCell>₹{fmt(r.amount)}</TableCell>
                <TableCell>{fmtDate(r.issued_date)}</TableCell>
                <TableCell><Badge variant="outline">{r.financial_year}</Badge></TableCell>
                <TableCell>
                  <Button size="sm" variant="outline" onClick={() => alert("PDF generation coming soon")}>
                    <Download className="w-3 h-3 mr-1" />Download
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No receipts found</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>

      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Bulk Generate 80G Receipts</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Generate 80G receipts for all eligible donations in the selected financial year.</p>
            <div>
              <Label>Financial Year</Label>
              <Select value={bulkFY} onValueChange={setBulkFY}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{FY_OPTIONS.map(fy => <SelectItem key={fy} value={fy}>{fy}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkOpen(false)}>Cancel</Button>
            <Button onClick={() => bulkGenerate.mutate(bulkFY)} disabled={bulkGenerate.isPending}>{bulkGenerate.isPending ? "Generating…" : "Generate"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
