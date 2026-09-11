import React from 'react';
import { Star } from 'lucide-react';

interface StarRatingProps {
  /** Rating out of five; fractional values render a partially filled star row. */
  rating: number;
  size?: number;
  /** When true the row is exposed to assistive tech with an accessible label. */
  withLabel?: boolean;
  label?: string;
  className?: string;
}

/**
 * Star rating row. The visual stars are decorative and the numeric value is
 * announced once through a single accessible label, avoiding the "image star
 * image star" screen reader chatter.
 */
export function StarRating({
  rating,
  size = 14,
  withLabel = false,
  label,
  className = '',
}: StarRatingProps) {
  const safeRating = Math.max(0, Math.min(5, rating));

  return (
    <span
      className={`inline-flex items-center gap-0.5 ${className}`}
      role={withLabel ? 'img' : undefined}
      aria-label={withLabel ? label ?? `Rated ${safeRating} out of 5` : undefined}
      aria-hidden={withLabel ? undefined : true}
    >
      {[1, 2, 3, 4, 5].map((index) => {
        const fill = Math.max(0, Math.min(1, safeRating - (index - 1)));

        return (
          <span key={index} className="relative inline-flex" style={{ width: size, height: size }}>
            <Star size={size} className="text-white/20" strokeWidth={1.75} aria-hidden="true" />
            {fill > 0 && (
              <span
                className="absolute inset-0 overflow-hidden"
                style={{ width: `${fill * 100}%` }}
              >
                <Star
                  size={size}
                  className="text-amber-400"
                  strokeWidth={1.75}
                  fill="currentColor"
                  aria-hidden="true"
                />
              </span>
            )}
          </span>
        );
      })}
    </span>
  );
}
