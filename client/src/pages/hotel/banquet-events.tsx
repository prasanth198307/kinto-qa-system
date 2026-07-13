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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Plus, Eye, CheckCircle, FileText } from "lucide-react";
import { useTenantConfig, formatCurrency as fmtCur } from "@/hooks/use-tenant-config";

const api = (method: string, path: string, body?: unknown) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); });

const STATUS_COLORS: Record<string, string> = {
  enquiry: "bg-blue-100 text-blue-700",
  confirmed: "bg-green-100 text-green-700",
  completed: "bg-gray-100 text-gray-700",
  cancelled: "bg-red-100 text-red-700",
};

const EVENT_TYPES = ["wedding", "conference", "birthday", "corporate"];

interface BanquetEvent {
  id: number;
  event_name: string;
  event_type: string;
  hall: string;
  event_date: string;
  start_time: string;
  end_time: string;
  guest_count: number;
  organizer_name: string;
  organizer_phone: string;
  menu_type: string;
  base_amount: number;
  decoration_amount: number;
  catering_amount: number;
  av_amount: number;
  status: string;
  total_amount: number;
}

const EMPTY_FORM = {
  event_name: "", event_type: "wedding", hall: "", event_date: "", start_time: "",
  end_time: "", guest_count: "", organizer_name: "", organizer_phone: "",
  menu_type: "", base_amount: "", decoration_amount: "", catering_amount: "", av_amount: "",
};

function CalendarView({ events }: { events: BanquetEvent[] }) {
  const now = new Date();
  const tenantConfig = useTenantConfig();
  const sym = tenantConfig.currency_symbol;
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth() + 1);

  const { data: calEvents = [] } = useQuery<BanquetEvent[]>({
    queryKey: ["banquet-calendar", viewMonth, viewYear],
    queryFn: () => api("GET", `/api/hotel/enterprise/banquets/calendar?month=${viewMonth}&year=${viewYear}`).catch(() => events),
  });

  const daysInMonth = new Date(viewYear, viewMonth, 0).getDate();
  const firstDay = new Date(viewYear, viewMonth - 1, 1).getDay();
  const eventsByDate: Record<string, BanquetEvent[]> = {};
  calEvents.forEach((e: BanquetEvent) => {
    const d = e.event_date?.slice(0, 10);
    if (d) { eventsByDate[d] = eventsByDate[d] || []; eventsByDate[d].push(e); }
  });

  const prevMonth = () => { if (viewMonth === 1) { setViewMonth(12); setViewYear(y => y - 1); } else setViewMonth(m => m - 1); };
  const nextMonth = () => { if (viewMonth === 12) { setViewMonth(1); setViewYear(y => y + 1); } else setViewMonth(m => m + 1); };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Calendar View</CardTitle>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={prevMonth}>&lt;</Button>
            <span className="font-medium">{new Date(viewYear, viewMonth - 1).toLocaleString("en-IN", { month: "long", year: "numeric" })}</span>
            <Button variant="outline" size="sm" onClick={nextMonth}>&gt;</Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground mb-1">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => <div key={d}>{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} />)}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dateStr = `${viewYear}-${String(viewMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const dayEvents = eventsByDate[dateStr] || [];
            return (
              <div key={day} className={`min-h-16 border rounded p-1 ${dayEvents.length ? "border-primary/30" : "border-muted"}`}>
                <div className="text-xs font-medium mb-1">{day}</div>
                {dayEvents.slice(0, 2).map((ev, idx) => (
                  <div key={idx} className={`text-[10px] rounded px-1 truncate mb-0.5 ${STATUS_COLORS[ev.status] || ""}`}>{ev.event_name}</div>
                ))}
                {dayEvents.length > 2 && <div className="text-[10px] text-muted-foreground">+{dayEvents.length - 2} more</div>}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function NewEventDialog({ open, onClose, halls }: { open: boolean; onClose: () => void; halls: string[] }) {
  const qc = useQueryClient();
  const tenantConfig = useTenantConfig();
  const sym = tenantConfig.currency_symbol;
  const { toast } = useToast();
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const f = (k: string) => (form as Record<string, string>)[k];
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const total = [form.base_amount, form.decoration_amount, form.catering_amount, form.av_amount]
    .reduce((s, v) => s + (Number(v) || 0), 0);
  const gst = total * 0.18;
  const balance = total + gst;

  const mut = useMutation({
    mutationFn: (body: typeof form) => api("POST", "/api/hotel/enterprise/banquets", body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["banquet-events"] }); onClose(); toast({ title: "Event saved" }); },
    onError: () => toast({ title: "Error saving event", variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>New Banquet Event</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 space-y-1">
            <Label>Event Name</Label>
            <Input value={f("event_name")} onChange={e => set("event_name", e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Event Type</Label>
            <Select value={f("event_type")} onValueChange={v => set("event_type", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{EVENT_TYPES.map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Hall</Label>
            <Select value={f("hall")} onValueChange={v => set("hall", v)}>
              <SelectTrigger><SelectValue placeholder="Select hall" /></SelectTrigger>
              <SelectContent>{halls.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Event Date</Label>
            <Input type="date" value={f("event_date")} onChange={e => set("event_date", e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Guest Count</Label>
            <Input type="number" value={f("guest_count")} onChange={e => set("guest_count", e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Start Time</Label>
            <Input type="time" value={f("start_time")} onChange={e => set("start_time", e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>End Time</Label>
            <Input type="time" value={f("end_time")} onChange={e => set("end_time", e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Organizer Name</Label>
            <Input value={f("organizer_name")} onChange={e => set("organizer_name", e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Organizer Phone</Label>
            <Input value={f("organizer_phone")} onChange={e => set("organizer_phone", e.target.value)} />
          </div>
          <div className="col-span-2 space-y-1">
            <Label>Menu Type</Label>
            <Input value={f("menu_type")} onChange={e => set("menu_type", e.target.value)} placeholder="e.g. Veg Buffet" />
          </div>
          {["base_amount", "decoration_amount", "catering_amount", "av_amount"].map(field => (
            <div key={field} className="space-y-1">
              <Label className="capitalize">{field.replace(/_/g, " ")}</Label>
              <Input type="number" value={f(field)} onChange={e => set(field, e.target.value)} />
            </div>
          ))}
          <div className="col-span-2 bg-muted rounded p-3 text-sm space-y-1">
            <div className="flex justify-between"><span>Subtotal:</span><span>{sym}{total.toLocaleString()}</span></div>
            <div className="flex justify-between"><span>GST @18%:</span><span>{sym}{gst.toFixed(0)}</span></div>
            <div className="flex justify-between font-bold"><span>Balance Due:</span><span>{sym}{balance.toFixed(0)}</span></div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => mut.mutate(form)} disabled={mut.isPending}>Save Event</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function BanquetEventsPage() {
  const [statusFilter, setStatusFilter] = useState("all");
  const tenantConfig = useTenantConfig();
  const sym = tenantConfig.currency_symbol;
  const [showNew, setShowNew] = useState(false);

  const { data: halls = [] } = useQuery<string[]>({
    queryKey: ["banquet-halls"],
    queryFn: () => api("GET", "/api/hotel/enterprise/halls").then(d => Array.isArray(d) ? d.map((h: { name?: string }) => h.name || h) : []).catch(() => ["Hall A", "Hall B", "Lawn", "Terrace"]),
  });

  const { data: events = [] } = useQuery<BanquetEvent[]>({
    queryKey: ["banquet-events", statusFilter],
    queryFn: () => api("GET", `/api/hotel/enterprise/banquets${statusFilter !== "all" ? `?status=${statusFilter}` : ""}`).catch(() => []),
  });

  const qc = useQueryClient();
  const { toast } = useToast();

  const actionMut = useMutation({
    mutationFn: ({ id, action }: { id: number; action: string }) =>
      api("PATCH", `/api/hotel/enterprise/banquets/${id}`, { action }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["banquet-events"] }); toast({ title: "Updated" }); },
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Banquet & Events</h1>
          <p className="text-muted-foreground">Manage hall bookings and events</p>
        </div>
        <Button onClick={() => setShowNew(true)}><Plus className="h-4 w-4 mr-2" />New Event</Button>
      </div>

      <Tabs defaultValue="list">
        <TabsList>
          <TabsTrigger value="list">Events List</TabsTrigger>
          <TabsTrigger value="calendar">Calendar View</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          <div className="flex gap-2">
            {["all", "enquiry", "confirmed", "completed", "cancelled"].map(s => (
              <Button key={s} size="sm" variant={statusFilter === s ? "default" : "outline"}
                onClick={() => setStatusFilter(s)} className="capitalize">{s}</Button>
            ))}
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event Name</TableHead>
                    <TableHead>Hall</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Guests</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Total Amount</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No events found</TableCell></TableRow>
                  ) : events.map(ev => (
                    <TableRow key={ev.id}>
                      <TableCell className="font-medium">{ev.event_name}</TableCell>
                      <TableCell>{ev.hall}</TableCell>
                      <TableCell>{ev.event_date}</TableCell>
                      <TableCell>{ev.guest_count}</TableCell>
                      <TableCell>
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[ev.status] || ""}`}>{ev.status}</span>
                      </TableCell>
                      <TableCell>{sym}{Number(ev.total_amount || 0).toLocaleString()}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost"><Eye className="h-4 w-4" /></Button>
                          {ev.status === "enquiry" && (
                            <Button size="sm" variant="ghost" onClick={() => actionMut.mutate({ id: ev.id, action: "confirm" })}>
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            </Button>
                          )}
                          {ev.status === "confirmed" && (
                            <Button size="sm" variant="ghost" onClick={() => actionMut.mutate({ id: ev.id, action: "complete" })}>
                              Complete
                            </Button>
                          )}
                          <Button size="sm" variant="ghost"><FileText className="h-4 w-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calendar">
          <CalendarView events={events} />
        </TabsContent>
      </Tabs>

      <NewEventDialog open={showNew} onClose={() => setShowNew(false)} halls={halls as string[]} />
    </div>
  );
}
