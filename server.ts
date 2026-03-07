import express from 'express';
import { createServer as createViteServer } from 'vite';
import { Server } from 'socket.io';
import http from 'http';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;

// Initialize SQLite Database
const db = new Database('fcweb.db');
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    teamName TEXT DEFAULT 'My Team',
    teamLogo TEXT DEFAULT 'https://ui-avatars.com/api/?name=MT&background=random',
    coins INTEGER DEFAULT 1000,
    inventory TEXT DEFAULT '[]',
    squad TEXT DEFAULT '{"formation":"4-3-3","lineup":[]}'
  )
`);

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: { origin: '*' }
  });

  app.use(express.json());

  // API Routes
  app.post('/api/login', (req, res) => {
    const { username } = req.body;
    if (!username) return res.status(400).json({ error: 'Username required' });

    let user = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as any;
    if (!user) {
      const info = db.prepare('INSERT INTO users (username) VALUES (?)').run(username);
      user = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);
    }
    
    res.json({
      id: user.id,
      username: user.username,
      teamName: user.teamName,
      teamLogo: user.teamLogo,
      coins: user.coins,
      inventory: JSON.parse(user.inventory || '[]'),
      squad: JSON.parse(user.squad || '{"formation":"4-3-3","lineup":[]}')
    });
  });

  app.post('/api/save', (req, res) => {
    const { username, teamName, teamLogo, coins, inventory, squad } = req.body;
    if (!username) return res.status(400).json({ error: 'Username required' });

    db.prepare('UPDATE users SET teamName = ?, teamLogo = ?, coins = ?, inventory = ?, squad = ? WHERE username = ?')
      .run(teamName || 'My Team', teamLogo || '', coins, JSON.stringify(inventory), JSON.stringify(squad), username);
    
    res.json({ success: true });
  });

  // Socket.io for Online Multiplayer
  const onlineUsers = new Map<string, any>();

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join', (userData) => {
      onlineUsers.set(socket.id, { ...userData, socketId: socket.id, status: 'idle' });
      io.emit('online_users', Array.from(onlineUsers.values()));
    });

    socket.on('challenge', (targetSocketId) => {
      const challenger = onlineUsers.get(socket.id);
      if (challenger && onlineUsers.has(targetSocketId)) {
        io.to(targetSocketId).emit('challenge_received', challenger);
      }
    });

    socket.on('accept_challenge', (challengerSocketId) => {
      const target = onlineUsers.get(socket.id);
      const challenger = onlineUsers.get(challengerSocketId);
      if (target && challenger) {
        target.status = 'playing';
        challenger.status = 'playing';
        io.emit('online_users', Array.from(onlineUsers.values()));
        
        // Start match
        const matchId = `match_${Date.now()}`;
        socket.join(matchId);
        io.sockets.sockets.get(challengerSocketId)?.join(matchId);
        
        io.to(matchId).emit('match_start', {
          matchId,
          player1: challenger,
          player2: target
        });
      }
    });

    socket.on('match_result', ({ matchId, winnerSocketId }) => {
      // Handle rewards on client side for now, just end match
      io.to(matchId).emit('match_end', { winnerSocketId });
      
      // Reset status
      const user = onlineUsers.get(socket.id);
      if (user) user.status = 'idle';
      io.emit('online_users', Array.from(onlineUsers.values()));
    });

    // Real-time Game State Relay
    socket.on('game_state_update', ({ matchId, state }) => {
      socket.to(matchId).emit('remote_state_update', state);
    });

    socket.on('game_action', ({ matchId, action }) => {
      socket.to(matchId).emit('remote_action', action);
    });

    socket.on('disconnect', () => {
      onlineUsers.delete(socket.id);
      io.emit('online_users', Array.from(onlineUsers.values()));
      console.log('User disconnected:', socket.id);
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  server.listen(PORT as number, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();