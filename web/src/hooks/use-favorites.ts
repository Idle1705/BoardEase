"use client";

import { useCallback, useSyncExternalStore } from "react";

/*
 * Saved listings for signed-out visitors live in this browser only.
 * When accounts arrive, signed-in favourites move to the `favorites` table.
 */
const KEY = "boardease:saved";
const listeners = new Set<() => void>();
let cache: string[] | null = null;

function read(): string[] {
  if (cache) return cache;
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    cache = Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
  } catch {
    cache = [];
  }
  return cache!;
}

function write(ids: string[]) {
  cache = ids;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(ids));
  } catch {
    /* storage blocked: keep the in-memory copy for this visit */
  }
  listeners.forEach((l) => l());
}

const EMPTY: string[] = [];

export function useFavorites() {
  const saved = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    read,
    () => EMPTY,
  );

  const toggle = useCallback((id: string) => {
    const current = read();
    const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
    write(next);
    return next.includes(id);
  }, []);

  return { saved, isSaved: (id: string) => saved.includes(id), toggle };
}
