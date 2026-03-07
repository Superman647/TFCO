import { Player, Position } from '../types';

export interface WorldCupTeam {
  id: string;
  name: string;
  code: string;
  flag: string; // Emoji or URL
  rating: number; // 1-100 strength
  color: string; // Primary color
}

export const WORLD_CUP_TEAMS: WorldCupTeam[] = [
  // Europe (13)
  { id: 'fra', name: 'France', code: 'FRA', flag: '🇫🇷', rating: 92, color: '#002395' },
  { id: 'eng', name: 'England', code: 'ENG', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', rating: 89, color: '#FFFFFF' },
  { id: 'esp', name: 'Spain', code: 'ESP', flag: '🇪🇸', rating: 88, color: '#AA151B' },
  { id: 'ger', name: 'Germany', code: 'GER', flag: '🇩🇪', rating: 87, color: '#FFFFFF' },
  { id: 'ned', name: 'Netherlands', code: 'NED', flag: '🇳🇱', rating: 85, color: '#F36C21' },
  { id: 'por', name: 'Portugal', code: 'POR', flag: '🇵🇹', rating: 86, color: '#E42518' },
  { id: 'bel', name: 'Belgium', code: 'BEL', flag: '🇧🇪', rating: 84, color: '#E30613' },
  { id: 'cro', name: 'Croatia', code: 'CRO', flag: '🇭🇷', rating: 83, color: '#FF0000' },
  { id: 'den', name: 'Denmark', code: 'DEN', flag: '🇩🇰', rating: 80, color: '#C60C30' },
  { id: 'sui', name: 'Switzerland', code: 'SUI', flag: '🇨🇭', rating: 79, color: '#FF0000' },
  { id: 'srb', name: 'Serbia', code: 'SRB', flag: '🇷🇸', rating: 78, color: '#C6363C' },
  { id: 'pol', name: 'Poland', code: 'POL', flag: '🇵🇱', rating: 77, color: '#FFFFFF' },
  { id: 'wal', name: 'Wales', code: 'WAL', flag: '🏴󠁧󠁢󠁷󠁬󠁳󠁿', rating: 76, color: '#D30731' },

  // South America (4)
  { id: 'bra', name: 'Brazil', code: 'BRA', flag: '🇧🇷', rating: 91, color: '#FFDF00' },
  { id: 'arg', name: 'Argentina', code: 'ARG', flag: '🇦🇷', rating: 90, color: '#75AADB' },
  { id: 'uru', name: 'Uruguay', code: 'URU', flag: '🇺🇾', rating: 82, color: '#5BA4D4' },
  { id: 'ecu', name: 'Ecuador', code: 'ECU', flag: '🇪🇨', rating: 78, color: '#FFCC00' },

  // Africa (5)
  { id: 'sen', name: 'Senegal', code: 'SEN', flag: '🇸🇳', rating: 79, color: '#FFFFFF' },
  { id: 'mar', name: 'Morocco', code: 'MAR', flag: '🇲🇦', rating: 81, color: '#C1272D' },
  { id: 'tun', name: 'Tunisia', code: 'TUN', flag: '🇹🇳', rating: 75, color: '#E70013' },
  { id: 'cmr', name: 'Cameroon', code: 'CMR', flag: '🇨🇲', rating: 76, color: '#007A5E' },
  { id: 'gha', name: 'Ghana', code: 'GHA', flag: '🇬🇭', rating: 74, color: '#FFFFFF' },

  // Asia (6)
  { id: 'jpn', name: 'Japan', code: 'JPN', flag: '🇯🇵', rating: 78, color: '#000555' },
  { id: 'kor', name: 'South Korea', code: 'KOR', flag: '🇰🇷', rating: 77, color: '#C60C30' },
  { id: 'irn', name: 'Iran', code: 'IRN', flag: '🇮🇷', rating: 76, color: '#FFFFFF' },
  { id: 'ksa', name: 'Saudi Arabia', code: 'KSA', flag: '🇸🇦', rating: 75, color: '#006C35' },
  { id: 'aus', name: 'Australia', code: 'AUS', flag: '🇦🇺', rating: 74, color: '#FFCD00' },
  { id: 'qat', name: 'Qatar', code: 'QAT', flag: '🇶🇦', rating: 72, color: '#8D1B3D' },

  // North America (4)
  { id: 'usa', name: 'USA', code: 'USA', flag: '🇺🇸', rating: 79, color: '#FFFFFF' },
  { id: 'mex', name: 'Mexico', code: 'MEX', flag: '🇲🇽', rating: 78, color: '#006847' },
  { id: 'can', name: 'Canada', code: 'CAN', flag: '🇨🇦', rating: 75, color: '#FF0000' },
  { id: 'crc', name: 'Costa Rica', code: 'CRC', flag: '🇨🇷', rating: 74, color: '#CE1126' },
];

export const generateRandomWorldCupSquad = (teamId: string): Player[] => {
  // This is a placeholder. In a real app, you'd have real rosters.
  // We'll generate generic players with the team's nationality.
  const team = WORLD_CUP_TEAMS.find(t => t.id === teamId);
  if (!team) return [];

  const positions = ['GK', 'LB', 'CB', 'CB', 'RB', 'CM', 'CM', 'CAM', 'LW', 'ST', 'RW'];
  const getPositionType = (pos: string): Position => {
    if (pos === 'GK') return 'GK';
    if (['LB', 'CB', 'RB'].includes(pos)) return 'DF';
    if (['CM', 'CAM'].includes(pos)) return 'MF';
    return 'FW';
  };

  return positions.map((pos, i) => ({
    id: `${teamId}_${i}`,
    name: `${team.code} Player ${i+1}`,
    position: getPositionType(pos),
    ovr: Math.floor(team.rating + (Math.random() * 10 - 5)),
    stats: {
      pac: Math.floor(team.rating + (Math.random() * 10 - 5)),
      sho: Math.floor(team.rating + (Math.random() * 10 - 5)),
      pas: Math.floor(team.rating + (Math.random() * 10 - 5)),
      dri: Math.floor(team.rating + (Math.random() * 10 - 5)),
      def: Math.floor(team.rating + (Math.random() * 10 - 5)),
      phy: Math.floor(team.rating + (Math.random() * 10 - 5)),
    },
    rarity: 'GOLD',
    image: `https://ui-avatars.com/api/?name=${team.code}+${i}&background=${team.color.replace('#', '')}&color=fff`,
    level: 1,
    xp: 0,
    nation: team.name
  }));
};
