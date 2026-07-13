import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useTenantConfig, formatCurrency as fmtCur } from "@/hooks/use-tenant-config";

interface TerminalConfig {
  razorpay_key_id?: string;
  pinelabs_merchant_id?: string;
  payment_terminal_mode?: string;
}

interface TerminalLog {
  id: number;
  terminal_type: string;
  amount: number;
  reference_id: string;
  status: string;
  created_at: string;
  kot_id?: number;
}

export default function RestaurantPaymentTerminalPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [razorpayKeyId, setRazorpayKeyId] = useState("");
  const [razorpayKeySecret, setRazorpayKeySecret] = useState("");
  const [pinelabsMerchantId, setPinelabsMerchantId] = useState("");
  const [terminalMode, setTerminalMode] = useState("disabled");
  const [showRzpSecret, setShowRzpSecret] = useState(false);
  const [rzpTestResult, setRzpTestResult] = useState<"" | "ok" | "fail">("");
  const [plTestResult, setPlTestResult] = useState<"" | "ok" | "fail">("");
  const [configLoaded, setConfigLoaded] = useState(false);

  const { data: config } = useQuery<TerminalConfig>({
    queryKey: ["/api/restaurant/payment-terminal/config"],
    queryFn: () => apiRequest("GET", "/api/restaurant/payment-terminal/config").then((r: any) => r.json()),
    onSuccess: (data: TerminalConfig) => {
      if (!configLoaded) {
        setRazorpayKeyId(data.razorpay_key_id || "");
        setPinelabsMerchantId(data.pinelabs_merchant_id || "");
        setTerminalMode(data.payment_terminal_mode || "disabled");
        setConfigLoaded(true);
      }
    },
  } as any);

  const { data: logs } = useQuery<TerminalLog[]>({
    queryKey: ["/api/restaurant/payment-terminal/logs"],
    queryFn: () => apiRequest("GET", "/api/restaurant/payment-terminal/logs").then((r: any) => r.json()),
  });

  const saveMutation = useMutation({
    mutationFn: (body: any) => apiRequest("POST", "/api/restaurant/payment-terminal/config", body).then((r: any) => r.json()),
    onSuccess: () => {
      toast({ title: "Saved", description: "Payment terminal settings saved successfully." });
      queryClient.invalidateQueries({ queryKey: ["/api/restaurant/payment-terminal/config"] });
    },
    onError: () => toast({ title: "Error", description: "Failed to save settings.", variant: "destructive" }),
  });

  const handleSave = () => {
    saveMutation.mutate({
      razorpay_key_id: razorpayKeyId || undefined,
      razorpay_key_secret: razorpayKeySecret || undefined,
      pinelabs_merchant_id: pinelabsMerchantId || undefined,
      payment_terminal_mode: terminalMode,
    });
  };

  const testRazorpay = async () => {
    setRzpTestResult("");
    try {
      const r = await apiRequest("POST", "/api/restaurant/payment-terminal/razorpay/initiate", {
        amount: 1,
        kot_id: 0,
        description: "Test connection",
      });
      const data = await r.json();
      if (data.success || data.payment_link) {
        setRzpTestResult("ok");
        toast({ title: "Razorpay Connected", description: "Credentials are valid." });
      } else {
        setRzpTestResult("fail");
        toast({ title: "Connection Failed", description: data.error || "Invalid credentials", variant: "destructive" });
      }
    } catch {
      setRzpTestResult("fail");
      toast({ title: "Error", description: "Could not reach Razorpay", variant: "destructive" });
    }
  };

  const testPineLabs = async () => {
    setPlTestResult("");
    try {
      const r = await apiRequest("POST", "/api/restaurant/payment-terminal/pinelabs/initiate", {
        amount: 1,
        kot_id: 0,
      });
      const data = await r.json();
      if (data.success) {
        setPlTestResult("ok");
        toast({ title: "Pine Labs Config OK", description: "Merchant ID is configured." });
      } else {
        setPlTestResult("fail");
        toast({ title: "Config Missing", description: data.error || "Not configured", variant: "destructive" });
      }
    } catch {
      setPlTestResult("fail");
    }
  };

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      initiated: "bg-yellow-100 text-yellow-700",
      paid: "bg-green-100 text-green-700",
      failed: "bg-red-100 text-red-700",
      expired: "bg-gray-100 text-gray-600",
    };
    return map[status] || "bg-gray-100 text-gray-600";
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Payment Terminal Settings</h1>
        <p className="text-gray-500 text-sm mt-1">Configure Razorpay POS and Pine Labs terminal integration for your restaurant.</p>
      </div>

      {/* Active Terminal Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Active Terminal Mode</CardTitle>
        </CardHeader>
        <CardContent>
          <RadioGroup value={terminalMode} onValueChange={setTerminalMode} className="flex flex-wrap gap-4">
            {[
              ["disabled", "Disabled"],
              ["razorpay", "Razorpay POS"],
              ["pinelabs", "Pine Labs"],
              ["both", "Both"],
            ].map(([val, label]) => (
              <div key={val} className="flex items-center gap-2">
                <RadioGroupItem value={val} id={`mode-${val}`} />
                <Label htmlFor={`mode-${val}`} className="cursor-pointer">{label}</Label>
              </div>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Razorpay Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <span className="text-blue-600">💳</span> Razorpay POS
            {rzpTestResult === "ok" && <span className="text-green-500 text-sm">✅ Connected</span>}
            {rzpTestResult === "fail" && <span className="text-red-500 text-sm">❌ Failed</span>}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Key ID</Label>
            <Input
              value={razorpayKeyId}
              onChange={(e) => setRazorpayKeyId(e.target.value)}
              placeholder="rzp_live_xxxxxxxxxx"
              className="mt-1 font-mono text-sm"
            />
          </div>
          <div>
            <Label>Key Secret</Label>
            <div className="relative mt-1">
              <Input
                value={razorpayKeySecret}
                onChange={(e) => setRazorpayKeySecret(e.target.value)}
                type={showRzpSecret ? "text" : "password"}
                placeholder="Enter key secret"
                className="font-mono text-sm pr-16"
              />
              <button
                type="button"
                onClick={() => setShowRzpSecret(!showRzpSecret)}
                className="absolute right-3 top-2.5 text-xs text-gray-500 hover:text-gray-700"
              >
                {showRzpSecret ? "Hide" : "Show"}
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1">Secret is stored encrypted and never shown after save.</p>
          </div>
          <Button variant="outline" onClick={testRazorpay} className="text-blue-600 border-blue-200">
            Test Connection
          </Button>
        </CardContent>
      </Card>

      {/* Pine Labs Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <span>🏦</span> Pine Labs
            {plTestResult === "ok" && <span className="text-green-500 text-sm">✅ Configured</span>}
            {plTestResult === "fail" && <span className="text-red-500 text-sm">❌ Not Configured</span>}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Merchant ID</Label>
            <Input
              value={pinelabsMerchantId}
              onChange={(e) => setPinelabsMerchantId(e.target.value)}
              placeholder="Your Pine Labs Merchant ID"
              className="mt-1 font-mono text-sm"
            />
          </div>
          <p className="text-xs text-gray-500">
            Pine Labs uses Plutus Smart API via a local agent running on the POS machine (default: localhost:8080).
            Contact your Pine Labs relationship manager to get your Merchant ID.
          </p>
          <Button variant="outline" onClick={testPineLabs} className="text-green-600 border-green-200">
            Test Configuration
          </Button>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saveMutation.isPending} className="bg-orange-500 hover:bg-orange-600">
        {saveMutation.isPending ? "Saving..." : "Save Settings"}
      </Button>

      {/* Transaction Logs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Payment Attempts</CardTitle>
        </CardHeader>
        <CardContent>
          {!logs?.length ? (
            <p className="text-gray-400 text-sm text-center py-4">No payment attempts yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-gray-500 text-xs">
                    <th className="text-left py-2 pr-3">Terminal</th>
                    <th className="text-left py-2 pr-3">Amount</th>
                    <th className="text-left py-2 pr-3">Reference</th>
                    <th className="text-left py-2 pr-3">Status</th>
                    <th className="text-left py-2">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="border-b last:border-0">
                      <td className="py-2 pr-3 capitalize font-medium">{log.terminal_type}</td>
                      <td className="py-2 pr-3">{sym}{Number(log.amount).toFixed(2)}</td>
                      <td className="py-2 pr-3 font-mono text-xs text-gray-500 max-w-[120px] truncate">{log.reference_id}</td>
                      <td className="py-2 pr-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge(log.status)}`}>
                          {log.status}
                        </span>
                      </td>
                      <td className="py-2 text-gray-500 text-xs">{new Date(log.created_at).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Setup Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Setup Instructions</CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible>
            <AccordionItem value="razorpay">
              <AccordionTrigger>How to set up Razorpay POS (5 steps)</AccordionTrigger>
              <AccordionContent className="text-sm text-gray-600 space-y-2">
                <p>1. Log in to your Razorpay Dashboard at dashboard.razorpay.com</p>
                <p>2. Go to <strong>Settings → API Keys</strong> and generate a new key pair (live mode).</p>
                <p>3. Copy the <strong>Key ID</strong> (starts with <code>rzp_live_</code>) and <strong>Key Secret</strong>.</p>
                <p>4. Paste both into the fields above and click Save.</p>
                <p>5. Click <strong>Test Connection</strong> to verify. A payment link will be created for ₹1 to confirm the credentials work.</p>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="pinelabs">
              <AccordionTrigger>How to set up Pine Labs Plutus Smart</AccordionTrigger>
              <AccordionContent className="text-sm text-gray-600 space-y-2">
                <p>1. Contact your Pine Labs relationship manager to get your <strong>Merchant ID</strong> and a Plutus Smart API license.</p>
                <p>2. Install the <strong>Plutus Smart Agent</strong> on your POS machine. It runs as a local HTTP service on port 8080.</p>
                <p>3. Enter your Merchant ID above and click Save.</p>
                <p>4. When a payment is initiated from the POS, the system will push the amount to the EDC terminal via the local agent.</p>
                <p>5. The customer swipes/taps their card on the physical terminal to complete payment.</p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}
