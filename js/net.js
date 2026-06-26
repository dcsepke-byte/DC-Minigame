/* ============================================================
   PARTY ARENA — Netzwerk-Helfer (WebSocket)
   ============================================================ */
const Net = (() => {
  'use strict';
  let ws = null;
  const handlers = {};
  let queue = [];
  let openCb = null;

  function connect(onOpen) {
    openCb = onOpen;
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    ws = new WebSocket(`${proto}://${location.host}/ws`);
    ws.onopen = () => {
      queue.forEach(m => ws.send(m));
      queue = [];
      if (openCb) openCb();
    };
    ws.onmessage = e => {
      let m;
      try { m = JSON.parse(e.data); } catch (_) { return; }
      (handlers[m.type] || []).forEach(fn => fn(m));
    };
    ws.onclose = () => (handlers._close || []).forEach(fn => fn());
    ws.onerror = () => (handlers._error || []).forEach(fn => fn());
  }

  function on(type, fn) {
    (handlers[type] = handlers[type] || []).push(fn);
  }

  function send(obj) {
    const data = JSON.stringify(obj);
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(data);
    else queue.push(data);
  }

  return { connect, on, send };
})();
