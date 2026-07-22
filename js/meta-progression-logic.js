/**
 * Meta-Progression — Spiellogik (browser-frei, testbar)
 *
 * Reine Logik fuer XP/Level-System, Sternen-Waehrung, Achievements.
 * Keine DOM-Abhaengigkeiten.
 *
 * Konzept:
 *  - Spieler sammelt XP aus Minispielen
 *  - XP fuehrt zu Level-Aufstiegen
 *  - Level-Up gibt Sterne (Waehrung fuer Unlocks)
 *  - Sterne auch aus Platzierung bei Minispielen
 *  - Progressive XP-Kurve (jedes Level braucht mehr)
 */

/**
 * XP die noetig sind um von Level N auf N+1 aufzusteigen.
 * Basis 100, steigt linear (1.5x pro Level, abgerundet).
 * @param {number} level - aktuelles Level
 * @returns {number} XP fuer naechsten Aufstieg
 */
export function xpForLevel(level) {
  if (level < 0) level = 0;
  return Math.floor(100 * Math.pow(1.5, Math.max(0, level - 1)));
}

/**
 * Kumulierte XP die noetig sind um Level N zu erreichen (ab Level 0).
 * @param {number} level
 * @returns {number}
 */
export function totalXpForLevel(level) {
  if (level <= 0) return 0;
  let total = 0;
  for (let i = 0; i < level; i++) {
    total += xpForLevel(i);
  }
  return total;
}

/**
 * Berechnet das Level aus einer gegebenen XP-Menge.
 * @param {number} xp
 * @returns {number} aktuelles Level
 */
export function levelFromXp(xp) {
  if (xp <= 0) return 0;
  let level = 0;
  let remaining = xp;
  while (remaining >= xpForLevel(level)) {
    remaining -= xpForLevel(level);
    level++;
    if (level > 999) break; // safety
  }
  return level;
}

/**
 * XP, die im aktuellen Level noch fehlen bis zum naechsten Aufstieg.
 * @param {number} xp - gesamt XP
 * @returns {number}
 */
export function xpToNextLevel(xp) {
  const lvl = levelFromXp(xp);
  const spent = totalXpForLevel(lvl);
  const need = xpForLevel(lvl);
  return Math.max(0, need - (xp - spent));
}

/**
 * XP im aktuellen Level (gesamt minus verbrauchte fuer vorherige Level).
 * @param {number} xp - gesamt XP
 * @returns {number}
 */
export function currentLevelXp(xp) {
  const lvl = levelFromXp(xp);
  return xp - totalXpForLevel(lvl);
}

/**
 * Konvertiert Minispiel-Punktzahl in XP.
 * Diminishing Returns: sqrt-basiert, damit hohe Scores nicht exploiten.
 * @param {number} score
 * @returns {number} XP
 */
export function xpFromGameScore(score) {
  if (score <= 0) return 0;
  return Math.floor(Math.sqrt(score) * 2);
}

/**
 * Sterne-Belohnung beim Erreichen eines Levels.
 * Basis 3 + 1 pro Level (Level 1 = 4, Level 2 = 5, ...).
 * @param {number} level
 * @returns {number}
 */
export function starRewardForLevel(level) {
  if (level <= 0) return 0;
  return 3 + level;
}

/**
 * Sterne-Belohnung aus Minispiel-Platzierung.
 * 1. Platz: 5, 2.: 3, 3.: 2, 4.+: 1
 * @param {number} placement - 1-basiert
 * @param {number} playerCount
 * @returns {number}
 */
export function starsFromPlacement(placement, playerCount) {
  if (placement <= 0) return 0;
  if (placement === 1) return 5;
  if (placement === 2) return 3;
  if (placement === 3) return 2;
  return 1;
}

/**
 * Erstellt den Startzustand fuer ein neues Spieler-Profil.
 * @returns {ProgressionState}
 */
export function createProgression() {
  return {
    xp: 0,
    totalXp: 0,
    level: 0,
    stars: 0,
    gamesPlayed: 0,
  };
}

/**
 * Fuegt XP zum Profil hinzu und berechnet Level-Up.
 * Mutiert den state. Gibt Level-Up-Info zurueck.
 * @param {ProgressionState} state
 * @param {number} amount - XP-Menge (negativ wird auf 0 geklemmt)
 * @returns {{leveledUp:boolean, newLevel:number, starsEarned:number}}
 */
export function addXp(state, amount) {
  if (amount < 0) amount = 0;
  const oldLevel = state.level;
  state.xp += amount;
  state.totalXp += amount;
  if (state.xp < 0) { state.xp = 0; state.totalXp = Math.max(0, state.totalXp); }
  state.level = levelFromXp(state.totalXp);

  const leveledUp = state.level > oldLevel;
  let starsEarned = 0;
  if (leveledUp) {
    for (let l = oldLevel + 1; l <= state.level; l++) {
      starsEarned += starRewardForLevel(l);
    }
    state.stars += starsEarned;
  }
  return { leveledUp, newLevel: state.level, starsEarned };
}

/**
 * Wendet ein komplettes Minispiel-Ergebnis an.
 * Gibt XP aus Score, Sterne aus Platzierung, erhoeht gamesPlayed.
 * @param {ProgressionState} state
 * @param {{score:number, placement:number, playerCount:number}} result
 * @returns {{leveledUp:boolean, newLevel:number, xpEarned:number, starsEarned:number, levelStars:number}}
 */
export function applyGameResult(state, result) {
  state.gamesPlayed++;
  const xpEarned = xpFromGameScore(result.score);
  const placementStars = starsFromPlacement(result.placement, result.playerCount);
  state.stars += placementStars;
  const xpResult = addXp(state, xpEarned);
  return {
    leveledUp: xpResult.leveledUp,
    newLevel: xpResult.newLevel,
    xpEarned,
    starsEarned: placementStars + xpResult.starsEarned,
    levelStars: xpResult.starsEarned,
  };
}

/* =========================================================
   ACHIEVEMENTS
   ========================================================= */

/**
 * Achievement-Definitionen.
 * Jedes Achievement hat eine check(prog)-Funktion die true zurueckgibt wenn erfuellt.
 */
export const ACHIEVEMENTS = [
  { id: 'first_game',    label: 'Erstes Spiel',    desc: 'Spiele dein erstes Minispiel',  icon: '🎮', check: p => p.gamesPlayed >= 1 },
  { id: 'veteran_10',    label: 'Veteran',         desc: 'Spiele 10 Minispiele',          icon: '🎖️', check: p => p.gamesPlayed >= 10 },
  { id: 'veteran_50',    label: 'Minispiel-Profi', desc: 'Spiele 50 Minispiele',          icon: '🏅', check: p => p.gamesPlayed >= 50 },
  { id: 'level_5',       label: 'Aufsteiger',      desc: 'Erreiche Level 5',              icon: '⭐', check: p => p.level >= 5 },
  { id: 'level_10',      label: 'Champion',        desc: 'Erreiche Level 10',             icon: '🏆', check: p => p.level >= 10 },
  { id: 'level_25',      label: 'Legende',         desc: 'Erreiche Level 25',             icon: '👑', check: p => p.level >= 25 },
  { id: 'star_collector_50',  label: 'Sternensammler',  desc: 'Sammle 50 Sterne',         icon: '✨', check: p => p.stars >= 50 },
  { id: 'star_collector_200', label: 'Sternenmillionaer', desc: 'Sammle 200 Sterne',       icon: '💫', check: p => p.stars >= 200 },
  { id: 'high_scorer',   label: 'Punktejaeger',    desc: 'Erreiche 1000 XP insgesamt',    icon: '🔥', check: p => p.totalXp >= 1000 },
  { id: 'dedicated',     label: 'Eingeschworen',   desc: 'Erreiche 5000 XP insgesamt',    icon: '💎', check: p => p.totalXp >= 5000 },
];

/** Map fuer schnellen Lookup */
const ACH_BY_ID = Object.fromEntries(ACHIEVEMENTS.map(a => [a.id, a]));

/**
 * Erstellt den Achievement-State fuer einen neuen Spieler.
 * @returns {{unlocked:Object<string,boolean>}}
 */
export function createAchievementState() {
  return { unlocked: {} };
}

/**
 * Prueft alle Achievements gegen den Progression-State.
 * Gibt nur neu freigeschaltete Achievements zurueck (bereits freigeschaltete werden markiert).
 * @param {ProgressionState} prog
 * @param {{unlocked:Object<string,boolean>}} achState
 * @returns {Array<{id:string,label:string,desc:string,icon:string}>}
 */
export function checkAchievements(prog, achState) {
  const newly = [];
  for (const def of ACHIEVEMENTS) {
    if (achState.unlocked[def.id]) continue;
    if (def.check(prog)) {
      achState.unlocked[def.id] = true;
      newly.push({ id: def.id, label: def.label, desc: def.desc, icon: def.icon });
    }
  }
  return newly;
}

/**
 * Gibt alle freigeschalteten Achievement-Definitionen zurueck.
 * @param {{unlocked:Object<string,boolean>}} achState
 * @returns {Array}
 */
export function getUnlockedAchievements(achState) {
  return ACHIEVEMENTS.filter(a => achState.unlocked[a.id]);
}

/* =========================================================
   UNLOCK-SYSTEM — Charaktere & Cosmetics
   ========================================================= */

/**
 * Unlock-Katalog. price=0 bedeutet default (kostenlos).
 * type: 'character' (Spielfigur) oder 'trail' (Spur-Effekt) oder 'color' (Farbe).
 */
export const UNLOCKS = [
  // Charaktere (Default + freischaltbar)
  { id: 'char_rocket',  name: 'Rakete',   type: 'character', price: 0,  icon: '🚀', color: '#ff3cac' },
  { id: 'char_cat',     name: 'Katze',    type: 'character', price: 15, icon: '🐱', color: '#00f0ff' },
  { id: 'char_fox',     name: 'Fuchs',    type: 'character', price: 15, icon: '🦊', color: '#ff6a00' },
  { id: 'char_frog',    name: 'Frosch',   type: 'character', price: 20, icon: '🐸', color: '#2bffb9' },
  { id: 'char_panda',   name: 'Panda',    type: 'character', price: 25, icon: '🐼', color: '#ffffff' },
  { id: 'char_unicorn', name: 'Einhorn',  type: 'character', price: 40, icon: '🦄', color: '#7b2ff7' },
  { id: 'char_robot',   name: 'Roboter',  type: 'character', price: 40, icon: '🤖', color: '#3a86ff' },
  { id: 'char_octopus', name: 'Oktopus',  type: 'character', price: 50, icon: '🐙', color: '#ff4d6d' },
  // Trails (Cosmetic-Spureffekte)
  { id: 'trail_sparkle', name: 'Funken',   type: 'trail', price: 10, icon: '✨' },
  { id: 'trail_rainbow', name: 'Regenbogen', type: 'trail', price: 30, icon: '🌈' },
  { id: 'trail_fire',    name: 'Feuer',    type: 'trail', price: 20, icon: '🔥' },
];

const UNLOCK_BY_ID = Object.fromEntries(UNLOCKS.map(u => [u.id, u]));

/**
 * Erstellt den Unlock-State. Default-Charaktere (price=0) sind automatisch owned.
 * @returns {{owned:Object<string,boolean>}}
 */
export function createUnlockState() {
  const owned = {};
  for (const u of UNLOCKS) {
    if (u.price === 0) owned[u.id] = true;
  }
  return { owned };
}

/**
 * Prueft ob ein Unlock bereits owned ist.
 * @param {{owned:Object<string,boolean>}} state
 * @param {string} id
 * @returns {boolean}
 */
export function isOwned(state, id) {
  return !!state.owned[id];
}

/**
 * Prueft ob ein Unlock gekauft werden kann (genug Sterne, nicht bereits owned).
 * @param {{stars:number}} prog
 * @param {{owned:Object<string,boolean>}} unlockState
 * @param {string} id
 * @returns {boolean}
 */
export function canAfford(prog, unlockState, id) {
  const item = UNLOCK_BY_ID[id];
  if (!item) return false;
  if (isOwned(unlockState, id)) return false;
  return prog.stars >= item.price;
}

/**
 * Kauft einen Unlock. Zieht Sterne ab und markiert als owned.
 * @param {{stars:number}} prog - wird mutiert
 * @param {{owned:Object<string,boolean>}} unlockState - wird mutiert
 * @param {string} id
 * @returns {{success:boolean, reason?:string}}
 */
export function purchaseUnlock(prog, unlockState, id) {
  const item = UNLOCK_BY_ID[id];
  if (!item) return { success: false, reason: 'unknown' };
  if (isOwned(unlockState, id)) return { success: false, reason: 'owned' };
  if (prog.stars < item.price) return { success: false, reason: 'insufficient_stars' };
  prog.stars -= item.price;
  unlockState.owned[id] = true;
  return { success: true };
}

/**
 * Gibt alle verfuegbaren (nicht owned) Unlocks zurueck.
 * @param {{owned:Object<string,boolean>}} state
 * @returns {Array}
 */
export function getAvailableUnlocks(state) {
  return UNLOCKS.filter(u => !isOwned(state, u.id));
}

/**
 * Gibt alle owned Unlocks zurueck.
 * @param {{owned:Object<string,boolean>}} state
 * @returns {Array}
 */
export function getOwnedUnlocks(state) {
  return UNLOCKS.filter(u => isOwned(state, u.id));
}

/**
 * Gibt alle Unlocks eines bestimmten Typs zurueck.
 * @param {string} type - 'character', 'trail', etc.
 * @returns {Array}
 */
export function getUnlocksByType(type) {
  return UNLOCKS.filter(u => u.type === type);
}

/**
 * @typedef {Object} ProgressionState
 * @property {number} xp - aktuelle XP im Level (nicht kumuliert)
 * @property {number} totalXp - kumulierte Gesamt-XP
 * @property {number} level - aktuelles Level
 * @property {number} stars - Sternen-Waehrung
 * @property {number} gamesPlayed - Anzahl gespielter Minispiele
 */