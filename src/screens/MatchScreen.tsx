import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Squad, Player, Difficulty } from '../types';
import { generateRandomPlayer } from '../data/players';
import { FORMATION_POSITIONS } from '../constants';
import { useAudio } from '../contexts/AudioContext';

interface Props {
  squad: Squad;
  onFinish: (coins: number, xpGains: Record<string, number>, scoreA?: number, scoreB?: number, stats?: any) => void;
  opponentName?: string;
  opponentColor?: string;
  userTeamName?: string;
  userTeamColor?: string;
  forcedDifficulty?: Difficulty;
  isWorldCup?: boolean;
  onWorldCupContinue?: () => void;
  mustHaveWinner?: boolean;
  mode?: 'FULL_MATCH' | 'PENALTY_SHOOTOUT' | 'TRAINING';
  drillType?: 'DRIBBLING' | 'PASSING' | 'SHOOTING';
  socket?: any;
  matchId?: string;
  isHost?: boolean;
  opponentSquad?: Squad;
}

const PW = 1050; const PH = 680;
const GOAL_Y1 = 270; const GOAL_Y2 = 410;
const GOAL_DEPTH = 22;
const BALL_R = 7; const PLAYER_R = 14;
const FRICTION = 0.985;
const SPEED_MULT = 0.046;
const PLAYER_DAMP = 0.84;
const BALL_DAMP = 0.955;

type Entity = {
  id: string; x: number; y: number; vx: number; vy: number;
  targetX: number | null; targetY: number | null;
  color: string; kitColor: string;
  playerData: Player; team: 'A' | 'B';
  homeX: number; homeY: number;
  hasBall: boolean; isSentOff?: boolean;
  lastKickTime?: number; health: number; isInjured?: boolean;
  facingAngle: number;
};

type PenaltyState = {
  turn: 'A' | 'B'; round: number;
  phase: 'aiming' | 'shooting' | 'saving' | 'result';
  timer: number; scoreA: number; scoreB: number;
  history: { team: 'A'|'B'; result: 'goal'|'miss' }[];
  shotTarget?: { x: number; y: number };
  keeperDive?: { x: number; y: number };
  isSingleKick?: boolean;
};

const SOUNDS = {
  goal: 'https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3',
  kick: 'https://assets.mixkit.co/active_storage/sfx/2092/2092-preview.mp3',
  whistle: 'https://assets.mixkit.co/active_storage/sfx/1003/1003-preview.mp3',
};

const TEAM_COLORS: Record<string, { kit: string; outline: string }> = {
  blue:   { kit: '#1565c0', outline: '#42a5f5' },
  red:    { kit: '#c62828', outline: '#ef5350' },
  green:  { kit: '#2e7d32', outline: '#66bb6a' },
  yellow: { kit: '#f57f17', outline: '#ffca28' },
  white:  { kit: '#e0e0e0', outline: '#ffffff' },
  purple: { kit: '#4a148c', outline: '#ab47bc' },
  teal:   { kit: '#00695c', outline: '#26a69a' },
  orange: { kit: '#e65100', outline: '#ffa726' },
};

// ── Drawing helpers ─────────────────────────────────────────────────────────
function drawPitch(ctx: CanvasRenderingContext2D, time: number) {
  // Grass stripes
  const stripeW = PW / 10;
  for (let i = 0; i < 10; i++) {
    const shade = i % 2 === 0 ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.04)';
    ctx.fillStyle = shade;
    ctx.fillRect(i * stripeW, 0, stripeW, PH);
  }

  // Lines
  ctx.strokeStyle = 'rgba(255,255,255,0.75)';
  ctx.lineWidth = 2.5;

  // Outline
  ctx.strokeRect(6, 6, PW - 12, PH - 12);

  // Center line
  ctx.beginPath(); ctx.moveTo(PW / 2, 6); ctx.lineTo(PW / 2, PH - 6); ctx.stroke();

  // Center circle
  ctx.beginPath(); ctx.arc(PW / 2, PH / 2, 80, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.arc(PW / 2, PH / 2, 4, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.fill();

  // Penalty areas
  ctx.strokeRect(6, PH / 2 - 130, 155, 260);
  ctx.strokeRect(PW - 161, PH / 2 - 130, 155, 260);

  // Goal areas
  ctx.strokeRect(6, PH / 2 - 60, 58, 120);
  ctx.strokeRect(PW - 64, PH / 2 - 60, 58, 120);

  // Penalty spots
  ctx.beginPath(); ctx.arc(130, PH / 2, 4, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.fill();
  ctx.beginPath(); ctx.arc(PW - 130, PH / 2, 4, 0, Math.PI * 2); ctx.fill();

  // Penalty arcs
  ctx.beginPath(); ctx.arc(130, PH / 2, 60, -1.1, 1.1); ctx.stroke();
  ctx.beginPath(); ctx.arc(PW - 130, PH / 2, 60, Math.PI - 1.1, Math.PI + 1.1); ctx.stroke();

  // Corner arcs
  const cr = 14;
  [
    [6, 6, 0, Math.PI / 2],
    [PW - 6, 6, Math.PI / 2, Math.PI],
    [PW - 6, PH - 6, Math.PI, 1.5 * Math.PI],
    [6, PH - 6, 1.5 * Math.PI, 2 * Math.PI],
  ].forEach(([x, y, s, e]) => {
    ctx.beginPath(); ctx.arc(x as number, y as number, cr, s as number, e as number); ctx.stroke();
  });
}

function drawGoalNet(ctx: CanvasRenderingContext2D, side: 'left' | 'right') {
  const x = side === 'left' ? 6 : PW - 6 - GOAL_DEPTH;
  const dir = side === 'left' ? 1 : -1;
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = 0.8;
  const netW = GOAL_DEPTH;
  const netH = GOAL_Y2 - GOAL_Y1;
  // Vertical lines
  for (let i = 0; i <= netW; i += 6) {
    ctx.beginPath();
    ctx.moveTo(x + i * dir, GOAL_Y1);
    ctx.lineTo(x + i * dir, GOAL_Y2);
    ctx.stroke();
  }
  // Horizontal lines
  for (let j = 0; j <= netH; j += 8) {
    ctx.beginPath();
    ctx.moveTo(x, GOAL_Y1 + j);
    ctx.lineTo(x + netW * dir, GOAL_Y1 + j);
    ctx.stroke();
  }
  // Posts
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#cccccc';
  ctx.lineWidth = 3;
  ctx.fillRect(x - (side === 'left' ? 3 : 0), GOAL_Y1 - 4, 6, 8);
  ctx.fillRect(x - (side === 'left' ? 3 : 0), GOAL_Y2 - 4, 6, 8);
  // Crossbar
  ctx.fillRect(x - (side === 'left' ? 3 : 0), GOAL_Y1 - 3, (GOAL_DEPTH + 3) * dir, 6);
}

function drawBall(ctx: CanvasRenderingContext2D, x: number, y: number, spin: number) {
  // Shadow
  ctx.save();
  ctx.globalAlpha = 0.3;
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.ellipse(x, y + BALL_R + 2, BALL_R + 1, (BALL_R + 1) * 0.4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // Ball body
  const g = ctx.createRadialGradient(x - BALL_R * 0.3, y - BALL_R * 0.3, 0, x, y, BALL_R);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.6, '#d0d0d0');
  g.addColorStop(1, '#888888');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, BALL_R, 0, Math.PI * 2);
  ctx.fill();

  // Panels
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(spin);
  ctx.strokeStyle = '#222222';
  ctx.lineWidth = 0.8;
  for (let i = 0; i < 5; i++) {
    ctx.save();
    ctx.rotate((i / 5) * Math.PI * 2);
    ctx.beginPath();
    ctx.moveTo(0, -BALL_R * 0.5);
    ctx.lineTo(BALL_R * 0.35, -BALL_R * 0.2);
    ctx.lineTo(BALL_R * 0.22, BALL_R * 0.35);
    ctx.lineTo(-BALL_R * 0.22, BALL_R * 0.35);
    ctx.lineTo(-BALL_R * 0.35, -BALL_R * 0.2);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
  ctx.restore();
}

function drawPlayer(ctx: CanvasRenderingContext2D, p: Entity, isControlled: boolean, showArrow: boolean) {
  const { x, y, kitColor, facingAngle } = p;
  const angle = facingAngle;

  // Shadow
  ctx.save();
  ctx.globalAlpha = 0.28;
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.ellipse(x, y + PLAYER_R + 3, PLAYER_R + 2, (PLAYER_R + 2) * 0.35, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // Jersey body (circle)
  const kg = ctx.createRadialGradient(x - PLAYER_R * 0.25, y - PLAYER_R * 0.25, 0, x, y, PLAYER_R * 1.2);
  const kc = kitColor;
  kg.addColorStop(0, lighten(kc, 40));
  kg.addColorStop(0.5, kc);
  kg.addColorStop(1, darken(kc, 30));
  ctx.fillStyle = kg;
  ctx.beginPath();
  ctx.arc(x, y, PLAYER_R, 0, Math.PI * 2);
  ctx.fill();

  // Jersey outline
  ctx.strokeStyle = isControlled ? '#ffffff' : rgba(0, 0, 0, 0.5);
  ctx.lineWidth = isControlled ? 2.5 : 1.5;
  ctx.stroke();

  // OVR number
  ctx.fillStyle = '#fff';
  ctx.font = `bold ${isControlled ? 10 : 9}px "Rajdhani", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(p.playerData.ovr.toString(), x, y + 1);

  // Controlled arrow indicator
  if (showArrow) {
    const arrowY = y - PLAYER_R - 12;
    ctx.fillStyle = '#00c851';
    ctx.beginPath();
    ctx.moveTo(x, arrowY + 5);
    ctx.lineTo(x - 6, arrowY - 3);
    ctx.lineTo(x + 6, arrowY - 3);
    ctx.closePath();
    ctx.fill();
    // YOU label
    ctx.fillStyle = '#00c851';
    ctx.font = 'bold 8px "Rajdhani", sans-serif';
    ctx.fillText('YOU', x, arrowY - 10);
  }

  // Name label
  const shortName = p.playerData.name.split(' ').pop() || '';
  ctx.fillStyle = '#ffffff';
  ctx.font = '8px "Rajdhani", sans-serif';
  ctx.fillText(shortName, x, y - PLAYER_R - (showArrow ? 20 : 4));

  // Injury indicator
  if (p.isInjured) {
    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 10px sans-serif';
    ctx.fillText('🤕', x + PLAYER_R - 2, y - PLAYER_R + 2);
  }

  ctx.restore();
}

function lighten(hex: string, amount: number): string {
  const r = Math.min(255, parseInt(hex.slice(1, 3), 16) + amount);
  const g = Math.min(255, parseInt(hex.slice(3, 5), 16) + amount);
  const b = Math.min(255, parseInt(hex.slice(5, 7), 16) + amount);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}
function darken(hex: string, amount: number): string {
  const r = Math.max(0, parseInt(hex.slice(1, 3), 16) - amount);
  const g = Math.max(0, parseInt(hex.slice(3, 5), 16) - amount);
  const b = Math.max(0, parseInt(hex.slice(5, 7), 16) - amount);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}
function rgba(r: number, g: number, b: number, a: number) { return `rgba(${r},${g},${b},${a})`; }

// ── Main Component ───────────────────────────────────────────────────────────
export default function MatchScreen({ squad, onFinish, opponentName, opponentColor, userTeamName, userTeamColor, forcedDifficulty, isWorldCup, onWorldCupContinue, mustHaveWinner, mode = 'FULL_MATCH', drillType, socket, matchId, isHost, opponentSquad }: Props) {
  const { playAudio, stopAudio } = useAudio();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState({ A: 0, B: 0 });
  const [timeLeft, setTimeLeft] = useState(0);
  const [half, setHalf] = useState<1 | 2 | 3 | 4>(1);
  const [isFinished, setIsFinished] = useState(false);
  const [matchStateUI, setMatchStateUI] = useState<'setup' | 'intro' | 'playing' | 'halftime' | 'extratime_break' | 'penalties' | 'finished'>(
    mode === 'PENALTY_SHOOTOUT' ? 'penalties' : mode === 'TRAINING' ? 'playing' : (forcedDifficulty ? 'intro' : 'setup')
  );
  const [difficulty, setDifficulty] = useState<Difficulty>(forcedDifficulty || 'MEDIUM');
  const [introTimer, setIntroTimer] = useState(8);
  const [isPaused, setIsPaused] = useState(false);
  const [activeLog, setActiveLog] = useState<string | null>(null);
  const [logQueue, setLogQueue] = useState<string[]>([]);
  const [penaltyState, setPenaltyState] = useState<PenaltyState>({ turn: 'A', round: 1, phase: 'aiming', timer: 0, scoreA: 0, scoreB: 0, history: [] });
  const [matchStats, setMatchStats] = useState<{ goals: { playerId: string; minute: number; team: 'A' | 'B' }[]; ratings: Record<string, number> }>({ goals: [], ratings: {} });
  const [isMobile, setIsMobile] = useState(false);
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('landscape');
  const [joystick, setJoystick] = useState({ x: 0, y: 0, active: false });
  const [goalFlash, setGoalFlash] = useState<{ team: 'A' | 'B'; scorer: string } | null>(null);
  const [shotPower, setShotPower] = useState(0);
  const [showShotPower, setShowShotPower] = useState(false);

  const keys = useRef<Record<string, boolean>>({});
  const controlledId = useRef<string | null>(null);
  const mouseTarget = useRef<{ x: number; y: number } | null>(null);
  const joystickRef = useRef<{ startX: number; startY: number } | null>(null);
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const shotChargeRef = useRef(0);
  const shotChargingRef = useRef(false);
  const audioRefs = useRef<Record<string, HTMLAudioElement>>({});
  const aiTeamRef = useRef<Player[] | null>(null);
  const initializedHalfRef = useRef(0);
  const ballSpinRef = useRef(0);

  const gameState = useRef({
    ball: { x: PW / 2, y: PH / 2, vx: 0, vy: 0 },
    players: [] as Entity[],
    score: { A: 0, B: 0 },
    state: (mode === 'PENALTY_SHOOTOUT' ? 'PENALTIES' : 'INTRO') as
      'INTRO' | 'PLAYING' | 'GOAL' | 'HALFTIME' | 'EXTRATIME_BREAK' | 'PENALTIES' | 'FINISHED' | 'PAUSED',
    timer: 0,
    kickOffTeam: 'A' as 'A' | 'B',
    kickOffInvincibility: 0,
    penaltyState: { turn: 'A', round: 1, phase: 'aiming', timer: 0, scoreA: 0, scoreB: 0, history: [] } as PenaltyState,
    passTargetId: null as string | null,
    passTime: 0,
    goalFlashTimer: 0,
  });

  useEffect(() => {
    const check = () => {
      setIsMobile(/Android|webOS|iPhone|iPad|iPod/i.test(navigator.userAgent) || window.innerWidth < 1024);
      setOrientation(window.innerHeight > window.innerWidth ? 'portrait' : 'landscape');
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    Object.entries(SOUNDS).forEach(([k, url]) => {
      const a = new Audio(url); audioRefs.current[k] = a;
    });
    playAudio('MATCH_AMBIENT', true);
    const onDown = (e: KeyboardEvent) => { keys.current[e.code] = true; e.preventDefault(); };
    const onUp = (e: KeyboardEvent) => { keys.current[e.code] = false; };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
      Object.values(audioRefs.current).forEach(a => { a.pause(); a.src = ''; });
      stopAudio('MATCH_AMBIENT');
    };
  }, []);

  const playSound = (name: keyof typeof SOUNDS) => {
    const a = audioRefs.current[name];
    if (a) { a.currentTime = 0; a.play().catch(() => {}); }
  };

  const addLog = (msg: string) => setLogQueue(prev => [...prev, `${Math.floor(gameState.current.timer)}' ${msg}`]);

  useEffect(() => {
    if (activeLog) { const t = setTimeout(() => setActiveLog(null), 2500); return () => clearTimeout(t); }
  }, [activeLog]);

  useEffect(() => {
    if (!activeLog && logQueue.length > 0) { setActiveLog(logQueue[0]); setLogQueue(p => p.slice(1)); }
  }, [activeLog, logQueue]);

  // Intro countdown
  useEffect(() => {
    if (matchStateUI !== 'intro') return;
    const init: Record<string, number> = {};
    squad.lineup.forEach(p => { if (p) init[p.id] = 6.5; });
    setMatchStats(prev => ({ ...prev, ratings: init }));
    const iv = setInterval(() => {
      setIntroTimer(prev => {
        if (prev <= 1) { setMatchStateUI('playing'); gameState.current.state = 'PLAYING'; return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [matchStateUI]);

  const resetPositions = useCallback((kickOffTeam: 'A' | 'B' = 'A') => {
    gameState.current.ball = { x: PW / 2, y: PH / 2, vx: 0, vy: 0 };
    gameState.current.kickOffTeam = kickOffTeam;
    gameState.current.kickOffInvincibility = 3000;
    const swapped = (half === 2 || half === 4) && mode !== 'TRAINING';
    gameState.current.players.forEach(p => {
      if (p.isSentOff) return;
      p.x = p.homeX; p.y = p.homeY;
      p.vx = 0; p.vy = 0; p.targetX = null; p.targetY = null; p.hasBall = false;
    });
    mouseTarget.current = null;
  }, [half, mode]);

  // Main game loop init
  useEffect(() => {
    if (matchStateUI === 'setup') return;
    if (!aiTeamRef.current) {
      if (opponentSquad) {
        aiTeamRef.current = opponentSquad.lineup.filter(Boolean) as Player[];
      } else {
        let packType: 'BRONZE' | 'SILVER' | 'GOLD' | 'SUPER_LEGENDARY' = 'SILVER';
        if (difficulty === 'EASY') packType = 'BRONZE';
        if (difficulty === 'MEDIUM') packType = 'GOLD';
        if (difficulty === 'HARD') packType = 'SUPER_LEGENDARY';
        aiTeamRef.current = Array(11).fill(null).map(() => generateRandomPlayer(packType));
      }
    }

    if (squad.lineup.filter(Boolean).length < 11) { setTimeout(() => onFinish(0, {}), 100); return; }

    if (initializedHalfRef.current !== half) {
      const aiTeam = aiTeamRef.current!;
      const aiPos = FORMATION_POSITIONS['4-3-3'];
      aiTeam.forEach((p, i) => { p.position = aiPos[i]?.pos || 'MF'; });

      const formA = FORMATION_POSITIONS[squad.formation] || FORMATION_POSITIONS['4-3-3'];
      const swapped = (half === 2 || half === 4) && mode !== 'TRAINING';
      const userKitColor = '#1565c0';
      const aiKitColor = '#c62828';

      const initPlayers: Entity[] = [];
      squad.lineup.slice(0, 11).forEach((p, i) => {
        if (!p || !formA[i]) return;
        const bx = formA[i].matchX;
        const fx = swapped ? (1 - bx) : bx;
        initPlayers.push({
          id: `a_${i}`, x: fx * PW, y: formA[i].matchY * PH, vx: 0, vy: 0,
          targetX: null, targetY: null, color: userKitColor, kitColor: userKitColor,
          playerData: p, team: 'A', homeX: fx * PW, homeY: formA[i].matchY * PH,
          hasBall: false, health: 100, facingAngle: 0,
        });
      });
      aiTeam.forEach((p, i) => {
        const bx = 1 - aiPos[i].matchX;
        const fx = swapped ? (1 - bx) : bx;
        initPlayers.push({
          id: `b_${i}`, x: fx * PW, y: aiPos[i].matchY * PH, vx: 0, vy: 0,
          targetX: null, targetY: null, color: aiKitColor, kitColor: aiKitColor,
          playerData: p, team: 'B', homeX: fx * PW, homeY: aiPos[i].matchY * PH,
          hasBall: false, health: 100, facingAngle: Math.PI,
        });
      });

      gameState.current.players = initPlayers;
      initializedHalfRef.current = half;
      controlledId.current = initPlayers.find(p => p.team === 'A')?.id || null;
      if (half > 1) resetPositions(half % 2 === 0 ? 'B' : 'A');
    }

    let raf: number;
    let lastTime = performance.now();

    const update = (dt: number) => {
      const gs = gameState.current;
      if (gs.state === 'PAUSED' || isPaused) return;

      // Ball spin
      const ballSpeed = Math.hypot(gs.ball.vx, gs.ball.vy);
      ballSpinRef.current += ballSpeed * 0.04;

      if (gs.state === 'PENALTIES') {
        const ps = gs.penaltyState;
        if (ps.phase === 'shooting') {
          ps.timer += dt;
          const prog = Math.min(1, ps.timer / 450);
          const origX = ps.turn === 'A' ? PW - 140 : 140;
          if (!ps.shotTarget) ps.shotTarget = { x: ps.turn === 'A' ? PW : 0, y: (GOAL_Y1 + GOAL_Y2) / 2 + (Math.random() - 0.5) * 100 };
          gs.ball.x = origX + (ps.shotTarget.x - origX) * prog;
          gs.ball.y = PH / 2 + (ps.shotTarget.y - PH / 2) * prog;
          if (ps.timer > 600) {
            let goal = false;
            const shotY = ps.shotTarget.y;
            if (ps.turn === 'A') {
              if (!ps.keeperDive) ps.keeperDive = { x: PW - 20, y: (GOAL_Y1 + GOAL_Y2) / 2 + (Math.random() - 0.5) * 100 };
              if (Math.abs(shotY - ps.keeperDive.y) > 42 && shotY > GOAL_Y1 && shotY < GOAL_Y2) goal = true;
            } else {
              const diveY = ps.keeperDive?.y || PH / 2;
              if (Math.abs(shotY - diveY) > 42 && shotY > GOAL_Y1 && shotY < GOAL_Y2) goal = true;
            }
            const newHistory = [...ps.history, { team: ps.turn, result: goal ? 'goal' : 'miss' } as const];
            const newA = ps.scoreA + (ps.turn === 'A' && goal ? 1 : 0);
            const newB = ps.scoreB + (ps.turn === 'B' && goal ? 1 : 0);
            if (goal) playSound('goal'); else playSound('whistle');

            if (ps.isSingleKick) {
              if (goal) { if (ps.turn === 'A') setScore(s => ({ ...s, A: s.A + 1 })); else setScore(s => ({ ...s, B: s.B + 1 })); }
              setTimeout(() => { setMatchStateUI('playing'); gs.state = 'PLAYING'; resetPositions(ps.turn === 'A' ? 'B' : 'A'); }, 1500);
              ps.phase = 'result'; ps.timer = 0; setPenaltyState({ ...ps }); return;
            }
            let winner = null;
            if (ps.turn === 'B' && ps.round >= 5 && newA !== newB) winner = newA > newB ? 'A' : 'B';
            if (ps.round > 5 && ps.turn === 'B' && newA !== newB) winner = newA > newB ? 'A' : 'B';
            if (winner) { setScore({ A: gs.score.A + newA, B: gs.score.B + newB }); setMatchStateUI('finished'); setIsFinished(true); finalizeMatch(); return; }
            ps.phase = 'result'; ps.timer = 0; ps.scoreA = newA; ps.scoreB = newB; ps.history = newHistory; setPenaltyState({ ...ps });
          }
        } else if (ps.phase === 'result') {
          ps.timer += dt;
          if (ps.timer > 1500) {
            const nextTurn = ps.turn === 'A' ? 'B' : 'A';
            const nextRound = nextTurn === 'A' ? ps.round + 1 : ps.round;
            gs.ball.x = nextTurn === 'A' ? PW - 140 : 140; gs.ball.y = PH / 2;
            ps.turn = nextTurn; ps.round = nextRound;
            ps.phase = nextTurn === 'A' ? 'aiming' : 'saving';
            ps.timer = 0; ps.shotTarget = undefined; ps.keeperDive = undefined;
            setPenaltyState({ ...ps });
          }
        }
        return;
      }

      if (gs.state !== 'PLAYING') return;
      if (gs.kickOffInvincibility > 0) gs.kickOffInvincibility -= dt;

      const minPerMs = (half <= 2 ? 45 : 15) / ((half <= 2 ? 30 : 15) * 1000);
      gs.timer += dt * minPerMs;
      setTimeLeft(Math.floor(gs.timer));

      // Halftime/fulltime
      if (half === 1 && gs.timer >= 45) { gs.state = 'HALFTIME'; setMatchStateUI('halftime'); return; }
      if (half === 2 && gs.timer >= 90) {
        if (score.A === score.B && mustHaveWinner) { gs.state = 'EXTRATIME_BREAK'; setMatchStateUI('extratime_break'); }
        else { gs.state = 'FINISHED'; setMatchStateUI('finished'); setIsFinished(true); finalizeMatch(); }
        return;
      }
      if (half === 3 && gs.timer >= 105) { gs.state = 'EXTRATIME_BREAK'; setMatchStateUI('extratime_break'); return; }
      if (half === 4 && gs.timer >= 120) {
        if (score.A === score.B) { gs.state = 'PENALTIES'; setMatchStateUI('penalties'); }
        else { gs.state = 'FINISHED'; setMatchStateUI('finished'); setIsFinished(true); finalizeMatch(); }
        return;
      }

      const { ball, players } = gs;
      const swapped = (half === 2 || half === 4) && mode !== 'TRAINING';

      // Ball physics
      ball.x += ball.vx; ball.y += ball.vy;
      ball.vx *= BALL_DAMP; ball.vy *= BALL_DAMP;
      if (Math.abs(ball.vx) < 0.05) ball.vx = 0;
      if (Math.abs(ball.vy) < 0.05) ball.vy = 0;

      if (ball.y < 6) { ball.y = 6; ball.vy *= -0.7; }
      if (ball.y > PH - 6) { ball.y = PH - 6; ball.vy *= -0.7; }

      const checkGoal = (side: 'left' | 'right') => {
        const isGoal = ball.y > GOAL_Y1 && ball.y < GOAL_Y2;
        if (!isGoal) { if (side === 'left') { ball.x = 6; ball.vx *= -0.7; } else { ball.x = PW - 6; ball.vx *= -0.7; } return; }
        if (mode === 'TRAINING') { ball.x = PW / 2; ball.y = PH / 2; ball.vx = 0; ball.vy = 0; return; }
        const teamScored: 'A' | 'B' = (side === 'right' && !swapped) || (side === 'left' && swapped) ? 'A' : 'B';
        gs.score[teamScored]++;
        setScore({ ...gs.score });
        gs.state = 'GOAL';
        playSound('goal');
        const scorer = teamScored === 'A'
          ? players.find(p => p.id === controlledId.current && p.team === 'A') || players.find(p => p.team === 'A')
          : null;
        const scorerName = scorer?.playerData.name || (teamScored === 'A' ? (userTeamName || 'Home') : (opponentName || 'Away'));
        setGoalFlash({ team: teamScored, scorer: scorerName });
        setTimeout(() => setGoalFlash(null), 3000);
        setMatchStats(prev => ({
          ...prev,
          goals: [...prev.goals, { playerId: scorer?.playerData.id || 'ai', minute: Math.floor(gs.timer), team: teamScored }],
          ratings: scorer ? { ...prev.ratings, [scorer.playerData.id]: (prev.ratings[scorer.playerData.id] || 6.5) + 1.5 } : prev.ratings,
        }));
        addLog(`⚽ ${scorerName} ghi bàn!`);
        setTimeout(() => { gs.state = 'PLAYING'; resetPositions(teamScored === 'A' ? 'B' : 'A'); }, 3000);
      };

      if (ball.x < 6) checkGoal('left');
      else if (ball.x > PW - 6) checkGoal('right');

      // Player selection
      const teamA = players.filter(p => p.team === 'A' && !p.isSentOff);
      const ballOwner = players.find(p => !p.isSentOff && Math.hypot(ball.x - p.x, ball.y - p.y) < PLAYER_R + BALL_R + 6);
      if (ballOwner?.team === 'A') {
        controlledId.current = ballOwner.id;
      } else if (teamA.length > 0) {
        const closest = teamA.reduce((prev, curr) =>
          Math.hypot(ball.x - curr.x, ball.y - curr.y) < Math.hypot(ball.x - prev.x, ball.y - prev.y) ? curr : prev
        );
        const curr = teamA.find(p => p.id === controlledId.current);
        if (curr) {
          const dc = Math.hypot(ball.x - curr.x, ball.y - curr.y);
          const dn = Math.hypot(ball.x - closest.x, ball.y - closest.y);
          if (dn < dc * 0.75) controlledId.current = closest.id;
        } else controlledId.current = closest.id;
      }

      // Tab to switch player
      if (keys.current['Tab'] || keys.current['KeyQ']) {
        keys.current['Tab'] = false; keys.current['KeyQ'] = false;
        if (teamA.length > 1) {
          const idx = teamA.findIndex(p => p.id === controlledId.current);
          controlledId.current = teamA[(idx + 1) % teamA.length].id;
        }
      }

      // Collisions
      const activePlayers = players.filter(p => !p.isSentOff);
      for (let i = 0; i < activePlayers.length; i++) {
        for (let j = i + 1; j < activePlayers.length; j++) {
          const p1 = activePlayers[i]; const p2 = activePlayers[j];
          const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
          if (dist < PLAYER_R * 2 && dist > 0) {
            const ang = Math.atan2(p1.y - p2.y, p1.x - p2.x);
            const ov = PLAYER_R * 2 - dist;
            p1.x += Math.cos(ang) * ov * 0.5; p1.y += Math.sin(ang) * ov * 0.5;
            p2.x -= Math.cos(ang) * ov * 0.5; p2.y -= Math.sin(ang) * ov * 0.5;
            const impact = Math.hypot(p1.vx - p2.vx, p1.vy - p2.vy);
            if (impact > 2.5 && Math.random() < 0.001) {
              const victim = Math.random() > 0.5 ? p1 : p2;
              if (!victim.isInjured) { victim.isInjured = true; addLog(`${victim.playerData.name} bị chấn thương!`); }
            }
          }
        }
      }

      // Shot charging
      if (keys.current['Space'] || keys.current['KeyJ']) {
        if (!shotChargingRef.current) { shotChargingRef.current = true; shotChargeRef.current = 0; }
        shotChargeRef.current = Math.min(100, shotChargeRef.current + dt * 0.1);
        setShotPower(shotChargeRef.current);
        setShowShotPower(true);
      } else if (shotChargingRef.current) {
        shotChargingRef.current = false;
        setShowShotPower(false);
        // Trigger shot on release
        const p = players.find(pl => pl.id === controlledId.current && pl.team === 'A');
        if (p && p.hasBall) {
          const now = Date.now();
          if (!p.lastKickTime || now - p.lastKickTime > 250) {
            p.lastKickTime = now;
            const power = (shotChargeRef.current / 100) * p.playerData.stats.sho * 0.35 + 8;
            const goalX = swapped ? 0 : PW;
            const errFactor = (100 - p.playerData.stats.sho) * 0.004;
            const ang = Math.atan2(PH / 2 - p.y, goalX - p.x) + (Math.random() - 0.5) * errFactor;
            ball.vx = Math.cos(ang) * power; ball.vy = Math.sin(ang) * power;
            p.hasBall = false;
            addLog(`🎯 ${p.playerData.name} sút!`);
            playSound('kick');
          }
        }
        shotChargeRef.current = 0;
      }

      // Players update
      players.forEach(p => {
        if (p.isSentOff) return;
        const now = Date.now();
        const distToBall = Math.hypot(ball.x - p.x, ball.y - p.y);
        const recentKick = p.lastKickTime && (now - p.lastKickTime < 350);
        const isPassTarget = gs.passTargetId === p.id && (now - gs.passTime < 2000);
        let grace = p.id === controlledId.current ? 22 : 14;
        if (isPassTarget) grace = 45;
        p.hasBall = !recentKick && distToBall < PLAYER_R + BALL_R + grace;
        if (p.hasBall && isPassTarget) gs.passTargetId = null;

        if (p.id === controlledId.current) {
          // ── Manual player (Team A) ──
          const sprint = keys.current['ShiftLeft'] || keys.current['ShiftRight'] || keys.current['KeyL'];
          const sprintMult = sprint ? 1.55 : 1.0;
          const speed = p.playerData.stats.pac * SPEED_MULT * sprintMult;

          // WASD + Arrow keys movement
          let moveX = 0, moveY = 0;
          if (keys.current['ArrowUp'] || keys.current['KeyW']) moveY -= 1;
          if (keys.current['ArrowDown'] || keys.current['KeyS']) moveY += 1;
          if (keys.current['ArrowLeft'] || keys.current['KeyA']) moveX -= 1;
          if (keys.current['ArrowRight'] || keys.current['KeyD']) moveX += 1;

          // Joystick input for mobile
          if (joystick.active && joystick.x !== 0 || joystick.y !== 0) {
            const jMag = Math.hypot(joystick.x, joystick.y);
            if (jMag > 5) { moveX = joystick.x / 40; moveY = joystick.y / 40; }
          }

          // Mouse target (legacy click-to-move)
          if (mouseTarget.current && moveX === 0 && moveY === 0) {
            const dx = mouseTarget.current.x - p.x; const dy = mouseTarget.current.y - p.y;
            const dist = Math.hypot(dx, dy);
            if (dist > 5) {
              moveX = dx / dist; moveY = dy / dist;
            } else mouseTarget.current = null;
          }

          if (moveX !== 0 || moveY !== 0) {
            const mag = Math.hypot(moveX, moveY);
            p.vx += (moveX / mag) * speed * 0.22;
            p.vy += (moveY / mag) * speed * 0.22;
            p.facingAngle = Math.atan2(moveY, moveX);
          }

          // Pass: X or K
          const passKey = keys.current['KeyX'] || keys.current['KeyK'];
          const canKick = !p.lastKickTime || now - p.lastKickTime > 280;
          if (passKey && canKick) {
            keys.current['KeyX'] = false; keys.current['KeyK'] = false;
            p.lastKickTime = now;
            if (p.hasBall) {
              // Find best teammate
              const teammates = players.filter(t => t.team === 'A' && t.id !== p.id && !t.isSentOff);
              const goalX = swapped ? 0 : PW;
              let best: Entity | null = null, bestScore = -Infinity;
              teammates.forEach(t => {
                const distT = Math.hypot(t.x - p.x, t.y - p.y);
                const angToT = Math.atan2(t.y - p.y, t.x - p.x);
                const angToGoal = Math.atan2(PH / 2 - p.y, goalX - p.x);
                const alignment = Math.cos(angToT - angToGoal);
                const tDistGoal = Math.hypot(goalX - t.x, PH / 2 - t.y);
                const pDistGoal = Math.hypot(goalX - p.x, PH / 2 - p.y);
                const sc = alignment * 500 + (pDistGoal - tDistGoal) * 2 - distT * 0.3;
                if (sc > bestScore && distT < 400) { bestScore = sc; best = t; }
              });
              if (best) {
                const t = best as Entity;
                const ang = Math.atan2(t.y - p.y, t.x - p.x);
                const err = (100 - p.playerData.stats.pas) * 0.003 * (Math.random() - 0.5);
                const pwr = Math.min(16, Math.hypot(t.x - p.x, t.y - p.y) * 0.042 + 5);
                ball.vx = Math.cos(ang + err) * pwr; ball.vy = Math.sin(ang + err) * pwr;
                controlledId.current = t.id;
                gs.passTargetId = t.id; gs.passTime = now;
                mouseTarget.current = null;
                addLog(`🅿️ ${p.playerData.name} → ${t.playerData.name}`);
                playSound('kick');
              }
            } else {
              // Tackle
              const tackleR = p.playerData.stats.def * 0.4 + 18;
              if (distToBall < tackleR) {
                const clearDir = p.team === 'A' ? (swapped ? -1 : 1) : (swapped ? 1 : -1);
                ball.vx = (Math.random() * 6 + 7) * clearDir;
                ball.vy = (Math.random() - 0.5) * 12;
                playSound('kick');
                addLog(`${p.playerData.name} tắc bóng!`);
              }
            }
          }

          // Dribble: keep ball close
          if (p.hasBall && !recentKick) {
            const dribAng = Math.atan2(p.vy, p.vx) || p.facingAngle;
            const dribStat = p.playerData.stats.dri;
            const dribDist = PLAYER_R + BALL_R + (100 - dribStat) * 0.04;
            const noise = (100 - dribStat) * 0.04;
            ball.x += (p.x + Math.cos(dribAng) * dribDist - ball.x) * 0.9;
            ball.y += (p.y + Math.sin(dribAng) * dribDist - ball.y) * 0.9;
            ball.vx = p.vx + (Math.random() - 0.5) * noise;
            ball.vy = p.vy + (Math.random() - 0.5) * noise;
          }

        } else {
          // ── AI player ──
          const teammates = players.filter(t => t.team === p.team && !t.isSentOff);
          const closestTM = teammates.reduce((a, b) =>
            Math.hypot(ball.x - a.x, ball.y - a.y) < Math.hypot(ball.x - b.x, ball.y - b.y) ? a : b
          );

          if (p.hasBall) {
            const goalX = p.team === 'A' ? (swapped ? 0 : PW) : (swapped ? PW : 0);
            const goalY = PH / 2;
            const dGoal = Math.hypot(goalX - p.x, goalY - p.y);
            const tms = players.filter(t => t.team === p.team && t.id !== p.id && !t.isSentOff);
            let bestPass: Entity | null = null; let bestPS = -Infinity;
            tms.forEach(t => {
              const dt = Math.hypot(t.x - p.x, t.y - p.y);
              const tDG = Math.hypot(goalX - t.x, goalY - t.y);
              if (tDG < dGoal - 40 && dt < 320) {
                const sc = (dGoal - tDG) * 2 - dt * 0.08;
                if (sc > bestPS) { bestPS = sc; bestPass = t; }
              }
            });
            const isDanger = p.team === 'A' ? (swapped ? p.x > PW - 160 : p.x < 160) : (swapped ? p.x < 160 : p.x > PW - 160);
            const canKickAI = !p.lastKickTime || now - p.lastKickTime > 400;
            if (isDanger && canKickAI) {
              playSound('kick');
              const ang = p.team === 'A' ? (swapped ? Math.PI + (Math.random() - 0.5) * 0.5 : (Math.random() - 0.5) * 0.5) : (swapped ? (Math.random() - 0.5) * 0.5 : Math.PI + (Math.random() - 0.5) * 0.5);
              ball.vx = Math.cos(ang) * 14; ball.vy = Math.sin(ang) * 14;
              p.hasBall = false; p.lastKickTime = now;
            } else if (bestPass && Math.random() < 0.55 && canKickAI) {
              const t = bestPass as Entity;
              const ang = Math.atan2(t.y - p.y, t.x - p.x);
              const pwr = Math.min(14, Math.hypot(t.x - p.x, t.y - p.y) * 0.046 + 4);
              ball.vx = Math.cos(ang) * pwr; ball.vy = Math.sin(ang) * pwr;
              p.hasBall = false; p.lastKickTime = now;
            } else if (dGoal < 260 && canKickAI) {
              playSound('kick');
              let diffMult = 1; if (difficulty === 'EASY') diffMult = 0.7; if (difficulty === 'HARD') diffMult = 1.2;
              const pwr = p.playerData.stats.sho * 0.23 * diffMult;
              const inac = (100 - p.playerData.stats.sho) * 0.012;
              const ang = Math.atan2(goalY - p.y + (Math.random() - 0.5) * inac * 100, goalX - p.x);
              ball.vx = Math.cos(ang) * pwr; ball.vy = Math.sin(ang) * pwr;
              p.hasBall = false; p.lastKickTime = now;
              addLog(`${p.playerData.name} sút!`);
            } else {
              // Dribble
              const ang = Math.atan2(goalY - p.y, goalX - p.x);
              ball.x = p.x + Math.cos(ang) * (PLAYER_R + BALL_R);
              ball.y = p.y + Math.sin(ang) * (PLAYER_R + BALL_R);
              ball.vx = p.vx; ball.vy = p.vy;
            }
          } else if (p.playerData.position === 'GK') {
            const gkX = p.homeX;
            const targetY = Math.max(GOAL_Y1 + 20, Math.min(GOAL_Y2 - 20, ball.y));
            p.vx += (gkX - p.x) * 0.04; p.vy += (targetY - p.y) * 0.06;
            // AI GK tackle
            if (distToBall < 20 && gs.kickOffInvincibility <= 0) {
              const clearDir = p.team === 'A' ? (swapped ? -1 : 1) : (swapped ? 1 : -1);
              ball.vx += (Math.random() * 8 + 8) * clearDir; ball.vy += (Math.random() - 0.5) * 12;
              playSound('kick'); p.lastKickTime = now;
            }
          } else if (closestTM.id === p.id) {
            p.vx += (ball.x - p.x) * 0.016; p.vy += (ball.y - p.y) * 0.016;
            // AI tackle
            if (p.team === 'B' && distToBall < 18 && gs.kickOffInvincibility <= 0) {
              let diffMult = 1; if (difficulty === 'EASY') diffMult = 0.5; if (difficulty === 'HARD') diffMult = 1.3;
              if (Math.random() < 0.02 * diffMult) {
                const clearDir = swapped ? 1 : -1;
                ball.vx += (Math.random() * 6 + 6) * clearDir; ball.vy += (Math.random() - 0.5) * 10;
                playSound('kick'); p.lastKickTime = now;
              }
            }
          } else {
            const bfX = (ball.x - PW / 2) * 0.28;
            const bfY = (ball.y - PH / 2) * 0.28;
            const tgtX = p.homeX + (p.team === 'A' ? bfX : -bfX);
            const tgtY = p.homeY + bfY;
            p.vx += (tgtX - p.x) * 0.012; p.vy += (tgtY - p.y) * 0.012;
          }
          let diffMult = 1; if (difficulty === 'EASY') diffMult = 0.68; if (difficulty === 'HARD') diffMult = 1.28;
          const spd = p.playerData.stats.pac * SPEED_MULT * (p.team === 'B' ? 0.73 * diffMult : 1);
          const currSpd = Math.hypot(p.vx, p.vy);
          if (currSpd > spd) { p.vx = (p.vx / currSpd) * spd; p.vy = (p.vy / currSpd) * spd; }
        }

        // Physics
        p.vx *= PLAYER_DAMP; p.vy *= PLAYER_DAMP;
        p.x += p.vx; p.y += p.vy;
        p.x = Math.max(PLAYER_R, Math.min(PW - PLAYER_R, p.x));
        p.y = Math.max(PLAYER_R, Math.min(PH - PLAYER_R, p.y));

        if (Math.hypot(p.vx, p.vy) > 0.2) p.facingAngle = Math.atan2(p.vy, p.vx);
      });
    };

    const draw = (ctx: CanvasRenderingContext2D, time: number) => {
      const gs = gameState.current;
      // Stadium background gradient
      const bg = ctx.createLinearGradient(0, 0, 0, PH);
      bg.addColorStop(0, '#1a6b2a');
      bg.addColorStop(0.5, '#1e8030');
      bg.addColorStop(1, '#1a6b2a');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, PW, PH);

      drawPitch(ctx, time);
      drawGoalNet(ctx, 'left');
      drawGoalNet(ctx, 'right');

      // Draw players
      if (gs.state !== 'PENALTIES') {
        // Sort: render controlled player on top
        const sortedPlayers = [...gs.players.filter(p => !p.isSentOff)]
          .sort((a, _b) => a.id === controlledId.current ? 1 : -1);

        sortedPlayers.forEach(p => {
          const isControlled = p.id === controlledId.current && p.team === 'A';
          drawPlayer(ctx, p, isControlled, isControlled);
          // Pass target indicator
          if (gs.passTargetId === p.id) {
            ctx.strokeStyle = '#00c851';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 3]);
            ctx.beginPath();
            ctx.arc(p.x, p.y, PLAYER_R + 6, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
          }
        });

        // Movement target indicator
        const controlled = gs.players.find(p => p.id === controlledId.current);
        if (controlled && mouseTarget.current) {
          ctx.strokeStyle = 'rgba(0,200,81,0.5)';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([6, 4]);
          ctx.beginPath();
          ctx.moveTo(controlled.x, controlled.y);
          ctx.lineTo(mouseTarget.current.x, mouseTarget.current.y);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.fillStyle = 'rgba(0,200,81,0.4)';
          ctx.beginPath();
          ctx.arc(mouseTarget.current.x, mouseTarget.current.y, 5, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        // Penalty scene
        const ps = gs.penaltyState;
        const shooterX = ps.turn === 'A' ? PW - 150 : 150;
        const shooter = gs.players.find(p => p.team === ps.turn && p.playerData.position !== 'GK') || gs.players.find(p => p.team === ps.turn);
        const keeper = gs.players.find(p => p.team !== ps.turn && p.playerData.position === 'GK') || gs.players.find(p => p.team !== ps.turn);
        const keeperX = ps.turn === 'A' ? PW - 20 : 20;
        const keeperY = ps.keeperDive?.y || PH / 2;
        if (shooter) drawPlayer(ctx, { ...shooter, x: shooterX, y: PH / 2 }, false, false);
        if (keeper) drawPlayer(ctx, { ...keeper, x: keeperX, y: keeperY }, false, false);
        // Aim zones
        if (ps.turn === 'A' && ps.phase === 'aiming') {
          ctx.fillStyle = 'rgba(0,200,81,0.2)';
          ctx.fillRect(PW - 6 - GOAL_DEPTH - 4, GOAL_Y1, GOAL_DEPTH + 10, GOAL_Y2 - GOAL_Y1);
          ctx.strokeStyle = '#00c851'; ctx.lineWidth = 3;
          ctx.setLineDash([8, 4]);
          ctx.strokeRect(PW - 6 - GOAL_DEPTH - 4, GOAL_Y1, GOAL_DEPTH + 10, GOAL_Y2 - GOAL_Y1);
          ctx.setLineDash([]);
        }
        if (ps.turn === 'B' && ps.phase === 'saving') {
          ctx.fillStyle = 'rgba(11,95,206,0.2)';
          ctx.fillRect(6, GOAL_Y1, GOAL_DEPTH + 10, GOAL_Y2 - GOAL_Y1);
          ctx.strokeStyle = '#0b5fce'; ctx.lineWidth = 3;
          ctx.setLineDash([8, 4]); ctx.strokeRect(6, GOAL_Y1, GOAL_DEPTH + 10, GOAL_Y2 - GOAL_Y1); ctx.setLineDash([]);
        }
      }

      // Ball
      drawBall(ctx, gs.ball.x, gs.ball.y, ballSpinRef.current);

      // GOAL overlay on canvas
      if (gs.state === 'GOAL') {
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(0, 0, PW, PH);
        ctx.save();
        ctx.font = 'bold 88px "Bebas Neue", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const pulse = 0.95 + 0.05 * Math.sin(time * 0.01);
        ctx.scale(pulse, pulse);
        ctx.translate(PW / 2 / pulse, PH / 2 / pulse);
        // Glow
        ctx.shadowColor = '#00c851'; ctx.shadowBlur = 30;
        ctx.fillStyle = '#00e676';
        ctx.fillText('GOL!', 0, 0);
        ctx.shadowBlur = 0;
        ctx.restore();
      }
    };

    const loop = (time: number) => {
      if (!canvasRef.current) { raf = requestAnimationFrame(loop); return; }
      const dt = Math.min(50, time - lastTime);
      lastTime = time;
      update(dt);
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) draw(ctx, time);
      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [squad, half, matchStateUI, difficulty, isPaused, joystick]);

  const finalizeMatch = () => {
    playAudio('WHISTLE_END');
    setMatchStats(prev => {
      const r = { ...prev.ratings };
      if (score.A > score.B) Object.keys(r).forEach(id => { r[id] = (r[id] || 6.5) + 0.8; });
      return { ...prev, ratings: r };
    });
  };

  const handleFinish = () => {
    const xpGains: Record<string, number> = {};
    const mvpEntry = Object.entries(matchStats.ratings).sort(([, a], [, b]) => b - a)[0];
    squad.lineup.forEach(p => {
      if (p) {
        let gain = 60;
        if (matchStats.ratings[p.id]) gain += Math.floor(matchStats.ratings[p.id] * 8);
        if (mvpEntry && p.id === mvpEntry[0]) gain += 120;
        xpGains[p.id] = gain;
      }
    });
    const fA = mode === 'PENALTY_SHOOTOUT' ? penaltyState.scoreA : score.A;
    const fB = mode === 'PENALTY_SHOOTOUT' ? penaltyState.scoreB : score.B;
    onFinish(fA > fB ? 600 : fA === fB ? 250 : 120, xpGains, fA, fB, {
      score: `${fA}-${fB}`, opponent: opponentName || 'Đội AI', isWinner: fA > fB,
      competition: isWorldCup ? 'World Cup' : 'Trận đấu',
    });
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isMobile) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = (e.clientX - rect.left) * (PW / rect.width);
    const y = (e.clientY - rect.top) * (PH / rect.height);
    if (gameState.current.state === 'PENALTIES') {
      const ps = gameState.current.penaltyState;
      if (ps.turn === 'A' && ps.phase === 'aiming') {
        ps.shotTarget = { x: PW, y }; ps.phase = 'shooting'; ps.timer = 0; setPenaltyState({ ...ps });
      } else if (ps.turn === 'B' && ps.phase === 'saving') {
        ps.keeperDive = { x: 20, y }; ps.shotTarget = { x: 0, y: (GOAL_Y1 + GOAL_Y2) / 2 + (Math.random() - 0.5) * 100 };
        ps.phase = 'shooting'; ps.timer = 0; setPenaltyState({ ...ps });
      }
      return;
    }
    if (gameState.current.state !== 'PLAYING') return;
    mouseTarget.current = { x, y };
  };

  const handleJoyStart = (e: React.TouchEvent) => {
    e.preventDefault();
    const t = e.touches[0];
    joystickRef.current = { startX: t.clientX, startY: t.clientY };
    setJoystick({ x: 0, y: 0, active: true });
  };
  const handleJoyMove = (e: React.TouchEvent) => {
    e.preventDefault();
    if (!joystickRef.current) return;
    const t = e.touches[0];
    const dx = t.clientX - joystickRef.current.startX;
    const dy = t.clientY - joystickRef.current.startY;
    const maxD = 40;
    const jx = Math.max(-maxD, Math.min(maxD, dx));
    const jy = Math.max(-maxD, Math.min(maxD, dy));
    setJoystick({ x: jx, y: jy, active: true });
  };
  const handleJoyEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    joystickRef.current = null;
    setJoystick({ x: 0, y: 0, active: false });
    mouseTarget.current = null;
  };

  const handleTouchCanvas = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const t = e.changedTouches[0];
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = (t.clientX - rect.left) * (PW / rect.width);
    const y = (t.clientY - rect.top) * (PH / rect.height);
    if (gameState.current.state === 'PENALTIES') {
      const ps = gameState.current.penaltyState;
      if (ps.turn === 'A' && ps.phase === 'aiming') { ps.shotTarget = { x: PW, y }; ps.phase = 'shooting'; ps.timer = 0; setPenaltyState({ ...ps }); }
      else if (ps.turn === 'B' && ps.phase === 'saving') { ps.keeperDive = { x: 20, y }; ps.shotTarget = { x: 0, y: (GOAL_Y1 + GOAL_Y2) / 2 + (Math.random() - 0.5) * 100 }; ps.phase = 'shooting'; ps.timer = 0; setPenaltyState({ ...ps }); }
      return;
    }
    mouseTarget.current = { x, y };
  };

  const getMVP = () => {
    const mvpEntry = Object.entries(matchStats.ratings).sort(([, a], [, b]) => b - a)[0];
    return mvpEntry ? squad.lineup.find(p => p?.id === mvpEntry[0]) : null;
  };

  const teamAColor = '#1565c0';
  const teamBColor = '#c62828';

  return (
    <div className="w-full h-full flex flex-col bg-[#05080f] overflow-hidden select-none" id="match-root" style={{ touchAction: 'none' }}>
      {/* Portrait warning */}
      {isMobile && orientation === 'portrait' && (
        <div className="fixed inset-0 z-[500] bg-[#05080f] flex flex-col items-center justify-center text-center p-8">
          <div className="text-6xl mb-6 animate-bounce">↻</div>
          <h2 className="text-3xl font-black text-white mb-3" style={{ fontFamily: "'Bebas Neue'" }}>XoAY NGANG MÀN HÌNH</h2>
          <p className="text-[#a0aec0] font-bold text-sm">Để trải nghiệm trận đấu tốt nhất</p>
        </div>
      )}

      {/* ── Setup screen ── */}
      {matchStateUI === 'setup' && (
        <div className="absolute inset-0 z-50 fc-overlay flex flex-col items-center justify-center p-6">
          <div className="text-center mb-10">
            <h1 className="text-7xl text-white mb-2" style={{ fontFamily: "'Bebas Neue'", letterSpacing: 4 }}>CHỌN ĐỘ KHÓ</h1>
            <p className="text-[#a0aec0] font-semibold tracking-widest text-sm uppercase">SELECT DIFFICULTY</p>
          </div>
          <div className="grid grid-cols-3 gap-6 w-full max-w-3xl">
            {(['EASY', 'MEDIUM', 'HARD'] as Difficulty[]).map((d, idx) => {
              const colors = [['#00c851', '#00e676', 'bg-green-500/10 border-green-500'], ['#e8b84b', '#f5d57a', 'bg-yellow-500/10 border-yellow-500'], ['#ef4444', '#f87171', 'bg-red-500/10 border-red-500']];
              const [c1, c2, cls] = colors[idx];
              const labels = ['Dễ', 'Vừa', 'Khó'];
              const descs = ['AI thủ thận trọng. Phù hợp người mới.', 'Thử thách cân bằng. Phù hợp hầu hết.', 'AI như Pro. Phản xạ cực nhanh.'];
              return (
                <button key={d} onClick={() => { setDifficulty(d); setMatchStateUI('intro'); }}
                  className={`group relative rounded-2xl border-2 p-8 ${cls} transition-all hover:scale-105 hover:shadow-2xl text-center`}
                  style={{ borderColor: c1 }}>
                  <div className="text-5xl mb-4" style={{ fontFamily: "'Bebas Neue'", color: c1 }}>{labels[idx]}</div>
                  <div className="font-black text-lg text-white mb-2" style={{ fontFamily: "'Bebas Neue'", letterSpacing: 2 }}>{d}</div>
                  <div className="text-xs text-white/60 leading-relaxed font-medium">{descs[idx]}</div>
                </button>
              );
            })}
          </div>
          <div className="mt-8 text-[#a0aec0] text-sm font-medium">
            <span className="opacity-60">Điều khiển:</span> <kbd className="bg-white/10 px-2 py-0.5 rounded text-xs ml-1">WASD</kbd> di chuyển · <kbd className="bg-white/10 px-2 py-0.5 rounded text-xs ml-1">J/Space</kbd> sút · <kbd className="bg-white/10 px-2 py-0.5 rounded text-xs ml-1">K/X</kbd> chuyền · <kbd className="bg-white/10 px-2 py-0.5 rounded text-xs ml-1">Shift</kbd> sprint · <kbd className="bg-white/10 px-2 py-0.5 rounded text-xs ml-1">Q</kbd> đổi cầu thủ
          </div>
        </div>
      )}

      {/* ── Intro ── */}
      {matchStateUI === 'intro' && (
        <div className="absolute inset-0 z-50 bg-black flex flex-col items-center justify-center overflow-hidden">
          <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 40%, rgba(11,95,206,0.3), transparent)' }} />
          <div className="relative z-10 text-center">
            <div className="text-[10px] font-black tracking-[0.4em] text-[#0b8fff] uppercase mb-6">FC ONLINE PRESENTS</div>
            <h1 className="text-8xl text-white mb-8" style={{ fontFamily: "'Bebas Neue'", letterSpacing: 6 }}>TRẬN ĐẤU</h1>
            <div className="flex items-center gap-12 mb-12">
              <div className="flex flex-col items-center gap-3">
                <div className="w-24 h-24 rounded-2xl flex items-center justify-center text-3xl font-black text-white" style={{ background: teamAColor, fontFamily: "'Bebas Neue'", boxShadow: `0 0 30px ${teamAColor}80` }}>
                  {(userTeamName || 'YOU').substring(0, 3).toUpperCase()}
                </div>
                <span className="text-xl font-black text-white" style={{ fontFamily: "'Bebas Neue'" }}>{userTeamName || 'HOME'}</span>
              </div>
              <div className="text-5xl font-black text-white/30" style={{ fontFamily: "'Bebas Neue'" }}>VS</div>
              <div className="flex flex-col items-center gap-3">
                <div className="w-24 h-24 rounded-2xl flex items-center justify-center text-3xl font-black text-white" style={{ background: teamBColor, fontFamily: "'Bebas Neue'", boxShadow: `0 0 30px ${teamBColor}80` }}>
                  {(opponentName || 'AI').substring(0, 3).toUpperCase()}
                </div>
                <span className="text-xl font-black text-white" style={{ fontFamily: "'Bebas Neue'" }}>{opponentName || 'AWAY'}</span>
              </div>
            </div>
            <div className="text-[#a0aec0] font-semibold tracking-widest text-sm">
              Bắt đầu sau <span className="text-[#0b8fff] font-black text-lg">{introTimer}s</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Scoreboard ── */}
      {mode !== 'TRAINING' && matchStateUI === 'playing' && (
        <div className="fc-scoreboard flex items-center justify-between px-6 py-2 shrink-0 z-30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black text-white" style={{ background: teamAColor, fontFamily: "'Bebas Neue'" }}>
              {(userTeamName || 'YOU').substring(0, 3).toUpperCase()}
            </div>
            <span className="text-sm font-bold text-white/70 hidden sm:block">{userTeamName || 'Home'}</span>
            <span className="text-4xl font-black text-white" style={{ fontFamily: "'Bebas Neue'" }}>{score.A}</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="text-xs font-bold text-[#a0aec0] tracking-widest uppercase">{half <= 2 ? (half === 1 ? '1ST' : '2ND') : 'ET'}</div>
            <div className="text-3xl font-black tabular-nums" style={{ fontFamily: "'Bebas Neue'", color: '#0b8fff' }}>{timeLeft}'</div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-4xl font-black text-white" style={{ fontFamily: "'Bebas Neue'" }}>{score.B}</span>
            <span className="text-sm font-bold text-white/70 hidden sm:block">{opponentName || 'Away'}</span>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black text-white" style={{ background: teamBColor, fontFamily: "'Bebas Neue'" }}>
              {(opponentName || 'AI').substring(0, 3).toUpperCase()}
            </div>
          </div>
        </div>
      )}

      {/* ── Main canvas area ── */}
      <div className="flex-1 relative overflow-hidden">
        <canvas
          ref={canvasRef}
          width={PW} height={PH}
          onClick={handleCanvasClick}
          onTouchEnd={handleTouchCanvas}
          className="w-full h-full object-contain"
          style={{ touchAction: 'none', cursor: 'crosshair' }}
        />

        {/* Goal flash */}
        {goalFlash && (
          <div className="absolute inset-0 z-40 pointer-events-none flex flex-col items-center justify-center">
            <div className="absolute inset-0" style={{ background: goalFlash.team === 'A' ? 'rgba(0,200,81,0.1)' : 'rgba(239,68,68,0.1)', animation: 'pulse 0.5s ease 3' }} />
            <div className="text-center animate-bounce-in">
              <div className="text-9xl font-black mb-2" style={{ fontFamily: "'Bebas Neue'", color: '#00e676', textShadow: '0 0 40px #00c851, 0 0 80px #00c851' }}>GOL!</div>
              <div className="text-2xl font-black text-white" style={{ fontFamily: "'Bebas Neue'", letterSpacing: 3 }}>{goalFlash.scorer}</div>
            </div>
          </div>
        )}

        {/* Shot power bar */}
        {showShotPower && (
          <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-1">
            <div className="text-[10px] font-black text-white/70 tracking-widest uppercase">Sức Mạnh</div>
            <div className="w-32 h-3 bg-white/10 rounded-full overflow-hidden border border-white/20">
              <div className="h-full rounded-full transition-all" style={{ width: `${shotPower}%`, background: shotPower > 80 ? '#ef4444' : shotPower > 50 ? '#e8b84b' : '#00c851' }} />
            </div>
          </div>
        )}

        {/* Match log */}
        {matchStateUI === 'playing' && activeLog && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
            <div className="match-log">{activeLog}</div>
          </div>
        )}

        {/* Controls hint (desktop) */}
        {matchStateUI === 'playing' && !isMobile && (
          <div className="absolute bottom-4 left-4 z-30 bg-black/60 backdrop-blur-md p-4 rounded-xl border border-white/10 text-xs space-y-1.5 pointer-events-none">
            <div className="text-[10px] font-black text-[#0b8fff] uppercase tracking-widest mb-2">Điều Khiển</div>
            {[['WASD / ↑↓←→', 'Di chuyển'], ['J / Space', 'Sút (giữ = mạnh hơn)'], ['K / X', 'Chuyền / Tắc bóng'], ['Shift / L', 'Sprint'], ['Q / Tab', 'Đổi cầu thủ'], ['Click', 'Di chuyển đến']].map(([k, v]) => (
              <div key={k} className="flex gap-3 items-center">
                <span className="text-white/80 font-mono bg-white/10 px-1.5 py-0.5 rounded text-[9px]">{k}</span>
                <span className="text-white/50">{v}</span>
              </div>
            ))}
          </div>
        )}

        {/* Pause button */}
        {matchStateUI === 'playing' && (
          <button onClick={() => setIsPaused(p => !p)}
            className="absolute top-3 right-3 z-30 w-10 h-10 bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center text-white/70 hover:text-white border border-white/10 transition-all">
            {isPaused ? '▶' : '⏸'}
          </button>
        )}

        {/* Pause overlay */}
        {isPaused && (
          <div className="absolute inset-0 z-40 fc-overlay flex flex-col items-center justify-center gap-8">
            <h2 className="text-7xl font-black text-white" style={{ fontFamily: "'Bebas Neue'" }}>TẠM DỪNG</h2>
            <button onClick={() => setIsPaused(false)}
              className="btn-fc-primary px-12 py-4 rounded-xl text-xl font-black">TIẾP TỤC</button>
            <button onClick={handleFinish}
              className="text-white/40 hover:text-white/70 text-sm font-bold transition-colors">Kết thúc trận</button>
          </div>
        )}

        {/* Mobile controls */}
        {isMobile && matchStateUI === 'playing' && (
          <div className="absolute inset-0 pointer-events-none z-30">
            {/* Joystick */}
            <div className="absolute bottom-8 left-8 pointer-events-auto"
              onTouchStart={handleJoyStart} onTouchMove={handleJoyMove} onTouchEnd={handleJoyEnd}>
              <div className="joystick-base">
                <div className="joystick-knob" style={{ transform: `translate(${joystick.x}px, ${joystick.y}px)` }} />
              </div>
            </div>
            {/* Action buttons */}
            <div className="absolute bottom-8 right-8 flex flex-col gap-3 pointer-events-auto">
              <div className="flex gap-3 justify-end">
                <div className="mobile-btn mobile-btn-pass"
                  onTouchStart={() => { keys.current['KeyK'] = true; }} onTouchEnd={() => { keys.current['KeyK'] = false; }}>K</div>
                <div className="mobile-btn mobile-btn-shoot"
                  onTouchStart={() => { keys.current['Space'] = true; }} onTouchEnd={() => { keys.current['Space'] = false; }}>J</div>
              </div>
              <div className="flex gap-3 justify-end">
                <div className="mobile-btn mobile-btn-switch"
                  onTouchStart={() => { keys.current['KeyQ'] = true; setTimeout(() => { keys.current['KeyQ'] = false; }, 100); }}>Q</div>
                <div className="mobile-btn mobile-btn-sprint"
                  onTouchStart={() => { keys.current['ShiftLeft'] = true; }} onTouchEnd={() => { keys.current['ShiftLeft'] = false; }}>⚡</div>
              </div>
            </div>
            {/* Button labels */}
            <div className="absolute bottom-0 right-8 flex gap-3 text-[9px] text-white/30 font-black pb-2 pointer-events-none">
              <span style={{ marginRight: 42 }}>CHUYỀN</span>
              <span>SÚT</span>
            </div>
          </div>
        )}

        {/* ── Halftime ── */}
        {matchStateUI === 'halftime' && (
          <div className="absolute inset-0 z-40 fc-overlay flex flex-col items-center justify-center gap-6">
            <div className="text-[11px] font-black tracking-[0.4em] text-[#0b8fff] uppercase">Kết thúc hiệp 1</div>
            <h2 className="text-8xl font-black text-white" style={{ fontFamily: "'Bebas Neue'" }}>NGHỈ GIỮA HIỆP</h2>
            <div className="text-5xl font-black" style={{ fontFamily: "'Bebas Neue'", color: '#e8b84b' }}>{score.A} - {score.B}</div>
            <button onClick={() => { setHalf(2); setMatchStateUI('playing'); gameState.current.state = 'PLAYING'; gameState.current.timer = 45; resetPositions('B'); }}
              className="btn-fc-primary px-12 py-4 rounded-xl text-xl font-black mt-4">BẮT ĐẦU HIỆP 2</button>
          </div>
        )}

        {/* ── Extra time break ── */}
        {matchStateUI === 'extratime_break' && (
          <div className="absolute inset-0 z-40 fc-overlay flex flex-col items-center justify-center gap-6">
            <h2 className="text-7xl font-black text-white" style={{ fontFamily: "'Bebas Neue'" }}>HIỆP PHỤ</h2>
            <div className="text-4xl font-black text-[#e8b84b]" style={{ fontFamily: "'Bebas Neue'" }}>{score.A} - {score.B}</div>
            <button onClick={() => {
              const nh = half === 2 ? 3 : 4; setHalf(nh as any); setMatchStateUI('playing');
              gameState.current.state = 'PLAYING'; gameState.current.timer = nh === 3 ? 90 : 105; resetPositions('A');
            }} className="btn-fc-primary px-12 py-4 rounded-xl text-xl font-black">BẮT ĐẦU</button>
          </div>
        )}

        {/* ── Penalty shootout UI ── */}
        {matchStateUI === 'penalties' && (
          <div className="absolute inset-x-0 top-0 z-40 pointer-events-none flex flex-col items-center pt-6">
            <div className="bg-[#05080f]/90 backdrop-blur-xl border border-[#0b5fce]/30 rounded-2xl px-10 py-6 pointer-events-auto">
              <div className="text-center text-sm font-black tracking-[0.3em] text-[#0b8fff] uppercase mb-4">Đá Phạt Đền</div>
              <div className="flex items-center gap-10">
                <div className="text-center">
                  <div className="text-xs text-white/40 font-bold mb-1">BẠN</div>
                  <div className="text-5xl font-black text-[#00c851]" style={{ fontFamily: "'Bebas Neue'" }}>{penaltyState.scoreA}</div>
                </div>
                <div className="text-3xl font-black text-white/20">-</div>
                <div className="text-center">
                  <div className="text-xs text-white/40 font-bold mb-1">AI</div>
                  <div className="text-5xl font-black text-[#ef4444]" style={{ fontFamily: "'Bebas Neue'" }}>{penaltyState.scoreB}</div>
                </div>
              </div>
              <div className="mt-4 flex gap-2 justify-center">
                {penaltyState.history.map((h, i) => (
                  <div key={i} className={`w-5 h-5 rounded-full ${h.result === 'goal' ? 'bg-[#00c851]' : 'bg-[#ef4444]'}`} />
                ))}
                {Array.from({ length: Math.max(0, 5 - penaltyState.history.length) }).map((_, i) => (
                  <div key={i} className="w-5 h-5 rounded-full bg-white/10 border border-white/20" />
                ))}
              </div>
            </div>
            {/* Instructions */}
            <div className="mt-6 pointer-events-auto animate-bounce">
              {penaltyState.phase === 'aiming' && penaltyState.turn === 'A' && (
                <div className="bg-[#00c851] text-black font-black px-8 py-3 rounded-xl text-lg" style={{ fontFamily: "'Bebas Neue'" }}>CLICK VÀO KHUNG THÀNH ĐỂ SÚT!</div>
              )}
              {penaltyState.phase === 'saving' && penaltyState.turn === 'B' && (
                <div className="bg-[#0b5fce] text-white font-black px-8 py-3 rounded-xl text-lg" style={{ fontFamily: "'Bebas Neue'" }}>CLICK ĐỂ BẮT BÓNG!</div>
              )}
              {penaltyState.phase === 'result' && (
                <div className="text-6xl font-black" style={{ fontFamily: "'Bebas Neue'", color: penaltyState.history[penaltyState.history.length - 1]?.result === 'goal' ? '#00e676' : '#ef4444' }}>
                  {penaltyState.history[penaltyState.history.length - 1]?.result === 'goal' ? 'GOL! ⚽' : 'CỨU! 🧤'}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Full time ── */}
        {matchStateUI === 'finished' && (
          <div className="absolute inset-0 z-50 fc-overlay flex flex-col items-center justify-center p-8 overflow-y-auto">
            <div className="w-full max-w-2xl flex flex-col items-center py-8">
              <div className="text-sm font-black tracking-[0.4em] text-[#0b8fff] uppercase mb-2">HẾT GIỜ</div>
              <h2 className="text-8xl font-black text-white mb-2" style={{ fontFamily: "'Bebas Neue'" }}>
                {score.A > score.B ? 'CHIẾN THẮNG' : score.A < score.B ? 'THẤT BẠI' : 'HÒA'}
              </h2>
              <div className="text-2xl font-black mb-8" style={{ fontFamily: "'Bebas Neue'", color: score.A > score.B ? '#00e676' : score.A < score.B ? '#ef4444' : '#e8b84b' }}>
                {score.A} - {score.B}
              </div>
              {/* Stats */}
              <div className="w-full grid grid-cols-2 gap-4 mb-8">
                <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                  <div className="text-xs font-black text-[#a0aec0] uppercase tracking-widest mb-4">Người Ghi Bàn</div>
                  {matchStats.goals.filter(g => g.team === 'A').length > 0
                    ? matchStats.goals.filter(g => g.team === 'A').map((g, i) => (
                      <div key={i} className="flex justify-between items-center text-[#00c851] font-bold text-sm">
                        <span>⚽ {squad.lineup.find(p => p?.id === g.playerId)?.name || 'Cầu thủ'}</span>
                        <span className="text-white/40">{g.minute}'</span>
                      </div>
                    ))
                    : <div className="text-white/30 text-sm italic">Chưa có bàn</div>}
                </div>
                <div className="bg-white/5 rounded-xl p-6 border border-white/10 flex flex-col items-center justify-center">
                  <div className="text-xs font-black text-[#e8b84b] uppercase tracking-widest mb-3">MVP</div>
                  {getMVP() ? (
                    <>
                      <div className="text-3xl font-black text-white" style={{ fontFamily: "'Bebas Neue'" }}>{getMVP()?.name.split(' ').pop()?.toUpperCase()}</div>
                      <div className="text-sm text-[#e8b84b] font-bold mt-1">Rating: {matchStats.ratings[getMVP()?.id || '']?.toFixed(1)}</div>
                    </>
                  ) : <div className="text-white/30 text-sm italic">Không có</div>}
                </div>
              </div>
              {/* Reward */}
              <div className="w-full bg-[#e8b84b]/10 border border-[#e8b84b]/30 rounded-xl p-6 text-center mb-8">
                <div className="text-xs font-black text-[#e8b84b] uppercase tracking-widest mb-2">Phần Thưởng</div>
                <div className="text-5xl font-black text-white" style={{ fontFamily: "'Bebas Neue'", color: '#e8b84b' }}>
                  +{score.A > score.B ? 600 : score.A === score.B ? 250 : 120} <span className="text-2xl">FC Coins</span>
                </div>
              </div>
              <button onClick={handleFinish} className="btn-fc-primary px-16 py-5 rounded-xl text-2xl font-black" style={{ fontFamily: "'Bebas Neue'", letterSpacing: 3 }}>
                {isWorldCup ? 'TIẾP THEO' : 'TIẾP TỤC'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
