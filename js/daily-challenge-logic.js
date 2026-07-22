/**
 * Daily Challenge — Spiellogik (browser-frei, testbar)
 *
 * Reine Logik fuer taegliche Challenge: deterministische Spielauswahl,
 * Streak-System, Bonus-Sterne, XP-Multiplikator.
 * Keine DOM-Abhaengigkeiten.
 *
 * Konzept:
 *  - Jeder Tag hat ein festes Minispiel (seed-basiert, deterministisch)
 *  - Spieler kann 1x pro Tag spielen
 *  - Streak zaehlt aufeinanderfolgende Tage
 *  - Laengerer Streak = mehr Bonus-Sterne + hoeherer XP-Multiplikator
 */

/**
 * Wandelt ein Date-Objekt in einen "YYYY-MM-DD" String um.
 * Nutzt lokale Zeit (nicht UTC).
 * @param {Date} date
 * @returns {string}
 */
export function getDailyKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Berechnet einen deterministischen Seed aus einem Datum.
 * Basierend auf dem Tages-Key als Hash.
 * @param {Date} date
 * @returns {number} positive Integer
 */
export function getDailySeed(date) {
  const key = getDailyKey(date);
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = ((hash << 5) - hash + key.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

/**
 * Waehlt deterministisch ein Spiel aus der Liste aus.
 * @param {Date} date
 * @param {string[]} gameIds - verfuegbare Spiel-IDs
 * @returns {string|null} game ID oder null bei leerer Liste
 */
export function getDailyGameId(date, gameIds) {
  if (!gameIds || gameIds.length === 0) return null;
  const seed = getDailySeed(date);
  return gameIds[seed % gameIds.length];
}

/**
 * Bonus-Sterne basierend auf aktuellem Streak.
 * Basis 3 + 1 pro Streak-Tag, max 10.
 * @param {number} streak
 * @returns {number}
 */
export function getDailyBonusStars(streak) {
  return Math.min(10, 3 + Math.max(0, streak));
}

/**
 * XP-Multiplikator basierend auf aktuellem Streak.
 * 1.0 + 0.1 pro Streak-Tag, max 2.0.
 * @param {number} streak
 * @returns {number}
 */
export function getDailyXpMultiplier(streak) {
  return Math.min(2.0, 1.0 + 0.1 * Math.max(0, streak));
}

/**
 * Erstellt den Startzustand fuer Daily Challenge.
 * @returns {{lastPlayedDate:string|null, streak:number, totalCompleted:number, bestStreak:number}}
 */
export function createDailyState() {
  return {
    lastPlayedDate: null,
    streak: 0,
    totalCompleted: 0,
    bestStreak: 0,
  };
}

/**
 * Prueft ob der Spieler heute schon spielen darf.
 * @param {{lastPlayedDate:string|null}} state
 * @param {Date} now
 * @returns {boolean}
 */
export function canPlayDaily(state, now) {
  if (!state.lastPlayedDate) return true;
  return state.lastPlayedDate !== getDailyKey(now);
}

/**
 * Prueft ob zwei Datum-Keys aufeinanderfolgende Tage sind.
 * @param {string} prev - "YYYY-MM-DD"
 * @param {string} curr - "YYYY-MM-DD"
 * @returns {boolean}
 */
function isConsecutiveDay(prev, curr) {
  const p = new Date(prev + 'T00:00:00');
  const c = new Date(curr + 'T00:00:00');
  const diff = Math.round((c - p) / (1000 * 60 * 60 * 24));
  return diff === 1;
}

/**
 * Registriert ein abgespieltes Daily Challenge.
 * Aktualisiert Streak, totalCompleted, bestStreak.
 * @param {{lastPlayedDate:string|null, streak:number, totalCompleted:number, bestStreak:number}} state - wird mutiert
 * @param {Date} now
 * @param {number} score - erreichte Punktzahl (fuer zukuenftige Highscore-Feature)
 * @returns {{alreadyPlayed:boolean, bonusStars:number, xpMultiplier:number, newBestStreak:boolean, streak:number}}
 */
export function recordDailyPlay(state, now, score) {
  const todayKey = getDailyKey(now);

  // Schon heute gespielt?
  if (state.lastPlayedDate === todayKey) {
    return {
      alreadyPlayed: true,
      bonusStars: 0,
      xpMultiplier: 1.0,
      newBestStreak: false,
      streak: state.streak,
    };
  }

  // Streak berechnen
  if (state.lastPlayedDate && isConsecutiveDay(state.lastPlayedDate, todayKey)) {
    state.streak += 1;
  } else {
    state.streak = 1;
  }

  state.totalCompleted += 1;
  state.lastPlayedDate = todayKey;

  const newBestStreak = state.streak > state.bestStreak;
  if (newBestStreak) {
    state.bestStreak = state.streak;
  }

  const bonusStars = getDailyBonusStars(state.streak - 1); // Bonus basiert auf Streak vor diesem Play
  const xpMultiplier = getDailyXpMultiplier(state.streak - 1);

  return {
    alreadyPlayed: false,
    bonusStars,
    xpMultiplier,
    newBestStreak,
    streak: state.streak,
  };
}

/**
 * Gibt Streak-Info fuer UI-Anzeige zurueck.
 * @param {{streak:number, bestStreak:number, totalCompleted:number}} state
 * @returns {{streak:number, bestStreak:number, totalCompleted:number}}
 */
export function getStreakInfo(state) {
  return {
    streak: state.streak,
    bestStreak: state.bestStreak,
    totalCompleted: state.totalCompleted,
  };
}