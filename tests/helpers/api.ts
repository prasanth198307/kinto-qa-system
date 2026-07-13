/**
 * Typed API client for tests — wraps fetch with auth cookie, base URL, and
 * typed responses. Every test file imports from here instead of raw fetch.
 */

export const BASE = process.env.BASE_URL || 'http://localhost:5000';

export interface ApiClient {
  get(path: string): Promise<Response>;
  post(path: string, body?: unknown): Promise<Response>;
  put(path: string, body?: unknown): Promise<Response>;
  delete(path: string): Promise<Response>;
  cookie: string;
}

export async function login(username: string, password: string): Promise<ApiClient> {
  const res = await fetch(`${BASE}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
    credentials: 'include',
  });

  if (!res.ok) throw new Error(`Login failed for ${username}: ${res.status}`);

  const setCookie = res.headers.get('set-cookie') ?? '';
  const cookie = setCookie.split(';')[0];

  const headers = (extra?: Record<string, string>) => ({
    'Content-Type': 'application/json',
    Cookie: cookie,
    ...extra,
  });

  return {
    cookie,
    get: (path) => fetch(`${BASE}${path}`, { headers: headers(), credentials: 'include' }),
    post: (path, body) => fetch(`${BASE}${path}`, { method: 'POST', headers: headers(), body: JSON.stringify(body), credentials: 'include' }),
    put: (path, body) => fetch(`${BASE}${path}`, { method: 'PUT', headers: headers(), body: JSON.stringify(body), credentials: 'include' }),
    delete: (path) => fetch(`${BASE}${path}`, { method: 'DELETE', headers: headers(), credentials: 'include' }),
  };
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
