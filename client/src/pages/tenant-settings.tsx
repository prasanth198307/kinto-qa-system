import { useState, useRef, type ReactNode } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Building2, Users, Package, CheckCircle2, Clock, XCircle,
  Loader2, Save, Palette, CreditCard, Download, Bell, FileJson, AlertCircle,
  Upload, ImageIcon, X, Tags, Sliders, Trash2, Plus, Globe,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { differenceInDays } from "date-fns";
import SubscriptionManagement from "./subscription-management";
import { useTenantConfig, formatCurrency as fmtCur } from "@/hooks/use-tenant-config";

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
  fssaiNumber: string | null;
  address: string | null;
  industry: string | null;
  website: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  registrationNumber: string | null;
  country: string | null;
  currency: string | null;
  timezone: string | null;
  dateFormat: string | null;
  fiscalYearStart: number | null;
  taxRegime: string | null;
  defaultLocale: string | null;
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

const INDUSTRIES = [
  "Manufacturing", "Healthcare", "Education", "Logistics & Transport",
  "Real Estate", "Retail & Distribution", "Agriculture", "Services",
  "Trading", "Construction", "Pharmaceuticals", "Food & Beverages",
  "Hospitality", "IT & Software", "Other",
];

const COUNTRIES = [
  { code: "IN", name: "India", flag: "🇮🇳" },
  { code: "AE", name: "United Arab Emirates", flag: "🇦🇪" },
  { code: "SA", name: "Saudi Arabia", flag: "🇸🇦" },
  { code: "US", name: "United States", flag: "🇺🇸" },
  { code: "GB", name: "United Kingdom", flag: "🇬🇧" },
  { code: "AU", name: "Australia", flag: "🇦🇺" },
  { code: "SG", name: "Singapore", flag: "🇸🇬" },
  { code: "MY", name: "Malaysia", flag: "🇲🇾" },
  { code: "NG", name: "Nigeria", flag: "🇳🇬" },
  { code: "KE", name: "Kenya", flag: "🇰🇪" },
  { code: "ZA", name: "South Africa", flag: "🇿🇦" },
  { code: "DE", name: "Germany", flag: "🇩🇪" },
  { code: "FR", name: "France", flag: "🇫🇷" },
  { code: "CA", name: "Canada", flag: "🇨🇦" },
  { code: "NZ", name: "New Zealand", flag: "🇳🇿" },
  { code: "BD", name: "Bangladesh", flag: "🇧🇩" },
  { code: "LK", name: "Sri Lanka", flag: "🇱🇰" },
  { code: "NP", name: "Nepal", flag: "🇳🇵" },
  { code: "QA", name: "Qatar", flag: "🇶🇦" },
  { code: "KW", name: "Kuwait", flag: "🇰🇼" },
  { code: "BH", name: "Bahrain", flag: "🇧🇭" },
  { code: "OM", name: "Oman", flag: "🇴🇲" },
  { code: "PH", name: "Philippines", flag: "🇵🇭" },
  { code: "ID", name: "Indonesia", flag: "🇮🇩" },
  { code: "TZ", name: "Tanzania", flag: "🇹🇿" },
  { code: "UG", name: "Uganda", flag: "🇺🇬" },
  { code: "GH", name: "Ghana", flag: "🇬🇭" },
];

const CURRENCIES = [
  { code: "INR", symbol: sym, name: "Indian Rupee" },
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "AED", symbol: "د.إ", name: "UAE Dirham" },
  { code: "SAR", symbol: "﷼", name: "Saudi Riyal" },
  { code: "GBP", symbol: "£", name: "British Pound" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "SGD", symbol: "S$", name: "Singapore Dollar" },
  { code: "MYR", symbol: "RM", name: "Malaysian Ringgit" },
  { code: "AUD", symbol: "A$", name: "Australian Dollar" },
  { code: "CAD", symbol: "C$", name: "Canadian Dollar" },
  { code: "ZAR", symbol: "R", name: "South African Rand" },
  { code: "NGN", symbol: "₦", name: "Nigerian Naira" },
  { code: "KES", symbol: "KSh", name: "Kenyan Shilling" },
  { code: "QAR", symbol: "QR", name: "Qatari Riyal" },
  { code: "KWD", symbol: "KD", name: "Kuwaiti Dinar" },
  { code: "BHD", symbol: "BD", name: "Bahraini Dinar" },
  { code: "OMR", symbol: "RO", name: "Omani Rial" },
  { code: "BDT", symbol: "৳", name: "Bangladeshi Taka" },
  { code: "LKR", symbol: "Rs", name: "Sri Lankan Rupee" },
  { code: "NPR", symbol: "Rs", name: "Nepali Rupee" },
  { code: "PHP", symbol: "₱", name: "Philippine Peso" },
  { code: "IDR", symbol: "Rp", name: "Indonesian Rupiah" },
];

const TIMEZONES = [
  { value: "Asia/Kolkata",       label: "IST (Asia/Kolkata) — India +5:30" },
  { value: "Asia/Dubai",         label: "GST (Asia/Dubai) — UAE +4:00" },
  { value: "Asia/Riyadh",        label: "AST (Asia/Riyadh) — Saudi Arabia +3:00" },
  { value: "Asia/Singapore",     label: "SGT (Asia/Singapore) — Singapore +8:00" },
  { value: "Asia/Kuala_Lumpur",  label: "MYT (Asia/Kuala_Lumpur) — Malaysia +8:00" },
  { value: "Asia/Dhaka",         label: "BST (Asia/Dhaka) — Bangladesh +6:00" },
  { value: "Asia/Colombo",       label: "SLST (Asia/Colombo) — Sri Lanka +5:30" },
  { value: "Asia/Kathmandu",     label: "NPT (Asia/Kathmandu) — Nepal +5:45" },
  { value: "Asia/Manila",        label: "PHT (Asia/Manila) — Philippines +8:00" },
  { value: "Asia/Jakarta",       label: "WIB (Asia/Jakarta) — Indonesia +7:00" },
  { value: "America/New_York",   label: "EST (America/New_York) — US East -5:00" },
  { value: "America/Chicago",    label: "CST (America/Chicago) — US Central -6:00" },
  { value: "America/Denver",     label: "MST (America/Denver) — US Mountain -7:00" },
  { value: "America/Los_Angeles",label: "PST (America/Los_Angeles) — US West -8:00" },
  { value: "America/Toronto",    label: "EST (America/Toronto) — Canada East -5:00" },
  { value: "America/Vancouver",  label: "PST (America/Vancouver) — Canada West -8:00" },
  { value: "Europe/London",      label: "GMT (Europe/London) — UK +0:00" },
  { value: "Europe/Berlin",      label: "CET (Europe/Berlin) — Germany +1:00" },
  { value: "Europe/Paris",       label: "CET (Europe/Paris) — France +1:00" },
  { value: "Australia/Sydney",   label: "AEDT (Australia/Sydney) — Australia East +11:00" },
  { value: "Australia/Perth",    label: "AWST (Australia/Perth) — Australia West +8:00" },
  { value: "Pacific/Auckland",   label: "NZDT (Pacific/Auckland) — New Zealand +13:00" },
  { value: "Africa/Nairobi",     label: "EAT (Africa/Nairobi) — Kenya +3:00" },
  { value: "Africa/Lagos",       label: "WAT (Africa/Lagos) — Nigeria +1:00" },
  { value: "Africa/Johannesburg",label: "SAST (Africa/Johannesburg) — South Africa +2:00" },
  { value: "UTC",                label: "UTC — Universal Time" },
];

const settingsSchema = z.object({
  billingEmail:       z.string().email("Invalid email").or(z.literal("")),
  contactName:        z.string().max(255).optional(),
  contactPhone:       z.string().max(20).optional(),
  gstNumber:          z.string().max(20).optional(),
  fssaiNumber:        z.string().max(20).optional(),
  address:            z.string().optional(),
  industry:           z.string().optional(),
  website:            z.string().max(255).optional(),
  city:               z.string().max(100).optional(),
  state:              z.string().max(100).optional(),
  pincode:            z.string().max(20).optional(),
  registrationNumber: z.string().max(100).optional(),
  country:            z.string().max(50).optional(),
  logoUrl:            z.string().optional(),
  primaryColor:       z.string().regex(/^#[0-9a-fA-F]{6}$/, "Must be a hex color e.g. #2563eb").or(z.literal("")).optional(),
  currency:           z.string().max(10).optional(),
  timezone:           z.string().max(50).optional(),
  dateFormat:         z.string().max(20).optional(),
  fiscalYearStart:    z.number().min(1).max(12).optional(),
  taxRegime:          z.string().max(20).optional(),
  defaultLocale:      z.string().max(10).optional(),
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
  const { currency_symbol: sym } = useTenantConfig();
  const { toast } = useToast();
  const [colorPreview, setColorPreview] = useState<string>("");
  const [exportLoading, setExportLoading] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

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
      billingEmail:       tenantInfo?.billingEmail ?? "",
      contactName:        tenantInfo?.contactName ?? "",
      contactPhone:       tenantInfo?.contactPhone ?? "",
      gstNumber:          tenantInfo?.gstNumber ?? "",
      fssaiNumber:        tenantInfo?.fssaiNumber ?? "",
      address:            tenantInfo?.address ?? "",
      industry:           tenantInfo?.industry ?? "",
      website:            tenantInfo?.website ?? "",
      city:               tenantInfo?.city ?? "",
      state:              tenantInfo?.state ?? "",
      pincode:            tenantInfo?.pincode ?? "",
      registrationNumber: tenantInfo?.registrationNumber ?? "",
      country:            tenantInfo?.country ?? "India",
      logoUrl:            tenantInfo?.logoUrl ?? "",
      primaryColor:       tenantInfo?.primaryColor ?? "#1a56db",
      currency:           tenantInfo?.currency ?? "INR",
      timezone:           tenantInfo?.timezone ?? "Asia/Kolkata",
      dateFormat:         tenantInfo?.dateFormat ?? "DD/MM/YYYY",
      fiscalYearStart:    tenantInfo?.fiscalYearStart ?? 4,
      taxRegime:          tenantInfo?.taxRegime ?? "gst",
      defaultLocale:      tenantInfo?.defaultLocale ?? "en",
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
    <div className="p-4 sm:p-6 space-y-6 max-w-5xl mx-auto">
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
          <TabsTrigger value="labels"        data-testid="tab-settings-labels">
            <Tags className="h-3.5 w-3.5 mr-1.5" />Module Labels
          </TabsTrigger>
          <TabsTrigger value="custom-fields" data-testid="tab-settings-custom-fields">
            <Sliders className="h-3.5 w-3.5 mr-1.5" />Custom Fields
          </TabsTrigger>
          <TabsTrigger value="localization" data-testid="tab-settings-localization">
            <Globe className="h-3.5 w-3.5 mr-1.5" />Localization
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
                    <FormField control={form.control} name="gstNumber" render={({ field }) => {
                      const country = form.watch("country") ?? "India";
                      const taxLabel = country === "United Arab Emirates" || country === "Saudi Arabia" || country === "Qatar" || country === "Kuwait" || country === "Bahrain" || country === "Oman" ? "VAT / TRN Number"
                        : country === "United States" ? "EIN / Tax ID"
                        : country === "United Kingdom" ? "VAT Number"
                        : country === "Australia" ? "ABN / Tax File Number"
                        : country === "Singapore" ? "GST / UEN Number"
                        : "GST Number";
                      const taxPlaceholder = country === "United Arab Emirates" ? "100123456700003"
                        : country === "United States" ? "12-3456789"
                        : country === "United Kingdom" ? "GB123456789"
                        : "27AABCA1234B1Z5";
                      return (
                        <FormItem>
                          <FormLabel>{taxLabel}</FormLabel>
                          <FormControl><Input placeholder={taxPlaceholder} {...field} data-testid="input-gst-number" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      );
                    }} />
                    <FormField control={form.control} name="registrationNumber" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company Registration No. <span className="text-muted-foreground text-xs">(CIN / CR / Corp No.)</span></FormLabel>
                        <FormControl><Input placeholder="U12345KA2023PTC123456" {...field} data-testid="input-registration-number" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="fssaiNumber" render={({ field }) => (
                      <FormItem>
                        <FormLabel>FSSAI License No. <span className="text-muted-foreground text-xs">(food businesses)</span></FormLabel>
                        <FormControl><Input placeholder="10012345000123" {...field} data-testid="input-fssai-number" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="website" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Website</FormLabel>
                        <FormControl><Input placeholder="https://www.yourcompany.com" {...field} data-testid="input-website" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>

                  <FormField control={form.control} name="address" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Street Address</FormLabel>
                      <FormControl><Textarea placeholder="Street / Building / Area..." rows={2} {...field} data-testid="input-address" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <FormField control={form.control} name="city" render={({ field }) => (
                      <FormItem>
                        <FormLabel>City</FormLabel>
                        <FormControl><Input placeholder="Mumbai" {...field} data-testid="input-city" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="state" render={({ field }) => (
                      <FormItem>
                        <FormLabel>State / Province</FormLabel>
                        <FormControl><Input placeholder="Maharashtra" {...field} data-testid="input-state" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="pincode" render={({ field }) => (
                      <FormItem>
                        <FormLabel>PIN / ZIP Code</FormLabel>
                        <FormControl><Input placeholder="400001" {...field} data-testid="input-pincode" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>

                  <FormField control={form.control} name="industry" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Industry</FormLabel>
                      <Select value={field.value ?? ""} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger data-testid="select-industry">
                            <SelectValue placeholder="Select your industry" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {INDUSTRIES.map((ind) => (
                            <SelectItem key={ind} value={ind}>{ind}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
                        <FormLabel>Company Logo</FormLabel>
                        {/* Hidden file input */}
                        <input
                          ref={logoInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          data-testid="input-logo-file"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            setLogoUploading(true);
                            const formData = new FormData();
                            formData.append('logo', file);
                            try {
                              const res = await fetch('/api/tenant/upload-logo', { method: 'POST', body: formData, credentials: 'include' });
                              const data = await res.json();
                              if (!res.ok) throw new Error(data.message || 'Upload failed');
                              field.onChange(data.logoUrl);
                              queryClient.invalidateQueries({ queryKey: ['/api/tenant/info'] });
                              toast({ title: 'Logo uploaded successfully' });
                            } catch (err: any) {
                              toast({ title: 'Upload failed', description: err.message, variant: 'destructive' });
                            } finally {
                              setLogoUploading(false);
                              e.target.value = '';
                            }
                          }}
                        />
                        {/* Logo preview + upload button */}
                        <div className="flex items-center gap-3">
                          <div className="h-16 w-32 rounded-md border border-border bg-muted flex items-center justify-center overflow-hidden shrink-0">
                            {field.value ? (
                              <img
                                src={field.value}
                                alt="Company logo"
                                className="h-full w-full object-contain p-1"
                                onError={(e) => (e.currentTarget.style.display = 'none')}
                              />
                            ) : (
                              <ImageIcon className="h-6 w-6 text-muted-foreground" />
                            )}
                          </div>
                          <div className="flex flex-col gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={logoUploading}
                              data-testid="button-upload-logo"
                              onClick={() => logoInputRef.current?.click()}
                            >
                              {logoUploading
                                ? <><Loader2 className="mr-2 h-3 w-3 animate-spin" />Uploading...</>
                                : <><Upload className="mr-2 h-3 w-3" />Upload Logo</>}
                            </Button>
                            {field.value && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                data-testid="button-remove-logo"
                                onClick={() => field.onChange('')}
                              >
                                <X className="mr-2 h-3 w-3" />Remove
                              </Button>
                            )}
                          </div>
                        </div>
                        <FormDescription>PNG, JPG or SVG · max 5 MB</FormDescription>
                        <FormMessage />
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
                    By default, emails are sent from the SwachERP platform address.
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
                    Configure your own WhatsApp Business number, or leave blank to use the SwachERP platform number.
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

          {/* ── Auto-PR on Reorder ── */}
          <AutPRSettingCard />
        </TabsContent>

        {/* ── Module Labels ── */}
        <TabsContent value="labels" className="mt-4">
          <ModuleLabelsTab />
        </TabsContent>

        {/* ── Custom Fields ── */}
        <TabsContent value="custom-fields" className="mt-4">
          <CustomFieldsTab />
        </TabsContent>

        {/* ── Localization ── */}
        <TabsContent value="localization" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><Globe className="h-4 w-4" /> Localization & Regional Settings</CardTitle>
              <CardDescription>Configure currency, timezone, date format, fiscal year, and tax regime for global operations</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit((d) => updateMutation.mutate(d))} className="space-y-6">

                  {/* Country & Currency */}
                  <div>
                    <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">Country & Currency</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField control={form.control} name="country" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Country</FormLabel>
                          <Select value={field.value ?? "India"} onValueChange={field.onChange}>
                            <FormControl><SelectTrigger data-testid="select-country"><SelectValue placeholder="Select country" /></SelectTrigger></FormControl>
                            <SelectContent className="max-h-60">
                              {COUNTRIES.map(c => <SelectItem key={c.code} value={c.name}>{c.flag} {c.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="currency" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Currency</FormLabel>
                          <Select value={field.value ?? "INR"} onValueChange={field.onChange}>
                            <FormControl><SelectTrigger data-testid="select-currency"><SelectValue placeholder="Select currency" /></SelectTrigger></FormControl>
                            <SelectContent className="max-h-60">
                              {CURRENCIES.map(c => <SelectItem key={c.code} value={c.code}>{c.symbol} {c.code} — {c.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                  </div>

                  <Separator />

                  {/* Date & Time */}
                  <div>
                    <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">Date & Time</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField control={form.control} name="timezone" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Timezone</FormLabel>
                          <Select value={field.value ?? "Asia/Kolkata"} onValueChange={field.onChange}>
                            <FormControl><SelectTrigger data-testid="select-timezone"><SelectValue placeholder="Select timezone" /></SelectTrigger></FormControl>
                            <SelectContent className="max-h-60">
                              {TIMEZONES.map(tz => <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="dateFormat" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date Format</FormLabel>
                          <Select value={field.value ?? "DD/MM/YYYY"} onValueChange={field.onChange}>
                            <FormControl><SelectTrigger data-testid="select-date-format"><SelectValue placeholder="Select format" /></SelectTrigger></FormControl>
                            <SelectContent>
                              <SelectItem value="DD/MM/YYYY">DD/MM/YYYY — India, UK, Australia</SelectItem>
                              <SelectItem value="MM/DD/YYYY">MM/DD/YYYY — USA</SelectItem>
                              <SelectItem value="YYYY-MM-DD">YYYY-MM-DD — ISO / International</SelectItem>
                              <SelectItem value="DD-MM-YYYY">DD-MM-YYYY — India alternate</SelectItem>
                              <SelectItem value="DD.MM.YYYY">DD.MM.YYYY — Germany, Russia</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                  </div>

                  <Separator />

                  {/* Fiscal Year & Tax */}
                  <div>
                    <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">Fiscal Year & Tax Regime</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField control={form.control} name="fiscalYearStart" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Fiscal Year Starts</FormLabel>
                          <Select value={String(field.value ?? 4)} onValueChange={v => field.onChange(Number(v))}>
                            <FormControl><SelectTrigger data-testid="select-fiscal-year"><SelectValue placeholder="Select month" /></SelectTrigger></FormControl>
                            <SelectContent>
                              <SelectItem value="1">January — US, EU, China</SelectItem>
                              <SelectItem value="4">April — India (standard)</SelectItem>
                              <SelectItem value="7">July — Australia, New Zealand</SelectItem>
                              <SelectItem value="10">October — Some Middle East</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription className="text-xs">Financial year end = month before start</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="taxRegime" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tax Regime</FormLabel>
                          <Select value={field.value ?? "gst"} onValueChange={field.onChange}>
                            <FormControl><SelectTrigger data-testid="select-tax-regime"><SelectValue placeholder="Select tax regime" /></SelectTrigger></FormControl>
                            <SelectContent>
                              <SelectItem value="gst">GST — India (CGST/SGST/IGST)</SelectItem>
                              <SelectItem value="vat">VAT — UAE, EU, UK, Gulf</SelectItem>
                              <SelectItem value="zatca">ZATCA — Saudi Arabia (Fatoora)</SelectItem>
                              <SelectItem value="sales_tax">Sales Tax — USA (state-level)</SelectItem>
                              <SelectItem value="none">No Tax / Tax Exempt</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription className="text-xs">Controls which tax fields appear on invoices</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                  </div>

                  <Separator />

                  {/* Language */}
                  <div>
                    <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">Default Language</h3>
                    <FormField control={form.control} name="defaultLocale" render={({ field }) => (
                      <FormItem className="max-w-xs">
                        <FormLabel>Interface Language</FormLabel>
                        <Select value={field.value ?? "en"} onValueChange={field.onChange}>
                          <FormControl><SelectTrigger data-testid="select-locale"><SelectValue placeholder="Select language" /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="en">English</SelectItem>
                            <SelectItem value="hi">हिंदी — Hindi</SelectItem>
                            <SelectItem value="ar">العربية — Arabic</SelectItem>
                            <SelectItem value="fr">Français — French</SelectItem>
                            <SelectItem value="de">Deutsch — German</SelectItem>
                            <SelectItem value="es">Español — Spanish</SelectItem>
                            <SelectItem value="pt">Português — Portuguese</SelectItem>
                            <SelectItem value="ta">தமிழ் — Tamil</SelectItem>
                            <SelectItem value="te">తెలుగు — Telugu</SelectItem>
                            <SelectItem value="mr">मराठी — Marathi</SelectItem>
                            <SelectItem value="kn">ಕನ್ನಡ — Kannada</SelectItem>
                            <SelectItem value="gu">ગુજરાતી — Gujarati</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription className="text-xs">Fine-tune translations in <strong>Language Settings</strong></FormDescription>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>

                  <div className="flex justify-end pt-2">
                    <Button type="submit" disabled={updateMutation.isPending} data-testid="button-save-localization">
                      {updateMutation.isPending
                        ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</>
                        : <><Save className="mr-2 h-4 w-4" />Save Localization Settings</>}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
}

// ─── Auto-PR on Reorder Setting ─────────────────────────────────────────────
function AutPRSettingCard() {
  const { toast } = useToast();
  const { data: settings = {} } = useQuery<Record<string, string>>({
    queryKey: ['/api/generic/platform-settings'],
  });
  const autoPR = settings['auto_pr_on_reorder'] === 'true';

  const saveMut = useMutation({
    mutationFn: (value: boolean) =>
      apiRequest("PUT", "/api/generic/platform-settings", { auto_pr_on_reorder: String(value) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/generic/platform-settings'] });
      toast({ title: "Setting saved" });
    },
    onError: () => toast({ title: "Failed to save", variant: "destructive" }),
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Package className="h-4 w-4" /> Inventory Automation
        </CardTitle>
        <CardDescription>Configure automatic actions for inventory events.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between gap-4 rounded-md border p-4">
          <div className="space-y-0.5">
            <p className="text-sm font-medium">Auto-create Purchase Requisition on Reorder</p>
            <p className="text-xs text-muted-foreground">
              When any item's stock falls to or below its reorder point, the system automatically
              creates a draft Purchase Requisition for review — no manual step needed.
            </p>
          </div>
          <Switch
            checked={autoPR}
            onCheckedChange={(v) => saveMut.mutate(v)}
            disabled={saveMut.isPending}
            data-testid="switch-auto-pr"
          />
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Module Labels Component ─────────────────────────────────────────────────
const DEFAULT_MODULE_LABELS = [
  { key: "invoices", label: "Invoices" },
  { key: "purchase_orders", label: "Purchase Orders" },
  { key: "customers", label: "Customers" },
  { key: "vendors", label: "Vendors" },
  { key: "products", label: "Products / Items" },
  { key: "raw_materials", label: "Raw Materials" },
  { key: "gatepasses", label: "Gate Passes" },
  { key: "production", label: "Production Orders" },
  { key: "quality", label: "Quality Checks" },
  { key: "maintenance", label: "Preventive Maintenance" },
  { key: "hr", label: "HR & Payroll" },
  { key: "projects", label: "Projects" },
  { key: "assets", label: "Fixed Assets" },
  { key: "expenses", label: "Expense Claims" },
  { key: "timesheets", label: "Timesheets" },
];

function ModuleLabelsTab() {
  const { toast } = useToast();
  const { data: saved = [] } = useQuery<any[]>({ queryKey: ["/api/hr/module-labels"] });
  const [labels, setLabels] = useState<Record<string, string>>({});

  const savedMap = (saved as any[]).reduce((m: any, r: any) => { m[r.module_key] = r.custom_label; return m; }, {});
  const currentLabels = DEFAULT_MODULE_LABELS.reduce((m: any, d) => { m[d.key] = labels[d.key] ?? (savedMap[d.key] || d.label); return m; }, {});

  const saveMutation = useMutation({
    mutationFn: () => apiRequest("PUT", "/api/hr/module-labels", {
      labels: DEFAULT_MODULE_LABELS
        .filter(d => currentLabels[d.key] !== d.label)
        .map(d => ({ moduleKey: d.key, customLabel: currentLabels[d.key] })),
    }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/hr/module-labels"] }); toast({ title: "Module labels saved" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 space-y-1">
          <p className="font-medium">Customise Module Names</p>
          <p className="text-sm text-muted-foreground">Rename any module to match your industry terminology. E.g., rename "Products" to "SKUs" or "Gate Passes" to "Delivery Notes".</p>
        </CardContent>
      </Card>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {DEFAULT_MODULE_LABELS.map(d => (
          <div key={d.key} className="flex items-center gap-2">
            <div className="w-36 text-sm text-muted-foreground shrink-0">{d.label}</div>
            <Input
              value={currentLabels[d.key]}
              onChange={e => setLabels(p => ({ ...p, [d.key]: e.target.value }))}
              placeholder={d.label}
              className="flex-1"
              data-testid={`input-label-${d.key}`}
            />
          </div>
        ))}
      </div>
      <div className="flex justify-end">
        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} data-testid="button-save-labels">
          {saveMutation.isPending ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" />Saving...</> : <><Save className="w-4 h-4 mr-1" />Save Labels</>}
        </Button>
      </div>
    </div>
  );
}

// ─── Custom Fields Component ─────────────────────────────────────────────────
const ENTITY_TYPES = [
  { value: "invoice", label: "Invoice" },
  { value: "invoice_item", label: "Invoice Line Item" },
  { value: "purchase_order", label: "Purchase Order" },
  { value: "customer", label: "Customer" },
  { value: "vendor", label: "Vendor" },
  { value: "item", label: "Product / Item" },
  { value: "employee", label: "Employee" },
  { value: "project", label: "Project" },
  { value: "asset", label: "Fixed Asset" },
];

const FIELD_TYPES = [
  { value: "text", label: "Text" },
  { value: "number", label: "Number" },
  { value: "date", label: "Date" },
  { value: "select", label: "Dropdown" },
  { value: "checkbox", label: "Checkbox" },
  { value: "textarea", label: "Text Area" },
];

function CustomFieldsTab() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ entityType: "invoice", fieldName: "", fieldLabel: "", fieldType: "text", isRequired: false, sortOrder: "0" });
  const { data: fields = [], isLoading } = useQuery<any[]>({ queryKey: ["/api/hr/custom-fields"] });

  const saveMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/hr/custom-fields", {
      entityType: form.entityType, fieldName: form.fieldName.toLowerCase().replace(/\s+/g, "_"),
      fieldLabel: form.fieldLabel, fieldType: form.fieldType, isRequired: form.isRequired, sortOrder: Number(form.sortOrder),
    }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/hr/custom-fields"] }); toast({ title: "Custom field created" }); setDialogOpen(false); setForm({ entityType: "invoice", fieldName: "", fieldLabel: "", fieldType: "text", isRequired: false, sortOrder: "0" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/hr/custom-fields/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/hr/custom-fields"] }); toast({ title: "Field removed" }); },
  });

  const byEntity = (fields as any[]).reduce((m: any, f: any) => { if (!m[f.entity_type]) m[f.entity_type] = []; m[f.entity_type].push(f); return m; }, {});

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setDialogOpen(true)} data-testid="button-new-custom-field"><Plus className="w-4 h-4 mr-1" />Add Custom Field</Button>
      </div>
      {isLoading ? <p className="text-center py-8 text-muted-foreground">Loading...</p> : (fields as any[]).length === 0 ? (
        <div className="text-center py-12 text-muted-foreground"><Sliders className="w-10 h-10 mx-auto mb-2 opacity-40" /><p>No custom fields defined</p><p className="text-xs mt-1">Add fields to extend invoices, items, employees, and more</p></div>
      ) : (
        <div className="space-y-4">
          {Object.entries(byEntity).map(([entityType, entityFields]: [string, any]) => (
            <div key={entityType}>
              <p className="text-sm font-medium mb-2">{ENTITY_TYPES.find(e => e.value === entityType)?.label || entityType}</p>
              <Card><CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50"><tr><th className="text-left p-3">Label</th><th className="text-left p-3">Field Name</th><th className="text-left p-3">Type</th><th className="p-3">Required</th><th className="p-3"></th></tr></thead>
                  <tbody>
                    {entityFields.map((f: any) => (
                      <tr key={f.id} className="border-t">
                        <td className="p-3 font-medium">{f.field_label}</td>
                        <td className="p-3 font-mono text-xs text-muted-foreground">{f.field_name}</td>
                        <td className="p-3 text-muted-foreground">{FIELD_TYPES.find(t => t.value === f.field_type)?.label || f.field_type}</td>
                        <td className="p-3 text-center">{f.is_required ? "Yes" : "No"}</td>
                        <td className="p-3 text-right"><Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(f.id)} data-testid={`button-delete-field-${f.id}`}><Trash2 className="w-4 h-4 text-destructive" /></Button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent></Card>
            </div>
          ))}
        </div>
      )}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Custom Field</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Entity (which form?) <span className="text-destructive">*</span></Label>
              <Select value={form.entityType} onValueChange={v => setForm(p => ({ ...p, entityType: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ENTITY_TYPES.map(e => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Field Label <span className="text-destructive">*</span></Label><Input value={form.fieldLabel} onChange={e => setForm(p => ({ ...p, fieldLabel: e.target.value, fieldName: e.target.value.toLowerCase().replace(/\s+/g, "_") }))} placeholder="e.g. Customer PO Number" data-testid="input-field-label" /></div>
            <div><Label>Field Name (auto)</Label><Input value={form.fieldName} readOnly className="font-mono text-xs bg-muted" /></div>
            <div>
              <Label>Field Type</Label>
              <Select value={form.fieldType} onValueChange={v => setForm(p => ({ ...p, fieldType: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{FIELD_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2">
                <input type="checkbox" id="isRequired" checked={form.isRequired} onChange={e => setForm(p => ({ ...p, isRequired: e.target.checked }))} />
                <label htmlFor="isRequired" className="text-sm">Required field</label>
              </div>
              <div><Label>Sort Order</Label><Input type="number" value={form.sortOrder} onChange={e => setForm(p => ({ ...p, sortOrder: e.target.value }))} /></div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !form.fieldLabel} data-testid="button-save-custom-field">
                {saveMutation.isPending ? "Saving..." : "Create Field"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
