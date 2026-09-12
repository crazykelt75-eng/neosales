import React from 'react';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

/** Shimmering placeholder block tuned for the dark luxury surfaces. */
export function Skeleton({ className = '', ...props }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={`shimmer animate-shimmer rounded-xl bg-white/[0.04] ${className}`}
      {...props}
    />
  );
}
