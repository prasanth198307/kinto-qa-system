import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";

interface MenuItem { id: number; item_name: string; price: number; category_id: number; description?: string; is_available: boolean; }
interface Category { id: number; category_name: string; }
interface CartItem { item: MenuItem; qty: number; notes: string; }

const IDLE_RESET_MS = 180000; // 3 minutes

export default function RestaurantKioskPage() {
  const outletId = window.location.pathname.split("/").pop() || "1";
  const [screen, setScreen] = useState<"welcome" | "menu" | "checkout" | "success">("welcome");
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<"upi" | "cash">("upi");
  const [tokenNo, setTokenNo] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const { data: categories = [] } = useQuery({
    queryKey: [`/api/restaurant/menu-categories`],
    enabled: screen === "menu" || screen === "checkout",
  });
  const { data: menuItems = [] } = useQuery({
    queryKey: [`/api/restaurant/menu-items`],
    enabled: screen === "menu" || screen === "checkout",
  });

  const resetIdle = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      setScreen("welcome");
      setCart([]);
      setSelectedCategory(null);
      setSearch("");
    }, IDLE_RESET_MS);
  }, []);

  useEffect(() => {
    if (screen !== "welcome") {
      resetIdle();
      const events = ["click", "touchstart", "keydown"];
      events.forEach(e => window.addEventListener(e, resetIdle));
      return () => {
        events.forEach(e => window.removeEventListener(e, resetIdle));
        if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      };
    }
  }, [screen, resetIdle]);

  const allItems = (menuItems as MenuItem[]).filter(i => i.is_available);
  const allCategories = categories as Category[];
  const filtered = allItems.filter(item => {
    if (selectedCategory && item.category_id !== selectedCategory) return false;
    if (search && !item.item_name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const addToCart = (item: MenuItem) => {
    setCart(prev => {
      const ex = prev.find(c => c.item.id === item.id);
      if (ex) return prev.map(c => c.item.id === item.id ? { ...c, qty: c.qty + 1 } : c);
      return [...prev, { item, qty: 1, notes: "" }];
    });
    setSelectedItem(null);
  };
  const updateQty = (id: number, delta: number) => setCart(prev =>
    prev.map(c => c.item.id === id ? { ...c, qty: Math.max(0, c.qty + delta) } : c).filter(c => c.qty > 0)
  );
  const subtotal = cart.reduce((s, c) => s + c.item.price * c.qty, 0);
  const gst = Math.round(subtotal * 0.05 * 100) / 100;
  const grand = subtotal + gst;

  const placeOrder = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/restaurant/kot/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          table_number: `KIOSK-${outletId}`,
          order_type: "kiosk",
          status: "pending",
          covers: 1,
          items: cart.map(c => ({ item_name: c.item.item_name, quantity: c.qty, rate: c.item.price, amount: c.item.price * c.qty })),
          subtotal,
          gst_amount: gst,
          grand_total: grand,
          payment_mode: paymentMethod,
          payment_status: paymentMethod === "upi" ? "pending" : "cash_pending",
          outlet_id: outletId,
        }),
      });
      if (!res.ok) throw new Error("Failed to place order");
      return res.json();
    },
    onSuccess: (data: any) => {
      setTokenNo(data?.id || data?.data?.id || Math.floor(Math.random() * 900 + 100));
      setScreen("success");
      setTimeout(() => {
        setScreen("welcome");
        setCart([]);
        setTokenNo(null);
      }, 30000);
    },
  });

  // Welcome screen
  if (screen === "welcome") {
    return (
      <div
        className="min-h-screen bg-gradient-to-br from-red-600 via-red-700 to-orange-600 flex flex-col items-center justify-center cursor-pointer select-none"
        onClick={() => setScreen("menu")}
      >
        <div className="text-center text-white">
          <div className="text-8xl mb-8 animate-bounce">🍽️</div>
          <h1 className="text-5xl font-black mb-4 tracking-tight">Welcome!</h1>
          <p className="text-xl text-red-200 mb-12">Order directly from our menu</p>
          <div className="bg-white/20 backdrop-blur rounded-3xl px-12 py-6 border-4 border-white/40 animate-pulse">
            <p className="text-3xl font-bold">Touch to Start</p>
            <p className="text-red-200 text-sm mt-1">👆 Tap anywhere to begin</p>
          </div>
          <p className="mt-8 text-red-300 text-sm">Screen resets after 3 minutes of inactivity</p>
        </div>
      </div>
    );
  }

  // Success screen
  if (screen === "success") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-500 to-emerald-600 flex flex-col items-center justify-center text-white text-center p-8">
        <div className="text-8xl mb-6">✅</div>
        <h1 className="text-4xl font-black mb-4">Order Placed!</h1>
        <div className="bg-white/20 rounded-3xl p-8 mb-6">
          <p className="text-xl mb-2">Your Token Number</p>
          <div className="text-8xl font-black">{tokenNo}</div>
          <p className="text-green-200 mt-2 text-sm">Show this at the counter</p>
        </div>
        {paymentMethod === "upi" && (
          <div className="bg-white rounded-2xl p-6 text-gray-800 mb-6 w-full max-w-xs">
            <p className="font-bold mb-2">Scan to Pay</p>
            <div className="bg-gray-100 rounded-xl h-48 flex items-center justify-center text-5xl">
              📱
            </div>
            <p className="text-2xl font-black text-green-600 mt-2">₹{grand.toFixed(2)}</p>
          </div>
        )}
        {paymentMethod === "cash" && (
          <div className="bg-white/20 rounded-2xl p-5 mb-6">
            <p className="text-lg">Please pay <span className="font-black text-3xl">₹{grand.toFixed(2)}</span> at the counter</p>
          </div>
        )}
        <p className="text-green-200 text-sm">Screen resets in 30 seconds...</p>
      </div>
    );
  }

  // Menu screen
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Kiosk header */}
      <div className="bg-red-600 text-white px-6 py-4 flex items-center justify-between">
        <div className="text-2xl font-black">🍽️ Order Menu</div>
        {cart.length > 0 && (
          <button
            onClick={() => setScreen("checkout")}
            className="bg-white text-red-600 font-bold px-6 py-2 rounded-full text-lg relative"
          >
            🛒 Cart ({cart.reduce((s, c) => s + c.qty, 0)}) · ₹{grand.toFixed(2)}
          </button>
        )}
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Category sidebar */}
        <div className="w-48 bg-white border-r flex flex-col overflow-y-auto">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-4 py-4 text-left font-semibold border-b text-sm ${selectedCategory === null ? "bg-red-50 text-red-600 border-l-4 border-l-red-600" : "text-gray-700"}`}
          >
            🍽️ All Items
          </button>
          {allCategories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-4 text-left font-semibold border-b text-sm ${selectedCategory === cat.id ? "bg-red-50 text-red-600 border-l-4 border-l-red-600" : "text-gray-700"}`}
            >
              {cat.category_name}
            </button>
          ))}
        </div>

        {/* Menu items */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4">
            <input
              className="w-full border rounded-xl px-4 py-3 mb-4 text-lg focus:outline-none focus:ring-2 focus:ring-red-300"
              placeholder="🔍 Search..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <div className="grid grid-cols-3 gap-4">
              {filtered.map(item => {
                const cartItem = cart.find(c => c.item.id === item.id);
                return (
                  <button
                    key={item.id}
                    onClick={() => addToCart(item)}
                    className="bg-white rounded-2xl shadow border border-gray-100 overflow-hidden text-left active:scale-95 transition-transform relative"
                  >
                    <div className="h-32 bg-gradient-to-br from-orange-50 to-amber-50 flex items-center justify-center text-5xl">🍽️</div>
                    <div className="p-3">
                      <div className="font-bold text-gray-800 text-sm line-clamp-2 leading-tight">{item.item_name}</div>
                      <div className="text-red-600 font-black text-xl mt-1">₹{item.price}</div>
                      {item.description && <div className="text-gray-400 text-xs mt-0.5 line-clamp-1">{item.description}</div>}
                    </div>
                    {cartItem && (
                      <div className="absolute top-2 right-2 bg-red-600 text-white text-sm font-black rounded-full w-8 h-8 flex items-center justify-center shadow">
                        {cartItem.qty}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom cart bar */}
      {cart.length > 0 && screen === "menu" && (
        <div className="bg-red-600 text-white px-6 py-4 flex items-center justify-between">
          <div>
            <div className="text-sm text-red-200">{cart.reduce((s, c) => s + c.qty, 0)} items in cart</div>
            <div className="text-2xl font-black">₹{grand.toFixed(2)} <span className="text-sm font-normal text-red-200">(incl. GST)</span></div>
          </div>
          <button onClick={() => setScreen("checkout")} className="bg-white text-red-600 font-black text-xl px-8 py-3 rounded-full">
            Proceed →
          </button>
        </div>
      )}

      {/* Checkout overlay */}
      {screen === "checkout" && (
        <div className="fixed inset-0 bg-white z-50 flex flex-col">
          <div className="bg-red-600 text-white px-6 py-4 flex items-center gap-4">
            <button onClick={() => setScreen("menu")} className="text-2xl">←</button>
            <h2 className="text-2xl font-black">Review & Pay</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-6">
            <h3 className="font-bold text-lg mb-4">Your Order</h3>
            {cart.map(({ item, qty }) => (
              <div key={item.id} className="flex items-center justify-between py-3 border-b">
                <div>
                  <div className="font-semibold">{item.item_name}</div>
                  <div className="text-gray-500 text-sm">₹{item.price} × {qty}</div>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={() => updateQty(item.id, -1)} className="w-10 h-10 bg-gray-100 rounded-full text-xl font-bold">−</button>
                  <span className="text-xl font-bold w-8 text-center">{qty}</span>
                  <button onClick={() => updateQty(item.id, 1)} className="w-10 h-10 bg-red-100 text-red-600 rounded-full text-xl font-bold">+</button>
                  <div className="font-bold text-right w-20">₹{(item.price * qty).toFixed(2)}</div>
                </div>
              </div>
            ))}
            <div className="mt-4 space-y-2 bg-gray-50 rounded-xl p-4">
              <div className="flex justify-between"><span className="text-gray-600">Subtotal</span><span>₹{subtotal.toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">GST (5%)</span><span>₹{gst.toFixed(2)}</span></div>
              <div className="flex justify-between font-black text-xl border-t pt-2"><span>Total</span><span className="text-red-600">₹{grand.toFixed(2)}</span></div>
            </div>
            <div className="mt-6">
              <h3 className="font-bold text-lg mb-3">Payment Method</h3>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setPaymentMethod("upi")}
                  className={`p-4 rounded-2xl border-3 text-center text-lg font-bold ${paymentMethod === "upi" ? "border-red-600 bg-red-50 text-red-600" : "border-gray-200"}`}
                >📱 UPI / QR</button>
                <button
                  onClick={() => setPaymentMethod("cash")}
                  className={`p-4 rounded-2xl border-3 text-center text-lg font-bold ${paymentMethod === "cash" ? "border-red-600 bg-red-50 text-red-600" : "border-gray-200"}`}
                >💵 Cash at Counter</button>
              </div>
            </div>
          </div>
          <div className="p-6 border-t">
            <button
              onClick={() => placeOrder.mutate()}
              disabled={placeOrder.isPending}
              className="w-full bg-red-600 text-white font-black text-2xl py-5 rounded-2xl disabled:opacity-50 active:scale-95 transition-transform"
            >
              {placeOrder.isPending ? "Placing Order..." : `Place Order · ₹${grand.toFixed(2)}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
