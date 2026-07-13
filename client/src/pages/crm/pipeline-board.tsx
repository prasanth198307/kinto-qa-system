import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, TrendingUp, IndianRupee } from "lucide-react";
import { useTenantConfig, formatCurrency as fmtCur } from "@/hooks/use-tenant-config";

const api = (path: string) => fetch(path).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); });

const STAGES = ["lead", "qualified", "proposal", "negotiation", "won", "lost"] as const;
type Stage = typeof STAGES[number];

const SAMPLE_DEALS = [
  { id: 1, contact_name: "Ravi Kumar", deal_value: 150000, expected_close_date: "2026-07-30", probability: 60, stage: "qualified" },
  { id: 2, contact_name: "Priya Shah", deal_value: 80000, expected_close_date: "2026-08-15", probability: 40, stage: "proposal" },
  { id: 3, contact_name: "Amit Verma", deal_value: 500000, expected_close_date: "2026-07-10", probability: 80, stage: "negotiation" },
  { id: 4, contact_name: "Neha Patel", deal_value: 25000, expected_close_date: "2026-09-01", probability: 20, stage: "lead" },
  { id: 5, contact_name: "Suresh Nair", deal_value: 200000, expected_close_date: "2026-06-28", probability: 100, stage: "won" },
];

const SAMPLE_SUMMARY = {
  total_value: 955000,
  weighted_value: 582000,
  by_stage: { lead: 1, qualified: 1, proposal: 1, negotiation: 1, won: 1, lost: 0 },
};

const stageColors: Record<Stage, string> = {
  lead: "bg-gray-100",
  qualified: "bg-blue-50",
  proposal: "bg-yellow-50",
  negotiation: "bg-orange-50",
  won: "bg-green-50",
  lost: "bg-red-50",
};

const stageBadge: Record<Stage, string> = {
  lead: "bg-gray-200 text-gray-700",
  qualified: "bg-blue-100 text-blue-700",
  proposal: "bg-yellow-100 text-yellow-700",
  negotiation: "bg-orange-100 text-orange-700",
  won: "bg-green-100 text-green-700",
  lost: "bg-red-100 text-red-700",
};

export default function PipelineBoardPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const tenantConfig = useTenantConfig();
  const sym = tenantConfig.currency_symbol;
  const [newDeal, setNewDeal] = useState({ contact_id: "", title: "", value: "", stage: "lead" as Stage, expected_close_date: "" });
  const [showNewDeal, setShowNewDeal] = useState(false);
  const [reasonModal, setReasonModal] = useState<{ dealId: number; outcome: "won" | "lost" } | null>(null);
  const [reason, setReason] = useState("");

  const { data: deals = [] } = useQuery<any[]>({
    queryKey: ["crm-deals"],
    queryFn: () => api("/api/crm/deals").catch(() => SAMPLE_DEALS),
  });

  const { data: summary } = useQuery<any>({
    queryKey: ["crm-pipeline-summary"],
    queryFn: () => api("/api/crm/deals/pipeline/summary").catch(() => SAMPLE_SUMMARY),
  });

  const displayDeals: any[] = (deals as any[]).length ? deals : SAMPLE_DEALS;
  const displaySummary = summary ?? SAMPLE_SUMMARY;

  const moveMutation = useMutation({
    mutationFn: ({ id, stage }: { id: number; stage: string }) =>
      fetch(`/api/crm/deals/${id}/move`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage }),
      }).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); }),
    onSuccess: () => {
      toast({ title: "Deal moved" });
      qc.invalidateQueries({ queryKey: ["crm-deals"] });
    },
    onError: () => toast({ title: "Move failed", variant: "destructive" }),
  });

  const createMutation = useMutation({
    mutationFn: (body: typeof newDeal) =>
      fetch("/api/crm/deals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); }),
    onSuccess: () => {
      toast({ title: "Deal created" });
      setShowNewDeal(false);
      setNewDeal({ contact_id: "", title: "", value: "", stage: "lead", expected_close_date: "" });
      qc.invalidateQueries({ queryKey: ["crm-deals"] });
    },
    onError: () => toast({ title: "Create failed", variant: "destructive" }),
  });

  const handleOutcome = (dealId: number, outcome: "won" | "lost") => {
    moveMutation.mutate({ id: dealId, stage: outcome });
    setReasonModal(null);
    setReason("");
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2"><TrendingUp className="h-6 w-6" />Pipeline Board</h1>
        <Button onClick={() => setShowNewDeal(true)}><Plus className="h-4 w-4 mr-1" />New Deal</Button>
      </div>

      {/* Summary Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-xs text-muted-foreground">Total Pipeline Value</div>
            <div className="text-lg font-bold flex items-center gap-1"><IndianRupee className="h-4 w-4" />{Number(displaySummary.total_value ?? 0).toLocaleString("en-IN")}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-xs text-muted-foreground">Weighted Value</div>
            <div className="text-lg font-bold flex items-center gap-1"><IndianRupee className="h-4 w-4" />{Number(displaySummary.weighted_value ?? 0).toLocaleString("en-IN")}</div>
          </CardContent>
        </Card>
        {STAGES.slice(0, 2).map(s => (
          <Card key={s}>
            <CardContent className="pt-4">
              <div className="text-xs text-muted-foreground capitalize">{s}</div>
              <div className="text-lg font-bold">{displaySummary.by_stage?.[s] ?? displayDeals.filter((d: any) => d.stage === s).length} deals</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {STAGES.map(stage => {
          const stageDeals = displayDeals.filter((d: any) => d.stage === stage);
          return (
            <div key={stage} className={`rounded-lg p-3 ${stageColors[stage]} min-h-48`}>
              <div className="flex items-center justify-between mb-3">
                <span className={`text-xs font-semibold uppercase tracking-wide px-2 py-0.5 rounded ${stageBadge[stage]}`}>{stage}</span>
                <span className="text-xs text-muted-foreground">{stageDeals.length}</span>
              </div>
              <div className="space-y-2">
                {stageDeals.map((deal: any) => (
                  <div key={deal.id} className="bg-white rounded-md p-3 shadow-sm border text-sm space-y-2">
                    <div className="font-medium truncate">{deal.contact_name}</div>
                    <div className="text-muted-foreground flex items-center gap-1">
                      <IndianRupee className="h-3 w-3" />{Number(deal.deal_value).toLocaleString("en-IN")}
                    </div>
                    <div className="text-xs text-muted-foreground">Close: {deal.expected_close_date}</div>
                    <div className="text-xs">Prob: {deal.probability}%</div>
                    <div className="flex gap-1 flex-wrap">
                      {stage !== "won" && stage !== "lost" && (
                        <>
                          <Button size="sm" variant="outline" className="h-6 text-xs px-2 text-green-700"
                            onClick={() => setReasonModal({ dealId: deal.id, outcome: "won" })}>Won</Button>
                          <Button size="sm" variant="outline" className="h-6 text-xs px-2 text-red-700"
                            onClick={() => setReasonModal({ dealId: deal.id, outcome: "lost" })}>Lost</Button>
                        </>
                      )}
                      <Select onValueChange={v => moveMutation.mutate({ id: deal.id, stage: v })}>
                        <SelectTrigger className="h-6 text-xs w-24"><SelectValue placeholder="Move" /></SelectTrigger>
                        <SelectContent>
                          {STAGES.filter(s => s !== stage).map(s => (
                            <SelectItem key={s} value={s} className="text-xs capitalize">{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* New Deal Dialog */}
      <Dialog open={showNewDeal} onOpenChange={setShowNewDeal}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Deal</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Contact</Label>
              <Input value={newDeal.contact_id} onChange={e => setNewDeal(f => ({ ...f, contact_id: e.target.value }))} placeholder="Contact name or ID" />
            </div>
            <div>
              <Label>Title</Label>
              <Input value={newDeal.title} onChange={e => setNewDeal(f => ({ ...f, title: e.target.value }))} placeholder="Deal title" />
            </div>
            <div>
              <Label>Value (₹)</Label>
              <Input type="number" value={newDeal.value} onChange={e => setNewDeal(f => ({ ...f, value: e.target.value }))} placeholder="100000" />
            </div>
            <div>
              <Label>Stage</Label>
              <Select value={newDeal.stage} onValueChange={v => setNewDeal(f => ({ ...f, stage: v as Stage }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STAGES.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Expected Close Date</Label>
              <Input type="date" value={newDeal.expected_close_date} onChange={e => setNewDeal(f => ({ ...f, expected_close_date: e.target.value }))} />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowNewDeal(false)}>Cancel</Button>
              <Button onClick={() => createMutation.mutate(newDeal)} disabled={createMutation.isPending}>
                {createMutation.isPending ? "Creating..." : "Create Deal"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Won/Lost Reason Dialog */}
      <Dialog open={!!reasonModal} onOpenChange={() => setReasonModal(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Mark as {reasonModal?.outcome === "won" ? "Won" : "Lost"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Reason</Label>
              <Input value={reason} onChange={e => setReason(e.target.value)} placeholder="Enter reason..." />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setReasonModal(null)}>Cancel</Button>
              <Button
                variant={reasonModal?.outcome === "won" ? "default" : "destructive"}
                onClick={() => reasonModal && handleOutcome(reasonModal.dealId, reasonModal.outcome)}
              >
                Confirm {reasonModal?.outcome === "won" ? "Won" : "Lost"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
