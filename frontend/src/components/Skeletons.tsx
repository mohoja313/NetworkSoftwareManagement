export function CardSkeleton() {
  return (
    <div className="glass rounded-3xl p-4 shadow-card" aria-hidden="true">
      <div className="flex gap-3">
        <div className="skeleton-shimmer h-12 w-12 rounded-2xl" />
        <div className="flex-1 space-y-2">
          <div className="skeleton-shimmer h-4 w-2/3 rounded-lg" />
          <div className="skeleton-shimmer h-3 w-1/3 rounded-lg" />
        </div>
      </div>
      <div className="skeleton-shimmer mt-3 h-10 rounded-xl" />
    </div>
  );
}

export function GridSkeleton({ n = 8 }: { n?: number }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" aria-label="loading">
      {Array.from({ length: n }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

export function RowSkeleton({ n = 4 }: { n?: number }) {
  return (
    <div className="grid grid-flow-col auto-cols-[240px] gap-3 overflow-hidden sm:auto-cols-[280px]" aria-label="loading">
      {Array.from({ length: n }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}
