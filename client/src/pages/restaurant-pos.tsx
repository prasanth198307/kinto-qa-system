import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useTenantConfig } from "@/hooks/use-tenant-config";
import { generateReceiptHTML, printReceipt, printToNetworkPrinter } from "@/lib/print-utils";

const api = (m: string, u: string, b?: any) =>
  fetch(u, { method: m, headers: { "Content-Type": "application/json" }, body: b ? JSON.stringify(b) : undefined, credentials: "include" }).then(r => r.json());
const fmt = (n: any) => "₹" + Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

type CartItem = {
  id: number;
  name: string;
  price: number;
  qty: number;
  instructions: string;
  course: string;
  showInstructions: boolean;
};

function elapsed(since: string | null): string {
  if (!since) return "";
  const mins = Math.floor((Date.now() - new Date(since).getTime()) / 60000);
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

export default function RestaurantPOSPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const tenantConfig = useTenantConfig();

  const [selectedOutlet, setSelectedOutlet] = useState<any>(null);
  const [selectedTable, setSelectedTable] = useState<any>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderType, setOrderType] = useState("dine_in");
  const [covers, setCovers] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [customer, setCustomer] = useState<any>(null);
  const [phoneInput, setPhoneInput] = useState("");
  const [activeKotId, setActiveKotId] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMode, setPaymentMode] = useState("cash");
  const [cashAmount, setCashAmount] = useState(0);
  const [upiRef, setUpiRef] = useState("");
  const [cardLast4, setCardLast4] = useState("");
  const [cardType, setCardType] = useState("visa");
  const [splitCash, setSplitCash] = useState(0);
  const [splitUpi, setSplitUpi] = useState(0);
  const [splitCard, setSplitCard] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState<"flat" | "pct">("flat");
  const [promoCode, setPromoCode] = useState("");
  const [promoApplied, setPromoApplied] = useState<{ promo_code: string; promo_name: string; discount_amount: number } | null>(null);
  const [promoLoading, setPromoLoading] = useState(false);
  const [billData, setBillData] = useState<any>(null);
  const [redeemPoints, setRedeemPoints] = useState(false);
  const [complimentaryReason, setComplimentaryReason] = useState("");
  const [showCompModal, setShowCompModal] = useState(false);
  const [customerOpen, setCustomerOpen] = useState(false);

  // Credit billing state
  const [creditCustomerName, setCreditCustomerName] = useState("");
  const [creditAccount, setCreditAccount] = useState("");
  const [creditDueDate, setCreditDueDate] = useState("");
  const [creditNotes, setCreditNotes] = useState("");
  const [gcNumber, setGcNumber] = useState("");
  const [gcData, setGcData] = useState<any>(null);
  const [gcCheckLoading, setGcCheckLoading] = useState(false);
  const [gcRedeemAmount, setGcRedeemAmount] = useState(0);

  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (searchRef.current) clearTimeout(searchRef.current);
    searchRef.current = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => { if (searchRef.current) clearTimeout(searchRef.current); };
  }, [searchTerm]);

  const { data: outlets = [] } = useQuery<any[]>({
    queryKey: ["/api/restaurant/outlets"],
    queryFn: () => api("GET", "/api/restaurant/outlets"),
  });

  const { data: tables = [], refetch: refetchTables } = useQuery<any[]>({
    queryKey: ["/api/restaurant/tables", selectedOutlet?.id],
    queryFn: () => api("GET", `/api/restaurant/tables${selectedOutlet?.id ? `?outlet_id=${selectedOutlet.id}` : ""}`),
    refetchInterval: 10000,
  });

  const { data: stats } = useQuery<any>({
    queryKey: ["/api/restaurant/stats", selectedOutlet?.id],
    queryFn: () => api("GET", `/api/restaurant/stats${selectedOutlet?.id ? `?outlet_id=${selectedOutlet.id}` : ""}`),
    refetchInterval: 30000,
  });

  const { data: categories = [] } = useQuery<any[]>({
    queryKey: ["/api/restaurant/menu-categories"],
    queryFn: () => api("GET", "/api/restaurant/menu-categories"),
  });

  const { data: allMenuItems = [] } = useQuery<any[]>({
    queryKey: ["/api/restaurant/menu-items"],
    queryFn: () => api("GET", "/api/restaurant/menu-items"),
  });

  const { data: searchResults = [] } = useQuery<any[]>({
    queryKey: ["/api/restaurant/menu-items/search", debouncedSearch],
    queryFn: () => api("GET", `/api/restaurant/menu-items/search?q=${encodeURIComponent(debouncedSearch)}`),
    enabled: debouncedSearch.length > 1,
  });

  useEffect(() => {
    if (outlets.length > 0 && !selectedOutlet) {
      setSelectedOutlet(outlets[0]);
    }
  }, [outlets]);

  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const gst = Math.round(subtotal * 0.05 * 100) / 100;
  const serviceCharge = selectedOutlet?.is_service_charge_enabled
    ? Math.round(subtotal * (selectedOutlet.service_charge_pct || 0) / 100 * 100) / 100
    : 0;
  const discountAmount = discountType === "pct"
    ? Math.round(subtotal * discount / 100 * 100) / 100
    : discount;
  const loyaltyDiscount = redeemPoints && customer?.points ? Math.min(customer.points / 10, subtotal * 0.1) : 0;
  const promoDiscount = promoApplied?.discount_amount ?? 0;
  const grandTotal = Math.max(0, subtotal + gst + serviceCharge - discountAmount - loyaltyDiscount - promoDiscount);
  const change = cashAmount - grandTotal;

  const displayItems: any[] = debouncedSearch.length > 1
    ? searchResults
    : selectedCategory === "all"
      ? allMenuItems
      : allMenuItems.filter((item: any) => String(item.category_id) === selectedCategory);

  const addToCart = (item: any) => {
    setCart(prev => {
      const existing = prev.find(c => c.id === item.id);
      if (existing) {
        return prev.map(c => c.id === item.id ? { ...c, qty: c.qty + 1 } : c);
      }
      return [...prev, { id: item.id, name: item.name, price: Number(item.price), qty: 1, instructions: "", course: "main", showInstructions: false }];
    });
  };

  const updateQty = (id: number, delta: number) => {
    setCart(prev => prev.map(c => c.id === id ? { ...c, qty: Math.max(0, c.qty + delta) } : c).filter(c => c.qty > 0));
  };

  const removeFromCart = (id: number) => {
    setCart(prev => prev.filter(c => c.id !== id));
  };

  const updateItem = (id: number, field: keyof CartItem, value: any) => {
    setCart(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const cartQty = (itemId: number) => cart.find(c => c.id === itemId)?.qty || 0;

  const clearTable = () => {
    setSelectedTable(null);
    setCart([]);
    setCustomer(null);
    setPhoneInput("");
    setActiveKotId(null);
    setDiscount(0);
    setShowPaymentModal(false);
    setBillData(null);
    setRedeemPoints(false);
    setOrderType("dine_in");
    setCovers(1);
    setCustomerOpen(false);
    setCreditCustomerName("");
    setCreditAccount("");
    setCreditDueDate("");
    setCreditNotes("");
    setGcNumber("");
    setGcData(null);
    setGcRedeemAmount(0);
    setPromoCode("");
    setPromoApplied(null);
  };

  const applyPromo = async () => {
    if (!promoCode.trim()) return;
    setPromoLoading(true);
    try {
      const result = await api("POST", "/api/restaurant/pos/apply-promo", { promo_code: promoCode.trim(), subtotal });
      if (result?.valid) {
        setPromoApplied({ promo_code: result.promo_code, promo_name: result.promo_name, discount_amount: result.discount_amount });
      } else {
        setPromoApplied(null);
        alert(result?.message ?? "Invalid promo code");
      }
    } catch { alert("Failed to apply promo code"); }
    finally { setPromoLoading(false); }
  };

  const lookupCustomer = async () => {
    if (!phoneInput) return;
    try {
      const result = await api("GET", `/api/restaurant/customers/lookup/${phoneInput}`);
      if (result?.id) {
        setCustomer(result);
        toast({ title: "Customer found", description: `${result.name} — ${result.loyalty_tier || "Standard"}` });
      } else {
        setCustomer(null);
        toast({ title: "Not found", description: "No customer with this phone", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Lookup failed", variant: "destructive" });
    }
  };

  const loadActiveKot = async (table: any) => {
    try {
      const result = await api("GET", `/api/restaurant/kot/orders/active?table_id=${table.id}`);
      if (result?.id) {
        setActiveKotId(String(result.id));
        if (result.items && Array.isArray(result.items)) {
          setCart(result.items.map((i: any) => ({
            id: i.menu_item_id,
            name: i.name || i.menu_item_name || "",
            price: Number(i.rate || i.price || 0),
            qty: Number(i.quantity),
            instructions: i.special_instructions || "",
            course: i.course || "main",
            showInstructions: false,
          })));
        }
      }
    } catch {
      // No active KOT
    }
  };

  const handleTableClick = (table: any) => {
    setSelectedTable(table);
    setCart([]);
    setActiveKotId(null);
    setCustomer(null);
    setPhoneInput("");
    setDiscount(0);
    setRedeemPoints(false);
    if (table.status === "occupied") {
      loadActiveKot(table);
    }
  };

  const sendKot = useMutation({
    mutationFn: async () => {
      const payload = {
        table_id: selectedTable.id,
        table_number: selectedTable.table_number,
        order_type: orderType,
        covers,
        items: cart.map(i => ({
          menu_item_id: i.id,
          quantity: i.qty,
          rate: i.price,
          amount: i.qty * i.price,
          special_instructions: i.instructions,
          course: i.course,
        })),
        cashier_name: "Admin",
        outlet_id: selectedOutlet?.id,
        customer_id: customer?.id,
      };
      return api("POST", "/api/restaurant/kot/orders", payload);
    },
    onSuccess: (data) => {
      if (data?.id) {
        setActiveKotId(String(data.id));
        toast({ title: "KOT sent!", description: `KOT #${data.id} sent to kitchen` });
        qc.invalidateQueries({ queryKey: ["/api/restaurant/tables"] });
        refetchTables();
      } else {
        toast({ title: "Error", description: data?.message || "KOT failed", variant: "destructive" });
      }
    },
    onError: () => toast({ title: "Error", description: "Failed to send KOT", variant: "destructive" }),
  });

  const addToKot = useMutation({
    mutationFn: async () => {
      const newItems = cart.map(i => ({
        menu_item_id: i.id,
        quantity: i.qty,
        rate: i.price,
        amount: i.qty * i.price,
        special_instructions: i.instructions,
        course: i.course,
      }));
      return api("POST", `/api/restaurant/kot/orders/${activeKotId}/items`, { items: newItems });
    },
    onSuccess: () => {
      toast({ title: "Items added", description: "Added to existing KOT" });
      refetchTables();
    },
    onError: () => toast({ title: "Error", description: "Failed to add items", variant: "destructive" }),
  });

  const printBill = useMutation({
    mutationFn: async () => api("POST", `/api/restaurant/kot/orders/${activeKotId}/bill`),
    onSuccess: async (data) => {
      setBillData(data);
      setShowPaymentModal(true);
      // Attempt thermal print — fetch printer config for bill station
      try {
        const printerConfig = await fetch("/api/restaurant/printer-config?station=bill", { credentials: "include" }).then(r => r.json());
        const html = generateReceiptHTML(data, tenantConfig);
        if (printerConfig?.connection_type === "network" && printerConfig?.ip_address) {
          await printToNetworkPrinter(printerConfig.ip_address, printerConfig.port ?? 9100, html);
        } else {
          printReceipt(html);
        }
      } catch {
        // Print failed silently — payment modal still opens
      }
    },
    onError: () => toast({ title: "Error", description: "Failed to generate bill", variant: "destructive" }),
  });

  const makeComplimentary = useMutation({
    mutationFn: async () => api("POST", `/api/restaurant/kot/orders/${activeKotId}/complimentary`, { reason: complimentaryReason }),
    onSuccess: () => {
      toast({ title: "Marked complimentary", description: "Order marked as complimentary" });
      setShowCompModal(false);
      clearTable();
      refetchTables();
    },
    onError: () => toast({ title: "Error", description: "Failed to mark complimentary", variant: "destructive" }),
  });

  const completePayment = useMutation({
    mutationFn: async () => {
      if (paymentMode === "gift_card") {
        if (!gcData || gcRedeemAmount <= 0) throw new Error("Please validate a gift card first");
        await api("POST", "/api/restaurant/gift-cards/" + gcNumber + "/redeem", { amount: gcRedeemAmount, kot_order_id: activeKotId });
        return api("POST", "/api/restaurant/kot/orders/" + activeKotId + "/payment", { payment_mode: "gift_card", gift_card_number: gcNumber, gift_card_amount: gcRedeemAmount, grand_total: grandTotal });
      }
      if (paymentMode === "credit") {
        return api("POST", `/api/restaurant/kot/orders/${activeKotId}/credit-bill`, {
          customer_name: creditCustomerName,
          credit_account: creditAccount,
          due_date: creditDueDate,
          notes: creditNotes,
        });
      }
      const paymentPayload: any = {
        payment_mode: paymentMode,
        amount: grandTotal,
        discount: discountAmount,
        loyalty_discount: loyaltyDiscount,
        customer_id: customer?.id,
        redeem_points: redeemPoints,
        promo_code: promoApplied?.promo_code ?? undefined,
        promo_discount: promoApplied?.discount_amount ?? undefined,
      };
      if (paymentMode === "cash") paymentPayload.cash_tendered = cashAmount;
      if (paymentMode === "upi") paymentPayload.upi_reference = upiRef;
      if (paymentMode === "card") { paymentPayload.card_last4 = cardLast4; paymentPayload.card_type = cardType; }
      if (paymentMode === "split") { paymentPayload.split_cash = splitCash; paymentPayload.split_upi = splitUpi; paymentPayload.split_card = splitCard; }
      return api("POST", `/api/restaurant/kot/orders/${activeKotId}/payment`, paymentPayload);
    },
    onSuccess: () => {
      toast({ title: paymentMode === "credit" ? "Credit bill recorded!" : "Payment complete!", description: paymentMode === "credit" ? "Order recorded as credit" : `${fmt(grandTotal)} collected` });
      setShowPaymentModal(false);
      clearTable();
      qc.invalidateQueries({ queryKey: ["/api/restaurant/tables"] });
      qc.invalidateQueries({ queryKey: ["/api/restaurant/stats"] });
      refetchTables();
    },
    onError: () => toast({ title: "Error", description: "Payment failed", variant: "destructive" }),
  });

  const tableColor = (status: string) => {
    if (status === "available") return "bg-green-100 border-green-400 hover:bg-green-200";
    if (status === "occupied") return "bg-red-100 border-red-400 hover:bg-red-200";
    if (status === "reserved") return "bg-yellow-100 border-yellow-400 hover:bg-yellow-200";
    return "bg-gray-100 border-gray-300";
  };

  return (
    <div className="flex h-screen overflow-hidden bg-white">
      {/* LEFT PANEL */}
      <div className="w-2/5 h-full flex flex-col overflow-hidden border-r border-gray-200 bg-gray-50">
        {/* Top bar */}
        <div className="p-3 border-b border-gray-200 bg-white space-y-2">
          <div className="flex items-center gap-2">
            <Select
              value={selectedOutlet?.id?.toString() || ""}
              onValueChange={(val) => {
                const o = outlets.find((x: any) => String(x.id) === val);
                setSelectedOutlet(o || null);
              }}
            >
              <SelectTrigger className="flex-1 h-8 text-sm">
                <SelectValue placeholder="Select outlet" />
              </SelectTrigger>
              <SelectContent>
                {outlets.map((o: any) => (
                  <SelectItem key={o.id} value={String(o.id)}>{o.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {stats && (
            <div className="flex gap-3 text-xs text-gray-600 flex-wrap">
              <span className="font-medium text-green-700">Sales: {fmt(stats.today_sales || 0)}</span>
              <span>Tables: {stats.occupied_tables || 0}/{stats.total_tables || 0}</span>
              <span>KOTs: {stats.kot_count || 0}</span>
              {stats.pending_orders !== undefined && (
                <span className="text-orange-600">Pending: {stats.pending_orders}</span>
              )}
            </div>
          )}
        </div>

        {/* Table grid */}
        <div className="flex-1 overflow-y-auto p-3">
          <div className="grid grid-cols-4 gap-2">
            {tables.map((table: any) => (
              <div
                key={table.id}
                onClick={() => handleTableClick(table)}
                className={`border-2 rounded-lg p-2 cursor-pointer transition-all ${tableColor(table.status)} ${selectedTable?.id === table.id ? "ring-2 ring-blue-500 ring-offset-1" : ""}`}
              >
                <div className="text-lg font-bold text-gray-800 leading-tight">{table.table_number}</div>
                <div className="text-xs text-gray-600">{table.section || ""}</div>
                <div className="text-xs text-gray-500">Cap: {table.capacity}</div>
                {table.status === "occupied" && table.occupied_since && (
                  <div className="text-xs font-medium text-red-700 mt-1">{elapsed(table.occupied_since)}</div>
                )}
                {table.status === "reserved" && (
                  <div className="text-xs text-yellow-700 mt-1">Reserved</div>
                )}
              </div>
            ))}
          </div>
          {tables.length === 0 && (
            <div className="text-center text-gray-400 py-10 text-sm">No tables found</div>
          )}
        </div>

        {/* Legend */}
        <div className="p-3 border-t border-gray-200 bg-white flex gap-3 text-xs">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-green-300 inline-block" />Available
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-red-300 inline-block" />Occupied
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-yellow-300 inline-block" />Reserved
          </span>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="w-3/5 h-full flex flex-col overflow-hidden">
        {!selectedTable ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
            <svg className="w-16 h-16 mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M3 6h18M3 14h18M3 18h18" />
            </svg>
            <p className="text-xl font-medium">&larr; Select a table to start billing</p>
            <p className="text-sm mt-1">Choose a table from the left panel</p>
          </div>
        ) : (
          <div className="flex flex-col h-full overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-3 p-3 border-b border-gray-200 bg-white flex-wrap">
              <Badge className="text-base px-3 py-1 bg-blue-600 text-white">Table {selectedTable.table_number}</Badge>
              <span className="text-sm text-gray-500">{selectedTable.section} &middot; Cap {selectedTable.capacity}</span>
              <Select value={orderType} onValueChange={setOrderType}>
                <SelectTrigger className="w-32 h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dine_in">Dine In</SelectItem>
                  <SelectItem value="takeaway">Takeaway</SelectItem>
                  <SelectItem value="delivery">Delivery</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-500">Covers:</span>
                <Input
                  type="number"
                  min={1}
                  max={20}
                  value={covers}
                  onChange={e => setCovers(Number(e.target.value))}
                  className="w-16 h-8 text-sm"
                />
              </div>
              {activeKotId && (
                <Badge variant="outline" className="text-green-700 border-green-400">KOT #{activeKotId}</Badge>
              )}
              <Button variant="ghost" size="sm" onClick={clearTable} className="ml-auto text-gray-500 hover:text-red-500">
                &times; Clear
              </Button>
            </div>

            {/* Customer section */}
            <div className="border-b border-gray-200 bg-gray-50">
              <button
                className="w-full flex items-center justify-between px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                onClick={() => setCustomerOpen(o => !o)}
              >
                <span>Customer {customer ? `— ${customer.name}` : ""}</span>
                <span>{customerOpen ? "▲" : "▼"}</span>
              </button>
              {customerOpen && (
                <div className="px-4 pb-3 space-y-2">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Phone number"
                      value={phoneInput}
                      onChange={e => setPhoneInput(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && lookupCustomer()}
                      className="flex-1 h-8 text-sm"
                    />
                    <Button size="sm" onClick={lookupCustomer} className="h-8">Lookup</Button>
                    {customer && (
                      <Button size="sm" variant="ghost" onClick={() => { setCustomer(null); setPhoneInput(""); setRedeemPoints(false); }} className="h-8 text-red-500">
                        &times;
                      </Button>
                    )}
                  </div>
                  {customer && (
                    <div className="flex items-center gap-3 text-sm bg-white rounded p-2 border">
                      <div>
                        <span className="font-medium">{customer.name}</span>
                        <Badge className="ml-2 text-xs" variant="outline">{customer.loyalty_tier || "Standard"}</Badge>
                      </div>
                      {customer.points > 0 && (
                        <label className="flex items-center gap-1 ml-auto cursor-pointer text-xs text-gray-600">
                          <input
                            type="checkbox"
                            checked={redeemPoints}
                            onChange={e => setRedeemPoints(e.target.checked)}
                            className="w-3 h-3"
                          />
                          Redeem {customer.points} pts = {fmt(Math.min(customer.points / 10, subtotal * 0.1))}
                        </label>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Menu area */}
            <div className="flex flex-col border-b border-gray-200" style={{ maxHeight: "38%" }}>
              {/* Search */}
              <div className="px-3 pt-2 pb-1">
                <Input
                  placeholder="Search menu items..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              {/* Category tabs */}
              <div className="flex gap-1 px-3 pb-1 overflow-x-auto">
                <button
                  onClick={() => setSelectedCategory("all")}
                  className={`px-3 py-1 rounded-full text-xs whitespace-nowrap border transition-colors ${selectedCategory === "all" ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"}`}
                >All</button>
                {categories.map((cat: any) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(String(cat.id))}
                    className={`px-3 py-1 rounded-full text-xs whitespace-nowrap border transition-colors ${selectedCategory === String(cat.id) ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"}`}
                  >{cat.name}</button>
                ))}
              </div>
              {/* Item grid */}
              <div className="flex-1 overflow-y-auto px-3 pb-2">
                <div className="grid grid-cols-3 gap-2">
                  {displayItems.map((item: any) => {
                    const inCart = cartQty(item.id);
                    return (
                      <div
                        key={item.id}
                        onClick={() => addToCart(item)}
                        className={`relative border rounded-lg p-2 cursor-pointer hover:bg-blue-50 hover:border-blue-400 transition-colors bg-white ${inCart > 0 ? "border-blue-400 bg-blue-50" : "border-gray-200"}`}
                      >
                        <div className="flex items-start gap-1">
                          <span className={`w-2.5 h-2.5 rounded-full mt-0.5 shrink-0 ${item.food_type === "non_veg" ? "bg-red-500" : "bg-green-500"}`} />
                          <span className="text-xs font-medium text-gray-800 leading-tight truncate">{item.name}</span>
                        </div>
                        <div className="text-xs font-bold text-gray-900 mt-1">{fmt(item.price)}</div>
                        {inCart > 0 && (
                          <Badge className="absolute -top-1.5 -right-1.5 text-xs px-1.5 py-0 bg-blue-600 text-white min-w-5 text-center">
                            {inCart}
                          </Badge>
                        )}
                      </div>
                    );
                  })}
                  {displayItems.length === 0 && (
                    <div className="col-span-3 text-center text-gray-400 py-4 text-sm">
                      {debouncedSearch ? "No items found" : "No items in this category"}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Cart */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="px-3 py-1.5 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Cart ({cart.length} items)</span>
                {cart.length > 0 && (
                  <button onClick={() => setCart([])} className="text-xs text-red-500 hover:underline">Clear all</button>
                )}
              </div>
              <div className="flex-1 overflow-y-auto">
                {cart.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                    Cart is empty — tap items above
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {cart.map(item => (
                      <div key={item.id} className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <span className="flex-1 text-sm font-medium text-gray-800 truncate">{item.name}</span>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => updateQty(item.id, -1)}
                              className="w-6 h-6 rounded bg-gray-200 hover:bg-gray-300 text-sm font-bold flex items-center justify-center"
                            >-</button>
                            <span className="w-7 text-center text-sm font-bold">{item.qty}</span>
                            <button
                              onClick={() => updateQty(item.id, 1)}
                              className="w-6 h-6 rounded bg-gray-200 hover:bg-gray-300 text-sm font-bold flex items-center justify-center"
                            >+</button>
                          </div>
                          <span className="w-20 text-right text-sm font-medium text-gray-700">{fmt(item.price * item.qty)}</span>
                          <button onClick={() => removeFromCart(item.id)} className="w-5 h-5 text-gray-400 hover:text-red-500 shrink-0 text-sm">
                            &times;
                          </button>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Select value={item.course} onValueChange={v => updateItem(item.id, "course", v)}>
                            <SelectTrigger className="h-6 text-xs w-24">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="starter">Starter</SelectItem>
                              <SelectItem value="main">Main</SelectItem>
                              <SelectItem value="dessert">Dessert</SelectItem>
                            </SelectContent>
                          </Select>
                          <button
                            className="text-xs text-blue-500 hover:underline"
                            onClick={() => updateItem(item.id, "showInstructions", !item.showInstructions)}
                          >
                            {item.showInstructions ? "Hide notes" : "+ Note"}
                          </button>
                        </div>
                        {item.showInstructions && (
                          <Input
                            placeholder="Special instructions..."
                            value={item.instructions}
                            onChange={e => updateItem(item.id, "instructions", e.target.value)}
                            className="h-7 text-xs mt-1 w-full"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Order summary */}
              <div className="border-t border-gray-200 bg-white px-3 py-2 space-y-1">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Subtotal</span><span>{fmt(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>GST (5%)</span><span>{fmt(gst)}</span>
                </div>
                {serviceCharge > 0 && (
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Service Charge ({selectedOutlet?.service_charge_pct}%)</span>
                    <span>{fmt(serviceCharge)}</span>
                  </div>
                )}
                {loyaltyDiscount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Loyalty Discount</span><span>-{fmt(loyaltyDiscount)}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Discount</span>
                  <div className="flex gap-1 ml-auto items-center">
                    <button
                      onClick={() => setDiscountType(discountType === "flat" ? "pct" : "flat")}
                      className="text-xs border rounded px-1.5 py-0.5 text-gray-600 hover:bg-gray-100"
                    >
                      {discountType === "flat" ? "Rs" : "%"}
                    </button>
                    <Input
                      type="number"
                      min={0}
                      value={discount || ""}
                      onChange={e => setDiscount(Number(e.target.value))}
                      placeholder="0"
                      className="h-7 w-20 text-sm text-right"
                    />
                  </div>
                  {discountAmount > 0 && (
                    <span className="text-sm text-red-500">-{fmt(discountAmount)}</span>
                  )}
                </div>
                {/* Promo code */}
                {promoApplied ? (
                  <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded px-2 py-1">
                    <span className="text-sm text-green-700 font-medium">{promoApplied.promo_name} applied: -{fmt(promoApplied.discount_amount)}</span>
                    <button onClick={() => { setPromoApplied(null); setPromoCode(""); }} className="text-green-600 hover:text-green-800 text-xs ml-2">✕</button>
                  </div>
                ) : (
                  <div className="flex gap-1">
                    <Input
                      type="text"
                      placeholder="Promo code"
                      value={promoCode}
                      onChange={e => setPromoCode(e.target.value.toUpperCase())}
                      onKeyDown={e => e.key === "Enter" && applyPromo()}
                      className="h-7 flex-1 text-sm"
                    />
                    <button
                      onClick={applyPromo}
                      disabled={promoLoading || !promoCode.trim()}
                      className="text-xs border rounded px-2 py-1 bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                      {promoLoading ? "..." : "Apply"}
                    </button>
                  </div>
                )}
                <div className="flex justify-between text-base font-bold text-gray-900 pt-1 border-t border-gray-200">
                  <span>Grand Total</span>
                  <span className="text-blue-700">{fmt(grandTotal)}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 p-3 border-t border-gray-200 bg-white">
                {!activeKotId ? (
                  <Button
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                    disabled={cart.length === 0 || sendKot.isPending}
                    onClick={() => sendKot.mutate()}
                  >
                    {sendKot.isPending ? "Sending..." : "Send KOT"}
                  </Button>
                ) : (
                  <>
                    <Button
                      className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
                      disabled={cart.length === 0 || addToKot.isPending}
                      onClick={() => addToKot.mutate()}
                    >
                      {addToKot.isPending ? "Adding..." : "Add to KOT"}
                    </Button>
                    <Button
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                      disabled={printBill.isPending}
                      onClick={() => printBill.mutate()}
                    >
                      {printBill.isPending ? "Loading..." : "Print Bill"}
                    </Button>
                  </>
                )}
                {activeKotId && (
                  <Button
                    variant="outline"
                    className="border-gray-300 text-gray-600"
                    onClick={() => setShowCompModal(true)}
                  >
                    Comp
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* PAYMENT MODAL */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-screen flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-bold">Payment — Table {selectedTable?.table_number}</h2>
              <button onClick={() => setShowPaymentModal(false)} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Bill breakdown */}
              {billData?.items && (
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-600 uppercase tracking-wide">Items</div>
                  <div className="divide-y divide-gray-100">
                    {billData.items.map((bi: any, idx: number) => (
                      <div key={idx} className="flex justify-between px-3 py-1.5 text-sm">
                        <span>{bi.name} x {bi.quantity}</span>
                        <span>{fmt(bi.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="space-y-1 text-sm">
                <div className="flex justify-between text-gray-600"><span>Subtotal</span><span>{fmt(subtotal)}</span></div>
                <div className="flex justify-between text-gray-600"><span>GST (5%)</span><span>{fmt(gst)}</span></div>
                {serviceCharge > 0 && (
                  <div className="flex justify-between text-gray-600">
                    <span>Service Charge</span><span>{fmt(serviceCharge)}</span>
                  </div>
                )}
                {discountAmount > 0 && (
                  <div className="flex justify-between text-red-500"><span>Discount</span><span>-{fmt(discountAmount)}</span></div>
                )}
                {loyaltyDiscount > 0 && (
                  <div className="flex justify-between text-green-600"><span>Loyalty Discount</span><span>-{fmt(loyaltyDiscount)}</span></div>
                )}
                <div className="flex justify-between font-bold text-base border-t pt-1 text-blue-700">
                  <span>Grand Total</span><span>{fmt(grandTotal)}</span>
                </div>
              </div>

              {/* Loyalty redemption */}
              {customer?.points > 0 && (
                <label className="flex items-center gap-2 text-sm cursor-pointer p-2 bg-yellow-50 rounded border border-yellow-200">
                  <input
                    type="checkbox"
                    checked={redeemPoints}
                    onChange={e => setRedeemPoints(e.target.checked)}
                  />
                  Redeem {customer.points} loyalty pts = {fmt(Math.min(customer.points / 10, subtotal * 0.1))} off
                </label>
              )}

              {/* Payment mode tabs */}
              <div>
                <div className="flex border rounded-lg overflow-hidden">
                  {["cash", "upi", "card", "split", "credit", "gift_card"].map(mode => (
                    <button
                      key={mode}
                      onClick={() => setPaymentMode(mode)}
                      className={`flex-1 py-2 text-sm font-medium transition-colors ${paymentMode === mode ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
                    >
                      {mode === "gift_card" ? "Gift Card" : mode.charAt(0).toUpperCase() + mode.slice(1)}
                    </button>
                  ))}
                </div>

                <div className="mt-3 space-y-2">
                  {paymentMode === "cash" && (
                    <div className="space-y-2">
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Cash Tendered</label>
                        <Input
                          type="number"
                          placeholder="Amount received"
                          value={cashAmount || ""}
                          onChange={e => setCashAmount(Number(e.target.value))}
                          className="text-lg font-bold h-10"
                        />
                      </div>
                      {cashAmount > 0 && (
                        <div className={`flex justify-between text-sm font-medium p-2 rounded ${change >= 0 ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                          <span>Change</span>
                          <span>{change >= 0 ? fmt(change) : `Short by ${fmt(-change)}`}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {paymentMode === "upi" && (
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">UPI Reference / Transaction ID</label>
                      <Input
                        placeholder="UTR / Ref number"
                        value={upiRef}
                        onChange={e => setUpiRef(e.target.value)}
                        className="h-9"
                      />
                    </div>
                  )}

                  {paymentMode === "card" && (
                    <div className="space-y-2">
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Last 4 digits</label>
                        <Input
                          placeholder="XXXX"
                          maxLength={4}
                          value={cardLast4}
                          onChange={e => setCardLast4(e.target.value)}
                          className="h-9"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Card Type</label>
                        <Select value={cardType} onValueChange={setCardType}>
                          <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="visa">Visa</SelectItem>
                            <SelectItem value="mastercard">Mastercard</SelectItem>
                            <SelectItem value="rupay">RuPay</SelectItem>
                            <SelectItem value="amex">Amex</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}

                  {paymentMode === "split" && (
                    <div className="space-y-2">
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Cash Amount</label>
                        <Input
                          type="number"
                          min={0}
                          value={splitCash || ""}
                          onChange={e => setSplitCash(Number(e.target.value))}
                          className="h-9"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">UPI Amount</label>
                        <Input
                          type="number"
                          min={0}
                          value={splitUpi || ""}
                          onChange={e => setSplitUpi(Number(e.target.value))}
                          className="h-9"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Card Amount</label>
                        <Input
                          type="number"
                          min={0}
                          value={splitCard || ""}
                          onChange={e => setSplitCard(Number(e.target.value))}
                          className="h-9"
                        />
                      </div>
                      {(() => {
                        const splitTotal = splitCash + splitUpi + splitCard;
                        const diff = splitTotal - grandTotal;
                        return (
                          <div className={`text-xs p-2 rounded font-medium ${Math.abs(diff) < 0.01 ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                            {Math.abs(diff) < 0.01
                              ? "Split matches total"
                              : `Split total: ${fmt(splitTotal)} (${diff > 0 ? "+" : ""}${fmt(diff)} vs ${fmt(grandTotal)})`}
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {paymentMode === "credit" && (
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium">Customer Name</label>
                        <Input value={creditCustomerName} onChange={e => setCreditCustomerName(e.target.value)} placeholder="Customer / Company name" />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Credit Account</label>
                        <Input value={creditAccount} onChange={e => setCreditAccount(e.target.value)} placeholder="Account code or reference" />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Due Date</label>
                        <Input type="date" value={creditDueDate} onChange={e => setCreditDueDate(e.target.value)} />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Notes</label>
                        <Input value={creditNotes} onChange={e => setCreditNotes(e.target.value)} placeholder="Optional notes" />
                      </div>
                      <p className="text-xs text-gray-500">Amount will be recorded as credit: {fmt(grandTotal)}</p>
                    </div>
                  )}

                  {paymentMode === "gift_card" && (
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <Input
                          value={gcNumber}
                          onChange={e => setGcNumber(e.target.value.toUpperCase())}
                          placeholder="Gift card number"
                          className="flex-1 h-9"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            if (!gcNumber) return;
                            setGcCheckLoading(true);
                            try {
                              const data = await api("GET", "/api/restaurant/gift-cards/" + gcNumber + "/balance");
                              if (data.error) { toast({ title: data.error, variant: "destructive" }); setGcData(null); }
                              else { setGcData(data); setGcRedeemAmount(Math.min(Number(data.current_balance), grandTotal)); }
                            } catch { toast({ title: "Card lookup failed", variant: "destructive" }); }
                            setGcCheckLoading(false);
                          }}
                          disabled={!gcNumber || gcCheckLoading}
                        >{gcCheckLoading ? "..." : "Check"}</Button>
                      </div>
                      {gcData && (
                        <div className="p-3 bg-green-50 border border-green-200 rounded space-y-2">
                          <div className="flex justify-between">
                            <span className="text-green-700 font-medium text-sm">Card Valid</span>
                            <span className="text-green-700 font-bold text-sm">Balance: {fmt(gcData.current_balance)}</span>
                          </div>
                          {gcData.purchaser_name && <div className="text-xs text-gray-600">Issued to: {gcData.purchaser_name}</div>}
                          <div>
                            <label className="text-xs text-gray-500 mb-1 block">Amount to Redeem</label>
                            <Input type="number" value={gcRedeemAmount}
                              onChange={e => setGcRedeemAmount(Math.min(Number(e.target.value), Number(gcData.current_balance), grandTotal))}
                              className="h-8 text-sm" />
                          </div>
                          {gcRedeemAmount < grandTotal && (
                            <p className="text-xs text-orange-600">Remaining {fmt(grandTotal - gcRedeemAmount)} collect separately</p>
                          )}
                          <div className="text-xs text-gray-500">Balance after: {fmt(Number(gcData.current_balance) - gcRedeemAmount)}</div>
                        </div>
                      )}
                      {!gcData && <p className="text-xs text-gray-500">Enter gift card number and click Check</p>}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-3 p-4 border-t">
              <Button variant="outline" onClick={() => setShowPaymentModal(false)} className="flex-1">Cancel</Button>
              <Button
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold"
                disabled={completePayment.isPending}
                onClick={() => completePayment.mutate()}
              >
                {completePayment.isPending ? "Processing..." : paymentMode === "credit" ? `Record Credit — ${fmt(grandTotal)}` : `Complete — ${fmt(grandTotal)}`}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* COMPLIMENTARY MODAL */}
      {showCompModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <h2 className="text-lg font-bold text-gray-800">Mark as Complimentary</h2>
            <p className="text-sm text-gray-500">This will waive the entire bill of {fmt(grandTotal)}.</p>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Reason *</label>
              <Input
                placeholder="e.g. VIP guest, quality issue..."
                value={complimentaryReason}
                onChange={e => setComplimentaryReason(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setShowCompModal(false)} className="flex-1">Cancel</Button>
              <Button
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                disabled={!complimentaryReason.trim() || makeComplimentary.isPending}
                onClick={() => makeComplimentary.mutate()}
              >
                {makeComplimentary.isPending ? "Processing..." : "Confirm Complimentary"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
