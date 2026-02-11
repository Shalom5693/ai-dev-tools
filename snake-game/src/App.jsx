import { useState, useEffect, useCallback, useRef } from "react";

const GRID_SIZE = 20;
const CELL_SIZE = 24;
const INITIAL_SPEED = 150;
const SPEED_INCREMENT = 3;
const MIN_SPEED = 60;

const DIRECTIONS = {
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
  w: { x: 0, y: -1 },
  s: { x: 0, y: 1 },
  a: { x: -1, y: 0 },
  d: { x: 1, y: 0 },
};

const OPPOSITES = {
  ArrowUp: "ArrowDown",
  ArrowDown: "ArrowUp",
  ArrowLeft: "ArrowRight",
  ArrowRight: "ArrowLeft",
  w: "s", s: "w", a: "d", d: "a",
};

const getRandomPosition = (snake) => {
  let pos;
  do {
    pos = {
      x: Math.floor(Math.random() * GRID_SIZE),
      y: Math.floor(Math.random() * GRID_SIZE),
    };
  } while (snake.some((s) => s.x === pos.x && s.y === pos.y));
  return pos;
};

const neonGlow = (color, blur = 8) =>
  `0 0 ${blur}px ${color}, 0 0 ${blur * 2}px ${color}44`;

export default function SnakeGame() {
  const [snake, setSnake] = useState([
    { x: 10, y: 10 },
    { x: 9, y: 10 },
    { x: 8, y: 10 },
  ]);
  const [food, setFood] = useState({ x: 15, y: 10 });
  const [direction, setDirection] = useState("ArrowRight");
  const [gameState, setGameState] = useState("idle"); // idle, playing, over
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [speed, setSpeed] = useState(INITIAL_SPEED);
  const [particles, setParticles] = useState([]);

  const dirRef = useRef(direction);
  const snakeRef = useRef(snake);
  const foodRef = useRef(food);
  const speedRef = useRef(speed);
  const gameStateRef = useRef(gameState);
  const queuedDir = useRef(null);

  useEffect(() => { dirRef.current = direction; }, [direction]);
  useEffect(() => { snakeRef.current = snake; }, [snake]);
  useEffect(() => { foodRef.current = food; }, [food]);
  useEffect(() => { speedRef.current = speed; }, [speed]);
  useEffect(() => { gameStateRef.current = gameState; }, [gameState]);

  const spawnParticles = useCallback((x, y) => {
    const newParticles = Array.from({ length: 8 }, (_, i) => ({
      id: Date.now() + i,
      x: x * CELL_SIZE + CELL_SIZE / 2,
      y: y * CELL_SIZE + CELL_SIZE / 2,
      angle: (Math.PI * 2 * i) / 8,
      life: 1,
    }));
    setParticles((p) => [...p, ...newParticles]);
    setTimeout(() => setParticles((p) => p.filter((pp) => !newParticles.includes(pp))), 500);
  }, []);

  const resetGame = useCallback(() => {
    const initial = [
      { x: 10, y: 10 },
      { x: 9, y: 10 },
      { x: 8, y: 10 },
    ];
    setSnake(initial);
    setFood(getRandomPosition(initial));
    setDirection("ArrowRight");
    dirRef.current = "ArrowRight";
    queuedDir.current = null;
    setScore(0);
    setSpeed(INITIAL_SPEED);
    setGameState("playing");
  }, []);

  const gameLoop = useCallback(() => {
    if (gameStateRef.current !== "playing") return;

    const currentDir = queuedDir.current || dirRef.current;
    if (queuedDir.current) {
      setDirection(queuedDir.current);
      dirRef.current = queuedDir.current;
      queuedDir.current = null;
    }

    const dir = DIRECTIONS[currentDir];
    const head = snakeRef.current[0];
    const newHead = { x: head.x + dir.x, y: head.y + dir.y };

    // Wall collision
    if (newHead.x < 0 || newHead.x >= GRID_SIZE || newHead.y < 0 || newHead.y >= GRID_SIZE) {
      setGameState("over");
      setHighScore((h) => Math.max(h, snakeRef.current.length - 3));
      return;
    }

    // Self collision
    if (snakeRef.current.some((s) => s.x === newHead.x && s.y === newHead.y)) {
      setGameState("over");
      setHighScore((h) => Math.max(h, snakeRef.current.length - 3));
      return;
    }

    const newSnake = [newHead, ...snakeRef.current];
    const ate = newHead.x === foodRef.current.x && newHead.y === foodRef.current.y;

    if (ate) {
      spawnParticles(newHead.x, newHead.y);
      setFood(getRandomPosition(newSnake));
      setScore((s) => s + 1);
      setSpeed((sp) => Math.max(MIN_SPEED, sp - SPEED_INCREMENT));
    } else {
      newSnake.pop();
    }

    setSnake(newSnake);
  }, [spawnParticles]);

  // Game loop with dynamic speed
  useEffect(() => {
    if (gameState !== "playing") return;
    const id = setInterval(gameLoop, speedRef.current);
    return () => clearInterval(id);
  }, [gameState, speed, gameLoop]);

  // Keyboard controls
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        if (gameStateRef.current !== "playing") resetGame();
        return;
      }

      if (!DIRECTIONS[e.key]) return;
      e.preventDefault();

      const current = dirRef.current;
      // Prevent 180-degree turns
      const oppKey = Object.entries(DIRECTIONS).find(
        ([k, v]) => v.x === -DIRECTIONS[current].x && v.y === -DIRECTIONS[current].y
      )?.[0];

      if (DIRECTIONS[e.key].x === -DIRECTIONS[current].x && DIRECTIONS[e.key].y === -DIRECTIONS[current].y) return;

      queuedDir.current = e.key;
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [resetGame]);

  // Touch controls
  const touchStart = useRef(null);
  const handleTouchStart = (e) => {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const handleTouchEnd = (e) => {
    if (!touchStart.current) return;
    const dx = e.changedTouches[0].clientX - touchStart.current.x;
    const dy = e.changedTouches[0].clientY - touchStart.current.y;
    if (Math.abs(dx) < 20 && Math.abs(dy) < 20) {
      if (gameStateRef.current !== "playing") resetGame();
      return;
    }
    let key;
    if (Math.abs(dx) > Math.abs(dy)) {
      key = dx > 0 ? "ArrowRight" : "ArrowLeft";
    } else {
      key = dy > 0 ? "ArrowDown" : "ArrowUp";
    }
    const current = dirRef.current;
    if (DIRECTIONS[key].x === -DIRECTIONS[current].x && DIRECTIONS[key].y === -DIRECTIONS[current].y) return;
    queuedDir.current = key;
  };

  const getSegmentStyle = (seg, i, arr) => {
    const isHead = i === 0;
    const progress = 1 - i / arr.length;
    const hue = 140 + i * 2;
    const color = `hsl(${hue}, 100%, ${isHead ? 65 : 45 + progress * 15}%)`;

    return {
      position: "absolute",
      left: seg.x * CELL_SIZE,
      top: seg.y * CELL_SIZE,
      width: CELL_SIZE - 1,
      height: CELL_SIZE - 1,
      backgroundColor: color,
      borderRadius: isHead ? 6 : 3,
      boxShadow: isHead ? neonGlow("#00ff88", 10) : neonGlow(color, 4),
      transition: "none",
      zIndex: isHead ? 10 : 5,
    };
  };

  const boardPx = GRID_SIZE * CELL_SIZE;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(145deg, #0a0a0f 0%, #0d1117 50%, #0a0f0a 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'JetBrains Mono', 'Fira Code', 'Courier New', monospace",
        color: "#e0e0e0",
        userSelect: "none",
        overflow: "hidden",
        padding: 16,
      }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet" />

      {/* Title */}
      <h1
        style={{
          fontFamily: "'Press Start 2P', monospace",
          fontSize: "clamp(18px, 4vw, 28px)",
          color: "#00ff88",
          textShadow: neonGlow("#00ff88", 12),
          letterSpacing: 6,
          marginBottom: 20,
          textAlign: "center",
        }}
      >
        SNAKE
      </h1>

      {/* Score Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          width: Math.min(boardPx, "90vw"),
          maxWidth: boardPx,
          marginBottom: 12,
          fontSize: 13,
          fontFamily: "'Press Start 2P', monospace",
        }}
      >
        <span>
          SCORE{" "}
          <span style={{ color: "#00ff88", textShadow: neonGlow("#00ff88", 6) }}>
            {String(score).padStart(3, "0")}
          </span>
        </span>
        <span>
          BEST{" "}
          <span style={{ color: "#ffaa00", textShadow: neonGlow("#ffaa00", 6) }}>
            {String(highScore).padStart(3, "0")}
          </span>
        </span>
      </div>

      {/* Game Board */}
      <div
        style={{
          position: "relative",
          width: boardPx,
          height: boardPx,
          maxWidth: "90vw",
          maxHeight: "90vw",
          background: `
            radial-gradient(ellipse at center, #0d1a0d 0%, #080c08 100%)
          `,
          border: "2px solid #00ff8833",
          borderRadius: 8,
          boxShadow: `inset 0 0 60px #00000088, ${neonGlow("#00ff8822", 20)}`,
          overflow: "hidden",
          aspectRatio: "1",
        }}
      >
        {/* Grid lines */}
        <svg
          width="100%"
          height="100%"
          style={{ position: "absolute", top: 0, left: 0, opacity: 0.06 }}
          viewBox={`0 0 ${boardPx} ${boardPx}`}
        >
          {Array.from({ length: GRID_SIZE + 1 }, (_, i) => (
            <g key={i}>
              <line x1={i * CELL_SIZE} y1={0} x2={i * CELL_SIZE} y2={boardPx} stroke="#00ff88" strokeWidth={0.5} />
              <line x1={0} y1={i * CELL_SIZE} x2={boardPx} y2={i * CELL_SIZE} stroke="#00ff88" strokeWidth={0.5} />
            </g>
          ))}
        </svg>

        {/* Food */}
        <div
          style={{
            position: "absolute",
            left: food.x * CELL_SIZE + 2,
            top: food.y * CELL_SIZE + 2,
            width: CELL_SIZE - 5,
            height: CELL_SIZE - 5,
            backgroundColor: "#ff3355",
            borderRadius: "50%",
            boxShadow: neonGlow("#ff3355", 12),
            animation: "foodPulse 1s ease-in-out infinite",
            zIndex: 8,
          }}
        />

        {/* Snake */}
        {snake.map((seg, i) => (
          <div key={`${i}-${seg.x}-${seg.y}`} style={getSegmentStyle(seg, i, snake)}>
            {i === 0 && (
              <>
                {/* Eyes */}
                <div
                  style={{
                    position: "absolute",
                    width: 5,
                    height: 5,
                    backgroundColor: "#fff",
                    borderRadius: "50%",
                    top: dirRef.current === "ArrowDown" || dirRef.current === "s" ? CELL_SIZE - 10 : dirRef.current === "ArrowUp" || dirRef.current === "w" ? 3 : 4,
                    left: dirRef.current === "ArrowRight" || dirRef.current === "d" ? CELL_SIZE - 10 : dirRef.current === "ArrowLeft" || dirRef.current === "a" ? 3 : 4,
                    boxShadow: "0 0 4px #fff",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    width: 5,
                    height: 5,
                    backgroundColor: "#fff",
                    borderRadius: "50%",
                    top: dirRef.current === "ArrowDown" || dirRef.current === "s" ? CELL_SIZE - 10 : dirRef.current === "ArrowUp" || dirRef.current === "w" ? 3 : 12,
                    left: dirRef.current === "ArrowRight" || dirRef.current === "d" ? CELL_SIZE - 10 : dirRef.current === "ArrowLeft" || dirRef.current === "a" ? 3 : 12,
                    boxShadow: "0 0 4px #fff",
                  }}
                />
              </>
            )}
          </div>
        ))}

        {/* Eat Particles */}
        {particles.map((p) => (
          <div
            key={p.id}
            style={{
              position: "absolute",
              left: p.x + Math.cos(p.angle) * 20,
              top: p.y + Math.sin(p.angle) * 20,
              width: 4,
              height: 4,
              backgroundColor: "#ffcc00",
              borderRadius: "50%",
              boxShadow: neonGlow("#ffcc00", 6),
              animation: "particleFade 0.5s ease-out forwards",
              pointerEvents: "none",
            }}
          />
        ))}

        {/* Overlay */}
        {gameState !== "playing" && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(0,0,0,0.75)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 20,
              backdropFilter: "blur(4px)",
            }}
          >
            {gameState === "over" && (
              <div
                style={{
                  fontFamily: "'Press Start 2P', monospace",
                  fontSize: "clamp(14px, 3vw, 22px)",
                  color: "#ff3355",
                  textShadow: neonGlow("#ff3355", 10),
                  marginBottom: 16,
                }}
              >
                GAME OVER
              </div>
            )}
            {gameState === "over" && (
              <div
                style={{
                  fontFamily: "'Press Start 2P', monospace",
                  fontSize: "clamp(10px, 2vw, 14px)",
                  color: "#aaa",
                  marginBottom: 28,
                }}
              >
                SCORE: {score}
              </div>
            )}
            <button
              onClick={resetGame}
              style={{
                fontFamily: "'Press Start 2P', monospace",
                fontSize: "clamp(10px, 2vw, 14px)",
                padding: "14px 32px",
                background: "transparent",
                color: "#00ff88",
                border: "2px solid #00ff88",
                borderRadius: 6,
                cursor: "pointer",
                textShadow: neonGlow("#00ff88", 6),
                boxShadow: neonGlow("#00ff8844", 8),
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.target.style.background = "#00ff8822";
                e.target.style.boxShadow = neonGlow("#00ff88", 14);
              }}
              onMouseLeave={(e) => {
                e.target.style.background = "transparent";
                e.target.style.boxShadow = neonGlow("#00ff8844", 8);
              }}
            >
              {gameState === "idle" ? "START GAME" : "PLAY AGAIN"}
            </button>
            <div
              style={{
                fontFamily: "'Press Start 2P', monospace",
                fontSize: 8,
                color: "#555",
                marginTop: 20,
                textAlign: "center",
                lineHeight: 2,
              }}
            >
              ARROWS / WASD TO MOVE
              <br />
              SWIPE ON MOBILE
            </div>
          </div>
        )}
      </div>

      {/* Mobile D-Pad */}
      <div
        style={{
          display: "none",
          marginTop: 20,
          gridTemplateColumns: "60px 60px 60px",
          gridTemplateRows: "60px 60px 60px",
          gap: 4,
        }}
        className="dpad"
      >
        {[
          { label: "▲", key: "ArrowUp", col: 2, row: 1 },
          { label: "◄", key: "ArrowLeft", col: 1, row: 2 },
          { label: "►", key: "ArrowRight", col: 3, row: 2 },
          { label: "▼", key: "ArrowDown", col: 2, row: 3 },
        ].map((btn) => (
          <button
            key={btn.key}
            onTouchStart={(e) => {
              e.preventDefault();
              if (gameStateRef.current !== "playing") return;
              const current = dirRef.current;
              if (DIRECTIONS[btn.key].x === -DIRECTIONS[current].x && DIRECTIONS[btn.key].y === -DIRECTIONS[current].y) return;
              queuedDir.current = btn.key;
            }}
            style={{
              gridColumn: btn.col,
              gridRow: btn.row,
              fontSize: 20,
              background: "#111",
              color: "#00ff8888",
              border: "1px solid #00ff8833",
              borderRadius: 8,
              cursor: "pointer",
              touchAction: "manipulation",
            }}
          >
            {btn.label}
          </button>
        ))}
      </div>

      <style>{`
        @keyframes foodPulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.3); opacity: 0.8; }
        }
        @keyframes particleFade {
          0% { opacity: 1; transform: scale(1); }
          100% { opacity: 0; transform: scale(0.2) translate(10px, 10px); }
        }
        @media (max-width: 600px) {
          .dpad { display: grid !important; }
        }
      `}</style>
    </div>
  );
}