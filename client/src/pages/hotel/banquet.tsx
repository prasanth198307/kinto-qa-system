import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const VENUES = ["Banquet Hall A", "Banquet Hall B", "Lawn", "Terrace", "Conference Room"];
const MENU_PACKAGES = ["Standard Veg", "Standard Non-Veg", "Premium Veg", "Premium Non-Veg", "Royal Veg", "Royal Non-Veg"];
const EQUIPMENT = ["PA System", "Projector", "Stage", "Dance Floor", "Catering Tables", "Floral Decoration", "Lighting", "Generator"];
const STATUS_COLORS: Record<string, string> = { confirmed: "bg-green-100 text-green-700", tentative: "bg-yellow-100 text-yellow-700", cancelled: "bg-red-100 text-red-700" };

const MOCK_EVENTS = [
  { id: 1, event_name: "Corporate Dinner", event_date: "2026-07-15", venue: "Banquet Hall A", pax: 150, menu_package: "Premium Veg", status: "confirmed" },
  { id: 2, event_name: "Wedding Reception", event_date: "2026-07-20", venue: "Lawn", pax: 400, menu_package: "Royal Non-Veg", status: "tentative" },
  { id: 3, event_name: "Birthday Party", event_date: "2026-07-25", venue: "Banquet Hall B", pax: 80, menu_package: "Standard", status: "confirmed" },
];

function VenueCalendar({ events }: { events: typeof MOCK_EVENTS }) {
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return { date: d.toISOString().split("T")[0], label: d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) };
  });
  const bookedDates = new Set(events.map(e => e.event_date));
  return (
    <Card>
      <CardHeader><CardTitle>Venue Availability (Next 14 Days)</CardTitle></CardHeader>
      <CardContent>
        <div className="flex gap-2 flex-wrap">
          {days.map(d => (
            <div
              key={d.date}
              className={`w-16 h-16 rounded-lg flex flex-col items-center justify-center text-sm font-medium border ${
                bookedDates.has(d.date) ? "bg-red-100 border-red-300 text-red-700" : "bg-green-100 border-green-300 text-green-700"
              }`}
            >
              <span className="text-xs">{d.label.slice(3)}</span>
              <span className="text-lg">{d.label.slice(0, 2)}</span>
              <span className="text-[10px]">{bookedDates.has(d.date) ? "Booked" : "Free"}</span>
            </div>
          ))}
        </div>
        <div className="flex gap-4 mt-3 text-xs">
          <span className="flex items-center gap-1"><span className="w-3 h-3 bg-green-200 rounded inline-block" /> Available</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 bg-red-200 rounded inline-block" /> Booked</span>
        </div>
      </CardContent>
    </Card>
  );
}

function NewEventDialog({ open, onClose, onSave }: { open: boolean; onClose: () => void; onSave: (ev: any) => void }) {
  const [form, setForm] = useState({ event_name: "", event_date: "", venue: "", pax: "", menu_package: "", equipment: [] as string[], status: "tentative" });
  const toggle = (item: string) => setForm(f => ({ ...f, equipment: f.equipment.includes(item) ? f.equipment.filter(e => e !== item) : [...f.equipment, item] }));
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>New Banquet Event</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 space-y-1">
            <Label>Event Name</Label>
            <Input value={form.event_name} onChange={e => setForm(f => ({ ...f, event_name: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <Label>Date</Label>
            <Input type="date" value={form.event_date} onChange={e => setForm(f => ({ ...f, event_date: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <Label>Pax (Guests)</Label>
            <Input type="number" value={form.pax} onChange={e => setForm(f => ({ ...f, pax: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <Label>Venue</Label>
            <Select value={form.venue} onValueChange={v => setForm(f => ({ ...f, venue: v }))}>
              <SelectTrigger><SelectValue placeholder="Select venue" /></SelectTrigger>
              <SelectContent>{VENUES.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Menu Package</Label>
            <Select value={form.menu_package} onValueChange={v => setForm(f => ({ ...f, menu_package: v }))}>
              <SelectTrigger><SelectValue placeholder="Select menu" /></SelectTrigger>
              <SelectContent>{MENU_PACKAGES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="col-span-2 space-y-1">
            <Label>Equipment Checklist</Label>
            <div className="flex flex-wrap gap-2">
              {EQUIPMENT.map(eq => (
                <button key={eq} onClick={() => toggle(eq)} className={`text-xs px-2 py-1 rounded border ${form.equipment.includes(eq) ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                  {eq}
                </button>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => { onSave(form); onClose(); }}>Create Event</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function BanquetPage() {
  const { toast } = useToast();
  const [showDialog, setShowDialog] = useState(false);
  const [events, setEvents] = useState(MOCK_EVENTS);

  const handleSave = (form: any) => {
    const newEv = { ...form, id: Date.now(), pax: parseInt(form.pax) || 0 };
    setEvents(prev => [newEv, ...prev]);
    toast({ title: "Event Created", description: `${form.event_name} added to banquet schedule` });
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Banquet & Events</h1>
          <p className="text-muted-foreground">Manage venue bookings, catering, and event planning</p>
        </div>
        <Button onClick={() => setShowDialog(true)}>+ New Event</Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4 text-center"><div className="text-2xl font-bold">{events.filter(e => e.status === "confirmed").length}</div><div className="text-xs text-muted-foreground">Confirmed Events</div></Card>
        <Card className="p-4 text-center"><div className="text-2xl font-bold">{events.filter(e => e.status === "tentative").length}</div><div className="text-xs text-muted-foreground">Tentative</div></Card>
        <Card className="p-4 text-center"><div className="text-2xl font-bold">{events.reduce((s, e) => s + (e.pax || 0), 0)}</div><div className="text-xs text-muted-foreground">Total Pax Booked</div></Card>
      </div>

      <VenueCalendar events={events} />

      <Card>
        <CardHeader><CardTitle>Event Bookings</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event Name</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Venue</TableHead>
                <TableHead>Pax</TableHead>
                <TableHead>Menu Package</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.map(e => (
                <TableRow key={e.id}>
                  <TableCell className="font-medium">{e.event_name}</TableCell>
                  <TableCell>{e.event_date}</TableCell>
                  <TableCell>{e.venue}</TableCell>
                  <TableCell>{e.pax}</TableCell>
                  <TableCell>{e.menu_package}</TableCell>
                  <TableCell><span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[e.status] || ""}`}>{e.status}</span></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <NewEventDialog open={showDialog} onClose={() => setShowDialog(false)} onSave={handleSave} />
    </div>
  );
}
