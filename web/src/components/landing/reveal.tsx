"use client";

import { useEffect, useRef } from "react";

/**
 * Scroll reveal for the landing page. Everything is visible by default (no JavaScript, reduced
 * motion, or before hydration). Only when motion is allowed does this add `.be-reveal-ready`, which
 * hides `[data-reveal]` blocks until they scroll into view; each reveals once and stays.
 * No scroll hijacking: the page scrolls natively and nothing waits on an animation.
 */
export function RevealRoot({ children, className }: { children: React.ReactNode; className?: string }) {
  const root = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = root.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const targets = [...el.querySelectorAll<HTMLElement>("[data-reveal]")];
    // Blocks already on screen at load are shown at once, so nothing visible flickers
    const vh = window.innerHeight;
    for (const t of targets) if (t.getBoundingClientRect().top < vh * 0.92) t.dataset.shown = "";
    el.classList.add("be-reveal-ready");
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            (e.target as HTMLElement).dataset.shown = "";
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: "0px 0px -12% 0px" },
    );
    for (const t of targets) if (!("shown" in t.dataset)) io.observe(t);
    return () => io.disconnect();
  }, []);
  return (
    <main id="main" ref={root} className={className}>
      {children}
    </main>
  );
}
