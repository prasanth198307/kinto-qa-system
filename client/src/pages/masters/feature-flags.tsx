// Enable/disable features per tenant without code deployment.
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

const api = (m: string, u: string, b?: any) =>
  fetch(u, { method: m, headers: { "Content-Type": "application/json" }, body: b ? JSON.stringify(b) : undefined, credentials: "include" }).then(r => r.json());

type FeatureFlag = { flag_key: string; name?: string; description?: string; is_enabled: boolean; tenant_overrides?: Record<string, boolean> };

export default function FeatureFlagsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [toggling, setToggling] = useState<string | null>(null);

  const { data } = useQuery({ queryKey: ["/api/masters/feature-flags"], queryFn: () => api("GET", "/api/masters/feature-flags") });
  const rows: FeatureFlag[] = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];

  const toggle = useMutation({
    mutationFn: ({ flagKey, is_enabled }: { flagKey: string; is_enabled: boolean }) =>
      api("PUT", `/api/masters/feature-flags/${flagKey}`, { is_enabled }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/masters/feature-flags"] }); toast({ title: "Updated" }); setToggling(null); },
    onError: () => { toast({ title: "Error", variant: "destructive" }); setToggling(null); },
  });

  const tenantToggle = useMutation({
    mutationFn: ({ flagKey, is_enabled }: { flagKey: string; is_enabled: boolean }) =>
      api("PUT", `/api/masters/feature-flags/${flagKey}/tenant-override`, { is_enabled }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/masters/feature-flags"] }); toast({ title: "Tenant override updated" }); },
    onError: () => toast({ title: "Error", variant: "destructive" }),
  });

  const handleToggle = (flag: FeatureFlag) => {
    setToggling(flag.flag_key);
    toggle.mutate({ flagKey: flag.flag_key, is_enabled: !flag.is_enabled });
  };

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Feature Flags</h1>
        <p className="text-sm text-muted-foreground mt-1">Enable/disable features per tenant without code deployment.</p>
      </div>

      <div className="grid gap-3">
        {rows.length === 0 && <p className="text-center text-muted-foreground py-8">No feature flags configured</p>}
        {rows.map(r => (
          <Card key={r.flag_key} className="hover:shadow-sm transition-shadow">
            <CardContent className="p-4 flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-sm font-medium">{r.flag_key}</span>
                  {r.name && <span className="text-sm text-muted-foreground">— {r.name}</span>}
                </div>
                {r.description && <p className="text-sm text-muted-foreground">{r.description}</p>}
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-xs text-muted-foreground mb-1">Global</div>
                  <button
                    onClick={() => handleToggle(r)}
                    disabled={toggling === r.flag_key}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${r.is_enabled ? "bg-primary" : "bg-muted-foreground/30"}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${r.is_enabled ? "translate-x-6" : "translate-x-1"}`} />
                  </button>
                </div>
                <div className="text-right">
                  <div className="text-xs text-muted-foreground mb-1">This Tenant</div>
                  <button
                    onClick={() => tenantToggle.mutate({ flagKey: r.flag_key, is_enabled: !(r.tenant_overrides?.current ?? r.is_enabled) })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${(r.tenant_overrides?.current ?? r.is_enabled) ? "bg-blue-500" : "bg-muted-foreground/30"}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${(r.tenant_overrides?.current ?? r.is_enabled) ? "translate-x-6" : "translate-x-1"}`} />
                  </button>
                </div>
                <Badge variant={r.is_enabled ? "default" : "secondary"}>{r.is_enabled ? "On" : "Off"}</Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
