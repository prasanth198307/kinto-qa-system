import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, AlertCircle, Eye, EyeOff, Save } from "lucide-react";

const api = (m: string, u: string, b?: any) =>
  fetch(u, { method: m, headers: { "Content-Type": "application/json" }, body: b ? JSON.stringify(b) : undefined, credentials: "include" }).then(r => r.json());

type CredGroup = {
  id: string;
  label: string;
  description: string;
  docsUrl?: string;
  fields: { key: string; label: string; placeholder: string; secret?: boolean }[];
};

const GROUPS: CredGroup[] = [
  {
    id: "amazon_spapi",
    label: "Amazon SP-API — E-Commerce Order Sync",
    description: "Enables real-time Amazon order pull via SP-API with LWA OAuth2 token refresh. Get from Seller Central → Apps & Services → Develop Apps.",
    docsUrl: "https://developer-docs.amazon.com/sp-api/docs/website-authorization-workflow",
    fields: [
      { key: "AMAZON_LWA_CLIENT_ID", label: "LWA Client ID", placeholder: "amzn1.application-oa2-client.xxxx" },
      { key: "AMAZON_LWA_CLIENT_SECRET", label: "LWA Client Secret", placeholder: "amzn1.oa2-cs.v1.xxxx", secret: true },
      { key: "AMAZON_REFRESH_TOKEN", label: "Refresh Token (LWA)", placeholder: "Atzr|xxx...", secret: true },
      { key: "AMAZON_MARKETPLACE_ID", label: "Marketplace ID", placeholder: "A21TJRUUN4KGV (India)" },
      { key: "AMAZON_SELLER_ID", label: "Seller ID", placeholder: "AXXXXXXXXXX" },
    ],
  },
  {
    id: "flipkart_meesho",
    label: "Flipkart & Meesho — Order Sync",
    description: "Enables real Flipkart Seller API and Meesho Partner API v3 order sync. Get credentials from Seller Hub / Partner Panel.",
    fields: [
      { key: "FLIPKART_CLIENT_ID", label: "Flipkart Client ID", placeholder: "flipkart-client-id" },
      { key: "FLIPKART_CLIENT_SECRET", label: "Flipkart Client Secret", placeholder: "xxxx", secret: true },
      { key: "MEESHO_API_TOKEN", label: "Meesho API Token", placeholder: "Bearer token from Meesho Partner Panel", secret: true },
    ],
  },
  {
    id: "swachmeet",
    label: "SwachMeet — Jitsi JWT Auth",
    description: "Enables secure JWT-authenticated Jitsi rooms. Without these, rooms use public Jitsi (no auth).",
    docsUrl: "https://developer.8x8.com/jaas/docs/api-keys-jwt",
    fields: [
      { key: "JITSI_APP_ID", label: "Jitsi App ID", placeholder: "vpaas-magic-cookie-xxx" },
      { key: "JITSI_APP_SECRET", label: "Jitsi App Secret", placeholder: "your-app-secret", secret: true },
    ],
  },
  {
    id: "linkedin",
    label: "SwachSocial — LinkedIn",
    description: "Enables real LinkedIn post publishing. Get a token via LinkedIn Developer Portal (Marketing API).",
    docsUrl: "https://learn.microsoft.com/en-us/linkedin/marketing/",
    fields: [
      { key: "LINKEDIN_ACCESS_TOKEN", label: "LinkedIn Access Token", placeholder: "AQX...", secret: true },
    ],
  },
  {
    id: "facebook",
    label: "SwachSocial — Facebook Pages",
    description: "Enables real Facebook Page posts. Generate a Page Token from Meta Business Suite.",
    docsUrl: "https://developers.facebook.com/docs/pages/access-tokens",
    fields: [
      { key: "FACEBOOK_PAGE_ID", label: "Facebook Page ID", placeholder: "123456789012345" },
      { key: "FACEBOOK_PAGE_TOKEN", label: "Facebook Page Access Token", placeholder: "EAAG...", secret: true },
    ],
  },
  {
    id: "instagram",
    label: "SwachSocial — Instagram Business",
    description: "Enables Instagram posts via Graph API. Requires a connected Facebook Page token above.",
    docsUrl: "https://developers.facebook.com/docs/instagram-api",
    fields: [
      { key: "INSTAGRAM_PAGE_ID", label: "Instagram Business Account ID", placeholder: "17841400000000000" },
    ],
  },
  {
    id: "notifications",
    label: "Notification Engine — WhatsApp / SMS / Email",
    description: "Powers EMI alerts, fee reminders, appointment pings, order status across all ERPs.",
    fields: [
      { key: "META_WHATSAPP_TOKEN", label: "Meta WhatsApp Cloud API Token", placeholder: "EAAx...", secret: true },
      { key: "META_PHONE_NUMBER_ID", label: "WhatsApp Phone Number ID", placeholder: "123456789" },
      { key: "TWOFACTOR_API_KEY", label: "2Factor SMS API Key", placeholder: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx", secret: true },
      { key: "SENDGRID_API_KEY", label: "SendGrid Email API Key", placeholder: "SG.xxx", secret: true },
    ],
  },
  {
    id: "payments",
    label: "Payment Gateways",
    description: "Razorpay POS, Pine Labs, and UPI payment processing across Restaurant, E-Commerce, NGO.",
    fields: [
      { key: "RAZORPAY_KEY_ID", label: "Razorpay Key ID", placeholder: "rzp_live_xxxx" },
      { key: "RAZORPAY_KEY_SECRET", label: "Razorpay Key Secret", placeholder: "xxxxxxxxxxxx", secret: true },
      { key: "PINELABS_CLIENT_ID", label: "Pine Labs Client ID", placeholder: "PL-xxxx" },
      { key: "PINELABS_CLIENT_SECRET", label: "Pine Labs Client Secret", placeholder: "xxxx", secret: true },
    ],
  },
  {
    id: "govt_apis",
    label: "Government / Regulatory APIs",
    description: "NIC E-Way Bill (already live), GSTN direct filing, EPFO Shram Suvidha, ABDM health ID.",
    fields: [
      { key: "GSTN_API_KEY", label: "GSTN API Key (for direct GSTR filing)", placeholder: "gstn-key-xxxx", secret: true },
      { key: "SHRAM_SUVIDHA_USERNAME", label: "Shram Suvidha Username (EPFO e-filing)", placeholder: "XXXXXXXXXX" },
      { key: "SHRAM_SUVIDHA_PASSWORD", label: "Shram Suvidha Password", placeholder: "••••••••", secret: true },
      { key: "ABDM_CLIENT_ID", label: "ABDM/ABHA Client ID", placeholder: "abha-client-id" },
      { key: "ABDM_CLIENT_SECRET", label: "ABDM/ABHA Client Secret", placeholder: "xxxx", secret: true },
    ],
  },
  {
    id: "agriculture",
    label: "Agriculture ERP — Mandi, PMFBY, IoT Sensors, Weather",
    description: "Enables Agmarknet live mandi prices, PMFBY claim submission to MoA&FW, external IoT sensor platform polling, and OpenWeather live forecasts.",
    fields: [
      { key: "AGMARKNET_API_KEY", label: "Agmarknet / data.gov.in API Key", placeholder: "data-gov-in-api-key", secret: true },
      { key: "PMFBY_API_KEY", label: "PMFBY API Key (MoA&FW / NIC)", placeholder: "pmfby-nic-api-key", secret: true },
      { key: "PMFBY_PORTAL_TOKEN", label: "PMFBY Portal Bearer Token", placeholder: "Bearer token from pmfby.gov.in", secret: true },
      { key: "IOT_API_URL", label: "IoT Platform Base URL (Tago.io / ThingsBoard)", placeholder: "https://api.tago.io" },
      { key: "IOT_API_TOKEN", label: "IoT Platform API Token", placeholder: "Device or account token", secret: true },
      { key: "OPENWEATHER_API_KEY", label: "OpenWeather API Key", placeholder: "owm-xxxx-key", secret: true },
    ],
  },
  {
    id: "external_data",
    label: "External Data APIs — Market Rates, Bullion",
    description: "Live SEBI bullion rates, GPS tracking and courier APIs.",
    fields: [
      { key: "SEBI_API_KEY", label: "SEBI Bullion API Key", placeholder: "sebi-xxxx", secret: true },
      { key: "SHIPROCKET_EMAIL", label: "Shiprocket Email", placeholder: "you@company.com" },
      { key: "SHIPROCKET_PASSWORD", label: "Shiprocket Password", placeholder: "••••••••", secret: true },
    ],
  },
];

export default function IntegrationCredentialsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [visible, setVisible] = useState<Record<string, boolean>>({});
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);

  const { data: stored = {} } = useQuery<Record<string, string>>({
    queryKey: ["/api/masters/integration-credentials"],
    queryFn: () => api("GET", "/api/masters/integration-credentials"),
  });

  const { data: status = {} } = useQuery<Record<string, boolean>>({
    queryKey: ["/api/masters/integration-credentials/status"],
    queryFn: () => api("GET", "/api/masters/integration-credentials/status"),
  });

  function val(key: string) {
    return key in edits ? edits[key] : (stored[key] ?? "");
  }

  async function saveGroup(group: CredGroup) {
    setSaving(group.id);
    const payload: Record<string, string> = {};
    group.fields.forEach(f => { if (val(f.key)) payload[f.key] = val(f.key); });
    const res = await api("PUT", "/api/masters/integration-credentials", payload);
    setSaving(null);
    if (res.ok !== false) {
      qc.invalidateQueries({ queryKey: ["/api/masters/integration-credentials"] });
      qc.invalidateQueries({ queryKey: ["/api/masters/integration-credentials/status"] });
      toast({ title: "Saved", description: `${group.label} credentials updated` });
    } else {
      toast({ title: "Error", description: res.message || "Failed to save", variant: "destructive" });
    }
  }

  return (
    <div style={{ padding: "1.5rem", maxWidth: 820 }}>
      <div style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: 18, fontWeight: 500, margin: 0 }}>Integration Credentials</h2>
        <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 4 }}>
          Third-party API keys and credentials for all SwachERP integrations. Values are stored encrypted per tenant.
          Without credentials, features fall back to simulation mode automatically.
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {GROUPS.map(group => {
          const allSet = group.fields.every(f => !!val(f.key) || status[f.key]);
          const anySet = group.fields.some(f => !!val(f.key) || status[f.key]);
          return (
            <Card key={group.id}>
              <CardHeader style={{ paddingBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <CardTitle style={{ fontSize: 14, flex: 1 }}>{group.label}</CardTitle>
                  {allSet
                    ? <Badge style={{ background: "#EAF3DE", color: "#3B6D11", fontSize: 11 }}><CheckCircle size={11} style={{ marginRight: 4 }} />Live</Badge>
                    : anySet
                    ? <Badge style={{ background: "#FAEEDA", color: "#854F0B", fontSize: 11 }}><AlertCircle size={11} style={{ marginRight: 4 }} />Partial</Badge>
                    : <Badge style={{ background: "#f1f0ec", color: "#898781", fontSize: 11 }}>Simulation</Badge>
                  }
                </div>
                <CardDescription style={{ fontSize: 12 }}>
                  {group.description}{" "}
                  {group.docsUrl && <a href={group.docsUrl} target="_blank" rel="noreferrer" style={{ color: "var(--text-accent)" }}>Docs →</a>}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div style={{ display: "grid", gap: 12 }}>
                  {group.fields.map(f => (
                    <div key={f.key}>
                      <Label style={{ fontSize: 12, color: "var(--text-secondary)" }}>{f.label}</Label>
                      <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                        <Input
                          type={f.secret && !visible[f.key] ? "password" : "text"}
                          placeholder={status[f.key] ? "••••••• (saved)" : f.placeholder}
                          value={val(f.key)}
                          onChange={e => setEdits(prev => ({ ...prev, [f.key]: e.target.value }))}
                          style={{ fontFamily: "monospace", fontSize: 12 }}
                        />
                        {f.secret && (
                          <Button variant="outline" size="sm" onClick={() => setVisible(v => ({ ...v, [f.key]: !v[f.key] }))}>
                            {visible[f.key] ? <EyeOff size={14} /> : <Eye size={14} />}
                          </Button>
                        )}
                      </div>
                      {status[f.key] && !edits[f.key] && (
                        <p style={{ fontSize: 11, color: "#3B6D11", marginTop: 3 }}>✓ Credential saved — enter new value to update</p>
                      )}
                    </div>
                  ))}
                  <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 4 }}>
                    <Button size="sm" onClick={() => saveGroup(group)} disabled={saving === group.id}>
                      <Save size={13} style={{ marginRight: 6 }} />
                      {saving === group.id ? "Saving…" : "Save"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
