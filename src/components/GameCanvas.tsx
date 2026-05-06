import React, { useEffect, useRef, useState } from 'react';
import { socketService } from '@/src/services/socketService';
import { GameState, InputState, Player } from '@/src/types';

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const PLAYER_SIZE = 40;

interface GameCanvasProps {
  myId: string;
  onGameOver: (winnerId: string, reason?: string) => void;
}

const POKEMON_SPRITES: Record<string, string> = {
  pikachu: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/25.gif',
  charmander: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/4.gif',
  bulbasaur: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/1.gif',
  squirtle: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/7.gif',
};

export const GameCanvas: React.FC<GameCanvasProps> = ({ myId, onGameOver }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameStateRef = useRef<GameState | null>(null);
  const inputRef = useRef<InputState>({
    up: false,
    down: false,
    left: false,
    right: false,
    shoot: false,
    angle: 0,
  });
  const spriteCache = useRef<Record<string, HTMLImageElement>>({});

  useEffect(() => {
    const socket = socketService.getSocket();
    if (!socket) return;

    socket.on('state_update', (state: GameState) => {
      gameStateRef.current = state;
    });

    socket.on('game_over', (data: { winnerId: string, reason?: string }) => {
      onGameOver(data.winnerId, data.reason);
    });

    return () => {
      socket.off('state_update');
      socket.off('game_over');
    };
  }, [onGameOver]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key.toLowerCase()) {
        case 'w':
        case 'arrowup': inputRef.current.up = true; break;
        case 's':
        case 'arrowdown': inputRef.current.down = true; break;
        case 'a':
        case 'arrowleft': inputRef.current.left = true; break;
        case 'd':
        case 'arrowright': inputRef.current.right = true; break;
        case ' ': inputRef.current.shoot = true; break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      switch (e.key.toLowerCase()) {
        case 'w':
        case 'arrowup': inputRef.current.up = false; break;
        case 's':
        case 'arrowdown': inputRef.current.down = false; break;
        case 'a':
        case 'arrowleft': inputRef.current.left = false; break;
        case 'd':
        case 'arrowright': inputRef.current.right = false; break;
        case ' ': inputRef.current.shoot = false; break;
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const myPlayer = gameStateRef.current?.players.find(p => p.id === myId);
      if (myPlayer) {
        inputRef.current.angle = Math.atan2(mouseY - myPlayer.y, mouseX - myPlayer.x);
      }
    };

    const handleMouseDown = () => { inputRef.current.shoot = true; };
    const handleMouseUp = () => { inputRef.current.shoot = false; };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [myId]);

  useEffect(() => {
    let animationFrameId: number;
    const socket = socketService.getSocket();

    const render = () => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) return;

      // Send input
      socket?.emit('player_input', inputRef.current);

      // Clear canvas
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Draw background (Grass)
      ctx.fillStyle = '#4CAF50';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      
      // Draw Grid
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 1;
      for (let x = 0; x < CANVAS_WIDTH; x += 50) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, CANVAS_HEIGHT);
        ctx.stroke();
      }
      for (let y = 0; y < CANVAS_HEIGHT; y += 50) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(CANVAS_WIDTH, y);
        ctx.stroke();
      }

      const state = gameStateRef.current;
      if (state) {
        // Draw bullets
        ctx.fillStyle = '#FFEB3B';
        state.bullets.forEach(bullet => {
          ctx.beginPath();
          ctx.arc(bullet.x, bullet.y, 5, 0, Math.PI * 2);
          ctx.fill();
        });

        // Draw players
        state.players.forEach(player => {
          // Draw HP Bar
          const hpWidth = (player.hp / 100) * 50;
          ctx.fillStyle = 'rgba(0,0,0,0.5)';
          ctx.fillRect(player.x - 25, player.y - 45, 50, 6);
          ctx.fillStyle = player.hp > 30 ? '#4CAF50' : '#F44336';
          ctx.fillRect(player.x - 25, player.y - 45, hpWidth, 6);

          // Draw Sprite
          const spriteUrl = POKEMON_SPRITES[player.pokemon] || POKEMON_SPRITES.pikachu;
          if (!spriteCache.current[spriteUrl]) {
            const img = new Image();
            img.src = spriteUrl;
            spriteCache.current[spriteUrl] = img;
          }
          
          const img = spriteCache.current[spriteUrl];
          if (img.complete) {
            ctx.save();
            ctx.translate(player.x, player.y);
            // Flip if looking left
            if (player.angle > Math.PI / 2 || player.angle < -Math.PI / 2) {
               ctx.scale(-1, 1);
            }
            ctx.drawImage(img, -PLAYER_SIZE/2 - 10, -PLAYER_SIZE/2 - 10, PLAYER_SIZE + 20, PLAYER_SIZE + 20);
            ctx.restore();
          } else {
             // Fallback circle
             ctx.fillStyle = player.id === myId ? '#2196F3' : '#FF5722';
             ctx.beginPath();
             ctx.arc(player.x, player.y, PLAYER_SIZE / 2, 0, Math.PI * 2);
             ctx.fill();
          }

          // Draw Direction Indicator
          ctx.strokeStyle = 'white';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(player.x, player.y);
          ctx.lineTo(
            player.x + Math.cos(player.angle) * 30,
            player.y + Math.sin(player.angle) * 30
          );
          ctx.stroke();
        });
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationFrameId);
  }, [myId]);

  return (
    <div className="relative border-8 border-yellow-400 rounded-xl overflow-hidden shadow-2xl">
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="bg-black cursor-crosshair"
      />
    </div>
  );
};
