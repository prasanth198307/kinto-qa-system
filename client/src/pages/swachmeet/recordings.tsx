import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Download, Mic, FileText, Video } from "lucide-react";

interface Recording {
  id: number;
  room_name: string;
  meeting_title?: string;
  file_name?: string;
  duration_seconds?: number;
  transcript_status?: string;
  transcript?: string;
  created_at: string;
}

function formatDuration(secs?: number) {
  if (!secs) return "-";
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}m ${s}s`;
}

function TranscriptBadge({ status }: { status?: string }) {
  if (!status || status === "none") return null;
  const map: Record<string, string> = { processing: "bg-yellow-100 text-yellow-800", done: "bg-green-100 text-green-800", error: "bg-red-100 text-red-800" };
  const label: Record<string, string> = { processing: "Transcribing...", done: "Transcript ready", error: "Transcript failed" };
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${map[status] || ""}`}>{label[status] || status}</span>;
}

export default function RecordingsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [viewTranscript, setViewTranscript] = useState<Recording | null>(null);

  const { data: recordings = [], isLoading } = useQuery<Recording[]>({
    queryKey: ["/api/swachmeet/recordings"],
  });

  const transcribeMut = useMutation({
    mutationFn: (id: number) => apiRequest("POST", `/api/swachmeet/recordings/${id}/transcribe`),
    onSuccess: () => {
      toast({ title: "Transcription started", description: "AI is processing the recording. Check back in a minute." });
      qc.invalidateQueries({ queryKey: ["/api/swachmeet/recordings"] });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const handleDownload = (rec: Recording) => {
    window.open(`/api/swachmeet/recordings/${rec.id}/download`, "_blank");
  };

  const handleViewTranscript = async (rec: Recording) => {
    const res = await apiRequest("GET", `/api/swachmeet/recordings/${rec.id}/transcript`);
    const data = await res.json();
    setViewTranscript({ ...rec, transcript: data.transcript, transcript_status: data.status });
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Video className="w-7 h-7 text-blue-600" />
        <h1 className="text-2xl font-bold">Meeting Recordings</h1>
      </div>

      {isLoading && <p className="text-muted-foreground">Loading recordings...</p>}

      {!isLoading && recordings.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No recordings yet. Use the Record button inside a meeting to capture sessions.
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {recordings.map((rec) => (
          <Card key={rec.id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center justify-between">
                <span>{rec.meeting_title || rec.room_name || "Meeting"}</span>
                <TranscriptBadge status={rec.transcript_status} />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between gap-4">
                <div className="text-sm text-muted-foreground space-y-0.5">
                  <div>{new Date(rec.created_at).toLocaleString()}</div>
                  <div>Duration: {formatDuration(rec.duration_seconds)}</div>
                  {rec.file_name && <div className="font-mono text-xs">{rec.file_name}</div>}
                </div>
                <div className="flex gap-2 flex-wrap justify-end">
                  <Button size="sm" variant="outline" onClick={() => handleDownload(rec)}>
                    <Download className="w-4 h-4 mr-1" /> Download
                  </Button>
                  {(!rec.transcript_status || rec.transcript_status === "none" || rec.transcript_status === "error") && (
                    <Button size="sm" variant="outline" onClick={() => transcribeMut.mutate(rec.id)} disabled={transcribeMut.isPending}>
                      <Mic className="w-4 h-4 mr-1" /> AI Transcript
                    </Button>
                  )}
                  {rec.transcript_status === "done" && (
                    <Button size="sm" variant="outline" onClick={() => handleViewTranscript(rec)}>
                      <FileText className="w-4 h-4 mr-1" /> View Transcript
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={!!viewTranscript} onOpenChange={() => setViewTranscript(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>AI Transcript — {viewTranscript?.meeting_title || viewTranscript?.room_name}</DialogTitle>
          </DialogHeader>
          <pre className="whitespace-pre-wrap text-sm leading-relaxed font-sans">{viewTranscript?.transcript || "No transcript available."}</pre>
        </DialogContent>
      </Dialog>
    </div>
  );
}
