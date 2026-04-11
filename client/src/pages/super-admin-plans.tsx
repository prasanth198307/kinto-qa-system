import { useState } from "react";
import { type ReactNode } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Plus, Pencil, Trash2, CheckCircle2, XCircle, Loader2, Star,
  CreditCard, Users, Package, GripVertical, X, ArrowLeft, LogOut,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import SuperAdminLayout from "./super-admin-layout";

// ── Types ─────────────────────────────────────────────────────────────────────
interface SubscriptionPlan {
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

interface PlansData {
  plans: SubscriptionPlan[];
  availableModules: string[];
}

// ── Human-readable module labels ───────────────────────────────────────────────
const MODULE_LABELS: Record<string, { label: string; description: string }> = {
  invoicing:        { label: "Invoicing & GST",          description: "GST invoices, payments, credit notes, advances" },
  purchase_orders:  { label: "Purchase Orders",           description: "POs, vendor management, debit notes" },
  basic_inventory:  { label: "Inventory Management",      description: "Products, raw materials, finished goods, UOM" },
  gatepasses:       { label: "Gatepasses & Dispatch",     description: "Delivery challans, dispatch tracking" },
  sales_orders:     { label: "Sales Orders",              description: "Pre-invoice sales order management" },
  production:       { label: "Production & BOM",          description: "BOM-driven production, issuance, reconciliation" },
  quality_returns:  { label: "Quality & Returns",         description: "Sales returns, quality inspection, credit notes" },
  accounting:       { label: "Accounting & Ledger",       description: "Double-entry accounting, COA, P&L, balance sheet" },
  mis:              { label: "MIS Analytics",             description: "Executive dashboards and KPI analytics" },
  expenses:         { label: "Expenses & Cash Register",  description: "Expense vouchers, monthly bills, daily cash register" },
  documents:        { label: "Document Management",       description: "Contracts, certificates, expiry alerts" },
  whatsapp:         { label: "WhatsApp Integration",      description: "Interactive checklists, machine startup reminders" },
  maintenance:      { label: "Preventive Maintenance",    description: "PM schedules, templates, history logs" },
  crm:              { label: "CRM",                       description: "Lead management, pipeline tracking, sales CRM" },
  hr_payroll:       { label: "HR & Payroll",              description: "Employees, attendance, leaves, payroll, ESS portal" },
};

const PLAN_COLORS: Record<string, string> = {
  trial:        "border-amber-300 bg-amber-50 dark:bg-amber-950/20",
  basic:        "border-blue-300 bg-blue-50 dark:bg-blue-950/20",
  professional: "border-violet-400 bg-violet-50 dark:bg-violet-950/20",
  enterprise:   "border-emerald-400 bg-emerald-50 dark:bg-emerald-950/20",
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function rupeesToPaise(rupees: string | number): number {
  return Math.round(parseFloat(String(rupees) || "0") * 100);
}
function paiseToRupees(paise: number): string {
  return paise === 0 ? "0" : (paise / 100).toFixed(0);
}

// ── Blank plan template ───────────────────────────────────────────────────────
function blankPlan(): Partial<SubscriptionPlan> & { priceMonthlyRupees: string; priceYearlyRupees: string; perUserPriceRupees: string } {
  return {
    name: "", slug: "", tagline: "", description: "",
    priceMonthlyRupees: "0", priceYearlyRupees: "0",
    maxUsers: 5, baseUsers: 0, perUserPrice: 0, perUserPriceRupees: "0",
    modules: [], features: [],
    isActive: true, isFeatured: false, displayOrder: 99, trialDays: 0,
  };
}

// ── Main component ────────────────────────────────────────────────────────────
export default function SuperAdminPlans() {
  const { toast } = useToast();
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();

  const [editPlan, setEditPlan] = useState<(Partial<SubscriptionPlan> & { priceMonthlyRupees: string; priceYearlyRupees: string; perUserPriceRupees: string }) | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newFeatureText, setNewFeatureText] = useState("");

  const { data, isLoading, isError } = useQuery<PlansData>({
    queryKey: ["/api/admin/subscription-plans"],
  });

  const plans = data?.plans ?? [];
  // Fall back to hardcoded module keys when API returns empty (e.g. iframe auth issue)
  const availableModules = (data?.availableModules && data.availableModules.length > 0)
    ? data.availableModules
    : Object.keys(MODULE_LABELS);

  // ── Mutations ──────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: async (body: Record<string, any>) => {
      const res = await apiRequest("POST", "/api/admin/subscription-plans", body);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/subscription-plans"] });
      queryClient.invalidateQueries({ queryKey: ["/api/subscription-plans"] });
      toast({ title: "Plan created successfully" });
      setEditPlan(null);
      setIsCreating(false);
    },
    onError: (err: any) => toast({ title: "Create failed", description: err.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, body }: { id: number; body: Record<string, any> }) => {
      const res = await apiRequest("PUT", `/api/admin/subscription-plans/${id}`, body);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/subscription-plans"] });
      queryClient.invalidateQueries({ queryKey: ["/api/subscription-plans"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tenant/features"] });
      toast({ title: "Plan updated successfully" });
      setEditPlan(null);
    },
    onError: (err: any) => toast({ title: "Update failed", description: err.message, variant: "destructive" }),
  });

  const deactivateMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/admin/subscription-plans/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/subscription-plans"] });
      queryClient.invalidateQueries({ queryKey: ["/api/subscription-plans"] });
      toast({ title: "Plan deactivated" });
    },
    onError: (err: any) => toast({ title: "Failed", description: err.message, variant: "destructive" }),
  });

  // ── Edit helpers ───────────────────────────────────────────────────────────
  const openEdit = (plan: SubscriptionPlan) => {
    setIsCreating(false);
    setEditPlan({
      ...plan,
      priceMonthlyRupees: paiseToRupees(plan.priceMonthly),
      priceYearlyRupees:  paiseToRupees(plan.priceYearly),
      perUserPriceRupees: paiseToRupees(plan.perUserPrice ?? 0),
    });
  };

  const openCreate = () => {
    setIsCreating(true);
    setEditPlan(blankPlan());
  };

  const saveEdit = () => {
    if (!editPlan) return;
    const body = {
      name: editPlan.name,
      slug: editPlan.slug,
      tagline: editPlan.tagline,
      description: editPlan.description,
      priceMonthly: rupeesToPaise(editPlan.priceMonthlyRupees ?? "0"),
      priceYearly:  rupeesToPaise(editPlan.priceYearlyRupees ?? "0"),
      maxUsers: editPlan.maxUsers,
      baseUsers: editPlan.baseUsers ?? 0,
      perUserPrice: rupeesToPaise(editPlan.perUserPriceRupees ?? "0"),
      modules: editPlan.modules,
      features: editPlan.features,
      isActive: editPlan.isActive,
      isFeatured: editPlan.isFeatured,
      displayOrder: editPlan.displayOrder,
      trialDays: editPlan.trialDays,
    };
    if (isCreating) {
      createMutation.mutate(body);
    } else {
      updateMutation.mutate({ id: editPlan.id!, body });
    }
  };

  const toggleModule = (mod: string) => {
    setEditPlan((prev) => {
      if (!prev) return prev;
      const mods = prev.modules ?? [];
      return {
        ...prev,
        modules: mods.includes(mod) ? mods.filter((m) => m !== mod) : [...mods, mod],
      };
    });
  };

  const addFeature = () => {
    const text = newFeatureText.trim();
    if (!text) return;
    setEditPlan((prev) => prev ? { ...prev, features: [...(prev.features ?? []), text] } : prev);
    setNewFeatureText("");
  };

  const removeFeature = (idx: number) => {
    setEditPlan((prev) => prev ? { ...prev, features: (prev.features ?? []).filter((_, i) => i !== idx) } : prev);
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError) {
    return (
      <SuperAdminLayout>
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
          <XCircle className="h-10 w-10 text-destructive" />
          <div>
            <p className="font-semibold text-destructive">Could not load subscription plans</p>
            <p className="text-sm text-muted-foreground mt-1">
              A server error occurred while fetching plans.<br />
              Please refresh the page or try again.
            </p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm hover:opacity-90"
          >
            Retry
          </button>
        </div>
      </SuperAdminLayout>
    );
  }

  return (
    <SuperAdminLayout
      title="Subscription Plans"
      subtitle="Define pricing, modules, and features for each subscription tier"
      actions={
        <Button onClick={openCreate} data-testid="button-create-plan">
          <Plus className="h-4 w-4 mr-2" /> New Plan
        </Button>
      }
    >
    <div className="space-y-6">

      {/* Plan cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {plans.map((plan) => {
          const colorCls = PLAN_COLORS[plan.slug] ?? "border-border bg-muted/20";
          return (
            <Card key={plan.id} className={`border-2 ${colorCls} ${!plan.isActive ? "opacity-50" : ""}`} data-testid={`card-plan-${plan.slug}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <CardTitle className="text-base truncate">{plan.name}</CardTitle>
                      {plan.isFeatured && (
                        <Badge className="bg-violet-600 text-white text-xs hover:bg-violet-600 shrink-0">
                          <Star className="h-2.5 w-2.5 mr-0.5" /> Featured
                        </Badge>
                      )}
                      {!plan.isActive && <Badge variant="outline" className="text-xs shrink-0">Inactive</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{plan.tagline}</p>
                  </div>
                </div>

                <div className="mt-2 space-y-0.5">
                  <p className="text-lg font-bold">
                    {plan.priceMonthly === 0 ? "Free" : `₹${(plan.priceMonthly / 100).toLocaleString("en-IN")}/mo`}
                  </p>
                  {plan.priceYearly > 0 && (
                    <p className="text-xs text-muted-foreground">
                      ₹{(plan.priceYearly / 100).toLocaleString("en-IN")}/yr
                    </p>
                  )}
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Users className="h-3 w-3" />
                    {plan.baseUsers > 0 ? (
                      <span>{plan.baseUsers} users incl. · +₹{(plan.perUserPrice / 100)}/extra · max {plan.maxUsers}</span>
                    ) : (
                      <span>Up to {plan.maxUsers} users</span>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                {/* Modules */}
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
                    <Package className="h-3 w-3" /> Modules ({(plan.modules ?? []).length})
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {(plan.modules ?? []).slice(0, 5).map((mod) => (
                      <Badge key={mod} variant="secondary" className="text-xs">
                        {MODULE_LABELS[mod]?.label ?? mod}
                      </Badge>
                    ))}
                    {(plan.modules ?? []).length > 5 && (
                      <Badge variant="outline" className="text-xs">+{(plan.modules ?? []).length - 5} more</Badge>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Actions */}
                <div className="flex gap-2">
                  <Button size="default" variant="outline" className="flex-1" onClick={() => openEdit(plan)} data-testid={`button-edit-plan-${plan.id}`}>
                    <Pencil className="h-3.5 w-3.5 mr-1.5" /> Edit
                  </Button>
                  {plan.isActive && (
                    <Button size="icon" variant="ghost" onClick={() => deactivateMutation.mutate(plan.id)} disabled={deactivateMutation.isPending} data-testid={`button-deactivate-plan-${plan.id}`}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* How it works info */}
      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="font-medium mb-1">Modules control nav visibility</p>
              <p className="text-muted-foreground text-xs">When you add/remove a module from a plan, those navigation sections automatically appear or disappear for tenants on that plan.</p>
            </div>
            <div>
              <p className="font-medium mb-1">Changes are instant</p>
              <p className="text-muted-foreground text-xs">Updating a plan's modules takes effect immediately — no restart needed. Tenants on that plan see the change on their next page refresh.</p>
            </div>
            <div>
              <p className="font-medium mb-1">Slug is permanent</p>
              <p className="text-muted-foreground text-xs">The plan slug (e.g. "professional") links tenants to plans. Don't change slugs of existing plans — it will break tenant assignments.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Edit / Create Dialog ───────────────────────────────────────────── */}
      <Dialog open={!!editPlan} onOpenChange={(open) => { if (!open) { setEditPlan(null); setIsCreating(false); } }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isCreating ? "Create New Plan" : `Edit Plan: ${editPlan?.name}`}</DialogTitle>
          </DialogHeader>

          {editPlan && (
            <div className="space-y-6 py-2">
              {/* ── Basic info ── */}
              <section className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Basic Info</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="plan-name">Plan Name *</Label>
                    <Input id="plan-name" value={editPlan.name ?? ""} onChange={(e) => setEditPlan((p) => p ? { ...p, name: e.target.value } : p)} placeholder="Professional" data-testid="input-plan-name" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="plan-slug">Slug * {!isCreating && <span className="text-xs text-muted-foreground">(read-only)</span>}</Label>
                    <Input id="plan-slug" value={editPlan.slug ?? ""} readOnly={!isCreating}
                      onChange={(e) => isCreating && setEditPlan((p) => p ? { ...p, slug: e.target.value.toLowerCase().replace(/\s+/g, "-") } : p)}
                      placeholder="professional" className={!isCreating ? "opacity-60" : ""}
                      data-testid="input-plan-slug" />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <Label htmlFor="plan-tagline">Tagline</Label>
                    <Input id="plan-tagline" value={editPlan.tagline ?? ""} onChange={(e) => setEditPlan((p) => p ? { ...p, tagline: e.target.value } : p)} placeholder="For growing manufacturers" data-testid="input-plan-tagline" />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <Label htmlFor="plan-description">Description</Label>
                    <Textarea id="plan-description" value={editPlan.description ?? ""} onChange={(e) => setEditPlan((p) => p ? { ...p, description: e.target.value } : p)} rows={2} placeholder="Full description..." data-testid="input-plan-description" />
                  </div>
                </div>
              </section>

              <Separator />

              {/* ── Pricing ── */}
              <section className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Pricing (in ₹ Rupees)</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Monthly */}
                  <div className="space-y-1">
                    <Label htmlFor="price-monthly">Monthly Price (₹)</Label>
                    <Input id="price-monthly" type="number" min="0" value={editPlan.priceMonthlyRupees ?? "0"}
                      onChange={(e) => setEditPlan((p) => p ? { ...p, priceMonthlyRupees: e.target.value } : p)}
                      placeholder="999" data-testid="input-price-monthly" />
                    <p className="text-xs text-muted-foreground">0 = Free plan</p>
                  </div>
                  {/* Yearly with quick-fill helpers */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <Label htmlFor="price-yearly">Yearly Price (₹)</Label>
                      <div className="flex items-center gap-1">
                        {/* 11+1 = pay 11 months, get 12 */}
                        <Button type="button" size="sm" variant="outline" className="h-6 text-xs px-2 py-0"
                          onClick={() => {
                            const monthly = parseFloat(editPlan?.priceMonthlyRupees ?? "0");
                            if (monthly > 0) setEditPlan((p) => p ? { ...p, priceYearlyRupees: String(Math.round(monthly * 11)) } : p);
                          }}
                          data-testid="button-yearly-11plus1"
                        >11+1</Button>
                        {/* 10% off */}
                        <Button type="button" size="sm" variant="outline" className="h-6 text-xs px-2 py-0"
                          onClick={() => {
                            const monthly = parseFloat(editPlan?.priceMonthlyRupees ?? "0");
                            if (monthly > 0) setEditPlan((p) => p ? { ...p, priceYearlyRupees: String(Math.round(monthly * 12 * 0.9)) } : p);
                          }}
                          data-testid="button-yearly-10off"
                        >10% off</Button>
                        {/* 20% off */}
                        <Button type="button" size="sm" variant="outline" className="h-6 text-xs px-2 py-0"
                          onClick={() => {
                            const monthly = parseFloat(editPlan?.priceMonthlyRupees ?? "0");
                            if (monthly > 0) setEditPlan((p) => p ? { ...p, priceYearlyRupees: String(Math.round(monthly * 12 * 0.8)) } : p);
                          }}
                          data-testid="button-yearly-20off"
                        >20% off</Button>
                      </div>
                    </div>
                    <Input id="price-yearly" type="number" min="0" value={editPlan.priceYearlyRupees ?? "0"}
                      onChange={(e) => setEditPlan((p) => p ? { ...p, priceYearlyRupees: e.target.value } : p)}
                      placeholder="9999" data-testid="input-price-yearly" />
                    {/* Discount display */}
                    {(() => {
                      const monthly = parseFloat(editPlan?.priceMonthlyRupees ?? "0");
                      const yearly  = parseFloat(editPlan?.priceYearlyRupees ?? "0");
                      if (monthly > 0 && yearly > 0 && yearly < monthly * 12) {
                        const saving = Math.round(((monthly * 12 - yearly) / (monthly * 12)) * 100);
                        const freeMonths = ((monthly * 12 - yearly) / monthly).toFixed(1);
                        return (
                          <p className="text-xs text-green-600 dark:text-green-400 font-medium">
                            {saving}% off · saves ₹{Math.round(monthly * 12 - yearly).toLocaleString()} · ~{freeMonths} months free
                          </p>
                        );
                      }
                      return <p className="text-xs text-muted-foreground">Set yearly price less than 12×monthly to show a discount</p>;
                    })()}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="base-users">Base Users (included)</Label>
                    <Input id="base-users" type="number" min="0" value={editPlan.baseUsers ?? 0}
                      onChange={(e) => setEditPlan((p) => p ? { ...p, baseUsers: parseInt(e.target.value) || 0 } : p)}
                      data-testid="input-base-users" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="per-user-price">Extra User Price (₹/month)</Label>
                    <Input id="per-user-price" type="number" min="0" value={editPlan.perUserPriceRupees ?? "0"}
                      onChange={(e) => setEditPlan((p) => p ? { ...p, perUserPriceRupees: e.target.value } : p)}
                      data-testid="input-per-user-price" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="max-users">Max Users (hard cap)</Label>
                    <Input id="max-users" type="number" min="1" value={editPlan.maxUsers ?? 5}
                      onChange={(e) => setEditPlan((p) => p ? { ...p, maxUsers: parseInt(e.target.value) || 5 } : p)}
                      data-testid="input-max-users" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="trial-days">Trial Days</Label>
                    <Input id="trial-days" type="number" min="0" value={editPlan.trialDays ?? 0}
                      onChange={(e) => setEditPlan((p) => p ? { ...p, trialDays: parseInt(e.target.value) || 0 } : p)}
                      data-testid="input-trial-days" />
                  </div>
                </div>
                <div className="flex items-center gap-6 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Switch id="is-active" checked={editPlan.isActive ?? true} onCheckedChange={(v) => setEditPlan((p) => p ? { ...p, isActive: v } : p)} data-testid="switch-is-active" />
                    <Label htmlFor="is-active">Active (visible to tenants)</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch id="is-featured" checked={editPlan.isFeatured ?? false} onCheckedChange={(v) => setEditPlan((p) => p ? { ...p, isFeatured: v } : p)} data-testid="switch-is-featured" />
                    <Label htmlFor="is-featured">Featured (highlight on pricing page)</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="display-order" className="shrink-0">Display Order</Label>
                    <Input id="display-order" type="number" min="0" className="w-20" value={editPlan.displayOrder ?? 99}
                      onChange={(e) => setEditPlan((p) => p ? { ...p, displayOrder: parseInt(e.target.value) || 0 } : p)}
                      data-testid="input-display-order" />
                  </div>
                </div>
              </section>

              <Separator />

              {/* ── Modules ── */}
              <section className="space-y-3">
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Included Modules</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Check the modules this plan includes. Checked modules will be visible to tenants on this plan.
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {availableModules.map((mod) => {
                    const meta = MODULE_LABELS[mod] ?? { label: mod, description: "" };
                    const checked = (editPlan.modules ?? []).includes(mod);
                    return (
                      <div
                        key={mod}
                        onClick={() => toggleModule(mod)}
                        className={`flex items-start gap-3 p-3 rounded-md border cursor-pointer transition-colors ${checked ? "border-primary/50 bg-primary/5" : "border-border hover-elevate"}`}
                        data-testid={`checkbox-module-${mod}`}
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() => toggleModule(mod)}
                          className="mt-0.5 shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-medium leading-none">{meta.label}</p>
                          <p className="text-xs text-muted-foreground mt-1">{meta.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground">
                  {(editPlan.modules ?? []).length} of {availableModules.length} modules selected
                </p>
              </section>

              <Separator />

              {/* ── Features (bullet points for pricing page) ── */}
              <section className="space-y-3">
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Feature Bullets</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    These text bullets appear on the public pricing page cards.
                  </p>
                </div>

                {/* Existing features */}
                <div className="space-y-1.5">
                  {(editPlan.features ?? []).map((f, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2 rounded-md border border-border bg-muted/30" data-testid={`feature-item-${idx}`}>
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-600 shrink-0" />
                      <span className="text-sm flex-1">{f}</span>
                      <Button size="icon" variant="ghost" onClick={() => removeFeature(idx)} data-testid={`button-remove-feature-${idx}`}>
                        <X className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                    </div>
                  ))}
                  {(editPlan.features ?? []).length === 0 && (
                    <p className="text-xs text-muted-foreground py-2">No feature bullets yet. Add some below.</p>
                  )}
                </div>

                {/* Add new feature */}
                <div className="flex gap-2">
                  <Input
                    value={newFeatureText}
                    onChange={(e) => setNewFeatureText(e.target.value)}
                    placeholder="e.g. GST-compliant invoicing"
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addFeature(); } }}
                    data-testid="input-new-feature"
                  />
                  <Button variant="outline" onClick={addFeature} disabled={!newFeatureText.trim()} data-testid="button-add-feature">
                    <Plus className="h-4 w-4 mr-1" /> Add
                  </Button>
                </div>
              </section>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setEditPlan(null); setIsCreating(false); }}>Cancel</Button>
            <Button onClick={saveEdit} disabled={isPending || !editPlan?.name || !editPlan?.slug} data-testid="button-save-plan">
              {isPending ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Saving...</> : isCreating ? "Create Plan" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </SuperAdminLayout>
  );
}
