import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Gamepad2, Swords, Trophy } from 'lucide-react';

interface LobbyProps {
  onJoin: (roomId: string, pokemon: string) => void;
  onCreate: (pokemon: string) => void;
}

const POKEMONS = [
  { id: 'pikachu', name: 'Pikachu', color: 'bg-yellow-400', image: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png' },
  { id: 'charmander', name: 'Charmander', color: 'bg-red-500', image: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/4.png' },
  { id: 'bulbasaur', name: 'Bulbasaur', color: 'bg-green-500', image: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/1.png' },
  { id: 'squirtle', name: 'Squirtle', color: 'bg-blue-500', image: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/7.png' },
];

export const Lobby: React.FC<LobbyProps> = ({ onJoin, onCreate }) => {
  const [roomId, setRoomId] = useState('');
  const [selectedPokemon, setSelectedPokemon] = useState('pikachu');

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl w-full p-8 bg-white/10 backdrop-blur-md rounded-3xl border border-white/20 shadow-2xl overflow-hidden"
    >
      <div className="flex items-center justify-center gap-3 mb-8">
        <Swords className="w-10 h-10 text-yellow-400" />
        <h1 className="text-5xl font-black text-white tracking-tight uppercase italic">PokéShot 1v1</h1>
      </div>

      <div className="space-y-10">
        {/* Pokemon Selection */}
        <div>
          <h2 className="text-xl font-bold text-yellow-400 mb-4 uppercase tracking-widest flex items-center gap-2">
             Choose Your Fighter
          </h2>
          <div className="grid grid-cols-4 gap-4">
            {POKEMONS.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedPokemon(p.id)}
                className={`relative group p-2 rounded-2xl transition-all duration-300 border-4 ${
                  selectedPokemon === p.id 
                  ? 'border-yellow-400 bg-yellow-400/20 scale-105 shadow-[0_0_20px_rgba(250,204,21,0.4)]' 
                  : 'border-transparent bg-white/5 hover:bg-white/10 hover:scale-105'
                }`}
              >
                <img src={p.image} alt={p.name} className="w-full h-auto drop-shadow-lg" />
                <span className={`block text-xs font-bold mt-2 uppercase transition-colors ${
                  selectedPokemon === p.id ? 'text-yellow-400' : 'text-gray-400'
                }`}>
                  {p.name}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <button
              onClick={() => onCreate(selectedPokemon)}
              className="w-full h-16 bg-yellow-400 hover:bg-yellow-300 text-black font-black text-xl rounded-2xl flex items-center justify-center gap-2 transition-transform hover:scale-105 active:scale-95 shadow-lg group"
            >
              <Gamepad2 className="w-6 h-6 group-hover:rotate-12 transition-transform" />
              CREATE ROOM
            </button>
            <button
              onClick={() => onJoin('vs-bot', selectedPokemon)}
              className="w-full h-12 bg-white/10 hover:bg-white/20 text-white font-black text-sm rounded-xl flex items-center justify-center gap-2 transition-transform hover:scale-105 active:scale-95 border-2 border-white/10 group"
            >
              <Swords className="w-4 h-4 text-yellow-400" />
              PLAY VS BOT (SINGLE)
            </button>
            <p className="text-center text-[10px] text-white/40 uppercase tracking-widest font-bold">Start a match solo or with friends</p>
          </div>

          <div className="space-y-4">
            <div className="relative group">
               <input
                type="text"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                placeholder="ENTER ROOM ID"
                className="w-full h-16 bg-white/5 border-2 border-white/10 rounded-2xl px-4 text-white font-bold text-center focus:border-yellow-400/50 transition-all outline-none"
              />
            </div>
            <button
              onClick={() => onJoin(roomId, selectedPokemon)}
              disabled={!roomId}
              className="w-full h-16 bg-white/10 hover:bg-white/20 text-white font-black text-xl rounded-2xl flex items-center justify-center gap-2 transition-transform hover:scale-105 active:scale-95 border-2 border-white/10 disabled:opacity-50 disabled:hover:scale-100 group"
            >
              <Trophy className="w-6 h-6 group-hover:rotate-12 transition-transform" />
              JOIN ROOM
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
