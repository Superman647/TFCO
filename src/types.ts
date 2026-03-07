export type Position = 'FW' | 'MF' | 'DF' | 'GK';
export type Rarity = 'BRONZE' | 'SILVER' | 'GOLD' | 'SUPER_LEGENDARY';

export interface PlayerStats {
  pac: number;
  sho: number;
  pas: number;
  dri: number;
  def: number;
  phy: number;
}

export interface Player {
  id: string;
  name: string;
  position: Position;
  ovr: number;
  rarity: Rarity;
  stats: PlayerStats;
  image?: string;
  level: number;
  xp: number; // Experience points
  nation: string;
  training?: {
    stat: keyof PlayerStats;
    endTime: number;
  };
}

export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';

export interface MatchStats {
  goals: { playerId: string; minute: number }[];
  ratings: Record<string, number>; // playerId -> rating
}

export type FormationType = '4-3-3' | '4-4-2' | '3-5-2';

export interface Squad {
  formation: FormationType;
  lineup: (Player | null)[]; // Array of 11 players
}

export interface UserData {
  id: number;
  username: string;
  teamName: string;
  teamLogo: string;
  coins: number;
  inventory: Player[];
  squad: Squad;
}
