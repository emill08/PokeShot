import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { socketService } from './services/socketService';
import { Lobby } from './components/Lobby';
import { GameCanvas } from './components/GameCanvas';
import { Copy, RefreshCcw, Wifi, WifiOff } from 'lucide-react';

type AppState = 'lobby' | 'waiting' | 'playing' | 'game_over';

export default function App() {
  const [gameState, setGameState] = useState<AppState>('lobby');
  const [roomId, setRoomId] = useState('');
  const [playerId, setPlayerId] = useState('');
  const [winner, setWinner] = useState<{ id: string, reason?: string } | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const socket = socketService.connect();

    socket.on('connect', () => setIsConnected(true));
    socket.on('disconnect', () => setIsConnected(false));

    socket.on('room_joined', (data: { roomId: string, playerId: string }) => {
      setRoomId(data.roomId);
      setPlayerId(data.playerId);
      setGameState('waiting');
    });

    socket.on('game_start', () => {
      setGameState('playing');
    });

    socket.on('error', (msg: string) => {
      alert(msg);
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('room_joined');
      socket.off('game_start');
    };
  }, []);

  const handleCreateRoom = (pokemon: string) => {
    socketService.getSocket()?.emit('create_room', { pokemon });
  };

  const handleJoinRoom = (rid: string, pokemon: string) => {
    if (rid === 'vs-bot') {
      socketService.getSocket()?.emit('start_bot_game', { pokemon });
    } else {
      socketService.getSocket()?.emit('join_room', { roomId: rid, pokemon });
    }
  };

  const handleGameOver = (winnerId: string, reason?: string) => {
    setWinner({ id: winnerId, reason });
    setGameState('game_over');
  };

  const resetGame = () => {
    window.location.reload();
  };

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId);
  };

  return (
    <div className="min-h-screen bg-[#1a1a1a] flex flex-col items-center justify-center font-sans text-white p-4 selection:bg-yellow-400 selection:text-black">
      {/* Network Status */}
      <div className="absolute top-6 right-6">
        {isConnected ? (
          <div className="flex items-center gap-2 text-green-400 text-xs font-bold uppercase tracking-widest bg-green-400/10 px-3 py-1.5 rounded-full border border-green-400/20">
            <Wifi className="w-3 h-3" /> Online
          </div>
        ) : (
          <div className="flex items-center gap-2 text-red-400 text-xs font-bold uppercase tracking-widest bg-red-400/10 px-3 py-1.5 rounded-full border border-red-400/20">
            <WifiOff className="w-3 h-3" /> Offline
          </div>
        )}
      </div>

      <AnimatePresence mode="wait">
        {gameState === 'lobby' && (
          <Lobby key="lobby" onCreate={handleCreateRoom} onJoin={handleJoinRoom} />
        )}

        {gameState === 'waiting' && (
          <motion.div
            key="waiting"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            className="text-center"
          >
            <div className="bg-white/10 backdrop-blur-md p-10 rounded-3xl border border-white/20 shadow-2xl">
              <div className="flex justify-center mb-6">
                <RefreshCcw className="w-16 h-16 text-yellow-400 animate-spin-slow" />
              </div>
              <h2 className="text-3xl font-black mb-2 uppercase italic">Waiting for Opponent...</h2>
              <div 
                onClick={copyRoomId}
                className="mt-6 p-4 bg-black/40 rounded-2xl flex items-center justify-between gap-4 cursor-pointer hover:bg-black/60 transition-colors group border border-white/10"
              >
                <div>
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest text-left mb-1">Room ID</p>
                  <p className="font-mono text-xl text-yellow-400 tracking-wider font-bold">{roomId}</p>
                </div>
                <Copy className="w-5 h-5 text-gray-500 group-hover:text-yellow-400 transition-colors" />
              </div>
              <p className="mt-6 text-sm text-gray-400 font-medium">Send this ID to your friend to start the duel</p>
            </div>
          </motion.div>
        )}

        {gameState === 'playing' && (
          <motion.div
            key="playing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center"
          >
            <div className="mb-6 flex items-center justify-between w-full px-4">
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-tighter text-yellow-400">Battle Mode</span>
                <span className="text-2xl font-black uppercase italic tracking-widest">DUEL IN PROGRESS</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-black uppercase tracking-tighter text-gray-500">Arena ID</span>
                <span className="block font-mono text-xs text-gray-400 font-bold">#{roomId}</span>
              </div>
            </div>
            
            <GameCanvas myId={playerId} onGameOver={handleGameOver} />
            
            <div className="mt-8 flex gap-8">
               <div className="flex items-center gap-3 bg-black/40 px-4 py-2 rounded-xl border border-white/10">
                  <span className="text-xs font-black uppercase tracking-widest text-gray-500">Move</span>
                  <div className="flex gap-1.5">
                    <span className="bg-white/10 px-2 py-1 rounded text-[10px] font-bold">W</span>
                    <span className="bg-white/10 px-2 py-1 rounded text-[10px] font-bold">A</span>
                    <span className="bg-white/10 px-2 py-1 rounded text-[10px] font-bold">S</span>
                    <span className="bg-white/10 px-2 py-1 rounded text-[10px] font-bold">D</span>
                  </div>
               </div>
               <div className="flex items-center gap-3 bg-black/40 px-4 py-2 rounded-xl border border-white/10">
                  <span className="text-xs font-black uppercase tracking-widest text-gray-500">Shoot</span>
                  <div className="flex gap-1.5">
                    <span className="bg-white/10 px-2 py-1 rounded text-[10px] font-bold">SPACE</span>
                    <span className="text-gray-600 text-[10px] font-bold">or</span>
                    <span className="bg-white/10 px-2 py-1 rounded text-[10px] font-bold">CLICK</span>
                  </div>
               </div>
            </div>
          </motion.div>
        )}

        {gameState === 'game_over' && (
          <motion.div
            key="game_over"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <div className="bg-white/10 backdrop-blur-md p-12 rounded-3xl border-4 border-yellow-400 shadow-[0_0_50px_rgba(250,204,21,0.2)]">
              <h2 className="text-7xl font-black mb-2 uppercase italic tracking-tighter text-yellow-400">
                {winner?.id === playerId ? 'VICTORY!' : 'DEFEATED'}
              </h2>
              <p className="text-xl font-bold text-gray-300 mb-8 uppercase tracking-widest">
                {winner?.reason === 'opponent_disconnected' ? 'OPPONENT FLEEED THE BATTLE' : 'THE BATTLE HAS ENDED'}
              </p>
              
              <button
                onClick={resetGame}
                className="bg-yellow-400 hover:bg-yellow-300 text-black font-black text-2xl px-12 py-5 rounded-2xl transition-transform hover:scale-110 active:scale-95 shadow-xl uppercase italic tracking-tight"
              >
                RETURN TO LOBBY
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 8s linear infinite;
        }
      `}} />
    </div>
  );
}
