import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { format, formatDistanceToNow } from "date-fns";
import {
  Plus, Copy, Trash2, Key, CheckCircle, Clock, AlertCircle,
  BookOpen, Shield, ChevronDown, ChevronUp, Globe, Lock,
  Play, Loader2, BarChart3, Zap, CheckCheck, XCircle,
  FlaskConical,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────
interface ApiParam {
  name: string;
  in: string;
  required: boolean;
  description: string;
}
interface ApiCatalogEntry {
  id: string;
  method: string;
  path: string;
  label: string;
  description: string;
  category: string;
  params: ApiParam[];
}
interface ApiKey {
  id: string;
  name: string;
  isActive: number;
  createdBy: string | null;
  createdAt: string | null;
  lastUsedAt: string | null;
  scopes: string[] | null;
  description: string | null;
}
interface NewKeyResult {
  id: string;
  name: string;
  scopes: string[] | null;
  rawKey: string;
  createdAt: string;
}
interface CallLog {
  id: number;
  api_id: string;
  method: string;
  status_code: number;
  duration_ms: number;
  is_try_it: number;
  called_at: string;
  key_id: string | null;
  key_name: string | null;
}
interface ApiSummary {
  api_id: string;
  total_calls: string;
  success_calls: string;
  avg_duration_ms: string;
  last_called: string;
  try_it_calls: string;
}
interface DailyRow {
  day: string;
  api_id: string;
  calls: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────
const METHOD_COLORS: Record<string, string> = {
  GET:  "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  POST: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
};

// ── Try It Panel ──────────────────────────────────────────────────────────────
function TryItPanel({ api }: { api: ApiCatalogEntry }) {
  const [params, setParams] = useState<Record<string, string>>({});
  const [dryRun, setDryRun] = useState(true);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<{
    status: number; duration: number; body: string;
  } | null>(null);

  const setParam = (name: string, value: string) =>
    setParams(p => ({ ...p, [name]: value }));

  const handleSend = async () => {
    setRunning(true);
    setResult(null);
    const t0 = Date.now();
    try {
      let resp: Response;
      if (api.method === 'GET') {
        const qs = new URLSearchParams();
        api.params.forEach(p => { if (params[p.name]) qs.set(p.name, params[p.name]); });
        resp = await fetch(`${api.path}?${qs.toString()}`, {
          headers: { 'X-Try-It': '1' },
          credentials: 'include',
        });
      } else {
        const body: Record<string, any> = {};
        api.params.forEach(p => { if (params[p.name]) body[p.name] = params[p.name]; });
        if (api.id === 'allocate_cash_sales') body.dry_run = dryRun;
        resp = await fetch(api.path, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Try-It': '1' },
          credentials: 'include',
          body: JSON.stringify(body),
        });
      }
      const duration = Date.now() - t0;
      let bodyText = '';
      try { bodyText = JSON.stringify(await resp.json(), null, 2); } catch { bodyText = await resp.text(); }
      setResult({ status: resp.status, duration, body: bodyText });
    } catch (err: any) {
      setResult({ status: 0, duration: Date.now() - t0, body: `Network error: ${err.message}` });
    } finally {
      setRunning(false);
    }
  };

  const missingRequired = api.params
    .filter(p => p.required && p.in === 'body' && !params[p.name]?.trim());
  const canSend = missingRequired.length === 0;

  return (
    <div className="space-y-4 mt-3" data-testid={`try-it-${api.id}`}>
      {/* Parameters */}
      <div className="space-y-3">
        {api.params.map(p => (
          <div key={p.name} className="space-y-1">
            <Label htmlFor={`tryit-${api.id}-${p.name}`} className="flex items-center gap-1.5 text-xs">
              <code className="font-mono bg-muted px-1.5 py-0.5 rounded text-xs">{p.name}</code>
              {p.required && <span className="text-destructive text-xs">required</span>}
              <span className="text-muted-foreground font-normal">{p.description}</span>
            </Label>
            <Input
              id={`tryit-${api.id}-${p.name}`}
              placeholder={p.name === 'from_date' || p.name === 'to_date' ? 'YYYY-MM-DD' : p.description}
              value={params[p.name] ?? ''}
              onChange={e => setParam(p.name, e.target.value)}
              className="text-sm"
              data-testid={`input-tryit-${api.id}-${p.name}`}
            />
          </div>
        ))}

        {api.id === 'allocate_cash_sales' && (
          <div className="flex items-center gap-3 p-3 rounded-md bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
            <Switch
              id={`tryit-${api.id}-dry_run`}
              checked={dryRun}
              onCheckedChange={setDryRun}
              data-testid={`switch-tryit-${api.id}-dry_run`}
            />
            <div>
              <Label htmlFor={`tryit-${api.id}-dry_run`} className="text-sm font-medium">
                Dry Run {dryRun ? <Badge variant="outline" className="text-xs ml-1">Preview only — no changes</Badge> : <Badge className="text-xs ml-1 bg-amber-600">Will write to DB</Badge>}
              </Label>
              <p className="text-xs text-muted-foreground">
                {dryRun ? "Shows what would happen without creating payment records." : "Will create actual payment records in the database."}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Button
          onClick={handleSend}
          disabled={running || !canSend}
          size="sm"
          data-testid={`button-send-${api.id}`}
        >
          {running
            ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Sending…</>
            : <><Play className="h-3.5 w-3.5 mr-1.5" /> Send Request</>}
        </Button>
        {!canSend && (
          <p className="text-xs text-muted-foreground">
            Fill in: {missingRequired.map(p => p.name).join(', ')}
          </p>
        )}
      </div>

      {/* Response */}
      {result && (
        <div className="space-y-2" data-testid={`tryit-response-${api.id}`}>
          <div className="flex items-center gap-2">
            <Badge
              className={`text-xs ${result.status === 0 ? 'bg-red-500' : result.status < 300 ? 'bg-green-600' : result.status < 500 ? 'bg-amber-500' : 'bg-red-600'}`}
              data-testid={`tryit-status-${api.id}`}
            >
              {result.status === 0 ? 'Error' : result.status}
            </Badge>
            <span className="text-xs text-muted-foreground">{result.duration}ms</span>
            {result.status > 0 && result.status < 300 && (
              <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                <CheckCheck className="h-3 w-3" /> Success
              </span>
            )}
          </div>
          <pre className="bg-muted rounded-md p-3 text-xs font-mono overflow-x-auto max-h-64 overflow-y-auto whitespace-pre-wrap break-all">
            {result.body}
          </pre>
        </div>
      )}
    </div>
  );
}

// ── Catalog Card ─────────────────────────────────────────────────────────────
function ApiCatalogCard({ api }: { api: ApiCatalogEntry }) {
  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'docs' | 'try'>('docs');

  return (
    <Card data-testid={`card-api-${api.id}`}>
      <CardContent className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <span className={`text-xs font-bold px-2 py-1 rounded font-mono flex-shrink-0 mt-0.5 ${METHOD_COLORS[api.method] ?? ''}`}>
              {api.method}
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium text-sm">{api.label}</p>
                <Badge variant="outline" className="text-xs">{api.category}</Badge>
              </div>
              <code className="text-xs text-muted-foreground font-mono">{api.path}</code>
              <p className="text-xs text-muted-foreground mt-1">{api.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              size="sm" variant="outline"
              onClick={() => { setExpanded(true); setActiveTab('try'); }}
              className="text-xs gap-1"
              data-testid={`button-tryit-open-${api.id}`}
            >
              <FlaskConical className="h-3.5 w-3.5" />
              Try It
            </Button>
            <Button
              size="icon" variant="ghost"
              onClick={() => setExpanded(!expanded)}
              data-testid={`button-expand-${api.id}`}
            >
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {expanded && (
          <div className="mt-4 border-t pt-3">
            <Tabs value={activeTab} onValueChange={v => setActiveTab(v as 'docs' | 'try')}>
              <TabsList className="h-8">
                <TabsTrigger value="docs" className="text-xs px-3 h-7" data-testid={`tab-docs-${api.id}`}>
                  <BookOpen className="h-3 w-3 mr-1.5" />Documentation
                </TabsTrigger>
                <TabsTrigger value="try" className="text-xs px-3 h-7" data-testid={`tab-try-${api.id}`}>
                  <FlaskConical className="h-3 w-3 mr-1.5" />Try It
                </TabsTrigger>
              </TabsList>

              <TabsContent value="docs" className="mt-3 space-y-3">
                {api.params.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Parameters</p>
                    <div className="space-y-2">
                      {api.params.map(p => (
                        <div key={p.name} className="flex flex-wrap items-start gap-2 text-xs">
                          <code className="font-mono bg-muted px-1.5 py-0.5 rounded">{p.name}</code>
                          <Badge variant={p.required ? "default" : "secondary"} className="text-xs">
                            {p.required ? "required" : "optional"}
                          </Badge>
                          <span className="text-muted-foreground">{p.in === 'body' ? 'body' : 'query'} — {p.description}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Example Request</p>
                  <pre className="bg-muted rounded p-2.5 text-xs font-mono overflow-x-auto whitespace-pre-wrap break-all">
                    {api.method === 'GET'
                      ? `curl https://your-domain.com${api.path} \\\n  -H "Authorization: Bearer kinto_your_key"`
                      : `curl -X POST https://your-domain.com${api.path} \\\n  -H "Authorization: Bearer kinto_your_key" \\\n  -H "Content-Type: application/json" \\\n  -d '{"customer":"Prasanth Dusi","from_date":"2024-01-01","to_date":"2024-12-31","dry_run":true}'`
                    }
                  </pre>
                </div>
              </TabsContent>

              <TabsContent value="try" className="mt-3">
                <TryItPanel api={api} />
              </TabsContent>
            </Tabs>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Usage Analytics Tab ───────────────────────────────────────────────────────
function AnalyticsTab({ catalogue }: { catalogue: ApiCatalogEntry[] }) {
  const { data: logs = [], isLoading: logsLoading } = useQuery<CallLog[]>({
    queryKey: ["/api/external-api-logs"],
  });
  const { data: summaryData, isLoading: summaryLoading } = useQuery<{ summary: ApiSummary[]; daily: DailyRow[] }>({
    queryKey: ["/api/external-api-logs/summary"],
  });

  const getApiLabel = (id: string) => catalogue.find(a => a.id === id)?.label ?? id;

  const totalCalls = summaryData?.summary.reduce((s, r) => s + parseInt(r.total_calls), 0) ?? 0;
  const totalSuccess = summaryData?.summary.reduce((s, r) => s + parseInt(r.success_calls), 0) ?? 0;
  const successRate = totalCalls > 0 ? Math.round((totalSuccess / totalCalls) * 100) : 0;

  const today = new Date().toISOString().slice(0, 10);
  const todayCalls = summaryData?.daily
    .filter(d => d.day.slice(0, 10) === today)
    .reduce((s, d) => s + parseInt(d.calls), 0) ?? 0;

  return (
    <div className="space-y-5" data-testid="tab-content-analytics">
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Today's Calls</p>
            <p className="text-2xl font-bold mt-1" data-testid="stat-today-calls">{todayCalls}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Last 30 Days</p>
            <p className="text-2xl font-bold mt-1" data-testid="stat-total-calls">{totalCalls}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Success Rate</p>
            <p className={`text-2xl font-bold mt-1 ${successRate >= 90 ? 'text-green-600' : successRate >= 70 ? 'text-amber-500' : 'text-red-500'}`} data-testid="stat-success-rate">
              {totalCalls === 0 ? '—' : `${successRate}%`}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">APIs Used</p>
            <p className="text-2xl font-bold mt-1">{summaryData?.summary.length ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* Per-API summary */}
      {!summaryLoading && summaryData && summaryData.summary.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Per-API Summary (last 30 days)
          </h3>
          <div className="space-y-2">
            {summaryData.summary.map(row => {
              const total = parseInt(row.total_calls);
              const success = parseInt(row.success_calls);
              const rate = total > 0 ? Math.round((success / total) * 100) : 0;
              const tryIt = parseInt(row.try_it_calls);
              return (
                <Card key={row.api_id} data-testid={`row-api-summary-${row.api_id}`}>
                  <CardContent className="py-3 px-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4 text-muted-foreground" />
                        <p className="font-medium text-sm">{getApiLabel(row.api_id)}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                        <span><strong className="text-foreground">{total}</strong> calls</span>
                        <span className={rate >= 90 ? 'text-green-600' : rate >= 70 ? 'text-amber-500' : 'text-red-500'}>
                          <strong>{rate}%</strong> success
                        </span>
                        <span><strong className="text-foreground">{row.avg_duration_ms ?? '—'}</strong>ms avg</span>
                        {tryIt > 0 && (
                          <span className="flex items-center gap-1">
                            <FlaskConical className="h-3 w-3" />
                            {tryIt} Try It
                          </span>
                        )}
                        {row.last_called && (
                          <span>Last: {formatDistanceToNow(new Date(row.last_called), { addSuffix: true })}</span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent calls */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
          Recent Calls
        </h3>

        {logsLoading ? (
          <p className="text-sm text-muted-foreground py-4">Loading...</p>
        ) : logs.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <BarChart3 className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">No API calls logged yet.</p>
              <p className="text-xs text-muted-foreground mt-1">Use the "Try It" tab in the catalog to make your first call.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="border rounded-md overflow-hidden">
            <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-0 text-xs text-muted-foreground bg-muted/50 px-3 py-2 font-semibold uppercase tracking-wide">
              <span>Status</span>
              <span className="pl-3">API</span>
              <span className="px-4">Duration</span>
              <span className="px-4">Source</span>
              <span>When</span>
            </div>
            <div className="divide-y">
              {logs.slice(0, 50).map(log => (
                <div
                  key={log.id}
                  className="grid grid-cols-[auto_1fr_auto_auto_auto] items-center gap-0 px-3 py-2 text-xs hover-elevate"
                  data-testid={`row-call-log-${log.id}`}
                >
                  <div>
                    {log.status_code < 300 && log.status_code > 0
                      ? <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                      : log.status_code < 500
                        ? <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
                        : <XCircle className="h-3.5 w-3.5 text-red-500" />}
                  </div>
                  <div className="pl-3">
                    <span className="font-medium">{getApiLabel(log.api_id)}</span>
                    <span className="ml-2 text-muted-foreground">{log.status_code}</span>
                  </div>
                  <span className="px-4 text-muted-foreground">
                    {log.duration_ms != null ? `${log.duration_ms}ms` : '—'}
                  </span>
                  <span className="px-4">
                    {log.is_try_it === 1
                      ? <Badge variant="secondary" className="text-xs gap-0.5">
                          <FlaskConical className="h-2.5 w-2.5" />Try It
                        </Badge>
                      : log.key_name
                        ? <Badge variant="outline" className="text-xs">{log.key_name}</Badge>
                        : <span className="text-muted-foreground">Session</span>}
                  </span>
                  <span className="text-muted-foreground" title={log.called_at}>
                    {formatDistanceToNow(new Date(log.called_at), { addSuffix: true })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ApiKeysPage() {
  const { toast } = useToast();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyDescription, setNewKeyDescription] = useState("");
  const [selectedScopes, setSelectedScopes] = useState<string[]>([]);
  const [allAccess, setAllAccess] = useState(true);
  const [newKeyResult, setNewKeyResult] = useState<NewKeyResult | null>(null);
  const [revokeId, setRevokeId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const { data: catalogue = [] } = useQuery<ApiCatalogEntry[]>({
    queryKey: ["/api/external-api-catalogue"],
  });
  const { data: keys = [], isLoading } = useQuery<ApiKey[]>({
    queryKey: ["/api/external-api-keys"],
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const payload: any = { name: newKeyName.trim() };
      if (newKeyDescription.trim()) payload.description = newKeyDescription.trim();
      if (!allAccess && selectedScopes.length > 0) payload.scopes = selectedScopes;
      const res = await apiRequest("POST", "/api/external-api-keys", payload);
      return res.json() as Promise<NewKeyResult>;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/external-api-keys"] });
      setNewKeyResult(data);
    },
    onError: () => toast({ title: "Failed to create API key", variant: "destructive" }),
  });

  const revokeMutation = useMutation({
    mutationFn: async (id: string) => { await apiRequest("DELETE", `/api/external-api-keys/${id}`); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/external-api-keys"] });
      setRevokeId(null);
      toast({ title: "API key revoked" });
    },
    onError: () => toast({ title: "Failed to revoke key", variant: "destructive" }),
  });

  const handleCreate = () => {
    if (!newKeyName.trim()) return;
    if (!allAccess && selectedScopes.length === 0) {
      toast({ title: "Select at least one API or choose Full Access", variant: "destructive" });
      return;
    }
    createMutation.mutate();
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleCloseCreateDialog = () => {
    setCreateDialogOpen(false);
    setNewKeyResult(null);
    setNewKeyName("");
    setNewKeyDescription("");
    setSelectedScopes([]);
    setAllAccess(true);
    setCopied(false);
  };

  const toggleScope = (id: string) =>
    setSelectedScopes(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);

  const activeKeys = keys.filter(k => k.isActive === 1);
  const revokedKeys = keys.filter(k => k.isActive === 0);
  const getScopeLabel = (scopeId: string) => catalogue.find(a => a.id === scopeId)?.label ?? scopeId;

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-5xl mx-auto" data-testid="page-api-keys">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">API Management</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Explore available APIs, test them live, manage access keys, and track usage
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)} data-testid="button-create-key">
          <Plus className="h-4 w-4 mr-2" />
          Create API Key
        </Button>
      </div>

      <Tabs defaultValue="catalog">
        <TabsList>
          <TabsTrigger value="catalog" data-testid="tab-catalog">
            <BookOpen className="h-4 w-4 mr-2" />API Catalog
          </TabsTrigger>
          <TabsTrigger value="keys" data-testid="tab-keys">
            <Key className="h-4 w-4 mr-2" />Keys ({activeKeys.length})
          </TabsTrigger>
          <TabsTrigger value="analytics" data-testid="tab-analytics">
            <BarChart3 className="h-4 w-4 mr-2" />Analytics
          </TabsTrigger>
        </TabsList>

        {/* ── Tab 1: API Catalog ── */}
        <TabsContent value="catalog" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Globe className="h-4 w-4" />Authentication
              </CardTitle>
              <CardDescription>All API calls require a Bearer token in the Authorization header</CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted rounded p-3 text-xs font-mono overflow-x-auto">
{`Authorization: Bearer kinto_your_key_here`}
              </pre>
            </CardContent>
          </Card>

          {catalogue.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">Loading...</p>
          ) : (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {catalogue.length} API{catalogue.length !== 1 ? 's' : ''} available
              </p>
              {catalogue.map(api => <ApiCatalogCard key={api.id} api={api} />)}
            </div>
          )}
        </TabsContent>

        {/* ── Tab 2: API Keys ── */}
        <TabsContent value="keys" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Shield className="h-4 w-4" />How scoped keys work
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-1">
              <p>A key with <strong>Full Access</strong> can call any API — current and future.</p>
              <p>A key with <strong>limited scope</strong> returns 403 Forbidden if used on an API outside its allowed list.</p>
              <p>Create separate keys per integration — WhatsApp bot, Power BI, mobile app — and revoke any independently.</p>
            </CardContent>
          </Card>

          <div className="space-y-2">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Active Keys ({activeKeys.length})
            </h2>
            {isLoading ? (
              <p className="text-sm text-muted-foreground py-4">Loading...</p>
            ) : activeKeys.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <Key className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground">No active API keys yet.</p>
                  <p className="text-xs text-muted-foreground mt-1">Click "Create API Key" to get started.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {activeKeys.map(key => (
                  <Card key={key.id} data-testid={`card-api-key-${key.id}`}>
                    <CardContent className="py-3 px-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="h-8 w-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-sm" data-testid={`text-key-name-${key.id}`}>{key.name}</p>
                            {key.description && <p className="text-xs text-muted-foreground mt-0.5">{key.description}</p>}
                            <div className="flex flex-wrap items-center gap-1.5 mt-1">
                              {key.scopes === null
                                ? <Badge variant="outline" className="text-xs text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700">
                                    <Globe className="h-3 w-3 mr-1" />Full Access
                                  </Badge>
                                : key.scopes.map(s => (
                                    <Badge key={s} variant="secondary" className="text-xs">
                                      <Lock className="h-3 w-3 mr-1" />{getScopeLabel(s)}
                                    </Badge>
                                  ))}
                            </div>
                            <div className="flex flex-wrap items-center gap-3 mt-1">
                              <span className="text-xs text-muted-foreground">
                                Created {key.createdAt ? format(new Date(key.createdAt), "dd MMM yyyy") : "—"}
                              </span>
                              {key.lastUsedAt
                                ? <span className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    Last used {format(new Date(key.lastUsedAt), "dd MMM yyyy, hh:mm a")}
                                  </span>
                                : <span className="text-xs text-muted-foreground">Never used</span>}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/30">Active</Badge>
                          <Button
                            size="icon" variant="ghost"
                            onClick={() => setRevokeId(key.id)}
                            data-testid={`button-revoke-${key.id}`}
                            title="Revoke key"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {revokedKeys.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Revoked ({revokedKeys.length})</h2>
              <div className="space-y-2">
                {revokedKeys.map(key => (
                  <Card key={key.id} className="opacity-50" data-testid={`card-api-key-revoked-${key.id}`}>
                    <CardContent className="py-3 px-4">
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                          <AlertCircle className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-medium text-sm line-through text-muted-foreground">{key.name}</p>
                          <p className="text-xs text-muted-foreground">Created {key.createdAt ? format(new Date(key.createdAt), "dd MMM yyyy") : "—"}</p>
                        </div>
                        <Badge variant="secondary" className="ml-auto text-xs">Revoked</Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        {/* ── Tab 3: Analytics ── */}
        <TabsContent value="analytics" className="mt-4">
          <AnalyticsTab catalogue={catalogue} />
        </TabsContent>
      </Tabs>

      {/* ── Create Key Dialog ── */}
      <Dialog open={createDialogOpen} onOpenChange={handleCloseCreateDialog}>
        <DialogContent className="max-w-lg max-h-[90dvh] overflow-y-auto" data-testid="dialog-create-key">
          <DialogHeader>
            <DialogTitle>{newKeyResult ? "Key Created — Save It Now" : "Create API Key"}</DialogTitle>
          </DialogHeader>

          {!newKeyResult ? (
            <div className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="key-name">Key Name <span className="text-destructive">*</span></Label>
                <Input
                  id="key-name"
                  placeholder="e.g. WhatsApp Bot, Power BI, Mobile App"
                  value={newKeyName}
                  onChange={e => setNewKeyName(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleCreate()}
                  data-testid="input-key-name"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="key-desc">Description <span className="text-muted-foreground text-xs">(optional)</span></Label>
                <Textarea
                  id="key-desc"
                  placeholder="What will this key be used for?"
                  value={newKeyDescription}
                  onChange={e => setNewKeyDescription(e.target.value)}
                  className="resize-none text-sm"
                  rows={2}
                  data-testid="input-key-description"
                />
              </div>

              <div className="space-y-3">
                <Label>API Access</Label>
                <div
                  className={`flex items-center gap-3 p-3 rounded-md border cursor-pointer ${allAccess ? 'border-primary bg-primary/5' : 'border-border'}`}
                  onClick={() => setAllAccess(true)}
                  data-testid="option-full-access"
                >
                  <Checkbox checked={allAccess} onCheckedChange={() => setAllAccess(true)} />
                  <div>
                    <p className="text-sm font-medium flex items-center gap-1.5"><Globe className="h-3.5 w-3.5" /> Full Access</p>
                    <p className="text-xs text-muted-foreground">Can call all APIs — current and future</p>
                  </div>
                </div>

                <div
                  className={`p-3 rounded-md border cursor-pointer ${!allAccess ? 'border-primary bg-primary/5' : 'border-border'}`}
                  onClick={() => setAllAccess(false)}
                  data-testid="option-scoped-access"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <Checkbox checked={!allAccess} onCheckedChange={() => setAllAccess(false)} />
                    <div>
                      <p className="text-sm font-medium flex items-center gap-1.5"><Lock className="h-3.5 w-3.5" /> Scoped Access</p>
                      <p className="text-xs text-muted-foreground">Restrict this key to specific APIs only</p>
                    </div>
                  </div>
                  {!allAccess && (
                    <div className="mt-3 space-y-2 pl-7">
                      {catalogue.map(api => (
                        <div
                          key={api.id}
                          className="flex items-start gap-2.5 cursor-pointer"
                          onClick={e => { e.stopPropagation(); toggleScope(api.id); }}
                          data-testid={`scope-${api.id}`}
                        >
                          <Checkbox checked={selectedScopes.includes(api.id)} onCheckedChange={() => toggleScope(api.id)} className="mt-0.5" />
                          <div>
                            <p className="text-sm font-medium flex items-center gap-1.5">
                              <span className={`text-xs font-bold px-1.5 py-0.5 rounded font-mono ${METHOD_COLORS[api.method] ?? ''}`}>{api.method}</span>
                              {api.label}
                            </p>
                            <p className="text-xs text-muted-foreground">{api.path}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={handleCloseCreateDialog}>Cancel</Button>
                <Button onClick={handleCreate} disabled={!newKeyName.trim() || createMutation.isPending} data-testid="button-confirm-create">
                  {createMutation.isPending ? "Creating..." : "Create Key"}
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-md bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3">
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                  <AlertCircle className="h-4 w-4" />Copy this key now — it won't be shown again
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">Store it securely. Once you close this dialog, it cannot be retrieved.</p>
              </div>
              <div>
                <Label>Your API Key</Label>
                <div className="flex gap-2 mt-1">
                  <code className="flex-1 bg-muted rounded-md px-3 py-2 text-xs font-mono break-all" data-testid="text-new-api-key">
                    {newKeyResult.rawKey}
                  </code>
                  <Button size="icon" variant="outline" onClick={() => handleCopy(newKeyResult.rawKey)} data-testid="button-copy-key">
                    {copied ? <CheckCircle className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              {newKeyResult.scopes && (
                <div>
                  <Label className="text-muted-foreground text-xs">Scopes</Label>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {newKeyResult.scopes.map(s => (
                      <Badge key={s} variant="secondary" className="text-xs">
                        <Lock className="h-3 w-3 mr-1" />{getScopeLabel(s)}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <Label className="text-muted-foreground text-xs">Usage example</Label>
                <pre className="mt-1 bg-muted rounded-md p-2.5 text-xs font-mono overflow-x-auto whitespace-pre-wrap break-all">
{`curl https://your-domain.com/api/external/customer-outstanding \\
  -H "Authorization: Bearer ${newKeyResult.rawKey}"`}
                </pre>
              </div>
              <DialogFooter>
                <Button onClick={handleCloseCreateDialog} data-testid="button-close-key-dialog">I've saved the key</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Revoke Confirm */}
      <AlertDialog open={!!revokeId} onOpenChange={open => !open && setRevokeId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke API Key?</AlertDialogTitle>
            <AlertDialogDescription>Any system using this key will immediately lose access. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => revokeId && revokeMutation.mutate(revokeId)}
              className="bg-destructive text-destructive-foreground"
              data-testid="button-confirm-revoke"
            >
              {revokeMutation.isPending ? "Revoking..." : "Revoke Key"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
