import { useState } from "react";
import { CheckCircle2, CreditCard, Calendar, Bell, AlertCircle, RefreshCw, Mail, MessageSquare, ChevronRight, Download, Shield, Clock, XCircle, RotateCcw } from "lucide-react";

type Step = "idle" | "upcoming" | "processing" | "success" | "failed" | "retry";

const BILLING_HISTORY = [
  { date: "Jun 1, 2026", amount: 2546, status: "paid",   invoice: "INV-2026-06" },
  { date: "May 1, 2026", amount: 2546, status: "paid",   invoice: "INV-2026-05" },
  { date: "Apr 1, 2026", amount: 1847, status: "paid",   invoice: "INV-2026-04" },
  { date: "Mar 1, 2026", amount: 1847, status: "failed", invoice: "INV-2026-03" },
  { date: "Mar 3, 2026", amount: 1847, status: "paid",   invoice: "INV-2026-03R" },
];

export function AutoDeductFlow() {
  const [step, setStep] = useState<Step>("idle");
  const [activeTab, setActiveTab] = useState<"how" | "history" | "payment">("how");

  const tabs = [
    { key: "how",     label: "How It Works" },
    { key: "history", label: "Billing History" },
    { key: "payment", label: "Payment Method" },
  ] as const;

  const simulate = () => {
    setStep("upcoming");
    setTimeout(() => setStep("processing"), 1800);
    setTimeout(() => setStep("success"), 3600);
  };

  const simulateFail = () => {
    setStep("upcoming");
    setTimeout(() => setStep("processing"), 1800);
    setTimeout(() => setStep("failed"), 3600);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
            <span>Company Settings</span>
            <ChevronRight className="h-3 w-3" />
            <span className="text-gray-700 font-medium">Auto-Deduct & Billing</span>
          </div>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Auto-Deduct & Billing</h1>
              <p className="text-sm text-gray-500 mt-0.5">Your subscription renews automatically on the 1st of every month.</p>
            </div>
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-sm font-semibold text-emerald-700">Auto-pay active</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-6">
          <div className="flex gap-1">
            {tabs.map(t => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === t.key
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-6">

        {activeTab === "how" && (
          <div className="space-y-6">
            {/* Next billing card */}
            <div className="bg-white rounded-xl border border-gray-200 px-6 py-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-gray-400 font-medium uppercase tracking-wide">Next auto-deduct</div>
                  <div className="text-3xl font-bold text-gray-900 mt-1">₹2,546<span className="text-base font-normal text-gray-400">/mo</span></div>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <Calendar className="h-3.5 w-3.5 text-gray-400" />
                    <span className="text-sm text-gray-500">July 1, 2026 at 12:00 AM IST</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-400 mb-1">Card on file</div>
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-gray-400" />
                    <span className="text-sm font-medium text-gray-700">•••• 4242</span>
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">Expires 08/27</div>
                </div>
              </div>
            </div>

            {/* Flow diagram */}
            <div>
              <h2 className="text-sm font-semibold text-gray-700 mb-4">How auto-deduct works</h2>
              <div className="space-y-3">
                {[
                  {
                    day: "3 days before",
                    icon: Bell,
                    color: "blue",
                    title: "Advance notice sent",
                    desc: "You receive an email + WhatsApp reminder showing the exact amount that will be deducted, with a breakdown of active modules.",
                  },
                  {
                    day: "Billing day",
                    icon: CreditCard,
                    color: "indigo",
                    title: "Auto-charge via Razorpay",
                    desc: "Razorpay securely charges your saved card on the 1st of each month at midnight IST. No manual action needed.",
                  },
                  {
                    day: "Immediately after",
                    icon: CheckCircle2,
                    color: "emerald",
                    title: "Receipt & invoice issued",
                    desc: "A GST-compliant invoice (with your company GSTIN) is generated and emailed to your registered address. Download anytime from Billing History.",
                  },
                  {
                    day: "If payment fails",
                    icon: RefreshCw,
                    color: "amber",
                    title: "Automatic retry (3 attempts)",
                    desc: "If your card is declined, the system retries at 6h, 24h, and 72h. You get notified after each attempt. Access remains active during retries.",
                  },
                  {
                    day: "After 3 failures",
                    icon: AlertCircle,
                    color: "red",
                    title: "Grace period — 7 days",
                    desc: "If all retries fail, a 7-day grace period begins. Your data and access are fully preserved. Update your payment method to avoid suspension.",
                  },
                ].map((item, i) => {
                  const Icon = item.icon;
                  const colorMap: Record<string, string> = {
                    blue:    "bg-blue-100 text-blue-600",
                    indigo:  "bg-indigo-100 text-indigo-600",
                    emerald: "bg-emerald-100 text-emerald-600",
                    amber:   "bg-amber-100 text-amber-600",
                    red:     "bg-red-100 text-red-600",
                  };
                  const dotMap: Record<string, string> = {
                    blue: "bg-blue-500", indigo: "bg-indigo-500", emerald: "bg-emerald-500", amber: "bg-amber-400", red: "bg-red-500",
                  };
                  return (
                    <div key={i} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className={`p-2 rounded-xl ${colorMap[item.color]}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        {i < 4 && <div className="w-0.5 flex-1 bg-gray-200 mt-2 mb-1" />}
                      </div>
                      <div className="flex-1 pb-4">
                        <div className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-0.5">{item.day}</div>
                        <div className="text-sm font-semibold text-gray-800">{item.title}</div>
                        <div className="text-sm text-gray-500 mt-0.5 leading-relaxed">{item.desc}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Simulate button row */}
            <div className="bg-gray-100 rounded-xl px-5 py-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Simulate billing flow</p>
              <div className="flex gap-3">
                <button onClick={simulate} className="flex-1 bg-white border border-gray-200 rounded-lg px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
                  Simulate successful payment
                </button>
                <button onClick={simulateFail} className="flex-1 bg-white border border-gray-200 rounded-lg px-4 py-2.5 text-sm font-semibold text-red-500 hover:bg-red-50 transition-colors">
                  Simulate failed payment
                </button>
              </div>
            </div>

            {/* Simulation overlay */}
            {step !== "idle" && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
                  {step === "upcoming" && (
                    <>
                      <div className="p-3 rounded-full bg-blue-50 w-14 h-14 flex items-center justify-center mx-auto mb-4">
                        <Bell className="h-6 w-6 text-blue-500" />
                      </div>
                      <h3 className="font-semibold text-gray-900 text-lg">Reminder sent!</h3>
                      <p className="text-sm text-gray-500 mt-2">Email + WhatsApp notification sent with ₹2,546 billing summary. Processing charge now…</p>
                      <div className="mt-4 flex gap-2 justify-center">
                        <div className="h-2 w-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: "0ms" }} />
                        <div className="h-2 w-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: "150ms" }} />
                        <div className="h-2 w-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                    </>
                  )}
                  {step === "processing" && (
                    <>
                      <div className="p-3 rounded-full bg-indigo-50 w-14 h-14 flex items-center justify-center mx-auto mb-4">
                        <CreditCard className="h-6 w-6 text-indigo-500 animate-pulse" />
                      </div>
                      <h3 className="font-semibold text-gray-900 text-lg">Charging card…</h3>
                      <p className="text-sm text-gray-500 mt-2">Razorpay is securely processing ₹2,546 from card •••• 4242</p>
                    </>
                  )}
                  {step === "success" && (
                    <>
                      <div className="p-3 rounded-full bg-emerald-50 w-14 h-14 flex items-center justify-center mx-auto mb-4">
                        <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                      </div>
                      <h3 className="font-semibold text-gray-900 text-lg">Payment successful!</h3>
                      <p className="text-sm text-gray-500 mt-2">₹2,546 collected. GST invoice INV-2026-07 emailed to admin@company.com</p>
                      <button onClick={() => setStep("idle")} className="mt-5 w-full bg-emerald-600 text-white text-sm font-semibold py-2.5 rounded-lg hover:bg-emerald-700">Close</button>
                    </>
                  )}
                  {step === "failed" && (
                    <>
                      <div className="p-3 rounded-full bg-red-50 w-14 h-14 flex items-center justify-center mx-auto mb-4">
                        <XCircle className="h-6 w-6 text-red-500" />
                      </div>
                      <h3 className="font-semibold text-gray-900 text-lg">Payment failed</h3>
                      <p className="text-sm text-gray-500 mt-2">Card •••• 4242 was declined. We'll retry in 6 hours. Update your payment method to avoid interruption.</p>
                      <div className="mt-4 bg-amber-50 rounded-lg px-3 py-2 text-xs text-amber-700 text-left">
                        <strong>Retry schedule:</strong> 6h → 24h → 72h. Access remains active during retries.
                      </div>
                      <div className="flex gap-3 mt-5">
                        <button onClick={() => setStep("idle")} className="flex-1 border border-gray-200 text-sm font-medium py-2.5 rounded-lg hover:bg-gray-50">Dismiss</button>
                        <button onClick={() => setActiveTab("payment")} className="flex-1 bg-blue-600 text-white text-sm font-semibold py-2.5 rounded-lg hover:bg-blue-700" style={{}} onClick={() => { setStep("idle"); setActiveTab("payment"); }}>Update card</button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "history" && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3">Date</th>
                  <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3">Invoice</th>
                  <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3">Amount</th>
                  <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3">Status</th>
                  <th className="text-right text-xs font-semibold text-gray-500 px-5 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {BILLING_HISTORY.map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3.5 text-sm text-gray-700">{row.date}</td>
                    <td className="px-5 py-3.5 text-sm text-gray-500 font-mono">{row.invoice}</td>
                    <td className="px-5 py-3.5 text-sm font-semibold text-gray-800">₹{row.amount.toLocaleString("en-IN")}</td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${
                        row.status === "paid"   ? "bg-emerald-50 text-emerald-700" :
                        row.status === "failed" ? "bg-red-50 text-red-600" : ""
                      }`}>
                        {row.status === "paid"   && <CheckCircle2 className="h-3 w-3" />}
                        {row.status === "failed" && <XCircle className="h-3 w-3" />}
                        {row.status === "paid" ? "Paid" : "Failed"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      {row.status === "paid" && (
                        <button className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 ml-auto">
                          <Download className="h-3 w-3" /> PDF
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === "payment" && (
          <div className="space-y-4 max-w-lg">
            <div className="bg-white rounded-xl border border-gray-200 px-5 py-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">Saved payment method</h2>
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
                <div className="p-2 bg-white rounded-lg border border-gray-200">
                  <CreditCard className="h-5 w-5 text-gray-500" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-gray-800">Visa •••• 4242</div>
                  <div className="text-xs text-gray-500">Expires 08/27 · Added Mar 2026</div>
                </div>
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">Default</span>
              </div>
              <div className="mt-4 flex gap-3">
                <button className="flex-1 border border-gray-200 text-sm font-medium py-2.5 rounded-lg hover:bg-gray-50 text-gray-700">Replace card</button>
                <button className="flex-1 bg-blue-600 text-white text-sm font-semibold py-2.5 rounded-lg hover:bg-blue-700">Add new card</button>
              </div>
            </div>
            <div className="bg-blue-50 border border-blue-100 rounded-xl px-5 py-4 flex items-start gap-3">
              <Shield className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-blue-800">Secured by Razorpay</p>
                <p className="text-xs text-blue-700 mt-0.5">Your card details are never stored on our servers. All transactions are encrypted and PCI-DSS compliant.</p>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 px-5 py-4">
              <p className="text-sm font-semibold text-gray-700 mb-2">Billing notifications</p>
              <div className="space-y-2.5">
                {[
                  { icon: Mail,          label: "Email reminders",          sub: "3 days before each billing date", on: true },
                  { icon: MessageSquare, label: "WhatsApp notifications",    sub: "Charge confirmation + receipt",   on: true },
                  { icon: AlertCircle,   label: "Failed payment alerts",     sub: "Immediate alert + retry schedule", on: true },
                ].map((item, i) => {
                  const Icon = item.icon;
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <Icon className="h-4 w-4 text-gray-400" />
                      <div className="flex-1">
                        <div className="text-sm text-gray-700">{item.label}</div>
                        <div className="text-xs text-gray-400">{item.sub}</div>
                      </div>
                      <div className={`h-5 w-9 rounded-full flex items-center px-0.5 cursor-pointer transition-colors ${item.on ? "bg-blue-500 justify-end" : "bg-gray-200 justify-start"}`}>
                        <div className="h-4 w-4 bg-white rounded-full shadow-sm" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
