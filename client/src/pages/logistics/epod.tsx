import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle, Clock, Package, X } from "lucide-react";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); });

type EPOD = {
  id: number; consignment_id: number; lr_no: string; shipper_name: string;
  consignee_name: string; destination: string; status: string;
  delivered_at: string | null; receiver_name: string | null;
  receiver_contact: string | null; remarks: string | null;
  pod_image_url: string | null;
};

export default function EpodPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState("pending");
  const [delivering, setDelivering] = useState<number | null>(null);
  const [podForm, setPodForm] = useState({ receiver_name: "", receiver_contact: "", remarks: "" });

  const { data: epods = [] } = useQuery<EPOD[]>({ queryKey: ["/api/logistics/epod"], queryFn: () => api("GET", "/api/logistics/epod") });

  const markDelivered = useMutation({
    mutationFn: ({ id, body }: { id: number; body: any }) => api("POST", `/api/logistics/epod/${id}/deliver`, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/logistics/epod"] }); setDelivering(null); setPodForm({ receiver_name: "", receiver_contact: "", remarks: "" }); },
  });

  const arr = Array.isArray(epods) ? epods : [];
  const pending = arr.filter(e => e.status !== "delivered");
  const delivered = arr.filter(e => e.status === "delivered");

  const visible = filter === "pending" ? pending : filter === "delivered" ? delivered : arr;

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">ePOD — Electronic Proof of Delivery</h1>

      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="pt-4 flex items-center gap-3"><Package className="w-8 h-8 text-blue-500" /><div><p className="text-sm text-gray-500">Total</p><p className="text-2xl font-bold">{arr.length}</p></div></CardContent></Card>
        <Card><CardContent className="pt-4 flex items-center gap-3"><Clock className="w-8 h-8 text-yellow-500" /><div><p className="text-sm text-gray-500">Pending Delivery</p><p className="text-2xl font-bold text-yellow-600">{pending.length}</p></div></CardContent></Card>
        <Card><CardContent className="pt-4 flex items-center gap-3"><CheckCircle className="w-8 h-8 text-green-500" /><div><p className="text-sm text-gray-500">Delivered</p><p className="text-2xl font-bold text-green-600">{delivered.length}</p></div></CardContent></Card>
      </div>

      <div className="flex gap-2">
        {["all", "pending", "delivered"].map(f => (
          <Button key={f} variant={filter === f ? "default" : "outline"} size="sm" onClick={() => setFilter(f)}>{f.charAt(0).toUpperCase() + f.slice(1)}</Button>
        ))}
      </div>

      <div className="space-y-2">
        {visible.map(e => (
          <Card key={e.id}>
            <CardContent className="pt-4 flex items-start justify-between gap-4">
              <div>
                <p className="font-semibold">{e.lr_no}</p>
                <p className="text-sm text-gray-600">{e.shipper_name} → {e.consignee_name}</p>
                <p className="text-xs text-gray-500">Destination: {e.destination}</p>
                {e.status === "delivered" && (
                  <div className="mt-1 text-xs text-green-700">
                    Delivered {e.delivered_at?.slice(0,10)} · Receiver: {e.receiver_name} ({e.receiver_contact})
                    {e.remarks && <span> · {e.remarks}</span>}
                  </div>
                )}
              </div>
              <div className="flex flex-col items-end gap-2">
                <Badge className={e.status === "delivered" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}>
                  {e.status === "delivered" ? "Delivered" : "Pending"}
                </Badge>
                {e.status !== "delivered" && delivering !== e.id && (
                  <Button size="sm" onClick={() => setDelivering(e.id)}>Mark Delivered</Button>
                )}
              </div>
            </CardContent>
            {delivering === e.id && (
              <CardContent className="border-t pt-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium">Delivery Confirmation</p>
                  <Button variant="ghost" size="sm" onClick={() => setDelivering(null)}><X className="w-4 h-4" /></Button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label className="text-xs">Receiver Name</Label><Input size={1} value={podForm.receiver_name} onChange={el => setPodForm(p => ({ ...p, receiver_name: el.target.value }))} /></div>
                  <div><Label className="text-xs">Receiver Contact</Label><Input size={1} value={podForm.receiver_contact} onChange={el => setPodForm(p => ({ ...p, receiver_contact: el.target.value }))} /></div>
                  <div className="col-span-2"><Label className="text-xs">Remarks</Label><Input value={podForm.remarks} onChange={el => setPodForm(p => ({ ...p, remarks: el.target.value }))} /></div>
                  <div className="col-span-2 flex justify-end">
                    <Button size="sm" onClick={() => markDelivered.mutate({ id: e.id, body: { ...podForm, delivered_at: new Date().toISOString() } })}>Confirm Delivery</Button>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>
        ))}
        {visible.length === 0 && <p className="text-center text-gray-400 py-8">No records found.</p>}
      </div>
    </div>
  );
}
