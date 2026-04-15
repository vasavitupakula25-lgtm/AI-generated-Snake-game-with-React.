import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, Trophy, Gamepad2, Disc3 } from 'lucide-react';

// --- Constants & Types ---
const GRID_SIZE = 20;
const INITIAL_SNAKE = [{ x: 10, y: 10 }];
const INITIAL_DIRECTION = { x: 0, y: -1 };
const GAME_SPEED = 100;

const TRACKS = [
  {
    id: 1,
    title: "Neon Drift",
    artist: "AI Synthwave",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    theme: "cyan",
    glowClass: "drop-shadow-[0_0_15px_rgba(34,211,238,0.8)]",
    textClass: "text-cyan-400",
    borderClass: "border-cyan-400/50",
    bgClass: "bg-cyan-400",
    hex: "#22d3ee"
  },
  {
    id: 2,
    title: "Digital Horizon",
    artist: "AI Cyberpunk",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
    theme: "fuchsia",
    glowClass: "drop-shadow-[0_0_15px_rgba(232,121,249,0.8)]",
    textClass: "text-fuchsia-400",
    borderClass: "border-fuchsia-400/50",
    bgClass: "bg-fuchsia-400",
    hex: "#e879f9"
  },
  {
    id: 3,
    title: "Mainframe Breach",
    artist: "AI Darksynth",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
    theme: "green",
    glowClass: "drop-shadow-[0_0_15px_rgba(74,222,128,0.8)]",
    textClass: "text-green-400",
    borderClass: "border-green-400/50",
    bgClass: "bg-green-400",
    hex: "#4ade80"
  }
];

export default function App() {
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const [isMuted, setIsMuted] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  
  const track = TRACKS[currentTrackIndex];

  // --- Audio Controls ---
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  useEffect(() => {
    if (isPlaying) {
      audioRef.current?.play().catch(e => {
        console.log("Audio play prevented:", e);
        setIsPlaying(false);
      });
    } else {
      audioRef.current?.pause();
    }
  }, [isPlaying, currentTrackIndex]);

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      const p = (audioRef.current.currentTime / audioRef.current.duration) * 100;
      setProgress(p || 0);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleEnded = () => {
    setCurrentTrackIndex((prev) => (prev + 1) % TRACKS.length);
  };

  const togglePlay = () => setIsPlaying(!isPlaying);
  const nextTrack = () => setCurrentTrackIndex((prev) => (prev + 1) % TRACKS.length);
  const prevTrack = () => setCurrentTrackIndex((prev) => (prev - 1 + TRACKS.length) % TRACKS.length);

  // --- Snake Game State & Logic ---
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvasSize, setCanvasSize] = useState(400);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [isShaking, setIsShaking] = useState(false);

  const snakeRef = useRef(INITIAL_SNAKE);
  const directionRef = useRef(INITIAL_DIRECTION);
  const nextDirectionRef = useRef(INITIAL_DIRECTION);
  const foodRef = useRef({ x: 15, y: 5 });
  const lastUpdateRef = useRef(0);
  const requestRef = useRef<number>();

  // Resize Observer for Canvas
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        // Keep it square and add some padding
        const size = Math.max(200, Math.min(width, height) - 48);
        setCanvasSize(size);
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const initGame = () => {
    snakeRef.current = [{ x: 10, y: 10 }];
    directionRef.current = { x: 0, y: -1 };
    nextDirectionRef.current = { x: 0, y: -1 };
    foodRef.current = { 
      x: Math.floor(Math.random() * GRID_SIZE), 
      y: Math.floor(Math.random() * GRID_SIZE) 
    };
    setScore(0);
    setGameOver(false);
    setHasStarted(true);
  };

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cellSize = canvasSize / GRID_SIZE;
    const themeColor = track.hex;

    // Clear canvas
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, canvasSize, canvasSize);

    // Draw grid lines (subtle)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= GRID_SIZE; i++) {
      ctx.beginPath();
      ctx.moveTo(i * cellSize, 0);
      ctx.lineTo(i * cellSize, canvasSize);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * cellSize);
      ctx.lineTo(canvasSize, i * cellSize);
      ctx.stroke();
    }

    // Draw Food (glowing)
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#ef4444'; // Red food
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(
      foodRef.current.x * cellSize + 2, 
      foodRef.current.y * cellSize + 2, 
      cellSize - 4, 
      cellSize - 4
    );

    // Draw Snake (glowing with theme color)
    ctx.shadowBlur = 12;
    ctx.shadowColor = themeColor;
    
    snakeRef.current.forEach((segment, index) => {
      if (index === 0) {
        ctx.fillStyle = '#ffffff'; // White head
        ctx.shadowColor = '#ffffff';
      } else {
        ctx.fillStyle = themeColor;
        ctx.shadowColor = themeColor;
      }
      
      ctx.fillRect(
        segment.x * cellSize + 1, 
        segment.y * cellSize + 1, 
        cellSize - 2, 
        cellSize - 2
      );
    });

    // Reset shadow
    ctx.shadowBlur = 0;
  }, [canvasSize, track.hex]);

  const update = useCallback((time: number) => {
    if (gameOver || !hasStarted) return;

    if (time - lastUpdateRef.current > GAME_SPEED) {
      lastUpdateRef.current = time;

      directionRef.current = nextDirectionRef.current;
      const head = snakeRef.current[0];
      const newHead = {
        x: head.x + directionRef.current.x,
        y: head.y + directionRef.current.y
      };

      // Wall collision
      if (
        newHead.x < 0 || 
        newHead.x >= GRID_SIZE || 
        newHead.y < 0 || 
        newHead.y >= GRID_SIZE
      ) {
        setGameOver(true);
        return;
      }

      // Self collision
      if (snakeRef.current.some(segment => segment.x === newHead.x && segment.y === newHead.y)) {
        setGameOver(true);
        return;
      }

      const newSnake = [newHead, ...snakeRef.current];

      // Food collision
      if (newHead.x === foodRef.current.x && newHead.y === foodRef.current.y) {
        setScore(s => {
          const newScore = s + 10;
          setHighScore(h => Math.max(h, newScore));
          return newScore;
        });
        
        // Juice: Screen shake effect
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 150);

        // Generate new food
        let newFood;
        while (true) {
          newFood = {
            x: Math.floor(Math.random() * GRID_SIZE),
            y: Math.floor(Math.random() * GRID_SIZE)
          };
          // eslint-disable-next-line no-loop-func
          if (!newSnake.some(s => s.x === newFood.x && s.y === newFood.y)) {
            break;
          }
        }
        foodRef.current = newFood;
      } else {
        newSnake.pop();
      }

      snakeRef.current = newSnake;
    }

    draw();
    requestRef.current = requestAnimationFrame(update);
  }, [gameOver, hasStarted, draw]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) {
        e.preventDefault();
      }

      if (!hasStarted && e.key === ' ') {
        initGame();
        return;
      }

      if (gameOver && e.key === ' ') {
        initGame();
        return;
      }

      const dir = directionRef.current;
      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          if (dir.y !== 1) nextDirectionRef.current = { x: 0, y: -1 };
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          if (dir.y !== -1) nextDirectionRef.current = { x: 0, y: 1 };
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          if (dir.x !== 1) nextDirectionRef.current = { x: -1, y: 0 };
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          if (dir.x !== -1) nextDirectionRef.current = { x: 1, y: 0 };
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown, { passive: false });
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasStarted, gameOver]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(update);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [update]);

  // Redraw when theme changes or canvas resizes even if paused/stopped
  useEffect(() => {
    draw();
  }, [draw, track.theme, canvasSize]);

  return (
    <div id="app-root" className="min-h-screen bg-[#050505] text-white font-sans flex flex-col overflow-hidden selection:bg-fuchsia-500/30">
      {/* Atmospheric background glow */}
      <div 
        id="ambient-background"
        className="absolute inset-0 opacity-20 transition-colors duration-1000 pointer-events-none"
        style={{ 
          background: `radial-gradient(circle at 50% 50%, ${track.hex} 0%, transparent 60%)`,
          filter: 'blur(60px)'
        }} 
      />

      {/* Header */}
      <header id="app-header" className="relative z-10 p-6 flex justify-between items-center border-b border-white/5 bg-black/40 backdrop-blur-md">
        <div id="logo-container" className="flex items-center gap-3">
          <Gamepad2 id="logo-icon" className={`w-8 h-8 ${track.textClass} ${track.glowClass} transition-all duration-500`} />
          <h1 id="app-title" className="text-2xl font-bold tracking-wider uppercase">Neon<span className="font-light opacity-70">Snake</span></h1>
        </div>
        <div id="score-container" className="flex items-center gap-6">
          <div id="current-score-wrapper" className="flex flex-col items-end">
            <span className="text-xs uppercase tracking-widest text-gray-500 font-semibold">Score</span>
            <span id="current-score" className={`text-2xl font-mono ${track.textClass} ${track.glowClass} transition-all duration-500`}>{score}</span>
          </div>
          <div className="w-px h-10 bg-white/10" />
          <div id="high-score-wrapper" className="flex flex-col items-end">
            <span className="text-xs uppercase tracking-widest text-gray-500 font-semibold">High Score</span>
            <span id="high-score" className="text-2xl font-mono text-white">{highScore}</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main id="game-container" ref={containerRef} className="flex-1 relative z-10 flex items-center justify-center p-6 w-full max-w-7xl mx-auto">
        <div 
          id="canvas-wrapper"
          className={`relative p-1 rounded-xl bg-gradient-to-b from-white/10 to-transparent backdrop-blur-sm ${track.glowClass} transition-all duration-500 ${isShaking ? 'animate-[shake_0.15s_ease-in-out]' : ''}`}
          style={{ width: canvasSize + 8, height: canvasSize + 8 }}
        >
          <div className="absolute inset-0 rounded-xl border border-white/10" />
          
          <canvas 
            id="snake-canvas"
            ref={canvasRef}
            width={canvasSize}
            height={canvasSize}
            className="rounded-lg bg-[#050505] block shadow-2xl relative z-10"
          />

          {/* Overlays */}
          {!hasStarted && !gameOver && (
            <div id="start-overlay" className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm rounded-lg">
              <Gamepad2 className={`w-16 h-16 mb-4 ${track.textClass} animate-pulse`} />
              <h2 className="text-2xl font-bold uppercase tracking-widest mb-2">Ready?</h2>
              <p className="text-gray-400 text-sm tracking-widest uppercase">Press Space to Start</p>
            </div>
          )}

          {gameOver && (
            <div id="game-over-overlay" className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md rounded-lg border border-red-500/30">
              <Trophy className="w-16 h-16 mb-4 text-red-500 drop-shadow-[0_0_15px_rgba(239,68,68,0.8)]" />
              <h2 className="text-3xl font-bold uppercase tracking-widest mb-2 text-red-500">Game Over</h2>
              <p className="text-gray-400 text-sm tracking-widest uppercase mb-6">Final Score: <span className="font-mono">{score}</span></p>
              <button 
                id="btn-play-again"
                onClick={initGame}
                className={`px-6 py-3 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 transition-all uppercase tracking-widest text-sm font-bold ${track.textClass} hover:${track.glowClass}`}
              >
                Play Again
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Music Player */}
      <footer id="music-player" className="relative z-10 border-t border-white/5 bg-black/60 backdrop-blur-xl p-6">
        <audio 
          id="audio-element"
          ref={audioRef} 
          src={track.url} 
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={handleEnded}
        />
        
        <div id="player-controls-container" className="max-w-4xl mx-auto flex flex-col md:flex-row items-center gap-6">
          {/* Track Info */}
          <div id="track-info" className="flex items-center gap-4 w-full md:w-1/3">
            <div id="track-artwork" className={`w-12 h-12 rounded-full flex items-center justify-center bg-white/5 border ${track.borderClass} ${isPlaying ? 'animate-[spin_4s_linear_infinite]' : ''}`}>
              <Disc3 className={`w-6 h-6 ${track.textClass}`} />
            </div>
            <div id="track-details">
              <h3 id="track-title" className={`font-bold tracking-wide ${track.textClass} transition-colors duration-500`}>{track.title}</h3>
              <p id="track-artist" className="text-xs text-gray-400 uppercase tracking-wider">{track.artist}</p>
            </div>
          </div>

          {/* Controls */}
          <div id="playback-controls" className="flex flex-col items-center gap-3 w-full md:w-1/3">
            <div className="flex items-center gap-6">
              <button id="btn-prev-track" onClick={prevTrack} className="text-gray-400 hover:text-white transition-colors">
                <SkipBack className="w-5 h-5" />
              </button>
              <button 
                id="btn-play-pause"
                onClick={togglePlay} 
                className={`w-12 h-12 rounded-full flex items-center justify-center bg-white text-black hover:scale-105 transition-transform ${track.glowClass}`}
              >
                {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-1" />}
              </button>
              <button id="btn-next-track" onClick={nextTrack} className="text-gray-400 hover:text-white transition-colors">
                <SkipForward className="w-5 h-5" />
              </button>
            </div>
            
            {/* Progress Bar */}
            <div id="progress-container" className="w-full flex items-center gap-3">
              <span id="time-current" className="text-[10px] font-mono text-gray-500 w-8 text-right">
                {formatTime(currentTime)}
              </span>
              <div 
                id="progress-bar-bg"
                className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden cursor-pointer" 
                onClick={(e) => {
                  if (audioRef.current) {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const pos = (e.clientX - rect.left) / rect.width;
                    audioRef.current.currentTime = pos * audioRef.current.duration;
                  }
                }}
              >
                <div 
                  id="progress-bar-fill"
                  className={`h-full ${track.bgClass} transition-all duration-300 ease-out`}
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span id="time-duration" className="text-[10px] font-mono text-gray-500 w-8">
                {formatTime(duration)}
              </span>
            </div>
          </div>

          {/* Volume */}
          <div id="volume-controls" className="flex items-center justify-end gap-3 w-full md:w-1/3">
            <button id="btn-mute-toggle" onClick={() => setIsMuted(!isMuted)} className="text-gray-400 hover:text-white transition-colors">
              {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <input 
              id="volume-slider"
              type="range" 
              min="0" 
              max="1" 
              step="0.01" 
              value={isMuted ? 0 : volume}
              onChange={(e) => {
                setVolume(parseFloat(e.target.value));
                setIsMuted(false);
              }}
              className="w-24 h-1 bg-white/10 rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white cursor-pointer"
            />
          </div>
        </div>
      </footer>

      {/* CSS for shake animation */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px) rotate(-1deg); }
          50% { transform: translateX(4px) rotate(1deg); }
          75% { transform: translateX(-4px) rotate(-1deg); }
        }
      `}</style>
    </div>
  );
}

// Helper
function formatTime(seconds: number) {
  if (isNaN(seconds) || !isFinite(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}
