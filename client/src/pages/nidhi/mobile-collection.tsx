import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { MapPin, Wallet, CheckCircle, Phone, User, IndianRupee } from "lucide-react";

const api = (m: string, p: string, b?: any) =>
  fetch(p, { method: m, headers: { "Content-Type": "application/json" }, body: b ? JSON.stringify(b) : undefined }).then((r) => r.json());

const fmt = (n: any) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
const today = new Date().toISOString().slice(0, 10);

export default function NidhiMobileCollectionPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [agentName, setAgentName] = useState("");
  const [agentSet, setAgentSet] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [collectOpen, setCollectOpen] = useState(false);
  const [cForm, setCForm] = useState({ principal_component: "", interest_component: "", penalty_amount: "0", payment_mode: "cash", receipt_number: "", collected_by: "" });

  const { data: dueList = [], refetch } = useQuery<any[]>({
    queryKey: ["nidhi-mobile-due", today],
    queryFn: () => api("GET", `/api/nidhi/mobile-collection/due?date=${today}`),
    enabled: agentSet,
  });
  const { data: summary } = useQuery<any>({
    queryKey: ["nidhi-mobile-summary", today, agentName],
    queryFn: () => api("GET", `/api/nidhi/mobile-collection/summary?date=${today}&agent_name=${encodeURIComponent(agentName)}`),
    enabled: agentSet,
    refetchInterval: 5000,
  });

  const collectMut = useMutation({
    mutationFn: (p: any) => api("POST", "/api/nidhi/mobile-collection/collect", p),
    onSuccess: (d: any) => {
      refetch();
      qc.invalidateQueries({ queryKey: ["nidhi-mobile-summary"] });
      setCollectOpen(false);
      toast({ title: `✓ Collected! Outstanding: ${fmt(d.outstanding_after)}`, description: d.loan_status === "closed" ? "Loan fully closed!" : undefined });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const openCollect = (loan: any) => {
    const rate = Number(loan.interest_rate) / 12 / 100;
    const interest = Math.round(Number(loan.outstanding_principal) * rate * 100) / 100;
    const principal = Math.round((Number(loan.emi_amount) - interest) * 100) / 100;
    setSelected(loan);
    setCForm({ principal_component: String(Math.max(0, principal)), interest_component: String(interest), penalty_amount: "0", payment_mode: "cash", receipt_number: `RCT-${Date.now()}`, collected_by: agentName });
    setCollectOpen(true);
  };

  if (!agentSet) {
    return (
      <div className="p-6 max-w-sm mx-auto mt-12 space-y-4">
        <div className="text-center mb-6">
          <Wallet className="w-12 h-12 text-blue-600 mx-auto mb-2" />
          <h1 className="text-2xl font-bold">Field Collection</h1>
          <p className="text-muted-foreground text-sm">Mobile agent collection app</p>
        </div>
        <div><Label>Agent Name / ID</Label><Input value={agentName} onChange={e => setAgentName(e.target.value)} placeholder="Enter your name" className="mt-1" /></div>
        <Button className="w-full" disabled={!agentName.trim()} onClick={() => setAgentSet(true)}>Start Collection Day</Button>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-lg mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Collection — {today}</h1>
          <div className="flex items-center gap-1 text-sm text-muted-foreground"><User className="w-3 h-3" />{agentName}</div>
        </div>
        <Button variant="outline" size="sm" onClick={() => setAgentSet(false)}>Change Agent</Button>
      </div>

      {summary && (
        <div className="grid grid-cols-3 gap-3">
          <Card className="bg-green-50 border-green-200"><CardContent className="p-3 text-center">
            <div className="text-lg font-bold text-green-700">{fmt(summary.total_collected)}</div>
            <div className="text-xs text-green-600">Collected</div>
          </CardContent></Card>
          <Card><CardContent className="p-3 text-center">
            <div className="text-lg font-bold">{summary.collections}</div>
            <div className="text-xs text-muted-foreground">Collections</div>
          </CardContent></Card>
          <Card><CardContent className="p-3 text-center">
            <div className="text-lg font-bold">{summary.members_visited}</div>
            <div className="text-xs text-muted-foreground">Members Visited</div>
          </CardContent></Card>
        </div>
      )}

      <div className="font-semibold text-sm text-muted-foreground">{dueList.length} loans due today</div>

      <div className="space-y-3">
        {dueList.map((loan: any) => {
          const isOverdue = new Date(loan.next_emi_date) < new Date();
          return (
            <Card key={loan.loan_id} className={isOverdue ? "border-red-200 bg-red-50" : ""}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="font-semibold">{loan.member_name}</div>
                    <div className="text-xs text-muted-foreground font-mono">{loan.member_number} · {loan.loan_number}</div>
                  </div>
                  {isOverdue ? <Badge variant="destructive">Overdue</Badge> : <Badge variant="outline">Due Today</Badge>}
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                  <div><span className="text-muted-foreground">EMI: </span><strong>{fmt(loan.emi_amount)}</strong></div>
                  <div><span className="text-muted-foreground">Outstanding: </span><strong>{fmt(loan.outstanding_principal)}</strong></div>
                  <div className="flex items-center gap-1"><Phone className="w-3 h-3 text-muted-foreground" /><a href={`tel:${loan.phone}`} className="text-blue-600">{loan.phone}</a></div>
                  <div className="flex items-center gap-1"><MapPin className="w-3 h-3 text-muted-foreground" /><span className="truncate text-xs">{loan.address || "No address"}</span></div>
                </div>
                <Button className="w-full" size="sm" onClick={() => openCollect(loan)}>
                  <IndianRupee className="w-3 h-3 mr-1" />Collect EMI
                </Button>
              </CardContent>
            </Card>
          );
        })}

        {!dueList.length && (
          <div className="text-center py-12 text-muted-foreground">
            <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-500" />
            <div className="font-medium">All collections done!</div>
          </div>
        )}
      </div>

      <Dialog open={collectOpen} onOpenChange={setCollectOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Collect EMI</DialogTitle></DialogHeader>
          <div className="text-sm bg-muted rounded p-3 mb-3">
            <div><strong>{selected?.member_name}</strong></div>
            <div>{selected?.loan_number} · Due: {selected?.next_emi_date}</div>
          </div>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs">Principal (₹)</Label><Input type="number" value={cForm.principal_component} onChange={e => setCForm(p => ({ ...p, principal_component: e.target.value }))} className="h-8 text-sm" /></div>
              <div><Label className="text-xs">Interest (₹)</Label><Input type="number" value={cForm.interest_component} onChange={e => setCForm(p => ({ ...p, interest_component: e.target.value }))} className="h-8 text-sm" /></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs">Penalty (₹)</Label><Input type="number" value={cForm.penalty_amount} onChange={e => setCForm(p => ({ ...p, penalty_amount: e.target.value }))} className="h-8 text-sm" /></div>
              <div><Label className="text-xs">Mode</Label>
                <Select value={cForm.payment_mode} onValueChange={v => setCForm(p => ({ ...p, payment_mode: v }))}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>{["cash","upi","cheque"].map(m => <SelectItem key={m} value={m}>{m.toUpperCase()}</SelectItem>)}</SelectContent>
                </Select></div>
            </div>
            <div><Label className="text-xs">Receipt No.</Label><Input value={cForm.receipt_number} onChange={e => setCForm(p => ({ ...p, receipt_number: e.target.value }))} className="h-8 text-sm" /></div>
            <div className="bg-muted rounded p-2 text-sm">
              Total: <strong>{fmt(Number(cForm.principal_component || 0) + Number(cForm.interest_component || 0) + Number(cForm.penalty_amount || 0))}</strong>
            </div>
          </div>
          <div className="flex gap-2 justify-end mt-2">
            <Button variant="outline" onClick={() => setCollectOpen(false)}>Cancel</Button>
            <Button onClick={() => collectMut.mutate({ loan_id: selected.loan_id, ...cForm, collected_by: agentName })} disabled={collectMut.isPending}>
              {collectMut.isPending ? "Posting..." : "Collect + GL"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
