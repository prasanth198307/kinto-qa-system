import { useQuery, useMutation } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, Zap, Loader2, ArrowRight, Star, CreditCard, PhoneCall } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";

interface Plan {
  id: number;
  name: string;
  slug: string;
  tagline: string;
  description: string;
  priceMonthly: number;
  priceYearly: number;
  maxUsers: number;
  modules: string[];
  features: string[];
  isActive: boolean;
  isFeatured: boolean;
  displayOrder: number;
  trialDays: number;
}

interface BillingPlan {
  plan: string;
  label: string;
  priceMonthly: number;
  currency: string;
  razorpayEnabled: boolean;
}

interface BillingPlansData {
  plans: BillingPlan[];
  razorpayKeyId: string | null;
}

interface SubscriptionData {
  subscription: { planSlug: string; billingCycle: string; status: string } | null;
  plan: Plan | null;
  history: any[];
}

declare global {
  interface Window {
    Razorpay: any;
  }
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

export default function PricingPage({ onUpgrade }: { onUpgrade?: (plan: string) => void }) {
  const { toast } = useToast();
  const [cycle, setCycle] = useState<"monthly" | "yearly">("monthly");
  const [processingPlan, setProcessingPlan] = useState<string | null>(null);

  const { data: plans = [], isLoading: plansLoading } = useQuery<Plan[]>({
    queryKey: ["/api/subscription-plans"],
  });

  const { data: billingData } = useQuery<BillingPlansData>({
    queryKey: ["/api/billing/plans"],
    retry: false,
  });

  const { data: subData } = useQuery<SubscriptionData>({
    queryKey: ["/api/tenant/subscription"],
    retry: false,
  });

  const razorpayEnabled = billingData?.razorpayKeyId != null;
  const razorpayKeyId   = billingData?.razorpayKeyId ?? "";

  // ─── Request upgrade (no Razorpay — sends manual request) ────────────────
  const requestMutation = useMutation({
    mutationFn: async ({ plan }: { plan: string }) => {
      const res = await apiRequest("POST", "/api/billing/request-upgrade", { plan });
      return res.json();
    },
    onSuccess: (data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tenant/subscription"] });
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
    }) => {
      const res = await apiRequest("POST", "/api/billing/verify-payment", payload);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tenant/subscription"] });
      queryClient.invalidateQueries({ queryKey: ["/api/billing/history"] });
      toast({ title: "Payment successful!", description: data.message });
      setProcessingPlan(null);
      onUpgrade?.(data.plan);
      // Reload page to refresh session plan from server
      setTimeout(() => window.location.reload(), 1500);
    },
    onError: (err: any) => {
      toast({ title: "Payment verification failed", description: err.message, variant: "destructive" });
      setProcessingPlan(null);
    },
  });

  // ─── Main upgrade handler ─────────────────────────────────────────────────
  const handleUpgrade = async (plan: Plan) => {
    setProcessingPlan(plan.slug);

    // If Razorpay is not configured, fall back to manual request
    if (!razorpayEnabled) {
      requestMutation.mutate({ plan: plan.slug });
      return;
    }

    try {
      // Load Razorpay checkout.js
      const loaded = await loadRazorpayScript();
      if (!loaded) {
        toast({ title: "Payment gateway unavailable", description: "Please try again or contact support.", variant: "destructive" });
        setProcessingPlan(null);
        return;
      }

      // Create order
      const orderRes = await apiRequest("POST", "/api/billing/create-order", { plan: plan.slug });
      const order = await orderRes.json();
      if (!orderRes.ok) {
        toast({ title: "Could not create order", description: order.message, variant: "destructive" });
        setProcessingPlan(null);
        return;
      }

      // Open Razorpay modal
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
        modal: {
          ondismiss: () => {
            setProcessingPlan(null);
          },
        },
        handler: (response: {
          razorpay_payment_id: string;
          razorpay_order_id: string;
          razorpay_signature: string;
        }) => {
          verifyMutation.mutate({
            razorpay_order_id:  response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature:  response.razorpay_signature,
            plan: plan.slug,
          });
        },
      });
      rzp.open();
    } catch (err: any) {
      toast({ title: "Payment failed", description: err.message, variant: "destructive" });
      setProcessingPlan(null);
    }
  };

  const currentPlan  = subData?.subscription?.planSlug ?? "trial";
  const planOrder    = ["trial", "basic", "professional", "enterprise"];
  const currentLevel = planOrder.indexOf(currentPlan);

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
      {/* Header */}
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

        {/* Billing cycle toggle */}
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

      {/* Plan cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {plans.map((plan) => {
          const colors   = PLAN_COLORS[plan.slug] ?? PLAN_COLORS.trial;
          const planLevel = planOrder.indexOf(plan.slug);
          const isCurrent = plan.slug === currentPlan;
          const isHigher  = planLevel > currentLevel;
          const isProcessing = processingPlan === plan.slug;

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
                  {isCurrent && (
                    <Badge variant="secondary" className="text-xs shrink-0">Current</Badge>
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
                  <p className="text-xs text-muted-foreground mt-1">Up to {plan.maxUsers} users</p>
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

                {isCurrent ? (
                  <Button variant="outline" disabled className="w-full text-sm" data-testid={`button-current-${plan.slug}`}>
                    Your Current Plan
                  </Button>
                ) : isHigher ? (
                  <Button
                    className="w-full text-sm"
                    onClick={() => handleUpgrade(plan)}
                    disabled={processingPlan !== null}
                    data-testid={`button-upgrade-${plan.slug}`}
                  >
                    {isProcessing ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : razorpayEnabled ? (
                      <CreditCard className="h-4 w-4 mr-2" />
                    ) : (
                      <Zap className="h-4 w-4 mr-2" />
                    )}
                    {isProcessing
                      ? "Processing..."
                      : razorpayEnabled
                        ? "Pay & Upgrade"
                        : "Request Upgrade"}
                    {!isProcessing && <ArrowRight className="h-3.5 w-3.5 ml-1" />}
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

      {/* Bottom note */}
      <div className="text-center text-sm text-muted-foreground space-y-1">
        <p>All prices are exclusive of GST (18%).</p>
        {razorpayEnabled ? (
          <p>Payments are processed securely via Razorpay. Plan activates instantly after payment.</p>
        ) : (
          <p>
            Clicking "Request Upgrade" notifies our team — we'll confirm and activate within 24 hours.
          </p>
        )}
        <p>
          Need a custom plan or volume pricing?{" "}
          <a href="mailto:sales@kinto.in" className="text-primary underline">Contact our sales team</a>.
        </p>
      </div>
    </div>
  );
}
