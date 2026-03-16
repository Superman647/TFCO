import { Player, Position, Rarity } from '../types';

const PLAYER_IMAGES: Record<string, string> = {
  'Pele': 'https://upload.wikimedia.org/wikipedia/commons/5/59/Pel%C3%A9_1960.png',
  'Maradona': 'https://upload.wikimedia.org/wikipedia/commons/1/1c/Diego_Armando_Maradona_2017.jpg',
  'Zidane': 'https://upload.wikimedia.org/wikipedia/commons/4/4b/Zinedine_Zidane_2013.jpg',
  'Ronaldo R9': 'https://upload.wikimedia.org/wikipedia/commons/7/7c/Ronaldo_2014.jpg',
  'Maldini': 'https://upload.wikimedia.org/wikipedia/commons/3/39/Paolo_Maldini_2018.jpg',
  'Yashin': 'https://upload.wikimedia.org/wikipedia/commons/8/8b/Lev_Yashin_1965.jpg',
  'L. Messi': 'https://upload.wikimedia.org/wikipedia/commons/c/c1/Lionel_Messi_20180626.jpg',
  'C. Ronaldo': 'https://upload.wikimedia.org/wikipedia/commons/8/8c/Cristiano_Ronaldo_2018.jpg',
  'K. De Bruyne': 'https://upload.wikimedia.org/wikipedia/commons/9/99/Kevin_De_Bruyne_201807091.jpg',
  'V. van Dijk': 'https://upload.wikimedia.org/wikipedia/commons/4/49/Virgil_van_Dijk_2018.jpg',
  'T. Courtois': 'https://upload.wikimedia.org/wikipedia/commons/8/8f/Thibaut_Courtois_2018.jpg',
  'K. Mbappe': 'https://upload.wikimedia.org/wikipedia/commons/a/a8/Kylian_Mbapp%C3%A9_2019.jpg',
  'Neymar Jr': 'https://upload.wikimedia.org/wikipedia/commons/7/76/Neymar_2018.jpg',
  'N. Kante': 'https://upload.wikimedia.org/wikipedia/commons/7/79/N%27Golo_Kant%C3%A9_2018.jpg',
  'Marquinhos': 'https://upload.wikimedia.org/wikipedia/commons/3/30/Marquinhos_2018.jpg',
  'Alisson': 'https://upload.wikimedia.org/wikipedia/commons/4/49/Alisson_Becker_2018.jpg',
  'R. Lewandowski': 'https://upload.wikimedia.org/wikipedia/commons/8/85/Robert_Lewandowski_2019.jpg',
  'L. Modric': 'https://upload.wikimedia.org/wikipedia/commons/8/8c/Luka_Modri%C4%87_2018.jpg',
  'T. Kroos': 'https://upload.wikimedia.org/wikipedia/commons/e/ea/Toni_Kroos_2018.jpg',
  'Ruben Dias': 'https://upload.wikimedia.org/wikipedia/commons/f/f1/Ruben_Dias_2021.jpg',
  'J. Cancelo': 'https://upload.wikimedia.org/wikipedia/commons/0/0f/Jo%C3%A3o_Cancelo_2021.jpg',
  'A. Davies': 'https://upload.wikimedia.org/wikipedia/commons/8/8a/Alphonso_Davies_2020.jpg',
  'Casemiro': 'https://upload.wikimedia.org/wikipedia/commons/b/b9/Casemiro_2018.jpg',
  'M. Salah': 'https://upload.wikimedia.org/wikipedia/commons/2/22/Mohamed_Salah_2018.jpg',
  'E. Haaland': 'https://upload.wikimedia.org/wikipedia/commons/9/90/Erling_Haaland_2023.jpg',
  'Ederson': 'https://upload.wikimedia.org/wikipedia/commons/3/36/Ederson_2018.jpg',
  'H. Kane': 'https://upload.wikimedia.org/wikipedia/commons/4/48/Harry_Kane_2018.jpg',
  'Vini Jr.': 'https://upload.wikimedia.org/wikipedia/commons/7/71/Vinicius_Jr_2021.jpg',
  'J. Bellingham': 'https://upload.wikimedia.org/wikipedia/commons/8/8f/Jude_Bellingham_2023.jpg',
  'Pedri': 'https://upload.wikimedia.org/wikipedia/commons/e/e2/Pedri_2022.jpg',
  'R. Araujo': 'https://upload.wikimedia.org/wikipedia/commons/8/8a/Ronald_Araujo_2022.jpg',
  'E. Militao': 'https://upload.wikimedia.org/wikipedia/commons/0/0f/Eder_Milit%C3%A3o_2023.jpg',
  'M. ter Stegen': 'https://upload.wikimedia.org/wikipedia/commons/5/5e/Marc-Andre_ter_Stegen_2018.jpg',
  'B. Silva': 'https://upload.wikimedia.org/wikipedia/commons/9/93/Bernardo_Silva_2018.jpg',
  'S. Heung Min': 'https://upload.wikimedia.org/wikipedia/commons/9/90/Son_Heung-min_2022.jpg',
  'A. Hakimi': 'https://upload.wikimedia.org/wikipedia/commons/b/b2/Achraf_Hakimi_2021.jpg'
};

const getAvatar = (name: string) => PLAYER_IMAGES[name] || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0f172a&color=fff&size=256&bold=true`;

const NATIONS = ['AR', 'PT', 'BE', 'NL', 'FR', 'BR', 'IT', 'ES', 'DE', 'GB'];

export const INITIAL_PLAYERS: Player[] = [
  // Super Legendary
  { id: 'sl1', name: 'Pele', position: 'FW', ovr: 99, rarity: 'SUPER_LEGENDARY', level: 1, xp: 0, nation: 'BR', image: getAvatar('Pele'), stats: { pac: 95, sho: 98, pas: 96, dri: 99, def: 50, phy: 80 } },
  { id: 'sl2', name: 'Maradona', position: 'MF', ovr: 99, rarity: 'SUPER_LEGENDARY', level: 1, xp: 0, nation: 'AR', image: getAvatar('Maradona'), stats: { pac: 92, sho: 97, pas: 98, dri: 99, def: 55, phy: 78 } },
  { id: 'sl3', name: 'Zidane', position: 'MF', ovr: 98, rarity: 'SUPER_LEGENDARY', level: 1, xp: 0, nation: 'FR', image: getAvatar('Zidane'), stats: { pac: 85, sho: 92, pas: 98, dri: 96, def: 75, phy: 85 } },
  { id: 'sl4', name: 'Ronaldo R9', position: 'FW', ovr: 98, rarity: 'SUPER_LEGENDARY', level: 1, xp: 0, nation: 'BR', image: getAvatar('Ronaldo R9'), stats: { pac: 97, sho: 98, pas: 85, dri: 97, def: 40, phy: 82 } },
  { id: 'sl5', name: 'Maldini', position: 'DF', ovr: 98, rarity: 'SUPER_LEGENDARY', level: 1, xp: 0, nation: 'IT', image: getAvatar('Maldini'), stats: { pac: 88, sho: 60, pas: 85, dri: 80, def: 99, phy: 90 } },
  { id: 'sl6', name: 'Yashin', position: 'GK', ovr: 98, rarity: 'SUPER_LEGENDARY', level: 1, xp: 0, nation: 'RU', image: getAvatar('Yashin'), stats: { pac: 70, sho: 60, pas: 80, dri: 80, def: 99, phy: 90 } },

  // Gold
  { id: 'p1', name: 'L. Messi', position: 'FW', ovr: 93, rarity: 'GOLD', level: 1, xp: 0, nation: 'AR', image: getAvatar('L. Messi'), stats: { pac: 80, sho: 90, pas: 90, dri: 94, def: 30, phy: 60 } },
  { id: 'p2', name: 'C. Ronaldo', position: 'FW', ovr: 90, rarity: 'GOLD', level: 1, xp: 0, nation: 'PT', image: getAvatar('C. Ronaldo'), stats: { pac: 81, sho: 92, pas: 78, dri: 85, def: 34, phy: 75 } },
  { id: 'p3', name: 'K. De Bruyne', position: 'MF', ovr: 91, rarity: 'GOLD', level: 1, xp: 0, nation: 'BE', image: getAvatar('K. De Bruyne'), stats: { pac: 74, sho: 85, pas: 93, dri: 87, def: 64, phy: 77 } },
  { id: 'p4', name: 'V. van Dijk', position: 'DF', ovr: 89, rarity: 'GOLD', level: 1, xp: 0, nation: 'NL', image: getAvatar('V. van Dijk'), stats: { pac: 78, sho: 60, pas: 71, dri: 72, def: 90, phy: 86 } },
  { id: 'p5', name: 'T. Courtois', position: 'GK', ovr: 90, rarity: 'GOLD', level: 1, xp: 0, nation: 'BE', image: getAvatar('T. Courtois'), stats: { pac: 84, sho: 89, pas: 85, dri: 89, def: 46, phy: 89 } },
  { id: 'p6', name: 'K. Mbappe', position: 'FW', ovr: 91, rarity: 'GOLD', level: 1, xp: 0, nation: 'FR', image: getAvatar('K. Mbappe'), stats: { pac: 97, sho: 89, pas: 80, dri: 92, def: 36, phy: 76 } },
  { id: 'p7', name: 'Neymar Jr', position: 'FW', ovr: 89, rarity: 'GOLD', level: 1, xp: 0, nation: 'BR', image: getAvatar('Neymar Jr'), stats: { pac: 87, sho: 83, pas: 85, dri: 93, def: 37, phy: 61 } },
  { id: 'p8', name: 'N. Kante', position: 'MF', ovr: 88, rarity: 'GOLD', level: 1, xp: 0, nation: 'FR', image: getAvatar('N. Kante'), stats: { pac: 72, sho: 66, pas: 74, dri: 81, def: 87, phy: 82 } },
  { id: 'p9', name: 'Marquinhos', position: 'DF', ovr: 88, rarity: 'GOLD', level: 1, xp: 0, nation: 'BR', image: getAvatar('Marquinhos'), stats: { pac: 79, sho: 53, pas: 75, dri: 74, def: 89, phy: 80 } },
  { id: 'p10', name: 'Alisson', position: 'GK', ovr: 89, rarity: 'GOLD', level: 1, xp: 0, nation: 'BR', image: getAvatar('Alisson'), stats: { pac: 86, sho: 85, pas: 85, dri: 89, def: 54, phy: 90 } },
  { id: 'p11', name: 'R. Lewandowski', position: 'FW', ovr: 91, rarity: 'GOLD', level: 1, xp: 0, nation: 'PL', image: getAvatar('R. Lewandowski'), stats: { pac: 75, sho: 91, pas: 79, dri: 86, def: 44, phy: 83 } },
  { id: 'p12', name: 'L. Modric', position: 'MF', ovr: 88, rarity: 'GOLD', level: 1, xp: 0, nation: 'HR', image: getAvatar('L. Modric'), stats: { pac: 73, sho: 76, pas: 89, dri: 88, def: 72, phy: 66 } },
  { id: 'p13', name: 'T. Kroos', position: 'MF', ovr: 88, rarity: 'GOLD', level: 1, xp: 0, nation: 'DE', image: getAvatar('T. Kroos'), stats: { pac: 53, sho: 81, pas: 90, dri: 81, def: 71, phy: 68 } },
  { id: 'p14', name: 'Ruben Dias', position: 'DF', ovr: 88, rarity: 'GOLD', level: 1, xp: 0, nation: 'PT', image: getAvatar('Ruben Dias'), stats: { pac: 63, sho: 39, pas: 66, dri: 68, def: 88, phy: 87 } },
  { id: 'p15', name: 'J. Cancelo', position: 'DF', ovr: 88, rarity: 'GOLD', level: 1, xp: 0, nation: 'PT', image: getAvatar('J. Cancelo'), stats: { pac: 85, sho: 73, pas: 85, dri: 85, def: 81, phy: 73 } },
  { id: 'p16', name: 'A. Davies', position: 'DF', ovr: 84, rarity: 'GOLD', level: 1, xp: 0, nation: 'CA', image: getAvatar('A. Davies'), stats: { pac: 95, sho: 68, pas: 77, dri: 84, def: 76, phy: 77 } },
  { id: 'p17', name: 'Casemiro', position: 'MF', ovr: 89, rarity: 'GOLD', level: 1, xp: 0, nation: 'BR', image: getAvatar('Casemiro'), stats: { pac: 63, sho: 73, pas: 75, dri: 72, def: 87, phy: 90 } },
  { id: 'p18', name: 'M. Salah', position: 'FW', ovr: 90, rarity: 'GOLD', level: 1, xp: 0, nation: 'EG', image: getAvatar('M. Salah'), stats: { pac: 90, sho: 89, pas: 82, dri: 90, def: 45, phy: 76 } },
  { id: 'p19', name: 'E. Haaland', position: 'FW', ovr: 91, rarity: 'GOLD', level: 1, xp: 0, nation: 'NO', image: getAvatar('E. Haaland'), stats: { pac: 89, sho: 93, pas: 66, dri: 80, def: 45, phy: 88 } },
  { id: 'p20', name: 'Ederson', position: 'GK', ovr: 89, rarity: 'GOLD', level: 1, xp: 0, nation: 'BR', image: getAvatar('Ederson'), stats: { pac: 87, sho: 82, pas: 93, dri: 88, def: 64, phy: 88 } },
  { id: 'p21', name: 'H. Kane', position: 'FW', ovr: 90, rarity: 'GOLD', level: 1, xp: 0, nation: 'GB', image: getAvatar('H. Kane'), stats: { pac: 68, sho: 93, pas: 84, dri: 83, def: 49, phy: 83 } },
  { id: 'p22', name: 'Vini Jr.', position: 'FW', ovr: 89, rarity: 'GOLD', level: 1, xp: 0, nation: 'BR', image: getAvatar('Vini Jr.'), stats: { pac: 95, sho: 82, pas: 81, dri: 90, def: 29, phy: 68 } },
  { id: 'p23', name: 'J. Bellingham', position: 'MF', ovr: 86, rarity: 'GOLD', level: 1, xp: 0, nation: 'GB', image: getAvatar('J. Bellingham'), stats: { pac: 82, sho: 75, pas: 79, dri: 85, def: 78, phy: 82 } },
  { id: 'p24', name: 'Pedri', position: 'MF', ovr: 86, rarity: 'GOLD', level: 1, xp: 0, nation: 'ES', image: getAvatar('Pedri'), stats: { pac: 79, sho: 68, pas: 82, dri: 88, def: 68, phy: 64 } },
  { id: 'p25', name: 'R. Araujo', position: 'DF', ovr: 86, rarity: 'GOLD', level: 1, xp: 0, nation: 'UY', image: getAvatar('R. Araujo'), stats: { pac: 79, sho: 51, pas: 65, dri: 65, def: 86, phy: 84 } },
  { id: 'p26', name: 'E. Militao', position: 'DF', ovr: 86, rarity: 'GOLD', level: 1, xp: 0, nation: 'BR', image: getAvatar('E. Militao'), stats: { pac: 85, sho: 50, pas: 70, dri: 72, def: 86, phy: 82 } },
  { id: 'p27', name: 'M. ter Stegen', position: 'GK', ovr: 89, rarity: 'GOLD', level: 1, xp: 0, nation: 'DE', image: getAvatar('M. ter Stegen'), stats: { pac: 86, sho: 85, pas: 89, dri: 90, def: 47, phy: 85 } },
  { id: 'p28', name: 'B. Silva', position: 'MF', ovr: 88, rarity: 'GOLD', level: 1, xp: 0, nation: 'PT', image: getAvatar('B. Silva'), stats: { pac: 69, sho: 78, pas: 86, dri: 92, def: 61, phy: 68 } },
  { id: 'p29', name: 'S. Heung Min', position: 'FW', ovr: 87, rarity: 'GOLD', level: 1, xp: 0, nation: 'KR', image: getAvatar('S. Heung Min'), stats: { pac: 87, sho: 88, pas: 80, dri: 84, def: 42, phy: 68 } },
  { id: 'p30', name: 'A. Hakimi', position: 'DF', ovr: 84, rarity: 'GOLD', level: 1, xp: 0, nation: 'MA', image: getAvatar('A. Hakimi'), stats: { pac: 92, sho: 75, pas: 79, dri: 80, def: 75, phy: 78 } },
];

export const generateRandomPlayer = (
  packType: 'BRONZE' | 'SILVER' | 'GOLD' | 'SUPER_LEGENDARY' = 'GOLD',
  forcedPosition?: Position
): Player => {
  const positions: Position[] = ['FW', 'MF', 'DF', 'GK'];
  const pos = forcedPosition || positions[Math.floor(Math.random() * positions.length)];
  
  let minOvr = 60, maxOvr = 75;
  let rarity: Rarity = 'BRONZE';

  if (packType === 'SILVER') { minOvr = 70; maxOvr = 85; rarity = 'SILVER'; }
  if (packType === 'GOLD') { minOvr = 80; maxOvr = 95; rarity = 'GOLD'; }
  if (packType === 'SUPER_LEGENDARY') { minOvr = 96; maxOvr = 99; rarity = 'SUPER_LEGENDARY'; }
  
  const ovr = Math.floor(Math.random() * (maxOvr - minOvr + 1)) + minOvr;
  
  const firstNames = ['John', 'David', 'Chris', 'Mike', 'Alex', 'Tom', 'James', 'Leo', 'Cristiano', 'Kevin'];
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'];
  const name = `${firstNames[Math.floor(Math.random() * firstNames.length)].charAt(0)}. ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
  const nation = NATIONS[Math.floor(Math.random() * NATIONS.length)];

  return {
    id: `gen_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name,
    position: pos,
    ovr,
    rarity,
    level: 1,
    xp: 0,
    nation,
    image: getAvatar(name),
    stats: {
      pac: Math.max(50, ovr - 15 + Math.floor(Math.random() * 30)),
      sho: Math.max(50, ovr - 15 + Math.floor(Math.random() * 30)),
      pas: Math.max(50, ovr - 15 + Math.floor(Math.random() * 30)),
      dri: Math.max(50, ovr - 15 + Math.floor(Math.random() * 30)),
      def: Math.max(50, ovr - 15 + Math.floor(Math.random() * 30)),
      phy: Math.max(50, ovr - 15 + Math.floor(Math.random() * 30)),
    }
  };
};

export const generateStarterSquad = (): Player[] => {
  const squad: Player[] = [];
  // 1 GK
  squad.push(generateRandomPlayer('BRONZE', 'GK'));
  // 4 DF
  for(let i=0; i<4; i++) squad.push(generateRandomPlayer('BRONZE', 'DF'));
  // 3 MF
  for(let i=0; i<3; i++) squad.push(generateRandomPlayer('BRONZE', 'MF'));
  // 3 FW
  for(let i=0; i<3; i++) squad.push(generateRandomPlayer('BRONZE', 'FW'));
  
  // Add a few subs
  for(let i=0; i<4; i++) squad.push(generateRandomPlayer('BRONZE'));

  return squad;
};

export const getInitialSquad = (players: Player[]): (Player | null)[] => {
  // Default 4-3-3: GK, LB, CB, CB, RB, CM, CM, CM, LW, ST, RW
  const squad = new Array(11).fill(null);
  const usedIds = new Set<string>();

  const findAndAssign = (pos: Position, index: number) => {
    const player = players.find(p => p.position === pos && !usedIds.has(p.id));
    if (player) {
      squad[index] = player;
      usedIds.add(player.id);
    }
  };

  // Assign GK (Index 0)
  findAndAssign('GK', 0);

  // Assign Defenders (Indices 1-4)
  for (let i = 1; i <= 4; i++) findAndAssign('DF', i);

  // Assign Midfielders (Indices 5-7)
  for (let i = 5; i <= 7; i++) findAndAssign('MF', i);

  // Assign Forwards (Indices 8-10)
  for (let i = 8; i <= 10; i++) findAndAssign('FW', i);

  // Fill remaining slots with any available players if specific positions weren't found
  for (let i = 0; i < 11; i++) {
    if (!squad[i]) {
      const player = players.find(p => !usedIds.has(p.id));
      if (player) {
        squad[i] = player;
        usedIds.add(player.id);
      }
    }
  }

  return squad;
};
