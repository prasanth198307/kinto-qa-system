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

export default function NGOGrantsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ grant_name: "", funder_name: "", amount: "", start_date: "", end_date: "", reporting_frequency: "quarterly", conditions: "" });

  const { data: grants = [] } = useQuery({ queryKey: ["/api/ngo/grants"], queryFn: () => api("GET", "/api/ngo/grants") });

  const addMutation = useMutation({
    mutationFn: (d: any) => api("POST", "/api/ngo/grants", d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/ngo/grants"] }); setShowForm(false); toast({ title: "Grant added" }); },
    onError: () => toast({ title: "Error", variant: "destructive" }),
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Grants</h1>
        <Button onClick={() => setShowForm(!showForm)}>+ Add Grant</Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle>Add Grant</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              {["grant_name","funder_name","amount","start_date","end_date","conditions"].map(k => (
                <div key={k}>
                  <label className="text-sm font-medium capitalize">{k.replace(/_/g," ")}</label>
                  <Input
                    type={k.includes("date") ? "date" : k === "amount" ? "number" : "text"}
                    value={(form as any)[k]}
                    onChange={e => setForm(p => ({...p, [k]: e.target.value}))}
                  />
                </div>
              ))}
              <div>
                <label className="text-sm font-medium">Reporting Frequency</label>
                <Select value={form.reporting_frequency} onValueChange={v => setForm(p => ({...p, reporting_frequency: v}))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="annually">Annually</SelectItem>
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
        <CardHeader><CardTitle>Grants</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Grant</TableHead><TableHead>Funder</TableHead><TableHead>Amount</TableHead>
                <TableHead>Start</TableHead><TableHead>End</TableHead><TableHead>Utilization</TableHead><TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {grants.map((g: any) => {
                const pct = g.amount > 0 ? Math.min(100, Math.round((g.utilization / g.amount) * 100)) : 0;
                return (
                  <TableRow key={g.id}>
                    <TableCell>{g.grant_name}</TableCell>
                    <TableCell>{g.funder}</TableCell>
                    <TableCell>₹{fmt(g.amount)}</TableCell>
                    <TableCell>{g.start_date}</TableCell>
                    <TableCell>{g.end_date}</TableCell>
                    <TableCell>
                      <div className="w-32">
                        <div className="flex justify-between text-xs mb-1"><span>₹{fmt(g.utilization)}</span><span>{pct}%</span></div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                          <div className="h-1.5 rounded-full bg-blue-500" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell><Badge variant={g.status === "active" ? "default" : "secondary"}>{g.status}</Badge></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
