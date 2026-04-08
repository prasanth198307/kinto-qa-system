import { useQuery, useMutation } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  CheckCircle2, Zap, Loader2, ArrowRight, Star, CreditCard, AlertTriangle,
  CalendarClock, XCircle, RefreshCw,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { format, parseISO } from "date-fns";

interface Plan {
  id: number;
  name: string;
  slug: string;
  tagline: string;
  description: string;
  priceMonthly: number;
  priceYearly: number;
  maxUsers: number;
  baseUsers: number;
  perUserPrice: number;
  modules: string[];
  features: string[];
  isActive: boolean;
  isFeatured: boolean;
  displayOrder: number;
  trialDays: number;
}

interface BillingPlansData {
  plans: { plan: string; label: string; priceMonthly: number; currency: string; razorpayEnabled: boolean }[];
  razorpayKeyId: string | null;
}

interface SubscriptionInfo {
  plan_slug: string;
  billing_cycle: string;
  status: string;           // active | cancelled | expired
  started_at: string;
  current_period_start: string | null;
  current_period_end: string | null;
  cancelled_at: string | null;
  cancel_reason: string | null;
}

interface SubscriptionData {
  subscription: SubscriptionInfo | null;
  history: any[];
}

declare global {
  interface Window { Razorpay: any; }
}

const PLAN_COLORS: Record<string, { accent: string; badge: string }> = {
  trial:        { accent: "border-amber-300",   badge: "bg-amber-100 text-amber-800" },
  basic:        { accent: "border-blue-300",    badge: "bg-blue-100 text-blue-800" },
  professional: { accent: "border-violet-400",  badge: "bg-violet-100 text-violet-800" },
  enterprise:   { accent: "border-emerald-400", badge: "bg-emerald-100 text-emerald-800" },
};

function formatPrice(paise: number, cycle: "monthly" | "yearly"): string {
  if (paise === 0) return "Free";
  const rupees = paise / 100;
  if (cycle === "yearly") return `₹${(rupees / 12).toLocaleString("en-IN", { maximumFractionDigits: 0 })}/mo`;
  return `₹${rupees.toLocaleString("en-IN", { maximumFractionDigits: 0 })}/mo`;
}

function formatPriceTotal(paise: number, cycle: "monthly" | "yearly"): string {
  if (paise === 0) return "";
  const rupees = paise / 100;
  if (cycle === "yearly") return `₹${rupees.toLocaleString("en-IN", { maximumFractionDigits: 0 })}/year`;
  return `₹${rupees.toLocaleString("en-IN", { maximumFractionDigits: 0 })}/month`;
}

function yearlyDiscount(monthly: number, yearly: number): number {
  if (!monthly || !yearly) return 0;
  const annualMonthly = monthly * 12;
  return Math.round(((annualMonthly - yearly) / annualMonthly) * 100);
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) { resolve(true); return; }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload  = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try { return format(parseISO(iso), "d MMM yyyy"); } catch { return iso; }
}

export default function PricingPage({ onUpgrade }: { onUpgrade?: (plan: string) => void }) {
  const { toast } = useToast();
  const [cycle, setCycle]               = useState<"monthly" | "yearly">("monthly");
  const [processingPlan, setProcessingPlan] = useState<string | null>(null);
  const [cancelDialog, setCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  const { data: plans = [], isLoading: plansLoading } = useQuery<Plan[]>({
    queryKey: ["/api/subscription-plans"],
  });

  const { data: billingData } = useQuery<BillingPlansData>({
    queryKey: ["/api/billing/plans"],
    retry: false,
  });

  const { data: subData, refetch: refetchSub } = useQuery<SubscriptionData>({
    queryKey: ["/api/billing/subscription"],
    retry: false,
  });

  const razorpayEnabled = billingData?.razorpayKeyId != null;
  const razorpayKeyId   = billingData?.razorpayKeyId ?? "";
  const sub             = subData?.subscription ?? null;

  // Derived subscription state
  const subStatus       = sub?.status ?? null;           // 'active' | 'cancelled' | 'expired' | null
  const isSubCancelled  = subStatus === "cancelled";
  const isSubExpired    = subStatus === "expired";
  const periodEnd       = sub?.current_period_end ?? null;
  const cancelledAt     = sub?.cancelled_at ?? null;

  // The tenant's current plan (from subscription record or fall back to trial)
  const currentPlan  = sub?.plan_slug ?? "trial";
  const planOrder    = ["trial", "basic", "professional", "enterprise"];
  const currentLevel = planOrder.indexOf(currentPlan);

  // ─── Cancel subscription mutation ────────────────────────────────────────
  const cancelMutation = useMutation({
    mutationFn: async (reason: string) => {
      const res = await apiRequest("POST", "/api/billing/cancel", { reason });
      return res.json();
    },
    onSuccess: (data) => {
      refetchSub();
      setCancelDialog(false);
      setCancelReason("");
      toast({ title: "Subscription cancelled", description: data.message });
    },
    onError: (err: any) => {
      toast({ title: "Cancellation failed", description: err.message, variant: "destructive" });
    },
  });

  // ─── Request upgrade (no Razorpay) ───────────────────────────────────────
  const requestMutation = useMutation({
    mutationFn: async ({ plan }: { plan: string }) => {
      const res = await apiRequest("POST", "/api/billing/request-upgrade", { plan });
      return res.json();
    },
    onSuccess: (data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["/api/billing/subscription"] });
      toast({ title: "Upgrade request sent!", description: data.message });
      setProcessingPlan(null);
      onUpgrade?.(vars.plan);
    },
    onError: (err: any) => {
      toast({ title: "Request failed", description: err.message, variant: "destructive" });
      setProcessingPlan(null);
    },
  });

  // ─── Verify payment after Razorpay checkout ───────────────────────────────
  const verifyMutation = useMutation({
    mutationFn: async (payload: {
      razorpay_order_id: string;
      razorpay_payment_id: string;
      razorpay_signature: string;
      plan: string;
      billingCycle: string;
    }) => {
      const res = await apiRequest("POST", "/api/billing/verify-payment", payload);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/billing/subscription"] });
      queryClient.invalidateQueries({ queryKey: ["/api/billing/history"] });
      toast({ title: "Payment successful!", description: data.message });
      setProcessingPlan(null);
      onUpgrade?.(data.plan);
      setTimeout(() => window.location.reload(), 1500);
    },
    onError: (err: any) => {
      toast({ title: "Payment verification failed", description: err.message, variant: "destructive" });
      setProcessingPlan(null);
    },
  });

  // ─── Main upgrade / re-subscribe handler ─────────────────────────────────
  const handleUpgrade = async (plan: Plan) => {
    setProcessingPlan(plan.slug);

    if (!razorpayEnabled) {
      requestMutation.mutate({ plan: plan.slug });
      return;
    }

    try {
      const loaded = await loadRazorpayScript();
      if (!loaded) {
        toast({ title: "Payment gateway unavailable", description: "Please try again or contact support.", variant: "destructive" });
        setProcessingPlan(null);
        return;
      }

      const orderRes = await apiRequest("POST", "/api/billing/create-order", { plan: plan.slug });
      const order = await orderRes.json();
      if (!orderRes.ok) {
        toast({ title: "Could not create order", description: order.message, variant: "destructive" });
        setProcessingPlan(null);
        return;
      }

      const rzp = new window.Razorpay({
        key:         razorpayKeyId,
        amount:      order.amount,
        currency:    order.currency,
        name:        "Kinto Smart Ops",
        description: order.planLabel,
        order_id:    order.orderId,
        prefill: {
          name:  order.tenantName,
          email: order.billingEmail ?? "",
        },
        theme: { color: "#6d28d9" },
        modal: { ondismiss: () => setProcessingPlan(null) },
        handler: (response: {
          razorpay_payment_id: string;
          razorpay_order_id: string;
          razorpay_signature: string;
        }) => {
          verifyMutation.mutate({
            razorpay_order_id:   response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature:  response.razorpay_signature,
            plan:                plan.slug,
            billingCycle:        cycle,
          });
        },
      });
      rzp.open();
    } catch (err: any) {
      toast({ title: "Payment failed", description: err.message, variant: "destructive" });
      setProcessingPlan(null);
    }
  };

  if (plansLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const discount = plans[1] ? yearlyDiscount(plans[1].priceMonthly, plans[1].priceYearly) : 20;

  return (
    <div className="py-8 px-4 space-y-8 max-w-5xl mx-auto">

      {/* ── Subscription status banner ──────────────────────────────────────── */}
      {sub && (
        <div className={`rounded-md border p-4 flex flex-wrap items-start justify-between gap-4 ${
          isSubCancelled ? "border-amber-300 bg-amber-50 dark:bg-amber-950/20" :
          isSubExpired   ? "border-destructive/40 bg-destructive/5" :
                           "border-emerald-300 bg-emerald-50 dark:bg-emerald-950/20"
        }`} data-testid="subscription-status-banner">
          <div className="space-y-1">
            {isSubCancelled ? (
              <>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <span className="font-medium text-sm text-amber-800 dark:text-amber-300">Subscription cancelled</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Your <strong>{currentPlan}</strong> plan remains active until{" "}
                  <strong>{fmtDate(periodEnd)}</strong>. After that, your account downgrades to Basic.
                </p>
                <p className="text-xs text-muted-foreground">
                  Cancelled on {fmtDate(cancelledAt)}.{" "}
                  Re-subscribe anytime to continue without interruption.
                </p>
              </>
            ) : isSubExpired ? (
              <>
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-destructive" />
                  <span className="font-medium text-sm text-destructive">Subscription expired</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Your subscription ended on <strong>{fmtDate(periodEnd)}</strong>.
                  Re-subscribe below to restore your plan.
                </p>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <CalendarClock className="h-4 w-4 text-emerald-600" />
                  <span className="font-medium text-sm text-emerald-800 dark:text-emerald-300">
                    Active — renews {fmtDate(periodEnd)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  You are on the <strong className="capitalize">{currentPlan}</strong> plan,{" "}
                  billed <span className="capitalize">{sub.billing_cycle}</span>.
                  Period started {fmtDate(sub.current_period_start)}.
                </p>
              </>
            )}
          </div>

          {/* Cancel button — only for active non-trial subscriptions */}
          {subStatus === "active" && currentPlan !== "trial" && (
            <Button
              variant="outline"
              size="default"
              onClick={() => setCancelDialog(true)}
              data-testid="button-cancel-subscription"
              className="shrink-0"
            >
              <XCircle className="h-4 w-4 mr-2" />
              Cancel Subscription
            </Button>
          )}
        </div>
      )}

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="text-center space-y-3">
        <h1 className="text-3xl font-bold">Simple, transparent pricing</h1>
        <p className="text-muted-foreground max-w-xl mx-auto">
          Start free. Upgrade when your business grows. All plans include GST invoicing and 24×7 data access.
        </p>

        {razorpayEnabled && (
          <div className="flex items-center justify-center gap-2 text-sm text-emerald-600">
            <CreditCard className="h-4 w-4" />
            <span>Secure online payments enabled</span>
          </div>
        )}

        <div className="inline-flex items-center gap-1 bg-muted rounded-lg p-1 mt-2">
          <button
            onClick={() => setCycle("monthly")}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${cycle === "monthly" ? "bg-background shadow-sm" : "text-muted-foreground"}`}
            data-testid="button-cycle-monthly"
          >
            Monthly
          </button>
          <button
            onClick={() => setCycle("yearly")}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${cycle === "yearly" ? "bg-background shadow-sm" : "text-muted-foreground"}`}
            data-testid="button-cycle-yearly"
          >
            Yearly
            <span className="ml-1.5 text-xs text-emerald-600 font-semibold">Save {discount}%</span>
          </button>
        </div>
      </div>

      {/* ── Plan cards ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {plans.map((plan) => {
          const colors      = PLAN_COLORS[plan.slug] ?? PLAN_COLORS.trial;
          const planLevel   = planOrder.indexOf(plan.slug);
          const isCurrent   = plan.slug === currentPlan;
          const isHigher    = planLevel > currentLevel;
          const isProcessing = processingPlan === plan.slug;

          // Show re-subscribe button if: same plan, cancelled/expired subscription
          const isResubscribe = isCurrent && (isSubCancelled || isSubExpired);
          // Show upgrade button for higher plans
          const showUpgrade   = isHigher || isResubscribe;

          return (
            <Card
              key={plan.id}
              className={`relative flex flex-col ${plan.isFeatured ? `border-2 ${colors.accent}` : ""}`}
              data-testid={`card-plan-${plan.slug}`}
            >
              {plan.isFeatured && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="flex items-center gap-1 bg-violet-600 text-white hover:bg-violet-600">
                    <Star className="h-3 w-3" /> Most Popular
                  </Badge>
                </div>
              )}

              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <CardTitle className="text-base">{plan.name}</CardTitle>
                  {isCurrent && !isSubCancelled && !isSubExpired && (
                    <Badge variant="secondary" className="text-xs shrink-0">Current</Badge>
                  )}
                  {isCurrent && isSubCancelled && (
                    <Badge variant="outline" className="text-xs shrink-0 border-amber-400 text-amber-700">Cancelling</Badge>
                  )}
                  {isCurrent && isSubExpired && (
                    <Badge variant="outline" className="text-xs shrink-0 border-destructive text-destructive">Expired</Badge>
                  )}
                </div>
                <CardDescription className="text-xs">{plan.tagline}</CardDescription>

                <div className="mt-2">
                  {plan.priceMonthly === 0 ? (
                    <div>
                      <span className="text-2xl font-bold">Free</span>
                      <p className="text-xs text-muted-foreground mt-0.5">{plan.trialDays}-day trial</p>
                    </div>
                  ) : (
                    <div>
                      <span className="text-2xl font-bold">
                        {formatPrice(cycle === "yearly" ? plan.priceYearly : plan.priceMonthly, cycle)}
                      </span>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatPriceTotal(cycle === "yearly" ? plan.priceYearly : plan.priceMonthly, cycle)} · billed {cycle}
                      </p>
                    </div>
                  )}
                  {plan.baseUsers > 0 ? (
                    <div className="mt-1 space-y-0.5">
                      <p className="text-xs text-muted-foreground">{plan.baseUsers} users included</p>
                      <p className="text-xs text-muted-foreground">+₹{(plan.perUserPrice / 100).toLocaleString("en-IN")}/extra user/month</p>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground mt-1">Up to {plan.maxUsers} users</p>
                  )}
                </div>
              </CardHeader>

              <CardContent className="flex flex-col flex-1 gap-4">
                <Separator />
                <ul className="space-y-2 flex-1">
                  {(plan.features as string[]).map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs">
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-600 shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                {showUpgrade ? (
                  <Button
                    className="w-full text-sm"
                    onClick={() => handleUpgrade(plan)}
                    disabled={processingPlan !== null}
                    data-testid={isResubscribe ? `button-resubscribe-${plan.slug}` : `button-upgrade-${plan.slug}`}
                  >
                    {isProcessing ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : isResubscribe ? (
                      <RefreshCw className="h-4 w-4 mr-2" />
                    ) : razorpayEnabled ? (
                      <CreditCard className="h-4 w-4 mr-2" />
                    ) : (
                      <Zap className="h-4 w-4 mr-2" />
                    )}
                    {isProcessing
                      ? "Processing..."
                      : isResubscribe
                        ? (razorpayEnabled ? "Re-subscribe" : "Request Renewal")
                        : razorpayEnabled
                          ? "Pay & Upgrade"
                          : "Request Upgrade"}
                    {!isProcessing && <ArrowRight className="h-3.5 w-3.5 ml-1" />}
                  </Button>
                ) : isCurrent && !isSubCancelled && !isSubExpired ? (
                  <Button variant="outline" disabled className="w-full text-sm" data-testid={`button-current-${plan.slug}`}>
                    Your Current Plan
                  </Button>
                ) : (
                  <Button variant="ghost" disabled className="w-full text-sm text-muted-foreground" data-testid={`button-downgrade-${plan.slug}`}>
                    Lower Plan
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ── Bottom note ─────────────────────────────────────────────────────── */}
      <div className="text-center text-sm text-muted-foreground space-y-1">
        <p>All prices are exclusive of GST (18%).</p>
        {razorpayEnabled ? (
          <p>Payments are processed securely via Razorpay. Plan activates instantly after payment.</p>
        ) : (
          <p>Clicking "Request Upgrade" notifies our team — we'll confirm and activate within 24 hours.</p>
        )}
        <p>
          When you cancel, your plan stays active until the end of your current billing period.
          You can re-subscribe at any time.
        </p>
        <p>
          Need a custom plan or volume pricing?{" "}
          <a href="mailto:sales@kinto.in" className="text-primary underline">Contact our sales team</a>.
        </p>
      </div>

      {/* ── Cancel confirmation dialog ───────────────────────────────────────── */}
      <Dialog open={cancelDialog} onOpenChange={(open) => !open && setCancelDialog(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Cancel Subscription
            </DialogTitle>
            <DialogDescription>
              Your <strong className="capitalize">{currentPlan}</strong> plan will remain fully active until{" "}
              <strong>{fmtDate(periodEnd)}</strong>. After that, your account automatically downgrades to Basic.
              You can re-subscribe at any time.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="rounded-md border border-amber-200 bg-amber-50 dark:bg-amber-950/20 p-3 space-y-1 text-sm">
              <p className="font-medium text-amber-800 dark:text-amber-300">What happens when you cancel:</p>
              <ul className="text-xs text-muted-foreground list-disc list-inside space-y-0.5">
                <li>Plan stays active until {fmtDate(periodEnd)}</li>
                <li>No refund for the current billing period</li>
                <li>After expiry, you move to Basic plan automatically</li>
                <li>All your data is preserved — nothing is deleted</li>
                <li>You can re-subscribe anytime to restore features</li>
              </ul>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm">Reason for cancelling (optional)</Label>
              <Textarea
                placeholder="e.g. Switching to another system, too expensive, seasonal break..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                rows={2}
                data-testid="input-cancel-reason"
              />
            </div>
          </div>

          <DialogFooter className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setCancelDialog(false)} data-testid="button-cancel-dialog-close">
              Keep Subscription
            </Button>
            <Button
              variant="destructive"
              onClick={() => cancelMutation.mutate(cancelReason)}
              disabled={cancelMutation.isPending}
              data-testid="button-confirm-cancel"
            >
              {cancelMutation.isPending
                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Cancelling...</>
                : <><XCircle className="mr-2 h-4 w-4" />Yes, Cancel Subscription</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
