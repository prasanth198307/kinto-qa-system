import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, Search, ShoppingCart, Users, Tag, RotateCcw, TrendingUp, X,
  Pencil, Trash2, AlertTriangle, ShieldCheck, ArrowRight, CheckCircle2,
  Wallet, Smartphone, Clock, CreditCard, ChevronLeft, Eye, EyeOff,
  QrCode, RefreshCw, Timer, BadgeCheck,
} from "lucide-react";

const fmt = (n: any) => Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
const fmtTime = (d: string) => new Date(d).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" });

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label className="text-xs font-medium">{label}</Label>{children}</div>;
}
function SC({ title, value, icon: Icon, color }: any) {
  return (
    <Card>
      <CardContent className="p-5 flex items-center gap-4">
        <div className={`p-3 rounded-lg ${color}`}><Icon className="h-5 w-5" /></div>
        <div><p className="text-sm text-muted-foreground">{title}</p><p className="text-2xl font-bold">{value}</p></div>
      </CardContent>
    </Card>
  );
}

// ── Currency input with ₹ prefix ──────────────────────────────────────────────
function CurrencyInput({ value, onChange, placeholder = "0.00", ...props }: any) {
  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">₹</span>
      <Input
        type="number"
        min="0"
        step="0.01"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="pl-7"
        {...props}
      />
    </div>
  );
}

// ── Last session summary mini-card ────────────────────────────────────────────
function LastSessionCard({ session }: { session: any }) {
  if (!session) return null;
  const duration = session.closed_at
    ? Math.round((new Date(session.closed_at).getTime() - new Date(session.opened_at).getTime()) / 60000)
    : null;
  return (
    <div className="p-4 rounded-md border bg-muted/30 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm font-semibold">Last Session — {session.counter_name}</p>
        <Badge variant="secondary" className="text-xs">Closed</Badge>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
        <div>
          <p className="text-xs text-muted-foreground">Total Sales</p>
          <p className="font-bold text-base">₹{fmt(session.total_sales)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Transactions</p>
          <p className="font-bold text-base">{session.total_transactions}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Opening Float</p>
          <p className="font-medium">₹{fmt(session.opening_balance)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Duration</p>
          <p className="font-medium">{duration != null ? `${duration} min` : "—"}</p>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        {fmtTime(session.opened_at)} → {session.closed_at ? fmtTime(session.closed_at) : "—"}
        {session.approved_by && <span className="ml-2 text-amber-600">· Approved by {session.approved_by}</span>}
      </p>
    </div>
  );
}

// ── MANAGER APPROVAL THRESHOLD ────────────────────────────────────────────────
const APPROVAL_THRESHOLD = 5000;

// ── Open Session Dialog (3-step flow) ─────────────────────────────────────────
type OpenStep = "balance" | "handover" | "approval";

function OpenSessionDialog({
  open, onClose, onOpened, onViewLastSession,
}: {
  open: boolean;
  onClose: () => void;
  onOpened: () => void;
  onViewLastSession: () => void;
}) {
  const { toast } = useToast();
  const [step, setStep] = useState<OpenStep>("balance");
  const [counterName, setCounterName] = useState("Counter 1");
  const [cashFloat, setCashFloat] = useState("");
  const [upiFloat, setUpiFloat] = useState("");
  const [shiftType, setShiftType] = useState<"new" | "continue">("new");
  const [mgr, setMgr] = useState({ username: "", password: "" });
  const [showMgrPass, setShowMgrPass] = useState(false);
  const [approvedBy, setApprovedBy] = useState("");
  const [mgrError, setMgrError] = useState("");

  const { data: counters = [] } = useQuery<string[]>({
    queryKey: ["/api/pos/sessions/counters"],
    enabled: open,
  });

  const { data: lastSession } = useQuery<any>({
    queryKey: ["/api/pos/sessions/last", counterName],
    queryFn: async () => {
      const r = await fetch(`/api/pos/sessions/last?counter_name=${encodeURIComponent(counterName)}`, { credentials: "include" });
      return r.json();
    },
    enabled: open && !!counterName,
  });

  const { data: lastAny } = useQuery<any>({
    queryKey: ["/api/pos/sessions/last"],
    queryFn: async () => {
      const r = await fetch(`/api/pos/sessions/last`, { credentials: "include" });
      return r.json();
    },
    enabled: open,
  });

  const totalFloat = Number(cashFloat || 0) + Number(upiFloat || 0);
  const needsApproval = totalFloat > APPROVAL_THRESHOLD;

  const verifyMgrMut = useMutation({
    mutationFn: () => apiRequest("POST", "/api/pos/sessions/verify-manager", mgr),
    onSuccess: async (res: any) => {
      const data = await res.json();
      if (data.ok) {
        setApprovedBy(data.approvedBy);
        setMgrError("");
        doOpen(data.approvedBy);
      } else {
        setMgrError(data.message || "Verification failed");
      }
    },
    onError: () => setMgrError("Verification failed — check credentials"),
  });

  const openSessionMut = useMutation({
    mutationFn: (d: any) => apiRequest("POST", "/api/pos/sessions/open", d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pos/sessions/active"] });
      toast({ title: "Session opened", description: `${counterName} is now live` });
      onOpened();
      handleClose();
    },
    onError: (e: any) => toast({ title: "Failed to open session", description: e.message, variant: "destructive" }),
  });

  function doOpen(managerUser?: string) {
    openSessionMut.mutate({
      counter_name: counterName,
      opening_balance: Number(cashFloat || 0),
      opening_upi_float: Number(upiFloat || 0),
      approved_by: managerUser || approvedBy || null,
      shift_type: shiftType,
    });
  }

  function handleClose() {
    setStep("balance");
    setMgr({ username: "", password: "" });
    setMgrError("");
    setApprovedBy("");
    onClose();
  }

  function handleNext() {
    if (step === "balance") {
      // Check if same counter had a recent session → handover step
      if (lastSession && lastSession.counter_name === counterName) {
        setStep("handover");
      } else if (needsApproval) {
        setStep("approval");
      } else {
        doOpen();
      }
    } else if (step === "handover") {
      if (needsApproval) setStep("approval");
      else doOpen();
    } else if (step === "approval") {
      if (!mgr.username || !mgr.password) {
        setMgrError("Enter manager username and password");
        return;
      }
      verifyMgrMut.mutate();
    }
  }

  const isLoading = openSessionMut.isPending || verifyMgrMut.isPending;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {step === "balance" && <><ShoppingCart className="h-4 w-4 text-primary" />Open POS Session</>}
            {step === "handover" && <><Clock className="h-4 w-4 text-primary" />Shift Handover</>}
            {step === "approval" && <><ShieldCheck className="h-4 w-4 text-amber-500" />Manager Approval Required</>}
          </DialogTitle>
        </DialogHeader>

        {/* ── Step 1: Balance entry ── */}
        {step === "balance" && (
          <div className="space-y-4">
            <F label="Counter Name">
              {counters.length > 0 ? (
                <Select value={counterName} onValueChange={setCounterName}>
                  <SelectTrigger data-testid="select-counter-name"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {counters.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    <SelectItem value="__new__">+ New counter…</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  value={counterName}
                  onChange={e => setCounterName(e.target.value)}
                  placeholder="e.g. Counter 1"
                  data-testid="input-counter-name"
                />
              )}
              {counterName === "__new__" && (
                <Input
                  className="mt-2"
                  placeholder="Enter counter name"
                  onChange={e => setCounterName(e.target.value === "" ? "__new__" : e.target.value)}
                  autoFocus
                />
              )}
            </F>

            <div className="grid grid-cols-2 gap-3">
              <F label="Cash Opening Float">
                <CurrencyInput
                  value={cashFloat}
                  onChange={(e: any) => setCashFloat(e.target.value)}
                  placeholder="0.00"
                  data-testid="input-cash-float"
                />
              </F>
              <F label="UPI Opening Float">
                <CurrencyInput
                  value={upiFloat}
                  onChange={(e: any) => setUpiFloat(e.target.value)}
                  placeholder="0.00"
                  data-testid="input-upi-float"
                />
              </F>
            </div>

            {totalFloat > 0 && (
              <div className={`flex items-start gap-2 p-3 rounded-md text-sm border ${needsApproval ? "bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-200" : "bg-muted/40 border-muted"}`}>
                {needsApproval
                  ? <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  : <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-primary" />}
                <span>
                  Total float: <strong>₹{fmt(totalFloat)}</strong>
                  {needsApproval && <> — exceeds ₹{fmt(APPROVAL_THRESHOLD)} limit, manager approval required</>}
                </span>
              </div>
            )}

            {/* Last session for this counter */}
            {lastSession && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground font-medium">Last session on this counter</p>
                <LastSessionCard session={lastSession} />
              </div>
            )}
          </div>
        )}

        {/* ── Step 2: Shift handover ── */}
        {step === "handover" && lastSession && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              <strong>{counterName}</strong> was last used on {fmtTime(lastSession.opened_at)}. How would you like to proceed?
            </p>
            <LastSessionCard session={lastSession} />
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: "new" as const, icon: Plus, label: "New Shift", desc: "Fresh start, new totals" },
                { value: "continue" as const, icon: ArrowRight, label: "Continue Shift", desc: "Same cashier, resuming" },
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setShiftType(opt.value)}
                  className={`flex flex-col items-start gap-2 p-4 rounded-md border text-left transition-colors ${shiftType === opt.value ? "border-primary bg-primary/5" : "border-muted hover-elevate"}`}
                  data-testid={`btn-shift-${opt.value}`}
                >
                  <opt.icon className={`h-5 w-5 ${shiftType === opt.value ? "text-primary" : "text-muted-foreground"}`} />
                  <div>
                    <p className="text-sm font-semibold">{opt.label}</p>
                    <p className="text-xs text-muted-foreground">{opt.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Step 3: Manager approval ── */}
        {step === "approval" && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-700 text-sm text-amber-800 dark:text-amber-200">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Opening balance ₹{fmt(totalFloat)} exceeds threshold</p>
                <p className="text-xs mt-0.5">A manager must approve this session. Have them enter their credentials below.</p>
              </div>
            </div>

            <Separator />

            <F label="Manager Username">
              <Input
                value={mgr.username}
                onChange={e => { setMgr(m => ({ ...m, username: e.target.value })); setMgrError(""); }}
                placeholder="Manager's login username"
                data-testid="input-mgr-username"
              />
            </F>
            <F label="Manager Password">
              <div className="relative">
                <Input
                  type={showMgrPass ? "text" : "password"}
                  value={mgr.password}
                  onChange={e => { setMgr(m => ({ ...m, password: e.target.value })); setMgrError(""); }}
                  placeholder="••••••••"
                  className="pr-10"
                  data-testid="input-mgr-password"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  onClick={() => setShowMgrPass(v => !v)}
                >
                  {showMgrPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </F>
            {mgrError && (
              <p className="text-sm text-destructive flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5" /> {mgrError}
              </p>
            )}
          </div>
        )}

        <DialogFooter className="flex flex-wrap items-center justify-between gap-2 pt-2">
          <div className="flex items-center gap-2">
            {step !== "balance" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStep(step === "approval" ? (lastSession ? "handover" : "balance") : "balance")}
                disabled={isLoading}
              >
                <ChevronLeft className="h-4 w-4 mr-1" /> Back
              </Button>
            )}
            {step === "balance" && lastAny && (
              <button
                type="button"
                className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors"
                onClick={onViewLastSession}
                data-testid="link-view-last-session"
              >
                View Last Session
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleClose} disabled={isLoading}>Cancel</Button>
            <Button
              onClick={handleNext}
              disabled={isLoading || !counterName || counterName === "__new__"}
              data-testid="button-open-session"
            >
              {isLoading ? "Please wait…" :
                step === "approval" ? "Verify & Open" :
                (step === "handover" || needsApproval) ? "Next" :
                "Open Session"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── UPI QR Payment Dialog ────────────────────────────────────────────────────
type QrState = "generating" | "waiting" | "paid" | "expired" | "failed";

function UpiQrDialog({
  open, amount, sessionId, onClose, onPaid,
}: {
  open: boolean;
  amount: number;
  sessionId: string | null;
  onClose: () => void;
  onPaid: (razorpayPaymentId: string | null) => void;
}) {
  const { toast } = useToast();
  const [qrState, setQrState] = useState<QrState>("generating");
  const [qrId, setQrId] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(300);
  const [errorMsg, setErrorMsg] = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Generate QR when dialog opens
  useEffect(() => {
    if (!open || amount <= 0) return;
    setQrState("generating");
    setQrId(null);
    setImageUrl(null);
    setSecondsLeft(300);
    setErrorMsg("");

    fetch("/api/pos/payments/create-qr", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ amount, session_id: sessionId, description: `Bill ₹${amount}` }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.error) { setQrState("failed"); setErrorMsg(data.error); return; }
        setQrId(data.qr_id);
        setImageUrl(data.image_url);
        setQrState("waiting");
      })
      .catch(() => { setQrState("failed"); setErrorMsg("Network error — could not create QR"); });
  }, [open, amount]);

  // Start polling + countdown when waiting
  useEffect(() => {
    if (qrState !== "waiting" || !qrId) return;

    // Countdown
    timerRef.current = setInterval(() => {
      setSecondsLeft(s => {
        if (s <= 1) {
          clearInterval(timerRef.current!);
          setQrState("expired");
          return 0;
        }
        return s - 1;
      });
    }, 1000);

    // Poll payment status
    pollRef.current = setInterval(async () => {
      try {
        const r = await fetch(`/api/pos/payments/${qrId}/status`, { credentials: "include" });
        const data = await r.json();
        if (data.status === "paid") {
          clearInterval(pollRef.current!);
          clearInterval(timerRef.current!);
          setQrState("paid");
          setTimeout(() => onPaid(data.razorpay_payment_id), 1500);
        } else if (data.status === "expired") {
          clearInterval(pollRef.current!);
          clearInterval(timerRef.current!);
          setQrState("expired");
        }
      } catch { /* silent */ }
    }, 3000);

    return () => {
      clearInterval(pollRef.current!);
      clearInterval(timerRef.current!);
    };
  }, [qrState, qrId]);

  // Cleanup on close
  const handleClose = () => {
    clearInterval(pollRef.current!);
    clearInterval(timerRef.current!);
    setQrState("generating");
    onClose();
  };

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className="h-4 w-4 text-primary" /> UPI Payment — ₹{fmt(amount)}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-2">
          {/* Generating */}
          {qrState === "generating" && (
            <div className="flex flex-col items-center gap-3 py-8">
              <RefreshCw className="h-8 w-8 text-muted-foreground animate-spin" />
              <p className="text-sm text-muted-foreground">Generating QR code…</p>
            </div>
          )}

          {/* Waiting for payment */}
          {qrState === "waiting" && imageUrl && (
            <>
              <div className="p-3 border rounded-lg bg-white">
                <img src={imageUrl} alt="UPI QR Code" className="w-52 h-52 object-contain" />
              </div>
              <div className="text-center space-y-1">
                <p className="text-sm font-medium">Scan with any UPI app</p>
                <p className="text-xs text-muted-foreground">GPay · PhonePe · Paytm · BHIM · Any UPI</p>
              </div>
              <div className="flex items-center gap-2 text-sm font-mono">
                <Timer className="h-4 w-4 text-amber-500" />
                <span className={secondsLeft < 60 ? "text-red-600 font-bold" : "text-muted-foreground"}>
                  Expires in {mm}:{ss}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground animate-pulse">
                <RefreshCw className="h-3 w-3" /> Waiting for payment…
              </div>
            </>
          )}

          {/* Paid */}
          {qrState === "paid" && (
            <div className="flex flex-col items-center gap-3 py-8">
              <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <BadgeCheck className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <div className="text-center">
                <p className="font-bold text-green-700 dark:text-green-400">Payment Received!</p>
                <p className="text-sm text-muted-foreground mt-1">₹{fmt(amount)} via UPI</p>
              </div>
            </div>
          )}

          {/* Expired */}
          {qrState === "expired" && (
            <div className="flex flex-col items-center gap-3 py-6">
              <div className="w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <Timer className="h-7 w-7 text-amber-600" />
              </div>
              <div className="text-center">
                <p className="font-semibold">QR Code Expired</p>
                <p className="text-xs text-muted-foreground mt-1">The 5-minute window has passed</p>
              </div>
              <Button size="sm" onClick={() => { setQrState("generating"); setSecondsLeft(300); open && (open = true); }}>
                <RefreshCw className="h-3.5 w-3.5 mr-1" /> Generate New QR
              </Button>
            </div>
          )}

          {/* Failed */}
          {qrState === "failed" && (
            <div className="flex flex-col items-center gap-3 py-6">
              <div className="w-14 h-14 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <AlertTriangle className="h-7 w-7 text-red-600" />
              </div>
              <div className="text-center">
                <p className="font-semibold">Could not generate QR</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-[240px] leading-relaxed">{errorMsg}</p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          {qrState === "waiting" && (
            <Button variant="outline" size="sm" className="w-full" onClick={() => onPaid(null)}>
              Mark as Paid Manually
            </Button>
          )}
          {qrState !== "paid" && (
            <Button variant="ghost" size="sm" className="w-full" onClick={handleClose}>
              Cancel — Use Different Payment
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Overview Tab ──────────────────────────────────────────────────────────────
function OverviewTab() {
  const { data: stats } = useQuery<any>({ queryKey: ["/api/pos/stats"] });
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
      <SC title="Today's Sales"  value={`₹${fmt(stats?.todaySales)}`}         icon={TrendingUp} color="bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400" />
      <SC title="Today's Txns"   value={stats?.todayTransactions ?? 0}         icon={ShoppingCart} color="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" />
      <SC title="Monthly Sales"  value={`₹${fmt(stats?.monthlySales)}`}        icon={TrendingUp} color="bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400" />
      <SC title="Open Sessions"  value={stats?.openSessions ?? 0}              icon={Tag}        color="bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400" />
      <SC title="Customers"      value={stats?.totalCustomers ?? 0}            icon={Users}      color="bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400" />
    </div>
  );
}

// ── POS Terminal ──────────────────────────────────────────────────────────────
function TerminalTab({ onSessionOpened }: { onSessionOpened: () => void }) {
  const { toast } = useToast();
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [paymentMode, setPaymentMode] = useState("cash");
  const [amountPaid, setAmountPaid] = useState("");
  const [showOpenDialog, setShowOpenDialog] = useState(false);
  const [showLastSession, setShowLastSession] = useState(false);
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [closingBalance, setClosingBalance] = useState("");
  const [showUpiQr, setShowUpiQr] = useState(false);

  const { data: activeSession } = useQuery<any>({ queryKey: ["/api/pos/sessions/active"], refetchInterval: 30000 });
  const { data: products = [] } = useQuery<any[]>({ queryKey: ["/api/inventory/products"] });
  const { data: customers = [] } = useQuery<any[]>({ queryKey: ["/api/pos/customers"] });
  const { data: lastSession } = useQuery<any>({
    queryKey: ["/api/pos/sessions/last"],
    queryFn: async () => {
      const r = await fetch("/api/pos/sessions/last", { credentials: "include" });
      return r.json();
    },
  });

  const closeSessionMut = useMutation({
    mutationFn: (d: any) => apiRequest("POST", `/api/pos/sessions/${activeSession?.id}/close`, d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pos/sessions/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pos/sessions/last"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pos/sessions"] });
      setShowCloseDialog(false);
      setClosingBalance("");
      toast({ title: "Session closed", description: `${activeSession?.counter_name} session ended` });
    },
  });

  const saleMut = useMutation({
    mutationFn: (d: any) => apiRequest("POST", "/api/pos/transactions", d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pos/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pos/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pos/sessions/active"] });
      setCartItems([]); setSelectedCustomer(null); setAmountPaid("");
      setShowUpiQr(false);
      toast({ title: "Sale recorded!" });
    },
  });

  const addToCart = (product: any) => {
    setCartItems(prev => {
      const ex = prev.find(i => i.product_id === product.id);
      if (ex) return prev.map(i => i.product_id === product.id ? { ...i, quantity: i.quantity + 1, amount: (i.quantity + 1) * i.unit_price } : i);
      return [...prev, { product_id: product.id, product_name: product.name, sku: product.sku || null, quantity: 1, unit_price: Number(product.selling_price || product.price || 0), discount_pct: 0, tax_rate: Number(product.tax_rate || 0), amount: Number(product.selling_price || product.price || 0) }];
    });
  };
  const updateQty = (idx: number, qty: number) => {
    if (qty <= 0) { setCartItems(p => p.filter((_, i) => i !== idx)); return; }
    setCartItems(p => p.map((it, i) => i !== idx ? it : { ...it, quantity: qty, amount: qty * it.unit_price * (1 - it.discount_pct / 100) }));
  };
  const subtotal = cartItems.reduce((s, i) => s + i.amount, 0);
  const tax = cartItems.reduce((s, i) => s + i.amount * i.tax_rate / 100, 0);
  const total = subtotal + tax;
  const change = Number(amountPaid || 0) - total;

  const doRecordSale = (razorpayPaymentId?: string | null) => {
    saleMut.mutate({
      session_id: activeSession?.id || null,
      customer_id: selectedCustomer?.id || null,
      customer_name: selectedCustomer?.name || null,
      items: cartItems,
      payment_mode: paymentMode,
      amount_paid: Number(amountPaid) || total,
      razorpay_payment_id: razorpayPaymentId || undefined,
    });
  };

  const completeSale = () => {
    if (!cartItems.length) { toast({ title: "Cart is empty", variant: "destructive" }); return; }
    // UPI → show QR dialog; other modes → record immediately
    if (paymentMode === "upi") {
      setShowUpiQr(true);
    } else {
      doRecordSale();
    }
  };

  const filteredProducts = (products as any[]).filter(p =>
    p.name?.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.sku?.toLowerCase().includes(productSearch.toLowerCase())
  );
  const filteredCustomers = (customers as any[]).filter(c =>
    c.name?.toLowerCase().includes(productSearch.toLowerCase()) || c.phone?.includes(productSearch)
  );

  // ── No active session — empty state ────────────────────────────────────────
  if (!activeSession) {
    return (
      <div className="max-w-lg mx-auto space-y-5 py-8">
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-muted mx-auto">
            <ShoppingCart className="h-7 w-7 text-muted-foreground" />
          </div>
          <div>
            <p className="text-lg font-semibold">No active session</p>
            <p className="text-sm text-muted-foreground mt-1">Open a session to start billing</p>
          </div>
          <Button size="lg" onClick={() => setShowOpenDialog(true)} data-testid="button-open-session-empty">
            Open Session
          </Button>
        </div>

        {lastSession && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">Last Session Summary</p>
              <Button variant="ghost" size="sm" onClick={() => setShowLastSession(true)} data-testid="button-view-last-session">
                View Details
              </Button>
            </div>
            <LastSessionCard session={lastSession} />
          </div>
        )}

        <OpenSessionDialog
          open={showOpenDialog}
          onClose={() => setShowOpenDialog(false)}
          onOpened={onSessionOpened}
          onViewLastSession={() => { setShowOpenDialog(false); setShowLastSession(true); }}
        />

        {/* Last session detail dialog */}
        <Dialog open={showLastSession} onOpenChange={setShowLastSession}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Last Session Details</DialogTitle></DialogHeader>
            <LastSessionCard session={lastSession} />
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ── Active session ──────────────────────────────────────────────────────────
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 space-y-3">
        {/* Active session bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-md border border-green-200 dark:border-green-800">
          <div>
            <p className="font-semibold text-sm text-green-800 dark:text-green-200">
              {activeSession.counter_name} — Session Active
              {activeSession.shift_type === "continue" && <Badge variant="secondary" className="ml-2 text-xs">Continued</Badge>}
              {activeSession.approved_by && <Badge className="ml-2 text-xs bg-amber-100 text-amber-700">Mgr Approved</Badge>}
            </p>
            <p className="text-xs text-green-600 dark:text-green-400">
              Sales: ₹{fmt(activeSession.total_sales)} · Txns: {activeSession.total_transactions}
              · Float: ₹{fmt(activeSession.opening_balance)}
              {Number(activeSession.opening_upi_float) > 0 && ` + ₹${fmt(activeSession.opening_upi_float)} UPI`}
            </p>
          </div>
          <div className="flex gap-2">
            {lastSession && (
              <Button size="sm" variant="ghost" onClick={() => setShowLastSession(true)} data-testid="button-view-last-in-session">
                View Last Session
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={() => setShowCloseDialog(true)} data-testid="button-close-session">
              Close Session
            </Button>
          </div>
        </div>

        {/* ── Close Session Dialog ── */}
        <Dialog open={showCloseDialog} onOpenChange={setShowCloseDialog}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>Close POS Session</DialogTitle></DialogHeader>
            <div className="space-y-4">
              {/* Session summary */}
              <div className="p-3 rounded-md bg-muted/40 space-y-2 text-sm">
                <p className="font-medium">{activeSession?.counter_name}</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  <span className="text-muted-foreground">Total Sales</span>
                  <span className="font-semibold text-right">₹{fmt(activeSession?.total_sales)}</span>
                  <span className="text-muted-foreground">Transactions</span>
                  <span className="font-semibold text-right">{activeSession?.total_transactions}</span>
                  <span className="text-muted-foreground">Cash Float (Opening)</span>
                  <span className="font-semibold text-right">₹{fmt(activeSession?.opening_balance)}</span>
                  {Number(activeSession?.opening_upi_float) > 0 && <>
                    <span className="text-muted-foreground">UPI Float (Opening)</span>
                    <span className="font-semibold text-right">₹{fmt(activeSession?.opening_upi_float)}</span>
                  </>}
                  <span className="text-muted-foreground">Session Started</span>
                  <span className="font-semibold text-right">{activeSession?.opened_at ? fmtTime(activeSession.opened_at) : "—"}</span>
                </div>
              </div>
              <F label="Closing Cash Count (₹)">
                <CurrencyInput
                  value={closingBalance}
                  onChange={(e: any) => setClosingBalance(e.target.value)}
                  placeholder="Count the cash in drawer"
                  data-testid="input-closing-balance"
                  autoFocus
                />
              </F>
              {closingBalance && (
                <div className={`text-sm p-2 rounded-md ${
                  Number(closingBalance) < Number(activeSession?.opening_balance)
                    ? "bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300"
                    : "bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300"
                }`}>
                  Variance: ₹{fmt(Number(closingBalance) - Number(activeSession?.opening_balance || 0))}
                  {Number(closingBalance) < Number(activeSession?.opening_balance) ? " (shortage)" : " (surplus)"}
                </div>
              )}
            </div>
            <DialogFooter className="gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowCloseDialog(false)}>Cancel</Button>
              <Button
                variant="destructive"
                onClick={() => closeSessionMut.mutate({ closing_balance: Number(closingBalance || 0) })}
                disabled={closeSessionMut.isPending}
                data-testid="button-confirm-close-session"
              >
                {closeSessionMut.isPending ? "Closing…" : "Confirm Close"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Product search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search products by name or SKU…" className="pl-9" value={productSearch} onChange={e => setProductSearch(e.target.value)} data-testid="input-product-search" />
        </div>

        {/* Product grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-96 overflow-y-auto">
          {filteredProducts.slice(0, 30).map((p: any) => (
            <button key={p.id} onClick={() => addToCart(p)} className="text-left p-3 rounded-md border hover-elevate active-elevate-2" data-testid={`btn-product-${p.id}`}>
              <p className="font-medium text-sm truncate">{p.name}</p>
              <p className="text-xs text-muted-foreground">{p.sku || "—"}</p>
              <p className="text-sm font-semibold mt-1">₹{fmt(p.selling_price || p.price || 0)}</p>
            </button>
          ))}
          {!filteredProducts.length && <p className="col-span-3 text-center py-4 text-muted-foreground text-sm">No products found</p>}
        </div>
      </div>

      {/* Cart */}
      <div className="space-y-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Cart ({cartItems.length} items)</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {cartItems.map((it, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <div className="flex-1 min-w-0">
                  <p className="truncate font-medium">{it.product_name}</p>
                  <p className="text-xs text-muted-foreground">₹{fmt(it.unit_price)} × {it.quantity}</p>
                </div>
                <div className="flex items-center gap-1">
                  <Button size="icon" variant="ghost" onClick={() => updateQty(i, it.quantity - 1)}><span className="text-base leading-none">−</span></Button>
                  <span className="w-6 text-center text-sm">{it.quantity}</span>
                  <Button size="icon" variant="ghost" onClick={() => updateQty(i, it.quantity + 1)}><span className="text-base leading-none">+</span></Button>
                </div>
                <span className="w-20 text-right text-sm">₹{fmt(it.amount)}</span>
                <Button size="icon" variant="ghost" onClick={() => setCartItems(p => p.filter((_, idx) => idx !== i))}><X className="h-3 w-3" /></Button>
              </div>
            ))}
            {!cartItems.length && <p className="text-center text-sm text-muted-foreground py-4">Cart is empty</p>}

            <div className="border-t pt-2 space-y-1 text-sm">
              <div className="flex justify-between"><span>Subtotal</span><span>₹{fmt(subtotal)}</span></div>
              <div className="flex justify-between"><span>Tax</span><span>₹{fmt(tax)}</span></div>
              <div className="flex justify-between font-bold text-base border-t pt-1"><span>Total</span><span>₹{fmt(total)}</span></div>
            </div>

            <F label="Customer">
              <Select value={selectedCustomer?.id ? String(selectedCustomer.id) : "__none__"} onValueChange={v => { const c = (customers as any[]).find(c => String(c.id) === v); setSelectedCustomer(c || null); }}>
                <SelectTrigger data-testid="select-customer"><SelectValue placeholder="Walk-in customer" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Walk-in</SelectItem>
                  {filteredCustomers.map((c: any) => <SelectItem key={c.id} value={String(c.id)}>{c.name} — {c.phone}</SelectItem>)}
                </SelectContent>
              </Select>
            </F>

            <F label="Payment Mode">
              <Select value={paymentMode} onValueChange={setPaymentMode}>
                <SelectTrigger data-testid="select-payment-mode"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash"><span className="flex items-center gap-2"><Wallet className="h-3.5 w-3.5" />Cash</span></SelectItem>
                  <SelectItem value="upi"><span className="flex items-center gap-2"><Smartphone className="h-3.5 w-3.5" />UPI</span></SelectItem>
                  <SelectItem value="card"><span className="flex items-center gap-2"><CreditCard className="h-3.5 w-3.5" />Card</span></SelectItem>
                  <SelectItem value="wallet">Wallet</SelectItem>
                </SelectContent>
              </Select>
            </F>

            <F label="Amount Tendered (₹)">
              <CurrencyInput value={amountPaid} onChange={(e: any) => setAmountPaid(e.target.value)} placeholder={fmt(total)} data-testid="input-amount-paid" />
            </F>
            {amountPaid && change >= 0 && <p className="text-sm text-green-700 dark:text-green-400 font-medium">Change: ₹{fmt(change)}</p>}

            <Button className="w-full" onClick={completeSale} disabled={saleMut.isPending || !cartItems.length} data-testid="button-complete-sale">
              Complete Sale — ₹{fmt(total)}
            </Button>
            {cartItems.length > 0 && <Button variant="outline" className="w-full" onClick={() => setCartItems([])}>Clear Cart</Button>}
          </CardContent>
        </Card>
      </div>

      {/* Last session detail dialog */}
      <Dialog open={showLastSession} onOpenChange={setShowLastSession}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Last Session Details</DialogTitle></DialogHeader>
          <LastSessionCard session={lastSession} />
        </DialogContent>
      </Dialog>

      {/* UPI QR Payment Dialog */}
      <UpiQrDialog
        open={showUpiQr}
        amount={total}
        sessionId={activeSession?.id || null}
        onClose={() => setShowUpiQr(false)}
        onPaid={(razorpayPaymentId) => {
          setShowUpiQr(false);
          doRecordSale(razorpayPaymentId);
        }}
      />
    </div>
  );
}

// ── Sales History ─────────────────────────────────────────────────────────────
function SalesHistoryTab() {
  const [search, setSearch] = useState("");
  const { data: txns = [] } = useQuery<any[]>({ queryKey: ["/api/pos/transactions"] });
  const filtered = (txns as any[]).filter(t => t.transaction_no?.includes(search) || t.customer_name?.toLowerCase().includes(search.toLowerCase()));
  return (
    <div className="space-y-4">
      <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search transactions…" className="pl-9" value={search} onChange={e => setSearch(e.target.value)} /></div>
      <div className="rounded-md border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50"><tr>{["Txn No.", "Customer", "Subtotal", "Tax", "Discount", "Total", "Mode", "Paid", "Change", "Date"].map(h => <th key={h} className="px-3 py-2 text-left font-medium whitespace-nowrap">{h}</th>)}</tr></thead>
          <tbody>
            {filtered.map(t => (
              <tr key={t.id} className="border-t hover:bg-muted/30">
                <td className="px-3 py-2 font-mono text-xs">{t.transaction_no}</td>
                <td className="px-3 py-2">{t.customer_name || "Walk-in"}</td>
                <td className="px-3 py-2">₹{fmt(t.subtotal)}</td>
                <td className="px-3 py-2">₹{fmt(t.tax_amount)}</td>
                <td className="px-3 py-2">₹{fmt(t.discount_amount)}</td>
                <td className="px-3 py-2 font-bold">₹{fmt(t.total_amount)}</td>
                <td className="px-3 py-2 uppercase">{t.payment_mode}</td>
                <td className="px-3 py-2">₹{fmt(t.amount_paid)}</td>
                <td className="px-3 py-2">₹{fmt(t.change_given)}</td>
                <td className="px-3 py-2 whitespace-nowrap">{new Date(t.created_at).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}</td>
              </tr>
            ))}
            {!filtered.length && <tr><td colSpan={10} className="px-3 py-6 text-center text-muted-foreground">No transactions</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Customers Tab ─────────────────────────────────────────────────────────────
function CustomersTab() {
  const { toast } = useToast();
  const [search, setSearch] = useState(""); const [showForm, setShowForm] = useState(false); const [editing, setEditing] = useState<any>(null); const [form, setForm] = useState<any>({});
  const { data: customers = [] } = useQuery<any[]>({ queryKey: ["/api/pos/customers"] });
  const saveMut = useMutation({ mutationFn: (d: any) => editing ? apiRequest("PUT", `/api/pos/customers/${editing.id}`, d) : apiRequest("POST", "/api/pos/customers", d), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/pos/customers"] }); setShowForm(false); toast({ title: "Saved" }); } });
  const delMut = useMutation({ mutationFn: (id: any) => apiRequest("DELETE", `/api/pos/customers/${id}`), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/pos/customers"] }) });
  const filtered = (customers as any[]).filter(c => c.name?.toLowerCase().includes(search.toLowerCase()) || c.phone?.includes(search));
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search customers…" className="pl-9" value={search} onChange={e => setSearch(e.target.value)} /></div>
        <Button onClick={() => { setEditing(null); setForm({}); setShowForm(true); }}><Plus className="h-4 w-4 mr-1" />Add Customer</Button>
      </div>
      <div className="rounded-md border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50"><tr>{["Code", "Name", "Phone", "Email", "Loyalty Pts", "Credit Limit", "Outstanding", ""].map(h => <th key={h} className="px-3 py-2 text-left font-medium">{h}</th>)}</tr></thead>
          <tbody>
            {filtered.map(c => (
              <tr key={c.id} className="border-t hover:bg-muted/30">
                <td className="px-3 py-2 font-mono text-xs">{c.customer_code}</td><td className="px-3 py-2 font-medium">{c.name}</td>
                <td className="px-3 py-2">{c.phone || "—"}</td><td className="px-3 py-2">{c.email || "—"}</td>
                <td className="px-3 py-2"><Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">{c.loyalty_points || 0} pts</Badge></td>
                <td className="px-3 py-2">₹{fmt(c.credit_limit)}</td><td className="px-3 py-2">₹{fmt(c.outstanding_balance)}</td>
                <td className="px-3 py-2"><div className="flex gap-1"><Button size="icon" variant="ghost" onClick={() => { setEditing(c); setForm({ ...c }); setShowForm(true); }}><Pencil className="h-3.5 w-3.5" /></Button><Button size="icon" variant="ghost" onClick={() => delMut.mutate(c.id)}><Trash2 className="h-3.5 w-3.5" /></Button></div></td>
              </tr>
            ))}
            {!filtered.length && <tr><td colSpan={8} className="px-3 py-6 text-center text-muted-foreground">No customers</td></tr>}
          </tbody>
        </table>
      </div>
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md"><DialogHeader><DialogTitle>{editing ? "Edit" : "Add"} Customer</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><F label="Name *"><Input value={form.name || ""} onChange={e => setForm({ ...form, name: e.target.value })} /></F></div>
            <F label="Phone"><Input value={form.phone || ""} onChange={e => setForm({ ...form, phone: e.target.value })} /></F>
            <F label="Email"><Input value={form.email || ""} onChange={e => setForm({ ...form, email: e.target.value })} /></F>
            <F label="Credit Limit (₹)"><Input type="number" value={form.credit_limit || ""} onChange={e => setForm({ ...form, credit_limit: e.target.value })} /></F>
            <F label="Date of Birth"><Input type="date" value={form.date_of_birth || ""} onChange={e => setForm({ ...form, date_of_birth: e.target.value })} /></F>
            <div className="col-span-2"><F label="Address"><Input value={form.address || ""} onChange={e => setForm({ ...form, address: e.target.value })} /></F></div>
          </div>
          <DialogFooter className="pt-2"><Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button><Button onClick={() => saveMut.mutate(form)} disabled={saveMut.isPending}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Returns Tab ───────────────────────────────────────────────────────────────
function ReturnsTab() {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false); const [form, setForm] = useState<any>({});
  const { data: returns_ = [] } = useQuery<any[]>({ queryKey: ["/api/pos/returns"] });
  const { data: customers = [] } = useQuery<any[]>({ queryKey: ["/api/pos/customers"] });
  const saveMut = useMutation({ mutationFn: (d: any) => apiRequest("POST", "/api/pos/returns", d), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/pos/returns"] }); setShowForm(false); toast({ title: "Return processed" }); } });
  const delMut = useMutation({ mutationFn: (id: any) => apiRequest("DELETE", `/api/pos/returns/${id}`), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/pos/returns"] }) });
  return (
    <div className="space-y-4">
      <div className="flex justify-end"><Button onClick={() => { setForm({ return_date: new Date().toISOString().split("T")[0], refund_mode: "cash" }); setShowForm(true); }}><Plus className="h-4 w-4 mr-1" />Process Return</Button></div>
      <div className="rounded-md border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50"><tr>{["Return No.", "Customer", "Date", "Amount", "Reason", "Refund Mode", "Status", ""].map(h => <th key={h} className="px-3 py-2 text-left font-medium">{h}</th>)}</tr></thead>
          <tbody>
            {(returns_ as any[]).map(r => (
              <tr key={r.id} className="border-t hover:bg-muted/30">
                <td className="px-3 py-2 font-mono text-xs">{r.return_number}</td><td className="px-3 py-2">{r.customer_name_ref || "Walk-in"}</td>
                <td className="px-3 py-2">{r.return_date?.split("T")[0]}</td><td className="px-3 py-2 font-medium">₹{fmt(r.return_amount)}</td>
                <td className="px-3 py-2 max-w-[150px] truncate">{r.reason || "—"}</td><td className="px-3 py-2 uppercase">{r.refund_mode}</td>
                <td className="px-3 py-2"><Badge className={r.status === "approved" ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}>{r.status || "pending"}</Badge></td>
                <td className="px-3 py-2"><Button size="icon" variant="ghost" onClick={() => delMut.mutate(r.id)}><Trash2 className="h-3.5 w-3.5" /></Button></td>
              </tr>
            ))}
            {!(returns_ as any[]).length && <tr><td colSpan={8} className="px-3 py-6 text-center text-muted-foreground">No returns</td></tr>}
          </tbody>
        </table>
      </div>
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md"><DialogHeader><DialogTitle>Process Return</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><F label="Customer"><Select value={form.customer_id ? String(form.customer_id) : "__none__"} onValueChange={v => setForm({ ...form, customer_id: v === "__none__" ? "" : v })}><SelectTrigger><SelectValue placeholder="Walk-in" /></SelectTrigger><SelectContent><SelectItem value="__none__">Walk-in</SelectItem>{(customers as any[]).map((c: any) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}</SelectContent></Select></F></div>
            <F label="Original Txn No."><Input value={form.original_txn_no || ""} onChange={e => setForm({ ...form, original_txn_no: e.target.value })} /></F>
            <F label="Return Date"><Input type="date" value={form.return_date || ""} onChange={e => setForm({ ...form, return_date: e.target.value })} /></F>
            <F label="Return Amount (₹)"><Input type="number" value={form.return_amount || ""} onChange={e => setForm({ ...form, return_amount: e.target.value })} /></F>
            <F label="Refund Mode"><Select value={form.refund_mode || "cash"} onValueChange={v => setForm({ ...form, refund_mode: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["cash", "card", "upi", "store_credit"].map(m => <SelectItem key={m} value={m}>{m.toUpperCase()}</SelectItem>)}</SelectContent></Select></F>
            <div className="col-span-2"><F label="Reason"><Input value={form.reason || ""} onChange={e => setForm({ ...form, reason: e.target.value })} /></F></div>
          </div>
          <DialogFooter className="pt-2"><Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button><Button onClick={() => saveMut.mutate(form)} disabled={saveMut.isPending}>Process</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Promotions Tab ────────────────────────────────────────────────────────────
function PromotionsTab() {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false); const [editing, setEditing] = useState<any>(null); const [form, setForm] = useState<any>({});
  const { data: promos = [] } = useQuery<any[]>({ queryKey: ["/api/pos/promotions"] });
  const saveMut = useMutation({ mutationFn: (d: any) => editing ? apiRequest("PUT", `/api/pos/promotions/${editing.id}`, d) : apiRequest("POST", "/api/pos/promotions", d), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/pos/promotions"] }); setShowForm(false); toast({ title: "Saved" }); } });
  const delMut = useMutation({ mutationFn: (id: any) => apiRequest("DELETE", `/api/pos/promotions/${id}`), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/pos/promotions"] }) });
  const isActive = (p: any) => { if (!p.is_active) return false; const now = Date.now(); if (p.start_date && new Date(p.start_date).getTime() > now) return false; if (p.end_date && new Date(p.end_date).getTime() < now) return false; return true; };
  return (
    <div className="space-y-4">
      <div className="flex justify-end"><Button onClick={() => { setEditing(null); setForm({ promo_type: "percentage", is_active: true }); setShowForm(true); }}><Plus className="h-4 w-4 mr-1" />Add Promotion</Button></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {(promos as any[]).map(p => (
          <Card key={p.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2"><p className="font-semibold">{p.name}</p><Badge className={isActive(p) ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}>{isActive(p) ? "Active" : "Inactive"}</Badge></div>
                  {p.promo_code && <p className="text-xs font-mono bg-muted px-2 py-0.5 rounded mt-1 inline-block">{p.promo_code}</p>}
                </div>
                <div className="flex gap-1"><Button size="icon" variant="ghost" onClick={() => { setEditing(p); setForm({ ...p, start_date: p.start_date?.split("T")[0], end_date: p.end_date?.split("T")[0] }); setShowForm(true); }}><Pencil className="h-3.5 w-3.5" /></Button><Button size="icon" variant="ghost" onClick={() => delMut.mutate(p.id)}><Trash2 className="h-3.5 w-3.5" /></Button></div>
              </div>
              <p className="text-sm text-muted-foreground">{p.promo_type === "percentage" ? `${p.discount_value}% off` : `₹${fmt(p.discount_value)} off`}</p>
              {p.min_purchase_amount > 0 && <p className="text-xs text-muted-foreground">Min purchase: ₹{fmt(p.min_purchase_amount)}</p>}
              {(p.start_date || p.end_date) && <p className="text-xs text-muted-foreground mt-1">{p.start_date?.split("T")[0]} → {p.end_date?.split("T")[0]}</p>}
            </CardContent>
          </Card>
        ))}
        {!(promos as any[]).length && <p className="text-muted-foreground text-sm py-8 text-center col-span-3">No promotions yet</p>}
      </div>
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md"><DialogHeader><DialogTitle>{editing ? "Edit" : "Add"} Promotion</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><F label="Name *"><Input value={form.name || ""} onChange={e => setForm({ ...form, name: e.target.value })} /></F></div>
            <F label="Promo Code"><Input placeholder="SAVE10" value={form.promo_code || ""} onChange={e => setForm({ ...form, promo_code: e.target.value })} /></F>
            <F label="Type"><Select value={form.promo_type || "percentage"} onValueChange={v => setForm({ ...form, promo_type: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="percentage">Percentage (%)</SelectItem><SelectItem value="fixed">Fixed Amount (₹)</SelectItem></SelectContent></Select></F>
            <F label={`Discount ${form.promo_type === "percentage" ? "%" : "(₹)"}`}><Input type="number" value={form.discount_value || ""} onChange={e => setForm({ ...form, discount_value: e.target.value })} /></F>
            <F label="Min Purchase (₹)"><Input type="number" value={form.min_purchase_amount || ""} onChange={e => setForm({ ...form, min_purchase_amount: e.target.value })} /></F>
            <F label="Start Date"><Input type="date" value={form.start_date || ""} onChange={e => setForm({ ...form, start_date: e.target.value })} /></F>
            <F label="End Date"><Input type="date" value={form.end_date || ""} onChange={e => setForm({ ...form, end_date: e.target.value })} /></F>
            <F label="Usage Limit"><Input type="number" value={form.usage_limit || ""} onChange={e => setForm({ ...form, usage_limit: e.target.value })} /></F>
            <F label="Status"><Select value={form.is_active ? "true" : "false"} onValueChange={v => setForm({ ...form, is_active: v === "true" })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="true">Active</SelectItem><SelectItem value="false">Inactive</SelectItem></SelectContent></Select></F>
          </div>
          <DialogFooter className="pt-2"><Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button><Button onClick={() => saveMut.mutate(form)} disabled={saveMut.isPending}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Sessions Tab ──────────────────────────────────────────────────────────────
function SessionsTab() {
  const { data: sessions = [] } = useQuery<any[]>({ queryKey: ["/api/pos/sessions"] });
  return (
    <div className="rounded-md border overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>{["Counter", "Opened", "Closed", "Cash Float", "UPI Float", "Total Sales", "Txns", "Approved By", "Status"].map(h => <th key={h} className="px-3 py-2 text-left font-medium whitespace-nowrap">{h}</th>)}</tr>
        </thead>
        <tbody>
          {(sessions as any[]).map(s => (
            <tr key={s.id} className="border-t hover:bg-muted/30">
              <td className="px-3 py-2 font-medium">{s.counter_name}</td>
              <td className="px-3 py-2 whitespace-nowrap">{fmtTime(s.opened_at)}</td>
              <td className="px-3 py-2 whitespace-nowrap">{s.closed_at ? fmtTime(s.closed_at) : "—"}</td>
              <td className="px-3 py-2">₹{fmt(s.opening_balance)}</td>
              <td className="px-3 py-2">₹{fmt(s.opening_upi_float || 0)}</td>
              <td className="px-3 py-2 font-medium">₹{fmt(s.total_sales)}</td>
              <td className="px-3 py-2">{s.total_transactions}</td>
              <td className="px-3 py-2">{s.approved_by ? <Badge className="bg-amber-100 text-amber-700 text-xs">{s.approved_by}</Badge> : "—"}</td>
              <td className="px-3 py-2"><Badge className={s.status === "open" ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"}>{s.status}</Badge></td>
            </tr>
          ))}
          {!(sessions as any[]).length && <tr><td colSpan={9} className="px-3 py-6 text-center text-muted-foreground">No sessions</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function POSPage() {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">POS / Retail Management</h1>
        <p className="text-muted-foreground text-sm mt-1">POS Terminal, Sales History, Customers, Returns, Promotions &amp; Sessions</p>
      </div>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap gap-1 h-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="terminal" data-testid="tab-terminal"><ShoppingCart className="h-3.5 w-3.5 mr-1" />POS Terminal</TabsTrigger>
          <TabsTrigger value="sales">Sales History</TabsTrigger>
          <TabsTrigger value="customers"><Users className="h-3.5 w-3.5 mr-1" />Customers</TabsTrigger>
          <TabsTrigger value="returns"><RotateCcw className="h-3.5 w-3.5 mr-1" />Returns</TabsTrigger>
          <TabsTrigger value="promotions"><Tag className="h-3.5 w-3.5 mr-1" />Promotions</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
        </TabsList>
        <div className="mt-4">
          <TabsContent value="overview"><OverviewTab /></TabsContent>
          <TabsContent value="terminal">
            <TerminalTab onSessionOpened={() => setActiveTab("terminal")} />
          </TabsContent>
          <TabsContent value="sales"><SalesHistoryTab /></TabsContent>
          <TabsContent value="customers"><CustomersTab /></TabsContent>
          <TabsContent value="returns"><ReturnsTab /></TabsContent>
          <TabsContent value="promotions"><PromotionsTab /></TabsContent>
          <TabsContent value="sessions"><SessionsTab /></TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
