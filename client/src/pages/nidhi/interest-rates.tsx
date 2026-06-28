import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const api = (m: string, u: string, b?: any) =>
  fetch(u, { method: m, headers: { "Content-Type": "application/json" }, body: b ? JSON.stringify(b) : undefined, credentials: "include" }).then(r => r.json());

export default function NidhiInterestRatesPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ product_type: "", tenure_from_months: "", tenure_to_months: "", interest_rate: "", effective_from: "" });

  const { data: rates = [] } = useQuery({ queryKey: ["/api/nidhi/interest-rates"], queryFn: () => api("GET", "/api/nidhi/interest-rates") });

  const addMutation = useMutation({
    mutationFn: (data: any) => api("POST", "/api/nidhi/interest-rates", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/nidhi/interest-rates"] }); setShowForm(false); toast({ title: "Rate updated" }); },
    onError: () => toast({ title: "Error", variant: "destructive" }),
  });

  const PRODUCTS = ["FD","RD","Gold Loan","Personal Loan","Housing Loan"];

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Interest Rates</h1>
        <Button onClick={() => setShowForm(!showForm)}>+ Add / Update Rate</Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle>Add / Update Rate</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm">Product Type</label>
                <Select value={form.product_type} onValueChange={v => setForm(p => ({...p, product_type: v}))}>
                  <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
                  <SelectContent>{PRODUCTS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              {["tenure_from_months","tenure_to_months","interest_rate","effective_from"].map(k => (
                <div key={k}>
                  <label className="text-sm capitalize">{k.replace(/_/g," ")}</label>
                  <Input type={k.includes("from") && !k.includes("months") ? "date" : "text"} value={(form as any)[k]} onChange={e => setForm(p => ({...p,[k]:e.target.value}))} />
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-4">
              <Button onClick={() => addMutation.mutate(form)}>Save</Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Interest Rate Matrix</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product Type</TableHead><TableHead>Tenure From (Mo)</TableHead><TableHead>Tenure To (Mo)</TableHead>
                <TableHead>Interest Rate %</TableHead><TableHead>Effective From</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rates.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.product_type}</TableCell>
                  <TableCell>{r.tenure_from_months}</TableCell>
                  <TableCell>{r.tenure_to_months}</TableCell>
                  <TableCell>{r.interest_rate}%</TableCell>
                  <TableCell>{r.effective_from}</TableCell>
                </TableRow>
              ))}
              {rates.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No rates configured</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
