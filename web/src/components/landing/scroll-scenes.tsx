"use client";

import { useLayoutEffect } from "react";
import { gsap, ScrollTrigger } from "@/lib/motion";

/*
 * Supporting scroll motion for the landing page (Motion Director, docs/web/DESIGN_SYSTEM.md).
 * Photographs open through a straight-edged mask as they enter and drift a few percent inside their
 * frames as the page scrolls. Scrubbed to scroll, transform and clip-path only.
 * Text never moves with scroll. Under reduced motion photos only
 * fade in once; without JavaScript the markup is already the final state.
 */
export function ScrollScenes() {
  useLayoutEffect(() => {
    const main = document.querySelector<HTMLElement>("main#main");
    if (!main) return;
    const scroller = main;
    const mm = gsap.matchMedia();

    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const $ = (s: string) => [...main.querySelectorAll<HTMLElement>(s)];

      // Frames open from the bottom through a straight mask as they arrive (clip-path, scrubbed)
      for (const frame of $("[data-scene=mask]")) {
        const enter = { trigger: frame, scroller, start: "top 96%", end: "top 50%", scrub: 0.6 };
        gsap.fromTo(frame, { clipPath: "inset(18% 0% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", ease: "none", scrollTrigger: enter });
        // Screenshots (no drift) settle out of a slight zoom instead
        const still = frame.querySelectorAll("img:not([data-drift])");
        if (still.length) gsap.fromTo(still, { scale: 1.08 }, { scale: 1, ease: "none", scrollTrigger: enter });
      }

      // Photos drift a few percent inside their frames over the whole pass (depth, never more than ~5%)
      for (const img of $("img[data-drift]")) {
        const frame = img.parentElement!;
        gsap.fromTo(img, { yPercent: -4, scale: 1.1 }, { yPercent: 4, scale: 1.1, ease: "none", scrollTrigger: { trigger: frame, scroller, start: "top bottom", end: "bottom top", scrub: true } });
      }

      // Hero photo sinks slightly as the hero scrolls away; the text stays put
      for (const img of $("[data-scene=hero-photo] img")) {
        const hero = img.closest("section")!;
        gsap.fromTo(img, { yPercent: 0, scale: 1.06 }, { yPercent: 7, scale: 1.06, ease: "none", scrollTrigger: { trigger: hero, scroller, start: "top top", end: "bottom top", scrub: true } });
      }

      // Closing section: the clay rule draws in before the headline
      for (const bar of $("[data-scene=cta-bar]")) {
        gsap.fromTo(bar, { scaleX: 0 }, { scaleX: 1, ease: "none", scrollTrigger: { trigger: bar, scroller, start: "top 92%", end: "top 60%", scrub: 0.5 } });
      }

      // Positions shift once fonts and photos settle; measure again then
      const raf = requestAnimationFrame(() => ScrollTrigger.refresh());
      document.fonts?.ready.then(() => ScrollTrigger.refresh());
      return () => cancelAnimationFrame(raf);
    });

    // Reduced motion: photos fade in once as they arrive, without moving
    mm.add("(prefers-reduced-motion: reduce)", () => {
      for (const frame of main.querySelectorAll<HTMLElement>("[data-scene=mask]")) {
        gsap.fromTo(frame, { opacity: 0 }, { opacity: 1, duration: 0.8, ease: "power1.out", scrollTrigger: { trigger: frame, scroller, start: "top 92%", once: true } });
      }
    });

    return () => mm.revert();
  }, []);
  return null;
}
