import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  RefreshCw, Loader2, CreditCard, TrendingUp, TrendingDown,
  ArrowLeftRight, Search, ChevronDown, ChevronUp, RotateCcw,
  ArrowUpRight, CheckCircle2, Clock,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import SuperAdminLayout from "./super-admin-layout";

interface SubRow {
  subscription: {
    id: number;
    tenantId: number;
    planId: number;
    planSlug: string;
    billingCycle: string;
    status: string;
    startedAt: string | null;
    currentPeriodEnd: string | null;
    cancelledAt: string | null;
    notes: string | null;
  };
  tenant: {
    id: number;
    name: string;
    slug: string;
    status: string;
  } | null;
  plan: {
    id: number;
    name: string;
    slug: string;
    priceMonthly: number;
    priceYearly: number;
  } | null;
}

interface BillingEvent {
  id: number;
  tenantId: number;
  eventType: string;
  fromPlan: string | null;
  toPlan: string | null;
  billingCycle: string | null;
  amount: number | null;
  notes: string | null;
  createdAt: string;
  createdBy: string | null;
}

interface PlansData {
  plans: { id: number; name: string; slug: string }[];
}

interface UpgradeRequestRow {
  event: {
    id: number;
    fromPlan: string | null;
    toPlan: string | null;
    billingCycle: string | null;
    notes: string | null;
    createdAt: string;
    createdBy: string | null;
  };
  tenant: { id: number; name: string; slug: string; status: string; plan: string } | null;
}

const PLAN_ORDER = ["trial", "basic", "professional", "enterprise"];

function paiseToRupees(paise: number) {
  return (paise / 100).toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
}

function planBadge(slug: string) {
  const colors: Record<string, string> = {
    trial: "border-amber-400 text-amber-700 dark:text-amber-300",
    basic: "border-blue-400 text-blue-700 dark:text-blue-300",
    professional: "border-violet-500 text-violet-700 dark:text-violet-300",
    enterprise: "border-emerald-500 text-emerald-700 dark:text-emerald-300",
  };
  return (
    <Badge variant="outline" className={`capitalize text-xs ${colors[slug] ?? ""}`}>{slug}</Badge>
  );
}

function eventIcon(type: string) {
  if (type === "upgraded") return <TrendingUp className="h-3.5 w-3.5 text-green-600" />;
  if (type === "downgraded") return <TrendingDown className="h-3.5 w-3.5 text-red-500" />;
  return <ArrowLeftRight className="h-3.5 w-3.5 text-muted-foreground" />;
}

export default function SuperAdminBilling() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [changePlanFor, setChangePlanFor] = useState<SubRow | null>(null);
  const [newPlan, setNewPlan] = useState("");
  const [newCycle, setNewCycle] = useState("monthly");
  const [newNotes, setNewNotes] = useState("");
  const [expandedTenant, setExpandedTenant] = useState<number | null>(null);

  const { data: rows = [], isLoading, refetch } = useQuery<SubRow[]>({
    queryKey: ["/api/admin/subscriptions"],
  });

  const { data: plansData } = useQuery<PlansData>({
    queryKey: ["/api/admin/subscription-plans"],
  });

  const { data: billingEvents = [] } = useQuery<BillingEvent[]>({
    queryKey: ["/api/admin/billing-events", expandedTenant],
    queryFn: async () => {
      if (expandedTenant === null) return [];
      const res = await fetch(`/api/admin/billing-events/${expandedTenant}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch billing events");
      return res.json();
    },
    enabled: expandedTenant !== null,
  });

  const { data: upgradeRequests = [], refetch: refetchUpgradeRequests } = useQuery<UpgradeRequestRow[]>({
    queryKey: ["/api/admin/upgrade-requests"],
  });

  const approveUpgradeMutation = useMutation({
    mutationFn: async ({ tenantId, toPlan, billingCycle }: { tenantId: number; toPlan: string; billingCycle: string }) => {
      const res = await apiRequest("PATCH", `/api/admin/subscriptions/${tenantId}/change-plan`, {
        toPlan, billingCycle, notes: "Approved by super-admin",
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/subscriptions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/upgrade-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tenants"] });
      toast({ title: "Upgrade approved successfully" });
    },
    onError: (err: any) => toast({ title: "Failed to approve", description: err.message, variant: "destructive" }),
  });

  const changePlanMutation = useMutation({
    mutationFn: async ({ tenantId, toPlan, billingCycle, notes }: { tenantId: number; toPlan: string; billingCycle: string; notes: string }) => {
      const res = await apiRequest("PATCH", `/api/admin/subscriptions/${tenantId}/change-plan`, { toPlan, billingCycle, notes });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/subscriptions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tenants"] });
      toast({ title: "Plan changed successfully" });
      setChangePlanFor(null);
      setNewPlan("");
      setNewNotes("");
    },
    onError: (err: any) => toast({ title: "Failed", description: err.message, variant: "destructive" }),
  });

  const openChangePlan = (row: SubRow) => {
    setChangePlanFor(row);
    setNewPlan(row.subscription.planSlug);
    setNewCycle(row.subscription.billingCycle === "yearly" ? "yearly" : "monthly");
    setNewNotes("");
  };

  const filtered = rows.filter((r) => {
    const q = search.toLowerCase();
    return (
      r.tenant?.name?.toLowerCase().includes(q) ||
      r.tenant?.slug?.toLowerCase().includes(q) ||
      r.subscription.planSlug.includes(q)
    );
  });

  const availablePlans = plansData?.plans ?? [];

  return (
    <SuperAdminLayout
      title="Billing & Subscriptions"
      subtitle="View and manage all tenant subscriptions and billing history"
      actions={
        <Button variant="outline" size="default" onClick={() => refetch()} data-testid="button-refresh-billing">
          <RefreshCw className="h-4 w-4 mr-2" /> Refresh
        </Button>
      }
    >
      {/* ── Upgrade Requests Section ── */}
      {upgradeRequests.length > 0 && (
        <Card className="mb-6 border-amber-300 dark:border-amber-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <ArrowUpRight className="h-4 w-4 text-amber-600" />
              Pending Upgrade Requests
              <Badge variant="outline" className="border-amber-400 text-amber-700 dark:text-amber-300 text-xs ml-1">{upgradeRequests.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {upgradeRequests.map((row) => (
              <div
                key={row.event.id}
                className="flex flex-wrap items-center gap-3 rounded-md border px-3 py-2 bg-muted/30"
                data-testid={`upgrade-request-${row.event.id}`}
              >
                <Clock className="h-4 w-4 text-amber-600 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {row.tenant?.name ?? `Tenant #${row.event.id}`}
                    <span className="text-muted-foreground font-normal ml-1">({row.tenant?.slug})</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Current: <span className="capitalize">{row.tenant?.plan ?? row.event.fromPlan ?? "—"}</span>
                    {" → "}
                    Requested: <span className="capitalize font-medium">{row.event.toPlan ?? "—"}</span>
                    {row.event.billingCycle && <span className="ml-2">({row.event.billingCycle})</span>}
                    {row.event.notes && <span className="ml-2">· {row.event.notes}</span>}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Submitted {row.event.createdAt ? format(new Date(row.event.createdAt), "dd MMM yyyy, h:mm a") : "—"}
                    {row.event.createdBy && <span> by {row.event.createdBy}</span>}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="default"
                  disabled={approveUpgradeMutation.isPending || !row.tenant}
                  onClick={() => row.tenant && approveUpgradeMutation.mutate({
                    tenantId: row.tenant.id,
                    toPlan: row.event.toPlan ?? "basic",
                    billingCycle: row.event.billingCycle ?? "monthly",
                  })}
                  data-testid={`button-approve-upgrade-${row.event.id}`}
                >
                  {approveUpgradeMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5 mr-1" />}
                  Approve
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* ── Search ── */}
      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search by tenant or plan…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          data-testid="input-billing-search"
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">No subscriptions found</div>
      ) : (
        <div className="space-y-3">
          {filtered.map((row) => {
            const sub = row.subscription;
            const tenant = row.tenant;
            const plan = row.plan;
            const isExpanded = expandedTenant === tenant?.id;

            return (
              <Card key={sub.id} data-testid={`billing-row-${sub.id}`}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex flex-wrap items-start gap-3 justify-between">
                    {/* Tenant + plan info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm">{tenant?.name ?? `Tenant #${sub.tenantId}`}</p>
                        <span className="text-muted-foreground text-xs">{tenant?.slug}</span>
                        {planBadge(sub.planSlug)}
                        <Badge variant={sub.status === "active" ? "default" : "secondary"} className="text-xs capitalize">
                          {sub.status}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-xs text-muted-foreground">
                        <span>Cycle: <span className="text-foreground capitalize">{sub.billingCycle}</span></span>
                        {plan && (
                          <span>
                            Price:{" "}
                            <span className="text-foreground">
                              {sub.billingCycle === "yearly"
                                ? `${paiseToRupees(plan.priceYearly)}/yr`
                                : `${paiseToRupees(plan.priceMonthly)}/mo`}
                            </span>
                          </span>
                        )}
                        {sub.startedAt && (
                          <span>Started: <span className="text-foreground">{format(new Date(sub.startedAt), "dd MMM yyyy")}</span></span>
                        )}
                        {sub.currentPeriodEnd && (
                          <span>Renews: <span className="text-foreground">{format(new Date(sub.currentPeriodEnd), "dd MMM yyyy")}</span></span>
                        )}
                      </div>
                      {sub.notes && <p className="text-xs text-muted-foreground mt-1 italic">Note: {sub.notes}</p>}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0 flex-wrap">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openChangePlan(row)}
                        data-testid={`button-change-plan-${sub.id}`}
                      >
                        <ArrowLeftRight className="h-3.5 w-3.5 mr-1.5" /> Change Plan
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setExpandedTenant(isExpanded ? null : (tenant?.id ?? null));
                        }}
                        data-testid={`button-history-${sub.id}`}
                      >
                        {isExpanded ? <ChevronUp className="h-3.5 w-3.5 mr-1.5" /> : <ChevronDown className="h-3.5 w-3.5 mr-1.5" />}
                        History
                      </Button>
                    </div>
                  </div>

                  {/* Expanded billing history */}
                  {isExpanded && (
                    <>
                      <Separator className="my-3" />
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Billing Event History</p>
                        {billingEvents.length === 0 ? (
                          <p className="text-xs text-muted-foreground">No billing events recorded</p>
                        ) : (
                          billingEvents.map((ev) => (
                            <div key={ev.id} className="flex items-start gap-2.5 text-xs" data-testid={`billing-event-${ev.id}`}>
                              {eventIcon(ev.eventType)}
                              <div className="flex-1 min-w-0">
                                <span className="font-medium capitalize">{ev.eventType.replace(/_/g, " ")}</span>
                                {ev.fromPlan && ev.toPlan && ev.fromPlan !== ev.toPlan && (
                                  <span className="text-muted-foreground ml-1">{ev.fromPlan} → {ev.toPlan}</span>
                                )}
                                {ev.notes && <span className="text-muted-foreground ml-1">· {ev.notes}</span>}
                              </div>
                              {ev.amount != null && ev.amount > 0 && (
                                <span className="shrink-0 font-medium">{paiseToRupees(ev.amount)}</span>
                              )}
                              <span className="shrink-0 text-muted-foreground">{format(new Date(ev.createdAt), "dd MMM yy")}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── Change Plan Dialog ── */}
      <Dialog open={!!changePlanFor} onOpenChange={(open) => !open && setChangePlanFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Plan — {changePlanFor?.tenant?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>New Plan</Label>
              <Select value={newPlan} onValueChange={setNewPlan}>
                <SelectTrigger data-testid="select-new-plan">
                  <SelectValue placeholder="Select plan…" />
                </SelectTrigger>
                <SelectContent>
                  {PLAN_ORDER.map((slug) => {
                    const p = availablePlans.find((ap) => ap.slug === slug);
                    return (
                      <SelectItem key={slug} value={slug}>
                        {p?.name ?? slug}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            {newPlan !== "trial" && (
              <div className="space-y-1.5">
                <Label>Billing Cycle</Label>
                <Select value={newCycle} onValueChange={setNewCycle}>
                  <SelectTrigger data-testid="select-billing-cycle">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="yearly">Yearly (annual)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Notes (optional)</Label>
              <Input
                placeholder="e.g. Sales deal, manual upgrade, promo…"
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                data-testid="input-plan-notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChangePlanFor(null)}>Cancel</Button>
            <Button
              onClick={() => {
                if (!changePlanFor) return;
                changePlanMutation.mutate({
                  tenantId: changePlanFor.subscription.tenantId,
                  toPlan: newPlan,
                  billingCycle: newPlan === "trial" ? "trial" : newCycle,
                  notes: newNotes,
                });
              }}
              disabled={!newPlan || changePlanMutation.isPending}
              data-testid="button-confirm-plan-change"
            >
              {changePlanMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CreditCard className="h-4 w-4 mr-2" />}
              Confirm Change
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SuperAdminLayout>
  );
}
