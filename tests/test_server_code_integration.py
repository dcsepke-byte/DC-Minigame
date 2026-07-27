"""
Server Code-Integration — TDD Tests

Prueft dass server.py den 5-stelligen Raum-Code aus room_security nutzt
und die Rate-Limiter-Funktionen fuer Brute-Force-Schutz verdrahtet sind.

Aufruf: python3 -m unittest tests.test_server_code_integration -v
"""
import unittest
import sys
import os
import importlib

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from room_security import (
    CODE_LENGTH,
    CODE_ALPHABET,
    create_rate_limiter,
    check_and_record,
    clear_failures,
    RATE_LIMIT_MAX_ATTEMPTS,
)


class TestServerGenCode(unittest.TestCase):
    """server.gen_code muss 5-stellige Codes aus CODE_ALPHABET erzeugen."""

    def setUp(self):
        # server-Modul (neu) laden, damit rooms dict frisch ist
        if 'server' in sys.modules:
            del sys.modules['server']
        import server
        self.server = server

    def test_gen_code_uses_5_chars(self):
        code = self.server.gen_code()
        self.assertEqual(len(code), CODE_LENGTH,
                         f"gen_code() sollte {CODE_LENGTH}-stelligen Code liefern, war {len(code)}")

    def test_gen_code_uses_secure_alphabet(self):
        for _ in range(50):
            code = self.server.gen_code()
            for ch in code:
                self.assertIn(ch, CODE_ALPHABET,
                              f"Zeichen '{ch}' nicht im sicheren Alphabet")

    def test_gen_code_unique(self):
        rooms = self.server.rooms
        rooms.clear()
        seen = set()
        for _ in range(100):
            code = self.server.gen_code()
            self.assertNotIn(code, seen, "Code doppelt generiert")
            seen.add(code)
            rooms[code] = True  # simuliere belegten Raum

    def test_gen_code_uppercase(self):
        code = self.server.gen_code()
        self.assertEqual(code, code.upper(),
                         "Code sollte nur Grossbuchstaben/Zahlen enthalten")


class TestServerRateLimiterWired(unittest.TestCase):
    """server.py muss einen Rate-Limiter-State auf Modul-Ebene haben."""

    def setUp(self):
        if 'server' in sys.modules:
            del sys.modules['server']
        import server
        self.server = server

    def test_server_has_rate_limiter_state(self):
        self.assertTrue(hasattr(self.server, 'join_rate_limiter'),
                        "server sollte einen join_rate_limiter State haben")
        rl = self.server.join_rate_limiter
        self.assertIsNotNone(rl)
        self.assertIn('failures', rl)

    def test_server_has_record_failure_fn(self):
        """server sollte eine Hilfsfunktion haben um Fehlversuche zu zaehlen."""
        self.assertTrue(hasattr(self.server, 'record_join_failure'),
                        "server sollte record_join_failure Funktion haben")
        self.assertTrue(callable(self.server.record_join_failure))

    def test_server_has_clear_failures_fn(self):
        """server sollte eine Funktion haben um Fehlversuche nach Erfolg zu loeschen."""
        self.assertTrue(hasattr(self.server, 'clear_join_failures'),
                        "server sollte clear_join_failures Funktion haben")
        self.assertTrue(callable(self.server.clear_join_failures))


if __name__ == '__main__':
    unittest.main()