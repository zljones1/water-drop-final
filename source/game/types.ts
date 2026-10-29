export const WORLD_W = 390;
export const WORLD_H = 640;
export const GROUND_Y = 586;

export type DropKind = "clean" | "dirty" | "pure";
export type BadKind = "mud" | "acid" | "oil";
export type Mode = "title" | "play" | "pause" | "over";

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
