#!/usr/bin/env python3
"""4-Bot Stress-Test mit Debug."""
import asyncio, websockets, json, random, sys

HOST_WS = 'ws://localhost:3000/ws'
PLAYER_WS = 'ws://localhost:3000/ws'
BOT_COUNT = 4

async def host_session(code_q):
    async with websockets.connect(HOST_WS) as ws:
        await ws.send(json.dumps({'type':'host:create','mode':'board-party'}))
        msg = json.loads(await ws.recv())
        code = msg.get('code')
        print(f'[HOST] Raum: {code}')
        for _ in range(BOT_COUNT):
            code_q.put_nowait(code)
        await asyncio.sleep(2)
        games = [
            {'id':'dice','name':'Wuerfel-Wette','icon':'🎲','desc':'','rules':''},
            {'id':'tower-stack','name':'Turm Stapel','icon':'🏗','desc':'','rules':''},
            {'id':'bubble-pop','name':'Blasen-Pop','icon':'🫧','desc':'','rules':''},
        ]
        await ws.send(json.dumps({
            'type':'host:start','code':code,'rounds':2,'order':'join',
            'mode':'board-party','tempo':'normal','hostParticipates':True,'games':games,
        }))
        print('[HOST] start gesendet')
        types = []
        for i in range(100):
            try:
                m = json.loads(await asyncio.wait_for(ws.recv(), timeout=20))
                t = m.get('type')
                types.append(t)
                if t == 'roundIntro':
                    await asyncio.sleep(0.5)
                    await ws.send(json.dumps({'type':'host:beginRound'}))
                elif t == 'board:yourTurn' and m.get('action') == 'roll':
                    await asyncio.sleep(0.3)
                    await ws.send(json.dumps({'type':'board:roll'}))
                elif t == 'board:chooseBranch':
                    await asyncio.sleep(0.2)
                    await ws.send(json.dumps({'type':'board:chooseBranch','choiceIdx':0}))
                elif t == 'board:decision':
                    await asyncio.sleep(0.2)
                    kind = m.get('kind')
                    action = 'buy' if kind == 'buy' else ('duel' if kind == 'rentOrDuel' else 'skip')
                    await ws.send(json.dumps({'type':'board:decision','action':action}))
                elif t in ('minigame:start','duel:start','game:start','start'):
                    await asyncio.sleep(1)
                    await ws.send(json.dumps({'type':'player:finished','score':random.randint(50,150)}))
                elif t in ('standings','roundResults','board:roundEnd','board:end'):
                    await asyncio.sleep(0.5)
                    await ws.send(json.dumps({'type':'host:next'}))
                elif t in ('gameOver','final'):
                    break
            except asyncio.TimeoutError:
                print(f'[HOST] TIMEOUT after {len(types)} msgs', flush=True)
                break
        return types

async def player_bot(code_q, bot_id):
    code = await code_q.get()
    await asyncio.sleep(0.3 * bot_id)
    async with websockets.connect(PLAYER_WS) as ws:
        await ws.send(json.dumps({'type':'player:join','code':code,'name':f'Bot{bot_id}','figure':['🐱','🦊','🐸','🐼'][bot_id]}))
        msg = json.loads(await ws.recv())
        print(f'[BOT{bot_id}] {msg.get("type")}', flush=True)
        types = []
        for i in range(100):
            try:
                m = json.loads(await asyncio.wait_for(ws.recv(), timeout=20))
                t = m.get('type')
                types.append(t)
                if t == 'board:yourTurn' and m.get('action') == 'roll':
                    await asyncio.sleep(0.3)
                    await ws.send(json.dumps({'type':'board:roll'}))
                elif t == 'board:chooseBranch':
                    await asyncio.sleep(0.2)
                    await ws.send(json.dumps({'type':'board:chooseBranch','choiceIdx':0}))
                elif t == 'board:decision':
                    await asyncio.sleep(0.2)
                    kind = m.get('kind')
                    action = 'buy' if kind == 'buy' else ('duel' if kind == 'rentOrDuel' else 'skip')
                    await ws.send(json.dumps({'type':'board:decision','action':action}))
                elif t in ('minigame:start','duel:start','game:start','start'):
                    await asyncio.sleep(1)
                    await ws.send(json.dumps({'type':'player:finished','score':random.randint(50,150)}))
                elif t in ('gameOver','final'):
                    break
            except asyncio.TimeoutError:
                print(f'[BOT{bot_id}] TIMEOUT after {len(types)} msgs', flush=True)
                break
        return types

async def main():
    q = asyncio.Queue()
    tasks = [host_session(q)]
    for i in range(BOT_COUNT):
        tasks.append(player_bot(q, i))
    results = await asyncio.gather(*tasks)
    host_types = results[0]
    bot_results = results[1:]
    
    print('\n=== 4-BOT STRESS TEST ===')
    print(f'HOST: {len(host_types)} msgs')
    for i, bt in enumerate(bot_results):
        print(f'BOT{i}: {len(bt)} msgs')
    
    board = 'board:init' in host_types
    round_ok = any(t in host_types for t in ('roundIntro','minigame:start','duel:start','game:start'))
    all_bots_board = all('board:init' in bt for bt in bot_results)
    passed = board and round_ok and all_bots_board
    print(f'PASS: {passed} (board={board}, round={round_ok}, all_bots_board={all_bots_board})')
    sys.exit(0 if passed else 1)

asyncio.run(main())
