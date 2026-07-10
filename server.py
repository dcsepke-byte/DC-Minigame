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

BOARD_EVENT_EFFECTS = [
    {"id": "give_lowest", "title": "Lucky Boost", "desc": "+1 Stern fuer den letzten Platz", "rarity": "Gewoehnlich", "weight": 12},
    {"id": "step_back", "title": "Zeitreise", "desc": "Ausloeser geht 5 Felder zurueck", "rarity": "Gewoehnlich", "weight": 10},
    {"id": "step_forward", "title": "Rueckenwind", "desc": "Ausloeser springt 3 Felder vor", "rarity": "Gewoehnlich", "weight": 10},
    {"id": "rich_tax", "title": "Reichensteuer", "desc": "Fuehrender verliert 1 Stern", "rarity": "Gewoehnlich", "weight": 9},
    {"id": "all_bonus", "title": "Team-Mood", "desc": "Alle erhalten +1 Stern", "rarity": "Gewoehnlich", "weight": 8},
    {"id": "swap_random", "title": "Positionswechsel", "desc": "Zwei zufaellige Spieler tauschen Felder", "rarity": "Selten", "weight": 5},
    {"id": "star_rain", "title": "Sternenregen", "desc": "Ein Spieler bekommt +2 Sterne", "rarity": "Selten", "weight": 4},
    {"id": "steal_from_leader", "title": "Coup", "desc": "Ausloeser stiehlt 1 Stern vom Leader", "rarity": "Selten", "weight": 4},
    {"id": "lottery", "title": "Sternenlotterie", "desc": "Zufaelliger Sternengewinn/-verlust", "rarity": "Selten", "weight": 4},
    {"id": "claim_free_tile", "title": "Blitz-Kauf", "desc": "Zufaelliges freies Feld fuer 1 Stern", "rarity": "Episch", "weight": 3},
    {"id": "bonus_duel", "title": "Power-Duell", "desc": "Ausloeser raubt 1-2 Sterne", "rarity": "Episch", "weight": 3},
    {"id": "trigger_global", "title": "Event-Karte", "desc": "Sofort ein globales Minispiel", "rarity": "Legendaer", "weight": 2},
]

BOARD_TEMPO_PRESETS = {
    "slow": {"actionDelay": 2.0, "introDelay": 4.8, "eventRevealDelay": 2.9},
    "normal": {"actionDelay": 1.35, "introDelay": 4.0, "eventRevealDelay": 2.3},
    "fast": {"actionDelay": 0.8, "introDelay": 3.0, "eventRevealDelay": 1.6},
}

# Sicherheits-Cap (Sekunden) pro Mini-Spiel: Falls ein Spieler nicht meldet,
# wird die Runde nach dieser Zeit trotzdem beendet.
GAME_CAPS = {
    "reaction": 35, "simon": 80, "math": 30, "tap": 14, "targets": 24,
    "stroop": 30, "precision": 45, "bombcode": 80, "sequence": 34,
    "oddone": 30, "arrows": 30, "highlow": 32,
    "countvision": 32, "reflexlanes": 30, "quizduel": 45,
}
DEFAULT_CAP = 60
HOST_RECONNECT_GRACE = 120
ROUND_INTRO_DELAY = 4.0
BOARD_ACTION_DELAY = 1.35

ROUTES = {
    "/": "player.html",
    "/host": "host.html",
    "/host/": "host.html",
    "/solo": "index.html",
    "/solo/": "index.html",
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
        self.host_token = uuid.uuid4().hex[:16]
        self.host_reconnect_handle = None
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
        self.current_game = None
        self.board = None
        self.host_participates = True
        self.host_pid = "__host__"
        self.host_name = "Host"
        self.host_figure = "🎩"

    def cancel_host_reconnect_timeout(self):
        if self.host_reconnect_handle:
            self.host_reconnect_handle.cancel()
            self.host_reconnect_handle = None

    def schedule_host_reconnect_timeout(self):
        self.cancel_host_reconnect_timeout()
        self.host_reconnect_handle = loop.call_later(HOST_RECONNECT_GRACE, self._close_if_host_missing)

    def _close_if_host_missing(self):
        self.host_reconnect_handle = None
        if self.host is None:
            self.cancel_board_start_handle()
            self.cancel_board_flow_handle()
            self.cancel_timers()
            self.broadcast({"type": "hostLeft"}, include_host=False)
            rooms.pop(self.code, None)

    def cancel_board_start_handle(self):
        if self.board and self.board.get("startHandle"):
            self.board["startHandle"].cancel()
            self.board["startHandle"] = None

    def cancel_board_flow_handle(self):
        if self.board and self.board.get("flowHandle"):
            self.board["flowHandle"].cancel()
            self.board["flowHandle"] = None

    def schedule_board_continue(self, cb, delay=None):
        if not self.board:
            return
        if delay is None:
            delay = float(self.board.get("actionDelay", BOARD_ACTION_DELAY))
        self.cancel_board_flow_handle()
        self.board["flowHandle"] = loop.call_later(delay, cb)

    def board_push_history(self, text):
        if not self.board:
            return
        msg = (text or "").strip()
        if not msg:
            return
        hist = self.board.setdefault("history", [])
        hist.append(msg)
        if len(hist) > 24:
            self.board["history"] = hist[-24:]

    def board_story(self, text):
        msg = (text or "").strip()
        if not msg:
            return
        if self.board is not None:
            self.board["lastLog"] = msg
        self.board_push_history(msg)
        self.broadcast({"type": "board:story", "text": msg})

    def attach_host(self, client):
        self.cancel_host_reconnect_timeout()
        self.host = client
        if self.host_participates and self.host_pid in self.players:
            self.players[self.host_pid]["connected"] = True
        client.role = "host"
        client.room = self
        client.send({
            "type": "created",
            "code": self.code,
            "lanUrl": join_url_for(client),
            "hostToken": self.host_token,
        })
        self.send_lobby()
        if self.state == "board" and self.board:
            client.send({"type": "board:init", "players": self.public_players(), "tiles": self.board.get("tiles", [])})
            client.send(self.board_payload())

    # ---- Helfer ----
    def _ensure_host_player(self):
        if self.host_participates:
            if self.host_pid not in self.players:
                self.players[self.host_pid] = {
                    "name": self.host_name,
                    "color": "#ffd34e",
                    "stars": 0,
                    "totalPoints": 0,
                    "position": 0,
                    "figure": self.host_figure,
                    "client": None,
                    "connected": self.host is not None,
                }
                self.order.append(self.host_pid)
            else:
                p = self.players[self.host_pid]
                p["name"] = self.host_name
                p["figure"] = self.host_figure
                p["connected"] = self.host is not None
                p["client"] = None
        else:
            if self.host_pid in self.players:
                self.players.pop(self.host_pid, None)
                self.order = [pid for pid in self.order if pid != self.host_pid]

    def set_host_profile(self, name, figure):
        if self.state != "lobby":
            return
        clean_name = (name or "").strip()[:14]
        if clean_name:
            self.host_name = clean_name
        clean_figure = (figure or "").strip()[:2]
        if clean_figure:
            self.host_figure = clean_figure
        self._ensure_host_player()
        self.send_lobby()

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
        self._ensure_host_player()
        required = 1 if self.host_participates else 2
        self.broadcast({
            "type": "lobby",
            "code": self.code,
            "players": self.public_players(),
            "canStart": len(self.connected_players()) >= 2,
            "requiredPlayers": required,
            "hostParticipates": self.host_participates,
            "state": self.state,
        })

    def set_host_participates(self, enabled):
        if self.state != "lobby":
            return
        self.host_participates = True
        self._ensure_host_player()
        self.send_lobby()

    # ---- Spieler-Verwaltung ----
    def add_player(self, client, name, pid=None, figure=None, reconnect_token=None):
        # Reconnect per Token (robuster als nur pid)
        if reconnect_token:
            for existing_pid, existing in self.players.items():
                if existing.get("reconnectToken") == reconnect_token:
                    pid = existing_pid
                    break

        # Reconnect?
        if pid and pid in self.players:
            if pid == self.host_pid:
                client.send({"type": "joinError", "message": "Ungültige Reconnect-Session."})
                return
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
                         "code": self.code, "state": self.state,
                         "reconnectToken": p.get("reconnectToken", "")})
            self.send_lobby()
            if self.state == "board" and self.board:
                client.send({"type": "board:init", "players": self.public_players(), "tiles": self.board.get("tiles", [])})
                client.send(self.board_payload())
                current = self.board.get("turnPlayerId")
                pending = (self.board.get("pending") or {}).get("player")
                if self.board.get("phase") == "turn" and current == pid:
                    client.send({"type": "board:yourTurn", "action": "roll", "message": "Du bist dran. Würfle jetzt!"})
                if self.board.get("phase") == "decision" and pending == pid:
                    pen = self.board.get("pending") or {}
                    tile_idx = int(pen.get("tile", 0))
                    tile = self.board.get("tiles", [])[tile_idx] if self.board.get("tiles") else {"idx": tile_idx, "name": "Feld", "icon": "🎮"}
                    if pen.get("kind") == "buy":
                        client.send({
                            "type": "board:decision",
                            "kind": "buy",
                            "tile": tile,
                            "cost": 1,
                            "message": "Dieses Feld ist frei. Für 1 Stern kaufen?",
                        })
                    elif pen.get("kind") == "rentOrDuel":
                        owner = self.players.get(pen.get("owner"))
                        client.send({
                            "type": "board:decision",
                            "kind": "rentOrDuel",
                            "tile": tile,
                            "ownerName": owner["name"] if owner else "Besitzer",
                            "message": f"Feld von {(owner['name'] if owner else 'Besitzer')}: 1 Stern zahlen oder zum Duell herausfordern?",
                        })
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
            "reconnectToken": uuid.uuid4().hex,
            "client": client, "connected": True,
        }
        self.order.append(new_pid)
        client.role = "player"
        client.room = self
        client.pid = new_pid
        client.send({"type": "joined", "playerId": new_pid, "name": name,
                     "color": color, "figure": figure,
                     "code": self.code, "state": self.state,
                     "reconnectToken": self.players[new_pid]["reconnectToken"]})
        self.send_lobby()

    def remove_client(self, client):
        if client is self.host:
            # Host weg -> Grace-Phase für Reconnect
            self.host = None
            if self.host_participates and self.host_pid in self.players:
                self.players[self.host_pid]["connected"] = False
            self.broadcast({"type": "hostDisconnected", "graceSeconds": HOST_RECONNECT_GRACE}, include_host=False)
            self.schedule_host_reconnect_timeout()
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
            if self.state == "board":
                self.handle_board_disconnect(client.pid)

    def handle_board_disconnect(self, pid):
        if not self.board:
            return
        phase = self.board.get("phase")
        pending = self.board.get("pending") or {}
        if phase == "turn" and self.board.get("turnPlayerId") == pid:
            self.board["lastLog"] = f"{self.players[pid]['name']} ist offline. Zug wird übersprungen."
            self.board_story(self.board["lastLog"])
            self.send_board_update()
            self.end_board_turn()
            return
        if phase == "decision" and pending.get("player") == pid:
            self.board_decision(pid, "skip")
            return
        if phase in ("duel", "duelIntro") and self.board.get("duel"):
            d = self.board["duel"]
            if pid in (d.get("challenger"), d.get("owner")):
                d["scores"][pid] = 0
                d["finished"].add(pid)
                other = d.get("owner") if pid == d.get("challenger") else d.get("challenger")
                if other in self.players:
                    d["finished"].add(other)
                self.finish_board_duel()
            return
        if phase in ("global", "globalIntro") and self.board.get("global"):
            g = self.board["global"]
            if pid in g.get("participants", []):
                g["participants"] = [x for x in g["participants"] if x != pid]
                g["finished"] = {x for x in g.get("finished", set()) if x != pid}
                g["scores"].pop(pid, None)
                if g["participants"] and all(x in g["finished"] for x in g["participants"]):
                    self.finish_global_board_round()

    # ---- Board Mode ----
    def build_board_tiles(self):
        games = (self.settings or {}).get("games") or []
        default_game = {"id": "reaction", "name": "Reaktion", "icon": "⚡", "desc": "", "rules": ""}
        game_pool = games[:] if games else [default_game]
        tiles = []
        event_slots = {4, 9, 14, 19}
        for i in range(24):
            if i == 0:
                tiles.append({"idx": i, "type": "start", "name": "START", "icon": "🏁"})
                continue
            if i in event_slots:
                tiles.append({"idx": i, "type": "event", "name": "Ereignis", "icon": "🎲"})
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
        pending = b.get("pending") or {}
        return {
            "type": "board:update",
            "state": self.state,
            "phase": b.get("phase", "turn"),
            "lapsDone": b.get("lapsDone", 0),
            "lapsTotal": b.get("lapsTotal", 0),
            "turnPlayerId": b.get("turnPlayerId"),
            "pendingPlayerId": pending.get("player"),
            "tiles": b.get("tiles", []),
            "owners": b.get("owners", {}),
            "players": self.public_players(),
            "log": b.get("lastLog", ""),
            "history": b.get("history", []),
            "tempo": b.get("tempo", "normal"),
        }

    def prepare_game_instance(self, game):
        """Create a per-round payload so every client receives identical game metadata."""
        g = dict(game or {})
        if g.get("id") == "quizduel":
            g["quizSeed"] = random.randint(1, 2**31 - 1)
        return g

    def send_board_update(self):
        self.broadcast(self.board_payload())

    def start_board_game(self, rounds, games, tempo="normal"):
        rounds = max(1, min(20, int(rounds)))
        tempo_key = str(tempo or "normal").lower()
        if tempo_key not in BOARD_TEMPO_PRESETS:
            tempo_key = "normal"
        preset = BOARD_TEMPO_PRESETS[tempo_key]
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
            "lastLog": "Monopoly-Modus gestartet. Alle starten mit 3 Sternen.",
            "history": ["Monopoly-Modus gestartet. Alle starten mit 3 Sternen."],
            "duel": None,
            "global": None,
            "tempo": tempo_key,
            "actionDelay": float(preset["actionDelay"]),
            "introDelay": float(preset["introDelay"]),
            "startHandle": None,
            "flowHandle": None,
        }
        self.state = "board"
        self.broadcast({"type": "board:init", "players": self.public_players(), "tiles": self.board["tiles"]})
        self.send_board_update()
        self.begin_board_turn()

    def begin_board_turn(self):
        if self.state != "board" or not self.board:
            return
        self.cancel_board_flow_handle()
        connected = self.connected_players()
        if len(connected) < 2:
            self.board_story("Zu wenige verbundene Spieler.")
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
        self.board_story(f"🎯 {p['name']} ist am Zug und würfelt.")
        self.send_board_update()
        if p.get("client"):
            p["client"].send({"type": "board:yourTurn", "action": "roll", "message": "Du bist dran. Würfle jetzt!"})
        elif pid == self.host_pid and self.host and self.host_participates:
            self.host.send({"type": "board:yourTurn", "action": "roll", "message": "Du bist dran. Würfle jetzt!"})

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
        self.board_story(self.board["lastLog"])
        self.broadcast({
            "type": "board:rolled",
            "playerId": pid,
            "roll": roll,
            "from": old_pos,
            "to": new_pos,
            "tile": tile,
        })
        self.resolve_board_tile(pid, tile)

    def apply_chaos(self, trigger_pid):
        connected = self.connected_players()
        if not connected:
            return {"text": "Ereignis ausgelöst.", "triggerGlobal": False}
        effect = random.choices(BOARD_EVENT_EFFECTS, weights=[max(1, int(e.get("weight", 1))) for e in BOARD_EVENT_EFFECTS], k=1)[0]
        trigger = self.players.get(trigger_pid)
        txt = "🎲 Ereignis ausgelöst."
        trigger_global = False
        size = max(1, len((self.board or {}).get("tiles", [])))

        if not trigger:
            return {"text": txt, "triggerGlobal": False}

        self.broadcast({
            "type": "board:eventReveal",
            "title": effect.get("title", "Ereignis"),
            "rarity": effect.get("rarity", "Gewoehnlich"),
            "triggerName": trigger.get("name", "Spieler"),
        })

        if effect["id"] == "give_lowest":
            low = min((self.players[pid].get("stars", 0), pid) for pid in connected)[1]
            self.players[low]["stars"] += 1
            txt = f"🎁 Lucky Boost: {self.players[low]['name']} hat die wenigsten Sterne und bekommt +1 Stern."
        elif effect["id"] == "step_back":
            trigger["position"] = (trigger.get("position", 0) - 5) % size
            txt = f"↩️ Zeitreise: {trigger['name']} geht 5 Felder zurück."
        elif effect["id"] == "step_forward":
            trigger["position"] = (trigger.get("position", 0) + 3) % size
            txt = f"⏩ Rückenwind: {trigger['name']} springt 3 Felder vor."
        elif effect["id"] == "rich_tax":
            high = max((self.players[pid].get("stars", 0), pid) for pid in connected)[1]
            self.players[high]["stars"] = max(0, self.players[high].get("stars", 0) - 1)
            txt = f"💸 Reichensteuer: {self.players[high]['name']} verliert 1 Stern."
        elif effect["id"] == "all_bonus":
            for pid in connected:
                self.players[pid]["stars"] += 1
            txt = "🌟 Team-Mood: Alle Spieler bekommen +1 Stern."
        elif effect["id"] == "swap_random" and len(connected) >= 2:
            a, b = random.sample(connected, 2)
            self.players[a]["position"], self.players[b]["position"] = self.players[b].get("position", 0), self.players[a].get("position", 0)
            txt = f"🌀 Positionswechsel: {self.players[a]['name']} und {self.players[b]['name']} tauschen ihre Felder."
        elif effect["id"] == "star_rain":
            lucky = random.choice(connected)
            self.players[lucky]["stars"] += 2
            txt = f"🌠 Sternenregen: {self.players[lucky]['name']} bekommt +2 Sterne."
        elif effect["id"] == "steal_from_leader" and len(connected) >= 2:
            leader = max((self.players[pid].get("stars", 0), pid) for pid in connected)[1]
            if leader != trigger_pid and self.players[leader].get("stars", 0) > 0:
                self.players[leader]["stars"] -= 1
                trigger["stars"] += 1
                txt = f"🕶️ Coup: {trigger['name']} stiehlt 1 Stern von {self.players[leader]['name']}."
            else:
                txt = f"🕶️ Coup vereitelt: {trigger['name']} findet kein Ziel."
        elif effect["id"] == "lottery":
            win = random.randint(0, 2)
            lose = random.randint(0, 1)
            trigger["stars"] = max(0, trigger.get("stars", 0) + win - lose)
            txt = f"🎰 Sternenlotterie: {trigger['name']} gewinnt +{win} und verliert -{lose} Sterne."
        elif effect["id"] == "claim_free_tile":
            free_tiles = [t for t in (self.board or {}).get("tiles", []) if t.get("type") == "property" and str(t.get("idx")) not in (self.board or {}).get("owners", {})]
            if free_tiles and trigger.get("stars", 0) >= 1:
                tile = random.choice(free_tiles)
                trigger["stars"] -= 1
                self.board["owners"][str(tile["idx"])] = trigger_pid
                txt = f"🏷️ Blitz-Kauf: {trigger['name']} sichert sich Feld {tile['idx']} für 1 Stern."
            else:
                txt = f"🏷️ Blitz-Kauf: Keine freien Felder oder zu wenig Sterne für {trigger['name']}."
        elif effect["id"] == "bonus_duel":
            eligible = [pid for pid in connected if pid != trigger_pid]
            if eligible:
                rival = random.choice(eligible)
                delta = random.randint(1, 2)
                take = min(delta, self.players[rival].get("stars", 0))
                self.players[rival]["stars"] -= take
                trigger["stars"] += take
                txt = f"🥊 Power-Duell: {trigger['name']} gewinnt {take} Stern(e) von {self.players[rival]['name']}."
            else:
                txt = f"🥊 Power-Duell: Kein Gegner für {trigger['name']} verfügbar."
        elif effect["id"] == "trigger_global":
            trigger_global = True
            txt = "🎮 Event-Karte! Sofort startet ein globales Minispiel für alle."

        self.broadcast({"type": "board:chaos", "targetId": trigger_pid, "text": txt})
        self.board_story(txt)
        return {"text": txt, "triggerGlobal": trigger_global}

    def resolve_board_tile(self, pid, tile):
        b = self.board
        p = self.players[pid]
        if tile["type"] == "start":
            b["lastLog"] = f"🏁 {p['name']} landet auf START."
            self.board_story(b["lastLog"])
            self.send_board_update()
            self.schedule_board_continue(self.end_board_turn)
            return
        if tile["type"] == "event":
            event_outcome = self.apply_chaos(pid)
            txt = event_outcome.get("text") if isinstance(event_outcome, dict) else str(event_outcome)
            if txt:
                b["lastLog"] = txt
            self.send_board_update()
            reveal_delay = float(b.get("eventRevealDelay", 2.3))
            next_delay = float(b.get("actionDelay", BOARD_ACTION_DELAY)) + reveal_delay
            if isinstance(event_outcome, dict) and event_outcome.get("triggerGlobal"):
                self.schedule_board_continue(lambda: self.start_global_board_round(trigger="chaos", resume="end_turn"), delay=next_delay)
            else:
                self.schedule_board_continue(self.end_board_turn, delay=next_delay)
            return
        if tile["type"] != "property":
            self.schedule_board_continue(self.end_board_turn)
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
            elif pid == self.host_pid and self.host and self.host_participates:
                self.host.send({
                    "type": "board:decision",
                    "kind": "buy",
                    "tile": tile,
                    "cost": 1,
                    "message": "Dieses Feld ist frei. Für 1 Stern kaufen?",
                })
            self.send_board_update()
            return

        if owner == pid:
            b["lastLog"] = f"{p['name']} landet auf eigenem Feld."
            self.board_story(b["lastLog"])
            self.send_board_update()
            self.schedule_board_continue(self.end_board_turn)
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
        elif pid == self.host_pid and self.host and self.host_participates:
            self.host.send({
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
                self.board_story(self.board["lastLog"])
            else:
                self.board["lastLog"] = f"{player['name']} kauft nicht."
                self.board_story(self.board["lastLog"])
            self.board["pending"] = None
            self.send_board_update()
            self.schedule_board_continue(self.end_board_turn)
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
                self.board_story(f"⚔️ {player['name']} fordert {owner_p['name']} zum Duell um Feld {tile_idx} heraus.")
                self.begin_board_duel(pid, owner, int(tile_idx))
                return
            # default: rent
            if player["stars"] >= 1:
                player["stars"] -= 1
                owner_p["stars"] += 1
                self.board["lastLog"] = f"{player['name']} zahlt 1 Stern an {owner_p['name']}."
                self.board_story(self.board["lastLog"])
            else:
                self.board["lastLog"] = f"{player['name']} hat keine Sterne zum Zahlen."
                self.board_story(self.board["lastLog"])
            self.board["pending"] = None
            self.send_board_update()
            self.schedule_board_continue(self.end_board_turn)

    def begin_board_duel(self, challenger, owner, tile_idx):
        self.cancel_board_flow_handle()
        intro_delay = float(self.board.get("introDelay", ROUND_INTRO_DELAY))
        game_pool = (self.settings or {}).get("games") or []
        base_game = random.choice(game_pool) if game_pool else {"id": "reaction", "name": "Reaktion", "icon": "⚡", "desc": "", "rules": ""}
        game = self.prepare_game_instance(base_game)
        duel_id = uuid.uuid4().hex[:8]
        self.board["phase"] = "duelIntro"
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
        self.board["lastLog"] = f"Duell startet in {int(intro_delay)}s: {cp['name']} vs {op['name']} um Feld {tile_idx}."
        self.broadcast({"type": "board:announce", "text": self.board["lastLog"]})
        self.board_story(self.board["lastLog"])
        for pid in (challenger, owner):
            c = self.players[pid].get("client")
            if c:
                c.send({"type": "roundIntro", "round": 1, "total": 1, "game": game})
        self.broadcast({
            "type": "board:duel",
            "challenger": challenger,
            "owner": owner,
            "challengerName": cp["name"],
            "ownerName": op["name"],
            "tile": tile_idx,
            "game": game,
            "startsIn": int(intro_delay),
        })
        self.send_board_update()
        self.cancel_board_start_handle()
        self.board["startHandle"] = loop.call_later(intro_delay, self.begin_board_duel_start)

    def begin_board_duel_start(self):
        if self.state != "board" or not self.board or not self.board.get("duel"):
            return
        d = self.board["duel"]
        self.board["startHandle"] = None
        self.board["phase"] = "duel"
        game = d["game"]
        for pid in (d["challenger"], d["owner"]):
            c = self.players.get(pid, {}).get("client")
            if c:
                c.send({"type": "start", "round": 1, "game": game})
            elif pid == self.host_pid and self.host and self.host_participates:
                self.host.send({"type": "start", "round": 1, "game": game})
            else:
                d["scores"][pid] = 0
                d["finished"].add(pid)
        if all(x in d["finished"] for x in (d["challenger"], d["owner"])):
            self.finish_board_duel()

    def start_global_board_round(self, trigger="lap", resume="begin_turn"):
        self.cancel_board_flow_handle()
        intro_delay = float(self.board.get("introDelay", ROUND_INTRO_DELAY))
        game_pool = (self.settings or {}).get("games") or []
        base_game = random.choice(game_pool) if game_pool else {"id": "reaction", "name": "Reaktion", "icon": "⚡", "desc": "", "rules": ""}
        game = self.prepare_game_instance(base_game)
        participants = self.connected_players()
        if not participants:
            if resume == "end_turn":
                self.end_board_turn()
            else:
                self.begin_board_turn()
            return
        self.board["phase"] = "globalIntro"
        self.board["global"] = {
            "id": uuid.uuid4().hex[:8],
            "game": game,
            "trigger": trigger,
            "resume": resume,
            "participants": participants,
            "scores": {},
            "finished": set(),
        }
        if trigger == "chaos":
            self.board["lastLog"] = f"Ereignis-Runde startet: {game.get('icon', '🎮')} {game.get('name', 'Mini-Spiel')}"
        else:
            self.board["lastLog"] = f"Runden-Minispiel startet: {game.get('icon', '🎮')} {game.get('name', 'Mini-Spiel')}"
        self.broadcast({"type": "board:announce", "text": self.board["lastLog"]})
        self.board_story(self.board["lastLog"])
        self.broadcast({"type": "roundIntro", "round": self.board["lapsDone"], "total": self.board["lapsTotal"], "game": game})
        self.send_board_update()
        self.cancel_board_start_handle()
        self.board["startHandle"] = loop.call_later(intro_delay, self.begin_global_board_start)

    def begin_global_board_start(self):
        if self.state != "board" or not self.board or not self.board.get("global"):
            return
        g = self.board["global"]
        self.board["startHandle"] = None
        self.board["phase"] = "global"
        game = g["game"]
        for pid in list(g.get("participants", [])):
            c = self.players.get(pid, {}).get("client")
            if c:
                c.send({"type": "start", "round": self.board["lapsDone"], "game": game})
            elif pid == self.host_pid and self.host and self.host_participates:
                self.host.send({"type": "start", "round": self.board["lapsDone"], "game": game})
            else:
                g["participants"] = [x for x in g["participants"] if x != pid]
        if not g.get("participants"):
            self.finish_global_board_round()
            return
        self.send_board_update()

    def board_player_score(self, pid, score):
        if self.state != "board" or not self.board:
            return
        score = max(0, int(score))
        if self.board.get("phase") == "duel" and self.board.get("duel"):
            d = self.board["duel"]
            if pid in (d["challenger"], d["owner"]):
                d["scores"][pid] = score
                self.broadcast({
                    "type": "board:duelLive",
                    "challenger": d["challenger"],
                    "owner": d["owner"],
                    "scores": d["scores"],
                })
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
            self.board_story(f"🏆 {cp['name']} gewinnt gegen {op['name']} und übernimmt Feld {tile}.")
        else:
            pay = min(2, cp.get("stars", 0))
            cp["stars"] -= pay
            op["stars"] += pay
            self.board["lastLog"] = f"{cp['name']} verliert das Duell und zahlt {pay} Sterne an {op['name']}."
            self.board_story(f"💥 {op['name']} verteidigt Feld {tile}. {cp['name']} zahlt {pay} Stern(e).")
        self.broadcast({"type": "board:duelResult", "challenger": challenger, "owner": owner, "challengerScore": cs, "ownerScore": os, "tile": int(tile)})
        self.board["duel"] = None
        self.board["phase"] = "turn"
        self.send_board_update()
        self.schedule_board_continue(self.end_board_turn)

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
            winner_names = [r["name"] for r in ranking if r["score"] == top and top > 0]
            if winner_names:
                self.board_story(f"🎉 Runden-Minispiel beendet: {', '.join(winner_names)} gewinnt/gewinnen +1 Stern.")
            else:
                self.board_story("🎉 Runden-Minispiel beendet: Keine Sterne vergeben.")
        self.broadcast({"type": "board:globalResult", "ranking": ranking})
        self.board["global"] = None
        self.board["phase"] = "turn"
        self.send_board_update()
        resume = g.get("resume", "begin_turn")
        if resume == "end_turn":
            self.schedule_board_continue(self.end_board_turn)
        else:
            self.schedule_board_continue(self.begin_board_turn)

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
            self.start_global_board_round(trigger="lap", resume="begin_turn")
            return
        self.begin_board_turn()

    # ---- Spielstart ----
    def start_game(self, rounds, order_mode, games, mode="classic", tempo="normal"):
        self._ensure_host_player()
        required = 1 if self.host_participates else 2
        if len(self.connected_players()) < 2:
            joined = max(0, len(self.connected_players()) - (1 if self.host_participates else 0))
            missing = max(1, required - joined)
            self.host.send({"type": "joinError", "message": f"Mindestens {missing} weiterer Spieler nötig."})
            return
        if not games and mode != "quizduell":
            self.host.send({"type": "joinError", "message": "Mindestens 1 Spiel auswählen."})
            return
        self.mode = mode or "classic"
        rounds = max(1, min(20, int(rounds)))
        if self.mode == "quizduell":
            games = [{
                "id": "quizduel",
                "name": "Quiz Duell",
                "icon": "🧠",
                "desc": "5 Quizfragen pro Runde. Die meisten richtigen Antworten erhalten einen Stern.",
                "rules": "Beantworte 5 Fragen. Jeder richtige Treffer zählt 1 Punkt. Wer in der Runde die meisten richtigen Antworten hat, bekommt einen Stern.",
            }]
            order_mode = "fixed"
        self.settings = {"rounds": rounds, "order": order_mode, "games": games, "tempo": tempo}
        if self.mode == "board":
            self.start_board_game(rounds, games, tempo=tempo)
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
        self.current_game = None
        self.start_round()

    def start_round(self):
        self.state = "roundIntro"
        self.current_game = self.prepare_game_instance(self.queue[self.round])
        self.broadcast({
            "type": "roundIntro",
            "round": self.round + 1,
            "total": self.settings["rounds"],
            "game": self.current_game,
        })

    def begin_round(self):
        if self.state != "roundIntro":
            return
        self.state = "playing"
        self.scores = {}
        self.finished = set()
        game = self.current_game or self.prepare_game_instance(self.queue[self.round])
        self.current_game = game
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
        game = self.current_game or self.queue[self.round]

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
        self.cancel_board_start_handle()
        self.cancel_board_flow_handle()
        self.mode = "classic"
        self.board = None
        self.state = "lobby"
        self.queue = []
        self.round = 0
        self.current_game = None
        self.scores = {}
        self.finished = set()
        for pid in self.order:
            self.players[pid]["stars"] = 0
            self.players[pid]["totalPoints"] = 0
        self._ensure_host_player()
        self.send_lobby()

    def end_game(self):
        self.cancel_timers()
        self.cancel_board_start_handle()
        self.cancel_board_flow_handle()
        self.broadcast({"type": "hostLeft"}, include_host=True)
        rooms.pop(self.code, None)


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
        room.attach_host(client)
        return

    if t == "host:resume":
        code = (msg.get("code") or "").strip().upper()
        token = (msg.get("hostToken") or "").strip()
        room = rooms.get(code)
        if not room or not token or token != room.host_token:
            client.send({"type": "joinError", "message": "Host-Session konnte nicht wiederhergestellt werden."})
            return
        room.attach_host(client)
        return

    if t in ("host:setParticipates", "host:setParticipation"):
        room = client.room
        if room and client.role == "host":
            room.set_host_participates(msg.get("enabled"))
        return

    if t == "host:setProfile":
        room = client.room
        if room and client.role == "host":
            room.set_host_profile(msg.get("name"), msg.get("figure"))
        return

    if t == "player:join":
        code = (msg.get("code") or "").strip().upper()
        room = rooms.get(code)
        if not room:
            client.send({"type": "joinError", "message": "Raum-Code nicht gefunden."})
            return
        room.add_player(client, msg.get("name"), msg.get("playerId"), msg.get("figure"), msg.get("reconnectToken"))
        return

    room = client.room
    if not room:
        return

    if t == "host:start" and client.role == "host":
        room.set_host_participates(True)
        room.start_game(
            msg.get("rounds", 5),
            msg.get("order", "random"),
            msg.get("games", []),
            msg.get("mode", "classic"),
            msg.get("tempo", "normal"),
        )
    elif t == "host:beginRound" and client.role == "host":
        room.begin_round()
    elif t == "host:next" and client.role == "host":
        room.next_step()
    elif t == "host:playAgain" and client.role == "host":
        room.play_again()
    elif t == "host:endGame" and client.role == "host":
        room.end_game()
    elif t == "player:endGame" and client.role in ("player", "host"):
        if room.state != "lobby":
            room.end_game()
    elif t == "board:hostNextTurn" and client.role == "host":
        room.begin_board_turn()
    elif t == "board:roll" and client.role in ("player", "host"):
        pid = client.pid if client.role == "player" else room.host_pid
        room.board_roll(pid)
    elif t == "board:decision" and client.role in ("player", "host"):
        pid = client.pid if client.role == "player" else room.host_pid
        room.board_decision(pid, msg.get("action"))
    elif t == "player:score" and client.role in ("player", "host"):
        pid = client.pid if client.role == "player" else room.host_pid
        if room.mode == "board":
            room.board_player_score(pid, msg.get("score", 0))
        else:
            room.player_score(pid, msg.get("score", 0))
    elif t == "player:finished" and client.role in ("player", "host"):
        pid = client.pid if client.role == "player" else room.host_pid
        if room.mode == "board":
            room.board_player_finished(pid, msg.get("score", 0))
        else:
            room.player_finished(pid, msg.get("score", 0))


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
    mimetypes.add_type("application/manifest+json", ".webmanifest")
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
