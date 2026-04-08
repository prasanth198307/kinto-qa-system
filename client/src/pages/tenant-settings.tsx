import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { Building2, Users, Package, CheckCircle2, Clock, XCircle, Loader2, Save, Palette } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { differenceInDays } from "date-fns";

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
}

interface PlanFeatures {
  plan: string;
  modules: string[];
  allowedNavItems: string[];
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
};

const PLAN_LABELS: Record<string, { label: string; color: string }> = {
  trial: { label: "Trial", color: "text-amber-600" },
  basic: { label: "Basic", color: "text-blue-600" },
  professional: { label: "Professional", color: "text-violet-600" },
  enterprise: { label: "Enterprise", color: "text-emerald-600" },
};

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }> = {
  active: { label: "Active", variant: "default", icon: <CheckCircle2 className="h-3 w-3" /> },
  trial: { label: "Trial", variant: "secondary", icon: <Clock className="h-3 w-3" /> },
  suspended: { label: "Suspended", variant: "destructive", icon: <XCircle className="h-3 w-3" /> },
  expired: { label: "Expired", variant: "outline", icon: <XCircle className="h-3 w-3" /> },
};

const settingsSchema = z.object({
  billingEmail: z.string().email("Invalid email").or(z.literal("")),
  contactName: z.string().max(255).optional(),
  contactPhone: z.string().max(20).optional(),
  gstNumber: z.string().max(20).optional(),
  address: z.string().optional(),
  logoUrl: z.string().url("Must be a valid URL").or(z.literal("")).optional(),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Must be a hex color e.g. #2563eb").optional(),
});

type SettingsForm = z.infer<typeof settingsSchema>;

export default function TenantSettings() {
  const { toast } = useToast();
  const [colorPreview, setColorPreview] = useState<string>("");

  const { data: tenantInfo, isLoading: infoLoading } = useQuery<TenantInfo>({
    queryKey: ["/api/tenant/info"],
  });

  const { data: planFeatures } = useQuery<PlanFeatures>({
    queryKey: ["/api/tenant/features"],
  });

  const form = useForm<SettingsForm>({
    resolver: zodResolver(settingsSchema),
    values: {
      billingEmail: tenantInfo?.billingEmail ?? "",
      contactName: tenantInfo?.contactName ?? "",
      contactPhone: tenantInfo?.contactPhone ?? "",
      gstNumber: tenantInfo?.gstNumber ?? "",
      address: tenantInfo?.address ?? "",
      logoUrl: tenantInfo?.logoUrl ?? "",
      primaryColor: tenantInfo?.primaryColor ?? "#1a56db",
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

  const planConf = PLAN_LABELS[tenantInfo?.plan ?? "trial"] ?? PLAN_LABELS.trial;
  const statusConf = STATUS_CONFIG[tenantInfo?.status ?? "trial"] ?? STATUS_CONFIG.trial;

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Building2 className="h-6 w-6 text-primary" />
          Company Settings
        </h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          View your subscription plan and manage company information
        </p>
      </div>

      {/* Plan + Status cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Plan */}
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Current Plan</p>
            <p className={`text-xl font-bold ${planConf.color}`}>{planConf.label}</p>
            {trialDaysLeft !== null && trialDaysLeft >= 0 && (
              <p className="text-xs text-amber-600 mt-1">{trialDaysLeft} days left in trial</p>
            )}
            {trialDaysLeft !== null && trialDaysLeft < 0 && (
              <p className="text-xs text-destructive mt-1">Trial expired</p>
            )}
          </CardContent>
        </Card>

        {/* Status */}
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Account Status</p>
            <Badge variant={statusConf.variant} className="flex items-center gap-1 w-fit mt-1">
              {statusConf.icon}
              {statusConf.label}
            </Badge>
          </CardContent>
        </Card>

        {/* Users */}
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

      {/* Included modules */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="h-4 w-4" />
            Included Modules
          </CardTitle>
          <CardDescription>Features available on your {planConf.label} plan</CardDescription>
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

      {/* Company info form */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Company Information</CardTitle>
          <CardDescription>Update your contact details and billing information</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((d) => updateMutation.mutate(d))} className="space-y-4">
              {/* Read-only fields */}
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

              <Separator />

              {/* Branding */}
              <div>
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Palette className="h-4 w-4" /> Branding
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField control={form.control} name="logoUrl" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Logo URL</FormLabel>
                      <FormControl><Input placeholder="https://..." {...field} data-testid="input-logo-url" /></FormControl>
                      <FormMessage />
                      {field.value && (
                        <img src={field.value} alt="Logo preview" className="h-10 mt-1 rounded object-contain border border-border bg-card p-1" onError={(e) => (e.currentTarget.style.display = "none")} />
                      )}
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="primaryColor" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Brand Color</FormLabel>
                      <div className="flex items-center gap-2">
                        <FormControl><Input placeholder="#1a56db" {...field} onChange={(e) => { field.onChange(e); setColorPreview(e.target.value); }} data-testid="input-primary-color" /></FormControl>
                        <input
                          type="color"
                          value={colorPreview || field.value || "#1a56db"}
                          onChange={(e) => { field.onChange(e.target.value); setColorPreview(e.target.value); }}
                          className="h-9 w-9 rounded border border-input cursor-pointer"
                          data-testid="color-picker"
                        />
                      </div>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button type="submit" disabled={updateMutation.isPending} data-testid="button-save-settings">
                  {updateMutation.isPending ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</>
                  ) : (
                    <><Save className="mr-2 h-4 w-4" />Save Changes</>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
