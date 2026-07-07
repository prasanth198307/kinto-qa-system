import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Video, Plus, Users, Clock, Play, CheckCircle, Calendar, Zap, Link, Mic, Film, ExternalLink, Download, UserCheck, Sparkles, ChevronDown, ChevronUp, BarChart2, Copy } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  scheduled: "bg-blue-100 text-blue-700",
  live: "bg-green-100 text-green-700",
  ended: "bg-gray-100 text-gray-600",
  cancelled: "bg-red-100 text-red-600",
};

const ROOM_TYPES = ["meeting", "demo", "board", "support", "webinar"];

function generateRoomId() {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 12);
}

export default function SwachMeetIndex() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"meetings" | "recordings" | "analytics">("meetings");
  const [form, setForm] = useState({ title: "", scheduled_at: "", room_type: "meeting", max_participants: 10, password: "", description: "" });

  const { data: rooms = [], isLoading } = useQuery({
    queryKey: ["/api/meet/rooms"],
    queryFn: () => fetch("/api/meet/rooms").then(r => r.json()),
  });

  const { data: stats } = useQuery({
    queryKey: ["/api/meet/stats"],
    queryFn: () => fetch("/api/meet/stats").then(r => r.json()),
  });

  const { data: analytics } = useQuery({
    queryKey: ["/api/swachmeet/analytics"],
    queryFn: () => fetch("/api/swachmeet/analytics?days=30").then(r => r.json()),
    enabled: activeTab === "analytics",
  });

  const createMut = useMutation({
    mutationFn: (body: any) => apiRequest("POST", "/api/meet/rooms", body),
    onSuccess: async (res) => {
      const room = await res.json();
      qc.invalidateQueries({ queryKey: ["/api/meet/rooms"] });
      setOpen(false);
      toast({ title: "Meeting created!", description: room.room_no });
    },
    onError: () => toast({ title: "Error", description: "Failed to create meeting", variant: "destructive" }),
  });

  function joinNewRoom() {
    const roomId = generateRoomId();
    navigate(`/meet/${roomId}`);
  }

  function copyJitsiLink(roomId: string) {
    const link = `https://meet.jit.si/SwachERP-${roomId}`;
    navigator.clipboard.writeText(link);
    toast({ title: "Link copied!", description: "Anyone can join without a SwachERP account" });
  }

  const upcoming = (rooms as any[]).filter(r => r.status === "scheduled").sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());
  const past = (rooms as any[]).filter(r => r.status === "ended").sort((a, b) => new Date(b.ended_at).getTime() - new Date(a.ended_at).getTime());
  const live = (rooms as any[]).filter(r => r.status === "live");

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Video className="w-6 h-6" /> SwachMeet</h1>
          <p className="text-muted-foreground">Video Calls, Webinars & Screen Share</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={joinNewRoom}>
            <Zap className="w-4 h-4 mr-2" />Join Meeting
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="w-4 h-4 mr-2" />Schedule Meeting</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Schedule Meeting / Webinar</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div><Label>Title</Label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Weekly Standup" /></div>
                <div><Label>Date & Time</Label><Input type="datetime-local" value={form.scheduled_at} onChange={e => setForm(f => ({ ...f, scheduled_at: e.target.value }))} /></div>
                <div>
                  <Label>Meeting Type</Label>
                  <Select value={form.room_type} onValueChange={v => setForm(f => ({ ...f, room_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{ROOM_TYPES.map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Max Participants</Label><Input type="number" value={form.max_participants} onChange={e => setForm(f => ({ ...f, max_participants: parseInt(e.target.value) || 10 }))} min={2} max={1000} /></div>
                <div><Label>Description</Label><Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="What's this meeting about?" /></div>
                <Button className="w-full" onClick={() => createMut.mutate(form)} disabled={createMut.isPending}>
                  {createMut.isPending ? "Creating..." : form.room_type === "webinar" ? "Create Webinar" : "Create Meeting"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Meetings This Month</p><p className="text-2xl font-bold">{(stats as any)?.meetings_this_month || 0}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Avg Duration</p><p className="text-2xl font-bold">{Math.round((stats as any)?.avg_duration || 0)} min</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Recordings</p><p className="text-2xl font-bold">{(stats as any)?.recordings_count || 0}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Webinar Registrations</p><p className="text-2xl font-bold">{(stats as any)?.webinar_registrations_this_month || 0}</p></CardContent></Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        {(["meetings", "recordings", "analytics"] as const).map(tab => (
          <button key={tab} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors capitalize ${activeTab === tab ? "border-blue-500 text-blue-600" : "border-transparent text-muted-foreground hover:text-foreground"}`} onClick={() => setActiveTab(tab)}>
            {tab === "recordings" && <Film className="w-4 h-4 inline mr-1" />}
            {tab === "analytics" && <BarChart2 className="w-4 h-4 inline mr-1" />}
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "meetings" && (
        <>
          {live.length > 0 && (
            <Card className="border-green-300 bg-green-50">
              <CardHeader><CardTitle className="text-sm text-green-700">Live Now</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {live.map((room: any) => (
                  <div key={room.id} className="flex items-center justify-between p-3 bg-white border border-green-200 rounded-lg">
                    <div><p className="font-medium">{room.title}</p><p className="text-xs text-muted-foreground">{room.room_no} · {room.participant_count || 0} participants</p></div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => copyJitsiLink(room.room_code || room.id)} title="Copy public Jitsi link"><Copy className="w-4 h-4 mr-1" />Copy Link</Button>
                      <Button size="sm" onClick={() => navigate(`/meet/${room.room_code || room.id}`)}><Play className="w-4 h-4 mr-2" />Join</Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Calendar className="w-4 h-4" />Upcoming Meetings</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {upcoming.filter(r => r.room_type !== "webinar").length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No upcoming meetings. Schedule one or click "Join Meeting" for instant Jitsi call.</p>
              ) : upcoming.filter(r => r.room_type !== "webinar").map((room: any) => (
                <div key={room.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium text-sm">{room.title}</p>
                    <p className="text-xs text-muted-foreground">{room.room_no} · {room.scheduled_at ? new Date(room.scheduled_at).toLocaleString() : "TBD"}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => copyJitsiLink(room.room_code || room.id)}><Copy className="w-4 h-4 mr-1" />Copy Link</Button>
                    <Button size="sm" onClick={() => navigate(`/meet/${room.room_code || room.id}`)}>Join</Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><CheckCircle className="w-4 h-4" />Past Meetings</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {past.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No past meetings.</p>
              ) : past.slice(0, 10).map((room: any) => (
                <div key={room.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium text-sm">{room.title}</p>
                    <p className="text-xs text-muted-foreground">{room.room_no} · {room.ended_at ? new Date(room.ended_at).toLocaleDateString() : "—"} · {room.duration_mins || 0} min</p>
                  </div>
                  <Badge className="bg-gray-100 text-gray-600 text-xs">{room.participant_count || 0} participants</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      )}

      {activeTab === "recordings" && <RecordingsTab rooms={rooms as any[]} />}

      {activeTab === "analytics" && (
        <Card>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><BarChart2 className="w-4 h-4" />Meeting Analytics (Last 30 Days)</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg text-center"><p className="text-2xl font-bold text-blue-700">{(analytics as any)?.total_meetings || 0}</p><p className="text-xs text-muted-foreground">Total Meetings</p></div>
              <div className="p-4 bg-green-50 rounded-lg text-center"><p className="text-2xl font-bold text-green-700">{(analytics as any)?.total_participants || 0}</p><p className="text-xs text-muted-foreground">Total Participants</p></div>
              <div className="p-4 bg-purple-50 rounded-lg text-center"><p className="text-2xl font-bold text-purple-700">{(analytics as any)?.avg_duration_minutes || 0} min</p><p className="text-xs text-muted-foreground">Avg Duration</p></div>
            </div>
            {(analytics as any)?.meetings_by_day?.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Meetings by Day</p>
                <div className="space-y-1">
                  {((analytics as any).meetings_by_day as any[]).map((d: any) => (
                    <div key={d.date} className="flex items-center gap-2 text-sm">
                      <span className="w-28 text-muted-foreground text-xs">{new Date(d.date).toLocaleDateString()}</span>
                      <div className="flex-1 bg-gray-100 rounded h-4 overflow-hidden">
                        <div className="h-4 bg-blue-400 rounded" style={{ width: `${Math.min(100, parseInt(d.count) * 20)}%` }} />
                      </div>
                      <span className="text-xs w-6 text-right">{d.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function RecordingsTab({ rooms }: { rooms: any[] }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null);
  const [transcribeResult, setTranscribeResult] = useState<any>(null);
  const [transcribing, setTranscribing] = useState<number | null>(null);
  const [showTranscript, setShowTranscript] = useState(false);

  const transcribeMeeting = async (roomId: number) => {
    setTranscribing(roomId); setTranscribeResult(null);
    try {
      const resp = await fetch(`/api/ai/meetings/${roomId}/transcribe`, { method: "POST" });
      const data = await resp.json();
      setTranscribeResult(data);
      toast({ title: "Transcript ready!", description: `${data.word_count || 0} words captured` });
    } catch (e: any) {
      toast({ title: "Transcription failed", description: e.message, variant: "destructive" });
    } finally { setTranscribing(null); }
  };

  const { data: recordings = [], isLoading } = useQuery({
    queryKey: ["/api/meet/rooms", selectedRoomId, "recordings"],
    queryFn: () => fetch(`/api/meet/rooms/${selectedRoomId}/recordings`).then(r => r.json()),
    enabled: !!selectedRoomId,
  });

  const fetchRecMut = useMutation({
    mutationFn: (roomId: number) => apiRequest("POST", `/api/meet/rooms/${roomId}/recordings/fetch`),
    onSuccess: async (res) => { const d = await res.json(); toast({ title: `Fetched ${d.fetched} recordings` }); qc.invalidateQueries({ queryKey: ["/api/meet/rooms", selectedRoomId, "recordings"] }); },
    onError: () => toast({ title: "Error fetching recordings", variant: "destructive" }),
  });

  const endedRooms = rooms.filter(r => r.status === "ended");

  return (
    <Card>
      <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Film className="w-4 h-4" />Meeting Recordings</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-3">
          <Select value={selectedRoomId?.toString() || ""} onValueChange={v => setSelectedRoomId(parseInt(v))}>
            <SelectTrigger className="flex-1"><SelectValue placeholder="Select a meeting" /></SelectTrigger>
            <SelectContent>{endedRooms.map(r => <SelectItem key={r.id} value={r.id.toString()}>{r.title} ({r.room_no})</SelectItem>)}</SelectContent>
          </Select>
          {selectedRoomId && (
            <>
              <Button variant="outline" onClick={() => fetchRecMut.mutate(selectedRoomId)} disabled={fetchRecMut.isPending}><Download className="w-4 h-4 mr-2" />{fetchRecMut.isPending ? "Fetching..." : "Fetch"}</Button>
              <Button variant="outline" onClick={() => transcribeMeeting(selectedRoomId)} disabled={transcribing === selectedRoomId} className="text-purple-700 border-purple-300 hover:bg-purple-50"><Sparkles className="w-4 h-4 mr-2" />{transcribing === selectedRoomId ? "Transcribing..." : "AI Transcribe"}</Button>
            </>
          )}
        </div>
        {!selectedRoomId && <p className="text-sm text-muted-foreground text-center py-8">Select a meeting to view its recordings.</p>}
        {selectedRoomId && isLoading && <p className="text-sm text-center py-4 text-muted-foreground">Loading...</p>}
        {selectedRoomId && !isLoading && (recordings as any[]).length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No recordings found. Click "Fetch" to pull from Daily.co.</p>}
        {(recordings as any[]).map((rec: any) => (
          <div key={rec.id} className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <p className="text-sm font-medium">Recording #{rec.id}</p>
              <p className="text-xs text-muted-foreground">{rec.duration_secs ? `${Math.round(rec.duration_secs / 60)} min` : "—"}{rec.file_size_bytes ? ` · ${(rec.file_size_bytes / 1024 / 1024).toFixed(1)} MB` : ""} · {new Date(rec.created_at).toLocaleDateString()}</p>
            </div>
            <div className="flex gap-2 items-center">
              <Badge className={rec.status === "ready" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}>{rec.status}</Badge>
              {rec.download_url && <Button size="sm" variant="outline" onClick={() => window.open(rec.download_url, "_blank")}><Download className="w-4 h-4 mr-1" />Download</Button>}
            </div>
          </div>
        ))}
        {transcribeResult && (
          <div className="mt-4 p-4 bg-purple-50 border border-purple-200 rounded-lg space-y-3">
            <div className="flex items-center gap-2"><Sparkles className="w-4 h-4 text-purple-600" /><strong className="text-sm text-purple-800">AI Meeting Summary</strong>{transcribeResult.simulated && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded">Demo mode</span>}</div>
            {transcribeResult.summary && <div className="text-sm"><strong>Summary:</strong> {transcribeResult.summary}</div>}
            {transcribeResult.action_items?.length > 0 && <div><div className="text-xs font-semibold text-purple-700 mb-1">Action Items</div><ul className="text-sm space-y-1">{transcribeResult.action_items.map((a: string, i: number) => <li key={i} className="flex items-start gap-2"><input type="checkbox" className="mt-0.5 accent-purple-600" readOnly /><span>{a}</span></li>)}</ul></div>}
            {transcribeResult.transcript && (
              <div>
                <button onClick={() => setShowTranscript(t => !t)} className="text-xs text-purple-600 flex items-center gap-1 hover:underline">{showTranscript ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}{showTranscript ? "Hide" : "Show"} Full Transcript ({transcribeResult.word_count || 0} words)</button>
                {showTranscript && <textarea readOnly value={transcribeResult.transcript} rows={10} className="w-full mt-2 p-2 text-xs border rounded font-mono resize-y bg-white" />}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
