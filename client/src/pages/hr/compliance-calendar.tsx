import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Bell } from "lucide-react";

const api = (method: string, path: string, body?: unknown) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); });

const today = new Date();
const currentMonth = today.getMonth();
const currentYear = today.getFullYear();

const DEADLINES = [
  { day: 7, label: "TDS Payment", type: "TDS", color: "bg-blue-200" },
  { day: 15, label: "PF / EPF Payment", type: "PF", color: "bg-green-200" },
  { day: 15, label: "ESI Payment", type: "ESI", color: "bg-yellow-200" },
  { day: 20, label: "PT Filing (MP)", type: "PT", color: "bg-purple-200" },
  { day: 31, label: "EPFO Annual Return", type: "Annual", color: "bg-orange-200" },
];

const STATUS_COLOR: Record<string, "default" | "destructive" | "secondary" | "outline"> = {
  Filed: "default",
  Pending: "secondary",
  Overdue: "destructive",
};

export default function ComplianceCalendarPage() {
  const qc = useQueryClient();
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [ackNo, setAckNo] = useState("");
  const [filed, setFiled] = useState<Record<string, boolean>>({});
  const [emailReminder, setEmailReminder] = useState("");

  const { data: calendarData = [] } = useQuery({
    queryKey: ["compliance-calendar"],
    queryFn: () => api("GET", "/api/hr/compliance-calendar"),
  });

  const markFiledMut = useMutation({
    mutationFn: (body: { day: number; ack: string }) => api("POST", "/api/hr/compliance-calendar", body),
    onSuccess: (_d, v) => {
      setFiled(p => ({ ...p, [v.day]: true }));
      qc.invalidateQueries({ queryKey: ["compliance-calendar"] });
      setDialogOpen(false);
    },
  });

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const cells = Array.from({ length: firstDay }, () => null).concat(Array.from({ length: daysInMonth }, (_, i) => i + 1));

  const getDeadlines = (day: number) => DEADLINES.filter(d => d.day === day);

  const getStatus = (day: number, type: string): "Filed" | "Pending" | "Overdue" => {
    if (filed[day]) return "Filed";
    const d = new Date(currentYear, currentMonth, day);
    if (d < today) return "Overdue";
    return "Pending";
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Statutory Compliance Calendar</h1>
          <p className="text-muted-foreground">{today.toLocaleString("en-IN", { month: "long", year: "numeric" })}</p>
        </div>
        <div className="flex gap-2 items-center">
          <Input placeholder="Email for reminders" value={emailReminder} onChange={e => setEmailReminder(e.target.value)} className="w-56" />
          <Button size="sm" onClick={() => emailReminder && alert(`Reminders set for ${emailReminder}`)}>
            <Bell className="h-4 w-4 mr-2" /> Set Reminder
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <Card className="border-l-4 border-blue-400"><CardContent className="pt-3"><p className="font-medium text-sm">TDS</p><p className="text-xs text-muted-foreground">Due: 7th every month</p></CardContent></Card>
        <Card className="border-l-4 border-green-400"><CardContent className="pt-3"><p className="font-medium text-sm">PF / ESI</p><p className="text-xs text-muted-foreground">Due: 15th every month</p></CardContent></Card>
        <Card className="border-l-4 border-purple-400"><CardContent className="pt-3"><p className="font-medium text-sm">PT</p><p className="text-xs text-muted-foreground">Varies by state</p></CardContent></Card>
        <Card className="border-l-4 border-orange-400"><CardContent className="pt-3"><p className="font-medium text-sm">Annual Returns</p><p className="text-xs text-muted-foreground">EPFO: May 31</p></CardContent></Card>
      </div>

      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium mb-2">
            {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => <div key={d} className="p-1">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, i) => (
              <div key={i} className={`min-h-16 border rounded p-1 text-xs ${day ? "cursor-pointer hover:bg-muted" : ""}`}
                onClick={() => { if (day && getDeadlines(day).length) { setSelectedDay(day); setDialogOpen(true); } }}>
                {day && (
                  <>
                    <p className={`font-medium ${day === today.getDate() ? "text-blue-600" : ""}`}>{day}</p>
                    {getDeadlines(day).map((d, j) => {
                      const status = getStatus(day, d.type);
                      return (
                        <div key={j} className={`${d.color} rounded px-1 py-0.5 mt-0.5 text-xs`}>
                          <span>{d.label}</span>
                          {status === "Filed" && <span className="ml-1 text-green-700">✓</span>}
                          {status === "Overdue" && <span className="ml-1 text-red-700">!</span>}
                        </div>
                      );
                    })}
                  </>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Compliance Status Summary</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Compliance</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {DEADLINES.map((d, i) => {
                const st = getStatus(d.day, d.type);
                return (
                  <TableRow key={i}>
                    <TableCell>{d.label}</TableCell>
                    <TableCell>{d.day}th {today.toLocaleString("en-IN", { month: "long" })}</TableCell>
                    <TableCell><Badge variant={STATUS_COLOR[st]}>{st}</Badge></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Mark as Filed — Day {selectedDay}</DialogTitle></DialogHeader>
          <div>
            <label className="text-sm font-medium mb-1 block">Acknowledgement Number</label>
            <Input value={ackNo} onChange={e => setAckNo(e.target.value)} placeholder="Filing acknowledgement no." />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => markFiledMut.mutate({ day: selectedDay!, ack: ackNo })}>Mark Filed</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
