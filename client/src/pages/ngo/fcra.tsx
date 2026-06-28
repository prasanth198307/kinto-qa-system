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

export default function NGOFCRAPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ donor_name: "", donor_country: "", currency: "USD", amount_foreign: "", amount_inr: "", purpose: "", transaction_date: "" });

  const { data: contributions = [] } = useQuery({ queryKey: ["/api/ngo/fcra/foreign-contributions"], queryFn: () => api("GET", "/api/ngo/fcra/foreign-contributions") });
  const { data: fcraInfo } = useQuery({ queryKey: ["/api/ngo/fcra/info"], queryFn: () => api("GET", "/api/ngo/fcra/info") });

  const addMutation = useMutation({
    mutationFn: (d: any) => api("POST", "/api/ngo/fcra/foreign-contributions", d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/ngo/fcra/foreign-contributions"] }); setShowForm(false); toast({ title: "Contribution recorded" }); },
    onError: () => toast({ title: "Error", variant: "destructive" }),
  });

  const totalInr = contributions.reduce((s: number, c: any) => s + Number(c.amount_inr || 0), 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">FCRA Compliance</h1>
        <Button onClick={() => setShowForm(!showForm)}>+ Add Contribution</Button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>FCRA Registration</CardTitle></CardHeader>
          <CardContent>
            {fcraInfo ? (
              <div className="space-y-2 text-sm">
                <div><span className="font-medium">Registration No:</span> {fcraInfo.registration_no}</div>
                <div><span className="font-medium">Valid Upto:</span> {fcraInfo.valid_upto}</div>
                <div><span className="font-medium">Designated Bank:</span> {fcraInfo.designated_bank}</div>
                <div><span className="font-medium">Bank Account:</span> {fcraInfo.bank_account}</div>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">No FCRA registration info available.</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-blue-600">₹{fmt(totalInr)}</div>
            <div className="text-sm text-muted-foreground">Total Foreign Contributions (INR)</div>
            <div className="text-2xl font-bold mt-3">{contributions.length}</div>
            <div className="text-sm text-muted-foreground">Total Transactions</div>
          </CardContent>
        </Card>
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle>Record Foreign Contribution</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              {["donor_name","donor_country","amount_foreign","amount_inr","purpose","transaction_date"].map(k => (
                <div key={k}>
                  <label className="text-sm font-medium capitalize">{k.replace(/_/g," ")}</label>
                  <Input
                    type={k.includes("date") ? "date" : k.includes("amount") ? "number" : "text"}
                    value={(form as any)[k]}
                    onChange={e => setForm(p => ({...p, [k]: e.target.value}))}
                  />
                </div>
              ))}
              <div>
                <label className="text-sm font-medium">Currency</label>
                <Select value={form.currency} onValueChange={v => setForm(p => ({...p, currency: v}))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                    <SelectItem value="JPY">JPY</SelectItem>
                    <SelectItem value="AUD">AUD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button onClick={() => addMutation.mutate(form)} disabled={addMutation.isPending}>Save</Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Foreign Contributions Log</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead><TableHead>Donor</TableHead><TableHead>Country</TableHead>
                <TableHead>Currency</TableHead><TableHead>Foreign Amt</TableHead><TableHead>INR</TableHead><TableHead>Purpose</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contributions.map((c: any) => (
                <TableRow key={c.id}>
                  <TableCell>{c.date}</TableCell>
                  <TableCell>{c.donor_name}</TableCell>
                  <TableCell>{c.country}</TableCell>
                  <TableCell><Badge variant="secondary">{c.currency}</Badge></TableCell>
                  <TableCell>{fmt(c.amount_foreign)}</TableCell>
                  <TableCell>₹{fmt(c.amount_inr)}</TableCell>
                  <TableCell>{c.purpose}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
