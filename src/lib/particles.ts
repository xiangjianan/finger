import type { ParticleSettings } from "@/store/settings";

export interface PxPoint {
  x: number;
  y: number;
}
export interface HandInput {
  active: boolean;
  points: PxPoint[];
}

const NUM_HANDS = 2;
const FINGERS = 5;
const TIP_INDEX = [4, 8, 12, 16, 20];

const CONNECTIONS: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20],
  [0, 17],
];

interface RingParticle {
  angle: number;
  wobble: number;
  twinkle: number;
}
interface Ring {
  rx: number;
  ry: number;
  tilt: number;
  speed: number;
  dir: number;
  count: number;
  sizeBase: number;
  hueShift: number;
  particles: RingParticle[];
}
interface Cluster {
  cx: number;
  cy: number;
  tx: number;
  ty: number;
  alpha: number;
  phase: number;
  rings: Ring[];
}
interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  hue: number;
  size: number;
}

function makeRings(seed: number): Ring[] {
  const defs: Omit<Ring, "particles">[] = [
    { rx: 30, ry: 15, tilt: seed, speed: 1.15, dir: 1, count: 12, sizeBase: 2.5, hueShift: 0 },
    { rx: 46, ry: 25, tilt: seed + 0.9, speed: 0.72, dir: -1, count: 9, sizeBase: 1.9, hueShift: -12 },
    { rx: 17, ry: 33, tilt: seed - 0.6, speed: 1.7, dir: 1, count: 7, sizeBase: 2.9, hueShift: 14 },
  ];
  return defs.map((d) => ({
    ...d,
    particles: Array.from({ length: d.count }, (_, i) => ({
      angle: (i / d.count) * Math.PI * 2 + Math.random() * 0.4,
      wobble: Math.random() * Math.PI * 2,
      twinkle: Math.random() * Math.PI * 2,
    })),
  }));
}

function makeCluster(): Cluster {
  return {
    cx: 0,
    cy: 0,
    tx: 0,
    ty: 0,
    alpha: 0,
    phase: Math.random() * Math.PI * 2,
    rings: makeRings(Math.random() * Math.PI),
  };
}

export class ParticleEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private w = 0;
  private h = 0;
  private dpr = 1;
  private sizeScale = 1;
  private sprites = new Map<string, HTMLCanvasElement>();
  private clusters: Cluster[][] = [
    Array.from({ length: FINGERS }, makeCluster),
    Array.from({ length: FINGERS }, makeCluster),
  ];
  private sparks: Spark[] = [];
  private time = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d", { alpha: true })!;
  }

  resize(cssW: number, cssH: number, dpr: number) {
    this.dpr = dpr;
    this.w = cssW;
    this.h = cssH;
    this.canvas.width = Math.max(1, Math.round(cssW * dpr));
    this.canvas.height = Math.max(1, Math.round(cssH * dpr));
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.sizeScale = Math.max(0.7, Math.min(1.7, Math.min(cssW, cssH) / 900));
  }

  get width() {
    return this.w;
  }

  get height() {
    return this.h;
  }

  private glow(hue: number): HTMLCanvasElement {
    const key = String(hue);
    const cached = this.sprites.get(key);
    if (cached) return cached;
    const R = 64;
    const c = document.createElement("canvas");
    c.width = R * 2;
    c.height = R * 2;
    const g = c.getContext("2d")!;
    const grad = g.createRadialGradient(R, R, 0, R, R, R);
    grad.addColorStop(0, `hsla(${hue},100%,97%,1)`);
    grad.addColorStop(0.16, `hsla(${hue},100%,72%,0.95)`);
    grad.addColorStop(0.42, `hsla(${hue},100%,58%,0.42)`);
    grad.addColorStop(0.72, `hsla(${hue},100%,52%,0.12)`);
    grad.addColorStop(1, `hsla(${hue},100%,50%,0)`);
    g.fillStyle = grad;
    g.fillRect(0, 0, R * 2, R * 2);
    this.sprites.set(key, c);
    return c;
  }

  private drawGlow(hue: number, x: number, y: number, size: number, alpha: number) {
    const a = Math.max(0, Math.min(1, alpha));
    if (a <= 0.001 || size <= 0) return;
    this.ctx.globalAlpha = a;
    this.ctx.drawImage(this.glow(hue), x - size / 2, y - size / 2, size, size);
  }

  render(hands: HandInput[], dt: number, settings: ParticleSettings, hues: number[]) {
    const ctx = this.ctx;
    if (this.w === 0 || this.h === 0) return;
    this.time += dt;
    const intensity = settings.intensity;

    ctx.globalCompositeOperation = "destination-out";
    ctx.globalAlpha = 1;
    ctx.fillStyle = "rgba(0,0,0,0.15)";
    ctx.fillRect(0, 0, this.w, this.h);
    ctx.globalCompositeOperation = "lighter";

    for (let h = 0; h < NUM_HANDS; h++) {
      const hand = hands[h];
      for (let f = 0; f < FINGERS; f++) {
        const c = this.clusters[h][f];
        if (hand.active) {
          const p = hand.points[TIP_INDEX[f]];
          c.tx = p.x;
          c.ty = p.y;
          c.alpha += (1 - c.alpha) * Math.min(1, dt * 6);
          const follow = Math.min(1, dt * 8);
          c.cx += (c.tx - c.cx) * follow;
          c.cy += (c.ty - c.cy) * follow;
        } else {
          c.alpha += (0 - c.alpha) * Math.min(1, dt * 4);
        }
        if (c.alpha > 0.01) {
          this.renderCluster(c, hues[f], dt, intensity);
          if (hand.active && Math.random() < 0.55 * intensity) {
            this.emitSpark(c, hues[f]);
          }
        }
      }
    }

    if (settings.showLinks) this.renderArcs(hands, intensity);
    if (settings.showSkeleton) this.renderSkeleton(hands, hues);
    this.renderSparks(dt);

    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  }

  private renderCluster(c: Cluster, hue: number, dt: number, intensity: number) {
    const s = this.sizeScale * intensity;
    const pulse = 0.5 + 0.5 * Math.sin(this.time * 2.2 + c.phase);

    this.drawGlow(hue, c.cx, c.cy, (34 + 12 * pulse) * s, 0.28 * c.alpha);
    this.drawGlow(hue, c.cx, c.cy, (16 + 6 * pulse) * s, 0.55 * c.alpha);
    this.drawGlow(hue, c.cx, c.cy, (7 + 3 * pulse) * s, 0.95 * c.alpha);

    const ctx = this.ctx;
    for (const ring of c.rings) {
      const rx = ring.rx * s;
      const ry = ring.ry * s;
      const ct = Math.cos(ring.tilt + this.time * 0.12 * ring.dir);
      const st = Math.sin(ring.tilt + this.time * 0.12 * ring.dir);
      const ringHue = (hue + ring.hueShift + 360) % 360;

      ctx.setLineDash([3, 11]);
      ctx.lineDashOffset = -this.time * 36 * ring.dir;
      ctx.lineWidth = 1.1;
      ctx.strokeStyle = `hsla(${ringHue},100%,74%,${0.22 * c.alpha})`;
      ctx.beginPath();
      ctx.ellipse(c.cx, c.cy, rx * 1.28, ry * 1.28, ring.tilt, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      for (const p of ring.particles) {
        p.angle += ring.speed * ring.dir * dt;
        const rad = 1 + 0.07 * Math.sin(this.time * 1.3 + p.wobble);
        const ex = Math.cos(p.angle) * rx * rad;
        const ey = Math.sin(p.angle) * ry * rad;
        const px = c.cx + ex * ct - ey * st;
        const py = c.cy + ex * st + ey * ct;
        const tw = 0.65 + 0.35 * Math.sin(this.time * 3.2 + p.twinkle);
        const size = ring.sizeBase * s * (1.6 + tw) * 3;
        this.drawGlow(ringHue, px, py, size, 0.85 * c.alpha * tw);
      }
    }
  }

  private emitSpark(c: Cluster, hue: number) {
    if (this.sparks.length > 240) return;
    const ang = Math.random() * Math.PI * 2;
    const spd = 20 + Math.random() * 70;
    this.sparks.push({
      x: c.cx,
      y: c.cy,
      vx: Math.cos(ang) * spd,
      vy: Math.sin(ang) * spd,
      life: 0.5 + Math.random() * 0.6,
      max: 1.1,
      hue,
      size: 4 + Math.random() * 6,
    });
  }

  private renderSparks(dt: number) {
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const sp = this.sparks[i];
      sp.life -= dt;
      if (sp.life <= 0) {
        this.sparks.splice(i, 1);
        continue;
      }
      sp.x += sp.vx * dt;
      sp.y += sp.vy * dt;
      sp.vx *= 0.94;
      sp.vy *= 0.94;
      const a = (sp.life / sp.max) * 0.9;
      this.drawGlow(sp.hue, sp.x, sp.y, sp.size, a);
    }
  }

  private renderArcs(hands: HandInput[], intensity: number) {
    const ctx = this.ctx;
    for (let h = 0; h < NUM_HANDS; h++) {
      const hand = hands[h];
      if (!hand.active) continue;
      const tips = this.clusters[h];
      for (let f = 0; f < FINGERS - 1; f++) {
        const a = tips[f];
        const b = tips[f + 1];
        const gate = Math.min(a.alpha, b.alpha);
        if (gate < 0.1) continue;
        const seed = h * 10 + f;
        const pulse = 0.04 + 0.12 * Math.abs(Math.sin(this.time * 2.4 + seed));
        const flick = pulse * (0.4 + Math.random() * 0.9) * intensity * gate;
        if (flick < 0.02) continue;
        this.drawArc(a.cx, a.cy, b.cx, b.cy, 190 + f * 12, flick);
      }
    }
  }

  private drawArc(x1: number, y1: number, x2: number, y2: number, hue: number, alpha: number) {
    const ctx = this.ctx;
    const segs = 6;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    for (let i = 1; i < segs; i++) {
      const t = i / segs;
      const jitter = 12 * (1 - Math.abs(0.5 - t) * 2);
      const x = x1 + (x2 - x1) * t + (Math.random() - 0.5) * jitter;
      const y = y1 + (y2 - y1) * t + (Math.random() - 0.5) * jitter;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = `hsla(${hue},100%,72%,${alpha})`;
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.strokeStyle = `hsla(${hue},100%,94%,${Math.min(1, alpha * 1.6)})`;
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }

  private renderSkeleton(hands: HandInput[], hues: number[]) {
    const ctx = this.ctx;
    for (let h = 0; h < NUM_HANDS; h++) {
      const hand = hands[h];
      if (!hand.active) continue;
      ctx.lineWidth = 2;
      ctx.strokeStyle = `hsla(${hues[1]},100%,70%,0.5)`;
      ctx.beginPath();
      for (const [a, b] of CONNECTIONS) {
        const pa = hand.points[a];
        const pb = hand.points[b];
        ctx.moveTo(pa.x, pa.y);
        ctx.lineTo(pb.x, pb.y);
      }
      ctx.stroke();
      for (let i = 0; i < hand.points.length; i++) {
        const p = hand.points[i];
        const isTip = TIP_INDEX.includes(i);
        this.drawGlow(hues[1], p.x, p.y, isTip ? 14 : 7, isTip ? 0.9 : 0.5);
      }
    }
  }
}
