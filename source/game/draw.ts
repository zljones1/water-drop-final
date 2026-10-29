import {
  GROUND_Y,
  WORLD_H,
  type Cloud,
  type Drop,
  type Floater,
  type Palette,
  type Particle,
  type Ring,
  type Ripple,
} from "./types";

export type GirlPose = {
  x: number;
  phase: number;
  facing: number;
  lean: number;
  squash: number;
  moving: boolean;
  hurt: boolean;
  slosh: number;
  mercy: number;
  blink: boolean;
  spin: number;
  bucket: number;
};

const HIP_Y = -38;
const THIGH = 18;
const SHIN = 16;
const SHOULDER_Y = -57;

function joint(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.beginPath();
  ctx.arc(x, y, 1.8, 0, Math.PI * 2);
  ctx.stroke();
}

function legPose(phase: number, moving: boolean) {
  const thigh = Math.sin(phase) * (moving ? 0.74 : 0.06);
  const knee = moving ? 0.22 + Math.max(0, -Math.cos(phase)) * 1.05 : 0.12;
  const hx = 0;
  const hy = HIP_Y;
  const kx = hx + Math.sin(thigh) * THIGH;
  const ky = hy + Math.cos(thigh) * THIGH;
  const shin = thigh - knee;
  const fx = kx + Math.sin(shin) * SHIN;
  const fy = ky + Math.cos(shin) * SHIN;
  return { hx, hy, kx, ky, fx, fy };
}

function drawSpinLegs(ctx: CanvasRenderingContext2D, spin: number, back: string, front: string) {
  const hubY = -30;
  const radius = 18;
  ctx.strokeStyle = front;
  ctx.beginPath();
  ctx.arc(0, hubY, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.save();
  ctx.globalAlpha *= 0.45;
  ctx.beginPath();
  ctx.arc(0, hubY, radius + 6, spin, spin + 2.4);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, hubY, radius + 11, spin + 1.1, spin + 3.5);
  ctx.stroke();
  ctx.restore();
  for (let i = 0; i < 3; i += 1) {
    const ang = spin + (i * Math.PI * 2) / 3;
    const c = Math.cos(ang);
    const s = Math.sin(ang);
    ctx.strokeStyle = i === 0 ? back : front;
    ctx.beginPath();
    ctx.moveTo(s * 6, hubY + c * 6);
    ctx.lineTo(s * radius, hubY + c * radius);
    ctx.stroke();
    const fx = s * radius;
    const fy = hubY + c * radius;
    ctx.beginPath();
    ctx.moveTo(fx - c * 5, fy + s * 5);
    ctx.lineTo(fx + c * 8, fy - s * 8);
    ctx.lineTo(fx + c * 6 - s * 3.2, fy - s * 6 - c * 3.2);
    ctx.stroke();
  }
  joint(ctx, 0, hubY);
}

function drawLeg(
  ctx: CanvasRenderingContext2D,
  phase: number,
  moving: boolean,
  color: string,
) {
  const p = legPose(phase, moving);
  ctx.strokeStyle = color;
  ctx.beginPath();
  ctx.moveTo(p.hx, p.hy);
  ctx.lineTo(p.kx, p.ky);
  ctx.lineTo(p.fx, p.fy);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(p.fx - 3, p.fy);
  ctx.lineTo(p.fx + 8, p.fy + 0.5);
  ctx.lineTo(p.fx + 7, p.fy - 3.2);
  ctx.stroke();
  joint(ctx, p.hx, p.hy);
  joint(ctx, p.kx, p.ky);
}

function solveArm(
  sx: number,
  sy: number,
  tx: number,
  ty: number,
  l1: number,
  l2: number,
) {
  let dx = tx - sx;
  let dy = ty - sy;
  let dist = Math.hypot(dx, dy);
  const max = l1 + l2 - 0.4;
  const min = Math.abs(l1 - l2) + 0.4;
  dist = Math.max(min, Math.min(max, dist));
  const scale = dist / Math.max(0.001, Math.hypot(dx, dy));
  dx *= scale;
  dy *= scale;
  const ang = Math.atan2(dx, dy);
  const cosA = (l1 * l1 + dist * dist - l2 * l2) / (2 * l1 * dist);
  const off = Math.acos(Math.max(-1, Math.min(1, cosA)));
  const shoulder = ang - off;
  const ex = sx + Math.sin(shoulder) * l1;
  const ey = sy + Math.cos(shoulder) * l1;
  return { sx, sy, ex, ey, fx: sx + dx, fy: sy + dy };
}

function strokeArm(
  ctx: CanvasRenderingContext2D,
  arm: { sx: number; sy: number; ex: number; ey: number; fx: number; fy: number },
  color: string,
) {
  ctx.strokeStyle = color;
  ctx.beginPath();
  ctx.moveTo(arm.sx, arm.sy);
  ctx.lineTo(arm.ex, arm.ey);
  ctx.lineTo(arm.fx, arm.fy);
  ctx.stroke();
  joint(ctx, arm.sx, arm.sy);
  joint(ctx, arm.ex, arm.ey);
  joint(ctx, arm.fx, arm.fy);
}

function pumpArm(phase: number, moving: boolean) {
  const swing = moving ? Math.sin(phase) * 0.42 : 0.08;
  const l1 = 13;
  const l2 = 11;
  const shoulder = 0.25 + swing;
  const elbow = shoulder + 0.85;
  const sx = -1;
  const sy = SHOULDER_Y;
  const ex = sx + Math.sin(shoulder) * l1;
  const ey = sy + Math.cos(shoulder) * l1;
  const fx = ex + Math.sin(elbow) * l2;
  const fy = ey + Math.cos(elbow) * l2;
  return { sx, sy, ex, ey, fx, fy };
}

function drawBucket(ctx: CanvasRenderingContext2D, slosh: number, fill: number, palette: Palette) {
  const bx = 22;
  const by = -46 + Math.sin(slosh * 12) * slosh * 1.5;
  const top = by - 7;
  const bot = by + 6;
  ctx.strokeStyle = palette.line;
  ctx.beginPath();
  ctx.moveTo(bx - 11, top);
  ctx.lineTo(bx - 8.5, by + 7);
  ctx.lineTo(bx + 8.5, by + 7);
  ctx.lineTo(bx + 11, top);
  ctx.closePath();
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(bx, top, 11, 3.1, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(bx, by - 8, 8, Math.PI * 1.12, Math.PI * 1.88);
  ctx.stroke();
  const level = Math.max(0, Math.min(1, fill));
  if (level > 0.04) {
    const y = bot - (bot - top) * level;
    const span = bot - top;
    const t = span === 0 ? 0 : (y - top) / span;
    const half = 10.2 - t * 1.6;
    ctx.save();
    ctx.beginPath();
    ctx.rect(bx - 12, y, 24, bot - y + 3);
    ctx.clip();
    ctx.strokeStyle = palette.rain;
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.moveTo(bx - half, y);
    ctx.lineTo(bx - 7.2, bot);
    ctx.lineTo(bx + 7.2, bot);
    ctx.lineTo(bx + half, y);
    ctx.closePath();
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(bx + slosh * 2, y, Math.max(3, half * 0.62), 2, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  ctx.globalAlpha = 1;
  return { x: bx, y: by - 10 };
}

function drawPigtail(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  cx: number,
  cy: number,
  x1: number,
  y1: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.quadraticCurveTo(cx, cy, x1, y1);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x1, y1, r, 0, Math.PI * 2);
  ctx.stroke();
}

export function drawGirl(ctx: CanvasRenderingContext2D, girl: GirlPose, palette: Palette) {
  const hop = girl.spin > 0 ? 3.2 : girl.moving ? Math.abs(Math.sin(girl.phase)) * 6.2 : Math.sin(girl.phase) * 1.3;
  ctx.save();
  ctx.translate(girl.x, GROUND_Y);
  ctx.strokeStyle = palette.mist;
  ctx.globalAlpha = 0.55;
  ctx.beginPath();
  ctx.ellipse(0, -2, 16 + girl.squash * 8, 4.2, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.translate(girl.x, GROUND_Y - hop);
  ctx.rotate(girl.lean);
  const grow = 1.34;
  ctx.scale(girl.facing * (1 + girl.squash * 0.14) * grow, (1 - girl.squash * 0.1) * grow);
  ctx.globalAlpha = girl.mercy > 0 ? 0.55 : 1;
  ctx.lineWidth = 2.15;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  const backPhase = girl.phase;
  const frontPhase = girl.phase + Math.PI;
  const backFirst = Math.sin(backPhase) < Math.sin(frontPhase);
  const rear = backFirst ? backPhase : frontPhase;
  const fore = backFirst ? frontPhase : backPhase;

  ctx.save();
  ctx.globalAlpha *= 0.14;
  ctx.setLineDash([2, 5]);
  ctx.strokeStyle = palette.mist;
  ctx.strokeRect(-20, -90, 44, 92);
  ctx.beginPath();
  ctx.moveTo(0, -90);
  ctx.lineTo(0, 2);
  ctx.stroke();
  ctx.restore();
  ctx.setLineDash([]);

  if (girl.spin === 0) drawLeg(ctx, rear, girl.moving, palette.mist);

  const swing = Math.sin(girl.phase);
  strokeArm(ctx, pumpArm(girl.phase + Math.PI, girl.spin > 0 ? false : girl.moving), palette.mist);

  ctx.strokeStyle = palette.line;
  ctx.beginPath();
  ctx.moveTo(-2, -56);
  ctx.lineTo(-9, -30 + swing * 1.4);
  ctx.lineTo(11, -32 - swing);
  ctx.lineTo(3, -56);
  ctx.closePath();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(1, -54);
  ctx.lineTo(0, -32);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, -62);
  ctx.lineTo(0, SHOULDER_Y);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(1, -74, 12, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(1, -75.5, 12.6, Math.PI * 1.08, Math.PI * 1.95);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(4, -84);
  ctx.quadraticCurveTo(14, -78, 11, -68);
  ctx.stroke();

  const tail = girl.spin > 0 ? -16 : swing * 7;
  drawPigtail(ctx, -4, -82, -18, -78 + tail * 0.2, -14 + tail, -60, 3.1);
  drawPigtail(ctx, 4, -85, 14, -96, 8 - tail * 0.35, -90, 2.6);

  ctx.beginPath();
  ctx.moveTo(0, -86);
  ctx.lineTo(-7, -91);
  ctx.lineTo(-1, -86);
  ctx.lineTo(-6, -81);
  ctx.closePath();
  ctx.moveTo(0, -86);
  ctx.lineTo(7, -91);
  ctx.lineTo(1, -86);
  ctx.lineTo(6, -81);
  ctx.closePath();
  ctx.stroke();

  if (girl.spin > 0) drawSpinLegs(ctx, girl.spin, palette.mist, palette.line);
  else drawLeg(ctx, fore, girl.moving, palette.line);

  const handle = drawBucket(ctx, girl.slosh, girl.bucket, palette);
  const reach = solveArm(2, SHOULDER_Y, handle.x - 2, handle.y, 13, 12);
  strokeArm(ctx, reach, palette.line);

  ctx.strokeStyle = palette.line;
  ctx.fillStyle = palette.line;
  if (girl.hurt) {
    ctx.beginPath();
    ctx.moveTo(5, -78);
    ctx.lineTo(9, -74);
    ctx.moveTo(9, -78);
    ctx.lineTo(5, -74);
    ctx.moveTo(4, -69);
    ctx.lineTo(10, -69);
    ctx.stroke();
  } else if (girl.blink) {
    ctx.beginPath();
    ctx.moveTo(5, -76);
    ctx.lineTo(10, -76);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(7.2, -76, 1.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(6.2, -72.5, 3.1, 0.25, Math.PI - 0.55);
    ctx.stroke();
  }

  ctx.restore();
}

function teardrop(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x, y - r * 1.55);
  ctx.bezierCurveTo(x + r * 0.2, y - r * 0.35, x + r * 1.05, y + r * 0.25, x, y + r);
  ctx.bezierCurveTo(x - r * 1.05, y + r * 0.25, x - r * 0.2, y - r * 0.35, x, y - r * 1.55);
  ctx.closePath();
}

function blob(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, seed: number, wobble: number) {
  ctx.beginPath();
  const n = 9;
  for (let i = 0; i <= n; i += 1) {
    const a = (i / n) * Math.PI * 2;
    const rr = r * (0.86 + Math.sin(a * 3 + seed) * 0.16 + Math.sin(wobble + i) * 0.04);
    const px = x + Math.cos(a) * rr;
    const py = y + Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

export function drawDrop(
  ctx: CanvasRenderingContext2D,
  drop: Drop,
  alpha: number,
  palette: Palette,
  time: number,
) {
  const x = drop.prevX + (drop.x - drop.prevX) * alpha;
  const y = drop.prevY + (drop.y - drop.prevY) * alpha;
  ctx.lineWidth = 1.6;
  ctx.setLineDash(drop.kind === "dirty" ? [3.5, 2.5] : []);

  if (drop.kind === "dirty") {
    blob(ctx, x, y, drop.r, drop.phase, drop.wobble + time * 4);
    ctx.fillStyle = palette.sludge;
    ctx.globalAlpha = 0.16;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = palette.sludge;
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.arc(x, y, drop.r * 0.38, drop.wobble, drop.wobble + 4);
    ctx.stroke();
    ctx.fillStyle = palette.sludge;
    for (let i = 0; i < 3; i += 1) {
      const a = drop.phase + i * 2.1;
      ctx.fillRect(x + Math.cos(a) * 3 - 1, y + Math.sin(a) * 3 - 1, 2, 2);
    }
  } else {
    teardrop(ctx, x, y, drop.r);
    ctx.fillStyle = palette.rain;
    ctx.globalAlpha = drop.kind === "pure" ? 0.22 : 0.14;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = drop.kind === "pure" ? palette.line : palette.rain;
    ctx.stroke();
    teardrop(ctx, x, y + drop.r * 0.12, drop.r * 0.55);
    ctx.stroke();
    if (drop.kind === "pure") {
      ctx.strokeStyle = palette.rain;
      const s = 4 + Math.sin(time * 8 + drop.phase) * 1.5;
      ctx.beginPath();
      ctx.moveTo(x - s, y);
      ctx.lineTo(x + s, y);
      ctx.moveTo(x, y - s);
      ctx.lineTo(x, y + s);
      ctx.stroke();
    }
  }
  ctx.setLineDash([]);
}

function drawHills(ctx: CanvasRenderingContext2D, palette: Palette, width: number) {
  ctx.strokeStyle = palette.mist;
  ctx.globalAlpha = 0.35;
  ctx.lineWidth = 1.25;
  ctx.beginPath();
  ctx.moveTo(0, GROUND_Y - 78);
  for (let x = 0; x <= width; x += 12) {
    const y = GROUND_Y - 86 - Math.sin(x * 0.018) * 16 - Math.sin(x * 0.007 + 1) * 22;
    ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.globalAlpha = 0.55;
  ctx.beginPath();
  ctx.moveTo(0, GROUND_Y - 36);
  for (let x = 0; x <= width; x += 10) {
    const y = GROUND_Y - 40 - Math.sin(x * 0.03 + 0.6) * 10 - Math.sin(x * 0.011) * 8;
    ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.globalAlpha = 1;
}

function drawShadows(ctx: CanvasRenderingContext2D, drops: Drop[], alpha: number, palette: Palette) {
  for (const drop of drops) {
    const x = drop.prevX + (drop.x - drop.prevX) * alpha;
    const y = drop.prevY + (drop.y - drop.prevY) * alpha;
    const t = Math.max(0, Math.min(1, y / GROUND_Y));
    const rx = 8 + (1 - t) * 18;
    const ry = 2.4 + (1 - t) * 4.2;
    ctx.save();
    ctx.globalAlpha = 0.28 + t * 0.55;
    ctx.strokeStyle = drop.kind === "dirty" ? palette.sludge : palette.rain;
    ctx.lineWidth = 1.3;
    ctx.setLineDash(drop.kind === "dirty" ? [3, 3] : []);
    ctx.beginPath();
    ctx.ellipse(x, GROUND_Y - 1, rx, ry, 0, 0, Math.PI * 2);
    ctx.stroke();
    if (drop.kind === "pure") {
      ctx.beginPath();
      ctx.ellipse(x, GROUND_Y - 1, rx * 0.55, ry * 0.55, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }
  ctx.setLineDash([]);
}

function drawWind(ctx: CanvasRenderingContext2D, wind: number, width: number, palette: Palette) {
  const dir = Math.sign(wind) || 1;
  const mag = Math.min(1, Math.abs(wind));
  const cx = width * 0.5;
  const y = 54;
  const len = 16 + mag * 46;
  ctx.save();
  ctx.strokeStyle = palette.line;
  ctx.globalAlpha = 0.32 + mag * 0.5;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(cx - dir * len, y);
  ctx.lineTo(cx + dir * len, y);
  const hx = cx + dir * len;
  ctx.moveTo(hx, y);
  ctx.lineTo(hx - dir * 8, y - 5);
  ctx.moveTo(hx, y);
  ctx.lineTo(hx - dir * 8, y + 5);
  ctx.stroke();
  const ticks = 1 + Math.round(mag * 3);
  ctx.beginPath();
  for (let i = 0; i < ticks; i += 1) {
    const x = cx - dir * (len * 0.45) + dir * i * 12;
    ctx.moveTo(x, y - 4);
    ctx.lineTo(x + dir * 7, y);
    ctx.lineTo(x, y + 4);
  }
  ctx.stroke();
  ctx.font = '500 11px "IBM Plex Mono", ui-monospace, monospace';
  ctx.fillStyle = palette.mist;
  ctx.textAlign = "center";
  ctx.globalAlpha = 0.8;
  ctx.fillText(mag < 0.12 ? "STILL" : "WIND", cx, y - 12);
  ctx.restore();
}

function drawCloud(ctx: CanvasRenderingContext2D, cloud: Cloud, palette: Palette) {
  ctx.save();
  ctx.translate(cloud.x, cloud.y);
  ctx.strokeStyle = palette.mist;
  ctx.globalAlpha = 0.55;
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.ellipse(0, 0, 26 * cloud.s, 9 * cloud.s, 0, 0, Math.PI * 2);
  ctx.ellipse(16 * cloud.s, 3 * cloud.s, 16 * cloud.s, 7 * cloud.s, 0, 0, Math.PI * 2);
  ctx.ellipse(-16 * cloud.s, 3 * cloud.s, 14 * cloud.s, 6.5 * cloud.s, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

export type Scene = {
  palette: Palette;
  time: number;
  alpha: number;
  girl: GirlPose;
  drops: Drop[];
  particles: Particle[];
  floaters: Floater[];
  ripples: Ripple[];
  rings: Ring[];
  clouds: Cloud[];
  shake: number;
  speed: number;
  reduced: boolean;
  width: number;
  wind: number;
  breath: number;
  sheet: number;
};

export function drawScene(ctx: CanvasRenderingContext2D, scene: Scene) {
  const { palette, width } = scene;
  const sunX = width - 62;
  ctx.fillStyle = palette.sheet;
  ctx.fillRect(0, 0, width, WORLD_H);

  ctx.strokeStyle = palette.rain;
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.08;
  ctx.beginPath();
  for (let x = 20; x < width; x += 20) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, WORLD_H);
  }
  for (let y = 20; y < WORLD_H; y += 20) {
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
  }
  ctx.stroke();
  ctx.globalAlpha = 0.16;
  ctx.beginPath();
  for (let x = 100; x < width; x += 100) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, WORLD_H);
  }
  for (let y = 100; y < WORLD_H; y += 100) {
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
  }
  ctx.stroke();
  ctx.globalAlpha = 1;

  ctx.strokeStyle = palette.mist;
  ctx.globalAlpha = 0.4;
  ctx.beginPath();
  ctx.arc(sunX, 74, 16, 0, Math.PI * 2);
  for (let i = 0; i < 8; i += 1) {
    const a = (i / 8) * Math.PI * 2 + scene.time * 0.15;
    ctx.moveTo(sunX + Math.cos(a) * 20, 74 + Math.sin(a) * 20);
    ctx.lineTo(sunX + Math.cos(a) * 28, 74 + Math.sin(a) * 28);
  }
  ctx.stroke();
  ctx.globalAlpha = 1;

  drawWind(ctx, scene.wind, width, palette);

  for (const cloud of scene.clouds) drawCloud(ctx, cloud, palette);
  drawHills(ctx, palette, width);

  ctx.strokeStyle = palette.line;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, GROUND_Y);
  ctx.lineTo(width, GROUND_Y);
  ctx.moveTo(0, GROUND_Y + 4);
  ctx.lineTo(width, GROUND_Y + 4);
  ctx.stroke();
  ctx.strokeStyle = palette.mist;
  ctx.beginPath();
  for (let x = 0; x <= width; x += 16) {
    const h = x % 80 === 0 ? 12 : 6;
    ctx.moveTo(x, GROUND_Y);
    ctx.lineTo(x, GROUND_Y + h);
  }
  ctx.stroke();

  ctx.globalAlpha = 0.4;
  ctx.beginPath();
  ctx.ellipse(width * 0.18, GROUND_Y - 1, 18, 4, 0, 0, Math.PI * 2);
  ctx.ellipse(width * 0.62, GROUND_Y - 1, 26, 5, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;

  for (const ripple of scene.ripples) {
    if (!ripple.alive) continue;
    const t = 1 - ripple.life / ripple.max;
    ctx.globalAlpha = ripple.life / ripple.max;
    ctx.strokeStyle = ripple.kind === "dirty" ? palette.sludge : palette.rain;
    ctx.beginPath();
    ctx.ellipse(ripple.x, GROUND_Y - 1, 6 + t * 28, 2.2 + t * 6, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  drawShadows(ctx, scene.drops, scene.alpha, palette);

  if (!scene.reduced && Math.abs(scene.speed) > 120) {
    const dir = Math.sign(scene.speed);
    const spinning = scene.girl.spin > 0;
    ctx.strokeStyle = palette.mist;
    ctx.globalAlpha = spinning ? 0.7 : 0.45;
    ctx.beginPath();
    const lines = spinning ? 7 : 4;
    for (let i = 0; i < lines; i += 1) {
      const y = GROUND_Y - 18 - i * 12;
      const len = (spinning ? 28 : 12) + i * 8;
      ctx.moveTo(scene.girl.x - dir * 24, y);
      ctx.lineTo(scene.girl.x - dir * (24 + len), y);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  drawGirl(ctx, scene.girl, palette);

  for (const drop of scene.drops) drawDrop(ctx, drop, scene.alpha, palette, scene.time);

  for (const ring of scene.rings) {
    if (!ring.alive) continue;
    const t = 1 - ring.life / ring.max;
    ctx.globalAlpha = (ring.life / ring.max) * 0.9;
    ctx.strokeStyle = ring.kind === "dirty" ? palette.sludge : palette.rain;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(ring.x, ring.y, 6 + t * 34, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  for (const p of scene.particles) {
    if (!p.alive) continue;
    ctx.globalAlpha = Math.max(0, p.life / p.max);
    ctx.strokeStyle = p.kind === "dirty" ? palette.sludge : p.kind === "pure" ? palette.line : palette.rain;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x - p.vx * 0.035, p.y - p.vy * 0.035);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  ctx.font = '600 15px "IBM Plex Mono", ui-monospace, monospace';
  ctx.textAlign = "center";
  for (const f of scene.floaters) {
    if (!f.alive) continue;
    ctx.globalAlpha = Math.max(0, f.life / f.max);
    ctx.fillStyle = f.kind === "dirty" ? palette.sludge : palette.line;
    ctx.fillText(f.text, f.x, f.y);
  }
  ctx.globalAlpha = 1;

  ctx.font = '500 11px "IBM Plex Mono", ui-monospace, monospace';
  ctx.textAlign = "left";
  ctx.fillStyle = palette.mist;
  ctx.globalAlpha = 0.75;
  ctx.fillText(`DWG-0${scene.sheet}   CATCHER   WIRE`, 12, 22);
  ctx.fillText("CLEAN SOLID   ·   DIRTY DASHED", 12, 36);
  ctx.globalAlpha = 1;

  if (scene.breath > 0) {
    ctx.globalAlpha = Math.min(1, scene.breath);
    ctx.textAlign = "center";
    ctx.fillStyle = palette.line;
    ctx.font = '600 22px Fraunces, Georgia, serif';
    ctx.fillText("SHEET CLEAR", width / 2, 108);
    ctx.font = '500 11px "IBM Plex Mono", ui-monospace, monospace';
    ctx.fillStyle = palette.mist;
    ctx.fillText("BREATHE", width / 2, 126);
    ctx.globalAlpha = 1;
  }

  ctx.strokeStyle = palette.mist;
  ctx.lineWidth = 1.25;
  const m = 10;
  const crop = 14;
  ctx.beginPath();
  ctx.moveTo(m, m + crop);
  ctx.lineTo(m, m);
  ctx.lineTo(m + crop, m);
  ctx.moveTo(width - m - crop, m);
  ctx.lineTo(width - m, m);
  ctx.lineTo(width - m, m + crop);
  ctx.moveTo(m, WORLD_H - m - crop);
  ctx.lineTo(m, WORLD_H - m);
  ctx.lineTo(m + crop, WORLD_H - m);
  ctx.moveTo(width - m - crop, WORLD_H - m);
  ctx.lineTo(width - m, WORLD_H - m);
  ctx.lineTo(width - m, WORLD_H - m - crop);
  ctx.stroke();
}
