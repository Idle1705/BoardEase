"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Image from "next/image";
import gsap from "gsap";
import { ChevronLeft, ChevronRight, ImageOff, Maximize2 } from "lucide-react";
import { Lightbox } from "./lightbox";
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
  /** Adds a data-<name> attribute to the frame, e.g. for motion hooks. */
  dataAttr?: string;
  /** When set, shows an expand button that opens the photos full screen under this title. */
  expandTitle?: string;
};

function GalleryInner({
  photos,
  sizes,
  priority,
  className,
  children,
  rounded = "rounded-xl",
  dataAttr,
  expandTitle,
}: GalleryProps) {
  const [index, setIndex] = useState(0);
  const [full, setFull] = useState(false);
  const [prev, setPrev] = useState<number | null>(null);
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

  // Drop the outgoing layer once its 300 ms fade (globals.css .be-fade-out) has finished
  useEffect(() => {
    if (prev === null) return;
    const t = window.setTimeout(() => setPrev(null), 320);
    return () => window.clearTimeout(t);
  }, [prev, index]);

  const go = (d: 1 | -1) => {
    if (count < 2) return;
    dir.current = d;
    setPrev(index);
    setIndex((index + d + count) % count);
  };

  const photo = photos[index];
  const outgoing = prev !== null && prev !== index && !broken[prev] ? photos[prev] : null;

  return (
    <div
      ref={frame}
      {...(dataAttr ? { [`data-${dataAttr}`]: "" } : {})}
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
      {outgoing && (
        <Image
          key={`out-${outgoing.src}`}
          src={`${outgoing.src}.webp`}
          alt=""
          aria-hidden
          fill
          sizes={sizes}
          className="be-fade-out object-cover"
        />
      )}
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
          {/* Visible count: tells you how many photos there are before you start clicking */}
          <p className="pointer-events-none absolute bottom-3 left-3 rounded-md bg-ink/70 px-2 py-1 text-caption font-medium tabular-nums text-white">
            <span className="sr-only">Photo </span>
            {index + 1} / {count}
          </p>
          <span className="sr-only" aria-live="polite">
            Photo {index + 1} of {count}
          </span>
        </>
      )}

      {expandTitle && photo && !broken[index] && (
        <>
          <button
            type="button"
            aria-label="Show photos full screen"
            onClick={(e) => {
              e.stopPropagation();
              setFull(true);
            }}
            className="absolute right-3 bottom-3 grid size-10 place-items-center rounded-full bg-white/95 text-ink shadow-md transition-[opacity,scale] duration-150 hover:scale-105 active:scale-[0.97]"
          >
            <Maximize2 className="size-4" strokeWidth={2} />
          </button>
          <Lightbox photos={photos} start={index} open={full} onOpenChange={setFull} title={expandTitle} />
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
        "absolute top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-white/95 text-ink shadow-md transition-[opacity,scale] duration-150",
        "opacity-100 hover:scale-105 active:scale-[0.97] pointer-fine:md:opacity-0 pointer-fine:md:group-hover/gallery:opacity-100 pointer-fine:md:focus-visible:opacity-100",
        side === "left" ? "left-3" : "right-3",
      )}
    >
      <Icon className="size-5" strokeWidth={1.9} />
    </button>
  );
}
