// Generates the PWA / Apple touch icons from one SVG. Run: node scripts/make-icons.mjs
import { mkdir, writeFile } from "node:fs/promises";
import sharp from "sharp";

const glyph = (scale) => `
  <g transform="translate(512 512) scale(${scale}) translate(-512 -512)" fill="#fff">
    <rect x="232" y="372" width="72" height="280" rx="28"/>
    <rect x="720" y="372" width="72" height="280" rx="28"/>
    <rect x="168" y="432" width="72" height="160" rx="28"/>
    <rect x="784" y="432" width="72" height="160" rx="28"/>
    <rect x="296" y="476" width="432" height="72" rx="20"/>
  </g>`;

const svg = ({ rounded, scale }) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#3a8bff"/>
      <stop offset="1" stop-color="#1557d6"/>
    </linearGradient>
  </defs>
  <rect width="1024" height="1024" rx="${rounded ? 228 : 0}" fill="url(#g)"/>
  ${glyph(scale)}
</svg>`;

await mkdir("public/icons", { recursive: true });
const any = Buffer.from(svg({ rounded: true, scale: 1 }));
const full = Buffer.from(svg({ rounded: false, scale: 1 })); // iOS rounds the corners itself
const maskable = Buffer.from(svg({ rounded: false, scale: 0.78 })); // keep glyph inside the safe zone

await sharp(any).resize(192).png().toFile("public/icons/icon-192.png");
await sharp(any).resize(512).png().toFile("public/icons/icon-512.png");
await sharp(maskable).resize(512).png().toFile("public/icons/maskable-512.png");
await sharp(full).resize(180).png().toFile("src/app/apple-icon.png");
await writeFile("src/app/icon.svg", svg({ rounded: true, scale: 1 }));
console.log("icons written");
