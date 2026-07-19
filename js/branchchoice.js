/* Etappe 2: Wegwahl-Dialog an Junctions (Verzweigungen).
   Wird von host.js UND player.js beim 'board:branchChoice' Event aufgerufen.
   Server sendet: {
     playerId, tileIdx, options: [
       { id: 'main',  label: 'Hauptweg',  nextIdx: 21, color: '#00f0ff' },
       { id: 'side',  label: 'Side-Path', nextIdx: 160, color: '#ff9e3c' }
     ]
   }
   Spieler wählt → sendet {type:'board:chooseBranch', choice: <id>} an Server. */
(function () {
  'use strict';

  function showBranchChoiceUI(m) {
    if (!m) return;
    /* Server sendet: {choices: [idx, idx], tiles: [tileObj, tileObj], message: "..."}
       Wir normalisieren das zu Anzeige-Options. */
    const choices = Array.isArray(m.choices) ? m.choices : [];
    const tiles = Array.isArray(m.tiles) ? m.tiles : [];
    if (choices.length < 2) return;

    /* Falls Server schon options-Format sendet, nutzen wir das direkt */
    let options;
    if (Array.isArray(m.options) && m.options.length >= 2) {
      options = m.options;
    } else {
      /* Aus choices + tiles options bauen.
         WICHTIG: id = Index in choices-Array (0-basiert), nicht Tile-Index!
         Server erwartet choice_idx als Position in pending['choices']. */
      options = choices.map((tileIdx, i) => {
        const tile = tiles[i] || {};
        const isSide = (tileIdx >= 160);  /* Side-Path Tiles sind idx >= 160 */
        return {
          id: String(i),  /* Index in choices-Array — das ist was der Server will */
          tileIdx: tileIdx,
          label: (tile.name ? tile.name : (isSide ? '🌿 Side-Path' : '🛤️ Hauptweg')),
          nextIdx: tileIdx,
          color: isSide ? '#ff9e3c' : '#00f0ff',
        };
      });
      /* Angepasste Message für den UI-Title */
      m.tileIdx = m.tileIdx || choices[0];
    }
    /* Falls schon ein Dialog offen ist → entfernen */
    const existing = document.getElementById('branch-choice-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'branch-choice-overlay';
    overlay.style.cssText = [
      'position:fixed', 'inset:0', 'z-index:10000',
      'background:rgba(0,0,0,0.72)',
      'display:flex', 'align-items:center', 'justify-content:center',
      'backdrop-filter:blur(4px)',
      'font-family:system-ui,-apple-system,sans-serif',
    ].join(';');

    const card = document.createElement('div');
    card.style.cssText = [
      'background:linear-gradient(160deg,#1a1140,#0c0820)',
      'border:2px solid #ff9e3c',
      'border-radius:16px',
      'padding:28px 32px',
      'max-width:90vw', 'width:420px',
      'box-shadow:0 0 36px rgba(255,158,60,0.45)',
      'color:#fff',
    ].join(';');

    const title = document.createElement('h3');
    title.textContent = '🧭 Verzweigung — wähle deinen Weg';
    title.style.cssText = 'margin:0 0 8px;font-size:1.15rem;text-align:center;color:#ff9e3c';
    card.appendChild(title);

    const subtitle = document.createElement('p');
    subtitle.textContent = `Feld #${m.tileIdx} — zwei Pfade stehen offen`;
    subtitle.style.cssText = 'margin:0 0 20px;text-align:center;opacity:0.8;font-size:0.9rem';
    card.appendChild(subtitle);

    options.forEach(opt => {
      const btn = document.createElement('button');
      btn.textContent = opt.label || opt.id || 'Weg';
      btn.style.cssText = [
        'display:block', 'width:100%', 'margin:10px 0',
        'padding:14px 18px',
        'background:linear-gradient(135deg,' + (opt.color || '#ff9e3c') + ',#2a1a4a)',
        'border:1px solid ' + (opt.color || '#ff9e3c'),
        'border-radius:10px',
        'color:#fff', 'font-size:1rem', 'font-weight:600',
        'cursor:pointer',
        'transition:transform .12s ease, box-shadow .12s ease',
      ].join(';');
      btn.onmouseenter = () => {
        btn.style.transform = 'translateY(-2px)';
        btn.style.boxShadow = '0 6px 18px rgba(0,0,0,0.4)';
      };
      btn.onmouseleave = () => {
        btn.style.transform = '';
        btn.style.boxShadow = '';
      };
      btn.onclick = () => {
        /* Wahl an Server senden — via Net-Global falls vorhanden.
           Net ist als top-level const in net.js definiert; wir versuchen
           mehrere Referenzwege, da window.Net nicht garantiert ist. */
        try {
          const NetRef = (typeof Net !== 'undefined') ? Net : window.Net;
          if (NetRef && NetRef.send) {
            NetRef.send({ type: 'board:chooseBranch', choiceIdx: Number(opt.id), playerId: m.playerId });
          } else {
            console.warn('[branchChoice] Net nicht verfügbar — Wahl nicht gesendet');
          }
        } catch (e) { console.warn('[branchChoice] send failed', e); }
        overlay.remove();
      };
      card.appendChild(btn);
    });

    overlay.appendChild(card);
    document.body.appendChild(overlay);
  }

  /* Global verfügbar machen */
  window.showBranchChoiceUI = showBranchChoiceUI;
})();