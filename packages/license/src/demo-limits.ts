/**
 * Central demo-mode restrictions. Read from here everywhere instead of
 * scattering magic numbers/if-branches across the codebase.
 */
export const DEMO_LIMITS = {
  maxUgyfelek: 5,
  maxJarmuvek: 5,
  maxMunkalapok: 10,
} as const;

export type DemoLimitKey = keyof typeof DEMO_LIMITS;

export interface DemoLimitCheck {
  allowed: boolean;
  limit: number;
  current: number;
}

export function checkDemoLimit(key: DemoLimitKey, currentCount: number): DemoLimitCheck {
  const limit = DEMO_LIMITS[key];
  return { allowed: currentCount < limit, limit, current: currentCount };
}
