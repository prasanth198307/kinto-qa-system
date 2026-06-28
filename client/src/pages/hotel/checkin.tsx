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

export default function HotelCheckinPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [bookingSearch, setBookingSearch] = useState("");
  const [folioModal, setFolioModal] = useState<any>(null);

  const { data: checkins = [] } = useQuery({ queryKey: ["hotel-checkins"], queryFn: () => api("GET", "/api/hotel/checkins?status=active") });

  const checkout = useMutation({
    mutationFn: (id: number) => api("PUT", `/api/hotel/checkins/${id}/checkout`, {}),
    onSuccess: () => { toast({ title: "Check-out successful" }); qc.invalidateQueries({ queryKey: ["hotel-checkins"] }); setFolioModal(null); }
  });

  const checkinList: any[] = Array.isArray(checkins) ? checkins : (checkins as any)?.checkins || [];
  const filtered = bookingSearch ? checkinList.filter(c => (c.booking_no || "").includes(bookingSearch)) : checkinList;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Check-in / Check-out</h1>
      <div className="flex gap-3">
        <Input placeholder="Search by Booking No..." value={bookingSearch} onChange={e => setBookingSearch(e.target.value)} className="w-56" />
      </div>
      {folioModal && (
        <Card className="border-blue-300">
          <CardHeader><CardTitle>Folio Summary - Room {folioModal.room_no}</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span>Guest</span><span>{folioModal.guest_name}</span></div>
              <div className="flex justify-between"><span>Check-in</span><span>{folioModal.check_in}</span></div>
              <div className="flex justify-between"><span>Nights</span><span>{folioModal.nights}</span></div>
              <div className="flex justify-between font-bold border-t pt-2"><span>Amount Due</span><span>Rs {fmt(folioModal.amount_due)}</span></div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button onClick={() => checkout.mutate(folioModal.id)}>Confirm Check-out</Button>
              <Button variant="outline" onClick={() => setFolioModal(null)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}
      <Card>
        <CardHeader><CardTitle>Active Guests ({filtered.length})</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Room No</TableHead>
                <TableHead>Guest Name</TableHead>
                <TableHead>Check-in</TableHead>
                <TableHead>Nights</TableHead>
                <TableHead>Amount Due</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c: any) => (
                <TableRow key={c.id}>
                  <TableCell className="font-bold">{c.room_no || c.room_number}</TableCell>
                  <TableCell>{c.guest_name}</TableCell>
                  <TableCell>{c.check_in}</TableCell>
                  <TableCell>{c.nights}</TableCell>
                  <TableCell>Rs {fmt(c.amount_due)}</TableCell>
                  <TableCell>
                    <Button size="sm" variant="outline" onClick={() => setFolioModal(c)}>Check-out</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
