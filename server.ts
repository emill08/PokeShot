import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const TICK_RATE = 20; // 20 updates per second
const TICK_DURATION = 1000 / TICK_RATE;

// Game constants
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const PLAYER_SIZE = 40;
const PLAYER_SPEED = 5;
const BULLET_SPEED = 10;
const BULLET_RADIUS = 5;
const BULLET_COOLDOWN = 300; // ms
const DAMAGE = 10;

interface Player {
  id: string;
  x: number;
  y: number;
  hp: number;
  angle: number;
  lastShot: number;
  room: string;
  pokemon: string;
  isBot?: boolean;
}

interface Bullet {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  ownerId: string;
}

interface Room {
  id: string;
  players: string[]; // socket IDs
  state: 'waiting' | 'playing' | 'game_over';
  bullets: Bullet[];
  isBotGame?: boolean;
}

const players: Record<string, Player> = {};
const rooms: Record<string, Room> = {};

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
    }
  });

  // Game Loop
  setInterval(() => {
    updateGameState();
  }, TICK_DURATION);

  function updateGameState() {
    for (const roomId in rooms) {
      const room = rooms[roomId];
      if (room.state !== 'playing') continue;

      // Bot Logic
      if (room.isBotGame) {
        const botId = room.players.find(pid => players[pid]?.isBot);
        const playerId = room.players.find(pid => !players[pid]?.isBot);
        
        if (botId && playerId) {
          const bot = players[botId];
          const player = players[playerId];

          // Move bot towards player but keep distance
          const dx = player.x - bot.x;
          const dy = player.y - bot.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          
          bot.angle = Math.atan2(dy, dx);

          if (dist > 200) {
            bot.x += Math.cos(bot.angle) * (PLAYER_SPEED * 0.6);
            bot.y += Math.sin(bot.angle) * (PLAYER_SPEED * 0.6);
          } else if (dist < 150) {
            bot.x -= Math.cos(bot.angle) * (PLAYER_SPEED * 0.6);
            bot.y -= Math.sin(bot.angle) * (PLAYER_SPEED * 0.6);
          }

          // Random strafe
          bot.y += Math.sin(Date.now() / 500) * 2;

          // Shooting logic for bot
          const now = Date.now();
          if (now - bot.lastShot > BULLET_COOLDOWN * 2.5) {
            const bulletId = Math.random().toString(36).substring(7);
            room.bullets.push({
              id: bulletId,
              x: bot.x + Math.cos(bot.angle) * (PLAYER_SIZE / 2 + 5),
              y: bot.y + Math.sin(bot.angle) * (PLAYER_SIZE / 2 + 5),
              vx: Math.cos(bot.angle) * BULLET_SPEED,
              vy: Math.sin(bot.angle) * BULLET_SPEED,
              ownerId: botId
            });
            bot.lastShot = now;
          }

          // Bound check
          bot.x = Math.max(PLAYER_SIZE / 2, Math.min(CANVAS_WIDTH - PLAYER_SIZE / 2, bot.x));
          bot.y = Math.max(PLAYER_SIZE / 2, Math.min(CANVAS_HEIGHT - PLAYER_SIZE / 2, bot.y));
        }
      }

      // Update bullets
      for (let i = room.bullets.length - 1; i >= 0; i--) {
        const bullet = room.bullets[i];
        bullet.x += bullet.vx;
        bullet.y += bullet.vy;

        // Wall collision
        if (bullet.x < 0 || bullet.x > CANVAS_WIDTH || bullet.y < 0 || bullet.y > CANVAS_HEIGHT) {
          room.bullets.splice(i, 1);
          continue;
        }

        // Player collision
        for (const playerId of room.players) {
          const player = players[playerId];
          if (!player || playerId === bullet.ownerId) continue;

          const dx = bullet.x - player.x;
          const dy = bullet.y - player.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < PLAYER_SIZE / 2 + BULLET_RADIUS) {
            player.hp -= DAMAGE;
            room.bullets.splice(i, 1);
            
            if (player.hp <= 0) {
              room.state = 'game_over';
              io.to(room.id).emit('game_over', { winnerId: bullet.ownerId });
            }
            break;
          }
        }
      }

      // Prepare state update
      const roomPlayers = room.players.map(pid => players[pid]);
      io.to(room.id).emit('state_update', {
        players: roomPlayers,
        bullets: room.bullets,
        timestamp: Date.now()
      });
    }
  }

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('start_bot_game', (data) => {
      const roomId = 'bot-' + Math.random().toString(36).substring(7);
      const botId = 'bot-' + Math.random().toString(36).substring(7);
      
      rooms[roomId] = {
        id: roomId,
        players: [socket.id, botId],
        state: 'playing',
        bullets: [],
        isBotGame: true
      };

      players[socket.id] = {
        id: socket.id,
        x: 100,
        y: CANVAS_HEIGHT / 2,
        hp: 100,
        angle: 0,
        lastShot: 0,
        room: roomId,
        pokemon: data.pokemon || 'pikachu'
      };

      players[botId] = {
        id: botId,
        x: CANVAS_WIDTH - 100,
        y: CANVAS_HEIGHT / 2,
        hp: 100,
        angle: Math.PI,
        lastShot: 0,
        room: roomId,
        pokemon: ['charmander', 'bulbasaur', 'squirtle'][Math.floor(Math.random() * 3)],
        isBot: true
      };

      socket.join(roomId);
      socket.emit('room_joined', { roomId, playerId: socket.id });
      io.to(roomId).emit('game_start', { players: [players[socket.id], players[botId]] });
      console.log('Bot game started in room:', roomId);
    });

    socket.on('create_room', (data) => {
      const roomId = Math.random().toString(36).substring(7);
      rooms[roomId] = {
        id: roomId,
        players: [socket.id],
        state: 'waiting',
        bullets: []
      };
      players[socket.id] = {
        id: socket.id,
        x: 100,
        y: CANVAS_HEIGHT / 2,
        hp: 100,
        angle: 0,
        lastShot: 0,
        room: roomId,
        pokemon: data.pokemon || 'pikachu'
      };
      socket.join(roomId);
      socket.emit('room_joined', { roomId, playerId: socket.id });
      console.log('Room created:', roomId);
    });

    socket.on('join_room', (data) => {
      const { roomId, pokemon } = data;
      const room = rooms[roomId];
      if (room && room.players.length < 2) {
        room.players.push(socket.id);
        players[socket.id] = {
          id: socket.id,
          x: CANVAS_WIDTH - 100,
          y: CANVAS_HEIGHT / 2,
          hp: 100,
          angle: Math.PI,
          lastShot: 0,
          room: roomId,
          pokemon: pokemon || 'charmander'
        };
        socket.join(roomId);
        socket.emit('room_joined', { roomId, playerId: socket.id });
        
        if (room.players.length === 2) {
          room.state = 'playing';
          io.to(roomId).emit('game_start', { players: room.players.map(pid => players[pid]) });
        }
      } else {
        socket.emit('error', 'Room full or does not exist');
      }
    });

    socket.on('player_input', (input) => {
      const player = players[socket.id];
      if (!player) return;
      const room = rooms[player.room];
      if (!room || room.state !== 'playing') return;

      // Handle movement
      if (input.up) player.y -= PLAYER_SPEED;
      if (input.down) player.y += PLAYER_SPEED;
      if (input.left) player.x -= PLAYER_SPEED;
      if (input.right) player.x += PLAYER_SPEED;

      // Constrain position
      player.x = Math.max(PLAYER_SIZE / 2, Math.min(CANVAS_WIDTH - PLAYER_SIZE / 2, player.x));
      player.y = Math.max(PLAYER_SIZE / 2, Math.min(CANVAS_HEIGHT - PLAYER_SIZE / 2, player.y));

      player.angle = input.angle || player.angle;

      // Handle shooting
      if (input.shoot) {
        const now = Date.now();
        if (now - player.lastShot > BULLET_COOLDOWN) {
          const bulletId = Math.random().toString(36).substring(7);
          room.bullets.push({
            id: bulletId,
            x: player.x + Math.cos(player.angle) * (PLAYER_SIZE / 2 + 5),
            y: player.y + Math.sin(player.angle) * (PLAYER_SIZE / 2 + 5),
            vx: Math.cos(player.angle) * BULLET_SPEED,
            vy: Math.sin(player.angle) * BULLET_SPEED,
            ownerId: socket.id
          });
          player.lastShot = now;
        }
      }
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
      const player = players[socket.id];
      if (player) {
        const room = rooms[player.room];
        if (room) {
          room.players = room.players.filter(pid => pid !== socket.id);
          if (room.players.length === 0) {
            delete rooms[player.room];
          } else {
            room.state = 'game_over';
            io.to(room.id).emit('game_over', { winnerId: room.players[0], reason: 'opponent_disconnected' });
          }
        }
        delete players[socket.id];
      }
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
