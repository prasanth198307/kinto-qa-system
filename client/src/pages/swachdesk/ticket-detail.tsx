import { apiFetch } from "@/lib/api-fetch";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Send, Lock, CheckCircle, XCircle, RotateCcw, Sparkles, Tag, ChevronDown, ChevronUp, Copy } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  open: "bg-yellow-100 text-yellow-800",
  in_progress: "bg-blue-100 text-blue-800",
  waiting_customer: "bg-purple-100 text-purple-800",
  resolved: "bg-green-100 text-green-800",
  closed: "bg-gray-100 text-gray-600",
};

const PRIORITY_COLORS: Record<string, string> = {
  critical: "bg-red-100 text-red-800",
  high: "bg-orange-100 text-orange-800",
  medium: "bg-blue-100 text-blue-800",
  low: "bg-gray-100 text-gray-700",
};

const SENTIMENT_COLORS: Record<string, string> = {
  positive: "bg-green-100 text-green-700",
  neutral: "bg-gray-100 text-gray-700",
  negative: "bg-orange-100 text-orange-700",
  urgent: "bg-red-100 text-red-700",
};

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [reply, setReply] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [selectedCanned, setSelectedCanned] = useState("");
  const [aiSummary, setAiSummary] = useState<any>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [showSuggestedReply, setShowSuggestedReply] = useState(false);
  const [aiTags, setAiTags] = useState<string[] | null>(null);
  const [tagging, setTagging] = useState(false);

  const { data: ticket, isLoading } = useQuery<any>({
    queryKey: [`/api/desk/tickets/${id}`],
    queryFn: async () => apiFetch(`/api/desk/tickets/${id}`),
  });

  const { data: cannedResponses = [] } = useQuery<any[]>({
    queryKey: ["/api/desk/canned-responses"],
    queryFn: async () => apiFetch("/api/desk/canned-responses"),
  });

  const replyMutation = useMutation({
    mutationFn: async (data: any) => {
      const r = await fetch(`/api/desk/tickets/${id}/reply`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      if (!r.ok) throw new Error("Failed to send reply");
      return r.json();
    },
    onSuccess: () => {
      toast({ title: "Reply sent" });
      setReply("");
      qc.invalidateQueries({ queryKey: [`/api/desk/tickets/${id}`] });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const actionMutation = useMutation({
    mutationFn: async (action: string) => {
      const r = await fetch(`/api/desk/tickets/${id}/${action}`, { method: "POST" });
      if (!r.ok) throw new Error(`Failed: ${action}`);
      return r.json();
    },
    onSuccess: (_, action) => {
      toast({ title: `Ticket ${action}d` });
      qc.invalidateQueries({ queryKey: [`/api/desk/tickets/${id}`] });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const fetchAISummary = async () => {
    setAiLoading(true);
    try {
      const resp = await fetch(`/api/ai/tickets/${id}/summarise`, { method: "POST" });
      const data = await resp.json();
      setAiSummary(data);
    } catch (e: any) {
      toast({ title: "AI Error", description: e.message, variant: "destructive" });
    } finally {
      setAiLoading(false);
    }
  };

  const handleAutoTag = async () => {
    setTagging(true);
    try {
      const resp = await fetch(`/api/ai/tickets/${id}/smart-tag`, { method: "POST" });
      const data = await resp.json();
      setAiTags(data.tags || []);
      toast({ title: "Tags applied", description: data.tags?.join(", ") });
    } catch (e: any) {
      toast({ title: "Tagging failed", description: e.message, variant: "destructive" });
    } finally {
      setTagging(false);
    }
  };

  if (isLoading) return <div className="p-6 text-muted-foreground">Loading ticket...</div>;
  if (!ticket || ticket.message) return <div className="p-6 text-red-500">Ticket not found</div>;

  const isClosed = ["resolved", "closed"].includes(ticket.status);
  const slaOverdue = ticket.sla_due_at && new Date() > new Date(ticket.sla_due_at) && !isClosed;

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => setLocation("/swachdesk")}><ArrowLeft className="w-4 h-4 mr-1" />Back</Button>
        <span className="font-mono text-sm text-muted-foreground">{ticket.ticket_no}</span>
        <Badge className={`text-xs ${STATUS_COLORS[ticket.status] || ""}`}>{ticket.status?.replace(/_/g, " ")}</Badge>
        <Badge className={`text-xs ${PRIORITY_COLORS[ticket.priority] || ""}`}>{ticket.priority}</Badge>
        {slaOverdue && <Badge className="text-xs bg-red-100 text-red-800">SLA Breached</Badge>}
      </div>

      <h1 className="text-xl font-bold">{ticket.subject}</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Info */}
        <div className="space-y-4">
          <div className="border rounded-lg p-4 space-y-3">
            <h3 className="font-semibold text-sm">Ticket Details</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Channel</span><span className="capitalize">{ticket.channel}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Category</span><span>{ticket.category || "-"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Agent</span><span>{ticket.agent_name || "Unassigned"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">SLA Due</span>
                <span className={slaOverdue ? "text-red-600 font-semibold" : ""}>{ticket.sla_due_at ? new Date(ticket.sla_due_at).toLocaleString() : "-"}</span>
              </div>
              {ticket.csat_score && <div className="flex justify-between"><span className="text-muted-foreground">CSAT</span><span>{"⭐".repeat(ticket.csat_score)} ({ticket.csat_score}/5)</span></div>}
            </div>
          </div>

          <div className="border rounded-lg p-4 space-y-3">
            <h3 className="font-semibold text-sm">Customer</h3>
            <div className="space-y-2 text-sm">
              <div>{ticket.customer_name || "Unknown"}</div>
              {ticket.customer_email && <div className="text-muted-foreground">{ticket.customer_email}</div>}
              {ticket.customer_phone && <div className="text-muted-foreground">{ticket.customer_phone}</div>}
            </div>
          </div>

          {/* Actions */}
          <div className="border rounded-lg p-4 space-y-2">
            <h3 className="font-semibold text-sm">Actions</h3>
            {!isClosed && (
              <>
                <Button size="sm" className="w-full" variant="outline" onClick={() => actionMutation.mutate("resolve")} disabled={actionMutation.isPending}>
                  <CheckCircle className="w-4 h-4 mr-2" />Resolve
                </Button>
                <Button size="sm" className="w-full" variant="outline" onClick={() => actionMutation.mutate("close")} disabled={actionMutation.isPending}>
                  <XCircle className="w-4 h-4 mr-2" />Close
                </Button>
              </>
            )}
            {isClosed && (
              <Button size="sm" className="w-full" variant="outline" onClick={() => actionMutation.mutate("reopen")} disabled={actionMutation.isPending}>
                <RotateCcw className="w-4 h-4 mr-2" />Reopen
              </Button>
            )}
          </div>

          {/* AI Insights */}
          <div className="border border-purple-200 rounded-lg p-4 space-y-3 bg-purple-50/30">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-purple-500" />AI Insights
              </h3>
              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">Powered by SwachAI</span>
            </div>

            <Button
              size="sm"
              className="w-full bg-purple-600 hover:bg-purple-700 text-white"
              onClick={fetchAISummary}
              disabled={aiLoading}
            >
              <Sparkles className="w-4 h-4 mr-2" />{aiLoading ? "Analysing..." : "Analyse Ticket"}
            </Button>

            <Button
              size="sm"
              className="w-full"
              variant="outline"
              onClick={handleAutoTag}
              disabled={tagging}
            >
              <Tag className="w-4 h-4 mr-2" />{tagging ? "Tagging..." : "Auto-tag"}
            </Button>

            {aiTags && aiTags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {aiTags.map(tag => (
                  <span key={tag} className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">{tag}</span>
                ))}
              </div>
            )}

            {aiSummary && (
              <div className="space-y-3 text-sm">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-muted-foreground">Sentiment</span>
                    <Badge className={`text-xs ${SENTIMENT_COLORS[aiSummary.sentiment] || "bg-gray-100 text-gray-700"}`}>
                      {aiSummary.sentiment}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{aiSummary.summary}</p>
                </div>

                {aiSummary.key_points?.length > 0 && (
                  <div>
                    <p className="text-xs font-medium mb-1">Key Points</p>
                    <ul className="space-y-0.5">
                      {aiSummary.key_points.map((pt: string, i: number) => (
                        <li key={i} className="text-xs text-muted-foreground flex gap-1">
                          <span className="text-purple-400 mt-0.5">•</span>{pt}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {aiSummary.suggested_reply && (
                  <div className="border border-purple-100 rounded-md p-2 bg-white">
                    <button
                      className="w-full flex items-center justify-between text-xs font-medium text-purple-700"
                      onClick={() => setShowSuggestedReply(v => !v)}
                    >
                      Suggested Reply
                      {showSuggestedReply ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                    {showSuggestedReply && (
                      <div className="mt-2 space-y-2">
                        <p className="text-xs text-muted-foreground leading-relaxed">{aiSummary.suggested_reply}</p>
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full h-7 text-xs"
                          onClick={() => {
                            setReply(aiSummary.suggested_reply);
                            toast({ title: "Copied to reply box" });
                          }}
                        >
                          <Copy className="w-3 h-3 mr-1" />Use this reply
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Center: Thread */}
        <div className="lg:col-span-2 space-y-4">
          {/* Description */}
          {ticket.description && (
            <div className="border rounded-lg p-4 bg-muted/20">
              <div className="text-xs text-muted-foreground mb-1">Original description</div>
              <p className="text-sm whitespace-pre-wrap">{ticket.description}</p>
            </div>
          )}

          {/* Comments */}
          <div className="space-y-3">
            {(ticket.comments || []).map((c: any) => (
              <div key={c.id} className={`border rounded-lg p-4 ${c.is_internal ? "bg-yellow-50 border-yellow-200" : c.author_type === "customer" ? "bg-blue-50 border-blue-200" : ""}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sm">{c.author_name || c.author_type}</span>
                  <div className="flex items-center gap-2">
                    {c.is_internal && <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded"><Lock className="w-3 h-3 inline mr-1" />Internal</span>}
                    <span className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleString()}</span>
                  </div>
                </div>
                <p className="text-sm whitespace-pre-wrap">{c.content}</p>
              </div>
            ))}
          </div>

          {/* Reply box */}
          {!isClosed && (
            <div className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Reply</Label>
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground">Internal note</Label>
                  <Switch checked={isInternal} onCheckedChange={setIsInternal} />
                </div>
              </div>
              {cannedResponses.length > 0 && (
                <Select value={selectedCanned} onValueChange={v => {
                  const cr = cannedResponses.find((c: any) => String(c.id) === v);
                  if (cr) setReply(cr.content);
                  setSelectedCanned(v);
                }}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Use canned response..." /></SelectTrigger>
                  <SelectContent>
                    {cannedResponses.map((c: any) => <SelectItem key={c.id} value={String(c.id)}>{c.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
              <Textarea rows={4} placeholder="Type your reply..." value={reply} onChange={e => setReply(e.target.value)} />
              <Button onClick={() => replyMutation.mutate({ content: reply, is_internal: isInternal })} disabled={!reply.trim() || replyMutation.isPending}>
                <Send className="w-4 h-4 mr-2" />{replyMutation.isPending ? "Sending..." : isInternal ? "Add Note" : "Send Reply"}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
