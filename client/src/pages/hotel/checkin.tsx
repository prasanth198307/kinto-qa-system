import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { LogIn, User, BedDouble } from "lucide-react";

const api = (method: string, path: string, body?: unknown) =>
  fetch(path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  }).then((r) => r.json());

type Reservation = {
  id: number;
  reservation_number: string;
  guest_name: string;
  guest_phone: string;
  guest_id_type: string;
  guest_id_number: string;
  room_type_id: number;
  room_type_name: string;
  check_in_date: string;
  check_out_date: string;
  total_nights: number;
  adults: number;
  children: number;
  total_amount: number;
  advance_paid: number;
  balance_amount: number;
  special_requests: string;
  status: string;
  room_number?: string;
  actual_check_in?: string;
};

type Room = { id: number; room_number: string; floor: number; status: string; room_type_id: number };

export default function CheckInPage() {
  const qc = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);
  const [selected, setSelected] = useState<Reservation | null>(null);
  const [roomId, setRoomId] = useState("");
  const [advanceAmount, setAdvanceAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState("cash");

  const { data: arrivals = [] } = useQuery<Reservation[]>({
    queryKey: ["hotel-checkin-arrivals"],
    queryFn: () => api("GET", `/api/hotel/reservations?status=confirmed&date=${today}`),
    refetchInterval: 60000,
  });

  const { data: checkedInToday = [] } = useQuery<Reservation[]>({
    queryKey: ["hotel-checkedin-today"],
    queryFn: () => api("GET", `/api/hotel/reservations?status=checked_in&checkin_date=${today}`),
    refetchInterval: 60000,
  });

  const { data: rooms = [] } = useQuery<Room[]>({
    queryKey: ["hotel-available-rooms"],
    queryFn: () => api("GET", "/api/hotel/rooms?status=available"),
  });

  const checkinMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: unknown }) =>
      api("PUT", `/api/hotel/reservations/${id}/checkin`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hotel-checkin-arrivals"] });
      qc.invalidateQueries({ queryKey: ["hotel-checkedin-today"] });
      qc.invalidateQueries({ queryKey: ["hotel-available-rooms"] });
      setSelected(null);
      setRoomId("");
      setAdvanceAmount("");
      setPaymentMode("cash");
    },
  });

  const availableRooms = rooms.filter(
    (r) => r.status === "available" && (!selected || r.room_type_id === selected.room_type_id)
  );

  function handleCheckin() {
    if (!selected || !roomId) return;
    checkinMutation.mutate({
      id: selected.id,
      data: {
        room_id: Number(roomId),
        advance_payment: Number(advanceAmount || 0),
        payment_mode: paymentMode,
        actual_check_in: new Date().toISOString(),
      },
    });
  }

  function openDialog(r: Reservation) {
    setSelected(r);
    setRoomId("");
    setAdvanceAmount(String(Math.max(0, r.balance_amount)));
    setPaymentMode("cash");
  }

  const idTypeLabel: Record<string, string> = {
    passport: "Passport",
    aadhar: "Aadhar",
    driving_license: "Driving License",
    voter_id: "Voter ID",
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Check-In</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <LogIn className="w-5 h-5 text-blue-500" /> Today's Arrivals ({arrivals.length})
          </h2>
          <div className="space-y-3">
            {arrivals.length === 0 && (
              <div className="text-gray-400 text-sm border rounded p-6 text-center">No arrivals scheduled for today</div>
            )}
            {arrivals.map((r) => (
              <div key={r.id} className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer" onClick={() => openDialog(r)}>
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-semibold">{r.guest_name}</div>
                    <div className="text-sm text-gray-500">{r.reservation_number} · {r.room_type_name}</div>
                    <div className="text-sm text-gray-500">{r.adults}A{r.children > 0 ? ` ${r.children}C` : ""} · {r.total_nights} nights</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">₹{Number(r.balance_amount).toLocaleString()} due</div>
                    <Button size="sm" className="mt-2" onClick={(e) => { e.stopPropagation(); openDialog(r); }}>
                      <LogIn className="w-3 h-3 mr-1" /> Check In
                    </Button>
                  </div>
                </div>
                {r.special_requests && (
                  <div className="mt-2 text-xs text-amber-700 bg-amber-50 rounded px-2 py-1">{r.special_requests}</div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <BedDouble className="w-5 h-5 text-green-500" /> Checked In Today ({checkedInToday.length})
          </h2>
          <div className="space-y-2">
            {checkedInToday.length === 0 && (
              <div className="text-gray-400 text-sm border rounded p-6 text-center">No check-ins yet today</div>
            )}
            {checkedInToday.map((r) => (
              <div key={r.id} className="border rounded-lg p-3 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <User className="w-8 h-8 text-gray-400 bg-gray-100 rounded-full p-1.5" />
                  <div>
                    <div className="font-medium">{r.guest_name}</div>
                    <div className="text-sm text-gray-500">{r.room_type_name}</div>
                  </div>
                </div>
                <div className="text-right">
                  {r.room_number && (
                    <Badge variant="outline" className="text-green-700 border-green-300">Room {r.room_number}</Badge>
                  )}
                  <div className="text-xs text-gray-400 mt-1">
                    Until {r.check_out_date?.slice(0, 10)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Complete Check-In</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="font-semibold text-base">{selected.guest_name}</div>
                <div className="grid grid-cols-2 gap-x-4 text-sm">
                  <span className="text-gray-500">Phone</span><span>{selected.guest_phone}</span>
                  <span className="text-gray-500">ID Type</span><span>{idTypeLabel[selected.guest_id_type] ?? selected.guest_id_type}</span>
                  <span className="text-gray-500">ID Number</span><span>{selected.guest_id_number}</span>
                  <span className="text-gray-500">Room Type</span><span>{selected.room_type_name}</span>
                  <span className="text-gray-500">Dates</span><span>{selected.check_in_date?.slice(0, 10)} → {selected.check_out_date?.slice(0, 10)}</span>
                  <span className="text-gray-500">Nights</span><span>{selected.total_nights}</span>
                  <span className="text-gray-500">Total</span><span>₹{Number(selected.total_amount).toLocaleString()}</span>
                  <span className="text-gray-500">Already Paid</span><span>₹{Number(selected.advance_paid).toLocaleString()}</span>
                </div>
                {selected.special_requests && (
                  <div className="mt-2 text-xs text-amber-700 bg-amber-50 rounded px-2 py-1">
                    <span className="font-medium">Special requests: </span>{selected.special_requests}
                  </div>
                )}
              </div>

              <div>
                <Label>Assign Room</Label>
                <Select value={roomId} onValueChange={setRoomId}>
                  <SelectTrigger><SelectValue placeholder="Select available room" /></SelectTrigger>
                  <SelectContent>
                    {availableRooms.map((r) => (
                      <SelectItem key={r.id} value={String(r.id)}>
                        Room {r.room_number} — Floor {r.floor}
                      </SelectItem>
                    ))}
                    {availableRooms.length === 0 && (
                      <SelectItem value="none" disabled>No rooms available for this type</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Advance Collection (₹)</Label>
                  <Input type="number" min={0} value={advanceAmount} onChange={(e) => setAdvanceAmount(e.target.value)} />
                </div>
                <div>
                  <Label>Payment Mode</Label>
                  <Select value={paymentMode} onValueChange={setPaymentMode}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="card">Card</SelectItem>
                      <SelectItem value="upi">UPI</SelectItem>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setSelected(null)}>Cancel</Button>
                <Button onClick={handleCheckin} disabled={!roomId || checkinMutation.isPending}>
                  <LogIn className="w-4 h-4 mr-2" />
                  {checkinMutation.isPending ? "Processing..." : "Complete Check-In"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
