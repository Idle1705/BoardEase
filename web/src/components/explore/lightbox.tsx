"use client";

import { useState } from "react";
import Image from "next/image";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import type { ListingPhoto } from "@/lib/listing-types";

/**
 * Full-screen photo viewer. Photos keep their real proportions (object-contain), never cropped.
 * Arrow keys, swipe and buttons move between photos; Esc or the close button returns focus to
 * the expand button (Base UI handles focus trap and return). No autoplay.
 */
export function Lightbox({
  photos,
  start,
  open,
  onOpenChange,
  title,
}: {
  photos: ListingPhoto[];
  start: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-ink/95 transition-opacity duration-200 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
        <DialogPrimitive.Popup
          className="fixed inset-0 z-50 flex flex-col text-porcelain outline-none transition-[opacity,scale] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] data-[ending-style]:scale-[0.98] data-[ending-style]:opacity-0 data-[starting-style]:scale-[0.98] data-[starting-style]:opacity-0"
        >
          {open && <Viewer key={start} photos={photos} start={start} title={title} />}
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function Viewer({ photos, start, title }: { photos: ListingPhoto[]; start: number; title: string }) {
  const [i, setI] = useState(start);
  const [touchX, setTouchX] = useState<number | null>(null);
  const n = photos.length;
  const go = (d: 1 | -1) => n > 1 && setI((v) => (v + d + n) % n);
  const photo = photos[i];
  return (
    <div
      className="flex min-h-0 flex-1 flex-col"
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") go(1);
        if (e.key === "ArrowLeft") go(-1);
      }}
      onTouchStart={(e) => setTouchX(e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchX === null) return;
        const dx = e.changedTouches[0].clientX - touchX;
        setTouchX(null);
        if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
      }}
    >
      <div className="flex h-16 shrink-0 items-center justify-between gap-4 px-4 sm:px-6">
        <DialogPrimitive.Title className="min-w-0 truncate text-body font-medium">{title}</DialogPrimitive.Title>
        <div className="flex items-center gap-3">
          <p className="text-footnote tabular-nums text-porcelain/75" aria-live="polite">
            {i + 1} / {n}
          </p>
          <DialogPrimitive.Close
            aria-label="Close photos"
            className="grid size-11 place-items-center rounded-full bg-porcelain/10 transition-[background-color,scale] duration-150 hover:bg-porcelain/20 active:scale-[0.97]"
          >
            <X className="size-5" />
          </DialogPrimitive.Close>
        </div>
      </div>

      <div className="relative min-h-0 flex-1 px-4 pb-6 sm:px-20">
        {photo && (
          <Image
            key={photo.src}
            src={`${photo.src}.webp`}
            alt={photo.alt}
            fill
            sizes="100vw"
            className="object-contain px-4 pb-6 sm:px-20"
          />
        )}
        {n > 1 && (
          <>
            <ViewerArrow side="left" onClick={() => go(-1)} />
            <ViewerArrow side="right" onClick={() => go(1)} />
          </>
        )}
      </div>
      {photo && <p className="shrink-0 px-6 pb-5 text-center text-footnote text-porcelain/70">{photo.alt}</p>}
    </div>
  );
}

function ViewerArrow({ side, onClick }: { side: "left" | "right"; onClick: () => void }) {
  const Icon = side === "left" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      aria-label={side === "left" ? "Previous photo" : "Next photo"}
      onClick={onClick}
      className={`absolute top-1/2 z-10 grid size-12 -translate-y-1/2 place-items-center rounded-full bg-porcelain/10 transition-[background-color,scale] duration-150 hover:bg-porcelain/20 active:scale-[0.97] ${side === "left" ? "left-3 sm:left-5" : "right-3 sm:right-5"}`}
    >
      <Icon className="size-6" />
    </button>
  );
}
