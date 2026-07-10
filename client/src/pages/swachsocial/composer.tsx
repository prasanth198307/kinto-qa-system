import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ArrowLeft, Linkedin, Facebook, Instagram, Send, Clock, Hash, CheckCircle, AlertCircle } from "lucide-react";

const PLATFORMS = [
  { key: "linkedin", label: "LinkedIn", Icon: Linkedin, limit: 3000, color: "text-blue-700" },
  { key: "facebook", label: "Facebook", Icon: Facebook, limit: 63206, color: "text-blue-600" },
  { key: "instagram", label: "Instagram", Icon: Instagram, limit: 2200, color: "text-pink-600", note: "Requires image URL" },
];

function useHashtagSuggestions(content: string) {
  const firstWord = content.trim().split(/\s+/)[0]?.replace(/[^a-zA-Z]/g, "") || "";
  const { data } = useQuery({
    queryKey: ["/api/social/hashtag/suggestions", firstWord],
    queryFn: () => fetch(`/api/social/hashtag/suggestions?topic=${encodeURIComponent(firstWord)}`).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); }),
    enabled: firstWord.length >= 3,
    staleTime: 60000,
  });
  return (data as any)?.suggestions || [];
}

export default function SwachSocialComposer() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [content, setContent] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(["linkedin"]);
  const [hashtags, setHashtags] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [mediaUrls, setMediaUrls] = useState("");

  const hashtagSuggestions: string[] = useHashtagSuggestions(content);

  const { data: connectStatus } = useQuery({
    queryKey: ["/api/social/connect-status"],
    queryFn: () => fetch("/api/social/connect-status").then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); }),
    staleTime: 60000,
  });
  const cs = connectStatus as any || {};

  const togglePlatform = (key: string) => {
    setSelectedPlatforms(prev => prev.includes(key) ? prev.filter(p => p !== key) : [...prev, key]);
  };

  const appendHashtag = (tag: string) => {
    setHashtags(prev => {
      const existing = prev.trim();
      if (existing.includes(tag)) return existing;
      return existing ? `${existing} ${tag}` : tag;
    });
  };

  const charLimit = selectedPlatforms.length > 0
    ? Math.min(...selectedPlatforms.map(p => PLATFORMS.find(pl => pl.key === p)?.limit || 99999))
    : 3000;
  const overLimit = content.length > charLimit;

  const publishMut = useMutation({
    mutationFn: (body: any) => apiRequest("POST", "/api/social/publish", body),
    onSuccess: async (res) => {
      const d = await res.json();
      const links = (d.published || []).map((p: any) => `${p.platform}${p.simulated ? " (simulated)" : ""}`).join(", ");
      toast({ title: "Published!", description: links ? `Posted to: ${links}` : "Post published." });
      qc.invalidateQueries({ queryKey: ["/api/social/posts"] });
      navigate("/swachsocial");
    },
    onError: () => toast({ title: "Error", description: "Failed to publish", variant: "destructive" }),
  });

  const scheduleMut = useMutation({
    mutationFn: (body: any) => apiRequest("POST", "/api/social/schedule", body),
    onSuccess: () => {
      toast({ title: "Scheduled!", description: "Post scheduled successfully." });
      qc.invalidateQueries({ queryKey: ["/api/social/posts"] });
      navigate("/swachsocial");
    },
    onError: () => toast({ title: "Error", description: "Failed to schedule", variant: "destructive" }),
  });

  const parsedMediaUrls = mediaUrls.split("\n").map(u => u.trim()).filter(Boolean);
  const canSubmit = content.trim() && selectedPlatforms.length > 0 && !overLimit;

  const handlePostNow = () => {
    publishMut.mutate({ content, platforms: selectedPlatforms, media_urls: parsedMediaUrls });
  };

  const handleSchedule = () => {
    if (!scheduledAt) return toast({ title: "Pick a date/time to schedule", variant: "destructive" });
    scheduleMut.mutate({ content, platforms: selectedPlatforms, scheduled_at: scheduledAt, media_urls: parsedMediaUrls });
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate("/swachsocial")}><ArrowLeft className="w-4 h-4" /></Button>
        <h1 className="text-xl font-bold">Create Post</h1>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Composer */}
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Platform Selection</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {PLATFORMS.map(({ key, label, Icon, note, color }) => {
                  const connected = cs[key]?.connected;
                  const profileName = cs[key]?.profile_name || cs[key]?.page_name;
                  const isSelected = selectedPlatforms.includes(key);
                  return (
                    <div
                      key={key}
                      className={`flex items-center justify-between p-3 rounded border cursor-pointer transition-colors ${isSelected ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:bg-gray-50"}`}
                      onClick={() => togglePlatform(key)}
                    >
                      <div className="flex items-center gap-2">
                        <Icon className={`w-4 h-4 ${color}`} />
                        <span className="text-sm font-medium">{label}</span>
                        {note && <span className="text-xs text-amber-600">({note})</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        {connected !== undefined && (
                          connected
                            ? <span className="flex items-center gap-1 text-xs text-green-600"><CheckCircle className="w-3 h-3" />{profileName || "Connected"}</span>
                            : <span className="flex items-center gap-1 text-xs text-amber-600"><AlertCircle className="w-3 h-3" />Simulated</span>
                        )}
                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${isSelected ? "bg-blue-500 border-blue-500" : "border-gray-300"}`}>
                          {isSelected && <span className="text-white text-xs">✓</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">Content</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Textarea
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  placeholder="What would you like to share?"
                  rows={6}
                  className={overLimit ? "border-red-500" : ""}
                />
                <div className={`text-xs mt-1 text-right ${overLimit ? "text-red-500" : "text-muted-foreground"}`}>
                  {content.length} / {charLimit}
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Hashtags</Label>
                <Input value={hashtags} onChange={e => setHashtags(e.target.value)} placeholder="#hashtags #separated #byspaces" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Media URLs (one per line, for Instagram)</Label>
                <Textarea value={mediaUrls} onChange={e => setMediaUrls(e.target.value)} placeholder="https://example.com/image.jpg" rows={2} />
              </div>

              {hashtagSuggestions.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mb-2">
                    <Hash className="w-3 h-3" /> Suggested hashtags:
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {hashtagSuggestions.map((tag: string) => (
                      <button
                        key={tag}
                        onClick={() => appendHashtag(tag)}
                        className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${hashtags.includes(tag) ? "bg-blue-100 border-blue-300 text-blue-700" : "bg-gray-50 border-gray-200 hover:bg-blue-50 text-gray-600"}`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">Schedule for Later</CardTitle></CardHeader>
            <CardContent>
              <Input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} />
            </CardContent>
          </Card>

          <div className="flex gap-2">
            <Button className="flex-1" onClick={handlePostNow} disabled={!canSubmit || publishMut.isPending}>
              <Send className="w-4 h-4 mr-2" />
              {publishMut.isPending ? "Publishing..." : "Post Now"}
            </Button>
            <Button variant="outline" className="flex-1" onClick={handleSchedule} disabled={!canSubmit || !scheduledAt || scheduleMut.isPending}>
              <Clock className="w-4 h-4 mr-2" />
              {scheduleMut.isPending ? "Scheduling..." : "Schedule"}
            </Button>
          </div>
        </div>

        {/* Preview */}
        <div className="space-y-4">
          <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Preview</h3>
          {selectedPlatforms.map(platKey => {
            const plat = PLATFORMS.find(p => p.key === platKey)!;
            if (!plat) return null;
            const { Icon, label, limit } = plat;
            const previewContent = content.length > limit ? content.slice(0, limit - 3) + "..." : content;
            return (
              <Card key={platKey} className="border-2">
                <CardHeader className="pb-2 flex flex-row items-center gap-2">
                  <Icon className={`w-5 h-5 ${plat.color}`} />
                  <CardTitle className="text-sm">{label} Preview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-white border rounded-lg p-3 text-sm min-h-20">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-full bg-gray-200" />
                      <div>
                        <p className="font-medium text-xs">{cs[platKey]?.profile_name || cs[platKey]?.page_name || "Your Company"}</p>
                        <p className="text-xs text-muted-foreground">Now</p>
                      </div>
                    </div>
                    <p className="whitespace-pre-wrap text-xs leading-relaxed">
                      {previewContent || <span className="text-muted-foreground italic">Start typing...</span>}
                    </p>
                    {hashtags && <p className="text-blue-500 text-xs mt-2">{hashtags}</p>}
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {selectedPlatforms.length === 0 && (
            <div className="text-sm text-muted-foreground text-center py-8">Select a platform to see preview</div>
          )}
        </div>
      </div>
    </div>
  );
}
