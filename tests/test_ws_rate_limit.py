"""
WebSocket Message Rate-Limiting — Logik-Tests (TDD RED phase)

Testet reine Funktionen fuer Per-Client-Message-Rate-Limiting (max 10 Msg/s).
Python Standardbibliothek unittest (keine Abhaengigkeiten).
Aufruf: python3 -m unittest tests.test_ws_rate_limit -v
"""
import unittest
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from ws_rate_limit import (
    create_msg_limiter,
    check_message,
    MSG_RATE_MAX,
    MSG_RATE_WINDOW,
)


class TestCreateMsgLimiter(unittest.TestCase):
    """create_msg_limiter erzeugt leeren State."""

    def test_returns_dict_with_empty_clients(self):
        rl = create_msg_limiter()
        self.assertIsInstance(rl, dict)
        self.assertIn("clients", rl)
        self.assertEqual(rl["clients"], {})

    def test_returns_fresh_instance_each_call(self):
        rl1 = create_msg_limiter()
        rl2 = create_msg_limiter()
        rl1["clients"]["a"] = [1]
        self.assertNotIn("a", rl2["clients"])


class TestCheckMessage(unittest.TestCase):
    """check_message prueft ob ein Client noch Nachrichten senden darf."""

    def test_first_message_allowed(self):
        rl = create_msg_limiter()
        result = check_message(rl, "client1", 0.0)
        self.assertTrue(result["allowed"])

    def test_under_limit_allowed(self):
        rl = create_msg_limiter()
        for i in range(MSG_RATE_MAX):
            result = check_message(rl, "client1", i * 0.01)
            self.assertTrue(result["allowed"], f"Msg {i+1} should be allowed")
        # MSG_RATE_MAX-te Nachricht war die letzte erlaubte

    def test_over_limit_blocked(self):
        rl = create_msg_limiter()
        for i in range(MSG_RATE_MAX):
            check_message(rl, "client1", i * 0.01)
        # MSG_RATE_MAX+1-te Nachricht soll blockiert sein
        result = check_message(rl, "client1", MSG_RATE_MAX * 0.01)
        self.assertFalse(result["allowed"])

    def test_blocked_returns_retry_after(self):
        rl = create_msg_limiter()
        for i in range(MSG_RATE_MAX):
            check_message(rl, "client1", i * 0.01)
        result = check_message(rl, "client1", MSG_RATE_MAX * 0.01)
        self.assertFalse(result["allowed"])
        self.assertIn("retry_after", result)
        self.assertGreater(result["retry_after"], 0)
        self.assertLessEqual(result["retry_after"], MSG_RATE_WINDOW)

    def test_different_clients_independent(self):
        rl = create_msg_limiter()
        for i in range(MSG_RATE_MAX):
            check_message(rl, "client1", i * 0.01)
        # client2 ist unbeeinflusst
        result = check_message(rl, "client2", 0.0)
        self.assertTrue(result["allowed"])

    def test_window_reset_after_expiry(self):
        rl = create_msg_limiter()
        # Sende max Nachrichten im ersten Fenster
        for i in range(MSG_RATE_MAX):
            check_message(rl, "client1", i * 0.01)
        # Nach Ablauf des Fensters wieder erlaubt
        result = check_message(rl, "client1", MSG_RATE_WINDOW + 0.1)
        self.assertTrue(result["allowed"])

    def test_window_reset_clears_old_count(self):
        rl = create_msg_limiter()
        for i in range(MSG_RATE_MAX):
            check_message(rl, "client1", i * 0.01)
        # Nach Ablauf: neuer Count beginnt bei 1
        result = check_message(rl, "client1", MSG_RATE_WINDOW + 0.1)
        self.assertTrue(result["allowed"])
        # Jetzt sollten wieder MSG_RATE_MAX-1 weitere erlaubt sein
        for i in range(MSG_RATE_MAX - 1):
            r = check_message(rl, "client1", MSG_RATE_WINDOW + 0.1 + i * 0.01)
            self.assertTrue(r["allowed"])

    def test_messages_spread_within_window_counted(self):
        rl = create_msg_limiter()
        # 5 Nachrichten am Anfang, dann 5 spaeter im selben Fenster
        for i in range(5):
            check_message(rl, "client1", i * 0.01)
        for i in range(5):
            r = check_message(rl, "client1", 0.5 + i * 0.01)
            self.assertTrue(r["allowed"], f"Msg {i+6} within window should be allowed")
        # 11. Nachricht blockiert
        r = check_message(rl, "client1", 0.6)
        self.assertFalse(r["allowed"])

    def test_allowed_does_not_include_retry_after(self):
        rl = create_msg_limiter()
        result = check_message(rl, "client1", 0.0)
        self.assertTrue(result["allowed"])
        self.assertNotIn("retry_after", result)

    def test_exactly_at_max_next_blocked(self):
        """Genau nach MSG_RATE_MAX Nachrichten ist die naechste blockiert."""
        rl = create_msg_limiter()
        t = 0.0
        for i in range(MSG_RATE_MAX):
            r = check_message(rl, "c", t)
            self.assertTrue(r["allowed"])
            t += 0.05
        r = check_message(rl, "c", t)
        self.assertFalse(r["allowed"])

    def test_retry_after_decreases_over_time(self):
        """retry_after wird kleiner je mehr Zeit vergeht."""
        rl = create_msg_limiter()
        for i in range(MSG_RATE_MAX):
            check_message(rl, "c", i * 0.01)
        r1 = check_message(rl, "c", 0.5)
        r2 = check_message(rl, "c", 0.8)
        self.assertFalse(r1["allowed"])
        self.assertFalse(r2["allowed"])
        # spaeterer Versuch hat kleineren oder gleichen retry_after
        self.assertLessEqual(r2["retry_after"], r1["retry_after"])


class TestConstants(unittest.TestCase):
    """Konstanten haben erwartete Werte."""

    def test_max_is_10(self):
        self.assertEqual(MSG_RATE_MAX, 10)

    def test_window_is_1_second(self):
        self.assertEqual(MSG_RATE_WINDOW, 1.0)


if __name__ == "__main__":
    unittest.main()