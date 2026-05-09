import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";

// Timestamp of the most recent successful login.
// Used to suppress false-positive "session expired" events in the grace period
// immediately after login (race condition: queries may fire before the session
// cookie is fully propagated by the browser on some production environments).
let _recentLoginAt: number | null = null;
const LOGIN_GRACE_MS = 8_000; // 8 seconds after login, don't treat 401 as session expiry

export function markRecentLogin() {
  _recentLoginAt = Date.now();
}

// Helper called whenever any API response is 401.
// Only marks the session as expired when the user was previously authenticated
// (i.e. there is cached user data). A plain unauthenticated visitor hitting a
// protected endpoint should NOT see the "session expired" banner on /auth.
function handleUnexpected401() {
  // Suppress the cascade if we JUST logged in — could be a race condition where
  // the browser hasn't yet attached the fresh session cookie to the first few
  // parallel requests fired right after login.
  if (_recentLoginAt !== null && Date.now() - _recentLoginAt < LOGIN_GRACE_MS) {
    return;
  }

  const wasAuthenticated = !!queryClient.getQueryData(["/api/user"]);
  queryClient.setQueryData(["/api/user"], null);
  if (wasAuthenticated) {
    sessionStorage.setItem("session_expired", "1");
  }
}

export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Build URL from queryKey, handling both simple paths and query parameters
    let url: string;
    
    // Check if last element is an object (query parameters)
    const lastElement = queryKey[queryKey.length - 1];
    const hasQueryParams = typeof lastElement === 'object' && lastElement !== null && !Array.isArray(lastElement);
    
    if (queryKey.length === 1) {
      // Simple path: ['/api/invoices']
      url = queryKey[0] as string;
    } else if (hasQueryParams) {
      // Path segments with query params at the end
      // e.g., ['/api/products', 'abc123', 'bom-with-types', { configurationId: 'xyz' }]
      // or ['/api/invoices', { page: 1, pageSize: 25 }]
      const pathSegments = queryKey.slice(0, -1) as string[];
      const params = lastElement as Record<string, any>;
      const searchParams = new URLSearchParams();
      
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      }
      
      const basePath = pathSegments.join("/");
      url = searchParams.toString() 
        ? `${basePath}?${searchParams.toString()}`
        : basePath;
    } else {
      // Path segments: ['/api/invoices', 'abc123']
      url = queryKey.join("/");
    }
    
    const res = await fetch(url, {
      credentials: "include",
    });

    if (res.status === 401) {
      if (unauthorizedBehavior === "returnNull") {
        return null;
      }
      // Any unexpected 401 = stale/expired session — redirect to login automatically
      handleUnexpected401();
      // Throw (not return null) so React Query keeps data as undefined,
      // which lets `data: foo = []` destructuring defaults work correctly.
      // Returning null would set data=null and break `= []` defaults.
      throw new Error("Session expired. Please log in again.");
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 0, // Allow refetching when queryKey changes (pagination, filters, etc.)
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  if (res.status === 401) {
    // Stale/expired session on a mutation — clear auth state and redirect to login
    handleUnexpected401();
    throw new Error("Session expired. Please log in again.");
  }

  await throwIfResNotOk(res);
  return res;
}
