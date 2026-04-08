import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  HardDrive, RefreshCw, Download, Play, Loader2,
  Database, FolderArchive, ChevronDown, ChevronUp,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import SuperAdminLayout from "./super-admin-layout";

interface Tenant {
  id: number;
  name: string;
  slug: string;
  status: string;
  plan: string;
}

interface BackupFile {
  filename: string;
  size: number;
  createdAt: string;
}

interface PostgresBackupFile {
  filename: string;
  size: number;
  createdAt: string;
}

function fmtSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function TenantBackupCard({ tenant }: { tenant: Tenant }) {
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(false);

  const { data: backups = [], isLoading, refetch } = useQuery<BackupFile[]>({
    queryKey: ["/api/admin/tenants", tenant.id, "backups"],
    queryFn: async () => {
      const res = await fetch(`/api/admin/tenants/${tenant.id}/backups`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch backups");
      return res.json();
    },
    enabled: expanded,
  });

  const manualBackupMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/admin/tenants/${tenant.id}/backup`, {});
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Backup created", description: `File: ${data.filename}` });
      refetch();
    },
    onError: (err: any) => toast({ title: "Backup failed", description: err.message, variant: "destructive" }),
  });

  return (
    <Card data-testid={`backup-card-${tenant.id}`}>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-medium text-sm">{tenant.name}</p>
              <span className="text-xs text-muted-foreground">{tenant.slug}</span>
              <Badge variant="outline" className="capitalize text-xs">{tenant.plan}</Badge>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              variant="outline"
              onClick={() => manualBackupMutation.mutate()}
              disabled={manualBackupMutation.isPending}
              data-testid={`button-backup-${tenant.id}`}
            >
              {manualBackupMutation.isPending
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <Play className="h-3.5 w-3.5" />}
              <span className="ml-1.5">Run Backup</span>
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setExpanded((v) => !v)}
              data-testid={`button-expand-${tenant.id}`}
            >
              {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              <span className="ml-1">Files</span>
            </Button>
          </div>
        </div>

        {expanded && (
          <>
            <Separator className="my-3" />
            {isLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading…
              </div>
            ) : backups.length === 0 ? (
              <p className="text-xs text-muted-foreground">No backups yet. Click "Run Backup" to create the first one.</p>
            ) : (
              <div className="space-y-1.5">
                {backups.map((file) => (
                  <div key={file.filename} className="flex items-center gap-3 text-xs py-1" data-testid={`backup-file-${file.filename}`}>
                    <FolderArchive className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="flex-1 truncate text-muted-foreground">{file.filename}</span>
                    <span className="shrink-0 text-muted-foreground">{fmtSize(file.size)}</span>
                    <span className="shrink-0 text-muted-foreground">
                      {format(new Date(file.createdAt), "dd MMM yy HH:mm")}
                    </span>
                    <a
                      href={`/api/admin/tenants/${tenant.id}/backups/${encodeURIComponent(file.filename)}`}
                      download
                      data-testid={`download-backup-${file.filename}`}
                    >
                      <Button size="sm" variant="ghost">
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                    </a>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default function SuperAdminBackups() {
  const { toast } = useToast();

  const { data: tenants = [], isLoading: tenantsLoading } = useQuery<Tenant[]>({
    queryKey: ["/api/admin/tenants"],
  });

  const { data: pgBackups = [], isLoading: pgLoading, refetch: refetchPg } = useQuery<PostgresBackupFile[]>({
    queryKey: ["/api/admin/postgres-backups"],
  });

  const pgBackupMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/postgres-backups", {});
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "PostgreSQL backup created", description: data.filename });
      refetchPg();
    },
    onError: (err: any) => toast({ title: "Backup failed", description: err.message, variant: "destructive" }),
  });

  const realTenants = tenants.filter((t) => !(t as any).isSuperAdmin);

  return (
    <SuperAdminLayout
      title="Backups"
      subtitle="PostgreSQL database dumps and per-tenant JSON data exports"
    >
      {/* ── PostgreSQL Backups ── */}
      <div className="space-y-4 mb-8">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="font-semibold flex items-center gap-2">
              <Database className="h-4 w-4 text-primary" /> PostgreSQL Full Dumps
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Full database backups via pg_dump. Automated daily at 1:00 AM. Max 30 files kept.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => pgBackupMutation.mutate()}
            disabled={pgBackupMutation.isPending}
            data-testid="button-pg-backup"
          >
            {pgBackupMutation.isPending
              ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              : <Play className="h-4 w-4 mr-2" />}
            Run Now
          </Button>
        </div>

        <Card>
          <CardContent className="pt-4 pb-4">
            {pgLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading…
              </div>
            ) : pgBackups.length === 0 ? (
              <p className="text-sm text-muted-foreground">No PostgreSQL backups yet.</p>
            ) : (
              <div className="space-y-2">
                {pgBackups.map((file) => (
                  <div key={file.filename} className="flex items-center gap-3 text-sm py-1" data-testid={`pg-backup-${file.filename}`}>
                    <Database className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="flex-1 truncate text-muted-foreground">{file.filename}</span>
                    <span className="shrink-0 text-muted-foreground text-xs">{fmtSize(file.size)}</span>
                    <span className="shrink-0 text-muted-foreground text-xs">
                      {format(new Date(file.createdAt), "dd MMM yy HH:mm")}
                    </span>
                    <a
                      href={`/api/admin/postgres-backups/${encodeURIComponent(file.filename)}`}
                      download
                      data-testid={`download-pg-${file.filename}`}
                    >
                      <Button size="sm" variant="ghost">
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                    </a>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Separator className="mb-6" />

      {/* ── Per-Tenant Backups ── */}
      <div className="space-y-4">
        <div>
          <h2 className="font-semibold flex items-center gap-2">
            <HardDrive className="h-4 w-4 text-primary" /> Per-Tenant Data Exports
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            JSON exports of all tenant data. Automated daily at 2:00 AM. Max 30 files per tenant.
          </p>
        </div>

        {tenantsLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : realTenants.length === 0 ? (
          <p className="text-sm text-muted-foreground">No tenants found.</p>
        ) : (
          <div className="space-y-3">
            {realTenants.map((tenant) => (
              <TenantBackupCard key={tenant.id} tenant={tenant} />
            ))}
          </div>
        )}
      </div>
    </SuperAdminLayout>
  );
}
