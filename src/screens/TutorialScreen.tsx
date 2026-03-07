import React, { useEffect, useRef, useState } from 'react';
import { Player } from '../types';

interface Props {
  onComplete: () => void;
}

const PITCH_W = 800;
const PITCH_H = 500;
const PLAYER_RADIUS = 12;
const BALL_RADIUS = 6;

export default function TutorialScreen({ onComplete }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [step, setStep] = useState<'WELCOME' | 'DRIBBLE' | 'SHOOT' | 'PASS' | 'COMPLETE'>('WELCOME');
  const [message, setMessage] = useState("Welcome to the Training Ground!");
  
  const gameState = useRef({
    player: { x: PITCH_W/2, y: PITCH_H/2, vx: 0, vy: 0 },
    ball: { x: PITCH_W/2 + 20, y: PITCH_H/2, vx: 0, vy: 0 },
    teammate: { x: PITCH_W - 100, y: PITCH_H/2 - 100, active: false },
    target: { x: PITCH_W - 50, y: PITCH_H/2, active: false }, // Goal target
    dribbleDist: 0,
    hasBall: false
  });

  const mouseTarget = useRef<{x: number, y: number} | null>(null);
  const keys = useRef<{ [key: string]: boolean }>({});

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { keys.current[e.code] = true; };
    const handleKeyUp = (e: KeyboardEvent) => { keys.current[e.code] = false; };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useEffect(() => {
    if (step === 'WELCOME') {
      setMessage("Welcome Manager! Let's learn the basics. Click 'Start' to begin.");
    } else if (step === 'DRIBBLE') {
      setMessage("DRIBBLE: Click on the pitch to move your player. Cover some distance!");
      gameState.current.dribbleDist = 0;
    } else if (step === 'SHOOT') {
      setMessage("SHOOTING: Dribble towards the goal (Right side) and press S to shoot!");
      gameState.current.target.active = true;
      gameState.current.teammate.active = false;
    } else if (step === 'PASS') {
      setMessage("PASSING: A teammate has appeared! Aim at them and press C to pass.");
      gameState.current.target.active = false;
      gameState.current.teammate.active = true;
      // Reset positions
      gameState.current.player.x = 100;
      gameState.current.player.y = PITCH_H/2;
      gameState.current.ball.x = 120;
      gameState.current.ball.y = PITCH_H/2;
      gameState.current.ball.vx = 0;
      gameState.current.ball.vy = 0;
    } else if (step === 'COMPLETE') {
      setMessage("Training Complete! You are ready for your first match.");
    }
  }, [step]);

  useEffect(() => {
    let animationFrameId: number;
    
    const update = () => {
      const state = gameState.current;
      const { player, ball, teammate, target } = state;

      // Player Movement
      if (mouseTarget.current) {
        const dx = mouseTarget.current.x - player.x;
        const dy = mouseTarget.current.y - player.y;
        const dist = Math.hypot(dx, dy);
        
        if (dist > 5) {
          const angle = Math.atan2(dy, dx);
          const speed = 4.5;
          player.vx += Math.cos(angle) * speed * 0.15;
          player.vy += Math.sin(angle) * speed * 0.15;
        } else {
          mouseTarget.current = null;
        }
      }

      player.vx *= 0.94;
      player.vy *= 0.94;
      player.x += player.vx;
      player.y += player.vy;

      // Bounds
      player.x = Math.max(PLAYER_RADIUS, Math.min(PITCH_W - PLAYER_RADIUS, player.x));
      player.y = Math.max(PLAYER_RADIUS, Math.min(PITCH_H - PLAYER_RADIUS, player.y));

      // Ball Physics
      const distToBall = Math.hypot(ball.x - player.x, ball.y - player.y);
      state.hasBall = distToBall < PLAYER_RADIUS + BALL_RADIUS + 5;

      if (state.hasBall) {
        // Dribble
        const angle = Math.atan2(player.vy, player.vx) || 0;
        ball.x = player.x + Math.cos(angle) * 20;
        ball.y = player.y + Math.sin(angle) * 20;
        ball.vx = player.vx;
        ball.vy = player.vy;

        if (step === 'DRIBBLE') {
          state.dribbleDist += Math.hypot(player.vx, player.vy);
          if (state.dribbleDist > 500) {
            setStep('SHOOT');
          }
        }

        // Shoot/Pass
        if (keys.current['KeyS'] || keys.current['KeyC']) {
          const shootAngle = Math.atan2(mouseTarget.current ? mouseTarget.current.y - player.y : player.vy, mouseTarget.current ? mouseTarget.current.x - player.x : player.vx || 1);
          const power = 12;
          ball.vx = Math.cos(shootAngle) * power;
          ball.vy = Math.sin(shootAngle) * power;
          state.hasBall = false;
          keys.current['KeyS'] = false; 
          keys.current['KeyC'] = false; // Debounce
        }
      } else {
        ball.x += ball.vx;
        ball.y += ball.vy;
        ball.vx *= 0.98;
        ball.vy *= 0.98;
      }

      // Check Goals/Passes
      if (step === 'SHOOT' && ball.x > PITCH_W - 50 && Math.abs(ball.y - PITCH_H/2) < 100) {
        setStep('PASS');
      }

      if (step === 'PASS' && teammate.active) {
        const distToTeammate = Math.hypot(ball.x - teammate.x, ball.y - teammate.y);
        if (distToTeammate < 30) {
          setStep('COMPLETE');
        }
      }
    };

    const draw = (ctx: CanvasRenderingContext2D) => {
      ctx.clearRect(0, 0, PITCH_W, PITCH_H);
      
      // Pitch
      ctx.fillStyle = '#166534';
      ctx.fillRect(0, 0, PITCH_W, PITCH_H);
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.strokeRect(50, 50, PITCH_W-100, PITCH_H-100);

      const { player, ball, teammate, target } = gameState.current;

      // Teammate
      if (teammate.active) {
        ctx.beginPath();
        ctx.arc(teammate.x, teammate.y, PLAYER_RADIUS, 0, Math.PI*2);
        ctx.fillStyle = '#2563eb';
        ctx.fill();
        ctx.fillStyle = 'white';
        ctx.fillText('Teammate', teammate.x - 20, teammate.y - 15);
      }

      // Goal Target
      if (target.active) {
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(PITCH_W, PITCH_H/2 - 50);
        ctx.lineTo(PITCH_W, PITCH_H/2 + 50);
        ctx.stroke();
      }

      // Player
      ctx.beginPath();
      ctx.arc(player.x, player.y, PLAYER_RADIUS, 0, Math.PI*2);
      ctx.fillStyle = '#10b981';
      ctx.fill();
      
      // Ball
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, BALL_RADIUS, 0, Math.PI*2);
      ctx.fillStyle = 'white';
      ctx.fill();

      // Mouse Target
      if (mouseTarget.current) {
        ctx.beginPath();
        ctx.arc(mouseTarget.current.x, mouseTarget.current.y, 4, 0, Math.PI*2);
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.fill();
      }
    };

    const loop = () => {
      update();
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) draw(ctx);
      }
      animationFrameId = requestAnimationFrame(loop);
    };
    loop();

    return () => cancelAnimationFrame(animationFrameId);
  }, [step]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      mouseTarget.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full bg-zinc-950 p-4">
      <h2 className="text-3xl font-bold text-emerald-400 mb-4">TRAINING SESSION</h2>
      <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 mb-4 text-center max-w-2xl">
        <p className="text-xl text-white mb-2">{message}</p>
        {step === 'WELCOME' && (
          <button 
            onClick={() => setStep('DRIBBLE')}
            className="px-6 py-2 bg-emerald-600 text-white rounded-full font-bold hover:bg-emerald-500"
          >
            START TRAINING
          </button>
        )}
        {step === 'COMPLETE' && (
          <button 
            onClick={onComplete}
            className="px-6 py-2 bg-emerald-600 text-white rounded-full font-bold hover:bg-emerald-500 animate-pulse"
          >
            FINISH & CLAIM REWARD
          </button>
        )}
      </div>
      
      <canvas 
        ref={canvasRef}
        width={PITCH_W}
        height={PITCH_H}
        onClick={handleCanvasClick}
        className="bg-green-800 rounded-lg shadow-2xl cursor-crosshair border-4 border-zinc-800"
      />
      
      <div className="mt-4 text-zinc-500 text-sm">
        Controls: Click to Move • S to Shoot • C to Pass
      </div>
    </div>
  );
}
