import { useState, useEffect, useRef } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useTenantConfig, formatCurrency as fmtCur } from "@/hooks/use-tenant-config";

interface MenuItem {
  id: number;
  name: string;
  description?: string;
  price: number;
  category_id?: number;
  is_veg?: number;
  image_url?: string;
  sort_order?: number;
}

interface MenuCategory {
  id: number;
  name: string;
  sort_order?: number;
}

interface CartItem {
  id: number;
  name: string;
  price: number;
  qty: number;
  category: string;
}

interface Outlet {
  id: number;
  name: string;
  tenant_name?: string;
  address?: string;
  phone?: string;
  estimated_delivery_min?: number;
  description?: string;
  banner_url?: string;
  min_order_amount?: number;
}

export default function RestaurantOnlineOrderPage() {
  const { slug } = useParams<{ slug: string }>();
  const [cart, setCart] = useState<CartItem[]>([]);
  const tenantConfig = useTenantConfig();
  const sym = tenantConfig.currency_symbol;
  const [deliveryType, setDeliveryType] = useState<"delivery" | "pickup">("delivery");
  const [showCart, setShowCart] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [orderId, setOrderId] = useState<number | null>(null);
  const [orderToken, setOrderToken] = useState<number | null>(null);
  const [orderTotal, setOrderTotal] = useState<number>(0);
  const [orderStatus, setOrderStatus] = useState("open");
  const [search, setSearch] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentMode, setPaymentMode] = useState("cod");
  const categoryRefs = useRef<Record<number, HTMLElement | null>>({});

  const { data: outlet, isLoading: outletLoading } = useQuery<Outlet>({
    queryKey: ["/api/restaurant/storefront", slug],
    queryFn: () => apiRequest("GET", `/api/restaurant/storefront/${slug}`).then((r: any) => r.json()),
    enabled: !!slug,
  });

  const { data: menu } = useQuery<{ categories: MenuCategory[]; items: MenuItem[] }>({
    queryKey: ["/api/restaurant/storefront", slug, "menu"],
    queryFn: () => apiRequest("GET", `/api/restaurant/storefront/${slug}/menu`).then((r: any) => r.json()),
    enabled: !!slug,
  });

  const { data: statusData, refetch: refetchStatus } = useQuery({
    queryKey: ["/api/restaurant/storefront", slug, "order", orderId, "status"],
    queryFn: () => apiRequest("GET", `/api/restaurant/storefront/${slug}/order/${orderId}/status`).then((r: any) => r.json()),
    enabled: !!orderId && showSuccess,
    refetchInterval: 30000,
  });

  useEffect(() => {
    if (statusData?.status) setOrderStatus(statusData.status);
  }, [statusData]);

  const placeMutation = useMutation({
    mutationFn: async (body: any) => {
      const r = await apiRequest("POST", `/api/restaurant/storefront/${slug}/order`, body);
      return r.json();
    },
    onSuccess: (data: any) => {
      if (data.success) {
        setOrderId(data.order_id);
        setOrderToken(data.token_no);
        setOrderTotal(data.total);
        setShowCart(false);
        setShowSuccess(true);
        setCart([]);
      }
    },
  });

  const addToCart = (item: MenuItem, category: string) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.id === item.id);
      if (existing) return prev.map((c) => (c.id === item.id ? { ...c, qty: c.qty + 1 } : c));
      return [...prev, { id: item.id, name: item.name, price: Number(item.price), qty: 1, category }];
    });
  };

  const updateQty = (id: number, delta: number) => {
    setCart((prev) =>
      prev
        .map((c) => (c.id === id ? { ...c, qty: c.qty + delta } : c))
        .filter((c) => c.qty > 0)
    );
  };

  const cartTotal = cart.reduce((s, c) => s + c.price * c.qty, 0);
  const cartCount = cart.reduce((s, c) => s + c.qty, 0);
  const gst = Math.round(cartTotal * 0.05 * 100) / 100;
  const grandTotal = cartTotal + gst;

  const categories = menu?.categories || [];
  const items = menu?.items || [];

  const filteredItems = search
    ? items.filter((i) => i.name.toLowerCase().includes(search.toLowerCase()))
    : items;

  const getCategoryName = (catId?: number) => {
    if (!catId) return "";
    return categories.find((c) => c.id === catId)?.name || "";
  };

  const statusSteps = ["open", "confirmed", "preparing", "out_for_delivery", "delivered"];
  const statusLabels: Record<string, string> = {
    open: "Order Placed",
    confirmed: "Confirmed",
    preparing: "Preparing",
    out_for_delivery: "Out for Delivery",
    delivered: "Delivered",
  };
  const currentStepIdx = statusSteps.indexOf(orderStatus);

  const handlePlaceOrder = () => {
    if (!customerName.trim() || !customerPhone.trim()) return;
    if (deliveryType === "delivery" && !customerAddress.trim()) return;
    placeMutation.mutate({
      items: cart.map((c) => ({ name: c.name, price: c.price, qty: c.qty, category: c.category })),
      customer_name: customerName,
      customer_phone: customerPhone,
      customer_address: deliveryType === "delivery" ? customerAddress : null,
      delivery_type: deliveryType,
      notes,
      payment_mode: paymentMode,
    });
  };

  if (outletLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading menu...</p>
        </div>
      </div>
    );
  }

  if (!outlet) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8">
          <div className="text-6xl mb-4">🍽️</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Restaurant Not Found</h1>
          <p className="text-gray-500">The link you followed may be incorrect or the restaurant is no longer available.</p>
        </div>
      </div>
    );
  }

  if (showSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl">✅</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-1">Order Placed!</h2>
          <p className="text-gray-500 mb-6">Your order has been received successfully.</p>

          <div className="bg-orange-50 rounded-xl p-6 mb-6">
            <p className="text-sm text-orange-600 font-medium mb-1">Token Number</p>
            <p className="text-6xl font-black text-orange-500">{orderToken}</p>
            <p className="text-sm text-gray-500 mt-2">Total: {sym}{orderTotal.toFixed(2)}</p>
          </div>

          <div className="mb-6">
            <p className="text-sm font-semibold text-gray-600 mb-3 text-left">Order Status</p>
            <div className="flex items-center gap-1">
              {statusSteps.map((step, idx) => (
                <div key={step} className="flex-1 flex flex-col items-center">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mb-1 ${
                      idx <= currentStepIdx ? "bg-orange-500 text-white" : "bg-gray-200 text-gray-400"
                    }`}
                  >
                    {idx < currentStepIdx ? "✓" : idx + 1}
                  </div>
                  <p className="text-[9px] text-center text-gray-500 leading-tight">
                    {statusLabels[step]}
                  </p>
                  {idx < statusSteps.length - 1 && (
                    <div className={`h-0.5 w-full mt-3 ${idx < currentStepIdx ? "bg-orange-400" : "bg-gray-200"}`} />
                  )}
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs text-gray-400">Status updates every 30 seconds</p>
          <button
            onClick={() => { setShowSuccess(false); setOrderId(null); }}
            className="mt-4 text-sm text-orange-500 underline"
          >
            Order More
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Banner */}
      <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-4 pt-8 pb-6">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center text-3xl">
              🍽️
            </div>
            <div>
              <h1 className="text-2xl font-bold">{outlet.name}</h1>
              {outlet.tenant_name && <p className="text-orange-100 text-sm">{outlet.tenant_name}</p>}
            </div>
          </div>
          {outlet.address && <p className="text-orange-100 text-sm mt-1">📍 {outlet.address}</p>}
          {outlet.description && <p className="text-orange-50 text-sm mt-1">{outlet.description}</p>}

          {/* Delivery / Pickup toggle */}
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => setDeliveryType("delivery")}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition ${
                deliveryType === "delivery" ? "bg-white text-orange-500" : "bg-white/20 text-white"
              }`}
            >
              🛵 Delivery ({outlet.estimated_delivery_min || 30} min)
            </button>
            <button
              onClick={() => setDeliveryType("pickup")}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition ${
                deliveryType === "pickup" ? "bg-white text-orange-500" : "bg-white/20 text-white"
              }`}
            >
              🏃 Pickup
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4">
        {/* Search */}
        <div className="relative mb-4">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search menu items..."
            className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
          <span className="absolute left-3 top-3.5 text-gray-400">🔍</span>
        </div>

        {/* Category Pills */}
        {!search && (
          <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => {
                  categoryRefs.current[cat.id]?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                className="shrink-0 px-4 py-1.5 bg-white border border-gray-200 rounded-full text-sm font-medium text-gray-700 hover:border-orange-400 hover:text-orange-500 transition"
              >
                {cat.name}
              </button>
            ))}
          </div>
        )}

        {/* Menu Items */}
        {search ? (
          <div className="space-y-3">
            {filteredItems.map((item) => (
              <MenuItemCard
                key={item.id}
                item={item}
                category={getCategoryName(item.category_id)}
                cart={cart}
                onAdd={addToCart}
                onUpdateQty={updateQty}
              />
            ))}
            {filteredItems.length === 0 && (
              <p className="text-center text-gray-400 py-8">No items found for "{search}"</p>
            )}
          </div>
        ) : (
          categories.map((cat) => {
            const catItems = items.filter((i) => i.category_id === cat.id);
            if (!catItems.length) return null;
            return (
              <div
                key={cat.id}
                ref={(el) => { categoryRefs.current[cat.id] = el; }}
                className="mb-6"
              >
                <h2 className="text-lg font-bold text-gray-800 mb-3 border-b pb-2">{cat.name}</h2>
                <div className="space-y-3">
                  {catItems.map((item) => (
                    <MenuItemCard
                      key={item.id}
                      item={item}
                      category={cat.name}
                      cart={cart}
                      onAdd={addToCart}
                      onUpdateQty={updateQty}
                    />
                  ))}
                </div>
              </div>
            );
          })
        )}

        <div className="h-24" />
      </div>

      {/* Sticky Cart Bar */}
      {cartCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 z-40">
          <div className="max-w-2xl mx-auto">
            <button
              onClick={() => setShowCart(true)}
              className="w-full bg-orange-500 text-white rounded-xl py-4 flex items-center justify-between px-5 shadow-lg hover:bg-orange-600 transition"
            >
              <span className="bg-white/20 rounded-lg px-2 py-0.5 text-sm font-bold">{cartCount} items</span>
              <span className="font-semibold">View Cart</span>
              <span className="font-bold">{sym}{grandTotal.toFixed(2)} →</span>
            </button>
          </div>
        </div>
      )}

      {/* Cart Modal */}
      {showCart && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50">
          <div className="bg-white w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-t-2xl p-5">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Your Cart</h2>
              <button onClick={() => setShowCart(false)} className="text-gray-400 text-2xl">×</button>
            </div>

            {/* Cart Items */}
            <div className="space-y-3 mb-4">
              {cart.map((c) => (
                <div key={c.id} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-800">{c.name}</p>
                    <p className="text-sm text-gray-500">{sym}{c.price} × {c.qty} = {sym}{(c.price * c.qty).toFixed(2)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => updateQty(c.id, -1)} className="w-7 h-7 bg-orange-100 rounded-full text-orange-600 font-bold flex items-center justify-center">−</button>
                    <span className="w-5 text-center font-bold">{c.qty}</span>
                    <button onClick={() => updateQty(c.id, 1)} className="w-7 h-7 bg-orange-500 rounded-full text-white font-bold flex items-center justify-center">+</button>
                  </div>
                </div>
              ))}
            </div>

            {/* GST breakdown */}
            <div className="bg-gray-50 rounded-xl p-3 mb-4 text-sm">
              <div className="flex justify-between text-gray-600 mb-1"><span>Subtotal</span><span>{sym}{cartTotal.toFixed(2)}</span></div>
              <div className="flex justify-between text-gray-600 mb-1"><span>GST (5%)</span><span>{sym}{gst.toFixed(2)}</span></div>
              <div className="flex justify-between font-bold text-gray-800 border-t pt-2 mt-2"><span>Total</span><span>{sym}{grandTotal.toFixed(2)}</span></div>
            </div>

            {/* Customer details */}
            <div className="space-y-3 mb-4">
              <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Your Name *" className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
              <input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="Phone Number *" type="tel" className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
              {deliveryType === "delivery" && (
                <textarea value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)} placeholder="Delivery Address *" rows={2} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
              )}
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Special instructions (optional)" rows={2} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
            </div>

            {/* Payment mode */}
            <div className="mb-4">
              <p className="text-sm font-semibold text-gray-700 mb-2">Payment</p>
              <div className="flex gap-2">
                {[["cod", "💵 Cash"], ["upi", "📱 UPI"], ["online", "💳 Online"]].map(([val, label]) => (
                  <button key={val} onClick={() => setPaymentMode(val)} className={`flex-1 py-2 rounded-lg text-sm border transition ${paymentMode === val ? "border-orange-500 bg-orange-50 text-orange-600 font-semibold" : "border-gray-200 text-gray-600"}`}>{label}</button>
                ))}
              </div>
            </div>

            <button
              onClick={handlePlaceOrder}
              disabled={placeMutation.isPending}
              className="w-full bg-orange-500 text-white rounded-xl py-4 font-bold text-lg hover:bg-orange-600 transition disabled:opacity-60"
            >
              {placeMutation.isPending ? "Placing Order..." : `Place Order · ${sym}${grandTotal.toFixed(2)}`}
            </button>
            {placeMutation.isError && <p className="text-red-500 text-sm mt-2 text-center">{(placeMutation.error as any)?.message || "Failed to place order"}</p>}
          </div>
        </div>
      )}
    </div>
  );
}

function MenuItemCard({
  item,
  category,
  cart,
  onAdd,
  onUpdateQty,
}: {
  item: MenuItem;
  category: string;
  cart: CartItem[];
  onAdd: (item: MenuItem, category: string) => void;
  onUpdateQty: (id: number, delta: number) => void;
}) {
  const cartItem = cart.find((c) => c.id === item.id);
  const tenantConfig = useTenantConfig();
  const sym = tenantConfig.currency_symbol;
  const vegEmoji = item.is_veg === 1 ? "🟢" : item.is_veg === 0 ? "🔴" : "";
  const foodEmojis = ["🍕", "🍔", "🌮", "🍜", "🍛", "🥘", "🍱", "🥗", "🍗", "🍖"];
  const emoji = foodEmojis[item.id % foodEmojis.length];
  const bgColors = ["bg-amber-50", "bg-orange-50", "bg-red-50", "bg-yellow-50", "bg-lime-50"];
  const bgColor = bgColors[item.id % bgColors.length];

  return (
    <div className="bg-white rounded-xl p-4 flex gap-3 shadow-sm border border-gray-100">
      <div className={`w-16 h-16 ${bgColor} rounded-xl flex items-center justify-center text-3xl shrink-0`}>
        {emoji}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-1">
          {vegEmoji && <span className="text-xs mt-0.5">{vegEmoji}</span>}
          <p className="font-semibold text-gray-800 text-sm leading-tight">{item.name}</p>
        </div>
        {item.description && (
          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{item.description}</p>
        )}
        <p className="text-orange-600 font-bold text-sm mt-1">{sym}{Number(item.price).toFixed(2)}</p>
      </div>
      <div className="flex items-center shrink-0">
        {cartItem ? (
          <div className="flex items-center gap-1.5">
            <button onClick={() => onUpdateQty(item.id, -1)} className="w-7 h-7 bg-orange-100 rounded-full text-orange-600 font-bold flex items-center justify-center text-sm">−</button>
            <span className="w-5 text-center font-bold text-sm">{cartItem.qty}</span>
            <button onClick={() => onUpdateQty(item.id, 1)} className="w-7 h-7 bg-orange-500 rounded-full text-white font-bold flex items-center justify-center text-sm">+</button>
          </div>
        ) : (
          <button
            onClick={() => onAdd(item, category)}
            className="bg-orange-500 text-white px-4 py-1.5 rounded-lg text-sm font-bold hover:bg-orange-600 transition"
          >
            + Add
          </button>
        )}
      </div>
    </div>
  );
}
