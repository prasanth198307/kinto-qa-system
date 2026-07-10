import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { RefreshCw, Send, MessageSquare, Mail, Phone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const api = (method: string, path: string, body?: unknown) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); });

interface NotificationLog {
  id: number;
  sent_at: string;
  channel: "WhatsApp" | "SMS" | "Email";
  recipient: string;
  message: string;
  status: "Sent" | "Failed" | "Pending";
  entity: string;
}

interface NotifStats {
  total_sent: number;
  whatsapp_count: number;
  sms_count: number;
  email_count: number;
  failure_rate: number;
}

const CHANNELS = ["All","WhatsApp","SMS","Email"] as const;
const STATUSES = ["All","Sent","Failed","Pending"] as const;

const channelIcon = (ch: string) => {
  if (ch === "WhatsApp") return <MessageSquare className="h-3 w-3" />;
  if (ch === "SMS") return <Phone className="h-3 w-3" />;
  return <Mail className="h-3 w-3" />;
};

const statusVariant = (s: string): "default" | "destructive" | "secondary" | "outline" => {
  if (s === "Sent") return "default";
  if (s === "Failed") return "destructive";
  return "secondary";
};

export default function NotificationLogPage() {
  const { toast } = useToast();
  const [channel, setChannel] = useState<string>("All");
  const [status, setStatus] = useState<string>("All");
  const [testDialog, setTestDialog] = useState(false);
  const [testForm, setTestForm] = useState({ channel: "WhatsApp", recipient: "", message: "" });
  const [page, setPage] = useState(0);

  const params = new URLSearchParams();
  if (channel !== "All") params.set("channel", channel);
  if (status !== "All") params.set("status", status);
  params.set("offset", String(page * 50));
  params.set("limit", "50");

  const { data: logs = [], refetch, isFetching } = useQuery<NotificationLog[]>({
    queryKey: ["notification-logs", channel, status, page],
    queryFn: () => api("GET", `/api/notifications/log?${params}`),
  });

  const { data: stats } = useQuery<NotifStats>({
    queryKey: ["notification-stats"],
    queryFn: () => api("GET", "/api/notifications/stats"),
  });

  const sendTestMut = useMutation({
    mutationFn: (body: unknown) => api("POST", "/api/notifications/send", body),
    onSuccess: () => { setTestDialog(false); toast({ title: "Test notification sent" }); refetch(); },
    onError: () => toast({ title: "Send failed", variant: "destructive" }),
  });

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Notification Log</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`h-4 w-4 mr-1 ${isFetching ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Button size="sm" onClick={() => setTestDialog(true)}>
            <Send className="h-4 w-4 mr-1" /> Send Test
          </Button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-5 gap-4">
          <Card className="p-4">
            <div className="text-xs text-muted-foreground">Total Sent (30d)</div>
            <div className="text-2xl font-bold">{stats.total_sent?.toLocaleString()}</div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-1 text-xs text-muted-foreground"><MessageSquare className="h-3 w-3" /> WhatsApp</div>
            <div className="text-2xl font-bold text-green-600">{stats.whatsapp_count?.toLocaleString()}</div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-1 text-xs text-muted-foreground"><Phone className="h-3 w-3" /> SMS</div>
            <div className="text-2xl font-bold text-blue-600">{stats.sms_count?.toLocaleString()}</div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-1 text-xs text-muted-foreground"><Mail className="h-3 w-3" /> Email</div>
            <div className="text-2xl font-bold text-purple-600">{stats.email_count?.toLocaleString()}</div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-muted-foreground">Failure Rate</div>
            <div className="text-2xl font-bold text-red-600">{stats.failure_rate?.toFixed(1)}%</div>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-end gap-4">
        <div className="space-y-1">
          <Label>Channel</Label>
          <Select value={channel} onValueChange={v => { setChannel(v); setPage(0); }}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>{CHANNELS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Status</Label>
          <Select value={status} onValueChange={v => { setStatus(v); setPage(0); }}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date / Time</TableHead>
                <TableHead>Channel</TableHead>
                <TableHead>Recipient</TableHead>
                <TableHead>Message</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Entity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No notifications found</TableCell></TableRow>
              )}
              {logs.map(log => (
                <TableRow key={log.id}>
                  <TableCell className="text-sm whitespace-nowrap">
                    {new Date(log.sent_at).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {channelIcon(log.channel)}
                      <span className="text-sm">{log.channel}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{log.recipient}</TableCell>
                  <TableCell className="text-sm max-w-xs truncate" title={log.message}>
                    {log.message.length > 60 ? log.message.slice(0, 60) + "…" : log.message}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(log.status)}>{log.status}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{log.entity}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {logs.length === 50 && (
        <div className="flex gap-2 justify-center">
          {page > 0 && <Button variant="outline" onClick={() => setPage(p => p - 1)}>Previous</Button>}
          <Button variant="outline" onClick={() => setPage(p => p + 1)}>Next</Button>
        </div>
      )}

      <Dialog open={testDialog} onOpenChange={setTestDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Send Test Notification</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Channel</Label>
              <Select value={testForm.channel} onValueChange={v => setTestForm(f => ({ ...f, channel: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["WhatsApp","SMS","Email"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Recipient</Label>
              <Input value={testForm.recipient} onChange={e => setTestForm(f => ({ ...f, recipient: e.target.value }))} placeholder="+91 9000000000 or email" />
            </div>
            <div className="space-y-1">
              <Label>Message</Label>
              <Textarea value={testForm.message} onChange={e => setTestForm(f => ({ ...f, message: e.target.value }))} rows={3} placeholder="Test message..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTestDialog(false)}>Cancel</Button>
            <Button onClick={() => sendTestMut.mutate(testForm)} disabled={!testForm.recipient || !testForm.message || sendTestMut.isPending}>
              Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
