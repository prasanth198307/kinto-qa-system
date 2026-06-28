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

export default function HotelRatesPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [form, setForm] = useState({ plan_name: "", room_type: "", weekday_rate: "", weekend_rate: "", includes_breakfast: false, valid_from: "", valid_to: "" });

  const { data: plans = [] } = useQuery({ queryKey: ["hotel-rate-plans"], queryFn: () => api("GET", "/api/hotel/rate-plans") });

  const addPlan = useMutation({
    mutationFn: () => api("POST", "/api/hotel/rate-plans", { ...form, weekday_rate: Number(form.weekday_rate), weekend_rate: Number(form.weekend_rate) }),
    onSuccess: () => { toast({ title: "Rate plan added" }); qc.invalidateQueries({ queryKey: ["hotel-rate-plans"] }); setForm({ plan_name: "", room_type: "", weekday_rate: "", weekend_rate: "", includes_breakfast: false, valid_from: "", valid_to: "" }); }
  });

  const planList: any[] = Array.isArray(plans) ? plans : (plans as any)?.plans || [];

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Rate Plans</h1>
      <Card>
        <CardHeader><CardTitle>Add Rate Plan</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-3 flex-wrap">
            <Input placeholder="Plan Name" value={form.plan_name} onChange={e => setForm(p => ({ ...p, plan_name: e.target.value }))} className="w-40" />
            <Select value={form.room_type} onValueChange={v => setForm(p => ({ ...p, room_type: v }))}>
              <SelectTrigger className="w-36"><SelectValue placeholder="Room Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="standard">Standard</SelectItem>
                <SelectItem value="deluxe">Deluxe</SelectItem>
                <SelectItem value="suite">Suite</SelectItem>
              </SelectContent>
            </Select>
            <Input placeholder="Weekday Rate" type="number" value={form.weekday_rate} onChange={e => setForm(p => ({ ...p, weekday_rate: e.target.value }))} className="w-32" />
            <Input placeholder="Weekend Rate" type="number" value={form.weekend_rate} onChange={e => setForm(p => ({ ...p, weekend_rate: e.target.value }))} className="w-32" />
            <label className="flex items-center gap-1 cursor-pointer text-sm">
              <input type="checkbox" checked={form.includes_breakfast} onChange={e => setForm(p => ({ ...p, includes_breakfast: e.target.checked }))} />
              Includes Breakfast
            </label>
            <Input type="date" value={form.valid_from} onChange={e => setForm(p => ({ ...p, valid_from: e.target.value }))} className="w-36" />
            <Input type="date" value={form.valid_to} onChange={e => setForm(p => ({ ...p, valid_to: e.target.value }))} className="w-36" />
            <Button onClick={() => addPlan.mutate()}>Add Plan</Button>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Rate Plans</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Plan Name</TableHead>
                <TableHead>Room Type</TableHead>
                <TableHead>Weekday Rate</TableHead>
                <TableHead>Weekend Rate</TableHead>
                <TableHead>Breakfast</TableHead>
                <TableHead>Valid From</TableHead>
                <TableHead>Valid To</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {planList.map((p: any) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.plan_name}</TableCell>
                  <TableCell className="capitalize">{p.room_type}</TableCell>
                  <TableCell>Rs {fmt(p.weekday_rate)}</TableCell>
                  <TableCell>Rs {fmt(p.weekend_rate)}</TableCell>
                  <TableCell><Badge variant={p.includes_breakfast ? "default" : "secondary"}>{p.includes_breakfast ? "Yes" : "No"}</Badge></TableCell>
                  <TableCell>{p.valid_from}</TableCell>
                  <TableCell>{p.valid_to}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
