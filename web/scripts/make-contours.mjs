// Generates public/textures/contours.svg: a seamless topographic-line tile (BoardEase background #13, contour lines).
// Deterministic (seeded), so the file is reproducible. Run: node scripts/make-contours.mjs
import { writeFileSync } from "node:fs";

const W = 640, H = 640;
let seed = 7;
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

const hills = Array.from({ length: 5 }, () => ({
  x: rand() * W, y: rand() * H, rings: 6 + Math.floor(rand() * 5), gap: 15 + rand() * 7,
  a1: rand() * 6.28, a2: rand() * 6.28, k1: 2 + Math.floor(rand() * 2), k2: 3 + Math.floor(rand() * 3),
}));

function ring(cx, cy, r, h) {
  const pts = [];
  const n = 30;
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * Math.PI * 2;
    const wob = 1 + 0.16 * Math.sin(h.k1 * t + h.a1) + 0.08 * Math.sin(h.k2 * t + h.a2) * (r / 120);
    pts.push([cx + Math.cos(t) * r * wob, cy + Math.sin(t) * r * wob * 0.82]);
  }
  // Catmull-Rom to cubic Bezier for smooth lines
  let d = `M${pts[0][0].toFixed(0)} ${pts[0][1].toFixed(0)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(i - 1, 0)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(i + 2, pts.length - 1)];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${c1[0].toFixed(0)} ${c1[1].toFixed(0)} ${c2[0].toFixed(0)} ${c2[1].toFixed(0)} ${p2[0].toFixed(0)} ${p2[1].toFixed(0)}`;
  }
  return d + "Z";
}

const paths = [];
for (const h of hills) {
  const reach = h.rings * h.gap * 1.25;
  const xs = [0, ...(h.x - reach < 0 ? [W] : []), ...(h.x + reach > W ? [-W] : [])];
  const ys = [0, ...(h.y - reach < 0 ? [H] : []), ...(h.y + reach > H ? [-H] : [])];
  for (const dx of xs) for (const dy of ys) {
    for (let i = 1; i <= h.rings; i++) paths.push(ring(h.x + dx, h.y + dy, i * h.gap, h));
  }
}
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><g fill="none" stroke="#1d1d1f" stroke-width="1" stroke-opacity="0.09" stroke-linejoin="round">${paths.map((p) => `<path d="${p}"/>`).join("")}</g></svg>`;
writeFileSync("public/textures/contours.svg", svg);
console.log(`contours.svg: ${paths.length} paths, ${(svg.length / 1024).toFixed(0)} KB`);
