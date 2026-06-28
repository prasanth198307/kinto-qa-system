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
const fmt = (n: any) => Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

export default function AgricultureMarketPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [selectedCommodity, setSelectedCommodity] = useState("");
  const [form, setForm] = useState({ commodity: "", mandi_name: "", state: "", min_price: "", modal_price: "", max_price: "", date: "" });

  const { data: prices = [] } = useQuery({ queryKey: ["/api/agriculture/mandi-prices"], queryFn: () => api("GET", "/api/agriculture/mandi-prices") });

  const addMutation = useMutation({
    mutationFn: (data: any) => api("POST", "/api/agriculture/mandi-prices", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/agriculture/mandi-prices"] }); setShowForm(false); toast({ title: "Price updated" }); },
    onError: () => toast({ title: "Error", variant: "destructive" }),
  });

  const commodities = [...new Set(prices.map((p: any) => p.commodity))];
  const trend = selectedCommodity ? prices.filter((p: any) => p.commodity === selectedCommodity).slice(-7) : [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Market Prices</h1>
        <Button onClick={() => setShowForm(!showForm)}>+ Add Price</Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle>Add / Update Mandi Price</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {["commodity","mandi_name","state","min_price","modal_price","max_price","date"].map(k => (
                <div key={k}>
                  <label className="text-sm capitalize">{k.replace(/_/g," ")}</label>
                  <Input type={k === "date" ? "date" : "text"} value={(form as any)[k]} onChange={e => setForm(p => ({...p,[k]:e.target.value}))} />
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
        <CardHeader><CardTitle>Mandi Prices</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Commodity</TableHead><TableHead>Mandi</TableHead><TableHead>State</TableHead>
                <TableHead>Min (₹/qtl)</TableHead><TableHead>Modal (₹/qtl)</TableHead><TableHead>Max (₹/qtl)</TableHead><TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {prices.map((p: any) => (
                <TableRow key={p.id}>
                  <TableCell>{p.commodity}</TableCell><TableCell>{p.mandi_name}</TableCell><TableCell>{p.state}</TableCell>
                  <TableCell>₹{fmt(p.min_price)}</TableCell><TableCell>₹{fmt(p.modal_price)}</TableCell>
                  <TableCell>₹{fmt(p.max_price)}</TableCell><TableCell>{p.date}</TableCell>
                </TableRow>
              ))}
              {prices.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">No price data</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>7-Day Price Trend</CardTitle>
            <Select value={selectedCommodity} onValueChange={setSelectedCommodity}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Select commodity" /></SelectTrigger>
              <SelectContent>{commodities.map((c: any) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow><TableHead>Date</TableHead><TableHead>Min</TableHead><TableHead>Modal</TableHead><TableHead>Max</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {trend.map((t: any) => (
                <TableRow key={t.id}><TableCell>{t.date}</TableCell><TableCell>₹{fmt(t.min_price)}</TableCell><TableCell>₹{fmt(t.modal_price)}</TableCell><TableCell>₹{fmt(t.max_price)}</TableCell></TableRow>
              ))}
              {trend.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">Select a commodity to view trend</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
