import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { Plus, Copy, Trash2, Key, CheckCircle, Clock, AlertCircle } from "lucide-react";

interface ApiKey {
  id: string;
  name: string;
  isActive: number;
  createdBy: string | null;
  createdAt: string | null;
  lastUsedAt: string | null;
}

interface NewKeyResult {
  id: string;
  name: string;
  rawKey: string;
  createdAt: string;
  message: string;
}

export default function ApiKeysPage() {
  const { toast } = useToast();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyResult, setNewKeyResult] = useState<NewKeyResult | null>(null);
  const [revokeId, setRevokeId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const { data: keys = [], isLoading } = useQuery<ApiKey[]>({
    queryKey: ["/api/external-api-keys"],
  });

  const createMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await apiRequest("POST", "/api/external-api-keys", { name });
      return res.json() as Promise<NewKeyResult>;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/external-api-keys"] });
      setNewKeyResult(data);
      setNewKeyName("");
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
    createMutation.mutate(newKeyName.trim());
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
    setCopied(false);
  };

  const activeKeys = keys.filter((k) => k.isActive === 1);
  const revokedKeys = keys.filter((k) => k.isActive === 0);

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-4xl mx-auto" data-testid="page-api-keys">

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">API Keys</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage Bearer tokens for the Customer Outstanding REST API
          </p>
        </div>
        <Button
          onClick={() => setCreateDialogOpen(true)}
          data-testid="button-create-key"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Key
        </Button>
      </div>

      {/* How to use */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Key className="h-4 w-4" />
            How to use
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            Pass the key in the <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">Authorization</code> header of every API request:
          </p>
          <pre className="bg-muted rounded-md p-3 text-xs font-mono overflow-x-auto whitespace-pre-wrap break-all">
{`GET https://ops.kintowater.com/api/external/customer-outstanding
Authorization: Bearer kinto_your_key_here`}
          </pre>
          <p className="text-muted-foreground text-xs">
            Response includes customer name, mobile number, pending amount (in ₹), and invoice count — filtered by your tenant's data only.
          </p>
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
              <p className="text-xs text-muted-foreground mt-1">Click "Create Key" to get started.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {activeKeys.map((key) => (
              <Card key={key.id} data-testid={`card-api-key-${key.id}`}>
                <CardContent className="py-3 px-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-8 w-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                        <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate" data-testid={`text-key-name-${key.id}`}>
                          {key.name}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 mt-0.5">
                          <span className="text-xs text-muted-foreground">
                            Created{" "}
                            {key.createdAt
                              ? format(new Date(key.createdAt), "dd MMM yyyy")
                              : "—"}
                          </span>
                          {key.lastUsedAt && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Last used {format(new Date(key.lastUsedAt), "dd MMM yyyy, hh:mm a")}
                            </span>
                          )}
                          {!key.lastUsedAt && (
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
                        size="icon"
                        variant="ghost"
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
            {revokedKeys.map((key) => (
              <Card key={key.id} className="opacity-60" data-testid={`card-api-key-revoked-${key.id}`}>
                <CardContent className="py-3 px-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                      <AlertCircle className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium text-sm line-through text-muted-foreground">
                        {key.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Created{" "}
                        {key.createdAt
                          ? format(new Date(key.createdAt), "dd MMM yyyy")
                          : "—"}
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

      {/* Create Key Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={handleCloseCreateDialog}>
        <DialogContent data-testid="dialog-create-key">
          <DialogHeader>
            <DialogTitle>
              {newKeyResult ? "Key Created — Save It Now" : "Create API Key"}
            </DialogTitle>
          </DialogHeader>

          {!newKeyResult ? (
            <div className="space-y-4">
              <div>
                <Label htmlFor="key-name">Key Name</Label>
                <Input
                  id="key-name"
                  placeholder="e.g. WhatsApp Bot, Power BI, ERP Integration"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                  data-testid="input-key-name"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  A label to identify where this key is used.
                </p>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={handleCloseCreateDialog}>
                  Cancel
                </Button>
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
                  <code
                    className="flex-1 bg-muted rounded-md px-3 py-2 text-xs font-mono break-all"
                    data-testid="text-new-api-key"
                  >
                    {newKeyResult.rawKey}
                  </code>
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => handleCopy(newKeyResult.rawKey)}
                    data-testid="button-copy-key"
                    title="Copy to clipboard"
                  >
                    {copied ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div>
                <Label className="text-muted-foreground text-xs">Usage example</Label>
                <pre className="mt-1 bg-muted rounded-md p-2.5 text-xs font-mono overflow-x-auto whitespace-pre-wrap break-all">
{`curl https://ops.kintowater.com/api/external/customer-outstanding \\
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

      {/* Revoke Confirm Dialog */}
      <AlertDialog open={!!revokeId} onOpenChange={(open) => !open && setRevokeId(null)}>
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
