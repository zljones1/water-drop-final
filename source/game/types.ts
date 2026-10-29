export const WORLD_W = 390;
export const WORLD_H = 640;
export const GROUND_Y = 586;

export type DropKind = "clean" | "dirty" | "pure";
export type BadKind = "mud" | "acid" | "oil";
export type Mode = "title" | "play" | "pause" | "over" | "won";
export type Difficulty = "easy" | "normal" | "hard";
export const DIFFICULTIES: Record<Difficulty, { label: string; lives: number; speed: number; spawn: number; goal: number; badChance: number }> = {
  easy: { label: "Easy", lives: 5, speed: 0.8, spawn: 1.25, goal: 40, badChance: 0.18 },
  normal: { label: "Normal", lives: 3, speed: 1, spawn: 1, goal: 75, badChance: 0.26 },
  hard: { label: "Hard", lives: 2, speed: 1.3, spawn: 0.78, goal: 120, badChance: 0.34 },
};

export type Drop = {
  x: number;
  y: number;
  prevX: number;
  prevY: number;
  r: number;
  vy: number;
  phase: number;
  kind: DropKind;
  bad?: BadKind;
  wobble: number;
};

export type Particle = {
  alive: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  kind: DropKind;
};

export type Floater = {
  alive: boolean;
  x: number;
  y: number;
  text: string;
  life: number;
  max: number;
  kind: DropKind;
};

export type Ripple = {
  alive: boolean;
  x: number;
  life: number;
  max: number;
  kind: DropKind;
};

export type Ring = {
  alive: boolean;
  x: number;
  y: number;
  life: number;
  max: number;
  kind: DropKind;
};

export type Cloud = {
  x: number;
  y: number;
  s: number;
  v: number;
};

export type Hud = {
  score: number;
  lives: number;
  combo: number;
  sheet: number;
  fill: number;
  quota: number;
  best: number;
  message: string;
  mode: Mode;
  muted: boolean;
  newBest: boolean;
  goal: number;
  maxLives: number;
  difficulty: Difficulty;
};

export type Palette = {
  ink: string;
  sheet: string;
  line: string;
  mist: string;
  rain: string;
  sludge: string;
};

export const SAVE_KEY = "water-drop-wire-v1";
