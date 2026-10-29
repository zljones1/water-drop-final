export type GameArt = {
  ready: boolean;
  frames: Record<string, HTMLImageElement[]>;
  sky: HTMLImageElement;
  cloud: HTMLImageElement;
};

const SETS = ["run", "idle", "spin", "hurt", "clean", "dirty", "acid", "oil", "pure", "splash"] as const;

export function loadArt(): GameArt {
  const frames: Record<string, HTMLImageElement[]> = {};
  const jobs: { img: HTMLImageElement; src: string }[] = [];
  const make = (file: string) => {
    const img = new Image();
    const src =
      typeof document === "undefined" ? `/sprites/${file}` : new URL(`sprites/${file}`, document.baseURI).href;
    jobs.push({ img, src });
    return img;
  };
  for (const name of SETS) {
    frames[name] = [0, 1, 2, 3].map((i) => make(`${name}-${i}.png`));
  }
  const sky = make("sky.png");
  const cloud = make("cloud.png");
  const art: GameArt = { ready: false, frames, sky, cloud };
  let left = jobs.length;
  for (const job of jobs) {
    const finish = () => {
      left -= 1;
      if (left <= 0) art.ready = true;
    };
    job.img.onload = finish;
    job.img.onerror = finish;
    job.img.src = job.src;
  }
  return art;
}

export function frameOf(art: GameArt, name: string, phase: number) {
  const frames = art.frames[name];
  if (!frames?.length) return null;
  const img = frames[Math.abs(Math.floor(phase)) % frames.length];
  if (!img?.complete || img.naturalWidth === 0) return null;
  return img;
}

const feet = new WeakMap<HTMLImageElement, { x: number; y: number }>();

function measureFeet(img: HTMLImageElement) {
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return { x: w / 2, y: h - 1 };
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, w, h).data;
  let bot = -1;
  let sumX = 0;
  let count = 0;
  for (let y = h - 1; y >= 0; y -= 1) {
    for (let x = 0; x < w; x += 1) {
      if (data[(y * w + x) * 4 + 3]! > 40) {
        if (bot < 0) bot = y;
        sumX += x;
        count += 1;
      }
    }
  }
  return { x: count ? sumX / count : w / 2, y: bot < 0 ? h - 1 : bot };
}

export function footOf(art: GameArt, name: string, phase: number) {
  const img = frameOf(art, name, phase);
  if (!img) return { x: 256, y: 450 };
  let foot = feet.get(img);
  if (!foot) {
    foot = measureFeet(img);
    feet.set(img, foot);
  }
  return foot;
}
