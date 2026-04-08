import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Building2,
  Users,
  MoreVertical,
  Search,
  RefreshCw,
  ShieldAlert,
  CheckCircle2,
  Clock,
  XCircle,
  Loader2,
  FlaskConical,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

type Tenant = {
  id: number;
  name: string;
  slug: string;
  plan: string;
  status: string;
  trialEndsAt: string | null;
  maxUsers: number;
  billingEmail: string | null;
  contactName: string | null;
  contactPhone: string | null;
  isSuperAdmin: boolean;
  createdAt: string;
  userCount: number;
};

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }> = {
  active: { label: "Active", variant: "default", icon: <CheckCircle2 className="h-3 w-3" /> },
  trial: { label: "Trial", variant: "secondary", icon: <Clock className="h-3 w-3" /> },
  suspended: { label: "Suspended", variant: "destructive", icon: <XCircle className="h-3 w-3" /> },
  expired: { label: "Expired", variant: "outline", icon: <XCircle className="h-3 w-3" /> },
};

const PLAN_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  trial: { label: "Trial", variant: "secondary" },
  basic: { label: "Basic", variant: "outline" },
  professional: { label: "Professional", variant: "default" },
  enterprise: { label: "Enterprise", variant: "default" },
};

export default function SuperAdminTenants() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [editTenant, setEditTenant] = useState<Tenant | null>(null);
  const [editForm, setEditForm] = useState({ status: "", plan: "", maxUsers: "" });

  const { data: tenants = [], isLoading, refetch } = useQuery<Tenant[]>({
    queryKey: ["/api/admin/tenants"],
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
    onError: (err: any) => {
      toast({ title: "Seed failed", description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: Record<string, any> }) => {
      const res = await apiRequest("PATCH", `/api/admin/tenants/${id}/status`, updates);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tenants"] });
      toast({ title: "Tenant updated successfully" });
      setEditTenant(null);
    },
    onError: (err: any) => {
      toast({ title: "Update failed", description: err.message, variant: "destructive" });
    },
  });

  const changePlanMutation = useMutation({
    mutationFn: async ({ tenantId, toPlan, status, billingCycle }: { tenantId: number; toPlan: string; status: string; billingCycle: string }) => {
      const res = await apiRequest("PATCH", `/api/admin/subscriptions/${tenantId}/change-plan`, { toPlan, status, billingCycle });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tenants"] });
      toast({ title: "Plan & subscription updated successfully" });
      setEditTenant(null);
    },
    onError: (err: any) => {
      toast({ title: "Update failed", description: err.message, variant: "destructive" });
    },
  });

  const openEdit = (tenant: Tenant) => {
    setEditTenant(tenant);
    setEditForm({ status: tenant.status, plan: tenant.plan, maxUsers: String(tenant.maxUsers) });
  };

  const handleSaveEdit = () => {
    if (!editTenant) return;
    const planChanged = editForm.plan !== editTenant.plan;
    const maxUsersInt = parseInt(editForm.maxUsers) || editTenant.maxUsers;

    if (planChanged) {
      // Use the new subscription-aware endpoint for plan changes
      changePlanMutation.mutate({
        tenantId: editTenant.id,
        toPlan: editForm.plan,
        status: editForm.status,
        billingCycle: editForm.plan === 'trial' ? 'trial' : 'monthly',
      });
      // Also update maxUsers separately if changed
      if (maxUsersInt !== editTenant.maxUsers) {
        updateMutation.mutate({ id: editTenant.id, updates: { maxUsers: maxUsersInt } });
      }
    } else {
      updateMutation.mutate({
        id: editTenant.id,
        updates: { status: editForm.status, maxUsers: maxUsersInt },
      });
    }
  };

  const quickStatus = (tenant: Tenant, status: string) => {
    updateMutation.mutate({ id: tenant.id, updates: { status } });
  };

  const isPending = updateMutation.isPending || changePlanMutation.isPending;

  const filtered = tenants.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.slug.toLowerCase().includes(search.toLowerCase()) ||
      (t.billingEmail ?? "").toLowerCase().includes(search.toLowerCase())
  );

  // Summary stats
  const stats = {
    total: tenants.length,
    active: tenants.filter((t) => t.status === "active").length,
    trial: tenants.filter((t) => t.status === "trial").length,
    suspended: tenants.filter((t) => t.status === "suspended").length,
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldAlert className="h-6 w-6 text-primary" />
            Super Admin — Tenants
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Manage all company accounts on this platform
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="default"
            onClick={() => seedDemoMutation.mutate()}
            disabled={seedDemoMutation.isPending}
            data-testid="button-seed-demo"
          >
            {seedDemoMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <FlaskConical className="h-4 w-4 mr-2" />
            )}
            Seed Demo Tenant
          </Button>
          <Button variant="outline" size="default" onClick={() => refetch()} data-testid="button-refresh-tenants">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Companies", value: stats.total, icon: <Building2 className="h-5 w-5" /> },
          { label: "Active", value: stats.active, icon: <CheckCircle2 className="h-5 w-5 text-green-600" /> },
          { label: "Trial", value: stats.trial, icon: <Clock className="h-5 w-5 text-amber-500" /> },
          { label: "Suspended", value: stats.suspended, icon: <XCircle className="h-5 w-5 text-destructive" /> },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="text-2xl font-bold">{s.value}</p>
              </div>
              {s.icon}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search + Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center gap-3">
            <CardTitle className="text-base">All Companies</CardTitle>
            <div className="ml-auto relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search companies..."
                className="pl-9 w-64"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                data-testid="input-search-tenants"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {search ? "No companies match your search." : "No companies registered yet."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Users</TableHead>
                    <TableHead>Trial Ends</TableHead>
                    <TableHead>Registered</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((tenant) => {
                    const statusConf = STATUS_CONFIG[tenant.status] ?? STATUS_CONFIG.trial;
                    const planConf = PLAN_CONFIG[tenant.plan] ?? PLAN_CONFIG.trial;
                    return (
                      <TableRow key={tenant.id} data-testid={`row-tenant-${tenant.id}`}>
                        <TableCell>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{tenant.name}</span>
                              {tenant.isSuperAdmin && (
                                <Badge variant="secondary" className="text-xs">
                                  Super Admin
                                </Badge>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              <code>{tenant.slug}</code>
                              {tenant.billingEmail && <span className="ml-2">{tenant.billingEmail}</span>}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={planConf.variant} className="capitalize">
                            {planConf.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusConf.variant} className="flex items-center gap-1 w-fit capitalize">
                            {statusConf.icon}
                            {statusConf.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <Users className="h-3.5 w-3.5 text-muted-foreground" />
                            <span>{tenant.userCount}</span>
                            <span className="text-muted-foreground">/ {tenant.maxUsers}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {tenant.trialEndsAt
                            ? format(new Date(tenant.trialEndsAt), "dd MMM yyyy")
                            : "—"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {tenant.createdAt
                            ? format(new Date(tenant.createdAt), "dd MMM yyyy")
                            : "—"}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" data-testid={`button-tenant-menu-${tenant.id}`}>
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEdit(tenant)}>
                                Edit Tenant
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {tenant.status !== "active" && (
                                <DropdownMenuItem
                                  onClick={() => quickStatus(tenant, "active")}
                                  className="text-green-600"
                                >
                                  Set Active
                                </DropdownMenuItem>
                              )}
                              {tenant.status !== "suspended" && (
                                <DropdownMenuItem
                                  onClick={() => quickStatus(tenant, "suspended")}
                                  className="text-destructive"
                                >
                                  Suspend
                                </DropdownMenuItem>
                              )}
                              {tenant.status !== "trial" && (
                                <DropdownMenuItem onClick={() => quickStatus(tenant, "trial")}>
                                  Reset to Trial
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editTenant} onOpenChange={(open) => !open && setEditTenant(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Tenant — {editTenant?.name}</DialogTitle>
            <DialogDescription>
              Change plan, status, or user limits for this company.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={editForm.status} onValueChange={(v) => setEditForm((f) => ({ ...f, status: v }))}>
                <SelectTrigger data-testid="select-tenant-status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="trial">Trial</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Plan</Label>
              <Select value={editForm.plan} onValueChange={(v) => setEditForm((f) => ({ ...f, plan: v }))}>
                <SelectTrigger data-testid="select-tenant-plan">
                  <SelectValue placeholder="Select plan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="trial">Trial</SelectItem>
                  <SelectItem value="basic">Basic</SelectItem>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Max Users</Label>
              <Input
                type="number"
                min={1}
                value={editForm.maxUsers}
                onChange={(e) => setEditForm((f) => ({ ...f, maxUsers: e.target.value }))}
                data-testid="input-max-users"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTenant(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={isPending} data-testid="button-save-tenant">
              {isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
