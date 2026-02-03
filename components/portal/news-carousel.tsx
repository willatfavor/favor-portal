"use client";

import { useState, useRef, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NewsCard } from "./news-card";
import type { NewsItem } from "@/lib/portal-mock-data";
import { cn } from "@/lib/utils";

interface NewsCarouselProps {
  items: NewsItem[];
  className?: string;
}

export function NewsCarousel({ items, className }: NewsCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  const scroll = (direction: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    const cardWidth = 320;
    el.scrollBy({
      left: direction === 'left' ? -cardWidth : cardWidth,
      behavior: 'smooth',
    });
    setTimeout(updateScrollState, 350);
  };

  return (
    <div className={cn("relative", className)}>
      {/* Scroll buttons */}
      {canScrollLeft && (
        <Button
          variant="secondary"
          size="icon"
          className="absolute -left-3 top-1/2 z-10 h-8 w-8 -translate-y-1/2 rounded-full glass-elevated glass-transition"
          onClick={() => scroll('left')}
          aria-label="Scroll left"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      )}
      {canScrollRight && (
        <Button
          variant="secondary"
          size="icon"
          className="absolute -right-3 top-1/2 z-10 h-8 w-8 -translate-y-1/2 rounded-full glass-elevated glass-transition"
          onClick={() => scroll('right')}
          aria-label="Scroll right"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      )}

      {/* Scrollable track */}
      <div
        ref={scrollRef}
        onScroll={updateScrollState}
        className="flex gap-4 overflow-x-auto scroll-smooth pb-2 scrollbar-none"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {items.map((item) => (
          <div key={item.id} className="w-[300px] shrink-0">
            <NewsCard item={item} />
          </div>
        ))}
      </div>
    </div>
  );
}
