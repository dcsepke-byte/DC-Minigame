import asyncio, websockets, json

async def host_session(code_q):
    async with websockets.connect('ws://localhost:3000/ws') as ws:
        await ws.send(json.dumps({'type':'host:create','mode':'board-party'}))
        msg = json.loads(await ws.recv())
        code = msg.get('code')
        print(f'[HOST] Raum: {code}')
        code_q.put_nowait(code)
        await asyncio.sleep(2)
        games = [
            {'id':'dice','name':'Wuerfel-Wette','icon':'🎲','desc':'','rules':''},
            {'id':'tower-stack','name':'Turm Stapel','icon':'🏗','desc':'','rules':''},
        ]
        await ws.send(json.dumps({
            'type':'host:start',
            'code':code,
            'rounds':1,
            'order':'join',
            'mode':'board-party',
            'tempo':'normal',
            'hostParticipates':True,
            'games':games,
        }))
        print('[HOST] start sent')
        types = []
        for i in range(25):
            try:
                m = json.loads(await asyncio.wait_for(ws.recv(), timeout=8))
                t = m.get('type')
                types.append(t)
                print(f'[HOST {i}] {t}')
                if t in ('gameOver','final'):
                    break
            except asyncio.TimeoutError:
                print(f'[HOST {i}] timeout')
                break
        return types

async def player_bot(code_q):
    code = await code_q.get()
    await asyncio.sleep(0.5)
    async with websockets.connect('ws://localhost:3000/ws') as ws:
        await ws.send(json.dumps({'type':'player:join','code':code,'name':'Bot','figure':'🐱'}))
        msg = json.loads(await ws.recv())
        print(f'[PLAYER] {msg.get("type")}')
        types = []
        for i in range(25):
            try:
                m = json.loads(await asyncio.wait_for(ws.recv(), timeout=8))
                t = m.get('type')
                types.append(t)
                print(f'[PLAYER {i}] {t}')
                if t in ('game:start','minigame:start','duel:start'):
                    await ws.send(json.dumps({'type':'game:ready'}))
                elif t == 'minigame:input':
                    await ws.send(json.dumps({'type':'minigame:result','score':100}))
                elif t in ('gameOver','final'):
                    break
            except asyncio.TimeoutError:
                print(f'[PLAYER {i}] timeout')
                break
        return types

async def main():
    q = asyncio.Queue()
    host_types, player_types = await asyncio.gather(host_session(q), player_bot(q))
    print('\n--- RESULT ---')
    print('HOST types:', host_types)
    print('PLAYER types:', player_types)
    ok = 'roundIntro' in host_types and 'roundIntro' in player_types
    print('ROUND STARTED:', ok)

asyncio.run(main())
