import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Send, AlertTriangle, Copy, MessageSquare, Users, Code2 } from "lucide-react";

const SESSION_STATUS_COLORS: Record<string, string> = {
  waiting: "bg-yellow-100 text-yellow-800",
  active: "bg-green-100 text-green-800",
  resolved: "bg-gray-100 text-gray-600",
};

const SENDER_STYLES: Record<string, string> = {
  visitor: "bg-blue-50 text-blue-900 self-start",
  agent: "bg-green-50 text-green-900 self-end",
  bot: "bg-purple-50 text-purple-900 self-start",
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

export default function LiveChatPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<"chat" | "embed">("chat");
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: sessions = [] } = useQuery<any[]>({
    queryKey: ["/api/desk/chat/sessions"],
    queryFn: async () => (await fetch("/api/desk/chat/sessions")).json(),
    refetchInterval: 5000,
  });

  const { data: messages = [] } = useQuery<any[]>({
    queryKey: ["/api/desk/chat/messages", selectedSession],
    queryFn: async () => {
      if (!selectedSession) return [];
      return (await fetch(`/api/desk/chat/${selectedSession}/messages`)).json();
    },
    enabled: !!selectedSession,
    refetchInterval: 3000,
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const replyMutation = useMutation({
    mutationFn: async ({ sessionId, message }: { sessionId: string; message: string }) => {
      const r = await fetch(`/api/desk/chat/${sessionId}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    onSuccess: () => {
      setReply("");
      qc.invalidateQueries({ queryKey: ["/api/desk/chat/messages", selectedSession] });
    },
    onError: () => toast({ title: "Error sending reply", variant: "destructive" }),
  });

  const escalateMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const r = await fetch(`/api/desk/chat/${sessionId}/escalate`, { method: "POST" });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    onSuccess: (data) => {
      toast({ title: `Escalated to ticket ${data.ticket?.ticket_no || ""}` });
      qc.invalidateQueries({ queryKey: ["/api/desk/chat/sessions"] });
    },
    onError: () => toast({ title: "Error escalating", variant: "destructive" }),
  });

  const selectedSessionData = (sessions as any[]).find((s: any) => s.session_id === selectedSession);

  function sendReply() {
    if (!reply.trim() || !selectedSession) return;
    replyMutation.mutate({ sessionId: selectedSession, message: reply });
  }

  const widgetScript = `<script src="/api/public/widget.js?tenant_id=1"></script>`;

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div className="border-b px-6 flex gap-4">
        <button
          onClick={() => setActiveTab("chat")}
          className={`py-3 px-1 text-sm font-medium border-b-2 transition-colors ${activeTab === "chat" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          <div className="flex items-center gap-2"><Users className="w-4 h-4" />Live Sessions
            {(sessions as any[]).filter((s: any) => s.status !== "resolved").length > 0 && (
              <span className="bg-primary text-primary-foreground text-xs rounded-full px-1.5">
                {(sessions as any[]).filter((s: any) => s.status !== "resolved").length}
              </span>
            )}
          </div>
        </button>
        <button
          onClick={() => setActiveTab("embed")}
          className={`py-3 px-1 text-sm font-medium border-b-2 transition-colors ${activeTab === "embed" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          <div className="flex items-center gap-2"><Code2 className="w-4 h-4" />Embed Widget</div>
        </button>
      </div>

      {activeTab === "embed" ? (
        <div className="p-8 max-w-2xl space-y-6">
          <div>
            <h2 className="text-lg font-semibold mb-1">Embed Live Chat on Your Website</h2>
            <p className="text-muted-foreground text-sm">Copy the script tag below and paste it before the closing &lt;/body&gt; tag of your website.</p>
          </div>
          <div className="bg-gray-900 text-green-400 rounded-lg p-4 font-mono text-sm relative">
            <pre>{widgetScript}</pre>
            <Button
              size="sm"
              variant="outline"
              className="absolute top-3 right-3 bg-gray-800 text-gray-200 border-gray-600 hover:bg-gray-700"
              onClick={() => { navigator.clipboard.writeText(widgetScript); toast({ title: "Copied!" }); }}
            >
              <Copy className="w-3 h-3 mr-1" />Copy
            </Button>
          </div>
          <div className="border rounded-lg p-4 bg-muted/30 space-y-2">
            <p className="text-sm font-medium">How it works:</p>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>A chat bubble appears in the bottom-right corner of your site</li>
              <li>Visitors click to open a chat iframe</li>
              <li>Messages appear in real-time in this dashboard</li>
              <li>You can escalate any chat to a support ticket</li>
            </ul>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 min-h-0">
          {/* Sessions list */}
          <div className="w-72 border-r overflow-y-auto">
            <div className="p-3 border-b bg-muted/20">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Active Sessions</p>
            </div>
            {(sessions as any[]).length === 0 ? (
              <div className="p-6 text-center text-muted-foreground text-sm">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
                No active chat sessions
              </div>
            ) : (sessions as any[]).map((s: any) => (
              <div
                key={s.session_id}
                className={`p-3 border-b cursor-pointer hover:bg-muted/30 ${selectedSession === s.session_id ? "bg-muted/50" : ""}`}
                onClick={() => setSelectedSession(s.session_id)}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-sm truncate">{s.visitor_name || "Visitor"}</span>
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${s.status === "active" ? "bg-green-500" : s.status === "waiting" ? "bg-yellow-500" : "bg-gray-400"}`} />
                </div>
                <div className="flex items-center justify-between">
                  <Badge className={`text-xs ${SESSION_STATUS_COLORS[s.status] || ""}`}>{s.status}</Badge>
                  <span className="text-xs text-muted-foreground">{timeAgo(s.started_at)}</span>
                </div>
                {s.visitor_email && <p className="text-xs text-muted-foreground mt-1 truncate">{s.visitor_email}</p>}
              </div>
            ))}
          </div>

          {/* Chat thread */}
          <div className="flex-1 flex flex-col min-h-0">
            {!selectedSession ? (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p>Select a session to view the chat</p>
                </div>
              </div>
            ) : (
              <>
                {/* Header */}
                <div className="p-4 border-b flex items-center justify-between bg-muted/20">
                  <div>
                    <p className="font-semibold">{selectedSessionData?.visitor_name || "Visitor"}</p>
                    <p className="text-xs text-muted-foreground">{selectedSessionData?.visitor_email || ""} {selectedSessionData?.page_url ? `• ${selectedSessionData.page_url}` : ""}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-orange-600 border-orange-300"
                    onClick={() => { if (selectedSession) escalateMutation.mutate(selectedSession); }}
                    disabled={escalateMutation.isPending}
                  >
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    {escalateMutation.isPending ? "Escalating..." : "Escalate to Ticket"}
                  </Button>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 flex flex-col">
                  {(messages as any[]).map((m: any) => (
                    <div key={m.id} className={`max-w-sm rounded-lg p-3 text-sm ${SENDER_STYLES[m.sender_type] || "bg-muted"}`}>
                      <div className="text-xs font-medium mb-1 opacity-70">{m.sender_name} ({m.sender_type})</div>
                      <div>{m.message}</div>
                      <div className="text-xs opacity-50 mt-1">{new Date(m.created_at).toLocaleTimeString()}</div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                {/* Reply input */}
                <div className="p-4 border-t flex gap-2">
                  <Input
                    value={reply}
                    onChange={e => setReply(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendReply(); } }}
                    placeholder="Type your reply..."
                    className="flex-1"
                  />
                  <Button onClick={sendReply} disabled={!reply.trim() || replyMutation.isPending}>
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
