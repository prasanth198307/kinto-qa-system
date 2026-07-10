import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
const api = (m: string, u: string, b?: any) =>
  fetch(u, { method: m, headers: b ? { "Content-Type": "application/json" } : {}, body: b ? JSON.stringify(b) : undefined }).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); });
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { saveOfflineKOT, getCachedMenuData, cacheMenuData } from "@/utils/offline-db";
import { useOffline } from "@/hooks/use-offline";

// Types
interface MenuItem { id: number; item_name: string; price: number; category_id: number; description?: string; is_available: boolean; }
interface Category { id: number; category_name: string; }
interface Table { id: number; table_name: string; capacity: number; status: string; }
interface CartItem { item: MenuItem; qty: number; notes: string; }


function RecentKOTs({ tableId }: { tableId: number }) {
  const { data: orders = [] } = useQuery({
    queryKey: ["/api/restaurant/kot/orders", tableId],
    queryFn: () => fetch(`/api/restaurant/kot/orders?table_id=${tableId}`).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); }),
    enabled: !!tableId,
    refetchInterval: 30000,
  });

  const recentOrders = Array.isArray(orders) ? orders.slice(0, 5) : [];
  if (recentOrders.length === 0) return null;

  return (
    <div className="fixed bottom-20 left-3 z-20 w-64">
      <details className="bg-white rounded-2xl shadow-xl border border-gray-200">
        <summary className="px-3 py-2 text-sm font-semibold text-gray-700 cursor-pointer">
          📋 Recent KOTs — Table {tableId} ({recentOrders.length})
        </summary>
        <div className="px-3 pb-3 max-h-56 overflow-y-auto divide-y">
          {recentOrders.map((o: any) => {
            const items = Array.isArray(o.items) ? o.items : (typeof o.items_json === "string" ? JSON.parse(o.items_json || "[]") : o.items_json || []);
            return (
              <div key={o.id} className="py-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="font-semibold">KOT #{o.kot_no || o.id}</span>
                  <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${o.status === "served" ? "bg-green-100 text-green-700" : o.status === "preparing" ? "bg-yellow-100 text-yellow-700" : "bg-blue-100 text-blue-700"}`}>
                    {o.status || "sent"}
                  </span>
                </div>
                <div className="text-gray-500 mt-0.5">
                  {items.slice(0, 3).map((item: any, idx: number) => (
                    <span key={idx}>{item.item_name || item.name} ×{item.qty || item.quantity}{idx < Math.min(items.length, 3) - 1 ? ", " : ""}</span>
                  ))}
                  {items.length > 3 && <span className="text-gray-400"> +{items.length - 3} more</span>}
                </div>
                {o.created_at && (
                  <div className="text-gray-400 mt-0.5">{new Date(o.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</div>
                )}
              </div>
            );
          })}
        </div>
      </details>
    </div>
  );
}

export default function RestaurantStewardPage() {
  const { toast } = useToast();
  const { isOnline, pendingCount, syncPending } = useOffline();

  // State
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [lastKotNo, setLastKotNo] = useState<string | null>(null);
  const [sessionOrders, setSessionOrders] = useState<any[]>([]);
  const [covers, setCovers] = useState(2);
  const [outletId, setOutletId] = useState<number | null>(null);

  // Data fetching with offline fallback
  const { data: outlets = [] } = useQuery({ queryKey: ["/api/restaurant/outlets"] });
  const { data: tables = [] } = useQuery({ queryKey: ["/api/restaurant/tables"] });
  const { data: categories = [] } = useQuery({
    queryKey: ["/api/restaurant/menu-categories"],
    onSuccess: (data: any) => cacheMenuData("categories", data),
  });
  const { data: menuItems = [] } = useQuery({
    queryKey: ["/api/restaurant/menu-items"],
    onSuccess: (data: any) => cacheMenuData("menu-items", data),
  });

  // Offline fallback: load from IndexedDB
  useEffect(() => {
    if (!isOnline && menuItems.length === 0) {
      getCachedMenuData("menu-items").then(d => d && console.log("Loaded offline menu"));
    }
  }, [isOnline]);

  const allItems = menuItems as MenuItem[];
  const allCategories = categories as Category[];

  const filtered = allItems.filter(item => {
    if (!item.is_available) return false;
    if (selectedCategory && item.category_id !== selectedCategory) return false;
    if (search && !item.item_name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const addToCart = useCallback((item: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(c => c.item.id === item.id);
      if (existing) return prev.map(c => c.item.id === item.id ? { ...c, qty: c.qty + 1 } : c);
      return [...prev, { item, qty: 1, notes: "" }];
    });
    if (!cartOpen) {
      toast({ title: `+ ${item.item_name}`, description: `₹${item.price}` });
    }
  }, [cartOpen, toast]);

  const removeFromCart = (id: number) => setCart(prev => prev.filter(c => c.item.id !== id));
  const updateQty = (id: number, delta: number) => setCart(prev =>
    prev.map(c => c.item.id === id ? { ...c, qty: Math.max(0, c.qty + delta) } : c).filter(c => c.qty > 0)
  );
  const updateNotes = (id: number, notes: string) => setCart(prev =>
    prev.map(c => c.item.id === id ? { ...c, notes } : c)
  );

  const subtotal = cart.reduce((s, c) => s + c.item.price * c.qty, 0);
  const gst = Math.round(subtotal * 0.05 * 100) / 100;
  const grand = subtotal + gst;

  const sendToKitchen = useMutation({
    mutationFn: async () => {
      if (!selectedTable) throw new Error("Select a table first");
      if (cart.length === 0) throw new Error("Cart is empty");
      const payload = {
        table_number: selectedTable.table_name,
        table_id: selectedTable.id,
        outlet_id: outletId || undefined,
        order_type: "dine_in",
        covers,
        items: cart.map(c => ({ item_name: c.item.item_name, quantity: c.qty, rate: c.item.price, amount: c.item.price * c.qty, notes: c.notes || undefined })),
        subtotal,
        gst_amount: gst,
        grand_total: grand,
        cashier_name: "Steward",
        created_at: new Date().toISOString(),
      };
      if (!isOnline) {
        const offlineId = await saveOfflineKOT(payload);
        return { offline: true, offline_id: offlineId, kot_number: `OFFLINE-${Date.now()}` };
      }
      return api("POST", "/api/restaurant/kot/orders", { ...payload, status: "pending" });
    },
    onSuccess: (data: any) => {
      const kotNo = data?.kot_number || data?.data?.kot_number || "Sent";
      setLastKotNo(kotNo);
      setSessionOrders(prev => [{ kotNo, table: selectedTable?.table_name, items: cart.length, time: new Date().toLocaleTimeString(), offline: data?.offline }, ...prev]);
      setCart([]);
      setCartOpen(false);
      toast({
        title: data?.offline ? "📴 Saved offline" : "✅ KOT Sent!",
        description: `${data?.offline ? "Will sync when online" : "KOT#: " + kotNo} — Table ${selectedTable?.table_name}`,
      });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col max-w-md mx-auto relative">
      {/* Header */}
      <div className="bg-red-600 text-white px-4 pt-safe pb-3 sticky top-0 z-20">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-lg font-bold">🍽️ Steward App</h1>
            <p className="text-xs text-red-200">{isOnline ? "🟢 Online" : "🔴 Offline"}{pendingCount > 0 ? ` · ${pendingCount} pending` : ""}</p>
          </div>
          <div className="flex items-center gap-2">
            {pendingCount > 0 && isOnline && (
              <button onClick={syncPending} className="text-xs bg-white text-red-600 px-2 py-1 rounded font-bold">Sync</button>
            )}
            {cart.length > 0 && (
              <button onClick={() => setCartOpen(true)} className="relative bg-white text-red-600 px-3 py-1.5 rounded-full font-bold text-sm">
                🛒 Cart
                <span className="absolute -top-1.5 -right-1.5 bg-yellow-400 text-red-900 text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">{cart.reduce((s, c) => s + c.qty, 0)}</span>
              </button>
            )}
          </div>
        </div>

        {/* Table + Covers selector */}
        <div className="flex gap-2">
          <select
            className="flex-1 text-sm bg-red-700 border border-red-500 text-white rounded-lg px-3 py-2"
            value={selectedTable?.id || ""}
            onChange={e => setSelectedTable((tables as Table[]).find(t => t.id === Number(e.target.value)) || null)}
          >
            <option value="">Select Table...</option>
            {(tables as Table[]).map(t => <option key={t.id} value={t.id}>{t.table_name} ({t.status})</option>)}
          </select>
          <select
            className="w-24 text-sm bg-red-700 border border-red-500 text-white rounded-lg px-2 py-2"
            value={covers}
            onChange={e => setCovers(Number(e.target.value))}
          >
            {[1,2,3,4,5,6,7,8,9,10].map(n => <option key={n} value={n}>{n} 👤</option>)}
          </select>
        </div>
      </div>

      {/* Search */}
      <div className="px-3 py-2 bg-white border-b sticky top-[110px] z-10">
        <Input placeholder="🔍 Search menu..." value={search} onChange={e => setSearch(e.target.value)} className="h-9 text-sm" />
      </div>

      {/* Category tabs */}
      <div className="bg-white border-b px-3 py-2 flex gap-2 overflow-x-auto scrollbar-hide sticky top-[156px] z-10">
        <button
          onClick={() => setSelectedCategory(null)}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${selectedCategory === null ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-700'}`}
        >All</button>
        {allCategories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${selectedCategory === cat.id ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-700'}`}
          >{cat.category_name}</button>
        ))}
      </div>

      {/* Menu grid */}
      <div className="flex-1 p-3 grid grid-cols-2 gap-3 pb-32">
        {filtered.length === 0 && (
          <div className="col-span-2 text-center text-gray-400 py-12">
            <div className="text-4xl mb-2">🍽️</div>
            <p className="text-sm">{search ? "No items match your search" : "No items in this category"}</p>
          </div>
        )}
        {filtered.map(item => {
          const cartItem = cart.find(c => c.item.id === item.id);
          return (
            <button
              key={item.id}
              onClick={() => addToCart(item)}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3 text-left active:scale-95 transition-transform relative overflow-hidden"
            >
              {/* Item emoji placeholder */}
              <div className="w-full h-20 bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl mb-2 flex items-center justify-center text-3xl">
                🍽️
              </div>
              <div className="font-semibold text-gray-800 text-sm leading-tight line-clamp-2">{item.item_name}</div>
              <div className="text-red-600 font-bold mt-1">₹{item.price}</div>
              {cartItem && (
                <div className="absolute top-2 right-2 bg-red-600 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                  {cartItem.qty}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Cart bottom bar */}
      {cart.length > 0 && !cartOpen && (
        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-red-600 text-white px-4 py-3 flex items-center justify-between z-20">
          <div>
            <div className="text-xs text-red-200">{cart.reduce((s, c) => s + c.qty, 0)} items</div>
            <div className="font-bold text-lg">₹{grand.toFixed(2)}</div>
          </div>
          <button onClick={() => setCartOpen(true)} className="bg-white text-red-600 font-bold px-5 py-2 rounded-full text-sm">
            View Cart →
          </button>
        </div>
      )}

      {/* Cart drawer */}
      {cartOpen && (
        <div className="fixed inset-0 z-30 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/50" onClick={() => setCartOpen(false)} />
          <div className="relative bg-white rounded-t-3xl max-h-[85vh] flex flex-col">
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-gray-200 rounded-full" />
            </div>
            <div className="px-4 pb-2 flex items-center justify-between">
              <h2 className="text-lg font-bold">Your Order</h2>
              {selectedTable && <Badge variant="secondary">Table: {selectedTable.table_name}</Badge>}
            </div>
            <div className="flex-1 overflow-y-auto px-4 divide-y">
              {cart.map(({ item, qty, notes }) => (
                <div key={item.id} className="py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-medium text-sm">{item.item_name}</div>
                      <div className="text-gray-500 text-xs">₹{item.price} × {qty} = ₹{(item.price * qty).toFixed(2)}</div>
                    </div>
                    <div className="flex items-center gap-2 ml-3">
                      <button onClick={() => updateQty(item.id, -1)} className="w-8 h-8 bg-gray-100 rounded-full text-lg font-bold flex items-center justify-center active:bg-gray-200">−</button>
                      <span className="w-6 text-center font-bold">{qty}</span>
                      <button onClick={() => updateQty(item.id, 1)} className="w-8 h-8 bg-red-100 text-red-600 rounded-full text-lg font-bold flex items-center justify-center active:bg-red-200">+</button>
                    </div>
                  </div>
                  <input
                    className="mt-1.5 w-full border rounded-lg px-3 py-1.5 text-xs text-gray-600 focus:outline-none focus:ring-1 focus:ring-red-300"
                    placeholder="Special instructions..."
                    value={notes}
                    onChange={e => updateNotes(item.id, e.target.value)}
                  />
                </div>
              ))}
            </div>
            {/* Summary */}
            <div className="border-t px-4 py-3 bg-gray-50 space-y-1">
              <div className="flex justify-between text-sm text-gray-600"><span>Subtotal</span><span>₹{subtotal.toFixed(2)}</span></div>
              <div className="flex justify-between text-sm text-gray-600"><span>GST (5%)</span><span>₹{gst.toFixed(2)}</span></div>
              <div className="flex justify-between font-bold"><span>Total</span><span className="text-red-600">₹{grand.toFixed(2)}</span></div>
            </div>
            <div className="px-4 pb-safe pb-4 pt-2 flex gap-3">
              <button onClick={() => setCartOpen(false)} className="flex-1 border-2 border-gray-200 rounded-2xl py-3 font-semibold text-gray-600">Back</button>
              <button
                onClick={() => sendToKitchen.mutate()}
                disabled={sendToKitchen.isPending || !selectedTable}
                className="flex-2 flex-grow-[2] bg-red-600 text-white rounded-2xl py-3 font-bold disabled:opacity-50"
              >
                {sendToKitchen.isPending ? "Sending..." : isOnline ? "🍳 Send to Kitchen" : "📴 Save Offline"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Last KOT confirmation */}
      {lastKotNo && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 bg-green-600 text-white px-5 py-3 rounded-2xl shadow-xl z-40 flex items-center gap-3">
          <span className="text-2xl">✅</span>
          <div>
            <div className="font-bold text-sm">KOT Sent!</div>
            <div className="text-xs text-green-200">#{lastKotNo}</div>
          </div>
          <button onClick={() => setLastKotNo(null)} className="ml-2 text-green-300 hover:text-white">✕</button>
        </div>
      )}

      {/* Session Orders */}
      {sessionOrders.length > 0 && !cartOpen && (
        <div className="fixed bottom-16 right-3 z-20">
          <details className="bg-white rounded-2xl shadow-xl border border-gray-200 w-64">
            <summary className="px-3 py-2 text-sm font-semibold text-gray-700 cursor-pointer">📋 Session Orders ({sessionOrders.length})</summary>
            <div className="px-3 pb-3 max-h-48 overflow-y-auto divide-y">
              {sessionOrders.map((o, i) => (
                <div key={i} className="py-2 text-xs">
                  <div className="font-medium">{o.offline ? "📴 " : ""}KOT #{o.kotNo}</div>
                  <div className="text-gray-500">Table {o.table} · {o.items} items · {o.time}</div>
                </div>
              ))}
            </div>
          </details>
        </div>
      )}

      {/* Active Tables Indicator */}
      {!cartOpen && selectedTable && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 bg-white border border-gray-200 rounded-2xl shadow-lg px-4 py-2">
          <span className="text-green-500 font-bold text-sm">● Active:</span>
          <span className="font-semibold text-sm">{tables.find((t: any) => t.id === selectedTable)?.table_name || `Table ${selectedTable}`}</span>
        </div>
      )}

      {/* Recent KOTs for selected table */}
      {selectedTable && !cartOpen && (
        <RecentKOTs tableId={selectedTable} />
      )}

    </div>
  );
}
