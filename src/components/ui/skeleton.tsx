export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%] rounded ${className}`}
      style={{
        animation: 'shimmer 2s infinite',
      }}
    />
  );
}

export function CalendarSkeleton() {
  return (
    <div className="p-3">
      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="text-center py-1">
            <Skeleton className="h-4 w-8 mx-auto" />
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-0.5">
        {Array.from({ length: 35 }).map((_, i) => (
          <div key={i} className="min-h-[60px] rounded-xl p-1 bg-white">
            <Skeleton className="h-6 w-6 rounded-full mb-1" />
            <div className="space-y-0.5">
              {i % 3 === 0 && <Skeleton className="h-4 w-full rounded" />}
              {i % 5 === 0 && <Skeleton className="h-4 w-3/4 rounded" />}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function EventDetailSkeleton() {
  return (
    <div className="p-4 space-y-4">
      <Skeleton className="h-8 w-3/4" />
      <Skeleton className="h-6 w-1/2" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    </div>
  );
}
