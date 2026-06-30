import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";

const apiFetch = (u: string) => fetch(u, { credentials: "include" }).then(r => r.json());
const apiPost = (u: string, b: any) => fetch(u, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b), credentials: "include" }).then(r => r.json());

const SEGMENT_LABELS: Record<string, string> = {
  all: "All Customers",
  churned: "Churned >30 days",
  vip: "VIP Spenders",
  birthday: "Birthday Today",
  new_customers: "New This Week",
};

const CHANNEL_ICONS: Record<string, string> = {
  whatsapp: "📱",
  sms: "💬",
  email: "📧",
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  scheduled: "bg-blue-100 text-blue-700",
  sent: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
};

const AUTO_CAMPAIGNS = [
  { id: "birthday", label: "Birthday Wishes", desc: "Send greeting on customer birthday", icon: "🎂" },
  { id: "reengagement", label: "Re-engagement (30d)", desc: "Win back customers inactive for 30 days", icon: "🔔" },
  { id: "loyalty_upgrade", label: "Loyalty Tier Upgrade", desc: "Notify customers when they reach a new tier", icon: "⭐" },
];

const VAR_CHIPS = ["{name}", "{outlet}", "{offer}", "{points}"];

const SAMPLE_VALS: Record<string, string> = { "{name}": "Rahul", "{outlet}": "MG Road", "{offer}": "20% OFF", "{points}": "250" };

function previewMessage(msg: string) {
  let out = msg;
  Object.entries(SAMPLE_VALS).forEach(([k, v]) => { out = out.replaceAll(k, v); });
  return out;
}

// ── New Campaign Modal ───────────────────────────────────────────────────────
function NewCampaignModal({ onClose, onCreated, segments }: { onClose: () => void; onCreated: () => void; segments: any }) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [segment, setSegment] = useState("all");
  const [channel, setChannel] = useState("whatsapp");
  const [message, setMessage] = useState("Hi {name}! Visit us at {outlet} today and enjoy {offer}. You have {points} loyalty points!");
  const [scheduleNow, setScheduleNow] = useState(true);
  const [scheduleAt, setScheduleAt] = useState("");
  const [saving, setSaving] = useState(false);

  const segCount = segments?.[segment] ?? 0;

  const launch = async () => {
    if (!name.trim()) { toast({ title: "Campaign name required", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const res = await apiPost("/api/restaurant/campaigns", {
        name: name.trim(),
        segment,
        channel,
        message,
        scheduled_at: scheduleNow ? null : scheduleAt || null,
      });
      toast({ title: `Campaign launched! Reaching ${res.customer_count || 0} customers.` });
      onCreated();
      onClose();
    } catch { toast({ title: "Failed to launch campaign", variant: "destructive" }); }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-5 border-b">
          <h2 className="text-lg font-bold">New Campaign</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl">✕</button>
        </div>
        <div className="p-5 space-y-4">
          {/* Name */}
          <div>
            <label className="text-sm font-medium">Campaign Name</label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Diwali Special Offer" className="mt-1" />
          </div>

          {/* Segment */}
          <div>
            <label className="text-sm font-medium">Audience Segment</label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {Object.entries(SEGMENT_LABELS).map(([key, label]) => {
                const cnt = key === "new_customers" ? (segments?.new_customers ?? 0) : (segments?.[key] ?? 0);
                return (
                  <button key={key} onClick={() => setSegment(key)}
                    className={`p-2.5 rounded border text-left transition-colors ${segment === key ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:bg-gray-50"}`}>
                    <div className="text-sm font-medium">{label}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{cnt} customers</div>
                  </button>
                );
              })}
            </div>
            <div className="text-xs text-blue-600 mt-1.5">{segCount} customers will receive this campaign</div>
          </div>

          {/* Channel */}
          <div>
            <label className="text-sm font-medium">Channel</label>
            <div className="flex gap-3 mt-2">
              {["whatsapp", "sms", "email"].map(ch => (
                <button key={ch} onClick={() => setChannel(ch)}
                  className={`flex-1 py-2 rounded border text-sm font-medium transition-colors capitalize ${channel === ch ? "border-green-500 bg-green-50 text-green-800" : "border-gray-200 hover:bg-gray-50"}`}>
                  {CHANNEL_ICONS[ch]} {ch}
                </button>
              ))}
            </div>
          </div>

          {/* Message */}
          <div>
            <label className="text-sm font-medium">Message</label>
            <div className="flex gap-1.5 mt-1 flex-wrap">
              {VAR_CHIPS.map(v => (
                <button key={v} onClick={() => setMessage(m => m + v)}
                  className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded hover:bg-blue-200 font-mono">{v}</button>
              ))}
            </div>
            <textarea value={message} onChange={e => setMessage(e.target.value)}
              className="w-full mt-2 border rounded p-2 text-sm resize-none h-24 focus:outline-none focus:ring-2 focus:ring-blue-300" />
            <div className="mt-1.5 p-2.5 bg-gray-50 border rounded text-xs text-gray-700">
              <span className="text-gray-400 font-medium">Preview: </span>{previewMessage(message)}
            </div>
          </div>

          {/* Schedule */}
          <div>
            <label className="text-sm font-medium">Schedule</label>
            <div className="flex gap-3 mt-2">
              <button onClick={() => setScheduleNow(true)}
                className={`flex-1 py-2 rounded border text-sm transition-colors ${scheduleNow ? "border-blue-500 bg-blue-50 text-blue-800 font-medium" : "border-gray-200 hover:bg-gray-50"}`}>
                ⚡ Send Now
              </button>
              <button onClick={() => setScheduleNow(false)}
                className={`flex-1 py-2 rounded border text-sm transition-colors ${!scheduleNow ? "border-blue-500 bg-blue-50 text-blue-800 font-medium" : "border-gray-200 hover:bg-gray-50"}`}>
                🕐 Schedule
              </button>
            </div>
            {!scheduleNow && (
              <Input type="datetime-local" value={scheduleAt} onChange={e => setScheduleAt(e.target.value)} className="mt-2 text-sm" />
            )}
          </div>
        </div>

        <div className="flex gap-3 p-5 border-t">
          <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          <Button onClick={launch} disabled={saving} className="flex-1 bg-green-600 hover:bg-green-700">
            {saving ? "Launching..." : "🚀 Launch Campaign"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function RestaurantCampaignsPage() {
  const qc = useQueryClient();
  const [showNew, setShowNew] = useState(false);
  const [autoCampaigns, setAutoCampaigns] = useState<Record<string, boolean>>({ birthday: false, reengagement: false, loyalty_upgrade: false });

  const { data: campaigns = [] as any[] } = useQuery({
    queryKey: ["/api/restaurant/campaigns"],
    queryFn: () => apiFetch("/api/restaurant/campaigns"),
  });

  const { data: segments = {} as any } = useQuery({
    queryKey: ["/api/restaurant/campaigns/segments/count"],
    queryFn: () => apiFetch("/api/restaurant/campaigns/segments/count"),
  });

  const thisMonth = new Date().getMonth();
  const sentThisMonth = (campaigns as any[]).filter((c: any) =>
    c.status === "sent" && new Date(c.created_at).getMonth() === thisMonth
  ).length;
  const totalCampaigns = (campaigns as any[]).length;

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Marketing Campaigns</h1>
          <p className="text-sm text-gray-500 mt-0.5">Reach customers via WhatsApp, SMS, and Email</p>
        </div>
        <Button onClick={() => setShowNew(true)} className="gap-2 bg-green-600 hover:bg-green-700">
          + New Campaign
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total Campaigns", val: totalCampaigns, icon: "📣" },
          { label: "Sent This Month", val: sentThisMonth, icon: "✅" },
          { label: "Total Customers", val: segments?.all ?? 0, icon: "👥" },
          { label: "VIP Customers", val: segments?.vip ?? 0, icon: "⭐" },
        ].map(c => (
          <Card key={c.label}><CardContent className="pt-4">
            <div className="text-xs text-gray-500">{c.label}</div>
            <div className="text-2xl font-bold mt-1">{c.icon} {c.val}</div>
          </CardContent></Card>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-5">
        {/* Campaign list */}
        <div className="col-span-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">All Campaigns</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="rounded border overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Segment</TableHead>
                      <TableHead>Channel</TableHead>
                      <TableHead className="text-right">Reach</TableHead>
                      <TableHead>Scheduled</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(campaigns as any[]).map((c: any) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium text-sm">{c.name}</TableCell>
                        <TableCell className="text-xs text-gray-600">{SEGMENT_LABELS[c.segment] || c.segment}</TableCell>
                        <TableCell className="text-sm">{CHANNEL_ICONS[c.channel] || ""} {c.channel}</TableCell>
                        <TableCell className="text-right font-mono text-sm">{Number(c.customer_count || 0).toLocaleString()}</TableCell>
                        <TableCell className="text-xs text-gray-500">
                          {c.scheduled_at ? new Date(c.scheduled_at).toLocaleString() : "Immediately"}
                        </TableCell>
                        <TableCell>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[c.status] || "bg-gray-100 text-gray-700"}`}>
                            {c.status}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                    {(campaigns as any[]).length === 0 && (
                      <TableRow><TableCell colSpan={6} className="text-center text-gray-400 py-12">
                        No campaigns yet. Create your first campaign!
                      </TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right sidebar */}
        <div className="space-y-4">
          {/* Audience snapshot */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">Audience Snapshot</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {Object.entries(SEGMENT_LABELS).map(([key, label]) => {
                const cnt = key === "new_customers" ? (segments?.new_customers ?? 0) : (segments?.[key] ?? 0);
                return (
                  <div key={key} className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">{label}</span>
                    <Badge variant="outline" className="font-mono">{cnt}</Badge>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Auto campaigns */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">Auto Campaigns</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {AUTO_CAMPAIGNS.map(ac => (
                <div key={ac.id} className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{ac.icon} {ac.label}</div>
                    <div className="text-xs text-gray-500">{ac.desc}</div>
                  </div>
                  <button
                    onClick={() => setAutoCampaigns(p => ({ ...p, [ac.id]: !p[ac.id] }))}
                    className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${autoCampaigns[ac.id] ? "bg-green-500" : "bg-gray-200"}`}
                  >
                    <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${autoCampaigns[ac.id] ? "translate-x-4" : "translate-x-0.5"}`} />
                  </button>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {showNew && (
        <NewCampaignModal
          onClose={() => setShowNew(false)}
          onCreated={() => qc.invalidateQueries({ queryKey: ["/api/restaurant/campaigns"] })}
          segments={segments}
        />
      )}
    </div>
  );
}
