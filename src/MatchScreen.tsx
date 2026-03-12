import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Squad, Player, Difficulty } from '../types';
import { generateRandomPlayer } from '../data/players';
import { FORMATION_POSITIONS } from '../constants';
import { useAudio } from '../contexts/AudioContext';
import { Footprints, Target, Trophy, Timer, Play, Users } from 'lucide-react';

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
  opponentUsername?: string;
}

// Physics constants
const PITCH_W = 1000;
const PITCH_H = 600;
const GOAL_Y1 = 250;
const GOAL_Y2 = 350;
const BALL_RADIUS = 6;
const PLAYER_RADIUS = 12;
const FRICTION = 0.98;
const PLAYER_SPEED_MULT = 0.042;
const PLAYER_DAMPING = 0.86;
const BALL_DAMPING = 0.95;

type Entity = {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  targetX: number | null;
  targetY: number | null;
  color: string;
  playerData: Player;
  team: 'A' | 'B';
  homeX: number;
  homeY: number;
  hasBall: boolean;
  isSentOff?: boolean;
  lastKickTime?: number;
  health: number;
  isInjured?: boolean;
};

type PenaltyState = {
  turn: 'A' | 'B';
  round: number;
  phase: 'aiming' | 'running' | 'shooting' | 'saving' | 'result';
  timer: number;
  scoreA: number;
  scoreB: number;
  history: { team: 'A'|'B', result: 'goal'|'miss' }[];
  shooterId?: string;
  keeperId?: string;
  shotTarget?: { x: number, y: number };
  keeperDive?: { x: number, y: number };
  isSingleKick?: boolean;
};

// Audio URLs
const SOUNDS = {
  whistle: 'https://assets.mixkit.co/active_storage/sfx/1003/1003-preview.mp3',
  crowd: 'https://assets.mixkit.co/active_storage/sfx/2018/2018-preview.mp3',
  goal: 'https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3',
  kick: 'https://assets.mixkit.co/active_storage/sfx/2092/2092-preview.mp3',
};

export default function MatchScreen({ 
  squad, onFinish, opponentName, opponentColor, userTeamName, userTeamColor, 
  forcedDifficulty, isWorldCup, onWorldCupContinue, mustHaveWinner, 
  mode = 'FULL_MATCH', drillType,
  socket, matchId, isHost, opponentSquad
}: Props) {
  const { playAudio, stopAudio } = useAudio();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState({ A: 0, B: 0 });
  const [timeLeft, setTimeLeft] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [matchStateUI, setMatchStateUI] = useState<'setup' | 'intro' | 'playing' | 'halftime' | 'extratime_break' | 'penalties' | 'finished'>(
    mode === 'PENALTY_SHOOTOUT' ? 'penalties' : 
    mode === 'TRAINING' ? 'playing' :
    (forcedDifficulty ? 'intro' : 'setup')
  );
  const [difficulty, setDifficulty] = useState<Difficulty>(forcedDifficulty || 'MEDIUM');
  const [introStage, setIntroStage] = useState<'walking' | 'anthem' | 'warmup'>('walking');
  const [introTimer, setIntroTimer] = useState(10);
  const [half, setHalf] = useState<1 | 2 | 3 | 4>(1); // 3=ET1, 4=ET2
  const [isPaused, setIsPaused] = useState(false);
  const [showSubMenu, setShowSubMenu] = useState(false);
  const [selectedSubPlayer, setSelectedSubPlayer] = useState<Player | null>(null);
  const [logQueue, setLogQueue] = useState<string[]>([]);
  const [activeLog, setActiveLog] = useState<string | null>(null);
  const [penaltyState, setPenaltyState] = useState<PenaltyState>({
    turn: 'A', round: 1, phase: 'aiming', timer: 0, scoreA: 0, scoreB: 0, history: []
  });

  const [matchStats, setMatchStats] = useState<{
    goals: { playerId: string, minute: number, team: 'A'|'B' }[],
    ratings: Record<string, number>
  }>({ goals: [], ratings: {} });
  
  const [emotes, setEmotes] = useState<{ id: number, text: string, team: 'A' | 'B' }[]>([]);
  const lastSyncTime = useRef(0);
  const guestControlledPlayerId = useRef<string | null>(null);
  const keys = useRef<{ [key: string]: boolean }>({});
  const controlledPlayerId = useRef<string | null>(null);
  const mouseTarget = useRef<{x: number, y: number} | null>(null);
  const touchStart = useRef<{ x: number, y: number, time: number } | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('landscape');
  const [joystick, setJoystick] = useState<{ x: number, y: number, active: boolean }>({ x: 0, y: 0, active: false });
  const joystickRef = useRef<{ startX: number, startY: number } | null>(null);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
      setOrientation(window.innerHeight > window.innerWidth ? 'portrait' : 'landscape');
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const preventDefault = (e: TouchEvent) => {
      if (e.touches.length > 1) return; // Allow pinch zoom if needed, though touch-none usually blocks it
      e.preventDefault();
    };

    const root = document.getElementById('match-screen-root');
    if (root) {
      root.addEventListener('touchmove', preventDefault, { passive: false });
      root.addEventListener('touchstart', preventDefault, { passive: false });
    }

    return () => {
      if (root) {
        root.removeEventListener('touchmove', preventDefault);
        root.removeEventListener('touchstart', preventDefault);
      }
    };
  }, [matchStateUI]);

  const audioRefs = useRef<{ [key: string]: HTMLAudioElement }>({});

  const gameState = useRef({
    ball: { x: PITCH_W/2, y: PITCH_H/2, vx: 0, vy: 0 },
    players: [] as Entity[],
    score: { A: 0, B: 0 },
    state: (mode === 'PENALTY_SHOOTOUT' ? 'PENALTIES' : 'INTRO') as 'INTRO' | 'PLAYING' | 'GOAL' | 'HALFTIME' | 'EXTRATIME_BREAK' | 'PENALTIES' | 'FINISHED' | 'PAUSED',
    timer: 0,
    kickOffTeam: 'A' as 'A' | 'B',
    kickOffInvincibility: 0,
    shootingTargets: [] as any[],
    drillStats: { hits: 0, total: 0 },
    penaltyState: {
      turn: 'A', round: 1, phase: 'aiming', timer: 0, scoreA: 0, scoreB: 0, history: []
    } as PenaltyState,
    passTargetId: null as string | null,
    passTime: 0
  });
  const aiTeamRef = useRef<Player[] | null>(null);
  const initializedRef = useRef(false);

  const addLogEvent = (msg: string) => {
    setLogQueue(prev => [...prev, `[${Math.floor(gameState.current.timer)}'] ${msg}`]);
  };

  // Process Log Queue
  useEffect(() => {
    if (activeLog) {
      const timer = setTimeout(() => {
        setActiveLog(null);
      }, 1200); // Faster logs (1.2s)
      return () => clearTimeout(timer);
    }
  }, [activeLog]);

  useEffect(() => {
    if (!activeLog && logQueue.length > 0) {
      const nextLog = logQueue[0];
      setActiveLog(nextLog);
      setLogQueue(prev => prev.slice(1));
    }
  }, [activeLog, logQueue]);

  useEffect(() => {
    // Init audio (SFX only)
    Object.entries(SOUNDS).forEach(([key, url]) => {
      if (key === 'crowd' || key === 'whistle') return; // Managed by AudioContext
      const audio = new Audio(url);
      audioRefs.current[key] = audio;
    });

    // Play Match Ambient
    playAudio('MATCH_AMBIENT', true);

    const handleKeyDown = (e: KeyboardEvent) => { keys.current[e.code] = true; };
    const handleKeyUp = (e: KeyboardEvent) => { keys.current[e.code] = false; };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      Object.values(audioRefs.current).forEach((a: any) => { a.pause(); a.src = ''; });
      stopAudio('MATCH_AMBIENT');
    };
  }, []);

  const playSound = (name: keyof typeof SOUNDS) => {
    const audio = audioRefs.current[name];
    if (audio) {
      audio.currentTime = 0;
      audio.play().catch(() => {});
    }
  };

  // Intro Sequence
  useEffect(() => {
    if (matchStateUI !== 'intro') return;
    
    // Initialize stats
    const initRatings: Record<string, number> = {};
    squad.lineup.forEach(p => { if(p) initRatings[p.id] = 6.0; });
    setMatchStats(prev => ({ ...prev, ratings: initRatings }));

    // Removed old crowd play here, handled by MATCH_AMBIENT on mount

    const interval = setInterval(() => {
      setIntroTimer(prev => {
        if (prev <= 1) {
          setMatchStateUI('playing');
          gameState.current.state = 'PLAYING';
          playAudio('WHISTLE_START');
          return 0;
        }
        if (prev === 7) setIntroStage('anthem');
        if (prev === 4) setIntroStage('warmup');
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [matchStateUI]);

  const initializedHalfRef = useRef<number>(0);

  const resetPositions = useCallback((kickOffTeam: 'A' | 'B' = 'A') => {
      gameState.current.ball = { x: PITCH_W/2, y: PITCH_H/2, vx: 0, vy: 0 };
      gameState.current.kickOffTeam = kickOffTeam;
      gameState.current.kickOffInvincibility = 3000; // 3 seconds invincibility

      const isSwapped = (half === 2 || half === 4) && mode !== 'TRAINING';

      gameState.current.players.forEach(p => {
        if (p.isSentOff) return;
        p.x = p.homeX;
        p.y = p.homeY;
        
        // Adjust for kick-off
        if (p.team === kickOffTeam) {
            // One player near ball
            if (p.playerData.position === 'FW' || p.playerData.position === 'MF') {
               const dist = Math.hypot(p.homeX - PITCH_W/2, p.homeY - PITCH_H/2);
               if (dist < 100) {
                  const offset = isSwapped ? (p.team === 'A' ? 20 : -20) : (p.team === 'A' ? -20 : 20);
                  p.x = PITCH_W/2 + offset;
                  p.y = PITCH_H/2;
               }
            }
        }

        p.vx = 0;
        p.vy = 0;
        p.targetX = null;
        p.targetY = null;
        p.hasBall = false;
      });
      mouseTarget.current = null;
  }, [half, mode]);

  useEffect(() => {
    if (matchStateUI === 'setup') return; 

    // Initialize AI team once
    if (!aiTeamRef.current) {
      if (opponentSquad) {
        aiTeamRef.current = opponentSquad.lineup.filter(Boolean) as Player[];
      } else {
        aiTeamRef.current = Array(11).fill(null).map((_, i) => {
          let packType: 'BRONZE' | 'SILVER' | 'GOLD' | 'SUPER_LEGENDARY' = 'SILVER';
          if (difficulty === 'EASY') packType = 'BRONZE';
          if (difficulty === 'MEDIUM') packType = 'GOLD';
          if (difficulty === 'HARD') packType = 'SUPER_LEGENDARY';
          
          const p = generateRandomPlayer(packType);
          if (opponentName) {
             // Customize for World Cup
             p.name = `${opponentName} Player ${i+1}`;
             // Could adjust stats based on difficulty more precisely here if needed
          }
          return p;
        });
      }
    }

    if (squad.lineup.filter(Boolean).length < 11) {
      setTimeout(() => onFinish(0, {}), 100);
      return;
    }

    // Initialize players once or on half change
    if (initializedHalfRef.current !== half) {
      const aiTeam = aiTeamRef.current;
      const aiFormation = '4-3-3';
      const aiPositions = FORMATION_POSITIONS[aiFormation];
      aiTeam.forEach((p, i) => {
        p.position = aiPositions[i].pos;
      });

      const formA = FORMATION_POSITIONS[squad.formation] || FORMATION_POSITIONS['4-3-3'];
      const formB = aiPositions;
      const isSwapped = (half === 2 || half === 4) && mode !== 'TRAINING';

      const initPlayers: Entity[] = [];
      
      // Team A
      if (drillType === 'DRIBBLING' || drillType === 'SHOOTING') {
        const p = squad.lineup.find(p => p !== null);
        if (p) {
          initPlayers.push({
            id: `a_0`, x: 200, y: PITCH_H / 2, vx: 0, vy: 0, targetX: null, targetY: null,
            color: userTeamColor || '#2563eb', playerData: p, team: 'A', homeX: 200, homeY: PITCH_H / 2, hasBall: true,
            health: 100
          });
          gameState.current.ball.x = 200 + PLAYER_RADIUS + BALL_RADIUS;
          gameState.current.ball.y = PITCH_H / 2;
        }
      } else if (drillType === 'PASSING') {
        // User + 2 teammates
        const teammates = squad.lineup.filter(p => p !== null).slice(0, 3);
        teammates.forEach((p, i) => {
          const x = 200 + i * 100;
          const y = PITCH_H / 2 + (i - 1) * 100;
          initPlayers.push({
            id: `a_${i}`, x, y, vx: 0, vy: 0, targetX: null, targetY: null,
            color: userTeamColor || '#2563eb', playerData: p!, team: 'A', homeX: x, homeY: y, hasBall: i === 0,
            health: 100
          });
          if (i === 0) {
            gameState.current.ball.x = x + PLAYER_RADIUS + BALL_RADIUS;
            gameState.current.ball.y = y;
          }
        });
      } else {
        squad.lineup.slice(0, 11).forEach((p, i) => {
          if (!p || !formA[i]) return;
          const baseX = formA[i].matchX;
          const finalX = isSwapped ? (1 - baseX) : baseX;
          initPlayers.push({
            id: `a_${i}`, x: finalX * PITCH_W, y: formA[i].matchY * PITCH_H, vx: 0, vy: 0, targetX: null, targetY: null,
            color: userTeamColor || '#2563eb', playerData: p, team: 'A', homeX: finalX * PITCH_W, homeY: formA[i].matchY * PITCH_H, hasBall: false,
            health: 100
          });
        });
      }

      // Team B (mirrored)
      if (drillType === 'SHOOTING') {
        const gk = aiTeam.find(p => p.position === 'GK') || aiTeam[0];
        initPlayers.push({
          id: `b_gk`, x: PITCH_W - 20, y: PITCH_H / 2, vx: 0, vy: 0, targetX: null, targetY: null,
          color: opponentColor || '#dc2626', playerData: gk, team: 'B', homeX: PITCH_W - 20, homeY: PITCH_H / 2, hasBall: false,
          health: 100
        });
      } else if (drillType === 'DRIBBLING') {
        aiTeam.slice(0, 6).forEach((p, i) => {
          const x = PITCH_W * (0.4 + i * 0.1);
          const y = PITCH_H * (0.2 + Math.random() * 0.6);
          initPlayers.push({
            id: `b_${i}`, x, y, vx: 0, vy: 0, targetX: null, targetY: null,
            color: opponentColor || '#dc2626', playerData: p, team: 'B', homeX: x, homeY: y, hasBall: false,
            health: 100
          });
        });
      } else if (drillType === 'PASSING') {
        aiTeam.slice(0, 3).forEach((p, i) => {
          const x = PITCH_W * 0.7;
          const y = PITCH_H * (0.3 + i * 0.2);
          initPlayers.push({
            id: `b_${i}`, x, y, vx: 0, vy: 0, targetX: null, targetY: null,
            color: opponentColor || '#dc2626', playerData: p, team: 'B', homeX: x, homeY: y, hasBall: false,
            health: 100
          });
        });
      } else {
        aiTeam.forEach((p, i) => {
          const baseX = 1 - formB[i].matchX;
          const finalX = isSwapped ? (1 - baseX) : baseX;
          initPlayers.push({
            id: `b_${i}`, x: finalX * PITCH_W, y: formB[i].matchY * PITCH_H, vx: 0, vy: 0, targetX: null, targetY: null,
            color: opponentColor || '#dc2626', playerData: p, team: 'B', homeX: finalX * PITCH_W, homeY: formB[i].matchY * PITCH_H, hasBall: false,
            health: 100
          });
        });
      }

      gameState.current.players = initPlayers;
      initializedHalfRef.current = half;
      initializedRef.current = true;
      
      // Set initial controlled player
      if (initPlayers.length > 0) {
        if (socket && !isHost) {
          controlledPlayerId.current = initPlayers.find(p => p.team === 'B')?.id || initPlayers[0].id;
        } else {
          controlledPlayerId.current = initPlayers.find(p => p.team === 'A')?.id || initPlayers[0].id;
        }
      }

      if (mode === 'PENALTY_SHOOTOUT') {
        gameState.current.state = 'PENALTIES';
        gameState.current.ball.x = PITCH_W - 140;
        gameState.current.ball.y = PITCH_H / 2;
        setMatchStateUI('penalties');
      } else if (mode === 'TRAINING') {
        gameState.current.state = 'PLAYING';
        setMatchStateUI('playing');
      }

      if (half > 1) {
        resetPositions(half % 2 === 0 ? 'B' : 'A');
      }
    }

    let animationFrameId: number;
    let lastTime = performance.now();

    // Initial random kick-off
    if (!initializedRef.current) {
       gameState.current.kickOffTeam = Math.random() < 0.5 ? 'A' : 'B';
    }

    const update = (dt: number) => {
      const state = gameState.current;
      const isSwapped = (half === 2 || half === 4) && mode !== 'TRAINING';

      // Multiplayer Sync
      if (socket && matchId) {
        const now = Date.now();
        if (now - lastSyncTime.current > 40) { // ~25 FPS sync
          lastSyncTime.current = now;
          if (isHost) {
            socket.emit('game_state_update', {
              matchId,
              state: {
                ball: state.ball,
                players: state.players.map(p => ({
                  id: p.id, x: p.x, y: p.y, vx: p.vx, vy: p.vy, hasBall: p.hasBall
                })),
                timer: state.timer,
                score: state.score,
                state: state.state
              }
            });
          } else {
            const cp = state.players.find(p => p.id === controlledPlayerId.current);
            if (cp) {
              socket.emit('game_state_update', {
                matchId,
                state: {
                  controlledPlayerId: cp.id,
                  controlledPlayerX: cp.x,
                  controlledPlayerY: cp.y,
                  controlledPlayerVx: cp.vx,
                  controlledPlayerVy: cp.vy
                }
              });
            }
          }
        }
      }

      if (socket && !isHost) {
        // Guest: Only handle local player movement, wait for Host state for everything else
        const p = state.players.find(p => p.id === controlledPlayerId.current);
        if (p) {
          // Movement logic for Guest's controlled player
          let targetX = p.homeX;
          let targetY = p.homeY;
          if (mouseTarget.current) {
            targetX = mouseTarget.current.x;
            targetY = mouseTarget.current.y;
            const dist = Math.hypot(targetX - p.x, targetY - p.y);
            if (dist > 2) {
              const angle = Math.atan2(targetY - p.y, targetX - p.x);
              const speed = p.playerData.stats.pac * PLAYER_SPEED_MULT;
              p.vx += Math.cos(angle) * speed * 0.2;
              p.vy += Math.sin(angle) * speed * 0.2;
            } else {
              mouseTarget.current = null;
            }
          }
          p.vx *= PLAYER_DAMPING;
          p.vy *= PLAYER_DAMPING;
          p.x += p.vx;
          p.y += p.vy;
          p.x = Math.max(PLAYER_RADIUS, Math.min(PITCH_W - PLAYER_RADIUS, p.x));
          p.y = Math.max(PLAYER_RADIUS, Math.min(PITCH_H - PLAYER_RADIUS, p.y));

          // Handle Kick Action for Guest
          const isShootPressed = keys.current['KeyS'];
          const isPassPressed = keys.current['KeyC'];
          const now = Date.now();
          const canKick = !p.lastKickTime || now - p.lastKickTime > 200;

          if (isShootPressed && p.hasBall && canKick) {
             p.lastKickTime = now;
             socket.emit('game_action', { matchId, action: { type: 'SHOOT', playerId: p.id } });
          }
          if (isPassPressed && canKick) {
             p.lastKickTime = now;
             socket.emit('game_action', { matchId, action: { type: p.hasBall ? 'PASS' : 'TACKLE', playerId: p.id } });
          }
        }
        return;
      }
      
      if (drillType === 'SHOOTING' && state.shootingTargets.length < 3 && Math.random() < 0.01) {
        state.shootingTargets.push({
          id: Date.now(),
          x: PITCH_W - 15,
          y: GOAL_Y1 + 5 + Math.random() * (GOAL_Y2 - GOAL_Y1 - 45),
          radius: 20, // Using radius for hit detection but drawing as box
          color: ['#ef4444', '#3b82f6', '#eab308', '#a855f7'][Math.floor(Math.random() * 4)]
        });
      }

      if (state.state === 'PENALTIES') {
         // Penalty Logic Loop
         if (state.penaltyState.phase === 'shooting') {
            const ps = state.penaltyState;
            ps.timer += dt;
            
            // Animation Logic
            // Move Ball
            const progress = Math.min(1, ps.timer / 500);
            const shotOriginX = ps.turn === 'A' ? PITCH_W - 140 : 140;
            const shotOriginY = PITCH_H/2;
            
            // Determine target if not set (AI) - ensure it's set once to avoid jitter
            if (!ps.shotTarget) {
               ps.shotTarget = { 
                  x: ps.turn === 'A' ? PITCH_W : 0, 
                  y: (GOAL_Y1 + GOAL_Y2)/2 + (Math.random() - 0.5) * 100 
               };
            }
            const target = ps.shotTarget;

            // Update ball position for rendering
            state.ball.x = shotOriginX + (target.x - shotOriginX) * progress;
            state.ball.y = shotOriginY + (target.y - shotOriginY) * progress;

            if (ps.timer > 700) { // 0.7 second animation (faster)
               // Resolve Shot
               let goal = false;
               const shotY = target.y;
               
               if (ps.turn === 'A') {
                  // User Shot vs AI Keeper
                  // Set AI keeper dive if not set
                  if (!ps.keeperDive) {
                     ps.keeperDive = { x: 20, y: (GOAL_Y1 + GOAL_Y2)/2 + (Math.random() - 0.5) * 100 };
                  }
                  const aiDiveY = ps.keeperDive.y;
                  // Keeper is "better" (save radius increased from 30 to 45)
                  if (Math.abs(shotY - aiDiveY) > 45 && shotY > GOAL_Y1 && shotY < GOAL_Y2) {
                     goal = true;
                  }
               } else {
                  // AI Shot vs User Keeper
                  const diveY = ps.keeperDive?.y || PITCH_H/2;
                  // Keeper is "better" (save radius increased from 30 to 45)
                  if (Math.abs(shotY - diveY) > 45 && shotY > GOAL_Y1 && shotY < GOAL_Y2) {
                     goal = true;
                  }
               }

               const newHistory = [...ps.history, { team: ps.turn, result: goal ? 'goal' : 'miss' } as const];
               const newScoreA = ps.scoreA + (ps.turn === 'A' && goal ? 1 : 0);
               const newScoreB = ps.scoreB + (ps.turn === 'B' && goal ? 1 : 0);
               
               if (goal) playSound('goal');
               else playSound('whistle'); // Miss/Save sound

               if (ps.isSingleKick) {
                 if (goal) {
                   if (ps.turn === 'A') setScore(s => ({ ...s, A: s.A + 1 }));
                   else setScore(s => ({ ...s, B: s.B + 1 }));
                 }
                 setTimeout(() => {
                   setMatchStateUI('playing');
                   gameState.current.state = 'PLAYING';
                   resetPositions(ps.turn === 'A' ? 'B' : 'A');
                 }, 1500);
                 
                 ps.phase = 'result';
                 ps.timer = 0;
                 setPenaltyState({ ...ps });
                 return;
               }

               // Check for winner
               let winner = null;
               if (ps.turn === 'B') {
                  if (ps.round >= 5 && newScoreA !== newScoreB) {
                     winner = newScoreA > newScoreB ? 'A' : 'B';
                  }
               }
               if (ps.round > 5 && ps.turn === 'B' && newScoreA !== newScoreB) {
                  winner = newScoreA > newScoreB ? 'A' : 'B';
               }

               if (winner) {
                  setScore({ A: score.A + newScoreA, B: score.B + newScoreB });
                  setMatchStateUI('finished');
                  setIsFinished(true);
                  finalizeMatch();
                  return; 
               }

               ps.phase = 'result';
               ps.timer = 0;
               ps.scoreA = newScoreA;
               ps.scoreB = newScoreB;
               ps.history = newHistory;
               setPenaltyState({ ...ps });
            }
         } else if (state.penaltyState.phase === 'result') {
            const ps = state.penaltyState;
            ps.timer += dt;
            if (ps.timer > 1500) {
               // Next Turn
               const nextTurn = ps.turn === 'A' ? 'B' : 'A';
               const nextRound = nextTurn === 'A' ? ps.round + 1 : ps.round;
               
               // Reset Ball
               state.ball.x = nextTurn === 'A' ? PITCH_W - 140 : 140;
               state.ball.y = PITCH_H/2;

               ps.turn = nextTurn;
               ps.round = nextRound;
               ps.phase = nextTurn === 'A' ? 'aiming' : 'saving';
               ps.timer = 0;
               ps.shotTarget = undefined;
               ps.keeperDive = undefined;
               setPenaltyState({ ...ps });
            }
         }
         return;
      }

      if (state.state !== 'PLAYING') return;

      if (state.kickOffInvincibility > 0) {
         state.kickOffInvincibility -= dt;
      }

      const gameMinutesPerMs = (half <= 2 ? 45 : 15) / ((half <= 2 ? 30 : 15) * 1000); 
      state.timer += dt * gameMinutesPerMs;
      
      setTimeLeft(prev => {
        const newTime = Math.floor(state.timer);
        return prev !== newTime ? newTime : prev;
      });

      // Halftime / Fulltime Logic
      if (half === 1 && state.timer >= 45) {
        state.state = 'HALFTIME';
        setMatchStateUI('halftime');
        return;
      }
      if (half === 2 && state.timer >= 90) {
        if (score.A === score.B && mustHaveWinner) {
           state.state = 'EXTRATIME_BREAK';
           setMatchStateUI('extratime_break');
        } else {
           state.state = 'FINISHED';
           setMatchStateUI('finished');
           setIsFinished(true);
           finalizeMatch();
        }
        return;
      }
      if (half === 3 && state.timer >= 105) {
         state.state = 'EXTRATIME_BREAK';
         setMatchStateUI('extratime_break');
         return;
      }
      if (half === 4 && state.timer >= 120) {
         if (score.A === score.B) {
            state.state = 'PENALTIES';
            setMatchStateUI('penalties');
         } else {
            state.state = 'FINISHED';
            setMatchStateUI('finished');
            setIsFinished(true);
            finalizeMatch();
         }
         return;
      }

      const { ball, players } = state;

      // Ball physics
      ball.x += ball.vx;
      ball.y += ball.vy;
      ball.vx *= BALL_DAMPING;
      ball.vy *= BALL_DAMPING;

      if (ball.y < 0) { ball.y = 0; ball.vy *= -1; }
      if (ball.y > PITCH_H) { ball.y = PITCH_H; ball.vy *= -1; }
      
      if (ball.x < 0) {
        if (ball.y > GOAL_Y1 && ball.y < GOAL_Y2) {
          if (mode !== 'TRAINING') {
            if (isSwapped) {
              state.score.A++;
              setScore({ ...state.score });
              state.state = 'GOAL';
              playSound('goal');
              
              const scorer = players.find(p => p.id === controlledPlayerId.current) || players.find(p => p.team === 'A');
              if (scorer) {
                 setMatchStats(prev => ({
                    ...prev,
                    goals: [...prev.goals, { playerId: scorer.playerData.id, minute: Math.floor(state.timer), team: 'A' }],
                    ratings: { ...prev.ratings, [scorer.playerData.id]: (prev.ratings[scorer.playerData.id] || 6) + 1.5 }
                 }));
                 addLogEvent(`GOAL! ${scorer.playerData.name} scores!`);
              }

              setTimeout(() => { 
                 state.state = 'PLAYING'; 
                 resetPositions('B'); // AI kicks off
              }, 3000);
            } else {
              state.score.B++;
              setScore({ ...state.score });
              state.state = 'GOAL';
              playSound('goal');
              
              // AI Scored
              setMatchStats(prev => ({
                ...prev,
                goals: [...prev.goals, { playerId: 'ai', minute: Math.floor(state.timer), team: 'B' }]
              }));

              setTimeout(() => { 
                 state.state = 'PLAYING'; 
                 resetPositions('A'); // User kicks off
              }, 3000);
            }
          } else {
            ball.x = PITCH_W/2;
            ball.y = PITCH_H/2;
            ball.vx = 0;
            ball.vy = 0;
          }
        } else {
          ball.x = 0; ball.vx *= -1;
        }
      }
      if (ball.x > PITCH_W) {
        if (ball.y > GOAL_Y1 && ball.y < GOAL_Y2) {
          if (drillType === 'SHOOTING') {
            const hitIndex = state.shootingTargets.findIndex(t => Math.hypot(ball.x - t.x, ball.y - t.y) < t.radius + BALL_RADIUS + 30);
            if (hitIndex !== -1) {
              state.shootingTargets.splice(hitIndex, 1);
              state.drillStats.hits++;
              addLogEvent("DIRECT HIT! +1 Accuracy");
              playSound('goal');
            }
          }

          if (mode !== 'TRAINING' || drillType === 'PASSING' || drillType === 'SHOOTING') {
            if (isSwapped) {
              state.score.B++;
              setScore({ ...state.score });
              state.state = 'GOAL';
              playSound('goal');
              
              // AI Scored
              setMatchStats(prev => ({
                ...prev,
                goals: [...prev.goals, { playerId: 'ai', minute: Math.floor(state.timer), team: 'B' }]
              }));

              setTimeout(() => { 
                 state.state = 'PLAYING'; 
                 resetPositions('A'); // User kicks off
              }, 3000);
            } else {
              state.score.A++;
              setScore({ ...state.score });
              state.state = 'GOAL';
              playSound('goal');
              
              // Player Scored (Last touch)
              const scorer = players.find(p => p.id === controlledPlayerId.current) || players.find(p => p.team === 'A');
              if (scorer) {
                 setMatchStats(prev => ({
                    ...prev,
                    goals: [...prev.goals, { playerId: scorer.playerData.id, minute: Math.floor(state.timer), team: 'A' }],
                    ratings: { ...prev.ratings, [scorer.playerData.id]: (prev.ratings[scorer.playerData.id] || 6) + 1.5 }
                 }));
                 addLogEvent(`GOAL! ${scorer.playerData.name} scores!`);
              }

              setTimeout(() => { 
                 state.state = 'PLAYING'; 
                 resetPositions('B'); // AI kicks off
              }, 3000);
            }
          } else {
            ball.x = PITCH_W/2;
            ball.y = PITCH_H/2;
            ball.vx = 0;
            ball.vy = 0;
          }
        } else {
          ball.x = PITCH_W; ball.vx *= -1;
        }
      }

      // Determine controlled player (Team A)
      const teamA = players.filter(p => p.team === 'A' && !p.isSentOff);
      const playerWithBall = players.find(p => !p.isSentOff && Math.hypot(ball.x - p.x, ball.y - p.y) < PLAYER_RADIUS + BALL_RADIUS + 5);
      
      if (playerWithBall && playerWithBall.team === 'A') {
        controlledPlayerId.current = playerWithBall.id;
      } else if (teamA.length > 0) {
        // Find closest to ball
        const closest = teamA.reduce((prev, curr) => 
          Math.hypot(ball.x - curr.x, ball.y - curr.y) < Math.hypot(ball.x - prev.x, ball.y - prev.y) ? curr : prev
        );
        
        // Hysteresis: Only switch if significantly closer (prevent jitter)
        const currentControlled = teamA.find(p => p.id === controlledPlayerId.current);
        if (currentControlled) {
           const distCurrent = Math.hypot(ball.x - currentControlled.x, ball.y - currentControlled.y);
           const distClosest = Math.hypot(ball.x - closest.x, ball.y - closest.y);
           
           if (distClosest < distCurrent * 0.8) { // Switch if 20% closer
              controlledPlayerId.current = closest.id;
           }
        } else {
           controlledPlayerId.current = closest.id;
        }
      }

      // Proximity-based Fouls & Collisions
      const activePlayers = players.filter(p => !p.isSentOff);
      for (let i = 0; i < activePlayers.length; i++) {
        for (let j = i + 1; j < activePlayers.length; j++) {
          const p1 = activePlayers[i];
          const p2 = activePlayers[j];
          const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
          
          if (dist < PLAYER_RADIUS * 2) {
            const angle = Math.atan2(p1.y - p2.y, p1.x - p2.x);
            const overlap = PLAYER_RADIUS * 2 - dist;
            p1.x += Math.cos(angle) * overlap / 2;
            p1.y += Math.sin(angle) * overlap / 2;
            p2.x -= Math.cos(angle) * overlap / 2;
            p2.y -= Math.sin(angle) * overlap / 2;
            
            // Collision damage
            const impact = Math.hypot(p1.vx - p2.vx, p1.vy - p2.vy);
            if (impact > 3) {
              p1.health -= impact * 0.05;
              p2.health -= impact * 0.05;
              if (Math.random() < 0.002 && impact > 5) {
                const victim = Math.random() > 0.5 ? p1 : p2;
                if (!victim.isInjured) {
                  victim.isInjured = true;
                  addLogEvent(`${victim.playerData.name} is injured!`);
                }
              }
            }
          }

          if (mode !== 'TRAINING' && p1.team !== p2.team) {
            if (dist < PLAYER_RADIUS * 1.5) {
              if (Math.random() < 0.0005) {
                const foulBy = Math.random() < 0.5 ? p1 : p2;
                const victim = foulBy === p1 ? p2 : p1;
                
                const teamADefenseX = isSwapped ? PITCH_W - 150 : 150;
                const teamBDefenseX = isSwapped ? 150 : PITCH_W - 150;
                
                const isPenalty = (foulBy.team === 'A' && (isSwapped ? victim.x > teamADefenseX : victim.x < teamADefenseX) && victim.y > PITCH_H/2 - 120 && victim.y < PITCH_H/2 + 120) ||
                                  (foulBy.team === 'B' && (isSwapped ? victim.x < teamBDefenseX : victim.x > teamBDefenseX) && victim.y > PITCH_H/2 - 120 && victim.y < PITCH_H/2 + 120);

                const card = Math.random() < 0.85 ? 'YELLOW' : 'RED';
                addLogEvent(`${foulBy.playerData.name} committed a foul on ${victim.playerData.name}. ${card} CARD!`);
                  
                  if (card === 'RED') {
                    foulBy.isSentOff = true;
                    foulBy.x = -1000;
                    foulBy.y = -1000;
                  }

                  state.state = 'PAUSED';
                  
                  setTimeout(() => {
                    if (isPenalty) {
                      addLogEvent(`PENALTY AWARDED!`);
                      state.state = 'PENALTIES';
                      setMatchStateUI('penalties');
                      
                      const shooterTeam = foulBy.team === 'A' ? 'B' : 'A';
                      // Set ball to penalty spot
                      state.ball.x = shooterTeam === 'A' ? PITCH_W - 140 : 140;
                      state.ball.y = PITCH_H/2;
                      state.ball.vx = 0;
                      state.ball.vy = 0;

                      // Reset penalty state for a single kick
                      setPenaltyState({
                        turn: shooterTeam,
                        round: 1,
                        phase: shooterTeam === 'A' ? 'aiming' : 'saving',
                        timer: 0,
                        scoreA: 0,
                        scoreB: 0,
                        history: [],
                        isSingleKick: true
                      });
                    } else {
                      state.state = 'PLAYING';
                      resetPositions();
                    }
                  }, 2000);
                  return;
                }
              }
            }
          }
        }

      players.forEach(p => {
        if (p.isSentOff) return;

        const distToBall = Math.hypot(ball.x - p.x, ball.y - p.y);
        const now = Date.now();
        const isRecentlyKicked = p.lastKickTime && (now - p.lastKickTime < 400);

        // Pass Magnet: If this player is the target of a recent pass, make it easier to catch
        const isPassTarget = state.passTargetId === p.id && (now - state.passTime < 2000);
        
        // Significantly more generous ball control radius for the controlled player to ensure keys always react
        let controlGrace = p.id === controlledPlayerId.current ? 20 : 12;
        if (isPassTarget) controlGrace = 40; // Extra grace for pass targets

        p.hasBall = !isRecentlyKicked && distToBall < PLAYER_RADIUS + BALL_RADIUS + controlGrace;
        
        if (p.hasBall && isPassTarget) {
          state.passTargetId = null; // Reset once caught
        }
        
        let targetX = p.homeX;
        let targetY = p.homeY;
        let isManual = false;

        // Manual Control
        if (p.id === controlledPlayerId.current) {
          isManual = true;
          const isSprintPressed = keys.current['ShiftLeft'] || keys.current['ShiftRight'];
          
          if (mouseTarget.current) {
            targetX = mouseTarget.current.x;
            targetY = mouseTarget.current.y;
            
            const dist = Math.hypot(targetX - p.x, targetY - p.y);
            if (dist > 2) {
              const angle = Math.atan2(targetY - p.y, targetX - p.x);
              const sprintMult = isSprintPressed ? 1.5 : 1.0;
              const speed = p.playerData.stats.pac * PLAYER_SPEED_MULT * sprintMult;
              p.vx += Math.cos(angle) * speed * 0.2;
              p.vy += Math.sin(angle) * speed * 0.2;
            } else {
              mouseTarget.current = null; // Reached target
            }
          }

          // Input Handling for Controlled Player
          const isShootPressed = keys.current['KeyS'];
          const isPassPressed = keys.current['KeyC'];
          const now = Date.now();
          const canKick = !p.lastKickTime || now - p.lastKickTime > 300;
          
          // Magnetic Action: If player is very close and pressing action keys, 
          // allow the action to trigger even if p.hasBall was slightly false.
          // Reduced radius for more precision
          const isMagneticAction = distToBall < (PLAYER_RADIUS + BALL_RADIUS + 40) && (isShootPressed || isPassPressed);
          
          let actionTriggered = false;

          if ((isShootPressed || isPassPressed || isMagneticAction) && canKick && (p.hasBall || isMagneticAction)) {
            actionTriggered = true;
            p.lastKickTime = now;
            playSound('kick');
            
            // Force ball to player position for a clean kick if it was a magnetic action
            if (isMagneticAction && !p.hasBall) {
              ball.x = p.x;
              ball.y = p.y;
            }
            
            let passCandidate = null;
            let bestPassScore = -Infinity;
            
            const teammates = players.filter(t => t.team === p.team && t.id !== p.id && !t.isSentOff);
            
            // Determine direction of intent (mouse or movement)
            let aimAngle = 0;
            const distToMouse = mouseTarget.current ? Math.hypot(mouseTarget.current.x - p.x, mouseTarget.current.y - p.y) : Infinity;
            
            if (mouseTarget.current && distToMouse > 30) {
              // Aim at mouse target if it's far enough from player
              aimAngle = Math.atan2(mouseTarget.current.y - p.y, mouseTarget.current.x - p.x);
            } else if (isShootPressed) {
              // Default shoot aim is always towards the goal
              const goalX = isSwapped ? 0 : PITCH_W;
              aimAngle = Math.atan2(PITCH_H/2 - p.y, goalX - p.x);
            } else if (Math.abs(p.vx) > 0.1 || Math.abs(p.vy) > 0.1) {
              // Aim in movement direction
              aimAngle = Math.atan2(p.vy, p.vx);
            } else {
              // Default to goal direction
              const goalX = isSwapped ? 0 : PITCH_W;
              aimAngle = Math.atan2(PITCH_H/2 - p.y, goalX - p.x);
            }

            // Only look for pass candidate if Pass key is pressed
            if (isPassPressed) {
              teammates.forEach(t => {
                const dist = Math.hypot(t.x - p.x, t.y - p.y);
                const angleToTeammate = Math.atan2(t.y - p.y, t.x - p.x);
                const angleDiff = Math.abs(angleToTeammate - aimAngle);
                
                // Wider cone (90 degrees) for more forgiving passing
                if (angleDiff < Math.PI / 2) {
                   const alignmentScore = (1 - angleDiff / (Math.PI / 2)) * 10000;
                   const distanceScore = (1 - dist / PITCH_W) * 1000;
                   const score = alignmentScore + distanceScore;
                   if (score > bestPassScore) {
                      bestPassScore = score;
                      passCandidate = t;
                   }
                }
              });
            }

            if (isPassPressed && passCandidate) {
              const t = passCandidate as Entity;
              const angle = Math.atan2(t.y - p.y, t.x - p.x);
              const pasStat = p.playerData.stats.pas;
              const errorFactor = (100 - pasStat) * 0.002;
              const angleError = (Math.random() - 0.5) * errorFactor;
              const finalAngle = angle + angleError;
              // Reduced power for more controlled passing
              const power = Math.min(14, Math.hypot(t.x - p.x, t.y - p.y) * 0.04 + 4);
              ball.vx = Math.cos(finalAngle) * power;
              ball.vy = Math.sin(finalAngle) * power;
              addLogEvent(`${p.playerData.name} passes to ${t.playerData.name}`);
              controlledPlayerId.current = t.id;
              state.passTargetId = t.id;
              state.passTime = Date.now();
              // Clear mouse target for the new player to prevent them running away immediately
              mouseTarget.current = null;
            } else {
              const shootPower = p.playerData.stats.sho * 0.32;
              const goalX = isSwapped ? 0 : PITCH_W;
              const angle = Math.atan2(PITCH_H/2 - p.y, goalX - p.x);
              const shoStat = p.playerData.stats.sho;
              const errorFactor = (100 - shoStat) * 0.005;
              const angleError = (Math.random() - 0.5) * errorFactor;
              const finalAngle = angle + angleError;
              ball.vx = Math.cos(finalAngle) * shootPower;
              ball.vy = Math.sin(finalAngle) * shootPower;
              addLogEvent(`${p.playerData.name} shoots!`);
            }
            p.hasBall = false;
          }

          if (!actionTriggered) {
            if (p.hasBall) {
              // Dribbling: ball stays close to player, affected by DRI stats
              const dribbleAngle = Math.atan2(p.vy, p.vx);
              const dribbleStat = p.playerData.stats.dri;
              const dribbleDist = (PLAYER_RADIUS + BALL_RADIUS) + (100 - dribbleStat) * 0.05;
              const noise = (100 - dribbleStat) * 0.05;
              const noiseX = (Math.random() - 0.5) * noise;
              const noiseY = (Math.random() - 0.5) * noise;

              const targetBallX = p.x + Math.cos(dribbleAngle) * dribbleDist + noiseX;
              const targetBallY = p.y + Math.sin(dribbleAngle) * dribbleDist + noiseY;
              
              ball.x += (targetBallX - ball.x) * 0.85;
              ball.y += (targetBallY - ball.y) * 0.85;
              ball.vx = p.vx;
              ball.vy = p.vy;
            } else {
              // Tackle
              const canTackle = !p.lastKickTime || now - p.lastKickTime > 300;
              if (keys.current['KeyC'] && canTackle) {
                const tackleRadius = p.playerData.stats.def * 0.4 + p.playerData.stats.phy * 0.2 + 15;
                if (distToBall < tackleRadius) {
                  if (!(state.kickOffInvincibility > 0 && p.team !== state.kickOffTeam)) {
                     p.lastKickTime = now;
                    const isSwapped = (half === 2 || half === 4) && mode !== 'TRAINING';
                    const clearDir = p.team === 'A' ? (isSwapped ? -1 : 1) : (isSwapped ? 1 : -1);
                    ball.vx = (Math.random() * 5 + 7) * clearDir; 
                     ball.vy = (Math.random() - 0.5) * 12;
                     playSound('kick');
                     addLogEvent(`${p.playerData.name} tackles!`);
                  }
                }
              }
            }
          }
        } else {
          // AI Control
          const teammates = players.filter(t => t.team === p.team && !t.isSentOff);
          const closestTeammate = teammates.reduce((prev, curr) => 
            Math.hypot(ball.x - curr.x, ball.y - curr.y) < Math.hypot(ball.x - prev.x, ball.y - prev.y) ? curr : prev
          );

          // AI Tackle Logic
          if (!p.hasBall && p.team !== 'A') {
             const distToBall = Math.hypot(ball.x - p.x, ball.y - p.y);
             if (distToBall < 15) { // AI Tackle range
                if (state.kickOffInvincibility > 0 && p.team !== state.kickOffTeam) {
                   // AI respects kick-off rules
                } else {
                   // AI Tackle
                   const isSwapped = (half === 2 || half === 4) && mode !== 'TRAINING';
                   const clearDir = isSwapped ? 1 : -1;
                   ball.vx += (Math.random() * 5 + 5) * clearDir;
                   ball.vy += (Math.random() - 0.5) * 10;
                   playSound('kick');
                }
             }
          }

          if (p.hasBall) {
            const goalX = p.team === 'A' ? (isSwapped ? 0 : PITCH_W) : (isSwapped ? PITCH_W : 0);
            const goalY = PITCH_H / 2;
            const distToGoal = Math.hypot(goalX - p.x, goalY - p.y);
            
            // AI Tactical Thinking: Look for pass before shooting or dribbling
            const teammates = players.filter(t => t.team === p.team && t.id !== p.id && !t.isSentOff);
            let bestPassOption = null;
            let bestPassScore = -Infinity;

            teammates.forEach(t => {
              const distToT = Math.hypot(t.x - p.x, t.y - p.y);
              const tDistToGoal = Math.hypot(goalX - t.x, goalY - t.y);
              
              // Score based on being closer to goal and clear path
              if (tDistToGoal < distToGoal - 50 && distToT < 300) {
                const score = (distToGoal - tDistToGoal) * 2 - distToT * 0.1;
                if (score > bestPassScore) {
                  bestPassScore = score;
                  bestPassOption = t;
                }
              }
            });

            // AI Clearance Logic: If in danger zone, clear the ball immediately
            const isDangerZone = p.team === 'A' ? (isSwapped ? p.x > PITCH_W - 150 : p.x < 150) : (isSwapped ? p.x < 150 : p.x > PITCH_W - 150);
            
            if (isDangerZone) {
               playSound('kick');
               const clearAngle = p.team === 'A' ? (isSwapped ? (Math.PI + Math.random() * 0.6 - 0.3) : (Math.random() * 0.6 - 0.3)) : (isSwapped ? (Math.random() * 0.6 - 0.3) : (Math.PI + Math.random() * 0.6 - 0.3));
               const clearPower = 12;
               ball.vx = Math.cos(clearAngle) * clearPower;
               ball.vy = Math.sin(clearAngle) * clearPower;
               p.hasBall = false;
               addLogEvent(`${p.playerData.name} clears!`);
            } else if (bestPassOption && Math.random() < 0.6) {
              // AI Passes
              playSound('kick');
              const t = bestPassOption as Entity;
              const angle = Math.atan2(t.y - p.y, t.x - p.x);
              const power = Math.min(12, Math.hypot(t.x - p.x, t.y - p.y) * 0.05 + 4);
              ball.vx = Math.cos(angle) * power;
              ball.vy = Math.sin(angle) * power;
              p.hasBall = false;
              addLogEvent(`${p.playerData.name} passes to ${t.playerData.name}`);
            } else if (distToGoal < 250) {
              playSound('kick');
              const shootPower = p.playerData.stats.sho * 0.25; 
              const inaccuracy = (100 - p.playerData.stats.sho) * 0.01;
              const angle = Math.atan2(goalY - p.y + (Math.random()-0.5)*inaccuracy*100, goalX - p.x);
              ball.vx = Math.cos(angle) * shootPower;
              ball.vy = Math.sin(angle) * shootPower;
              p.hasBall = false;
              addLogEvent(`${p.playerData.name} shoots!`);
            } else {
              // Dribble towards goal
              targetX = goalX;
              targetY = goalY;
              const angle = Math.atan2(goalY - p.y, goalX - p.x);
              ball.x = p.x + Math.cos(angle) * (PLAYER_RADIUS + BALL_RADIUS);
              ball.y = p.y + Math.sin(angle) * (PLAYER_RADIUS + BALL_RADIUS);
              ball.vx = p.vx;
              ball.vy = p.vy;
            }
          } else if (p.playerData.position === 'GK') {
            // GK stays near goal line and follows ball Y
            targetX = p.homeX;
            targetY = Math.max(GOAL_Y1, Math.min(GOAL_Y2, ball.y));
          } else if (closestTeammate.id === p.id) {
            targetX = ball.x;
            targetY = ball.y;
          } else {
            // Tactical positioning
            const ballFactorX = (ball.x - PITCH_W/2) * 0.3;
            const ballFactorY = (ball.y - PITCH_H/2) * 0.3;
            targetX = p.homeX + (p.team === 'A' ? ballFactorX : -ballFactorX);
            targetY = p.homeY + ballFactorY;
          }

          if (!isManual) {
            const angle = Math.atan2(targetY - p.y, targetX - p.x);
            // AI Difficulty Scaling
            let difficultyMult = 1;
            if (difficulty === 'EASY') difficultyMult = 0.7;
            if (difficulty === 'MEDIUM') difficultyMult = 1.0;
            if (difficulty === 'HARD') difficultyMult = 1.3;

            const speed = p.playerData.stats.pac * PLAYER_SPEED_MULT * (p.team === 'B' ? 0.75 * difficultyMult : 1);
            p.vx += Math.cos(angle) * speed * 0.1;
            p.vy += Math.sin(angle) * speed * 0.1;
          }
        }

        // Host: Skip physics integration for Guest-controlled player to prevent stuttering
        if (isHost && p.id === guestControlledPlayerId.current) {
           // Position is updated via socket packets
           return;
        }

        p.vx *= PLAYER_DAMPING;
        p.vy *= PLAYER_DAMPING;
        p.x += p.vx;
        p.y += p.vy;

        p.x = Math.max(PLAYER_RADIUS, Math.min(PITCH_W - PLAYER_RADIUS, p.x));
        p.y = Math.max(PLAYER_RADIUS, Math.min(PITCH_H - PLAYER_RADIUS, p.y));
      });
    };

    const draw = (ctx: CanvasRenderingContext2D) => {
      ctx.clearRect(0, 0, PITCH_W, PITCH_H);

      // Artistic Pitch
      const gradient = ctx.createLinearGradient(0, 0, 0, PITCH_H);
      gradient.addColorStop(0, '#14532d'); // green-900
      gradient.addColorStop(1, '#166534'); // green-800
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, PITCH_W, PITCH_H);
      
      // Grass Stripes
      ctx.fillStyle = 'rgba(255,255,255,0.04)';
      for(let i=0; i<PITCH_W; i+=50) {
        if((i/50)%2===0) ctx.fillRect(i, 0, 50, PITCH_H);
      }

      // Lines
      ctx.strokeStyle = 'rgba(255,255,255,0.6)';
      ctx.lineWidth = 3;
      
      // Center line & circle
      ctx.beginPath();
      ctx.moveTo(PITCH_W/2, 0);
      ctx.lineTo(PITCH_W/2, PITCH_H);
      ctx.stroke();
      
      ctx.beginPath();
      ctx.arc(PITCH_W/2, PITCH_H/2, 70, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(PITCH_W/2, PITCH_H/2, 4, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.fill();

      // Penalty Areas
      ctx.strokeRect(0, PITCH_H/2 - 120, 150, 240);
      ctx.strokeRect(PITCH_W - 150, PITCH_H/2 - 120, 150, 240);
      
      // Goal Areas
      ctx.strokeRect(0, PITCH_H/2 - 50, 50, 100);
      ctx.strokeRect(PITCH_W - 50, PITCH_H/2 - 50, 50, 100);

      // Penalty Arcs
      ctx.beginPath();
      ctx.arc(150, PITCH_H/2, 50, -Math.PI/2.5, Math.PI/2.5);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(PITCH_W - 150, PITCH_H/2, 50, Math.PI - Math.PI/2.5, Math.PI + Math.PI/2.5);
      ctx.stroke();

      // Goals
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.fillRect(0, GOAL_Y1, 10, GOAL_Y2 - GOAL_Y1);
      ctx.fillRect(PITCH_W - 10, GOAL_Y1, 10, GOAL_Y2 - GOAL_Y1);

      const state = gameState.current;

      // Draw Players
      if (state.state === 'PENALTIES') {
         const ps = state.penaltyState;
         // Draw Penalty Scene
         // Draw Shooter
         const shooterX = ps.turn === 'A' ? PITCH_W - 150 : 150;
         const shooterY = PITCH_H/2;
         const shooter = state.players.find(p => p.team === ps.turn && p.playerData.position !== 'GK') || state.players.find(p => p.team === ps.turn) || state.players[0];
         
         // Draw Keeper
         const keeperX = ps.turn === 'A' ? PITCH_W - 20 : 20;
         const keeperY = ps.keeperDive?.y || PITCH_H/2; // Animate dive
         const keeper = state.players.find(p => p.team !== ps.turn && p.playerData.position === 'GK') || state.players.find(p => p.team !== ps.turn) || state.players[1];

         if (shooter) {
            ctx.beginPath();
            ctx.arc(shooterX, shooterY, PLAYER_RADIUS, 0, Math.PI * 2);
            ctx.fillStyle = shooter.color;
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.stroke();
         }

         if (keeper) {
            ctx.beginPath();
            ctx.arc(keeperX, keeperY, PLAYER_RADIUS, 0, Math.PI * 2);
            ctx.fillStyle = keeper.color;
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.stroke();
         }

         // Draw Aim Indicator (User Turn)
         if (ps.turn === 'A' && ps.phase === 'aiming') {
            // Draw goal target zone
            ctx.fillStyle = 'rgba(16, 185, 129, 0.3)';
            ctx.fillRect(PITCH_W - 40, GOAL_Y1, 40, GOAL_Y2 - GOAL_Y1);
            ctx.strokeStyle = '#10b981';
            ctx.lineWidth = 4;
            ctx.setLineDash([10, 5]);
            ctx.strokeRect(PITCH_W - 40, GOAL_Y1, 40, GOAL_Y2 - GOAL_Y1);
            ctx.setLineDash([]);
            
            // Draw a glowing effect
            const glow = ctx.createLinearGradient(PITCH_W - 60, 0, PITCH_W, 0);
            glow.addColorStop(0, 'transparent');
            glow.addColorStop(1, 'rgba(16, 185, 129, 0.2)');
            ctx.fillStyle = glow;
            ctx.fillRect(PITCH_W - 60, GOAL_Y1, 60, GOAL_Y2 - GOAL_Y1);
         }
         
         if (ps.turn === 'B' && ps.phase === 'saving') {
            // Draw save zone
            ctx.fillStyle = 'rgba(59, 130, 246, 0.3)';
            ctx.fillRect(0, GOAL_Y1, 40, GOAL_Y2 - GOAL_Y1);
            ctx.strokeStyle = '#3b82f6';
            ctx.lineWidth = 4;
            ctx.setLineDash([10, 5]);
            ctx.strokeRect(0, GOAL_Y1, 40, GOAL_Y2 - GOAL_Y1);
            ctx.setLineDash([]);

            // Draw a glowing effect
            const glow = ctx.createLinearGradient(0, 0, 60, 0);
            glow.addColorStop(0, 'rgba(59, 130, 246, 0.2)');
            glow.addColorStop(1, 'transparent');
            ctx.fillStyle = glow;
            ctx.fillRect(0, GOAL_Y1, 60, GOAL_Y2 - GOAL_Y1);
         }

      } else {
         // Normal Match Draw
         state.players.forEach(p => {
           if (p.isSentOff) return;
           
           // Shadow
           ctx.beginPath();
           ctx.ellipse(p.x, p.y + 8, PLAYER_RADIUS, PLAYER_RADIUS/2, 0, 0, Math.PI*2);
           ctx.fillStyle = 'rgba(0,0,0,0.4)';
           ctx.fill();
   
           // Player Body
           ctx.beginPath();
           ctx.arc(p.x, p.y, PLAYER_RADIUS, 0, Math.PI * 2);
           ctx.fillStyle = p.color;
           ctx.fill();
           
           // Human Indicator
           const isOpponentHuman = socket && matchId && ((isHost && p.team === 'B') || (!isHost && p.team === 'A'));
           const isControlled = p.id === controlledPlayerId.current;
           
           if (isControlled || isOpponentHuman) {
             ctx.strokeStyle = isControlled ? '#fff' : '#fbbf24';
             ctx.lineWidth = 3;
             ctx.stroke();
             
             // Label
             ctx.fillStyle = isControlled ? '#fff' : '#fbbf24';
             ctx.font = 'bold 10px sans-serif';
             ctx.textAlign = 'center';
             ctx.fillText(isControlled ? 'YOU' : 'OPPONENT', p.x, p.y - 20);
           } else {
             ctx.strokeStyle = '#fff';
             ctx.lineWidth = 2;
             ctx.stroke();
           }
   
           // Number/OVR
           ctx.fillStyle = '#fff';
           ctx.font = 'bold 10px sans-serif';
           ctx.textAlign = 'center';
           ctx.textBaseline = 'middle';
           ctx.fillText(p.playerData.ovr.toString(), p.x, p.y);
   
           // Name
           ctx.fillStyle = '#fff';
           ctx.font = '9px sans-serif';
           ctx.fillText(p.playerData.name.split(' ').pop() || '', p.x, p.y - 18);
   
           // Controlled Indicator (Arrow)
           if (p.id === controlledPlayerId.current) {
             ctx.beginPath();
             ctx.moveTo(p.x, p.y - 25);
             ctx.lineTo(p.x - 6, p.y - 35);
             ctx.lineTo(p.x + 6, p.y - 35);
             ctx.closePath();
             ctx.fillStyle = '#10b981'; // emerald-500
             ctx.fill();
             
             // Draw target line if moving or has ball (aiming)
             if (mouseTarget.current) {
               ctx.beginPath();
               ctx.moveTo(p.x, p.y);
               ctx.lineTo(mouseTarget.current.x, mouseTarget.current.y);
               ctx.strokeStyle = p.hasBall ? 'rgba(255, 255, 255, 0.6)' : 'rgba(16, 185, 129, 0.4)';
               ctx.lineWidth = p.hasBall ? 2 : 1;
               ctx.setLineDash([8, 4]);
               ctx.stroke();
               ctx.setLineDash([]);
               ctx.lineWidth = 1;
               
               // Target marker
               ctx.beginPath();
               ctx.arc(mouseTarget.current.x, mouseTarget.current.y, p.hasBall ? 6 : 4, 0, Math.PI*2);
               ctx.fillStyle = p.hasBall ? 'rgba(255, 255, 255, 0.5)' : 'rgba(16, 185, 129, 0.5)';
               ctx.fill();
               if (p.hasBall) {
                 ctx.strokeStyle = '#fff';
                 ctx.stroke();
               }
             }
           }
         });
      }

      // Draw Ball
      ctx.beginPath();
      ctx.arc(state.ball.x, state.ball.y, BALL_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.fill();
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Draw Shooting Targets
      if (drillType === 'SHOOTING') {
        state.shootingTargets.forEach(t => {
          ctx.fillStyle = t.color;
          ctx.fillRect(t.x - 10, t.y - 20, 20, 40);
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 2;
          ctx.strokeRect(t.x - 10, t.y - 20, 20, 40);
          
          // Inner box
          ctx.fillStyle = 'rgba(255,255,255,0.3)';
          ctx.fillRect(t.x - 5, t.y - 10, 10, 20);
        });
      }

      // Ball pattern
      ctx.beginPath();
      ctx.arc(state.ball.x, state.ball.y, BALL_RADIUS/2, 0, Math.PI * 2);
      ctx.fillStyle = '#000';
      ctx.fill();

      if (state.state === 'GOAL') {
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(0, 0, PITCH_W, PITCH_H);
        ctx.fillStyle = '#fff';
        ctx.font = 'black italic 80px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('GOAL!', PITCH_W/2, PITCH_H/2);
      }
    };

    const loop = (time: number) => {
      const dt = time - lastTime;
      lastTime = time;
      
      update(dt);
      
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) draw(ctx);
      }

      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [squad, onFinish, half, matchStateUI, difficulty, socket, matchId, isHost, opponentSquad]);

  useEffect(() => {
    if (!socket || !matchId) return;

    const handleRemoteState = (remoteState: any) => {
      if (!isHost) {
        // Guest: Update from Host
        const state = gameState.current;
        state.ball = remoteState.ball;
        state.timer = remoteState.timer;
        state.score = remoteState.score;
        state.state = remoteState.state;
        
        remoteState.players.forEach((rp: any) => {
          const lp = state.players.find(p => p.id === rp.id);
          if (lp && lp.id !== controlledPlayerId.current) {
            lp.x = rp.x;
            lp.y = rp.y;
            lp.vx = rp.vx;
            lp.vy = rp.vy;
            lp.hasBall = rp.hasBall;
          }
        });
        
        setScore(remoteState.score);
        setTimeLeft(Math.floor(remoteState.timer));
      } else {
        // Host: Receive Guest's player position
        guestControlledPlayerId.current = remoteState.controlledPlayerId;
        const guestPlayer = gameState.current.players.find(p => p.id === remoteState.controlledPlayerId);
        if (guestPlayer) {
          guestPlayer.x = remoteState.controlledPlayerX;
          guestPlayer.y = remoteState.controlledPlayerY;
          guestPlayer.vx = remoteState.controlledPlayerVx;
          guestPlayer.vy = remoteState.controlledPlayerVy;
        }
      }
    };

    const handleRemoteAction = (action: any) => {
      if (isHost) {
        const state = gameState.current;
        const p = state.players.find(p => p.id === action.playerId);
        if (p) {
           if (action.type === 'SHOOT' && p.hasBall) {
              // Immediate Shoot Logic
              const shootPower = p.playerData.stats.sho * 0.35; // Slightly buffed for PVP feel
              const angle = Math.atan2(PITCH_H/2 - p.y, PITCH_W - p.x);
              const shoStat = p.playerData.stats.sho;
              const errorFactor = (100 - shoStat) * 0.005;
              const finalAngle = angle + (Math.random() - 0.5) * errorFactor;

              state.ball.vx = Math.cos(finalAngle) * shootPower;
              state.ball.vy = Math.sin(finalAngle) * shootPower;
              p.hasBall = false;
              playSound('kick');
              addLogEvent(`${p.playerData.name} shoots!`);
           }
           if (action.type === 'PASS' && p.hasBall) {
              // Immediate Pass Logic
              let passCandidate: Entity | null = null;
              let minDist = 1000;
              state.players.forEach(t => {
                if (t.team === p.team && t.id !== p.id && !t.isSentOff) {
                  const d = Math.hypot(t.x - p.x, t.y - p.y);
                  if (d < minDist) { minDist = d; passCandidate = t; }
                }
              });

              if (passCandidate) {
                const t = passCandidate as Entity;
                const angle = Math.atan2(t.y - p.y, t.x - p.x);
                const power = Math.min(18, Math.hypot(t.x - p.x, t.y - p.y) * 0.05 + 6);
                state.ball.vx = Math.cos(angle) * power;
                state.ball.vy = Math.sin(angle) * power;
                p.hasBall = false;
                playSound('kick');
                addLogEvent(`${p.playerData.name} passes!`);
              }
           }
           if (action.type === 'TACKLE' && !p.hasBall) {
              const distToBall = Math.hypot(state.ball.x - p.x, state.ball.y - p.y);
              const tackleRadius = p.playerData.stats.def * 0.5 + p.playerData.stats.phy * 0.3 + 15;
              if (distToBall < tackleRadius) {
                 const isSwapped = (half === 2 || half === 4) && mode !== 'TRAINING';
                 const clearDir = p.team === 'A' ? (isSwapped ? -1 : 1) : (isSwapped ? 1 : -1);
                 state.ball.vx = (Math.random() * 8 + 8) * clearDir; 
                 state.ball.vy = (Math.random() - 0.5) * 12;
                 playSound('kick');
                 addLogEvent(`${p.playerData.name} tackles!`);
              }
           }
        }
      } else if (action.type === 'EMOTE') {
        const emoteId = action.id || Date.now();
        setEmotes(prev => [...prev, { id: emoteId, text: action.text, team: action.team }]);
        setTimeout(() => {
          setEmotes(prev => prev.filter(e => e.id !== emoteId));
        }, 3000);
      }
    };

    socket.on('remote_state_update', handleRemoteState);
    socket.on('remote_action', handleRemoteAction);

    return () => {
      socket.off('remote_state_update', handleRemoteState);
      socket.off('remote_action', handleRemoteAction);
    };
  }, [socket, matchId, isHost]);

  const sendEmote = (text: string) => {
    if (socket && matchId) {
      const emote = { id: Date.now(), text, team: isHost ? 'A' : 'B' };
      socket.emit('game_action', { matchId, action: { type: 'EMOTE', ...emote } });
      // Local display
      setEmotes(prev => [...prev, emote]);
      setTimeout(() => {
        setEmotes(prev => prev.filter(e => e.id !== emote.id));
      }, 3000);
    }
  };

  const finalizeMatch = () => {
      // if (audioRefs.current.crowd) audioRefs.current.crowd.pause(); // Handled by stopAudio('MATCH_AMBIENT') on unmount
      playAudio('WHISTLE_END');
      setMatchStats(prev => {
         const newRatings = { ...prev.ratings };
         if (score.A > score.B) {
           Object.keys(newRatings).forEach(id => newRatings[id] += 1.0);
         }
         return { ...prev, ratings: newRatings };
      });
  };

  const startSecondHalf = () => {
    setHalf(2);
    setMatchStateUI('playing');
    gameState.current.state = 'PLAYING';
    gameState.current.timer = 45;
    resetPositions('B'); // AI kicks off 2nd half usually, or alternate. Let's say B.
  };

  const startExtraTime1 = () => {
     setHalf(3);
     setMatchStateUI('playing');
     gameState.current.state = 'PLAYING';
     gameState.current.timer = 90;
     resetPositions('A');
  };

  const startExtraTime2 = () => {
     setHalf(4);
     setMatchStateUI('playing');
     gameState.current.state = 'PLAYING';
     gameState.current.timer = 105;
     resetPositions('B');
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isMobile) return; // Use touch handlers for mobile
    if (gameState.current.state === 'PENALTIES') {
       handlePenaltyClick(e);
       return;
    }

    if (gameState.current.state !== 'PLAYING') return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      const scaleX = PITCH_W / rect.width;
      const scaleY = PITCH_H / rect.height;
      const clickX = (e.clientX - rect.left) * scaleX;
      const clickY = (e.clientY - rect.top) * scaleY;

      mouseTarget.current = { x: clickX, y: clickY };
    }
  };

  const handleJoystickStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    joystickRef.current = { startX: touch.clientX, startY: touch.clientY };
    setJoystick({ x: 0, y: 0, active: true });
  };

  const handleJoystickMove = (e: React.TouchEvent) => {
    if (!joystickRef.current) return;
    const touch = e.touches[0];
    const dx = touch.clientX - joystickRef.current.startX;
    const dy = touch.clientY - joystickRef.current.startY;
    const dist = Math.hypot(dx, dy);
    const maxDist = 40;
    const ratio = Math.min(dist, maxDist) / maxDist;
    const angle = Math.atan2(dy, dx);
    
    const jx = Math.cos(angle) * ratio * maxDist;
    const jy = Math.sin(angle) * ratio * maxDist;
    
    setJoystick({ x: jx, y: jy, active: true });
    
    // Update player movement
    const p = gameState.current.players.find(pl => pl.id === controlledPlayerId.current);
    if (p) {
      mouseTarget.current = { x: p.x + jx * 5, y: p.y + jy * 5 };
    }
  };

  const handleJoystickEnd = () => {
    joystickRef.current = null;
    setJoystick({ x: 0, y: 0, active: false });
    mouseTarget.current = null;
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const touch = e.touches[0];
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      const scaleX = PITCH_W / rect.width;
      const scaleY = PITCH_H / rect.height;
      const x = (touch.clientX - rect.left) * scaleX;
      const y = (touch.clientY - rect.top) * scaleY;
      touchStart.current = { x, y, time: Date.now() };
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!touchStart.current) return;
    const touch = e.changedTouches[0];
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const scaleX = PITCH_W / rect.width;
    const scaleY = PITCH_H / rect.height;
    const endX = (touch.clientX - rect.left) * scaleX;
    const endY = (touch.clientY - rect.top) * scaleY;

    const dx = endX - touchStart.current.x;
    const dy = endY - touchStart.current.y;
    const dist = Math.hypot(dx, dy);
    const duration = Date.now() - touchStart.current.time;

    if (gameState.current.state === 'PENALTIES') {
       // Handle penalty shootout touch
       if (gameState.current.penaltyState.phase === 'aiming' || gameState.current.penaltyState.phase === 'saving') {
          if (gameState.current.penaltyState.turn === 'A' && gameState.current.penaltyState.phase === 'aiming') {
             gameState.current.penaltyState.shotTarget = { x: PITCH_W, y: endY };
             gameState.current.penaltyState.phase = 'shooting';
             gameState.current.penaltyState.timer = 0;
             setPenaltyState({ ...gameState.current.penaltyState });
          } else if (gameState.current.penaltyState.turn === 'B' && gameState.current.penaltyState.phase === 'saving') {
             const diveY = endY;
             gameState.current.penaltyState.keeperDive = { x: 20, y: diveY };
             gameState.current.penaltyState.phase = 'saving';
             gameState.current.penaltyState.timer = 0;
             setPenaltyState({ ...gameState.current.penaltyState });
          }
       }
       touchStart.current = null;
       return;
    }

    if (dist < 20 && duration < 300) {
      // Tap: Move to location
      mouseTarget.current = { x: endX, y: endY };
    } else if (dist > 30) {
      // Swipe: Pass or Shoot
      // Set mouse target to swipe end for aiming
      mouseTarget.current = { x: endX, y: endY };
      
      // Determine if it's a pass or shoot
      // Check if swipe ends near a teammate
      const players = gameState.current.players;
      const controlledId = controlledPlayerId.current;
      const p = players.find(pl => pl.id === controlledId);
      
      if (p && p.team === 'A') {
        const teammates = players.filter(t => t.team === 'A' && t.id !== p.id && !t.isSentOff);
        let passTarget = null;
        let minTeammateDist = 60; // Threshold for "swiping into teammate"

        teammates.forEach(t => {
          const d = Math.hypot(t.x - endX, t.y - endY);
          if (d < minTeammateDist) {
            minTeammateDist = d;
            passTarget = t;
          }
        });

        if (passTarget) {
          // Trigger Pass
          keys.current['KeyC'] = true;
          setTimeout(() => { keys.current['KeyC'] = false; }, 100);
        } else {
          // Trigger Shoot
          keys.current['KeyS'] = true;
          setTimeout(() => { keys.current['KeyS'] = false; }, 100);
        }
      }
    }

    touchStart.current = null;
  };

  const handlePenaltyClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
     if (gameState.current.penaltyState.phase !== 'aiming' && gameState.current.penaltyState.phase !== 'saving') return;

     const rect = canvasRef.current?.getBoundingClientRect();
     if (!rect) return;
     const scaleX = PITCH_W / rect.width;
     const clickX = (e.clientX - rect.left) * scaleX;

      if (gameState.current.penaltyState.turn === 'A' && gameState.current.penaltyState.phase === 'aiming') {
        const scaleY = PITCH_H / rect.height;
        const clickY = (e.clientY - rect.top) * scaleY;
        
        gameState.current.penaltyState.shotTarget = { x: PITCH_W, y: clickY };
        gameState.current.penaltyState.phase = 'shooting';
        gameState.current.penaltyState.timer = 0;
        setPenaltyState({ ...gameState.current.penaltyState });
      } else if (gameState.current.penaltyState.turn === 'B' && gameState.current.penaltyState.phase === 'saving') {
        const scaleY = PITCH_H / rect.height;
        const clickY = (e.clientY - rect.top) * scaleY;
        const centerY = PITCH_H / 2;
        
        let diveY = centerY;
        if (clickY < centerY - 20) diveY = centerY - 40;
        else if (clickY > centerY + 20) diveY = centerY + 40;
        
        gameState.current.penaltyState.keeperDive = { x: 20, y: diveY };
        // AI also picks its shot target NOW to avoid jitter in update loop
        gameState.current.penaltyState.shotTarget = { 
           x: 0, 
           y: (GOAL_Y1 + GOAL_Y2)/2 + (Math.random() - 0.5) * 100 
        };
        gameState.current.penaltyState.phase = 'shooting';
        gameState.current.penaltyState.timer = 0;
        setPenaltyState({ ...gameState.current.penaltyState });
      }
  };

  const getMVP = () => {
    let bestId = '';
    let maxRating = -1;
    (Object.entries(matchStats.ratings) as [string, number][]).forEach(([id, rating]) => {
      if (rating > maxRating) {
        maxRating = rating;
        bestId = id;
      }
    });
    return squad.lineup.find(p => p?.id === bestId);
  };

  const handleFinish = () => {
    const xpGains: Record<string, number> = {};
    const mvp = getMVP();
    
    squad.lineup.forEach(p => {
      if (p) {
        let gain = 50; // Base XP
        if (matchStats.ratings[p.id]) gain += Math.floor(matchStats.ratings[p.id] * 10);
        if (p.id === mvp?.id) gain += 100; // MVP Bonus
        xpGains[p.id] = gain;
      }
    });

    const finalScoreA = mode === 'PENALTY_SHOOTOUT' ? penaltyState.scoreA : score.A;
    const finalScoreB = mode === 'PENALTY_SHOOTOUT' ? penaltyState.scoreB : score.B;

    onFinish(
      finalScoreA > finalScoreB ? 500 : finalScoreA === finalScoreB ? 200 : 100, 
      xpGains, 
      finalScoreA, 
      finalScoreB,
      {
        score: `${finalScoreA}-${finalScoreB}`,
        opponent: opponentName || 'Opponent',
        isWinner: finalScoreA > finalScoreB,
        competition: isWorldCup ? 'World Cup' : 'League Match'
      }
    );
  };

  return (
    <div className="h-full w-full bg-transparent flex flex-col overflow-hidden relative touch-none overscroll-none select-none" id="match-screen-root" style={{ touchAction: 'none' }}>
      {/* Orientation Hint */}
      {isMobile && orientation === 'portrait' && (
        <div className="fixed inset-0 z-[200] bg-zinc-950 flex flex-col items-center justify-center p-8 text-center">
          <div className="w-24 h-24 mb-8 text-emerald-500 animate-bounce">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
              <path d="M12 18h.01" />
            </svg>
          </div>
          <h2 className="text-2xl font-black italic text-white mb-4 tracking-tighter uppercase">Rotate Device</h2>
          <p className="text-zinc-400 font-bold uppercase tracking-widest text-xs leading-relaxed">
            Please rotate your device to landscape mode for the best football experience.
          </p>
        </div>
      )}
      {/* Setup Overlay */}
      {matchStateUI === 'setup' && (
         <div className="absolute inset-0 z-[100] bg-zinc-950/80 backdrop-blur-md flex flex-col items-center justify-center p-8">
            <div className="text-center mb-12">
              <h2 className="text-6xl font-black italic text-white mb-4 tracking-tighter">KICK OFF</h2>
              <p className="text-zinc-400 text-xl">Select your match difficulty</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-6xl">
              {(['EASY', 'MEDIUM', 'HARD'] as Difficulty[]).map(d => (
                <button
                  key={d}
                  onClick={() => { setDifficulty(d); setMatchStateUI('intro'); }}
                  className={`p-8 rounded-3xl border-2 transition-all transform hover:scale-105 flex flex-col items-center text-center ${
                    d === 'EASY' ? 'border-emerald-500 bg-emerald-500/10 hover:bg-emerald-500/20' :
                    d === 'MEDIUM' ? 'border-yellow-500 bg-yellow-500/10 hover:bg-yellow-500/20' :
                    'border-red-500 bg-red-500/10 hover:bg-red-500/20'
                  }`}
                >
                  <div className={`w-16 h-16 rounded-2xl mb-6 flex items-center justify-center ${
                    d === 'EASY' ? 'bg-emerald-500' : d === 'MEDIUM' ? 'bg-yellow-500' : 'bg-red-500'
                  }`}>
                    <span className="text-2xl font-black text-black">{d[0]}</span>
                  </div>
                  <h3 className={`text-3xl font-black mb-4 ${
                    d === 'EASY' ? 'text-emerald-400' : d === 'MEDIUM' ? 'text-yellow-400' : 'text-red-400'
                  }`}>{d}</h3>
                  <p className="text-zinc-400 text-sm leading-relaxed">
                    {d === 'EASY' ? 'Relaxed pace. AI is less aggressive. Perfect for learning.' :
                     d === 'MEDIUM' ? 'Standard challenge. Balanced AI movement and tactics.' :
                     'Pro level. Aggressive AI, faster reactions, and tight marking.'}
                  </p>
                </button>
              ))}
            </div>
         </div>
      )}

      {/* Main Game Area */}
      <div className="flex-1 flex flex-col items-center md:justify-center justify-end p-0 md:p-8 relative">
        {/* Scoreboard */}
        {mode !== 'TRAINING' && (
          <div className="w-full max-w-5xl flex justify-between items-center bg-zinc-900/90 backdrop-blur-md border-b md:border border-zinc-800 md:rounded-t-3xl p-2 md:p-6 shadow-2xl z-10 md:relative absolute top-0 left-0 right-0 mx-auto">
            <div className="flex items-center space-x-2 md:space-x-6">
              <div className="flex flex-col items-center">
                <div className={`w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl flex items-center justify-center font-black text-sm md:text-2xl shadow-[0_0_20px_rgba(37,99,235,0.4)] transform -rotate-3 overflow-hidden bg-blue-600`}>
                   {userTeamName ? userTeamName.substring(0, 3).toUpperCase() : 'YOU'}
                </div>
                <span className="text-[8px] md:text-xs font-bold text-blue-400 mt-1 md:mt-2 uppercase tracking-widest">{userTeamName || 'Home'}</span>
              </div>
              <span className="text-3xl md:text-6xl font-black italic tracking-tighter">{score.A}</span>
            </div>
            
            <div className="flex flex-col items-center px-4 md:px-8 border-x border-zinc-800">
              <span className="text-zinc-500 font-black text-[8px] md:text-xs uppercase tracking-[0.3em] mb-1">Time</span>
              <div className="flex items-baseline space-x-1">
                <span className="text-2xl md:text-5xl font-mono font-black text-emerald-400 tabular-nums">{timeLeft}</span>
                <span className="text-lg md:text-2xl font-mono font-bold text-emerald-600">'</span>
              </div>
              <div className="mt-1 md:mt-2 px-2 md:px-3 py-0.5 bg-zinc-800 rounded-full text-[8px] md:text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                {half === 1 ? '1st' : '2nd'}
              </div>
            </div>

            <div className="flex items-center space-x-2 md:space-x-6">
              <span className="text-3xl md:text-6xl font-black italic tracking-tighter">{score.B}</span>
              <div className="flex flex-col items-center">
                <div className={`w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl flex items-center justify-center font-black text-sm md:text-2xl shadow-[0_0_20px_rgba(220,38,38,0.4)] transform rotate-3 overflow-hidden bg-red-600`}>
                   {opponentName ? opponentName.substring(0, 3).toUpperCase() : 'AI'}
                </div>
                <span className="text-[8px] md:text-xs font-bold text-red-400 mt-1 md:mt-2 uppercase tracking-widest">{opponentName || 'Away'}</span>
              </div>
            </div>
          </div>
        )}

        {mode === 'TRAINING' && (
          <div className="w-full max-w-5xl flex justify-between items-center bg-zinc-900 border border-zinc-800 rounded-t-3xl p-6 shadow-2xl z-10">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-emerald-500/20 rounded-lg">
                <Footprints className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest block">Drill</span>
                <span className="text-lg font-black italic text-white">{drillType || 'FREE PRACTICE'}</span>
              </div>
            </div>
            {drillType === 'SHOOTING' && (
              <div className="flex items-center space-x-8">
                <div className="text-center">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">Accuracy</span>
                  <span className="text-2xl font-black text-emerald-400">{gameState.current.drillStats.hits} Hits</span>
                </div>
              </div>
            )}
            <button 
              onClick={handleFinish}
              className="px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-black rounded-full transition-all transform hover:scale-105 shadow-[0_0_20px_rgba(16,185,129,0.4)] border border-emerald-400/50 flex items-center space-x-2"
            >
              <span>FINISH TRAINING</span>
              <div className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center">
                <span className="text-[10px]">✓</span>
              </div>
            </button>
          </div>
        )}

        {/* Mobile Controls Overlay */}
        {isMobile && matchStateUI === 'playing' && (
          <div className="absolute inset-0 pointer-events-none z-30">
            {/* Joystick */}
            <div 
              className="absolute bottom-12 left-12 w-32 h-32 bg-white/5 rounded-full border border-white/10 backdrop-blur-md pointer-events-auto flex items-center justify-center"
              onTouchStart={handleJoystickStart}
              onTouchMove={handleJoystickMove}
              onTouchEnd={handleJoystickEnd}
            >
              <div 
                className="w-12 h-12 bg-emerald-500 rounded-full shadow-[0_0_20px_rgba(16,185,129,0.5)] transition-transform duration-75"
                style={{ transform: `translate(${joystick.x}px, ${joystick.y}px)` }}
              />
            </div>
            
            {/* Action Buttons (Optional but helpful for clarity) */}
            <div className="absolute bottom-12 right-12 flex flex-col gap-4 pointer-events-auto">
               <div className="flex gap-4">
                  <div className="w-16 h-16 bg-blue-600/80 rounded-full flex items-center justify-center text-white font-black text-xs border border-blue-400/50 backdrop-blur-md shadow-xl active:scale-90 transition-transform"
                       onTouchStart={() => { keys.current['KeyS'] = true; }}
                       onTouchEnd={() => { keys.current['KeyS'] = false; }}>
                     SHOOT
                  </div>
                  <div className="w-16 h-16 bg-amber-600/80 rounded-full flex items-center justify-center text-white font-black text-xs border border-amber-400/50 backdrop-blur-md shadow-xl active:scale-90 transition-transform"
                       onTouchStart={() => { keys.current['KeyC'] = true; }}
                       onTouchEnd={() => { keys.current['KeyC'] = false; }}>
                     PASS
                  </div>
               </div>
               <div className="flex justify-end">
                  <div className="w-14 h-14 bg-rose-600/80 rounded-full flex items-center justify-center text-white font-black text-[10px] border border-rose-400/50 backdrop-blur-md shadow-xl active:scale-90 transition-transform"
                       onTouchStart={() => { keys.current['ShiftLeft'] = true; }}
                       onTouchEnd={() => { keys.current['ShiftLeft'] = false; }}>
                     SPRINT
                  </div>
               </div>
            </div>
          </div>
        )}

        {/* Pitch Container */}
        <div className="w-full max-w-5xl aspect-[10/6] max-h-full bg-zinc-900 border-x border-b border-zinc-800 md:rounded-b-3xl overflow-hidden relative shadow-[0_30px_60px_rgba(0,0,0,0.5)] flex-1 md:flex-none">
          <canvas 
            ref={canvasRef}
            width={PITCH_W}
            height={PITCH_H}
            onClick={handleCanvasClick}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            className="w-full h-full object-contain cursor-crosshair bg-[#14532d] touch-none"
          />
          
          {/* Pause Button */}
          <button 
            onClick={() => setIsPaused(!isPaused)}
            className="absolute top-4 right-4 p-3 bg-black/50 backdrop-blur-md rounded-full border border-white/10 text-white hover:bg-black/70 transition-all z-20"
          >
            {isPaused ? <Play className="w-5 h-5 fill-current" /> : <Timer className="w-5 h-5" />}
          </button>

          {/* Substitution Button */}
          <button 
            onClick={() => { setIsPaused(true); setShowSubMenu(true); }}
            className="absolute top-4 right-20 p-3 bg-emerald-600/80 backdrop-blur-md rounded-full border border-emerald-400/30 text-white hover:bg-emerald-500 transition-all z-20"
          >
            <Users className="w-5 h-5" />
          </button>

          {/* Pause Overlay */}
          {isPaused && !showSubMenu && (
            <div className="absolute inset-0 z-30 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center">
              <h2 className="text-6xl font-black italic text-white mb-8">PAUSED</h2>
              <button 
                onClick={() => setIsPaused(false)}
                className="px-12 py-4 bg-emerald-600 text-white font-black rounded-full hover:bg-emerald-500 transition-all text-xl"
              >
                RESUME MATCH
              </button>
            </div>
          )}

          {/* Substitution Menu */}
          {showSubMenu && (
            <div className="absolute inset-0 z-40 bg-zinc-950/90 backdrop-blur-md p-8 flex flex-col">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-black italic text-white">SUBSTITUTIONS</h2>
                <button onClick={() => { setShowSubMenu(false); setIsPaused(false); }} className="text-zinc-500 hover:text-white">Close</button>
              </div>
              <div className="grid grid-cols-2 gap-8 flex-1 overflow-hidden">
                <div className="space-y-4 overflow-y-auto pr-2">
                  <h3 className="text-zinc-500 font-bold uppercase text-xs tracking-widest">On Pitch</h3>
                  {gameState.current.players.filter(p => p.team === 'A').map(p => (
                    <button 
                      key={p.id}
                      onClick={() => setSelectedSubPlayer(p.playerData)}
                      className={`w-full p-4 rounded-xl border flex items-center justify-between transition-all ${
                        selectedSubPlayer?.id === p.playerData.id ? 'border-emerald-500 bg-emerald-500/10' : 'border-zinc-800 bg-zinc-900 hover:border-zinc-700'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold ${p.isInjured ? 'bg-red-500' : 'bg-zinc-800'}`}>
                          {p.playerData.ovr}
                        </div>
                        <div className="text-left">
                          <p className="font-bold text-sm">{p.playerData.name}</p>
                          <p className={`text-[10px] ${p.isInjured ? 'text-red-400' : 'text-zinc-500'}`}>
                            {p.isInjured ? 'INJURED' : `HP: ${Math.floor(p.health)}%`}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs font-mono text-zinc-600">{p.playerData.position}</span>
                    </button>
                  ))}
                </div>
                <div className="space-y-4 overflow-y-auto pr-2">
                  <h3 className="text-zinc-500 font-bold uppercase text-xs tracking-widest">Bench</h3>
                  {squad.lineup.filter(p => p && !gameState.current.players.some(op => op.playerData.id === p.id)).map(p => p && (
                    <button 
                      key={p.id}
                      onClick={() => {
                        if (selectedSubPlayer) {
                          // Perform substitution
                          const state = gameState.current;
                          const idx = state.players.findIndex(op => op.playerData.id === selectedSubPlayer.id);
                          if (idx !== -1) {
                            const oldPlayer = state.players[idx];
                            state.players[idx] = {
                              ...oldPlayer,
                              playerData: p,
                              health: 100,
                              isInjured: false
                            };
                            addLogEvent(`SUB: ${p.name} replaces ${selectedSubPlayer.name}`);
                            setSelectedSubPlayer(null);
                            setShowSubMenu(false);
                            setIsPaused(false);
                          }
                        }
                      }}
                      className="w-full p-4 rounded-xl border border-zinc-800 bg-zinc-900 hover:border-emerald-500/50 flex items-center justify-between transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center font-bold">
                          {p.ovr}
                        </div>
                        <div className="text-left">
                          <p className="font-bold text-sm">{p.name}</p>
                          <p className="text-[10px] text-zinc-500">READY</p>
                        </div>
                      </div>
                      <span className="text-xs font-mono text-zinc-600">{p.position}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* World Cup Victory Celebration */}
          {matchStateUI === 'finished' && isWorldCup && score.A > score.B && (
            <div className="absolute inset-0 z-[60] bg-black/80 backdrop-blur-lg flex flex-col items-center justify-center text-center p-8 animate-in fade-in duration-1000">
              <div className="relative mb-8">
                <Trophy className="w-48 h-48 text-yellow-400 animate-bounce drop-shadow-[0_0_30px_rgba(250,204,21,0.6)]" />
                <div className="absolute inset-0 bg-yellow-400 blur-3xl opacity-20 animate-pulse" />
              </div>
              <h2 className="text-7xl font-black italic text-white mb-4 tracking-tighter">WORLD CHAMPIONS!</h2>
              <p className="text-2xl text-yellow-400 font-bold mb-12 uppercase tracking-[0.2em]">The world is at your feet</p>
              <button 
                onClick={handleFinish}
                className="px-12 py-4 bg-white text-black font-black rounded-full hover:bg-yellow-400 hover:scale-110 transition-all text-xl shadow-2xl"
              >
                CLAIM THE TROPHY
              </button>
            </div>
          )}
          
          {/* Controls Hint */}
          {matchStateUI === 'playing' && (
            <div className="absolute bottom-6 left-6 bg-black/70 backdrop-blur-xl p-5 rounded-2xl text-white text-xs font-bold border border-white/10 shadow-2xl pointer-events-none space-y-2">
              {isMobile ? (
                <>
                  <div className="flex items-center space-x-3">
                    <div className="w-6 h-6 border-2 border-white/30 rounded-full flex items-center justify-center">
                      <div className="w-1 h-1 bg-white rounded-full" />
                    </div>
                    <span className="text-zinc-400">TAP TO MOVE</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-6 h-2 bg-white/30 rounded-full relative">
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-emerald-400 rounded-full" />
                    </div>
                    <span className="text-zinc-400">SWIPE TO PASS/SHOOT</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center space-x-3">
                    <span className="px-2 py-1 bg-zinc-800 rounded border border-zinc-600 text-[10px]">S</span>
                    <span className="text-zinc-400">SHOOT</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="px-2 py-1 bg-zinc-800 rounded border border-zinc-600 text-[10px]">C</span>
                    <span className="text-zinc-400">PASS / TACKLE</span>
                  </div>
                  <div className="pt-2 border-t border-white/5 text-[10px] text-zinc-500 italic">
                    Click pitch to move player
                  </div>
                </>
              )}
            </div>
          )}

          {/* Match Logs */}
          {matchStateUI === 'playing' && activeLog && (
            <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 bg-black/40 backdrop-blur-md px-8 py-3 rounded-full text-white text-sm font-bold border border-white/10 shadow-2xl pointer-events-none animate-fade-in z-50 flex items-center space-x-3">
               <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
               <span>{activeLog}</span>
            </div>
          )}

          {/* Emotes Display */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {emotes.map(emote => (
              <div 
                key={emote.id}
                className={`absolute transition-all duration-500 animate-bounce ${
                  emote.team === 'A' ? 'left-10 top-1/2' : 'right-10 top-1/2'
                }`}
              >
                <div className="bg-white text-black px-4 py-2 rounded-2xl font-black text-xl shadow-2xl border-2 border-zinc-200">
                  {emote.text}
                </div>
              </div>
            ))}
          </div>

          {/* Emote Controls */}
          {matchStateUI === 'playing' && socket && (
            <div className="absolute right-6 bottom-6 flex flex-col space-y-2">
              {['⚽', '🔥', '👏', '😮', '💀', '👎'].map(emoji => (
                <button
                  key={emoji}
                  onClick={() => sendEmote(emoji)}
                  className="w-10 h-10 bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center text-xl hover:bg-white hover:scale-110 transition-all border border-white/10"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}

          {/* Intro Overlay */}
          {matchStateUI === 'intro' && (
            <div className="absolute inset-0 z-50 bg-black flex flex-col items-center justify-center p-12">
              <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-emerald-500 via-transparent to-transparent" />
              
              <div className="relative z-10 flex flex-col items-center text-center">
                <h2 className="text-7xl font-black italic mb-4 text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-white to-cyan-400 tracking-tighter">
                  MATCH DAY
                </h2>
                <div className="h-1 w-32 bg-emerald-500 mb-12" />
                
                <div className="text-3xl font-black mb-16 text-zinc-300 tracking-widest uppercase">
                  {introStage === 'walking' && "Players Entering Pitch"}
                  {introStage === 'anthem' && "National Anthems"}
                  {introStage === 'warmup' && "Final Preparations"}
                </div>

                <div className="flex items-center space-x-20 mb-16">
                  <div className="flex flex-col items-center group">
                    <div className="w-32 h-32 bg-blue-600 rounded-3xl mb-6 shadow-[0_0_40px_rgba(37,99,235,0.6)] transform -rotate-6 group-hover:rotate-0 transition-transform duration-500 flex items-center justify-center text-4xl font-black text-white">
                      {userTeamName ? userTeamName.substring(0, 3).toUpperCase() : 'YOU'}
                    </div>
                    <span className="text-3xl font-black italic tracking-tight">{userTeamName || 'HOME'}</span>
                  </div>
                  <div className="text-5xl font-black text-zinc-700 italic">VS</div>
                  <div className="flex flex-col items-center group">
                    <div className="w-32 h-32 bg-red-600 rounded-3xl mb-6 shadow-[0_0_40px_rgba(239,68,68,0.6)] transform rotate-6 group-hover:rotate-0 transition-transform duration-500 flex items-center justify-center text-4xl font-black text-white">
                      {opponentName ? opponentName.substring(0, 3).toUpperCase() : 'AI'}
                    </div>
                    <span className="text-3xl font-black italic tracking-tight">{opponentName || 'AWAY'}</span>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3 text-zinc-500 font-black text-sm tracking-[0.2em] uppercase">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                  <span>Kick off in {introTimer}s</span>
                </div>
              </div>
            </div>
          )}

          {/* Halftime Overlay */}
          {matchStateUI === 'halftime' && (
            <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/90 backdrop-blur-2xl p-12">
              <h2 className="text-8xl font-black italic mb-4 tracking-tighter">HALF TIME</h2>
              <div className="text-3xl font-bold text-zinc-400 mb-12">{score.A} - {score.B}</div>
              <button 
                onClick={startSecondHalf}
                className="px-12 py-5 bg-emerald-600 text-white font-black rounded-full hover:bg-emerald-500 transition-all text-2xl shadow-[0_0_30px_rgba(16,185,129,0.4)] hover:scale-105 active:scale-95"
              >
                START SECOND HALF
              </button>
            </div>
          )}

          {/* Extra Time Break Overlay */}
          {matchStateUI === 'extratime_break' && (
            <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/90 backdrop-blur-2xl p-12">
              <h2 className="text-6xl font-black italic mb-4 tracking-tighter">EXTRA TIME</h2>
              <div className="text-3xl font-bold text-zinc-400 mb-12">{score.A} - {score.B}</div>
              <button 
                onClick={half === 2 ? startExtraTime1 : startExtraTime2}
                className="px-12 py-5 bg-emerald-600 text-white font-black rounded-full hover:bg-emerald-500 transition-all text-2xl shadow-[0_0_30px_rgba(16,185,129,0.4)] hover:scale-105 active:scale-95"
              >
                {half === 2 ? 'START EXTRA TIME' : 'START 2ND ET HALF'}
              </button>
            </div>
          )}

          {/* Penalties Overlay */}
          {matchStateUI === 'penalties' && (
            <div className="absolute inset-0 z-40 flex flex-col items-center justify-between py-12 pointer-events-none">
               {/* We use pointer-events-none so clicks go through to canvas for interaction */}
               <div className="bg-zinc-950/90 px-8 py-4 rounded-3xl border border-white/10 backdrop-blur-xl shadow-2xl pointer-events-auto">
                  <h2 className="text-3xl font-black italic text-white mb-2 text-center tracking-tighter">PENALTY SHOOTOUT</h2>
                  <div className="flex items-center space-x-12">
                     <div className="text-center">
                        <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">YOU</div>
                        <div className="text-5xl font-mono font-black text-emerald-400 tabular-nums">{penaltyState.scoreA}</div>
                     </div>
                     <div className="text-3xl font-black text-zinc-700 italic">VS</div>
                     <div className="text-center">
                        <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">AI</div>
                        <div className="text-5xl font-mono font-black text-red-400 tabular-nums">{penaltyState.scoreB}</div>
                     </div>
                  </div>
                  <div className="mt-6 flex justify-center space-x-2">
                     {penaltyState.history.map((h, i) => (
                        <div key={i} className={`w-4 h-4 rounded-full shadow-lg ${h.result === 'goal' ? 'bg-emerald-500 shadow-emerald-500/20' : 'bg-red-500 shadow-red-500/20'}`} />
                     ))}
                     {/* Fill empty slots up to 5 */}
                     {Array.from({ length: Math.max(0, 5 - penaltyState.history.length) }).map((_, i) => (
                        <div key={`empty-${i}`} className="w-4 h-4 rounded-full bg-zinc-800 border border-zinc-700" />
                     ))}
                  </div>
               </div>

               <div className="text-center pointer-events-auto mb-8">
                  {penaltyState.phase === 'aiming' && penaltyState.turn === 'A' && (
                     <div className="bg-emerald-600 px-8 py-4 rounded-2xl text-white font-black text-xl animate-bounce shadow-2xl border border-emerald-400/50">
                        CLICK ON THE GOAL TO SHOOT!
                     </div>
                  )}
                  {penaltyState.phase === 'saving' && penaltyState.turn === 'B' && (
                     <div className="bg-blue-600 px-8 py-4 rounded-2xl text-white font-black text-xl animate-bounce shadow-2xl border border-blue-400/50">
                        CLICK TO DIVE AND SAVE!
                     </div>
                  )}
                  {penaltyState.phase === 'result' && (
                     <div className="text-8xl font-black italic text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.8)] animate-pulse scale-110">
                        {penaltyState.history[penaltyState.history.length-1]?.result === 'goal' ? 'GOAL!' : 'SAVED!'}
                     </div>
                  )}
               </div>
            </div>
          )}

        {matchStateUI === 'finished' && (
          <div className="absolute inset-0 bg-black/95 flex flex-col items-center justify-start backdrop-blur-xl z-[100] p-8 overflow-y-auto">
            <div className="w-full max-w-4xl flex flex-col items-center py-12">
              <h2 className="text-7xl font-black italic mb-4 tracking-tighter text-white">FULL TIME</h2>
              <div className="text-4xl mb-12 font-black">
                {score.A > score.B ? (
                  <span className="text-emerald-400 drop-shadow-[0_0_20px_rgba(52,211,153,0.6)]">VICTORY</span>
                ) : score.A < score.B ? (
                  <span className="text-red-400 drop-shadow-[0_0_20px_rgba(248,113,113,0.6)]">DEFEAT</span>
                ) : (
                  <span className="text-yellow-400 drop-shadow-[0_0_20px_rgba(250,204,21,0.6)]">DRAW</span>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full mb-12">
                 {/* Stats */}
                 <div className="bg-zinc-900/50 p-8 rounded-3xl border border-zinc-800 backdrop-blur-md">
                    <h3 className="text-xl font-bold text-zinc-400 uppercase tracking-widest mb-6">Match Summary</h3>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                         <span className="text-zinc-500 font-medium">Final Score</span>
                         <span className="text-3xl font-mono font-black text-white">{score.A} - {score.B}</span>
                      </div>
                      <div className="h-px bg-zinc-800" />
                      <div className="space-y-2">
                         <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Scorers ({userTeamName || 'You'})</span>
                         <div className="space-y-1">
                           {matchStats.goals.filter(g => g.team === 'A').map((g, i) => (
                             <div key={i} className="flex justify-between items-center text-emerald-400 font-bold">
                               <span>{squad.lineup.find(p => p?.id === g.playerId)?.name || 'Unknown'}</span>
                               <span className="font-mono text-sm">{g.minute}'</span>
                             </div>
                           ))}
                           {matchStats.goals.filter(g => g.team === 'A').length === 0 && <span className="text-zinc-600 italic">No goals scored</span>}
                         </div>
                      </div>
                    </div>
                 </div>

                 {/* MVP */}
                 <div className="bg-zinc-900/50 p-8 rounded-3xl border border-zinc-800 backdrop-blur-md flex flex-col items-center justify-center relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 to-transparent opacity-50" />
                    <Trophy className="w-12 h-12 text-yellow-500 mb-4 animate-bounce-slow" />
                    <h3 className="text-xs font-black text-yellow-500 uppercase tracking-[0.3em] mb-4 relative z-10">Match MVP</h3>
                    {getMVP() ? (
                      <div className="text-center relative z-10">
                        <div className="text-3xl font-black text-white italic mb-1">{getMVP()?.name.toUpperCase()}</div>
                        <div className="px-4 py-1 bg-yellow-500/20 rounded-full border border-yellow-500/30 text-yellow-500 text-sm font-bold">
                          Rating: {matchStats.ratings[getMVP()?.id || '']?.toFixed(1)}
                        </div>
                      </div>
                    ) : (
                      <div className="text-zinc-500 italic">No MVP selected</div>
                    )}
                 </div>
              </div>

              <div className="w-full bg-zinc-900/50 p-10 rounded-3xl border border-zinc-800 text-center mb-12 backdrop-blur-md">
                <p className="text-zinc-500 mb-2 font-bold uppercase tracking-widest text-xs">Match Rewards</p>
                <div className="flex items-center justify-center space-x-4">
                  <div className="w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center text-black font-black">C</div>
                  <p className="text-6xl font-black text-white italic tracking-tighter">
                    +{(score.A > score.B ? 500 : score.A === score.B ? 200 : 100)}
                  </p>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
                {isWorldCup ? (
                   <button 
                     onClick={() => {
                        handleFinish(); // Award coins/xp
                        if (onWorldCupContinue) onWorldCupContinue();
                     }}
                     className="px-12 py-5 bg-blue-600 text-white font-black rounded-2xl hover:bg-blue-500 transition-all text-xl shadow-[0_20px_40px_rgba(37,99,235,0.3)] hover:-translate-y-1 active:translate-y-0"
                   >
                     CONTINUE TO TOURNAMENT
                   </button>
                ) : (
                   <button 
                     onClick={handleFinish}
                     className="px-12 py-5 bg-emerald-600 text-white font-black rounded-2xl hover:bg-emerald-500 transition-all text-xl shadow-[0_20px_40px_rgba(16,185,129,0.3)] hover:-translate-y-1 active:translate-y-0"
                   >
                     CONTINUE
                   </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  </div>
  );
}
