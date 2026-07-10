import { apiFetch } from "@/lib/api-fetch";
import { useEffect, useRef, useState, useCallback } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  MessageSquare, Users, FileText, BarChart2, Send, Mic, MicOff, Video,
  VideoOff, PhoneOff, Monitor, MoreVertical, Plus, CheckCircle, Circle,
  Sparkles, ChevronRight, ChevronLeft, ListTodo, Clock, Hash, X, Loader2,
  Copy, Check, Paperclip, Download, Trash2
} from "lucide-react";


declare global { interface Window { JitsiMeetExternalAPI: any; } }

type SidePanel = "chat" | "participants" | "notes" | "polls" | "agenda" | "files";

export default function SwachMeetRoom() {
  const params = useParams<{ roomId?: string; roomCode?: string }>();
  const roomId = params.roomId || params.roomCode || "default";
  const jitsiRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const qc = useQueryClient();

  const [jitsiStatus, setJitsiStatus] = useState<"loading" | "connected" | "ended">("loading");
  const [participants, setParticipants] = useState(0);
  const [recording, setRecording] = useState(false);
  const [sidePanel, setSidePanel] = useState<SidePanel | null>("chat");
  const [timer, setTimer] = useState(0);
  const [chatMsg, setChatMsg] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [noteIsAction, setNoteIsAction] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const [newAgendaTitle, setNewAgendaTitle] = useState("");
  const [copied, setCopied] = useState(false);
  const [fileUploading, setFileUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Internal room DB id (for API calls)
  const [roomDbId, setRoomDbId] = useState<number | null>(null);

  // Fetch room info by room_code
  const { data: roomInfo } = useQuery<any>({
    queryKey: ["/api/public/meet", roomId],
    queryFn: () => apiFetch(`/api/public/meet/${roomId}`).catch(() => null),
  });

  useEffect(() => { if (roomInfo?.id) setRoomDbId(roomInfo.id); }, [roomInfo]);

  // Notes
  const { data: notes = [] } = useQuery<any[]>({ queryKey: ["/api/meet/rooms", roomDbId, "notes"], queryFn: () => apiFetch(`/api/meet/rooms/${roomDbId}/notes`), enabled: !!roomDbId && sidePanel === "notes" });
  const addNoteMut = useMutation({
    mutationFn: (body: any) => apiRequest("POST", `/api/meet/rooms/${roomDbId}/notes`, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/meet/rooms", roomDbId, "notes"] }); setNoteContent(""); },
  });
  const toggleNoteMut = useMutation({
    mutationFn: ({ id, done }: any) => apiRequest("PUT", `/api/meet/rooms/${roomDbId}/notes/${id}`, { done }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/meet/rooms", roomDbId, "notes"] }),
  });
  const deleteNoteMut = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/meet/rooms/${roomDbId}/notes/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/meet/rooms", roomDbId, "notes"] }),
  });

  // Polls
  const { data: polls = [] } = useQuery<any[]>({ queryKey: ["/api/meet/rooms", roomDbId, "polls"], queryFn: () => apiFetch(`/api/meet/rooms/${roomDbId}/polls`), enabled: !!roomDbId && sidePanel === "polls" });
  const addPollMut = useMutation({
    mutationFn: (body: any) => apiRequest("POST", `/api/meet/rooms/${roomDbId}/polls`, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/meet/rooms", roomDbId, "polls"] }); setPollQuestion(""); setPollOptions(["", ""]); },
  });
  const voteMut = useMutation({
    mutationFn: ({ pollId, option_index }: any) => apiRequest("POST", `/api/meet/rooms/${roomDbId}/polls/${pollId}/vote`, { option_index }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/meet/rooms", roomDbId, "polls"] }),
  });
  const closePollMut = useMutation({
    mutationFn: (pollId: number) => apiRequest("PUT", `/api/meet/rooms/${roomDbId}/polls/${pollId}/close`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/meet/rooms", roomDbId, "polls"] }),
  });

  // Agenda
  const { data: agenda = [] } = useQuery<any[]>({ queryKey: ["/api/meet/rooms", roomDbId, "agenda"], queryFn: () => apiFetch(`/api/meet/rooms/${roomDbId}/agenda`), enabled: !!roomDbId && sidePanel === "agenda" });
  const addAgendaMut = useMutation({
    mutationFn: (body: any) => apiRequest("POST", `/api/meet/rooms/${roomDbId}/agenda`, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/meet/rooms", roomDbId, "agenda"] }); setNewAgendaTitle(""); },
  });
  const toggleAgendaMut = useMutation({
    mutationFn: ({ id, done }: any) => apiRequest("PUT", `/api/meet/rooms/${roomDbId}/agenda/${id}`, { done }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/meet/rooms", roomDbId, "agenda"] }),
  });

  // Files
  const { data: meetFiles = [], refetch: refetchFiles } = useQuery<any[]>({
    queryKey: ["/api/meet/rooms", roomDbId, "files"],
    queryFn: () => apiFetch(`/api/meet/rooms/${roomDbId}/files`),
    enabled: !!roomDbId && sidePanel === "files",
  });
  const deleteFileMut = useMutation({
    mutationFn: (fileId: number) => apiRequest("DELETE", `/api/meet/rooms/${roomDbId}/files/${fileId}`),
    onSuccess: () => refetchFiles(),
  });

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !roomDbId) return;
    setFileUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/meet/rooms/${roomDbId}/files`, { method: "POST", body: fd, credentials: "include" });
      if (!res.ok) throw new Error("Upload failed");
      toast({ title: "File shared successfully!" });
      refetchFiles();
    } catch {
      toast({ title: "Upload failed", variant: "destructive" });
    } finally {
      setFileUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function fmtFileSize(bytes: number) {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function fileTypeLabel(mime: string) {
    if (!mime) return "FILE";
    if (mime.startsWith("image/")) return "IMG";
    if (mime === "application/pdf") return "PDF";
    if (mime.includes("spreadsheet") || mime.includes("excel")) return "XLS";
    if (mime.includes("presentation") || mime.includes("powerpoint")) return "PPT";
    if (mime.includes("word") || mime.includes("document")) return "DOC";
    if (mime.includes("zip") || mime.includes("rar") || mime.includes("tar")) return "ZIP";
    if (mime.startsWith("video/")) return "VID";
    if (mime.startsWith("audio/")) return "AUD";
    return "FILE";
  }

  // Summary generate
  const summaryMut = useMutation({
    mutationFn: () => apiRequest("POST", `/api/meet/rooms/${roomDbId}/summary/generate`),
    onSuccess: () => toast({ title: "Meeting summary generated!" }),
  });

  // Timer
  useEffect(() => {
    if (jitsiStatus !== "connected") return;
    const iv = setInterval(() => setTimer(t => t + 1), 1000);
    return () => clearInterval(iv);
  }, [jitsiStatus]);

  const fmtTimer = (s: number) => `${String(Math.floor(s / 3600)).padStart(2, "0")}:${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  // Jitsi init
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://meet.jit.si/external_api.js";
    script.async = true;
    script.onload = () => initJitsi();
    document.head.appendChild(script);
    return () => {
      try { document.head.removeChild(script); } catch {}
      if (jitsiRef.current) { try { jitsiRef.current.dispose(); } catch {} }
    };
  }, [roomId]);

  async function initJitsi() {
    try {
      const res = await apiRequest("POST", `/api/swachmeet/rooms/${roomId}/token`, { user: { name: "SwachERP User", email: "user@swacherp.com" } });
      const data = await res.json();
      if (!containerRef.current || !window.JitsiMeetExternalAPI) return;
      const api = new window.JitsiMeetExternalAPI(data.jitsiDomain || "meet.jit.si", {
        roomName: `SwachERP-${roomId}`,
        jwt: data.token,
        width: "100%", height: "100%",
        parentNode: containerRef.current,
        configOverwrite: {
          startWithAudioMuted: false,
          startWithVideoMuted: false,
          enableWelcomePage: false,
          disableDeepLinking: true,
          prejoinPageEnabled: true,
          toolbarButtons: ["microphone", "camera", "closedcaptions", "desktop", "fullscreen",
            "fodeviceselection", "hangup", "chat", "raisehand", "recording",
            "settings", "videoquality", "tileview", "participants-pane", "whiteboard"],
        },
        interfaceConfigOverwrite: {
          SHOW_JITSI_WATERMARK: false,
          SHOW_BRAND_WATERMARK: false,
          HIDE_INVITE_MORE_HEADER: true,
          BRAND_WATERMARK_LINK: "",
          DEFAULT_BACKGROUND: "#111827",
          TOOLBAR_ALWAYS_VISIBLE: false,
        },
      });
      jitsiRef.current = api;
      // Set allow attribute synchronously before iframe navigation completes
      try {
        const iframe = api.getIFrame();
        if (iframe) {
          iframe.allow = "camera; microphone; fullscreen; display-capture; autoplay; clipboard-write; speaker-selection; screen-wake-lock";
        }
      } catch {}
      api.addEventListeners({
        videoConferenceJoined: () => { setJitsiStatus("connected"); },
        videoConferenceLeft: () => setJitsiStatus("ended"),
        participantJoined: () => setParticipants(p => p + 1),
        participantLeft: () => setParticipants(p => Math.max(0, p - 1)),
        recordingStatusChanged: (e: any) => setRecording(e.on),
      });
    } catch (err) {
      console.error("Jitsi init error:", err);
    }
  }

  async function toggleRecording() {
    const action = recording ? "stop" : "start";
    await apiRequest("POST", `/api/swachmeet/rooms/${roomId}/recording/${action}`, {});
    setRecording(!recording);
  }

  function copyLink() {
    navigator.clipboard.writeText(`${window.location.origin}/meet/${roomId}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Meeting link copied!" });
  }

  const panelWidth = sidePanel ? "w-80" : "w-0";
  const PANELS: { id: SidePanel; label: string; icon: any }[] = [
    { id: "chat", label: "Chat", icon: MessageSquare },
    { id: "participants", label: "Participants", icon: Users },
    { id: "agenda", label: "Agenda", icon: ListTodo },
    { id: "notes", label: "Notes", icon: FileText },
    { id: "polls", label: "Polls", icon: BarChart2 },
    { id: "files", label: "Files", icon: Paperclip },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "#111827" }}>
      {/* Top Bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 16px", background: "#1f2937", color: "#fff", fontSize: 13, zIndex: 10 }}>
        <a href="/swachmeet" style={{ color: "#9ca3af", textDecoration: "none", fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}>
          <ChevronLeft style={{ width: 14, height: 14 }} /> Back
        </a>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 600 }}>
          <Video style={{ width: 16, height: 16, color: "#60a5fa" }} />
          <span style={{ color: "#f3f4f6" }}>{roomInfo?.title || `Room: ${roomId}`}</span>
        </div>
        {jitsiStatus === "connected" && (
          <span style={{ background: "#14532d", color: "#4ade80", fontSize: 11, padding: "2px 8px", borderRadius: 12, display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ width: 6, height: 6, background: "#4ade80", borderRadius: "50%", display: "inline-block" }} />
            {fmtTimer(timer)}
          </span>
        )}
        {jitsiStatus === "loading" && <span style={{ color: "#9ca3af", fontSize: 12 }}>Connecting…</span>}
        <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
          {jitsiStatus === "connected" && (
            <>
              <span style={{ color: "#9ca3af", fontSize: 12 }}>{participants} participants</span>
              <button onClick={copyLink} style={{ padding: "4px 10px", borderRadius: 4, border: "none", background: "#374151", color: "#d1d5db", cursor: "pointer", fontSize: 11, display: "flex", alignItems: "center", gap: 4 }}>
                {copied ? <><Check style={{ width: 12, height: 12 }} /> Copied</> : <><Copy style={{ width: 12, height: 12 }} /> Copy Link</>}
              </button>
              <button onClick={toggleRecording} style={{ padding: "4px 10px", borderRadius: 4, border: "none", background: recording ? "#dc2626" : "#1d4ed8", color: "#fff", cursor: "pointer", fontSize: 11 }}>
                {recording ? "⏹ Stop Rec" : "⏺ Record"}
              </button>
            </>
          )}
        </span>
      </div>

      {/* Body: Jitsi + Side Panel */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Jitsi Container */}
        <div ref={containerRef} style={{ flex: 1, position: "relative", background: "#111827" }}>
          {jitsiStatus === "loading" && (
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#9ca3af", gap: 12, pointerEvents: "none" }}>
              <Loader2 style={{ width: 28, height: 28, animation: "spin 1s linear infinite" }} />
              <span style={{ fontSize: 14 }}>Connecting to meeting…</span>
            </div>
          )}
          {jitsiStatus === "ended" && (
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#fff", gap: 16 }}>
              <PhoneOff style={{ width: 36, height: 36, color: "#ef4444" }} />
              <div style={{ fontSize: 18, fontWeight: 600 }}>Meeting ended</div>
              <div style={{ fontSize: 14, color: "#9ca3af" }}>Duration: {fmtTimer(timer)}</div>
              {roomDbId && (
                <button onClick={() => summaryMut.mutate()} disabled={summaryMut.isPending}
                  style={{ padding: "8px 16px", borderRadius: 6, background: "#7c3aed", color: "#fff", border: "none", cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
                  <Sparkles style={{ width: 14, height: 14 }} />{summaryMut.isPending ? "Generating…" : "Generate Summary"}
                </button>
              )}
              <a href="/swachmeet" style={{ padding: "8px 20px", background: "#1d4ed8", color: "#fff", borderRadius: 6, textDecoration: "none", fontSize: 13 }}>Back to Meetings</a>
            </div>
          )}
        </div>

        {/* Panel Toggle Buttons */}
        <div style={{ width: 44, background: "#1f2937", display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 12, gap: 4, borderLeft: "1px solid #374151" }}>
          {PANELS.map(p => {
            const Icon = p.icon;
            const active = sidePanel === p.id;
            return (
              <button key={p.id} onClick={() => setSidePanel(active ? null : p.id)} title={p.label}
                style={{ width: 36, height: 36, borderRadius: 8, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", background: active ? "#3b82f6" : "transparent", color: active ? "#fff" : "#9ca3af" }}>
                <Icon style={{ width: 16, height: 16 }} />
              </button>
            );
          })}
        </div>

        {/* Side Panel */}
        {sidePanel && (
          <div style={{ width: 300, background: "#1f2937", borderLeft: "1px solid #374151", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ padding: "10px 14px", borderBottom: "1px solid #374151", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ color: "#f3f4f6", fontSize: 13, fontWeight: 600 }}>{PANELS.find(p => p.id === sidePanel)?.label}</span>
              <button onClick={() => setSidePanel(null)} style={{ background: "none", border: "none", color: "#9ca3af", cursor: "pointer", padding: 2 }}><X style={{ width: 14, height: 14 }} /></button>
            </div>

            {/* NOTES PANEL */}
            {sidePanel === "notes" && (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                <div style={{ flex: 1, overflowY: "auto", padding: "10px 12px", display: "flex", flexDirection: "column", gap: 6 }}>
                  {(notes as any[]).length === 0 && <p style={{ color: "#6b7280", fontSize: 12, textAlign: "center", paddingTop: 32 }}>No notes yet. Add one below.</p>}
                  {(notes as any[]).map((n: any) => (
                    <div key={n.id} style={{ padding: "8px 10px", background: n.is_action_item ? "#1e3a5f" : "#374151", borderRadius: 6, display: "flex", alignItems: "flex-start", gap: 8 }}>
                      <button onClick={() => toggleNoteMut.mutate({ id: n.id, done: !n.done })} style={{ background: "none", border: "none", cursor: "pointer", paddingTop: 2, flexShrink: 0 }}>
                        {n.done ? <CheckCircle style={{ width: 14, height: 14, color: "#4ade80" }} /> : <Circle style={{ width: 14, height: 14, color: "#6b7280" }} />}
                      </button>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 12, color: n.done ? "#6b7280" : "#d1d5db", textDecoration: n.done ? "line-through" : "none", wordBreak: "break-word" }}>{n.content}</p>
                        {n.is_action_item && <span style={{ fontSize: 10, color: "#60a5fa" }}>Action Item{n.assigned_to ? ` → ${n.assigned_to}` : ""}</span>}
                      </div>
                      <button onClick={() => deleteNoteMut.mutate(n.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#6b7280", flexShrink: 0 }}><X style={{ width: 12, height: 12 }} /></button>
                    </div>
                  ))}
                </div>
                <div style={{ padding: "10px 12px", borderTop: "1px solid #374151" }}>
                  <textarea value={noteContent} onChange={e => setNoteContent(e.target.value)} placeholder="Add note…" rows={2}
                    style={{ width: "100%", background: "#374151", border: "1px solid #4b5563", borderRadius: 6, color: "#d1d5db", fontSize: 12, padding: "6px 8px", resize: "none", outline: "none", boxSizing: "border-box" }} />
                  <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 4, color: "#9ca3af", fontSize: 11, cursor: "pointer" }}>
                      <input type="checkbox" checked={noteIsAction} onChange={e => setNoteIsAction(e.target.checked)} style={{ accentColor: "#3b82f6" }} /> Action Item
                    </label>
                    <button disabled={!noteContent.trim() || !roomDbId} onClick={() => addNoteMut.mutate({ content: noteContent, is_action_item: noteIsAction })}
                      style={{ marginLeft: "auto", padding: "4px 12px", background: "#3b82f6", border: "none", borderRadius: 4, color: "#fff", fontSize: 12, cursor: "pointer", opacity: noteContent.trim() && roomDbId ? 1 : 0.5 }}>
                      Add
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* POLLS PANEL */}
            {sidePanel === "polls" && (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                <div style={{ flex: 1, overflowY: "auto", padding: "10px 12px", display: "flex", flexDirection: "column", gap: 10 }}>
                  {(polls as any[]).length === 0 && <p style={{ color: "#6b7280", fontSize: 12, textAlign: "center", paddingTop: 32 }}>No polls yet.</p>}
                  {(polls as any[]).map((poll: any) => {
                    const opts = typeof poll.options === "string" ? JSON.parse(poll.options) : poll.options;
                    return (
                      <div key={poll.id} style={{ background: "#374151", borderRadius: 8, padding: "10px 12px" }}>
                        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 6 }}>
                          <p style={{ fontSize: 12, color: "#f3f4f6", fontWeight: 600, flex: 1 }}>{poll.question}</p>
                          {poll.is_open && roomDbId && <button onClick={() => closePollMut.mutate(poll.id)} style={{ fontSize: 10, color: "#9ca3af", background: "none", border: "none", cursor: "pointer" }}>Close</button>}
                        </div>
                        <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>
                          {opts.map((opt: string, i: number) => (
                            <button key={i} disabled={!poll.is_open || !roomDbId} onClick={() => voteMut.mutate({ pollId: poll.id, option_index: i })}
                              style={{ padding: "6px 10px", background: "#4b5563", border: "1px solid #6b7280", borderRadius: 4, color: "#d1d5db", fontSize: 11, textAlign: "left", cursor: poll.is_open ? "pointer" : "default" }}>
                              {opt}
                            </button>
                          ))}
                        </div>
                        {!poll.is_open && <p style={{ fontSize: 10, color: "#6b7280", marginTop: 4 }}>Poll closed</p>}
                      </div>
                    );
                  })}
                </div>
                {roomDbId && (
                  <div style={{ padding: "10px 12px", borderTop: "1px solid #374151" }}>
                    <input value={pollQuestion} onChange={e => setPollQuestion(e.target.value)} placeholder="Poll question…"
                      style={{ width: "100%", background: "#374151", border: "1px solid #4b5563", borderRadius: 6, color: "#d1d5db", fontSize: 12, padding: "6px 8px", marginBottom: 6, boxSizing: "border-box" }} />
                    {pollOptions.map((opt, i) => (
                      <input key={i} value={opt} onChange={e => setPollOptions(o => o.map((x, j) => j === i ? e.target.value : x))} placeholder={`Option ${i + 1}`}
                        style={{ width: "100%", background: "#374151", border: "1px solid #4b5563", borderRadius: 6, color: "#d1d5db", fontSize: 12, padding: "5px 8px", marginBottom: 4, boxSizing: "border-box" }} />
                    ))}
                    <div style={{ display: "flex", gap: 6, marginTop: 2 }}>
                      <button onClick={() => setPollOptions(o => [...o, ""])} style={{ fontSize: 11, color: "#9ca3af", background: "none", border: "none", cursor: "pointer" }}>+ Add Option</button>
                      <button disabled={!pollQuestion.trim() || pollOptions.filter(Boolean).length < 2} onClick={() => addPollMut.mutate({ question: pollQuestion, options: pollOptions.filter(Boolean) })}
                        style={{ marginLeft: "auto", padding: "4px 12px", background: "#3b82f6", border: "none", borderRadius: 4, color: "#fff", fontSize: 12, cursor: "pointer" }}>
                        Launch Poll
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* AGENDA PANEL */}
            {sidePanel === "agenda" && (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                <div style={{ flex: 1, overflowY: "auto", padding: "10px 12px", display: "flex", flexDirection: "column", gap: 6 }}>
                  {(agenda as any[]).length === 0 && <p style={{ color: "#6b7280", fontSize: 12, textAlign: "center", paddingTop: 32 }}>No agenda items.</p>}
                  {(agenda as any[]).map((item: any) => (
                    <div key={item.id} style={{ padding: "8px 10px", background: "#374151", borderRadius: 6, display: "flex", alignItems: "flex-start", gap: 8, opacity: item.done ? 0.6 : 1 }}>
                      <button onClick={() => toggleAgendaMut.mutate({ id: item.id, done: !item.done })} style={{ background: "none", border: "none", cursor: "pointer", paddingTop: 2, flexShrink: 0 }}>
                        {item.done ? <CheckCircle style={{ width: 14, height: 14, color: "#4ade80" }} /> : <Circle style={{ width: 14, height: 14, color: "#6b7280" }} />}
                      </button>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 12, color: "#d1d5db", textDecoration: item.done ? "line-through" : "none" }}>{item.title}</p>
                        <div style={{ display: "flex", gap: 8, marginTop: 2 }}>
                          {item.duration_mins && <span style={{ fontSize: 10, color: "#6b7280" }}><Clock style={{ width: 10, height: 10, display: "inline" }} /> {item.duration_mins}m</span>}
                          {item.presenter && <span style={{ fontSize: 10, color: "#6b7280" }}>{item.presenter}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {roomDbId && (
                  <div style={{ padding: "10px 12px", borderTop: "1px solid #374151", display: "flex", gap: 6 }}>
                    <input value={newAgendaTitle} onChange={e => setNewAgendaTitle(e.target.value)} placeholder="Add agenda item…"
                      style={{ flex: 1, background: "#374151", border: "1px solid #4b5563", borderRadius: 6, color: "#d1d5db", fontSize: 12, padding: "6px 8px" }}
                      onKeyDown={e => { if (e.key === "Enter" && newAgendaTitle.trim()) addAgendaMut.mutate({ title: newAgendaTitle }); }} />
                    <button disabled={!newAgendaTitle.trim()} onClick={() => addAgendaMut.mutate({ title: newAgendaTitle })}
                      style={{ padding: "4px 10px", background: "#3b82f6", border: "none", borderRadius: 4, color: "#fff", fontSize: 12, cursor: "pointer" }}>
                      Add
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* PARTICIPANTS PANEL */}
            {sidePanel === "participants" && (
              <div style={{ flex: 1, overflowY: "auto", padding: "10px 12px" }}>
                <div style={{ padding: "10px 12px", background: "#374151", borderRadius: 8, marginBottom: 8 }}>
                  <p style={{ color: "#9ca3af", fontSize: 11 }}>You</p>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                    <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#3b82f6", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "#fff", fontWeight: 600 }}>H</div>
                    <span style={{ color: "#f3f4f6", fontSize: 13 }}>Host (You)</span>
                    <span style={{ marginLeft: "auto", fontSize: 10, color: "#4ade80", background: "#14532d", padding: "1px 6px", borderRadius: 10 }}>Host</span>
                  </div>
                </div>
                <p style={{ color: "#6b7280", fontSize: 11, marginBottom: 8 }}>{participants} other participant{participants !== 1 ? "s" : ""} in this call</p>
                <p style={{ color: "#4b5563", fontSize: 11, textAlign: "center", paddingTop: 12 }}>Participant names are managed by Jitsi.</p>
              </div>
            )}

            {/* FILES PANEL */}
            {sidePanel === "files" && (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                <div style={{ flex: 1, overflowY: "auto", padding: "10px 12px", display: "flex", flexDirection: "column", gap: 6 }}>
                  {(meetFiles as any[]).length === 0 && (
                    <div style={{ textAlign: "center", paddingTop: 32 }}>
                      <Paperclip style={{ width: 28, height: 28, color: "#4b5563", margin: "0 auto 8px" }} />
                      <p style={{ color: "#6b7280", fontSize: 12 }}>No files shared yet.</p>
                      <p style={{ color: "#4b5563", fontSize: 11, marginTop: 4 }}>Upload documents, images, or any file up to 25 MB.</p>
                    </div>
                  )}
                  {(meetFiles as any[]).map((f: any) => (
                    <div key={f.id} style={{ padding: "8px 10px", background: "#374151", borderRadius: 6, display: "flex", alignItems: "flex-start", gap: 8 }}>
                      <span style={{ fontSize: 9, fontWeight: 700, color: "#60a5fa", background: "#1e3a5f", borderRadius: 3, padding: "2px 4px", flexShrink: 0, letterSpacing: "0.03em" }}>{fileTypeLabel(f.mime_type)}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 12, color: "#f3f4f6", fontWeight: 600, wordBreak: "break-word", marginBottom: 2 }}>{f.file_name}</p>
                        <p style={{ fontSize: 10, color: "#6b7280" }}>{f.uploader_name} · {fmtFileSize(f.file_size)}</p>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4, flexShrink: 0 }}>
                        <a href={f.file_url} download={f.file_name} target="_blank" rel="noreferrer"
                          style={{ background: "none", border: "none", cursor: "pointer", color: "#60a5fa", display: "flex", alignItems: "center" }}>
                          <Download style={{ width: 13, height: 13 }} />
                        </a>
                        <button onClick={() => deleteFileMut.mutate(f.id)}
                          style={{ background: "none", border: "none", cursor: "pointer", color: "#6b7280" }}>
                          <Trash2 style={{ width: 13, height: 13 }} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ padding: "10px 12px", borderTop: "1px solid #374151" }}>
                  <input ref={fileInputRef} type="file" onChange={handleFileUpload} style={{ display: "none" }} />
                  <button disabled={fileUploading || !roomDbId} onClick={() => fileInputRef.current?.click()}
                    style={{ width: "100%", padding: "7px 0", background: fileUploading ? "#374151" : "#1d4ed8", border: "none", borderRadius: 6, color: "#fff", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, opacity: roomDbId ? 1 : 0.5 }}>
                    {fileUploading ? <><Loader2 style={{ width: 13, height: 13 }} /> Uploading…</> : <><Paperclip style={{ width: 13, height: 13 }} /> Share a File</>}
                  </button>
                  <p style={{ fontSize: 10, color: "#4b5563", textAlign: "center", marginTop: 4 }}>Max 25 MB · All file types supported</p>
                </div>
              </div>
            )}

            {/* CHAT PANEL */}
            {sidePanel === "chat" && (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                <div style={{ flex: 1, overflowY: "auto", padding: "10px 12px" }}>
                  <p style={{ color: "#6b7280", fontSize: 11, textAlign: "center" }}>In-meeting chat is powered by Jitsi. Use the chat button in the video toolbar for live chat.</p>
                  <div style={{ marginTop: 12, padding: "12px", background: "#374151", borderRadius: 8 }}>
                    <p style={{ color: "#9ca3af", fontSize: 11, marginBottom: 4 }}>Quick actions:</p>
                    {[
                      "Starting now, please join.",
                      "Can everyone hear me?",
                      "Please mute if not speaking.",
                      "Screen share starting now.",
                    ].map(msg => (
                      <button key={msg} style={{ display: "block", width: "100%", textAlign: "left", padding: "5px 8px", background: "#4b5563", border: "none", borderRadius: 4, color: "#d1d5db", fontSize: 11, cursor: "pointer", marginBottom: 4 }}
                        onClick={() => { if (jitsiRef.current) { try { jitsiRef.current.executeCommand("sendChatMessage", msg); } catch {} } }}>
                        {msg}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
