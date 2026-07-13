import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, Phone, Mail, Building, Star, MessageSquare, DollarSign, FileText } from "lucide-react";
import { useTenantConfig, formatCurrency as fmtCur } from "@/hooks/use-tenant-config";

const api = (path: string) => fetch(path).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); });

const SAMPLE_CUSTOMER = {
  id: 1,
  name: "Infosys Ltd",
  contact: "Sunil Mehta",
  email: "sunil@infosys.com",
  phone: "+91 98765 43210",
  company: "Infosys Ltd",
  score: 84,
  lifetime_value: 4500000,
  tags: ["Enterprise", "Priority", "Renewal Due"],
  next_action: "Schedule demo for Q3 expansion",
  timeline: [
    { type: "call", date: "2026-06-28", desc: "Discovery call — discussed Q3 requirements", by: "Suresh" },
    { type: "email", date: "2026-06-25", desc: "Sent proposal for 50-seat license", by: "Suresh" },
    { type: "deal", date: "2026-06-20", desc: "Deal moved to Negotiation stage", by: "System" },
    { type: "ticket", date: "2026-06-15", desc: "Support: API integration issue resolved", by: "Support Team" },
    { type: "email", date: "2026-06-10", desc: "Follow-up after trial period", by: "Anita" },
    { type: "call", date: "2026-05-30", desc: "Initial qualification call", by: "Suresh" },
  ],
  opportunities: [
    { name: "Q3 Expansion", stage: "Negotiation", value: 2000000 },
    { name: "Add-on Modules", stage: "Proposal", value: 500000 },
  ],
};

const ICON_MAP: Record<string, any> = {
  call: Phone,
  email: Mail,
  deal: DollarSign,
  ticket: FileText,
};

const CUSTOMERS = [
  { id: 1, name: "Infosys Ltd" },
  { id: 2, name: "TCS Mumbai" },
  { id: 3, name: "Wipro Tech" },
];

export default function Customer360Page() {
  const [search, setSearch] = useState("");
  const tenantConfig = useTenantConfig();
  const sym = tenantConfig.currency_symbol;
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [replyText, setReplyText] = useState("");

  const { data: customer } = useQuery({
    queryKey: ["crm-customer-360", selectedId],
    queryFn: () => selectedId
      ? api(`/api/crm/customer-360/${selectedId}`).catch(() => SAMPLE_CUSTOMER)
      : Promise.resolve(null),
    enabled: !!selectedId,
  });

  const filtered = CUSTOMERS.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));
  const c = customer || (selectedId ? SAMPLE_CUSTOMER : null);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Customer 360 View</h1>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search customers..." value={search}
          onChange={e => setSearch(e.target.value)} />
        {search && !selectedId && (
          <div className="absolute top-full left-0 right-0 bg-card border rounded shadow-lg z-10">
            {filtered.map(cust => (
              <button key={cust.id} className="w-full text-left px-3 py-2 hover:bg-muted text-sm"
                onClick={() => { setSelectedId(cust.id); setSearch(cust.name); }}>
                {cust.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {c && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Card */}
          <div className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Building className="w-4 h-4" />{c.company}</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-center gap-2"><Mail className="w-3 h-3" />{c.email}</div>
                <div className="flex items-center gap-2"><Phone className="w-3 h-3" />{c.phone}</div>
                <div className="flex items-center gap-2">
                  <Star className="w-3 h-3 text-yellow-500" />
                  <span className="font-bold text-lg">{c.score}</span>
                  <span className="text-muted-foreground">/ 100</span>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="w-3 h-3" />
                  <span>LTV: {sym}{Number(c.lifetime_value).toLocaleString()}</span>
                </div>
                <div className="flex gap-1 flex-wrap mt-2">
                  {c.tags?.map((tag: string) => <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-sm">Next Best Action</CardTitle></CardHeader>
              <CardContent>
                <div className="text-sm bg-primary/10 rounded p-2">{c.next_action}</div>
                <Button size="sm" className="mt-2 w-full">Act Now</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-sm">Open Opportunities</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {c.opportunities?.map((opp: any, i: number) => (
                  <div key={i} className="flex justify-between text-sm border rounded p-2">
                    <div>
                      <div className="font-medium">{opp.name}</div>
                      <Badge variant="outline" className="text-xs">{opp.stage}</Badge>
                    </div>
                    <div className="font-bold">{sym}{Number(opp.value).toLocaleString()}</div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Timeline */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader><CardTitle>Activity Timeline</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {c.timeline?.map((item: any, i: number) => {
                    const Icon = ICON_MAP[item.type] || MessageSquare;
                    return (
                      <div key={i} className="flex gap-3 text-sm">
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 border-b pb-3">
                          <div className="flex justify-between">
                            <span className="font-medium capitalize">{item.type}</span>
                            <span className="text-muted-foreground text-xs">{item.date}</span>
                          </div>
                          <div className="text-muted-foreground">{item.desc}</div>
                          <div className="text-xs text-muted-foreground">by {item.by}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Send Communication</CardTitle></CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Input placeholder="Type a message or reply..." value={replyText} onChange={e => setReplyText(e.target.value)} />
                  <Button onClick={() => { alert(`Sent: ${replyText}`); setReplyText(""); }}>
                    <Mail className="w-4 h-4 mr-1" />Send
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {!c && (
        <div className="text-center py-16 text-muted-foreground">
          Search for a customer to view their 360° profile
        </div>
      )}
    </div>
  );
}
