"""Party Arena — Screenshot-Bot (Spieler).

Tritt einem Raum bei und spielt automatisch (Board-Zuege + Minispiele),
damit der Host-Browser eine lebendige Party-Session fuer Store-Screenshots hat.
"""
import asyncio, websockets, json, random, sys, time

PLAYER_WS = 'ws://localhost:3000/ws'

def ts():
    return time.strftime('%H:%M:%S', time.localtime())


async def player_bot(code, name, figure):
    async with websockets.connect(PLAYER_WS) as ws:
        await ws.send(json.dumps({'type': 'player:join', 'code': code, 'name': name, 'figure': figure}))
        first = json.loads(await ws.recv())
        print(f'[BOT:{name}] joined: {first.get("type")}')
        for _ in range(200):
            try:
                m = json.loads(await asyncio.wait_for(ws.recv(), timeout=20))
            except asyncio.TimeoutError:
                continue
            t = m.get('type')
            if t in ('board:yourTurn', 'board:branchChoice', 'board:decision', 'minigame:start', 'duel:start', 'game:start', 'roundIntro', 'board:rolled', 'gameOver', 'final', 'board:init'):
                print(f'{ts()} [BOT:{name}] <- {t} {json.dumps({k: v for k, v in m.items() if k not in ("tiles", "players", "options", "diff")}, ensure_ascii=False)[:160]}')
            if t == 'board:yourTurn' and m.get('action') == 'roll':
                await asyncio.sleep(0.4)
                print(f'{ts()} [BOT:{name}] -> board:roll')
                await ws.send(json.dumps({'type': 'board:roll'}))
            elif t == 'board:chooseBranch':
                await asyncio.sleep(0.3)
                await ws.send(json.dumps({'type': 'board:chooseBranch', 'choiceIdx': 0}))
            elif t == 'board:decision':
                await asyncio.sleep(0.3)
                kind = m.get('kind')
                action = 'buy' if kind == 'buy' else 'skip'
                await ws.send(json.dumps({'type': 'board:decision', 'action': action}))
            elif t in ('minigame:start', 'duel:start', 'game:start', 'start'):
                # 'start' ist der Board-Modus-Start (Server sendet type=start);
                # minigame:start/duel:start/game:start kommen im Classic-Modus.
                await asyncio.sleep(2.0)
                print(f'{ts()} [BOT:{name}] -> player:finished')
                await ws.send(json.dumps({'type': 'player:finished', 'score': random.randint(80, 150)}))
            elif t in ('gameOver', 'final'):
                print(f'[BOT:{name}] end reached')
                break
        print(f'[BOT:{name}] done')


async def main():
    code = sys.argv[1]
    name = sys.argv[2] if len(sys.argv) > 2 else 'Mia'
    figure = sys.argv[3] if len(sys.argv) > 3 else '🦊'
    await player_bot(code, name, figure)


asyncio.run(main())
