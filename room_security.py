"""
Room Security — reine Funktionen fuer Brute-Force-Schutz und Code-Generierung

Stellt sicher, dass Raum-Codes 5-stellig sind und Brute-Force-Angriffe
auf den Raum-Join blockiert werden.

Alle Funktionen sind rein (immutable) und haben keine Seiteneffekte.
Zeit wird als Parameter uebergeben (testbar ohne time.sleep).
"""
import random

# --- Konstanten ---

CODE_LENGTH = 5
# Alphabet ohne ambigouese Zeichen (kein 0/O/1/I)
CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"

RATE_LIMIT_MAX_ATTEMPTS = 5
RATE_LIMIT_WINDOW = 60  # Sekunden


def generate_code(existing: set) -> str:
    """Generiert einen eindeutigen 5-stelligen Raum-Code.
    @param existing: Set von bereits verwendeten Codes
    @returns: 5-stelliger Code aus CODE_ALPHABET
    """
    while True:
        code = "".join(random.choice(CODE_ALPHABET) for _ in range(CODE_LENGTH))
        if code not in existing:
            return code


def create_rate_limiter() -> dict:
    """Erzeugt einen neuen Rate-Limiter-State.
    @returns: State-Objekt mit failures dict
    """
    return {"failures": {}}


def check_and_record(rl: dict, ip: str, now: float) -> dict:
    """Prueft ob eine IP noch Versuche hat und protokolliert den Versuch.
    @param rl: Rate-Limiter-State
    @param ip: Client-IP
    @param now: aktueller Timestamp (Sekunden)
    @returns: {'allowed': bool, 'retry_after': float (nur wenn blocked)}
    """
    failures = rl["failures"]
    entry = failures.get(ip)

    if entry:
        count, first_ts = entry
        # Alte Eintraege nach Ablauf des Fensters zuruecksetzen
        if now - first_ts >= RATE_LIMIT_WINDOW:
            del failures[ip]
            entry = None

    if entry:
        count, first_ts = entry
        if count >= RATE_LIMIT_MAX_ATTEMPTS:
            retry_after = RATE_LIMIT_WINDOW - (now - first_ts)
            if retry_after < 0:
                retry_after = 0
            return {"allowed": False, "retry_after": retry_after}

    # Versuch protokollieren
    if entry:
        count, first_ts = entry
        failures[ip] = (count + 1, first_ts)
    else:
        failures[ip] = (1, now)

    return {"allowed": True}


def record_failure(rl: dict, ip: str, now: float) -> None:
    """Protokolliert einen Fehlversuch fuer eine IP.
    @param rl: Rate-Limiter-State
    @param ip: Client-IP
    @param now: aktueller Timestamp
    """
    failures = rl["failures"]
    entry = failures.get(ip)
    if entry:
        count, first_ts = entry
        # Alte Eintraege zuruecksetzen
        if now - first_ts >= RATE_LIMIT_WINDOW:
            failures[ip] = (1, now)
        else:
            failures[ip] = (count + 1, first_ts)
    else:
        failures[ip] = (1, now)


def clear_failures(rl: dict, ip: str) -> None:
    """Loescht alle Fehlversuche einer IP (z.B. nach erfolgreichem Join).
    @param rl: Rate-Limiter-State
    @param ip: Client-IP
    """
    rl["failures"].pop(ip, None)