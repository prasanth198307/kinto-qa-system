import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import SuperAdminLayout from "./super-admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Shield, AlertTriangle, Users, Lock, Smartphone, Trash2,
  Unlock, RefreshCw, Search, Globe, Activity, CheckCircle2,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";

// ─── Types ────────────────────────────────────────────────────────────────────
interface PlatformSession {
  sid: string; userId: string; username: string; tenantId: number; tenantName: string;
  lastActivity: string; ip: string; userAgent: string;
}
interface PlatformEvent {
  id: number; user_id: string; action: string; description: string;
  ip_address: string; severity: string; created_at: string;
  tenant_id: number; tenant_name: string;
}
interface PlatformUserMfa {
  id: number; username: string; email: string; tenant_id: number; tenant_name: string;
  totp_enabled: boolean; mfa_enforced: boolean; failed_login_attempts: number;
  locked_until: string | null; password_changed_at: string | null;
}
interface PlatformStats {
  totalSessions: number; failedLoginsToday: number; lockedAccounts: number;
  mfaEnabled: number; totalUsers: number; tenantsWithIpRestriction: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function SeverityBadge({ severity }: { severity: string }) {
  const cls: Record<string, string> = {
    critical: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
    warn:     "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300",
    info:     "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${cls[severity] ?? cls.info}`}>
      {severity.toUpperCase()}
    </span>
  );
}

function TenantBadge({ name }: { name: string }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-muted text-xs font-medium max-w-[140px] truncate">
      <Globe className="h-3 w-3 shrink-0 text-muted-foreground" />{name}
    </span>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function SuperAdminSecurity() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [sessionSearch, setSessionSearch] = useState("");
  const [eventFilter, setEventFilter] = useState("all");
  const [mfaFilter, setMfaFilter] = useState("all");

  const stats   = useQuery<PlatformStats>({ queryKey: ["/api/superadmin/security/stats"] });
  const sessions = useQuery<PlatformSession[]>({ queryKey: ["/api/superadmin/security/sessions"] });
  const events  = useQuery<PlatformEvent[]>({ queryKey: ["/api/superadmin/security/events"] });
  const users   = useQuery<PlatformUserMfa[]>({ queryKey: ["/api/superadmin/security/users"] });

  const revokeSession = useMutation({
    mutationFn: (sid: string) => apiRequest("DELETE", `/api/security/sessions/${sid}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/superadmin/security/sessions"] }); toast({ title: "Session revoked" }); },
  });

  const unlockUser = useMutation({
    mutationFn: (id: number) => apiRequest("POST", `/api/admin/users/${id}/unlock`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/superadmin/security/users"] }); toast({ title: "Account unlocked" }); },
  });

  const enforceMfa = useMutation({
    mutationFn: ({ id, enforce }: { id: number; enforce: boolean }) =>
      apiRequest("POST", `/api/admin/users/${id}/enforce-mfa`, { enforce }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/superadmin/security/users"] }),
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["/api/superadmin/security/stats"] });
    qc.invalidateQueries({ queryKey: ["/api/superadmin/security/sessions"] });
    qc.invalidateQueries({ queryKey: ["/api/superadmin/security/events"] });
    qc.invalidateQueries({ queryKey: ["/api/superadmin/security/users"] });
  };

  // Filtered sessions
  const filteredSessions = (sessions.data ?? []).filter(s => {
    if (!sessionSearch) return true;
    const q = sessionSearch.toLowerCase();
    return (
      s.username?.toLowerCase().includes(q) ||
      s.tenantName?.toLowerCase().includes(q) ||
      s.ip?.includes(q)
    );
  });

  // Filtered events
  const filteredEvents = (events.data ?? []).filter(e =>
    eventFilter === "all" ? true : e.action === eventFilter
  );

  // Filtered users
  const filteredUsers = (users.data ?? []).filter(u => {
    if (mfaFilter === "mfa-on")      return u.totp_enabled;
    if (mfaFilter === "mfa-off")     return !u.totp_enabled;
    if (mfaFilter === "enforced")    return u.mfa_enforced;
    if (mfaFilter === "locked")      return u.locked_until && new Date(u.locked_until) > new Date();
    if (mfaFilter === "pw-old")      return u.password_changed_at && Math.floor((Date.now() - new Date(u.password_changed_at).getTime()) / 86400000) > 80;
    return true;
  });

  const uniqueActions = [...new Set((events.data ?? []).map(e => e.action))];

  return (
    <SuperAdminLayout
      title="Platform Security"
      subtitle="Cross-tenant session management, security events, MFA status and account health"
      actions={
        <Button variant="outline" size="sm" onClick={refresh}>
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" />Refresh
        </Button>
      }
    >
      {/* ── Stat cards ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {[
          { label: "Active Sessions",       value: stats.data?.totalSessions,            icon: Activity,      color: "" },
          { label: "Failed Logins (24 h)",  value: stats.data?.failedLoginsToday,         icon: AlertTriangle, color: stats.data?.failedLoginsToday ? "text-yellow-600" : "" },
          { label: "Locked Accounts",       value: stats.data?.lockedAccounts,            icon: Lock,          color: stats.data?.lockedAccounts ? "text-red-600" : "" },
          { label: "MFA Enabled",           value: stats.data?.mfaEnabled,               icon: Smartphone,    color: "text-green-600" },
          { label: "Total Users",           value: stats.data?.totalUsers,               icon: Users,         color: "" },
          { label: "IP-Restricted Tenants", value: stats.data?.tenantsWithIpRestriction, icon: Shield,        color: "" },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="p-4 flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground leading-tight">{label}</span>
                <Icon className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <span className={`text-2xl font-bold ${color}`}>
                {stats.isLoading ? "—" : (value ?? 0)}
              </span>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="sessions">
        <TabsList className="flex-wrap h-auto gap-1 mb-4">
          <TabsTrigger value="sessions" data-testid="tab-sa-sessions">Active Sessions</TabsTrigger>
          <TabsTrigger value="events"   data-testid="tab-sa-events">Security Events</TabsTrigger>
          <TabsTrigger value="users"    data-testid="tab-sa-users">MFA &amp; Accounts</TabsTrigger>
        </TabsList>

        {/* ── Active Sessions (cross-tenant) ────────────────────────────── */}
        <TabsContent value="sessions">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <CardTitle className="text-base">All Active Sessions — {filteredSessions.length} shown</CardTitle>
                <div className="relative w-64">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    data-testid="input-session-search"
                    placeholder="Search user, tenant, IP…"
                    value={sessionSearch}
                    onChange={e => setSessionSearch(e.target.value)}
                    className="pl-8 h-8 text-sm"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Tenant</TableHead>
                      <TableHead>IP Address</TableHead>
                      <TableHead>Browser / Device</TableHead>
                      <TableHead>Last Activity</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sessions.isLoading ? (
                      <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">Loading sessions…</TableCell></TableRow>
                    ) : filteredSessions.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">No active sessions found</TableCell></TableRow>
                    ) : filteredSessions.map(s => (
                      <TableRow key={s.sid} data-testid={`row-session-${s.sid}`}>
                        <TableCell className="font-medium">
                          {s.username && s.username !== '(unknown)' ? s.username : (
                            <span className="text-muted-foreground text-xs font-mono">{s.userId?.slice(0, 8)}…</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <TenantBadge name={s.tenantName && s.tenantName !== 'Unknown Tenant' ? s.tenantName : (s.tenantId ? `Tenant ${s.tenantId}` : 'No Tenant')} />
                        </TableCell>
                        <TableCell className="font-mono text-sm">{s.ip && s.ip !== '—' ? s.ip : <span className="text-muted-foreground">—</span>}</TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[180px] truncate">{s.userAgent && s.userAgent !== '—' ? s.userAgent : "—"}</TableCell>
                        <TableCell className="text-sm whitespace-nowrap">
                          {s.lastActivity ? formatDistanceToNow(new Date(s.lastActivity), { addSuffix: true }) : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm" variant="outline" className="text-red-600 h-7"
                            onClick={() => revokeSession.mutate(s.sid)}
                            data-testid={`button-revoke-${s.sid}`}
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-1" />Revoke
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Security Events (cross-tenant) ────────────────────────────── */}
        <TabsContent value="events">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <CardTitle className="text-base">Platform Security Events — {filteredEvents.length} shown</CardTitle>
                <Select value={eventFilter} onValueChange={setEventFilter}>
                  <SelectTrigger className="w-52 h-8 text-sm" data-testid="select-event-filter">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All events</SelectItem>
                    {uniqueActions.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Time</TableHead>
                      <TableHead>Event</TableHead>
                      <TableHead>Tenant</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>IP</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Severity</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {events.isLoading ? (
                      <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground">Loading events…</TableCell></TableRow>
                    ) : filteredEvents.length === 0 ? (
                      <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground">No security events recorded</TableCell></TableRow>
                    ) : filteredEvents.map(e => (
                      <TableRow key={e.id} data-testid={`row-event-${e.id}`}>
                        <TableCell className="text-sm whitespace-nowrap">{format(new Date(e.created_at), "dd MMM HH:mm")}</TableCell>
                        <TableCell><code className="text-xs bg-muted px-1.5 py-0.5 rounded">{e.action}</code></TableCell>
                        <TableCell><TenantBadge name={e.tenant_name || `T${e.tenant_id}`} /></TableCell>
                        <TableCell className="text-sm">{e.user_id || "—"}</TableCell>
                        <TableCell className="font-mono text-xs">{e.ip_address || "—"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{e.description}</TableCell>
                        <TableCell><SeverityBadge severity={e.severity || "info"} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── MFA & Account Health (cross-tenant) ────────────────────────── */}
        <TabsContent value="users">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <CardTitle className="text-base">
                  All Users — MFA &amp; Account Health
                  <span className="ml-2 text-sm font-normal text-muted-foreground">({filteredUsers.length} of {users.data?.length ?? 0})</span>
                </CardTitle>
                <Select value={mfaFilter} onValueChange={setMfaFilter}>
                  <SelectTrigger className="w-48 h-8 text-sm" data-testid="select-mfa-filter">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All users</SelectItem>
                    <SelectItem value="mfa-on">MFA enabled</SelectItem>
                    <SelectItem value="mfa-off">MFA not enabled</SelectItem>
                    <SelectItem value="enforced">MFA enforced</SelectItem>
                    <SelectItem value="locked">Currently locked</SelectItem>
                    <SelectItem value="pw-old">Password &gt;80 days old</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Tenant</TableHead>
                      <TableHead>MFA</TableHead>
                      <TableHead>Enforced</TableHead>
                      <TableHead>Failed Logins</TableHead>
                      <TableHead>Locked Until</TableHead>
                      <TableHead>Password Age</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.isLoading ? (
                      <TableRow><TableCell colSpan={8} className="text-center py-10 text-muted-foreground">Loading…</TableCell></TableRow>
                    ) : filteredUsers.length === 0 ? (
                      <TableRow><TableCell colSpan={8} className="text-center py-10 text-muted-foreground">No users match this filter</TableCell></TableRow>
                    ) : filteredUsers.map(u => {
                      const isLocked = u.locked_until && new Date(u.locked_until) > new Date();
                      const pwAge = u.password_changed_at
                        ? Math.floor((Date.now() - new Date(u.password_changed_at).getTime()) / 86400000)
                        : null;
                      return (
                        <TableRow key={u.id} data-testid={`row-user-${u.id}`}>
                          <TableCell>
                            <div className="font-medium">{u.username}</div>
                            <div className="text-xs text-muted-foreground">{u.email}</div>
                          </TableCell>
                          <TableCell><TenantBadge name={u.tenant_name || `T${u.tenant_id}`} /></TableCell>
                          <TableCell>
                            {u.totp_enabled
                              ? <Badge className="bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 no-default-active-elevate">
                                  <CheckCircle2 className="h-3 w-3 mr-1" />On
                                </Badge>
                              : <Badge variant="outline">Off</Badge>}
                          </TableCell>
                          <TableCell>
                            {u.mfa_enforced
                              ? <Badge variant="secondary">Enforced</Badge>
                              : <span className="text-muted-foreground text-sm">—</span>}
                          </TableCell>
                          <TableCell>
                            <span className={u.failed_login_attempts >= 3 ? "text-red-600 font-semibold" : ""}>
                              {u.failed_login_attempts || 0}
                            </span>
                          </TableCell>
                          <TableCell>
                            {isLocked
                              ? <span className="text-red-600 text-sm font-medium">Until {format(new Date(u.locked_until!), "HH:mm dd/MM")}</span>
                              : <span className="text-muted-foreground text-sm">—</span>}
                          </TableCell>
                          <TableCell>
                            <span className={pwAge && pwAge > 80 ? "text-yellow-600 font-medium" : "text-sm text-muted-foreground"}>
                              {pwAge !== null ? `${pwAge}d` : "—"}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              {isLocked && (
                                <Button size="sm" variant="outline" className="h-7"
                                  onClick={() => unlockUser.mutate(u.id)}
                                  data-testid={`button-unlock-${u.id}`}
                                >
                                  <Unlock className="h-3.5 w-3.5 mr-1" />Unlock
                                </Button>
                              )}
                              <Button size="sm" variant="ghost" className="h-7 text-xs"
                                onClick={() => enforceMfa.mutate({ id: u.id, enforce: !u.mfa_enforced })}
                                data-testid={`button-enforce-mfa-${u.id}`}
                              >
                                {u.mfa_enforced ? "Remove" : "Enforce MFA"}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </SuperAdminLayout>
  );
}
