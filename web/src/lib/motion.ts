"use client";

import gsap from "gsap";
import { Flip } from "gsap/Flip";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/*
 * BoardEase motion vocabulary (docs/web/DESIGN_SYSTEM.md, Motion).
 * Motion explains state: what moved, what is new, what you picked. It never decorates.
 */
if (typeof window !== "undefined") gsap.registerPlugin(Flip, ScrollTrigger);

export { gsap, Flip, ScrollTrigger };

/** Confident arrival: cubic-bezier(0.16, 1, 0.3, 1) */
export const EASE_OUT = "expo.out";
export const EASE_MOVE = "power3.inOut";

export const reducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------- Shared-element hand-off: card photo -> featured photo ---------- */

type MorphSource = { id: string; rect: DOMRect; src: string; radius: number; at: number };
let pending: MorphSource | null = null;

/** Called by a card just before it selects its listing. */
export function setMorphSource(id: string, img: HTMLImageElement | null) {
  if (!img || reducedMotion()) {
    pending = null;
    return;
  }
  pending = {
    id,
    rect: img.getBoundingClientRect(),
    src: img.currentSrc || img.src,
    radius: parseFloat(getComputedStyle(img.closest("[data-card-media]") ?? img).borderTopLeftRadius) || 14,
    at: performance.now(),
  };
}

/** The flight in progress, if any. A new selection completes it at once, so rapid clicks never stack ghosts. */
let active: { tl: gsap.core.Timeline; ghost: HTMLImageElement; target: HTMLElement } | null = null;

function finishActive() {
  if (!active) return;
  const { tl, ghost, target } = active;
  active = null;
  tl.kill();
  ghost.remove();
  gsap.set(target, { opacity: 1 });
}

/** Called by the featured listing after it renders `id`. Returns true when it ran the morph. */
export function runMorphInto(id: string, target: HTMLElement | null): boolean {
  finishActive();
  const src = pending;
  pending = null;
  if (!src || !target || src.id !== id || performance.now() - src.at > 600) return false;
  const to = target.getBoundingClientRect();
  if (!to.width || !to.height) return false;

  const ghost = document.createElement("img");
  ghost.src = src.src;
  ghost.alt = "";
  ghost.setAttribute("aria-hidden", "true");
  Object.assign(ghost.style, {
    position: "fixed",
    zIndex: "60",
    left: `${src.rect.left}px`,
    top: `${src.rect.top}px`,
    width: `${src.rect.width}px`,
    height: `${src.rect.height}px`,
    objectFit: "cover",
    borderRadius: `${src.radius}px`,
    boxShadow: "0 18px 40px -16px rgb(0 0 0 / .35)",
    pointerEvents: "none",
  } satisfies Partial<CSSStyleDeclaration>);
  document.body.appendChild(ghost);

  gsap.set(target, { opacity: 0 });
  const tl = gsap
    .timeline({
      onComplete: () => {
        if (active?.ghost === ghost) active = null;
        gsap.set(target, { opacity: 1 });
        gsap.to(ghost, { opacity: 0, duration: 0.18, onComplete: () => ghost.remove() });
      },
    })
    // Motion #7 (arcs): x and y use different curves, so the photo travels on a curve, not a straight diagonal
    .to(ghost, { left: to.left, width: to.width, duration: 0.56, ease: "power2.inOut" }, 0)
    .to(ghost, { top: to.top, height: to.height, duration: 0.56, ease: "power4.out" }, 0)
    .to(ghost, { borderRadius: 20, duration: 0.56, ease: EASE_MOVE }, 0)
    .to(ghost, { boxShadow: "0 0 0 0 rgb(0 0 0 / 0)", duration: 0.2 }, 0.36);
  active = { tl, ghost, target };
  return true;
}
