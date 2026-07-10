/** Fetch wrapper that throws on non-2xx so TanStack Query's `= []` defaults work correctly. */
export async function apiFetch<T = unknown>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, init);
  if (!r.ok) {
    const msg = await r.text().catch(() => r.statusText);
    throw new Error(msg || `HTTP ${r.status}`);
  }
  return r.json() as Promise<T>;
}
