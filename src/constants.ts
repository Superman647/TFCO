import { Position } from './types';

export const FORMATION_POSITIONS: Record<string, { label: string; pos: Position; classes: string; matchX: number; matchY: number }[]> = {
  '4-3-3': [
    { label: 'GK', pos: 'GK', classes: 'top-[90%] left-1/2', matchX: 0.05, matchY: 0.5 },
    { label: 'LB', pos: 'DF', classes: 'top-[75%] left-[15%]', matchX: 0.2, matchY: 0.15 },
    { label: 'CB', pos: 'DF', classes: 'top-[80%] left-[35%]', matchX: 0.2, matchY: 0.35 },
    { label: 'CB', pos: 'DF', classes: 'top-[80%] left-[65%]', matchX: 0.2, matchY: 0.65 },
    { label: 'RB', pos: 'DF', classes: 'top-[75%] left-[85%]', matchX: 0.2, matchY: 0.85 },
    { label: 'CM', pos: 'MF', classes: 'top-[50%] left-[25%]', matchX: 0.4, matchY: 0.25 },
    { label: 'CM', pos: 'MF', classes: 'top-[55%] left-1/2', matchX: 0.4, matchY: 0.5 },
    { label: 'CM', pos: 'MF', classes: 'top-[50%] left-[75%]', matchX: 0.4, matchY: 0.75 },
    { label: 'LW', pos: 'FW', classes: 'top-[25%] left-[20%]', matchX: 0.6, matchY: 0.2 },
    { label: 'ST', pos: 'FW', classes: 'top-[20%] left-1/2', matchX: 0.6, matchY: 0.5 },
    { label: 'RW', pos: 'FW', classes: 'top-[25%] left-[80%]', matchX: 0.6, matchY: 0.8 },
  ],
  '4-4-2': [
    { label: 'GK', pos: 'GK', classes: 'top-[90%] left-1/2', matchX: 0.05, matchY: 0.5 },
    { label: 'LB', pos: 'DF', classes: 'top-[75%] left-[15%]', matchX: 0.2, matchY: 0.15 },
    { label: 'CB', pos: 'DF', classes: 'top-[80%] left-[35%]', matchX: 0.2, matchY: 0.35 },
    { label: 'CB', pos: 'DF', classes: 'top-[80%] left-[65%]', matchX: 0.2, matchY: 0.65 },
    { label: 'RB', pos: 'DF', classes: 'top-[75%] left-[85%]', matchX: 0.2, matchY: 0.85 },
    { label: 'LM', pos: 'MF', classes: 'top-[50%] left-[15%]', matchX: 0.4, matchY: 0.15 },
    { label: 'CM', pos: 'MF', classes: 'top-[55%] left-[35%]', matchX: 0.4, matchY: 0.35 },
    { label: 'CM', pos: 'MF', classes: 'top-[55%] left-[65%]', matchX: 0.4, matchY: 0.65 },
    { label: 'RM', pos: 'MF', classes: 'top-[50%] left-[85%]', matchX: 0.4, matchY: 0.85 },
    { label: 'ST', pos: 'FW', classes: 'top-[20%] left-[35%]', matchX: 0.6, matchY: 0.35 },
    { label: 'ST', pos: 'FW', classes: 'top-[20%] left-[65%]', matchX: 0.6, matchY: 0.65 },
  ],
  '3-5-2': [
    { label: 'GK', pos: 'GK', classes: 'top-[90%] left-1/2', matchX: 0.05, matchY: 0.5 },
    { label: 'CB', pos: 'DF', classes: 'top-[80%] left-[20%]', matchX: 0.2, matchY: 0.2 },
    { label: 'CB', pos: 'DF', classes: 'top-[85%] left-1/2', matchX: 0.2, matchY: 0.5 },
    { label: 'CB', pos: 'DF', classes: 'top-[80%] left-[80%]', matchX: 0.2, matchY: 0.8 },
    { label: 'LM', pos: 'MF', classes: 'top-[50%] left-[10%]', matchX: 0.4, matchY: 0.1 },
    { label: 'CDM', pos: 'MF', classes: 'top-[60%] left-[35%]', matchX: 0.35, matchY: 0.35 },
    { label: 'CAM', pos: 'MF', classes: 'top-[45%] left-1/2', matchX: 0.5, matchY: 0.5 },
    { label: 'CDM', pos: 'MF', classes: 'top-[60%] left-[65%]', matchX: 0.35, matchY: 0.65 },
    { label: 'RM', pos: 'MF', classes: 'top-[50%] left-[90%]', matchX: 0.4, matchY: 0.9 },
    { label: 'ST', pos: 'FW', classes: 'top-[20%] left-[35%]', matchX: 0.6, matchY: 0.35 },
    { label: 'ST', pos: 'FW', classes: 'top-[20%] left-[65%]', matchX: 0.6, matchY: 0.65 },
  ]
};
