// 六個關卡：每關三波，n = 一般、f = 快速、t = 坦克、b = 大魔王
export const LEVELS = [
  { theme: 'carnival', name: '夜晚遊樂園', waves: ['nnn', 'nnnf', 'nnffn'] },
  { theme: 'candy', name: '糖果森林', waves: ['nnfn', 'nffnn', 'tnfnf'] },
  { theme: 'snow', name: '冰雪村莊', waves: ['ntnf', 'ffntn', 'ttnffn'] },
  { theme: 'beach', name: '夕陽海灘', waves: ['fffn', 'tnffnn', 'ttffnn'] },
  { theme: 'graveyard', name: '南瓜墓園', waves: ['nntffn', 'tfftnn', 'ttfffnn'] },
  { theme: 'moon', name: '月球基地', waves: ['tffnn', 'ttffnn', 'bnf'] }
];
const TYPE_CODES = { n: 'normal', f: 'fast', t: 'tank', b: 'boss' };

export function waveTypes(levelIndex, waveIndex) { return [...LEVELS[levelIndex].waves[waveIndex]].map(c => TYPE_CODES[c]); }

// 同時在場上的殭屍上限，避免太多造成卡頓
export const MAX_ALIVE = 6;

export function loadProgress(storage) { try { return Math.min(LEVELS.length, Math.max(1, Number(storage.getItem('monster-unlocked')) || 1)); } catch { return 1; } }
export function saveProgress(storage, unlocked) { try { storage.setItem('monster-unlocked', String(unlocked)); } catch {} }
