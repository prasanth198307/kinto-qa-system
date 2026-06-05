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
  QrCode, RefreshCw, Timer, BadgeCheck, Printer, Monitor, Wifi, Settings2,
  Check, Cpu, Receipt, WifiOff, PauseCircle, PlayCircle, Layers,
  Scan, BarChart2, Scale, Gift,
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

// ── Denomination constants & grid ─────────────────────────────────────────────
const DENOMINATIONS = [500, 200, 100, 50, 20, 10, 5, 2, 1];
type DenomMap = Record<number, number>;

function DenominationInput({ value, onChange }: { value: DenomMap; onChange: (v: DenomMap) => void }) {
  const total = DENOMINATIONS.reduce((s, d) => s + d * (value[d] || 0), 0);
  return (
    <div className="space-y-1.5">
      <div className="grid gap-1">
        {DENOMINATIONS.map(d => (
          <div key={d} className="grid grid-cols-[52px_1fr_72px] items-center gap-2">
            <span className="text-xs font-medium text-right text-muted-foreground">₹{d}</span>
            <Input
              type="number" min="0" placeholder="0"
              value={value[d] || ""}
              onChange={e => onChange({ ...value, [d]: Number(e.target.value) || 0 })}
              className="h-7 text-center text-sm"
            />
            <span className="text-xs text-muted-foreground text-right">
              = ₹{((value[d] || 0) * d).toLocaleString("en-IN")}
            </span>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between pt-1 border-t font-semibold text-sm">
        <span>Total Cash</span>
        <span className="text-primary">₹{total.toLocaleString("en-IN")}</span>
      </div>
    </div>
  );
}

// ── Split payment panel ────────────────────────────────────────────────────────
const PAY_MODES = [
  { value: "cash",   label: "Cash",   icon: Wallet },
  { value: "upi",    label: "UPI",    icon: Smartphone },
  { value: "card",   label: "Card",   icon: CreditCard },
  { value: "wallet", label: "Wallet", icon: Tag },
];
type SplitRow = { mode: string; amount: string };

function SplitPaymentPanel({ total, splits, onSplitsChange }: {
  total: number; splits: SplitRow[]; onSplitsChange: (s: SplitRow[]) => void;
}) {
  const splitTotal = splits.reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const remaining = +(total - splitTotal).toFixed(2);
  const changeGiven = splitTotal > total + 0.01 ? +(splitTotal - total).toFixed(2) : 0;

  const addMode = () => {
    const used = splits.map(s => s.mode);
    const avail = PAY_MODES.find(m => !used.includes(m.value));
    if (avail) onSplitsChange([...splits, { mode: avail.value, amount: "" }]);
  };
  const update = (i: number, field: keyof SplitRow, v: string) =>
    onSplitsChange(splits.map((r, idx) => idx === i ? { ...r, [field]: v } : r));
  const autoFill = (i: number) => {
    const others = splits.reduce((s, r, idx) => idx !== i ? s + (Number(r.amount) || 0) : s, 0);
    update(i, "amount", Math.max(0, +(total - others).toFixed(2)).toString());
  };

  return (
    <div className="space-y-2">
      {splits.map((row, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <Select value={row.mode} onValueChange={v => update(i, "mode", v)}>
            <SelectTrigger className="w-24 shrink-0 text-xs h-8"><SelectValue /></SelectTrigger>
            <SelectContent>
              {PAY_MODES.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="relative flex-1">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">₹</span>
            <Input type="number" min="0" step="0.01" placeholder="0.00"
              value={row.amount} onChange={e => update(i, "amount", e.target.value)}
              className="pl-5 h-8 text-sm" />
          </div>
          <Button size="icon" variant="ghost" onClick={() => autoFill(i)} title="Fill remaining" className="h-8 w-8 shrink-0">
            <ArrowRight className="h-3 w-3" />
          </Button>
          {splits.length > 1 && (
            <Button size="icon" variant="ghost" onClick={() => onSplitsChange(splits.filter((_, idx) => idx !== i))} className="h-8 w-8 shrink-0">
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      ))}
      {splits.length < PAY_MODES.length && (
        <Button variant="outline" size="sm" className="w-full h-7 text-xs" onClick={addMode}>
          <Plus className="h-3 w-3 mr-1" />Split with another mode
        </Button>
      )}
      <div className="text-xs space-y-0.5 pt-1.5 border-t">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Bill Total</span>
          <span className="font-semibold">₹{fmt(total)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Tendered</span>
          <span>₹{fmt(splitTotal)}</span>
        </div>
        {remaining > 0.01 && (
          <div className="flex justify-between text-amber-600 dark:text-amber-400 font-medium">
            <span>Balance Due</span><span>₹{fmt(remaining)}</span>
          </div>
        )}
        {changeGiven > 0.01 && (
          <div className="flex justify-between text-green-700 dark:text-green-400 font-semibold">
            <span>Change to Return</span><span>₹{fmt(changeGiven)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── MRP Override Dialog ────────────────────────────────────────────────────────
function MrpOverrideDialog({ open, itemName, mrpRupees, currentPrice, onConfirm, onClose }: {
  open: boolean; itemName: string; mrpRupees: number; currentPrice: number;
  onConfirm: (price: number) => void; onClose: () => void;
}) {
  const { toast } = useToast();
  // Pre-fill with MRP if current price is above MRP, otherwise keep current price
  const safeDefault = mrpRupees > 0 && currentPrice > mrpRupees ? String(mrpRupees) : String(currentPrice || "");
  const [newPrice, setNewPrice] = useState(safeDefault);
  const [priceError, setPriceError] = useState("");

  const handleClose = () => {
    setNewPrice(safeDefault);
    setPriceError("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-500" />MRP Ceiling — Price Locked
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Hard-lock notice */}
          <div className="p-3 rounded-md bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-700 text-sm text-red-800 dark:text-red-300">
            <p className="font-medium truncate">{itemName}</p>
            <p className="text-xs mt-0.5">
              MRP is <strong>₹{fmt(mrpRupees)}</strong>. You cannot bill above MRP (Consumer Protection Act).
              Enter a price at or below MRP to continue.
            </p>
          </div>
          <F label={`Selling Price (₹) — max ₹${fmt(mrpRupees)}`}>
            <CurrencyInput
              value={newPrice}
              onChange={(e: any) => { setNewPrice(e.target.value); setPriceError(""); }}
              placeholder={fmt(mrpRupees)}
            />
          </F>
          {priceError && (
            <p className="text-sm text-destructive flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5" />{priceError}
            </p>
          )}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button
            onClick={() => {
              const p = Number(newPrice);
              if (!p || p <= 0) { setPriceError("Enter a valid price"); return; }
              if (mrpRupees > 0 && p > mrpRupees) {
                setPriceError(`Price cannot exceed MRP of ₹${fmt(mrpRupees)}`);
                return;
              }
              onConfirm(p);
              onClose();
            }}
          >
            Apply Price
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
  const [cashDenom, setCashDenom] = useState<DenomMap>({});
  const [upiFloat, setUpiFloat] = useState("");
  const [shiftType, setShiftType] = useState<"new" | "continue">("new");
  const [shiftName, setShiftName] = useState<"Morning" | "Evening" | "Night">("Morning");
  const [mgr, setMgr] = useState({ username: "", password: "" });
  const [showMgrPass, setShowMgrPass] = useState(false);
  const [approvedBy, setApprovedBy] = useState("");
  const [mgrError, setMgrError] = useState("");
  const cashFloat = DENOMINATIONS.reduce((s, d) => s + d * (cashDenom[d] || 0), 0);

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
      opening_balance: cashFloat,
      opening_denomination: cashDenom,
      opening_upi_float: Number(upiFloat || 0),
      approved_by: managerUser || approvedBy || null,
      shift_type: shiftType,
      shift_name: shiftName,
    });
  }

  function handleClose() {
    setStep("balance");
    setCashDenom({});
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

            <F label="Shift">
              <div className="flex gap-2">
                {(["Morning", "Evening", "Night"] as const).map(s => (
                  <button
                    key={s}
                    onClick={() => setShiftName(s)}
                    className={`flex-1 py-2 rounded-md border text-sm font-medium transition-colors ${shiftName === s ? "border-primary bg-primary/10 text-primary" : "border-muted hover-elevate"}`}
                    data-testid={`btn-shift-name-${s.toLowerCase()}`}
                  >
                    {s === "Morning" ? "🌅" : s === "Evening" ? "🌆" : "🌙"} {s}
                  </button>
                ))}
              </div>
            </F>

            <F label="Cash Opening (count denomination-wise)">
              <DenominationInput value={cashDenom} onChange={setCashDenom} />
            </F>
            <F label="UPI Opening Float">
              <CurrencyInput
                value={upiFloat}
                onChange={(e: any) => setUpiFloat(e.target.value)}
                placeholder="0.00"
                data-testid="input-upi-float"
              />
            </F>

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

// ── Card Terminal Dialog ───────────────────────────────────────────────────────
type CardState = "loading" | "no_terminal" | "initiating" | "waiting" | "paid" | "failed";
const TERMINAL_TYPE_LABELS: Record<string, string> = {
  manual: "Manual Confirmation",
  razorpay_pos: "Razorpay POS",
  pine_labs: "Pine Labs Plutus",
  ingenico: "Ingenico",
  generic_http: "HTTP Terminal",
};

function CardTerminalDialog({ open, amount, sessionId, counterName, onClose, onPaid }: {
  open: boolean; amount: number; sessionId: string | null; counterName: string;
  onClose: () => void; onPaid: (terminalId: string | null, cardRef: string | null) => void;
}) {
  const [state, setState] = useState<CardState>("loading");
  const [terminal, setTerminal] = useState<any>(null);
  const [chargeId, setChargeId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [cardRef, setCardRef] = useState("");
  const pollRef = useRef<any>(null);

  const initiatePayment = (t: any) => {
    setState("initiating");
    fetch("/api/pos/payments/initiate-card", {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount, session_id: sessionId, terminal_id: t.id }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.error) { setState("failed"); setErrorMsg(data.error); return; }
        // Pine Labs / Ingenico return instant result
        if (data.status === "paid") { setState("paid"); setTimeout(() => onPaid(t.id, data.card_ref || null), 1200); return; }
        if (data.status === "failed") { setState("failed"); setErrorMsg("Payment declined by terminal"); return; }
        // Razorpay POS / manual — wait for confirm
        if (data.charge_id) setChargeId(data.charge_id);
        setState("waiting");
        if (data.charge_id && data.type === "razorpay_pos") {
          pollRef.current = setInterval(async () => {
            const r = await fetch(`/api/pos/payments/card-status/${data.charge_id}`, { credentials: "include" });
            const s = await r.json();
            if (s.status === "paid") { clearInterval(pollRef.current); setState("paid"); setTimeout(() => onPaid(t.id, s.card_ref||null), 1200); }
            else if (s.status === "failed") { clearInterval(pollRef.current); setState("failed"); setErrorMsg("Payment declined"); }
          }, 3000);
        }
      })
      .catch(e => { setState("failed"); setErrorMsg("Network error: " + e.message); });
  };

  useEffect(() => {
    if (!open) { clearInterval(pollRef.current); return; }
    setState("loading"); setTerminal(null); setChargeId(null); setErrorMsg(""); setCardRef("");
    if (!counterName) { setState("no_terminal"); return; }
    fetch(`/api/pos/terminals/by-counter/${encodeURIComponent(counterName)}`, { credentials: "include" })
      .then(r => r.json())
      .then(data => {
        if (data?.id) {
          setTerminal(data);
          if (data.terminal_type === "manual") setState("waiting");
          else initiatePayment(data);
        } else {
          setState("no_terminal");
        }
      })
      .catch(() => setState("no_terminal"));
  }, [open, counterName]);

  useEffect(() => () => clearInterval(pollRef.current), []);

  const handleClose = () => { clearInterval(pollRef.current); onClose(); };

  const handleManualConfirm = () => {
    setState("paid");
    setTimeout(() => onPaid(terminal?.id || null, cardRef || null), 800);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><CreditCard className="h-4 w-4" />Card Payment</DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-4 text-center">
          {state === "loading" && (
            <div className="flex flex-col items-center gap-3 py-4">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Checking terminal assignment…</p>
            </div>
          )}

          {state === "no_terminal" && (
            <div className="space-y-4">
              <div className="flex flex-col items-center gap-2 py-2">
                <WifiOff className="h-10 w-10 text-muted-foreground" />
                <p className="font-medium">No terminal assigned to {counterName}</p>
                <p className="text-sm text-muted-foreground">Go to <strong>Terminals</strong> tab to assign a payment machine to this counter.</p>
              </div>
              <div className="rounded-md border p-3 text-left space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Confirm manually instead</p>
                <Input placeholder="Card approval / ref no. (optional)" value={cardRef} onChange={e => setCardRef(e.target.value)} />
                <Button className="w-full" onClick={() => { setState("paid"); setTimeout(() => onPaid(null, cardRef || null), 800); }}>
                  <Check className="h-4 w-4 mr-2" />Mark as Paid — ₹{fmt(amount)}
                </Button>
              </div>
            </div>
          )}

          {state === "initiating" && (
            <div className="flex flex-col items-center gap-3 py-4">
              <Cpu className="h-10 w-10 text-blue-500 animate-pulse" />
              <p className="font-medium">Sending to {terminal ? TERMINAL_TYPE_LABELS[terminal.terminal_type] : "terminal"}…</p>
              <p className="text-sm text-muted-foreground">₹{fmt(amount)}</p>
            </div>
          )}

          {state === "waiting" && (
            <div className="space-y-4">
              <div className="flex flex-col items-center gap-2">
                <div className="h-16 w-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <CreditCard className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                </div>
                <p className="text-2xl font-bold">₹{fmt(amount)}</p>
                {terminal && (
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Monitor className="h-3.5 w-3.5" />
                    <span>{terminal.terminal_name || TERMINAL_TYPE_LABELS[terminal.terminal_type]} — {counterName}</span>
                  </div>
                )}
                <p className="text-sm text-muted-foreground">
                  {terminal?.terminal_type === "razorpay_pos"
                    ? "Waiting for card tap / swipe on terminal…"
                    : "Swipe, insert or tap card on the terminal"}
                </p>
              </div>
              {(terminal?.terminal_type === "manual" || !terminal) && (
                <div className="space-y-2">
                  <Input placeholder="Enter approval / ref no. (optional)" value={cardRef} onChange={e => setCardRef(e.target.value)} />
                  <Button className="w-full" onClick={handleManualConfirm}>
                    <Check className="h-4 w-4 mr-2" />Confirm Payment Received
                  </Button>
                </div>
              )}
              {terminal?.terminal_type === "razorpay_pos" && (
                <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                  <Wifi className="h-3.5 w-3.5 animate-pulse" />Polling terminal status…
                </div>
              )}
            </div>
          )}

          {state === "paid" && (
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <p className="text-lg font-bold text-green-700 dark:text-green-400">Payment Successful!</p>
              <p className="text-sm text-muted-foreground">₹{fmt(amount)} via Card</p>
              {cardRef && <p className="text-xs font-mono bg-muted px-2 py-1 rounded">Ref: {cardRef}</p>}
            </div>
          )}

          {state === "failed" && (
            <div className="space-y-4">
              <div className="flex flex-col items-center gap-2 py-2">
                <AlertTriangle className="h-10 w-10 text-destructive" />
                <p className="font-medium text-destructive">Payment Failed</p>
                <p className="text-sm text-muted-foreground">{errorMsg}</p>
              </div>
              {terminal && <Button variant="outline" className="w-full" onClick={() => initiatePayment(terminal)}>Retry</Button>}
            </div>
          )}
        </div>

        <DialogFooter>
          {state !== "paid" && (
            <Button variant="ghost" size="sm" className="w-full" onClick={handleClose}>
              Cancel — Use Different Payment
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Print Receipt Dialog ───────────────────────────────────────────────────────
// ── Weight Entry Dialog ────────────────────────────────────────────────────────
function WeightEntryDialog({ open, product, onConfirm, onClose }: {
  open: boolean; product: any | null; onConfirm: (weight: number) => void; onClose: () => void;
}) {
  const [weight, setWeight] = useState("");
  const unitPrice = Number(product?.selling_price || product?.price || 0);
  const amount = (Number(weight) || 0) * unitPrice;
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-xs">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scale className="h-4 w-4" />Enter Weight — {product?.name}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <F label={`Weight (${product?.unit_label || "kg"})`}>
            <Input
              type="number" min="0" step="0.001" placeholder="0.000"
              value={weight} onChange={e => setWeight(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && Number(weight) > 0) { onConfirm(Number(weight)); onClose(); } }}
              autoFocus
            />
          </F>
          {Number(weight) > 0 && (
            <p className="text-sm font-medium">Amount: ₹{fmt(amount)} ({weight} {product?.unit_label || "kg"} × ₹{fmt(unitPrice)})</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => { if (Number(weight) > 0) { onConfirm(Number(weight)); onClose(); } }} disabled={!weight || Number(weight) <= 0}>
            Add to Cart
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── EOD Z-Report Dialog ───────────────────────────────────────────────────────
function EodReportDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: company } = useQuery<any>({ queryKey: ["/api/settings/company"] });
  const [reportDate, setReportDate] = useState(new Date().toISOString().split("T")[0]);
  const { data: report, isLoading, refetch } = useQuery<any>({
    queryKey: ["/api/pos/reports/eod", reportDate],
    queryFn: async () => {
      const r = await fetch(`/api/pos/reports/eod?date=${reportDate}`, { credentials: "include" });
      if (!r.ok) throw new Error("Failed to load report");
      return r.json();
    },
    enabled: open,
  });

  const handlePrint = () => {
    const el = document.getElementById("eod-report-content");
    if (!el) return;
    const w = window.open("", "_blank", "width=420,height=700");
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><title>Z-Report ${reportDate}</title><style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: 'Courier New', Courier, monospace; font-size: 11px; width: 80mm; margin: 0 auto; padding: 4mm; }
      .flex-row { display: flex; justify-content: space-between; }
      .bold { font-weight: bold; } .center { text-align: center; }
      .divider { border-top: 1px dashed #000; margin: 3px 0; }
      @media print { body { width: 80mm; } }
    </style></head><body>${el.innerHTML}</body></html>`);
    w.document.close();
    setTimeout(() => { w.focus(); w.print(); }, 300);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><BarChart2 className="h-4 w-4" />EOD Z-Report</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium shrink-0">Date</label>
            <Input type="date" value={reportDate} onChange={e => setReportDate(e.target.value)} className="flex-1" />
            <Button size="icon" variant="outline" onClick={() => refetch()}><RefreshCw className="h-4 w-4" /></Button>
          </div>
          {isLoading && <p className="text-center text-muted-foreground py-6 text-sm">Loading report…</p>}
          {report && !isLoading && (
            <div id="eod-report-content" className="font-mono text-xs bg-white text-black p-3 rounded-md border space-y-0.5">
              <div className="flex-row"><span></span></div>
              <div className="text-center font-bold text-sm">{company?.name || "SwachERP Store"}</div>
              <div className="text-center text-[10px]">*** Z-REPORT / END OF DAY ***</div>
              <div className="text-center text-[10px]">Date: {reportDate}</div>
              <div className="divider" />
              <div className="flex justify-between font-bold"><span>Total Sales</span><span>₹{fmt(report.summary?.total_sales)}</span></div>
              <div className="flex justify-between text-[10px]"><span>Transactions</span><span>{report.summary?.total_txns}</span></div>
              <div className="flex justify-between text-[10px]"><span>Tax Collected</span><span>₹{fmt(report.summary?.total_tax)}</span></div>
              <div className="flex justify-between text-[10px]"><span>Discounts Given</span><span>₹{fmt(report.summary?.total_discounts)}</span></div>
              {Number(report.summary?.total_loyalty_discount) > 0 && (
                <div className="flex justify-between text-[10px]"><span>Loyalty Discounts</span><span>₹{fmt(report.summary?.total_loyalty_discount)}</span></div>
              )}
              <div className="divider" />
              <div className="text-[10px] font-bold">PAYMENT MODE BREAKDOWN</div>
              {(report.byMode || []).map((m: any, i: number) => (
                <div key={i} className="flex justify-between text-[10px]">
                  <span>{String(m.payment_mode || "").toUpperCase()}</span>
                  <span>{m.txn_count} txns · ₹{fmt(m.amount)}</span>
                </div>
              ))}
              {!report.byMode?.length && <div className="text-[10px] text-center text-gray-400">No transactions</div>}
              <div className="divider" />
              <div className="text-[10px] font-bold">TOP SELLING ITEMS</div>
              {(report.topItems || []).map((it: any, i: number) => (
                <div key={i} className="flex justify-between text-[10px]">
                  <span className="truncate flex-1 mr-2">{it.product_name}</span>
                  <span className="shrink-0">×{Number(it.qty).toFixed(2)} ₹{fmt(it.amount)}</span>
                </div>
              ))}
              {!report.topItems?.length && <div className="text-[10px] text-center text-gray-400">No items sold</div>}
              {report.sessions?.length > 0 && (
                <>
                  <div className="divider" />
                  <div className="text-[10px] font-bold">SESSIONS</div>
                  {report.sessions.map((s: any, i: number) => (
                    <div key={i} className="text-[10px]">{s.counter_name}: Open ₹{fmt(s.opening_balance)} Close ₹{fmt(s.closing_balance || 0)} Sales ₹{fmt(s.total_sales)}</div>
                  ))}
                </>
              )}
              {report.hourly?.length > 0 && (
                <>
                  <div className="divider" />
                  <div className="text-[10px] font-bold">HOURLY BREAKDOWN</div>
                  {report.hourly.map((h: any, i: number) => (
                    <div key={i} className="flex justify-between text-[10px]">
                      <span>{String(h.hour).padStart(2, "0")}:00–{String(h.hour + 1).padStart(2, "0")}:00</span>
                      <span>{h.txn_count} txns · ₹{fmt(h.amount)}</span>
                    </div>
                  ))}
                </>
              )}
              <div className="divider" />
              <div className="text-center text-[10px]">*** END OF Z-REPORT ***</div>
            </div>
          )}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button onClick={handlePrint} disabled={!report || isLoading}>
            <Printer className="h-4 w-4 mr-2" />Print Z-Report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PrintReceiptDialog({ open, txn, saleItems, session, onClose }: {
  open: boolean; txn: any; saleItems: any[]; session: any; onClose: () => void;
}) {
  const { data: company } = useQuery<any>({ queryKey: ["/api/settings/company"] });

  const handlePrint = () => {
    const el = document.getElementById("thermal-receipt-content");
    if (!el) return;
    const w = window.open("", "_blank", "width=420,height=700");
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><title>Receipt</title><style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: 'Courier New', Courier, monospace; font-size: 12px; width: 80mm; margin: 0 auto; padding: 4mm; }
      .center { text-align: center; } .right { text-align: right; }
      .bold { font-weight: bold; } .sm { font-size: 10px; } .lg { font-size: 15px; }
      .divider { border-top: 1px dashed #000; margin: 3px 0; }
      table { width: 100%; border-collapse: collapse; }
      td, th { padding: 1px 2px; font-size: 11px; }
      th { font-weight: bold; border-bottom: 1px solid #000; }
      @media print { body { width: 80mm; } }
    </style></head><body>${el.innerHTML}</body></html>`);
    w.document.close();
    setTimeout(() => { w.focus(); w.print(); }, 300);
  };

  if (!txn) return null;
  const now = new Date();
  const storeName = company?.name || "SwachERP Store";
  const storeAddress = company?.address || "";
  const gstin = company?.gstNumber || company?.gstin || "";
  const fssai = company?.fssaiNumber || "";
  const payMode = (txn.payment_mode || "cash").toUpperCase();

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Receipt className="h-4 w-4" />Sale Receipt</DialogTitle>
        </DialogHeader>

        {/* Preview + printable content */}
        <div id="thermal-receipt-content" className="font-mono text-xs leading-tight bg-white text-black p-3 rounded-md border space-y-1">
          <div className="text-center font-bold text-sm">{storeName}</div>
          {storeAddress && <div className="text-center text-[10px]">{storeAddress}</div>}
          {gstin && <div className="text-center text-[10px]">GSTIN: {gstin}</div>}
          {fssai && <div className="text-center text-[10px]">FSSAI Lic: {fssai}</div>}
          <div className="border-t border-dashed border-gray-400 my-1" />
          <div className="flex justify-between text-[10px]">
            <span>Bill: {txn.transaction_no}</span>
            <span>{now.toLocaleDateString("en-IN")}</span>
          </div>
          <div className="flex justify-between text-[10px]">
            {session?.counter_name && <span>Counter: {session.counter_name}</span>}
            <span>{now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span>
          </div>
          {txn.customer_name && <div className="text-[10px]">Customer: {txn.customer_name}</div>}
          <div className="border-t border-dashed border-gray-400 my-1" />
          <table className="w-full text-[10px]">
            <thead><tr><th className="text-left">Item</th><th className="text-right">Qty</th><th className="text-right">Rate</th><th className="text-right">Amt</th></tr></thead>
            <tbody>
              {saleItems.map((it: any, i: number) => (
                <tr key={i}>
                  <td className="max-w-[90px] truncate">{it.product_name}</td>
                  <td className="text-right">{it.quantity}</td>
                  <td className="text-right">₹{fmt(it.unit_price)}</td>
                  <td className="text-right">₹{fmt(it.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="border-t border-dashed border-gray-400 my-1" />
          <div className="flex justify-between text-[10px]"><span>Subtotal</span><span>₹{fmt(txn.subtotal)}</span></div>
          {Number(txn.tax_amount) > 0 && <>
            <div className="flex justify-between text-[10px]"><span>CGST</span><span>₹{fmt(Number(txn.tax_amount) / 2)}</span></div>
            <div className="flex justify-between text-[10px]"><span>SGST</span><span>₹{fmt(Number(txn.tax_amount) / 2)}</span></div>
            <div className="flex justify-between text-[10px]"><span>Total Tax</span><span>₹{fmt(txn.tax_amount)}</span></div>
          </>}
          {Number(txn.discount_amount) > 0 && <div className="flex justify-between text-[10px]"><span>Discount</span><span>-₹{fmt(txn.discount_amount)}</span></div>}
          {Number(txn.loyalty_discount) > 0 && <div className="flex justify-between text-[10px]"><span>Loyalty Redemption</span><span>-₹{fmt(txn.loyalty_discount)}</span></div>}
          <div className="flex justify-between font-bold text-[12px] border-t border-gray-400 pt-0.5">
            <span>TOTAL</span><span>₹{fmt(txn.total_amount)}</span>
          </div>
          <div className="border-t border-dashed border-gray-400 my-1" />
          {Array.isArray(txn.payment_splits) && txn.payment_splits.length > 1 ? (
            txn.payment_splits.map((sp: any, i: number) => (
              <div key={i} className="flex justify-between text-[10px]">
                <span>{String(sp.mode || "").toUpperCase()}</span><span>₹{fmt(sp.amount)}</span>
              </div>
            ))
          ) : (
            <div className="flex justify-between text-[10px]">
              <span>Payment: {payMode}</span>
              {txn.card_ref && <span>Ref: {txn.card_ref}</span>}
              {txn.razorpay_payment_id && !txn.card_ref && <span>Ref: {txn.razorpay_payment_id.slice(-8)}</span>}
            </div>
          )}
          <div className="flex justify-between text-[10px]">
            <span>Paid: ₹{fmt(txn.amount_paid)}</span>
            {Number(txn.change_given) > 0 && <span>Change: ₹{fmt(txn.change_given)}</span>}
          </div>
          <div className="border-t border-dashed border-gray-400 my-1" />
          <div className="text-center text-[10px] space-y-0.5">
            <div className="font-bold">Thank you for shopping!</div>
            <div>Goods once sold will not be taken back</div>
            <div>Powered by SwachERP</div>
          </div>
        </div>

        <DialogFooter className="gap-2 flex-col sm:flex-row">
          <Button onClick={handlePrint} className="w-full sm:w-auto">
            <Printer className="h-4 w-4 mr-2" />Print Receipt
          </Button>
          <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Terminal Settings Tab ──────────────────────────────────────────────────────
function TerminalSettingsTab() {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({ terminal_type: "manual", port: 80 });

  const { data: terminals = [] } = useQuery<any[]>({ queryKey: ["/api/pos/terminals"] });
  const saveMut = useMutation({
    mutationFn: (d: any) => editing ? apiRequest("PUT", `/api/pos/terminals/${editing.id}`, d) : apiRequest("POST", "/api/pos/terminals", d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/pos/terminals"] }); setShowForm(false); toast({ title: "Terminal saved" }); }
  });
  const delMut = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/pos/terminals/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/pos/terminals"] }),
  });

  const needsNetwork = ["pine_labs", "ingenico", "generic_http"].includes(form.terminal_type);
  const needsTerminalId = ["razorpay_pos"].includes(form.terminal_type);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">Payment Terminals</h3>
          <p className="text-sm text-muted-foreground">Assign hardware payment machines to POS counters. Supported: Razorpay POS, Pine Labs Plutus, Ingenico, or any HTTP-API terminal.</p>
        </div>
        <Button onClick={() => { setEditing(null); setForm({ terminal_type: "manual", port: 80, is_active: true }); setShowForm(true); }}>
          <Plus className="h-4 w-4 mr-1" />Add Terminal
        </Button>
      </div>

      {(terminals as any[]).length === 0 && (
        <div className="rounded-md border border-dashed p-8 text-center text-muted-foreground">
          <Monitor className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p className="font-medium">No terminals configured</p>
          <p className="text-sm mt-1">Add a terminal to enable hardware card payments at each counter.</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {(terminals as any[]).map((t: any) => (
          <Card key={t.id}>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold truncate">{t.terminal_name || TERMINAL_TYPE_LABELS[t.terminal_type]}</p>
                  <p className="text-xs text-muted-foreground">Counter: {t.counter_name}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Badge className={t.is_active ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-muted text-muted-foreground"}>
                    {t.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </div>
              <div className="text-xs text-muted-foreground space-y-0.5">
                <div className="flex items-center gap-1"><Cpu className="h-3 w-3" />{TERMINAL_TYPE_LABELS[t.terminal_type]}</div>
                {t.terminal_id && <div className="font-mono">ID: {t.terminal_id}</div>}
                {t.ip_address && <div className="flex items-center gap-1"><Wifi className="h-3 w-3" />{t.ip_address}:{t.port}</div>}
                {t.description && <div className="italic">{t.description}</div>}
              </div>
              <div className="flex gap-1 pt-1">
                <Button size="icon" variant="ghost" onClick={() => { setEditing(t); setForm({ ...t }); setShowForm(true); }}><Pencil className="h-3.5 w-3.5" /></Button>
                <Button size="icon" variant="ghost" onClick={() => delMut.mutate(t.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? "Edit" : "Add"} Terminal</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <F label="Counter Name *">
                <Input placeholder="e.g. Counter 1" value={form.counter_name || ""} onChange={e => setForm({ ...form, counter_name: e.target.value })} />
              </F>
            </div>
            <div className="col-span-2">
              <F label="Terminal Type *">
                <Select value={form.terminal_type || "manual"} onValueChange={v => setForm({ ...form, terminal_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manual Confirmation (No Hardware)</SelectItem>
                    <SelectItem value="razorpay_pos">Razorpay POS</SelectItem>
                    <SelectItem value="pine_labs">Pine Labs Plutus Smart</SelectItem>
                    <SelectItem value="ingenico">Ingenico (Local API)</SelectItem>
                    <SelectItem value="generic_http">Generic HTTP Terminal</SelectItem>
                  </SelectContent>
                </Select>
              </F>
            </div>
            <div className="col-span-2">
              <F label="Display Name">
                <Input placeholder="e.g. Pine Labs - Billing 1" value={form.terminal_name || ""} onChange={e => setForm({ ...form, terminal_name: e.target.value })} />
              </F>
            </div>
            {needsTerminalId && (
              <div className="col-span-2">
                <F label="Terminal ID (from Razorpay dashboard)">
                  <Input placeholder="term_XXXXXXXXXXXX" value={form.terminal_id || ""} onChange={e => setForm({ ...form, terminal_id: e.target.value })} />
                </F>
              </div>
            )}
            {needsNetwork && (<>
              <F label="IP Address">
                <Input placeholder="192.168.1.100" value={form.ip_address || ""} onChange={e => setForm({ ...form, ip_address: e.target.value })} />
              </F>
              <F label="Port">
                <Input type="number" placeholder="8080" value={form.port || ""} onChange={e => setForm({ ...form, port: Number(e.target.value) })} />
              </F>
              {form.terminal_type === "pine_labs" && (
                <div className="col-span-2">
                  <F label="Application / Merchant ID (Pine Labs)">
                    <Input placeholder="Provided by Pine Labs" value={form.merchant_id || ""} onChange={e => setForm({ ...form, merchant_id: e.target.value })} />
                  </F>
                </div>
              )}
              {form.terminal_type === "generic_http" && (
                <div className="col-span-2">
                  <F label="API Key / Bearer Token (optional)">
                    <Input placeholder="sk_live_..." value={form.api_key || ""} onChange={e => setForm({ ...form, api_key: e.target.value })} />
                  </F>
                </div>
              )}
            </>)}
            <div className="col-span-2">
              <F label="Notes (optional)">
                <Input placeholder="e.g. Billing counter near entrance" value={form.description || ""} onChange={e => setForm({ ...form, description: e.target.value })} />
              </F>
            </div>
            <div className="col-span-2">
              <F label="Status">
                <Select value={form.is_active !== false ? "true" : "false"} onValueChange={v => setForm({ ...form, is_active: v === "true" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Active</SelectItem>
                    <SelectItem value="false">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </F>
            </div>
          </div>
          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={() => saveMut.mutate(form)} disabled={saveMut.isPending || !form.counter_name}>Save Terminal</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Credit Limit Warning ───────────────────────────────────────────────────────
function CreditLimitWarning({ customer, billTotal }: { customer: any; billTotal: number }) {
  if (!customer) return null;
  const cl = Number(customer.credit_limit || 0);
  const outstanding = Number(customer.outstanding_balance || 0);
  if (cl <= 0) return null;
  if (outstanding + billTotal > cl) {
    return (
      <div className="flex items-center gap-2 p-2 rounded-md bg-red-50 dark:bg-red-950/30 border border-red-300 dark:border-red-700 text-red-800 dark:text-red-200 text-xs">
        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
        <div>
          <p className="font-semibold">Credit limit exceeded</p>
          <p>Outstanding: ₹{Number(outstanding).toLocaleString("en-IN", { maximumFractionDigits: 2 })} + Bill: ₹{Number(billTotal).toLocaleString("en-IN", { maximumFractionDigits: 2 })} / Limit ₹{Number(cl).toLocaleString("en-IN", { maximumFractionDigits: 2 })}</p>
        </div>
      </div>
    );
  }
  if (outstanding > 0) {
    return (
      <div className="flex items-center gap-2 p-2 rounded-md bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-700 text-orange-800 dark:text-orange-200 text-xs">
        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
        <span>Outstanding: ₹{Number(outstanding).toLocaleString("en-IN", { maximumFractionDigits: 2 })} of ₹{Number(cl).toLocaleString("en-IN", { maximumFractionDigits: 2 })} credit limit</span>
      </div>
    );
  }
  return null;
}

// ── POS Terminal ──────────────────────────────────────────────────────────────
function TerminalTab({ onSessionOpened }: { onSessionOpened: () => void }) {
  const { toast } = useToast();
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [splits, setSplits] = useState<SplitRow[]>([{ mode: "cash", amount: "" }]);
  const [showOpenDialog, setShowOpenDialog] = useState(false);
  const [showLastSession, setShowLastSession] = useState(false);
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [closingDenom, setClosingDenom] = useState<DenomMap>({});
  const [showUpiQr, setShowUpiQr] = useState(false);
  const [showCardDialog, setShowCardDialog] = useState(false);
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const [lastSaleTxn, setLastSaleTxn] = useState<any>(null);
  const [lastSaleItems, setLastSaleItems] = useState<any[]>([]);
  const [showParkedBills, setShowParkedBills] = useState(false);
  const [mrpOverride, setMrpOverride] = useState<{ product: any; cartIdx?: number } | null>(null);
  const [weightItem, setWeightItem] = useState<any>(null);
  const [loyaltyRedeem, setLoyaltyRedeem] = useState(0);
  const [showEodReport, setShowEodReport] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState("");
  const barcodeRef = useRef<HTMLInputElement>(null);
  const closingBalance = DENOMINATIONS.reduce((s, d) => s + d * (closingDenom[d] || 0), 0);

  const { data: activeSession } = useQuery<any>({ queryKey: ["/api/pos/sessions/active"], refetchInterval: 30000 });

  // Auto-focus barcode input whenever a session is active
  useEffect(() => {
    if (activeSession) {
      setTimeout(() => barcodeRef.current?.focus(), 100);
    }
  }, [activeSession?.id]);
  const { data: products = [] } = useQuery<any[]>({ queryKey: ["/api/inventory/products"] });
  const { data: customers = [] } = useQuery<any[]>({ queryKey: ["/api/pos/customers"] });
  const { data: lastSession } = useQuery<any>({
    queryKey: ["/api/pos/sessions/last"],
    queryFn: async () => {
      const r = await fetch("/api/pos/sessions/last", { credentials: "include" });
      return r.json();
    },
  });

  const { data: parkedBills = [] } = useQuery<any[]>({ queryKey: ["/api/pos/parked-bills"] });

  const [closedSessionId, setClosedSessionId] = useState<string | null>(null);
  const [showZReport, setShowZReport] = useState(false);
  const [varianceAcknowledged, setVarianceAcknowledged] = useState(false);

  // Live cash-sales breakdown used to compute accurate variance in close dialog
  const { data: closeSessTxns = [] } = useQuery<any[]>({
    queryKey: ["/api/pos/transactions", activeSession?.id, "close-preview"],
    queryFn: async () => {
      const r = await fetch(`/api/pos/transactions?session_id=${activeSession!.id}`, { credentials: "include" });
      if (!r.ok) return [];
      return r.json();
    },
    enabled: !!activeSession?.id && showCloseDialog,
  });

  const { data: zReportData } = useQuery<any>({
    queryKey: ["/api/pos/sessions", closedSessionId, "z-report"],
    queryFn: async () => {
      const r = await fetch(`/api/pos/sessions/${closedSessionId}/z-report`, { credentials: "include" });
      if (!r.ok) throw new Error("Failed to load Z-report");
      return r.json();
    },
    enabled: !!closedSessionId && showZReport,
  });

  const closeSessionMut = useMutation({
    mutationFn: (d: any) => apiRequest("POST", `/api/pos/sessions/${activeSession?.id}/close`, d),
    onSuccess: (_data, _vars) => {
      const sid = activeSession?.id;
      queryClient.invalidateQueries({ queryKey: ["/api/pos/sessions/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pos/sessions/last"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pos/sessions"] });
      setShowCloseDialog(false);
      setClosingDenom({});
      if (sid) { setClosedSessionId(String(sid)); setShowZReport(true); }
      toast({ title: "Session closed", description: `${activeSession?.counter_name} session ended` });
    },
  });

  const parkBillMut = useMutation({
    mutationFn: (d: any) => apiRequest("POST", "/api/pos/parked-bills", d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pos/parked-bills"] });
      setCartItems([]); setSelectedCustomer(null); setSplits([{ mode: "cash", amount: "" }]);
      toast({ title: "Bill parked", description: "Resume it from Parked Bills" });
    },
  });

  const resumeBillMut = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/pos/parked-bills/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/pos/parked-bills"] }),
  });

  const saleMut = useMutation({
    mutationFn: (d: any) => apiRequest("POST", "/api/pos/transactions", d),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/pos/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pos/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pos/sessions/active"] });
      setLastSaleTxn(data);
      setLastSaleItems([...cartItems]);
      setCartItems([]); setSelectedCustomer(null); setSplits([{ mode: "cash", amount: "" }]); setLoyaltyRedeem(0);
      setShowUpiQr(false); setShowCardDialog(false);
      setShowPrintDialog(true);
      toast({ title: "Sale recorded!" });
    },
  });

  const addToCart = (product: any, forcePrice?: number, forceWeight?: number) => {
    // Weight-based items open weight dialog first
    if (product.sold_by === "weight" && forceWeight === undefined) {
      setWeightItem(product);
      return;
    }
    const unitPrice = forcePrice !== undefined ? forcePrice : Number(product.selling_price || product.price || 0);
    const mrpRupees = Number(product.mrp || 0) / 100;
    if (forcePrice === undefined && mrpRupees > 0 && unitPrice > mrpRupees) {
      setMrpOverride({ product });
      return;
    }
    const qty = forceWeight !== undefined ? forceWeight : 1;
    const unitLabel = product.unit_label || "pcs";
    setCartItems(prev => {
      // Weight-based: always add as new line (each weighing is a separate entry)
      if (product.sold_by === "weight") {
        return [...prev, { product_id: product.id, product_name: product.name, sku: product.sku || null, quantity: qty, unit_price: unitPrice, discount_pct: 0, tax_rate: Number(product.tax_rate || 0), amount: qty * unitPrice, unit_label: unitLabel, hsn_code: product.hsn_code || null }];
      }
      const ex = prev.find(i => i.product_id === product.id);
      if (ex) return prev.map(i => i.product_id === product.id ? { ...i, quantity: i.quantity + qty, amount: (i.quantity + qty) * i.unit_price } : i);
      return [...prev, { product_id: product.id, product_name: product.name, sku: product.sku || null, quantity: qty, unit_price: unitPrice, discount_pct: 0, tax_rate: Number(product.tax_rate || 0), amount: unitPrice * qty, unit_label: unitLabel, hsn_code: product.hsn_code || null }];
    });
  };

  const handleBarcodeScan = async (code: string) => {
    const trimmed = code.trim();
    if (!trimmed) return;
    try {
      const r = await fetch(`/api/pos/products/barcode/${encodeURIComponent(trimmed)}`, { credentials: "include" });
      if (r.ok) {
        const product = await r.json();
        addToCart(product);
        toast({ title: `Added: ${product.name}` });
      } else {
        toast({ title: "Product not found", description: `No product for barcode "${trimmed}"`, variant: "destructive" });
      }
    } catch {
      toast({ title: "Scan error", variant: "destructive" });
    }
    setBarcodeInput("");
  };

  const updateQty = (idx: number, qty: number) => {
    if (qty <= 0) { setCartItems(p => p.filter((_, i) => i !== idx)); return; }
    setCartItems(p => p.map((it, i) => i !== idx ? it : { ...it, quantity: qty, amount: qty * it.unit_price * (1 - it.discount_pct / 100) }));
  };
  const subtotal = cartItems.reduce((s, i) => s + i.amount, 0);
  const tax = cartItems.reduce((s, i) => s + i.amount * i.tax_rate / 100, 0);
  const loyaltyDiscount = loyaltyRedeem / 100;
  const total = Math.max(0, subtotal + tax - loyaltyDiscount);
  const splitTotal = splits.reduce((s, r) => s + (Number(r.amount) || 0), 0);

  const doRecordSale = (opts?: { razorpayPaymentId?: string | null; terminalId?: string | null; cardRef?: string | null }) => {
    const primaryMode = splits.length === 1 ? splits[0].mode : "split";
    saleMut.mutate({
      session_id: activeSession?.id || null,
      customer_id: selectedCustomer?.id || null,
      customer_name: selectedCustomer?.name || null,
      items: cartItems,
      payment_mode: primaryMode,
      payment_splits: splits.filter(r => Number(r.amount) > 0),
      amount_paid: splitTotal || total,
      loyalty_points_redeemed: loyaltyRedeem || 0,
      loyalty_discount: loyaltyDiscount || 0,
      razorpay_payment_id: opts?.razorpayPaymentId || undefined,
      terminal_id: opts?.terminalId || undefined,
      card_ref: opts?.cardRef || undefined,
    });
  };

  const completeSale = () => {
    if (!cartItems.length) { toast({ title: "Cart is empty", variant: "destructive" }); return; }
    // Credit limit check
    if (selectedCustomer) {
      const cl = Number(selectedCustomer.credit_limit || 0);
      const outstanding = Number(selectedCustomer.outstanding_balance || 0);
      if (cl > 0 && outstanding + total > cl) {
        toast({
          title: "Credit limit exceeded",
          description: `${selectedCustomer.name} has ₹${fmt(outstanding)} outstanding + ₹${fmt(total)} bill = ₹${fmt(outstanding + total)} against ₹${fmt(cl)} limit.`,
          variant: "destructive",
        });
        return;
      }
    }
    if (splitTotal < total - 0.01) {
      toast({ title: "Amount short", description: `₹${fmt(total - splitTotal)} still due`, variant: "destructive" });
      return;
    }
    if (splits.length === 1 && splits[0].mode === "upi") { setShowUpiQr(true); return; }
    if (splits.length === 1 && splits[0].mode === "card") { setShowCardDialog(true); return; }
    doRecordSale();
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
              {activeSession.counter_name} — {(activeSession as any).shift_name || "Morning"} Shift
              {activeSession.shift_type === "continue" && <Badge variant="secondary" className="ml-2 text-xs">Continued</Badge>}
              {activeSession.approved_by && <Badge className="ml-2 text-xs bg-amber-100 text-amber-700">Mgr Approved</Badge>}
            </p>
            <p className="text-xs text-green-600 dark:text-green-400">
              Sales: ₹{fmt(activeSession.total_sales)} · Txns: {activeSession.total_transactions}
              · Float: ₹{fmt(activeSession.opening_balance)}
              {Number(activeSession.opening_upi_float) > 0 && ` + ₹${fmt(activeSession.opening_upi_float)} UPI`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {(parkedBills as any[]).length > 0 && (
              <Button size="sm" variant="outline" onClick={() => setShowParkedBills(true)} data-testid="button-parked-bills">
                <Layers className="h-4 w-4 mr-1" />{(parkedBills as any[]).length} Parked
              </Button>
            )}
            {lastSession && (
              <Button size="sm" variant="ghost" onClick={() => setShowLastSession(true)} data-testid="button-view-last-in-session">
                View Last Session
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={() => setShowEodReport(true)} data-testid="button-eod-report">
              <BarChart2 className="h-4 w-4 mr-1" />Z-Report
            </Button>
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
              <F label="Closing Cash (count denomination-wise)">
                <DenominationInput value={closingDenom} onChange={setClosingDenom} />
              </F>
              {closingBalance > 0 && (() => {
                // Accurate variance: opening float + cash sales this session
                const cashTxns = closeSessTxns.filter((t: any) => t.payment_mode === 'cash');
                const cashSales = cashTxns.reduce((s: number, t: any) => s + Number(t.total_amount || 0), 0);
                // Also add split-payment cash components
                const splitCash = closeSessTxns
                  .flatMap((t: any) => {
                    const sp = t.payment_splits;
                    return Array.isArray(sp) ? sp : (sp ? JSON.parse(sp) : []);
                  })
                  .filter((s: any) => s?.mode === 'cash')
                  .reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
                const totalCashSales = cashSales + splitCash;
                const openingFloat   = Number(activeSession?.opening_balance || 0);
                const expectedCash   = openingFloat + totalCashSales;
                const variance       = closingBalance - expectedCash;
                const absVariance    = Math.abs(variance);
                const VARIANCE_GATE  = 200; // ₹200 threshold requires acknowledgement
                const isShortage     = variance < 0;
                const isSurplus      = variance > 0;
                const needsGate      = absVariance > VARIANCE_GATE;

                return (
                  <div className="space-y-2">
                    {/* Reconciliation breakdown */}
                    <div className="text-xs rounded-md border p-2.5 space-y-1 bg-muted/30">
                      <div className="flex justify-between text-muted-foreground">
                        <span>Opening float</span><span>₹{fmt(openingFloat)}</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>+ Cash sales ({cashTxns.length} txns)</span><span>₹{fmt(totalCashSales)}</span>
                      </div>
                      <div className="flex justify-between font-medium border-t pt-1">
                        <span>Expected in drawer</span><span>₹{fmt(expectedCash)}</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>Physical count</span><span>₹{fmt(closingBalance)}</span>
                      </div>
                    </div>
                    {/* Variance badge */}
                    <div className={`text-sm p-2 rounded-md font-medium flex items-center justify-between ${
                      isShortage
                        ? "bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300"
                        : isSurplus
                          ? "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300"
                          : "bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300"
                    }`}>
                      <span>{isShortage ? "Shortage" : isSurplus ? "Surplus" : "Balanced"}</span>
                      <span>{variance >= 0 ? "+" : ""}₹{fmt(variance)}</span>
                    </div>
                    {/* Variance gate — must acknowledge before closing */}
                    {needsGate && (
                      <label className="flex items-start gap-2 cursor-pointer text-sm rounded-md border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30 p-2.5 text-amber-800 dark:text-amber-200">
                        <input
                          type="checkbox"
                          className="mt-0.5 accent-amber-600"
                          checked={varianceAcknowledged}
                          onChange={e => setVarianceAcknowledged(e.target.checked)}
                          data-testid="checkbox-variance-acknowledge"
                        />
                        <span>
                          I acknowledge a {isShortage ? "cash shortage" : "cash surplus"} of <strong>₹{fmt(absVariance)}</strong> and confirm this close is intentional.
                        </span>
                      </label>
                    )}
                  </div>
                );
              })()}
            </div>
            <DialogFooter className="gap-2 pt-2">
              <Button variant="outline" onClick={() => { setShowCloseDialog(false); setVarianceAcknowledged(false); }}>Cancel</Button>
              <Button
                variant="destructive"
                onClick={() => closeSessionMut.mutate({ closing_balance: closingBalance, closing_denomination: closingDenom })}
                disabled={closeSessionMut.isPending || (() => {
                  if (!closingBalance) return false;
                  const cashSales = closeSessTxns.filter((t: any) => t.payment_mode === 'cash')
                    .reduce((s: number, t: any) => s + Number(t.total_amount || 0), 0);
                  const expectedCash = Number(activeSession?.opening_balance || 0) + cashSales;
                  const variance = Math.abs(closingBalance - expectedCash);
                  return variance > 200 && !varianceAcknowledged;
                })()}
                data-testid="button-confirm-close-session"
              >
                {closeSessionMut.isPending ? "Closing…" : "Confirm Close"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Z-Report dialog */}
        {showZReport && (
          <Dialog open={showZReport} onOpenChange={v => { setShowZReport(v); if (!v) setClosedSessionId(null); }}>
            <DialogContent className="max-w-md max-h-[90dvh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  Z-Report — End of Session
                </DialogTitle>
              </DialogHeader>
              {!zReportData ? (
                <div className="py-8 text-center text-sm text-muted-foreground">Loading report…</div>
              ) : (() => {
                const s = zReportData.session;
                const cr = zReportData.cashReconciliation;
                const bd: any[] = zReportData.paymentBreakdown || [];
                const totalSales = bd.reduce((sum: number, r: any) => sum + Number(r.total || 0), 0);
                const totalTxns  = bd.reduce((sum: number, r: any) => sum + Number(r.txn_count || 0), 0);
                const MODE_LABEL: Record<string, string> = { cash: "Cash", upi: "UPI / QR", card: "Card / EDC", other: "Other" };
                return (
                  <div className="space-y-4 text-sm">
                    {/* Session info */}
                    <div className="p-3 rounded-md bg-muted/40 space-y-1">
                      <p className="font-semibold">{s?.counter_name || "Counter"}</p>
                      <p className="text-xs text-muted-foreground">
                        {s?.opened_at ? fmtTime(s.opened_at) : "—"} → {s?.closed_at ? fmtTime(s.closed_at) : "—"}
                      </p>
                    </div>

                    {/* Sales summary */}
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Sales Summary</p>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                        <span className="text-muted-foreground">Total Transactions</span>
                        <span className="font-semibold text-right">{totalTxns}</span>
                        <span className="text-muted-foreground">Gross Sales</span>
                        <span className="font-semibold text-right">₹{fmt(totalSales)}</span>
                      </div>
                    </div>

                    {/* Payment breakdown */}
                    {bd.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Payment Breakdown</p>
                        <div className="rounded-md border overflow-hidden">
                          <table className="w-full text-xs">
                            <thead className="bg-muted/50">
                              <tr>
                                <th className="text-left py-1.5 px-3 font-medium">Mode</th>
                                <th className="text-right py-1.5 px-3 font-medium">Txns</th>
                                <th className="text-right py-1.5 px-3 font-medium">Amount</th>
                              </tr>
                            </thead>
                            <tbody>
                              {bd.map((row: any) => (
                                <tr key={row.payment_mode} className="border-t">
                                  <td className="py-1.5 px-3 capitalize">{MODE_LABEL[row.payment_mode] ?? row.payment_mode}</td>
                                  <td className="py-1.5 px-3 text-right text-muted-foreground">{row.txn_count}</td>
                                  <td className="py-1.5 px-3 text-right font-medium">₹{fmt(Number(row.total))}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Cash reconciliation */}
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Cash Reconciliation</p>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                        <span className="text-muted-foreground">Opening Float</span>
                        <span className="text-right">₹{fmt(cr.openingFloat)}</span>
                        <span className="text-muted-foreground">+ Cash Sales</span>
                        <span className="text-right">₹{fmt(cr.cashSales)}</span>
                        <span className="font-medium border-t pt-1">Expected in Drawer</span>
                        <span className="font-semibold text-right border-t pt-1">₹{fmt(cr.expectedCash)}</span>
                        <span className="text-muted-foreground">Physical Count</span>
                        <span className="text-right">₹{fmt(cr.physicalCash)}</span>
                        <span className={`font-semibold border-t pt-1 ${cr.variance < 0 ? "text-red-600 dark:text-red-400" : cr.variance > 0 ? "text-amber-600 dark:text-amber-400" : "text-green-600 dark:text-green-400"}`}>
                          {cr.variance < 0 ? "Shortage" : cr.variance > 0 ? "Surplus" : "Balanced"}
                        </span>
                        <span className={`font-semibold text-right border-t pt-1 ${cr.variance < 0 ? "text-red-600 dark:text-red-400" : cr.variance > 0 ? "text-amber-600 dark:text-amber-400" : "text-green-600 dark:text-green-400"}`}>
                          {cr.variance >= 0 ? "+" : ""}₹{fmt(cr.variance)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}
              <DialogFooter className="gap-2 pt-2">
                <Button variant="outline" onClick={() => window.print()} size="sm" data-testid="button-print-zreport">Print</Button>
                <Button onClick={() => { setShowZReport(false); setClosedSessionId(null); }} data-testid="button-close-zreport">Done</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* Product search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search products by name or SKU…" className="pl-9" value={productSearch} onChange={e => setProductSearch(e.target.value)} data-testid="input-product-search" />
        </div>

        {/* Barcode / SKU scan input */}
        <div className="relative">
          <Scan className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            ref={barcodeRef}
            placeholder="Scan barcode or type SKU + Enter…"
            className="pl-9 font-mono"
            value={barcodeInput}
            onChange={e => setBarcodeInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") handleBarcodeScan(barcodeInput); }}
            data-testid="input-barcode-scan"
          />
        </div>

        {/* Product grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-96 overflow-y-auto">
          {filteredProducts.slice(0, 30).map((p: any) => (
            <button key={p.id} onClick={() => addToCart(p)} className="text-left p-3 rounded-md border hover-elevate active-elevate-2" data-testid={`btn-product-${p.id}`}>
              <div className="flex items-start justify-between gap-1 mb-0.5">
                <p className="font-medium text-sm truncate flex-1">{p.name}</p>
                {p.sold_by === "weight" && <Scale className="h-3 w-3 text-muted-foreground shrink-0 mt-0.5" />}
              </div>
              <p className="text-xs text-muted-foreground">{p.sku || "—"}{p.unit_label ? ` · ${p.unit_label}` : ""}</p>
              <p className="text-sm font-semibold mt-1">₹{fmt(p.selling_price || p.price || 0)}{p.sold_by === "weight" ? `/${p.unit_label || "kg"}` : ""}</p>
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
                  <p className="text-xs text-muted-foreground">₹{fmt(it.unit_price)} × {it.quantity}{(it as any).unit_label ? ` ${(it as any).unit_label}` : ""}</p>
                </div>
                <div className="flex items-center gap-1">
                  <Button size="icon" variant="ghost" onClick={() => updateQty(i, it.quantity - 1)}><span className="text-base leading-none">−</span></Button>
                  <span className="w-6 text-center text-sm">{it.quantity}</span>
                  <Button size="icon" variant="ghost" onClick={() => updateQty(i, it.quantity + 1)}><span className="text-base leading-none">+</span></Button>
                </div>
                <Button size="icon" variant="ghost" title="Override price" onClick={() => {
                  const prod = (products as any[]).find(p => p.id === it.product_id);
                  setMrpOverride({ product: prod || { id: it.product_id, name: it.product_name, mrp: 0, selling_price: it.unit_price }, cartIdx: i });
                }}><Pencil className="h-3 w-3" /></Button>
                <span className="w-20 text-right text-sm">₹{fmt(it.amount)}</span>
                <Button size="icon" variant="ghost" onClick={() => setCartItems(p => p.filter((_, idx) => idx !== i))}><X className="h-3 w-3" /></Button>
              </div>
            ))}
            {!cartItems.length && <p className="text-center text-sm text-muted-foreground py-4">Cart is empty</p>}

            <div className="border-t pt-2 space-y-1 text-sm">
              <div className="flex justify-between"><span>Subtotal</span><span>₹{fmt(subtotal)}</span></div>
              {tax > 0 && <>
                <div className="flex justify-between text-xs text-muted-foreground"><span>CGST</span><span>₹{fmt(tax / 2)}</span></div>
                <div className="flex justify-between text-xs text-muted-foreground"><span>SGST</span><span>₹{fmt(tax / 2)}</span></div>
                <div className="flex justify-between"><span>Total Tax</span><span>₹{fmt(tax)}</span></div>
              </>}
              {loyaltyDiscount > 0 && (
                <div className="flex justify-between text-amber-700 dark:text-amber-400">
                  <span className="flex items-center gap-1"><Gift className="h-3 w-3" />Loyalty Discount</span>
                  <span>-₹{fmt(loyaltyDiscount)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-base border-t pt-1"><span>Total</span><span>₹{fmt(total)}</span></div>
            </div>

            <F label="Customer">
              <Select value={selectedCustomer?.id ? String(selectedCustomer.id) : "__none__"} onValueChange={v => { const c = (customers as any[]).find(c => String(c.id) === v); setSelectedCustomer(c || null); setLoyaltyRedeem(0); }}>
                <SelectTrigger data-testid="select-customer"><SelectValue placeholder="Walk-in customer" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Walk-in</SelectItem>
                  {filteredCustomers.map((c: any) => <SelectItem key={c.id} value={String(c.id)}>{c.name} — {c.phone}</SelectItem>)}
                </SelectContent>
              </Select>
            </F>

            <CreditLimitWarning customer={selectedCustomer} billTotal={total} />
            {selectedCustomer && Number(selectedCustomer.loyalty_points) > 0 && (
              <div className="flex items-center justify-between gap-2 p-2 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-700">
                <div className="text-xs">
                  <p className="font-medium text-amber-800 dark:text-amber-200 flex items-center gap-1">
                    <Gift className="h-3 w-3" />{selectedCustomer.loyalty_points} pts available
                  </p>
                  <p className="text-amber-600 dark:text-amber-400">= ₹{fmt(selectedCustomer.loyalty_points / 100)} discount</p>
                </div>
                <Button size="sm" variant={loyaltyRedeem > 0 ? "default" : "outline"}
                  onClick={() => setLoyaltyRedeem(loyaltyRedeem > 0 ? 0 : selectedCustomer.loyalty_points)}
                  data-testid="button-redeem-loyalty">
                  {loyaltyRedeem > 0 ? "Applied" : "Redeem"}
                </Button>
              </div>
            )}

            <F label="Payment">
              <SplitPaymentPanel total={total} splits={splits} onSplitsChange={setSplits} />
            </F>

            <Button className="w-full" onClick={completeSale} disabled={saleMut.isPending || !cartItems.length} data-testid="button-complete-sale">
              {saleMut.isPending ? "Processing…" : `Complete Sale — ₹${fmt(total)}`}
            </Button>
            {cartItems.length > 0 && (
              <Button variant="outline" className="w-full" disabled={parkBillMut.isPending}
                onClick={() => parkBillMut.mutate({
                  session_id: activeSession?.id,
                  counter_name: activeSession?.counter_name,
                  cart_items: cartItems,
                  customer_id: selectedCustomer?.id,
                  customer_name: selectedCustomer?.name,
                })}
                data-testid="button-park-bill"
              >
                <PauseCircle className="h-4 w-4 mr-2" />{parkBillMut.isPending ? "Parking…" : "Park Bill"}
              </Button>
            )}
            {cartItems.length > 0 && <Button variant="ghost" className="w-full" onClick={() => { setCartItems([]); setSplits([{ mode: "cash", amount: "" }]); }}>Clear Cart</Button>}
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
          doRecordSale({ razorpayPaymentId });
        }}
      />

      {/* Card Terminal Payment Dialog */}
      <CardTerminalDialog
        open={showCardDialog}
        amount={total}
        sessionId={activeSession?.id || null}
        counterName={activeSession?.counter_name || ""}
        onClose={() => setShowCardDialog(false)}
        onPaid={(terminalId, cardRef) => {
          setShowCardDialog(false);
          doRecordSale({ terminalId, cardRef });
        }}
      />

      {/* Print Receipt Dialog — auto-opens after each sale */}
      <PrintReceiptDialog
        open={showPrintDialog}
        txn={lastSaleTxn}
        saleItems={lastSaleItems}
        session={activeSession}
        onClose={() => setShowPrintDialog(false)}
      />

      {/* MRP Override / Price Edit Dialog */}
      {mrpOverride && (
        <MrpOverrideDialog
          open={!!mrpOverride}
          itemName={mrpOverride.product?.name || mrpOverride.product?.product_name || ""}
          mrpRupees={Number(mrpOverride.product?.mrp || 0) / 100}
          currentPrice={
            mrpOverride.cartIdx !== undefined
              ? cartItems[mrpOverride.cartIdx]?.unit_price
              : Number(mrpOverride.product?.selling_price || mrpOverride.product?.price || 0)
          }
          onConfirm={(price) => {
            if (mrpOverride.cartIdx !== undefined) {
              const idx = mrpOverride.cartIdx;
              setCartItems(p => p.map((it, i) => i !== idx ? it : { ...it, unit_price: price, amount: it.quantity * price }));
            } else {
              addToCart(mrpOverride.product, price);
            }
          }}
          onClose={() => setMrpOverride(null)}
        />
      )}

      {/* Weight Entry Dialog */}
      {weightItem && (
        <WeightEntryDialog
          open={!!weightItem}
          product={weightItem}
          onConfirm={(weight) => {
            addToCart(weightItem, undefined, weight);
            setWeightItem(null);
          }}
          onClose={() => setWeightItem(null)}
        />
      )}

      {/* EOD Z-Report Dialog */}
      <EodReportDialog
        open={showEodReport}
        onClose={() => setShowEodReport(false)}
      />

      {/* Parked Bills Dialog */}
      <Dialog open={showParkedBills} onOpenChange={setShowParkedBills}>
        <DialogContent className="max-w-md max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Layers className="h-4 w-4" />Parked Bills ({(parkedBills as any[]).length})
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {(parkedBills as any[]).map((bill: any) => (
              <div key={bill.id} className="flex items-center justify-between gap-2 p-3 rounded-md border">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm">{bill.customer_name || "Walk-in"}</p>
                  <p className="text-xs text-muted-foreground">
                    {Array.isArray(bill.cart_items) ? bill.cart_items.length : 0} item(s) · {fmtTime(bill.parked_at)}
                  </p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button size="sm" onClick={() => {
                    setCartItems(Array.isArray(bill.cart_items) ? bill.cart_items : []);
                    setSelectedCustomer(bill.customer_id ? { id: bill.customer_id, name: bill.customer_name } : null);
                    setSplits([{ mode: "cash", amount: "" }]);
                    resumeBillMut.mutate(bill.id);
                    setShowParkedBills(false);
                  }} data-testid={`button-resume-bill-${bill.id}`}>
                    <PlayCircle className="h-4 w-4 mr-1" />Resume
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => resumeBillMut.mutate(bill.id)} title="Discard">
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
            {!(parkedBills as any[]).length && (
              <p className="text-center text-muted-foreground py-6 text-sm">No parked bills</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Sales History ─────────────────────────────────────────────────────────────
function SalesHistoryTab() {
  const [activeTab, setActiveTab] = useState<"txns" | "cashier" | "hourly">("txns");
  const [search, setSearch] = useState("");
  const [reportDate, setReportDate] = useState(new Date().toISOString().split("T")[0]);
  const { data: txns = [] } = useQuery<any[]>({ queryKey: ["/api/pos/transactions"] });
  const { data: cashierReport } = useQuery<any>({
    queryKey: ["/api/pos/reports/cashier", reportDate],
    queryFn: async () => {
      const r = await fetch(`/api/pos/reports/cashier?date=${reportDate}`, { credentials: "include" });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    enabled: activeTab !== "txns",
  });
  const filtered = (txns as any[]).filter(t =>
    t.transaction_no?.includes(search) || t.customer_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Tab switcher */}
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div className="flex gap-1 rounded-md border p-1 bg-muted/30">
          {([["txns", "Transactions"], ["cashier", "By Cashier"], ["hourly", "Hourly"]] as const).map(([val, label]) => (
            <button
              key={val}
              onClick={() => setActiveTab(val)}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${activeTab === val ? "bg-background shadow text-foreground" : "text-muted-foreground hover-elevate"}`}
              data-testid={`btn-history-tab-${val}`}
            >
              {label}
            </button>
          ))}
        </div>
        {activeTab !== "txns" && (
          <Input type="date" value={reportDate} onChange={e => setReportDate(e.target.value)} className="w-auto" />
        )}
      </div>

      {/* ── Transactions ── */}
      {activeTab === "txns" && (
        <>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search transactions…" className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="rounded-md border overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>{["Txn No.", "Customer", "Subtotal", "Tax", "Discount", "Total", "Mode", "Paid", "Change", "Date"].map(h =>
                  <th key={h} className="px-3 py-2 text-left font-medium whitespace-nowrap">{h}</th>
                )}</tr>
              </thead>
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
        </>
      )}

      {/* ── By Cashier ── */}
      {activeTab === "cashier" && (
        <div className="space-y-3">
          {!cashierReport && <p className="text-center text-muted-foreground py-8 text-sm">Loading…</p>}
          {cashierReport && (cashierReport.byCashier || []).length === 0 && (
            <p className="text-center text-muted-foreground py-8 text-sm">No sessions for {reportDate}</p>
          )}
          {(cashierReport?.byCashier || []).map((row: any, i: number) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{row.counter_name} — {row.shift_name || "Morning"} Shift</p>
                    <p className="text-xs text-muted-foreground">Cashier: {row.cashier || "—"} · Opened: {row.opened_at ? new Date(row.opened_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "—"}</p>
                  </div>
                  <Badge className={row.shift_type === "continue" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"}>
                    {row.shift_type === "continue" ? "Continued" : "New Shift"}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                  {[
                    { label: "Transactions", val: row.txn_count },
                    { label: "Total Sales", val: `₹${fmt(row.total_sales)}` },
                    { label: "Tax", val: `₹${fmt(row.total_tax)}` },
                    { label: "Discounts", val: `₹${fmt(row.total_discounts)}` },
                  ].map(({ label, val }) => (
                    <div key={label} className="text-center p-2 rounded-md bg-muted/40">
                      <p className="text-xs text-muted-foreground">{label}</p>
                      <p className="font-semibold text-sm">{val}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ── Hourly ── */}
      {activeTab === "hourly" && (
        <div className="space-y-3">
          {!cashierReport && <p className="text-center text-muted-foreground py-8 text-sm">Loading…</p>}
          {cashierReport && (cashierReport.hourly || []).length === 0 && (
            <p className="text-center text-muted-foreground py-8 text-sm">No sales data for {reportDate}</p>
          )}
          <div className="rounded-md border overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  {["Hour", "Transactions", "Sales", "Avg Ticket", "Bar"].map(h =>
                    <th key={h} className="px-3 py-2 text-left font-medium whitespace-nowrap">{h}</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {(cashierReport?.hourly || []).map((row: any) => {
                  const maxAmt = Math.max(...(cashierReport?.hourly || []).map((r: any) => Number(r.amount)), 1);
                  const pct = Math.round(Number(row.amount) / maxAmt * 100);
                  const h = Number(row.hour);
                  const label = h === 0 ? "12 AM" : h < 12 ? `${h} AM` : h === 12 ? "12 PM" : `${h - 12} PM`;
                  return (
                    <tr key={row.hour} className="border-t hover:bg-muted/30">
                      <td className="px-3 py-2 font-medium">{label}</td>
                      <td className="px-3 py-2">{row.txn_count}</td>
                      <td className="px-3 py-2 font-semibold">₹{fmt(row.amount)}</td>
                      <td className="px-3 py-2 text-muted-foreground">₹{fmt(row.avg_ticket)}</td>
                      <td className="px-3 py-2 w-32">
                        <div className="h-3 rounded-full bg-muted overflow-hidden">
                          <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!(cashierReport?.hourly || []).length && (
                  <tr><td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">No data</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
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
  const [showForm, setShowForm] = useState(false);
  const [txnNoInput, setTxnNoInput] = useState("");
  const [lookupTxn, setLookupTxn] = useState<any>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Record<number, { selected: boolean; qty: number }>>({});
  const [refundMode, setRefundMode] = useState("cash");
  const [reason, setReason] = useState("");
  const { data: returns_ = [] } = useQuery<any[]>({ queryKey: ["/api/pos/returns"] });
  const delMut = useMutation({ mutationFn: (id: any) => apiRequest("DELETE", `/api/pos/returns/${id}`), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/pos/returns"] }) });
  const saveMut = useMutation({
    mutationFn: (d: any) => apiRequest("POST", "/api/pos/returns", d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pos/returns"] });
      setShowForm(false); setLookupTxn(null); setTxnNoInput(""); setSelectedItems({}); setReason("");
      toast({ title: "Return processed successfully" });
    }
  });

  const lookupTransaction = async () => {
    const code = txnNoInput.trim();
    if (!code) return;
    setLookupLoading(true);
    try {
      const r = await fetch(`/api/pos/transactions/${encodeURIComponent(code)}`, { credentials: "include" });
      if (r.ok) {
        const txn = await r.json();
        setLookupTxn(txn);
        const init: Record<number, { selected: boolean; qty: number }> = {};
        (txn.items || []).forEach((it: any, i: number) => { init[i] = { selected: false, qty: it.quantity }; });
        setSelectedItems(init);
      } else {
        toast({ title: "Transaction not found", variant: "destructive" });
        setLookupTxn(null);
      }
    } catch { toast({ title: "Lookup error", variant: "destructive" }); }
    setLookupLoading(false);
  };

  const returnItems = lookupTxn
    ? (lookupTxn.items || []).filter((_: any, i: number) => selectedItems[i]?.selected)
        .map((it: any, _i: number, arr: any[]) => {
          const origIdx = (lookupTxn.items || []).indexOf(it);
          return { ...it, quantity: selectedItems[origIdx]?.qty || 1 };
        })
    : [];
  const returnTotal = returnItems.reduce((s: number, it: any) => s + it.unit_price * it.quantity, 0);

  const submitReturn = () => {
    if (!lookupTxn) return;
    if (!returnItems.length) { toast({ title: "Select at least one item", variant: "destructive" }); return; }
    saveMut.mutate({
      original_transaction_id: lookupTxn.id,
      customer_id: lookupTxn.customer_id || null,
      return_date: new Date().toISOString().split("T")[0],
      return_amount: returnTotal,
      reason,
      refund_mode: refundMode,
      items: returnItems.map((it: any) => ({ product_id: it.product_id, product_name: it.product_name, quantity: it.quantity, unit_price: it.unit_price, amount: it.unit_price * it.quantity })),
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => { setShowForm(true); setLookupTxn(null); setTxnNoInput(""); setSelectedItems({}); setReason(""); }} data-testid="button-process-return">
          <Plus className="h-4 w-4 mr-1" />Process Return
        </Button>
      </div>

      {/* Returns list */}
      <div className="rounded-md border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>{["Return No.", "Customer", "Date", "Amount", "Reason", "Refund Mode", "Status", ""].map(h => <th key={h} className="px-3 py-2 text-left font-medium whitespace-nowrap">{h}</th>)}</tr>
          </thead>
          <tbody>
            {(returns_ as any[]).map(r => (
              <tr key={r.id} className="border-t hover:bg-muted/30">
                <td className="px-3 py-2 font-mono text-xs">{r.return_number}</td>
                <td className="px-3 py-2">{r.customer_name_ref || "Walk-in"}</td>
                <td className="px-3 py-2 whitespace-nowrap">{r.return_date?.split("T")[0]}</td>
                <td className="px-3 py-2 font-medium">₹{fmt(r.return_amount)}</td>
                <td className="px-3 py-2 max-w-[150px] truncate">{r.reason || "—"}</td>
                <td className="px-3 py-2 uppercase">{r.refund_mode}</td>
                <td className="px-3 py-2">
                  <Badge className={r.status === "approved" ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300"}>
                    {r.status || "pending"}
                  </Badge>
                </td>
                <td className="px-3 py-2">
                  <Button size="icon" variant="ghost" onClick={() => delMut.mutate(r.id)} data-testid={`button-delete-return-${r.id}`}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </td>
              </tr>
            ))}
            {!(returns_ as any[]).length && <tr><td colSpan={8} className="px-3 py-6 text-center text-muted-foreground">No returns recorded</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Enhanced Return Dialog */}
      <Dialog open={showForm} onOpenChange={v => { if (!v) { setShowForm(false); setLookupTxn(null); } }}>
        <DialogContent className="max-w-lg max-h-[90dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>Process Return</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {/* Step 1 — Lookup transaction */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Step 1 — Find Original Transaction</label>
              <div className="flex gap-2">
                <Input
                  placeholder="Transaction No. (e.g. TXN-000123)"
                  value={txnNoInput}
                  onChange={e => setTxnNoInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && lookupTransaction()}
                  className="font-mono"
                  data-testid="input-return-txn-no"
                />
                <Button onClick={lookupTransaction} disabled={lookupLoading || !txnNoInput.trim()} data-testid="button-lookup-txn">
                  {lookupLoading ? "Looking…" : "Find"}
                </Button>
              </div>
            </div>

            {/* Step 2 — Select items */}
            {lookupTxn && (
              <div className="space-y-3">
                <div className="p-3 rounded-md bg-muted/40 text-xs space-y-1">
                  <p className="font-medium">{lookupTxn.transaction_no}</p>
                  <p className="text-muted-foreground">Customer: {lookupTxn.customer_name || "Walk-in"} · Total: ₹{fmt(lookupTxn.total_amount)}</p>
                </div>
                <label className="text-sm font-medium">Step 2 — Select Items to Return</label>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {(lookupTxn.items || []).map((it: any, i: number) => (
                    <div key={i} className="flex items-center gap-3 p-2 rounded-md border">
                      <input
                        type="checkbox"
                        checked={selectedItems[i]?.selected || false}
                        onChange={e => setSelectedItems(prev => ({ ...prev, [i]: { ...prev[i], selected: e.target.checked } }))}
                        className="h-4 w-4"
                        data-testid={`checkbox-return-item-${i}`}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{it.product_name}</p>
                        <p className="text-xs text-muted-foreground">₹{fmt(it.unit_price)} × {it.quantity}</p>
                      </div>
                      {selectedItems[i]?.selected && (
                        <div className="flex items-center gap-1">
                          <label className="text-xs text-muted-foreground">Qty:</label>
                          <Input
                            type="number"
                            min={1}
                            max={it.quantity}
                            value={selectedItems[i]?.qty || it.quantity}
                            onChange={e => setSelectedItems(prev => ({ ...prev, [i]: { ...prev[i], qty: Math.min(Number(e.target.value), it.quantity) } }))}
                            className="w-16 h-8 text-xs"
                            data-testid={`input-return-qty-${i}`}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {returnTotal > 0 && (
                  <div className="flex justify-between font-semibold text-sm p-2 rounded-md bg-muted/40">
                    <span>Return Amount</span><span>₹{fmt(returnTotal)}</span>
                  </div>
                )}

                {/* Step 3 — Refund mode + reason */}
                <div className="grid grid-cols-2 gap-3">
                  <F label="Refund Mode">
                    <Select value={refundMode} onValueChange={setRefundMode}>
                      <SelectTrigger data-testid="select-refund-mode"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["cash", "card", "upi", "store_credit"].map(m => <SelectItem key={m} value={m}>{m.replace("_", " ").toUpperCase()}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </F>
                  <F label="Reason">
                    <Input placeholder="e.g. Damaged product" value={reason} onChange={e => setReason(e.target.value)} data-testid="input-return-reason" />
                  </F>
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2 pt-2">
            <Button variant="outline" onClick={() => { setShowForm(false); setLookupTxn(null); }}>Cancel</Button>
            {lookupTxn && (
              <Button onClick={submitReturn} disabled={saveMut.isPending || !returnItems.length} data-testid="button-submit-return">
                {saveMut.isPending ? "Processing…" : `Process Return — ₹${fmt(returnTotal)}`}
              </Button>
            )}
          </DialogFooter>
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
          <TabsTrigger value="terminals"><Monitor className="h-3.5 w-3.5 mr-1" />Terminals</TabsTrigger>
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
          <TabsContent value="terminals"><TerminalSettingsTab /></TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
