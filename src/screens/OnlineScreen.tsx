import React, { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { Player, Squad } from '../types';
import { Users, Swords, Loader2, Wifi, WifiOff, AlertTriangle } from 'lucide-react';
import MatchScreen from './MatchScreen';

interface Props {
  username: string;
  squad: Squad;
  onMatchComplete: (reward: number, xpGains: Record<string, number>) => void;
}

export default function OnlineScreen({ username, squad, onMatchComplete }: Props) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
  const [challengeFrom, setChallengeFrom] = useState<any | null>(null);
  const [matchState, setMatchState] = useState<{
    status: 'idle' | 'waiting' | 'playing' | 'finished';
    opponent?: any;
    result?: string;
    matchId?: string;
    isHost?: boolean;
  }>({ status: 'idle' });

  useEffect(() => {
    // Connect to the same host, port 3000
    const newSocket = io("https://tfco.onrender.com", {
      reconnectionAttempts: 5,
      timeout: 10000,
    });
    setSocket(newSocket);

    newSocket.on('connect', () => {
      setIsConnected(true);
      newSocket.emit('join', { username, squadOvr: calculateSquadOvr(squad), squad });
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
    });

    newSocket.on('connect_error', () => {
      setIsConnected(false);
    });

    newSocket.on('online_users', (users: any[]) => {
      setOnlineUsers(users.filter(u => u.socketId !== newSocket.id));
    });

    newSocket.on('challenge_received', (challenger: any) => {
      setChallengeFrom(challenger);
    });

    newSocket.on('match_start', ({ matchId, player1, player2 }) => {
      setChallengeFrom(null);
      const isHost = player1.username === username;
      const opponent = isHost ? player2 : player1;
      setMatchState({ status: 'playing', opponent, matchId, isHost });
    });

    newSocket.on('match_end', ({ winnerSocketId }) => {
      const result = winnerSocketId === newSocket.id ? 'WIN' : winnerSocketId === 'DRAW' ? 'DRAW' : 'LOSS';
      setMatchState(prev => ({ ...prev, status: 'finished', result }));
    });

    return () => {
      newSocket.disconnect();
    };
  }, [username, squad]);

  const calculateSquadOvr = (s: Squad) => {
    const players = s.lineup.filter(Boolean) as Player[];
    if (players.length === 0) return 0;
    return Math.round(players.reduce((sum, p) => sum + p.ovr, 0) / players.length);
  };

  const challengeUser = (targetSocketId: string) => {
    if (socket) {
      socket.emit('challenge', targetSocketId);
      setMatchState({ status: 'waiting' });
    }
  };

  const acceptChallenge = () => {
    if (socket && challengeFrom) {
      socket.emit('accept_challenge', challengeFrom.socketId);
    }
  };

  const handleFinish = () => {
    const reward = matchState.result === 'WIN' ? 1000 : matchState.result === 'DRAW' ? 400 : 100;
    const xpGains: Record<string, number> = {};
    
    // Award base XP to all lineup players
    squad.lineup.forEach(p => {
      if (p) xpGains[p.id] = matchState.result === 'WIN' ? 150 : matchState.result === 'DRAW' ? 80 : 40;
    });

    onMatchComplete(reward, xpGains);
    setMatchState({ status: 'idle' });
  };

  if (matchState.status === 'playing' && socket) {
    return (
      <MatchScreen 
        squad={matchState.isHost ? squad : matchState.opponent?.squad}
        opponentSquad={matchState.isHost ? matchState.opponent?.squad : squad}
        opponentName={matchState.isHost ? matchState.opponent?.username : username}
        userTeamName={matchState.isHost ? username : matchState.opponent?.username}
        socket={socket}
        matchId={matchState.matchId}
        isHost={matchState.isHost}
        opponentUsername={matchState.opponent?.username}
        forcedDifficulty="MEDIUM"
        onFinish={(coins, xpGains, scoreA, scoreB) => {
          let winnerSocketId = 'DRAW';
          if (scoreA! > scoreB!) winnerSocketId = matchState.isHost ? socket.id : matchState.opponent.socketId;
          if (scoreB! > scoreA!) winnerSocketId = matchState.isHost ? matchState.opponent.socketId : socket.id;
          
          socket.emit('match_result', { matchId: matchState.matchId, winnerSocketId });
        }}
      />
    );
  }

  if (matchState.status === 'finished') {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-transparent p-8">
        <h2 className="text-6xl font-black italic mb-4">FULL TIME</h2>
        <div className="text-4xl mb-8 font-bold">
          {matchState.result === 'WIN' ? (
            <span className="text-emerald-400">VICTORY</span>
          ) : matchState.result === 'LOSS' ? (
            <span className="text-red-400">DEFEAT</span>
          ) : (
            <span className="text-yellow-400">DRAW</span>
          )}
        </div>
        <div className="bg-zinc-900 p-8 rounded-2xl border border-zinc-800 text-center mb-8">
          <p className="text-zinc-400 mb-2 font-medium">Match Rewards</p>
          <p className="text-4xl font-black text-yellow-500">+{(matchState.result === 'WIN' ? 1000 : matchState.result === 'DRAW' ? 400 : 100)} Coins</p>
        </div>
        <button 
          onClick={handleFinish}
          className="px-10 py-4 bg-blue-600 text-white font-bold rounded-full hover:bg-blue-500 transition-colors text-lg"
        >
          CONTINUE
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-transparent p-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <Users className="w-8 h-8 text-blue-400" />
          <h2 className="text-3xl font-black italic">ONLINE MULTIPLAYER</h2>
        </div>
        <div className={`flex items-center space-x-2 px-4 py-1.5 rounded-full border ${
          isConnected ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400' : 'bg-red-500/10 border-red-500/50 text-red-400'
        }`}>
          {isConnected ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
          <span className="text-xs font-bold uppercase tracking-widest">
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>

      {!isConnected && window.location.hostname.includes('vercel.app') && (
        <div className="bg-amber-950/40 border border-amber-500/50 p-4 rounded-xl mb-8 flex items-start space-x-4">
          <AlertTriangle className="w-6 h-6 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-amber-400 mb-1">Vercel Deployment Limitation</h3>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Online Multiplayer requires a persistent WebSocket server. Vercel's serverless architecture does not support persistent connections. 
              To play online, this app needs to be deployed on a platform like <span className="text-white font-bold">Railway, Render, or a VPS</span>.
            </p>
          </div>
        </div>
      )}

      {challengeFrom && (
        <div className="bg-blue-900/30 border border-blue-500 p-6 rounded-2xl mb-8 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-blue-400 mb-1">Incoming Challenge!</h3>
            <p className="text-zinc-300">{challengeFrom.username} (OVR: {challengeFrom.squadOvr}) wants to play.</p>
          </div>
          <div className="flex space-x-4">
            <button onClick={() => setChallengeFrom(null)} className="px-6 py-2 bg-zinc-800 rounded-full font-bold hover:bg-zinc-700">Decline</button>
            <button onClick={acceptChallenge} className="px-6 py-2 bg-blue-600 rounded-full font-bold hover:bg-blue-500">Accept</button>
          </div>
        </div>
      )}

      {matchState.status === 'waiting' && (
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl mb-8 flex items-center justify-center space-x-4">
          <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
          <span className="font-medium">Waiting for opponent to accept...</span>
          <button onClick={() => setMatchState({ status: 'idle' })} className="ml-4 text-sm text-zinc-500 hover:text-white">Cancel</button>
        </div>
      )}

      <div className="flex-1 bg-zinc-900/60 backdrop-blur-md border border-zinc-800 rounded-2xl overflow-hidden flex flex-col">
        <div className="p-4 border-b border-zinc-800 bg-zinc-950/50">
          <h3 className="font-bold text-zinc-400">Online Managers ({onlineUsers.length})</h3>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {onlineUsers.length === 0 ? (
            <div className="text-center text-zinc-500 mt-8">No other managers online right now.</div>
          ) : (
            onlineUsers.map(user => (
              <div key={user.socketId} className="flex items-center justify-between bg-zinc-950 p-4 rounded-xl border border-zinc-800/50">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-zinc-800 rounded-full flex items-center justify-center font-bold text-blue-400">
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-bold">{user.username}</div>
                    <div className="text-xs text-zinc-500 font-mono">OVR: {user.squadOvr}</div>
                  </div>
                </div>
                <button 
                  onClick={() => challengeUser(user.socketId)}
                  disabled={user.status !== 'idle' || matchState.status !== 'idle'}
                  className="px-4 py-2 bg-zinc-800 hover:bg-blue-600 text-white font-bold rounded-lg transition-colors disabled:opacity-50 flex items-center space-x-2"
                >
                  <Swords className="w-4 h-4" />
                  <span>{user.status === 'idle' ? 'Challenge' : 'In Match'}</span>
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
