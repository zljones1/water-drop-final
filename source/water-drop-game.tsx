import { useEffect, useRef, useState, type ReactNode, type PointerEvent } from "react";
import { Heart, Pause, Volume2, VolumeX } from "lucide-react";
import { createGame, type GameApi } from "@/game/engine";
import type { Hud } from "@/game/types";

const INITIAL: Hud = {
  score: 0,
  lives: 3,
  combo: 0,
  sheet: 1,
  fill: 0,
  quota: 8,
  best: 0,
  message: "Catch the bright drops. Dodge the muddy ones.",
  mode: "title",
  muted: false,
  newBest: false,
};

export function WaterDropGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<GameApi | null>(null);
  const [hud, setHud] = useState<Hud>(INITIAL);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const game = createGame(canvas, setHud);
    gameRef.current = game;
    return () => {
      game.destroy();
      gameRef.current = null;
    };
  }, []);

  function hold(side: "left" | "right" | "boost", down: boolean) {
    gameRef.current?.setHold(side, down);
  }

  const playing = hud.mode === "play";
  const primary =
    hud.mode === "pause" ? "Resume" : hud.mode === "title" ? "Start" : hud.mode === "over" ? "Again" : "Restart";

  return (
    <main className="flex h-dvh w-full flex-col bg-ink text-line">
      {hud.mode === "title" ? (
        <section
          aria-label="Start screen"
          style={{
            position: "fixed", inset: 0, zIndex: 50, display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", gap: 14, padding: 24, textAlign: "center",
            background: "linear-gradient(180deg, #0b1630 0%, #13305a 55%, #1b5a80 85%, #2a7fa3 100%)", overflowY: "auto",
          }}
        >
          <StartBackdrop />
          <div className="wd-card" style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: 14, padding: "28px 22px", maxWidth: 560, width: "100%" }}>
          <p className="wd-mark" style={{ color: "#FFC907", fontWeight: 800, fontSize: "clamp(28px, 8vw, 64px)", whiteSpace: "nowrap", letterSpacing: "-0.03em", lineHeight: 1, margin: 0 }}>
            charity: water
          </p>
          <h1 className="font-display text-line" style={{ fontSize: "clamp(28px, 6vw, 44px)", fontWeight: 600, margin: 0 }}>
            Water Drop
          </h1>
          <p className="text-line" style={{ fontSize: 17, maxWidth: 480, margin: 0 }}>
            Every drop counts — charity: water brings clean water to people in need.
          </p>
          <p className="text-mist" style={{ fontSize: 14, maxWidth: 480, margin: 0 }}>
            Catch the clean rain. Dodge the bad drops — each one costs a life:
          </p>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center" }}>
            {[["#a85a07", "Muddy water"], ["#7be33a", "Acid rain"], ["#111", "Oil drops"]].map(([c, t]) => (
              <li key={t} className="text-line" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14, border: "1px solid #3a4a66", borderRadius: 999, padding: "4px 12px" }}>
                <span style={{ width: 14, height: 14, borderRadius: "50% 50% 50% 0", transform: "rotate(-45deg)", background: c, border: c === "#111" ? "1.5px solid #c8d7f0" : "1px solid #889", boxShadow: c === "#7be33a" ? "0 0 8px #7be33a" : "none" }} />
                {t}
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="wd-btn wd-cta"
            onClick={() => gameRef.current?.start()}
            style={{
              marginTop: 10, padding: "18px 40px", borderRadius: 999, border: "none", background: "#FFC907",
              color: "#111", fontWeight: 800, fontSize: "clamp(19px, 5vw, 26px)", whiteSpace: "nowrap", cursor: "pointer",
              boxShadow: "0 6px 24px rgba(255,201,7,0.35)",
            }}
          >
            Start Your Charity
          </button>
          <a href="https://www.charitywater.org" target="_blank" rel="noopener noreferrer" style={{ color: "#FFC907", fontSize: 15, textDecoration: "underline" }}>
            Learn more at charitywater.org
          </a>
          <p className="text-mist" style={{ fontSize: 12, margin: 0 }}>Arrows or A/D to move · Shift to sprint · P pauses · M mutes</p>
          </div>
        </section>
      ) : null}
      <header className="flex shrink-0 items-center justify-between gap-2 border-b border-mist/40 px-3 pt-[max(0.5rem,env(safe-area-inset-top))] pb-2">
        <div className="min-w-0">
          <h1 className="wd-title font-display leading-none font-semibold text-line" style={{ margin: 0 }}>
            <span style={{ display: "block", color: "#FFC907", fontSize: 11, letterSpacing: "0.08em", fontWeight: 800 }}>
              charity: water
            </span>
            <span className="text-xl">Water Drop</span>
          </h1>
          <p className="wd-status truncate text-xs text-mist" role="status" aria-live="polite">
            {hud.combo > 1 && playing ? `Streak ×${hud.combo}. ` : ""}
            {hud.message}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <Meter label="Score" value={String(hud.score)} />
          <div className="flex items-center gap-1" aria-label={`Lives ${hud.lives}`}>
            {[0, 1, 2].map((i) => (
              <Heart
                key={i}
                aria-hidden="true"
                className={i < hud.lives ? "size-4 fill-rain text-rain" : "size-4 text-mist"}
                strokeWidth={1.75}
              />
            ))}
          </div>
          <Meter label="Round" value={`${hud.sheet} · ${hud.fill}/${hud.quota}`} />
          <span className="wd-hide-xs">
            <Meter label="Best" value={String(hud.best)} accent />
          </span>
          <IconButton label={hud.muted ? "Unmute" : "Mute"} onClick={() => gameRef.current?.toggleMute()}>
            {hud.muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
          </IconButton>
        </div>
      </header>

      <div className="relative min-h-0 flex-1">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 h-full w-full touch-none bg-ink"
          aria-label="Water Drop playfield. Move left and right to catch clean drops and avoid dirty ones."
        />
        {hud.mode === "over" ? (
          <div
            role="dialog"
            aria-label="Game over"
            style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, background: "rgba(8,14,28,0.55)" }}
          >
            <div className="wd-card" style={{ padding: "24px 28px", textAlign: "center", maxWidth: 360, width: "100%" }}>
              <p className="text-xs tracking-widest text-rain uppercase" style={{ margin: 0 }}>Run over</p>
              <p className="font-display text-line" style={{ fontSize: 44, fontWeight: 700, margin: "6px 0 0" }}>{hud.score}</p>
              <p className="text-sm text-mist" style={{ margin: "2px 0 0" }}>{hud.newBest ? "New best score!" : `Best ${hud.best}`}</p>
              <p className="text-sm text-line" style={{ margin: "10px 0 0" }}>Every drop counts. Thanks for playing for clean water.</p>
              <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 16, flexWrap: "wrap" }}>
                <button
                  type="button"
                  className="wd-btn"
                  onClick={() => gameRef.current?.start()}
                  style={{ padding: "12px 22px", borderRadius: 999, border: "none", background: "#FFC907", color: "#111", fontWeight: 800, fontSize: 16, cursor: "pointer" }}
                >
                  Again
                </button>
                <button
                  type="button"
                  className="wd-btn"
                  onClick={() => gameRef.current?.toTitle()}
                  style={{ padding: "12px 22px", borderRadius: 999, border: "1px solid #FFC907", background: "transparent", color: "#FFC907", fontWeight: 700, fontSize: 16, cursor: "pointer" }}
                >
                  Back to start
                </button>
              </div>
            </div>
          </div>
        ) : null}
        {hud.mode === "pause" ? (
          <div className="pointer-events-none absolute inset-x-3 top-3 border border-mist bg-ink/90 px-3 py-2">
            <p className="text-xs tracking-widest text-rain uppercase">
              {hud.mode === "over" ? "Run over" : "Held"}
            </p>
            <p className="font-display text-2xl leading-tight font-semibold text-line">
              {hud.mode === "over" ? (hud.newBest ? `New best ${hud.score}` : `Score ${hud.score}`) : "Rain on hold"}
            </p>
          </div>
        ) : null}
        {playing ? (
          <p
            className="wd-toast pointer-events-none text-sm text-line"
            aria-hidden="true"
            style={{ position: "absolute", top: 10, left: 12, right: 64, margin: 0, padding: "6px 10px", borderRadius: 12, background: "rgba(8,14,28,0.7)", textAlign: "center" }}
          >
            {hud.combo > 1 ? `Streak ×${hud.combo}. ` : ""}
            {hud.message}
          </p>
        ) : null}
        {playing ? (
          <div className="absolute top-2 right-2">
            <IconButton label="Pause" onClick={() => gameRef.current?.togglePause()}>
              <Pause className="size-4" />
            </IconButton>
          </div>
        ) : null}
      </div>

      <div className="grid shrink-0 grid-cols-4 gap-2 border-t border-mist/40 px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <HoldButton label="Left" name="Move left" onHold={(down) => hold("left", down)} />
        <HoldButton label="Fast run" onHold={(down) => hold("boost", down)} />
        <button
          type="button"
          className={
            playing
              ? "flex h-14 items-center justify-center rounded-xl border border-mist bg-sheet px-2 text-sm font-semibold text-line"
              : "flex h-14 items-center justify-center rounded-xl bg-rain px-2 text-sm font-semibold text-ink"
          }
          onClick={() => (hud.mode === "pause" ? gameRef.current?.togglePause() : gameRef.current?.start())}
        >
          {primary}
        </button>
        <HoldButton label="Right" name="Move right" onHold={(down) => hold("right", down)} />
      </div>
      <p className="sr-only">
        Arrows or A and D to move. Hold Fast run, Shift, or F to sprint. Tap either half of the sheet, or hold the pads.
        P pauses. M mutes.
      </p>
    </main>
  );
}

function Meter({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <p className="text-right leading-none">
      <span className="block text-xs tracking-widest text-mist uppercase">{label}</span>
      <span className={accent ? "text-sm text-rain tabular-nums" : "text-sm text-line tabular-nums"}>{value}</span>
    </p>
  );
}

function IconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex size-11 items-center justify-center rounded-xl border border-mist bg-ink/80 text-line"
    >
      {children}
    </button>
  );
}

function HoldButton({ label, name, onHold }: { label: string; name?: string; onHold: (down: boolean) => void }) {
  function down(e: PointerEvent<HTMLButtonElement>) {
    if (!e.isPrimary || e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    onHold(true);
  }
  return (
    <button
      type="button"
      aria-label={name ?? label}
      className="h-14 touch-none rounded-xl border border-rain bg-sheet px-1 text-sm font-semibold text-line select-none active:bg-rain active:text-ink"
      onPointerDown={down}
      onPointerUp={() => onHold(false)}
      onPointerCancel={() => onHold(false)}
      onLostPointerCapture={() => onHold(false)}
    >
      {label}
    </button>
  );
}

type BackDrop = { x: number; y: number; v: number; r: number; c: string };
type BackRipple = { x: number; y: number; t: number };

// Mostly clean blue rain, with the odd muddy, acid, or oil drop.
const BACK_COLORS = ["#4cc3ff", "#4cc3ff", "#4cc3ff", "#4cc3ff", "#4cc3ff", "#4cc3ff", "#8fdcff", "#a85a07", "#7be33a", "#15151c"];

function StartBackdrop() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let w = 0;
    let h = 0;
    let raf = 0;
    let last = performance.now();
    const drops: BackDrop[] = [];
    const ripples: BackRipple[] = [];
    const make = (y?: number): BackDrop => ({
      x: Math.random() * w,
      y: y ?? -20 - Math.random() * h * 0.5,
      v: 90 + Math.random() * 140,
      r: 3 + Math.random() * 4,
      c: BACK_COLORS[Math.floor(Math.random() * BACK_COLORS.length)]!,
    });
    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const want = Math.max(20, Math.round(Math.min(70, (w * h) / 16000)));
      while (drops.length < want) drops.push(make(Math.random() * h));
      drops.length = want;
    };
    const drawDrop = (d: BackDrop) => {
      ctx.beginPath();
      ctx.moveTo(d.x, d.y - d.r * 2.2);
      ctx.bezierCurveTo(d.x + d.r * 1.1, d.y - d.r * 0.6, d.x + d.r, d.y + d.r, d.x, d.y + d.r);
      ctx.bezierCurveTo(d.x - d.r, d.y + d.r, d.x - d.r * 1.1, d.y - d.r * 0.6, d.x, d.y - d.r * 2.2);
      ctx.globalAlpha = 0.75;
      ctx.fillStyle = d.c;
      ctx.fill();
      if (d.c === "#15151c") {
        ctx.strokeStyle = "#c8d7f0";
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      ctx.globalAlpha = 0.6;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(d.x - d.r * 0.35, d.y - d.r * 0.2, d.r * 0.28, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    };
    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      ctx.strokeStyle = "#bfe9ff";
      ctx.lineWidth = 1.5;
      for (const r of ripples) {
        const k = r.t / 0.9;
        ctx.globalAlpha = 0.5 * (1 - k);
        ctx.beginPath();
        ctx.ellipse(r.x, r.y, 4 + k * 26, 1.5 + k * 6, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      for (const d of drops) drawDrop(d);
    };
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      for (let i = 0; i < drops.length; i += 1) {
        const d = drops[i]!;
        d.y += d.v * dt;
        if (d.y >= h - 20 - (d.x % 70)) {
          if (ripples.length < 40) ripples.push({ x: d.x, y: d.y + d.r, t: 0 });
          drops[i] = make();
        }
      }
      for (let i = ripples.length - 1; i >= 0; i -= 1) {
        ripples[i]!.t += dt;
        if (ripples[i]!.t > 0.9) ripples.splice(i, 1);
      }
      draw();
      raf = requestAnimationFrame(tick);
    };
    resize();
    window.addEventListener("resize", resize);
    if (reduce) draw();
    else raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);
  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
    />
  );
}
