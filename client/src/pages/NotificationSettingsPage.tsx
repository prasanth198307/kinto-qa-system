/**
 * Notification Settings Page
 * Manage and test all cross-vertical notification triggers.
 * Route: /notification-settings
 */

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Bell, Send, RefreshCw, CheckCircle, AlertCircle, Loader2, CreditCard, Calendar, GraduationCap, Hotel, UtensilsCrossed, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const VERTICAL_TRIGGERS = [
  {
    id: "emi_due",
    label: "Nidhi — EMI Due Reminders",
    description: "Sends WhatsApp + Email to members whose EMI is due in next 3 days",
    icon: CreditCard,
    color: "text-orange-600",
    bg: "bg-orange-50",
  },
  {
    id: "fd_maturity",
    label: "Nidhi — FD Maturity Alerts",
    description: "Alerts members when their Fixed Deposit matures within 7 days",
    icon: DollarSign,
    color: "text-green-600",
    bg: "bg-green-50",
  },
  {
    id: "fee_due",
    label: "Education — Fee Due Reminders",
    description: "Notifies parents when student fee balance is pending",
    icon: GraduationCap,
    color: "text-blue-600",
    bg: "bg-blue-50",
  },
  {
    id: "appointment",
    label: "Healthcare — Appointment Reminders",
    description: "Reminds patients of appointments scheduled for tomorrow",
    icon: Calendar,
    color: "text-purple-600",
    bg: "bg-purple-50",
  },
];

interface RunResult {
  emi: number;
  fd: number;
  fee: number;
  appt: number;
}

export default function NotificationSettingsPage() {
  const { toast } = useToast();
  const [lastRun, setLastRun] = useState<RunResult | null>(null);

  const runRemindersMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/notifications/run-reminders"),
    onSuccess: (data: any) => {
      setLastRun(data.sent);
      toast({
        title: "Reminders sent",
        description: `EMI: ${data.sent.emi} | FD: ${data.sent.fd} | Fees: ${data.sent.fee} | Appointments: ${data.sent.appt}`,
      });
    },
    onError: (err: any) => {
      toast({ title: "Failed to run reminders", description: err.message, variant: "destructive" });
    },
  });

  const { data: templates } = useQuery<any[]>({
    queryKey: ["/api/pdf/templates"],
    staleTime: 60_000,
  });

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Bell className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Notification Engine</h1>
          <p className="text-muted-foreground text-sm">Cross-vertical notification triggers — WhatsApp + Email + SMS</p>
        </div>
      </div>

      {/* Run all reminders */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Daily Reminder Run
          </CardTitle>
          <CardDescription>
            Runs all pending reminders (EMI due, FD maturity, fee dues, appointment reminders) for your tenant.
            This is automatically scheduled daily. Use this button to trigger manually.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={() => runRemindersMutation.mutate()}
            disabled={runRemindersMutation.isPending}
            className="gap-2"
          >
            {runRemindersMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Run All Reminders Now
          </Button>

          {lastRun && (
            <div className="flex flex-wrap gap-3 pt-2">
              <Badge variant="outline" className="gap-1">
                <CheckCircle className="h-3 w-3 text-green-500" />
                EMI: {lastRun.emi} sent
              </Badge>
              <Badge variant="outline" className="gap-1">
                <CheckCircle className="h-3 w-3 text-green-500" />
                FD Maturity: {lastRun.fd} sent
              </Badge>
              <Badge variant="outline" className="gap-1">
                <CheckCircle className="h-3 w-3 text-green-500" />
                Fee Dues: {lastRun.fee} sent
              </Badge>
              <Badge variant="outline" className="gap-1">
                <CheckCircle className="h-3 w-3 text-green-500" />
                Appointments: {lastRun.appt} sent
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Vertical triggers overview */}
      <Card>
        <CardHeader>
          <CardTitle>Notification Triggers</CardTitle>
          <CardDescription>All active cross-vertical notification triggers</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {VERTICAL_TRIGGERS.map((trigger) => (
              <div key={trigger.id} className={`flex items-start gap-3 p-4 rounded-lg border ${trigger.bg}`}>
                <trigger.icon className={`h-5 w-5 mt-0.5 flex-shrink-0 ${trigger.color}`} />
                <div>
                  <div className="font-medium text-sm">{trigger.label}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{trigger.description}</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Channels */}
      <Card>
        <CardHeader>
          <CardTitle>Notification Channels</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between py-2 border-b">
              <span className="font-medium">WhatsApp (Meta Cloud API)</span>
              <Badge variant={process.env.WHATSAPP_PHONE_NUMBER_ID ? "default" : "secondary"}>
                {process.env.WHATSAPP_PHONE_NUMBER_ID ? "Configured" : "Configure in Settings"}
              </Badge>
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <span className="font-medium">Email (SendGrid)</span>
              <Badge variant="secondary">Configure SENDGRID_API_KEY env</Badge>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="font-medium">Email (SMTP fallback)</span>
              <Badge variant="secondary">Configure SMTP_HOST env</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* PDF templates list */}
      <Card>
        <CardHeader>
          <CardTitle>PDF Engine — Available Templates</CardTitle>
          <CardDescription>
            Use <code className="text-xs bg-muted px-1 rounded">POST /api/pdf/generate</code> with template ID and data to generate PDFs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {(templates || []).map((t: any) => (
              <div key={t.id} className="flex items-center justify-between p-2 rounded border text-sm">
                <div>
                  <span className="font-medium">{t.label}</span>
                  <span className="text-xs text-muted-foreground ml-2 font-mono">{t.id}</span>
                </div>
                <Badge variant="outline" className="text-xs capitalize">{t.vertical}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
