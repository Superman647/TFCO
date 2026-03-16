import { Player, Position, Rarity } from '../types';

// SoFIFA CDN for real player images
const SF = (id: number) => `https://cdn.sofifa.net/players/${id}/24_240.png`;
const AV = (name: string) => `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=1a2a4a&color=7eb3ff&size=128&bold=true`;

const NATIONS = ['AR', 'PT', 'BE', 'NL', 'FR', 'BR', 'IT', 'ES', 'DE', 'GB', 'EG', 'NO', 'PL', 'HR', 'KR', 'CA', 'MA', 'UY'];

export const INITIAL_PLAYERS: Player[] = [
  // ─── SUPER LEGENDARY ───
  { id: 'sl1', name: 'Pelé', position: 'FW', ovr: 99, rarity: 'SUPER_LEGENDARY', level: 1, xp: 0, nation: 'BR', image: AV('Pele'), stats: { pac: 95, sho: 98, pas: 96, dri: 99, def: 50, phy: 80 } },
  { id: 'sl2', name: 'Maradona', position: 'MF', ovr: 99, rarity: 'SUPER_LEGENDARY', level: 1, xp: 0, nation: 'AR', image: AV('Maradona'), stats: { pac: 92, sho: 97, pas: 98, dri: 99, def: 55, phy: 78 } },
  { id: 'sl3', name: 'Zidane', position: 'MF', ovr: 98, rarity: 'SUPER_LEGENDARY', level: 1, xp: 0, nation: 'FR', image: AV('Zidane'), stats: { pac: 85, sho: 92, pas: 98, dri: 96, def: 75, phy: 85 } },
  { id: 'sl4', name: 'Ronaldo R9', position: 'FW', ovr: 98, rarity: 'SUPER_LEGENDARY', level: 1, xp: 0, nation: 'BR', image: AV('Ronaldo R9'), stats: { pac: 97, sho: 98, pas: 85, dri: 97, def: 40, phy: 82 } },
  { id: 'sl5', name: 'Maldini', position: 'DF', ovr: 98, rarity: 'SUPER_LEGENDARY', level: 1, xp: 0, nation: 'IT', image: AV('Maldini'), stats: { pac: 88, sho: 60, pas: 85, dri: 80, def: 99, phy: 90 } },
  { id: 'sl6', name: 'L. Yashin', position: 'GK', ovr: 98, rarity: 'SUPER_LEGENDARY', level: 1, xp: 0, nation: 'RU', image: AV('Yashin'), stats: { pac: 70, sho: 60, pas: 80, dri: 80, def: 99, phy: 90 } },
  // ─── GOLD ───
  { id: 'p1', name: 'L. Messi', position: 'FW', ovr: 93, rarity: 'GOLD', level: 1, xp: 0, nation: 'AR', image: SF(158023), stats: { pac: 80, sho: 90, pas: 90, dri: 94, def: 30, phy: 60 } },
  { id: 'p2', name: 'C. Ronaldo', position: 'FW', ovr: 90, rarity: 'GOLD', level: 1, xp: 0, nation: 'PT', image: SF(20801), stats: { pac: 81, sho: 92, pas: 78, dri: 85, def: 34, phy: 75 } },
  { id: 'p3', name: 'K. De Bruyne', position: 'MF', ovr: 91, rarity: 'GOLD', level: 1, xp: 0, nation: 'BE', image: SF(192476), stats: { pac: 74, sho: 85, pas: 93, dri: 87, def: 64, phy: 77 } },
  { id: 'p4', name: 'V. van Dijk', position: 'DF', ovr: 89, rarity: 'GOLD', level: 1, xp: 0, nation: 'NL', image: SF(203376), stats: { pac: 78, sho: 60, pas: 71, dri: 72, def: 90, phy: 86 } },
  { id: 'p5', name: 'T. Courtois', position: 'GK', ovr: 90, rarity: 'GOLD', level: 1, xp: 0, nation: 'BE', image: SF(192119), stats: { pac: 84, sho: 89, pas: 85, dri: 89, def: 46, phy: 89 } },
  { id: 'p6', name: 'K. Mbappé', position: 'FW', ovr: 91, rarity: 'GOLD', level: 1, xp: 0, nation: 'FR', image: SF(231747), stats: { pac: 97, sho: 89, pas: 80, dri: 92, def: 36, phy: 76 } },
  { id: 'p7', name: 'Neymar Jr', position: 'FW', ovr: 89, rarity: 'GOLD', level: 1, xp: 0, nation: 'BR', image: SF(190871), stats: { pac: 87, sho: 83, pas: 85, dri: 93, def: 37, phy: 61 } },
  { id: 'p8', name: 'N. Kanté', position: 'MF', ovr: 88, rarity: 'GOLD', level: 1, xp: 0, nation: 'FR', image: SF(215914), stats: { pac: 72, sho: 66, pas: 74, dri: 81, def: 87, phy: 82 } },
  { id: 'p9', name: 'Marquinhos', position: 'DF', ovr: 88, rarity: 'GOLD', level: 1, xp: 0, nation: 'BR', image: SF(201024), stats: { pac: 79, sho: 53, pas: 75, dri: 74, def: 89, phy: 80 } },
  { id: 'p10', name: 'Alisson', position: 'GK', ovr: 89, rarity: 'GOLD', level: 1, xp: 0, nation: 'BR', image: SF(208722), stats: { pac: 86, sho: 85, pas: 85, dri: 89, def: 54, phy: 90 } },
  { id: 'p11', name: 'R. Lewandowski', position: 'FW', ovr: 91, rarity: 'GOLD', level: 1, xp: 0, nation: 'PL', image: SF(188545), stats: { pac: 75, sho: 91, pas: 79, dri: 86, def: 44, phy: 83 } },
  { id: 'p12', name: 'L. Modrić', position: 'MF', ovr: 88, rarity: 'GOLD', level: 1, xp: 0, nation: 'HR', image: SF(177003), stats: { pac: 73, sho: 76, pas: 89, dri: 88, def: 72, phy: 66 } },
  { id: 'p13', name: 'T. Kroos', position: 'MF', ovr: 88, rarity: 'GOLD', level: 1, xp: 0, nation: 'DE', image: SF(182521), stats: { pac: 53, sho: 81, pas: 90, dri: 81, def: 71, phy: 68 } },
  { id: 'p14', name: 'R. Dias', position: 'DF', ovr: 88, rarity: 'GOLD', level: 1, xp: 0, nation: 'PT', image: SF(245367), stats: { pac: 63, sho: 39, pas: 66, dri: 68, def: 88, phy: 87 } },
  { id: 'p15', name: 'J. Cancelo', position: 'DF', ovr: 88, rarity: 'GOLD', level: 1, xp: 0, nation: 'PT', image: SF(211117), stats: { pac: 85, sho: 73, pas: 85, dri: 85, def: 81, phy: 73 } },
  { id: 'p16', name: 'A. Davies', position: 'DF', ovr: 84, rarity: 'GOLD', level: 1, xp: 0, nation: 'CA', image: SF(239087), stats: { pac: 95, sho: 68, pas: 77, dri: 84, def: 76, phy: 77 } },
  { id: 'p17', name: 'Casemiro', position: 'MF', ovr: 89, rarity: 'GOLD', level: 1, xp: 0, nation: 'BR', image: SF(200069), stats: { pac: 63, sho: 73, pas: 75, dri: 72, def: 87, phy: 90 } },
  { id: 'p18', name: 'M. Salah', position: 'FW', ovr: 90, rarity: 'GOLD', level: 1, xp: 0, nation: 'EG', image: SF(209331), stats: { pac: 90, sho: 89, pas: 82, dri: 90, def: 45, phy: 76 } },
  { id: 'p19', name: 'E. Haaland', position: 'FW', ovr: 91, rarity: 'GOLD', level: 1, xp: 0, nation: 'NO', image: SF(239085), stats: { pac: 89, sho: 93, pas: 66, dri: 80, def: 45, phy: 88 } },
  { id: 'p20', name: 'Ederson', position: 'GK', ovr: 89, rarity: 'GOLD', level: 1, xp: 0, nation: 'BR', image: SF(220834), stats: { pac: 87, sho: 82, pas: 93, dri: 88, def: 64, phy: 88 } },
  { id: 'p21', name: 'H. Kane', position: 'FW', ovr: 90, rarity: 'GOLD', level: 1, xp: 0, nation: 'GB', image: SF(202126), stats: { pac: 68, sho: 93, pas: 84, dri: 83, def: 49, phy: 83 } },
  { id: 'p22', name: 'Vinícius Jr.', position: 'FW', ovr: 89, rarity: 'GOLD', level: 1, xp: 0, nation: 'BR', image: SF(238794), stats: { pac: 95, sho: 82, pas: 81, dri: 90, def: 29, phy: 68 } },
  { id: 'p23', name: 'J. Bellingham', position: 'MF', ovr: 86, rarity: 'GOLD', level: 1, xp: 0, nation: 'GB', image: SF(245369), stats: { pac: 82, sho: 75, pas: 79, dri: 85, def: 78, phy: 82 } },
  { id: 'p24', name: 'Pedri', position: 'MF', ovr: 86, rarity: 'GOLD', level: 1, xp: 0, nation: 'ES', image: SF(244478), stats: { pac: 79, sho: 68, pas: 82, dri: 88, def: 68, phy: 64 } },
  { id: 'p25', name: 'R. Araújo', position: 'DF', ovr: 86, rarity: 'GOLD', level: 1, xp: 0, nation: 'UY', image: AV('R Araujo'), stats: { pac: 79, sho: 51, pas: 65, dri: 65, def: 86, phy: 84 } },
  { id: 'p26', name: 'E. Militão', position: 'DF', ovr: 86, rarity: 'GOLD', level: 1, xp: 0, nation: 'BR', image: SF(246169), stats: { pac: 85, sho: 50, pas: 70, dri: 72, def: 86, phy: 82 } },
  { id: 'p27', name: 'M. ter Stegen', position: 'GK', ovr: 89, rarity: 'GOLD', level: 1, xp: 0, nation: 'DE', image: SF(188350), stats: { pac: 86, sho: 85, pas: 89, dri: 90, def: 47, phy: 85 } },
  { id: 'p28', name: 'B. Silva', position: 'MF', ovr: 88, rarity: 'GOLD', level: 1, xp: 0, nation: 'PT', image: SF(237397), stats: { pac: 69, sho: 78, pas: 86, dri: 92, def: 61, phy: 68 } },
  { id: 'p29', name: 'Son H. Min', position: 'FW', ovr: 87, rarity: 'GOLD', level: 1, xp: 0, nation: 'KR', image: SF(200104), stats: { pac: 87, sho: 88, pas: 80, dri: 84, def: 42, phy: 68 } },
  { id: 'p30', name: 'A. Hakimi', position: 'DF', ovr: 84, rarity: 'GOLD', level: 1, xp: 0, nation: 'MA', image: SF(234396), stats: { pac: 92, sho: 75, pas: 79, dri: 80, def: 75, phy: 78 } },
  // ─── SILVER ───
  { id: 's1', name: 'B. Fernandes', position: 'MF', ovr: 84, rarity: 'SILVER', level: 1, xp: 0, nation: 'PT', image: SF(212198), stats: { pac: 72, sho: 82, pas: 85, dri: 85, def: 65, phy: 72 } },
  { id: 's2', name: 'M. Acuña', position: 'DF', ovr: 82, rarity: 'SILVER', level: 1, xp: 0, nation: 'AR', image: AV('M Acuna'), stats: { pac: 85, sho: 68, pas: 78, dri: 80, def: 80, phy: 78 } },
  { id: 's3', name: 'L. Dunk', position: 'DF', ovr: 78, rarity: 'SILVER', level: 1, xp: 0, nation: 'GB', image: AV('L Dunk'), stats: { pac: 62, sho: 45, pas: 60, dri: 55, def: 80, phy: 84 } },
  { id: 's4', name: 'T. Abraham', position: 'FW', ovr: 79, rarity: 'SILVER', level: 1, xp: 0, nation: 'GB', image: AV('T Abraham'), stats: { pac: 80, sho: 76, pas: 64, dri: 74, def: 35, phy: 80 } },
  { id: 's5', name: 'K. Trapp', position: 'GK', ovr: 81, rarity: 'SILVER', level: 1, xp: 0, nation: 'DE', image: AV('K Trapp'), stats: { pac: 68, sho: 75, pas: 72, dri: 74, def: 80, phy: 79 } },
];

export const generateRandomPlayer = (
  packType: 'BRONZE' | 'SILVER' | 'GOLD' | 'SUPER_LEGENDARY' = 'GOLD',
  forcedPosition?: Position
): Player => {
  const positions: Position[] = ['FW', 'MF', 'DF', 'GK'];
  const pos = forcedPosition || positions[Math.floor(Math.random() * positions.length)];

  let minOvr = 55, maxOvr = 72; let rarity: Rarity = 'BRONZE';
  if (packType === 'SILVER') { minOvr = 70; maxOvr = 82; rarity = 'SILVER'; }
  if (packType === 'GOLD') { minOvr = 80; maxOvr = 92; rarity = 'GOLD'; }
  if (packType === 'SUPER_LEGENDARY') { minOvr = 93; maxOvr = 99; rarity = 'SUPER_LEGENDARY'; }

  const ovr = Math.floor(Math.random() * (maxOvr - minOvr + 1)) + minOvr;

  const viFirstNames = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Đặng', 'Hoàng', 'Vũ', 'Phan', 'Bùi', 'Đỗ'];
  const intFirstNames = ['J.', 'A.', 'M.', 'R.', 'K.', 'L.', 'C.', 'D.', 'S.', 'T.'];
  const intLastNames = ['Silva', 'Santos', 'Garcia', 'López', 'Müller', 'Dubois', 'Smith', 'Jones', 'Kim', 'Okafor'];
  const viLastNames = ['Văn Hậu', 'Công Phượng', 'Quang Hải', 'Đình Trọng', 'Tiến Linh', 'Văn Toàn', 'Hùng Dũng', 'Thành Chung'];

  const useVi = Math.random() < 0.25;
  const name = useVi
    ? viLastNames[Math.floor(Math.random() * viLastNames.length)]
    : `${intFirstNames[Math.floor(Math.random() * intFirstNames.length)]} ${intLastNames[Math.floor(Math.random() * intLastNames.length)]}`;

  const nation = NATIONS[Math.floor(Math.random() * NATIONS.length)];

  const baseStats = {
    pac: Math.min(99, Math.max(40, ovr - 10 + Math.floor(Math.random() * 22))),
    sho: Math.min(99, Math.max(40, ovr - 10 + Math.floor(Math.random() * 22))),
    pas: Math.min(99, Math.max(40, ovr - 10 + Math.floor(Math.random() * 22))),
    dri: Math.min(99, Math.max(40, ovr - 10 + Math.floor(Math.random() * 22))),
    def: Math.min(99, Math.max(30, ovr - 20 + Math.floor(Math.random() * 30))),
    phy: Math.min(99, Math.max(40, ovr - 10 + Math.floor(Math.random() * 22))),
  };

  // Adjust stats by position
  if (pos === 'GK') { baseStats.def = Math.min(99, ovr - 5 + Math.floor(Math.random() * 12)); }
  if (pos === 'DF') { baseStats.def = Math.min(99, baseStats.def + 10); baseStats.sho = Math.max(30, baseStats.sho - 15); }
  if (pos === 'FW') { baseStats.sho = Math.min(99, baseStats.sho + 8); baseStats.def = Math.max(25, baseStats.def - 15); }

  return {
    id: `gen_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name,
    position: pos,
    ovr,
    rarity,
    level: 1,
    xp: 0,
    nation,
    image: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=1a2a4a&color=7eb3ff&size=128&bold=true`,
    stats: baseStats
  };
};

export const generateStarterSquad = (): Player[] => {
  const squad: Player[] = [];
  squad.push(generateRandomPlayer('BRONZE', 'GK'));
  for (let i = 0; i < 4; i++) squad.push(generateRandomPlayer('BRONZE', 'DF'));
  for (let i = 0; i < 3; i++) squad.push(generateRandomPlayer('BRONZE', 'MF'));
  for (let i = 0; i < 3; i++) squad.push(generateRandomPlayer('BRONZE', 'FW'));
  for (let i = 0; i < 4; i++) squad.push(generateRandomPlayer('BRONZE'));
  return squad;
};

export const getInitialSquad = (players: Player[]): (Player | null)[] => {
  const squad = new Array(11).fill(null);
  const usedIds = new Set<string>();
  const findAndAssign = (pos: Position, index: number) => {
    const player = players.find(p => p.position === pos && !usedIds.has(p.id));
    if (player) { squad[index] = player; usedIds.add(player.id); }
  };
  findAndAssign('GK', 0);
  for (let i = 1; i <= 4; i++) findAndAssign('DF', i);
  for (let i = 5; i <= 7; i++) findAndAssign('MF', i);
  for (let i = 8; i <= 10; i++) findAndAssign('FW', i);
  for (let i = 0; i < 11; i++) {
    if (!squad[i]) {
      const p = players.find(p => !usedIds.has(p.id));
      if (p) { squad[i] = p; usedIds.add(p.id); }
    }
  }
  return squad;
};
