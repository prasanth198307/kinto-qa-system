// Marketplace sync service — Amazon SP-API, Flipkart, Meesho, Shiprocket
import { db } from './db';
import { sql } from 'drizzle-orm';
import { getCredential } from './masters-routes';

export interface MarketplaceOrder {
  marketplace: 'amazon' | 'flipkart' | 'meesho' | 'direct';
  marketplace_order_id: string;
  order_date: string;
  customer_name: string;
  items: { sku: string; qty: number; price: number }[];
  shipping_address: string;
  status: string;
}

// ─── LWA token cache (module-level, per-tenant) ───────────────────────────────
interface TokenEntry { access_token: string; expires_at: number }
const lwaCache = new Map<number, TokenEntry>();

async function getLwaToken(tenantId: number): Promise<string> {
  const cached = lwaCache.get(tenantId);
  if (cached && cached.expires_at > Date.now() + 60_000) return cached.access_token;

  const [clientId, clientSecret, refreshToken] = await Promise.all([
    getCredential(tenantId, 'AMAZON_LWA_CLIENT_ID'),
    getCredential(tenantId, 'AMAZON_LWA_CLIENT_SECRET'),
    getCredential(tenantId, 'AMAZON_REFRESH_TOKEN'),
  ]);
  if (!clientId || !clientSecret || !refreshToken) throw new Error('Amazon LWA credentials not configured');

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
  });
  const res = await fetch('https://api.amazon.com/auth/o2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  if (!res.ok) throw new Error(`LWA token refresh failed: ${res.status}`);
  const data: any = await res.json();
  const entry: TokenEntry = { access_token: data.access_token, expires_at: Date.now() + data.expires_in * 1000 };
  lwaCache.set(tenantId, entry);
  return entry.access_token;
}

// ─── Public helpers ───────────────────────────────────────────────────────────
export async function refreshAmazonTokenOnly(tenantId: number): Promise<{ access_token: string; expires_at: number }> {
  lwaCache.delete(tenantId); // force refresh
  const token = await getLwaToken(tenantId);
  const entry = lwaCache.get(tenantId)!;
  return { access_token: token, expires_at: entry.expires_at };
}

export async function getAmazonTokenStatus(tenantId: number): Promise<{ configured: boolean; token_cached: boolean; expires_at?: number }> {
  const clientId = await getCredential(tenantId, 'AMAZON_LWA_CLIENT_ID');
  const configured = !!clientId;
  const cached = lwaCache.get(tenantId);
  return { configured, token_cached: !!cached, expires_at: cached?.expires_at };
}

// ─── Amazon SP-API ────────────────────────────────────────────────────────────
export async function fetchAmazonOrders(tenantId: number, fromDate: string): Promise<MarketplaceOrder[]> {
  const [marketplaceId, endpoint] = await Promise.all([
    getCredential(tenantId, 'AMAZON_MARKETPLACE_ID'),
    getCredential(tenantId, 'AMAZON_ENDPOINT'),
  ]);
  if (!marketplaceId) return dbFallback(tenantId, fromDate, 'amazon');

  const base = endpoint || 'https://sellingpartnerapi-eu.amazon.com';
  const accessToken = await getLwaToken(tenantId);
  const url = `${base}/orders/v0/orders?MarketplaceIds=${marketplaceId}&CreatedAfter=${fromDate}&OrderStatuses=Unshipped,PartiallyShipped,Shipped,Canceled`;
  const res = await fetch(url, {
    headers: { 'x-amz-access-token': accessToken, 'x-amz-date': new Date().toISOString() },
  });
  if (!res.ok) throw new Error(`Amazon GetOrders failed: ${res.status}`);
  const data: any = await res.json();
  const orders: MarketplaceOrder[] = (data?.payload?.Orders ?? []).map((o: any) => ({
    marketplace: 'amazon',
    marketplace_order_id: o.AmazonOrderId,
    order_date: o.PurchaseDate,
    customer_name: o.BuyerInfo?.BuyerName ?? '',
    items: [],
    shipping_address: JSON.stringify(o.ShippingAddress ?? {}),
    status: o.OrderStatus,
  }));
  await upsertOrders(tenantId, 'amazon', orders);
  return orders;
}

// ─── Flipkart Seller API ─────────────────────────────────────────────────────
export async function fetchFlipkartOrders(tenantId: number, fromDate: string): Promise<MarketplaceOrder[]> {
  const [clientId, clientSecret] = await Promise.all([
    getCredential(tenantId, 'FLIPKART_CLIENT_ID'),
    getCredential(tenantId, 'FLIPKART_CLIENT_SECRET'),
  ]);
  if (!clientId || !clientSecret) return dbFallback(tenantId, fromDate, 'flipkart');

  const tokenRes = await fetch('https://api.flipkart.net/sellers/oauth-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'client_credentials', client_id: clientId, client_secret: clientSecret }).toString(),
  });
  if (!tokenRes.ok) throw new Error(`Flipkart token failed: ${tokenRes.status}`);
  const { access_token } = await tokenRes.json() as any;

  const ordRes = await fetch(`https://api.flipkart.net/sellers/orders/search?created_after=${fromDate}`, {
    headers: { Authorization: `Bearer ${access_token}` },
  });
  if (!ordRes.ok) throw new Error(`Flipkart orders failed: ${ordRes.status}`);
  const data: any = await ordRes.json();
  const orders: MarketplaceOrder[] = (data?.orderItems ?? data?.orders ?? []).map((o: any) => ({
    marketplace: 'flipkart',
    marketplace_order_id: o.orderId ?? o.order_id,
    order_date: o.createdAt ?? o.created_date ?? fromDate,
    customer_name: o.customerName ?? '',
    items: [],
    shipping_address: JSON.stringify(o.shippingAddress ?? {}),
    status: o.status ?? o.orderStatus ?? 'unknown',
  }));
  await upsertOrders(tenantId, 'flipkart', orders);
  return orders;
}

// ─── Meesho Partner API v3 ────────────────────────────────────────────────────
export async function fetchMeeshoOrders(tenantId: number, fromDate: string): Promise<MarketplaceOrder[]> {
  const apiToken = await getCredential(tenantId, 'MEESHO_API_TOKEN');
  if (!apiToken) return dbFallback(tenantId, fromDate, 'meesho');

  const res = await fetch(`https://app.meesho.com/api/v3/orders?from=${fromDate}`, {
    headers: { Authorization: `Bearer ${apiToken}` },
  });
  if (!res.ok) throw new Error(`Meesho orders failed: ${res.status}`);
  const data: any = await res.json();
  const orders: MarketplaceOrder[] = (data?.data ?? data?.orders ?? []).map((o: any) => ({
    marketplace: 'meesho',
    marketplace_order_id: String(o.sub_order_id ?? o.order_id),
    order_date: o.created_at ?? fromDate,
    customer_name: o.consumer_details?.name ?? '',
    items: [],
    shipping_address: JSON.stringify(o.shipping_details ?? {}),
    status: o.status ?? 'unknown',
  }));
  await upsertOrders(tenantId, 'meesho', orders);
  return orders;
}

// ─── Shared helpers ───────────────────────────────────────────────────────────
async function dbFallback(tenantId: number, fromDate: string, platform: string): Promise<MarketplaceOrder[]> {
  try {
    const r = await db.execute(sql`
      SELECT o.*, c.platform FROM ec_orders o
      LEFT JOIN ec_channels c ON c.id = o.channel_id
      WHERE o.tenant_id = ${tenantId} AND c.platform = ${platform} AND o.order_date >= ${fromDate}
      ORDER BY o.order_date DESC LIMIT 50`);
    return r.rows as any[];
  } catch { return []; }
}

async function upsertOrders(tenantId: number, platform: string, orders: MarketplaceOrder[]) {
  for (const o of orders) {
    await db.execute(sql`
      INSERT INTO ec_orders (tenant_id, channel_order_id, customer_name, shipping_address, order_date, status, payment_method, order_number)
      VALUES (${tenantId}, ${o.marketplace_order_id}, ${o.customer_name}, ${o.shipping_address}, ${o.order_date}, ${o.status}, 'prepaid',
              ${'EC-' + o.marketplace_order_id.slice(-8)})
      ON CONFLICT (tenant_id, channel_order_id) DO UPDATE
        SET status=EXCLUDED.status, customer_name=EXCLUDED.customer_name`);
  }
}

// ─── Table setup ─────────────────────────────────────────────────────────────
export async function ensureMarketplaceTables() {
  await db.execute(sql`CREATE TABLE IF NOT EXISTS ecom_inventory_sync (
    id SERIAL PRIMARY KEY, tenant_id INT, sku VARCHAR(100), product_name VARCHAR(300),
    available_qty INT DEFAULT 0, reserved_qty INT DEFAULT 0,
    last_synced TIMESTAMPTZ, channels_updated JSONB DEFAULT '[]',
    UNIQUE(tenant_id, sku))`);
  await db.execute(sql`CREATE TABLE IF NOT EXISTS ecom_shipments (
    id SERIAL PRIMARY KEY, tenant_id INT, order_id INT, provider VARCHAR(50),
    tracking_no VARCHAR(100), status VARCHAR(50), label_url TEXT,
    estimated_delivery DATE, delivered_at TIMESTAMPTZ, created_at TIMESTAMPTZ DEFAULT NOW())`);
}

export async function syncInventoryToMarketplaces(tenantId: number, sku: string, availableQty: number) {
  await ensureMarketplaceTables();
  await db.execute(sql`INSERT INTO ecom_inventory_sync (tenant_id, sku, available_qty, last_synced, channels_updated)
    VALUES (${tenantId}, ${sku}, ${availableQty}, NOW(), '[]'::jsonb)
    ON CONFLICT (tenant_id, sku) DO UPDATE SET available_qty=${availableQty}, last_synced=NOW()`);
}

// ─── Shiprocket ───────────────────────────────────────────────────────────────
let shiprocketToken: { token: string; expires_at: number } | null = null;

async function getShiprocketToken(email: string, password: string): Promise<string> {
  if (shiprocketToken && shiprocketToken.expires_at > Date.now() + 60_000) return shiprocketToken.token;
  const res = await fetch('https://apiv2.shiprocket.in/v1/external/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(`Shiprocket login failed: ${res.status}`);
  const data: any = await res.json();
  shiprocketToken = { token: data.token, expires_at: Date.now() + 9 * 24 * 3600 * 1000 };
  return data.token;
}

export async function createShipment(
  tenantId: number,
  orderId: number,
  provider: 'shiprocket' | 'delhivery' | 'manual'
): Promise<{ tracking_no: string; provider: string; status: string; shipment_id?: string; awb_code?: string }> {
  await ensureMarketplaceTables();

  if (provider === 'shiprocket') {
    const [email, password] = await Promise.all([
      getCredential(tenantId, 'SHIPROCKET_EMAIL'),
      getCredential(tenantId, 'SHIPROCKET_PASSWORD'),
    ]);
    if (email && password) {
      const token = await getShiprocketToken(email, password);
      const orderRow = await db.execute(sql`SELECT * FROM ec_orders WHERE id=${orderId} AND tenant_id=${tenantId}`);
      const ord: any = orderRow.rows[0] ?? {};
      const payload = {
        order_id: `SR-${orderId}`,
        order_date: ord.order_date ?? new Date().toISOString(),
        pickup_location: 'Primary',
        billing_customer_name: ord.customer_name ?? 'Customer',
        billing_address: ord.shipping_address ?? '',
        billing_city: 'City', billing_pincode: '110001', billing_state: 'Delhi',
        billing_country: 'India', billing_phone: ord.customer_phone ?? '9999999999',
        shipping_is_billing: true,
        order_items: [{ name: 'Product', sku: 'SKU001', units: 1, selling_price: ord.total_amount ?? 100 }],
        payment_method: ord.payment_method === 'cod' ? 'COD' : 'Prepaid',
        sub_total: ord.total_amount ?? 100,
        length: 10, breadth: 10, height: 10, weight: 0.5,
      };
      const sr = await fetch('https://apiv2.shiprocket.in/v1/external/orders/create/adhoc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      if (!sr.ok) throw new Error(`Shiprocket create order failed: ${sr.status}`);
      const srData: any = await sr.json();
      const trackingNo = srData.awb_code ?? srData.shipment_id ?? `SR${Date.now()}`;
      await db.execute(sql`INSERT INTO ecom_shipments (tenant_id, order_id, provider, tracking_no, status, created_at)
        VALUES (${tenantId}, ${orderId}, 'shiprocket', ${trackingNo}, 'created', NOW())`);
      return { tracking_no: trackingNo, provider: 'shiprocket', status: 'created', shipment_id: String(srData.shipment_id), awb_code: srData.awb_code };
    }
  }

  const trackingNo = `TRK${Date.now()}`;
  await db.execute(sql`INSERT INTO ecom_shipments (tenant_id, order_id, provider, tracking_no, status, created_at)
    VALUES (${tenantId}, ${orderId}, ${provider}, ${trackingNo}, 'created', NOW()) ON CONFLICT DO NOTHING`);
  return { tracking_no: trackingNo, provider, status: 'created' };
}
