#!/usr/bin/env python3
"""Repro: Host-Minigame-Flow im Board-Modus — loggt alle Nachrichten mit Timestamps."""
import asyncio, websockets, json, random, time, sys

WS = 'ws://localhost:3000/ws'

def ts():
    return f"{time.time():.1f}"

async def host_session(code_q):
    async with websockets.connect(WS) as ws:
        await ws.send(json.dumps({'type': 'host:create', 'mode': 'board-party'}))
        msg = json.loads(await ws.recv())
        code = msg.get('code')
        print(f"{ts()} [HOST] Raum: {code}", flush=True)
        code_q.put_nowait(code)
        await asyncio.sleep(1.5)
        games = [
            {'id': 'tower-stack', 'name': 'Turm Stapel', 'icon': '🏗', 'desc': '', 'rules': ''},
        ]
        await ws.send(json.dumps({
            'type': 'host:start', 'code': code, 'rounds': 2, 'order': 'join',
            'mode': 'board', 'tempo': 'fast', 'hostParticipates': True, 'games': games,
        }))
        print(f"{ts()} [HOST] start gesendet", flush=True)
        for i in range(80):
            try:
                m = json.loads(await asyncio.wait_for(ws.recv(), timeout=15))
            except asyncio.TimeoutError:
                print(f"{ts()} [HOST] TIMEOUT bei i={i}", flush=True)
                break
            t = m.get('type')
            if t in ('roundIntro', 'start', 'board:announce', 'board:update', 'board:updateDiff',
                     'board:globalResult', 'board:duelResult', 'final', 'board:yourTurn',
                     'board:decision', 'board:rolled', 'board:roundEnd'):
                extra = json.dumps({k: v for k, v in m.items() if k not in ('tiles', 'players', 'diff', 'options')}, ensure_ascii=False)[:180]
                print(f"{ts()} [HOST] <- {t} {extra}", flush=True)
            if t == 'roundIntro':
                await asyncio.sleep(0.3)
                await ws.send(json.dumps({'type': 'host:beginRound'}))
            elif t == 'board:yourTurn' and m.get('action') == 'roll':
                await asyncio.sleep(0.3)
                await ws.send(json.dumps({'type': 'board:roll'}))
            elif t == 'board:chooseBranch':
                await asyncio.sleep(0.3)
                await ws.send(json.dumps({'type': 'board:chooseBranch', 'choiceIdx': 0}))
            elif t == 'board:decision':
                await asyncio.sleep(0.3)
                kind = m.get('kind')
                action = 'buy' if kind == 'buy' else ('duel' if kind == 'rentOrDuel' else 'skip')
                await ws.send(json.dumps({'type': 'board:decision', 'action': action}))
            elif t in ('start',):
                print(f"{ts()} [HOST] !! start empfangen -> warte 1s, sende player:finished", flush=True)
                await asyncio.sleep(1.0)
                await ws.send(json.dumps({'type': 'player:finished', 'score': 100}))
            elif t in ('gameOver', 'final'):
                print(f"{ts()} [HOST] end reached ({t})", flush=True)
                break
        return

async def player_bot(code_q):
    code = await code_q.get()
    await asyncio.sleep(0.5)
    async with websockets.connect(WS) as ws:
        await ws.send(json.dumps({'type': 'player:join', 'code': code, 'name': 'Bot', 'figure': '🐱'}))
        msg = json.loads(await ws.recv())
        print(f"{ts()} [PLAYER] {msg.get('type')}", flush=True)
        for i in range(80):
            try:
                m = json.loads(await asyncio.wait_for(ws.recv(), timeout=15))
            except asyncio.TimeoutError:
                print(f"{ts()} [PLAYER] TIMEOUT bei i={i}", flush=True)
                break
            t = m.get('type')
            if t in ('roundIntro', 'start', 'board:announce', 'board:globalResult', 'board:duelResult',
                     'final', 'board:yourTurn', 'board:decision', 'board:rolled', 'board:roundEnd'):
                extra = json.dumps({k: v for k, v in m.items() if k not in ('tiles', 'players', 'diff', 'options')}, ensure_ascii=False)[:160]
                print(f"{ts()} [PLAYER] <- {t} {extra}", flush=True)
            if t == 'board:yourTurn' and m.get('action') == 'roll':
                await asyncio.sleep(0.3)
                await ws.send(json.dumps({'type': 'board:roll'}))
            elif t == 'board:chooseBranch':
                await asyncio.sleep(0.2)
                await ws.send(json.dumps({'type': 'board:chooseBranch', 'choiceIdx': 0}))
            elif t == 'board:decision':
                await asyncio.sleep(0.2)
                kind = m.get('kind')
                action = 'buy' if kind == 'buy' else ('duel' if kind == 'rentOrDuel' else 'skip')
                await ws.send(json.dumps({'type': 'board:decision', 'action': action}))
            elif t in ('start', 'minigame:start', 'duel:start', 'game:start'):
                print(f"{ts()} [PLAYER] !! start empfangen -> sende player:finished", flush=True)
                await asyncio.sleep(1.0)
                await ws.send(json.dumps({'type': 'player:finished', 'score': random.randint(80, 150)}))
            elif t in ('gameOver', 'final'):
                print(f"{ts()} [PLAYER] end reached ({t})", flush=True)
                break
        return

async def main():
    code_q = asyncio.Queue()
    await asyncio.gather(host_session(code_q), player_bot(code_q))

asyncio.run(main())
