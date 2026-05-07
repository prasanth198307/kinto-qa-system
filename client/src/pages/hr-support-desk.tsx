import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Pencil, MessageSquare, AlertCircle, Clock, CheckCircle } from "lucide-react";

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-gray-100 text-gray-600",
  medium: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
  high: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  critical: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};

const STATUS_COLORS: Record<string, string> = {
  open: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  in_progress: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  resolved: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  closed: "bg-gray-100 text-gray-600",
};

const STATUS_ICON: Record<string, any> = {
  open: AlertCircle,
  in_progress: Clock,
  resolved: CheckCircle,
  closed: CheckCircle,
};

const CATEGORIES = ["Payroll", "Leave", "Attendance", "Policy", "Benefits", "IT / System", "Harassment", "Facilities", "General"];

export default function HRSupportDeskPage() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [showDetail, setShowDetail] = useState<any>(null);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({ priority: "medium", category: "General" });

  const { data: tickets = [] } = useQuery<any[]>({ queryKey: ["/api/hr/support-tickets"] });

  const saveMutation = useMutation({
    mutationFn: (data: any) => editing
      ? apiRequest("PUT", `/api/hr/support-tickets/${editing.id}`, data)
      : apiRequest("POST", "/api/hr/support-tickets", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/hr/support-tickets"] });
      setShowForm(false); setEditing(null); setForm({ priority: "medium", category: "General" });
      toast({ title: "Ticket saved" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const set = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));
  const filtered = tickets.filter((t: any) => {
    const matchSearch = t.employee_name?.toLowerCase().includes(search.toLowerCase()) || t.subject?.toLowerCase().includes(search.toLowerCase()) || t.ticket_no?.includes(search);
    const matchStatus = filterStatus === "all" || t.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const counts = { open: tickets.filter((t: any) => t.status === "open").length, in_progress: tickets.filter((t: any) => t.status === "in_progress").length, resolved: tickets.filter((t: any) => t.status === "resolved").length };

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-xl font-bold">HR Support Desk</h1>
          <p className="text-sm text-muted-foreground">Employee helpdesk tickets and issue resolution</p>
        </div>
        <Button onClick={() => { setEditing(null); setForm({ priority: "medium", category: "General" }); setShowForm(true); }} size="sm" data-testid="button-add-ticket">
          <Plus className="h-4 w-4 mr-1" />New Ticket
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Open", count: counts.open, color: "text-blue-600", icon: AlertCircle },
          { label: "In Progress", count: counts.in_progress, color: "text-orange-600", icon: Clock },
          { label: "Resolved", count: counts.resolved, color: "text-green-600", icon: CheckCircle },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <s.icon className={`h-5 w-5 ${s.color}`} />
              <div><p className="text-xs text-muted-foreground">{s.label}</p><p className="text-xl font-bold">{s.count}</p></div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search tickets…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>{["Ticket #", "Employee", "Subject", "Category", "Priority", "Status", "Assigned To", ""].map(h => <th key={h} className="px-4 py-2 text-left">{h}</th>)}</tr>
          </thead>
          <tbody>
            {filtered.map((t: any) => {
              const Icon = STATUS_ICON[t.status] || AlertCircle;
              return (
                <tr key={t.id} className="border-t hover:bg-muted/30 cursor-pointer" onClick={() => setShowDetail(t)} data-testid={`row-ticket-${t.id}`}>
                  <td className="px-4 py-2 font-mono text-xs text-muted-foreground">{t.ticket_no}</td>
                  <td className="px-4 py-2 font-medium">{t.employee_name}</td>
                  <td className="px-4 py-2"><p className="max-w-48 truncate">{t.subject}</p></td>
                  <td className="px-4 py-2 text-muted-foreground">{t.category}</td>
                  <td className="px-4 py-2"><Badge className={PRIORITY_COLORS[t.priority] || ""}>{t.priority}</Badge></td>
                  <td className="px-4 py-2"><div className="flex items-center gap-1"><Icon className="h-3 w-3" /><Badge className={STATUS_COLORS[t.status] || ""}>{t.status?.replace("_", " ")}</Badge></div></td>
                  <td className="px-4 py-2 text-muted-foreground">{t.assigned_to || "—"}</td>
                  <td className="px-4 py-2" onClick={e => e.stopPropagation()}>
                    <Button size="icon" variant="ghost" onClick={() => { setEditing(t); setForm(t); setShowForm(true); }}><Pencil className="h-4 w-4" /></Button>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">No tickets found</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Ticket detail */}
      <Dialog open={!!showDetail} onOpenChange={v => !v && setShowDetail(null)}>
        <DialogContent className="max-w-lg max-h-[90dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>{showDetail?.ticket_no} — {showDetail?.subject}</DialogTitle></DialogHeader>
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <div><span className="text-muted-foreground">Employee:</span> <span className="font-medium">{showDetail?.employee_name}</span></div>
              <div><span className="text-muted-foreground">Category:</span> {showDetail?.category}</div>
              <div><span className="text-muted-foreground">Priority:</span> <Badge className={PRIORITY_COLORS[showDetail?.priority] || ""}>{showDetail?.priority}</Badge></div>
              <div><span className="text-muted-foreground">Status:</span> <Badge className={STATUS_COLORS[showDetail?.status] || ""}>{showDetail?.status?.replace("_", " ")}</Badge></div>
              <div><span className="text-muted-foreground">Assigned:</span> {showDetail?.assigned_to || "—"}</div>
            </div>
            <div className="border rounded-lg p-3 bg-muted/30">
              <p className="text-xs text-muted-foreground mb-1">Description</p>
              <p className="whitespace-pre-wrap">{showDetail?.description || "—"}</p>
            </div>
            {showDetail?.resolution && (
              <div className="border rounded-lg p-3 bg-green-50 dark:bg-green-900/20">
                <p className="text-xs text-muted-foreground mb-1">Resolution</p>
                <p className="whitespace-pre-wrap">{showDetail.resolution}</p>
              </div>
            )}
            <div className="flex justify-end">
              <Button size="sm" onClick={() => { setEditing(showDetail); setForm(showDetail); setShowDetail(null); setShowForm(true); }}>
                <Pencil className="h-3 w-3 mr-1" />Update Ticket
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Form dialog */}
      <Dialog open={showForm} onOpenChange={v => { setShowForm(v); if (!v) setEditing(null); }}>
        <DialogContent className="max-w-lg max-h-[90dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Update Ticket" : "New Support Ticket"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label className="text-xs">Employee Name *</Label><Input value={form.employee_name || ""} onChange={e => set("employee_name", e.target.value)} data-testid="input-ticket-employee" /></div>
              <div className="space-y-1">
                <Label className="text-xs">Category</Label>
                <Select value={form.category || "General"} onValueChange={v => set("category", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Priority</Label>
                <Select value={form.priority || "medium"} onValueChange={v => set("priority", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="critical">Critical</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Status</Label>
                <Select value={form.status || "open"} onValueChange={v => set("status", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="open">Open</SelectItem><SelectItem value="in_progress">In Progress</SelectItem><SelectItem value="resolved">Resolved</SelectItem><SelectItem value="closed">Closed</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1"><Label className="text-xs">Subject *</Label><Input value={form.subject || ""} onChange={e => set("subject", e.target.value)} data-testid="input-ticket-subject" /></div>
            <div className="space-y-1"><Label className="text-xs">Description</Label><Textarea value={form.description || ""} onChange={e => set("description", e.target.value)} rows={3} /></div>
            <div className="space-y-1"><Label className="text-xs">Assigned To</Label><Input value={form.assigned_to || ""} onChange={e => set("assigned_to", e.target.value)} placeholder="HR officer name" /></div>
            {(editing || form.status === "resolved") && (
              <div className="space-y-1"><Label className="text-xs">Resolution</Label><Textarea value={form.resolution || ""} onChange={e => set("resolution", e.target.value)} rows={3} /></div>
            )}
            <div className="flex gap-2 justify-end pt-1">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending} data-testid="button-save-ticket">Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
