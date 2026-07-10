import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const api = (m: string, u: string, b?: any) =>
  fetch(u, { method: m, headers: { "Content-Type": "application/json" }, body: b ? JSON.stringify(b) : undefined, credentials: "include" }).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); });

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

interface KotItem {
  id: number;
  menu_item_id: number;
  item_name: string;
  quantity: number;
  rate: number;
  amount: number;
  course: string;
  kitchen_station: string;
  kitchen_status: string;
  special_instructions?: string;
  is_void: number;
  void_reason?: string;
  fired_at?: string;
  ready_at?: string;
  served_at?: string;
}

interface KotOrder {
  id: number;
  kot_number: string;
  table_number?: string;
  order_type: string;
  covers: number;
  status: string;
  subtotal: number;
  gst_amount: number;
  service_charge: number;
  grand_total: number;
  payment_status: string;
  payment_mode?: string;
  cashier_name?: string;
  is_complimentary: number;
  nc_reason?: string;
  created_at: string;
  items: KotItem[];
}

const statusBadgeMap: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  cooking: "bg-blue-100 text-blue-800 border-blue-200",
  ready: "bg-green-100 text-green-800 border-green-200",
  paid: "bg-gray-100 text-gray-600 border-gray-200",
  cancelled: "bg-red-100 text-red-700 border-red-200",
  qr_order: "bg-purple-100 text-purple-700 border-purple-200",
};

const orderTypeBadgeMap: Record<string, string> = {
  dine_in: "bg-indigo-100 text-indigo-700 border-indigo-200",
  takeaway: "bg-orange-100 text-orange-700 border-orange-200",
  delivery: "bg-cyan-100 text-cyan-700 border-cyan-200",
  qr_order: "bg-purple-100 text-purple-700 border-purple-200",
};

const orderTypeLabels: Record<string, string> = {
  dine_in: "Dine In",
  takeaway: "Takeaway",
  delivery: "Delivery",
  qr_order: "QR Order",
};

const kitchenStatusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  cooking: "bg-blue-100 text-blue-800 border-blue-200",
  ready: "bg-green-100 text-green-800 border-green-200",
  served: "bg-gray-100 text-gray-600 border-gray-200",
};

function fmt(n: number) {
  return (n || 0).toFixed(2);
}

function formatTime(dateStr: string) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`text-xs px-2 py-0.5 rounded border font-medium ${statusBadgeMap[status] || "bg-gray-100 text-gray-600 border-gray-200"}`}
    >
      {status?.replace(/_/g, " ").toUpperCase()}
    </span>
  );
}

function OrderTypeBadge({ type }: { type: string }) {
  return (
    <span
      className={`text-xs px-2 py-0.5 rounded border font-medium ${orderTypeBadgeMap[type] || "bg-gray-100 text-gray-600 border-gray-200"}`}
    >
      {orderTypeLabels[type] || type}
    </span>
  );
}

// Inline void item component
function VoidItemRow({
  orderId,
  item,
  onVoided,
}: {
  orderId: number;
  item: KotItem;
  onVoided: () => void;
}) {
  const { toast } = useToast();
  const [showVoidInput, setShowVoidInput] = useState(false);
  const [voidReason, setVoidReason] = useState("");

  const handleVoid = async () => {
    if (!voidReason.trim()) {
      toast({ title: "Reason required", description: "Please enter a void reason", variant: "destructive" });
      return;
    }
    try {
      await api("DELETE", `/api/restaurant/kot/orders/${orderId}/items/${item.id}`, { void_reason: voidReason });
      toast({ title: "Item Voided", description: `${item.item_name} voided` });
      onVoided();
      setShowVoidInput(false);
    } catch {
      toast({ title: "Error", description: "Failed to void item", variant: "destructive" });
    }
  };

  if (item.is_void) {
    return (
      <span className="text-xs text-red-500 italic">
        Voided{item.void_reason ? `: ${item.void_reason}` : ""}
      </span>
    );
  }

  return (
    <div>
      {!showVoidInput ? (
        <Button
          size="sm"
          variant="outline"
          className="h-6 text-xs border-red-300 text-red-600 hover:bg-red-50"
          onClick={() => setShowVoidInput(true)}
        >
          Void
        </Button>
      ) : (
        <div className="flex items-center gap-1 mt-1">
          <Input
            value={voidReason}
            onChange={e => setVoidReason(e.target.value)}
            placeholder="Void reason..."
            className="h-6 text-xs w-32"
          />
          <Button
            size="sm"
            className="h-6 text-xs px-2 bg-red-600 hover:bg-red-700 text-white"
            onClick={handleVoid}
          >
            Confirm
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 text-xs px-1"
            onClick={() => setShowVoidInput(false)}
          >
            ✕
          </Button>
        </div>
      )}
    </div>
  );
}

// Add items to KOT mini panel
function AddItemsPanel({
  orderId,
  onAdded,
  onCancel,
}: {
  orderId: number;
  onAdded: () => void;
  onCancel: () => void;
}) {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [selected, setSelected] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!search.trim()) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const data = await api("GET", `/api/restaurant/menu/items?search=${encodeURIComponent(search)}`);
        if (Array.isArray(data)) setResults(data.slice(0, 10));
      } catch {}
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const addItem = (menuItem: any) => {
    setSelected(prev => {
      const existing = prev.find(i => i.menu_item_id === menuItem.id);
      if (existing) {
        return prev.map(i =>
          i.menu_item_id === menuItem.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [
        ...prev,
        {
          menu_item_id: menuItem.id,
          item_name: menuItem.name,
          quantity: 1,
          rate: menuItem.price,
          course: menuItem.course || "main",
          kitchen_station: menuItem.kitchen_station || "hot_kitchen",
        },
      ];
    });
    setSearch("");
    setResults([]);
  };

  const removeSelected = (menuItemId: number) => {
    setSelected(prev => prev.filter(i => i.menu_item_id !== menuItemId));
  };

  const handleAddToKOT = async () => {
    if (selected.length === 0) return;
    setLoading(true);
    try {
      await api("POST", `/api/restaurant/kot/orders/${orderId}/items`, { items: selected });
      toast({ title: "Items Added", description: `${selected.length} item(s) added to KOT` });
      onAdded();
    } catch {
      toast({ title: "Error", description: "Failed to add items", variant: "destructive" });
    }
    setLoading(false);
  };

  return (
    <div className="border border-blue-200 rounded-lg p-3 bg-blue-50 mt-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-blue-800">Add Items to KOT</span>
        <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={onCancel}>
          ✕
        </Button>
      </div>
      <Input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search menu items..."
        className="h-7 text-sm mb-2"
      />
      {results.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-md shadow-sm mb-2 max-h-36 overflow-y-auto">
          {results.map(item => (
            <button
              key={item.id}
              className="w-full text-left px-3 py-1.5 hover:bg-gray-50 text-sm flex justify-between items-center border-b last:border-0"
              onClick={() => addItem(item)}
            >
              <span>{item.name}</span>
              <span className="text-gray-500 text-xs">₹{item.price}</span>
            </button>
          ))}
        </div>
      )}
      {selected.length > 0 && (
        <div className="space-y-1 mb-2">
          {selected.map(item => (
            <div key={item.menu_item_id} className="flex items-center justify-between bg-white rounded px-2 py-1 text-xs border border-gray-200">
              <span className="font-medium">{item.item_name}</span>
              <div className="flex items-center gap-2">
                <span className="text-gray-500">×{item.quantity}</span>
                <span>₹{(item.rate * item.quantity).toFixed(2)}</span>
                <button
                  className="text-red-500 hover:text-red-700"
                  onClick={() => removeSelected(item.menu_item_id)}
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <Button
          size="sm"
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs"
          onClick={handleAddToKOT}
          disabled={loading || selected.length === 0}
        >
          {loading ? "Adding..." : `Add to KOT (${selected.length})`}
        </Button>
        <Button size="sm" variant="outline" className="text-xs" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

// Expanded order detail panel
function OrderDetailPanel({
  order,
  onRefresh,
}: {
  order: KotOrder;
  onRefresh: () => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [detail, setDetail] = useState<KotOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddItems, setShowAddItems] = useState(false);

  const loadDetail = async () => {
    setLoading(true);
    try {
      const data = await api("GET", `/api/restaurant/kot/orders/${order.id}`);
      setDetail(data);
    } catch {
      toast({ title: "Error", description: "Failed to load order detail", variant: "destructive" });
    }
    setLoading(false);
  };

  useEffect(() => {
    loadDetail();
  }, [order.id]);

  const updateItemKitchenStatus = async (itemId: number, status: string) => {
    await api("PUT", `/api/restaurant/kot/orders/${order.id}/items/${itemId}/status`, {
      kitchen_status: status,
    });
    loadDetail();
    onRefresh();
  };

  if (loading) {
    return (
      <div className="py-6 text-center text-gray-500 text-sm">Loading order detail...</div>
    );
  }

  if (!detail) return null;

  const activeItems = detail.items?.filter(i => !i.is_void) || [];
  const voidedItems = detail.items?.filter(i => i.is_void) || [];

  return (
    <div className="bg-gray-50 border-t border-gray-200 p-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Items table */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold text-gray-700 text-sm">Order Items</h4>
            {detail.status !== "paid" && detail.status !== "cancelled" && (
              <Button
                size="sm"
                variant="outline"
                className="text-xs h-7 border-blue-300 text-blue-600"
                onClick={() => setShowAddItems(v => !v)}
              >
                + Add Items
              </Button>
            )}
          </div>
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-100 text-gray-600">
                  <th className="text-left px-3 py-2 font-medium">Item</th>
                  <th className="text-center px-2 py-2 font-medium">Qty</th>
                  <th className="text-right px-2 py-2 font-medium">Rate</th>
                  <th className="text-right px-2 py-2 font-medium">Amt</th>
                  <th className="text-center px-2 py-2 font-medium">Course</th>
                  <th className="text-center px-2 py-2 font-medium">Kitchen</th>
                  <th className="text-center px-2 py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {activeItems.map(item => (
                  <tr key={item.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-3 py-2 font-medium text-gray-800">
                      {item.item_name}
                      {item.special_instructions && (
                        <div className="text-yellow-600 text-xs italic">⚠ {item.special_instructions}</div>
                      )}
                    </td>
                    <td className="px-2 py-2 text-center">{item.quantity}</td>
                    <td className="px-2 py-2 text-right">₹{fmt(item.rate)}</td>
                    <td className="px-2 py-2 text-right">₹{fmt(item.amount)}</td>
                    <td className="px-2 py-2 text-center">
                      <span className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">{item.course}</span>
                    </td>
                    <td className="px-2 py-2 text-center">
                      {detail.status !== "paid" && detail.status !== "cancelled" ? (
                        <select
                          value={item.kitchen_status}
                          onChange={e => updateItemKitchenStatus(item.id, e.target.value)}
                          className={`text-xs border rounded px-1 py-0.5 ${kitchenStatusColors[item.kitchen_status] || ""}`}
                        >
                          {["pending", "cooking", "ready", "served"].map(s => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span
                          className={`text-xs px-1.5 py-0.5 rounded border ${kitchenStatusColors[item.kitchen_status] || ""}`}
                        >
                          {item.kitchen_status}
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-2 text-center">
                      <VoidItemRow
                        orderId={order.id}
                        item={item}
                        onVoided={() => { loadDetail(); onRefresh(); }}
                      />
                    </td>
                  </tr>
                ))}
                {voidedItems.map(item => (
                  <tr key={item.id} className="border-t border-gray-100 opacity-50 bg-red-50">
                    <td className="px-3 py-2 line-through text-red-500">
                      {item.item_name}
                    </td>
                    <td className="px-2 py-2 text-center line-through text-red-400">{item.quantity}</td>
                    <td className="px-2 py-2 text-right line-through text-red-400">₹{fmt(item.rate)}</td>
                    <td className="px-2 py-2 text-right line-through text-red-400">₹{fmt(item.amount)}</td>
                    <td className="px-2 py-2 text-center">
                      <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded">VOID</span>
                    </td>
                    <td className="px-2 py-2 text-center">—</td>
                    <td className="px-2 py-2 text-center text-xs text-red-400 italic">
                      {item.void_reason || "Voided"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {showAddItems && (
            <AddItemsPanel
              orderId={order.id}
              onAdded={() => { loadDetail(); onRefresh(); setShowAddItems(false); }}
              onCancel={() => setShowAddItems(false)}
            />
          )}
        </div>

        {/* Bill summary + info */}
        <div className="space-y-3">
          {/* Complimentary badge */}
          {detail.is_complimentary ? (
            <div className="bg-purple-50 border border-purple-200 rounded-lg px-3 py-2">
              <span className="text-purple-700 font-semibold text-sm">NC</span>
              <span className="text-purple-600 text-xs ml-2">— {detail.nc_reason}</span>
            </div>
          ) : null}

          {/* Bill summary */}
          <div className="bg-white border border-gray-200 rounded-lg p-3">
            <h4 className="font-semibold text-gray-700 text-sm mb-2">Bill Summary</h4>
            <div className="space-y-1">
              {[
                { label: "Subtotal", value: fmt(detail.subtotal) },
                { label: "GST", value: fmt(detail.gst_amount) },
                { label: "Service Charge", value: fmt(detail.service_charge) },
              ].map(row => (
                <div key={row.label} className="flex justify-between text-xs text-gray-600">
                  <span>{row.label}</span>
                  <span>₹{row.value}</span>
                </div>
              ))}
              <div className="border-t border-gray-200 pt-1 flex justify-between text-sm font-bold text-gray-800">
                <span>Grand Total</span>
                <span>₹{fmt(detail.grand_total)}</span>
              </div>
            </div>
          </div>

          {/* Payment info */}
          <div className="bg-white border border-gray-200 rounded-lg p-3">
            <h4 className="font-semibold text-gray-700 text-sm mb-2">Payment</h4>
            <div className="space-y-1 text-xs text-gray-600">
              <div className="flex justify-between">
                <span>Status</span>
                <StatusBadge status={detail.payment_status || detail.status} />
              </div>
              {detail.payment_mode && (
                <div className="flex justify-between">
                  <span>Mode</span>
                  <span className="capitalize">{detail.payment_mode}</span>
                </div>
              )}
              {detail.cashier_name && (
                <div className="flex justify-between">
                  <span>Cashier</span>
                  <span>{detail.cashier_name}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RestaurantOrdersPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [date, setDate] = useState(todayDate());
  const [statusFilter, setStatusFilter] = useState("all");
  const [orderTypeFilter, setOrderTypeFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [compOrderId, setCompOrderId] = useState<number | null>(null);
  const [compReason, setCompReason] = useState("");
  const [showCompInput, setShowCompInput] = useState<number | null>(null);

  // Build query string
  const params = new URLSearchParams({ date });
  if (statusFilter !== "all") params.set("status", statusFilter);
  if (orderTypeFilter !== "all") params.set("order_type", orderTypeFilter);
  if (search.trim()) params.set("search", search.trim());

  const {
    data: orders = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["restaurant-orders", date, statusFilter, orderTypeFilter, search],
    queryFn: () => api("GET", `/api/restaurant/kot/orders?${params.toString()}`),
    refetchInterval: 30000,
  });

  const ordersArr: KotOrder[] = Array.isArray(orders) ? orders : [];

  // Summary stats
  const totalOrders = ordersArr.length;
  const totalRevenue = ordersArr
    .filter(o => o.status === "paid")
    .reduce((s, o) => s + (o.grand_total || 0), 0);
  const openOrders = ordersArr.filter(o => !["paid", "cancelled"].includes(o.status)).length;
  const paidOrders = ordersArr.filter(o => o.status === "paid").length;

  const handleVoidAll = async (order: KotOrder) => {
    if (!confirm(`Void entire KOT ${order.kot_number}? This cannot be undone.`)) return;
    try {
      await api("DELETE", `/api/restaurant/kot/orders/${order.id}`, { void_reason: "Management decision" });
      toast({ title: "KOT Voided", description: `KOT ${order.kot_number} has been voided` });
      refetch();
    } catch {
      toast({ title: "Error", description: "Failed to void order", variant: "destructive" });
    }
  };

  const handleMarkComplimentary = async (orderId: number) => {
    if (!compReason.trim()) {
      toast({ title: "Reason required", description: "Please enter an NC reason", variant: "destructive" });
      return;
    }
    try {
      await api("POST", `/api/restaurant/kot/orders/${orderId}/complimentary`, { nc_reason: compReason });
      toast({ title: "Marked NC", description: "Order marked as complimentary" });
      setShowCompInput(null);
      setCompReason("");
      refetch();
    } catch {
      toast({ title: "Error", description: "Failed to mark complimentary", variant: "destructive" });
    }
  };

  const toggleRow = (orderId: number) => {
    setSelectedOrderId(prev => (prev === orderId ? null : orderId));
  };

  return (
    <div className="p-4 md:p-6 bg-gray-50 min-h-screen">
      {/* Page title */}
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-gray-900">Orders & KOT Management</h1>
        <p className="text-gray-500 text-sm mt-0.5">Full order history, kitchen tracking, and billing</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Orders Today", value: totalOrders, color: "text-gray-800", icon: "📋" },
          { label: "Total Revenue", value: `₹${fmt(totalRevenue)}`, color: "text-green-700", icon: "💰" },
          { label: "Open Orders", value: openOrders, color: "text-orange-700", icon: "🔓" },
          { label: "Paid Orders", value: paidOrders, color: "text-blue-700", icon: "✅" },
        ].map(stat => (
          <Card key={stat.label} className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="text-2xl mb-1">{stat.icon}</div>
              <div className={`text-xl font-bold ${stat.color}`}>{stat.value}</div>
              <div className="text-gray-500 text-xs mt-0.5">{stat.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-sm mb-5">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600 whitespace-nowrap">Date</label>
              <Input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="h-8 text-sm w-36"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-8 text-sm w-36">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="cooking">Cooking</SelectItem>
                <SelectItem value="ready">Ready</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={orderTypeFilter} onValueChange={setOrderTypeFilter}>
              <SelectTrigger className="h-8 text-sm w-36">
                <SelectValue placeholder="Order Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="dine_in">Dine In</SelectItem>
                <SelectItem value="takeaway">Takeaway</SelectItem>
                <SelectItem value="delivery">Delivery</SelectItem>
                <SelectItem value="qr_order">QR Order</SelectItem>
              </SelectContent>
            </Select>
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search KOT#..."
              className="h-8 text-sm w-40"
            />
            <Button
              size="sm"
              className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => refetch()}
            >
              🔍 Filter
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs"
              onClick={() => {
                setDate(todayDate());
                setStatusFilter("all");
                setOrderTypeFilter("all");
                setSearch("");
              }}
            >
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Orders table */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-12 text-center text-gray-500">Loading orders...</div>
          ) : ordersArr.length === 0 ? (
            <div className="py-12 text-center text-gray-400">
              <div className="text-4xl mb-3">📋</div>
              <div>No orders found for selected filters</div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    {[
                      "KOT#",
                      "Table",
                      "Type",
                      "Covers",
                      "Items",
                      "Status",
                      "Subtotal",
                      "GST",
                      "Grand Total",
                      "Cashier",
                      "Time",
                      "Actions",
                    ].map(h => (
                      <th
                        key={h}
                        className="text-left px-3 py-2.5 text-xs font-semibold text-gray-600 whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ordersArr.map(order => (
                    <>
                      <tr
                        key={order.id}
                        className={`border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors ${
                          selectedOrderId === order.id ? "bg-blue-50" : ""
                        }`}
                        onClick={() => toggleRow(order.id)}
                      >
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-gray-400">
                              {selectedOrderId === order.id ? "▼" : "▶"}
                            </span>
                            <span className="font-mono font-semibold text-blue-700">
                              #{order.kot_number}
                            </span>
                            {order.is_complimentary ? (
                              <span className="text-xs bg-purple-100 text-purple-700 px-1 rounded">NC</span>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-gray-700">
                          {order.table_number || "—"}
                        </td>
                        <td className="px-3 py-2.5">
                          <OrderTypeBadge type={order.order_type} />
                        </td>
                        <td className="px-3 py-2.5 text-center text-gray-600">
                          {order.covers || "—"}
                        </td>
                        <td className="px-3 py-2.5 text-center text-gray-600">
                          {order.items?.filter(i => !i.is_void).length ?? 0}
                        </td>
                        <td className="px-3 py-2.5">
                          <StatusBadge status={order.status} />
                        </td>
                        <td className="px-3 py-2.5 text-right text-gray-700">
                          ₹{fmt(order.subtotal)}
                        </td>
                        <td className="px-3 py-2.5 text-right text-gray-700">
                          ₹{fmt(order.gst_amount)}
                        </td>
                        <td className="px-3 py-2.5 text-right font-semibold text-gray-800">
                          ₹{fmt(order.grand_total)}
                        </td>
                        <td className="px-3 py-2.5 text-gray-600 text-xs">
                          {order.cashier_name || "—"}
                        </td>
                        <td className="px-3 py-2.5 text-gray-600 text-xs whitespace-nowrap">
                          {formatTime(order.created_at)}
                        </td>
                        <td
                          className="px-3 py-2.5"
                          onClick={e => e.stopPropagation()}
                        >
                          <div className="flex items-center gap-1 flex-wrap">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-6 text-xs px-2"
                              onClick={() => toggleRow(order.id)}
                            >
                              {selectedOrderId === order.id ? "Close" : "View"}
                            </Button>
                            {!["paid", "cancelled"].includes(order.status) && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-6 text-xs px-2 border-red-300 text-red-600 hover:bg-red-50"
                                  onClick={() => handleVoidAll(order)}
                                >
                                  Void All
                                </Button>
                                {!order.is_complimentary && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-6 text-xs px-2 border-purple-300 text-purple-600 hover:bg-purple-50"
                                    onClick={() =>
                                      setShowCompInput(prev => (prev === order.id ? null : order.id))
                                    }
                                  >
                                    NC
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-6 text-xs px-2 border-gray-300 text-gray-600 hover:bg-gray-50"
                                  onClick={() =>
                                    toast({
                                      title: "Feature Coming Soon",
                                      description: "Split bill feature is not yet available",
                                    })
                                  }
                                >
                                  Split
                                </Button>
                              </>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-6 text-xs px-2 border-gray-300"
                              onClick={() =>
                                toast({ title: "Print KOT", description: `Sending KOT ${order.kot_number} to printer...` })
                              }
                            >
                              🖨 Print
                            </Button>
                          </div>

                          {/* Complimentary inline input */}
                          {showCompInput === order.id && (
                            <div
                              className="flex items-center gap-1 mt-1.5"
                              onClick={e => e.stopPropagation()}
                            >
                              <Input
                                value={compReason}
                                onChange={e => setCompReason(e.target.value)}
                                placeholder="NC reason..."
                                className="h-6 text-xs w-28"
                              />
                              <Button
                                size="sm"
                                className="h-6 text-xs px-2 bg-purple-600 hover:bg-purple-700 text-white"
                                onClick={() => handleMarkComplimentary(order.id)}
                              >
                                OK
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 text-xs px-1"
                                onClick={() => setShowCompInput(null)}
                              >
                                ✕
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>

                      {/* Expanded detail row */}
                      {selectedOrderId === order.id && (
                        <tr key={`detail-${order.id}`} className="bg-white">
                          <td colSpan={12} className="p-0">
                            <OrderDetailPanel
                              order={order}
                              onRefresh={refetch}
                            />
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Footer count */}
      {ordersArr.length > 0 && (
        <div className="text-xs text-gray-400 text-right mt-2 px-1">
          Showing {ordersArr.length} order{ordersArr.length !== 1 ? "s" : ""}
        </div>
      )}
    </div>
  );
}
