import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const api = (m: string, u: string, b?: any) =>
  fetch(u, { method: m, headers: { "Content-Type": "application/json" }, body: b ? JSON.stringify(b) : undefined, credentials: "include" }).then(r => r.json());

type KitchenStation = "all" | "hot_kitchen" | "cold_kitchen" | "bar" | "bakery";

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
  fired_at?: string;
  ready_at?: string;
  served_at?: string;
  is_void: number;
}

interface KotOrder {
  id: number;
  kot_number: string;
  table_number?: string;
  order_type: string;
  covers: number;
  status: string;
  created_at: string;
  items: KotItem[];
}

const stationLabels: Record<KitchenStation, string> = {
  all: "All",
  hot_kitchen: "Hot Kitchen",
  cold_kitchen: "Cold Kitchen",
  bar: "Bar",
  bakery: "Bakery",
};

const courseColors: Record<string, string> = {
  starter: "bg-purple-100 text-purple-700 border-purple-200",
  main: "bg-blue-100 text-blue-700 border-blue-200",
  dessert: "bg-pink-100 text-pink-700 border-pink-200",
  default: "bg-gray-100 text-gray-700 border-gray-200",
};

const kitchenStatusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  cooking: "bg-blue-100 text-blue-800 border-blue-200",
  ready: "bg-green-100 text-green-800 border-green-200",
  served: "bg-gray-100 text-gray-600 border-gray-200",
};

const urgencyBorder: Record<string, string> = {
  green: "border-green-400",
  yellow: "border-yellow-400",
  red: "border-red-500",
};

const urgencyHeader: Record<string, string> = {
  green: "bg-green-50",
  yellow: "bg-yellow-50",
  red: "bg-red-50",
};

function getUrgency(createdAt: string): "green" | "yellow" | "red" {
  const elapsed = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
  if (elapsed < 5) return "green";
  if (elapsed < 10) return "yellow";
  return "red";
}

function getElapsedMinutes(createdAt: string): number {
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
}

function getCookingElapsed(firedAt?: string): string {
  if (!firedAt) return "";
  const mins = Math.floor((Date.now() - new Date(firedAt).getTime()) / 60000);
  const secs = Math.floor((Date.now() - new Date(firedAt).getTime()) / 1000) % 60;
  return `${mins}m ${secs}s`;
}

function getOrderTypeBadge(orderType: string): string {
  const map: Record<string, string> = {
    dine_in: "bg-indigo-100 text-indigo-700",
    takeaway: "bg-orange-100 text-orange-700",
    delivery: "bg-cyan-100 text-cyan-700",
    qr_order: "bg-purple-100 text-purple-700",
  };
  return map[orderType] || "bg-gray-100 text-gray-700";
}

function getOrderTypeLabel(orderType: string): string {
  const map: Record<string, string> = {
    dine_in: "Dine In",
    takeaway: "Takeaway",
    delivery: "Delivery",
    qr_order: "QR Order",
  };
  return map[orderType] || orderType;
}

function playBeep() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    osc.frequency.value = 880;
    gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  } catch {}
}

export default function RestaurantKitchenPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedStation, setSelectedStation] = useState<KitchenStation>("all");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [orders, setOrders] = useState<KotOrder[]>([]);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [secondsSinceUpdate, setSecondsSinceUpdate] = useState(0);
  const [tick, setTick] = useState(0);

  const previousOrderIds = useRef<Set<string>>(new Set());

  // Poll for orders every 5 seconds
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const data = await api("GET", "/api/restaurant/kot/orders/kitchen");
        if (Array.isArray(data)) {
          const newIds = new Set(data.map((o: any) => String(o.id)));
          const hasNew = data.some((o: any) => !previousOrderIds.current.has(String(o.id)));
          if (hasNew && soundEnabled && previousOrderIds.current.size > 0) {
            playBeep();
          }
          previousOrderIds.current = newIds;
          setOrders(data);
          setLastUpdated(new Date());
          setSecondsSinceUpdate(0);
        }
      } catch (e) {
        // silently fail, keep showing existing orders
      }
    };

    fetchOrders();
    const interval = setInterval(fetchOrders, 5000);
    return () => clearInterval(interval);
  }, [soundEnabled]);

  // Update "seconds since" counter every second
  useEffect(() => {
    const t = setInterval(() => {
      setSecondsSinceUpdate(s => s + 1);
      setTick(t => t + 1); // force re-render for elapsed times
    }, 1000);
    return () => clearInterval(t);
  }, []);

  // Mutation to update item status
  const updateItemStatus = async (
    orderId: number,
    itemId: number,
    currentStatus: string
  ) => {
    const nextStatus: Record<string, string> = {
      pending: "cooking",
      cooking: "ready",
      ready: "served",
    };
    const next = nextStatus[currentStatus];
    if (!next) return;

    const body: any = { kitchen_status: next };
    if (currentStatus === "pending") body.fired_at = new Date().toISOString();
    if (currentStatus === "cooking") body.ready_at = new Date().toISOString();
    if (currentStatus === "ready") body.served_at = new Date().toISOString();

    try {
      await api("PUT", `/api/restaurant/kot/orders/${orderId}/items/${itemId}/status`, body);
      // Optimistically update local state
      setOrders(prev =>
        prev.map(o =>
          o.id === orderId
            ? {
                ...o,
                items: o.items.map(item =>
                  item.id === itemId ? { ...item, kitchen_status: next, ...body } : item
                ),
              }
            : o
        )
      );
    } catch {
      toast({ title: "Error", description: "Failed to update item status", variant: "destructive" });
    }
  };

  // Mark all cooking items as ready
  const markAllReady = async (order: KotOrder) => {
    const cookingItems = order.items.filter(i => i.kitchen_status === "cooking" && !i.is_void);
    await Promise.all(
      cookingItems.map(item =>
        api("PUT", `/api/restaurant/kot/orders/${order.id}/items/${item.id}/status`, {
          kitchen_status: "ready",
          ready_at: new Date().toISOString(),
        })
      )
    );
    setOrders(prev =>
      prev.map(o =>
        o.id === order.id
          ? {
              ...o,
              items: o.items.map(item =>
                item.kitchen_status === "cooking" && !item.is_void
                  ? { ...item, kitchen_status: "ready", ready_at: new Date().toISOString() }
                  : item
              ),
            }
          : o
      )
    );
    toast({ title: "Marked Ready", description: `All items in KOT ${order.kot_number} marked as ready` });
  };

  // Mark all items as served
  const markAllServed = async (order: KotOrder) => {
    const readyItems = order.items.filter(i => i.kitchen_status === "ready" && !i.is_void);
    await Promise.all(
      readyItems.map(item =>
        api("PUT", `/api/restaurant/kot/orders/${order.id}/items/${item.id}/status`, {
          kitchen_status: "served",
          served_at: new Date().toISOString(),
        })
      )
    );
    setOrders(prev =>
      prev.map(o =>
        o.id === order.id
          ? {
              ...o,
              items: o.items.map(item =>
                item.kitchen_status === "ready" && !item.is_void
                  ? { ...item, kitchen_status: "served", served_at: new Date().toISOString() }
                  : item
              ),
            }
          : o
      )
    );
    toast({ title: "All Served", description: `KOT ${order.kot_number} fully served` });
  };

  // Filter orders by station
  const filteredOrders = orders
    .filter(order => {
      if (selectedStation === "all") return true;
      return order.items.some(
        item => item.kitchen_station === selectedStation && !item.is_void
      );
    })
    .filter(order => order.status !== "paid" && order.status !== "cancelled");

  // Stats
  const totalActive = filteredOrders.length;
  const allActiveItems = filteredOrders.flatMap(o =>
    o.items.filter(i => !i.is_void)
  );
  const itemsPending = allActiveItems.filter(i => i.kitchen_status === "pending").length;
  const itemsCooking = allActiveItems.filter(i => i.kitchen_status === "cooking").length;
  const avgPrepMinutes =
    filteredOrders.length > 0
      ? Math.round(
          filteredOrders.reduce((sum, o) => sum + getElapsedMinutes(o.created_at), 0) /
            filteredOrders.length
        )
      : 0;

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4">
      {/* Header */}
      <div className="mb-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              🍳 Kitchen Display System
            </h1>
            <p className="text-gray-400 text-sm mt-0.5">
              Last updated:{" "}
              <span className={secondsSinceUpdate > 8 ? "text-red-400" : "text-green-400"}>
                {secondsSinceUpdate}s ago
              </span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              className={`border ${soundEnabled ? "border-green-500 text-green-400 bg-green-950" : "border-gray-600 text-gray-400 bg-gray-900"}`}
              onClick={() => setSoundEnabled(s => !s)}
            >
              {soundEnabled ? "🔔 Sound On" : "🔕 Sound Off"}
            </Button>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          {[
            { label: "Active Orders", value: totalActive, color: "text-blue-400" },
            { label: "Avg Prep Time", value: `${avgPrepMinutes}m`, color: "text-yellow-400" },
            { label: "Items Pending", value: itemsPending, color: "text-orange-400" },
            { label: "Items Cooking", value: itemsCooking, color: "text-purple-400" },
          ].map(stat => (
            <div
              key={stat.label}
              className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-3"
            >
              <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
              <div className="text-gray-500 text-xs mt-0.5">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Station Tabs */}
        <div className="flex gap-2 flex-wrap">
          {(Object.keys(stationLabels) as KitchenStation[]).map(station => (
            <button
              key={station}
              onClick={() => setSelectedStation(station)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                selectedStation === station
                  ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20"
                  : "bg-gray-800 text-gray-400 hover:bg-gray-700"
              }`}
            >
              {stationLabels[station]}
            </button>
          ))}
        </div>
      </div>

      {/* Order Cards */}
      {filteredOrders.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-gray-500">
          <div className="text-6xl mb-4 animate-bounce">🍽️</div>
          <div className="text-xl font-medium text-gray-400">Waiting for orders...</div>
          <div className="text-sm text-gray-600 mt-2">
            Orders will appear here automatically
          </div>
          <div className="mt-6 flex items-center gap-2 text-gray-600 text-sm">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            Kitchen display is live
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOrders.map(order => {
            const urgency = getUrgency(order.created_at);
            const elapsed = getElapsedMinutes(order.created_at);
            const visibleItems =
              selectedStation === "all"
                ? order.items.filter(i => !i.is_void)
                : order.items.filter(
                    i => i.kitchen_station === selectedStation && !i.is_void
                  );
            const hasAnyCooking = visibleItems.some(i => i.kitchen_status === "cooking");
            const hasAnyPending = visibleItems.some(i => i.kitchen_status === "pending");
            const allReadyOrServed = visibleItems.every(
              i => i.kitchen_status === "ready" || i.kitchen_status === "served"
            );
            const allServed = visibleItems.every(i => i.kitchen_status === "served");

            return (
              <div
                key={order.id}
                className={`rounded-xl border-2 border-l-4 ${urgencyBorder[urgency]} bg-gray-900 overflow-hidden shadow-xl flex flex-col`}
              >
                {/* Card Header */}
                <div className={`px-4 py-3 ${urgencyHeader[urgency]} bg-opacity-10 border-b border-gray-800`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-bold text-lg">
                        {order.table_number ? `Table ${order.table_number}` : "Takeaway"}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${getOrderTypeBadge(order.order_type)}`}
                      >
                        {getOrderTypeLabel(order.order_type)}
                      </span>
                    </div>
                    <span
                      className={`text-sm font-bold px-2 py-1 rounded-lg ${
                        urgency === "red"
                          ? "bg-red-900 text-red-200"
                          : urgency === "yellow"
                          ? "bg-yellow-900 text-yellow-200"
                          : "bg-green-900 text-green-200"
                      }`}
                    >
                      {elapsed}m
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-gray-400 text-xs font-mono">#{order.kot_number}</span>
                    {order.covers > 0 && (
                      <span className="text-gray-500 text-xs">· {order.covers} covers</span>
                    )}
                  </div>
                </div>

                {/* Items */}
                <div className="flex-1 p-3 space-y-2">
                  {visibleItems.map(item => (
                    <div
                      key={item.id}
                      className={`rounded-lg p-3 border ${
                        item.kitchen_status === "served"
                          ? "bg-gray-800/40 border-gray-700/50 opacity-60"
                          : "bg-gray-800 border-gray-700"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-white font-semibold text-sm">
                              {item.quantity}× {item.item_name}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1.5 mt-1.5">
                            {item.course && (
                              <span
                                className={`text-xs px-1.5 py-0.5 rounded border font-medium ${
                                  courseColors[item.course.toLowerCase()] || courseColors.default
                                }`}
                              >
                                {item.course}
                              </span>
                            )}
                            {item.kitchen_station && (
                              <span className="text-xs px-1.5 py-0.5 rounded border bg-gray-700 text-gray-300 border-gray-600">
                                {item.kitchen_station.replace(/_/g, " ")}
                              </span>
                            )}
                          </div>
                          {item.special_instructions && (
                            <p className="text-yellow-400 text-xs italic mt-1.5">
                              ⚠ {item.special_instructions}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Status + Action */}
                      <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                        <span
                          className={`text-xs font-bold px-2 py-0.5 rounded border ${
                            kitchenStatusColors[item.kitchen_status] || kitchenStatusColors.pending
                          }`}
                        >
                          {item.kitchen_status?.toUpperCase()}
                        </span>

                        {item.kitchen_status === "cooking" && item.fired_at && (
                          <span className="text-blue-400 text-xs font-mono">
                            ⏱ {getCookingElapsed(item.fired_at)}
                          </span>
                        )}

                        {item.kitchen_status === "pending" && (
                          <Button
                            size="sm"
                            className="h-6 text-xs px-2 bg-blue-600 hover:bg-blue-700 text-white"
                            onClick={() => updateItemStatus(order.id, item.id, "pending")}
                          >
                            Start Cooking
                          </Button>
                        )}
                        {item.kitchen_status === "cooking" && (
                          <Button
                            size="sm"
                            className="h-6 text-xs px-2 bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => updateItemStatus(order.id, item.id, "cooking")}
                          >
                            Mark Ready
                          </Button>
                        )}
                        {item.kitchen_status === "ready" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 text-xs px-2 border-gray-600 text-gray-300 hover:bg-gray-700"
                            onClick={() => updateItemStatus(order.id, item.id, "ready")}
                          >
                            Mark Served
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Card Footer */}
                {!allServed && (
                  <div className="px-4 py-3 border-t border-gray-800 flex gap-2">
                    {(hasAnyCooking || hasAnyPending) && !hasAnyPending && (
                      <Button
                        size="sm"
                        className="flex-1 bg-green-700 hover:bg-green-600 text-white text-xs"
                        onClick={() => markAllReady(order)}
                      >
                        ✓ All Ready
                      </Button>
                    )}
                    {hasAnyCooking && !hasAnyPending && (
                      <Button
                        size="sm"
                        className="flex-1 bg-green-700 hover:bg-green-600 text-white text-xs"
                        onClick={() => markAllReady(order)}
                      >
                        ✓ All Ready
                      </Button>
                    )}
                    {allReadyOrServed && !allServed && (
                      <Button
                        size="sm"
                        className="flex-1 bg-gray-600 hover:bg-gray-500 text-white text-xs"
                        onClick={() => markAllServed(order)}
                      >
                        ✓ All Served
                      </Button>
                    )}
                    {!hasAnyCooking && !allReadyOrServed && (
                      <Button
                        size="sm"
                        className="flex-1 bg-blue-700 hover:bg-blue-600 text-white text-xs"
                        onClick={() => {
                          const pendingItems = visibleItems.filter(i => i.kitchen_status === "pending");
                          Promise.all(
                            pendingItems.map(item =>
                              updateItemStatus(order.id, item.id, "pending")
                            )
                          );
                        }}
                      >
                        🔥 Fire All
                      </Button>
                    )}
                  </div>
                )}
                {allServed && (
                  <div className="px-4 py-2 border-t border-gray-800 text-center text-green-500 text-xs font-medium">
                    ✓ Order Complete
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
