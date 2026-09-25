import { CanvasTexture, ClampToEdgeWrapping, LinearFilter, RepeatWrapping, SRGBColorSpace, type Texture } from 'three';
import { mulberry32 } from '@/core/random';
import { lonLatToPixel } from '../logic/geo';
import { CONTINENTS, INLAND_SEAS } from './continents';

/**
 * Every texture in this world is painted on a 2D canvas at runtime — no image downloads.
 * Results are cached per key so remounting a stop is free.
 */
const cache = new Map<string, Texture>();

function canvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D | null] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')];
}

function cached(key: string, make: () => Texture): Texture {
  const hit = cache.get(key);
  if (hit) return hit;
  const t = make();
  cache.set(key, t);
  return t;
}

const DISPLAY_FONT = '"Fredoka Variable","Fredoka",ui-rounded,system-ui,sans-serif';

function polygon(ctx: CanvasRenderingContext2D, pts: readonly number[], w: number, h: number) {
  ctx.beginPath();
  for (let i = 0; i < pts.length; i += 2) {
    const [x, y] = lonLatToPixel(pts[i] as number, pts[i + 1] as number, w, h);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
}

/** Land mask: red = land, green = blurred land (shallow water near coasts). */
export function landMaskTexture(): Texture {
  return cached('land', () => {
    const w = 1024;
    const h = 512;
    const [c, ctx] = canvas(w, h);
    const [blurC, bctx] = canvas(w, h);
    if (ctx && bctx) {
      const draw = (g: CanvasRenderingContext2D, color: string) => {
        g.fillStyle = '#000';
        g.fillRect(0, 0, w, h);
        g.fillStyle = color;
        for (const p of CONTINENTS) polygon(g, p, w, h);
        g.fillStyle = '#000';
        for (const p of INLAND_SEAS) polygon(g, p, w, h);
      };
      draw(bctx, '#fff');
      draw(ctx, '#f00');
      // Blur a white copy, keep only its green channel, and add it on top of the red land mask.
      const [g2, gctx] = canvas(w, h);
      if (gctx) {
        gctx.filter = 'blur(7px)';
        gctx.drawImage(blurC, 0, 0);
        gctx.filter = 'none';
        gctx.globalCompositeOperation = 'multiply';
        gctx.fillStyle = '#0f0';
        gctx.fillRect(0, 0, w, h);
        ctx.globalCompositeOperation = 'lighter';
        ctx.drawImage(g2, 0, 0);
        ctx.globalCompositeOperation = 'source-over';
      }
    }
    const t = new CanvasTexture(c);
    t.wrapS = RepeatWrapping;
    t.wrapT = ClampToEdgeWrapping;
    t.anisotropy = 4;
    return t;
  });
}

/** Crinkly multi-layer insulation (gold foil) bump map. */
export function foilBumpTexture(): Texture {
  return cached('foil', () => {
    const s = 256;
    const [c, ctx] = canvas(s, s);
    if (ctx) {
      const rand = mulberry32(11);
      ctx.fillStyle = '#808080';
      ctx.fillRect(0, 0, s, s);
      for (let i = 0; i < 260; i++) {
        const v = Math.floor(90 + rand() * 90);
        ctx.fillStyle = `rgb(${v},${v},${v})`;
        ctx.globalAlpha = 0.55;
        ctx.beginPath();
        const x = rand() * s;
        const y = rand() * s;
        const r = 8 + rand() * 26;
        ctx.moveTo(x, y);
        for (let k = 0; k < 5; k++) ctx.lineTo(x + (rand() - 0.5) * r * 2, y + (rand() - 0.5) * r * 2);
        ctx.closePath();
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    const t = new CanvasTexture(c);
    t.wrapS = t.wrapT = RepeatWrapping;
    return t;
  });
}

/** Solar panel: deep blue cells with silver gridlines. */
export function solarTexture(): Texture {
  return cached('solar', () => {
    const w = 256;
    const h = 256;
    const [c, ctx] = canvas(w, h);
    if (ctx) {
      const g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, '#1b3f9e');
      g.addColorStop(0.5, '#23307a');
      g.addColorStop(1, '#122467');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = 'rgba(200,215,255,0.55)';
      ctx.lineWidth = 3;
      const n = 6;
      for (let i = 0; i <= n; i++) {
        ctx.beginPath();
        ctx.moveTo((i * w) / n, 0);
        ctx.lineTo((i * w) / n, h);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, (i * h) / n);
        ctx.lineTo(w, (i * h) / n);
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(160,190,255,0.18)';
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if ((i + j) % 3 === 0) ctx.fillRect((i * w) / n + 4, (j * h) / n + 4, w / n - 8, h / n / 3);
    }
    const t = new CanvasTexture(c);
    t.colorSpace = SRGBColorSpace;
    t.wrapS = t.wrapT = RepeatWrapping;
    return t;
  });
}

/** India's national flag (tricolour with the 24-spoke Ashoka Chakra). */
export function flagTexture(): Texture {
  return cached('flag', () => {
    const w = 300;
    const h = 200;
    const [c, ctx] = canvas(w, h);
    if (ctx) {
      ctx.fillStyle = '#FF9933';
      ctx.fillRect(0, 0, w, h / 3);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, h / 3, w, h / 3);
      ctx.fillStyle = '#138808';
      ctx.fillRect(0, (2 * h) / 3, w, h / 3);
      const cx = w / 2;
      const cy = h / 2;
      const r = h / 6 - 3;
      ctx.strokeStyle = '#000080';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.lineWidth = 1.4;
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
        ctx.stroke();
      }
      ctx.fillStyle = '#000080';
      ctx.beginPath();
      ctx.arc(cx, cy, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    const t = new CanvasTexture(c);
    t.colorSpace = SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  });
}

/** Soft round shadow for blob/contact shadows. */
export function softShadowTexture(): Texture {
  return cached('shadow', () => {
    const s = 128;
    const [c, ctx] = canvas(s, s);
    if (ctx) {
      const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
      g.addColorStop(0, 'rgba(0,0,0,0.85)');
      g.addColorStop(0.45, 'rgba(0,0,0,0.5)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, s, s);
    }
    return new CanvasTexture(c);
  });
}

/** Round badge with a big number (navigation waypoints). */
export function numberTexture(n: number, color: string): Texture {
  return cached(`num:${n}:${color}`, () => {
    const s = 128;
    const [c, ctx] = canvas(s, s);
    if (ctx) {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(s / 2, s / 2, s / 2 - 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(s / 2, s / 2, s / 2 - 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = `700 ${Math.floor(s * 0.52)}px ${DISPLAY_FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(n), s / 2, s / 2 + 4);
    }
    const t = new CanvasTexture(c);
    t.colorSpace = SRGBColorSpace;
    return t;
  });
}

/** Element card that pops out of a zapped rock: big symbol (seniors) or a sparkle gem (younger). */
export function elementTexture(symbol: string, name: string, color: string, showSymbol: boolean): Texture {
  return cached(`el:${symbol}:${showSymbol}`, () => {
    const w = 256;
    const h = 256;
    const [c, ctx] = canvas(w, h);
    if (ctx) {
      ctx.fillStyle = '#ffffff';
      roundRect(ctx, 10, 10, w - 20, h - 20, 44);
      ctx.fill();
      ctx.fillStyle = color;
      roundRect(ctx, 24, 24, w - 48, h - 48, 34);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      roundRect(ctx, 34, 30, w - 68, 50, 24);
      ctx.fill();
      ctx.fillStyle = '#1d2150';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      if (showSymbol) {
        ctx.font = `700 118px ${DISPLAY_FONT}`;
        ctx.fillText(symbol, w / 2, h / 2 - 12);
        ctx.font = `600 34px ${DISPLAY_FONT}`;
        ctx.fillText(name, w / 2, h - 56);
      } else {
        // A friendly gem shape for pre-readers + the name for early readers.
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(w / 2, 52);
        ctx.lineTo(w / 2 + 58, 100);
        ctx.lineTo(w / 2, 168);
        ctx.lineTo(w / 2 - 58, 100);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = 'rgba(29,33,80,0.18)';
        ctx.beginPath();
        ctx.moveTo(w / 2, 52);
        ctx.lineTo(w / 2 + 58, 100);
        ctx.lineTo(w / 2, 100);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#1d2150';
        ctx.font = `600 36px ${DISPLAY_FONT}`;
        ctx.fillText(name, w / 2, h - 52);
      }
    }
    const t = new CanvasTexture(c);
    t.colorSpace = SRGBColorSpace;
    t.minFilter = LinearFilter;
    return t;
  });
}

/** Rover wheel-track stamp: an abstract tread pattern (the real rover's wheels carried national symbols). */
export function trackTexture(): Texture {
  return cached('track', () => {
    const w = 64;
    const h = 64;
    const [c, ctx] = canvas(w, h);
    if (ctx) {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = 'rgba(20,20,26,0.75)';
      for (let i = 0; i < 4; i++) ctx.fillRect(6, 4 + i * 15, w - 12, 7);
      ctx.fillStyle = 'rgba(20,20,26,0.45)';
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, 12, 0, Math.PI * 2);
      ctx.fill();
    }
    return new CanvasTexture(c);
  });
}

/** "Zzz" bubble for sleepy robots. */
export function zzzTexture(): Texture {
  return cached('zzz', () => {
    const s = 128;
    const [c, ctx] = canvas(s, s);
    if (ctx) {
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `700 64px ${DISPLAY_FONT}`;
      ctx.shadowColor = 'rgba(120,140,255,0.9)';
      ctx.shadowBlur = 12;
      ctx.fillText('z', s / 2, s / 2);
    }
    const t = new CanvasTexture(c);
    t.colorSpace = SRGBColorSpace;
    return t;
  });
}

/**
 * Name-tag pill (white, accent border, display font) for 3D labels. Redraws once the web font has
 * loaded so the first frame never shows a fallback font for long.
 */
export function labelTexture(text: string, accent: string): { texture: Texture; aspect: number } {
  const key = `label:${text}:${accent}`;
  const font = `600 44px ${DISPLAY_FONT}`;
  const hit = cache.get(key);
  const [c, ctx] = hit ? [hit.image as HTMLCanvasElement, null] : canvas(8, 96);
  const draw = (g: CanvasRenderingContext2D) => {
    g.font = font;
    const w = Math.ceil(g.measureText(text).width) + 64;
    c.width = w;
    c.height = 96;
    g.font = font;
    g.clearRect(0, 0, w, 96);
    g.fillStyle = 'rgba(0,0,0,0.28)';
    roundRect(g, 6, 12, w - 12, 80, 40);
    g.fill();
    g.fillStyle = accent;
    roundRect(g, 4, 4, w - 8, 80, 40);
    g.fill();
    g.fillStyle = 'rgba(255,255,255,0.97)';
    roundRect(g, 9, 9, w - 18, 70, 35);
    g.fill();
    g.fillStyle = '#1d2150';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(text, w / 2, 46);
  };
  if (!hit && ctx) {
    draw(ctx);
    const t = new CanvasTexture(c);
    t.colorSpace = SRGBColorSpace;
    t.minFilter = LinearFilter;
    t.generateMipmaps = false;
    cache.set(key, t);
    const fonts = typeof document !== 'undefined' ? document.fonts : undefined;
    if (fonts && !fonts.check(font)) {
      fonts
        .load(font)
        .then(() => {
          const g = c.getContext('2d');
          if (g) {
            draw(g);
            t.dispose();
            t.needsUpdate = true;
          }
        })
        .catch(() => undefined);
    }
  }
  const tex = cache.get(key) as Texture;
  const img = tex.image as HTMLCanvasElement;
  return { texture: tex, aspect: img.width / img.height };
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
