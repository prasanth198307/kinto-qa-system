import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";

interface PlanFeatures {
  plan: string;
  modules: string[];
  allowedNavItems: string[];
}

export function usePlanFeatures() {
  const { data, isLoading } = useQuery<PlanFeatures | null>({
    queryKey: ["/api/tenant/features"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    staleTime: 0,
    retry: false,
  });

  return {
    plan: data?.plan ?? "trial",
    modules: data?.modules ?? [],
    allowedNavItems: data?.allowedNavItems ?? [],
    isLoading,
    hasModule: (module: string) => (data?.modules ?? []).includes(module),
    canAccessNavItem: (itemId: string) =>
      !data || (data.allowedNavItems ?? []).includes(itemId),
  };
}
