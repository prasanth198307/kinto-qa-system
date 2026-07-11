import { apiFetch } from "@/lib/api-fetch";
import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Video, Plus, Users, Clock, Play, CheckCircle, Calendar, Zap,
  Film, Download, Sparkles, ChevronDown, ChevronUp,
  BarChart2, Copy, Hash, Trash2,
  Send, Globe, Lock, RefreshCw, X,
  ListTodo, Layout
} from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  scheduled: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  live: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  ended: "bg-muted text-muted-foreground",
  cancelled: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};
const ROOM_TYPES = ["meeting", "demo", "board", "support", "webinar", "training", "interview", "standup"];
const TABS = ["home", "meetings", "channels", "webinars", "recordings", "calendar", "analytics"] as const;
type Tab = typeof TABS[number];

function generateRoomId() { return crypto.randomUUID().replace(/-/g, "").slice(0, 12); }
function fmtDate(d: string | null) { if (!d) return "TBD"; return new Date(d).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }); }
function fmtTime(d: string | null) { if (!d) return "—"; return new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); }
function fmtDuration(m: number) { if (!m) return "0m"; if (m < 60) return `${m}m`; return `${Math.floor(m / 60)}h ${m % 60}m`; }

export default function SwachMeetIndex() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("home");
  const [schedOpen, setSchedOpen] = useState(false);
  const [chanOpen, setChanOpen] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<any>(null);
  const [chatMsg, setChatMsg] = useState("");
  const chatRef = useRef<HTMLDivElement>(null);

  const [form, setForm] = useState({
    title: "", scheduled_at: "", room_type: "meeting", max_participants: 10,
    password: "", description: "", template_id: "", invite_emails: ""
  });
  const [chanForm, setChanForm] = useState({ name: "", description: "", channel_type: "public" });

  const { data: rooms = [] } = useQuery<any[]>({ queryKey: ["/api/meet/rooms"], queryFn: () => apiFetch("/api/meet/rooms") });
  const { data: stats } = useQuery<any>({ queryKey: ["/api/meet/stats"], queryFn: () => apiFetch("/api/meet/stats") });
  const { data: channels = [] } = useQuery<any[]>({ queryKey: ["/api/meet/channels"], queryFn: () => apiFetch("/api/meet/channels"), enabled: tab === "channels" || tab === "home" });
  const { data: analytics } = useQuery<any>({ queryKey: ["/api/swachmeet/analytics"], queryFn: () => apiFetch("/api/swachmeet/analytics?days=30"), enabled: tab === "analytics" });
  const { data: templates = [] } = useQuery<any[]>({ queryKey: ["/api/meet/templates"], queryFn: () => apiFetch("/api/meet/templates"), enabled: schedOpen });
  const { data: tenantUsers = [] } = useQuery<any[]>({ queryKey: ["/api/users"], queryFn: () => apiFetch("/api/users"), enabled: schedOpen });
  const { data: chanMessages = [] } = useQuery<any[]>({
    queryKey: ["/api/meet/channels", selectedChannel?.id, "messages"],
    queryFn: () => apiFetch(`/api/meet/channels/${selectedChannel.id}/messages`),
    enabled: !!selectedChannel,
    refetchInterval: selectedChannel ? 4000 : false,
  });

  useEffect(() => { if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight; }, [chanMessages]);

  const createMut = useMutation({
    mutationFn: (body: any) => {
      const emailList = body.invite_emails
        ? body.invite_emails.split(/[\s,;]+/).map((e: string) => e.trim()).filter(Boolean)
        : [];
      return apiRequest("POST", "/api/meet/rooms", { ...body, invite_emails: emailList });
    },
    onSuccess: async (res) => {
      const room = await res.json();
      qc.invalidateQueries({ queryKey: ["/api/meet/rooms"] });
      setSchedOpen(false);
      setForm({ title: "", scheduled_at: "", room_type: "meeting", max_participants: 10, password: "", description: "", template_id: "", invite_emails: "" });
      toast({ title: "Meeting scheduled", description: room.invite_emails?.length ? `Invites sent to ${room.invite_emails?.length} people` : room.room_no });
    },
    onError: () => toast({ title: "Error", variant: "destructive" }),
  });

  const createChanMut = useMutation({
    mutationFn: (body: any) => apiRequest("POST", "/api/meet/channels", body),
    onSuccess: async (res) => {
      const ch = await res.json();
      qc.invalidateQueries({ queryKey: ["/api/meet/channels"] });
      setChanOpen(false);
      setChanForm({ name: "", description: "", channel_type: "public" });
      setSelectedChannel(ch);
      setTab("channels");
    },
    onError: () => toast({ title: "Error creating channel", variant: "destructive" }),
  });

  const sendMsgMut = useMutation({
    mutationFn: ({ channelId, message }: any) => apiRequest("POST", `/api/meet/channels/${channelId}/messages`, { message }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/meet/channels", selectedChannel?.id, "messages"] }); setChatMsg(""); },
  });

  const deleteChanMut = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/meet/channels/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/meet/channels"] }); setSelectedChannel(null); },
  });

  const cancelMeetMut = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/meet/rooms/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/meet/rooms"] }),
  });

  const instantMeetMut = useMutation({
    mutationFn: () => apiRequest("POST", "/api/meet/rooms", { title: "Instant Meeting", room_type: "meeting", max_participants: 10 }),
    onSuccess: async (res) => {
      const room = await res.json();
      qc.invalidateQueries({ queryKey: ["/api/meet/rooms"] });
      navigate(`/meet/${room.room_code || room.id}`);
    },
    onError: () => toast({ title: "Failed to start meeting", variant: "destructive" }),
  });

  function copyJitsiLink(room: any) {
    const link = `https://meet.jit.si/SwachERP-${room.room_code || room.id}`;
    navigator.clipboard.writeText(link);
    toast({ title: "Link copied!" });
  }

  function applyTemplate(tmpl: any) {
    setForm(f => ({ ...f, room_type: tmpl.room_type, max_participants: tmpl.max_participants, title: f.title || tmpl.name }));
  }

  const upcoming = (rooms as any[]).filter(r => r.status === "scheduled").sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());
  const live = (rooms as any[]).filter(r => r.status === "live");
  const past = (rooms as any[]).filter(r => r.status === "ended").sort((a, b) => new Date(b.ended_at || 0).getTime() - new Date(a.ended_at || 0).getTime());
  const webinars = (rooms as any[]).filter(r => r.room_type === "webinar");

  return (
    <div className="flex h-full">
      {/* Left Sidebar */}
      <div className="w-56 shrink-0 border-r bg-muted/30 flex flex-col">
        <div className="p-4 border-b">
          <div className="flex items-center gap-2 font-bold text-base">
            <Video className="w-5 h-5 text-blue-600" /> SwachMeet
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">Video · Chat · Webinars</p>
        </div>
        <div className="flex-1 overflow-y-auto py-2">
          {TABS.map(t => {
            const icons: Record<Tab, any> = {
              home: Layout, meetings: Calendar, channels: Hash, webinars: Globe,
              recordings: Film, calendar: Calendar, analytics: BarChart2,
            };
            const Icon = icons[t];
            return (
              <button key={t} data-testid={`tab-${t}`} onClick={() => setTab(t)}
                className={`w-full flex items-center gap-2.5 px-4 py-2 text-sm capitalize transition-colors ${tab === t ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 font-medium" : "text-muted-foreground hover:text-foreground hover:bg-muted/60"}`}>
                <Icon className="w-4 h-4" /> {t}
                {t === "channels" && (channels as any[]).length > 0 && <span className="ml-auto text-xs bg-muted rounded-full px-1.5">{(channels as any[]).length}</span>}
              </button>
            );
          })}

          {/* Channels quick-access */}
          {(channels as any[]).length > 0 && (
            <div className="mt-3 px-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Channels</p>
              {(channels as any[]).slice(0, 6).map((ch: any) => (
                <button key={ch.id} onClick={() => { setSelectedChannel(ch); setTab("channels"); }}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded transition-colors ${selectedChannel?.id === ch.id ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700" : "text-muted-foreground hover:text-foreground hover:bg-muted/40"}`}>
                  <Hash className="w-3 h-3" /> {ch.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="p-3 border-t space-y-2">
          <Button size="sm" className="w-full" onClick={() => instantMeetMut.mutate()}>
            <Zap className="w-3.5 h-3.5 mr-1.5" /> Instant Meeting
          </Button>
          <Button size="sm" variant="outline" className="w-full" onClick={() => setSchedOpen(true)}>
            <Plus className="w-3.5 h-3.5 mr-1.5" /> Schedule
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        {/* HOME */}
        {tab === "home" && (
          <div className="p-6 space-y-6">
            <div>
              <h1 className="text-xl font-bold">Welcome to SwachMeet</h1>
              <p className="text-muted-foreground text-sm">Your unified collaboration hub</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Meetings This Month", value: stats?.meetings_this_month || 0, icon: Video, color: "text-blue-600" },
                { label: "Avg Duration", value: `${Math.round(stats?.avg_duration || 0)}m`, icon: Clock, color: "text-green-600" },
                { label: "Recordings", value: stats?.recordings_count || 0, icon: Film, color: "text-purple-600" },
                { label: "Webinar Registrations", value: stats?.webinar_registrations_this_month || 0, icon: Users, color: "text-orange-600" },
              ].map(s => (
                <Card key={s.label}>
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-start justify-between">
                      <div><p className="text-xs text-muted-foreground">{s.label}</p><p className="text-2xl font-bold mt-1">{s.value}</p></div>
                      <s.icon className={`w-5 h-5 ${s.color} mt-0.5`} />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Live Now */}
            {live.length > 0 && (
              <Card className="border-green-300 bg-green-50 dark:bg-green-900/10 dark:border-green-800">
                <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2 text-green-700 dark:text-green-400"><span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" /> Live Now</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {live.map((room: any) => (
                    <div key={room.id} className="flex flex-wrap items-center justify-between gap-2 p-3 bg-white dark:bg-card border border-green-200 dark:border-green-800 rounded-lg">
                      <div><p className="font-medium text-sm">{room.title}</p><p className="text-xs text-muted-foreground">{room.room_no} · {room.participant_count || 0} participants</p></div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => copyJitsiLink(room)}><Copy className="w-3.5 h-3.5 mr-1" />Copy Link</Button>
                        <Button size="sm" onClick={() => navigate(`/meet/${room.room_code || room.id}`)}><Play className="w-3.5 h-3.5 mr-1" />Join</Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Upcoming */}
            <div>
              <h2 className="font-semibold text-sm mb-3 flex items-center gap-2"><Calendar className="w-4 h-4" /> Upcoming Meetings</h2>
              {upcoming.filter(r => r.room_type !== "webinar").length === 0
                ? <p className="text-sm text-muted-foreground text-center py-8 border rounded-lg">No upcoming meetings. <button className="text-blue-600 underline" onClick={() => setSchedOpen(true)}>Schedule one</button>.</p>
                : <div className="space-y-2">
                  {upcoming.filter(r => r.room_type !== "webinar").slice(0, 5).map((room: any) => (
                    <MeetingCard key={room.id} room={room} onJoin={() => navigate(`/meet/${room.room_code || room.id}`)} onCopy={() => copyJitsiLink(room)} onCancel={() => cancelMeetMut.mutate(room.id)} />
                  ))}
                  {upcoming.length > 5 && <button className="text-sm text-blue-600 hover:underline" onClick={() => setTab("meetings")}>View all {upcoming.length} meetings →</button>}
                </div>}
            </div>

            {/* Quick Actions */}
            <div>
              <h2 className="font-semibold text-sm mb-3">Quick Actions</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: "Start Instant Meeting", icon: Video, color: "bg-blue-50 dark:bg-blue-900/20 text-blue-700", action: () => instantMeetMut.mutate() },
                  { label: "Schedule Meeting", icon: Calendar, color: "bg-green-50 dark:bg-green-900/20 text-green-700", action: () => setSchedOpen(true) },
                  { label: "Create Channel", icon: Hash, color: "bg-purple-50 dark:bg-purple-900/20 text-purple-700", action: () => setChanOpen(true) },
                  { label: "Start Webinar", icon: Globe, color: "bg-orange-50 dark:bg-orange-900/20 text-orange-700", action: () => { setForm(f => ({ ...f, room_type: "webinar" })); setSchedOpen(true); } },
                ].map(a => (
                  <button key={a.label} onClick={a.action} className={`flex flex-col items-center gap-2 p-4 rounded-lg ${a.color} hover-elevate transition-colors text-sm font-medium`}>
                    <a.icon className="w-5 h-5" />{a.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* MEETINGS */}
        {tab === "meetings" && (
          <div className="p-6 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h1 className="text-lg font-bold">Meetings</h1>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => instantMeetMut.mutate()}><Zap className="w-3.5 h-3.5 mr-1.5" />Instant</Button>
                <Button size="sm" onClick={() => setSchedOpen(true)}><Plus className="w-3.5 h-3.5 mr-1.5" />Schedule</Button>
              </div>
            </div>
            {live.length > 0 && <div className="space-y-2">
              <p className="text-xs font-medium text-green-700 uppercase tracking-wide">Live</p>
              {live.map((r: any) => <MeetingCard key={r.id} room={r} onJoin={() => navigate(`/meet/${r.room_code || r.id}`)} onCopy={() => copyJitsiLink(r)} onCancel={() => cancelMeetMut.mutate(r.id)} />)}
            </div>}
            {upcoming.filter(r => r.room_type !== "webinar").length > 0 && <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Upcoming</p>
              {upcoming.filter(r => r.room_type !== "webinar").map((r: any) => <MeetingCard key={r.id} room={r} onJoin={() => navigate(`/meet/${r.room_code || r.id}`)} onCopy={() => copyJitsiLink(r)} onCancel={() => cancelMeetMut.mutate(r.id)} />)}
            </div>}
            {past.length > 0 && <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Past</p>
              {past.slice(0, 20).map((r: any) => <MeetingCard key={r.id} room={r} onJoin={() => navigate(`/meet/${r.room_code || r.id}`)} onCopy={() => copyJitsiLink(r)} onCancel={() => {}} isPast />)}
            </div>}
          </div>
        )}

        {/* CHANNELS */}
        {tab === "channels" && (
          <div className="flex h-full">
            {/* Channel list */}
            <div className="w-56 shrink-0 border-r bg-muted/20 flex flex-col">
              <div className="p-3 border-b flex items-center justify-between">
                <p className="text-sm font-semibold">Channels</p>
                <Button size="icon" variant="ghost" onClick={() => setChanOpen(true)} data-testid="button-create-channel"><Plus className="w-4 h-4" /></Button>
              </div>
              <div className="flex-1 overflow-y-auto py-1">
                {(channels as any[]).length === 0 && <p className="text-xs text-muted-foreground px-4 py-4">No channels yet.</p>}
                {(channels as any[]).map((ch: any) => (
                  <button key={ch.id} onClick={() => setSelectedChannel(ch)}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors ${selectedChannel?.id === ch.id ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400" : "hover:bg-muted/60 text-muted-foreground"}`}>
                    {ch.channel_type === "public" ? <Hash className="w-3.5 h-3.5 shrink-0" /> : <Lock className="w-3.5 h-3.5 shrink-0" />}
                    <span className="truncate">{ch.name}</span>
                    {parseInt(ch.message_count) > 0 && <span className="ml-auto text-xs text-muted-foreground">{ch.message_count}</span>}
                  </button>
                ))}
              </div>
            </div>
            {/* Chat area */}
            {selectedChannel ? (
              <div className="flex-1 flex flex-col min-w-0">
                <div className="p-3 border-b flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Hash className="w-4 h-4 text-muted-foreground" />
                    <span className="font-semibold text-sm">{selectedChannel.name}</span>
                    {selectedChannel.description && <span className="text-xs text-muted-foreground hidden sm:block">· {selectedChannel.description}</span>}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="outline" onClick={() => instantMeetMut.mutate()}><Video className="w-3.5 h-3.5 mr-1" />Meet Now</Button>
                    <Button size="icon" variant="ghost" onClick={() => deleteChanMut.mutate(selectedChannel.id)} data-testid="button-delete-channel"><Trash2 className="w-3.5 h-3.5 text-muted-foreground" /></Button>
                  </div>
                </div>
                <div ref={chatRef} className="flex-1 overflow-y-auto p-4 space-y-3">
                  {(chanMessages as any[]).length === 0 && (
                    <div className="text-center py-16 text-muted-foreground">
                      <Hash className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">No messages yet. Start the conversation!</p>
                    </div>
                  )}
                  {(chanMessages as any[]).map((msg: any) => (
                    <div key={msg.id} className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xs font-bold text-blue-700 dark:text-blue-400 shrink-0">
                        {(msg.sender_name || "U").slice(0, 1).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-sm font-medium">{msg.sender_name || "User"}</span>
                          <span className="text-xs text-muted-foreground">{new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                        </div>
                        <p className="text-sm mt-0.5">{msg.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-3 border-t flex gap-2">
                  <Input value={chatMsg} onChange={e => setChatMsg(e.target.value)} placeholder={`Message #${selectedChannel.name}`}
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (chatMsg.trim()) sendMsgMut.mutate({ channelId: selectedChannel.id, message: chatMsg }); } }}
                    data-testid="input-channel-message" />
                  <Button size="icon" onClick={() => { if (chatMsg.trim()) sendMsgMut.mutate({ channelId: selectedChannel.id, message: chatMsg }); }} data-testid="button-send-message"><Send className="w-4 h-4" /></Button>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground flex-col gap-3">
                <Hash className="w-10 h-10 opacity-20" />
                <p className="text-sm">Select a channel to start chatting</p>
                <Button size="sm" onClick={() => setChanOpen(true)}><Plus className="w-4 h-4 mr-1" />Create Channel</Button>
              </div>
            )}
          </div>
        )}

        {/* WEBINARS */}
        {tab === "webinars" && (
          <div className="p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h1 className="text-lg font-bold">Webinars</h1>
              <Button size="sm" onClick={() => { setForm(f => ({ ...f, room_type: "webinar", max_participants: 500 })); setSchedOpen(true); }}>
                <Globe className="w-4 h-4 mr-1.5" />Create Webinar
              </Button>
            </div>
            {webinars.length === 0
              ? <div className="text-center py-16 text-muted-foreground border rounded-lg"><Globe className="w-10 h-10 mx-auto mb-3 opacity-20" /><p className="text-sm">No webinars yet.</p></div>
              : webinars.map((r: any) => (
                <Card key={r.id}>
                  <CardContent className="pt-4 pb-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2"><Badge className={STATUS_COLORS[r.status] || ""}>{r.status}</Badge><span className="font-medium">{r.title}</span></div>
                        <p className="text-xs text-muted-foreground mt-1">{fmtDate(r.scheduled_at)} · {r.registration_count || 0} registered · Max {r.max_participants}</p>
                        {r.description && <p className="text-xs text-muted-foreground mt-1">{r.description}</p>}
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/meet/register/${r.room_code}`); toast({ title: "Registration link copied!" }); }}>
                          <Copy className="w-3.5 h-3.5 mr-1" />Registration Link
                        </Button>
                        {r.status !== "ended" && <Button size="sm" onClick={() => navigate(`/meet/${r.room_code || r.id}`)}><Play className="w-3.5 h-3.5 mr-1" />Start</Button>}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        )}

        {/* RECORDINGS */}
        {tab === "recordings" && <RecordingsTab rooms={rooms as any[]} />}

        {/* CALENDAR */}
        {tab === "calendar" && <CalendarTab rooms={rooms as any[]} onNavigate={navigate} />}

        {/* ANALYTICS */}
        {tab === "analytics" && (
          <div className="p-6 space-y-5">
            <h1 className="text-lg font-bold">Meeting Analytics</h1>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { label: "Total Meetings", value: analytics?.total_meetings || 0, color: "bg-blue-50 dark:bg-blue-900/20 text-blue-700" },
                { label: "Total Participants", value: analytics?.total_participants || 0, color: "bg-green-50 dark:bg-green-900/20 text-green-700" },
                { label: "Avg Duration", value: `${analytics?.avg_duration_minutes || 0} min`, color: "bg-purple-50 dark:bg-purple-900/20 text-purple-700" },
              ].map(s => (
                <Card key={s.label}><CardContent className={`pt-5 pb-5 rounded-lg ${s.color}`}><p className="text-2xl font-bold">{s.value}</p><p className="text-sm mt-1 opacity-80">{s.label}</p></CardContent></Card>
              ))}
            </div>
            {analytics?.meetings_by_day?.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-sm">Meetings by Day (Last 30 days)</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-1.5">
                    {(analytics.meetings_by_day as any[]).map((d: any) => {
                      const max = Math.max(...(analytics.meetings_by_day as any[]).map((x: any) => parseInt(x.count)));
                      return (
                        <div key={d.date} className="flex items-center gap-3 text-sm">
                          <span className="w-24 text-xs text-muted-foreground shrink-0">{new Date(d.date).toLocaleDateString([], { month: "short", day: "numeric" })}</span>
                          <div className="flex-1 bg-muted rounded-full h-3 overflow-hidden">
                            <div className="h-3 bg-blue-500 rounded-full transition-all" style={{ width: `${max > 0 ? (parseInt(d.count) / max) * 100 : 0}%` }} />
                          </div>
                          <span className="text-xs w-4 text-right text-muted-foreground">{d.count}</span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
            <div className="flex gap-3 pt-2">
              <Button variant="outline" size="sm" onClick={() => window.open("/api/meet/calendar.ics", "_blank")}><Download className="w-3.5 h-3.5 mr-1.5" />Export Calendar (.ics)</Button>
            </div>
          </div>
        )}
      </div>

      {/* Schedule Meeting Dialog */}
      <Dialog open={schedOpen} onOpenChange={setSchedOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{form.room_type === "webinar" ? "Create Webinar" : "Schedule Meeting"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {templates.length > 0 && (
              <div>
                <Label className="text-xs">Use Template</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {(templates as any[]).map((t: any) => (
                    <Button key={t.id} size="sm" variant="outline" className="text-xs h-7" onClick={() => applyTemplate(t)}><Layout className="w-3 h-3 mr-1" />{t.name}</Button>
                  ))}
                </div>
              </div>
            )}
            <div><Label>Title</Label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Weekly Standup" data-testid="input-meeting-title" /></div>
            <div><Label>Date & Time</Label><Input type="datetime-local" value={form.scheduled_at} onChange={e => setForm(f => ({ ...f, scheduled_at: e.target.value }))} data-testid="input-meeting-time" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Meeting Type</Label>
                <Select value={form.room_type} onValueChange={v => setForm(f => ({ ...f, room_type: v }))}>
                  <SelectTrigger data-testid="select-room-type"><SelectValue /></SelectTrigger>
                  <SelectContent>{ROOM_TYPES.map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Max Participants</Label><Input type="number" value={form.max_participants} onChange={e => setForm(f => ({ ...f, max_participants: parseInt(e.target.value) || 10 }))} min={2} max={1000} data-testid="input-max-participants" /></div>
            </div>
            <div><Label>Password (optional)</Label><Input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Leave blank for open access" /></div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="What's this meeting about?" rows={2} /></div>
            <div>
              <Label>Invite Participants</Label>
              {(tenantUsers as any[]).length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-1 mb-2">
                  {(tenantUsers as any[]).filter((u: any) => u.email).map((u: any) => {
                    const already = form.invite_emails.includes(u.email);
                    return (
                      <button key={u.id} type="button"
                        onClick={() => setForm(f => ({
                          ...f,
                          invite_emails: already
                            ? f.invite_emails.split(/[\s,;]+/).filter(e => e.trim() !== u.email).join(", ")
                            : [f.invite_emails, u.email].filter(Boolean).join(", ")
                        }))}
                        className={`text-xs px-2 py-1 rounded-full border transition-colors ${already ? "bg-blue-600 text-white border-blue-600" : "border-border text-muted-foreground hover:border-blue-400 hover:text-blue-600"}`}>
                        {u.name || u.email}
                      </button>
                    );
                  })}
                </div>
              )}
              <Textarea value={form.invite_emails} onChange={e => setForm(f => ({ ...f, invite_emails: e.target.value }))}
                placeholder="email1@example.com, email2@example.com" rows={2}
                data-testid="input-invite-emails" />
              <p className="text-xs text-muted-foreground mt-1">Comma-separated emails — system users and external guests both receive email invites</p>
            </div>
            <Button className="w-full" onClick={() => createMut.mutate(form)} disabled={createMut.isPending} data-testid="button-create-meeting">
              {createMut.isPending ? "Creating…" : form.room_type === "webinar" ? "Create Webinar" : "Schedule Meeting"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Channel Dialog */}
      <Dialog open={chanOpen} onOpenChange={setChanOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Channel</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Channel Name</Label><Input value={chanForm.name} onChange={e => setChanForm(f => ({ ...f, name: e.target.value }))} placeholder="general" data-testid="input-channel-name" /></div>
            <div><Label>Description</Label><Textarea value={chanForm.description} onChange={e => setChanForm(f => ({ ...f, description: e.target.value }))} placeholder="What's this channel about?" rows={2} /></div>
            <div>
              <Label>Type</Label>
              <Select value={chanForm.channel_type} onValueChange={v => setChanForm(f => ({ ...f, channel_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="public"><Globe className="w-3.5 h-3.5 inline mr-1.5" />Public</SelectItem>
                  <SelectItem value="private"><Lock className="w-3.5 h-3.5 inline mr-1.5" />Private</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full" onClick={() => createChanMut.mutate(chanForm)} disabled={createChanMut.isPending} data-testid="button-confirm-create-channel">
              {createChanMut.isPending ? "Creating…" : "Create Channel"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MeetingCard({ room, onJoin, onCopy, onCancel, isPast = false }: { room: any; onJoin: () => void; onCopy: () => void; onCancel: () => void; isPast?: boolean }) {
  return (
    <Card>
      <CardContent className="py-3 px-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${room.room_type === "webinar" ? "bg-orange-100 dark:bg-orange-900/30" : "bg-blue-100 dark:bg-blue-900/30"}`}>
              {room.room_type === "webinar" ? <Globe className="w-4 h-4 text-orange-600" /> : <Video className="w-4 h-4 text-blue-600" />}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-sm">{room.title}</span>
                <Badge className={`text-xs ${STATUS_COLORS[room.status] || ""}`}>{room.status}</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {room.room_no} · {fmtDate(room.scheduled_at || room.started_at)}
                {room.duration_mins ? ` · ${fmtDuration(room.duration_mins)}` : ""}
                {room.participant_count ? ` · ${room.participant_count} participants` : ""}
              </p>
            </div>
          </div>
          <div className="flex gap-1.5 shrink-0">
            <Button size="sm" variant="outline" onClick={onCopy} title="Copy link"><Copy className="w-3.5 h-3.5" /></Button>
            {!isPast && <Button size="sm" onClick={onJoin}><Play className="w-3.5 h-3.5 mr-1" />Join</Button>}
            {!isPast && <Button size="sm" variant="ghost" onClick={onCancel}><X className="w-3.5 h-3.5 text-muted-foreground" /></Button>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function RecordingsTab({ rooms }: { rooms: any[] }) {
  const [, navigate] = useLocation();
  return (
    <div className="p-6 space-y-5">
      <h1 className="text-lg font-bold">Recordings</h1>
      <Card>
        <CardContent className="pt-8 pb-8 text-center space-y-4">
          <Film className="w-12 h-12 mx-auto text-purple-500" />
          <p className="text-muted-foreground">View and manage all Jibri recordings, download MP4 files, and generate AI transcripts.</p>
          <Button onClick={() => navigate("/swachmeet/recordings")}><Film className="w-4 h-4 mr-2" /> Open Recordings</Button>
        </CardContent>
      </Card>
    </div>
  );
}

function RecordingsTabOld({ rooms }: { rooms: any[] }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null);
  const [transcribeResult, setTranscribeResult] = useState<any>(null);
  const [transcribing, setTranscribing] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);

  const { data: recordings = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/meet/rooms", selectedRoomId, "recordings"],
    queryFn: () => apiFetch(`/api/meet/rooms/${selectedRoomId}/recordings`),
    enabled: !!selectedRoomId,
  });

  const fetchMut = useMutation({
    mutationFn: (id: number) => apiRequest("POST", `/api/meet/rooms/${id}/recordings/fetch`),
    onSuccess: async (res) => { const d = await res.json(); toast({ title: `Fetched ${d.fetched} recordings` }); qc.invalidateQueries({ queryKey: ["/api/meet/rooms", selectedRoomId, "recordings"] }); },
  });

  async function transcribe() {
    setTranscribing(true);
    try {
      const r = await fetch(`/api/ai/meetings/${selectedRoomId}/transcribe`, { method: "POST" });
      const d = await r.json();
      setTranscribeResult(d);
      toast({ title: "Transcript ready!" });
    } catch { toast({ title: "Failed", variant: "destructive" }); }
    setTranscribing(false);
  }

  const endedRooms = rooms.filter(r => r.status === "ended");

  return (
    <div className="p-6 space-y-5">
      <h1 className="text-lg font-bold">Recordings</h1>
      <Card>
        <CardContent className="pt-4 space-y-4">
          <div className="flex flex-wrap gap-3">
            <Select value={selectedRoomId?.toString() || ""} onValueChange={v => setSelectedRoomId(parseInt(v))}>
              <SelectTrigger className="flex-1 min-w-48"><SelectValue placeholder="Select a meeting" /></SelectTrigger>
              <SelectContent>{endedRooms.map(r => <SelectItem key={r.id} value={r.id.toString()}>{r.title} ({r.room_no})</SelectItem>)}</SelectContent>
            </Select>
            {selectedRoomId && <>
              <Button variant="outline" onClick={() => fetchMut.mutate(selectedRoomId)} disabled={fetchMut.isPending}><RefreshCw className="w-4 h-4 mr-1.5" />{fetchMut.isPending ? "Fetching…" : "Fetch"}</Button>
              <Button variant="outline" onClick={transcribe} disabled={transcribing} className="text-purple-700 border-purple-300 dark:border-purple-700 dark:text-purple-400"><Sparkles className="w-4 h-4 mr-1.5" />{transcribing ? "Transcribing…" : "AI Transcribe"}</Button>
            </>}
          </div>
          {!selectedRoomId && <p className="text-sm text-muted-foreground text-center py-8">Select a meeting to view recordings</p>}
          {selectedRoomId && isLoading && <p className="text-sm text-center py-4 text-muted-foreground">Loading…</p>}
          {selectedRoomId && !isLoading && (recordings as any[]).length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No recordings found. Click Fetch to pull from Daily.co.</p>}
          <div className="space-y-2">
            {(recordings as any[]).map((rec: any) => (
              <div key={rec.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="text-sm font-medium">Recording #{rec.id}</p>
                  <p className="text-xs text-muted-foreground">{rec.duration_secs ? `${Math.round(rec.duration_secs / 60)} min` : "—"}{rec.file_size_bytes ? ` · ${(rec.file_size_bytes / 1024 / 1024).toFixed(1)} MB` : ""}</p>
                </div>
                <div className="flex gap-2 items-center">
                  <Badge className={rec.status === "ready" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}>{rec.status}</Badge>
                  {rec.download_url && <Button size="sm" variant="outline" onClick={() => window.open(rec.download_url, "_blank")}><Download className="w-3.5 h-3.5" /></Button>}
                </div>
              </div>
            ))}
          </div>
          {transcribeResult && (
            <div className="p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg space-y-3">
              <div className="flex items-center gap-2"><Sparkles className="w-4 h-4 text-purple-600" /><strong className="text-sm">AI Meeting Summary</strong>{transcribeResult.simulated && <Badge className="bg-amber-100 text-amber-700 text-xs">Demo</Badge>}</div>
              {transcribeResult.summary && <p className="text-sm">{transcribeResult.summary}</p>}
              {transcribeResult.action_items?.length > 0 && <div><p className="text-xs font-semibold text-purple-700 dark:text-purple-400 mb-1">Action Items</p><ul className="space-y-1">{transcribeResult.action_items.map((a: string, i: number) => <li key={i} className="flex items-start gap-2 text-sm"><CheckCircle className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" />{a}</li>)}</ul></div>}
              {transcribeResult.transcript && <div>
                <button onClick={() => setShowTranscript(t => !t)} className="text-xs text-purple-600 flex items-center gap-1 hover:underline">{showTranscript ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}{showTranscript ? "Hide" : "Show"} Transcript</button>
                {showTranscript && <textarea readOnly value={transcribeResult.transcript} rows={8} className="w-full mt-2 p-2 text-xs border rounded font-mono resize-y bg-background" />}
              </div>}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function CalendarTab({ rooms, onNavigate }: { rooms: any[]; onNavigate: (path: string) => void }) {
  const [view, setView] = useState<"month" | "week">("week");
  const [refDate, setRefDate] = useState(new Date());

  const scheduled = rooms.filter(r => r.scheduled_at && r.status !== "cancelled");

  function getDaysInView(): Date[] {
    if (view === "week") {
      const start = new Date(refDate);
      start.setDate(start.getDate() - start.getDay());
      return Array.from({ length: 7 }, (_, i) => { const d = new Date(start); d.setDate(d.getDate() + i); return d; });
    }
    const start = new Date(refDate.getFullYear(), refDate.getMonth(), 1);
    const firstDay = start.getDay();
    const days: Date[] = [];
    for (let i = 0; i < firstDay; i++) { const d = new Date(start); d.setDate(d.getDate() - firstDay + i); days.push(d); }
    for (let i = 0; i < 35 - firstDay; i++) { const d = new Date(start); d.setDate(d.getDate() + i); days.push(d); }
    return days;
  }

  const days = getDaysInView();
  const today = new Date(); today.setHours(0, 0, 0, 0);

  function getMeetingsForDay(d: Date) {
    return scheduled.filter(r => {
      const rd = new Date(r.scheduled_at); rd.setHours(0, 0, 0, 0);
      return rd.getTime() === d.getTime();
    });
  }

  function nav(dir: number) {
    const d = new Date(refDate);
    if (view === "week") d.setDate(d.getDate() + dir * 7);
    else d.setMonth(d.getMonth() + dir);
    setRefDate(d);
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-bold">Calendar</h1>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => nav(-1)}>&lsaquo;</Button>
          <span className="text-sm font-medium min-w-28 text-center">{view === "week" ? `Week of ${days[0]?.toLocaleDateString([], { month: "short", day: "numeric" })}` : refDate.toLocaleDateString([], { month: "long", year: "numeric" })}</span>
          <Button size="sm" variant="outline" onClick={() => nav(1)}>&rsaquo;</Button>
          <Button size="sm" variant="outline" onClick={() => setRefDate(new Date())}>Today</Button>
          <Select value={view} onValueChange={(v: any) => setView(v)}>
            <SelectTrigger className="w-24 h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="week">Week</SelectItem><SelectItem value="month">Month</SelectItem></SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => <div key={d} className="text-xs font-medium text-muted-foreground py-1">{d}</div>)}
        {days.map((day, i) => {
          const isToday = day.getTime() === today.getTime();
          const mtgs = getMeetingsForDay(day);
          const isThisMonth = view === "month" ? day.getMonth() === refDate.getMonth() : true;
          return (
            <div key={i} className={`min-h-16 rounded-lg border p-1 ${isToday ? "bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700" : "border-border"} ${!isThisMonth ? "opacity-40" : ""}`}>
              <div className={`text-xs font-medium mb-1 ${isToday ? "text-blue-700 dark:text-blue-400" : "text-muted-foreground"}`}>{day.getDate()}</div>
              {mtgs.slice(0, 2).map(r => (
                <div key={r.id} onClick={() => onNavigate(`/meet/${r.room_code || r.id}`)}
                  className="text-xs truncate rounded px-1 py-0.5 mb-0.5 cursor-pointer bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800/40">
                  {fmtTime(r.scheduled_at)} {r.title}
                </div>
              ))}
              {mtgs.length > 2 && <div className="text-xs text-muted-foreground">+{mtgs.length - 2}</div>}
            </div>
          );
        })}
      </div>
      <Button variant="outline" size="sm" onClick={() => window.open("/api/meet/calendar.ics", "_blank")}><Download className="w-3.5 h-3.5 mr-1.5" />Export Calendar (.ics)</Button>
    </div>
  );
}

