/* ============================================================
   PARTY ARENA — WebGL 3D Stage
   Shared Three.js scene for lobby, board mode and mini-game arenas.
   The HTML UI remains interactive on top; WebGL supplies the world.
   ============================================================ */

(() => {
  'use strict';

  const API = {};
  window.Party3D = API;

  const THREE = window.THREE;
  const palette = ['#ff3cac', '#00f0ff', '#2bffb9', '#ffd34e', '#7b2ff7', '#ff6a00', '#3a86ff', '#ff4d6d'];
  const state = {
    mode: 'showcase',
    game: null,
    board: { tiles: [], players: [], owners: {} },
    ready: false,
    reducedMotion: window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  };

  let renderer = null;
  let scene = null;
  let camera = null;
  let clock = null;
  let boardGroup = null;
  let arenaGroup = null;
  let showcaseGroup = null;
  let particles = null;
  let pointer = { x: 0, y: 0 };
  let activeArenaId = '';

  function noop() {}

  function color(value, fallback = '#7b2ff7') {
    return new THREE.Color(value || fallback);
  }

  function material(hex, options = {}) {
    const base = color(hex);
    return new THREE.MeshStandardMaterial({
      color: base,
      roughness: options.roughness == null ? 0.38 : options.roughness,
      metalness: options.metalness == null ? 0.42 : options.metalness,
      emissive: options.emissive || base,
      emissiveIntensity: options.emissiveIntensity == null ? 0.18 : options.emissiveIntensity,
      transparent: !!options.transparent,
      opacity: options.opacity == null ? 1 : options.opacity,
    });
  }

  function addGlow(group, hex, radius = 1.2, intensity = 1.3) {
    const light = new THREE.PointLight(color(hex), intensity, radius * 7, 2);
    light.position.y = radius * 0.8;
    group.add(light);
    return light;
  }

  function clearGroup(group) {
    if (!group) return;
    while (group.children.length) {
      const child = group.children.pop();
      child.traverse(node => {
        if (node.geometry) node.geometry.dispose();
        if (node.material) {
          const materials = Array.isArray(node.material) ? node.material : [node.material];
          materials.forEach(m => m.dispose && m.dispose());
        }
      });
    }
  }

  /* ---------------- Landkarten-Pfad ----------------
     Statt Kreis: ein geschwungener Pfad mit Knotenpunkten, Regionen
     und Höhenvariation — wie eine Mario-Party-Landkarte.
     Der Pfad verläuft in einer organischen Schleife durch 4 Regionen. */
  const MAP_REGIONS = [
    { name: 'Startdorf',  color: '#ffd34e', accent: '#ff6a00' },
    { name: 'Sternwüste', color: '#ff8c42', accent: '#ffd34e' },
    { name: 'Itemwald',   color: '#2bffb9', accent: '#00f0ff' },
    { name: 'Eventberg',  color: '#7b2ff7', accent: '#ff3cac' },
  ];

  function tilePosition(index, total = 24) {
    /* Geschwungener Pfad: Kombination aus Sinus-Kurven und Radius-Variation
       erzeugt eine organische Landkarten-Schleife mit 4 Regionen. */
    const t = index / Math.max(1, total);
    const angle = t * Math.PI * 2 - Math.PI / 2;
    /* Radius variiert — erzeugt "Beulen" die den Pfad interessanter machen */
    const radiusBase = 6.2;
    const radiusVar = Math.sin(t * Math.PI * 4) * 1.2 + Math.cos(t * Math.PI * 6) * 0.5;
    const r = radiusBase + radiusVar;
    /* Höhe variiert leicht — erzeugt Hügel im Pfad */
    const y = Math.sin(t * Math.PI * 3) * 0.3 + Math.cos(t * Math.PI * 5) * 0.15;
    return {
      x: Math.cos(angle) * r,
      z: Math.sin(angle) * (r * 0.72),
      y,
      angle,
    };
  }

  function tileColor(tile, owner) {
    if (owner && owner.color) return owner.color;
    if (tile && tile.type === 'start') return '#ffd34e';
    if (tile && tile.type === 'event') return '#ff4d6d';
    if (tile && tile.type === 'starshop') return '#ffd34e';
    if (tile && tile.type === 'itemshop') return '#2bffb9';
    if (tile && tile.type === 'lucky') return '#7bff7b';
    if (tile && tile.type === 'bonus') return '#2bffb9';
    return '#00f0ff';
  }

  function pawn(player, index, totalAtTile) {
    const group = new THREE.Group();
    const baseColor = player.color || palette[index % palette.length];
    const darkMat = material('#10102f', { metalness: 0.8, emissiveIntensity: 0.06 });

    /* Pedestal — hexagonal disc with glowing rim */
    const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.42, 0.16, 6), darkMat);
    pedestal.position.y = 0.08;
    group.add(pedestal);
    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(0.38, 0.025, 8, 6),
      new THREE.MeshBasicMaterial({ color: color(baseColor), transparent: true, opacity: 0.9 })
    );
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.16;
    group.add(rim);

    /* Glow ring under pawn */
    addGlow(group, baseColor, 0.85, 0.75);

    /* Haupt-Charakter: großes Emoji-Modell als Körper
       Das Emoji entspricht der Figur, die am Anfang ausgewählt wurde.
       Es schwebt über dem Podest und wackelt leicht (idle-Animation). */
    const emoji = String(player.figure || player.char || player.emoji || '★');
    const charSprite = makeTextSprite(emoji, baseColor);
    charSprite.scale.setScalar(0.85);
    charSprite.position.y = 0.85;
    charSprite.userData.bob = index * 0.5;  /* phasenversetzte Schwebeanimation */
    group.add(charSprite);
    group.userData.charSprite = charSprite;

    /* Name-Badge unter dem Emoji — Spielername klar lesbar */
    const nameText = String(player.name || 'Spieler').slice(0, 12);
    const nameSprite = makeLabelSprite(nameText, '#ffffff', 28);
    nameSprite.scale.setScalar(0.55);
    nameSprite.position.y = -0.05;
    group.add(nameSprite);

    const pos = tilePosition(Number(player.position) || 0, state.board.tiles.length || 24);
    const offset = (index - (totalAtTile - 1) / 2) * 0.46;
    group.position.set(pos.x + offset * Math.cos(pos.angle + Math.PI / 2), pos.y + 0.18, pos.z + offset * Math.sin(pos.angle + Math.PI / 2));
    group.rotation.y = -pos.angle;
    group.userData.phase = index * 0.7;
    group.userData.playerId = player.id;
    return group;
  }

  function makeTextSprite(text, hex) {
    const canvas = document.createElement('canvas');
    canvas.width = 128; canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.font = 'bold 90px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = hex || '#fff';
    ctx.shadowColor = 'rgba(0,0,0,0.7)';
    ctx.shadowBlur = 8;
    ctx.fillText(text, 64, 68);
    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
    return new THREE.Sprite(mat);
  }

  /* Label für Feld-Typ — klar verständlich für den Spieler */
  function tileLabel(tile) {
    const t = (tile && tile.type) || 'property';
    const labels = {
      start:    'START',
      event:    'EVENT',
      starshop: 'STERN-LADEN',
      itemshop: 'ITEM-LADEN',
      lucky:    'GLÜCK',
      bonus:    'BONUS',
      property: 'FELD',
    };
    return labels[t] || 'FELD';
  }

  /* Beschreibung was das Feld macht — kurz und klar */
  function tileDescription(tile) {
    const t = (tile && tile.type) || 'property';
    const descs = {
      start:    'Sammle Bonus beim Überqueren',
      event:    'Zufälliges Event wird ausgelöst',
      starshop: 'Kaufe Sterne mit Münzen',
      itemshop: 'Kaufe Items mit Münzen',
      lucky:    'Glücks-Karte: Bonus oder Risiko',
      bonus:    'Sammle Bonus-Münzen',
      property: 'Normales Feld — Punkte sammeln',
    };
    return descs[t] || 'Punkte sammeln';
  }

  /* Größeres Text-Sprite mit mehreren Zeilen für Feld-Beschriftung */
  function makeLabelSprite(text, hex, fontSize) {
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 96;
    const ctx = canvas.getContext('2d');
    ctx.font = `bold ${fontSize || 40}px "Segoe UI", system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = hex || '#fff';
    ctx.shadowColor = 'rgba(0,0,0,0.9)';
    ctx.shadowBlur = 10;
    ctx.fillText(text, 128, 48);
    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
    return new THREE.Sprite(mat);
  }

  function buildBoard() {
    if (!scene) return;
    if (boardGroup) {
      scene.remove(boardGroup);
      clearGroup(boardGroup);
    }
    boardGroup = new THREE.Group();
    boardGroup.position.y = -0.85;
    scene.add(boardGroup);

    /* Landkarten-Basis: große unregelmäßige Plattform statt Scheibe */
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(7.2, 7.6, 0.5, 64),
      material('#1a3a2e', { metalness: 0.3, roughness: 0.8, emissive: '#0a1a14', emissiveIntensity: 0.1 })
    );
    base.scale.set(1.15, 1, 0.95);
    boardGroup.add(base);

    /* Regionen: 4 farbige Zonen auf der Karte */
    MAP_REGIONS.forEach((region, ri) => {
      const rAngle = (ri / 4) * Math.PI * 2 - Math.PI / 2;
      const rPos = { x: Math.cos(rAngle) * 4.5, z: Math.sin(rAngle) * 3.5 };
      const zone = new THREE.Mesh(
        new THREE.CircleGeometry(2.8, 32),
        new THREE.MeshStandardMaterial({
          color: color(region.color), transparent: true, opacity: 0.15,
          emissive: color(region.color), emissiveIntensity: 0.08, roughness: 0.9
        })
      );
      zone.rotation.x = -Math.PI / 2;
      zone.position.set(rPos.x, 0.26, rPos.z);
      boardGroup.add(zone);

      /* Region-Beschriftung */
      const regionLabel = makeLabelSprite(region.name.toUpperCase(), region.color, 32);
      regionLabel.position.set(rPos.x, 0.4, rPos.z);
      regionLabel.scale.setScalar(1.1);
      boardGroup.add(regionLabel);
    });

    /* Zentrale Landmarke — großer Stern in der Mitte */
    const centerStar = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.9, 1),
      material('#ffd34e', { metalness: 0.5, emissive: '#ffd34e', emissiveIntensity: 0.78 })
    );
    centerStar.position.y = 1.4;
    centerStar.userData.spin = 0.5;
    boardGroup.add(centerStar);
    addGlow(centerStar, '#ffd34e', 1.8, 1.5);

    /* Pfad-Verbindungen zwischen Feldern — sichtbare Wege auf der Karte */
    const tiles = state.board.tiles.length ? state.board.tiles : Array.from({ length: 24 }, (_, idx) => ({ idx, type: idx === 0 ? 'start' : idx % 6 === 0 ? 'event' : 'property' }));
    const players = state.board.players || [];
    const totalByTile = {};
    players.forEach(player => {
      const position = Number(player.position) || 0;
      totalByTile[position] = (totalByTile[position] || 0) + 1;
    });

    /* Pfad-Stücke zwischen aufeinanderfolgenden Feldern */
    const pathMat = new THREE.MeshStandardMaterial({ color: 0x8b7355, roughness: 0.85, metalness: 0.05 });
    for (let i = 0; i < tiles.length; i++) {
      const pos1 = tilePosition(Number(tiles[i].idx) || i, tiles.length);
      const pos2 = tilePosition(Number(tiles[(i + 1) % tiles.length].idx) || ((i + 1) % tiles.length), tiles.length);
      /* Pfad als dünnes Band zwischen den Feldern */
      const dx = pos2.x - pos1.x, dz = pos2.z - pos1.z;
      const len = Math.sqrt(dx * dx + dz * dz);
      const midX = (pos1.x + pos2.x) / 2, midZ = (pos1.z + pos2.z) / 2;
      const angle = Math.atan2(dz, dx);
      const path = new THREE.Mesh(new THREE.BoxGeometry(len, 0.08, 0.42), pathMat);
      path.position.set(midX, 0.3, midZ);
      path.rotation.y = -angle;
      boardGroup.add(path);
    }

    tiles.forEach((tile, index) => {
      const pos = tilePosition(Number(tile.idx) || index, tiles.length);
      const tileY = 0.46 + pos.y;
      const ownerId = (state.board.owners || {})[String(tile.idx == null ? index : tile.idx)];
      const owner = players.find(player => player.id === ownerId);
      const tileMat = material(tileColor(tile, owner), { metalness: 0.5, emissiveIntensity: owner ? 0.44 : 0.24 });
      /* Feld — abgerundete Box, flach auf dem Pfad */
      const tileMesh = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.3, 0.8, 2, 1, 2), tileMat);
      tileMesh.position.set(pos.x, tileY, pos.z);
      tileMesh.rotation.y = -pos.angle;
      tileMesh.userData.index = tile.idx == null ? index : tile.idx;
      boardGroup.add(tileMesh);

      /* Cap — farbige Oberfläche zeigt Feld-Typ */
      const cap = new THREE.Mesh(
        new THREE.BoxGeometry(0.85, 0.03, 0.55),
        new THREE.MeshBasicMaterial({ color: color(tileColor(tile, owner)), transparent: true, opacity: 0.8 })
      );
      cap.position.set(pos.x, tileY + 0.18, pos.z);
      cap.rotation.y = -pos.angle;
      boardGroup.add(cap);

      /* Feld-Typ-Label — klar lesbar über dem Feld */
      const label = makeLabelSprite(tileLabel(tile), tileColor(tile, owner), 28);
      label.position.set(pos.x, tileY + 0.95, pos.z);
      label.scale.setScalar(0.7);
      boardGroup.add(label);

      /* Feld-Nummer — klein unten */
      const numSprite = makeTextSprite(String(tile.idx == null ? index : tile.idx), '#ffffff');
      numSprite.position.set(pos.x, tileY + 0.5, pos.z);
      numSprite.scale.setScalar(0.18);
      boardGroup.add(numSprite);

      /* Dekoration nach Typ */
      if (tile.type === 'event') {
        const orb = new THREE.Mesh(new THREE.IcosahedronGeometry(0.18, 1), material('#ff4d6d', { emissiveIntensity: 0.75 }));
        orb.position.set(pos.x, tileY + 0.7, pos.z);
        orb.userData.orbit = 0.8 + index * 0.05;
        boardGroup.add(orb);
      }
      if (tile.type === 'starshop') {
        const shopStar = new THREE.Mesh(new THREE.OctahedronGeometry(0.2, 1), material('#ffd34e', { emissiveIntensity: 0.85 }));
        shopStar.position.set(pos.x, tileY + 0.7, pos.z);
        shopStar.userData.spin = 0.6;
        shopStar.userData.orbit = 0.6 + index * 0.05;
        boardGroup.add(shopStar);
        addGlow(shopStar, '#ffd34e', 0.9, 0.6);
      }
      if (tile.type === 'itemshop') {
        const gift = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.26, 0.26), material('#2bffb9', { emissiveIntensity: 0.7 }));
        gift.position.set(pos.x, tileY + 0.7, pos.z);
        gift.userData.spin = 0.4;
        gift.userData.orbit = 0.5 + index * 0.05;
        boardGroup.add(gift);
        const ribbon = new THREE.Mesh(
          new THREE.BoxGeometry(0.28, 0.04, 0.06),
          new THREE.MeshStandardMaterial({ color: 0xff3cac, emissive: 0xff3cac, emissiveIntensity: 0.6 })
        );
        ribbon.position.set(pos.x, tileY + 0.85, pos.z);
        ribbon.userData.orbit = 0.5 + index * 0.05;
        boardGroup.add(ribbon);
      }
      if (tile.type === 'lucky') {
        const cloverGroup = new THREE.Group();
        const cloverMat = material('#7bff7b', { emissiveIntensity: 0.65 });
        [[0.09, 0.09], [-0.09, 0.09], [0.09, -0.09], [-0.09, -0.09]].forEach(([cx, cz]) => {
          const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), cloverMat);
          leaf.scale.set(1.3, 0.6, 1.3);
          leaf.position.set(pos.x + cx, tileY + 0.7, pos.z + cz);
          cloverGroup.add(leaf);
        });
        cloverGroup.userData.spin = 0.3;
        cloverGroup.userData.orbit = 0.7 + index * 0.05;
        boardGroup.add(cloverGroup);
      }
      if (tile.type === 'start') {
        const pole = new THREE.Mesh(
          new THREE.CylinderGeometry(0.025, 0.025, 0.45, 8),
          new THREE.MeshStandardMaterial({ color: 0x888899, metalness: 0.8 })
        );
        pole.position.set(pos.x, tileY + 0.75, pos.z);
        boardGroup.add(pole);
        const flag = new THREE.Mesh(
          new THREE.BoxGeometry(0.22, 0.13, 0.02),
          material('#ffd34e', { emissiveIntensity: 0.6 })
        );
        flag.position.set(pos.x + 0.12, tileY + 0.9, pos.z);
        flag.userData.orbit = 0.5;
        boardGroup.add(flag);
      }
    });

    players.forEach((player, index) => {
      const position = Number(player.position) || 0;
      const sameIndex = players.slice(0, index).filter(p => (Number(p.position) || 0) === position).length;
      boardGroup.add(pawn(player, sameIndex, totalByTile[position] || 1));
    });

    addGlow(boardGroup, '#7b2ff7', 4, 1.0);
  }

  function themeForGame(id) {
    const key = String(id || '').toLowerCase();
    if (key.includes('bomb')) return { a: '#ff4d6d', b: '#ff6a00', shape: 'danger' };
    if (key.includes('math') || key.includes('number') || key.includes('prime') || key.includes('fraction')) return { a: '#00f0ff', b: '#3a86ff', shape: 'data' };
    if (key.includes('memory') || key.includes('simon') || key.includes('sequence') || key.includes('quiz')) return { a: '#7b2ff7', b: '#ff3cac', shape: 'memory' };
    if (key.includes('target') || key.includes('reflex') || key.includes('reaction') || key.includes('tap')) return { a: '#2bffb9', b: '#00f0ff', shape: 'reflex' };
    if (key.includes('color') || key.includes('stroop') || key.includes('odd')) return { a: '#ff3cac', b: '#ffd34e', shape: 'color' };
    return { a: '#7b2ff7', b: '#00f0ff', shape: 'arena' };
  }

  function arenaShape(group, theme, index) {
    const angle = (index / 12) * Math.PI * 2;
    const radius = 4.2 + (index % 2) * 0.45;
    const holder = new THREE.Group();
    holder.position.set(Math.cos(angle) * radius, 0.8 + (index % 3) * 0.35, Math.sin(angle) * radius);
    holder.userData.phase = index * 0.42;

    let mesh;
    if (theme.shape === 'danger') {
      mesh = new THREE.Mesh(new THREE.ConeGeometry(0.35, 1.15, 6), material(index % 2 ? theme.a : theme.b, { emissiveIntensity: 0.55 }));
    } else if (theme.shape === 'data') {
      mesh = new THREE.Mesh(new THREE.BoxGeometry(0.62, 1.2 + (index % 3) * 0.35, 0.62), material(index % 2 ? theme.a : theme.b, { emissiveIntensity: 0.42 }));
    } else if (theme.shape === 'memory') {
      mesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.5, 1), material(index % 2 ? theme.a : theme.b, { emissiveIntensity: 0.52 }));
    } else if (theme.shape === 'color') {
      mesh = new THREE.Mesh(new THREE.TorusKnotGeometry(0.38, 0.1, 32, 8), material(index % 2 ? theme.a : theme.b, { emissiveIntensity: 0.48 }));
    } else {
      mesh = new THREE.Mesh(new THREE.SphereGeometry(0.45, 20, 14), material(index % 2 ? theme.a : theme.b, { emissiveIntensity: 0.5 }));
    }
    holder.add(mesh);
    holder.add(addGlow(holder, index % 2 ? theme.a : theme.b, 0.75, 0.55));
    group.add(holder);
  }

  function buildArena(gameId) {
    if (!scene) return;
    if (arenaGroup) {
      scene.remove(arenaGroup);
      clearGroup(arenaGroup);
    }
    arenaGroup = new THREE.Group();
    arenaGroup.position.y = -1.1;
    scene.add(arenaGroup);

    const theme = themeForGame(gameId);
    const floor = new THREE.Mesh(
      new THREE.CylinderGeometry(6.65, 7.1, 0.42, 64),
      material('#11163d', { metalness: 0.82, roughness: 0.24, emissive: theme.b, emissiveIntensity: 0.24 })
    );
    arenaGroup.add(floor);

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(5.35, 0.13, 14, 96),
      new THREE.MeshBasicMaterial({ color: color(theme.a), transparent: true, opacity: 0.88 })
    );
    ring.rotation.x = Math.PI / 2;
    arenaGroup.add(ring);

    const inner = new THREE.Mesh(
      new THREE.CylinderGeometry(3.2, 3.55, 0.28, 48),
      material('#181456', { metalness: 0.7, emissive: theme.a, emissiveIntensity: 0.36 })
    );
    inner.position.y = 0.34;
    arenaGroup.add(inner);

    let core;
    if (theme.shape === 'danger') core = new THREE.Mesh(new THREE.IcosahedronGeometry(1.1, 1), material(theme.a, { emissiveIntensity: 0.7 }));
    else if (theme.shape === 'data') core = new THREE.Mesh(new THREE.BoxGeometry(1.35, 1.35, 1.35), material(theme.a, { emissiveIntensity: 0.58 }));
    else if (theme.shape === 'memory') core = new THREE.Mesh(new THREE.OctahedronGeometry(1.15, 1), material(theme.a, { emissiveIntensity: 0.72 }));
    else core = new THREE.Mesh(new THREE.TorusKnotGeometry(0.9, 0.22, 64, 12), material(theme.a, { emissiveIntensity: 0.64 }));
    core.position.y = 1.55;
    core.userData.spin = 0.55;
    arenaGroup.add(core);
    addGlow(core, theme.a, 2.4, 1.4);

    for (let i = 0; i < 12; i += 1) arenaShape(arenaGroup, theme, i);
    addGlow(arenaGroup, theme.b, 4.5, 0.85);
  }

  function buildWorld() {
    /* Sky dome — gradient from deep purple to warm horizon */
    const skyGeo = new THREE.SphereGeometry(48, 32, 24);
    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      uniforms: {
        top: { value: new THREE.Color(0x0a0a2f) },
        mid: { value: new THREE.Color(0x2b1a5e) },
        bot: { value: new THREE.Color(0x6b2a8e) },
      },
      vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'varying vec3 vP; uniform vec3 top; uniform vec3 mid; uniform vec3 bot; void main(){ float h = normalize(vP).y; vec3 c = mix(bot, mid, smoothstep(-0.1, 0.3, h)); c = mix(c, top, smoothstep(0.3, 0.8, h)); gl_FragColor = vec4(c, 1.0); }',
    });
    const sky = new THREE.Mesh(skyGeo, skyMat);
    scene.add(sky);

    /* Ground — large grassy disc */
    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(40, 64),
      new THREE.MeshStandardMaterial({ color: 0x1a4d2e, roughness: 0.9, metalness: 0.05 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -1.4;
    scene.add(ground);

    /* Rolling hills — low-poly cones around the board */
    const hillColors = [0x2d6e3e, 0x3a8a4a, 0x2560b0, 0x4a2a6e];
    for (let i = 0; i < 14; i += 1) {
      const ang = (i / 14) * Math.PI * 2 + (i % 2) * 0.3;
      const dist = 16 + (i % 4) * 3;
      const h = 2.5 + (i % 5) * 1.2;
      const hill = new THREE.Mesh(
        new THREE.ConeGeometry(3 + (i % 3) * 1.5, h, 8),
        new THREE.MeshStandardMaterial({ color: hillColors[i % hillColors.length], roughness: 0.88, flatShading: true })
      );
      hill.position.set(Math.cos(ang) * dist, h / 2 - 1.4, Math.sin(ang) * dist);
      hill.rotation.y = i * 0.7;
      scene.add(hill);
    }

    /* Trees — simple cone + trunk, scattered around */
    for (let i = 0; i < 22; i += 1) {
      const ang = (i / 22) * Math.PI * 2 + Math.random() * 0.4;
      const dist = 11 + Math.random() * 18;
      const tree = new THREE.Group();
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.18, 0.8, 6),
        new THREE.MeshStandardMaterial({ color: 0x5a3a1a, roughness: 0.9 })
      );
      trunk.position.y = -0.9;
      tree.add(trunk);
      const leafColor = [0x2d8a3e, 0x3aa050, 0x226e30][i % 3];
      const leaves = new THREE.Mesh(
        new THREE.ConeGeometry(0.85, 1.6, 7),
        new THREE.MeshStandardMaterial({ color: leafColor, roughness: 0.82, flatShading: true })
      );
      leaves.position.y = -0.1;
      tree.add(leaves);
      tree.position.set(Math.cos(ang) * dist, -1.3, Math.sin(ang) * dist);
      tree.scale.setScalar(0.8 + Math.random() * 0.6);
      scene.add(tree);
    }

    /* Floating clouds — soft spheres drifting above */
    for (let i = 0; i < 10; i += 1) {
      const cloud = new THREE.Group();
      const cloudMat = new THREE.MeshStandardMaterial({ color: 0xe8e0ff, roughness: 0.95, transparent: true, opacity: 0.78, emissive: 0x4a3a6e, emissiveIntensity: 0.08 });
      for (let j = 0; j < 4; j += 1) {
        const puff = new THREE.Mesh(new THREE.SphereGeometry(0.7 + Math.random() * 0.4, 10, 8), cloudMat);
        puff.position.set(j * 0.7 - 1, Math.random() * 0.3, Math.random() * 0.4);
        cloud.add(puff);
      }
      cloud.position.set((Math.random() - 0.5) * 36, 6 + Math.random() * 4, (Math.random() - 0.5) * 30);
      cloud.userData.drift = 0.3 + Math.random() * 0.4;
      cloud.userData.driftX = (Math.random() - 0.5) * 0.2;
      scene.add(cloud);
      if (!state.clouds) state.clouds = [];
      state.clouds.push(cloud);
    }

    /* Stars — twinkling points high in the sky */
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(300 * 3);
    for (let i = 0; i < 300; i += 1) {
      const phi = Math.acos(2 * Math.random() - 1);
      const theta = Math.random() * Math.PI * 2;
      const r = 35;
      starPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPos[i * 3 + 1] = r * Math.cos(phi) * 0.5 + 6;
      starPos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    const starMat = new THREE.PointsMaterial({ color: 0xffeecc, size: 0.12, transparent: true, opacity: 0.85, sizeAttenuation: true });
    state.stars = new THREE.Points(starGeo, starMat);
    scene.add(state.stars);

    /* Central glow light under the board */
    const worldLight = new THREE.PointLight(0x7b2ff7, 1.8, 30, 2);
    worldLight.position.set(0, -1, 0);
    scene.add(worldLight);
  }

  /* ---------------- 3D Dice ---------------- */
  let diceMesh = null;
  let diceState = { rolling: false, value: 1, t: 0 };

  function buildDice() {
    if (!scene || diceMesh) return;
    const diceMat = material('#ffffff', { metalness: 0.2, roughness: 0.35, emissive: 0x111111, emissiveIntensity: 0.1 });
    const pipMat = new THREE.MeshStandardMaterial({ color: 0xff3cac, emissive: 0xff3cac, emissiveIntensity: 0.6 });
    const size = 0.6;
    const dice = new THREE.Group();
    const cube = new THREE.Mesh(new THREE.BoxGeometry(size, size, size), diceMat);
    dice.add(cube);
    /* Pips on each face — arranged like a real die */
    const faces = [
      { n: 1, axis: 'y', sign: 1, pips: [[0, 0]] },
      { n: 6, axis: 'y', sign: -1, pips: [[-0.15, -0.15], [0.15, -0.15], [-0.15, 0], [0.15, 0], [-0.15, 0.15], [0.15, 0.15]] },
      { n: 2, axis: 'x', sign: 1, pips: [[-0.15, -0.15], [0.15, 0.15]] },
      { n: 5, axis: 'x', sign: -1, pips: [[-0.15, -0.15], [0.15, -0.15], [0, 0], [-0.15, 0.15], [0.15, 0.15]] },
      { n: 3, axis: 'z', sign: 1, pips: [[-0.15, -0.15], [0, 0], [0.15, 0.15]] },
      { n: 4, axis: 'z', sign: -1, pips: [[-0.15, -0.15], [0.15, -0.15], [-0.15, 0.15], [0.15, 0.15]] },
    ];
    faces.forEach(face => {
      face.pips.forEach(([px, py]) => {
        const pip = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), pipMat);
        if (face.axis === 'y') { pip.position.set(px, face.sign * size / 2 + face.sign * 0.01, py); }
        else if (face.axis === 'x') { pip.position.set(face.sign * size / 2 + face.sign * 0.01, px, py); }
        else { pip.position.set(px, py, face.sign * size / 2 + face.sign * 0.01); }
        dice.add(pip);
      });
    });
    dice.visible = false;
    scene.add(dice);
    diceMesh = dice;
  }

  function rollDice(value, durationMs = 1400) {
    if (!diceMesh) return;
    buildDice();
    const v = Math.max(1, Math.min(6, Number(value) || 1));
    diceState.rolling = true;
    diceState.value = v;
    diceState.t = 0;
    diceState.duration = durationMs / 1000;
    diceMesh.visible = true;
    diceMesh.position.set(0, 2.5, 0);
    diceMesh.rotation.set(0, 0, 0);
    /* target rotation to land on value v (face 1 up) */
    const faceRot = {
      1: { x: 0, z: 0 },
      2: { x: -Math.PI / 2, z: 0 },
      3: { x: 0, z: Math.PI / 2 },
      4: { x: 0, z: -Math.PI / 2 },
      5: { x: Math.PI / 2, z: 0 },
      6: { x: Math.PI, z: 0 },
    };
    diceState.targetRot = faceRot[v] || faceRot[1];
    diceState.startRot = { x: Math.random() * Math.PI * 4, y: Math.random() * Math.PI * 4, z: Math.random() * Math.PI * 4 };
    return v;
  }

  function animateDice(delta, elapsed) {
    if (!diceMesh || !diceState.rolling) return;
    diceState.t += delta;
    const p = Math.min(1, diceState.t / diceState.duration);
    /* bounce height — parabolic arc */
    const bounce = Math.sin(p * Math.PI) * 1.2;
    diceMesh.position.y = 2.5 + bounce;
    /* spin wildly then settle on target face */
    const ease = 1 - Math.pow(1 - p, 3);
    diceMesh.rotation.x = diceState.startRot.x * (1 - ease) + diceState.targetRot.x * ease;
    diceMesh.rotation.y = diceState.startRot.y * (1 - ease) + 0;
    diceMesh.rotation.z = diceState.startRot.z * (1 - ease) + diceState.targetRot.z * ease;
    if (p >= 1) {
      diceState.rolling = false;
      diceMesh.rotation.x = diceState.targetRot.x;
      diceMesh.rotation.z = diceState.targetRot.z;
      /* hide after a moment */
      setTimeout(() => { if (diceMesh) diceMesh.visible = false; }, 1800);
    }
  }

  function buildShowcase() {
    if (!scene) return;
    if (showcaseGroup) {
      scene.remove(showcaseGroup);
      clearGroup(showcaseGroup);
    }
    showcaseGroup = new THREE.Group();
    showcaseGroup.position.y = -1.35;
    scene.add(showcaseGroup);

    const platform = new THREE.Mesh(
      new THREE.CylinderGeometry(5.2, 6.2, 0.5, 64),
      material('#11163d', { metalness: 0.8, emissive: '#7b2ff7', emissiveIntensity: 0.28 })
    );
    showcaseGroup.add(platform);

    const portal = new THREE.Mesh(
      new THREE.TorusGeometry(2.5, 0.18, 18, 80),
      new THREE.MeshBasicMaterial({ color: 0xff3cac, transparent: true, opacity: 0.9 })
    );
    portal.position.y = 2.2;
    showcaseGroup.add(portal);

    const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(1.1, 1), material('#00f0ff', { emissiveIntensity: 0.75 }));
    crystal.position.y = 2.25;
    crystal.userData.spin = 0.5;
    showcaseGroup.add(crystal);
    addGlow(crystal, '#00f0ff', 2.6, 1.5);

    for (let i = 0; i < 8; i += 1) {
      const angle = (i / 8) * Math.PI * 2;
      const pillar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18, 0.28, 1.8 + (i % 3) * 0.4, 12),
        material(palette[i], { emissiveIntensity: 0.45 })
      );
      pillar.position.set(Math.cos(angle) * 4.3, 0.9, Math.sin(angle) * 3.1);
      showcaseGroup.add(pillar);
    }
  }

  function buildParticles() {
    const count = state.reducedMotion ? 160 : 420;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      positions[i * 3] = (Math.random() - 0.5) * 32;
      positions[i * 3 + 1] = Math.random() * 14 - 2;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 24 - 3;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const pointsMaterial = new THREE.PointsMaterial({ color: 0x9da7ff, size: 0.045, transparent: true, opacity: 0.7, depthWrite: false });
    particles = new THREE.Points(geometry, pointsMaterial);
    scene.add(particles);
  }

  function lookTarget() {
    if (state.mode === 'board') return new THREE.Vector3(0, 0.2, 0);
    if (state.mode === 'game') return new THREE.Vector3(0, 0.25, 0);
    return new THREE.Vector3(0, 0.75, 0);
  }

  function updateCamera() {
    if (!camera) return;
    const board = state.mode === 'board';
    const game = state.mode === 'game';
    const base = board ? { x: 0, y: 10.2, z: 10.6 } : game ? { x: 0, y: 8.2, z: 11.4 } : { x: 0, y: 6.8, z: 12.6 };
    const targetX = base.x + pointer.x * 1.2;
    const targetY = base.y + pointer.y * 0.45;
    camera.position.x += (targetX - camera.position.x) * 0.035;
    camera.position.y += (targetY - camera.position.y) * 0.035;
    camera.position.z += (base.z - camera.position.z) * 0.035;
    camera.lookAt(lookTarget());
  }

  function animate() {
    if (!renderer || !scene) return;
    const elapsed = clock.getElapsedTime();
    const delta = Math.min(0.04, clock.getDelta());
    updateCamera();

    if (particles) particles.rotation.y += delta * 0.008;
    animateDice(delta, elapsed);
    /* World animations: cloud drift + star twinkle */
    if (state.clouds) {
      state.clouds.forEach(c => {
        c.position.x += c.userData.driftX * delta;
        if (c.position.x > 22) c.position.x = -22;
        if (c.position.x < -22) c.position.x = 22;
      });
    }
    if (state.stars) {
      state.stars.material.opacity = 0.6 + Math.sin(elapsed * 1.5) * 0.25;
    }
    if (boardGroup && boardGroup.visible) {
      boardGroup.rotation.y += delta * (state.reducedMotion ? 0.006 : 0.018);
      boardGroup.traverse(node => {
        if (node.userData && node.userData.spin) node.rotation.y += delta * node.userData.spin;
        if (node.userData && node.userData.orbit) node.position.y = 0.95 + Math.sin(elapsed * node.userData.orbit) * 0.12;
        if (node.userData && node.userData.playerId) node.position.y = 0.18 + Math.abs(Math.sin(elapsed * 2.4 + node.userData.phase)) * 0.08;
      });
    }
    if (arenaGroup && arenaGroup.visible) {
      arenaGroup.rotation.y += delta * (state.reducedMotion ? 0.008 : 0.026);
      arenaGroup.traverse(node => {
        if (node.userData && node.userData.spin) node.rotation.y += delta * node.userData.spin;
        if (node.userData && node.userData.phase != null) {
          node.position.y += Math.sin(elapsed * 1.5 + node.userData.phase) * delta * 0.3;
          node.rotation.y += delta * 0.4;
        }
      });
    }
    if (showcaseGroup && showcaseGroup.visible) {
      showcaseGroup.rotation.y += delta * (state.reducedMotion ? 0.006 : 0.018);
      showcaseGroup.traverse(node => {
        if (node.userData && node.userData.spin) node.rotation.y += delta * node.userData.spin;
      });
    }

    renderer.render(scene, camera);
    window.requestAnimationFrame(animate);
  }

  function syncVisibility() {
    if (!boardGroup || !arenaGroup || !showcaseGroup) return;
    boardGroup.visible = state.mode === 'board';
    arenaGroup.visible = state.mode === 'game';
    showcaseGroup.visible = state.mode !== 'board' && state.mode !== 'game';
  }

  function showBoard() {
    state.mode = 'board';
    if (state.ready) {
      buildBoard();
      syncVisibility();
    }
  }

  function showMiniGame(id, meta) {
    const nextId = String(id || (meta && meta.id) || 'reaction');
    state.game = Object.assign({}, state.game || {}, meta || {}, { id: nextId });
    state.mode = 'game';
    if (state.ready && activeArenaId !== nextId) {
      activeArenaId = nextId;
      buildArena(nextId);
    }
    syncVisibility();
  }

  function showShowcase() {
    state.mode = 'showcase';
    if (state.ready) syncVisibility();
  }

  function setBoardState(payload) {
    if (!payload) return;
    state.board = {
      tiles: Array.isArray(payload.tiles) ? payload.tiles : state.board.tiles,
      players: Array.isArray(payload.players) ? payload.players : state.board.players,
      owners: payload.owners || state.board.owners || {},
    };
    if (state.ready) {
      buildBoard();
      if (state.mode !== 'game') state.mode = 'board';
      syncVisibility();
    }
  }

  function syncFromScreen() {
    const active = document.querySelector('.screen.active');
    if (!active) return;
    const screen = active.dataset.screen;
    if (screen === 'board') showBoard();
    else if (screen === 'play' || screen === 'playing' || screen === 'round-intro') {
      if (state.game && state.game.id) showMiniGame(state.game.id, state.game);
      else showMiniGame('reaction', { id: 'reaction' });
    } else showShowcase();
  }

  function init() {
    if (!THREE) {
      console.error('Three.js not loaded — 3D only mode');
      return;
    }
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
      renderer.setSize(window.innerWidth, window.innerHeight);
      if ('outputColorSpace' in renderer) renderer.outputColorSpace = THREE.SRGBColorSpace;
      else if ('outputEncoding' in renderer) renderer.outputEncoding = THREE.sRGBEncoding;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.1;
      renderer.domElement.id = 'party-3d-canvas';
      renderer.domElement.setAttribute('aria-hidden', 'true');
      document.body.appendChild(renderer.domElement);

      scene = new THREE.Scene();
      scene.fog = new THREE.FogExp2(0x08091f, 0.032);
      camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 100);
      camera.position.set(0, 7, 13);
      clock = new THREE.Clock();

      scene.add(new THREE.HemisphereLight(0x9ba6ff, 0x110c32, 1.4));
      const key = new THREE.DirectionalLight(0xffffff, 2.2);
      key.position.set(4, 10, 7);
      scene.add(key);
      const fill = new THREE.PointLight(0xff3cac, 2.2, 20, 2);
      fill.position.set(-7, 4, 4);
      scene.add(fill);
      const rim = new THREE.PointLight(0x00f0ff, 2.4, 20, 2);
      rim.position.set(7, 3, -5);
      scene.add(rim);

      buildParticles();
      buildWorld();
      buildDice();
      buildShowcase();
      buildBoard();
      buildArena('reaction');
      state.ready = true;
      activeArenaId = 'reaction';
      syncVisibility();

      const observer = new MutationObserver(syncFromScreen);
      document.querySelectorAll('.screen').forEach(screen => observer.observe(screen, { attributes: true, attributeFilter: ['class'] }));
      syncFromScreen();
      window.addEventListener('resize', () => {
        if (!renderer || !camera) return;
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
      });
      window.addEventListener('pointermove', event => {
        pointer.x = (event.clientX / Math.max(1, window.innerWidth) - 0.5) * 2;
        pointer.y = (event.clientY / Math.max(1, window.innerHeight) - 0.5) * -2;
      }, { passive: true });
      window.requestAnimationFrame(animate);
    } catch (error) {
      console.error('Party3D init failed:', error);
    }
  }

  API.init = init;
  API.setBoardState = setBoardState;
  API.showBoard = showBoard;
  API.showMiniGame = showMiniGame;
  API.showShowcase = showShowcase;
  API.setGame = (meta) => showMiniGame(meta && meta.id, meta);
  API.rollDice = rollDice;
  API.pulse = noop;

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
