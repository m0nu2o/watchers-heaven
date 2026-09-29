'use client';
import { useRef, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CarouselRowProps {
  title: string;
  children: React.ReactNode;
  className?: string;
  seeMoreHref?: string;
  exploreHref?: string;
}

export function CarouselRow({ title, children, className, seeMoreHref }: CarouselRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [isDragging, setIsDragging] = useState(false);

  // Drag tracking refs
  const isPointerDownRef = useRef(false);
  const startXRef = useRef(0);
  const startScrollLeftRef = useRef(0);
  const lastXRef = useRef(0);
  const lastTimeRef = useRef(0);
  const velocityRef = useRef(0);
  const didDragRef = useRef(false);

  // Check scroll boundary to show/hide paddles
  const updateScrollButtons = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 20);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 20);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    updateScrollButtons();
    const handleScroll = () => {
      requestAnimationFrame(updateScrollButtons);
    };

    el.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', updateScrollButtons);

    return () => {
      el.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', updateScrollButtons);
    };
  }, [updateScrollButtons]);

  // Buttery GPU-accelerated smooth sliding via button
  const scroll = (direction: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    const stride = el.clientWidth * 0.75;
    el.scrollBy({
      left: direction === 'left' ? -stride : stride,
      behavior: 'smooth',
    });
  };

  // Pointer drag swiping handlers (Desktop Mouse Drag + Touch Support)
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Only handle primary button (left click or touch)
    if (e.button !== 0) return;
    const el = scrollRef.current;
    if (!el) return;

    isPointerDownRef.current = true;
    startXRef.current = e.clientX;
    startScrollLeftRef.current = el.scrollLeft;
    lastXRef.current = e.clientX;
    lastTimeRef.current = performance.now();
    velocityRef.current = 0;
    didDragRef.current = false;
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isPointerDownRef.current) return;
    const el = scrollRef.current;
    if (!el) return;

    const deltaX = e.clientX - startXRef.current;
    if (!didDragRef.current && Math.abs(deltaX) > 6) {
      didDragRef.current = true;
      setIsDragging(true);
      try {
        el.setPointerCapture(e.pointerId);
      } catch {
        // Ignore pointer capture errors
      }
    }

    if (didDragRef.current) {
      const now = performance.now();
      const dt = Math.max(1, now - lastTimeRef.current);
      const dx = e.clientX - lastXRef.current;
      velocityRef.current = dx / dt;
      lastXRef.current = e.clientX;
      lastTimeRef.current = now;

      el.scrollLeft = startScrollLeftRef.current - deltaX;
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isPointerDownRef.current) return;
    isPointerDownRef.current = false;
    const el = scrollRef.current;

    if (didDragRef.current && el) {
      try {
        if (el.hasPointerCapture(e.pointerId)) {
          el.releasePointerCapture(e.pointerId);
        }
      } catch {
        // Ignore
      }

      // Smooth momentum scrolling based on swipe velocity
      const velocity = velocityRef.current;
      if (Math.abs(velocity) > 0.15) {
        const momentumDistance = -velocity * 320;
        el.scrollBy({
          left: momentumDistance,
          behavior: 'smooth',
        });
      }

      // Briefly keep didDragRef true to absorb the upcoming synthetic click event
      setTimeout(() => {
        didDragRef.current = false;
        setIsDragging(false);
      }, 50);
    } else {
      setIsDragging(false);
    }
  };

  const handlePointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    isPointerDownRef.current = false;
    setIsDragging(false);
    const el = scrollRef.current;
    if (el) {
      try {
        if (el.hasPointerCapture(e.pointerId)) {
          el.releasePointerCapture(e.pointerId);
        }
      } catch {
        // Ignore
      }
    }
    setTimeout(() => {
      didDragRef.current = false;
    }, 50);
  };

  // Prevent card click when user dragged
  const handleClickCapture = (e: React.MouseEvent) => {
    if (didDragRef.current) {
      e.stopPropagation();
      e.preventDefault();
    }
  };

  return (
    <section className={`w-full py-4 ${className || ''}`}>
      {/* Row Header */}
      <div className="flex items-center justify-between gap-3 mb-3 px-4 sm:px-6">
        <h2 className="text-lg sm:text-xl md:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
          {title}
        </h2>

        {/* Apple-style See All */}
        {seeMoreHref && (
          <Link
            href={seeMoreHref}
            className="group/btn inline-flex items-center gap-1 text-xs sm:text-sm font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer"
            title={`See all ${title}`}
          >
            <span>See All</span>
            <ChevronRight className="w-4 h-4 transition-transform duration-200 group-hover/btn:translate-x-1" />
          </Link>
        )}
      </div>

      {/* Carousel Container with Exterior Apple Circular Controls */}
      <div className="group/rail relative w-full overflow-hidden">
        
        {/* Left Circular Apple Button (Positioned in outer gutter, outside cards) */}
        {canScrollLeft && (
          <div className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 z-30 pointer-events-none opacity-0 group-hover/rail:opacity-100 transition-all duration-300">
            <button
              onClick={() => scroll('left')}
              className="pointer-events-auto w-9 h-9 sm:w-10 sm:h-10 rounded-full apple-glass shadow-[0_8px_24px_rgba(0,0,0,0.35)] border border-black/10 dark:border-white/20 text-slate-800 dark:text-white flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 group/paddle cursor-pointer bg-white/90 dark:bg-black/80 hover:bg-white dark:hover:bg-black"
              aria-label="Scroll left"
            >
              <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 text-slate-900 dark:text-white group-hover/paddle:-translate-x-0.5 transition-transform duration-200" strokeWidth={2.4} />
            </button>
          </div>
        )}

        {/* Content Rail with Mouse Drag Swiping & Inertia */}
        <div
          ref={scrollRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
          onClickCapture={handleClickCapture}
          className={`horizontal-rail flex gap-3.5 sm:gap-4 md:gap-5 px-10 sm:px-14 md:px-16 pb-2 pt-1 select-none scroll-smooth cursor-grab active:cursor-grabbing ${
            isDragging ? 'is-dragging' : ''
          }`}
        >
          {children}
        </div>

        {/* Right Circular Apple Button (Positioned in outer gutter, outside cards) */}
        {canScrollRight && (
          <div className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 z-30 pointer-events-none opacity-0 group-hover/rail:opacity-100 transition-all duration-300">
            <button
              onClick={() => scroll('right')}
              className="pointer-events-auto w-9 h-9 sm:w-10 sm:h-10 rounded-full apple-glass shadow-[0_8px_24px_rgba(0,0,0,0.35)] border border-black/10 dark:border-white/20 text-slate-800 dark:text-white flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 group/paddle cursor-pointer bg-white/90 dark:bg-black/80 hover:bg-white dark:hover:bg-black"
              aria-label="Scroll right"
            >
              <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-slate-900 dark:text-white group-hover/paddle:translate-x-0.5 transition-transform duration-200" strokeWidth={2.4} />
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

export default CarouselRow;
