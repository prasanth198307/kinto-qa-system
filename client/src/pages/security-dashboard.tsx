import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Shield, AlertTriangle, Users, Clock, LogIn, LogOut,
  Smartphone, Trash2, Lock, Unlock, RefreshCw, Plus, X, CheckCircle2
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";

// ─── Types ────────────────────────────────────────────────────────────────────
interface ActiveSession { sid: string; userId: string; username: string; lastActivity: string; ip: string; userAgent: string; }
interface SecurityEvent { id: number; user_id: string; action: string; description: string; ip_address: string; severity: string; created_at: string; }
interface UserMfaStatus { id: number; username: string; email: string; totp_enabled: boolean; mfa_enforced: boolean; failed_login_attempts: number; locked_until: string | null; password_changed_at: string | null; }
interface MfaSetupData { secret: string; qrDataUrl: string; }
interface IpRange { range: string; }

// ─── Severity badge ───────────────────────────────────────────────────────────
function SeverityBadge({ severity }: { severity: string }) {
  const map: Record<string, string> = {
    critical: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
    warn: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300",
    info: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${map[severity] ?? map.info}`}>{severity.toUpperCase()}</span>;
}

// ─── MFA Setup Dialog ─────────────────────────────────────────────────────────
function MfaSetupDialog({ onDone }: { onDone: () => void }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [step, setStep] = useState<"qr" | "verify" | "codes">("qr");
  const [code, setCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);

  const setup = useQuery<MfaSetupData>({
    queryKey: ["/api/auth/mfa/setup-data"],
    queryFn: async () => {
      const r = await apiRequest("POST", "/api/auth/mfa/setup");
      return r.json();
    },
    staleTime: Infinity,
  });

  const enable = useMutation({
    mutationFn: () => apiRequest("POST", "/api/auth/mfa/enable", { code }),
    onSuccess: async (r) => {
      const data = await r.json();
      setBackupCodes(data.backupCodes ?? []);
      setStep("codes");
      qc.invalidateQueries({ queryKey: ["/api/auth/mfa/status"] });
      qc.invalidateQueries({ queryKey: ["/api/admin/users/mfa-status"] });
    },
    onError: () => toast({ title: "Invalid code", description: "Please check your authenticator and try again.", variant: "destructive" }),
  });

  if (setup.isLoading) return <div className="p-8 text-center text-muted-foreground">Generating QR code…</div>;

  if (step === "codes") return (
    <div className="space-y-4 p-2">
      <div className="flex items-center gap-2 text-green-600"><CheckCircle2 className="h-5 w-5" /><span className="font-medium">MFA enabled successfully</span></div>
      <p className="text-sm text-muted-foreground">Save these backup codes in a secure place. Each code can only be used once.</p>
      <div className="grid grid-cols-2 gap-2">
        {backupCodes.map((c) => <code key={c} className="bg-muted px-3 py-1.5 rounded text-sm font-mono">{c}</code>)}
      </div>
      <Button className="w-full" onClick={() => { onDone(); }}>Done</Button>
    </div>
  );

  return (
    <div className="space-y-4 p-2">
      {step === "qr" && <>
        <p className="text-sm text-muted-foreground">Scan this QR code with Google Authenticator, Authy, or any TOTP app.</p>
        {setup.data?.qrDataUrl && <img src={setup.data.qrDataUrl} alt="MFA QR Code" className="mx-auto rounded border p-1" width={200} />}
        <p className="text-xs text-center text-muted-foreground break-all font-mono">{setup.data?.secret}</p>
        <Button className="w-full" onClick={() => setStep("verify")}>I've scanned it — Next</Button>
      </>}
      {step === "verify" && <>
        <p className="text-sm text-muted-foreground">Enter the 6-digit code from your authenticator app to confirm setup.</p>
        <Input data-testid="input-totp-code" placeholder="000000" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} className="text-center text-2xl tracking-widest font-mono" />
        <Button data-testid="button-enable-mfa" className="w-full" disabled={code.length < 6 || enable.isPending} onClick={() => enable.mutate()}>
          {enable.isPending ? "Verifying…" : "Enable MFA"}
        </Button>
      </>}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function SecurityDashboardPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [mfaOpen, setMfaOpen] = useState(false);
  const [newIp, setNewIp] = useState("");

  const sessions = useQuery<ActiveSession[]>({ queryKey: ["/api/security/sessions"] });
  const events = useQuery<SecurityEvent[]>({ queryKey: ["/api/security/events"] });
  const mfaUsers = useQuery<UserMfaStatus[]>({ queryKey: ["/api/admin/users/mfa-status"] });
  const mfaStatus = useQuery<{ totpEnabled: boolean; mfaEnforced: boolean }>({ queryKey: ["/api/auth/mfa/status"] });
  const ipRanges = useQuery<{ ranges: string[] }>({ queryKey: ["/api/security/ip-allowlist"] });

  const revokeSession = useMutation({
    mutationFn: (sid: string) => apiRequest("DELETE", `/api/security/sessions/${sid}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/security/sessions"] }); toast({ title: "Session revoked" }); },
  });

  const unlockUser = useMutation({
    mutationFn: (id: number) => apiRequest("POST", `/api/admin/users/${id}/unlock`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/users/mfa-status"] }); toast({ title: "Account unlocked" }); },
  });

  const enforceMfa = useMutation({
    mutationFn: ({ id, enforce }: { id: number; enforce: boolean }) => apiRequest("POST", `/api/admin/users/${id}/enforce-mfa`, { enforce }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/users/mfa-status"] }),
  });

  const disableMfa = useMutation({
    mutationFn: (data: { code?: string; backupCode?: string }) => apiRequest("POST", "/api/auth/mfa/disable", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/auth/mfa/status"] }); toast({ title: "MFA disabled" }); },
  });

  const addIp = useMutation({
    mutationFn: (range: string) => apiRequest("POST", "/api/security/ip-allowlist", { range }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/security/ip-allowlist"] }); setNewIp(""); toast({ title: "IP range added" }); },
  });

  const removeIp = useMutation({
    mutationFn: (range: string) => apiRequest("DELETE", "/api/security/ip-allowlist", { range }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/security/ip-allowlist"] }),
  });

  // Summary stats
  const failedToday = (events.data ?? []).filter(e => e.action === "LOGIN_FAILED" && new Date(e.created_at) > new Date(Date.now() - 86400000)).length;
  const lockedAccounts = (mfaUsers.data ?? []).filter(u => u.locked_until && new Date(u.locked_until) > new Date()).length;
  const mfaEnabledCount = (mfaUsers.data ?? []).filter(u => u.totp_enabled).length;

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2"><Shield className="h-6 w-6" />Security Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Monitor authentication events, manage MFA, and enforce access controls</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => { qc.invalidateQueries({ queryKey: ["/api/security/sessions"] }); qc.invalidateQueries({ queryKey: ["/api/security/events"] }); }}>
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" />Refresh
        </Button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card><CardContent className="p-4 flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Active Sessions</span>
          <span className="text-2xl font-bold">{sessions.data?.length ?? "—"}</span>
          <span className="text-xs text-muted-foreground flex items-center gap-1"><Users className="h-3 w-3" />right now</span>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Failed Logins Today</span>
          <span className={`text-2xl font-bold ${failedToday > 5 ? "text-red-600" : ""}`}>{events.isLoading ? "—" : failedToday}</span>
          <span className="text-xs text-muted-foreground flex items-center gap-1"><AlertTriangle className="h-3 w-3" />last 24 h</span>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Locked Accounts</span>
          <span className={`text-2xl font-bold ${lockedAccounts > 0 ? "text-yellow-600" : ""}`}>{mfaUsers.isLoading ? "—" : lockedAccounts}</span>
          <span className="text-xs text-muted-foreground flex items-center gap-1"><Lock className="h-3 w-3" />currently locked</span>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">MFA Enabled</span>
          <span className="text-2xl font-bold text-green-600">{mfaUsers.isLoading ? "—" : mfaEnabledCount}</span>
          <span className="text-xs text-muted-foreground flex items-center gap-1"><Smartphone className="h-3 w-3" />of {mfaUsers.data?.length ?? "?"} users</span>
        </CardContent></Card>
      </div>

      <Tabs defaultValue="sessions">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="sessions" data-testid="tab-sessions">Active Sessions</TabsTrigger>
          <TabsTrigger value="events" data-testid="tab-events">Security Events</TabsTrigger>
          <TabsTrigger value="mfa" data-testid="tab-mfa">MFA Management</TabsTrigger>
          <TabsTrigger value="ip" data-testid="tab-ip">IP Allowlist</TabsTrigger>
        </TabsList>

        {/* ── Active Sessions ── */}
        <TabsContent value="sessions">
          <Card>
            <CardHeader><CardTitle className="text-base">Active Sessions</CardTitle></CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>IP Address</TableHead>
                    <TableHead>Browser / Device</TableHead>
                    <TableHead>Last Activity</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {sessions.isLoading ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
                    ) : (sessions.data ?? []).length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No active sessions found</TableCell></TableRow>
                    ) : (sessions.data ?? []).map((s) => (
                      <TableRow key={s.sid} data-testid={`row-session-${s.sid}`}>
                        <TableCell className="font-medium">{s.username || s.userId}</TableCell>
                        <TableCell className="font-mono text-sm">{s.ip || "—"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{s.userAgent || "—"}</TableCell>
                        <TableCell className="text-sm">{s.lastActivity ? formatDistanceToNow(new Date(s.lastActivity), { addSuffix: true }) : "—"}</TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="outline" className="text-red-600" onClick={() => revokeSession.mutate(s.sid)} data-testid={`button-revoke-${s.sid}`}>
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

        {/* ── Security Events ── */}
        <TabsContent value="events">
          <Card>
            <CardHeader><CardTitle className="text-base">Recent Security Events</CardTitle></CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>IP</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Severity</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {events.isLoading ? (
                      <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
                    ) : (events.data ?? []).length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No security events recorded</TableCell></TableRow>
                    ) : (events.data ?? []).map((e) => (
                      <TableRow key={e.id} data-testid={`row-event-${e.id}`}>
                        <TableCell className="text-sm whitespace-nowrap">{format(new Date(e.created_at), "dd MMM HH:mm")}</TableCell>
                        <TableCell><code className="text-xs bg-muted px-1.5 py-0.5 rounded">{e.action}</code></TableCell>
                        <TableCell className="text-sm">{e.user_id || "—"}</TableCell>
                        <TableCell className="font-mono text-xs">{e.ip_address || "—"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[240px] truncate">{e.description}</TableCell>
                        <TableCell><SeverityBadge severity={e.severity || "info"} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── MFA Management ── */}
        <TabsContent value="mfa">
          <div className="space-y-4">
            {/* Own MFA status */}
            <Card>
              <CardHeader><CardTitle className="text-base">Your MFA Status</CardTitle></CardHeader>
              <CardContent className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Smartphone className="h-5 w-5 text-muted-foreground" />
                  {mfaStatus.data?.totpEnabled ? (
                    <span className="text-green-600 font-medium flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4" />Authenticator app enabled</span>
                  ) : (
                    <span className="text-muted-foreground">MFA not enabled on your account</span>
                  )}
                </div>
                {mfaStatus.data?.totpEnabled ? (
                  <Button variant="outline" size="sm" className="text-red-600" disabled={mfaStatus.data.mfaEnforced} onClick={() => { const c = prompt("Enter your current 6-digit TOTP code to disable MFA:"); if (c) disableMfa.mutate({ code: c }); }}>Disable MFA</Button>
                ) : (
                  <Dialog open={mfaOpen} onOpenChange={setMfaOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" data-testid="button-setup-mfa"><Smartphone className="h-4 w-4 mr-1.5" />Set Up MFA</Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-sm">
                      <DialogHeader><DialogTitle>Set Up Two-Factor Authentication</DialogTitle></DialogHeader>
                      <MfaSetupDialog onDone={() => setMfaOpen(false)} />
                    </DialogContent>
                  </Dialog>
                )}
              </CardContent>
            </Card>

            {/* All users table */}
            <Card>
              <CardHeader><CardTitle className="text-base">All Users — MFA &amp; Account Status</CardTitle></CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>MFA</TableHead>
                      <TableHead>Enforced</TableHead>
                      <TableHead>Failed Logins</TableHead>
                      <TableHead>Locked Until</TableHead>
                      <TableHead>Password Age</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {mfaUsers.isLoading ? (
                        <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
                      ) : (mfaUsers.data ?? []).map((u) => {
                        const isLocked = u.locked_until && new Date(u.locked_until) > new Date();
                        const pwAge = u.password_changed_at ? Math.floor((Date.now() - new Date(u.password_changed_at).getTime()) / 86400000) : null;
                        return (
                          <TableRow key={u.id} data-testid={`row-user-${u.id}`}>
                            <TableCell>
                              <div className="font-medium">{u.username}</div>
                              <div className="text-xs text-muted-foreground">{u.email}</div>
                            </TableCell>
                            <TableCell>{u.totp_enabled ? <Badge className="bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300">Enabled</Badge> : <Badge variant="outline">Off</Badge>}</TableCell>
                            <TableCell>{u.mfa_enforced ? <Badge variant="secondary">Enforced</Badge> : <span className="text-muted-foreground text-sm">—</span>}</TableCell>
                            <TableCell>
                              <span className={u.failed_login_attempts >= 3 ? "text-red-600 font-medium" : ""}>{u.failed_login_attempts || 0}</span>
                            </TableCell>
                            <TableCell>
                              {isLocked ? <span className="text-red-600 text-sm font-medium">Until {format(new Date(u.locked_until!), "HH:mm")}</span> : <span className="text-muted-foreground text-sm">—</span>}
                            </TableCell>
                            <TableCell>
                              <span className={pwAge && pwAge > 80 ? "text-yellow-600 font-medium" : "text-sm text-muted-foreground"}>
                                {pwAge !== null ? `${pwAge}d` : "—"}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                {isLocked && (
                                  <Button size="sm" variant="outline" onClick={() => unlockUser.mutate(u.id)} data-testid={`button-unlock-${u.id}`}>
                                    <Unlock className="h-3.5 w-3.5 mr-1" />Unlock
                                  </Button>
                                )}
                                <Button size="sm" variant="ghost" onClick={() => enforceMfa.mutate({ id: u.id, enforce: !u.mfa_enforced })} data-testid={`button-enforce-mfa-${u.id}`}>
                                  {u.mfa_enforced ? "Remove Enforcement" : "Enforce MFA"}
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
          </div>
        </TabsContent>

        {/* ── IP Allowlist ── */}
        <TabsContent value="ip">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">IP Allowlist</CardTitle>
              <p className="text-sm text-muted-foreground">When entries are added, only listed IPs / CIDR ranges can access this company's data. Leave empty to allow all IPs.</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  data-testid="input-ip-range"
                  placeholder="e.g. 192.168.1.0/24 or 203.0.113.42"
                  value={newIp}
                  onChange={(e) => setNewIp(e.target.value)}
                  className="max-w-xs font-mono"
                />
                <Button size="sm" disabled={!newIp.trim() || addIp.isPending} onClick={() => addIp.mutate(newIp.trim())} data-testid="button-add-ip">
                  <Plus className="h-4 w-4 mr-1" />Add
                </Button>
              </div>
              {ipRanges.isLoading ? (
                <p className="text-sm text-muted-foreground">Loading…</p>
              ) : (ipRanges.data?.ranges ?? []).length === 0 ? (
                <div className="border-2 border-dashed rounded-lg p-6 text-center text-muted-foreground">
                  <Shield className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No IP restrictions — all IPs are permitted</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {(ipRanges.data?.ranges ?? []).map((r) => (
                    <div key={r} className="flex items-center justify-between bg-muted/50 px-3 py-2 rounded" data-testid={`row-ip-${r}`}>
                      <code className="text-sm font-mono">{r}</code>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => removeIp.mutate(r)} data-testid={`button-remove-ip-${r}`}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
