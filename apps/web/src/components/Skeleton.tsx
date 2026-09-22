export function SkeletonList({ sorok = 4 }: { sorok?: number }) {
  return (
    <div className="flex flex-col gap-2" role="status" aria-label="Betöltés">
      {Array.from({ length: sorok }, (_, i) => (
        <div key={i} className="h-14 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />
      ))}
    </div>
  );
}
