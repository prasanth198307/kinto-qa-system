import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ArrowLeft, Heart, MessageCircle, Share2, RefreshCw, CheckCircle, AlertCircle, Trophy } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  scheduled: "bg-blue-100 text-blue-700",
  published: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-600",
  deleted: "bg-gray-100 text-gray-400",
};

export default function SwachSocialAnalytics() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: analyticsData } = useQuery({
    queryKey: ["/api/social/analytics-summary"],
    queryFn: () => fetch("/api/social/analytics-summary").then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); }),
  });

  const { data: connectStatus } = useQuery({
    queryKey: ["/api/social/connect-status"],
    queryFn: () => fetch("/api/social/connect-status").then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); }),
    staleTime: 60000,
  });

  const { data: posts = [] } = useQuery({
    queryKey: ["/api/social/posts"],
    queryFn: () => fetch("/api/social/posts").then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); }),
  });

  const syncMut = useMutation({
    mutationFn: () => apiRequest("POST", "/api/social/sync-engagement"),
    onSuccess: async (res) => {
      const d = await res.json();
      toast({ title: `Synced ${d.synced} engagement records` });
      qc.invalidateQueries({ queryKey: ["/api/social/analytics-summary"] });
    },
    onError: () => toast({ title: "Error syncing engagement", variant: "destructive" }),
  });

  const ad = analyticsData as any;
  const cs = connectStatus as any || {};
  const byPlatform: any[] = ad?.by_platform || [];
  const postsList: any[] = posts as any[];
  const bestPost: any = ad?.best_performing_post || null;

  const PLATFORM_LABELS: Record<string, string> = { linkedin: "LinkedIn", facebook: "Facebook", instagram: "Instagram" };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/swachsocial")}><ArrowLeft className="w-4 h-4" /></Button>
          <h1 className="text-xl font-bold">Social Analytics</h1>
        </div>
        <Button variant="outline" size="sm" onClick={() => syncMut.mutate()} disabled={syncMut.isPending}>
          <RefreshCw className={`w-4 h-4 mr-2 ${syncMut.isPending ? "animate-spin" : ""}`} />
          {syncMut.isPending ? "Syncing..." : "Sync Engagement"}
        </Button>
      </div>

      {/* Connection Status */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Platform Connection Status</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            {["linkedin", "facebook", "instagram"].map(platform => {
              const info = cs[platform];
              const connected = info?.connected;
              const name = info?.profile_name || info?.page_name;
              return (
                <div key={platform} className="flex items-center gap-2 text-sm">
                  {connected
                    ? <CheckCircle className="w-4 h-4 text-green-600" />
                    : <AlertCircle className="w-4 h-4 text-amber-500" />}
                  <span className="font-medium capitalize">{PLATFORM_LABELS[platform] || platform}</span>
                  <span className={`text-xs ${connected ? "text-green-600" : "text-amber-600"}`}>
                    {connected ? (name ? `(${name})` : "Live") : "Simulated"}
                  </span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Per-platform engagement cards */}
      {byPlatform.length > 0 && (
        <div className="grid md:grid-cols-3 gap-4">
          {byPlatform.map((p: any) => (
            <Card key={p.platform}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm capitalize">{PLATFORM_LABELS[p.platform] || p.platform}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-1"><Heart className="w-3 h-3 text-red-500" /><span>{parseInt(p.total_likes || 0).toLocaleString()} Likes</span></div>
                  <div className="flex items-center gap-1"><MessageCircle className="w-3 h-3 text-purple-500" /><span>{parseInt(p.total_comments || 0).toLocaleString()} Comments</span></div>
                  <div className="flex items-center gap-1"><Share2 className="w-3 h-3 text-amber-500" /><span>{parseInt(p.total_shares || 0).toLocaleString()} Shares</span></div>
                  <div className="text-muted-foreground text-xs pt-1">{parseFloat(p.avg_engagement || 0).toFixed(2)}% engagement</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {byPlatform.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No engagement data yet. Publish posts and click "Sync Engagement" to pull stats.
          </CardContent>
        </Card>
      )}

      {/* Best performing post */}
      {bestPost && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2"><Trophy className="w-4 h-4 text-amber-500" />Best Performing Post</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{bestPost.content?.slice(0, 150)}{bestPost.content?.length > 150 ? "..." : ""}</p>
            <div className="flex items-center gap-2 mt-2">
              {(bestPost.platforms || []).map((pl: string) => <Badge key={pl} variant="outline" className="text-xs capitalize">{pl}</Badge>)}
              <span className="text-xs text-muted-foreground">{parseInt(bestPost.engagement || 0)} total engagements</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Posts table */}
      <Card>
        <CardHeader><CardTitle className="text-sm">All Posts</CardTitle></CardHeader>
        <CardContent>
          {postsList.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No posts yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 pr-3 font-medium text-muted-foreground">Content</th>
                    <th className="text-left py-2 pr-3 font-medium text-muted-foreground">Platforms</th>
                    <th className="text-left py-2 pr-3 font-medium text-muted-foreground">Status</th>
                    <th className="text-right py-2 font-medium text-muted-foreground">Published</th>
                  </tr>
                </thead>
                <tbody>
                  {postsList.map((post: any) => (
                    <tr key={post.id} className="border-b hover:bg-muted/50">
                      <td className="py-2 pr-3 max-w-xs">
                        <p className="truncate text-xs">{post.content?.slice(0, 60)}{post.content?.length > 60 ? "..." : ""}</p>
                      </td>
                      <td className="py-2 pr-3">
                        <div className="flex gap-1 flex-wrap">
                          {(post.platforms || []).map((pl: string) => (
                            <span key={pl} className="text-xs bg-gray-100 px-1.5 py-0.5 rounded capitalize">{pl}</span>
                          ))}
                        </div>
                      </td>
                      <td className="py-2 pr-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[post.status] || "bg-gray-100"}`}>{post.status}</span>
                      </td>
                      <td className="py-2 text-right text-xs text-muted-foreground">
                        {post.published_at ? new Date(post.published_at).toLocaleDateString() : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
