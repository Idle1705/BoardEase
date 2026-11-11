"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Image from "next/image";
import gsap from "gsap";
import { ChevronLeft, ChevronRight, ImageOff } from "lucide-react";
import type { ListingPhoto } from "@/lib/listing-types";
import { cn } from "@/lib/utils";

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

/**
 * Photo carousel: arrow buttons, dots, swipe and arrow keys.
 * GSAP slides the incoming photo 24px in the travel direction; reduced motion swaps instantly.
 */
/** Keyed by the photo set, so another listing starts fresh at its first photo. */
export function Gallery(props: GalleryProps) {
  return <GalleryInner key={props.photos.map((p) => p.src).join("|")} {...props} />;
}

type GalleryProps = {
  photos: ListingPhoto[];
  sizes: string;
  priority?: boolean;
  className?: string;
  children?: React.ReactNode;
  rounded?: string;
};

function GalleryInner({
  photos,
  sizes,
  priority,
  className,
  children,
  rounded = "rounded-xl",
}: {
  photos: ListingPhoto[];
  sizes: string;
  priority?: boolean;
  className?: string;
  children?: React.ReactNode;
  rounded?: string;
}) {
  const [index, setIndex] = useState(0);
  const [broken, setBroken] = useState<Record<number, boolean>>({});
  const dir = useRef(0);
  const frame = useRef<HTMLDivElement>(null);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const count = photos.length;

  useIsoLayoutEffect(() => {
    const el = frame.current?.querySelector("[data-photo]");
    if (!el || dir.current === 0) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const tween = gsap.fromTo(el, { x: dir.current * 24, opacity: 0.35 }, { x: 0, opacity: 1, duration: 0.28, ease: "power2.out" });
    return () => {
      tween.kill();
    };
  }, [index]);

  const go = (d: 1 | -1) => {
    if (count < 2) return;
    dir.current = d;
    setIndex((i) => (i + d + count) % count);
  };

  const photo = photos[index];

  return (
    <div
      ref={frame}
      className={cn("group/gallery relative overflow-hidden bg-surface", rounded, className)}
      role="group"
      aria-roledescription="carousel"
      aria-label="Photos"
      tabIndex={-1}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") go(1);
        if (e.key === "ArrowLeft") go(-1);
      }}
      onTouchStart={(e) => {
        const t = e.touches[0];
        touch.current = { x: t.clientX, y: t.clientY };
      }}
      onTouchEnd={(e) => {
        const start = touch.current;
        touch.current = null;
        if (!start) return;
        const t = e.changedTouches[0];
        const dx = t.clientX - start.x;
        if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(t.clientY - start.y)) go(dx < 0 ? 1 : -1);
      }}
    >
      {photo && !broken[index] ? (
        <Image
          data-photo
          key={photo.src}
          src={`${photo.src}.webp`}
          alt={photo.alt}
          fill
          sizes={sizes}
          priority={priority && index === 0}
          className="object-cover"
          onError={() => setBroken((b) => ({ ...b, [index]: true }))}
        />
      ) : (
        <div className="absolute inset-0 grid place-items-center text-subtle">
          <span className="flex flex-col items-center gap-2 text-footnote">
            <ImageOff className="size-6" strokeWidth={1.5} />
            Photo not available
          </span>
        </div>
      )}

      {children}

      {count > 1 && (
        <>
          <GalleryArrow side="left" label="Previous photo" onClick={() => go(-1)} />
          <GalleryArrow side="right" label="Next photo" onClick={() => go(1)} />
          <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
            <div className="flex items-center gap-1.5 rounded-full bg-black/30 px-2 py-1.5 backdrop-blur-sm">
              {photos.map((p, i) => (
                <span
                  key={p.src + i}
                  className={cn(
                    "h-1.5 rounded-full bg-white transition-all duration-200",
                    i === index ? "w-4 opacity-100" : "w-1.5 opacity-60",
                  )}
                />
              ))}
            </div>
          </div>
          <span className="sr-only" aria-live="polite">
            Photo {index + 1} of {count}
          </span>
        </>
      )}
    </div>
  );
}

function GalleryArrow({ side, label, onClick }: { side: "left" | "right"; label: string; onClick: () => void }) {
  const Icon = side === "left" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={cn(
        "absolute top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-white/95 text-ink shadow-md transition-all duration-150",
        "opacity-100 hover:scale-105 active:scale-95 md:opacity-0 md:group-hover/gallery:opacity-100 md:focus-visible:opacity-100",
        side === "left" ? "left-3" : "right-3",
      )}
    >
      <Icon className="size-5" strokeWidth={1.9} />
    </button>
  );
}
