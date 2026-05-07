import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle2, AlertCircle, Eye, EyeOff, Save, Loader2,
  CreditCard, RefreshCw, ShieldCheck, Database, Server,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import SuperAdminLayout from "./super-admin-layout";

interface PlatformSettingsData {
  settings: Record<string, string | null>;
  source: Record<string, "db" | "env" | "none">;
  envKeyIdSet: boolean;
  envKeySecretSet: boolean;
}

function SourceBadge({ source }: { source: "db" | "env" | "none" }) {
  if (source === "db")  return <Badge variant="outline" className="text-xs border-emerald-400 text-emerald-700 dark:text-emerald-300"><Database className="h-3 w-3 mr-1" />DB</Badge>;
  if (source === "env") return <Badge variant="outline" className="text-xs border-blue-400 text-blue-700 dark:text-blue-300"><Server className="h-3 w-3 mr-1" />.env</Badge>;
  return <Badge variant="outline" className="text-xs border-red-400 text-red-600 dark:text-red-400"><AlertCircle className="h-3 w-3 mr-1" />Not set</Badge>;
}

export default function SuperAdminSettings() {
  const { toast } = useToast();

  // ─── Razorpay form state ───────────────────────────────────────────────────
  const [keyId, setKeyId]         = useState("");
  const [keySecret, setKeySecret] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [dirty, setDirty]         = useState(false);

  const { data, isLoading, refetch } = useQuery<PlatformSettingsData>({
    queryKey: ["/api/admin/platform-settings"],
    queryFn: async () => {
      const res = await fetch("/api/admin/platform-settings", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load settings");
      return res.json();
    },
    onSuccess: (d) => {
      // Pre-fill key ID (it's not sensitive, show it); secret stays blank until user types
      setKeyId(d.settings["razorpay_key_id"] ?? "");
      setKeySecret(d.settings["razorpay_key_secret"] ?? "");
      setDirty(false);
    },
  } as any);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, string> = {};
      if (keyId.trim()     !== (data?.settings["razorpay_key_id"]     ?? "")) payload["razorpay_key_id"]     = keyId.trim();
      if (keySecret.trim() !== (data?.settings["razorpay_key_secret"] ?? "")) payload["razorpay_key_secret"] = keySecret.trim();
      if (Object.keys(payload).length === 0) return;
      const res = await apiRequest("PUT", "/api/admin/platform-settings", payload);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message ?? "Save failed");
      }
    },
    onSuccess: () => {
      toast({ title: "Settings saved", description: "Razorpay keys updated in database." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/platform-settings"] });
      refetch();
      setDirty(false);
    },
    onError: (err: any) => toast({ title: "Save failed", description: err.message, variant: "destructive" }),
  });

  const razorpayConfigured =
    data?.source["razorpay_key_id"] !== "none" && data?.source["razorpay_key_secret"] !== "none";

  return (
    <SuperAdminLayout
      title="Platform Settings"
      subtitle="Configure payment gateway and other platform-wide settings"
      actions={
        <Button variant="outline" size="default" onClick={() => refetch()} data-testid="button-refresh-settings">
          <RefreshCw className="h-4 w-4 mr-2" /> Refresh
        </Button>
      }
    >
      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="max-w-2xl space-y-6">

          {/* ── Status banner ── */}
          <Card className={razorpayConfigured
            ? "border-emerald-300 dark:border-emerald-700"
            : "border-amber-300 dark:border-amber-700"
          }>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                {razorpayConfigured
                  ? <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                  : <AlertCircle  className="h-5 w-5 text-amber-600 shrink-0" />}
                <div>
                  <p className="text-sm font-medium">
                    {razorpayConfigured ? "Razorpay is configured — online payments are enabled" : "Razorpay not configured — online payments are disabled"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {razorpayConfigured
                      ? "Keys are active and will be used for all new payment orders."
                      : "Enter your Razorpay Key ID and Secret below to enable the payment gateway."}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── Razorpay Gateway ── */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Razorpay Payment Gateway
              </CardTitle>
              <CardDescription>
                Keys saved here override <code className="text-xs bg-muted px-1 py-0.5 rounded">.env</code> values.
                Leave blank to fall back to the server environment variable.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">

              {/* Key ID */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Label htmlFor="rzp-key-id">Razorpay Key ID</Label>
                  {data && <SourceBadge source={data.source["razorpay_key_id"] as any} />}
                  {data?.envKeyIdSet && data.source["razorpay_key_id"] === "env" && (
                    <span className="text-xs text-muted-foreground">(active from .env)</span>
                  )}
                </div>
                <Input
                  id="rzp-key-id"
                  placeholder="rzp_live_XXXXXXXXXXXX  or  rzp_test_XXXXXXXXXXXX"
                  value={keyId}
                  onChange={(e) => { setKeyId(e.target.value); setDirty(true); }}
                  data-testid="input-razorpay-key-id"
                />
                <p className="text-xs text-muted-foreground">
                  Starts with <code className="bg-muted px-1 rounded">rzp_live_</code> for production or <code className="bg-muted px-1 rounded">rzp_test_</code> for test mode.
                </p>
              </div>

              <Separator />

              {/* Key Secret */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Label htmlFor="rzp-key-secret">Razorpay Key Secret</Label>
                  {data && <SourceBadge source={data.source["razorpay_key_secret"] as any} />}
                  <Badge variant="outline" className="text-xs border-muted-foreground text-muted-foreground">
                    <ShieldCheck className="h-3 w-3 mr-1" />Encrypted at rest
                  </Badge>
                </div>
                <div className="relative">
                  <Input
                    id="rzp-key-secret"
                    type={showSecret ? "text" : "password"}
                    placeholder={
                      data?.source["razorpay_key_secret"] === "none"
                        ? "Enter key secret…"
                        : "Enter new secret to replace (leave blank to keep current)"
                    }
                    value={keySecret}
                    onChange={(e) => { setKeySecret(e.target.value); setDirty(true); }}
                    data-testid="input-razorpay-key-secret"
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="absolute right-1 top-1/2 -translate-y-1/2"
                    onClick={() => setShowSecret(v => !v)}
                    data-testid="button-toggle-secret-visibility"
                  >
                    {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Stored securely in DB. The current value is masked — only enter a value to change it.
                </p>
              </div>

              {/* How keys are resolved */}
              <div className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
                <p className="font-medium text-foreground">Key resolution order:</p>
                <p>1. Database (set here) — takes priority</p>
                <p>2. Server <code className="bg-muted px-0.5 rounded">.env</code> / environment variables — fallback</p>
                <p>3. If neither is set, Razorpay is disabled for all tenants</p>
              </div>

              <div className="flex justify-end pt-1">
                <Button
                  onClick={() => saveMutation.mutate()}
                  disabled={!dirty || saveMutation.isPending}
                  data-testid="button-save-razorpay-settings"
                >
                  {saveMutation.isPending
                    ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    : <Save className="h-4 w-4 mr-2" />}
                  Save Keys
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* ── Clear keys (reset to env) ── */}
          {(data?.source["razorpay_key_id"] === "db" || data?.source["razorpay_key_secret"] === "db") && (
            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">Clear DB keys</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Remove keys from DB and revert to <code className="bg-muted px-0.5 rounded">.env</code> values.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      await apiRequest("PUT", "/api/admin/platform-settings", {
                        razorpay_key_id: "",
                        razorpay_key_secret: "",
                      });
                      toast({ title: "DB keys cleared", description: "Now using .env values." });
                      refetch();
                    }}
                    data-testid="button-clear-razorpay-keys"
                  >
                    Clear DB Keys
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

        </div>
      )}
    </SuperAdminLayout>
  );
}
