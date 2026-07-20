/* ============================================================
   PARTY ARENA — Netzwerk-Helfer (WebSocket + Auto-Reconnect)
   ============================================================
   Verbesserungen:
   - Automatischer Reconnect mit exponentiellem Backoff
   - Queue puffert Nachrichten während Disconnect
   - onReconnect Callback für Host/Spieler nach Wiederverbindung
   ============================================================ */
const Net = (() => {
  'use strict';
  let ws = null;
  const handlers = {};
  let queue = [];
  let openCb = null;
  let reconnectCb = null;

  /* --- Reconnect-State --- */
  let shouldReconnect = false;
  let reconnectAttempts = 0;
  let reconnectTimer = null;
  const MAX_RECONNECT_DELAY = 10000;  /* 10s cap */
  const BASE_RECONNECT_DELAY = 500;   /* start at 500ms */
  let lastUrl = null;

  function buildUrl() {
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    return `${proto}://${location.host}/ws`;
  }

  function connect(onOpen, onReconnect) {
    openCb = onOpen;
    reconnectCb = onReconnect || null;
    shouldReconnect = true;
    reconnectAttempts = 0;
    lastUrl = buildUrl();
    _open();
  }

  function _open() {
    ws = new WebSocket(lastUrl);

    ws.onopen = () => {
      /* Queue flushen */
      queue.forEach(m => { try { ws.send(m); } catch (_) {} });
      queue = [];
      const wasReconnect = reconnectAttempts > 0;
      reconnectAttempts = 0;
      if (wasReconnect && reconnectCb) {
        reconnectCb();
      } else if (openCb) {
        openCb();
      }
    };

    ws.onmessage = e => {
      let m;
      try { m = JSON.parse(e.data); } catch (_) { return; }
      (handlers[m.type] || []).forEach(fn => fn(m));
    };

    ws.onclose = () => {
      (handlers._close || []).forEach(fn => fn());
      _scheduleReconnect();
    };

    ws.onerror = () => {
      (handlers._error || []).forEach(fn => fn());
      /* onclose wird danach gefeuert, kein double-reconnect */
    };
  }

  function _scheduleReconnect() {
    if (!shouldReconnect) return;
    if (reconnectTimer) clearTimeout(reconnectTimer);
    const delay = Math.min(
      BASE_RECONNECT_DELAY * Math.pow(2, reconnectAttempts),
      MAX_RECONNECT_DELAY
    );
    /* Jitter ±20% um Thundering-herd zu vermeiden */
    const jitter = delay * (0.8 + Math.random() * 0.4);
    reconnectAttempts++;
    console.warn(`[Net] WebSocket getrennt — Reconnect in ${Math.round(jitter)}ms (Versuch ${reconnectAttempts})`);
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      _open();
    }, jitter);
  }

  function disconnect() {
    shouldReconnect = false;
    if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
    if (ws) {
      ws.onclose = null;  /* kein auto-reconnect bei bewusstem disconnect */
      try { ws.close(); } catch (_) {}
      ws = null;
    }
  }

  function on(type, fn) {
    (handlers[type] = handlers[type] || []).push(fn);
  }

  function send(obj) {
    const data = JSON.stringify(obj);
    if (ws && ws.readyState === WebSocket.OPEN) {
      try { ws.send(data); } catch (_) { queue.push(data); }
    } else {
      queue.push(data);
    }
  }

  function isConnected() {
    return ws && ws.readyState === WebSocket.OPEN;
  }

  return { connect, disconnect, on, send, isConnected };
})();