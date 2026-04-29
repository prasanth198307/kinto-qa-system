import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";

interface TenantInfo {
  id: number;
  name: string;
  slug: string;
  plan: string;
  status: string;
  trialEndsAt: string | null;
  maxUsers: number;
  logoUrl: string | null;
  primaryColor: string | null;
  billingEmail: string | null;
  contactName: string | null;
  contactPhone: string | null;
  gstNumber: string | null;
  address: string | null;
  createdAt: string;
  userCount: number;
}

export function useTenantInfo() {
  const { data, isLoading, refetch } = useQuery<TenantInfo>({
    queryKey: ["/api/tenant/info"],
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  return { tenantInfo: data ?? null, isLoading, refetch };
}

export function useTenantBranding() {
  const { tenantInfo } = useTenantInfo();

  useEffect(() => {
    if (!tenantInfo?.primaryColor) return;

    const color = tenantInfo.primaryColor.trim();

    // Convert hex to HSL and apply to CSS variables
    const hsl = hexToHsl(color);
    if (!hsl) return;

    const root = document.documentElement;
    root.style.setProperty("--primary", `${hsl.h} ${hsl.s}% ${hsl.l}%`);
    root.style.setProperty("--primary-foreground", hsl.l > 50 ? "0 0% 10%" : "0 0% 98%");

    return () => {
      root.style.removeProperty("--primary");
      root.style.removeProperty("--primary-foreground");
    };
  }, [tenantInfo?.primaryColor]);

  return {
    logoUrl: tenantInfo?.logoUrl ?? null,
    primaryColor: tenantInfo?.primaryColor ?? null,
    tenantName: tenantInfo?.name ?? "SwachERP",
  };
}

function hexToHsl(hex: string): { h: number; s: number; l: number } | null {
  const clean = hex.replace("#", "");
  if (clean.length !== 6) return null;

  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}
