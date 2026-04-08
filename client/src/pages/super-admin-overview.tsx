import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Building2, Users, TrendingUp, AlertCircle, CheckCircle2,
  Clock, Ban, CreditCard, Package, RefreshCw, Loader2,
} from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import SuperAdminLayout from "./super-admin-layout";

interface Tenant {
  id: number;
  name: string;
  slug: string;
  status: string;
  plan: string;
  maxUsers: number;
  billingEmail: string | null;
  createdAt: string;
  isSuperAdmin: boolean;
}

interface SubscriptionPlan {
  id: number;
  name: string;
  slug: string;
  priceMonthly: number;
  isActive: boolean;
}

interface PlansData {
  plans: SubscriptionPlan[];
}

export default function SuperAdminOverview() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const { data: tenants = [], isLoading: tenantsLoading, refetch } = useQuery<Tenant[]>({
    queryKey: ["/api/admin/tenants"],
  });

  const { data: plansData } = useQuery<PlansData>({
    queryKey: ["/api/admin/subscription-plans"],
  });

  const seedDemoMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/seed-demo", {});
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tenants"] });
      toast({ title: data.created ? "Demo tenant created" : "Demo tenant already exists", description: data.message });
    },
    onError: (err: any) => toast({ title: "Seed failed", description: err.message, variant: "destructive" }),
  });

  const realTenants = tenants.filter((t) => !t.isSuperAdmin);
  const stats = {
    total:     realTenants.length,
    active:    realTenants.filter((t) => t.status === "active").length,
    trial:     realTenants.filter((t) => t.status === "trial").length,
    suspended: realTenants.filter((t) => t.status === "suspended").length,
    expired:   realTenants.filter((t) => t.status === "expired").length,
  };

  const planBreakdown = ["trial", "basic", "professional", "enterprise"].map((slug) => ({
    slug,
    count: realTenants.filter((t) => t.plan === slug).length,
  }));

  const recentTenants = [...realTenants]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 6);

  const STATUS_COLORS: Record<string, string> = {
    active:    "text-green-600",
    trial:     "text-amber-600",
    suspended: "text-red-500",
    expired:   "text-muted-foreground",
  };

  const STATUS_ICONS: Record<string, React.ElementType> = {
    active:    CheckCircle2,
    trial:     Clock,
    suspended: Ban,
    expired:   AlertCircle,
  };

  return (
    <SuperAdminLayout
      title="Overview"
      subtitle="Platform health and key metrics at a glance"
      actions={
        <>
          <Button variant="outline" size="default" onClick={() => refetch()} data-testid="button-refresh-overview">
            <RefreshCw className="h-4 w-4 mr-2" /> Refresh
          </Button>
          <Button variant="outline" size="default" onClick={() => seedDemoMutation.mutate()} disabled={seedDemoMutation.isPending} data-testid="button-seed-demo">
            {seedDemoMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Seed Demo Tenant
          </Button>
        </>
      }
    >
      {tenantsLoading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* ── KPI cards ── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "Total Tenants", value: stats.total, icon: Building2, color: "text-primary" },
              { label: "Active",        value: stats.active, icon: CheckCircle2, color: "text-green-600" },
              { label: "On Trial",      value: stats.trial,  icon: Clock, color: "text-amber-600" },
              { label: "Suspended",     value: stats.suspended + stats.expired, icon: Ban, color: "text-red-500" },
            ].map(({ label, value, icon: Icon, color }) => (
              <Card key={label}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-xs text-muted-foreground">{label}</p>
                      <p className="text-3xl font-bold mt-0.5">{value}</p>
                    </div>
                    <Icon className={`h-8 w-8 ${color} opacity-70`} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* ── Plan breakdown ── */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Package className="h-4 w-4" /> Plan Distribution
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {planBreakdown.map(({ slug, count }) => (
                  <div key={slug} className="flex items-center gap-3">
                    <div className="w-24 text-sm capitalize text-muted-foreground">{slug}</div>
                    <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                      <div
                        className="h-2 rounded-full bg-primary"
                        style={{ width: stats.total > 0 ? `${(count / stats.total) * 100}%` : "0%" }}
                      />
                    </div>
                    <div className="w-8 text-sm font-medium text-right">{count}</div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* ── Recent signups ── */}
            <Card>
              <CardHeader className="pb-3 flex flex-row items-center justify-between gap-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Users className="h-4 w-4" /> Recent Tenants
                </CardTitle>
                <Button variant="ghost" size="sm" className="text-xs" onClick={() => setLocation("/super-admin/tenants")}>
                  View all
                </Button>
              </CardHeader>
              <CardContent className="space-y-2">
                {recentTenants.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No tenants yet</p>
                ) : (
                  recentTenants.map((t) => {
                    const Icon = STATUS_ICONS[t.status] ?? AlertCircle;
                    return (
                      <div key={t.id} className="flex items-center gap-3 py-1" data-testid={`recent-tenant-${t.id}`}>
                        <Icon className={`h-3.5 w-3.5 shrink-0 ${STATUS_COLORS[t.status] ?? "text-muted-foreground"}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{t.name}</p>
                          <p className="text-xs text-muted-foreground">{t.slug}</p>
                        </div>
                        <Badge variant="outline" className="text-xs capitalize shrink-0">{t.plan}</Badge>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </div>

          {/* ── Quick actions ── */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              <Button variant="outline" onClick={() => setLocation("/super-admin/tenants")} data-testid="button-go-tenants">
                <Building2 className="h-4 w-4 mr-2" /> Manage Tenants
              </Button>
              <Button variant="outline" onClick={() => setLocation("/super-admin/billing")} data-testid="button-go-billing">
                <CreditCard className="h-4 w-4 mr-2" /> View Billing
              </Button>
              <Button variant="outline" onClick={() => setLocation("/super-admin/plans")} data-testid="button-go-plans">
                <Package className="h-4 w-4 mr-2" /> Manage Plans
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </SuperAdminLayout>
  );
}
