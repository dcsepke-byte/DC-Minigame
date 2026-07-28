#!/usr/bin/env python3
"""Party Arena E2E Test-Bot: startet Server, erstellt Raum, joint als Spieler,
fuehrt eine vereinfachte Runde durch und prueft ob die Session stabil laeuft."""

import asyncio
import json
import os
import subprocess
import sys
import time
import websockets

SERVER_DIR = os.path.dirname(os.path.abspath(__file__))
HOST_WS = "ws://localhost:3000/ws"
PLAYER_WS = "ws://localhost:3000/ws"


def start_server():
    """Startet server.py im Hintergrund und wartet auf Ready."""
    proc = subprocess.Popen(
        ["python3", "server.py"],
        cwd=SERVER_DIR,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
    )
    # Warte bis Server bereit
    for _ in range(30):
        line = proc.stdout.readline()
        if "Mehrspieler-Server laeuft" in line:
            break
        if proc.poll() is not None:
            raise RuntimeError("Server ist vorzeitig beendet")
        time.sleep(0.2)
    return proc


def stop_server(proc):
    if proc and proc.poll() is None:
        proc.terminate()
        try:
            proc.wait(timeout=5)
        except subprocess.TimeoutExpired:
            proc.kill()


async def host_session(code_event):
    async with websockets.connect(HOST_WS) as ws:
        await ws.send(json.dumps({"type": "host:create", "mode": "board-party"}))
        msg = json.loads(await ws.recv())
        code = msg.get("code")
        print(f"[HOST] Raum erstellt: {code}")
        code_event.set()

        # Warte auf Spieler-Join
        await asyncio.sleep(2)

        games = [
            {"id": "dice", "name": "Wuerfel-Wette", "icon": "🎲", "desc": "", "rules": ""},
            {"id": "tower-stack", "name": "Turm Stapel", "icon": "🏗", "desc": "", "rules": ""},
        ]
        await ws.send(json.dumps({
            "type": "host:start",
            "code": code,
            "rounds": 1,
            "order": "join",
            "mode": "board-party",
            "tempo": "normal",
            "hostParticipates": True,
            "games": games,
        }))
        print("[HOST] Start gesendet")

        received_types = []
        for i in range(30):
            try:
                m = json.loads(await asyncio.wait_for(ws.recv(), timeout=8))
                t = m.get("type")
                received_types.append(t)
                print(f"[HOST {i}] {t}")
                if t in ("gameOver", "final"):
                    print("[HOST] Spielende erreicht")
                    return code, received_types
            except asyncio.TimeoutError:
                print(f"[HOST {i}] timeout")
                break
        return code, received_types


async def player_bot(code_event):
    await code_event.wait()
    code = getattr(code_event, "code", None)
    await asyncio.sleep(0.5)

    async with websockets.connect(PLAYER_WS) as ws:
        await ws.send(json.dumps({
            "type": "player:join",
            "code": code,
            "name": "Bot",
            "figure": "🐱",
        }))
        msg = json.loads(await ws.recv())
        print(f"[PLAYER] Join: {msg.get('type')}")

        received_types = []
        for i in range(30):
            try:
                m = json.loads(await asyncio.wait_for(ws.recv(), timeout=8))
                t = m.get("type")
                received_types.append(t)
                print(f"[PLAYER {i}] {t}")

                # Einfache Bot-Reaktionen auf Game-Prompts
                if t in ("game:start", "minigame:start", "duel:start"):
                    await ws.send(json.dumps({"type": "game:ready"}))
                elif t == "board:prompt" and "wuerfeln" in (m.get("prompt") or "").lower():
                    await ws.send(json.dumps({"type": "board:roll"}))
                elif t == "minigame:input":
                    await ws.send(json.dumps({"type": "minigame:result", "score": 100}))
                elif t in ("gameOver", "final"):
                    print("[PLAYER] Spielende erreicht")
                    return received_types
            except asyncio.TimeoutError:
                print(f"[PLAYER {i}] timeout")
                break
        return received_types


async def main():
    server = start_server()
    try:
        await asyncio.sleep(1)
        code_event = asyncio.Event()
        code_event.code = None

        host_task = asyncio.create_task(host_session(code_event))

        # Code aus Host-Task extrahieren (Hack ueber shared queue)
        q = asyncio.Queue()
        async def wrapped_host():
            code, types = await host_session(code_event)
            await q.put(("host", code, types))
        async def wrapped_player():
            types = await player_bot(code_event)
            await q.put(("player", None, types))

        await asyncio.gather(wrapped_host(), wrapped_player())

        results = []
        while not q.empty():
            results.append(await q.get())

        for role, code, types in results:
            print(f"\n[{role.upper()}] Code={code}, Nachrichten={types}")
            if "roundIntro" in types:
                print(f"[{role.upper()}] ✅ Runde gestartet")
            if "gameOver" in types or "final" in types:
                print(f"[{role.upper()}] ✅ Spielende erreicht")
    finally:
        stop_server(server)


if __name__ == "__main__":
    asyncio.run(main())
