import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";

// Helper called whenever any API response is 401 — clears auth state so the
// app automatically routes back to login (proper SaaS session expiry handling).
function handleUnexpected401() {
  queryClient.setQueryData(["/api/user"], null);
  sessionStorage.setItem("session_expired", "1");
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
      return null;
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
