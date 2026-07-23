/**
 * Lobby-Meta-Logic — Spiellogik fuer Lobby-Meta-Anzeige (browser-frei, testbar)
 *
 * Reine Logik fuer die Anzeige von Meta-Progression in der Lobby:
 * - Level, XP-Bar, Sterne, Spiele-Anzahl, Achievement-Zaehler
 * - Keine DOM-Abhaengigkeiten
 */

/**
 * Berechnet XP-Bar-Daten aus Progression-State.
 * @param {{xp:number, totalXp:number, level:number}} prog
 * @returns {{current:number, needed:number, percent:number}}
 */
export function getXpBarData(prog) {
  if (!prog) return { current: 0, needed: 0, percent: 0 };
  const lvl = prog.level || 0;
  const totalXp = prog.totalXp || 0;

  // XP die fuer dieses Level noetig sind
  const need = xpForLevel(lvl);
  // XP die fuer vorherige Level verbraucht wurden
  const spent = totalXpForLevel(lvl);
  // XP im aktuellen Level
  const current = totalXp - spent;
  // Prozent (0-100)
  const percent = need > 0 ? Math.floor((current / need) * 100) : 0;

  return {
    current: Math.max(0, current),
    needed: need,
    percent: Math.max(0, Math.min(100, percent)),
  };
}

/**
 * Zaehlt die freigeschalteten Achievements.
 * @param {{unlocked:Object<string,boolean>}} achState
 * @returns {number}
 */
export function getAchievementCount(achState) {
  if (!achState || !achState.unlocked) return 0;
  return Object.keys(achState.unlocked).filter(k => achState.unlocked[k]).length;
}

/**
 * Gibt den Level-Anzeige-Text zurueck.
 * @param {{level:number}} prog
 * @returns {string}
 */
export function getLevelDisplay(prog) {
  if (!prog) return 'Level 0';
  return 'Level ' + (prog.level || 0);
}

/**
 * Gibt die Stern-Anzahl zurueck.
 * @param {{stars:number}} prog
 * @returns {number}
 */
export function getStarsDisplay(prog) {
  if (!prog) return 0;
  return prog.stars || 0;
}

/**
 * Erstellt ein vollstaendiges Display-Objekt fuer die Lobby.
 * @param {{xp:number, totalXp:number, level:number, stars:number, gamesPlayed:number}} prog
 * @param {{unlocked:Object<string,boolean>}} achState
 * @returns {{level:number, stars:number, gamesPlayed:number, achievementCount:number, xpBar:{current:number,needed:number,percent:number}}}
 */
export function createLobbyMeta(prog, achState) {
  return {
    level: prog.level || 0,
    stars: prog.stars || 0,
    gamesPlayed: prog.gamesPlayed || 0,
    achievementCount: getAchievementCount(achState),
    xpBar: getXpBarData(prog),
  };
}

/**
 * Formatiert eine Zusammenfassung fuer die Lobby-Anzeige.
 * @param {{level:number, stars:number, gamesPlayed:number}} prog
 * @param {{unlocked:Object<string,boolean>}} achState
 * @returns {string}
 */
export function formatMetaSummary(prog, achState) {
  const level = prog.level || 0;
  const stars = prog.stars || 0;
  const games = prog.gamesPlayed || 0;
  const achCount = getAchievementCount(achState);
  return `Level ${level} | ${stars} Sterne | ${games} Spiele | ${achCount}/10 Achievements`;
}

/* ---------- Hilfsfunktionen (gleiche Logik wie meta-progression-logic.js) ---------- */

function xpForLevel(level) {
  if (level < 0) level = 0;
  return Math.floor(100 * Math.pow(1.5, Math.max(0, level - 1)));
}

function totalXpForLevel(level) {
  if (level <= 0) return 0;
  let total = 0;
  for (let i = 0; i < level; i++) {
    total += xpForLevel(i);
  }
  return total;
}