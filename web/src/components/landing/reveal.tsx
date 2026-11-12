"use client";

import { useEffect, useRef } from "react";

/**
 * Scroll reveal for the landing page. Everything is visible by default (no JavaScript or before
 * hydration). Once hydrated this adds `.be-reveal-ready`, which hides `[data-reveal]` blocks until
 * they scroll into view; each reveals once and stays. With reduced motion the reveal is a plain fade.
 * No scroll hijacking: the page scrolls natively and nothing waits on an animation.
 */
export function RevealRoot({ children, className }: { children: React.ReactNode; className?: string }) {
  const root = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    // Reduced motion still gets the reveal, as an opacity fade with no movement (CSS: .be-reduced)
    el.classList.toggle("be-reduced", window.matchMedia("(prefers-reduced-motion: reduce)").matches);
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
