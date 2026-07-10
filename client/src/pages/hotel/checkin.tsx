import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarCheck, LogIn, LogOut, Plus, X } from "lucide-react";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); });

const EMPTY_GUEST = { name: "", phone: "", email: "", id_type: "Aadhaar", id_number: "", nationality: "Indian", address: "" };

export default function HotelCheckinPage() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<"checkin" | "checkout" | "guests">("checkin");
  const [showGuestForm, setShowGuestForm] = useState(false);
  const [guestForm, setGuestForm] = useState({ ...EMPTY_GUEST });

  const { data: reservations = [] } = useQuery<any[]>({ queryKey: ["/api/hotel/reservations"], queryFn: () => api("GET", "/api/hotel/reservations") });
  const { data: guests = [] } = useQuery<any[]>({ queryKey: ["/api/hotel/guests"], queryFn: () => api("GET", "/api/hotel/guests") });

  const checkin = useMutation({ mutationFn: (id: number) => api("POST", `/api/hotel/reservations/${id}/checkin`, {}), onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/hotel/reservations"] }) });
  const checkout = useMutation({ mutationFn: (id: number) => api("POST", `/api/hotel/reservations/${id}/checkout`, {}), onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/hotel/reservations"] }) });
  const createGuest = useMutation({ mutationFn: (b: any) => api("POST", "/api/hotel/guests", b), onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/hotel/guests"] }); setShowGuestForm(false); setGuestForm({ ...EMPTY_GUEST }); } });
  const deleteGuest = useMutation({ mutationFn: (id: number) => api("DELETE", `/api/hotel/guests/${id}`, {}), onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/hotel/guests"] }) });

  const gf = (k: string, v: string) => setGuestForm(p => ({ ...p, [k]: v }));
  const arr = Array.isArray(reservations) ? reservations : [];
  const guestsArr = Array.isArray(guests) ? guests : [];
  const today = new Date().toISOString().slice(0, 10);

  const pendingCheckins = arr.filter((r: any) => r.status === "confirmed" && r.check_in_date?.slice(0, 10) <= today);
  const pendingCheckouts = arr.filter((r: any) => r.status === "checked_in" && r.check_out_date?.slice(0, 10) <= today);

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold flex items-center gap-2"><CalendarCheck className="w-6 h-6 text-green-600" />Check-in / Check-out</h1>

      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="pt-4 flex items-center gap-3"><LogIn className="w-8 h-8 text-green-500" /><div><p className="text-xs text-gray-500">Pending Check-ins</p><p className="text-2xl font-bold text-green-600">{pendingCheckins.length}</p></div></CardContent></Card>
        <Card><CardContent className="pt-4 flex items-center gap-3"><LogOut className="w-8 h-8 text-orange-500" /><div><p className="text-xs text-gray-500">Due Check-outs</p><p className="text-2xl font-bold text-orange-600">{pendingCheckouts.length}</p></div></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-gray-500">Registered Guests</p><p className="text-2xl font-bold">{guestsArr.length}</p></CardContent></Card>
      </div>

      <div className="flex gap-2">
        <Button variant={activeTab === "checkin" ? "default" : "outline"} onClick={() => setActiveTab("checkin")}>Check-in Queue ({pendingCheckins.length})</Button>
        <Button variant={activeTab === "checkout" ? "default" : "outline"} onClick={() => setActiveTab("checkout")}>Check-out Queue ({pendingCheckouts.length})</Button>
        <Button variant={activeTab === "guests" ? "default" : "outline"} onClick={() => setActiveTab("guests")}>Guest Registry</Button>
      </div>

      {activeTab === "checkin" && (
        <div className="space-y-2">
          {pendingCheckins.map((r: any) => (
            <Card key={r.id}>
              <CardContent className="pt-4 flex items-start justify-between">
                <div>
                  <p className="font-semibold">{r.guest_name ?? `Guest #${r.guest_id}`}</p>
                  <p className="text-sm text-gray-600">Room {r.room_number ?? r.room_id} · Arrival: {r.check_in_date?.slice(0, 10)} · Departure: {r.check_out_date?.slice(0, 10)}</p>
                  <p className="text-xs text-gray-500">{r.adults ?? 1} adults{r.children ? ` · ${r.children} children` : ""} · {r.source} · ₹{Number(r.total_amount ?? 0).toLocaleString("en-IN")}</p>
                </div>
                <Button onClick={() => checkin.mutate(r.id)}><LogIn className="w-4 h-4 mr-1" />Check In</Button>
              </CardContent>
            </Card>
          ))}
          {pendingCheckins.length === 0 && <p className="text-center text-gray-400 py-8">No pending check-ins.</p>}
        </div>
      )}

      {activeTab === "checkout" && (
        <div className="space-y-2">
          {pendingCheckouts.map((r: any) => (
            <Card key={r.id}>
              <CardContent className="pt-4 flex items-start justify-between">
                <div>
                  <p className="font-semibold">{r.guest_name ?? `Guest #${r.guest_id}`}</p>
                  <p className="text-sm text-gray-600">Room {r.room_number ?? r.room_id} · Due: {r.check_out_date?.slice(0, 10)}</p>
                  <p className="text-xs text-gray-500">Total ₹{Number(r.total_amount ?? 0).toLocaleString("en-IN")} · Advance ₹{Number(r.advance_paid ?? 0).toLocaleString("en-IN")} · Balance ₹{Number((r.total_amount ?? 0) - (r.advance_paid ?? 0)).toLocaleString("en-IN")}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => window.open(`/api/hotel/folios/${r.id}/pdf`, "_blank")}>Folio PDF</Button>
                  <Button onClick={() => checkout.mutate(r.id)}><LogOut className="w-4 h-4 mr-1" />Check Out + GL</Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {pendingCheckouts.length === 0 && <p className="text-center text-gray-400 py-8">No pending check-outs.</p>}
          <p className="text-xs text-gray-400">GL: DR Cash/AR · CR Room Revenue (fire-and-forget)</p>
        </div>
      )}

      {activeTab === "guests" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setShowGuestForm(true)}><Plus className="w-4 h-4 mr-1" />Add Guest</Button>
          </div>

          {showGuestForm && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base">Register Guest</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setShowGuestForm(false)}><X className="w-4 h-4" /></Button>
              </CardHeader>
              <CardContent className="grid grid-cols-3 gap-3">
                <div><Label>Full Name</Label><Input value={guestForm.name} onChange={e => gf("name", e.target.value)} /></div>
                <div><Label>Phone</Label><Input value={guestForm.phone} onChange={e => gf("phone", e.target.value)} /></div>
                <div><Label>Email</Label><Input value={guestForm.email} onChange={e => gf("email", e.target.value)} /></div>
                <div><Label>ID Type</Label>
                  <Select value={guestForm.id_type} onValueChange={v => gf("id_type", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{["Aadhaar", "Passport", "Driving License", "Voter ID", "PAN"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>ID Number{guestForm.id_type === "Aadhaar" ? " (last 4 only)" : ""}</Label><Input value={guestForm.id_number} onChange={e => gf("id_number", e.target.value)} maxLength={guestForm.id_type === "Aadhaar" ? 4 : undefined} /></div>
                <div><Label>Nationality</Label><Input value={guestForm.nationality} onChange={e => gf("nationality", e.target.value)} /></div>
                <div className="col-span-3"><Label>Address</Label><Input value={guestForm.address} onChange={e => gf("address", e.target.value)} /></div>
                <div className="col-span-3 flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setShowGuestForm(false)}>Cancel</Button>
                  <Button onClick={() => createGuest.mutate(guestForm)}>Register</Button>
                </div>
              </CardContent>
            </Card>
          )}

          <table className="w-full text-sm border-collapse">
            <thead><tr className="bg-gray-50">{["Name", "Phone", "Email", "ID Type", "Nationality", ""].map(h => <th key={h} className="text-left p-2 border">{h}</th>)}</tr></thead>
            <tbody>
              {guestsArr.map((g: any) => (
                <tr key={g.id} className="border-b">
                  <td className="p-2 font-medium">{g.name}</td>
                  <td className="p-2">{g.phone}</td>
                  <td className="p-2">{g.email}</td>
                  <td className="p-2">{g.id_type}</td>
                  <td className="p-2">{g.nationality}</td>
                  <td className="p-2"><Button size="sm" variant="ghost" className="text-red-500" onClick={() => deleteGuest.mutate(g.id)}>Del</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
          {guestsArr.length === 0 && <p className="text-center text-gray-400 py-6">No guests registered.</p>}
        </div>
      )}
    </div>
  );
}
