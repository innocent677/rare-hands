let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let musicBus: GainNode | null = null;
let sfxBus: GainNode | null = null;
let timer = 0;
let step = 0;
let muted = false;
let musicOn = false;

const MELODY = [262, 330, 392, 330, 294, 349, 392, 330];
const BASS = [131, 131, 98, 131];

function context(): AudioContext | null {
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  if (!ctx) {
    ctx = new AC({ latencyHint: "interactive" });
    master = ctx.createGain();
    musicBus = ctx.createGain();
    sfxBus = ctx.createGain();
    musicBus.gain.value = 0.22;
    sfxBus.gain.value = 0.55;
    master.gain.value = muted ? 0 : 1;
    musicBus.connect(master);
    sfxBus.connect(master);
    master.connect(ctx.destination);
  }
  return ctx;
}

export function unlockAudio() {
  const audio = context();
  if (!audio) return;
  if (audio.state === "suspended") void audio.resume();
  if (!musicOn && !muted) startMusic();
}

function beep(
  freq: number,
  dur: number,
  type: OscillatorType,
  peak: number,
  bus: GainNode,
  glide?: number,
) {
  if (!ctx) return;
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (glide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, glide), t + dur);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(peak, t + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(gain);
  gain.connect(bus);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

function tick() {
  if (!ctx || !musicBus || muted) return;
  const note = MELODY[step % MELODY.length];
  beep(note, 0.32, "triangle", 0.08, musicBus);
  if (step % 2 === 0) beep(BASS[(step / 2) % BASS.length], 0.4, "sine", 0.05, musicBus);
  step += 1;
}

export function startMusic() {
  const audio = context();
  if (!audio || musicOn || muted) return;
  musicOn = true;
  tick();
  timer = window.setInterval(tick, 420);
}

export function playJump() {
  unlockAudio();
  if (!sfxBus || muted) return;
  beep(420, 0.16, "square", 0.12, sfxBus, 760);
}

export function playHit() {
  unlockAudio();
  if (!ctx || !sfxBus || muted) return;
  beep(180, 0.28, "sawtooth", 0.16, sfxBus, 55);
  const length = Math.floor(ctx.sampleRate * 0.18);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
  const src = ctx.createBufferSource();
  const gain = ctx.createGain();
  src.buffer = buffer;
  gain.gain.value = 0.2;
  src.connect(gain);
  gain.connect(sfxBus);
  src.start();
}

export function toggleMute() {
  muted = !muted;
  if (master && ctx) master.gain.setTargetAtTime(muted ? 0 : 1, ctx.currentTime, 0.03);
  if (!muted) startMusic();
  return muted;
}

export function soundIsMuted() {
  return muted;
}

export function resumeAudio() {
  if (ctx && ctx.state === "suspended") void ctx.resume();
}
