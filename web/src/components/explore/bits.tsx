"use client";

import { useState } from "react";
import { Heart } from "lucide-react";
import { useFavorites } from "@/hooks/use-favorites";
import { cn } from "@/lib/utils";

export function DemoBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center rounded-sm bg-white/95 px-2 text-caption font-semibold text-warn shadow-sm",
        className,
      )}
      title="Demonstration listing, not a real property"
    >
      Demo
    </span>
  );
}

export function FavoriteButton({
  id,
  title,
  className,
  size = "md",
}: {
  id: string;
  title: string;
  className?: string;
  size?: "sm" | "md";
}) {
  const { isSaved, toggle } = useFavorites();
  const [popKey, setPopKey] = useState(0);
  const saved = isSaved(id);
  return (
    <button
      type="button"
      aria-pressed={saved}
      aria-label={saved ? `Remove ${title} from saved` : `Save ${title}`}
      title={saved ? "Saved on this device" : "Save listing"}
      onClick={(e) => {
        e.stopPropagation();
        const nowSaved = toggle(id);
        if (nowSaved) setPopKey((k) => k + 1);
      }}
      className={cn(
        "grid place-items-center rounded-full bg-white/95 text-ink shadow-sm transition-transform duration-150 hover:scale-105 active:scale-95",
        size === "md" ? "size-11" : "size-10",
        className,
      )}
    >
      <Heart
        key={popKey}
        className={cn(
          size === "md" ? "size-[18px]" : "size-4",
          popKey > 0 && saved && "be-pop",
          saved ? "fill-[#e0453a] text-[#e0453a]" : "text-ink",
        )}
        strokeWidth={1.9}
      />
    </button>
  );
}
