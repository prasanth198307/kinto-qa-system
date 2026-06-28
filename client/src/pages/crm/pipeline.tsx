import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

const api = (m: string, u: string, b?: any) =>
  fetch(u, { method: m, headers: { "Content-Type": "application/json" }, body: b ? JSON.stringify(b) : undefined, credentials: "include" }).then(r => r.json());
const fmt = (n: any) => Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

const STAGES = ["new","contacted","qualified","proposal","negotiation","won","lost"];

export default function CRMPipelinePage() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: leads = [] } = useQuery({ queryKey: ["/api/crm/leads"], queryFn: () => api("GET", "/api/crm/leads") });

  const moveMutation = useMutation({
    mutationFn: ({ id, stage }: any) => api("POST", `/api/crm/leads/${id}/stage`, { stage }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/crm/leads"] }); toast({ title: "Lead moved" }); },
  });

  const byStage = (stage: string) => leads.filter((l: any) => (l.stage || l.status) === stage);
  const wonLeads = byStage("won");
  const totalValue = leads.reduce((s: number, l: any) => s + Number(l.value || l.deal_value || 0), 0);
  const wonValue = wonLeads.reduce((s: number, l: any) => s + Number(l.value || l.deal_value || 0), 0);
  const winRate = leads.length > 0 ? ((wonLeads.length / leads.length) * 100).toFixed(1) : "0";

  const stageColor: Record<string,string> = { new:"secondary", contacted:"outline", qualified:"outline", proposal:"default", negotiation:"default", won:"default", lost:"destructive" };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Sales Pipeline</h1>

      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{leads.length}</div><div className="text-sm text-muted-foreground">Total Deals</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold">₹{fmt(totalValue)}</div><div className="text-sm text-muted-foreground">Pipeline Value</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{winRate}%</div><div className="text-sm text-muted-foreground">Win Rate</div></CardContent></Card>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {STAGES.map(stage => (
          <div key={stage} className="min-w-[200px] space-y-2">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold capitalize text-sm">{stage}</h3>
              <Badge variant="outline">{byStage(stage).length}</Badge>
            </div>
            {byStage(stage).map((lead: any) => {
              const nextStage = STAGES[STAGES.indexOf(stage) + 1];
              return (
                <Card key={lead.id} className="p-3">
                  <div className="font-medium text-sm">{lead.lead_name || lead.name}</div>
                  <div className="text-xs text-muted-foreground">{lead.company}</div>
                  <div className="text-xs">₹{fmt(lead.value || lead.deal_value)}</div>
                  <div className="text-xs text-muted-foreground">{lead.assigned_to}</div>
                  {nextStage && stage !== "won" && stage !== "lost" && (
                    <Button size="sm" variant="outline" className="mt-2 w-full text-xs h-6" onClick={() => moveMutation.mutate({ id: lead.id, stage: nextStage })}>
                      Move to {nextStage}
                    </Button>
                  )}
                </Card>
              );
            })}
            {byStage(stage).length === 0 && <div className="text-xs text-muted-foreground text-center py-4 border rounded">Empty</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
