import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import { Loader2, Package, IndianRupee, CheckCircle2, X, Trash2, BadgeCheck } from "lucide-react";
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

interface TenantModuleData {
  selectedModules: string[];
  planModules: string[];
  monthlyAmount: number;
  planSlug: string | null;
  catalog: ModuleDefinition[];
  freeModules: string[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, { badge: string; badgeText: string }> = {
  Core:       { badge: "bg-emerald-100 dark:bg-emerald-900/40", badgeText: "text-emerald-700 dark:text-emerald-300" },
  Finance:    { badge: "bg-blue-100 dark:bg-blue-900/40",       badgeText: "text-blue-700 dark:text-blue-300" },
  Inventory:  { badge: "bg-orange-100 dark:bg-orange-900/40",   badgeText: "text-orange-700 dark:text-orange-300" },
  Production: { badge: "bg-purple-100 dark:bg-purple-900/40",   badgeText: "text-purple-700 dark:text-purple-300" },
  HR:         { badge: "bg-rose-100 dark:bg-rose-900/40",       badgeText: "text-rose-700 dark:text-rose-300" },
  Sales:      { badge: "bg-teal-100 dark:bg-teal-900/40",       badgeText: "text-teal-700 dark:text-teal-300" },
  Industry:   { badge: "bg-indigo-100 dark:bg-indigo-900/40",   badgeText: "text-indigo-700 dark:text-indigo-300" },
};

function groupByCategory(catalog: ModuleDefinition[]) {
  const map = new Map<string, ModuleDefinition[]>();
  for (const m of catalog) {
    if (!map.has(m.category)) map.set(m.category, []);
    map.get(m.category)!.push(m);
  }
  return map;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ModuleMarketplaceDialog({
  tenantId,
  tenantName,
  open,
  onClose,
}: {
  tenantId: number;
  tenantName: string;
  open: boolean;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [draft, setDraft] = useState<Set<string> | null>(null);
  const [saving, setSaving] = useState(false);

  const { data, isLoading } = useQuery<TenantModuleData>({
    queryKey: ["/api/admin/tenants", tenantId, "modules"],
    queryFn: async () => {
      const res = await fetch(`/api/admin/tenants/${tenantId}/modules`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load modules");
      return res.json();
    },
    enabled: open && tenantId > 0,
  });

  const freeSet  = new Set(data?.freeModules ?? []);
  const planSet  = new Set(data?.planModules ?? []);
  // If the tenant has an explicit saved selection, use it directly.
  // Otherwise (first time / empty DB), seed from plan defaults.
  const effectiveActive: Set<string> = (data?.selectedModules?.length ?? 0) > 0
    ? new Set(data!.selectedModules)
    : new Set(data?.planModules ?? []);
  const activeDraft: Set<string> = draft ?? new Set(effectiveActive);
  const grouped  = groupByCategory(data?.catalog ?? []);

  const toggle = (slug: string) => {
    // Free modules are always on — can never be toggled
    if (freeSet.has(slug)) return;
    setDraft(prev => {
      const base = prev ?? new Set(effectiveActive);
      const next = new Set(base);
      next.has(slug) ? next.delete(slug) : next.add(slug);
      return next;
    });
  };

  // Only add-on modules (not free, not plan-included) cost extra
  const draftTotal = (data?.catalog ?? [])
    .filter(m => activeDraft.has(m.slug) && m.priceMonthly > 0 && !freeSet.has(m.slug) && !planSet.has(m.slug))
    .reduce((s, m) => s + m.priceMonthly, 0);

  const hasChanges = (() => {
    if (!draft || !data) return false;
    const orig = new Set(effectiveActive);
    for (const s of draft) if (!orig.has(s)) return true;
    for (const s of orig) if (!draft.has(s)) return true;
    return false;
  })();

  const handleClose = () => { setDraft(null); onClose(); };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await apiRequest("POST", `/api/admin/tenants/${tenantId}/modules`, {
        selectedModules: Array.from(activeDraft),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.message ?? "Save failed");
      }
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tenants", tenantId, "modules"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/subscriptions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/billing-events"] });
      toast({ title: "Modules updated", description: `Saved module selection for ${tenantName}` });
      handleClose();
    } catch (err: any) {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      {/* overflow-hidden overrides the default overflow-y-auto on DialogContent so the inner div scrolls */}
      <DialogContent
        className="max-w-3xl p-0 overflow-hidden"
        style={{ display: "flex", flexDirection: "column", height: "min(90dvh, 820px)" }}
      >
        <DialogHeader className="px-6 pt-5 pb-3 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Package className="h-4 w-4 text-primary" />
            Module Marketplace — {tenantName}
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-0.5">
            Toggle any module on or off for this tenant. <span className="font-semibold text-blue-600 dark:text-blue-400">Plan default</span> modules are included in their plan — you can still disable them individually.
          </p>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-20 flex-1">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="flex flex-1 min-h-0 overflow-hidden">
            {/* ── Module grid — scrollable ── */}
            <div
              className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-5 outline-none"
              tabIndex={0}
            >
              {Array.from(grouped.entries()).map(([cat, modules]) => {
                const c = CATEGORY_COLORS[cat] ?? CATEGORY_COLORS.Core;
                return (
                  <div key={cat}>
                    <div className="flex items-center gap-2 mb-2.5">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${c.badge} ${c.badgeText}`}>
                        {cat}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {modules.map(mod => {
                        const isFree      = freeSet.has(mod.slug);
                        const isInPlan    = planSet.has(mod.slug);
                        const isOn        = activeDraft.has(mod.slug);
                        // Only free modules are truly locked (always on, can't be removed)
                        const isLocked    = isFree;
                        // Plan modules that have been manually turned OFF by super-admin
                        const isOverridden = isInPlan && !isOn;

                        const card = (
                          <button
                            onClick={() => toggle(mod.slug)}
                            data-testid={`module-toggle-${mod.slug}`}
                            disabled={isLocked}
                            className={`w-full text-left p-3 rounded-xl border-2 transition-all ${
                              isFree
                                ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 cursor-not-allowed opacity-80"
                                : isOn
                                  ? "bg-white dark:bg-card border-primary ring-2 ring-primary/10 shadow-sm cursor-pointer"
                                  : "bg-card border-border hover:border-primary/40 cursor-pointer"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-sm font-semibold text-foreground">
                                    {mod.name}
                                  </span>
                                  {isFree && (
                                    <span className="text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded-full">FREE</span>
                                  )}
                                  {isInPlan && !isFree && (
                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                                      isOverridden
                                        ? "bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300"
                                        : "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300"
                                    }`}>
                                      {isOverridden ? "Plan (disabled)" : "Plan default"}
                                    </span>
                                  )}
                                  {mod.popular && !isFree && !isInPlan && (
                                    <span className="text-[10px] font-bold bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded-full">
                                      Popular
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                                  {mod.description}
                                </p>
                              </div>
                              <div className="flex-shrink-0 flex flex-col items-end gap-1.5">
                                {isFree ? (
                                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">FREE</span>
                                ) : isInPlan ? (
                                  <div className="flex items-center gap-0.5">
                                    <BadgeCheck className="h-3 w-3 text-blue-500" />
                                    <span className="text-xs font-bold text-blue-600 dark:text-blue-400">Included</span>
                                  </div>
                                ) : (
                                  <span className="text-sm font-bold text-foreground">
                                    ₹{mod.priceMonthly}
                                    <span className="text-xs font-normal text-muted-foreground">/mo</span>
                                  </span>
                                )}
                                <div className={`h-5 w-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                                  isFree ? "bg-emerald-500" :
                                  isOn   ? "bg-primary" :
                                           "border-2 border-muted-foreground/30"
                                }`}>
                                  {(isFree || isOn) && <CheckCircle2 className="h-3 w-3 text-white" />}
                                </div>
                              </div>
                            </div>
                          </button>
                        );

                        return isFree ? (
                          <TooltipProvider key={mod.slug} delayDuration={200}>
                            <Tooltip>
                              <TooltipTrigger asChild>{card}</TooltipTrigger>
                              <TooltipContent side="top" className="max-w-xs text-xs">
                                Always enabled — free for all plans
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ) : card;
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── Sticky billing summary ── */}
            <div className="w-52 shrink-0 border-l bg-muted/20 px-4 py-4 flex flex-col gap-3 overflow-y-auto">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Billing Summary</p>
              <div className="space-y-1 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">Plan</span>
                  <span className="font-medium capitalize">{data?.planSlug ?? "—"}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">Add-ons</span>
                  <span className="font-bold text-primary flex items-center gap-0.5">
                    <IndianRupee className="h-3 w-3" />{draftTotal.toLocaleString("en-IN")}/mo
                  </span>
                </div>
              </div>
              <Separator />
              <div className="space-y-1 flex-1">
                <div className="flex items-center justify-between gap-1 mb-1">
                  <p className="text-xs font-medium text-muted-foreground">Active add-ons</p>
                  {(data?.catalog ?? []).filter(m => activeDraft.has(m.slug) && !freeSet.has(m.slug) && !planSet.has(m.slug)).length > 0 && (
                    <button
                      onClick={() => {
                        setDraft(prev => {
                          const base = prev ?? new Set(data?.selectedModules ?? []);
                          const next = new Set<string>();
                          for (const s of base) {
                            if (freeSet.has(s) || planSet.has(s)) next.add(s);
                          }
                          return next;
                        });
                      }}
                      className="text-[10px] text-destructive/70 hover:text-destructive flex items-center gap-0.5"
                      data-testid="button-clear-all-addons"
                      title="Remove all paid add-ons"
                    >
                      <Trash2 className="h-2.5 w-2.5" /> Clear all
                    </button>
                  )}
                </div>
                <div className="space-y-1">
                  {(data?.catalog ?? [])
                    .filter(m => activeDraft.has(m.slug) && !freeSet.has(m.slug) && !planSet.has(m.slug))
                    .map(m => (
                      <div key={m.slug} className="flex items-center justify-between gap-1 text-xs">
                        <span className="truncate">{m.name}</span>
                        <button
                          onClick={() => toggle(m.slug)}
                          className="shrink-0 text-muted-foreground hover:text-destructive"
                          data-testid={`remove-module-${m.slug}`}
                          title="Remove module"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))
                  }
                  {(data?.catalog ?? [])
                    .filter(m => activeDraft.has(m.slug) && !freeSet.has(m.slug) && !planSet.has(m.slug))
                    .length === 0 && (
                    <p className="text-xs text-muted-foreground italic">No paid add-ons selected</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="px-6 py-3 border-t shrink-0 gap-2">
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button
            onClick={handleSave}
            disabled={!hasChanges || saving}
            data-testid="button-save-modules"
          >
            {saving
              ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              : <Package className="h-4 w-4 mr-2" />}
            Save Modules
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
