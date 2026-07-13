import { useState, useEffect, useCallback } from "react";
import { useTenantConfig, formatCurrency as fmtCur } from "@/hooks/use-tenant-config";

// Public full-screen Customer Display Screen — no auth required
const apiGet = async (url: string) => {
  const r = await fetch(url);
  if (!r.ok) throw new Error(await r.text());
  return r.json();
};
const fmt = (n: any) => Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

const PROMO_MESSAGES = [
  "Welcome to SwachERP Restaurant",
  "Try our Chef's Special today!",
  "Ask about our loyalty programme",
  "Live counter-top ordering available",
  "Free Wi-Fi: SwachERP_Guest",
  "Follow us on social media",
  "Birthday celebrations? Talk to us!",
  "Takeaway & delivery available",
];

function DigitalClock() {
  const [time, setTime] = useState(new Date());
  const tenantConfig = useTenantConfig();
  const sym = tenantConfig.currency_symbol;
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const h = time.getHours().toString().padStart(2, "0");
  const m = time.getMinutes().toString().padStart(2, "0");
  const s = time.getSeconds().toString().padStart(2, "0");
  const dateStr = time.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  return (
    <div className="text-center">
      <div className="text-8xl font-black tracking-wider text-white font-mono">
        {h}<span className="animate-pulse">:</span>{m}<span className="text-5xl text-white/60">:{s}</span>
      </div>
      <div className="text-white/70 text-xl mt-2">{dateStr}</div>
    </div>
  );
}

function IdleState() {
  const [promoIdx, setPromoIdx] = useState(0);
  const tenantConfig = useTenantConfig();
  const sym = tenantConfig.currency_symbol;

  useEffect(() => {
    const id = setInterval(() => {
      setPromoIdx(i => (i + 1) % PROMO_MESSAGES.length);
    }, 5000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-br from-gray-900 via-indigo-950 to-gray-900 text-white select-none">
      {/* Logo / brand */}
      <div className="mb-12 text-center">
        <div className="text-6xl mb-3">🍽️</div>
        <div className="text-3xl font-bold tracking-wide text-indigo-300">SwachERP Restaurant</div>
      </div>

      {/* Clock */}
      <DigitalClock />

      {/* Welcome */}
      <div className="mt-12 text-4xl font-light text-white/80">Welcome</div>

      {/* Rotating promo */}
      <div className="mt-8 px-8 py-4 rounded-2xl bg-white/5 border border-white/10 max-w-xl text-center">
        <div
          key={promoIdx}
          className="text-xl text-indigo-200 transition-all duration-700"
          style={{ animation: "fadeIn 0.7s ease" }}
        >
          {PROMO_MESSAGES[promoIdx]}
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}

function ActiveBillState({ bill }: { bill: any }) {
  const items: any[] = bill.items || [];
  const tenantConfig = useTenantConfig();
  const sym = tenantConfig.currency_symbol;
  const subtotal = items.reduce((s: number, i: any) => s + Number(i.price || 0) * Number(i.quantity || 1), 0);
  const gst = bill.gst ?? subtotal * 0.05;
  const serviceCharge = Number(bill.service_charge || 0);
  const discount = Number(bill.discount || 0);
  const total = subtotal + gst + serviceCharge - discount;

  const tableLabel = bill.table_number ? `Table ${bill.table_number}` : bill.table_id ? `Table ${bill.table_id}` : "Counter";

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white select-none overflow-hidden">
      {/* Header */}
      <div className="bg-indigo-700 px-8 py-5 flex items-center justify-between shadow-lg">
        <div>
          <div className="text-sm text-indigo-200 uppercase tracking-widest font-semibold">Bill in Progress</div>
          <div className="text-3xl font-bold">{tableLabel}</div>
        </div>
        <div className="text-right">
          <div className="text-sm text-indigo-200">SwachERP Restaurant</div>
          <div className="text-lg font-semibold text-indigo-100">
            {new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
          </div>
        </div>
      </div>

      {/* Items list */}
      <div className="flex-1 overflow-y-auto px-8 py-4 space-y-2">
        {/* Column headers */}
        <div className="grid grid-cols-12 text-xs text-gray-400 uppercase tracking-wider pb-2 border-b border-gray-700">
          <div className="col-span-6">Item</div>
          <div className="col-span-2 text-center">Qty</div>
          <div className="col-span-2 text-right">Price</div>
          <div className="col-span-2 text-right">Amount</div>
        </div>

        {items.length === 0 && (
          <div className="text-gray-500 text-center py-12 text-xl">Adding items...</div>
        )}

        {items.map((item: any, i: number) => (
          <div
            key={item.id || i}
            className="grid grid-cols-12 text-lg py-2 border-b border-gray-800"
          >
            <div className="col-span-6 font-medium text-white">{item.name}</div>
            <div className="col-span-2 text-center text-gray-300">×{item.quantity || 1}</div>
            <div className="col-span-2 text-right text-gray-300">{sym}{fmt(item.price)}</div>
            <div className="col-span-2 text-right text-white font-semibold">
              {sym}{fmt(Number(item.price || 0) * Number(item.quantity || 1))}
            </div>
          </div>
        ))}
      </div>

      {/* Bill summary */}
      <div className="bg-gray-800 px-8 py-4 space-y-2 border-t border-gray-700">
        <div className="flex justify-between text-gray-300 text-lg">
          <span>Subtotal</span>
          <span>{sym}{fmt(subtotal)}</span>
        </div>
        <div className="flex justify-between text-gray-300 text-lg">
          <span>GST (5%)</span>
          <span>{sym}{fmt(gst)}</span>
        </div>
        {serviceCharge > 0 && (
          <div className="flex justify-between text-gray-300 text-lg">
            <span>Service Charge</span>
            <span>{sym}{fmt(serviceCharge)}</span>
          </div>
        )}
        {discount > 0 && (
          <div className="flex justify-between text-green-400 text-lg">
            <span>Discount</span>
            <span>−{sym}{fmt(discount)}</span>
          </div>
        )}
        <div className="flex justify-between text-white font-black text-3xl pt-2 border-t border-gray-600">
          <span>TOTAL</span>
          <span className="text-indigo-300">{sym}{fmt(total)}</span>
        </div>

        {/* Payment mode */}
        {bill.payment_mode && (
          <div className="flex items-center gap-3 mt-2 pt-2 border-t border-gray-700">
            <span className="text-gray-400 text-sm uppercase tracking-wider">Payment:</span>
            <span className="bg-indigo-600 text-white px-4 py-1 rounded-full text-sm font-semibold uppercase">
              {bill.payment_mode}
            </span>
          </div>
        )}
      </div>

      {/* Tagline */}
      <div className="bg-indigo-900 text-center py-3 text-indigo-300 text-sm font-medium">
        Thank you for dining with us! 🙏
      </div>
    </div>
  );
}

function SettlementState({ onDone }: { onDone: () => void }) {
  const [count, setCount] = useState(10);

  useEffect(() => {
    if (count <= 0) { onDone(); return; }
    const id = setTimeout(() => setCount(c => c - 1), 1000);
    return () => clearTimeout(id);
  }, [count, onDone]);

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-green-700 text-white select-none">
      <div className="text-[10rem] leading-none mb-6 animate-bounce">✓</div>
      <h1 className="text-5xl font-black mb-4">Payment Received!</h1>
      <p className="text-2xl text-green-100 mb-2">Thank you!</p>
      <p className="text-xl text-green-200">Please visit us again</p>
      <div className="mt-12 text-green-300 text-lg">
        Returning to idle in {count}s...
      </div>
    </div>
  );
}

export default function RestaurantCdsPage() {
  const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
  const terminalId = params.get("terminalId") || "1";
  const outletId = params.get("outletId") || "1";

  const [billState, setBillState] = useState<"idle" | "active" | "settled">("idle");
  const [activeBill, setActiveBill] = useState<any>(null);
  const [prevPaid, setPrevPaid] = useState(false);

  const poll = useCallback(async () => {
    try {
      const data = await apiGet(`/api/restaurant/cds/active-bill?terminalId=${terminalId}&outletId=${outletId}`);
      if (!data || data === null) {
        if (billState === "active") {
          // bill disappeared — could be paid
          setBillState("idle");
        }
        setActiveBill(null);
      } else {
        if (data.status === "paid" && billState !== "settled") {
          setActiveBill(data);
          setBillState("settled");
        } else if (data.status !== "paid") {
          setActiveBill(data);
          setBillState("active");
        }
      }
    } catch {
      // silently ignore poll errors — CDS should always stay running
    }
  }, [terminalId, outletId, billState]);

  useEffect(() => {
    poll();
    const id = setInterval(poll, 3000);
    return () => clearInterval(id);
  }, [poll]);

  const handleSettlementDone = useCallback(() => {
    setActiveBill(null);
    setBillState("idle");
  }, []);

  // Prevent any scrolling on CDS
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  if (billState === "idle") return <IdleState />;
  if (billState === "settled") return <SettlementState onDone={handleSettlementDone} />;
  return <ActiveBillState bill={activeBill || {}} />;
}
