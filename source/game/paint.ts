import { footOf, frameOf, type GameArt } from "./art";
import type { GirlPose } from "./draw";
import { GROUND_Y, WORLD_H, type Cloud, type Drop, type Floater, type Palette, type Particle, type Ring, type Ripple } from "./types";

export type PaintScene = {
  palette: Palette;
  time: number;
  alpha: number;
  girl: GirlPose;
  drops: Drop[];
  particles: Particle[];
  floaters: Floater[];
  ripples: Ripple[];
  clouds: Cloud[];
  width: number;
  wind: number;
  gust: number;
  breath: number;
  rings: Ring[];
  art: GameArt;
};

function drawSky(ctx: CanvasRenderingContext2D, scene: PaintScene) {
  const { palette, width, art } = scene;
  const sky = ctx.createLinearGradient(0, 0, 0, WORLD_H);
  sky.addColorStop(0, palette.ink);
  sky.addColorStop(0.45, palette.sheet);
  sky.addColorStop(0.78, palette.rain);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, WORLD_H);
  const sun = ctx.createRadialGradient(width - 110, 78, 6, width - 110, 78, 110);
  sun.addColorStop(0, palette.sludge);
  sun.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = sun;
  ctx.globalAlpha = 0.55;
  ctx.beginPath();
  ctx.arc(width - 110, 78, 110, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  const img = art.sky;
  if (!img.complete || img.naturalWidth === 0) return;
  const landH = WORLD_H * 0.5;
  const scale = landH / img.height;
  const dw = img.width * scale;
  for (let x = 0; x < width; x += dw - 1) {
    ctx.drawImage(img, x, WORLD_H - landH, dw, landH);
  }
}

function drawRain(ctx: CanvasRenderingContext2D, scene: PaintScene) {
  const { palette, time, width } = scene;
  ctx.strokeStyle = palette.line;
  ctx.globalAlpha = 0.28;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  for (let i = 0; i < 22; i += 1) {
    const x = (i * 97 + time * (40 + scene.wind * 30)) % (width + 40);
    const y = (i * 53 + time * 180) % (GROUND_Y - 30);
    ctx.moveTo(x, y);
    ctx.lineTo(x + scene.wind * 6, y + 14);
  }
  ctx.stroke();
  ctx.globalAlpha = 1;
}

function drawClouds(ctx: CanvasRenderingContext2D, scene: PaintScene) {
  const img = scene.art.cloud;
  if (!img.complete || img.naturalWidth === 0) return;
  ctx.globalAlpha = 0.9;
  for (const cloud of scene.clouds) {
    const w = 92 * cloud.s;
    const h = 54 * cloud.s;
    ctx.drawImage(img, cloud.x - w / 2, cloud.y - h / 2, w, h);
  }
  ctx.globalAlpha = 1;
}

function landingX(drop: Drop, scene: PaintScene) {
  const y = drop.prevY + (drop.y - drop.prevY) * scene.alpha;
  const x = drop.prevX + (drop.x - drop.prevX) * scene.alpha;
  const target = GROUND_Y - 80;
  if (y >= target) return Math.max(18, Math.min(scene.width - 18, x));
  const remain = (target - y) / Math.max(40, drop.vy);
  const sway = drop.kind === "dirty" ? 28 : 10;
  const omega = 1.7;
  const phase = scene.time * omega + drop.phase;
  const drift = (Math.cos(phase) - Math.cos(phase + omega * remain)) / omega;
  const next = x + scene.gust * remain + drift * sway;
  return Math.max(18, Math.min(scene.width - 18, next));
}

function drawShadows(ctx: CanvasRenderingContext2D, scene: PaintScene) {
  for (const drop of scene.drops) {
    const y = drop.prevY + (drop.y - drop.prevY) * scene.alpha;
    if (y > GROUND_Y) continue;
    const x = landingX(drop, scene);
    const near = Math.max(0, Math.min(1, y / GROUND_Y));
    const rx = 24 - near * 10;
    const ry = 8 - near * 2.4;
    const color =
      drop.kind === "dirty" ? scene.palette.sludge : drop.kind === "pure" ? scene.palette.line : scene.palette.rain;
    ctx.save();
    ctx.translate(x, GROUND_Y + 2);
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.3 + near * 0.28;
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.55;
    ctx.lineWidth = 4.5;
    ctx.strokeStyle = scene.palette.ink;
    ctx.stroke();
    ctx.globalAlpha = 0.95;
    ctx.lineWidth = drop.kind === "dirty" ? 2.4 : 2;
    ctx.strokeStyle = color;
    ctx.setLineDash(drop.kind === "dirty" ? [4, 3] : []);
    ctx.stroke();
    if (drop.kind === "pure") {
      ctx.beginPath();
      ctx.ellipse(0, 0, rx * 0.55, ry * 0.55, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;
}

function drawGirl(ctx: CanvasRenderingContext2D, scene: PaintScene) {
  const girl = scene.girl;
  const key = girl.hurt ? "hurt" : girl.spin > 0 ? "spin" : girl.moving ? "run" : "idle";
  const phase = key === "spin" ? girl.spin * 1.4 : key === "run" ? girl.phase * 1.15 : 0;
  const img = frameOf(scene.art, key, phase);
  if (!img) return;
  const foot = footOf(scene.art, key, phase);
  const h = 168;
  const w = 168;
  const sx = w / img.naturalWidth;
  const sy = h / img.naturalHeight;
  ctx.save();
  ctx.translate(girl.x, GROUND_Y + 18);
  ctx.fillStyle = scene.palette.ink;
  ctx.globalAlpha = 0.28;
  ctx.beginPath();
  ctx.ellipse(0, 3, girl.spin > 0 ? 22 : 14, 2.4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.translate(girl.x, GROUND_Y + 18);
  ctx.scale(girl.facing * (1 + girl.squash * 0.06), 1 - girl.squash * 0.04);
  ctx.rotate(girl.lean * 0.65);
  ctx.globalAlpha = girl.mercy > 0 ? 0.62 : 1;
  ctx.drawImage(img, -foot.x * sx, -foot.y * sy, w, h);
  ctx.restore();
  if (girl.spin > 0) {
    ctx.save();
    ctx.translate(girl.x, GROUND_Y - 36);
    ctx.globalAlpha = 0.7;
    ctx.strokeStyle = scene.palette.line;
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    const back = -girl.facing;
    ctx.beginPath();
    for (let i = 0; i < 3; i += 1) {
      const yy = -18 + i * 14;
      ctx.moveTo(back * 16, yy);
      ctx.lineTo(back * (34 + i * 12), yy);
    }
    ctx.stroke();
    ctx.restore();
  }
}

const BAD_SPRITE = { mud: "dirty", acid: "acid", oil: "oil" } as const;

function drawDrops(ctx: CanvasRenderingContext2D, scene: PaintScene) {
  for (const drop of scene.drops) {
    const x = drop.prevX + (drop.x - drop.prevX) * scene.alpha;
    const y = drop.prevY + (drop.y - drop.prevY) * scene.alpha;
    const img = frameOf(scene.art, drop.kind === "dirty" ? BAD_SPRITE[drop.bad ?? "mud"] : drop.kind, scene.time * 6 + drop.phase);
    const s = drop.r * 4.4;
    if (!img) continue;
    ctx.drawImage(img, x - s / 2, y - s / 2, s, s);
  }
}

function drawSplashes(ctx: CanvasRenderingContext2D, scene: PaintScene) {
  for (const ripple of scene.ripples) {
    if (!ripple.alive) continue;
    const t = 1 - ripple.life / ripple.max;
    const img = frameOf(scene.art, "splash", t * 4);
    if (!img) continue;
    const s = 54 + t * 20;
    ctx.globalAlpha = Math.max(0, ripple.life / ripple.max);
    ctx.drawImage(img, ripple.x - s / 2, GROUND_Y - s * 0.72, s, s);
  }
  ctx.globalAlpha = 1;
}

function drawWind(ctx: CanvasRenderingContext2D, scene: PaintScene) {
  const mag = Math.min(1, Math.abs(scene.wind));
  if (mag < 0.12) return;
  const dir = Math.sign(scene.wind) || 1;
  const len = 16 + mag * 34;
  ctx.save();
  ctx.translate(scene.width * 0.5, 54);
  ctx.scale(dir, 1);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(-len * 0.55, 0);
  ctx.lineTo(len * 0.2, 0);
  ctx.moveTo(-2, -9);
  ctx.lineTo(len * 0.45, 0);
  ctx.lineTo(-2, 9);
  ctx.strokeStyle = scene.palette.ink;
  ctx.lineWidth = 5;
  ctx.stroke();
  ctx.strokeStyle = scene.palette.line;
  ctx.lineWidth = 2.2;
  ctx.stroke();
  ctx.restore();
}

function drawBursts(ctx: CanvasRenderingContext2D, scene: PaintScene) {
  for (const ring of scene.rings) {
    if (!ring.alive) continue;
    const t = 1 - ring.life / ring.max;
    ctx.globalAlpha = (ring.life / ring.max) * 0.85;
    ctx.strokeStyle = ring.kind === "dirty" ? scene.palette.sludge : scene.palette.line;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(ring.x, ring.y, 8 + t * 26, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function drawFx(ctx: CanvasRenderingContext2D, scene: PaintScene) {
  for (const p of scene.particles) {
    if (!p.alive) continue;
    ctx.globalAlpha = Math.max(0, p.life / p.max);
    ctx.fillStyle = p.kind === "dirty" ? scene.palette.sludge : scene.palette.line;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.font = '600 16px "IBM Plex Mono", ui-monospace, monospace';
  ctx.textAlign = "center";
  for (const f of scene.floaters) {
    if (!f.alive) continue;
    ctx.globalAlpha = Math.max(0, f.life / f.max);
    ctx.fillStyle = f.kind === "dirty" ? scene.palette.sludge : scene.palette.line;
    ctx.lineWidth = 3;
    ctx.strokeStyle = scene.palette.ink;
    ctx.strokeText(f.text, f.x, f.y);
    ctx.fillText(f.text, f.x, f.y);
  }
  ctx.globalAlpha = 1;
}

function drawBanner(ctx: CanvasRenderingContext2D, scene: PaintScene) {
  if (scene.breath <= 0) return;
  ctx.globalAlpha = Math.min(1, scene.breath);
  ctx.textAlign = "center";
  ctx.fillStyle = scene.palette.line;
  ctx.font = "600 28px Fraunces, Georgia, serif";
  ctx.fillText("Round clear", scene.width / 2, 118);
  ctx.font = '500 12px "IBM Plex Mono", ui-monospace, monospace';
  ctx.fillStyle = scene.palette.mist;
  ctx.fillText("Breathe", scene.width / 2, 138);
  ctx.globalAlpha = 1;
}

export function drawScene(ctx: CanvasRenderingContext2D, scene: PaintScene) {
  drawSky(ctx, scene);
  drawRain(ctx, scene);
  drawClouds(ctx, scene);
  drawShadows(ctx, scene);
  drawSplashes(ctx, scene);
  drawGirl(ctx, scene);
  drawDrops(ctx, scene);
  drawBursts(ctx, scene);
  drawFx(ctx, scene);
  drawWind(ctx, scene);
  drawBanner(ctx, scene);
}
