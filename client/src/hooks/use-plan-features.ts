import { useQuery } from "@tanstack/react-query";

interface PlanFeatures {
  plan: string;
  modules: string[];
  allowedNavItems: string[];
}

export function usePlanFeatures() {
  const { data, isLoading } = useQuery<PlanFeatures>({
    queryKey: ["/api/tenant/features"],
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes — plan rarely changes
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
