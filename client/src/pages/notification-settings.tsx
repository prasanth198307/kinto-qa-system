import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { GlobalHeader } from "@/components/GlobalHeader";
import { Bell, Mail, MessageSquare, Save, AlertCircle, Check } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface NotificationConfig {
  id: string;
  emailEnabled: number;
  senderEmail: string | null;
  senderName: string | null;
  whatsappEnabled: number;
  metaPhoneNumberId: string | null;
  metaAccessToken: string | null;
  metaVerifyToken: string | null;
  testMode: number;
}

export default function NotificationSettings() {
  const { toast } = useToast();
  const { logoutMutation } = useAuth();
  
  // Fetch current configuration
  const { data: config, isLoading } = useQuery<NotificationConfig>({
    queryKey: ['/api/notification-config'],
  });

  const [formData, setFormData] = useState({
    emailEnabled: false,
    senderEmail: "",
    senderName: "",
    whatsappEnabled: false,
    metaPhoneNumberId: "",
    metaAccessToken: "",
    metaVerifyToken: "",
    testMode: true,
  });

  useEffect(() => {
    if (config) {
      setFormData({
        emailEnabled: config.emailEnabled === 1,
        senderEmail: config.senderEmail || "",
        senderName: config.senderName || "",
        whatsappEnabled: config.whatsappEnabled === 1,
        metaPhoneNumberId: config.metaPhoneNumberId || "",
        metaAccessToken: config.metaAccessToken || "",
        metaVerifyToken: config.metaVerifyToken || "",
        testMode: config.testMode === 1,
      });
    }
  }, [config]);

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const payload = {
        emailEnabled: data.emailEnabled ? 1 : 0,
        senderEmail: data.senderEmail || null,
        senderName: data.senderName || null,
        whatsappEnabled: data.whatsappEnabled ? 1 : 0,
        metaPhoneNumberId: data.metaPhoneNumberId || null,
        metaAccessToken: data.metaAccessToken || null,
        metaVerifyToken: data.metaVerifyToken || null,
        testMode: data.testMode ? 1 : 0,
      };
      
      if (config) {
        return await apiRequest('PATCH', `/api/notification-config/${config.id}`, payload);
      } else {
        return await apiRequest('POST', '/api/notification-config', payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notification-config'] });
      toast({
        title: "Settings saved",
        description: "Notification settings have been updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to save notification settings",
      });
    },
  });

  const handleSave = () => {
    saveMutation.mutate(formData);
  };

  if (isLoading) {
    return (
      <>
        <GlobalHeader onLogoutClick={() => logoutMutation.mutate()} />
        <div className="p-6 mt-16 space-y-6">
          <div className="flex justify-center items-center py-12">
            <div className="text-muted-foreground">Loading configuration...</div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <GlobalHeader onLogoutClick={() => logoutMutation.mutate()} />
      <div className="p-6 mt-16 space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Bell className="w-6 h-6" />
          Notification Settings
        </h2>
        <p className="text-sm text-muted-foreground mt-2">
          Configure email and WhatsApp notifications for machine startup reminders
        </p>
      </div>

      <Alert>
        <AlertCircle className="w-4 h-4" />
        <AlertTitle>On-Premise Deployment Setup</AlertTitle>
        <AlertDescription>
          <div className="space-y-2 mt-2">
            <p>For production use, you can configure notification settings here OR set environment variables on your server:</p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li><code className="bg-muted px-1 rounded">SENDGRID_API_KEY</code> - SendGrid API key for email</li>
              <li><code className="bg-muted px-1 rounded">WHATSAPP_PHONE_NUMBER_ID</code> - Meta WhatsApp Phone Number ID</li>
              <li><code className="bg-muted px-1 rounded">WHATSAPP_ACCESS_TOKEN</code> - Meta WhatsApp Access Token</li>
              <li><code className="bg-muted px-1 rounded">WHATSAPP_VERIFY_TOKEN</code> - Webhook verification token (required)</li>
            </ul>
            <p className="text-sm mt-2">
              Database settings take precedence over environment variables.
            </p>
          </div>
        </AlertDescription>
      </Alert>

      <div className="grid gap-6">
        {/* Email Configuration */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail className="w-5 h-5" />
                <div>
                  <CardTitle>Email Notifications (SendGrid)</CardTitle>
                  <CardDescription>Configure email notifications via SendGrid</CardDescription>
                </div>
              </div>
              <Switch
                checked={formData.emailEnabled}
                onCheckedChange={(checked) => setFormData({ ...formData, emailEnabled: checked })}
                data-testid="switch-email-enabled"
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="senderEmail">Sender Email Address</Label>
              <Input
                id="senderEmail"
                type="email"
                placeholder="noreply@yourcompany.com"
                value={formData.senderEmail}
                onChange={(e) => setFormData({ ...formData, senderEmail: e.target.value })}
                disabled={!formData.emailEnabled}
                data-testid="input-sender-email"
              />
              <p className="text-sm text-muted-foreground">
                This email must be verified in your SendGrid account
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="senderName">Sender Name</Label>
              <Input
                id="senderName"
                type="text"
                placeholder="KINTO QA System"
                value={formData.senderName}
                onChange={(e) => setFormData({ ...formData, senderName: e.target.value })}
                disabled={!formData.emailEnabled}
                data-testid="input-sender-name"
              />
            </div>
          </CardContent>
        </Card>

        {/* WhatsApp Configuration */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                <div>
                  <CardTitle>WhatsApp Notifications (Meta Business Cloud API)</CardTitle>
                  <CardDescription>Configure WhatsApp via Meta Business Cloud API (2.4x cheaper, FREE service conversations)</CardDescription>
                </div>
              </div>
              <Switch
                checked={formData.whatsappEnabled}
                onCheckedChange={(checked) => setFormData({ ...formData, whatsappEnabled: checked })}
                data-testid="switch-whatsapp-enabled"
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="metaPhoneNumberId">Meta Phone Number ID</Label>
              <Input
                id="metaPhoneNumberId"
                type="text"
                placeholder="123456789012345"
                value={formData.metaPhoneNumberId}
                onChange={(e) => setFormData({ ...formData, metaPhoneNumberId: e.target.value })}
                disabled={!formData.whatsappEnabled}
                data-testid="input-meta-phone-id"
              />
              <p className="text-sm text-muted-foreground">
                Get this from Meta Business Manager under WhatsApp &gt; API Setup
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="metaAccessToken">Meta Access Token</Label>
              <Input
                id="metaAccessToken"
                type="password"
                placeholder="EAAxxxxxxxxxxxxxxxxx"
                value={formData.metaAccessToken}
                onChange={(e) => setFormData({ ...formData, metaAccessToken: e.target.value })}
                disabled={!formData.whatsappEnabled}
                data-testid="input-meta-access-token"
              />
              <p className="text-sm text-muted-foreground">
                Generate a permanent access token from your Meta Business App
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="metaVerifyToken">Webhook Verify Token</Label>
              <Input
                id="metaVerifyToken"
                type="text"
                placeholder="your_secure_random_token_123"
                value={formData.metaVerifyToken}
                onChange={(e) => setFormData({ ...formData, metaVerifyToken: e.target.value })}
                disabled={!formData.whatsappEnabled}
                data-testid="input-meta-verify-token"
              />
              <p className="text-sm text-muted-foreground">
                Create a secure random token for webhook verification (REQUIRED for security)
              </p>
            </div>

            <Alert>
              <AlertCircle className="w-4 h-4" />
              <AlertDescription className="text-sm">
                <strong>Setup Guide:</strong> Create a Meta Business App, add WhatsApp product, configure webhook with verify token.
                Webhook URL: <code className="bg-muted px-1 rounded">/api/whatsapp/webhook</code>
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* Test Mode */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Test Mode</CardTitle>
                <CardDescription>
                  When enabled, notifications will only be logged to console (no real emails/WhatsApp sent)
                </CardDescription>
              </div>
              <Switch
                checked={formData.testMode}
                onCheckedChange={(checked) => setFormData({ ...formData, testMode: checked })}
                data-testid="switch-test-mode"
              />
            </div>
          </CardHeader>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end gap-2">
          <Button
            onClick={handleSave}
            disabled={saveMutation.isPending}
            data-testid="button-save-settings"
          >
            {saveMutation.isPending ? (
              <>Saving...</>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Settings
              </>
            )}
          </Button>
        </div>

        {/* Status Indicators */}
        {config && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Current Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center gap-2">
                {formData.emailEnabled ? (
                  <Check className="w-4 h-4 text-green-600" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-muted-foreground" />
                )}
                <span className="text-sm">
                  Email notifications: {formData.emailEnabled ? "Enabled" : "Disabled"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {formData.whatsappEnabled ? (
                  <Check className="w-4 h-4 text-green-600" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-muted-foreground" />
                )}
                <span className="text-sm">
                  WhatsApp notifications: {formData.whatsappEnabled ? "Enabled" : "Disabled"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {formData.testMode ? (
                  <AlertCircle className="w-4 h-4 text-yellow-600" />
                ) : (
                  <Check className="w-4 h-4 text-green-600" />
                )}
                <span className="text-sm">
                  Mode: {formData.testMode ? "Test (Console logging)" : "Production (Real sending)"}
                </span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
      </div>
    </>
  );
}
