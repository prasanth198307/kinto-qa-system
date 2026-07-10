import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Calendar, AlertTriangle, CheckCircle, Clock } from "lucide-react";

const api = (method: string, path: string, body?: unknown) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); });

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const YEARS = ["2024","2025","2026"];

interface Deadline {
  id: number;
  name: string;
  due_date: string;
  description: string;
  status: "pending" | "submitted" | "overdue";
  type: "EPFO" | "ESI" | "GSTR-1" | "TDS" | "PT";
}

function getDaysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0,0,0,0);
  const due = new Date(dateStr);
  return Math.floor((due.getTime() - today.getTime()) / 86400000);
}

function statusColor(deadline: Deadline): string {
  if (deadline.status === "submitted") return "border-l-4 border-green-500 bg-green-50";
  const days = getDaysUntil(deadline.due_date);
  if (days < 0) return "border-l-4 border-red-500 bg-red-50";
  if (days <= 3) return "border-l-4 border-orange-400 bg-orange-50";
  return "border-l-4 border-blue-400 bg-blue-50";
}

function StatusBadge({ deadline }: { deadline: Deadline }) {
  if (deadline.status === "submitted") return <Badge className="bg-green-600 text-white">Submitted</Badge>;
  const days = getDaysUntil(deadline.due_date);
  if (days < 0) return <Badge variant="destructive">Overdue</Badge>;
  if (days <= 3) return <Badge className="bg-orange-500 text-white">Due Soon</Badge>;
  return <Badge variant="secondary">Upcoming</Badge>;
}

export default function StatutoryCalendarPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [month, setMonth] = useState(String(new Date().getMonth() + 1));
  const [year, setYear] = useState("2026");
  const [epfoDialog, setEpfoDialog] = useState(false);
  const [esiDialog, setEsiDialog] = useState(false);
  const [epfoMonth, setEpfoMonth] = useState(String(new Date().getMonth() + 1));
  const [epfoYear, setEpfoYear] = useState("2026");

  const { data: deadlines = [] } = useQuery<Deadline[]>({
    queryKey: ["statutory-calendar", month, year],
    queryFn: () => api("GET", `/api/hr/payroll/statutory-calendar?month=${month}&year=${year}`),
  });

  const epfoMut = useMutation({
    mutationFn: (body: unknown) => api("POST", "/api/hr/payroll/epfo-submit", body),
    onSuccess: () => { setEpfoDialog(false); toast({ title: "ECR submitted successfully" }); },
    onError: () => toast({ title: "EPFO submission failed", variant: "destructive" }),
  });

  const esiMut = useMutation({
    mutationFn: (body: unknown) => api("POST", "/api/hr/payroll/esi-submit", body),
    onSuccess: () => { setEsiDialog(false); toast({ title: "ESI return submitted successfully" }); },
    onError: () => toast({ title: "ESI submission failed", variant: "destructive" }),
  });

  const overdue = deadlines.filter(d => d.status !== "submitted" && getDaysUntil(d.due_date) < 0);
  const dueSoon = deadlines.filter(d => d.status !== "submitted" && getDaysUntil(d.due_date) >= 0 && getDaysUntil(d.due_date) <= 3);
  const upcoming = deadlines.filter(d => d.status !== "submitted" && getDaysUntil(d.due_date) > 3);
  const submitted = deadlines.filter(d => d.status === "submitted");

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Statutory Compliance Calendar</h1>
        <div className="flex items-center gap-3">
          <Calendar className="h-5 w-5 text-muted-foreground" />
          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>{MONTHS.map((m,i) => <SelectItem key={m} value={String(i+1)}>{m}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
            <SelectContent>{YEARS.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <div>
              <div className="text-xs text-muted-foreground">Overdue</div>
              <div className="text-2xl font-bold text-red-600">{overdue.length}</div>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-orange-500" />
            <div>
              <div className="text-xs text-muted-foreground">Due in 3 days</div>
              <div className="text-2xl font-bold text-orange-600">{dueSoon.length}</div>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-blue-500" />
            <div>
              <div className="text-xs text-muted-foreground">Upcoming</div>
              <div className="text-2xl font-bold text-blue-600">{upcoming.length}</div>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <div>
              <div className="text-xs text-muted-foreground">Submitted</div>
              <div className="text-2xl font-bold text-green-600">{submitted.length}</div>
            </div>
          </div>
        </Card>
      </div>

      {deadlines.length === 0 && (
        <Card className="p-8 text-center text-muted-foreground">No deadlines for this period. Data loads from API.</Card>
      )}

      <div className="space-y-3">
        {deadlines.map(d => (
          <Card key={d.id} className={`p-4 ${statusColor(d)}`}>
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold">{d.name}</span>
                  <StatusBadge deadline={d} />
                  <Badge variant="outline">{d.type}</Badge>
                </div>
                <div className="text-sm text-muted-foreground">{d.description}</div>
                <div className="text-sm mt-1">
                  Due: <span className="font-medium">{new Date(d.due_date).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}</span>
                </div>
              </div>
              <div className="flex gap-2">
                {d.type === "EPFO" && (
                  <Button size="sm" onClick={() => setEpfoDialog(true)} disabled={d.status === "submitted"}>
                    Submit ECR
                  </Button>
                )}
                {d.type === "ESI" && (
                  <Button size="sm" onClick={() => setEsiDialog(true)} disabled={d.status === "submitted"}>
                    Submit Return
                  </Button>
                )}
                {d.type === "GSTR-1" && (
                  <Button size="sm" variant="outline" onClick={() => setLocation("/finance/gstr-filing")}>
                    Go to GSTR Filing
                  </Button>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* EPFO Dialog */}
      <Dialog open={epfoDialog} onOpenChange={setEpfoDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Submit EPFO ECR</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Month</Label>
              <Select value={epfoMonth} onValueChange={setEpfoMonth}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{MONTHS.map((m,i) => <SelectItem key={m} value={String(i+1)}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Year</Label>
              <Select value={epfoYear} onValueChange={setEpfoYear}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{YEARS.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEpfoDialog(false)}>Cancel</Button>
            <Button onClick={() => epfoMut.mutate({ month: epfoMonth, year: epfoYear })} disabled={epfoMut.isPending}>
              Submit ECR
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ESI Dialog */}
      <Dialog open={esiDialog} onOpenChange={setEsiDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Submit ESI Return</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Month</Label>
              <Select value={epfoMonth} onValueChange={setEpfoMonth}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{MONTHS.map((m,i) => <SelectItem key={m} value={String(i+1)}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Year</Label>
              <Select value={epfoYear} onValueChange={setEpfoYear}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{YEARS.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEsiDialog(false)}>Cancel</Button>
            <Button onClick={() => esiMut.mutate({ month: epfoMonth, year: epfoYear })} disabled={esiMut.isPending}>
              Submit Return
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
