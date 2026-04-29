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
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import {
  Plus, Copy, Trash2, Key, CheckCircle, Clock, AlertCircle,
  BookOpen, Shield, ChevronDown, ChevronUp, Globe, Lock,
} from "lucide-react";

interface ApiCatalogEntry {
  id: string;
  method: string;
  path: string;
  label: string;
  description: string;
  category: string;
  params: { name: string; in: string; required: boolean; description: string }[];
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
  message: string;
}

const METHOD_COLORS: Record<string, string> = {
  GET:  "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  POST: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  PUT:  "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  DELETE: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
};

function ApiCatalogCard({ api }: { api: ApiCatalogEntry }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <Card data-testid={`card-api-${api.id}`}>
      <CardContent className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <span className={`text-xs font-bold px-2 py-1 rounded font-mono flex-shrink-0 ${METHOD_COLORS[api.method] || ''}`}>
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
          <Button size="sm" variant="ghost" onClick={() => setExpanded(!expanded)} data-testid={`button-expand-${api.id}`}>
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>

        {expanded && (
          <div className="mt-4 space-y-3 border-t pt-3">
            {api.params.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Parameters</p>
                <div className="space-y-1.5">
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
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Example</p>
              <pre className="bg-muted rounded p-2.5 text-xs font-mono overflow-x-auto whitespace-pre-wrap break-all">
                {api.method === 'GET'
                  ? `curl https://your-domain.com${api.path}\n  -H "Authorization: Bearer kinto_your_key"`
                  : `curl -X POST https://your-domain.com${api.path}\n  -H "Authorization: Bearer kinto_your_key"\n  -H "Content-Type: application/json"\n  -d '{"customer":"Prasanth Dusi","from_date":"2024-01-01","to_date":"2024-12-31","dry_run":true}'`
                }
              </pre>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

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
    onError: () => {
      toast({ title: "Failed to create API key", variant: "destructive" });
    },
  });

  const revokeMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/external-api-keys/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/external-api-keys"] });
      setRevokeId(null);
      toast({ title: "API key revoked" });
    },
    onError: () => {
      toast({ title: "Failed to revoke key", variant: "destructive" });
    },
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

  const toggleScope = (id: string) => {
    setSelectedScopes(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const activeKeys = keys.filter(k => k.isActive === 1);
  const revokedKeys = keys.filter(k => k.isActive === 0);

  const getScopeLabel = (scopeId: string) => {
    return catalogue.find(a => a.id === scopeId)?.label ?? scopeId;
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-5xl mx-auto" data-testid="page-api-keys">

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">API Management</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage API keys and view available endpoints for external integrations
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
            <BookOpen className="h-4 w-4 mr-2" />
            API Catalog
          </TabsTrigger>
          <TabsTrigger value="keys" data-testid="tab-keys">
            <Key className="h-4 w-4 mr-2" />
            API Keys ({activeKeys.length} active)
          </TabsTrigger>
        </TabsList>

        {/* ── API Catalog Tab ── */}
        <TabsContent value="catalog" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Authentication
              </CardTitle>
              <CardDescription>
                All API calls require a Bearer token in the Authorization header
              </CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted rounded p-3 text-xs font-mono overflow-x-auto">
{`Authorization: Bearer kinto_your_key_here`}
              </pre>
            </CardContent>
          </Card>

          {catalogue.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">Loading API catalog...</p>
          ) : (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Available APIs ({catalogue.length})
              </p>
              {catalogue.map(api => (
                <ApiCatalogCard key={api.id} api={api} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── API Keys Tab ── */}
        <TabsContent value="keys" className="space-y-4 mt-4">

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Shield className="h-4 w-4" />
                How scoped keys work
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-1">
              <p>Each key can be restricted to specific APIs. A key with <strong>Full Access</strong> can call any API.</p>
              <p>A key with <strong>limited scope</strong> returns 403 Forbidden if used on an API it's not allowed to call.</p>
              <p>Create separate keys for separate callers — WhatsApp bot, Excel, mobile app — and revoke any one independently.</p>
            </CardContent>
          </Card>

          {/* Active keys */}
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
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
                            <p className="font-medium text-sm" data-testid={`text-key-name-${key.id}`}>
                              {key.name}
                            </p>
                            {key.description && (
                              <p className="text-xs text-muted-foreground mt-0.5">{key.description}</p>
                            )}
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                              {key.scopes === null ? (
                                <Badge variant="outline" className="text-xs text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700">
                                  <Globe className="h-3 w-3 mr-1" />
                                  Full Access
                                </Badge>
                              ) : (
                                key.scopes.map(s => (
                                  <Badge key={s} variant="secondary" className="text-xs">
                                    <Lock className="h-3 w-3 mr-1" />
                                    {getScopeLabel(s)}
                                  </Badge>
                                ))
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-3 mt-1">
                              <span className="text-xs text-muted-foreground">
                                Created {key.createdAt ? format(new Date(key.createdAt), "dd MMM yyyy") : "—"}
                              </span>
                              {key.lastUsedAt ? (
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  Last used {format(new Date(key.lastUsedAt), "dd MMM yyyy, hh:mm a")}
                                </span>
                              ) : (
                                <span className="text-xs text-muted-foreground">Never used</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/30">
                            Active
                          </Badge>
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

          {/* Revoked keys */}
          {revokedKeys.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Revoked Keys ({revokedKeys.length})
              </h2>
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
                          <p className="text-xs text-muted-foreground">
                            Created {key.createdAt ? format(new Date(key.createdAt), "dd MMM yyyy") : "—"}
                          </p>
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
      </Tabs>

      {/* ── Create Key Dialog ── */}
      <Dialog open={createDialogOpen} onOpenChange={handleCloseCreateDialog}>
        <DialogContent className="max-w-lg max-h-[90dvh] overflow-y-auto" data-testid="dialog-create-key">
          <DialogHeader>
            <DialogTitle>
              {newKeyResult ? "Key Created — Save It Now" : "Create API Key"}
            </DialogTitle>
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
                    <p className="text-sm font-medium flex items-center gap-1.5">
                      <Globe className="h-3.5 w-3.5" /> Full Access
                    </p>
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
                      <p className="text-sm font-medium flex items-center gap-1.5">
                        <Lock className="h-3.5 w-3.5" /> Scoped Access
                      </p>
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
                          <Checkbox
                            checked={selectedScopes.includes(api.id)}
                            onCheckedChange={() => toggleScope(api.id)}
                            className="mt-0.5"
                          />
                          <div>
                            <p className="text-sm font-medium flex items-center gap-1.5">
                              <span className={`text-xs font-bold px-1.5 py-0.5 rounded font-mono ${METHOD_COLORS[api.method] || ''}`}>
                                {api.method}
                              </span>
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
                <Button
                  onClick={handleCreate}
                  disabled={!newKeyName.trim() || createMutation.isPending}
                  data-testid="button-confirm-create"
                >
                  {createMutation.isPending ? "Creating..." : "Create Key"}
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-md bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3">
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                  <AlertCircle className="h-4 w-4" />
                  Copy this key now — it won't be shown again
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                  Once you close this dialog, the full key cannot be retrieved. Store it securely.
                </p>
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
                <Button onClick={handleCloseCreateDialog} data-testid="button-close-key-dialog">
                  I've saved the key
                </Button>
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
            <AlertDialogDescription>
              Any system using this key will immediately lose access. This cannot be undone.
            </AlertDialogDescription>
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
