"""
Server Join Rate-Limiting — TDD Tests

Prueft dass der Server bei player:join / host:resume den Rate-Limiter
aus room_security verwendet um Brute-Force zu blockieren.

Aufruf: python3 -m unittest tests.test_server_join_ratelimit -v
"""
import unittest
import sys
import os
import time

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from room_security import RATE_LIMIT_MAX_ATTEMPTS, RATE_LIMIT_WINDOW


class TestServerJoinRateLimit(unittest.TestCase):
    """_check_join_allowed muss Brute-Force erkennen."""

    def setUp(self):
        if 'server' in sys.modules:
            del sys.modules['server']
        import server
        self.server = server
        # Frischen Rate-Limiter fuer jeden Test
        self.server.join_rate_limiter = {'failures': {}}

    def test_server_has_check_join_allowed_fn(self):
        self.assertTrue(hasattr(self.server, '_check_join_allowed'),
                        "server sollte _check_join_allowed Funktion haben")
        self.assertTrue(callable(self.server._check_join_allowed))

    def test_first_join_allowed(self):
        result = self.server._check_join_allowed("10.0.0.1")
        self.assertTrue(result['allowed'],
                        "Erster Join-Versuch sollte erlaubt sein")

    def test_blocks_after_max_attempts(self):
        ip = "10.0.0.2"
        for _ in range(RATE_LIMIT_MAX_ATTEMPTS):
            self.server._check_join_allowed(ip)
        result = self.server._check_join_allowed(ip)
        self.assertFalse(result['allowed'],
                         "Nach max Fehlversuchen sollte geblockt werden")
        self.assertIn('retry_after', result)

    def test_successful_join_clears_failures(self):
        ip = "10.0.0.3"
        for _ in range(RATE_LIMIT_MAX_ATTEMPTS - 1):
            self.server._check_join_allowed(ip)
        # Erfolgreicher Join -> clear
        self.server.clear_join_failures(ip)
        # Weitere Versuche wieder erlaubt
        for _ in range(RATE_LIMIT_MAX_ATTEMPTS):
            result = self.server._check_join_allowed(ip)
            self.assertTrue(result['allowed'])

    def test_different_ips_independent(self):
        ip1 = "10.0.0.4"
        ip2 = "10.0.0.5"
        for _ in range(RATE_LIMIT_MAX_ATTEMPTS):
            self.server._check_join_allowed(ip1)
        result = self.server._check_join_allowed(ip2)
        self.assertTrue(result['allowed'],
                        "Andere IP sollte nicht vom Limit betroffen sein")

    def test_blocked_returns_retry_after(self):
        ip = "10.0.0.6"
        for _ in range(RATE_LIMIT_MAX_ATTEMPTS):
            self.server._check_join_allowed(ip)
        result = self.server._check_join_allowed(ip)
        self.assertFalse(result['allowed'])
        self.assertGreater(result['retry_after'], 0)
        self.assertLessEqual(result['retry_after'], RATE_LIMIT_WINDOW)


if __name__ == '__main__':
    unittest.main()