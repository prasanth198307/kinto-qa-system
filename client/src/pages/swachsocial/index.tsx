import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Share2, Plus, Linkedin, Facebook, Instagram, Twitter, Calendar, BarChart2, Clock, CheckCircle, TrendingUp, Eye, Heart } from "lucide-react";

const PLATFORMS = [
  { key: "linkedin", label: "LinkedIn", Icon: Linkedin, color: "text-blue-700 bg-blue-50" },
  { key: "facebook", label: "Facebook", Icon: Facebook, color: "text-blue-600 bg-blue-50" },
  { key: "instagram", label: "Instagram", Icon: Instagram, color: "text-pink-600 bg-pink-50" },
  { key: "twitter", label: "X (Twitter)", Icon: Twitter, color: "text-gray-900 bg-gray-50" },
];

const POST_STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  scheduled: "bg-blue-100 text-blue-700",
  posting: "bg-amber-100 text-amber-700",
  published: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
  cancelled: "bg-gray-200 text-gray-500",
};

export default function SwachSocialIndex() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: accounts = [] } = useQuery({
    queryKey: ["/api/social/accounts"],
    queryFn: () => fetch("/api/social/accounts").then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); }),
  });

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["/api/social/posts"],
    queryFn: () => fetch("/api/social/posts").then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); }),
  });

  const { data: analyticsSummary } = useQuery({
    queryKey: ["/api/social/analytics/summary"],
    queryFn: () => fetch("/api/social/analytics/summary").then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); }),
  });

  const connectMut = useMutation({
    mutationFn: (platform: string) => apiRequest("POST", "/api/social/accounts/connect", { platform, account_name: `Demo ${platform}` }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/social/accounts"] }); toast({ title: "Connected!" }); },
  });

  const schedulerMut = useMutation({
    mutationFn: () => apiRequest("POST", "/api/social/scheduler/run"),
    onSuccess: async (res) => { const d = await res.json(); toast({ title: `Published ${d.published} posts` }); qc.invalidateQueries({ queryKey: ["/api/social/posts"] }); },
  });

  const fetchAnalyticsMut = useMutation({
    mutationFn: () => apiRequest("POST", "/api/social/analytics/fetch"),
    onSuccess: async (res) => {
      const d = await res.json();
      toast({ title: `Analytics fetched: ${d.fetched} records updated` });
      qc.invalidateQueries({ queryKey: ["/api/social/analytics/summary"] });
    },
    onError: () => toast({ title: "Error", description: "Failed to fetch analytics", variant: "destructive" }),
  });

  const connectedPlatforms = new Set((accounts as any[]).map((a: any) => a.platform));
  const upcomingPosts = (posts as any[]).filter(p => p.status === "scheduled").slice(0, 5);
  const publishedThisMonth = (posts as any[]).filter(p => p.status === "published" && new Date(p.published_at) > new Date(Date.now() - 30 * 86400000)).length;
  const summary = analyticsSummary as any;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Share2 className="w-6 h-6" /> SwachSocial</h1>
          <p className="text-muted-foreground">Social Media Scheduler</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => fetchAnalyticsMut.mutate()} disabled={fetchAnalyticsMut.isPending}>
            <TrendingUp className="w-4 h-4 mr-2" />{fetchAnalyticsMut.isPending ? "Fetching..." : "Fetch Analytics"}
          </Button>
          <Button variant="outline" size="sm" onClick={() => schedulerMut.mutate()} disabled={schedulerMut.isPending}>
            <Clock className="w-4 h-4 mr-2" />{schedulerMut.isPending ? "Running..." : "Run Scheduler"}
          </Button>
          <Button size="sm" onClick={() => navigate("/swachsocial/composer")}><Plus className="w-4 h-4 mr-2" />Create Post</Button>
        </div>
      </div>

      {/* Connected Accounts */}
      <Card>
        <CardHeader><CardTitle className="text-base">Connected Platforms</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {PLATFORMS.map(({ key, label, Icon, color }) => {
              const connected = connectedPlatforms.has(key);
              return (
                <div key={key} className={`flex flex-col items-center gap-2 p-4 rounded-lg border ${connected ? "border-green-200 bg-green-50" : "border-gray-200"}`}>
                  <Icon className={`w-8 h-8 ${connected ? "text-green-600" : "text-gray-400"}`} />
                  <span className="text-sm font-medium">{label}</span>
                  {connected ? (
                    <Badge className="bg-green-100 text-green-700 text-xs"><CheckCircle className="w-3 h-3 mr-1" />Connected</Badge>
                  ) : (
                    <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => connectMut.mutate(key)}>Connect</Button>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Analytics Summary Row */}
      {summary && (
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="w-4 h-4" />Analytics (Last 30 Days)</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 md:grid-cols-5 gap-4">
              <div className="text-center">
                <Eye className="w-5 h-5 mx-auto mb-1 text-blue-600" />
                <p className="text-xl font-bold">{(summary.total_impressions || 0).toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Impressions</p>
              </div>
              <div className="text-center">
                <TrendingUp className="w-5 h-5 mx-auto mb-1 text-green-600" />
                <p className="text-xl font-bold">{(summary.total_reach || 0).toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Reach</p>
              </div>
              <div className="text-center">
                <Heart className="w-5 h-5 mx-auto mb-1 text-red-500" />
                <p className="text-xl font-bold">{(summary.total_likes || 0).toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Likes</p>
              </div>
              <div className="text-center">
                <Share2 className="w-5 h-5 mx-auto mb-1 text-amber-500" />
                <p className="text-xl font-bold">{(summary.total_shares || 0).toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Shares</p>
              </div>
              <div className="text-center">
                <BarChart2 className="w-5 h-5 mx-auto mb-1 text-purple-600" />
                <p className="text-xl font-bold">
                  {summary.total_impressions > 0
                    ? ((((summary.total_likes || 0) + (summary.total_comments || 0) + (summary.total_shares || 0)) / summary.total_impressions) * 100).toFixed(1)
                    : "0"}%
                </p>
                <p className="text-xs text-muted-foreground">Avg Engagement</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Scheduled</p>
            <p className="text-2xl font-bold">{(posts as any[]).filter(p => p.status === "scheduled").length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Published (30d)</p>
            <p className="text-2xl font-bold">{publishedThisMonth}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Drafts</p>
            <p className="text-2xl font-bold">{(posts as any[]).filter(p => p.status === "draft").length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick nav */}
      <div className="flex gap-3">
        <Button variant="outline" onClick={() => navigate("/swachsocial/calendar")}>
          <Calendar className="w-4 h-4 mr-2" />Calendar View
        </Button>
        <Button variant="outline" onClick={() => navigate("/swachsocial/analytics")}>
          <BarChart2 className="w-4 h-4 mr-2" />Analytics
        </Button>
      </div>

      {/* Upcoming posts */}
      <Card>
        <CardHeader><CardTitle className="text-base">Upcoming Posts (Next 7 Days)</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {upcomingPosts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No scheduled posts. <button className="text-blue-600 underline" onClick={() => navigate("/swachsocial/composer")}>Create one</button>.</p>
          ) : upcomingPosts.map((post: any) => (
            <div key={post.id} className="flex items-start justify-between gap-3 p-3 border rounded-lg">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{post.title || post.content?.slice(0, 60) + "..."}</p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {(post.platforms || []).map((p: string) => (
                    <Badge key={p} variant="outline" className="text-xs">{p}</Badge>
                  ))}
                  <span className="text-xs text-muted-foreground">{post.scheduled_at ? new Date(post.scheduled_at).toLocaleString() : "—"}</span>
                </div>
              </div>
              <Badge className={`text-xs shrink-0 ${POST_STATUS_COLORS[post.status] || ""}`}>{post.status}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* All posts */}
      <Card>
        <CardHeader><CardTitle className="text-base">All Posts</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {isLoading ? <p className="text-center py-4 text-muted-foreground">Loading...</p> :
            (posts as any[]).slice(0, 10).map((post: any) => (
              <div key={post.id} className="flex items-center justify-between gap-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer" onClick={() => navigate(`/swachsocial/composer?id=${post.id}`)}>
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{post.content?.slice(0, 80)}...</p>
                  <div className="flex gap-1 mt-1">
                    {(post.platforms || []).map((p: string) => <Badge key={p} variant="outline" className="text-xs">{p}</Badge>)}
                  </div>
                </div>
                <Badge className={`text-xs shrink-0 ${POST_STATUS_COLORS[post.status] || ""}`}>{post.status}</Badge>
              </div>
            ))}
        </CardContent>
      </Card>
    </div>
  );
}
