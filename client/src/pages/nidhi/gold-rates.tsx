import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";

const api = (m: string, u: string, b?: any) =>
  fetch(u, { method: m, headers: { "Content-Type": "application/json" }, body: b ? JSON.stringify(b) : undefined, credentials: "include" }).then(r => r.json());
const fmt = (n: any) => Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

export default function NidhiGoldRatesPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [rateForm, setRateForm] = useState({ date: "", rate_24k: "", rate_22k: "", rate_18k: "" });
  const [weight, setWeight] = useState("");

  const { data: rates = [] } = useQuery({ queryKey: ["/api/nidhi/gold-rates"], queryFn: () => api("GET", "/api/nidhi/gold-rates") });

  const addMutation = useMutation({
    mutationFn: (data: any) => api("POST", "/api/nidhi/gold-rates", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/nidhi/gold-rates"] }); toast({ title: "Gold rate updated" }); },
    onError: () => toast({ title: "Error", variant: "destructive" }),
  });

  const today = rates[0] || {};
  const w = Number(weight || 0);
  const val24 = w * Number(today.rate_24k || 0);
  const ltv = val24 * 0.75;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Gold Rates</h1>

      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold">₹{fmt(today.rate_24k)}/g</div><div className="text-sm text-muted-foreground">24K Gold</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold">₹{fmt(today.rate_22k)}/g</div><div className="text-sm text-muted-foreground">22K Gold</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold">₹{fmt(today.rate_18k)}/g</div><div className="text-sm text-muted-foreground">18K Gold</div></CardContent></Card>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Update Today's Rate</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {["date","rate_24k","rate_22k","rate_18k"].map(k => (
                <div key={k}>
                  <label className="text-sm capitalize">{k.replace(/_/g," ")}</label>
                  <Input type={k === "date" ? "date" : "text"} value={(rateForm as any)[k]} onChange={e => setRateForm(p => ({...p,[k]:e.target.value}))} />
                </div>
              ))}
            </div>
            <Button className="mt-3" onClick={() => addMutation.mutate(rateForm)}>Update Rate</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Gold Loan Valuation (24K @ 75% LTV)</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-sm">Weight (grams)</label>
              <Input value={weight} onChange={e => setWeight(e.target.value)} placeholder="e.g. 10" />
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between"><span>Gold Value (24K)</span><span className="font-semibold">₹{fmt(val24)}</span></div>
              <div className="flex justify-between"><span>Max Loan (75% LTV)</span><span className="font-semibold text-green-700">₹{fmt(ltv)}</span></div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Rate History</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead><TableHead>24K (₹/g)</TableHead><TableHead>22K (₹/g)</TableHead>
                <TableHead>18K (₹/g)</TableHead><TableHead>Entered By</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rates.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell>{r.date}</TableCell>
                  <TableCell>₹{fmt(r.rate_24k)}</TableCell>
                  <TableCell>₹{fmt(r.rate_22k)}</TableCell>
                  <TableCell>₹{fmt(r.rate_18k)}</TableCell>
                  <TableCell>{r.entered_by}</TableCell>
                </TableRow>
              ))}
              {rates.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No rate history</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
