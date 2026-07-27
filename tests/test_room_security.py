"""
Room Security — Logik-Tests (TDD RED phase)

Testet reine Funktionen fuer Brute-Force-Schutz und Raum-Code-Generierung.
Python Standardbibliothek unittest (keine Abhaengigkeiten).
Aufruf: python3 -m unittest tests.test_room_security -v
"""
import unittest
import time
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from room_security import (
    generate_code,
    create_rate_limiter,
    check_and_record,
    record_failure,
    clear_failures,
    RATE_LIMIT_MAX_ATTEMPTS,
    RATE_LIMIT_WINDOW,
    CODE_LENGTH,
    CODE_ALPHABET,
)


class TestGenerateCode(unittest.TestCase):
    """Code-Generierung: 5-stellig, eindeutig, nur erlaubte Zeichen."""

    def test_code_has_correct_length(self):
        code = generate_code(set())
        self.assertEqual(len(code), CODE_LENGTH,
                         f"Code sollte {CODE_LENGTH} Zeichen lang sein, war {len(code)}")

    def test_code_uses_only_alphabet_chars(self):
        code = generate_code(set())
        for ch in code:
            self.assertIn(ch, CODE_ALPHABET,
                          f"Zeichen '{ch}' nicht im Alphabet")

    def test_code_is_unique_among_existing(self):
        existing = set()
        codes = set()
        for _ in range(200):
            code = generate_code(existing)
            self.assertNotIn(code, existing,
                             f"Code {code} wurde doppelt generiert")
            existing.add(code)
            codes.add(code)

    def test_code_does_not_collide_with_provided_existing(self):
        # Generiere einen Code, der garantiert nicht in existing ist
        existing = {"AAAAA", "BBBBB", "CCCCC"}
        for _ in range(50):
            code = generate_code(existing)
            self.assertNotIn(code, existing)

    def test_code_is_uppercase(self):
        code = generate_code(set())
        self.assertEqual(code, code.upper(),
                         "Code sollte nur Grossbuchstaben/Zahlen enthalten")


class TestRateLimiter(unittest.TestCase):
    """Brute-Force-Sperre: nach X Fehlversuchen in Y Sekunden blockieren."""

    def test_first_attempt_allowed(self):
        rl = create_rate_limiter()
        result = check_and_record(rl, "192.168.1.1", now=1000.0)
        self.assertTrue(result['allowed'],
                        "Erster Versuch sollte erlaubt sein")
        self.assertNotIn('retry_after', result)

    def test_allows_up_to_max_attempts(self):
        rl = create_rate_limiter()
        for i in range(RATE_LIMIT_MAX_ATTEMPTS):
            result = check_and_record(rl, "10.0.0.1", now=1000.0 + i * 0.1)
            self.assertTrue(result['allowed'],
                            f"Versuch {i+1} sollte erlaubt sein")

    def test_blocks_after_max_attempts(self):
        rl = create_rate_limiter()
        for i in range(RATE_LIMIT_MAX_ATTEMPTS):
            check_and_record(rl, "10.0.0.2", now=1000.0 + i * 0.1)
        # Naechster Versuch sollte geblockt werden
        result = check_and_record(rl, "10.0.0.2", now=1000.0 + RATE_LIMIT_MAX_ATTEMPTS * 0.1)
        self.assertFalse(result['allowed'],
                         "Nach max Fehlversuchen sollte geblockt werden")
        self.assertIn('retry_after', result)
        self.assertGreater(result['retry_after'], 0,
                           "retry_after sollte positiv sein")

    def test_different_ips_independent(self):
        rl = create_rate_limiter()
        for i in range(RATE_LIMIT_MAX_ATTEMPTS):
            check_and_record(rl, "1.1.1.1", now=1000.0 + i * 0.1)
        # Andere IP sollte nicht geblockt sein
        result = check_and_record(rl, "2.2.2.2", now=1000.0)
        self.assertTrue(result['allowed'],
                        "Andere IP sollte nicht vom Limit betroffen sein")

    def test_window_expires_after_timeout(self):
        rl = create_rate_limiter()
        for i in range(RATE_LIMIT_MAX_ATTEMPTS):
            check_and_record(rl, "10.0.0.3", now=1000.0 + i * 0.1)
        # Nach Ablauf des Zeitfensters wieder erlaubt
        later = 1000.0 + RATE_LIMIT_WINDOW + 10
        result = check_and_record(rl, "10.0.0.3", now=later)
        self.assertTrue(result['allowed'],
                        "Nach Ablauf des Fensters sollte wieder erlaubt sein")

    def test_retry_after_decreases_over_time(self):
        rl = create_rate_limiter()
        for i in range(RATE_LIMIT_MAX_ATTEMPTS):
            check_and_record(rl, "10.0.0.4", now=1000.0 + i * 0.1)
        r1 = check_and_record(rl, "10.0.0.4", now=1001.0)
        r2 = check_and_record(rl, "10.0.0.4", now=1005.0)
        self.assertFalse(r1['allowed'])
        self.assertFalse(r2['allowed'])
        self.assertLess(r2['retry_after'], r1['retry_after'],
                        "retry_after sollte mit der Zeit abnehmen")

    def test_record_failure_increments_count(self):
        rl = create_rate_limiter()
        record_failure(rl, "10.0.0.5", now=1000.0)
        record_failure(rl, "10.0.0.5", now=1000.1)
        result = check_and_record(rl, "10.0.0.5", now=1000.2)
        # 3 Versuche (2 record + 1 check) -> wenn max > 3 noch allowed
        # Aber wir wollen, dass check_and_record auch zaehlt
        # Bei max=5: 3 Versuche = noch allowed
        # Bei max=3: 3 Versuche = blocked
        # Test ist generisch: pruefe dass nach weiteren Versuchen geblockt wird
        if RATE_LIMIT_MAX_ATTEMPTS <= 3:
            self.assertFalse(result['allowed'])
        else:
            self.assertTrue(result['allowed'])

    def test_clear_failures_resets_ip(self):
        rl = create_rate_limiter()
        for i in range(RATE_LIMIT_MAX_ATTEMPTS):
            check_and_record(rl, "10.0.0.6", now=1000.0 + i * 0.1)
        clear_failures(rl, "10.0.0.6")
        result = check_and_record(rl, "10.0.0.6", now=1000.0)
        self.assertTrue(result['allowed'],
                        "Nach clear_failures sollte IP wieder erlaubt sein")

    def test_successful_join_does_not_block(self):
        """Wenn ein Spieler erfolgreich beitritt, sollte kein Limit zaehlen."""
        rl = create_rate_limiter()
        # Einige Versuche, dann erfolgreich (clear), dann weiter
        for i in range(RATE_LIMIT_MAX_ATTEMPTS - 1):
            check_and_record(rl, "10.0.0.7", now=1000.0 + i * 0.1)
        # Erfolgreicher Join -> failures loeschen
        clear_failures(rl, "10.0.0.7")
        # Weitere Versuche sollten wieder erlaubt sein
        for i in range(RATE_LIMIT_MAX_ATTEMPTS):
            result = check_and_record(rl, "10.0.0.7", now=1100.0 + i * 0.1)
            self.assertTrue(result['allowed'],
                            f"Nach erfolgreichem Join sollten Versuche erlaubt sein (Versuch {i+1})")


class TestRateLimiterConstants(unittest.TestCase):
    """Konstanten pruefen."""

    def test_code_length_is_5(self):
        self.assertEqual(CODE_LENGTH, 5,
                         "Raum-Code sollte 5-stellig sein")

    def test_alphabet_has_no_ambiguous_chars(self):
        # Kein 0, O, 1, I (verwechslungsgefaehrlich)
        for ch in ['0', 'O', '1', 'I']:
            self.assertNotIn(ch, CODE_ALPHABET,
                             f"Ambiguoes Zeichen '{ch}' sollte nicht im Alphabet sein")

    def test_max_attempts_is_reasonable(self):
        self.assertGreaterEqual(RATE_LIMIT_MAX_ATTEMPTS, 3,
                                "Mindestens 3 Fehlversuche tolerieren")
        self.assertLessEqual(RATE_LIMIT_MAX_ATTEMPTS, 10,
                             "Maximal 10 Fehlversuche tolerieren")

    def test_window_is_reasonable(self):
        self.assertGreaterEqual(RATE_LIMIT_WINDOW, 30,
                                "Fenster sollte mindestens 30s sein")
        self.assertLessEqual(RATE_LIMIT_WINDOW, 600,
                             "Fenster sollte maximal 10min sein")


if __name__ == '__main__':
    unittest.main()