import { motion } from 'framer-motion';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div className={`animate-pulse bg-muted/50 rounded-lg ${className}`} />
  );
}

export function CardSkeleton() {
  return (
    <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-8 w-1/2" />
      <div className="space-y-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-4/5" />
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-border pb-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-10 w-36 rounded-xl" />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="p-5 rounded-2xl bg-card border border-border flex items-center gap-5">
            <Skeleton className="w-12 h-12 rounded-xl" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-7 w-12" />
            </div>
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Score */}
        <div className="lg:col-span-4">
          <div className="bg-card border border-border rounded-2xl p-8 flex flex-col items-center space-y-6">
            <Skeleton className="w-[180px] h-[180px] rounded-full" />
            <div className="w-full space-y-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex justify-between">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-3 w-10" />
                  </div>
                  <Skeleton className="h-2.5 w-full rounded-full" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Content */}
        <div className="lg:col-span-8 space-y-8">
          <CardSkeleton />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <CardSkeleton />
            <CardSkeleton />
          </div>
        </div>
      </div>
    </div>
  );
}

export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
          <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-1/4" />
          </div>
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
      ))}
    </div>
  );
}

export default Skeleton;
