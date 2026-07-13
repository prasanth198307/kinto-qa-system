import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useTenantConfig, formatCurrency as fmtCur } from "@/hooks/use-tenant-config";

// Public page — no auth, mobile-optimised
const apiGet = async (url: string) => {
  const r = await fetch(url);
  if (!r.ok) throw new Error(await r.text());
  return r.json();
};
const apiPost = async (url: string, body: any) => {
  const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
};
const fmt = (n: any) => Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

type Screen = "welcome" | "menu" | "cart" | "success";

type CartItem = {
  id: number;
  name: string;
  price: number;
  qty: number;
  notes: string;
  emoji: string;
  category: string;
};

const ITEM_EMOJIS = ["🍛", "🍜", "🍕", "🥗", "🍗", "🍖", "🥘", "🍱", "🥙", "🌮", "🍔", "🥞", "🍣", "🍤", "🥩", "🍞"];
const emojiForItem = (id: number) => ITEM_EMOJIS[id % ITEM_EMOJIS.length];

function WelcomeScreen({
  outletId, tableId, restaurantName, onStart,
}: { outletId: string; tableId: string; restaurantName: string; onStart: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 text-center bg-gradient-to-b from-indigo-600 to-indigo-800 text-white">
      <div className="mb-8">
        <div className="text-6xl mb-4">🍽️</div>
        <h1 className="text-3xl font-bold mb-2">{restaurantName || "Restaurant"}</h1>
        <div className="text-indigo-200 text-lg">Table {tableId}</div>
      </div>
      <div className="bg-white/10 rounded-2xl px-8 py-6 mb-8 w-full max-w-xs">
        <div className="text-sm text-indigo-100 mb-1">You're at</div>
        <div className="text-2xl font-bold">Table {tableId}</div>
        <div className="text-indigo-200 text-sm mt-1">Scan to order directly</div>
      </div>
      <Button
        onClick={onStart}
        className="w-full max-w-xs text-lg py-6 bg-white text-indigo-700 hover:bg-indigo-50 font-bold rounded-2xl shadow-lg"
      >
        Start Ordering
      </Button>
      <p className="mt-4 text-indigo-300 text-xs">Order will go directly to kitchen</p>
    </div>
  );
}

function MenuScreen({
  outletId, cart, onAddToCart, onViewCart,
}: {
  outletId: string;
  cart: CartItem[];
  onAddToCart: (item: CartItem) => void;
  onViewCart: () => void;
}) {
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const tenantConfig = useTenantConfig();
  const sym = tenantConfig.currency_symbol;

  const { data: menuItems = [], isLoading } = useQuery({
    queryKey: ["/api/pos/menu-items", outletId],
    queryFn: () => apiGet(`/api/pos/menu-items?outlet_id=${outletId}`),
    retry: 1,
  });

  const categories = ["all", ...Array.from(new Set((menuItems as any[]).map((i: any) => i.category || "Other")))];
  const filtered = activeCategory === "all"
    ? menuItems
    : (menuItems as any[]).filter((i: any) => (i.category || "Other") === activeCategory);

  const cartCount = cart.reduce((s, i) => s + i.qty, 0);
  const cartTotal = cart.reduce((s, i) => s + i.qty * i.price, 0);

  const itemQty = (itemId: number) => cart.find(c => c.id === itemId)?.qty || 0;

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm px-4 py-3 sticky top-0 z-10">
        <h2 className="font-bold text-gray-900 text-lg">Menu</h2>
        <p className="text-xs text-gray-500">Select items to add to your order</p>
      </div>

      {/* Category pills */}
      <div className="bg-white px-4 py-2 border-b overflow-x-auto flex gap-2 sticky top-[60px] z-10">
        {(categories as string[]).map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              activeCategory === cat
                ? "bg-indigo-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {cat === "all" ? "All Items" : cat}
          </button>
        ))}
      </div>

      {/* Items grid */}
      <div className="flex-1 p-3 pb-24">
        {isLoading && (
          <div className="flex items-center justify-center py-16 text-gray-400">Loading menu...</div>
        )}
        {!isLoading && (filtered as any[]).length === 0 && (
          <div className="text-center py-16 text-gray-400">No items in this category</div>
        )}
        <div className="grid grid-cols-2 gap-3">
          {(filtered as any[]).map((item: any) => {
            const qty = itemQty(item.id);
            const emoji = emojiForItem(item.id);
            return (
              <div key={item.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="h-20 flex items-center justify-center text-4xl bg-gradient-to-br from-indigo-50 to-purple-50">
                  {emoji}
                </div>
                <div className="p-2">
                  <div className="text-sm font-semibold text-gray-900 leading-tight mb-0.5 truncate">{item.name}</div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-sm font-bold text-indigo-700">{sym}{fmt(item.price)}</span>
                    {item.is_veg !== undefined && (
                      <span className={`w-3 h-3 rounded-sm border-2 ${item.is_veg ? "border-green-500" : "border-red-500"} inline-block`} />
                    )}
                  </div>
                  {qty === 0 ? (
                    <button
                      onClick={() => onAddToCart({ id: item.id, name: item.name, price: Number(item.price), qty: 1, notes: "", emoji, category: item.category || "Other" })}
                      className="mt-2 w-full bg-indigo-600 text-white text-xs font-semibold py-1.5 rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                      + Add
                    </button>
                  ) : (
                    <div className="mt-2 flex items-center justify-between bg-indigo-50 rounded-lg px-2 py-1">
                      <button onClick={() => onAddToCart({ id: item.id, name: item.name, price: Number(item.price), qty: -1, notes: "", emoji, category: item.category || "Other" })} className="text-indigo-600 font-bold text-lg leading-none w-6 h-6 flex items-center justify-center">−</button>
                      <span className="text-indigo-700 font-bold text-sm">{qty}</span>
                      <button onClick={() => onAddToCart({ id: item.id, name: item.name, price: Number(item.price), qty: 1, notes: "", emoji, category: item.category || "Other" })} className="text-indigo-600 font-bold text-lg leading-none w-6 h-6 flex items-center justify-center">+</button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Sticky cart button */}
      {cartCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t shadow-lg z-20 max-w-md mx-auto">
          <button
            onClick={onViewCart}
            className="w-full bg-indigo-600 text-white rounded-xl py-3 px-4 flex items-center justify-between font-semibold hover:bg-indigo-700 transition-colors"
          >
            <span className="bg-white text-indigo-600 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">{cartCount}</span>
            <span>View Cart</span>
            <span>{sym}{fmt(cartTotal)}</span>
          </button>
        </div>
      )}
    </div>
  );
}

function CartScreen({
  cart,
  tableId,
  outletId,
  onUpdateItem,
  onPlaceOrder,
  onBack,
}: {
  cart: CartItem[];
  tableId: string;
  outletId: string;
  onUpdateItem: (id: number, delta: number) => void;
  onPlaceOrder: (name: string, phone: string) => void;
  onBack: () => void;
}) {
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [notes, setNotes] = useState<Record<number, string>>({});

  const subtotal = cart.reduce((s, i) => s + i.qty * i.price, 0);
  const gst = subtotal * 0.05;
  const total = subtotal + gst;

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm px-4 py-3 sticky top-0 z-10 flex items-center gap-3">
        <button onClick={onBack} className="text-gray-500 hover:text-gray-700">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <h2 className="font-bold text-gray-900 text-lg">Your Cart</h2>
      </div>

      <div className="flex-1 p-4 pb-32 space-y-3">
        {/* Items */}
        {cart.map(item => (
          <div key={item.id} className="bg-white rounded-xl shadow-sm p-3">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">{item.emoji}</span>
              <div className="flex-1">
                <div className="font-semibold text-sm">{item.name}</div>
                <div className="text-xs text-gray-500">{sym}{fmt(item.price)} each</div>
              </div>
              <div className="flex items-center gap-2 bg-indigo-50 rounded-lg px-2 py-1">
                <button onClick={() => onUpdateItem(item.id, -1)} className="text-indigo-600 font-bold text-base w-5 h-5 flex items-center justify-center">−</button>
                <span className="text-indigo-700 font-bold text-sm w-4 text-center">{item.qty}</span>
                <button onClick={() => onUpdateItem(item.id, 1)} className="text-indigo-600 font-bold text-base w-5 h-5 flex items-center justify-center">+</button>
              </div>
              <span className="text-sm font-bold text-gray-700 w-16 text-right">{sym}{fmt(item.qty * item.price)}</span>
            </div>
            <Input
              placeholder="Special instructions (optional)"
              value={notes[item.id] || ""}
              onChange={e => setNotes({ ...notes, [item.id]: e.target.value })}
              className="text-xs h-7"
            />
          </div>
        ))}

        {/* Bill summary */}
        <div className="bg-white rounded-xl shadow-sm p-3 space-y-1 text-sm">
          <div className="flex justify-between text-gray-600"><span>Subtotal</span><span>{sym}{fmt(subtotal)}</span></div>
          <div className="flex justify-between text-gray-600"><span>GST (5%)</span><span>{sym}{fmt(gst)}</span></div>
          <div className="border-t pt-1 flex justify-between font-bold text-base"><span>Total</span><span>{sym}{fmt(total)}</span></div>
        </div>

        {/* Customer info */}
        <div className="bg-white rounded-xl shadow-sm p-3 space-y-2">
          <div className="text-sm font-semibold text-gray-700">Your Details (optional)</div>
          <Input placeholder="Your name" value={customerName} onChange={e => setCustomerName(e.target.value)} className="text-sm" />
          <Input placeholder="Phone number" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} type="tel" className="text-sm" />
        </div>
      </div>

      {/* Place order button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t shadow-lg max-w-md mx-auto z-20">
        <button
          onClick={() => onPlaceOrder(customerName, customerPhone)}
          className="w-full bg-green-600 text-white rounded-xl py-3 font-bold text-lg hover:bg-green-700 transition-colors"
        >
          Place Order — {sym}{fmt(total)}
        </button>
      </div>
    </div>
  );
}

function SuccessScreen({ token, onOrderMore }: { token: number; onOrderMore: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-green-50 px-6 text-center">
      <div className="text-7xl mb-6">✅</div>
      <h1 className="text-3xl font-bold text-green-700 mb-2">Order Placed!</h1>
      <p className="text-gray-500 mb-6">Kitchen is preparing your food</p>

      <div className="bg-white rounded-2xl shadow-md px-8 py-6 mb-6 w-full max-w-xs">
        <div className="text-xs text-gray-400 mb-1">Your Token Number</div>
        <div className="text-5xl font-black text-indigo-600">#{token}</div>
        <div className="text-sm text-gray-500 mt-2">Show this to the waiter</div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-8 w-full max-w-xs">
        <div className="text-sm font-semibold text-amber-800">⏱ Estimated Time</div>
        <div className="text-2xl font-bold text-amber-700">~15 minutes</div>
      </div>

      <button
        onClick={onOrderMore}
        className="text-indigo-600 underline text-sm font-medium"
      >
        Add more items to your order
      </button>
    </div>
  );
}

export default function RestaurantTableOrderPage() {
  const params = useParams() as { outletId?: string; tableId?: string };
  const outletId = params.outletId || "1";
  const tableId = params.tableId || "1";

  const [screen, setScreen] = useState<Screen>("welcome");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [token, setToken] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const { data: outlet = {} } = useQuery({
    queryKey: ["/api/restaurant/outlets", outletId],
    queryFn: () => apiGet(`/api/restaurant/outlets/${outletId}`),
    retry: 1,
    enabled: !!outletId,
  });

  const restaurantName = (outlet as any).outlet_name || (outlet as any).name || "Restaurant";

  const handleAddToCart = (item: CartItem) => {
    setCart(prev => {
      const existing = prev.find(c => c.id === item.id);
      if (existing) {
        const newQty = existing.qty + item.qty;
        if (newQty <= 0) return prev.filter(c => c.id !== item.id);
        return prev.map(c => c.id === item.id ? { ...c, qty: newQty } : c);
      }
      if (item.qty <= 0) return prev;
      return [...prev, item];
    });
  };

  const handleUpdateItem = (id: number, delta: number) => {
    setCart(prev => {
      const existing = prev.find(c => c.id === id);
      if (!existing) return prev;
      const newQty = existing.qty + delta;
      if (newQty <= 0) return prev.filter(c => c.id !== id);
      return prev.map(c => c.id === id ? { ...c, qty: newQty } : c);
    });
  };

  const placeMutation = useMutation({
    mutationFn: ({ name, phone }: { name: string; phone: string }) =>
      apiPost("/api/restaurant/kot", {
        outlet_id: Number(outletId),
        table_id: Number(tableId),
        source: "qr_order",
        customer_name: name || undefined,
        customer_phone: phone || undefined,
        items: cart.map(i => ({ menu_item_id: i.id, name: i.name, quantity: i.qty, price: i.price, notes: i.notes })),
      }),
    onSuccess: () => {
      setToken(Math.floor(100 + Math.random() * 900));
      setError(null);
      setScreen("success");
      setCart([]);
    },
    onError: (e: any) => {
      setError(e.message || "Failed to place order. Please try again.");
    },
  });

  return (
    <div className="max-w-md mx-auto relative">
      {screen === "welcome" && (
        <WelcomeScreen
          outletId={outletId}
          tableId={tableId}
          restaurantName={restaurantName}
          onStart={() => setScreen("menu")}
        />
      )}

      {screen === "menu" && (
        <MenuScreen
          outletId={outletId}
          cart={cart}
          onAddToCart={handleAddToCart}
          onViewCart={() => setScreen("cart")}
        />
      )}

      {screen === "cart" && (
        <CartScreen
          cart={cart}
          tableId={tableId}
          outletId={outletId}
          onUpdateItem={handleUpdateItem}
          onBack={() => setScreen("menu")}
          onPlaceOrder={(name, phone) => placeMutation.mutate({ name, phone })}
        />
      )}

      {screen === "success" && (
        <SuccessScreen token={token} onOrderMore={() => setScreen("menu")} />
      )}

      {/* Error overlay */}
      {error && (
        <div className="fixed bottom-24 left-4 right-4 max-w-md mx-auto bg-red-100 border border-red-400 text-red-700 rounded-xl p-3 text-sm flex items-center justify-between z-50">
          <span>{error}</span>
          <div className="flex gap-2 ml-2">
            <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700 underline text-xs">Dismiss</button>
          </div>
        </div>
      )}

      {/* Loading overlay */}
      {placeMutation.isPending && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 text-center shadow-xl">
            <div className="text-3xl mb-2 animate-bounce">🍽️</div>
            <div className="font-semibold text-gray-700">Placing your order...</div>
          </div>
        </div>
      )}
    </div>
  );
}
