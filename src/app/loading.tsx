/** Skeleton matching the shape of a typical page, not a generic spinner. */
export default function Loading() {
  return (
    <div className="flex flex-col gap-10" aria-busy aria-label="Chargement">
      <div className="shimmer relative h-64 overflow-hidden rounded-2xl border border-hairline bg-surface/40" />
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex flex-col gap-2">
            <div className="h-2.5 w-24 rounded bg-surface-2" />
            <div className="shimmer relative h-9 w-20 overflow-hidden rounded bg-surface-2" />
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-2">
        {Array.from({ length: 6 }, (_, i) => (
          <div
            key={i}
            className="shimmer relative h-14 overflow-hidden rounded-lg bg-surface/40"
            style={{ animationDelay: `${i * 90}ms` }}
          />
        ))}
      </div>
    </div>
  );
}
