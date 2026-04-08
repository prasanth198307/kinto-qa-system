import { useState } from "react";
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
  Eye, Trash2, AlertTriangle, Archive, Download,
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

export default function SuperAdminTenants() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [editTenant, setEditTenant]     = useState<Tenant | null>(null);
  const [editForm, setEditForm]         = useState({ status: "", plan: "", maxUsers: "" });
  const [deleteTenant, setDeleteTenant] = useState<Tenant | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleteReason, setDeleteReason]   = useState("");
  const [backupTenant, setBackupTenant]   = useState<Tenant | null>(null);

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
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="default" onClick={() => setLocation("/super-admin/plans")} data-testid="button-manage-plans">
            <CreditCard className="h-4 w-4 mr-2" />Manage Plans
          </Button>
          <Button variant="outline" size="default" onClick={() => seedDemoMutation.mutate()} disabled={seedDemoMutation.isPending} data-testid="button-seed-demo">
            {seedDemoMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FlaskConical className="h-4 w-4 mr-2" />}
            Seed Demo Tenant
          </Button>
          <Button variant="outline" size="default" onClick={() => refetch()} data-testid="button-refresh-tenants">
            <RefreshCw className="h-4 w-4 mr-2" />Refresh
          </Button>
        </div>
      </div>

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
                    const planConf   = PLAN_CONFIG[tenant.plan]   ?? PLAN_CONFIG.trial;
                    return (
                      <TableRow key={tenant.id} data-testid={`row-tenant-${tenant.id}`}>
                        <TableCell>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{tenant.name}</span>
                              {tenant.isSuperAdmin && (
                                <Badge variant="secondary" className="text-xs">Super Admin</Badge>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              <code>{tenant.slug}</code>
                              {tenant.billingEmail && <span className="ml-2">{tenant.billingEmail}</span>}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={planConf.variant} className="capitalize">{planConf.label}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusConf.variant} className="flex items-center gap-1 w-fit capitalize">
                            {statusConf.icon}{statusConf.label}
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
                          {tenant.trialEndsAt ? format(new Date(tenant.trialEndsAt), "dd MMM yyyy") : "—"}
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
                              {!tenant.isSuperAdmin && (
                                <DropdownMenuItem
                                  onClick={() => impersonateMutation.mutate(tenant.id)}
                                  disabled={impersonateMutation.isPending}
                                  data-testid={`button-impersonate-${tenant.id}`}
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  View as this Tenant
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
    </div>
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
