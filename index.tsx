import React, { useEffect, useState } from "react";
import type { GameComponentProps } from "@rarefriends/friendsdk/runtime";
import { GameWorld, type GameWorldInteraction } from "@rarefriends/friendsdk/world-view";
import { getWorldPreset, validateWorld } from "@rarefriends/friendsdk/world";
import "@rarefriends/friendsdk/world-view.css";
import "@rarefriends/friendsdk/frame.css";

type Choice = "rock" | "paper" | "scissors";
type Screen = "world" | "bet" | "play" | "result";

const choices: Choice[] = ["rock", "paper", "scissors"];
const choiceEmoji: Record<Choice, string> = {
  rock: "✊",
  paper: "✋",
  scissors: "✌️",
};

const garden = getWorldPreset("01-garden-oval-complete");

const world = validateWorld({
  ...garden,
  props: [
    ...garden.props,
    { type: "terminal", x: 320, y: 210, scale: 1.4 },
  ],
  actors: [],
});

const spawn = [280, 200] as const;

const interactions: readonly GameWorldInteraction[] = [
  {
    id: "play",
    label: "Play",
    position: [320, 210],
    reach: 90,
    labelOffset: -140,
  },
];

function getWinner(player: Choice, computer: Choice): "player" | "computer" | "draw" {
  if (player === computer) return "draw";
  if (
    (player === "rock" && computer === "scissors") ||
    (player === "paper" && computer === "rock") ||
    (player === "scissors" && computer === "paper")
  ) {
    return "player";
  }
  return "computer";
}

export default function RareHands({ friendId, client, paused }: GameComponentProps) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");

  const [screen, setScreen] = useState<Screen>("world");
  const [balance, setBalance] = useState(50);
  const [bet, setBet] = useState(5);
  const [multiplier, setMultiplier] = useState(2);
  const [playerScore, setPlayerScore] = useState(0);
  const [computerScore, setComputerScore] = useState(0);
  const [round, setRound] = useState(1);
  const [lastPlayerChoice, setLastPlayerChoice] = useState<Choice | null>(null);
  const [lastComputerChoice, setLastComputerChoice] = useState<Choice | null>(null);
  const [resultMessage, setResultMessage] = useState("");
  const [isWin, setIsWin] = useState(false);

  useEffect(() => {
    let cancelled = false;
    client
      .read()
      .then(() => {
        if (!cancelled) setReady(true);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [client, friendId]);

  const startMatch = () => {
    if (bet > balance || bet <= 0) {
      alert("Invalid bet amount");
      return;
    }
    setPlayerScore(0);
    setComputerScore(0);
    setRound(1);
    setLastPlayerChoice(null);
    setLastComputerChoice(null);
    setScreen("play");
  };

  const playRound = (playerChoice: Choice) => {
    if (paused) return;

    const computerChoice = choices[Math.floor(Math.random() * 3)];
    setLastPlayerChoice(playerChoice);
    setLastComputerChoice(computerChoice);

    const winner = getWinner(playerChoice, computerChoice);

    let newPlayerScore = playerScore;
    let newComputerScore = computerScore;

    if (winner === "player") newPlayerScore += 1;
    if (winner === "computer") newComputerScore += 1;

    setPlayerScore(newPlayerScore);
    setComputerScore(newComputerScore);

    if (newPlayerScore >= 2 || newComputerScore >= 2 || round >= 3) {
      finishMatch(newPlayerScore, newComputerScore);
    } else {
      setRound(round + 1);
    }
  };

  const finishMatch = (finalPlayerScore: number, finalComputerScore: number) => {
    let message = "";
    let reward = 0;
    let won = false;

    if (finalPlayerScore >= 2) {
      won = true;
      if (finalPlayerScore === 3) {
        reward = bet * multiplier;
        message = `Perfect! You won 3-0  •  +${reward} RF`;
      } else {
        reward = (bet * multiplier) / 2;
        message = `You won 2-1  •  +${reward} RF`;
      }
      setBalance((prev) => prev - bet + reward);
    } else {
      message = `You lost ${finalPlayerScore}-${finalComputerScore}  •  -${bet} RF`;
      setBalance((prev) => prev - bet);
    }

    setIsWin(won);
    setResultMessage(message);
    setScreen("result");
  };

  if (error) {
    return (
      <div style={{ padding: 40, color: "white", background: "#0f172a", height: "100%" }}>
        <h2>Error</h2>
        <p>{error}</p>
      </div>
    );
  }

  if (!ready) {
    return (
      <div style={{ padding: 40, color: "white", background: "#0f172a", height: "100%" }}>
        Loading game…
      </div>
    );
  }

  return (
    <div style={{ width: "100%", height: "100%", position: "relative", background: "#f8fafc" }}>
      {/* ===== WHITE TOP BAR ===== */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "48px",
          background: "#ffffff",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 16px",
          zIndex: 30,
          borderBottom: "1px solid #e2e8f0",
          boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
        }}
      >
        <div style={{ fontSize: "15px", fontWeight: "600", color: "#0f172a" }}>
          Rare Hands
        </div>
        <div
          style={{
            background: "#ecfdf5",
            border: "1px solid #a7f3d0",
            color: "#059669",
            padding: "5px 14px",
            borderRadius: "20px",
            fontSize: "14px",
            fontWeight: "600",
          }}
        >
          {balance} $RAREFRIENDS
        </div>
      </div>

      {/* World */}
      <div style={{ position: "absolute", top: "48px", left: 0, right: 0, bottom: 0 }}>
        <GameWorld
          world={world}
          spawn={spawn}
          interactions={interactions}
          friendId={friendId}
          paused={paused || screen !== "world"}
          onInteract={(id) => {
            if (id === "play") setScreen("bet");
          }}
        />
      </div>

      {/* Hover text */}
      <div
        style={{
          position: "absolute",
          top: "60px",
          left: "50%",
          transform: "translateX(-50%)",
          background: "rgba(0,0,0,0.75)",
          color: "white",
          padding: "6px 16px",
          borderRadius: "20px",
          fontSize: "13px",
          pointerEvents: "none",
          zIndex: 20,
        }}
      >
        Test your luck friend
      </div>

      {/* ===== BET MENU ===== */}
      {screen === "bet" && (
        <div style={overlayStyle}>
          <div style={menuStyle}>
            <h2 style={{ margin: "0 0 6px 0" }}>Rare Hands</h2>
            <p style={{ margin: "0 0 20px 0", opacity: 0.7, fontSize: "14px" }}>
              Test your luck friend
            </p>

            <div style={{ marginBottom: "14px", textAlign: "left" }}>
              <label style={{ fontSize: "13px", opacity: 0.7 }}>Bet Amount</label>
              <input
                type="number"
                value={bet}
                min={1}
                max={balance}
                onChange={(e) => setBet(Number(e.target.value))}
                style={inputStyle}
              />
            </div>

            <div style={{ marginBottom: "18px", textAlign: "left" }}>
              <label style={{ fontSize: "13px", opacity: 0.7 }}>Multiplier</label>
              <select
                value={multiplier}
                onChange={(e) => setMultiplier(Number(e.target.value))}
                style={inputStyle}
              >
                {[1.5, 2, 2.5, 3, 4, 5, 6, 7, 8, 9, 10].map((m) => (
                  <option key={m} value={m}>
                    {m}x
                  </option>
                ))}
              </select>
            </div>

            <p style={{ fontSize: "12px", opacity: 0.55, marginBottom: "20px" }}>
              Win 2-1 → half multiplier<br />
              Win 3-0 → full multiplier
            </p>

            <button onClick={startMatch} style={primaryBtn}>
              Start Match
            </button>
            <button
              onClick={() => setScreen("world")}
              style={{ ...secondaryBtn, marginTop: "10px" }}
            >
              Back to Garden
            </button>
          </div>
        </div>
      )}

      {/* ===== PLAY SCREEN ===== */}
      {screen === "play" && (
        <div style={overlayStyle}>
          <div style={menuStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px", fontSize: "14px" }}>
              <span>Round {round} of 3</span>
              <span>
                You {playerScore} — {computerScore} CPU
              </span>
            </div>

            {lastPlayerChoice && lastComputerChoice && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  gap: "20px",
                  marginBottom: "18px",
                  padding: "12px",
                  background: "rgba(0,0,0,0.25)",
                  borderRadius: "10px",
                }}
              >
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "28px" }}>{choiceEmoji[lastPlayerChoice]}</div>
                  <div style={{ fontSize: "12px", opacity: 0.7 }}>You</div>
                </div>
                <div style={{ opacity: 0.4, alignSelf: "center" }}>vs</div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "28px" }}>{choiceEmoji[lastComputerChoice]}</div>
                  <div style={{ fontSize: "12px", opacity: 0.7 }}>CPU</div>
                </div>
              </div>
            )}

            <p style={{ margin: "0 0 14px 0", fontSize: "14px", opacity: 0.7 }}>
              Choose your move
            </p>

            <div style={{ display: "flex", gap: "10px" }}>
              {choices.map((choice) => (
                <button
                  key={choice}
                  onClick={() => playRound(choice)}
                  style={{
                    flex: 1,
                    padding: "12px 6px",
                    background: "#1e40af",
                    border: "none",
                    borderRadius: "10px",
                    color: "white",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  <span style={{ fontSize: "24px" }}>{choiceEmoji[choice]}</span>
                  <span style={{ fontSize: "12px", textTransform: "capitalize" }}>{choice}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ===== RESULT SCREEN ===== */}
      {screen === "result" && (
        <div style={overlayStyle}>
          <div style={menuStyle}>
            <div
              style={{
                padding: "16px",
                borderRadius: "10px",
                marginBottom: "16px",
                background: isWin ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
                border: `1px solid ${isWin ? "#22c55e" : "#ef4444"}`,
              }}
            >
              <h2 style={{ margin: "0 0 8px 0", color: isWin ? "#4ade80" : "#f87171" }}>
                {isWin ? "Victory!" : "Defeat"}
              </h2>
              <p style={{ margin: 0 }}>{resultMessage}</p>
            </div>

            <p style={{ marginBottom: "20px" }}>
              New Balance: <strong>{balance} $RAREFRIENDS</strong>
            </p>

            <button onClick={() => setScreen("bet")} style={primaryBtn}>
              Play Again
            </button>
            <button
              onClick={() => setScreen("world")}
              style={{ ...secondaryBtn, marginTop: "10px" }}
            >
              Back to Garden
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const overlayStyle: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  background: "rgba(0,0,0,0.55)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 40,
};

const menuStyle: React.CSSProperties = {
  background: "#1e293b",
  padding: "24px 20px",
  borderRadius: "14px",
  color: "white",
  width: "90%",
  maxWidth: "320px",
  textAlign: "center",
  boxShadow: "0 15px 40px rgba(0,0,0,0.5)",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  marginTop: "6px",
  borderRadius: "8px",
  border: "1px solid #334155",
  background: "#0f172a",
  color: "white",
  fontSize: "15px",
  boxSizing: "border-box",
};

const primaryBtn: React.CSSProperties = {
  width: "100%",
  padding: "12px",
  background: "#22c55e",
  border: "none",
  borderRadius: "10px",
  color: "white",
  fontWeight: "600",
  fontSize: "15px",
  cursor: "pointer",
};

const secondaryBtn: React.CSSProperties = {
  width: "100%",
  padding: "10px",
  background: "transparent",
  border: "1px solid #475569",
  borderRadius: "10px",
  color: "white",
  fontSize: "14px",
  cursor: "pointer",
};