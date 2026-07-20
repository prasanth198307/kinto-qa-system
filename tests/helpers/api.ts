/**
 * Typed API client for tests — wraps fetch with auth cookie, base URL, and
 * typed responses. Every test file imports from here instead of raw fetch.
 */

export const BASE = process.env.TEST_BASE_URL || 'http://localhost:5050';

export interface ApiClient {
  get(path: string): Promise<Response>;
  post(path: string, body?: unknown): Promise<Response>;
  put(path: string, body?: unknown): Promise<Response>;
  patch(path: string, body?: unknown): Promise<Response>;
  delete(path: string): Promise<Response>;
  cookie: string;
}

// Session cache: reuse cookies across test files within the same process.
// Avoids hitting the login rate limiter (10 attempts per 15 min) when
// multiple describe blocks call login() for the same user.
const sessionCache = new Map<string, ApiClient>();

export async function login(username: string, password: string): Promise<ApiClient> {
  const cacheKey = `${username}:${password}`;
  const cached = sessionCache.get(cacheKey);
  if (cached) {
    // Verify session is still alive; re-login if expired (401)
    const probe = await cached.get('/api/tenant/features').catch(() => null);
    if (probe && probe.status !== 401) return cached;
    sessionCache.delete(cacheKey);
  }

  const res = await fetch(`${BASE}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
    credentials: 'include',
  });

  if (!res.ok) throw new Error(`Login failed for ${username}: ${res.status}`);

  const setCookie = res.headers.get('set-cookie') ?? '';
  // Node.js fetch joins multiple Set-Cookie headers with ", " but Expires values also contain commas
  // (e.g. "Thu, 01 Jan 1970"), so comma-splitting is unreliable.
  // The server clears "connect.sid" (empty) then sets "swach.sid" with the real session.
  // Extract swach.sid=<value> directly, falling back to any non-empty NAME=VALUE.
  const sidMatch = setCookie.match(/swach\.sid=([^;,]+)/);
  const cookie = sidMatch
    ? `swach.sid=${sidMatch[1]}`
    : (setCookie.match(/([a-zA-Z0-9._-]+=s%3A[^;,]+)/) ?? ['', setCookie.split(';')[0]])[1];

  const headers = (extra?: Record<string, string>) => ({
    'Content-Type': 'application/json',
    Cookie: cookie,
    ...extra,
  });

  const client: ApiClient = {
    cookie,
    get: (path) => fetch(`${BASE}${path}`, { headers: headers(), credentials: 'include' }),
    post: (path, body) => fetch(`${BASE}${path}`, { method: 'POST', headers: headers(), body: JSON.stringify(body), credentials: 'include' }),
    put: (path, body) => fetch(`${BASE}${path}`, { method: 'PUT', headers: headers(), body: JSON.stringify(body), credentials: 'include' }),
    patch: (path, body) => fetch(`${BASE}${path}`, { method: 'PATCH', headers: headers(), body: JSON.stringify(body), credentials: 'include' }),
    delete: (path) => fetch(`${BASE}${path}`, { method: 'DELETE', headers: headers(), credentials: 'include' }),
  };
  sessionCache.set(cacheKey, client);
  return client;
}

export async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json() as Promise<T>;
}

export async function expectStatus(res: Response, status: number) {
  if (res.status !== status) {
    const text = await res.text().catch(() => '');
    throw new Error(`Expected ${status}, got ${res.status}: ${text.slice(0, 200)}`);
  }
}
