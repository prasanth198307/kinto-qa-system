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

export default function AgricultureInputsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ farmer_id: "", crop_id: "", input_type: "", item_name: "", quantity: "", unit: "", unit_cost: "", issue_date: "" });

  const { data: inputs = [] } = useQuery({ queryKey: ["/api/agriculture/inputs"], queryFn: () => api("GET", "/api/agriculture/inputs") });

  const addMutation = useMutation({
    mutationFn: (data: any) => api("POST", "/api/agriculture/inputs", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/agriculture/inputs"] }); setShowForm(false); toast({ title: "Input issued" }); },
    onError: () => toast({ title: "Error", variant: "destructive" }),
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Crop Inputs</h1>
        <Button onClick={() => setShowForm(!showForm)}>+ Issue Input</Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle>Issue Input</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm">Input Type</label>
                <Select value={form.input_type} onValueChange={v => setForm(p => ({...p, input_type: v}))}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    {["seed","fertilizer","pesticide","equipment"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {["farmer_id","crop_id","item_name","quantity","unit","unit_cost","issue_date"].map(k => (
                <div key={k}>
                  <label className="text-sm capitalize">{k.replace(/_/g," ")}</label>
                  <Input type={k.includes("date") ? "date" : "text"} value={(form as any)[k]} onChange={e => setForm(p => ({...p,[k]:e.target.value}))} />
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
        <CardHeader><CardTitle>Inputs Issued</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead><TableHead>Farmer</TableHead><TableHead>Type</TableHead>
                <TableHead>Item</TableHead><TableHead>Qty</TableHead><TableHead>Unit</TableHead>
                <TableHead>Cost</TableHead><TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inputs.map((inp: any) => (
                <TableRow key={inp.id}>
                  <TableCell>{inp.issue_date}</TableCell>
                  <TableCell>{inp.farmer_name}</TableCell>
                  <TableCell><Badge variant="outline">{inp.input_type}</Badge></TableCell>
                  <TableCell>{inp.item_name}</TableCell>
                  <TableCell>{inp.quantity}</TableCell>
                  <TableCell>{inp.unit}</TableCell>
                  <TableCell>₹{fmt(inp.cost || inp.unit_cost)}</TableCell>
                  <TableCell><Badge variant={inp.status === "returned" ? "secondary" : "default"}>{inp.status || "issued"}</Badge></TableCell>
                </TableRow>
              ))}
              {inputs.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">No inputs found</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
