'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BadgeCheck,
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  ShieldCheck,
  Sparkles,
  Truck,
} from 'lucide-react';
import { useStore } from '@/context/StoreContext';
import { Product } from '@/types';
import { getOptimizedImageUrl } from '@/lib/imageUtils';
import { formatBWP } from '@/lib/format';
import { getProductStatusSummary, getProductTeaser } from '@/lib/product';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { StarRating } from '@/components/ui/StarRating';
import { TRUST_BAR_ITEMS } from '@/lib/mockData';

const SLIDE_DURATION_MS = 6000;

const TRUST_ICONS = [Truck, ShieldCheck, BadgeCheck];

interface Spotlight {
  product: Product;
  rating: number;
  reviewCount: number;
  quote: string;
  reviewer: string;
  reviewerTown: string;
}

/**
 * Hero spotlight carousel highlighting the best-reviewed new arrivals.
 *
 * WCAG 2.2.2 (Pause, Stop, Hide): auto-advance can always be stopped through the
 * explicit Pause/Play toggle, and it also pauses when the tab is hidden or when
 * the visitor prefers reduced motion.
 */
export function HeroSpotlight() {
  const { products, getProductReviews, getProductRating, openProduct } = useStore();

  const [activeIndex, setActiveIndex] = useState(0);
  const [isUserPaused, setIsUserPaused] = useState(false);
  const [isHoverPaused, setIsHoverPaused] = useState(false);
  const [progressKey, setProgressKey] = useState(0);
  const regionRef = useRef<HTMLDivElement | null>(null);

  // Autoplay stops for an explicit user pause, while hovering/focusing the carousel,
  // and when the OS asks for reduced motion.
  const isPaused = isUserPaused || isHoverPaused;

  const spotlights = useMemo<Spotlight[]>(() => {
    return products
      .filter((product) => product.isActive && product.isNewArrival)
      .map((product) => {
        const reviews = getProductReviews(product.id);
        const { average, count } = getProductRating(product.id);
        const topReview = [...reviews].sort((a, b) => b.rating - a.rating)[0];

        return {
          product,
          rating: average,
          reviewCount: count,
          quote: topReview?.comment ?? product.description,
          reviewer: topReview?.customerName ?? 'Verified NeoSales buyer',
          reviewerTown: topReview?.town ?? 'Botswana',
        };
      })
      .filter((spotlight) => !getProductStatusSummary(spotlight.product).isSoldOut)
      .sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount)
      .slice(0, 4);
  }, [products, getProductRating, getProductReviews]);

  const slideCount = spotlights.length;
  const safeIndex = slideCount > 0 ? activeIndex % slideCount : 0;
  const activeSpotlight = spotlights[safeIndex];

  const goToSlide = useCallback(
    (nextIndex: number) => {
      if (slideCount === 0) return;
      setActiveIndex(((nextIndex % slideCount) + slideCount) % slideCount);
      setProgressKey((key) => key + 1);
    },
    [slideCount]
  );

  const goToNextSlide = useCallback(() => goToSlide(safeIndex + 1), [goToSlide, safeIndex]);
  const goToPreviousSlide = useCallback(() => goToSlide(safeIndex - 1), [goToSlide, safeIndex]);

  // Respect the OS-level reduced-motion preference before auto-advancing.
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) setIsUserPaused(true);
  }, []);

  // Auto-advance timer, suspended while paused or when the tab is in the background.
  useEffect(() => {
    if (isPaused || slideCount <= 1) return;

    const timer = window.setInterval(() => {
      if (document.hidden) return;
      setActiveIndex((index) => (index + 1) % slideCount);
      setProgressKey((key) => key + 1);
    }, SLIDE_DURATION_MS);

    return () => window.clearInterval(timer);
  }, [isPaused, slideCount, progressKey]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      goToNextSlide();
    }
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      goToPreviousSlide();
    }
  };

  if (!activeSpotlight) return null;

  const { product, rating, reviewCount, quote, reviewer, reviewerTown } = activeSpotlight;
  const summary = getProductStatusSummary(product);

  return (
    <section aria-label="Featured new arrivals" className="space-y-4">
      <div
        ref={regionRef}
        role="region"
        aria-roledescription="carousel"
        aria-label="New arrivals spotlight"
        onKeyDown={handleKeyDown}
        onMouseEnter={() => setIsHoverPaused(true)}
        onMouseLeave={() => setIsHoverPaused(false)}
        onFocus={() => setIsHoverPaused(true)}
        onBlur={() => setIsHoverPaused(false)}
        className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-surface via-[#0b0e15] to-[#120c07] shadow-card"
      >
        {/* Ambient brand glow */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-orangeMoney/20 blur-3xl"
        />

        <div className="grid gap-0 md:grid-cols-[1.05fr_0.95fr]">
          {/* Story column */}
          <div
            key={product.id}
            className="relative z-10 order-2 flex flex-col justify-center gap-4 p-5 animate-fadeIn sm:p-7 md:order-1"
          >
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="new" icon={<Sparkles size={11} aria-hidden="true" />}>
                New arrival
              </Badge>
              {product.featuredTag && <Badge variant="amber" icon={null}>{product.featuredTag}</Badge>}
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-extrabold leading-tight tracking-tight text-white sm:text-3xl">
                {product.title}
              </h2>
              <p className="max-w-md text-xs leading-relaxed text-neutral-300 sm:text-sm">
                {getProductTeaser(product)}
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <StarRating rating={rating || 5} size={15} withLabel label={`Rated ${rating} out of 5`} />
              <span className="text-xs font-semibold text-neutral-300">
                {(rating || 5).toFixed(1)}
                {reviewCount > 0 && <span className="text-neutral-400"> · {reviewCount} verified reviews</span>}
              </span>
            </div>

            {/* Verified buyer quote */}
            <blockquote className="rounded-2xl border border-white/10 bg-black/35 p-3.5 backdrop-blur">
              <p className="text-xs italic leading-relaxed text-neutral-200">“{quote}”</p>
              <footer className="mt-2 flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-wide text-emerald-300">
                <BadgeCheck size={13} aria-hidden="true" />
                {reviewer} · {reviewerTown}
              </footer>
            </blockquote>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant="primary"
                size="lg"
                onClick={() => openProduct(product)}
                rightIcon={<ChevronRight size={16} />}
              >
                Select option
              </Button>

              <div className="flex flex-col">
                <span className="font-mono text-xl font-black text-white sm:text-2xl" data-price>
                  {formatBWP(summary.minPriceBWP)}
                </span>
                <span className="text-2xs font-semibold uppercase tracking-wide text-neutral-400">
                  {summary.hasPriceRange ? `up to ${formatBWP(summary.maxPriceBWP)}` : 'free Francistown pickup'}
                </span>
              </div>
            </div>

            {/* Carousel controls */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <div className="flex items-center gap-1.5" role="tablist" aria-label="Choose a featured product">
                {spotlights.map((spotlight, index) => (
                  <button
                    key={spotlight.product.id}
                    type="button"
                    role="tab"
                    aria-selected={index === safeIndex}
                    aria-label={`Show ${spotlight.product.title}`}
                    onClick={() => goToSlide(index)}
                    className={`h-2.5 rounded-full transition-all duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orangeMoney ${
                      index === safeIndex
                        ? 'w-7 bg-gradient-to-r from-amber-400 to-orangeMoney'
                        : 'w-2.5 bg-white/25 hover:bg-white/45'
                    }`}
                  />
                ))}
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={goToPreviousSlide}
                  aria-label="Previous featured product"
                  disabled={slideCount <= 1}
                  className="rounded-full border border-white/12 bg-white/[0.05] p-2 text-neutral-200 transition-colors hover:bg-white/[0.12] disabled:opacity-40"
                >
                  <ChevronLeft size={15} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={goToNextSlide}
                  aria-label="Next featured product"
                  disabled={slideCount <= 1}
                  className="rounded-full border border-white/12 bg-white/[0.05] p-2 text-neutral-200 transition-colors hover:bg-white/[0.12] disabled:opacity-40"
                >
                  <ChevronRight size={15} aria-hidden="true" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsUserPaused((paused) => !paused);
                    setProgressKey((key) => key + 1);
                  }}
                  aria-pressed={isUserPaused}
                  aria-label={isUserPaused ? 'Resume automatic slideshow' : 'Pause automatic slideshow'}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.05] px-3 py-2 text-2xs font-bold uppercase tracking-wide text-neutral-200 transition-colors hover:bg-white/[0.12]"
                >
                  {isUserPaused ? <Play size={12} aria-hidden="true" /> : <Pause size={12} aria-hidden="true" />}
                  {isUserPaused ? 'Play' : 'Pause'}
                </button>
              </div>
            </div>
          </div>

          {/* Visual column */}
          <div className="relative order-1 min-h-[240px] overflow-hidden md:order-2 md:min-h-[420px]">
            <img
              key={`${product.id}-${progressKey}-image`}
              src={getOptimizedImageUrl(product.imageUrls[0], 900)}
              alt={product.title}
              width={600}
              height={750}
              loading="eager"
              decoding="async"
              fetchPriority="high"
              className="h-full w-full animate-fadeIn object-cover object-center"
            />
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-t from-[#0b0e15] via-transparent to-transparent md:bg-gradient-to-l md:from-transparent md:via-[#07080c]/20 md:to-[#0b0e15]"
            />

            {summary.isLowStock && (
              <div className="absolute left-4 top-4">
                <Badge variant="lowStock" pulse>
                  Only {summary.totalStock} left
                </Badge>
              </div>
            )}
          </div>
        </div>

        {/* Auto-advance progress bar */}
        {slideCount > 1 && (
          <div
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 h-[3px] bg-white/[0.06]"
          >
            <div
              key={`${safeIndex}-${progressKey}-${isPaused}`}
              className="h-full origin-left bg-gradient-to-r from-amber-400 via-orangeMoney to-orangeMoney-dark"
              style={{
                animation: `heroProgress ${SLIDE_DURATION_MS}ms linear forwards`,
                animationPlayState: isPaused ? 'paused' : 'running',
              }}
            />
          </div>
        )}
      </div>

      {/* Trust bar */}
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {TRUST_BAR_ITEMS.map((item, index) => {
          const Icon = TRUST_ICONS[index] ?? ShieldCheck;

          return (
            <li
              key={item}
              className="flex items-center gap-2.5 rounded-2xl border border-white/10 bg-surface/70 px-3.5 py-3 backdrop-blur"
            >
              <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-300">
                <Icon size={15} aria-hidden="true" />
              </span>
              <span className="text-xs font-semibold text-neutral-200">{item}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
