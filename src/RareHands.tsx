import { useEffect, useRef, useState } from "react";
import { playHit, playJump, resumeAudio, toggleMute, unlockAudio } from "./audio";
import { GAME_PER_RF, loadWallet, saveWallet, type Wallet } from "./save";

type Screen = "garden" | "bet" | "hands" | "result" | "shop" | "run";
type Choice = "rock" | "paper" | "scissors";
type Station = "run" | "play" | "shop";

const CHOICES: Choice[] = ["rock", "paper", "scissors"];
const EMOJI: Record<Choice, string> = { rock: "✊", paper: "✋", scissors: "✌️" };

function winner(a: Choice, b: Choice): "player" | "cpu" | "draw" {
  if (a === b) return "draw";
  if (
    (a === "rock" && b === "scissors") ||
    (a === "paper" && b === "rock") ||
    (a === "scissors" && b === "paper")
  ) {
    return "player";
  }
  return "cpu";
}

export function RareHands() {
  const [wallet, setWallet] = useState<Wallet>({ rf: 50, game: 0, best: 0 });
  const [ready, setReady] = useState(false);
  const [screen, setScreen] = useState<Screen>("garden");
  const [hover, setHover] = useState<Station | null>(null);
  const [bet, setBet] = useState(5);
  const [mult, setMult] = useState(2);
  const [round, setRound] = useState(1);
  const [you, setYou] = useState(0);
  const [cpu, setCpu] = useState(0);
  const [lastYou, setLastYou] = useState<Choice | null>(null);
  const [lastCpu, setLastCpu] = useState<Choice | null>(null);
  const [result, setResult] = useState("");
  const [won, setWon] = useState(false);
  const [packs, setPacks] = useState(1);
  const [runId, setRunId] = useState(0);
  const [shopNote, setShopNote] = useState("");

  const [soundOff, setSoundOff] = useState(false);

  useEffect(() => {
    const unlock = () => unlockAudio();
    const onVis = () => {
      if (document.visibilityState === "visible") resumeAudio();
    };
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  useEffect(() => {
    setWallet(loadWallet());
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) saveWallet(wallet);
  }, [wallet, ready]);

  const patch = (next: Partial<Wallet>) => setWallet((w) => ({ ...w, ...next }));
  const handLock = useRef(false);

  const startHands = () => {
    if (bet <= 0 || bet > wallet.rf) return;
    setYou(0);
    setCpu(0);
    setRound(1);
    setLastYou(null);
    setLastCpu(null);
    handLock.current = false;
    setScreen("hands");
  };

  const playHand = (choice: Choice) => {
    if (handLock.current || screen !== "hands") return;
    handLock.current = true;
    const opp = CHOICES[Math.floor(Math.random() * 3)];
    setLastYou(choice);
    setLastCpu(opp);
    const w = winner(choice, opp);
    const ny = you + (w === "player" ? 1 : 0);
    const nc = cpu + (w === "cpu" ? 1 : 0);
    setYou(ny);
    setCpu(nc);
    if (ny >= 2 || nc >= 2 || round >= 3) {
      finishHands(ny, nc);
    } else {
      setRound(round + 1);
      handLock.current = false;
    }
  };

  const finishHands = (py: number, pc: number) => {
    if (py >= 2) {
      const full = py === 3;
      const reward = full ? bet * mult : (bet * mult) / 2;
      patch({ rf: wallet.rf - bet + reward });
      setWon(true);
      setResult(
        full
          ? `Sweep 3-0. Full ${mult}x. +${reward} $RAREFRIENDS`
          : `Won 2-1. Half of ${mult}x. +${reward} $RAREFRIENDS`,
      );
    } else {
      patch({ rf: wallet.rf - bet });
      setWon(false);
      setResult(`Lost ${py}-${pc}. The bet is gone. -${bet} $RAREFRIENDS`);
    }
    setScreen("result");
  };

  const exchange = () => {
    const n = Math.floor(packs);
    const cost = n * GAME_PER_RF;
    if (n < 1 || wallet.game < cost) {
      setShopNote("Not enough $GAME. 1,000 $GAME burns for 1 $RAREFRIENDS.");
      return;
    }
    patch({ game: wallet.game - cost, rf: wallet.rf + n });
    setShopNote(`Burned ${cost.toLocaleString()} $GAME. +${n} $RAREFRIENDS.`);
  };

  const bankRun = (coins: number, distance: number) => {
    setWallet((w) => ({
      ...w,
      game: w.game + coins,
      best: Math.max(w.best, Math.floor(distance)),
    }));
  };

  return (
    <main className="relative mx-auto flex h-dvh max-w-[960px] flex-col overflow-hidden bg-[#102028] text-[#f4efe4]">
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-white/10 bg-white px-3 text-[#102028]">
        <div className="text-sm font-bold tracking-tight">Rare Hands</div>
        <div className="flex items-center gap-2 text-xs font-semibold">
          <button
            className="rounded-full border border-black/10 px-2.5 py-1 text-xs font-semibold"
            onClick={() => setSoundOff(toggleMute())}
          >
            {soundOff ? "Unmute" : "Mute"}
          </button>
          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700">
            {wallet.rf.toLocaleString()} $RF
          </span>
          <span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-700">
            {wallet.game.toLocaleString()} $GAME
          </span>
        </div>
      </header>

      <div className="relative min-h-0 flex-1">
        {screen === "garden" && (
          <Garden
            hover={hover}
            setHover={setHover}
            onArrive={(id) => {
              if (id === "play") setScreen("bet");
              if (id === "run") setScreen("run");
              if (id === "shop") {
                setShopNote("");
                setPacks(Math.max(1, Math.floor(wallet.game / GAME_PER_RF) || 1));
                setScreen("shop");
              }
            }}
          />
        )}

        {screen === "run" && (
          <Runner
            key={runId}
            best={wallet.best}
            onExit={() => setScreen("garden")}
            onAgain={() => setRunId((n) => n + 1)}
            onFinish={bankRun}
          />
        )}

        {(screen === "bet" || screen === "hands" || screen === "result" || screen === "shop") && (
          <div className="absolute inset-0 grid place-items-center bg-black/55 p-4">
            <section className="w-full max-w-sm rounded-2xl bg-[#1b2c38] p-5 shadow-2xl">
              {screen === "bet" && (
                <>
                  <h2 className="text-lg font-bold">Rare Hands</h2>
                  <p className="mt-1 text-sm text-white/60">Test your luck, friend.</p>
                  <label className="mt-4 block text-xs text-white/60">
                    Bet ($RAREFRIENDS)
                    <input
                      className="mt-1 w-full rounded-lg border border-white/10 bg-[#0e1a22] px-3 py-2 text-base"
                      type="number"
                      min={1}
                      max={wallet.rf}
                      value={bet}
                      onChange={(e) => setBet(Number(e.target.value))}
                    />
                  </label>
                  <label className="mt-3 block text-xs text-white/60">
                    Multiplier
                    <select
                      className="mt-1 w-full rounded-lg border border-white/10 bg-[#0e1a22] px-3 py-2"
                      value={mult}
                      onChange={(e) => setMult(Number(e.target.value))}
                    >
                      {[1.5, 2, 2.5, 3, 4, 5, 6, 7, 8, 9, 10].map((m) => (
                        <option key={m} value={m}>
                          {m}x
                        </option>
                      ))}
                    </select>
                  </label>
                  <p className="mt-3 text-xs leading-5 text-white/50">
                    Win 2-1 and take half the multiplier. Sweep 3-0 and take the full multiplier.
                    Lose the match and the bet is gone. Simulated only.
                  </p>
                  <button
                    className="mt-4 w-full rounded-xl bg-emerald-500 py-3 font-semibold text-white disabled:opacity-40"
                    disabled={bet <= 0 || bet > wallet.rf}
                    onClick={startHands}
                  >
                    Start match
                  </button>
                  <button className="mt-2 w-full rounded-xl border border-white/15 py-2.5" onClick={() => setScreen("garden")}>
                    Back to garden
                  </button>
                </>
              )}

              {screen === "hands" && (
                <>
                  <div className="flex justify-between text-sm">
                    <span>Round {round} of 3</span>
                    <span>
                      You {you} — {cpu} CPU
                    </span>
                  </div>
                  {lastYou && lastCpu && (
                    <p className="mt-3 text-center text-sm">
                      {EMOJI[lastYou]} {lastYou} vs {EMOJI[lastCpu]} {lastCpu}
                    </p>
                  )}
                  <div className="mt-4 grid grid-cols-3 gap-2">
                    {CHOICES.map((c) => (
                      <button
                        key={c}
                        className="rounded-xl bg-blue-600 py-4 text-sm font-semibold capitalize"
                        onClick={() => playHand(c)}
                      >
                        <span className="block text-2xl">{EMOJI[c]}</span>
                        {c}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {screen === "result" && (
                <>
                  <h2 className={`text-lg font-bold ${won ? "text-emerald-400" : "text-rose-400"}`}>
                    {won ? "Victory" : "Defeat"}
                  </h2>
                  <p className="mt-2 text-sm">{result}</p>
                  <p className="mt-3 text-sm">Balance {wallet.rf.toLocaleString()} $RAREFRIENDS</p>
                  <button className="mt-4 w-full rounded-xl bg-emerald-500 py-3 font-semibold" onClick={() => setScreen("bet")}>
                    Play again
                  </button>
                  <button className="mt-2 w-full rounded-xl border border-white/15 py-2.5" onClick={() => setScreen("garden")}>
                    Back to garden
                  </button>
                </>
              )}

              {screen === "shop" && (
                <>
                  <h2 className="text-lg font-bold">Exchange shop</h2>
                  <p className="mt-1 text-sm text-white/60">
                    Burn 1,000 $GAME for 1 $RAREFRIENDS. $GAME is destroyed. $RF is added. Simulated.
                  </p>
                  <p className="mt-3 text-sm">
                    You hold {wallet.game.toLocaleString()} $GAME — that covers{" "}
                    {Math.floor(wallet.game / GAME_PER_RF)} exchanges.
                  </p>
                  <label className="mt-3 block text-xs text-white/60">
                    How many $RAREFRIENDS
                    <input
                      className="mt-1 w-full rounded-lg border border-white/10 bg-[#0e1a22] px-3 py-2"
                      type="number"
                      min={1}
                      value={packs}
                      onChange={(e) => setPacks(Number(e.target.value))}
                    />
                  </label>
                  <p className="mt-2 text-xs text-white/50">
                    Cost {(Math.max(0, Math.floor(packs)) * GAME_PER_RF).toLocaleString()} $GAME
                  </p>
                  {shopNote && <p className="mt-2 text-sm text-amber-200">{shopNote}</p>}
                  <button className="mt-4 w-full rounded-xl bg-amber-500 py-3 font-semibold text-[#1b1408]" onClick={exchange}>
                    Burn and convert
                  </button>
                  <button className="mt-2 w-full rounded-xl border border-white/15 py-2.5" onClick={() => setScreen("garden")}>
                    Back to garden
                  </button>
                </>
              )}
            </section>
          </div>
        )}
      </div>
    </main>
  );
}

function Garden({
  hover,
  setHover,
  onArrive,
}: {
  hover: Station | null;
  setHover: (s: Station | null) => void;
  onArrive: (id: Station) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hoverRef = useRef(hover);
  const arriveRef = useRef(onArrive);
  hoverRef.current = hover;
  arriveRef.current = onArrive;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let raf = 0;
    let t = 0;
    const stations: { id: Station; x: number; label: string; hint: string }[] = [
      { id: "run", x: 0.16, label: "Run", hint: "Earn $GAME on the stone path" },
      { id: "play", x: 0.5, label: "Play", hint: "Test your luck, friend" },
      { id: "shop", x: 0.84, label: "Shop", hint: "1,000 $GAME burns into 1 $RF" },
    ];

    const draw = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      t += 0.016;

      const sky = ctx.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, "#f3a06a");
      sky.addColorStop(0.35, "#c46a78");
      sky.addColorStop(0.62, "#6d6a9a");
      sky.addColorStop(1, "#2f6d55");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, h);

      ctx.fillStyle = "#c4a48a";
      const steps = 7;
      const peak = h * 0.18;
      const foot = h * 0.48;
      for (let i = 0; i < steps; i++) {
        const t = i / steps;
        const ww = w * 0.62 * (1 - t * 0.82);
        const yy = foot - (foot - peak) * t;
        ctx.fillRect(w * 0.32 - ww / 2, yy, ww, (foot - peak) / steps + 2);
      }
      ctx.fillStyle = "#f6efe2";
      ctx.fillRect(w * 0.28, peak, w * 0.08, 14);
      ctx.fillStyle = "#8d7aa8";
      for (let i = 0; i < 5; i++) {
        const t = i / 5;
        const ww = w * 0.36 * (1 - t * 0.7);
        const yy = h * 0.5 - h * 0.16 * t;
        ctx.fillRect(w * 0.62 - ww / 2, yy, ww, h * 0.16 / 5 + 2);
      }
      ctx.fillStyle = "#f6d27a";
      ctx.beginPath();
      ctx.arc(w * 0.78, h * 0.22, 28, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#1f7a86";
      ctx.fillRect(0, h * 0.58, w, h * 0.42);
      for (let i = 0; i < 8; i++) {
        ctx.fillStyle = i % 2 ? "#186874" : "#2490a0";
        ctx.fillRect((i * w) / 8, h * 0.62 + Math.sin(t + i) * 2, w / 8, 6);
      }

      ctx.fillStyle = "#3f9a4c";
      ctx.beginPath();
      ctx.ellipse(w / 2, h * 0.72, w * 0.42, h * 0.16, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#2f7a3c";
      ctx.beginPath();
      ctx.ellipse(w / 2, h * 0.74, w * 0.34, h * 0.08, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#c4a06a";
      ctx.fillRect(w * 0.18, h * 0.7, w * 0.64, 10);

      const tree = (x: number, s: number) => {
        const y = h * 0.6;
        ctx.fillStyle = "#5a341c";
        ctx.fillRect(x - 4 * s, y, 8 * s, 26 * s);
        ctx.fillStyle = "#1d6a30";
        ctx.fillRect(x - 18 * s, y - 8 * s, 36 * s, 14 * s);
        ctx.fillStyle = "#2f8a3a";
        ctx.fillRect(x - 14 * s, y - 20 * s, 28 * s, 14 * s);
        ctx.fillStyle = "#49b056";
        ctx.fillRect(x - 8 * s, y - 28 * s, 16 * s, 10 * s);
      };
      tree(w * 0.22, 1);
      tree(w * 0.78, 1.15);
      tree(w * 0.62, 0.85);
      ctx.fillStyle = "#f4efe4";
      ctx.fillRect(w * 0.3, h * 0.7, 4, 4);
      ctx.fillStyle = "#e07a6a";
      ctx.fillRect(w * 0.3, h * 0.688, 4, 4);
      ctx.fillStyle = "#f4efe4";
      ctx.fillRect(w * 0.7, h * 0.72, 4, 4);
      ctx.fillStyle = "#f6d27a";
      ctx.fillRect(w * 0.7, h * 0.708, 4, 4);

      stations.forEach((st) => {
        const x = w * st.x;
        const y = h * 0.66;
        const hot = hoverRef.current === st.id;
        ctx.fillStyle = hot ? "#f4e27a" : "#efe6d2";
        ctx.fillRect(x - 36, y - 28, 72, 36);
        ctx.strokeStyle = "#3a2a18";
        ctx.lineWidth = 2;
        ctx.strokeRect(x - 36, y - 28, 72, 36);
        ctx.fillStyle = "#3a2a18";
        ctx.font = "bold 13px ui-sans-serif, system-ui";
        ctx.textAlign = "center";
        ctx.fillText(st.label, x, y - 6);
        ctx.fillStyle = "#6b4226";
        ctx.fillRect(x - 10, y + 8, 20, 18);
      });

      const bob = Math.sin(t * 6) * 2;
      drawFriend(ctx, w * 0.5, h * 0.78 + bob, 3);

      const tip = stations.find((s) => s.id === hoverRef.current);
      if (tip) {
        ctx.fillStyle = "rgba(16,24,28,0.82)";
        const tw = ctx.measureText(tip.hint).width + 24;
        ctx.fillRect(w / 2 - tw / 2, 16, tw, 28);
        ctx.fillStyle = "#fff";
        ctx.font = "13px ui-sans-serif, system-ui";
        ctx.textAlign = "center";
        ctx.fillText(tip.hint, w / 2, 35);
      } else {
        ctx.fillStyle = "rgba(16,24,28,0.7)";
        ctx.fillRect(w / 2 - 130, 16, 260, 28);
        ctx.fillStyle = "#fff";
        ctx.font = "13px ui-sans-serif, system-ui";
        ctx.textAlign = "center";
        ctx.fillText("Tap Run, Play, or Shop", w / 2, 35);
      }

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    const hit = (clientX: number, clientY: number): Station | null => {
      const rect = canvas.getBoundingClientRect();
      const x = (clientX - rect.left) / rect.width;
      const y = (clientY - rect.top) / rect.height;
      if (y < 0.5 || y > 0.82) return null;
      if (Math.abs(x - 0.16) < 0.1) return "run";
      if (Math.abs(x - 0.5) < 0.1) return "play";
      if (Math.abs(x - 0.84) < 0.1) return "shop";
      return null;
    };

    const move = (e: PointerEvent) => setHover(hit(e.clientX, e.clientY));
    const click = (e: PointerEvent) => {
      const id = hit(e.clientX, e.clientY);
      if (id) arriveRef.current(id);
    };
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerdown", click);
    return () => {
      cancelAnimationFrame(raf);
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerdown", click);
    };
  }, [setHover]);

  return <canvas ref={canvasRef} className="absolute inset-0 h-full w-full touch-none" />;
}

function drawFriend(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, phase = 0) {
  const swing = Math.sin(phase) * 3 * s;
  ctx.fillStyle = "#111";
  ctx.fillRect(x - 7 * s, y - 16 * s, 14 * s, 16 * s);
  ctx.fillStyle = "#fff";
  ctx.fillRect(x - 5 * s, y - 14 * s, 4 * s, 4 * s);
  ctx.fillRect(x + 1 * s, y - 14 * s, 4 * s, 4 * s);
  ctx.fillRect(x - 3 * s, y - 7 * s, 6 * s, 2 * s);
  ctx.fillStyle = "#111";
  ctx.fillRect(x - 11 * s, y - 12 * s, 4 * s, 8 * s + swing);
  ctx.fillRect(x + 7 * s, y - 12 * s, 4 * s, 8 * s - swing);
  ctx.fillRect(x - 6 * s, y, 4 * s, 8 * s + swing);
  ctx.fillRect(x + 2 * s, y, 4 * s, 8 * s - swing);
}

type Kind = "wall" | "beam" | "gap" | "coin";
type Ent = { kind: Kind; lane: number; z: number; alive: boolean };

declare global {
  interface Window {
    __controlsTest?: {
      getLane: () => number;
      getDist: () => number;
      getCoins: () => number;
      getAlive: () => boolean;
      setKeys: (codes: string[]) => void;
    };
  }
}

function Runner({
  best,
  onExit,
  onAgain,
  onFinish,
}: {
  best: number;
  onExit: () => void;
  onAgain: () => void;
  onFinish: (coins: number, distance: number) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hud = useRef<HTMLDivElement>(null);
  const finishRef = useRef(onFinish);
  const cashRef = useRef<() => void>(() => {});
  const bestRef = useRef(best);
  const [dead, setDead] = useState(false);
  finishRef.current = onFinish;
  bestRef.current = best;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let lane = 0;
    let laneVis = 0;
    let slide = 0;
    let vy = 0;
    let y = 0;
    let speed = 13;
    let dist = 0;
    let coins = 0;
    let spawnAt = 34;
    let alive = true;
    let cashed = false;
    let last = performance.now();
    const ents: Ent[] = [];
    let raf = 0;
    let shake = 0;

    const cash = () => {
      if (cashed) return;
      cashed = true;
      finishRef.current(coins, dist);
    };
    cashRef.current = cash;

    let spawned = 0;
    const spawn = () => {
      spawned += 1;
      const lanes = [-1, 0, 1];
      const lanePick = lanes[Math.floor(Math.random() * 3)];
      const z = 46;
      if (spawned === 1) {
        for (let i = 0; i < 6; i++) ents.push({ kind: "coin", lane: 0, z: z + i * 1.7, alive: true });
        return;
      }
      const roll = Math.random();
      if (roll < 0.3) {
        ents.push({ kind: "wall", lane: lanePick, z, alive: true });
        if (Math.random() < 0.4) {
          const other = lanes.find((l) => l !== lanePick)!;
          ents.push({ kind: "wall", lane: other, z, alive: true });
        }
      } else if (roll < 0.5) {
        ents.push({ kind: "beam", lane: lanePick, z, alive: true });
      } else if (roll < 0.68) {
        ents.push({ kind: "gap", lane: lanePick, z, alive: true });
      } else {
        for (let i = 0; i < 6; i++) {
          ents.push({ kind: "coin", lane: lanePick, z: z + i * 1.7, alive: true });
        }
      }
    };

    const tryLane = (dir: number) => {
      lane = Math.max(-1, Math.min(1, lane + dir));
    };
    const tryJump = () => {
      if (y <= 0.05 && slide <= 0) {
        vy = 12;
        playJump();
      }
    };
    const trySlide = () => {
      if (y <= 0.2) slide = 0.6;
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || !alive) return;
      if (e.code === "ArrowLeft" || e.code === "KeyA") tryLane(-1);
      if (e.code === "ArrowRight" || e.code === "KeyD") tryLane(1);
      if (e.code === "ArrowUp" || e.code === "KeyW" || e.code === "Space") {
        e.preventDefault();
        tryJump();
      }
      if (e.code === "ArrowDown" || e.code === "KeyS") trySlide();
    };
    window.addEventListener("keydown", onKey);

    window.__controlsTest = {
      getLane: () => lane,
      getDist: () => dist,
      getCoins: () => coins,
      getAlive: () => alive,
      setKeys: (codes) => {
        for (const code of codes) onKey({ code, repeat: false, preventDefault() {} } as KeyboardEvent);
      },
    };

    let swipeX = 0;
    let swipeY = 0;
    const down = (e: PointerEvent) => {
      swipeX = e.clientX;
      swipeY = e.clientY;
    };
    const up = (e: PointerEvent) => {
      const dx = e.clientX - swipeX;
      const dy = e.clientY - swipeY;
      if (!alive || Math.hypot(dx, dy) < 24) return;
      if (Math.abs(dx) > Math.abs(dy)) tryLane(dx > 0 ? 1 : -1);
      else if (dy < 0) tryJump();
      else trySlide();
    };
    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointerup", up);

    const paintHud = () => {
      if (!hud.current) return;
      hud.current.textContent = `${Math.floor(dist)} m   ·   ${coins} $GAME   ·   best ${Math.max(bestRef.current, Math.floor(dist))} m`;
    };

    const frame = (now: number) => {
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (w < 2 || h < 2) {
        raf = requestAnimationFrame(frame);
        return;
      }
      if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
        canvas.width = Math.floor(w * dpr);
        canvas.height = Math.floor(h * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      if (alive) {
        dist += speed * dt;
        speed = Math.min(32, 13 + dist * 0.01);
        spawnAt -= speed * dt;
        if (spawnAt <= 0) {
          spawn();
          spawnAt = Math.max(8, 18 - dist * 0.004);
        }
        vy -= 28 * dt;
        y = Math.max(0, y + vy * dt);
        if (y === 0) vy = 0;
        if (slide > 0) slide -= dt;
        laneVis += (lane - laneVis) * Math.min(1, dt * 12);
        for (const ent of ents) {
          if (!ent.alive) continue;
          ent.z -= speed * dt;
          if (ent.z < -3) ent.alive = false;
          const near = dist > 18 && ent.z < 1.2 && ent.z > -0.15 && Math.abs(ent.lane - lane) < 0.45;
          if (!near) continue;
          if (ent.kind === "coin") {
            ent.alive = false;
            coins += 1;
          } else if (ent.kind === "wall") {
            alive = false;
            shake = 8;
            playHit();
          } else if (ent.kind === "beam" && slide <= 0 && y < 1.15) {
            alive = false;
            shake = 8;
            playHit();
          } else if (ent.kind === "gap" && y < 1.35) {
            alive = false;
            shake = 8;
            playHit();
          }
          if (!alive) break;
        }
        if (!alive) {
          cash();
          setDead(true);
        }
        paintHud();
      }

      const sky = ctx.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, "#e07a4a");
      sky.addColorStop(0.28, "#c46a78");
      sky.addColorStop(0.55, "#3d6d86");
      sky.addColorStop(1, "#1a6a7a");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, h);

      const horizon = h * 0.32;
      ctx.fillStyle = "#145e68";
      ctx.fillRect(0, horizon, w, h - horizon);
      ctx.fillStyle = "#0e4c58";
      for (let i = 0; i < 7; i++) {
        const yy = horizon + 18 + ((i * 36 + dist * 10) % 220);
        ctx.fillRect(0, yy, w, 4);
      }

      const project = (ln: number, z: number) => {
        const t = 1 / (1 + Math.max(0.08, z) * 0.085);
        const yP = horizon + (h * 0.84 - horizon) * t;
        const spread = 16 + t * w * 0.26;
        return { x: w / 2 + ln * spread, y: yP, s: t };
      };

      for (let row = 16; row >= 0; row--) {
        const z = row * 2.4 + (dist % 2.4);
        const left = project(-1.45, z);
        const right = project(1.45, z);
        const nextL = project(-1.45, z + 2.4);
        const nextR = project(1.45, z + 2.4);
        const tile = Math.floor(dist / 2.4 + row);
        ctx.fillStyle = tile % 2 === 0 ? "#d2ae74" : "#b8894e";
        ctx.beginPath();
        ctx.moveTo(nextL.x, nextL.y);
        ctx.lineTo(nextR.x, nextR.y);
        ctx.lineTo(right.x, right.y);
        ctx.lineTo(left.x, left.y);
        ctx.fill();
        ctx.strokeStyle = "rgba(70,42,18,0.35)";
        ctx.stroke();

        for (const edge of [-1, 1]) {
          const p = project(edge * 1.7, z);
          const size = 8 + p.s * 34;
          ctx.fillStyle = tile % 2 === 0 ? "#c4a574" : "#a88455";
          ctx.fillRect(p.x - size * 0.35, p.y - size * 0.9, size * 0.7, size * 0.85);
          ctx.fillStyle = "#3d8c4a";
          ctx.fillRect(p.x - size * 0.4, p.y - size * 0.95, size * 0.8, 4);
        }
      }

      const drawEnt = (ent: Ent) => {
        if (!ent.alive || ent.z < 0.05) return;
        const p = project(ent.lane, ent.z);
        const size = 16 + p.s * 50;
        if (ent.kind === "coin") {
          ctx.fillStyle = "#f5c518";
          ctx.beginPath();
          ctx.moveTo(p.x, p.y - size * 1.15);
          ctx.lineTo(p.x + size * 0.32, p.y - size * 0.72);
          ctx.lineTo(p.x, p.y - size * 0.28);
          ctx.lineTo(p.x - size * 0.32, p.y - size * 0.72);
          ctx.fill();
          ctx.fillStyle = "#e07a4a";
          ctx.fillRect(p.x - 2, p.y - size * 0.82, 4, 4);
          return;
        }
        if (ent.kind === "wall") {
          ctx.fillStyle = "#8d5a32";
          ctx.fillRect(p.x - size * 0.48, p.y - size * 1.05, size * 0.96, size);
          ctx.fillStyle = "#6b3e22";
          ctx.fillRect(p.x - size * 0.48, p.y - size * 1.05, size * 0.96, size * 0.16);
          ctx.fillStyle = "#c4a574";
          ctx.fillRect(p.x - size * 0.2, p.y - size * 0.7, size * 0.16, size * 0.16);
        } else if (ent.kind === "beam") {
          ctx.fillStyle = "#3d6b32";
          ctx.fillRect(p.x - size * 0.62, p.y - size * 1.05, size * 1.24, size * 0.22);
          ctx.fillStyle = "#2a4a24";
          ctx.fillRect(p.x - size * 0.62, p.y - size * 0.86, size * 1.24, 3);
        } else {
          const a = project(ent.lane - 0.42, ent.z);
          const b = project(ent.lane + 0.42, ent.z);
          ctx.fillStyle = "#0c3e48";
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.lineTo(b.x, b.y + 8);
          ctx.lineTo(a.x, a.y + 8);
          ctx.fill();
        }
      };

      [...ents]
        .filter((e) => e.alive)
        .sort((a, b) => b.z - a.z)
        .forEach(drawEnt);

      const feet = project(laneVis, 1.15);
      const lift = y * 22;
      const crouch = slide > 0 ? 0.55 : 1;
      ctx.save();
      ctx.translate((Math.random() - 0.5) * shake, 0);
      drawFriend(ctx, feet.x, feet.y - 6 - lift, (2.4 + feet.s) * crouch, alive ? dist * 0.7 : 0);
      ctx.restore();
      if (shake > 0) shake *= 0.88;

      ctx.fillStyle = "rgba(255,255,255,0.8)";
      ctx.font = "12px ui-sans-serif, system-ui";
      ctx.textAlign = "center";
      ctx.fillText("A left · D right · W jump · S slide", w / 2, h - (window.innerWidth < 768 ? 72 : 16));

      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    paintHud();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKey);
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointerup", up);
      delete window.__controlsTest;
    };
  }, []);

  const leave = () => {
    cashRef.current();
    onExit();
  };

  return (
    <div className="relative h-full w-full">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full touch-none" />
      <div
        ref={hud}
        className="pointer-events-none absolute left-3 top-3 rounded-full bg-black/55 px-3 py-1 text-xs font-semibold"
      />
      <button
        className="absolute right-3 top-3 z-10 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-[#102028]"
        onClick={leave}
      >
        Garden
      </button>
      {dead && (
        <div className="absolute inset-0 z-20 grid place-items-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-[#1b2c38] p-5 text-center">
            <h2 className="text-lg font-bold">Run over</h2>
            <p className="mt-2 text-sm text-white/70">
              This run’s $GAME is in your balance. The shop burns 1,000 $GAME for 1 $RAREFRIENDS.
            </p>
            <button className="mt-4 w-full rounded-xl bg-emerald-500 py-3 font-semibold" onClick={onAgain}>
              Run again
            </button>
            <button className="mt-2 w-full rounded-xl border border-white/15 py-2.5" onClick={leave}>
              Back to garden
            </button>
          </div>
        </div>
      )}
      <div className="absolute inset-x-2 bottom-3 z-10 grid grid-cols-4 gap-2 md:hidden">
        <Pad code="KeyA" label="Left" />
        <Pad code="KeyW" label="Jump" />
        <Pad code="KeyS" label="Slide" />
        <Pad code="KeyD" label="Right" />
      </div>
    </div>
  );
}

function Pad({ code, label }: { code: string; label: string }) {
  return (
    <button
      className="rounded-xl bg-black/55 py-3 text-sm font-semibold"
      onPointerDown={(e) => {
        e.preventDefault();
        window.dispatchEvent(new KeyboardEvent("keydown", { code }));
      }}
    >
      {label}
    </button>
  );
}
