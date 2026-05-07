import { useState, type ReactNode } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ModuleMarketplaceDialog } from "@/components/module-marketplace-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  RefreshCw, Loader2, CreditCard, TrendingUp, TrendingDown,
  ArrowLeftRight, Search, ChevronDown, ChevronUp,
  ArrowUpRight, CheckCircle2, Clock, Package, FileText, Printer,
  IndianRupee,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import SuperAdminLayout from "./super-admin-layout";

// ─── Types ────────────────────────────────────────────────────────────────────

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

interface PlanRecord {
  id: number;
  name: string;
  slug: string;
  isActive: boolean;
  displayOrder: number;
  priceMonthly: number;
  priceYearly: number;
}

interface PlansData {
  plans: PlanRecord[];
}

interface SubscriptionInvoice {
  invoiceNo: string;
  invoiceDate: string;
  periodStart: string | null;
  periodEnd: string | null;
  tenant: {
    id: number; name: string; slug: string;
    gst: string | null; address: string | null;
    email: string | null; contact: string | null; phone: string | null;
  };
  plan: {
    name: string; slug: string; billingCycle: string; priceRupees: number;
  };
  addonModules: { slug: string; name: string; priceRupees: number }[];
  subtotal: number;
  gstRate: number;
  gstAmount: number;
  grandTotal: number;
  currency: string;
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function paiseToRupees(paise: number) {
  return (paise / 100).toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
}

function planBadge(slug: string, planName?: string) {
  const colors: Record<string, string> = {
    trial:        "border-amber-400 text-amber-700 dark:text-amber-300",
    basic:        "border-blue-400 text-blue-700 dark:text-blue-300",
    professional: "border-violet-500 text-violet-700 dark:text-violet-300",
    enterprise:   "border-emerald-500 text-emerald-700 dark:text-emerald-300",
  };
  return (
    <Badge variant="outline" className={`capitalize text-xs ${colors[slug] ?? "border-muted-foreground text-muted-foreground"}`}>
      {planName ?? slug}
    </Badge>
  );
}

function eventIcon(type: string): ReactNode {
  if (type === "upgraded")        return <TrendingUp className="h-3.5 w-3.5 text-green-600" />;
  if (type === "downgraded")      return <TrendingDown className="h-3.5 w-3.5 text-red-500" />;
  if (type === "modules_updated") return <Package className="h-3.5 w-3.5 text-blue-500" />;
  return <ArrowLeftRight className="h-3.5 w-3.5 text-muted-foreground" />;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SuperAdminBilling() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [changePlanFor, setChangePlanFor] = useState<SubRow | null>(null);
  const [modulesTenant, setModulesTenant] = useState<{ id: number; name: string } | null>(null);
  const [newPlan, setNewPlan] = useState("");
  const [newCycle, setNewCycle] = useState("monthly");
  const [newNotes, setNewNotes] = useState("");
  const [alsoManageModules, setAlsoManageModules] = useState(false);
  const [expandedTenant, setExpandedTenant] = useState<number | null>(null);
  const [invoiceTenantId, setInvoiceTenantId] = useState<number | null>(null);

  const { data: rows = [], isLoading, refetch } = useQuery<SubRow[]>({
    queryKey: ["/api/admin/subscriptions"],
  });

  const { data: invoiceData, isLoading: invoiceLoading } = useQuery<SubscriptionInvoice>({
    queryKey: ["/api/admin/tenants", invoiceTenantId, "subscription-invoice"],
    queryFn: async () => {
      const res = await fetch(`/api/admin/tenants/${invoiceTenantId}/subscription-invoice`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load invoice");
      return res.json();
    },
    enabled: invoiceTenantId !== null,
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

  const { data: upgradeRequests = [] } = useQuery<UpgradeRequestRow[]>({
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
    mutationFn: async ({ tenantId, toPlan, billingCycle, notes }: {
      tenantId: number; toPlan: string; billingCycle: string; notes: string;
    }) => {
      const res = await apiRequest("PATCH", `/api/admin/subscriptions/${tenantId}/change-plan`, { toPlan, billingCycle, notes });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/subscriptions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tenants"] });
      toast({ title: "Plan changed successfully" });
      const tenantForModules = changePlanFor?.tenant
        ? { id: changePlanFor.tenant.id, name: changePlanFor.tenant.name }
        : null;
      setChangePlanFor(null);
      setNewPlan("");
      setNewNotes("");
      if (alsoManageModules && tenantForModules) {
        setModulesTenant(tenantForModules);
      }
      setAlsoManageModules(false);
    },
    onError: (err: any) => toast({ title: "Failed", description: err.message, variant: "destructive" }),
  });

  const openChangePlan = (row: SubRow) => {
    setChangePlanFor(row);
    setNewPlan(row.subscription.planSlug);
    setNewCycle(row.subscription.billingCycle === "yearly" ? "yearly" : "monthly");
    setNewNotes("");
    setAlsoManageModules(false);
  };

  const filtered = rows.filter((r) => {
    const q = search.toLowerCase();
    return (
      r.tenant?.name?.toLowerCase().includes(q) ||
      r.tenant?.slug?.toLowerCase().includes(q) ||
      r.subscription.planSlug.includes(q)
    );
  });

  // Plans fetched from DB sorted by displayOrder — fully dynamic, no hardcoded list
  const availablePlans: PlanRecord[] = plansData?.plans ?? [];
  const selectedPlan = availablePlans.find(p => p.slug === newPlan);
  const isTrial = selectedPlan?.slug === "trial";

  return (
    <SuperAdminLayout
      title="Billing & Subscriptions"
      subtitle="View and manage all tenant subscriptions, plans, and modules"
      actions={
        <Button variant="outline" size="default" onClick={() => refetch()} data-testid="button-refresh-billing">
          <RefreshCw className="h-4 w-4 mr-2" /> Refresh
        </Button>
      }
    >
      {/* ── Upgrade Requests ── */}
      {upgradeRequests.length > 0 && (
        <Card className="mb-6 border-amber-300 dark:border-amber-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <ArrowUpRight className="h-4 w-4 text-amber-600" />
              Pending Upgrade Requests
              <Badge variant="outline" className="border-amber-400 text-amber-700 dark:text-amber-300 text-xs ml-1">
                {upgradeRequests.length}
              </Badge>
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
                  {approveUpgradeMutation.isPending
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <CheckCircle2 className="h-3.5 w-3.5 mr-1" />}
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

      {/* ── Subscription Rows ── */}
      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">No subscriptions found</div>
      ) : (
        <div className="space-y-3">
          {filtered.map((row) => {
            const sub      = row.subscription;
            const tenant   = row.tenant;
            const plan     = row.plan;
            const planName = availablePlans.find(p => p.slug === sub.planSlug)?.name ?? sub.planSlug;
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
                        {planBadge(sub.planSlug, planName)}
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
                        variant="outline"
                        onClick={() => tenant && setModulesTenant({ id: tenant.id, name: tenant.name })}
                        data-testid={`button-manage-modules-${sub.id}`}
                      >
                        <Package className="h-3.5 w-3.5 mr-1.5" /> Modules
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => tenant && setInvoiceTenantId(tenant.id)}
                        data-testid={`button-invoice-${sub.id}`}
                      >
                        <FileText className="h-3.5 w-3.5 mr-1.5" /> Invoice
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setExpandedTenant(isExpanded ? null : (tenant?.id ?? null))}
                        data-testid={`button-history-${sub.id}`}
                      >
                        {isExpanded
                          ? <ChevronUp className="h-3.5 w-3.5 mr-1.5" />
                          : <ChevronDown className="h-3.5 w-3.5 mr-1.5" />}
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
                              <span className="shrink-0 text-muted-foreground">
                                {format(new Date(ev.createdAt), "dd MMM yy")}
                              </span>
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

      {/* ── Change Plan Dialog — fully DB-driven, no hardcoded plan list ── */}
      <Dialog open={!!changePlanFor} onOpenChange={(open) => !open && setChangePlanFor(null)}>
        <DialogContent className="max-w-md">
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
                  {availablePlans.map((p) => (
                    <SelectItem key={p.slug} value={p.slug} data-testid={`plan-option-${p.slug}`}>
                      <div className="flex items-center gap-2">
                        <span className="capitalize">{p.name}</span>
                        {p.priceMonthly > 0 && (
                          <span className="text-xs text-muted-foreground">
                            {paiseToRupees(p.priceMonthly)}/mo
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {!isTrial && newPlan && (
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

            {/* ── Module management option ── */}
            <div className="rounded-md border bg-muted/30 p-3 space-y-2.5">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="also-manage-modules"
                  checked={alsoManageModules}
                  onCheckedChange={(v) => setAlsoManageModules(!!v)}
                  data-testid="checkbox-also-manage-modules"
                  className="mt-0.5"
                />
                <div className="min-w-0">
                  <label htmlFor="also-manage-modules" className="text-sm font-medium cursor-pointer select-none">
                    Also manage add-on modules
                  </label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    After saving the plan, the Module Marketplace will open so you can add or remove individual modules.
                  </p>
                </div>
              </div>
              <div className="pl-7">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (!changePlanFor?.tenant) return;
                    setChangePlanFor(null);
                    setModulesTenant({ id: changePlanFor.tenant.id, name: changePlanFor.tenant.name });
                  }}
                  data-testid="button-open-marketplace-from-plan"
                >
                  <Package className="h-3.5 w-3.5 mr-1.5" />
                  Open Module Marketplace now
                </Button>
              </div>
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
                  billingCycle: isTrial ? "trial" : newCycle,
                  notes: newNotes,
                });
              }}
              disabled={!newPlan || changePlanMutation.isPending}
              data-testid="button-confirm-plan-change"
            >
              {changePlanMutation.isPending
                ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                : <CreditCard className="h-4 w-4 mr-2" />}
              Confirm Change
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Module Marketplace Dialog ── */}
      {modulesTenant && (
        <ModuleMarketplaceDialog
          tenantId={modulesTenant.id}
          tenantName={modulesTenant.name}
          open={!!modulesTenant}
          onClose={() => setModulesTenant(null)}
        />
      )}

      {/* ── Subscription Invoice Dialog ── */}
      <Dialog open={invoiceTenantId !== null} onOpenChange={(o) => { if (!o) setInvoiceTenantId(null); }}>
        <DialogContent
          className="max-w-2xl max-h-[90dvh] p-0"
          style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}
        >
          <DialogHeader className="px-6 pt-5 pb-3 border-b shrink-0">
            <DialogTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4 text-primary" />
              Subscription Invoice
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto">
            {invoiceLoading ? (
              <div className="flex items-center justify-center py-24">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : invoiceData ? (
              <div id="invoice-print-area" className="px-8 py-6 space-y-6 text-sm">

                {/* ── Header ── */}
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <p className="text-lg font-bold text-foreground">SwachERP</p>
                    <p className="text-xs text-muted-foreground">Inmoisture Pvt Ltd</p>
                    <p className="text-xs text-muted-foreground mt-1">GSTIN: 29AABCI1234F1ZX</p>
                  </div>
                  <div className="text-right">
                    <p className="text-base font-bold text-primary">{invoiceData.invoiceNo}</p>
                    <p className="text-xs text-muted-foreground">
                      Date: {format(new Date(invoiceData.invoiceDate), "dd MMM yyyy")}
                    </p>
                    {invoiceData.periodStart && invoiceData.periodEnd && (
                      <p className="text-xs text-muted-foreground">
                        Period: {format(new Date(invoiceData.periodStart), "dd MMM yyyy")} –{" "}
                        {format(new Date(invoiceData.periodEnd), "dd MMM yyyy")}
                      </p>
                    )}
                  </div>
                </div>

                <Separator />

                {/* ── Bill To ── */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Bill To</p>
                  <p className="font-semibold">{invoiceData.tenant.name}</p>
                  {invoiceData.tenant.contact && <p className="text-muted-foreground">{invoiceData.tenant.contact}</p>}
                  {invoiceData.tenant.address  && <p className="text-muted-foreground">{invoiceData.tenant.address}</p>}
                  {invoiceData.tenant.gst      && <p className="text-muted-foreground">GSTIN: {invoiceData.tenant.gst}</p>}
                  {invoiceData.tenant.email    && <p className="text-muted-foreground">{invoiceData.tenant.email}</p>}
                  {invoiceData.tenant.phone    && <p className="text-muted-foreground">{invoiceData.tenant.phone}</p>}
                </div>

                <Separator />

                {/* ── Line Items ── */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Line Items</p>
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-1.5 text-muted-foreground font-medium">Description</th>
                        <th className="text-right py-1.5 text-muted-foreground font-medium w-28">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Plan base */}
                      <tr className="border-b border-muted/40">
                        <td className="py-2">
                          <p className="font-medium">{invoiceData.plan.name} — Subscription</p>
                          <p className="text-xs text-muted-foreground capitalize">{invoiceData.plan.billingCycle} billing</p>
                        </td>
                        <td className="py-2 text-right font-medium">
                          ₹{invoiceData.plan.priceRupees.toLocaleString("en-IN")}
                        </td>
                      </tr>

                      {/* Add-on modules */}
                      {invoiceData.addonModules.map((m) => (
                        <tr key={m.slug} className="border-b border-muted/40">
                          <td className="py-2">
                            <p className="font-medium">{m.name}</p>
                            <p className="text-xs text-muted-foreground">Add-on module</p>
                          </td>
                          <td className="py-2 text-right font-medium">
                            ₹{m.priceRupees.toLocaleString("en-IN")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* ── Totals ── */}
                <div className="ml-auto max-w-xs space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>₹{invoiceData.subtotal.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">GST ({invoiceData.gstRate}%)</span>
                    <span>₹{invoiceData.gstAmount.toLocaleString("en-IN")}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-bold text-base">
                    <span>Total Due</span>
                    <span className="flex items-center gap-0.5 text-primary">
                      <IndianRupee className="h-4 w-4" />
                      {invoiceData.grandTotal.toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>

                {/* ── Billing adjustment note ── */}
                <div className="rounded-md bg-muted/40 p-3 text-xs text-muted-foreground space-y-1">
                  <p className="font-medium text-foreground">Billing Breakdown</p>
                  <p>
                    Base plan ({invoiceData.plan.name}): ₹{invoiceData.plan.priceRupees.toLocaleString("en-IN")}/mo
                  </p>
                  {invoiceData.addonModules.length > 0 ? (
                    <p>
                      Add-on modules ({invoiceData.addonModules.length}):
                      ₹{invoiceData.addonModules.reduce((s, m) => s + m.priceRupees, 0).toLocaleString("en-IN")}/mo
                    </p>
                  ) : (
                    <p>No paid add-on modules selected</p>
                  )}
                  <p>
                    GST @{invoiceData.gstRate}% on SaaS services: ₹{invoiceData.gstAmount.toLocaleString("en-IN")}
                  </p>
                  {invoiceData.addonModules.length === 0 && invoiceData.plan.priceRupees === 0 && (
                    <p className="text-amber-600 dark:text-amber-400 font-medium mt-1">
                      Trial plan — no charges applicable.
                    </p>
                  )}
                </div>

                <p className="text-xs text-muted-foreground text-center">
                  Thank you for using SwachERP. For queries, contact billing@swacherp.com
                </p>
              </div>
            ) : (
              <div className="flex items-center justify-center py-24 text-muted-foreground text-sm">
                No invoice data available
              </div>
            )}
          </div>

          <DialogFooter className="px-6 py-3 border-t shrink-0 gap-2">
            <Button variant="outline" onClick={() => setInvoiceTenantId(null)}>Close</Button>
            {invoiceData && (
              <Button
                onClick={() => {
                  const el = document.getElementById("invoice-print-area");
                  if (!el) return;
                  const w = window.open("", "_blank");
                  if (!w) return;
                  w.document.write(`
                    <html><head><title>${invoiceData.invoiceNo}</title>
                    <style>
                      body { font-family: sans-serif; font-size: 13px; color: #111; margin: 0; padding: 32px; }
                      table { width: 100%; border-collapse: collapse; }
                      th, td { padding: 8px 4px; text-align: left; }
                      th { color: #666; font-weight: 500; border-bottom: 1px solid #e5e7eb; }
                      td { border-bottom: 1px solid #f3f4f6; }
                      td:last-child, th:last-child { text-align: right; }
                      .totals { max-width: 280px; margin-left: auto; }
                      .totals div { display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px; }
                      .totals .grand { font-weight: bold; font-size: 15px; border-top: 1px solid #e5e7eb; padding-top: 8px; margin-top: 4px; }
                      hr { border: none; border-top: 1px solid #e5e7eb; margin: 16px 0; }
                      .note { background: #f9fafb; border-radius: 6px; padding: 10px; font-size: 11px; color: #666; margin-top: 16px; }
                      .footer { text-align: center; font-size: 11px; color: #9ca3af; margin-top: 24px; }
                    </style></head><body>
                    ${el.innerHTML}
                    </body></html>
                  `);
                  w.document.close();
                  w.print();
                }}
                data-testid="button-print-invoice"
              >
                <Printer className="h-4 w-4 mr-2" /> Print / Save PDF
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SuperAdminLayout>
  );
}
