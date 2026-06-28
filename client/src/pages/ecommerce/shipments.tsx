import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";

const api = (m: string, u: string, b?: any) =>
  fetch(u, { method: m, headers: { "Content-Type": "application/json" }, body: b ? JSON.stringify(b) : undefined, credentials: "include" }).then(r => r.json());
const fmt = (n: any) => Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

const EMPTY = { order_id: "", courier_partner: "", weight_kg: "", dimensions: "" };

export default function EcommerceShipmentsPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [awb, setAwb] = useState("");
  const [awbStatus, setAwbStatus] = useState<any>(null);

  const { data: shipments = [] } = useQuery({ queryKey: ["/api/ecommerce/shipments"], queryFn: () => api("GET", "/api/ecommerce/shipments") });

  const createMutation = useMutation({
    mutationFn: (b: any) => api("POST", "/api/ecommerce/shipments", b),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/ecommerce/shipments"] }); toast({ title: "Shipment created" }); setShowForm(false); setForm(EMPTY); },
  });

  const trackAwb = async () => {
    const res = await api("GET", );
    setAwbStatus(res);
  };

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Shipments</h1>
        <Button onClick={() => setShowForm(s => !s)}>Create Shipment</Button>
      </div>
      {showForm && (
        <Card>
          <CardHeader><CardTitle>Create Shipment</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <Input placeholder="Order ID" value={form.order_id} onChange={e => set("order_id", e.target.value)} />
            <Input placeholder="Courier Partner" value={form.courier_partner} onChange={e => set("courier_partner", e.target.value)} />
            <Input placeholder="Weight (kg)" value={form.weight_kg} onChange={e => set("weight_kg", e.target.value)} />
            <Input placeholder="Dimensions (LxWxH cm)" value={form.dimensions} onChange={e => set("dimensions", e.target.value)} />
            <div className="col-span-2 flex gap-2">
              <Button onClick={() => createMutation.mutate(form)}>Save</Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}
      <Card>
        <CardHeader><CardTitle>Track AWB</CardTitle></CardHeader>
        <CardContent className="flex gap-2">
          <Input placeholder="Enter AWB number" value={awb} onChange={e => setAwb(e.target.value)} className="w-64" />
          <Button onClick={trackAwb}>Track</Button>
          {awbStatus && <div className="ml-4 p-2 bg-muted rounded text-sm">{JSON.stringify(awbStatus)}</div>}
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>AWB No</TableHead><TableHead>Order ID</TableHead><TableHead>Courier</TableHead>
              <TableHead>Destination</TableHead><TableHead>Weight</TableHead><TableHead>Status</TableHead>
              <TableHead>Dispatched</TableHead><TableHead>Delivered</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {Array.isArray(shipments) && shipments.map((s: any) => (
                <TableRow key={s.id || s.awb_no}>
                  <TableCell>{s.awb_no}</TableCell><TableCell>{s.order_id}</TableCell><TableCell>{s.courier}</TableCell>
                  <TableCell>{s.destination_city}</TableCell><TableCell>{s.weight_kg} kg</TableCell>
                  <TableCell><Badge>{s.status}</Badge></TableCell>
                  <TableCell>{s.dispatched_at?.slice(0,10)}</TableCell><TableCell>{s.delivered_at?.slice(0,10)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
