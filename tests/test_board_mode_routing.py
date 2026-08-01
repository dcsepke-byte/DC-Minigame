"""
Board-Mode-Routing — TDD Tests

Prueft dass player:score/player:finished im Board-Modus (board UND board-party)
in die Board-Handler geroutet werden, nicht in die Classic-Handler.

Bug (2026-08-01): start_game akzeptiert mode "board-party", aber handle_message
pruefte nur room.mode == "board". Dadurch ging player:finished im board-party-Modus
in den Classic-Pfad -> finish_global_board_round wurde nie aufgerufen -> Runde
hing ewig, kein board:globalResult, kein Final. (Wiki: store-screenshots-automation.md)

Aufruf: python3 -m unittest tests.test_board_mode_routing -v
"""
import unittest
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

import server


class FakeRoom:
    """Minimaler Room-Stub: zeichnet auf, welcher Handler gerufen wurde."""

    def __init__(self, mode):
        self.mode = mode
        self.host_pid = "__host__"
        self.calls = []

    def board_player_score(self, pid, score):
        self.calls.append(("board_score", pid, score))

    def player_score(self, pid, score):
        self.calls.append(("classic_score", pid, score))

    def board_player_finished(self, pid, score):
        self.calls.append(("board_finished", pid, score))

    def player_finished(self, pid, score):
        self.calls.append(("classic_finished", pid, score))


class FakeClient:
    def __init__(self, role="player", pid="p1", room=None):
        self.role = role
        self.pid = pid
        self.room = room
        self.ip = "127.0.0.1"


class TestBoardModeRouting(unittest.TestCase):
    """player:finished/player:score muessen in Board-Handler, wenn Modus Board ist."""

    def test_finished_in_board_mode_routes_to_board_handler(self):
        room = FakeRoom(mode="board")
        client = FakeClient(role="player", pid="p1", room=room)
        server.handle_message(client, {"type": "player:finished", "score": 42})
        self.assertIn(("board_finished", "p1", 42), room.calls)
        self.assertNotIn(("classic_finished", "p1", 42), room.calls)

    def test_finished_in_board_party_mode_routes_to_board_handler(self):
        """Bug-Repro: board-party wurde als Classic behandelt -> Runde hing."""
        room = FakeRoom(mode="board-party")
        client = FakeClient(role="player", pid="p1", room=room)
        server.handle_message(client, {"type": "player:finished", "score": 42})
        self.assertIn(("board_finished", "p1", 42), room.calls)
        self.assertNotIn(("classic_finished", "p1", 42), room.calls)

    def test_score_in_board_party_mode_routes_to_board_handler(self):
        room = FakeRoom(mode="board-party")
        client = FakeClient(role="player", pid="p1", room=room)
        server.handle_message(client, {"type": "player:score", "score": 7})
        self.assertIn(("board_score", "p1", 7), room.calls)
        self.assertNotIn(("classic_score", "p1", 7), room.calls)

    def test_host_finished_in_board_party_uses_host_pid(self):
        room = FakeRoom(mode="board-party")
        client = FakeClient(role="host", pid=None, room=room)
        server.handle_message(client, {"type": "player:finished", "score": 99})
        self.assertIn(("board_finished", "__host__", 99), room.calls)

    def test_classic_mode_still_routes_to_classic_handler(self):
        room = FakeRoom(mode="classic")
        client = FakeClient(role="player", pid="p1", room=room)
        server.handle_message(client, {"type": "player:finished", "score": 42})
        self.assertIn(("classic_finished", "p1", 42), room.calls)
        self.assertNotIn(("board_finished", "p1", 42), room.calls)


class TestIsBoardMode(unittest.TestCase):
    """Hilfsfunktion is_board_mode muss beide Board-Aliase erkennen."""

    def test_board_is_board_mode(self):
        self.assertTrue(server.is_board_mode("board"))

    def test_board_party_is_board_mode(self):
        self.assertTrue(server.is_board_mode("board-party"))

    def test_classic_is_not_board_mode(self):
        self.assertFalse(server.is_board_mode("classic"))

    def test_quizduell_is_not_board_mode(self):
        self.assertFalse(server.is_board_mode("quizduell"))

    def test_none_is_not_board_mode(self):
        self.assertFalse(server.is_board_mode(None))


if __name__ == "__main__":
    unittest.main()
