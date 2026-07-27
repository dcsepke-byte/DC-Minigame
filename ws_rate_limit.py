"""
WebSocket Message Rate-Limiting — reine Funktionen

Limitiert die Anzahl Nachrichten pro Client in einem Zeitfenster.
Schuetzt den Server vor Message-Flooding (max 10 Msg/s pro Client).

Alle Funktionen sind rein (immutable) und haben keine Seiteneffekte.
Zeit wird als Parameter uebergeben (testbar ohne time.sleep).
"""

MSG_RATE_MAX = 10        # Max Nachrichten pro Client pro Fenster
MSG_RATE_WINDOW = 1.0    # Zeitfenster in Sekunden


def create_msg_limiter() -> dict:
    """Erzeugt einen neuen Message-Rate-Limiter-State.
    @returns: State mit 'clients' dict: client_id -> [timestamps list]
    """
    return {"clients": {}}


def check_message(rl: dict, client_id: str, now: float) -> dict:
    """Prueft ob ein Client noch eine Nachricht senden darf.
    @param rl: Rate-Limiter-State
    @param client_id: Client-IDentifikator (z.B. IP oder Session-ID)
    @param now: aktueller Timestamp (Sekunden)
    @returns: {'allowed': bool, 'retry_after': float (nur wenn blocked)}
    """
    clients = rl["clients"]
    window_start = now - MSG_RATE_WINDOW

    # Alte Timestamps ausserhalb des Fensters entfernen
    if client_id in clients:
        clients[client_id] = [t for t in clients[client_id] if t > window_start]
    else:
        clients[client_id] = []

    timestamps = clients[client_id]

    # Limit erreicht?
    if len(timestamps) >= MSG_RATE_MAX:
        # aeltester Timestamp + Fenster = wann wieder erlaubt
        oldest = timestamps[0]
        retry_after = (oldest + MSG_RATE_WINDOW) - now
        if retry_after < 0:
            retry_after = 0
        return {"allowed": False, "retry_after": retry_after}

    # Nachricht protokollieren
    timestamps.append(now)
    return {"allowed": True}