import React from 'react';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export function Skeleton({ className = '', ...props }: SkeletonProps) {
  return (
    <div
      className={`animate-shimmer rounded-xl bg-neutral-200/80 ${className}`}
      aria-hidden="true"
      {...props}
    />
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="flex flex-col bg-white rounded-2xl overflow-hidden border border-neutral-200/80 p-3 space-y-3">
      <Skeleton className="w-full aspect-[4/5] rounded-xl" />
      <Skeleton className="h-4 w-3/4 rounded-md" />
      <Skeleton className="h-3 w-1/2 rounded-md" />
      <div className="pt-2 flex justify-between items-center">
        <Skeleton className="h-5 w-16 rounded-md" />
        <Skeleton className="h-8 w-16 rounded-lg" />
      </div>
    </div>
  );
}
