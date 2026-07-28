import asyncio, websockets, json, random

HOST_WS = 'ws://localhost:3000/ws'
PLAYER_WS = 'ws://localhost:3000/ws'

async def host_session(code_q):
    async with websockets.connect(HOST_WS) as ws:
        await ws.send(json.dumps({'type':'host:create','mode':'board-party'}))
        msg = json.loads(await ws.recv())
        code = msg.get('code')
        print(f'[HOST] Raum: {code}')
        code_q.put_nowait(code)
        await asyncio.sleep(1.5)
        games = [
            {'id':'dice','name':'Wuerfel-Wette','icon':'🎲','desc':'','rules':''},
            {'id':'tower-stack','name':'Turm Stapel','icon':'🏗','desc':'','rules':''},
            {'id':'bubble-pop','name':'Blasen-Pop','icon':'🫧','desc':'','rules':''},
        ]
        await ws.send(json.dumps({
            'type':'host:start',
            'code':code,
            'rounds':2,
            'order':'join',
            'mode':'board-party',
            'tempo':'normal',
            'hostParticipates':True,
            'games':games,
        }))
        print('[HOST] start gesendet')
        types = []
        for i in range(50):
            try:
                m = json.loads(await asyncio.wait_for(ws.recv(), timeout=10))
                t = m.get('type')
                types.append(t)
                if t == 'roundIntro':
                    await asyncio.sleep(1.5)
                    await ws.send(json.dumps({'type':'host:beginRound'}))
                elif t == 'board:yourTurn' and m.get('action') == 'roll':
                    await asyncio.sleep(1)
                    await ws.send(json.dumps({'type':'board:roll'}))
                elif t == 'board:chooseBranch':
                    await asyncio.sleep(0.5)
                    await ws.send(json.dumps({'type':'board:chooseBranch','choiceIdx':0}))
                elif t == 'board:decision':
                    await asyncio.sleep(0.5)
                    kind = m.get('kind')
                    action = 'buy' if kind == 'buy' else ('duel' if kind == 'rentOrDuel' else 'skip')
                    await ws.send(json.dumps({'type':'board:decision','action':action}))
                elif t in ('minigame:start','duel:start','game:start'):
                    await asyncio.sleep(1.5)
                    await ws.send(json.dumps({'type':'player:finished','score':random.randint(50,150)}))
                elif t in ('standings','roundResults','board:roundEnd','board:end'):
                    await asyncio.sleep(1)
                    await ws.send(json.dumps({'type':'host:next'}))
                elif t in ('gameOver','final'):
                    break
            except asyncio.TimeoutError:
                break
        return types

async def player_bot(code_q):
    code = await code_q.get()
    await asyncio.sleep(0.5)
    async with websockets.connect(PLAYER_WS) as ws:
        await ws.send(json.dumps({'type':'player:join','code':code,'name':'Bot','figure':'🐱'}))
        msg = json.loads(await ws.recv())
        print(f'[PLAYER] {msg.get("type")}')
        types = []
        for i in range(50):
            try:
                m = json.loads(await asyncio.wait_for(ws.recv(), timeout=10))
                t = m.get('type')
                types.append(t)
                if t == 'board:yourTurn' and m.get('action') == 'roll':
                    await asyncio.sleep(0.5)
                    await ws.send(json.dumps({'type':'board:roll'}))
                elif t == 'board:chooseBranch':
                    await asyncio.sleep(0.3)
                    await ws.send(json.dumps({'type':'board:chooseBranch','choiceIdx':0}))
                elif t == 'board:decision':
                    await asyncio.sleep(0.3)
                    kind = m.get('kind')
                    action = 'buy' if kind == 'buy' else ('duel' if kind == 'rentOrDuel' else 'skip')
                    await ws.send(json.dumps({'type':'board:decision','action':action}))
                elif t in ('minigame:start','duel:start','game:start'):
                    await asyncio.sleep(1.5)
                    await ws.send(json.dumps({'type':'player:finished','score':random.randint(50,150)}))
                elif t in ('gameOver','final'):
                    break
            except asyncio.TimeoutError:
                break
        return types

async def main():
    q = asyncio.Queue()
    host_types, player_types = await asyncio.gather(host_session(q), player_bot(q))
    print('\n--- RESULT ---')
    print('HOST types:', host_types)
    print('PLAYER types:', player_types)
    round_started = any(t in host_types for t in ('roundIntro','minigame:start','duel:start','game:start')) and any(t in player_types for t in ('roundIntro','minigame:start','duel:start','game:start'))
    game_started = any(t in host_types for t in ('minigame:start','duel:start','game:start')) or any(t in player_types for t in ('minigame:start','duel:start','game:start'))
    board_started = 'board:init' in host_types or 'board:init' in player_types
    ended = 'gameOver' in host_types or 'final' in host_types or 'gameOver' in player_types or 'final' in player_types
    print('ROUND STARTED:', round_started)
    print('BOARD STARTED:', board_started)
    print('GAME ENDED:', ended)
    print('PASS:', board_started and (round_started or game_started) and not ended)

asyncio.run(main())
