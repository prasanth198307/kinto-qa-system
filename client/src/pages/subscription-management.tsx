import { useState, type ReactNode } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CheckCircle2, Clock, XCircle, TrendingUp, TrendingDown, RefreshCw,
  CreditCard, Users, Loader2, History, Zap, ArrowRight, Plus, X,
  AlertTriangle, Package, Shield, Settings, BarChart3, Bell, Download,
  Mail, MessageSquare, AlertCircle, Info,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ModuleDefinition {
  slug: string;
  name: string;
  description: string;
  category: string;
  priceMonthly: number;
  free: boolean;
  popular?: boolean;
  dependencies?: string[];
}

interface ModuleData {
  selectedModules: string[];
  planModules: string[];
  monthlyAmount: number;
  planSlug: string | null;
  status: string | null;
  currentPeriodEnd: string | null;
  cancelledAt: string | null;
  catalog: ModuleDefinition[];
  freeModules: string[];
}

interface BillingEvent {
  id: number;
  event_type: string;
  from_plan: string | null;
  to_plan: string | null;
  billing_cycle: string | null;
  amount: number;
  currency: string;
  notes: string | null;
  created_at: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, { badge: string; badgeText: string; icon: string }> = {
  Core:       { badge: "bg-emerald-100", badgeText: "text-emerald-700", icon: "text-emerald-600" },
  Finance:    { badge: "bg-blue-100",    badgeText: "text-blue-700",    icon: "text-blue-600" },
  Inventory:  { badge: "bg-orange-100",  badgeText: "text-orange-700",  icon: "text-orange-600" },
  Production: { badge: "bg-purple-100",  badgeText: "text-purple-700",  icon: "text-purple-600" },
  HR:         { badge: "bg-rose-100",    badgeText: "text-rose-700",    icon: "text-rose-600" },
  Sales:      { badge: "bg-teal-100",    badgeText: "text-teal-700",    icon: "text-teal-600" },
  Industry:   { badge: "bg-indigo-100",  badgeText: "text-indigo-700",  icon: "text-indigo-600" },
};

const EVENT_LABELS: Record<string, { label: string; icon: ReactNode; color: string }> = {
  trial_started:         { label: "Trial Started",         icon: <Zap className="h-3.5 w-3.5" />,          color: "text-amber-600" },
  plan_activated:        { label: "Plan Activated",        icon: <CheckCircle2 className="h-3.5 w-3.5" />,  color: "text-emerald-600" },
  upgraded:              { label: "Plan Upgraded",         icon: <TrendingUp className="h-3.5 w-3.5" />,    color: "text-blue-600" },
  downgraded:            { label: "Plan Downgraded",       icon: <TrendingDown className="h-3.5 w-3.5" />,  color: "text-orange-500" },
  renewed:               { label: "Subscription Renewed",  icon: <RefreshCw className="h-3.5 w-3.5" />,     color: "text-emerald-600" },
  subscription_renewed:  { label: "Subscription Renewed",  icon: <RefreshCw className="h-3.5 w-3.5" />,     color: "text-emerald-600" },
  cancelled:             { label: "Cancelled",             icon: <XCircle className="h-3.5 w-3.5" />,       color: "text-destructive" },
  subscription_cancelled:{ label: "Subscription Cancelled",icon: <XCircle className="h-3.5 w-3.5" />,       color: "text-destructive" },
  payment_received:      { label: "Payment Received",      icon: <CreditCard className="h-3.5 w-3.5" />,    color: "text-emerald-600" },
  upgrade_requested:     { label: "Upgrade Requested",     icon: <ArrowRight className="h-3.5 w-3.5" />,    color: "text-violet-600" },
  trial_expired:         { label: "Trial Expired",         icon: <Clock className="h-3.5 w-3.5" />,         color: "text-destructive" },
  plan_reactivated:      { label: "Plan Reactivated",      icon: <CheckCircle2 className="h-3.5 w-3.5" />,  color: "text-emerald-600" },
  modules_updated:       { label: "Modules Updated",       icon: <Package className="h-3.5 w-3.5" />,       color: "text-blue-600" },
};

function formatDate(d: string | null) {
  if (!d) return "—";
  try { return format(parseISO(d), "dd MMM yyyy"); } catch { return d; }
}

function formatRupees(paise: number) {
  if (paise === 0) return "₹0";
  return `₹${paise.toLocaleString("en-IN")}`;
}

// Group catalog by category preserving order
function groupByCategory(catalog: ModuleDefinition[]) {
  const map = new Map<string, ModuleDefinition[]>();
  for (const m of catalog) {
    if (!map.has(m.category)) map.set(m.category, []);
    map.get(m.category)!.push(m);
  }
  return map;
}

// ─── Module Marketplace Tab ───────────────────────────────────────────────────

function MarketplaceTab({
  data, onSave,
}: {
  data: ModuleData;
  onSave: (slugs: string[]) => void;
}) {
  const freeSet = new Set(data.freeModules);
  const planSet = new Set(data.planModules ?? []);
  const [draft, setDraft] = useState<Set<string>>(new Set(data.selectedModules));
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const grouped = groupByCategory(data.catalog);

  const toggle = (slug: string) => {
    if (freeSet.has(slug) || planSet.has(slug)) return;
    setDraft(prev => {
      const next = new Set(prev);
      next.has(slug) ? next.delete(slug) : next.add(slug);
      return next;
    });
  };

  const draftTotal = data.catalog
    .filter(m => draft.has(m.slug) && m.priceMonthly > 0 && !freeSet.has(m.slug) && !planSet.has(m.slug))
    .reduce((s, m) => s + m.priceMonthly, 0);

  const hasChanges = (() => {
    const orig = new Set(data.selectedModules);
    for (const s of draft) if (!orig.has(s)) return true;
    for (const s of orig) if (!draft.has(s)) return true;
    return false;
  })();

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(Array.from(draft));
      toast({ title: "Modules updated", description: "Your module selection has been saved." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex gap-6">
      {/* Left — module grid */}
      <div className="flex-1 space-y-6">
        {Array.from(grouped.entries()).map(([cat, modules]) => {
          const c = CATEGORY_COLORS[cat] ?? CATEGORY_COLORS.Core;
          return (
            <div key={cat}>
              <div className="flex items-center gap-2 mb-3">
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${c.badge} ${c.badgeText}`}>{cat}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {modules.map(mod => {
                  const isFree    = freeSet.has(mod.slug);
                  const isInPlan  = planSet.has(mod.slug);
                  const isLocked  = isFree || isInPlan;
                  const isOn      = draft.has(mod.slug);
                  return (
                    <button
                      key={mod.slug}
                      onClick={() => toggle(mod.slug)}
                      data-testid={`module-toggle-${mod.slug}`}
                      className={`text-left p-3.5 rounded-xl border-2 transition-all ${
                        isFree
                          ? `bg-emerald-50 border-emerald-200 cursor-default`
                          : isInPlan
                          ? `bg-blue-50 border-blue-200 cursor-default`
                          : isOn
                          ? `bg-white border-primary ring-2 ring-primary/10 shadow-sm`
                          : `bg-card border-border hover:border-muted-foreground/30`
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`text-sm font-semibold ${isFree ? "text-emerald-800" : isInPlan ? "text-blue-800" : "text-foreground"}`}>
                              {mod.name}
                            </span>
                            {mod.popular && !isLocked && (
                              <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">Popular</span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{mod.description}</p>
                        </div>
                        <div className="flex-shrink-0 flex flex-col items-end gap-1.5">
                          {isFree ? (
                            <span className="text-xs font-bold text-emerald-600">FREE</span>
                          ) : isInPlan ? (
                            <span className="text-xs font-bold text-blue-600">Plan</span>
                          ) : (
                            <span className="text-sm font-bold text-foreground">₹{mod.priceMonthly}<span className="text-xs font-normal text-muted-foreground">/mo</span></span>
                          )}
                          <div className={`h-5 w-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                            isFree ? "bg-emerald-500" : isInPlan ? "bg-blue-500" : isOn ? "bg-primary" : "border-2 border-muted-foreground/30"
                          }`}>
                            {(isLocked || isOn) && <CheckCircle2 className="h-3 w-3 text-white" />}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Right — sticky summary */}
      <div className="w-64 flex-shrink-0">
        <div className="sticky top-4 space-y-3">
          <Card>
            <div className="bg-primary px-4 py-3 rounded-t-lg">
              <div className="text-primary-foreground/80 text-xs mb-0.5">Monthly total</div>
              <div className="text-primary-foreground text-2xl font-bold">
                ₹{draftTotal.toLocaleString("en-IN")}
                <span className="text-sm font-normal opacity-70">/mo</span>
              </div>
              <div className="text-primary-foreground/70 text-xs mt-0.5">
                {Array.from(draft).filter(s => !freeSet.has(s)).length} paid module(s) + 4 free
              </div>
            </div>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                Users, Roles, Settings, Dashboard — always free
              </div>
              {planSet.size > 0 && (
                <div className="flex items-center gap-1.5 text-xs text-blue-600">
                  <CheckCircle2 className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
                  {planSet.size} module(s) included in your plan
                </div>
              )}
              <Separator />
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {data.catalog
                  .filter(m => draft.has(m.slug) && m.priceMonthly > 0 && !freeSet.has(m.slug) && !planSet.has(m.slug))
                  .map(m => (
                    <div key={m.slug} className="flex items-center justify-between text-xs">
                      <span className="text-foreground truncate pr-2">{m.name}</span>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <span className="font-semibold">₹{m.priceMonthly}</span>
                        <button
                          onClick={() => toggle(m.slug)}
                          className="text-muted-foreground hover:text-destructive transition-colors"
                          data-testid={`remove-module-${m.slug}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                {data.catalog.filter(m => draft.has(m.slug) && m.priceMonthly > 0 && !freeSet.has(m.slug) && !planSet.has(m.slug)).length === 0 && (
                  <p className="text-xs text-muted-foreground italic">No extra paid modules added.</p>
                )}
              </div>
              <Button
                className="w-full"
                onClick={handleSave}
                disabled={!hasChanges || saving}
                data-testid="button-save-modules"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {hasChanges ? "Save Changes" : "No Changes"}
              </Button>
              <p className="text-center text-xs text-muted-foreground">Changes apply from next billing cycle</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3">
              <p className="text-xs font-medium text-foreground mb-1">Per-user add-on</p>
              <p className="text-xs text-muted-foreground">Base price includes 5 users. Each additional user is <strong>₹150/month</strong>.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ─── Manage Modules Tab ───────────────────────────────────────────────────────

function ManageModulesTab({
  data, onSave,
}: {
  data: ModuleData;
  onSave: (slugs: string[]) => void;
}) {
  const freeSet = new Set(data.freeModules);
  const [selected, setSelected] = useState<Set<string>>(new Set(data.selectedModules));
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  const [depWarn, setDepWarn] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const bySlug = new Map(data.catalog.map(m => [m.slug, m]));

  // find modules that depend on a given slug
  const getDependents = (slug: string) =>
    data.catalog.filter(m => m.dependencies?.includes(slug) && selected.has(m.slug));

  const requestRemove = (slug: string) => {
    const deps = getDependents(slug);
    if (deps.length > 0) setDepWarn(slug);
    else setConfirmRemove(slug);
  };

  const doRemove = (slug: string) => {
    setSelected(prev => { const n = new Set(prev); n.delete(slug); return n; });
    setConfirmRemove(null);
    setDepWarn(null);
  };

  const doAdd = (slug: string) => {
    setSelected(prev => new Set([...prev, slug]));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(Array.from(selected));
      toast({ title: "Subscription updated", description: "Module changes saved. Takes effect next billing cycle." });
    } finally {
      setSaving(false);
    }
  };

  const activeModules = data.catalog.filter(m => selected.has(m.slug));
  const cancellingModules = activeModules.filter(m => !freeSet.has(m.slug) && !new Set(data.selectedModules).has(m.slug) === false && !selected.has(m.slug));
  const availableToAdd = data.catalog.filter(m => !selected.has(m.slug) && !freeSet.has(m.slug));
  const paidActive = activeModules.filter(m => !freeSet.has(m.slug));
  const currentTotal = paidActive.reduce((s, m) => s + m.priceMonthly, 0);

  const origSelected = new Set(data.selectedModules);
  const removedModules = data.catalog.filter(m => origSelected.has(m.slug) && !selected.has(m.slug) && !freeSet.has(m.slug));
  const addedModules   = data.catalog.filter(m => !origSelected.has(m.slug) && selected.has(m.slug) && !freeSet.has(m.slug));
  const nextTotal = data.catalog.filter(m => selected.has(m.slug) && !freeSet.has(m.slug)).reduce((s, m) => s + m.priceMonthly, 0);
  const hasChanges = removedModules.length > 0 || addedModules.length > 0;

  const nextBillingDate = data.currentPeriodEnd
    ? format(parseISO(data.currentPeriodEnd), "MMM d, yyyy")
    : "your next billing date";

  return (
    <div className="space-y-5">
      {/* Pending changes banner */}
      {removedModules.length > 0 && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1 text-sm">
            <span className="font-semibold text-amber-800">{removedModules.length} module{removedModules.length > 1 ? "s" : ""} pending removal</span>
            <span className="text-amber-700"> — access continues until <strong>{nextBillingDate}</strong>. Data is preserved.</span>
          </div>
        </div>
      )}

      {/* Active modules list */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-2">Active Modules</h3>
        <Card>
          <div className="divide-y divide-border">
            {data.catalog.filter(m => freeSet.has(m.slug)).map(mod => (
              <div key={mod.slug} className="flex items-center gap-3 px-4 py-3 bg-emerald-50/40">
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-foreground">{mod.name}</span>
                </div>
                <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50 text-xs">FREE — Always included</Badge>
              </div>
            ))}
            {paidActive.map(mod => {
              const isRemoved = !selected.has(mod.slug);
              const isNew = !origSelected.has(mod.slug);
              return (
                <div key={mod.slug} className={`flex items-center gap-3 px-4 py-3 ${isRemoved ? "bg-red-50/30 opacity-60" : isNew ? "bg-blue-50/30" : ""}`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-sm font-medium ${isRemoved ? "line-through text-muted-foreground" : "text-foreground"}`}>{mod.name}</span>
                      {isRemoved && <Badge variant="destructive" className="text-xs">Removing {nextBillingDate}</Badge>}
                      {isNew && <Badge variant="secondary" className="text-xs text-blue-700 bg-blue-50 border border-blue-200">Added</Badge>}
                    </div>
                  </div>
                  <span className={`text-sm font-semibold ${isRemoved ? "text-muted-foreground" : "text-foreground"}`}>₹{mod.priceMonthly}/mo</span>
                  {isRemoved ? (
                    <Button size="sm" variant="outline" onClick={() => doAdd(mod.slug)} data-testid={`undo-remove-${mod.slug}`}>Undo</Button>
                  ) : (
                    <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-destructive" onClick={() => requestRemove(mod.slug)} data-testid={`remove-${mod.slug}`}>Remove</Button>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Add more modules */}
      {availableToAdd.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-2">Add More Modules</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {availableToAdd.map(mod => (
              <div key={mod.slug} className="flex items-center gap-3 bg-card border border-border rounded-xl px-3 py-3">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground">{mod.name}</div>
                  <div className="text-xs text-muted-foreground">₹{mod.priceMonthly}/mo</div>
                </div>
                <Button size="sm" variant="outline" onClick={() => doAdd(mod.slug)} data-testid={`add-${mod.slug}`}>
                  <Plus className="h-3 w-3 mr-1" /> Add
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Billing summary + Save */}
      <Card>
        <CardContent className="pt-4 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Current month</span>
            <span className="font-semibold">₹{data.monthlyAmount > 0 ? data.monthlyAmount.toLocaleString("en-IN") : currentTotal.toLocaleString("en-IN")}</span>
          </div>
          {hasChanges && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">From {nextBillingDate}</span>
              <span className={`font-semibold ${nextTotal < currentTotal ? "text-emerald-600" : "text-foreground"}`}>
                ₹{nextTotal.toLocaleString("en-IN")}
                {nextTotal < currentTotal && <span className="text-xs font-normal ml-1 text-emerald-600">(saves ₹{(currentTotal - nextTotal).toLocaleString("en-IN")}/mo)</span>}
              </span>
            </div>
          )}
          <Separator />
          <div className="flex gap-3">
            <Button className="flex-1" onClick={handleSave} disabled={!hasChanges || saving} data-testid="button-save-manage-modules">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {hasChanges ? "Save Changes" : "No Pending Changes"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Confirm remove dialog */}
      {confirmRemove && (() => {
        const mod = bySlug.get(confirmRemove)!;
        return (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-sm p-6 shadow-xl">
              <div className="flex items-start gap-3 mb-4">
                <div className="p-2 rounded-full bg-destructive/10"><X className="h-5 w-5 text-destructive" /></div>
                <div>
                  <h3 className="font-semibold text-foreground">Remove {mod.name}?</h3>
                  <p className="text-sm text-muted-foreground mt-1">Access continues until <strong>{nextBillingDate}</strong>. All data is preserved — you can re-add any time.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setConfirmRemove(null)}>Keep it</Button>
                <Button variant="destructive" className="flex-1" onClick={() => doRemove(confirmRemove)} data-testid="button-confirm-remove">Yes, remove</Button>
              </div>
            </Card>
          </div>
        );
      })()}

      {/* Dependency warning */}
      {depWarn && (() => {
        const mod = bySlug.get(depWarn)!;
        const deps = getDependents(depWarn);
        return (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-sm p-6 shadow-xl">
              <div className="flex items-start gap-3 mb-4">
                <div className="p-2 rounded-full bg-amber-100"><AlertTriangle className="h-5 w-5 text-amber-500" /></div>
                <div>
                  <h3 className="font-semibold text-foreground">Dependency warning</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    <strong>{mod.name}</strong> is used by {deps.map(d => d.name).join(", ")}. Removing it may affect those modules.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setDepWarn(null)}>Cancel</Button>
                <Button className="flex-1 bg-amber-500 hover:bg-amber-600 text-white" onClick={() => { setDepWarn(null); setConfirmRemove(depWarn); }}>Remove anyway</Button>
              </div>
            </Card>
          </div>
        );
      })()}
    </div>
  );
}

// ─── Auto-Deduct Tab ──────────────────────────────────────────────────────────

function AutoDeductTab({ data }: { data: ModuleData }) {
  const nextBilling = data.currentPeriodEnd
    ? format(parseISO(data.currentPeriodEnd), "MMM d, yyyy")
    : "—";
  const monthlyAmount = data.monthlyAmount;

  const steps = [
    {
      timing: "3 days before",
      icon: Bell,
      color: "bg-blue-100 text-blue-600",
      title: "Advance notice sent",
      desc: "You receive an email + WhatsApp reminder showing the exact amount to be deducted, with a breakdown of active modules.",
    },
    {
      timing: "Billing day",
      icon: CreditCard,
      color: "bg-indigo-100 text-indigo-600",
      title: "Auto-charge via Razorpay",
      desc: "Razorpay securely charges your saved card on the 1st of each month at midnight IST. No manual action needed.",
    },
    {
      timing: "Immediately after",
      icon: CheckCircle2,
      color: "bg-emerald-100 text-emerald-600",
      title: "GST invoice issued",
      desc: "A GST-compliant invoice with your company GSTIN is generated and emailed. Download anytime from Billing History.",
    },
    {
      timing: "If payment fails",
      icon: RefreshCw,
      color: "bg-amber-100 text-amber-600",
      title: "Automatic retry (3 attempts)",
      desc: "If your card is declined, the system retries at 6h, 24h, and 72h. You are notified after each attempt. Access stays active during retries.",
    },
    {
      timing: "After 3 failures",
      icon: AlertCircle,
      color: "bg-red-100 text-red-600",
      title: "7-day grace period",
      desc: "If all retries fail, a 7-day grace period begins. Data and access are fully preserved. Update your payment method to avoid suspension.",
    },
  ];

  return (
    <div className="space-y-5">
      {/* Next bill card */}
      <Card>
        <CardContent className="pt-5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">Next auto-deduct</p>
              <p className="text-3xl font-bold text-foreground">
                ₹{monthlyAmount > 0 ? monthlyAmount.toLocaleString("en-IN") : "—"}
                <span className="text-base font-normal text-muted-foreground">/mo</span>
              </p>
              <p className="text-sm text-muted-foreground mt-1">Scheduled for <strong>{nextBilling}</strong> at midnight IST</p>
            </div>
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-sm font-semibold text-emerald-700">Auto-pay active</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* How it works */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-4">How auto-deduct works</h3>
        <div className="space-y-0">
          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <div key={i} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className={`p-2 rounded-xl ${step.color} flex-shrink-0`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  {i < steps.length - 1 && <div className="w-0.5 flex-1 bg-border mt-1 mb-1" />}
                </div>
                <div className="flex-1 pb-5">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-0.5">{step.timing}</p>
                  <p className="text-sm font-semibold text-foreground">{step.title}</p>
                  <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">{step.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Payment method */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Payment Method</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3 bg-muted/50 rounded-xl p-3 border border-border">
              <CreditCard className="h-5 w-5 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">Razorpay</p>
                <p className="text-xs text-muted-foreground">Manage cards via Razorpay portal</p>
              </div>
            </div>
            <div className="flex items-start gap-2 text-xs text-muted-foreground">
              <Shield className="h-3.5 w-3.5 flex-shrink-0 mt-0.5 text-blue-500" />
              <span>PCI-DSS compliant. Card details are never stored on our servers.</span>
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Billing Notifications</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { icon: Mail,          label: "Email reminders",       sub: "3 days before billing" },
              { icon: MessageSquare, label: "WhatsApp alerts",        sub: "Charge confirmation + receipt" },
              { icon: AlertCircle,   label: "Failed payment alerts",  sub: "Immediate + retry schedule" },
            ].map((item, i) => {
              const Icon = item.icon;
              return (
                <div key={i} className="flex items-center gap-3">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-sm text-foreground">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.sub}</p>
                  </div>
                  <div className="h-5 w-9 rounded-full bg-primary flex items-center justify-end px-0.5">
                    <div className="h-4 w-4 bg-white rounded-full shadow-sm" />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <div className="flex items-start gap-2 bg-muted/50 border border-border rounded-xl px-4 py-3 text-sm text-muted-foreground">
        <Info className="h-4 w-4 flex-shrink-0 mt-0.5 text-blue-500" />
        <span>To update your saved card or billing address, contact <strong>billing@swacherp.com</strong> or use the Razorpay payment portal.</span>
      </div>
    </div>
  );
}

// ─── Overview Tab (unchanged) ─────────────────────────────────────────────────

function OverviewTab({ data }: { data: ModuleData }) {
  const freeSet = new Set(data.freeModules);
  const activeCount = (data.selectedModules.filter(s => !freeSet.has(s))).length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground mb-1">Status</p>
            <Badge variant={data.status === "active" ? "default" : "secondary"} className="gap-1">
              <CheckCircle2 className="h-3 w-3" />
              {data.status ?? "Active"}
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground mb-1">Monthly Cost</p>
            <p className="text-xl font-bold">₹{data.monthlyAmount > 0 ? data.monthlyAmount.toLocaleString("en-IN") : "0"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground mb-1">Paid Modules</p>
            <p className="text-xl font-bold">{activeCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground mb-1">Next Billing</p>
            <p className="text-sm font-semibold">{formatDate(data.currentPeriodEnd)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Active Modules</CardTitle>
          <CardDescription>Modules currently enabled for your account</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {data.catalog.filter(m => data.selectedModules.includes(m.slug)).map(mod => (
              <div key={mod.slug} className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span>{mod.name}</span>
                {mod.free && <span className="text-xs text-emerald-600 font-medium">(free)</span>}
                {!mod.free && <span className="ml-auto text-xs text-muted-foreground">₹{mod.priceMonthly}/mo</span>}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Billing History Tab ──────────────────────────────────────────────────────

function HistoryTab() {
  const { data: events = [], isLoading } = useQuery<BillingEvent[]>({
    queryKey: ["/api/billing/history"],
  });

  if (isLoading) return <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2"><History className="h-4 w-4" /> Billing History</CardTitle>
        <CardDescription>All plan changes, module updates, and payment events</CardDescription>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No billing history yet.</p>
        ) : (
          <div className="space-y-3">
            {events.map(event => {
              const cfg = EVENT_LABELS[event.event_type] ?? { label: event.event_type, icon: <History className="h-3.5 w-3.5" />, color: "text-muted-foreground" };
              return (
                <div key={event.id} className="flex items-start gap-3 py-2 border-b border-border last:border-0" data-testid={`billing-event-${event.id}`}>
                  <div className={`mt-0.5 ${cfg.color}`}>{cfg.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-sm font-medium ${cfg.color}`}>{cfg.label}</span>
                      {event.amount > 0 && (
                        <Badge variant="outline" className="text-xs">{formatRupees(event.amount)}</Badge>
                      )}
                    </div>
                    {event.notes && <p className="text-xs text-muted-foreground mt-0.5">{event.notes}</p>}
                    <p className="text-xs text-muted-foreground mt-1">{formatDate(event.created_at)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Root Component ───────────────────────────────────────────────────────────

export default function SubscriptionManagement() {
  const { toast } = useToast();

  const { data, isLoading, refetch } = useQuery<ModuleData>({
    queryKey: ["/api/billing/selected-modules"],
  });

  const saveMutation = useMutation({
    mutationFn: (selectedModules: string[]) =>
      apiRequest("POST", "/api/billing/selected-modules", { selectedModules }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/billing/selected-modules"] });
      queryClient.invalidateQueries({ queryKey: ["/api/billing/history"] });
      refetch();
    },
    onError: (err: any) => {
      toast({ title: "Failed to save", description: err.message, variant: "destructive" });
    },
  });

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="overview"  data-testid="tab-sub-overview">Overview</TabsTrigger>
          <TabsTrigger value="marketplace" data-testid="tab-sub-marketplace">Module Marketplace</TabsTrigger>
          <TabsTrigger value="manage"    data-testid="tab-sub-manage">Manage Modules</TabsTrigger>
          <TabsTrigger value="billing"   data-testid="tab-sub-billing">Auto-Deduct</TabsTrigger>
          <TabsTrigger value="history"   data-testid="tab-sub-history">Billing History</TabsTrigger>
        </TabsList>

        <TabsContent value="overview"     className="mt-4"><OverviewTab data={data} /></TabsContent>
        <TabsContent value="marketplace"  className="mt-4"><MarketplaceTab data={data} onSave={saveMutation.mutateAsync} /></TabsContent>
        <TabsContent value="manage"       className="mt-4"><ManageModulesTab data={data} onSave={saveMutation.mutateAsync} /></TabsContent>
        <TabsContent value="billing"      className="mt-4"><AutoDeductTab data={data} /></TabsContent>
        <TabsContent value="history"      className="mt-4"><HistoryTab /></TabsContent>
      </Tabs>
    </div>
  );
}
