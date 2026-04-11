import { type ReactNode } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CheckCircle2, Clock, XCircle, TrendingUp, TrendingDown, RefreshCw,
  CreditCard, Users, Loader2, History, Zap, ArrowRight
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import PricingPage from "./pricing";

interface Subscription {
  id: number;
  tenantId: number;
  planId: number;
  planSlug: string;
  billingCycle: string;
  status: string;
  startedAt: string;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  trialEndsAt: string | null;
  cancelledAt: string | null;
}

interface Plan {
  id: number;
  name: string;
  slug: string;
  tagline: string;
  priceMonthly: number;
  priceYearly: number;
  maxUsers: number;
  features: string[];
  isFeatured: boolean;
  trialDays: number;
}

interface BillingEvent {
  id: number;
  tenantId: number;
  eventType: string;
  fromPlan: string | null;
  toPlan: string | null;
  billingCycle: string | null;
  amount: number;
  notes: string | null;
  createdBy: string | null;
  createdAt: string;
}

interface SubscriptionData {
  subscription: Subscription | null;
  plan: Plan | null;
  history: BillingEvent[];
}

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: ReactNode }> = {
  active:    { label: "Active",    variant: "default",      icon: <CheckCircle2 className="h-3 w-3" /> },
  trial:     { label: "Trial",     variant: "secondary",    icon: <Clock className="h-3 w-3" /> },
  cancelled: { label: "Cancelled", variant: "destructive",  icon: <XCircle className="h-3 w-3" /> },
  expired:   { label: "Expired",   variant: "outline",      icon: <XCircle className="h-3 w-3" /> },
  pending:   { label: "Pending",   variant: "secondary",    icon: <Clock className="h-3 w-3" /> },
};

const EVENT_CONFIG: Record<string, { label: string; icon: ReactNode; color: string }> = {
  trial_started:      { label: "Trial Started",       icon: <Zap className="h-3.5 w-3.5" />,          color: "text-amber-600" },
  plan_activated:     { label: "Plan Activated",      icon: <CheckCircle2 className="h-3.5 w-3.5" />,  color: "text-emerald-600" },
  upgraded:           { label: "Plan Upgraded",       icon: <TrendingUp className="h-3.5 w-3.5" />,    color: "text-blue-600" },
  downgraded:         { label: "Plan Downgraded",     icon: <TrendingDown className="h-3.5 w-3.5" />,  color: "text-orange-500" },
  renewed:            { label: "Subscription Renewed",icon: <RefreshCw className="h-3.5 w-3.5" />,     color: "text-emerald-600" },
  cancelled:          { label: "Subscription Cancelled", icon: <XCircle className="h-3.5 w-3.5" />,   color: "text-destructive" },
  payment_received:   { label: "Payment Received",    icon: <CreditCard className="h-3.5 w-3.5" />,    color: "text-emerald-600" },
  upgrade_requested:  { label: "Upgrade Requested",   icon: <ArrowRight className="h-3.5 w-3.5" />,   color: "text-violet-600" },
  trial_expired:      { label: "Trial Expired",        icon: <Clock className="h-3.5 w-3.5" />,        color: "text-destructive" },
  plan_reactivated:   { label: "Plan Reactivated",    icon: <CheckCircle2 className="h-3.5 w-3.5" />,  color: "text-emerald-600" },
};

const PLAN_COLOR: Record<string, string> = {
  trial:        "text-amber-600",
  basic:        "text-blue-600",
  professional: "text-violet-600",
  enterprise:   "text-emerald-600",
};

function formatRupees(paise: number): string {
  if (paise === 0) return "Free";
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  try { return format(parseISO(dateStr), "dd MMM yyyy"); } catch { return dateStr; }
}

export default function SubscriptionManagement() {
  const { toast } = useToast();

  const { data: subData, isLoading } = useQuery<SubscriptionData>({
    queryKey: ["/api/tenant/subscription"],
  });

  const sub = subData?.subscription;
  const plan = subData?.plan;
  const history = subData?.history ?? [];

  const statusConf = STATUS_CONFIG[sub?.status ?? "trial"] ?? STATUS_CONFIG.trial;
  const planColor = PLAN_COLOR[sub?.planSlug ?? "trial"] ?? "text-foreground";
  const planLabel = plan?.name ?? sub?.planSlug ?? "—";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview" data-testid="tab-subscription-overview">Overview</TabsTrigger>
          <TabsTrigger value="plans" data-testid="tab-subscription-plans">Change Plan</TabsTrigger>
          <TabsTrigger value="history" data-testid="tab-billing-history">Billing History</TabsTrigger>
        </TabsList>

        {/* ── Overview tab ───────────────────────────────────────────────────── */}
        <TabsContent value="overview" className="space-y-4 mt-4">
          {/* Current plan card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <CreditCard className="h-4 w-4" /> Current Subscription
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Plan</p>
                  <p className={`text-lg font-bold ${planColor}`}>{planLabel}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Status</p>
                  <Badge variant={statusConf.variant} className="flex items-center gap-1 w-fit">
                    {statusConf.icon}
                    {statusConf.label}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Billing Cycle</p>
                  <p className="text-sm font-medium capitalize">{sub?.billingCycle ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Max Users</p>
                  <div className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5 text-muted-foreground" />
                    <p className="text-sm font-medium">{plan?.maxUsers ?? "—"}</p>
                  </div>
                </div>
              </div>

              {(sub?.currentPeriodEnd || sub?.trialEndsAt) && (
                <>
                  <Separator className="my-4" />
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Started</p>
                      <p className="text-sm">{formatDate(sub?.startedAt ?? null)}</p>
                    </div>
                    {sub?.currentPeriodEnd && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Renews On</p>
                        <p className="text-sm">{formatDate(sub.currentPeriodEnd)}</p>
                      </div>
                    )}
                    {sub?.trialEndsAt && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Trial Ends</p>
                        <p className="text-sm text-amber-600 font-medium">{formatDate(sub.trialEndsAt)}</p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Plan features */}
          {plan && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Included Features</CardTitle>
                <CardDescription>{plan.tagline}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {(plan.features as string[]).map((f, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Pricing summary */}
          {plan && plan.priceMonthly > 0 && (
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <p className="text-sm text-muted-foreground">Current Plan Price</p>
                    <p className="text-xl font-bold">
                      {formatRupees(sub?.billingCycle === "yearly" ? plan.priceYearly : plan.priceMonthly)}
                      <span className="text-sm font-normal text-muted-foreground ml-1">
                        / {sub?.billingCycle === "yearly" ? "year" : "month"}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">Exclusive of 18% GST</p>
                  </div>
                  <Button variant="outline" size="default" data-testid="button-contact-billing"
                    onClick={() => window.open("mailto:billing@kinto.in", "_blank")}>
                    Contact Billing
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── Plans tab ──────────────────────────────────────────────────────── */}
        <TabsContent value="plans" className="mt-4">
          <PricingPage />
        </TabsContent>

        {/* ── Billing history tab ────────────────────────────────────────────── */}
        <TabsContent value="history" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <History className="h-4 w-4" /> Billing History
              </CardTitle>
              <CardDescription>All plan changes and payment events for your account</CardDescription>
            </CardHeader>
            <CardContent>
              {history.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No billing history yet.</p>
              ) : (
                <div className="space-y-3">
                  {history.map((event) => {
                    const cfg = EVENT_CONFIG[event.eventType] ?? { label: event.eventType, icon: <History className="h-3.5 w-3.5" />, color: "text-muted-foreground" };
                    return (
                      <div key={event.id} className="flex items-start gap-3 py-2 border-b border-border last:border-0" data-testid={`row-billing-event-${event.id}`}>
                        <div className={`mt-0.5 ${cfg.color}`}>{cfg.icon}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-sm font-medium ${cfg.color}`}>{cfg.label}</span>
                            {event.fromPlan && event.toPlan && event.fromPlan !== event.toPlan && (
                              <span className="text-xs text-muted-foreground capitalize">
                                {event.fromPlan}
                                {" → "}
                                {event.toPlan}
                              </span>
                            )}
                            {event.amount > 0 && (
                              <Badge variant="outline" className="text-xs">{formatRupees(event.amount)}</Badge>
                            )}
                          </div>
                          {event.notes && <p className="text-xs text-muted-foreground mt-0.5">{event.notes}</p>}
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            <span>{formatDate(event.createdAt)}</span>
                            {event.createdBy && <span>by {event.createdBy}</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
