import { useQuery } from "@tanstack/react-query";
import type { TenantAllapot } from "@autoszerv/shared-types";
import { apiRequest } from "./api-client";

export interface LicenseStatusResponse {
  tenant: { id: string; nev: string; allapot: TenantAllapot } | undefined;
  license: {
    plan: "starter" | "pro" | "enterprise";
    features: string[];
    lejar: string;
  } | null;
}

export function useLicenseStatus() {
  return useQuery({
    queryKey: ["license-status"],
    queryFn: () => apiRequest<LicenseStatusResponse>("/license"),
    staleTime: 60_000,
  });
}
