import { loadArt } from "./art";
import type { BadKind } from "./types";

const MILESTONES = [
  { at: 25, text: "25 points! Clean water means kids can spend the day in school." },
  { at: 50, text: "50! charity: water has funded clean water for millions of people." },
  { at: 100, text: "100! Every drop counts — that's a whole community's worth." },
];
const BAD_KINDS: BadKind[] = ["mud", "acid", "oil"];
const BAD_MESSAGES: Record<BadKind, string> = {
  mud: "Muddy water. Yuck.",
  acid: "Acid rain! That burns.",
  oil: "Oil spill! Not drinkable.",
};
import type { AudioBus } from "./audio";
import { createAudio } from "./audio";
import type { GirlPose } from "./draw";
import { drawScene } from "./paint";
import {
  GROUND_Y,
  SAVE_KEY,
  WORLD_H,
  WORLD_W,
  type Cloud,
  type Drop,
  type DropKind,
  type Floater,
  type Hud,
  type Mode,
  type Palette,
  type Particle,
  type Ring,
  type Ripple,
} from "./types";

const STEP = 1 / 60;
const MAX_STEPS = 6;
const MAX_SPEED = 340;
const BOOST_SPEED = 980;
const BEST_LIVES = 3;

type Save = { v: 1; best: number; mute: boolean };

function loadSave(): Save {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return { v: 1, best: 0, mute: false };
    const parsed = JSON.parse(raw) as Partial<Save>;
    return {
      v: 1,
      best: typeof parsed.best === "number" && parsed.best > 0 ? Math.floor(parsed.best) : 0,
      mute: Boolean(parsed.mute),
    };
  } catch {
    return { v: 1, best: 0, mute: false };
  }
}

function writeSave(save: Save) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(save));
  } catch {
    // Private mode and quota failures should not stop play.
  }
}

function readPalette(): Palette {
  const style = getComputedStyle(document.documentElement);
  const get = (name: string, fallback: string) => style.getPropertyValue(name).trim() || fallback;
  return {
    ink: get("--color-ink", "#07131f"),
    sheet: get("--color-sheet", "#10283d"),
    line: get("--color-line", "#d7f1ff"),
    mist: get("--color-mist", "#8eafc6"),
    rain: get("--color-rain", "#5ad0ff"),
    sludge: get("--color-sludge", "#e39a4a"),
  };
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function makePool<T>(count: number, create: () => T): T[] {
  return Array.from({ length: count }, create);
}

function radialPad(x: number) {
  const dead = 0.18;
  const mag = Math.abs(x);
  if (mag < dead) return 0;
  return Math.sign(x) * ((mag - dead) / (1 - dead));
}

export type GameApi = {
  start: () => void;
  togglePause: () => void;
  toggleMute: () => void;
  setHold: (side: "left" | "right" | "boost", down: boolean) => void;
  destroy: () => void;
  placeDrop: (kind: DropKind, bad?: BadKind) => void;
  toTitle: () => void;
  getState: () => {
    x: number;
    vx: number;
    score: number;
    lives: number;
    mode: Mode;
    drops: number;
    combo: number;
    sheet: number;
    fill: number;
    wind: number;
  };
};

export function createGame(canvas: HTMLCanvasElement, onHud: (hud: Hud) => void): GameApi {
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas 2D is unavailable.");
  const ctx: CanvasRenderingContext2D = context;

  const audio: AudioBus = createAudio();
  const save = loadSave();
  audio.setMuted(save.mute);

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const palette = readPalette();
  const art = loadArt();
  const keys = new Set<string>();

  let mode: Mode = "title";
  let score = 0;
  let lives = BEST_LIVES;
  let combo = 0;
  let best = save.best;
  let newBest = false;
  let message = "Catch the bright drops. Dodge the muddy ones.";
  let dead = false;
  let raf = 0;
  let last = performance.now();
  let acc = 0;
  let time = 0;
  let spawn = 0.35;
  let trauma = 0;
  let freeze = 0;
  let flash = 0;
  let hurtT = 0;
  let slosh = 0;
  let mercy = 0;
  let squash = 0;
  let squashV = 0;
  let holdLeft = false;
  let holdRight = false;
  let holdBoost = false;
  let pointerDir = 0;
  let pointerId: number | null = null;
  let lastStep = -1;
  let wasSpin = false;
  let spinAngle = 0;
  let sheet = 1;
  let fill = 0;
  let breath = 0;
  let pendingClear = false;
  let wind = 0.45;
  let windFrom = 0.45;
  let windTo = 0.45;
  let windT = 1;
  let windDur = 0;
  let windHold = 3.2;

  const player = {
    x: WORLD_W / 2,
    prevX: WORLD_W / 2,
    vx: 0,
    phase: 0,
    facing: 1,
    lean: 0,
  };

  const drops: Drop[] = [];
  const particles = makePool<Particle>(140, () => ({
    alive: false,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    life: 0,
    max: 1,
    kind: "clean",
  }));
  const floaters = makePool<Floater>(16, () => ({
    alive: false,
    x: 0,
    y: 0,
    text: "",
    life: 0,
    max: 1,
    kind: "clean",
  }));
  const ripples = makePool<Ripple>(20, () => ({
    alive: false,
    x: 0,
    life: 0,
    max: 1,
    kind: "clean",
  }));
  const rings = makePool<Ring>(12, () => ({
    alive: false,
    x: 0,
    y: 0,
    life: 0,
    max: 1,
    kind: "clean",
  }));
  const clouds: Cloud[] = [
    { x: 40, y: 96, s: 1, v: 8 },
    { x: 180, y: 70, s: 1.25, v: 5 },
    { x: 300, y: 120, s: 0.85, v: 11 },
    { x: 120, y: 150, s: 0.7, v: 6 },
  ];

  const view = { cssW: 1, cssH: 1, dpr: 1, scale: 1, ox: 0, oy: 0, worldW: WORLD_W };

  function quotaFor(n: number) {
    return Math.min(16, 6 + n * 2);
  }

  function heat() {
    return clamp((sheet - 1) / 5, 0, 1);
  }

  function fallBase() {
    return 120 + heat() * 170;
  }

  function spawnEvery() {
    return Math.max(0.34, 1.12 - heat() * 0.76);
  }

  function emit() {
    if (dead) return;
    onHud({
      score,
      lives,
      combo,
      sheet,
      fill,
      quota: quotaFor(sheet),
      best,
      message,
      mode,
      muted: audio.muted,
      newBest,
    });
  }

  function take<T extends { alive: boolean }>(pool: T[]): T | null {
    for (const item of pool) {
      if (!item.alive) {
        item.alive = true;
        return item;
      }
    }
    return null;
  }

  function burst(x: number, y: number, kind: DropKind, count: number, power: number) {
    let left = count;
    for (const p of particles) {
      if (p.alive) continue;
      const a = Math.random() * Math.PI * 2;
      const sp = power * (0.45 + Math.random() * 0.7);
      p.alive = true;
      p.x = x;
      p.y = y;
      p.vx = Math.cos(a) * sp;
      p.vy = Math.sin(a) * sp - power * 0.35;
      p.life = p.max = 0.28 + Math.random() * 0.32;
      p.kind = kind;
      left -= 1;
      if (left <= 0) break;
    }
  }

  function popup(x: number, y: number, text: string, kind: DropKind) {
    const f = take(floaters);
    if (!f) return;
    f.x = x;
    f.y = y;
    f.text = text;
    f.kind = kind;
    f.life = f.max = 0.75;
  }

  function ripple(x: number, kind: DropKind) {
    const r = take(ripples);
    if (!r) return;
    r.x = x;
    r.kind = kind;
    r.life = r.max = 0.55;
  }

  function ring(x: number, y: number, kind: DropKind) {
    const r = take(rings);
    if (!r) return;
    r.x = x;
    r.y = y;
    r.kind = kind;
    r.life = r.max = 0.32;
  }

  function makeDrop(kind: DropKind, x: number, y: number, vy: number): Drop {
    return {
      x,
      y,
      prevX: x,
      prevY: y,
      r: kind === "pure" ? 13 : kind === "dirty" ? 12 : 9 + Math.random() * 2,
      vy,
      phase: Math.random() * Math.PI * 2,
      kind,
      bad: kind === "dirty" ? BAD_KINDS[Math.floor(Math.random() * BAD_KINDS.length)] : undefined,
      wobble: Math.random() * Math.PI * 2,
    };
  }

  function spawnDrop(forced?: DropKind, at?: { x: number; y: number }) {
    const roll = Math.random();
    const bad = 0.16 + heat() * 0.22;
    const kind = forced ?? (roll < bad ? "dirty" : roll < bad + 0.07 ? "pure" : "clean");
    const base = fallBase() * (kind === "dirty" ? 1.08 : kind === "pure" ? 0.86 : 1);
    const drop = makeDrop(
      kind,
      at?.x ?? 22 + Math.random() * (view.worldW - 44),
      at?.y ?? -28,
      at ? base : base + Math.random() * 36,
    );
    drops.push(drop);
  }

  function sampleMove() {
    let digital = 0;
    if (keys.has("ArrowLeft") || keys.has("KeyA") || holdLeft) digital -= 1;
    if (keys.has("ArrowRight") || keys.has("KeyD") || holdRight) digital += 1;
    let pad = 0;
    const pads = navigator.getGamepads?.();
    if (pads) {
      for (const gamepad of pads) {
        if (!gamepad) continue;
        const axis = radialPad(gamepad.axes[0] ?? 0);
        if (gamepad.buttons[14]?.pressed) pad -= 1;
        else if (gamepad.buttons[15]?.pressed) pad += 1;
        else if (axis !== 0) pad += axis;
      }
    }
    let move = digital + pad;
    if (move === 0) move = pointerDir;
    return clamp(move, -1, 1);
  }

  function sampleBoost() {
    if (holdBoost || keys.has("ShiftLeft") || keys.has("ShiftRight") || keys.has("KeyF")) return true;
    const pads = navigator.getGamepads?.();
    if (pads) {
      for (const gamepad of pads) {
        if (!gamepad) continue;
        if (gamepad.buttons[0]?.pressed || gamepad.buttons[7]?.pressed) return true;
      }
    }
    return false;
  }

  function catchBox() {
    const width = 86;
    return {
      x: player.x - width / 2 + player.facing * 16,
      y: GROUND_Y - 86,
      w: width,
      h: 112,
    };
  }

  function hitsCatch(drop: Drop) {
    const box = catchBox();
    const nx = clamp(drop.x, box.x, box.x + box.w);
    const ny = clamp(drop.y, box.y, box.y + box.h);
    const dx = drop.x - nx;
    const dy = drop.y - ny;
    return dx * dx + dy * dy <= (drop.r + 4) * (drop.r + 4);
  }

  function award(drop: Drop) {
    combo += drop.kind === "pure" ? 2 : 1;
    const pts = drop.kind === "pure" ? 5 : 1 + Math.floor((combo - 1) / 4);
    score += pts;
    squash = 0.72;
    squashV = 0;
    slosh = 1;
    flash = 0.08;
    trauma = Math.min(1, trauma + (drop.kind === "pure" ? 0.18 : 0.08));
    burst(drop.x, drop.y, drop.kind, drop.kind === "pure" ? 18 : 12, drop.kind === "pure" ? 220 : 160);
    ring(drop.x, drop.y, drop.kind);
    popup(drop.x, drop.y - 16, `+${pts}`, drop.kind);
    if (drop.kind === "pure") {
      audio.catchPure();
      message = "Pure drop. That's the good rain.";
    } else {
      audio.catchClean(combo);
      message = combo >= 2 ? `Clean catch. Streak ×${combo}.` : "Clean catch.";
    }
    if (combo === 5 || combo === 10 || combo === 15) {
      audio.streak();
      message = combo >= 10 ? `Streak of ${combo}. She's flying.` : `Streak of ${combo}.`;
    }
    const milestone = MILESTONES.find((m) => score - pts < m.at && score >= m.at);
    if (milestone) message = milestone.text;
    fill += drop.kind === "pure" ? 2 : 1;
    if (fill >= quotaFor(sheet)) {
      fill = quotaFor(sheet);
      pendingClear = true;
    }
    emit();
  }

  function loseLife(drop: Drop, reason: "dirty" | "miss") {
    if (mercy > 0) return;
    combo = 0;
    mercy = 0.8;
    hurtT = 0.48;
    flash = 0.14;
    if (reason === "dirty") {
      score = Math.max(0, score - 3);
      trauma = Math.min(1, trauma + (reduced ? 0 : 0.55));
      freeze = reduced ? 0 : 0.07;
      audio.dirty();
      burst(drop.x, drop.y, "dirty", 16, 200);
      popup(drop.x, drop.y - 12, "-3", "dirty");
      message = BAD_MESSAGES[drop.bad ?? "mud"];
    } else {
      trauma = Math.min(1, trauma + (reduced ? 0 : 0.26));
      audio.miss();
      message = "A clean drop got away.";
    }
    lives -= 1;
    if (lives <= 0) {
      lives = 0;
      mode = "over";
      newBest = score > best;
      if (newBest) {
        best = score;
        writeSave({ v: 1, best, mute: audio.muted });
      }
      audio.over();
      message = newBest ? "Game over. New best." : "Game over. The sky kept falling.";
    }
    emit();
  }

  function clearSheet() {
    const cleared = sheet;
    const bonus = 5 + cleared * 3;
    score += bonus;
    const healed = lives < BEST_LIVES;
    if (healed) lives += 1;
    breath = 2.3;
    for (const drop of drops) ripple(drop.x, drop.kind);
    drops.length = 0;
    sheet += 1;
    fill = 0;
    flash = 0.16;
    audio.sheet();
    popup(player.x, GROUND_Y - 150, `+${bonus}`, "pure");
    message = healed ? `Round ${cleared} full. Breathe. A heart back.` : `Round ${cleared} full. Breathe.`;
    emit();
  }

  function updateWind(dt: number) {
    if (windDur > 0) {
      windT += dt / windDur;
      if (windT >= 1) {
        wind = windTo;
        windT = 1;
        windDur = 0;
        windHold = 3.2 + Math.random() * 2.4;
      } else {
        const eased = windT * windT * (3 - 2 * windT);
        wind = windFrom + (windTo - windFrom) * eased;
      }
      return;
    }
    windHold -= dt;
    if (windHold > 0) return;
    windFrom = wind;
    const mag = Math.min(1, 0.42 + (sheet - 1) * 0.1 + Math.random() * 0.18);
    const dir = wind >= 0 ? -1 : 1;
    windTo = dir * mag;
    windT = 0;
    windDur = reduced ? 0.05 : 1.05;
  }

  function windPush() {
    return wind * (52 + (sheet - 1) * 18);
  }

  function updatePlayer(dt: number) {
    const move = mode === "over" || mode === "pause" ? 0 : sampleMove();
    const boosting = move !== 0 && mode !== "over" && mode !== "pause" && sampleBoost();
    const cap = boosting ? BOOST_SPEED : MAX_SPEED;
    if (move !== 0) player.vx += move * (boosting ? 7600 : 2400) * dt;
    else player.vx *= Math.exp(-11 * dt);
    if (Math.abs(player.vx) < 10 && move === 0) player.vx = 0;
    if (!boosting && Math.abs(player.vx) > cap) {
      const excess = Math.abs(player.vx) - cap;
      player.vx -= Math.sign(player.vx) * Math.min(excess, 5200 * dt);
    }
    player.vx = clamp(player.vx, -BOOST_SPEED, BOOST_SPEED);
    player.x = clamp(player.x + player.vx * dt, 46, view.worldW - 46);
    if (player.vx > 40) player.facing = 1;
    else if (player.vx < -40) player.facing = -1;
    const targetLean = clamp(player.vx / MAX_SPEED, -1, 1) * (boosting ? 0.24 : 0.16);
    player.lean += (targetLean - player.lean) * (1 - Math.exp(-10 * dt));
    const moving = Math.abs(player.vx) > 28;
    const spinning = boosting && Math.abs(player.vx) > 220 && !reduced;
    player.phase += dt * (spinning ? 16 : moving ? 10.5 + Math.abs(player.vx) / 70 : 1.7);
    spinAngle = spinning ? spinAngle + dt * 28 : 0;
    if (moving && mode === "play" && !spinning) {
      const mark = Math.floor(player.phase / Math.PI);
      if (mark !== lastStep) {
        lastStep = mark;
        audio.step();
      }
    }
    if (spinning && !wasSpin) audio.boost();
    wasSpin = spinning;
    squashV += (-squash * 92 - squashV * 12) * dt;
    squash += squashV * dt;
    squash = clamp(squash, -0.25, 1);
  }

  function updateDrops(dt: number, scored: boolean) {
    const live = scored && breath <= 0;
    if (live) {
      spawn += dt;
      const every = spawnEvery();
      while (spawn >= every && drops.length < 12) {
        spawn -= every;
        spawnDrop();
      }
    }
    for (let i = drops.length - 1; i >= 0; i -= 1) {
      const drop = drops[i]!;
      drop.y += drop.vy * dt;
      const sway = drop.kind === "dirty" ? 28 : 10;
      drop.x += (windPush() + Math.sin(time * 1.7 + drop.phase) * sway) * dt;
      drop.x = clamp(drop.x, 12, view.worldW - 12);
      if (scored && mode === "play" && hitsCatch(drop)) {
        if (drop.kind === "dirty") loseLife(drop, "dirty");
        else award(drop);
        drops.splice(i, 1);
        if (pendingClear) {
          pendingClear = false;
          if (mode === "play") clearSheet();
          break;
        }
        continue;
      }
      if (drop.y - drop.r > GROUND_Y) {
        ripple(drop.x, drop.kind);
        if (scored && mode === "play" && drop.kind !== "dirty") loseLife(drop, "miss");
        drops.splice(i, 1);
      }
    }
    if (pendingClear && mode === "play") {
      pendingClear = false;
      clearSheet();
    } else {
      pendingClear = false;
    }
  }

  function updateFx(dt: number) {
    for (const p of particles) {
      if (!p.alive) continue;
      p.life -= dt;
      p.vy += 520 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.life <= 0) p.alive = false;
    }
    for (const f of floaters) {
      if (!f.alive) continue;
      f.life -= dt;
      f.y -= 38 * dt;
      if (f.life <= 0) f.alive = false;
    }
    for (const r of ripples) {
      if (!r.alive) continue;
      r.life -= dt;
      if (r.life <= 0) r.alive = false;
    }
    for (const r of rings) {
      if (!r.alive) continue;
      r.life -= dt;
      if (r.life <= 0) r.alive = false;
    }
    for (const cloud of clouds) {
      cloud.x += (cloud.v + wind * 22) * dt;
      if (cloud.x > view.worldW + 50) cloud.x = -50;
      else if (cloud.x < -60) cloud.x = view.worldW + 40;
    }
    slosh = Math.max(0, slosh - dt * 1.4);
    mercy = Math.max(0, mercy - dt);
    hurtT = Math.max(0, hurtT - dt);
    flash = Math.max(0, flash - dt);
  }

  function step(dt: number) {
    time += dt;
    player.prevX = player.x;
    for (const drop of drops) {
      drop.prevX = drop.x;
      drop.prevY = drop.y;
    }
    if (mode === "pause" || mode === "over") return;
    updateWind(dt);
    if (breath > 0) {
      breath -= dt;
      if (breath <= 0) {
        breath = 0;
        message = `Round ${sheet}. The wind is stronger.`;
        emit();
      }
    }
    updatePlayer(dt);
    updateDrops(dt, mode === "play");
    updateFx(dt);
    if (mode === "title" && drops.length < 5) {
      spawn += dt;
      if (spawn > 0.7) {
        spawn = 0;
        spawnDrop();
      }
    }
  }

  function girlPose(alpha: number): GirlPose {
    const moving = Math.abs(player.vx) > 28 && mode !== "over";
    return {
      x: player.prevX + (player.x - player.prevX) * alpha,
      phase: player.phase,
      facing: player.facing,
      lean: mode === "over" ? -0.08 : player.lean,
      squash,
      moving,
      hurt: hurtT > 0 || mode === "over",
      slosh,
      mercy,
      blink: !hurtT && Math.sin(time * 1.3) > 0.97,
      spin: reduced ? 0 : spinAngle,
      bucket: fill / quotaFor(sheet),
    };
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    view.cssW = Math.max(1, rect.width);
    view.cssH = Math.max(1, rect.height);
    view.dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(view.cssW * view.dpr);
    canvas.height = Math.round(view.cssH * view.dpr);
    view.scale = Math.min(view.cssW / WORLD_W, view.cssH / WORLD_H);
    const nextW = Math.max(WORLD_W, view.cssW / view.scale);
    const grew = Math.abs(nextW - view.worldW) > 8;
    view.worldW = nextW;
    view.ox = (view.cssW - view.worldW * view.scale) / 2;
    view.oy = (view.cssH - WORLD_H * view.scale) / 2;
    if (mode === "title") {
      player.x = view.worldW / 2;
      player.prevX = player.x;
    } else {
      player.x = clamp(player.x, 46, view.worldW - 46);
      player.prevX = clamp(player.prevX, 46, view.worldW - 46);
    }
    if (grew) {
      clouds.forEach((cloud, i) => {
        cloud.x = ((i + 0.5) / clouds.length) * view.worldW;
      });
    }
  }

  function render(alpha: number) {
    const shake = reduced ? 0 : trauma * trauma;
    const sx = Math.sin(time * 53) * shake * 7;
    const sy = Math.cos(time * 47) * shake * 5;
    ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
    ctx.clearRect(0, 0, view.cssW, view.cssH);
    ctx.fillStyle = palette.ink;
    ctx.fillRect(0, 0, view.cssW, view.cssH);
    ctx.save();
    ctx.translate(view.ox + sx, view.oy + sy);
    ctx.scale(view.scale, view.scale);
    ctx.beginPath();
    ctx.rect(0, 0, view.worldW, WORLD_H);
    ctx.clip();
    drawScene(ctx, {
      palette,
      time,
      alpha,
      girl: girlPose(alpha),
      drops,
      particles,
      floaters,
      ripples,
      clouds,
      width: view.worldW,
      wind,
      gust: windPush(),
      breath,
      rings,
      art,
    });
    if (flash > 0 && !reduced) {
      ctx.fillStyle = flash > 0.1 ? palette.sludge : palette.rain;
      ctx.globalAlpha = flash * 0.22;
      ctx.fillRect(0, 0, view.worldW, WORLD_H);
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  function frame(now: number) {
    if (dead) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    trauma = Math.max(0, trauma - dt * 1.7);
    if (freeze > 0) {
      freeze -= dt;
      flash = Math.max(0, flash - dt);
      render(1);
      raf = requestAnimationFrame(frame);
      return;
    }
    acc += dt;
    let steps = 0;
    while (acc >= STEP && steps < MAX_STEPS) {
      step(STEP);
      acc -= STEP;
      steps += 1;
    }
    if (steps === MAX_STEPS) acc = 0;
    render(clamp(acc / STEP, 0, 1));
    raf = requestAnimationFrame(frame);
  }

  function clearField() {
    drops.length = 0;
    for (const p of particles) p.alive = false;
    for (const f of floaters) f.alive = false;
    for (const r of ripples) r.alive = false;
    for (const r of rings) r.alive = false;
  }

  function start() {
    audio.unlock();
    score = 0;
    lives = BEST_LIVES;
    combo = 0;
    newBest = false;
    spawn = 0;
    mercy = 0;
    hurtT = 0;
    freeze = 0;
    squash = 0;
    mode = "play";
    sheet = 1;
    fill = 0;
    breath = 0;
    pendingClear = false;
    wind = 0;
    windFrom = 0;
    windTo = 0.4;
    windT = 1;
    windDur = 0;
    windHold = 4.5;
    message = "Round 1. The rings show where each drop will land.";
    clearField();
    spawnDrop("clean", { x: player.x, y: -20 });
    audio.start();
    emit();
  }

  function togglePause() {
    if (mode === "play") {
      mode = "pause";
      message = "Paused. The rain is holding.";
      emit();
    } else if (mode === "pause") {
      mode = "play";
      message = "Back under the sky.";
      emit();
    }
  }

  function toggleMute() {
    audio.unlock();
    audio.setMuted(!audio.muted);
    writeSave({ v: 1, best, mute: audio.muted });
    emit();
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.code === "ArrowLeft" || e.code === "ArrowRight" || e.code === "ArrowUp" || e.code === "ArrowDown" || e.code === "Space") {
      e.preventDefault();
    }
    if (e.repeat) return;
    keys.add(e.code);
    if (e.code === "Space" || e.code === "Enter") {
      if (mode === "title" || mode === "over") start();
      else togglePause();
    } else if (e.code === "Escape" || e.code === "KeyP") {
      togglePause();
    } else if (e.code === "KeyM") {
      toggleMute();
    }
  }

  function onKeyUp(e: KeyboardEvent) {
    keys.delete(e.code);
  }

  function clearKeys() {
    keys.clear();
    pointerDir = 0;
    holdLeft = false;
    holdRight = false;
    holdBoost = false;
  }

  function setPointer(clientX: number) {
    const rect = canvas.getBoundingClientRect();
    pointerDir = clientX - rect.left < rect.width / 2 ? -1 : 1;
  }

  function onPointerDown(e: PointerEvent) {
    if (!e.isPrimary || e.button !== 0) return;
    if (mode === "over") return;
    pointerId = e.pointerId;
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {
      pointerId = null;
    }
    setPointer(e.clientX);
  }

  function onPointerMove(e: PointerEvent) {
    if (e.pointerId !== pointerId) return;
    setPointer(e.clientX);
  }

  function onPointerEnd(e: PointerEvent) {
    if (e.pointerId !== pointerId) return;
    pointerId = null;
    pointerDir = 0;
  }

  const resizeObserver = new ResizeObserver(() => resize());
  resizeObserver.observe(canvas);
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", clearKeys);
  function onVisibility() {
    if (document.hidden && mode === "play") {
      mode = "pause";
      message = "Paused while you stepped away.";
      clearKeys();
      emit();
    }
  }
  document.addEventListener("visibilitychange", onVisibility);
  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", onPointerEnd);
  canvas.addEventListener("pointercancel", onPointerEnd);

  resize();
  emit();
  render(1);
  raf = requestAnimationFrame(frame);

  const api: GameApi = {
    start,
    togglePause,
    toggleMute,
    setHold(side, down) {
      if (side === "left") holdLeft = down;
      else if (side === "right") holdRight = down;
      else holdBoost = down;
    },
    placeDrop(kind, bad) {
      spawnDrop(kind, { x: player.x + player.facing * 8, y: GROUND_Y - 70 });
      const last = drops[drops.length - 1];
      if (last && bad && kind === "dirty") last.bad = bad;
    },
    toTitle() {
      if (mode === "play") return;
      mode = "title";
      clearField();
      message = "Catch the bright drops. Dodge the muddy ones.";
      emit();
    },
    getState: () => ({
      x: player.x,
      vx: player.vx,
      score,
      lives,
      mode,
      drops: drops.length,
      combo,
      sheet,
      fill,
      wind,
    }),
    destroy() {
      dead = true;
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", clearKeys);
      document.removeEventListener("visibilitychange", onVisibility);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerEnd);
      canvas.removeEventListener("pointercancel", onPointerEnd);
      audio.destroy();
      if (window.__waterDrop === api) delete window.__waterDrop;
    },
  };

  window.__waterDrop = api;
  return api;
}

declare global {
  interface Window {
    __waterDrop?: GameApi;
  }
}
