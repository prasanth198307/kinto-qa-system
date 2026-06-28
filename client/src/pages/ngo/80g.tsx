import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const api = (m: string, u: string, b?: any) =>
  fetch(u, { method: m, headers: { "Content-Type": "application/json" }, body: b ? JSON.stringify(b) : undefined, credentials: "include" }).then(r => r.json());
const fmt = (n: any) => Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

export default function NGO80GPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [fy, setFy] = useState("2025-26");

  const { data: receipts = [] } = useQuery({ queryKey: ["/api/ngo/receipts/80g"], queryFn: () => api("GET", "/api/ngo/receipts/80g") });

  const generateBulk = useMutation({
    mutationFn: () => api("POST", "/api/ngo/receipts/80g/generate-bulk", { financial_year: fy }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/ngo/receipts/80g"] }); toast({ title: "80G receipts generated" }); },
    onError: () => toast({ title: "Error", variant: "destructive" }),
  });

  const form10BDTotal = receipts.reduce((s: number, r: any) => s + Number(r.amount || 0), 0);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">80G Receipts</h1>

      <Card>
        <CardHeader><CardTitle>Generate Bulk 80G Receipts</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div>
              <label className="text-sm font-medium">Financial Year</label>
              <Select value={fy} onValueChange={setFy}>
                <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="2025-26">2025-26</SelectItem>
                  <SelectItem value="2024-25">2024-25</SelectItem>
                  <SelectItem value="2023-24">2023-24</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => generateBulk.mutate()} disabled={generateBulk.isPending}>
              {generateBulk.isPending ? "Generating..." : "Generate Receipts"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex justify-between">
            <CardTitle>Form 10BD Summary</CardTitle>
            <div className="text-sm text-muted-foreground">Total: ₹{fmt(form10BDTotal)}</div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Receipt No</TableHead><TableHead>Donor</TableHead><TableHead>PAN</TableHead>
                <TableHead>Amount</TableHead><TableHead>Date</TableHead><TableHead>Financial Year</TableHead>
                <TableHead>Status</TableHead><TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {receipts.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell>{r.receipt_no}</TableCell>
                  <TableCell>{r.donor_name}</TableCell>
                  <TableCell>{r.pan}</TableCell>
                  <TableCell>₹{fmt(r.amount)}</TableCell>
                  <TableCell>{r.date}</TableCell>
                  <TableCell>{r.financial_year}</TableCell>
                  <TableCell><Badge variant={r.status === "issued" ? "default" : "secondary"}>{r.status}</Badge></TableCell>
                  <TableCell>
                    <Button size="sm" variant="outline" onClick={() => window.open(`/api/ngo/receipts/80g/${r.id}/download`, "_blank")}>Download</Button>
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
