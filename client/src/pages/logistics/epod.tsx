import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { CheckCircle, Eye, Camera } from "lucide-react";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then((r) => r.json());

export default function EpodPage() {
  const qc = useQueryClient();
  const [deliverOpen, setDeliverOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [receiverName, setReceiverName] = useState("");
  const [remarks, setRemarks] = useState("");

  const { data, isLoading, isError } = useQuery({ queryKey: ["logistics-epod"], queryFn: () => api("GET", "/api/logistics/epod") });
  const records: any[] = Array.isArray(data) ? data : [];

  const { data: podDetail } = useQuery({ queryKey: ["epod-detail", selected?.id], queryFn: () => api("GET", `/api/logistics/epod/${selected?.id}`), enabled: !!selected?.id && viewOpen });

  const markDelivered = useMutation({
    mutationFn: ({ id, receiver_name, remarks }: any) => api("PUT", `/api/logistics/epod/${id}/deliver`, { receiver_name, remarks }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["logistics-epod"] }); setDeliverOpen(false); setReceiverName(""); setRemarks(""); },
  });

  function openDeliver(r: any) { setSelected(r); setReceiverName(""); setRemarks(""); setDeliverOpen(true); }
  function openView(r: any) { setSelected(r); setViewOpen(true); }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">E-POD — Electronic Proof of Delivery</h1>
      </div>

      {isLoading && <p className="text-center text-muted-foreground py-8">Loading...</p>}
      {isError && <p className="text-center text-destructive py-8">Failed to load E-POD records.</p>}

      {!isLoading && !isError && (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Trip No.</TableHead>
                <TableHead>LR Number</TableHead>
                <TableHead>Consignee</TableHead>
                <TableHead>Delivery Date</TableHead>
                <TableHead>Receiver</TableHead>
                <TableHead>Signature</TableHead>
                <TableHead>Photos</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.length === 0 && <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground">No POD records found.</TableCell></TableRow>}
              {records.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.trip_number}</TableCell>
                  <TableCell>{r.lr_number}</TableCell>
                  <TableCell>{r.consignee}</TableCell>
                  <TableCell>{r.delivery_date || "—"}</TableCell>
                  <TableCell>{r.receiver_name || "—"}</TableCell>
                  <TableCell>
                    <Badge variant={r.signature_status === "captured" ? "default" : "secondary"}>{r.signature_status || "pending"}</Badge>
                  </TableCell>
                  <TableCell>
                    <span className="flex items-center gap-1"><Camera className="w-3 h-3" />{r.photo_count || 0}</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={r.status === "delivered" ? "outline" : "secondary"}>{r.status || "pending"}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {r.status !== "delivered" && (
                        <Button size="sm" variant="default" onClick={() => openDeliver(r)}><CheckCircle className="w-3 h-3 mr-1" />Deliver</Button>
                      )}
                      <Button size="sm" variant="outline" onClick={() => openView(r)}><Eye className="w-3 h-3 mr-1" />View POD</Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <Dialog open={deliverOpen} onOpenChange={setDeliverOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Mark as Delivered — {selected?.lr_number}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><label className="text-sm font-medium">Receiver Name</label><Input value={receiverName} onChange={(e) => setReceiverName(e.target.value)} placeholder="Name of person who received" /></div>
            <div><label className="text-sm font-medium">Remarks</label><Input value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Any delivery remarks" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeliverOpen(false)}>Cancel</Button>
            <Button onClick={() => markDelivered.mutate({ id: selected?.id, receiver_name: receiverName, remarks })} disabled={markDelivered.isPending || !receiverName}>
              {markDelivered.isPending ? "Saving..." : "Confirm Delivery"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>POD Details — {selected?.lr_number}</DialogTitle></DialogHeader>
          <div className="space-y-2 text-sm">
            <p><span className="font-medium">Trip:</span> {selected?.trip_number}</p>
            <p><span className="font-medium">Consignee:</span> {selected?.consignee}</p>
            <p><span className="font-medium">Delivery Date:</span> {podDetail?.delivery_date || selected?.delivery_date || "—"}</p>
            <p><span className="font-medium">Receiver:</span> {podDetail?.receiver_name || selected?.receiver_name || "—"}</p>
            <p><span className="font-medium">Remarks:</span> {podDetail?.remarks || "—"}</p>
            <p><span className="font-medium">Signature:</span> <Badge variant={podDetail?.signature_status === "captured" ? "default" : "secondary"}>{podDetail?.signature_status || "pending"}</Badge></p>
            <p><span className="font-medium">Photos:</span> {podDetail?.photo_count || selected?.photo_count || 0} uploaded</p>
            {podDetail?.photos?.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mt-2">
                {podDetail.photos.map((url: string, i: number) => <img key={i} src={url} alt={`POD photo ${i + 1}`} className="rounded border object-cover w-full aspect-square" />)}
              </div>
            )}
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setViewOpen(false)}>Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
