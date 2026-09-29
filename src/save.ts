export type Wallet = {
  rf: number;
  game: number;
  best: number;
};

const KEY = "rare-hands-wallet-v1";

export function loadWallet(): Wallet {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { rf: 50, game: 0, best: 0 };
    const parsed = JSON.parse(raw) as Partial<Wallet>;
    return {
      rf: Number.isFinite(parsed.rf) ? Math.max(0, Number(parsed.rf)) : 50,
      game: Number.isFinite(parsed.game) ? Math.max(0, Number(parsed.game)) : 0,
      best: Number.isFinite(parsed.best) ? Math.max(0, Number(parsed.best)) : 0,
    };
  } catch {
    return { rf: 50, game: 0, best: 0 };
  }
}

export function saveWallet(wallet: Wallet) {
  localStorage.setItem(KEY, JSON.stringify(wallet));
}

export const GAME_PER_RF = 1000;
