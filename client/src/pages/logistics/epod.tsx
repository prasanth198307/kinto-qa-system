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

export default function LogisticsEPODPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [deliverForm, setDeliverForm] = useState({ trip_id: "", receiver_name: "", receiver_phone: "", remarks: "", delivery_photo_url: "" });
  const [showForm, setShowForm] = useState(false);

  const { data: epods = [] } = useQuery({ queryKey: ["/api/logistics/epod/trips"], queryFn: () => api("GET", "/api/logistics/epod/trips") });

  const markDelivered = useMutation({
    mutationFn: (d: any) => api("POST", "/api/logistics/epod/trips/" + d.trip_id + "/deliver", d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/logistics/epod/trips"] }); setShowForm(false); toast({ title: "Delivery confirmed" }); }
  });

  const pending = epods.filter((e: any) => e.status !== "delivered");
  const completed = epods.filter((e: any) => e.status === "delivered");

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">ePOD — Electronic Proof of Delivery</h1>
        <Button onClick={() => setShowForm(!showForm)}>+ Mark Delivered</Button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold text-yellow-600">{pending.length}</div><div className="text-sm text-muted-foreground">Pending Deliveries</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold text-green-600">{completed.length}</div><div className="text-sm text-muted-foreground">Completed</div></CardContent></Card>
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle>Mark Delivered</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Select value={deliverForm.trip_id} onValueChange={v => setDeliverForm({ ...deliverForm, trip_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select Trip" /></SelectTrigger>
                <SelectContent>{pending.map((e: any) => <SelectItem key={e.trip_id || e.id} value={String(e.trip_id || e.id)}>{e.trip_no} — {e.destination}</SelectItem>)}</SelectContent>
              </Select>
              <Input placeholder="Receiver Name" value={deliverForm.receiver_name} onChange={e => setDeliverForm({ ...deliverForm, receiver_name: e.target.value })} />
              <Input placeholder="Receiver Phone" value={deliverForm.receiver_phone} onChange={e => setDeliverForm({ ...deliverForm, receiver_phone: e.target.value })} />
              <Input placeholder="Remarks" value={deliverForm.remarks} onChange={e => setDeliverForm({ ...deliverForm, remarks: e.target.value })} />
              <Input placeholder="Delivery Photo URL" value={deliverForm.delivery_photo_url} onChange={e => setDeliverForm({ ...deliverForm, delivery_photo_url: e.target.value })} />
            </div>
            <Button className="mt-4" onClick={() => markDelivered.mutate(deliverForm)}>Confirm Delivery</Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Pending Deliveries ({pending.length})</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Trip No</TableHead>
                <TableHead>Destination</TableHead>
                <TableHead>Consignee</TableHead>
                <TableHead>Scheduled Delivery</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pending.map((e: any) => (
                <TableRow key={e.id}>
                  <TableCell className="font-medium">{e.trip_no}</TableCell>
                  <TableCell>{e.destination}</TableCell>
                  <TableCell>{e.consignee}</TableCell>
                  <TableCell>{e.scheduled_delivery ? new Date(e.scheduled_delivery).toLocaleDateString("en-IN") : "-"}</TableCell>
                  <TableCell><Badge variant="outline">{e.status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Completed Deliveries ({completed.length})</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Trip No</TableHead>
                <TableHead>Destination</TableHead>
                <TableHead>Delivered At</TableHead>
                <TableHead>Receiver</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {completed.map((e: any) => (
                <TableRow key={e.id}>
                  <TableCell className="font-medium">{e.trip_no}</TableCell>
                  <TableCell>{e.destination}</TableCell>
                  <TableCell>{e.delivered_at ? new Date(e.delivered_at).toLocaleString("en-IN") : "-"}</TableCell>
                  <TableCell>{e.receiver_name}</TableCell>
                  <TableCell><Badge variant="default">delivered</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
