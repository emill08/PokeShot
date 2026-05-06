export interface Player {
  id: string;
  x: number;
  y: number;
  hp: number;
  angle: number;
  pokemon: string;
}

export interface Bullet {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  ownerId: string;
}

export interface GameState {
  players: Player[];
  bullets: Bullet[];
  timestamp: number;
}

export interface InputState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  shoot: boolean;
  angle: number;
}
