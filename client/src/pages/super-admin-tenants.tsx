import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Building2, Users, MoreVertical, Search, RefreshCw, ShieldAlert,
  CheckCircle2, Clock, XCircle, Loader2, FlaskConical, CreditCard,
  Eye, Trash2, AlertTriangle, Archive, Download, Database, CalendarClock,
  HardDrive, LogOut, Plus, ScrollText, AlertCircle, Shield, X, ImageIcon, Upload,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { format } from "date-fns";
import SuperAdminLayout from "./super-admin-layout";

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
  isInternal: boolean;
  createdAt: string;
  userCount: number;
  logoUrl: string | null;
};

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }> = {
  active:    { label: "Active",    variant: "default",     icon: <CheckCircle2 className="h-3 w-3" /> },
  trial:     { label: "Trial",     variant: "secondary",   icon: <Clock className="h-3 w-3" /> },
  suspended: { label: "Suspended", variant: "destructive", icon: <XCircle className="h-3 w-3" /> },
  expired:   { label: "Expired",   variant: "outline",     icon: <XCircle className="h-3 w-3" /> },
  deleted:   { label: "Deleted",   variant: "outline",     icon: <XCircle className="h-3 w-3" /> },
};

const PLAN_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  trial:        { label: "Trial",        variant: "secondary" },
  basic:        { label: "Basic",        variant: "outline" },
  professional: { label: "Professional", variant: "default" },
  enterprise:   { label: "Enterprise",   variant: "default" },
};

interface DeletionAuditRecord {
  id: number;
  tenantId: number;
  tenantName: string;
  tenantSlug: string;
  ownerEmail: string | null;
  deletedAt: string;
  rowsDeleted: Record<string, number> | null;
  exportUrl: string | null;
  deletedBy: string | null;
  reason: string | null;
}

export default function SuperAdminTenants() {
  const { toast } = useToast();
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [editTenant, setEditTenant]     = useState<Tenant | null>(null);
  const [editForm, setEditForm]         = useState({ status: "", plan: "", maxUsers: "" });
  const [deleteTenant, setDeleteTenant] = useState<Tenant | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleteReason, setDeleteReason]   = useState("");
  const [backupTenant, setBackupTenant]   = useState<Tenant | null>(null);
  const [corsOriginsTenant, setCorsOriginsTenant] = useState<Tenant | null>(null);
  const [corsOriginsList, setCorsOriginsList] = useState<string[]>([]);
  const [corsNewOrigin, setCorsNewOrigin] = useState("");
  const [logoTenant, setLogoTenant] = useState<Tenant | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const logoFileRef = useRef<HTMLInputElement>(null);
  const [showCreateTenant, setShowCreateTenant] = useState(false);
  const [showDeletionAudit, setShowDeletionAudit] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "", slug: "", plan: "trial", adminUsername: "", adminPassword: "",
    adminEmail: "", maxUsers: "5", trialDays: "14",
  });

  const { data: tenants = [], isLoading, isError, refetch } = useQuery<Tenant[]>({
    queryKey: ["/api/admin/tenants"],
  });

  const { data: plansData } = useQuery<{ plans: { id: number; name: string; slug: string; isActive: boolean; displayOrder: number }[] }>({
    queryKey: ["/api/admin/subscription-plans"],
  });
  const allPlans = plansData?.plans ?? [];

  const { data: deletionAuditRecords = [], isLoading: auditLoading } = useQuery<DeletionAuditRecord[]>({
    queryKey: ["/api/admin/deletion-audit"],
    enabled: showDeletionAudit,
  });

  const createTenantMutation = useMutation({
    mutationFn: async (payload: typeof createForm) => {
      const res = await apiRequest("POST", "/api/admin/tenants", payload);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message ?? "Failed to create tenant");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tenants"] });
      toast({ title: "Tenant created", description: data.message });
      setShowCreateTenant(false);
      setCreateForm({ name: "", slug: "", plan: "trial", adminUsername: "", adminPassword: "", adminEmail: "", maxUsers: "5", trialDays: "14" });
    },
    onError: (err: any) => toast({ title: "Creation failed", description: err.message, variant: "destructive" }),
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

  const impersonateMutation = useMutation({
    mutationFn: async (tenantId: number) => {
      const res = await apiRequest("POST", `/api/admin/tenants/${tenantId}/impersonate`, {});
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: data.message, description: "Reload the page to see this tenant's data. Use 'Stop Impersonation' in super-admin to revert." });
      // Reload to apply the new tenantId session
      setTimeout(() => window.location.href = "/", 1500);
    },
    onError: (err: any) => {
      toast({ title: "Impersonation failed", description: err.message, variant: "destructive" });
    },
  });

  const manualBackupMutation = useMutation({
    mutationFn: async (tenantId: number) => {
      const res = await apiRequest("POST", `/api/admin/tenants/${tenantId}/backup`, {});
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Backup created", description: `File: ${data.filename}` });
    },
    onError: (err: any) => {
      toast({ title: "Backup failed", description: err.message, variant: "destructive" });
    },
  });

  const saveCorsOriginsMutation = useMutation({
    mutationFn: async ({ tenantId, origins }: { tenantId: number; origins: string[] }) => {
      const res = await apiRequest("PUT", `/api/admin/tenants/${tenantId}/cors-origins`, { origins });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "CORS origins saved", description: "Changes take effect within 60 seconds." });
      setCorsOriginsTenant(null);
    },
    onError: (err: any) => {
      toast({ title: "Failed to save", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ tenantId, reason }: { tenantId: number; reason: string }) => {
      const res = await apiRequest("POST", `/api/admin/tenants/${tenantId}/delete-data`, {
        confirm: "DELETE",
        reason,
      });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tenants"] });
      toast({ title: "Tenant data permanently deleted", description: data.message });
      setDeleteTenant(null);
      setDeleteConfirm("");
      setDeleteReason("");
    },
    onError: (err: any) => {
      toast({ title: "Deletion failed", description: err.message, variant: "destructive" });
    },
  });

  const openEdit = (tenant: Tenant) => {
    setEditTenant(tenant);
    setEditForm({ status: tenant.status, plan: tenant.plan, maxUsers: String(tenant.maxUsers) });
  };

  const openDelete = (tenant: Tenant) => {
    setDeleteTenant(tenant);
    setDeleteConfirm("");
    setDeleteReason("");
  };

  const openCorsOrigins = async (tenant: Tenant) => {
    setCorsOriginsTenant(tenant);
    setCorsNewOrigin("");
    try {
      const res = await fetch(`/api/admin/tenants/${tenant.id}/cors-origins`, { credentials: 'include' });
      const data = await res.json();
      setCorsOriginsList(data.corsOrigins ?? []);
    } catch {
      setCorsOriginsList([]);
    }
  };

  const handleSaveEdit = () => {
    if (!editTenant) return;
    const planChanged = editForm.plan !== editTenant.plan;
    const maxUsersInt = parseInt(editForm.maxUsers) || editTenant.maxUsers;

    if (planChanged) {
      changePlanMutation.mutate({
        tenantId: editTenant.id,
        toPlan: editForm.plan,
        status: editForm.status,
        billingCycle: editForm.plan === "trial" ? "trial" : "monthly",
      });
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

  const stats = {
    total:     tenants.length,
    active:    tenants.filter((t) => t.status === "active").length,
    trial:     tenants.filter((t) => t.status === "trial").length,
    suspended: tenants.filter((t) => t.status === "suspended").length,
  };

  return (
    <SuperAdminLayout
      title="Tenants"
      subtitle="Manage all company accounts on this platform"
      actions={
        <>
          <Button variant="default" size="default" onClick={() => setShowCreateTenant(true)} data-testid="button-create-tenant">
            <Plus className="h-4 w-4 mr-2" /> Create Tenant
          </Button>
          <Button variant="outline" size="default" onClick={() => setShowDeletionAudit(true)} data-testid="button-deletion-audit">
            <ScrollText className="h-4 w-4 mr-2" /> Deletion Log
          </Button>
          <Button variant="outline" size="default" onClick={() => seedDemoMutation.mutate()} disabled={seedDemoMutation.isPending} data-testid="button-seed-demo">
            {seedDemoMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FlaskConical className="h-4 w-4 mr-2" />}
            Seed Demo
          </Button>
          <Button variant="outline" size="default" onClick={() => refetch()} data-testid="button-refresh-tenants">
            <RefreshCw className="h-4 w-4 mr-2" />Refresh
          </Button>
        </>
      }
    >
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Companies", value: stats.total,     icon: <Building2 className="h-5 w-5" /> },
          { label: "Active",          value: stats.active,    icon: <CheckCircle2 className="h-5 w-5 text-green-600" /> },
          { label: "Trial",           value: stats.trial,     icon: <Clock className="h-5 w-5 text-amber-500" /> },
          { label: "Suspended",       value: stats.suspended, icon: <XCircle className="h-5 w-5 text-destructive" /> },
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
          ) : isError ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
              <AlertCircle className="h-10 w-10 text-destructive" />
              <div>
                <p className="font-semibold text-destructive">Could not load tenant data</p>
                <p className="text-sm text-muted-foreground mt-1">
                  A server error occurred while fetching tenants.<br />
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
                    const dynamicPlan = allPlans.find((p) => p.slug === tenant.plan);
                    const planLabel   = dynamicPlan?.name ?? tenant.plan ?? 'Trial';
                    const planVariant = (PLAN_CONFIG[tenant.plan] ?? PLAN_CONFIG.trial).variant;
                    return (
                      <TableRow key={tenant.id} data-testid={`row-tenant-${tenant.id}`}>
                        <TableCell>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{tenant.name}</span>
                              {tenant.isInternal && (
                                <Badge variant="secondary" className="text-xs">{tenant.isSuperAdmin ? "Super Admin" : "Internal"}</Badge>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              <code>{tenant.slug}</code>
                              {tenant.billingEmail && <span className="ml-2">{tenant.billingEmail}</span>}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {tenant.isInternal
                            ? <Badge variant="outline" className="capitalize text-muted-foreground">Platform Owner</Badge>
                            : <Badge variant={planVariant} className="capitalize">{planLabel}</Badge>
                          }
                        </TableCell>
                        <TableCell>
                          {tenant.isInternal
                            ? <span className="text-xs text-muted-foreground">—</span>
                            : <Badge variant={statusConf.variant} className="flex items-center gap-1 w-fit capitalize">
                                {statusConf.icon}{statusConf.label}
                              </Badge>
                          }
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <Users className="h-3.5 w-3.5 text-muted-foreground" />
                            <span>{tenant.userCount}</span>
                            {!tenant.isInternal && <span className="text-muted-foreground">/ {tenant.maxUsers}</span>}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {tenant.isInternal
                            ? <span className="text-xs">N/A</span>
                            : tenant.trialEndsAt ? format(new Date(tenant.trialEndsAt), "dd MMM yyyy") : "—"
                          }
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {tenant.createdAt ? format(new Date(tenant.createdAt), "dd MMM yyyy") : "—"}
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
                              <DropdownMenuItem onClick={() => openCorsOrigins(tenant)}>
                                <Shield className="h-4 w-4 mr-2" /> CORS Origins
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setLogoTenant(tenant)}>
                                <ImageIcon className="h-4 w-4 mr-2" /> Upload Logo
                              </DropdownMenuItem>
                              {!tenant.isSuperAdmin && (
                                <DropdownMenuItem
                                  onClick={() => impersonateMutation.mutate(tenant.id)}
                                  disabled={impersonateMutation.isPending}
                                  data-testid={`button-impersonate-${tenant.id}`}
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  {tenant.isInternal ? "Switch to This Tenant" : "View as this Tenant"}
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              {tenant.status !== "active" && (
                                <DropdownMenuItem onClick={() => quickStatus(tenant, "active")} className="text-green-600">
                                  Set Active
                                </DropdownMenuItem>
                              )}
                              {tenant.status !== "suspended" && (
                                <DropdownMenuItem onClick={() => quickStatus(tenant, "suspended")} className="text-amber-600">
                                  Suspend
                                </DropdownMenuItem>
                              )}
                              {tenant.status !== "trial" && (
                                <DropdownMenuItem onClick={() => quickStatus(tenant, "trial")}>
                                  Reset to Trial
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => setBackupTenant(tenant)}
                                data-testid={`button-backups-${tenant.id}`}
                              >
                                <Archive className="h-4 w-4 mr-2" />
                                Manage Backups
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => manualBackupMutation.mutate(tenant.id)}
                                disabled={manualBackupMutation.isPending}
                                data-testid={`button-backup-now-${tenant.id}`}
                              >
                                {manualBackupMutation.isPending
                                  ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  : <Download className="h-4 w-4 mr-2" />}
                                Backup Now
                              </DropdownMenuItem>
                              {!tenant.isSuperAdmin && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => openDelete(tenant)}
                                    className="text-destructive"
                                    data-testid={`button-delete-tenant-${tenant.id}`}
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete Tenant Data
                                  </DropdownMenuItem>
                                </>
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
            <DialogDescription>Change plan, status, or user limits for this company.</DialogDescription>
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
                  {allPlans.map((p) => (
                    <SelectItem key={p.slug} value={p.slug}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Max Users</Label>
              <Input
                type="number" min={1}
                value={editForm.maxUsers}
                onChange={(e) => setEditForm((f) => ({ ...f, maxUsers: e.target.value }))}
                data-testid="input-max-users"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTenant(null)}>Cancel</Button>
            <Button onClick={handleSaveEdit} disabled={isPending} data-testid="button-save-tenant">
              {isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CORS Origins Dialog */}
      <Dialog open={!!corsOriginsTenant} onOpenChange={(open) => !open && setCorsOriginsTenant(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              CORS Origins — {corsOriginsTenant?.name}
            </DialogTitle>
            <DialogDescription>
              Add the exact origins (protocol + domain) that are allowed to call this tenant's APIs from a browser.
              Example: <code className="text-xs bg-muted px-1 rounded">https://kinto.kintowater.com</code>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex gap-2">
              <Input
                placeholder="https://example.kintowater.com"
                value={corsNewOrigin}
                onChange={(e) => setCorsNewOrigin(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const val = corsNewOrigin.trim().toLowerCase().replace(/\/$/, '');
                    if (val && (val.startsWith('http://') || val.startsWith('https://')) && !corsOriginsList.includes(val)) {
                      setCorsOriginsList((prev) => [...prev, val]);
                      setCorsNewOrigin('');
                    }
                  }
                }}
                data-testid="input-cors-origin"
              />
              <Button
                variant="outline"
                onClick={() => {
                  const val = corsNewOrigin.trim().toLowerCase().replace(/\/$/, '');
                  if (val && (val.startsWith('http://') || val.startsWith('https://')) && !corsOriginsList.includes(val)) {
                    setCorsOriginsList((prev) => [...prev, val]);
                    setCorsNewOrigin('');
                  }
                }}
                data-testid="button-add-cors-origin"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {corsOriginsList.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No origins whitelisted yet. All cross-origin requests will be blocked.</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {corsOriginsList.map((origin) => (
                  <div key={origin} className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm">
                    <span className="font-mono text-xs break-all">{origin}</span>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setCorsOriginsList((prev) => prev.filter((o) => o !== origin))}
                      data-testid={`button-remove-cors-${origin}`}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground">Changes are cached for up to 60 seconds on the server.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCorsOriginsTenant(null)}>Cancel</Button>
            <Button
              onClick={() => corsOriginsTenant && saveCorsOriginsMutation.mutate({ tenantId: corsOriginsTenant.id, origins: corsOriginsList })}
              disabled={saveCorsOriginsMutation.isPending}
              data-testid="button-save-cors-origins"
            >
              {saveCorsOriginsMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : "Save Origins"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Logo Upload Dialog */}
      <Dialog open={!!logoTenant} onOpenChange={(open) => !open && setLogoTenant(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4" /> Upload Logo — {logoTenant?.name}
            </DialogTitle>
            <DialogDescription>Upload a PNG, JPG or SVG logo (max 5 MB). It will appear on the login page and app header.</DialogDescription>
          </DialogHeader>

          <input
            ref={logoFileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file || !logoTenant) return;
              setLogoUploading(true);
              const formData = new FormData();
              formData.append('logo', file);
              try {
                const res = await fetch(`/api/admin/tenants/${logoTenant.id}/upload-logo`, {
                  method: 'POST', body: formData, credentials: 'include',
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.message || 'Upload failed');
                queryClient.invalidateQueries({ queryKey: ['/api/admin/tenants'] });
                toast({ title: 'Logo uploaded', description: `Logo set for ${logoTenant.name}` });
                setLogoTenant(null);
              } catch (err: any) {
                toast({ title: 'Upload failed', description: err.message, variant: 'destructive' });
              } finally {
                setLogoUploading(false);
                e.target.value = '';
              }
            }}
          />

          {/* Current logo preview */}
          {logoTenant?.logoUrl && (
            <div className="flex items-center gap-3 p-3 rounded-md border border-border bg-muted">
              <img src={logoTenant.logoUrl} alt="Current logo" className="h-10 w-auto object-contain max-w-[120px]" onError={(e) => (e.currentTarget.style.display = 'none')} />
              <span className="text-sm text-muted-foreground truncate">{logoTenant.logoUrl}</span>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setLogoTenant(null)}>Cancel</Button>
            <Button
              disabled={logoUploading}
              onClick={() => logoFileRef.current?.click()}
              data-testid="button-upload-tenant-logo"
            >
              {logoUploading
                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Uploading...</>
                : <><Upload className="mr-2 h-4 w-4" />Choose File & Upload</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTenant} onOpenChange={(open) => !open && setDeleteTenant(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Delete Tenant Data — {deleteTenant?.name}
            </DialogTitle>
            <DialogDescription>
              This will permanently delete all data for <strong>{deleteTenant?.name}</strong> ({deleteTenant?.slug}).
              This action is irreversible. A deletion audit record will be created for compliance.
              The tenant account row will be preserved but marked as deleted.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 space-y-1">
              <p className="text-sm font-medium text-destructive">What will be deleted:</p>
              <ul className="text-xs text-muted-foreground list-disc list-inside space-y-0.5">
                <li>All invoices, sales orders, purchase orders</li>
                <li>All vendors, products, raw materials</li>
                <li>All journal entries and accounting data</li>
                <li>All users and roles (except tenant row)</li>
                <li>All documents, expenses, production records</li>
              </ul>
            </div>
            <div className="space-y-2">
              <Label>Reason for deletion</Label>
              <Textarea
                placeholder="e.g. Customer requested account closure, non-payment, trial expired..."
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                rows={2}
                data-testid="input-delete-reason"
              />
            </div>
            <div className="space-y-2">
              <Label>
                Type <strong className="text-destructive">DELETE</strong> to confirm
              </Label>
              <Input
                placeholder="DELETE"
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                data-testid="input-delete-confirm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTenant(null)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={deleteConfirm !== "DELETE" || deleteMutation.isPending}
              onClick={() => deleteTenant && deleteMutation.mutate({ tenantId: deleteTenant.id, reason: deleteReason })}
              data-testid="button-confirm-delete-tenant"
            >
              {deleteMutation.isPending
                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Deleting...</>
                : <><Trash2 className="mr-2 h-4 w-4" />Permanently Delete Data</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Backup Management Dialog */}
      {backupTenant && (
        <BackupsDialog
          tenant={backupTenant}
          onClose={() => setBackupTenant(null)}
          onBackupNow={() => manualBackupMutation.mutate(backupTenant.id)}
          backingUp={manualBackupMutation.isPending}
        />
      )}

      {/* ── Create Tenant Dialog ── */}
      <Dialog open={showCreateTenant} onOpenChange={setShowCreateTenant}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Tenant</DialogTitle>
            <DialogDescription>Manually provision a new company account.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Company Name *</Label>
                <Input
                  placeholder="Acme Pvt Ltd"
                  value={createForm.name}
                  onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                  data-testid="input-create-name"
                />
              </div>
              <div className="space-y-1">
                <Label>Slug (URL key) *</Label>
                <Input
                  placeholder="acme-pvt-ltd"
                  value={createForm.slug}
                  onChange={(e) => setCreateForm((f) => ({ ...f, slug: e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") }))}
                  data-testid="input-create-slug"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Plan</Label>
                <Select value={createForm.plan} onValueChange={(v) => setCreateForm((f) => ({ ...f, plan: v, trialDays: v === "trial" ? (f.trialDays || "14") : "" }))}>
                  <SelectTrigger data-testid="select-create-plan"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {allPlans.map((p) => (
                      <SelectItem key={p.slug} value={p.slug}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Max Users</Label>
                <Input
                  type="number"
                  placeholder="5"
                  value={createForm.maxUsers}
                  onChange={(e) => setCreateForm((f) => ({ ...f, maxUsers: e.target.value }))}
                  data-testid="input-create-maxusers"
                />
              </div>
            </div>
            {createForm.plan === "trial" && (
              <div className="space-y-1">
                <Label>Trial Days</Label>
                <Input
                  type="number"
                  placeholder="14"
                  value={createForm.trialDays}
                  onChange={(e) => setCreateForm((f) => ({ ...f, trialDays: e.target.value }))}
                  data-testid="input-create-trialdays"
                />
              </div>
            )}
            <div className="space-y-1">
              <Label>Admin Email</Label>
              <Input
                type="email"
                placeholder="admin@acme.com"
                value={createForm.adminEmail}
                onChange={(e) => setCreateForm((f) => ({ ...f, adminEmail: e.target.value }))}
                data-testid="input-create-email"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Admin Username *</Label>
                <Input
                  placeholder="acme_admin"
                  value={createForm.adminUsername}
                  onChange={(e) => setCreateForm((f) => ({ ...f, adminUsername: e.target.value }))}
                  data-testid="input-create-username"
                />
              </div>
              <div className="space-y-1">
                <Label>Admin Password *</Label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={createForm.adminPassword}
                  onChange={(e) => setCreateForm((f) => ({ ...f, adminPassword: e.target.value }))}
                  data-testid="input-create-password"
                />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowCreateTenant(false)}>Cancel</Button>
            <Button
              onClick={() => createTenantMutation.mutate(createForm)}
              disabled={createTenantMutation.isPending || !createForm.name || !createForm.slug || !createForm.adminUsername || !createForm.adminPassword}
              data-testid="button-confirm-create-tenant"
            >
              {createTenantMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              Create Tenant
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Deletion Audit Dialog ── */}
      <Dialog open={showDeletionAudit} onOpenChange={setShowDeletionAudit}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ScrollText className="h-4 w-4" /> Tenant Deletion Audit Log
            </DialogTitle>
            <DialogDescription>Record of all permanently deleted tenants and their data.</DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-3 py-2 min-h-0">
            {auditLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : deletionAuditRecords.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">
                <ScrollText className="h-8 w-8 mx-auto mb-2 opacity-30" />
                No tenant deletions recorded yet.
              </div>
            ) : (
              deletionAuditRecords.map((rec) => (
                <div key={rec.id} className="rounded-md border px-4 py-3 space-y-1" data-testid={`deletion-audit-${rec.id}`}>
                  <div className="flex flex-wrap items-center gap-2 justify-between">
                    <div>
                      <span className="font-medium text-sm">{rec.tenantName}</span>
                      <span className="text-muted-foreground text-xs ml-2">({rec.tenantSlug})</span>
                      <span className="text-muted-foreground text-xs ml-2">· Tenant #{rec.tenantId}</span>
                    </div>
                    <Badge variant="destructive" className="text-xs">Deleted</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Deleted {rec.deletedAt ? format(new Date(rec.deletedAt), "dd MMM yyyy, h:mm a") : "—"}
                    {rec.deletedBy && <span> by {rec.deletedBy}</span>}
                    {rec.ownerEmail && <span> · Owner: {rec.ownerEmail}</span>}
                  </p>
                  {rec.reason && <p className="text-xs text-muted-foreground">Reason: {rec.reason}</p>}
                  {rec.rowsDeleted && Object.keys(rec.rowsDeleted).length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Rows deleted: {Object.entries(rec.rowsDeleted).map(([k, v]) => `${k}: ${v}`).join(", ")}
                    </p>
                  )}
                  {rec.exportUrl && (
                    <a
                      href={rec.exportUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary underline"
                    >
                      Download backup export
                    </a>
                  )}
                </div>
              ))
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeletionAudit(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </SuperAdminLayout>
  );
}

type BackupFile = {
  filename: string;
  label: string;
  date: string;
  sizeKb: number;
  createdAt: string;
};

function BackupsDialog({
  tenant,
  onClose,
  onBackupNow,
  backingUp,
}: {
  tenant: Tenant;
  onClose: () => void;
  onBackupNow: () => void;
  backingUp: boolean;
}) {
  const { data: backups = [], isLoading, refetch } = useQuery<BackupFile[]>({
    queryKey: ["/api/admin/tenants", tenant.id, "backups"],
    queryFn: async () => {
      const res = await fetch(`/api/admin/tenants/${tenant.id}/backups`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load backups");
      return res.json();
    },
    enabled: true,
  });

  const LABEL_BADGE: Record<string, "default" | "secondary" | "destructive"> = {
    "daily":        "secondary",
    "pre-deletion": "destructive",
    "manual":       "default",
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Archive className="h-5 w-5" />
            Backups — {tenant.name}
          </DialogTitle>
          <DialogDescription>
            Tenant data backups stored on the server. Daily backups run automatically at 2:00 AM.
            Pre-deletion backups are created before any tenant data deletion.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 max-h-80 overflow-y-auto py-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : backups.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No backups yet. Click "Backup Now" to create one.</p>
          ) : (
            backups.map((b) => (
              <div key={b.filename} className="flex items-center justify-between gap-3 py-2 border-b border-border last:border-0" data-testid={`row-backup-${b.filename}`}>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant={LABEL_BADGE[b.label] ?? "secondary"} className="capitalize text-xs">{b.label}</Badge>
                    <span className="text-sm font-medium">{b.date}</span>
                    <span className="text-xs text-muted-foreground">{b.sizeKb} KB</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{b.filename}</p>
                </div>
                <Button
                  size="default"
                  variant="outline"
                  onClick={() => {
                    window.open(`/api/admin/tenants/${tenant.id}/backups/${b.filename}`, "_blank");
                  }}
                  data-testid={`button-download-backup-${b.filename}`}
                >
                  <Download className="h-4 w-4 mr-1" />Download
                </Button>
              </div>
            ))
          )}
        </div>

        <DialogFooter className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button
            onClick={async () => { onBackupNow(); setTimeout(() => refetch(), 3000); }}
            disabled={backingUp}
            data-testid="button-backup-now-dialog"
          >
            {backingUp ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Archive className="h-4 w-4 mr-2" />}
            Backup Now
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── PostgreSQL Database Backup Panel ────────────────────────────────────────

type PgBackupFile = {
  filename: string;
  label: string;
  date: string;
  sizeMb: string;
  createdAt: string;
};

function PostgresBackupPanel() {
  const { toast } = useToast();

  const { data: backups = [], isLoading, refetch } = useQuery<PgBackupFile[]>({
    queryKey: ["/api/admin/postgres-backups"],
    queryFn: async () => {
      const res = await fetch("/api/admin/postgres-backups", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load backups");
      return res.json();
    },
  });

  const backupMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/postgres-backups", {});
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Backup created", description: data.filename });
      refetch();
    },
    onError: (err: any) => {
      toast({ title: "Backup failed", description: err.message, variant: "destructive" });
    },
  });

  const LABEL_BADGE: Record<string, "default" | "secondary" | "outline"> = {
    scheduled: "secondary",
    manual:    "default",
  };

  return (
    <Card data-testid="postgres-backup-panel">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center gap-3 justify-between">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">PostgreSQL Database Backups</CardTitle>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CalendarClock className="h-4 w-4" />
            <span>Scheduled daily at 1:00 AM · Last {backups.length} of 30 kept</span>
          </div>
          <Button
            size="default"
            onClick={() => backupMutation.mutate()}
            disabled={backupMutation.isPending}
            data-testid="button-run-pg-backup"
          >
            {backupMutation.isPending
              ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Running pg_dump...</>
              : <><Database className="h-4 w-4 mr-2" />Backup Now</>}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Full <code>pg_dump</code> of the entire database, compressed as <code>.sql.gz</code>.
          Stored in <code>uploads/admin/postgres-backups/</code>. Super-admin access only.
        </p>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : backups.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground text-sm space-y-2">
            <HardDrive className="h-8 w-8 mx-auto opacity-30" />
            <p>No backups yet. Click "Backup Now" to create the first one.</p>
            <p className="text-xs">Scheduled backups will appear here automatically after 1:00 AM.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {backups.map((b) => (
              <div key={b.filename} className="flex items-center gap-4 px-6 py-3" data-testid={`row-pgbackup-${b.filename}`}>
                <HardDrive className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0 space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant={LABEL_BADGE[b.label] ?? "outline"} className="capitalize text-xs">{b.label}</Badge>
                    <span className="text-sm font-medium">{b.date}</span>
                    <span className="text-xs text-muted-foreground">{b.sizeMb} MB</span>
                    <span className="text-xs text-muted-foreground">·</span>
                    <span className="text-xs text-muted-foreground">{format(new Date(b.createdAt), "d MMM yyyy, h:mm a")}</span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{b.filename}</p>
                </div>
                <Button
                  size="default"
                  variant="outline"
                  onClick={() => window.open(`/api/admin/postgres-backups/${b.filename}`, "_blank")}
                  data-testid={`button-download-pgbackup-${b.filename}`}
                >
                  <Download className="h-4 w-4 mr-1" />Download
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
