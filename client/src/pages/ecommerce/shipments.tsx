import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChevronDown, ChevronUp, Truck, Package, RefreshCw } from "lucide-react";

type Shipment = {
  id: number; order_number: string; customer_name: string; provider: string;
  tracking_no: string; status: string; label_url: string;
  estimated_delivery: string; delivered_at: string; created_at: string;
};
type TrackingDetail = { tracking_events?: { timestamp: string; description: string; location?: string }[]; last_checked?: string };
type SyncStatus = { sku: string; available_qty: number; last_synced: string; channels_updated: number }[];

const PROVIDER_STYLE: Record<string, { bg: string; color: string }> = {
  shiprocket: { bg: "#dbeafe", color: "#1d4ed8" },
  delhivery:  { bg: "#d1fae5", color: "#065f46" },
  manual:     { bg: "#f3f4f6", color: "#374151" },
};

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  created:           { bg: "#fef9c3", color: "#854d0e", label: "Created" },
  in_transit:        { bg: "#dbeafe", color: "#1d4ed8", label: "In Transit" },
  out_for_delivery:  { bg: "#f3e8ff", color: "#6b21a8", label: "Out for Delivery" },
  delivered:         { bg: "#d1fae5", color: "#065f46", label: "Delivered" },
  rto:               { bg: "#fee2e2", color: "#991b1b", label: "RTO" },
};

function ProviderBadge({ provider }: { provider: string }) {
  const s = PROVIDER_STYLE[provider.toLowerCase()] ?? PROVIDER_STYLE.manual;
  return <span style={{ padding: "2px 8px", borderRadius: "10px", fontSize: "12px", fontWeight: 600, background: s.bg, color: s.color }}>{provider}</span>;
}

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLE[status] ?? { bg: "#f3f4f6", color: "#374151", label: status };
  return <span style={{ padding: "2px 8px", borderRadius: "10px", fontSize: "12px", fontWeight: 600, background: s.bg, color: s.color }}>{s.label}</span>;
}

function TrackRow({ shipmentId }: { shipmentId: number }) {
  const { data, isLoading } = useQuery<TrackingDetail>({
    queryKey: ["/api/ecommerce/shipments", shipmentId, "track"],
    queryFn: () => apiRequest("GET", `/api/ecommerce/shipments/${shipmentId}/track`).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); }),
  });
  if (isLoading) return <div style={{ padding: "12px 24px", color: "#9ca3af", fontSize: "13px" }}>Loading tracking info...</div>;
  const events = data?.tracking_events ?? [];
  return (
    <div style={{ padding: "12px 24px 16px", background: "#f9fafb", borderTop: "1px solid #e5e7eb" }}>
      {data?.last_checked && <p style={{ fontSize: "12px", color: "#6b7280", marginBottom: 8 }}>Last checked: {new Date(data.last_checked).toLocaleString()}</p>}
      {events.length === 0 ? (
        <p style={{ fontSize: "13px", color: "#9ca3af" }}>No tracking events available yet.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {events.map((ev, i) => (
            <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#3b82f6", marginTop: 5, flexShrink: 0 }} />
              <div>
                <span style={{ fontSize: "12px", color: "#6b7280" }}>{new Date(ev.timestamp).toLocaleString()}{ev.location ? ` — ${ev.location}` : ""}</span>
                <p style={{ fontSize: "13px", margin: "1px 0 0" }}>{ev.description}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ShipmentsPage() {
  const { toast } = useToast();
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const { data: shipments = [], isLoading } = useQuery<Shipment[]>({
    queryKey: ["/api/ecommerce/shipments"],
    queryFn: () => apiRequest("GET", "/api/ecommerce/shipments").then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); }),
  });

  const { data: syncStatus = [] } = useQuery<SyncStatus>({
    queryKey: ["/api/ecommerce/inventory/sync-status"],
    queryFn: () => apiRequest("GET", "/api/ecommerce/inventory/sync-status").then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); }),
  });

  function toggleTrack(id: number) { setExpandedId(p => p === id ? null : id); }

  return (
    <div style={{ padding: "24px" }}>
      <div style={{ marginBottom: "20px" }}>
        <h1 style={{ fontSize: "22px", fontWeight: 700, margin: 0 }}>Shipments</h1>
        <p style={{ color: "#6b7280", marginTop: "4px", fontSize: "14px" }}>Track shipments and sync inventory across channels</p>
      </div>

      {/* Provider info bar */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        {[{ name: "Shiprocket", key: "shiprocket" }, { name: "Delhivery", key: "delhivery" }].map(p => {
          const s = PROVIDER_STYLE[p.key];
          return (
            <div key={p.key} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", borderRadius: 8, border: "1px solid #e5e7eb", background: "white" }}>
              <Truck style={{ width: 14, height: 14, color: s.color }} />
              <span style={{ fontSize: "13px", fontWeight: 600, color: s.color }}>{p.name}</span>
              <span style={{ fontSize: "12px", color: "#9ca3af" }}>Connected</span>
            </div>
          );
        })}
        <div style={{ padding: "8px 14px", borderRadius: 8, border: "1px dashed #d1d5db", background: "#fafafa", fontSize: "12px", color: "#6b7280", display: "flex", alignItems: "center" }}>
          Add more via <a href="/masters/integration-credentials" style={{ color: "#3b82f6", marginLeft: 4, textDecoration: "none" }}>Masters → Integration Credentials</a>
        </div>
      </div>

      {/* Shipments table */}
      <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: "8px", overflow: "hidden", marginBottom: 28 }}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>AWB / Tracking #</TableHead><TableHead>Order #</TableHead><TableHead>Customer</TableHead>
              <TableHead>Provider</TableHead><TableHead>Status</TableHead><TableHead>Est. Delivery</TableHead>
              <TableHead>Created</TableHead><TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={8} style={{ textAlign: "center", padding: "40px", color: "#9ca3af" }}>Loading shipments...</TableCell></TableRow>
            ) : shipments.length === 0 ? (
              <TableRow><TableCell colSpan={8} style={{ textAlign: "center", padding: "40px", color: "#9ca3af" }}>No shipments found</TableCell></TableRow>
            ) : shipments.map(s => (
              <>
                <TableRow key={s.id} style={{ cursor: "pointer" }}>
                  <TableCell style={{ fontFamily: "monospace", fontSize: "13px" }}>{s.tracking_no || "—"}</TableCell>
                  <TableCell style={{ fontWeight: 500 }}>{s.order_number}</TableCell>
                  <TableCell>{s.customer_name}</TableCell>
                  <TableCell><ProviderBadge provider={s.provider} /></TableCell>
                  <TableCell><StatusBadge status={s.status} /></TableCell>
                  <TableCell style={{ fontSize: "13px" }}>{s.estimated_delivery ? new Date(s.estimated_delivery).toLocaleDateString() : "—"}</TableCell>
                  <TableCell style={{ fontSize: "13px", color: "#6b7280" }}>{new Date(s.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <div style={{ display: "flex", gap: 4 }}>
                      <Button size="sm" variant="outline" onClick={() => toggleTrack(s.id)} style={{ fontSize: "12px" }}>
                        Track {expandedId === s.id ? <ChevronUp style={{ width: 12, height: 12, marginLeft: 4 }} /> : <ChevronDown style={{ width: 12, height: 12, marginLeft: 4 }} />}
                      </Button>
                      {s.label_url && <a href={s.label_url} target="_blank" rel="noreferrer" style={{ fontSize: "12px", padding: "4px 8px", borderRadius: 4, border: "1px solid #d1d5db", textDecoration: "none", color: "#374151", display: "flex", alignItems: "center" }}>Label</a>}
                    </div>
                  </TableCell>
                </TableRow>
                {expandedId === s.id && (
                  <TableRow key={`track-${s.id}`}>
                    <TableCell colSpan={8} style={{ padding: 0 }}>
                      <TrackRow shipmentId={s.id} />
                    </TableCell>
                  </TableRow>
                )}
              </>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Inventory Sync Log */}
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <RefreshCw style={{ width: 16, height: 16, color: "#6b7280" }} />
          <h2 style={{ fontSize: "16px", fontWeight: 600, margin: 0 }}>Inventory Sync Log</h2>
        </div>
        <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: "8px", overflow: "hidden" }}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead><TableHead>Available Qty</TableHead>
                <TableHead>Last Synced</TableHead><TableHead>Channels Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(syncStatus as SyncStatus).length === 0 ? (
                <TableRow><TableCell colSpan={4} style={{ textAlign: "center", padding: "32px", color: "#9ca3af" }}>No sync records yet</TableCell></TableRow>
              ) : (syncStatus as SyncStatus).map((row, i) => (
                <TableRow key={i}>
                  <TableCell style={{ fontFamily: "monospace", fontSize: "13px" }}>{row.sku}</TableCell>
                  <TableCell style={{ fontWeight: 500 }}>{row.available_qty}</TableCell>
                  <TableCell style={{ fontSize: "13px", color: "#6b7280" }}>{row.last_synced ? new Date(row.last_synced).toLocaleString() : "—"}</TableCell>
                  <TableCell><Badge variant="secondary">{row.channels_updated} channel{row.channels_updated !== 1 ? "s" : ""}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
