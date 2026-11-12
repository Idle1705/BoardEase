"use client";

import { useLayoutEffect } from "react";
import { gsap, ScrollTrigger } from "@/lib/motion";

/*
 * Supporting scroll motion for the landing page (Motion Director, docs/web/DESIGN_SYSTEM.md).
 * Each scene moves one element, scrubbed to scroll, transform/opacity/clip-path only.
 * Text never moves with scroll. Under reduced motion nothing here runs: the page is already in
 * its final state in the markup.
 */
export function ScrollScenes() {
  useLayoutEffect(() => {
    const main = document.querySelector<HTMLElement>("main#main");
    if (!main) return;
    const scroller = main;
    const mm = gsap.matchMedia();

    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const $ = (s: string) => [...main.querySelectorAll<HTMLElement>(s)];
      const hero = main.querySelector("section");

      // Hero: as you scroll away, the photos drift up at different speeds (depth), the text stays put
      if (hero) {
        const leave = { trigger: hero, scroller, start: "top top", end: "bottom top", scrub: 0.5 };
        // Explicit start values: GSAP must not capture a mid-entrance scale from the CSS animation
        gsap.fromTo($("[data-scene=hero-main]"), { y: 0, scale: 1 }, { y: -36, scale: 0.97, ease: "none", scrollTrigger: leave });
        gsap.fromTo($("[data-scene=hero-back]"), { y: 0, scale: 1 }, { y: -96, scale: 1, ease: "none", scrollTrigger: leave });
        gsap.fromTo($("[data-scene=hero-card]"), { y: 0, scale: 1 }, { y: -64, scale: 1, ease: "none", scrollTrigger: leave });
      }

      // Photos open from an inset frame and settle out of a slight zoom as they enter
      for (const frame of $("[data-scene=wipe]")) {
        const r = Number(frame.dataset.radius ?? 0);
        const img = frame.querySelector("img");
        const enter = { trigger: frame, scroller, start: "top 92%", end: "top 40%", scrub: 0.5 };
        gsap.fromTo(frame, { clipPath: `inset(9% 7% 9% 7% round ${r + 20}px)` }, { clipPath: `inset(0% 0% 0% 0% round ${r}px)`, ease: "none", scrollTrigger: enter });
        if (img) gsap.fromTo(img, { scale: 1.14 }, { scale: 1, ease: "none", scrollTrigger: enter });
      }

      // Closing section: the corridor eases out of a zoom, the clay rule draws in
      for (const photo of $("[data-scene=cta-photo]")) {
        const img = photo.querySelector("img");
        if (img) gsap.fromTo(img, { scale: 1.18 }, { scale: 1, ease: "none", scrollTrigger: { trigger: photo, scroller, start: "top bottom", end: "bottom 60%", scrub: 0.5 } });
      }
      for (const bar of $("[data-scene=cta-bar]")) {
        gsap.fromTo(bar, { scaleX: 0 }, { scaleX: 1, ease: "none", scrollTrigger: { trigger: bar, scroller, start: "top 90%", end: "top 55%", scrub: 0.5 } });
      }

      // Positions shift once fonts and photos settle; measure again then
      const raf = requestAnimationFrame(() => ScrollTrigger.refresh());
      document.fonts?.ready.then(() => ScrollTrigger.refresh());
      return () => cancelAnimationFrame(raf);
    });

    return () => mm.revert();
  }, []);
  return null;
}
