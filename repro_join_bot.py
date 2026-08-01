#!/usr/bin/env python3
"""Minimaler Join-Bot: tritt einem Raum bei und beantwortet Board-Events."""
import asyncio, websockets, json, sys, random

WS = 'ws://localhost:3000/ws'

async def main():
    code = sys.argv[1] if len(sys.argv) > 1 else ''
    async with websockets.connect(WS) as ws:
        await ws.send(json.dumps({'type': 'player:join', 'code': code, 'name': 'Bot', 'figure': '🐱'}))
        msg = json.loads(await ws.recv())
        print(f"joined: {msg.get('type')}", flush=True)
        for i in range(200):
            try:
                m = json.loads(await asyncio.wait_for(ws.recv(), timeout=10))
            except asyncio.TimeoutError:
                continue
            t = m.get('type')
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
                await asyncio.sleep(1.0)
                await ws.send(json.dumps({'type': 'player:finished', 'score': random.randint(80, 150)}))
            elif t in ('gameOver', 'final'):
                print('bot end', flush=True)
                break

asyncio.run(main())
