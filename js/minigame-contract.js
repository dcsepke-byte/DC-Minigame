/**
 * Minigame Contract — Minispiel-Vertrag (browser-frei, testbar)
 *
 * Definiert den klaren Lebenszyklus jedes Minispiels (arch-1):
 *   start -> countdown -> gameplay -> timer -> winner -> reward -> exit
 *
 * - createMinigameSession()  : State-Machine, die den Lebenszyklus erzwingt
 * - validateMinigame(game)   : prueft, ob ein Spiel-Modul den Vertrag erfuellt
 *
 * Keine DOM-Abhaengigkeiten.
 */

/** Der vollstaendige Lebenszyklus in verbindlicher Reihenfolge */
export const MINIGAME_PHASES = [
  'start', 'countdown', 'gameplay', 'timer', 'winner', 'reward', 'exit',
];

/**
 * Erzeugt eine Minispiel-Session mit erzwungenem Lebenszyklus.
 * Erlaubt nur Vorwaerts-Uebergaenge in der definierten Phasen-Reihenfolge.
 */
export function createMinigameSession() {
  let current = 0;
  let score = 0;

  function phase() { return MINIGAME_PHASES[current]; }
  function isFinished() { return phase() === 'exit'; }

  function transition(to) {
    if (isFinished()) {
      throw new Error(`Session bereits beendet (exit), kein Uebergang zu ${to}`);
    }
    const idx = MINIGAME_PHASES.indexOf(to);
    if (idx === -1) {
      throw new Error(`Unbekannte Phase: ${to}`);
    }
    if (idx !== current + 1) {
      throw new Error(`Ungueltiger Uebergang: ${phase()} -> ${to}`);
    }
    current = idx;
  }

  function setScore(n) {
    if (phase() !== 'gameplay') {
      throw new Error(`setScore nur waehrend gameplay erlaubt (aktuell: ${phase()})`);
    }
    score = n;
  }

  function finish(finalScore) {
    if (phase() !== 'gameplay') {
      throw new Error(`finish nur aus gameplay erlaubt (aktuell: ${phase()})`);
    }
    score = finalScore;
    current = MINIGAME_PHASES.indexOf('winner');
  }

  return {
    phase,
    isFinished,
    transition,
    setScore,
    finish,
    score: () => score,
  };
}

/**
 * Prueft, ob ein Spiel-Modul den Minispiel-Vertrag erfuellt.
 * Mindestanforderung: id, name und eine play(stage, api) Funktion.
 * @param {object|null} game
 * @returns {boolean}
 */
export function validateMinigame(game) {
  if (!game || typeof game !== 'object') return false;
  return (
    typeof game.id === 'string' &&
    game.id.length > 0 &&
    typeof game.name === 'string' &&
    game.name.length > 0 &&
    typeof game.play === 'function'
  );
}
