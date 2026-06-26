#!/usr/bin/env python3
"""
PARTY ARENA — Echtzeit-Mehrspieler-Server (lokales WLAN)
=========================================================
Reiner Python-Standardbibliothek-Server:
  * Statisches Ausliefern der Web-App (HTTP)
  * Eigene WebSocket-Implementierung (RFC 6455) auf /ws
  * Lobby-/Raum-System mit Code
  * Paralleler Spielmodus: alle spielen gleichzeitig dasselbe Mini-Spiel

Start:   python server.py
Dann:    Host  -> http://localhost:3000/host
         Handy -> http://<DEINE-LAN-IP>:3000/   (wird beim Start angezeigt)
"""

import asyncio
import base64
import hashlib
import json
import mimetypes
import os
import random
import socket
import string
import uuid

HOST = "0.0.0.0"
PORT = int(os.environ.get("PORT", "3000"))
ROOT = os.path.dirname(os.path.abspath(__file__))
WS_GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11"

PALETTE = ["#ff3cac", "#00f0ff", "#2bffb9", "#ffd34e", "#7b2ff7", "#ff6a00", "#3a86ff", "#ff4d6d"]
BOARD_FIGURES = ["🚀", "🐱", "🦊", "🐸", "🐼", "🦄", "🤖", "🐙"]

CHAOS_EFFECTS = [
    {"id": "tax", "text": "Chaos-Steuer! -1 Stern", "delta": -1},
    {"id": "gift", "text": "Glückspilz! +1 Stern", "delta": 1},
    {"id": "storm", "text": "Sternensturm! -2 Sterne", "delta": -2},
    {"id": "swap", "text": "Verwirrung! Tausche Position mit Zufallsspieler", "delta": 0},
]

# Sicherheits-Cap (Sekunden) pro Mini-Spiel: Falls ein Spieler nicht meldet,
# wird die Runde nach dieser Zeit trotzdem beendet.
GAME_CAPS = {
    "reaction": 35, "simon": 80, "math": 30, "tap": 14, "targets": 24,
    "stroop": 30, "precision": 45, "bombcode": 80, "sequence": 34,
    "oddone": 30, "arrows": 30, "highlow": 32,
}
DEFAULT_CAP = 60

ROUTES = {
    "/": "player.html",
    "/host": "host.html",
    "/solo": "index.html",
}

rooms = {}        # code -> Room
loop = None       # asyncio event loop (gesetzt in main)


# ============================================================
#  WebSocket Low-Level
# ============================================================
def ws_accept_key(key: str) -> str:
    return base64.b64encode(hashlib.sha1((key + WS_GUID).encode()).digest()).decode()


def ws_encode(data: bytes, opcode: int = 1) -> bytes:
    header = bytearray([0x80 | opcode])
    n = len(data)
    if n < 126:
        header.append(n)
    elif n < 65536:
        header.append(126)
        header += n.to_bytes(2, "big")
    else:
        header.append(127)
        header += n.to_bytes(8, "big")
    return bytes(header) + data


async def ws_read_frame(reader):
    """Liest einen (ggf. fragmentierten) Text-/Binär-Frame. Gibt (opcode, data) zurück oder None."""
    fragments = bytearray()
    first_opcode = None
    while True:
        hdr = await reader.readexactly(2)
        fin = hdr[0] & 0x80
        opcode = hdr[0] & 0x0F
        masked = hdr[1] & 0x80
        length = hdr[1] & 0x7F
        if length == 126:
            length = int.from_bytes(await reader.readexactly(2), "big")
        elif length == 127:
            length = int.from_bytes(await reader.readexactly(8), "big")
        mask = await reader.readexactly(4) if masked else b""
        payload = await reader.readexactly(length) if length else b""
        if masked:
            payload = bytes(payload[i] ^ mask[i % 4] for i in range(length))

        if opcode == 0x8:               # close
            return (0x8, b"")
        if opcode in (0x9, 0xA):        # ping/pong -> separat behandeln
            return (opcode, payload)

        if opcode != 0x0:
            first_opcode = opcode
        fragments += payload
        if fin:
            return (first_opcode or 0x1, bytes(fragments))


# ============================================================
#  Client
# ============================================================
class Client:
    def __init__(self, writer):
        self.writer = writer
        self.role = None      # 'host' | 'player'
        self.room = None
        self.pid = None
        self.alive = True
        self.req_host = None   # Host-Header der Verbindung (für Cloud-URL)
        self.req_proto = None  # http/https (X-Forwarded-Proto hinter Proxy)

    def send(self, obj):
        if not self.alive:
            return
        try:
            self.writer.write(ws_encode(json.dumps(obj).encode("utf-8")))
        except Exception:
            self.alive = False

    def send_raw(self, opcode, data):
        try:
            self.writer.write(ws_encode(data, opcode))
        except Exception:
            self.alive = False


# ============================================================
#  Room / Spiel-Logik
# ============================================================
def gen_code():
    alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    while True:
        code = "".join(random.choice(alphabet) for _ in range(4))
        if code not in rooms:
            return code


class Room:
    def __init__(self, code, host):
        self.code = code
        self.host = host
        self.players = {}         # pid -> dict
        self.order = []           # join-Reihenfolge der pids
        self.state = "lobby"
        self.settings = None
        self.queue = []
        self.round = 0
        self.scores = {}
        self.finished = set()
        self.cap_handle = None
        self.live_handle = None
        self.mode = "classic"
        self.board = None

    # ---- Helfer ----
    def public_players(self):
        out = []
        for pid in self.order:
            p = self.players.get(pid)
            if not p:
                continue
            out.append({
                "id": pid, "name": p["name"], "color": p["color"],
                "stars": p["stars"], "totalPoints": p["totalPoints"],
                "figure": p.get("figure", "🙂"),
                "position": p.get("position", 0),
                "connected": p["connected"],
            })
        return out

    def connected_players(self):
        return [pid for pid in self.order if self.players.get(pid, {}).get("connected")]

    def broadcast(self, obj, include_host=True):
        if include_host and self.host:
            self.host.send(obj)
        for pid in self.order:
            p = self.players.get(pid)
            if p and p["client"] and p["connected"]:
                p["client"].send(obj)

    def send_lobby(self):
        self.broadcast({
            "type": "lobby",
            "code": self.code,
            "players": self.public_players(),
            "canStart": len(self.connected_players()) >= 2,
            "state": self.state,
        })

    # ---- Spieler-Verwaltung ----
    def add_player(self, client, name, pid=None, figure=None):
        # Reconnect?
        if pid and pid in self.players:
            p = self.players[pid]
            if figure:
                p["figure"] = figure
            p["client"] = client
            p["connected"] = True
            client.role = "player"
            client.room = self
            client.pid = pid
            client.send({"type": "joined", "playerId": pid, "name": p["name"],
                         "color": p["color"], "figure": p.get("figure", "🙂"),
                         "code": self.code, "state": self.state})
            self.send_lobby()
            return

        if self.state != "lobby":
            client.send({"type": "joinError", "message": "Spiel läuft bereits."})
            return
        if len(self.players) >= 8:
            client.send({"type": "joinError", "message": "Raum ist voll (max. 8)."})
            return
        name = (name or "").strip()[:14]
        if not name:
            client.send({"type": "joinError", "message": "Bitte einen Namen eingeben."})
            return
        if any(p["name"].lower() == name.lower() for p in self.players.values()):
            client.send({"type": "joinError", "message": "Name schon vergeben."})
            return

        new_pid = uuid.uuid4().hex[:8]
        color = PALETTE[len(self.order) % len(PALETTE)]
        figure = (figure or "").strip()[:2] or BOARD_FIGURES[len(self.order) % len(BOARD_FIGURES)]
        self.players[new_pid] = {
            "name": name, "color": color, "stars": 0, "totalPoints": 0,
            "position": 0, "figure": figure,
            "client": client, "connected": True,
        }
        self.order.append(new_pid)
        client.role = "player"
        client.room = self
        client.pid = new_pid
        client.send({"type": "joined", "playerId": new_pid, "name": name,
                     "color": color, "figure": figure,
                     "code": self.code, "state": self.state})
        self.send_lobby()

    def remove_client(self, client):
        if client is self.host:
            # Host weg -> Raum schließen
            self.cancel_timers()
            self.broadcast({"type": "hostLeft"}, include_host=False)
            rooms.pop(self.code, None)
            return
        if client.pid and client.pid in self.players:
            p = self.players[client.pid]
            p["connected"] = False
            p["client"] = None
            if self.state == "lobby":
                # Im Lobby ganz entfernen
                self.order = [x for x in self.order if x != client.pid]
                self.players.pop(client.pid, None)
            self.send_lobby()
            # Falls im Spiel alle übrigen fertig sind -> Runde beenden
            if self.state == "playing":
                self.check_all_finished()

    # ---- Board Mode ----
    def build_board_tiles(self):
        games = (self.settings or {}).get("games") or []
        default_game = {"id": "reaction", "name": "Reaktion", "icon": "⚡", "desc": "", "rules": ""}
        game_pool = games[:] if games else [default_game]
        tiles = []
        chaos_slots = {3, 7, 11, 15}
        for i in range(16):
            if i == 0:
                tiles.append({"idx": i, "type": "start", "name": "START", "icon": "🏁"})
                continue
            if i in chaos_slots:
                tiles.append({"idx": i, "type": "chaos", "name": "Chaos", "icon": "🌀"})
                continue
            g = game_pool[(i - 1) % len(game_pool)]
            tiles.append({
                "idx": i,
                "type": "property",
                "name": g.get("name", "Mini-Spiel"),
                "icon": g.get("icon", "🎮"),
                "game": g,
            })
        return tiles

    def board_payload(self):
        b = self.board or {}
        return {
            "type": "board:update",
            "state": self.state,
            "lapsDone": b.get("lapsDone", 0),
            "lapsTotal": b.get("lapsTotal", 0),
            "turnPlayerId": b.get("turnPlayerId"),
            "tiles": b.get("tiles", []),
            "owners": b.get("owners", {}),
            "players": self.public_players(),
            "log": b.get("lastLog", ""),
        }

    def send_board_update(self):
        self.broadcast(self.board_payload())

    def start_board_game(self, rounds, games):
        rounds = max(1, min(20, int(rounds)))
        for pid in self.order:
            p = self.players[pid]
            p["stars"] = 3
            p["totalPoints"] = 0
            p["position"] = 0
        self.board = {
            "lapsDone": 0,
            "lapsTotal": rounds,
            "turnIdx": 0,
            "turnsInLap": 0,
            "turnPlayerId": None,
            "tiles": self.build_board_tiles(),
            "owners": {},
            "pending": None,
            "phase": "turn",
            "lastLog": "Board-Modus gestartet. Alle starten mit 3 Sternen.",
            "duel": None,
            "global": None,
        }
        self.state = "board"
        self.broadcast({"type": "board:init", "players": self.public_players(), "tiles": self.board["tiles"]})
        self.send_board_update()
        self.begin_board_turn()

    def begin_board_turn(self):
        if self.state != "board" or not self.board:
            return
        connected = self.connected_players()
        if len(connected) < 2:
            self.board["lastLog"] = "Zu wenige verbundene Spieler."
            self.send_board_update()
            return
        # Nächsten verbundenen Spieler finden
        safety = 0
        while self.order[self.board["turnIdx"]] not in connected and safety < len(self.order):
            self.board["turnIdx"] = (self.board["turnIdx"] + 1) % len(self.order)
            safety += 1
        pid = self.order[self.board["turnIdx"]]
        self.board["turnPlayerId"] = pid
        self.board["phase"] = "turn"
        p = self.players[pid]
        self.board["lastLog"] = f"{p['name']} ist am Zug und würfelt."
        self.send_board_update()
        if p.get("client"):
            p["client"].send({"type": "board:yourTurn", "action": "roll", "message": "Du bist dran. Würfle jetzt!"})

    def board_roll(self, pid):
        if self.state != "board" or not self.board:
            return
        if self.board.get("phase") != "turn" or pid != self.board.get("turnPlayerId"):
            return
        roll = random.randint(1, 6)
        p = self.players[pid]
        old_pos = p.get("position", 0)
        size = len(self.board["tiles"])
        new_pos = (old_pos + roll) % size
        p["position"] = new_pos
        tile = self.board["tiles"][new_pos]
        self.board["lastLog"] = f"{p['name']} würfelt {roll} und landet auf {tile['icon']} {tile['name']}."
        self.broadcast({
            "type": "board:rolled",
            "playerId": pid,
            "roll": roll,
            "from": old_pos,
            "to": new_pos,
            "tile": tile,
        })
        self.resolve_board_tile(pid, tile)

    def apply_chaos(self):
        connected = self.connected_players()
        if not connected:
            return None
        weights = []
        for pid in connected:
            s = max(0, int(self.players[pid].get("stars", 0)))
            weights.append(1 + s)
        target = random.choices(connected, weights=weights, k=1)[0]
        effect = random.choice(CHAOS_EFFECTS)
        tp = self.players[target]
        if effect["id"] == "swap":
            others = [pid for pid in connected if pid != target]
            if others:
                other = random.choice(others)
                tp_pos = tp.get("position", 0)
                op = self.players[other]
                tp["position"] = op.get("position", 0)
                op["position"] = tp_pos
                txt = f"Chaos trifft {tp['name']}: Positionstausch mit {op['name']}!"
            else:
                txt = f"Chaos trifft {tp['name']}, aber niemand zum Tauschen da."
        else:
            delta = effect.get("delta", 0)
            tp["stars"] = max(0, tp.get("stars", 0) + delta)
            txt = f"Chaos trifft {tp['name']}: {effect['text']}"
        self.broadcast({"type": "board:chaos", "targetId": target, "text": txt})
        return txt

    def resolve_board_tile(self, pid, tile):
        b = self.board
        p = self.players[pid]
        if tile["type"] == "start":
            self.end_board_turn()
            return
        if tile["type"] == "chaos":
            txt = self.apply_chaos()
            if txt:
                b["lastLog"] = txt
            self.send_board_update()
            self.end_board_turn()
            return
        if tile["type"] != "property":
            self.end_board_turn()
            return

        owner = b["owners"].get(str(tile["idx"]))
        if not owner:
            b["phase"] = "decision"
            b["pending"] = {"kind": "buy", "player": pid, "tile": tile["idx"]}
            if p.get("client"):
                p["client"].send({
                    "type": "board:decision",
                    "kind": "buy",
                    "tile": tile,
                    "cost": 1,
                    "message": f"Dieses Feld ist frei. Für 1 Stern kaufen?",
                })
            self.send_board_update()
            return

        if owner == pid:
            b["lastLog"] = f"{p['name']} landet auf eigenem Feld."
            self.send_board_update()
            self.end_board_turn()
            return

        owner_p = self.players.get(owner)
        if not owner_p:
            b["owners"].pop(str(tile["idx"]), None)
            self.end_board_turn()
            return
        b["phase"] = "decision"
        b["pending"] = {"kind": "rentOrDuel", "player": pid, "owner": owner, "tile": tile["idx"]}
        if p.get("client"):
            p["client"].send({
                "type": "board:decision",
                "kind": "rentOrDuel",
                "tile": tile,
                "ownerName": owner_p["name"],
                "message": f"Feld von {owner_p['name']}: 1 Stern zahlen oder zum Duell herausfordern?",
            })
        self.send_board_update()

    def board_decision(self, pid, action):
        if self.state != "board" or not self.board:
            return
        pending = self.board.get("pending")
        if not pending or pending.get("player") != pid:
            return

        kind = pending.get("kind")
        tile_idx = str(pending.get("tile"))
        player = self.players[pid]

        if kind == "buy":
            if action == "buy" and player["stars"] >= 1:
                player["stars"] -= 1
                self.board["owners"][tile_idx] = pid
                self.board["lastLog"] = f"{player['name']} kauft Feld {int(tile_idx)}."
            else:
                self.board["lastLog"] = f"{player['name']} kauft nicht."
            self.board["pending"] = None
            self.send_board_update()
            self.end_board_turn()
            return

        if kind == "rentOrDuel":
            owner = pending.get("owner")
            owner_p = self.players.get(owner)
            if not owner_p:
                self.board["pending"] = None
                self.end_board_turn()
                return
            if action == "duel":
                self.board["pending"] = None
                self.begin_board_duel(pid, owner, int(tile_idx))
                return
            # default: rent
            if player["stars"] >= 1:
                player["stars"] -= 1
                owner_p["stars"] += 1
                self.board["lastLog"] = f"{player['name']} zahlt 1 Stern an {owner_p['name']}."
            else:
                self.board["lastLog"] = f"{player['name']} hat keine Sterne zum Zahlen."
            self.board["pending"] = None
            self.send_board_update()
            self.end_board_turn()

    def begin_board_duel(self, challenger, owner, tile_idx):
        game_pool = (self.settings or {}).get("games") or []
        game = random.choice(game_pool) if game_pool else {"id": "reaction", "name": "Reaktion", "icon": "⚡", "desc": "", "rules": ""}
        duel_id = uuid.uuid4().hex[:8]
        self.board["phase"] = "duel"
        self.board["duel"] = {
            "id": duel_id,
            "tile": tile_idx,
            "challenger": challenger,
            "owner": owner,
            "scores": {},
            "finished": set(),
            "game": game,
        }
        cp = self.players[challenger]
        op = self.players[owner]
        self.board["lastLog"] = f"Duell: {cp['name']} vs {op['name']} um Feld {tile_idx}."
        for pid in (challenger, owner):
            c = self.players[pid].get("client")
            if c:
                c.send({"type": "roundIntro", "round": 1, "total": 1, "game": game})
                c.send({"type": "start", "round": 1, "game": game})
        self.broadcast({"type": "board:duel", "challenger": challenger, "owner": owner, "tile": tile_idx, "game": game})
        self.send_board_update()

    def start_global_board_round(self):
        game_pool = (self.settings or {}).get("games") or []
        game = random.choice(game_pool) if game_pool else {"id": "reaction", "name": "Reaktion", "icon": "⚡", "desc": "", "rules": ""}
        participants = self.connected_players()
        self.board["phase"] = "global"
        self.board["global"] = {
            "id": uuid.uuid4().hex[:8],
            "game": game,
            "participants": participants,
            "scores": {},
            "finished": set(),
        }
        self.board["lastLog"] = f"Chaos-Runde startet: {game.get('icon', '🎮')} {game.get('name', 'Mini-Spiel')}"
        self.broadcast({"type": "roundIntro", "round": self.board["lapsDone"], "total": self.board["lapsTotal"], "game": game})
        for pid in participants:
            c = self.players[pid].get("client")
            if c:
                c.send({"type": "start", "round": self.board["lapsDone"], "game": game})
        self.send_board_update()

    def board_player_score(self, pid, score):
        if self.state != "board" or not self.board:
            return
        score = max(0, int(score))
        if self.board.get("phase") == "duel" and self.board.get("duel"):
            d = self.board["duel"]
            if pid in (d["challenger"], d["owner"]):
                d["scores"][pid] = score
        elif self.board.get("phase") == "global" and self.board.get("global"):
            g = self.board["global"]
            if pid in g["participants"]:
                g["scores"][pid] = score

    def board_player_finished(self, pid, score):
        if self.state != "board" or not self.board:
            return
        self.board_player_score(pid, score)
        p = self.players.get(pid)
        if p and p.get("client"):
            p["client"].send({"type": "waiting", "yourScore": max(0, int(score))})

        if self.board.get("phase") == "duel" and self.board.get("duel"):
            d = self.board["duel"]
            if pid in (d["challenger"], d["owner"]):
                d["finished"].add(pid)
            if all(x in d["finished"] for x in (d["challenger"], d["owner"])):
                self.finish_board_duel()
        elif self.board.get("phase") == "global" and self.board.get("global"):
            g = self.board["global"]
            if pid in g["participants"]:
                g["finished"].add(pid)
            if g["participants"] and all(x in g["finished"] for x in g["participants"]):
                self.finish_global_board_round()

    def finish_board_duel(self):
        d = self.board.get("duel") or {}
        challenger = d.get("challenger")
        owner = d.get("owner")
        tile = str(d.get("tile"))
        cs = d.get("scores", {}).get(challenger, 0)
        os = d.get("scores", {}).get(owner, 0)
        cp = self.players[challenger]
        op = self.players[owner]
        if cs > os:
            self.board["owners"][tile] = challenger
            self.board["lastLog"] = f"{cp['name']} gewinnt das Duell und übernimmt Feld {tile}."
        else:
            pay = min(2, cp.get("stars", 0))
            cp["stars"] -= pay
            op["stars"] += pay
            self.board["lastLog"] = f"{cp['name']} verliert das Duell und zahlt {pay} Sterne an {op['name']}."
        self.broadcast({"type": "board:duelResult", "challenger": challenger, "owner": owner, "challengerScore": cs, "ownerScore": os, "tile": int(tile)})
        self.board["duel"] = None
        self.board["phase"] = "turn"
        self.send_board_update()
        self.end_board_turn()

    def finish_global_board_round(self):
        g = self.board.get("global") or {}
        ranking = []
        for pid in g.get("participants", []):
            p = self.players.get(pid)
            if not p:
                continue
            score = int(g.get("scores", {}).get(pid, 0))
            p["totalPoints"] += score
            ranking.append({"id": pid, "name": p["name"], "color": p["color"], "score": score})
        ranking.sort(key=lambda r: r["score"], reverse=True)
        if ranking:
            top = ranking[0]["score"]
            for r in ranking:
                if r["score"] == top and top > 0:
                    self.players[r["id"]]["stars"] += 1
        self.broadcast({"type": "board:globalResult", "ranking": ranking})
        self.board["global"] = None
        self.board["phase"] = "turn"
        self.send_board_update()
        self.begin_board_turn()

    def end_board_turn(self):
        if self.state != "board" or not self.board:
            return
        self.board["turnsInLap"] += 1
        self.board["turnIdx"] = (self.board["turnIdx"] + 1) % len(self.order)
        if self.board["turnsInLap"] >= max(1, len(self.connected_players())):
            self.board["turnsInLap"] = 0
            self.board["lapsDone"] += 1
            if self.board["lapsDone"] >= self.board["lapsTotal"]:
                self.show_final()
                return
            self.start_global_board_round()
            return
        self.begin_board_turn()

    # ---- Spielstart ----
    def start_game(self, rounds, order_mode, games, mode="classic"):
        if len(self.connected_players()) < 2:
            self.host.send({"type": "joinError", "message": "Mindestens 2 Spieler nötig."})
            return
        if not games:
            self.host.send({"type": "joinError", "message": "Mindestens 1 Spiel auswählen."})
            return
        self.mode = mode or "classic"
        rounds = max(1, min(20, int(rounds)))
        self.settings = {"rounds": rounds, "order": order_mode, "games": games}
        if self.mode == "board":
            self.start_board_game(rounds, games)
            return
        # Queue bauen
        self.queue = []
        if order_mode == "random":
            pool = []
            while len(pool) < rounds:
                bag = games[:]
                random.shuffle(bag)
                pool += bag
            self.queue = pool[:rounds]
        else:
            self.queue = [games[i % len(games)] for i in range(rounds)]
        for pid in self.order:
            self.players[pid]["stars"] = 0
            self.players[pid]["totalPoints"] = 0
        self.round = 0
        self.start_round()

    def start_round(self):
        self.state = "roundIntro"
        game = self.queue[self.round]
        self.broadcast({
            "type": "roundIntro",
            "round": self.round + 1,
            "total": self.settings["rounds"],
            "game": game,
        })

    def begin_round(self):
        if self.state != "roundIntro":
            return
        self.state = "playing"
        self.scores = {}
        self.finished = set()
        game = self.queue[self.round]
        self.broadcast({"type": "start", "round": self.round + 1, "game": game})
        # Live-Leaderboard für Host
        self.schedule_live()
        # Sicherheits-Cap
        cap = GAME_CAPS.get(game.get("id"), DEFAULT_CAP) + 4
        self.cap_handle = loop.call_later(cap, self.end_round)

    def schedule_live(self):
        self.live_handle = loop.call_later(0.3, self._live_tick)

    def _live_tick(self):
        if self.state != "playing":
            return
        if self.host:
            self.host.send({
                "type": "live",
                "scores": self.scores,
                "finished": list(self.finished),
                "players": self.public_players(),
            })
        self.schedule_live()

    def player_score(self, pid, score):
        if self.state == "playing" and pid in self.players:
            self.scores[pid] = max(0, int(score))

    def player_finished(self, pid, score):
        if self.state != "playing" or pid not in self.players:
            return
        self.scores[pid] = max(0, int(score))
        self.finished.add(pid)
        # Spieler-Bestätigung
        p = self.players[pid]
        if p["client"]:
            p["client"].send({"type": "waiting", "yourScore": self.scores[pid]})
        self.check_all_finished()

    def check_all_finished(self):
        conn = self.connected_players()
        if conn and all(pid in self.finished for pid in conn):
            self.end_round()

    def cancel_timers(self):
        for h in (self.cap_handle, self.live_handle):
            if h:
                h.cancel()
        self.cap_handle = None
        self.live_handle = None

    def end_round(self):
        if self.state != "playing":
            return
        self.cancel_timers()
        self.state = "roundResult"
        game = self.queue[self.round]

        ranking = []
        for pid in self.order:
            p = self.players[pid]
            score = self.scores.get(pid, 0)
            p["totalPoints"] += score
            ranking.append({"id": pid, "name": p["name"], "color": p["color"], "score": score})
        ranking.sort(key=lambda r: r["score"], reverse=True)

        max_score = ranking[0]["score"] if ranking else 0
        winners = [r for r in ranking if r["score"] == max_score and max_score > 0]
        for w in winners:
            self.players[w["id"]]["stars"] += 1
        for r in ranking:
            r["star"] = any(w["id"] == r["id"] for w in winners)

        self.broadcast({
            "type": "roundResult",
            "round": self.round + 1,
            "total": self.settings["rounds"],
            "game": game,
            "ranking": ranking,
            "winners": [w["name"] for w in winners],
        })

    def next_step(self):
        if self.state == "roundResult":
            self.state = "standings"
            is_last = (self.round + 1) >= self.settings["rounds"]
            ranking = sorted(
                self.public_players(),
                key=lambda p: (p["stars"], p["totalPoints"]),
                reverse=True,
            )
            self.broadcast({
                "type": "standings",
                "round": self.round + 1,
                "total": self.settings["rounds"],
                "ranking": ranking,
                "isLast": is_last,
            })
        elif self.state == "standings":
            if (self.round + 1) >= self.settings["rounds"]:
                self.show_final()
            else:
                self.round += 1
                self.start_round()

    def show_final(self):
        self.state = "final"
        ranking = sorted(
            self.public_players(),
            key=lambda p: (p["stars"], p["totalPoints"]),
            reverse=True,
        )
        self.broadcast({"type": "final", "ranking": ranking})

    def play_again(self):
        self.cancel_timers()
        self.mode = "classic"
        self.board = None
        self.state = "lobby"
        self.queue = []
        self.round = 0
        self.scores = {}
        self.finished = set()
        for pid in self.order:
            self.players[pid]["stars"] = 0
            self.players[pid]["totalPoints"] = 0
        self.send_lobby()


# ============================================================
#  Nachrichten-Dispatch
# ============================================================
def lan_url():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
    except Exception:
        ip = "127.0.0.1"
    finally:
        s.close()
    return f"http://{ip}:{PORT}/"


def join_url_for(client):
    """Beitritts-URL für Spieler. In der Cloud (öffentliche Domain) die
    aufgerufene Adresse verwenden, lokal die LAN-IP des Rechners."""
    host = (getattr(client, "req_host", None) or "").strip()
    if host:
        bare = host.split(":", 1)[0].lower()
        is_local = bare in ("localhost", "127.0.0.1", "0.0.0.0") or bare.endswith(".local")
        if not is_local:
            proto = (getattr(client, "req_proto", None) or "http").split(",")[0].strip()
            return f"{proto}://{host}/"
    return lan_url()


def handle_message(client, msg):
    t = msg.get("type")

    if t == "host:create":
        code = gen_code()
        room = Room(code, client)
        rooms[code] = room
        client.role = "host"
        client.room = room
        client.send({"type": "created", "code": code, "lanUrl": join_url_for(client)})
        room.send_lobby()
        return

    if t == "player:join":
        code = (msg.get("code") or "").strip().upper()
        room = rooms.get(code)
        if not room:
            client.send({"type": "joinError", "message": "Raum-Code nicht gefunden."})
            return
        room.add_player(client, msg.get("name"), msg.get("playerId"), msg.get("figure"))
        return

    room = client.room
    if not room:
        return

    if t == "host:start" and client.role == "host":
        room.start_game(
            msg.get("rounds", 5),
            msg.get("order", "random"),
            msg.get("games", []),
            msg.get("mode", "classic"),
        )
    elif t == "host:beginRound" and client.role == "host":
        room.begin_round()
    elif t == "host:next" and client.role == "host":
        room.next_step()
    elif t == "host:playAgain" and client.role == "host":
        room.play_again()
    elif t == "board:hostNextTurn" and client.role == "host":
        room.begin_board_turn()
    elif t == "board:roll" and client.role == "player":
        room.board_roll(client.pid)
    elif t == "board:decision" and client.role == "player":
        room.board_decision(client.pid, msg.get("action"))
    elif t == "player:score" and client.role == "player":
        if room.mode == "board":
            room.board_player_score(client.pid, msg.get("score", 0))
        else:
            room.player_score(client.pid, msg.get("score", 0))
    elif t == "player:finished" and client.role == "player":
        if room.mode == "board":
            room.board_player_finished(client.pid, msg.get("score", 0))
        else:
            room.player_finished(client.pid, msg.get("score", 0))


# ============================================================
#  Verbindungs-Handler (HTTP + WS auf einem Port)
# ============================================================
async def handle_connection(reader, writer):
    try:
        request_line = await reader.readuntil(b"\r\n")
    except Exception:
        writer.close()
        return

    try:
        method, path, _ = request_line.decode("latin1").split(" ", 2)
    except ValueError:
        writer.close()
        return

    # Header lesen
    headers = {}
    while True:
        line = await reader.readuntil(b"\r\n")
        if line == b"\r\n":
            break
        if b":" in line:
            k, v = line.decode("latin1").split(":", 1)
            headers[k.strip().lower()] = v.strip()

    # Pfad ohne Query
    clean_path = path.split("?", 1)[0]

    # WebSocket-Upgrade?
    if clean_path == "/ws" and headers.get("upgrade", "").lower() == "websocket":
        await handle_websocket(reader, writer, headers)
        return

    # Statisches Ausliefern
    await serve_static(writer, clean_path)


async def serve_static(writer, path):
    rel = ROUTES.get(path, path.lstrip("/"))
    file_path = os.path.normpath(os.path.join(ROOT, rel))
    if not file_path.startswith(ROOT) or not os.path.isfile(file_path):
        body = b"404 Not Found"
        writer.write(b"HTTP/1.1 404 Not Found\r\nContent-Type: text/plain\r\n"
                     b"Content-Length: %d\r\n\r\n%s" % (len(body), body))
        await safe_drain(writer)
        writer.close()
        return
    ctype = mimetypes.guess_type(file_path)[0] or "application/octet-stream"
    with open(file_path, "rb") as f:
        data = f.read()
    header = (
        "HTTP/1.1 200 OK\r\n"
        f"Content-Type: {ctype}; charset=utf-8\r\n"
        f"Content-Length: {len(data)}\r\n"
        "Cache-Control: no-cache\r\n"
        "Connection: close\r\n\r\n"
    ).encode("latin1")
    writer.write(header + data)
    await safe_drain(writer)
    writer.close()


async def handle_websocket(reader, writer, headers):
    key = headers.get("sec-websocket-key")
    if not key:
        writer.close()
        return
    accept = ws_accept_key(key)
    handshake = (
        "HTTP/1.1 101 Switching Protocols\r\n"
        "Upgrade: websocket\r\n"
        "Connection: Upgrade\r\n"
        f"Sec-WebSocket-Accept: {accept}\r\n\r\n"
    ).encode("latin1")
    writer.write(handshake)
    await safe_drain(writer)

    client = Client(writer)
    client.req_host = headers.get("host")
    client.req_proto = headers.get("x-forwarded-proto")
    try:
        while True:
            frame = await ws_read_frame(reader)
            if frame is None:
                break
            opcode, data = frame
            if opcode == 0x8:           # close
                break
            if opcode == 0x9:           # ping -> pong
                client.send_raw(0xA, data)
                await safe_drain(writer)
                continue
            if opcode == 0xA:           # pong
                continue
            try:
                msg = json.loads(data.decode("utf-8"))
            except Exception:
                continue
            handle_message(client, msg)
            await safe_drain(writer)
    except (asyncio.IncompleteReadError, ConnectionResetError, BrokenPipeError):
        pass
    finally:
        client.alive = False
        if client.room:
            client.room.remove_client(client)
        try:
            writer.close()
        except Exception:
            pass


async def safe_drain(writer):
    try:
        await writer.drain()
    except Exception:
        pass


# ============================================================
#  Main
# ============================================================
async def main():
    global loop
    loop = asyncio.get_running_loop()
    mimetypes.add_type("application/javascript", ".js")
    mimetypes.add_type("text/css", ".css")
    server = await asyncio.start_server(handle_connection, HOST, PORT)
    url = lan_url()
    print("=" * 56)
    print("  PARTY ARENA — Mehrspieler-Server läuft!")
    print("=" * 56)
    print(f"  Host-Bildschirm:  http://localhost:{PORT}/host")
    print(f"  Handys im WLAN:   {url}")
    print(f"  (Einzelgerät-Modus weiterhin: http://localhost:{PORT}/solo)")
    print("=" * 56)
    print("  Beenden mit STRG+C")
    async with server:
        await server.serve_forever()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nServer beendet.")
