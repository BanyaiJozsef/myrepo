import { forwardRef, type ButtonHTMLAttributes } from "react";

type Variant = "elsodleges" | "masodlagos" | "veszelyes";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

const VARIANT_STYLES: Record<Variant, string> = {
  elsodleges: "bg-brand-600 text-white hover:bg-brand-700 disabled:bg-brand-300",
  masodlagos:
    "bg-transparent text-slate-900 ring-1 ring-inset ring-slate-300 hover:bg-slate-100 dark:text-slate-100 dark:ring-slate-700 dark:hover:bg-slate-800",
  veszelyes: "bg-red-600 text-white hover:bg-red-700 disabled:bg-red-300",
};

/** Minimum 44x44px touch target and visible focus ring per the WCAG 2.1 AA target in scope. */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "elsodleges", className = "", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      className={`inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors disabled:cursor-not-allowed ${VARIANT_STYLES[variant]} ${className}`}
      {...props}
    />
  );
});
