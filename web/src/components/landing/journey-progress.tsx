"use client";

import { useLayoutEffect, useRef } from "react";
import { gsap, ScrollTrigger } from "@/lib/motion";

/**
 * Scroll storytelling for "How BoardEase works" (GSAP ScrollTrigger, Motion Director P3).
 * As the reader scrolls, a thin Fired Clay line draws down the journey and each step number
 * lights up when it is reached. Nothing is pinned and nothing is hidden: without JavaScript or
 * under reduced motion every step shows in full, in clay, with no line.
 */
export function JourneyProgress({ children }: { children: React.ReactNode }) {
  const root = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = root.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // The landing and how-it-works pages scroll inside <main>, not the window
    const scroller = el.closest("main") ?? undefined;
    const fill = el.querySelector<HTMLElement>("[data-rail-fill]");
    const steps = [...el.querySelectorAll<HTMLElement>("[data-step]")];
    el.classList.add("be-steps-ready");

    const ctx = gsap.context(() => {
      if (fill) {
        gsap.fromTo(
          fill,
          { scaleY: 0 },
          {
            scaleY: 1,
            ease: "none",
            scrollTrigger: { trigger: el, scroller, start: "top 72%", end: "bottom 62%", scrub: 0.4 },
          },
        );
      }
      for (const step of steps) {
        ScrollTrigger.create({
          trigger: step,
          scroller,
          start: "top 66%",
          onEnter: () => step.setAttribute("data-active", ""),
          onLeaveBack: () => step.removeAttribute("data-active"),
        });
      }
    }, el);

    // Positions measured before fonts and photos settle are wrong (every step would light at once).
    // Measure again when they have settled, and whenever the page height changes.
    let raf = requestAnimationFrame(() => ScrollTrigger.refresh());
    document.fonts?.ready.then(() => ScrollTrigger.refresh());
    const page = scroller?.firstElementChild ?? el;
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => ScrollTrigger.refresh());
    });
    ro.observe(page);

    return () => {
      ro.disconnect();
      cancelAnimationFrame(raf);
      ctx.revert();
      el.classList.remove("be-steps-ready");
      steps.forEach((s) => s.removeAttribute("data-active"));
    };
  }, []);

  return (
    <div ref={root} className="relative">
      <span aria-hidden className="be-rail pointer-events-none absolute top-7 bottom-7 -left-3 w-0.5 overflow-hidden rounded-full bg-ink/10 sm:-left-5">
        <span data-rail-fill className="block size-full origin-top bg-clay" />
      </span>
      {children}
    </div>
  );
}
