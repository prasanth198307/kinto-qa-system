import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, BarChart3, BookOpen, GitBranch, MessageCircle, Sparkles } from "lucide-react";

const PRIORITY_COLORS: Record<string, string> = {
  critical: "bg-red-100 text-red-800 border-red-200",
  high: "bg-orange-100 text-orange-800 border-orange-200",
  medium: "bg-blue-100 text-blue-800 border-blue-200",
  low: "bg-gray-100 text-gray-700 border-gray-200",
};

const STATUS_COLORS: Record<string, string> = {
  open: "bg-yellow-100 text-yellow-800",
  in_progress: "bg-blue-100 text-blue-800",
  waiting_customer: "bg-purple-100 text-purple-800",
  resolved: "bg-green-100 text-green-800",
  closed: "bg-gray-100 text-gray-600",
};

function getSLAColor(ticket: any): string {
  if (!ticket.sla_due_at) return "";
  const due = new Date(ticket.sla_due_at);
  const now = new Date();
  const diff = due.getTime() - now.getTime();
  if (diff < 0) return "text-red-600 font-semibold";
  if (diff < 2 * 3600000) return "text-amber-600 font-semibold";
  return "text-green-600";
}

export default function SwachDeskPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [form, setForm] = useState({ subject: "", description: "", customer_name: "", customer_email: "", priority: "medium", category: "", channel: "portal" });

  const params = new URLSearchParams();
  if (statusFilter !== "all") params.set("status", statusFilter);
  if (priorityFilter !== "all") params.set("priority", priorityFilter);
  if (search) params.set("search", search);

  const { data: tickets = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/desk/tickets", statusFilter, priorityFilter, search],
    queryFn: async () => {
      const r = await fetch(`/api/desk/tickets?${params.toString()}`);
      return r.json();
    },
  });

  const { data: overview } = useQuery<any>({
    queryKey: ["/api/desk/reports/overview"],
    queryFn: async () => (await fetch("/api/desk/reports/overview")).json(),
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const r = await fetch("/api/desk/tickets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      if (!r.ok) throw new Error("Failed to create ticket");
      return r.json();
    },
    onSuccess: () => {
      toast({ title: "Ticket created" });
      setShowNewTicket(false);
      setForm({ subject: "", description: "", customer_name: "", customer_email: "", priority: "medium", category: "", channel: "portal" });
      qc.invalidateQueries({ queryKey: ["/api/desk/tickets"] });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const { data: kbStats } = useQuery<any[]>({
    queryKey: ["/api/desk/kb/articles/count"],
    queryFn: async () => (await fetch("/api/desk/kb/articles")).json(),
  });

  const { data: chatSessions } = useQuery<any[]>({
    queryKey: ["/api/desk/chat/sessions/count"],
    queryFn: async () => (await fetch("/api/desk/chat/sessions")).json(),
  });

  const kbCount = Array.isArray(kbStats) ? kbStats.filter((a: any) => a.status === "published").length : 0;
  const activeChats = Array.isArray(chatSessions) ? chatSessions.filter((s: any) => s.status !== "resolved").length : 0;

  const { data: sentimentReport } = useQuery<any>({
    queryKey: ["/api/ai/tickets/sentiment-report"],
    queryFn: async () => (await fetch("/api/ai/tickets/sentiment-report")).json(),
    retry: false,
  });

  const navTabs = [
    { label: "Tickets", path: "/swachdesk", icon: null },
    { label: "Knowledge Base", path: "/swachdesk/kb", icon: BookOpen },
    { label: "Routing Rules", path: "/swachdesk/routing", icon: GitBranch },
    { label: "Live Chat", path: "/swachdesk/chat", icon: MessageCircle },
    { label: "Reports", path: "/swachdesk/reports", icon: BarChart3 },
  ];

  return (
    <div className="space-y-0">
      {/* Nav tabs */}
      <div className="border-b px-6 flex gap-1 bg-background">
        {navTabs.map(tab => (
          <button
            key={tab.path}
            onClick={() => setLocation(tab.path)}
            className="py-3 px-4 text-sm font-medium border-b-2 border-transparent hover:text-primary transition-colors flex items-center gap-1.5 text-muted-foreground hover:border-primary"
          >
            {tab.icon && <tab.icon className="w-4 h-4" />}{tab.label}
            {tab.label === "Live Chat" && activeChats > 0 && <span className="bg-primary text-primary-foreground text-xs rounded-full px-1.5">{activeChats}</span>}
          </button>
        ))}
      </div>

    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">SwachDesk</h1>
          <p className="text-muted-foreground">Enterprise Helpdesk & Ticket Management</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setLocation("/swachdesk/reports")}><BarChart3 className="w-4 h-4 mr-2" />Reports</Button>
          <Button onClick={() => setShowNewTicket(true)}><Plus className="w-4 h-4 mr-2" />New Ticket</Button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="text-sm text-yellow-700">Open</div>
          <div className="text-2xl font-bold text-yellow-800">{overview?.total_open ?? 0}</div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="text-sm text-blue-700">In Progress</div>
          <div className="text-2xl font-bold text-blue-800">{overview?.total_in_progress ?? 0}</div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="text-sm text-green-700">Resolved Today</div>
          <div className="text-2xl font-bold text-green-800">{overview?.today_resolved ?? 0}</div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="text-sm text-red-700">Opened Today</div>
          <div className="text-2xl font-bold text-red-800">{overview?.today_opened ?? 0}</div>
        </div>
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
          <div className="text-sm text-indigo-700">KB Articles</div>
          <div className="text-2xl font-bold text-indigo-800">{kbCount}</div>
        </div>
        <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
          <div className="text-sm text-teal-700">Active Chats</div>
          <div className="text-2xl font-bold text-teal-800">{activeChats}</div>
        </div>
        {sentimentReport && sentimentReport.total > 0 && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 col-span-2 md:col-span-2">
            <div className="text-sm text-purple-700 flex items-center gap-1 mb-2">
              <Sparkles className="w-3.5 h-3.5" />AI Sentiment
            </div>
            <div className="flex gap-3 text-xs flex-wrap">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" /><span className="font-semibold">{sentimentReport.positive}</span> positive</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-400 inline-block" /><span className="font-semibold">{sentimentReport.neutral}</span> neutral</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-400 inline-block" /><span className="font-semibold">{sentimentReport.negative}</span> negative</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" /><span className="font-semibold">{sentimentReport.urgent}</span> urgent</span>
            </div>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search tickets..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="waiting_customer">Waiting Customer</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Priority" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priority</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Ticket table */}
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Ticket No</th>
              <th className="text-left px-4 py-3 font-medium">Subject</th>
              <th className="text-left px-4 py-3 font-medium">Customer</th>
              <th className="text-left px-4 py-3 font-medium">Priority</th>
              <th className="text-left px-4 py-3 font-medium">Status</th>
              <th className="text-left px-4 py-3 font-medium">Agent</th>
              <th className="text-left px-4 py-3 font-medium">SLA Due</th>
              <th className="text-left px-4 py-3 font-medium">Created</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={8} className="text-center py-8 text-muted-foreground">Loading...</td></tr>
            ) : tickets.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-8 text-muted-foreground">No tickets found</td></tr>
            ) : tickets.map((t: any) => (
              <tr key={t.id} className="border-t hover:bg-muted/30 cursor-pointer" onClick={() => setLocation(`/swachdesk/tickets/${t.id}`)}>
                <td className="px-4 py-3 font-mono text-xs">{t.ticket_no}</td>
                <td className="px-4 py-3 max-w-xs truncate font-medium">{t.subject}</td>
                <td className="px-4 py-3 text-muted-foreground">{t.customer_name || t.customer_email || "-"}</td>
                <td className="px-4 py-3">
                  <Badge className={`text-xs ${PRIORITY_COLORS[t.priority] || ""}`}>{t.priority}</Badge>
                </td>
                <td className="px-4 py-3">
                  <Badge className={`text-xs ${STATUS_COLORS[t.status] || ""}`}>{t.status?.replace(/_/g, " ")}</Badge>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{t.agent_name || "-"}</td>
                <td className={`px-4 py-3 text-xs ${getSLAColor(t)}`}>
                  {t.sla_due_at ? new Date(t.sla_due_at).toLocaleString() : "-"}
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(t.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* New Ticket Dialog */}
      <Dialog open={showNewTicket} onOpenChange={setShowNewTicket}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Create New Ticket</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Subject *</Label><Input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} /></div>
            <div><Label>Description</Label><Textarea rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Customer Name</Label><Input value={form.customer_name} onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))} /></div>
              <div><Label>Customer Email</Label><Input value={form.customer_email} onChange={e => setForm(f => ({ ...f, customer_email: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Priority</Label>
                <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Channel</Label>
                <Select value={form.channel} onValueChange={v => setForm(f => ({ ...f, channel: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="portal">Portal</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="phone">Phone</SelectItem>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    <SelectItem value="chat">Chat</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Category</Label><Input value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewTicket(false)}>Cancel</Button>
            <Button onClick={() => createMutation.mutate(form)} disabled={!form.subject || createMutation.isPending}>
              {createMutation.isPending ? "Creating..." : "Create Ticket"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </div>
  );
}
