import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ArrowLeft, ChevronLeft, ChevronRight, Play } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-200 text-gray-700",
  scheduled: "bg-blue-100 text-blue-700",
  published: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
  cancelled: "bg-gray-100 text-gray-400",
  deleted: "bg-gray-100 text-gray-400",
};

export default function SwachSocialCalendar() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selected, setSelected] = useState<string | null>(null);

  const { data: calendar = {} } = useQuery({
    queryKey: ["/api/social/calendar"],
    queryFn: () => fetch("/api/social/calendar").then(r => r.json()),
  });

  const { data: scheduledPosts = [] } = useQuery({
    queryKey: ["/api/social/posts", "scheduled"],
    queryFn: () => fetch("/api/social/posts?status=scheduled").then(r => r.json()),
  });

  const processMut = useMutation({
    mutationFn: () => apiRequest("POST", "/api/social/process-scheduled"),
    onSuccess: async (res) => {
      const d = await res.json();
      toast({ title: `Processed ${d.processed} posts`, description: `Succeeded: ${d.succeeded}, Failed: ${d.failed}` });
      qc.invalidateQueries({ queryKey: ["/api/social/posts"] });
      qc.invalidateQueries({ queryKey: ["/api/social/calendar"] });
    },
    onError: () => toast({ title: "Error processing scheduled posts", variant: "destructive" }),
  });

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const monthName = currentDate.toLocaleString("default", { month: "long", year: "numeric" });

  const scheduledList: any[] = scheduledPosts as any[];

  // Group scheduled posts by date
  const scheduledByDate: Record<string, any[]> = {};
  for (const post of scheduledList) {
    if (!post.scheduled_at) continue;
    const day = post.scheduled_at.slice(0, 10);
    if (!scheduledByDate[day]) scheduledByDate[day] = [];
    scheduledByDate[day].push(post);
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/swachsocial")}><ArrowLeft className="w-4 h-4" /></Button>
          <h1 className="text-xl font-bold">Content Calendar</h1>
        </div>
        <Button variant="outline" size="sm" onClick={() => processMut.mutate()} disabled={processMut.isPending}>
          <Play className={`w-4 h-4 mr-2 ${processMut.isPending ? "animate-pulse" : ""}`} />
          {processMut.isPending ? "Processing..." : "Process Scheduled"}
        </Button>
      </div>

      {/* Scheduled posts list */}
      {scheduledList.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Scheduled Posts ({scheduledList.length})</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {Object.entries(scheduledByDate).sort(([a], [b]) => a.localeCompare(b)).map(([date, posts]) => (
              <div key={date}>
                <p className="text-xs font-semibold text-muted-foreground mb-1">{new Date(date + "T00:00:00").toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}</p>
                {posts.map((post: any) => (
                  <div key={post.id} className="flex items-start justify-between gap-3 p-2 border rounded mb-1">
                    <div className="min-w-0">
                      <p className="text-xs truncate">{post.content?.slice(0, 80)}{post.content?.length > 80 ? "..." : ""}</p>
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {(post.platforms || []).map((pl: string) => (
                          <span key={pl} className="text-xs bg-gray-100 px-1.5 py-0.5 rounded capitalize">{pl}</span>
                        ))}
                      </div>
                    </div>
                    <Badge className={`text-xs shrink-0 ${STATUS_COLORS[post.status] || ""}`}>{post.status}</Badge>
                  </div>
                ))}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Calendar grid */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle>{monthName}</CardTitle>
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" onClick={prevMonth}><ChevronLeft className="w-4 h-4" /></Button>
            <Button variant="ghost" size="sm" onClick={nextMonth}><ChevronRight className="w-4 h-4" /></Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
              <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2">{d}</div>
            ))}
            {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const dayPosts: any[] = (calendar as any)[dateKey] || [];
              const isSelected = selected === dateKey;
              const isToday = new Date().toDateString() === new Date(year, month, day).toDateString();
              return (
                <div
                  key={day}
                  className={`min-h-[70px] p-1 border rounded cursor-pointer transition-colors ${isSelected ? "border-blue-500 bg-blue-50" : "border-transparent hover:bg-muted/50"} ${isToday ? "border-blue-300" : ""}`}
                  onClick={() => setSelected(isSelected ? null : dateKey)}
                >
                  <div className={`text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full ${isToday ? "bg-blue-500 text-white" : ""}`}>{day}</div>
                  <div className="space-y-0.5">
                    {dayPosts.slice(0, 3).map((post: any) => (
                      <div key={post.id} className={`text-xs px-1 py-0.5 rounded truncate ${STATUS_COLORS[post.status] || "bg-gray-100"}`}>
                        {post.title || post.content?.slice(0, 15)}
                      </div>
                    ))}
                    {dayPosts.length > 3 && <div className="text-xs text-muted-foreground">+{dayPosts.length - 3} more</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {selected && (calendar as any)[selected] && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Posts on {selected}</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {((calendar as any)[selected] as any[]).map((post: any) => (
              <div key={post.id} className="flex items-start justify-between gap-3 p-3 border rounded">
                <div>
                  <p className="text-sm">{post.content?.slice(0, 100)}{post.content?.length > 100 ? "..." : ""}</p>
                  <div className="flex gap-1 mt-1">
                    {(post.platforms || []).map((p: string) => <Badge key={p} variant="outline" className="text-xs">{p}</Badge>)}
                  </div>
                </div>
                <Badge className={`text-xs shrink-0 ${STATUS_COLORS[post.status] || ""}`}>{post.status}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Legend */}
      <div className="flex gap-3 flex-wrap">
        {Object.entries(STATUS_COLORS).map(([status, cls]) => (
          <div key={status} className="flex items-center gap-1.5">
            <div className={`w-3 h-3 rounded ${cls}`} />
            <span className="text-xs text-muted-foreground capitalize">{status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
