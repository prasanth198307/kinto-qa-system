import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, Loader2, Megaphone, RefreshCw, Send, Trash2 } from "lucide-react";
import SuperAdminLayout from "./super-admin-layout";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface Announcement {
  id: number;
  title: string;
  body: string;
  audience: string;
  sent_at: string;
  sent_count: number;
}

const AUDIENCE_OPTIONS = [
  { value: "all",          label: "All Tenants" },
  { value: "trial",        label: "Trial Tenants" },
  { value: "active",       label: "Active (Paid) Tenants" },
  { value: "expiring_7d",  label: "Trials Expiring in 7 Days" },
  { value: "suspended",    label: "Suspended Tenants" },
];

const AUDIENCE_COLOR: Record<string, string> = {
  all:         "bg-blue-100 text-blue-800",
  trial:       "bg-yellow-100 text-yellow-800",
  active:      "bg-green-100 text-green-800",
  expiring_7d: "bg-orange-100 text-orange-800",
  suspended:   "bg-red-100 text-red-800",
};

export default function SuperAdminAnnouncements() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: announcements = [], isLoading, refetch } = useQuery<Announcement[]>({
    queryKey: ["/api/admin/announcements"],
  });

  const [form, setForm] = useState({ title: "", body: "", audience: "all" });

  const send = useMutation({
    mutationFn: () => apiRequest("POST", "/api/admin/announcements", form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/announcements"] });
      setForm({ title: "", body: "", audience: "all" });
      toast({ title: "Announcement sent!" });
    },
    onError: () => toast({ title: "Failed to send announcement", variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/admin/announcements/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/announcements"] });
      toast({ title: "Deleted" });
    },
  });

  const handleSend = () => {
    if (!form.title.trim() || !form.body.trim()) {
      toast({ title: "Title and message are required", variant: "destructive" });
      return;
    }
    send.mutate();
  };

  return (
    <SuperAdminLayout
      title="Announcements"
      subtitle="Broadcast in-app notifications to tenant segments"
      actions={
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-1.5" />
          Refresh
        </Button>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Compose */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Megaphone className="w-4 h-4" />
              Compose
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Audience</Label>
              <Select value={form.audience} onValueChange={v => setForm(p => ({ ...p, audience: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AUDIENCE_OPTIONS.map(o => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input
                placeholder="e.g. Scheduled maintenance on July 15"
                value={form.title}
                onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Message</Label>
              <Textarea
                placeholder="Write your announcement…"
                rows={5}
                value={form.body}
                onChange={e => setForm(p => ({ ...p, body: e.target.value }))}
              />
            </div>
            <Button className="w-full" onClick={handleSend} disabled={send.isPending}>
              {send.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              Send Announcement
            </Button>
          </CardContent>
        </Card>

        {/* History */}
        <div className="lg:col-span-2 space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Sent History</h3>
          {isLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : announcements.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
              <Megaphone className="h-10 w-10 opacity-20 mb-3" />
              <p className="font-medium">No announcements sent yet</p>
              <p className="text-sm">Use the form to broadcast to your tenants.</p>
            </div>
          ) : (
            announcements.map(ann => (
              <div key={ann.id} className="border rounded-md p-4 bg-card flex gap-3">
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-sm">{ann.title}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${AUDIENCE_COLOR[ann.audience] ?? AUDIENCE_COLOR.all}`}>
                      {AUDIENCE_OPTIONS.find(o => o.value === ann.audience)?.label ?? ann.audience}
                    </span>
                    <Badge variant="outline" className="text-xs">{ann.sent_count} recipients</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{ann.body}</p>
                  <p className="text-xs text-muted-foreground">{format(new Date(ann.sent_at), "d MMM yyyy, h:mm a")}</p>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="shrink-0 text-destructive hover:text-destructive"
                  onClick={() => remove.mutate(ann.id)}
                  disabled={remove.isPending}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))
          )}
        </div>
      </div>
    </SuperAdminLayout>
  );
}
