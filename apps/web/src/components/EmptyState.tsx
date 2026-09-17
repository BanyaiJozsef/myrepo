import type { ReactNode } from "react";

interface EmptyStateProps {
  cim: string;
  leiras: string;
  action?: ReactNode;
}

export function EmptyState({ cim, leiras, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-slate-300 px-6 py-12 text-center dark:border-slate-700">
      <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">{cim}</h3>
      <p className="max-w-sm text-sm text-slate-500 dark:text-slate-400">{leiras}</p>
      {action}
    </div>
  );
}
