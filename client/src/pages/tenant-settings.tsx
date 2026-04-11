import { useState, type ReactNode } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Building2, Users, Package, CheckCircle2, Clock, XCircle,
  Loader2, Save, Palette, CreditCard, Download, Bell, FileJson, AlertCircle,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { differenceInDays } from "date-fns";
import SubscriptionManagement from "./subscription-management";

interface TenantInfo {
  id: number;
  name: string;
  slug: string;
  plan: string;
  status: string;
  trialEndsAt: string | null;
  maxUsers: number;
  logoUrl: string | null;
  primaryColor: string | null;
  billingEmail: string | null;
  contactName: string | null;
  contactPhone: string | null;
  gstNumber: string | null;
  address: string | null;
  createdAt: string;
  userCount: number;
  planName?: string;
}

interface PlanFeatures {
  plan: string;
  modules: string[];
  allowedNavItems: string[];
}

interface NotificationConfig {
  id: string;
  emailEnabled: number;
  senderEmail: string | null;
  senderName: string | null;
  emailProvider: string | null;
  smtpHost: string | null;
  smtpPort: number | null;
  smtpUser: string | null;
  smtpPassword: string | null;
  smtpFromName: string | null;
  whatsappEnabled: number;
  metaPhoneNumberId: string | null;
  metaAccessToken: string | null;
  metaVerifyToken: string | null;
  testMode: number;
}

const MODULE_LABELS: Record<string, string> = {
  invoicing: "Invoicing & GST",
  purchase_orders: "Purchase Orders",
  basic_inventory: "Inventory Management",
  gatepasses: "Gatepasses & Dispatch",
  sales_orders: "Sales Orders",
  production: "Production & BOM",
  quality_returns: "Quality & Returns",
  accounting: "Accounting & Ledger",
  mis: "MIS Analytics",
  expenses: "Expenses & Cash Register",
  documents: "Document Management",
  whatsapp: "WhatsApp Integration",
  maintenance: "Preventive Maintenance",
  crm: "CRM",
  hr_payroll: "HR & Payroll",
};

const PLAN_COLORS: Record<string, string> = {
  trial:        "text-amber-600",
  basic:        "text-blue-600",
  professional: "text-violet-600",
  enterprise:   "text-emerald-600",
};

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: ReactNode }> = {
  active:    { label: "Active",     variant: "default",     icon: <CheckCircle2 className="h-3 w-3" /> },
  trial:     { label: "Trial",      variant: "secondary",   icon: <Clock className="h-3 w-3" /> },
  suspended: { label: "Suspended",  variant: "destructive", icon: <XCircle className="h-3 w-3" /> },
  expired:   { label: "Expired",    variant: "outline",     icon: <XCircle className="h-3 w-3" /> },
};

const settingsSchema = z.object({
  billingEmail: z.string().email("Invalid email").or(z.literal("")),
  contactName:  z.string().max(255).optional(),
  contactPhone: z.string().max(20).optional(),
  gstNumber:    z.string().max(20).optional(),
  address:      z.string().optional(),
  logoUrl:      z.string().url("Must be a valid URL").or(z.literal("")).optional(),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Must be a hex color e.g. #2563eb").optional(),
});

const notifSchema = z.object({
  senderName:        z.string().max(255).optional(),
  senderEmail:       z.string().email("Invalid email").or(z.literal("")).optional(),
  smtpFromName:      z.string().max(255).optional(),
  metaPhoneNumberId: z.string().max(255).optional(),
  metaAccessToken:   z.string().optional(),
  metaVerifyToken:   z.string().max(255).optional(),
  whatsappEnabled:   z.boolean().optional(),
  emailEnabled:      z.boolean().optional(),
  testMode:          z.boolean().optional(),
});

type SettingsForm = z.infer<typeof settingsSchema>;
type NotifForm = z.infer<typeof notifSchema>;

export default function TenantSettings() {
  const { toast } = useToast();
  const [colorPreview, setColorPreview] = useState<string>("");
  const [exportLoading, setExportLoading] = useState(false);

  const { data: tenantInfo, isLoading: infoLoading } = useQuery<TenantInfo>({
    queryKey: ["/api/tenant/info"],
  });

  const { data: planFeatures } = useQuery<PlanFeatures>({
    queryKey: ["/api/tenant/features"],
  });

  const { data: notifConfig } = useQuery<NotificationConfig>({
    queryKey: ["/api/notification-config"],
  });

  const form = useForm<SettingsForm>({
    resolver: zodResolver(settingsSchema),
    values: {
      billingEmail: tenantInfo?.billingEmail ?? "",
      contactName:  tenantInfo?.contactName ?? "",
      contactPhone: tenantInfo?.contactPhone ?? "",
      gstNumber:    tenantInfo?.gstNumber ?? "",
      address:      tenantInfo?.address ?? "",
      logoUrl:      tenantInfo?.logoUrl ?? "",
      primaryColor: tenantInfo?.primaryColor ?? "#1a56db",
    },
  });

  const notifForm = useForm<NotifForm>({
    resolver: zodResolver(notifSchema),
    values: {
      senderName:        notifConfig?.senderName ?? "",
      senderEmail:       notifConfig?.senderEmail ?? "",
      smtpFromName:      notifConfig?.smtpFromName ?? "",
      metaPhoneNumberId: notifConfig?.metaPhoneNumberId ?? "",
      metaAccessToken:   notifConfig?.metaAccessToken ?? "",
      metaVerifyToken:   notifConfig?.metaVerifyToken ?? "",
      whatsappEnabled:   (notifConfig?.whatsappEnabled ?? 0) === 1,
      emailEnabled:      (notifConfig?.emailEnabled ?? 0) === 1,
      testMode:          (notifConfig?.testMode ?? 1) === 1,
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: SettingsForm) => {
      const res = await apiRequest("PATCH", "/api/tenant/settings", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tenant/info"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tenant/features"] });
      toast({ title: "Settings saved successfully" });
    },
    onError: (err: any) => {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    },
  });

  const notifMutation = useMutation({
    mutationFn: async (data: NotifForm) => {
      const payload = {
        senderName:        data.senderName,
        senderEmail:       data.senderEmail,
        smtpFromName:      data.smtpFromName,
        metaPhoneNumberId: data.metaPhoneNumberId,
        metaAccessToken:   data.metaAccessToken,
        metaVerifyToken:   data.metaVerifyToken,
        whatsappEnabled:   data.whatsappEnabled ? 1 : 0,
        emailEnabled:      data.emailEnabled ? 1 : 0,
        testMode:          data.testMode ? 1 : 0,
      };
      if (notifConfig?.id) {
        const res = await apiRequest("PATCH", `/api/notification-config/${notifConfig.id}`, payload);
        return res.json();
      } else {
        const res = await apiRequest("POST", "/api/notification-config", payload);
        return res.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notification-config"] });
      toast({ title: "Notification settings saved" });
    },
    onError: (err: any) => {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    },
  });

  const handleExport = async () => {
    setExportLoading(true);
    try {
      const res = await fetch("/api/tenant/export", { credentials: "include" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message);
      }
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const match = disposition.match(/filename="(.+?)"/);
      const filename = match?.[1] ?? "kinto-export.json";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: "Export downloaded successfully" });
    } catch (err: any) {
      toast({ title: "Export failed", description: err.message, variant: "destructive" });
    } finally {
      setExportLoading(false);
    }
  };

  if (infoLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const trialDaysLeft = tenantInfo?.trialEndsAt
    ? differenceInDays(new Date(tenantInfo.trialEndsAt), new Date())
    : null;

  const planLabel  = tenantInfo?.planName ?? tenantInfo?.plan ?? "Trial";
  const planColor  = PLAN_COLORS[tenantInfo?.plan ?? "trial"] ?? "text-foreground";
  const statusConf = STATUS_CONFIG[tenantInfo?.status ?? "trial"] ?? STATUS_CONFIG.trial;

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Building2 className="h-6 w-6 text-primary" />
          Company Settings
        </h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Manage your subscription, company info, branding and notifications
        </p>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview"      data-testid="tab-settings-overview">Overview</TabsTrigger>
          <TabsTrigger value="subscription"  data-testid="tab-settings-subscription">
            <CreditCard className="h-3.5 w-3.5 mr-1.5" />Subscription
          </TabsTrigger>
          <TabsTrigger value="company"       data-testid="tab-settings-company">Company Info</TabsTrigger>
          <TabsTrigger value="branding"      data-testid="tab-settings-branding">
            <Palette className="h-3.5 w-3.5 mr-1.5" />Branding
          </TabsTrigger>
          <TabsTrigger value="notifications" data-testid="tab-settings-notifications">
            <Bell className="h-3.5 w-3.5 mr-1.5" />Notifications
          </TabsTrigger>
          <TabsTrigger value="data"          data-testid="tab-settings-data">
            <Download className="h-3.5 w-3.5 mr-1.5" />Data & Export
          </TabsTrigger>
        </TabsList>

        {/* ── Overview ── */}
        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">Current Plan</p>
                <p className={`text-xl font-bold ${planColor}`}>{planLabel}</p>
                {trialDaysLeft !== null && trialDaysLeft >= 0 && (
                  <p className="text-xs text-amber-600 mt-1">{trialDaysLeft} days left in trial</p>
                )}
                {trialDaysLeft !== null && trialDaysLeft < 0 && (
                  <p className="text-xs text-destructive mt-1">Trial expired</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">Account Status</p>
                <Badge variant={statusConf.variant} className="flex items-center gap-1 w-fit mt-1">
                  {statusConf.icon}
                  {statusConf.label}
                </Badge>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">Users</p>
                <div className="flex items-center gap-1 mt-1">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xl font-bold">{tenantInfo?.userCount ?? 0}</span>
                  <span className="text-muted-foreground text-sm">/ {tenantInfo?.maxUsers ?? 5}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="h-4 w-4" /> Included Modules
              </CardTitle>
              <CardDescription>Features available on your {planLabel} plan</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {(planFeatures?.modules ?? []).map((mod) => (
                  <Badge key={mod} variant="secondary" className="flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3 text-green-600" />
                    {MODULE_LABELS[mod] ?? mod}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Subscription ── */}
        <TabsContent value="subscription" className="mt-4">
          <SubscriptionManagement />
        </TabsContent>

        {/* ── Company Info ── */}
        <TabsContent value="company" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Company Information</CardTitle>
              <CardDescription>Update your contact details and billing information</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit((d) => updateMutation.mutate(d))} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">Company Name</p>
                      <p className="text-sm font-semibold">{tenantInfo?.name}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">Company URL (slug)</p>
                      <p className="text-sm font-mono text-muted-foreground">{tenantInfo?.slug}</p>
                    </div>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField control={form.control} name="billingEmail" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Billing Email</FormLabel>
                        <FormControl><Input placeholder="billing@company.com" {...field} data-testid="input-billing-email" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="contactName" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact Name</FormLabel>
                        <FormControl><Input placeholder="Primary contact" {...field} data-testid="input-contact-name" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="contactPhone" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact Phone</FormLabel>
                        <FormControl><Input placeholder="9876543210" {...field} data-testid="input-contact-phone" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="gstNumber" render={({ field }) => (
                      <FormItem>
                        <FormLabel>GST Number</FormLabel>
                        <FormControl><Input placeholder="27AABCA1234B1Z5" {...field} data-testid="input-gst-number" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>

                  <FormField control={form.control} name="address" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company Address</FormLabel>
                      <FormControl><Textarea placeholder="Full registered address..." rows={2} {...field} data-testid="input-address" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <div className="flex justify-end pt-2">
                    <Button type="submit" disabled={updateMutation.isPending} data-testid="button-save-company">
                      {updateMutation.isPending
                        ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</>
                        : <><Save className="mr-2 h-4 w-4" />Save Changes</>}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Branding ── */}
        <TabsContent value="branding" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Palette className="h-4 w-4" /> Branding
              </CardTitle>
              <CardDescription>
                Customise the logo and brand color that appear in the application header
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit((d) => updateMutation.mutate(d))} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField control={form.control} name="logoUrl" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Logo URL</FormLabel>
                        <FormControl><Input placeholder="https://cdn.example.com/logo.png" {...field} data-testid="input-logo-url" /></FormControl>
                        <FormMessage />
                        {field.value && (
                          <img
                            src={field.value}
                            alt="Logo preview"
                            className="h-10 mt-1 rounded object-contain border border-border bg-card p-1"
                            onError={(e) => (e.currentTarget.style.display = "none")}
                          />
                        )}
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="primaryColor" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Brand Color</FormLabel>
                        <div className="flex items-center gap-2">
                          <FormControl>
                            <Input
                              placeholder="#1a56db"
                              {...field}
                              onChange={(e) => { field.onChange(e); setColorPreview(e.target.value); }}
                              data-testid="input-primary-color"
                            />
                          </FormControl>
                          <input
                            type="color"
                            value={colorPreview || field.value || "#1a56db"}
                            onChange={(e) => { field.onChange(e.target.value); setColorPreview(e.target.value); }}
                            className="h-9 w-9 rounded border border-input cursor-pointer"
                            data-testid="color-picker"
                          />
                        </div>
                        <FormMessage />
                        {field.value && /^#[0-9a-fA-F]{6}$/.test(field.value) && (
                          <div className="flex items-center gap-2 mt-1">
                            <div
                              className="h-5 w-5 rounded-full border border-border"
                              style={{ backgroundColor: field.value }}
                            />
                            <span className="text-xs text-muted-foreground">Preview: {field.value}</span>
                          </div>
                        )}
                      </FormItem>
                    )} />
                  </div>

                  <div className="flex justify-end pt-2">
                    <Button type="submit" disabled={updateMutation.isPending} data-testid="button-save-branding">
                      {updateMutation.isPending
                        ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</>
                        : <><Save className="mr-2 h-4 w-4" />Save Branding</>}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Notifications ── */}
        <TabsContent value="notifications" className="mt-4 space-y-4">
          <Form {...notifForm}>
            <form onSubmit={notifForm.handleSubmit((d) => notifMutation.mutate(d))} className="space-y-4">

              {/* Email Settings */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Email Notifications</CardTitle>
                  <CardDescription>
                    Configure the sender name shown on emails sent from this company account.
                    By default, emails are sent from the Kinto platform address.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField control={notifForm.control} name="emailEnabled" render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-md border border-border p-3">
                      <div>
                        <FormLabel className="text-sm font-medium">Enable Email Notifications</FormLabel>
                        <FormDescription className="text-xs">Send automated reminders and alerts via email</FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-email-enabled" />
                      </FormControl>
                    </FormItem>
                  )} />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField control={notifForm.control} name="senderName" render={({ field }) => (
                      <FormItem>
                        <FormLabel>From Name</FormLabel>
                        <FormControl>
                          <Input placeholder={tenantInfo?.name ?? "Your Company Name"} {...field} data-testid="input-sender-name" />
                        </FormControl>
                        <FormDescription className="text-xs">Shown as the sender name in email clients</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={notifForm.control} name="senderEmail" render={({ field }) => (
                      <FormItem>
                        <FormLabel>From Email (optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="noreply@yourcompany.com" {...field} data-testid="input-sender-email" />
                        </FormControl>
                        <FormDescription className="text-xs">Leave blank to use platform default</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                </CardContent>
              </Card>

              {/* WhatsApp Settings */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">WhatsApp Notifications</CardTitle>
                  <CardDescription>
                    Configure your own WhatsApp Business number, or leave blank to use the Kinto platform number.
                    Requires a Meta WhatsApp Business API account.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField control={notifForm.control} name="whatsappEnabled" render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-md border border-border p-3">
                      <div>
                        <FormLabel className="text-sm font-medium">Enable WhatsApp Notifications</FormLabel>
                        <FormDescription className="text-xs">Send checklist reminders and alerts via WhatsApp</FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-whatsapp-enabled" />
                      </FormControl>
                    </FormItem>
                  )} />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField control={notifForm.control} name="metaPhoneNumberId" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number ID</FormLabel>
                        <FormControl>
                          <Input placeholder="123456789012345" {...field} data-testid="input-meta-phone-id" />
                        </FormControl>
                        <FormDescription className="text-xs">From your Meta Business WhatsApp dashboard</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={notifForm.control} name="metaVerifyToken" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Verify Token</FormLabel>
                        <FormControl>
                          <Input placeholder="your-verify-token" {...field} data-testid="input-meta-verify-token" />
                        </FormControl>
                        <FormDescription className="text-xs">Webhook verify token from Meta settings</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>

                  <FormField control={notifForm.control} name="metaAccessToken" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Access Token</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="EAAxxxxx..." {...field} data-testid="input-meta-access-token" />
                      </FormControl>
                      <FormDescription className="text-xs">Long-lived access token from Meta Business. Stored securely.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )} />
                </CardContent>
              </Card>

              {/* Test Mode */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Test Mode</CardTitle>
                  <CardDescription>
                    When test mode is on, notifications are only logged — no real messages are sent.
                    Turn off only when ready to send live notifications.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <FormField control={notifForm.control} name="testMode" render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-md border border-border p-3">
                      <div>
                        <FormLabel className="text-sm font-medium">Test Mode (console logging only)</FormLabel>
                        <FormDescription className="text-xs">No real emails or WhatsApp messages sent</FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-test-mode" />
                      </FormControl>
                    </FormItem>
                  )} />
                </CardContent>
              </Card>

              <div className="flex justify-end">
                <Button type="submit" disabled={notifMutation.isPending} data-testid="button-save-notifications">
                  {notifMutation.isPending
                    ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</>
                    : <><Save className="mr-2 h-4 w-4" />Save Notification Settings</>}
                </Button>
              </div>
            </form>
          </Form>
        </TabsContent>

        {/* ── Data & Export ── */}
        <TabsContent value="data" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileJson className="h-4 w-4" /> Export Company Data
              </CardTitle>
              <CardDescription>
                Download all your company data as a JSON file. Includes invoices, products, vendors,
                journal entries, expenses, documents, and more. Available at any time, even if your
                account is suspended.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-md border border-border bg-muted/40 p-4 space-y-2">
                <p className="text-sm font-medium">What's included in the export:</p>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Invoices &amp; invoice line items</li>
                  <li>Sales orders &amp; purchase orders</li>
                  <li>Vendors, products &amp; raw materials</li>
                  <li>Gatepasses &amp; dispatch records</li>
                  <li>Journal entries &amp; chart of accounts</li>
                  <li>Expenses, cash register &amp; documents</li>
                  <li>Users &amp; roles</li>
                  <li>Production &amp; finished goods records</li>
                </ul>
              </div>

              <div className="flex items-start gap-3 rounded-md border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30 p-3">
                <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                <p className="text-sm text-amber-700 dark:text-amber-400">
                  The export is a point-in-time snapshot. For large datasets it may take a few seconds to generate.
                  The file will be downloaded directly to your device.
                </p>
              </div>

              <Button
                onClick={handleExport}
                disabled={exportLoading}
                data-testid="button-export-data"
              >
                {exportLoading
                  ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generating export...</>
                  : <><Download className="mr-2 h-4 w-4" />Download All Data (JSON)</>}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Account Information</CardTitle>
              <CardDescription>Read-only account details</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Company ID</p>
                  <p className="font-mono font-medium">{tenantInfo?.id}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Company Slug</p>
                  <p className="font-mono font-medium">{tenantInfo?.slug}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Registered On</p>
                  <p className="font-medium">
                    {tenantInfo?.createdAt ? new Date(tenantInfo.createdAt).toLocaleDateString("en-IN") : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Plan</p>
                  <p className={`font-medium ${planColor}`}>{planLabel}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
