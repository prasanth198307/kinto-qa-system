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

const statusColor = (s: string): any => ({ pending: "outline", "in-transit": "secondary", delivered: "default", cancelled: "destructive" }[s] || "outline");

export default function LogisticsConsignmentsPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [trackLR, setTrackLR] = useState("");
  const [tracked, setTracked] = useState<any>(null);
  const [form, setForm] = useState({ lr_no: "", consignor_name: "", consignee_name: "", origin_city: "", destination_city: "", packages: "", weight_kg: "", declared_value: "", freight_amount: "" });

  const { data: consignments = [] } = useQuery({ queryKey: ["/api/logistics/consignments"], queryFn: () => api("GET", "/api/logistics/consignments") });

  const addConsignment = useMutation({
    mutationFn: (d: any) => api("POST", "/api/logistics/consignments", d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/logistics/consignments"] }); setShowForm(false); toast({ title: "Consignment created" }); }
  });

  const trackConsignment = async () => {
    if (!trackLR) return;
    const result = await api("GET", "/api/logistics/consignments?lr_no=" + trackLR);
    const found = Array.isArray(result) ? result.find((c: any) => c.lr_no === trackLR) : result;
    setTracked(found || null);
    if (!found) toast({ title: "LR not found", variant: "destructive" });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Consignments</h1>
        <Button onClick={() => setShowForm(!showForm)}>+ New Consignment</Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <Input placeholder="Track by LR Number" value={trackLR} onChange={e => setTrackLR(e.target.value)} className="max-w-64" />
            <Button onClick={trackConsignment}>Track</Button>
          </div>
          {tracked && (
            <div className="mt-4 p-4 border rounded space-y-2">
              <div className="font-bold">LR: {tracked.lr_no}</div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                <div><span className="text-muted-foreground">Consignor: </span>{tracked.consignor_name}</div>
                <div><span className="text-muted-foreground">Consignee: </span>{tracked.consignee_name}</div>
                <div><span className="text-muted-foreground">Route: </span>{tracked.origin_city} → {tracked.destination_city}</div>
                <div><span className="text-muted-foreground">Status: </span><Badge variant={statusColor(tracked.status)}>{tracked.status}</Badge></div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {showForm && (
        <Card>
          <CardHeader><CardTitle>New Consignment</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Input placeholder="LR Number" value={form.lr_no} onChange={e => setForm({ ...form, lr_no: e.target.value })} />
              <Input placeholder="Consignor Name" value={form.consignor_name} onChange={e => setForm({ ...form, consignor_name: e.target.value })} />
              <Input placeholder="Consignee Name" value={form.consignee_name} onChange={e => setForm({ ...form, consignee_name: e.target.value })} />
              <Input placeholder="Origin City" value={form.origin_city} onChange={e => setForm({ ...form, origin_city: e.target.value })} />
              <Input placeholder="Destination City" value={form.destination_city} onChange={e => setForm({ ...form, destination_city: e.target.value })} />
              <Input placeholder="Packages" type="number" value={form.packages} onChange={e => setForm({ ...form, packages: e.target.value })} />
              <Input placeholder="Weight (kg)" type="number" value={form.weight_kg} onChange={e => setForm({ ...form, weight_kg: e.target.value })} />
              <Input placeholder="Declared Value" type="number" value={form.declared_value} onChange={e => setForm({ ...form, declared_value: e.target.value })} />
              <Input placeholder="Freight Amount" type="number" value={form.freight_amount} onChange={e => setForm({ ...form, freight_amount: e.target.value })} />
            </div>
            <Button className="mt-4" onClick={() => addConsignment.mutate(form)}>Save Consignment</Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Consignments</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>LR No</TableHead>
                <TableHead>Consignor</TableHead>
                <TableHead>Consignee</TableHead>
                <TableHead>Origin</TableHead>
                <TableHead>Destination</TableHead>
                <TableHead>Weight (kg)</TableHead>
                <TableHead>Freight</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {consignments.map((c: any) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.lr_no}</TableCell>
                  <TableCell>{c.consignor_name}</TableCell>
                  <TableCell>{c.consignee_name}</TableCell>
                  <TableCell>{c.origin_city}</TableCell>
                  <TableCell>{c.destination_city}</TableCell>
                  <TableCell>{c.weight_kg}</TableCell>
                  <TableCell>₹{fmt(c.freight_amount)}</TableCell>
                  <TableCell><Badge variant={statusColor(c.status)}>{c.status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
