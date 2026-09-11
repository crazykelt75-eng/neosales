'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Sparkles,
  Star,
  ShieldCheck,
  Truck,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
} from 'lucide-react';
import { useStore } from '@/context/StoreContext';
import { CUSTOMER_REVIEWS } from '@/lib/mockData';
import { Product, CustomerReview } from '@/types';
import { Button } from '@/components/ui/Button';

const SLIDE_INTERVAL = 6000; // 6 seconds per slide

interface SpotlightSlide {
  product: Product;
  reviews: CustomerReview[];
  averageRating: number;
  reviewCount: number;
}

function StarRating({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={size}
          className={i <= rating ? 'star-filled' : 'star-empty'}
          fill={i <= rating ? 'currentColor' : 'none'}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

export function HeroSpotlight() {
  const { products, setSelectedProductForModal } = useStore();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const progressKeyRef = useRef(0);
  const currentIndexRef = useRef(0);
  const isTransitioningRef = useRef(false);

  // Build slides from new arrival products that have reviews
  const slides: SpotlightSlide[] = products
    .filter((p) => p.isNewArrival && p.isActive)
    .map((product) => {
      const productReviews = CUSTOMER_REVIEWS.filter((r) => r.productId === product.id);
      const avgRating =
        productReviews.length > 0
          ? productReviews.reduce((sum, r) => sum + r.rating, 0) / productReviews.length
          : 0;
      return {
        product,
        reviews: productReviews,
        averageRating: Math.round(avgRating * 10) / 10,
        reviewCount: productReviews.length,
      };
    })
    .filter((s) => s.reviewCount > 0); // Only show products with reviews

  const slidesLengthRef = useRef(slides.length);
  slidesLengthRef.current = slides.length;

  const goToSlide = useCallback((index: number) => {
    if (isTransitioningRef.current) return;
    isTransitioningRef.current = true;
    setIsTransitioning(true);
    setTimeout(() => {
      currentIndexRef.current = index;
      setCurrentIndex(index);
      progressKeyRef.current += 1;
      setTimeout(() => {
        isTransitioningRef.current = false;
        setIsTransitioning(false);
      }, 50);
    }, 200);
  }, []);

  const nextSlide = useCallback(() => {
    if (slidesLengthRef.current === 0) return;
    goToSlide((currentIndexRef.current + 1) % slidesLengthRef.current);
  }, [goToSlide]);

  const prevSlide = useCallback(() => {
    if (slidesLengthRef.current === 0) return;
    goToSlide((currentIndexRef.current - 1 + slidesLengthRef.current) % slidesLengthRef.current);
  }, [goToSlide]);

  // Auto-advance timer — stable references prevent interval resets
  useEffect(() => {
    if (isPaused || slides.length <= 1) return;
    const timer = setInterval(() => {
      nextSlide();
    }, SLIDE_INTERVAL);
    return () => clearInterval(timer);
  }, [isPaused, slides.length, nextSlide]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') prevSlide();
      if (e.key === 'ArrowRight') nextSlide();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [prevSlide, nextSlide]);

  if (slides.length === 0) return null;

  const slide = slides[currentIndex];
  const featuredReview = slide.reviews[0];

  return (
    <section
      aria-roledescription="carousel"
      aria-label="New arrivals spotlight with customer reviews"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
      className="relative overflow-hidden rounded-3xl bg-[#0a0c12]/95 text-white shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9),0_0_45px_-10px_rgba(255,102,0,0.18)] border border-white/10 group backdrop-blur-xl"
    >
      {/* Progress Bar */}
      <div className="absolute top-0 left-0 right-0 z-20 h-[3px] bg-white/10">
        <div
          key={`progress-${currentIndex}-${progressKeyRef.current}`}
          className="h-full bg-gradient-to-r from-orangeMoney to-amber-400 hero-progress-bar"
          style={{ animationPlayState: isPaused ? 'paused' : 'running' }}
        />
      </div>

      {/* Background product image (right side on desktop, full on mobile) */}
      <div className="absolute inset-0 z-0">
        <img
          src={slide.product.imageUrls[0]}
          alt=""
          aria-hidden="true"
          className="w-full h-full object-cover opacity-20 sm:opacity-30"
        />
        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-r from-neutral-950 via-neutral-950/95 to-neutral-950/60" />
        <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/40 to-transparent" />
      </div>

      {/* Ambient glows */}
      <div
        className="absolute -top-32 -right-32 w-[500px] h-[500px] bg-gradient-to-br from-orangeMoney/20 to-transparent rounded-full blur-3xl pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="absolute -bottom-32 -left-32 w-96 h-96 bg-gradient-to-tr from-bw-blue/15 to-transparent rounded-full blur-3xl pointer-events-none"
        aria-hidden="true"
      />

      {/* Main Content */}
      <div className="relative z-10 p-6 sm:p-10 lg:p-12">
        <div className="flex flex-col lg:flex-row lg:items-center gap-6 lg:gap-12">
          {/* Left: Product Info & Review */}
          <div
            className={`flex-1 max-w-xl space-y-5 transition-all duration-300 ${
              isTransitioning ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'
            }`}
          >
            {/* Top badge - single, clean badge */}
            <div>
              <span className="inline-flex items-center gap-1.5 bg-orangeMoney/15 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-orangeMoney border border-orangeMoney/25">
                <Sparkles size={12} aria-hidden="true" />
                {slide.product.featuredTag || 'New Arrival'}
              </span>
            </div>

            {/* Product Name */}
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight leading-[1.15] text-white">
              {slide.product.title}
            </h2>

            {/* Price & Rating - unified, clean row */}
            <div className="flex items-center gap-4">
              <span className="text-2xl sm:text-3xl font-black text-white font-mono">
                P{slide.product.basePriceBWP}
              </span>
              <span className="h-4 w-px bg-white/20" aria-hidden="true" />
              <div className="flex items-center gap-1.5">
                <StarRating rating={Math.round(slide.averageRating)} size={13} />
                <span className="text-xs font-bold text-white">{slide.averageRating}</span>
                <span className="text-xs text-neutral-400">({slide.reviewCount})</span>
              </div>
            </div>

            {/* Mobile Product Visual Preview */}
            <div className="block lg:hidden w-full relative rounded-2xl overflow-hidden aspect-[16/9] sm:aspect-[2/1] border border-white/10 shadow-elevated my-1">
              <img
                src={slide.product.imageUrls[0]}
                alt={slide.product.title}
                className="w-full h-full object-cover"
                loading="eager"
              />
            </div>

            {/* Customer Review - Minimalist & Elegant */}
            <div className="border-l-2 border-orangeMoney/60 pl-3.5 py-0.5">
              <p className="text-xs sm:text-sm text-neutral-300 italic leading-relaxed line-clamp-2">
                &ldquo;{featuredReview.comment}&rdquo;
              </p>
              <p className="text-[11px] text-neutral-400 font-medium mt-1">
                — {featuredReview.customerName} · Verified Buyer
              </p>
            </div>

            {/* CTA Button */}
            <div className="pt-1">
              <Button
                variant="primary"
                size="lg"
                onClick={() => setSelectedProductForModal(slide.product)}
                rightIcon={<ArrowRight size={18} aria-hidden="true" />}
                className="shadow-glow-orange font-bold px-7"
              >
                Shop Now
              </Button>
            </div>
          </div>

          {/* Right: Clean Product Photography without Clutter Stickers */}
          <div
            className={`hidden lg:block relative w-72 xl:w-80 flex-shrink-0 transition-all duration-500 ${
              isTransitioning ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
            }`}
          >
            <div className="relative aspect-[3/4] rounded-2xl overflow-hidden border border-white/10 shadow-elevated group/img">
              <img
                src={slide.product.imageUrls[0]}
                alt={slide.product.title}
                className="w-full h-full object-cover transition-transform duration-700 group-hover/img:scale-105"
              />
            </div>
          </div>
        </div>

        {/* Bottom: Streamlined reassurance + navigation */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mt-6 pt-5 border-t border-white/10">
          <div className="flex flex-wrap items-center gap-2.5 text-xs text-neutral-300">
            <span className="flex items-center gap-1.5">
              <Truck size={13} className="text-orangeMoney" aria-hidden="true" />
              Free Francistown Pickups
            </span>
            <span className="text-white/20">•</span>
            <span className="flex items-center gap-1.5">
              <ShieldCheck size={13} className="text-emerald-400" aria-hidden="true" />
              Orange Money & FNB Pay2Cell
            </span>
          </div>

          {/* Slide Navigation */}
          {slides.length > 1 && (
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={() => setIsPaused((prev) => !prev)}
                aria-pressed={isPaused}
                aria-label={isPaused ? 'Resume auto-play carousel' : 'Pause auto-play carousel'}
                className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-neutral-400 hover:text-white transition-all focus-visible:outline-2 focus-visible:outline-white"
              >
                {isPaused ? <Play size={13} className="fill-current" aria-hidden="true" /> : <Pause size={13} className="fill-current" aria-hidden="true" />}
              </button>

              <button
                onClick={prevSlide}
                className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-neutral-400 hover:text-white transition-all focus-visible:outline-2 focus-visible:outline-white"
                aria-label="Previous product"
              >
                <ChevronLeft size={16} />
              </button>

              {/* Dot indicators */}
              <div className="flex items-center gap-1.5" role="tablist" aria-label="Product slides">
                {slides.map((_, i) => (
                  <button
                    key={i}
                    role="tab"
                    aria-selected={i === currentIndex}
                    aria-label={`Go to product ${i + 1}: ${slides[i].product.title}`}
                    onClick={() => goToSlide(i)}
                    className={`rounded-full transition-all duration-300 focus-visible:outline-2 focus-visible:outline-white ${
                      i === currentIndex
                        ? 'w-6 h-2 bg-orangeMoney shadow-glow-orange'
                        : 'w-2 h-2 bg-white/25 hover:bg-white/50'
                    }`}
                  />
                ))}
              </div>

              <button
                onClick={nextSlide}
                className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-neutral-400 hover:text-white transition-all focus-visible:outline-2 focus-visible:outline-white"
                aria-label="Next product"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
