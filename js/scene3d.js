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

  function tilePosition(index, total = 24) {
    const angle = (index / Math.max(1, total)) * Math.PI * 2 - Math.PI / 2;
    return {
      x: Math.cos(angle) * 6.2,
      z: Math.sin(angle) * 4.15,
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
    const body = material(baseColor, { metalness: 0.55, emissiveIntensity: 0.34 });
    const dark = material('#10102f', { metalness: 0.8, emissiveIntensity: 0.06 });

    const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.42, 0.16, 20), dark);
    pedestal.position.y = 0.08;
    group.add(pedestal);

    const bodyMesh = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.72, 20), body);
    bodyMesh.position.y = 0.52;
    group.add(bodyMesh);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 20, 14), body);
    head.position.y = 1.02;
    group.add(head);

    const halo = new THREE.Mesh(
      new THREE.TorusGeometry(0.42, 0.035, 8, 28),
      new THREE.MeshBasicMaterial({ color: color(baseColor), transparent: true, opacity: 0.75 })
    );
    halo.rotation.x = Math.PI / 2;
    halo.position.y = 1.23;
    group.add(halo);
    addGlow(group, baseColor, 0.85, 0.75);

    const pos = tilePosition(Number(player.position) || 0, state.board.tiles.length || 24);
    const offset = (index - (totalAtTile - 1) / 2) * 0.46;
    group.position.set(pos.x + offset * Math.cos(pos.angle + Math.PI / 2), 0.18, pos.z + offset * Math.sin(pos.angle + Math.PI / 2));
    group.rotation.y = -pos.angle;
    group.userData.phase = index * 0.7;
    group.userData.playerId = player.id;
    return group;
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

    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(6.9, 7.25, 0.45, 64),
      material('#101544', { metalness: 0.82, roughness: 0.28, emissive: '#261870', emissiveIntensity: 0.3 })
    );
    base.scale.z = 0.72;
    boardGroup.add(base);

    const baseRing = new THREE.Mesh(
      new THREE.TorusGeometry(5.3, 0.09, 12, 96),
      new THREE.MeshBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.76 })
    );
    baseRing.scale.x = 1.28;
    baseRing.scale.z = 0.84;
    baseRing.rotation.x = Math.PI / 2;
    baseRing.position.y = 0.27;
    boardGroup.add(baseRing);

    const center = new THREE.Mesh(
      new THREE.CylinderGeometry(3.4, 3.9, 0.38, 48),
      material('#1c1251', { metalness: 0.7, emissive: '#7b2ff7', emissiveIntensity: 0.36 })
    );
    center.position.y = 0.28;
    boardGroup.add(center);

    const centerRing = new THREE.Mesh(
      new THREE.TorusGeometry(2.35, 0.08, 12, 64),
      new THREE.MeshBasicMaterial({ color: 0xff3cac, transparent: true, opacity: 0.9 })
    );
    centerRing.rotation.x = Math.PI / 2;
    centerRing.position.y = 0.55;
    boardGroup.add(centerRing);

    const star = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.78, 1),
      material('#ffd34e', { metalness: 0.5, emissive: '#ffd34e', emissiveIntensity: 0.78 })
    );
    star.position.y = 1.25;
    star.userData.spin = 0.7;
    boardGroup.add(star);
    addGlow(star, '#ffd34e', 1.6, 1.5);

    const tiles = state.board.tiles.length ? state.board.tiles : Array.from({ length: 24 }, (_, idx) => ({ idx, type: idx === 0 ? 'start' : idx % 6 === 0 ? 'event' : 'property' }));
    const players = state.board.players || [];
    const totalByTile = {};
    players.forEach(player => {
      const position = Number(player.position) || 0;
      totalByTile[position] = (totalByTile[position] || 0) + 1;
    });

    tiles.forEach((tile, index) => {
      const pos = tilePosition(Number(tile.idx) || index, tiles.length);
      const ownerId = (state.board.owners || {})[String(tile.idx == null ? index : tile.idx)];
      const owner = players.find(player => player.id === ownerId);
      const tileMat = material(tileColor(tile, owner), { metalness: 0.5, emissiveIntensity: owner ? 0.44 : 0.24 });
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(1.12, 0.34, 0.82), tileMat);
      mesh.position.set(pos.x, 0.46, pos.z);
      mesh.rotation.y = -pos.angle;
      mesh.userData.index = tile.idx == null ? index : tile.idx;
      boardGroup.add(mesh);

      const cap = new THREE.Mesh(
        new THREE.BoxGeometry(0.88, 0.035, 0.58),
        new THREE.MeshBasicMaterial({ color: color(tileColor(tile, owner)), transparent: true, opacity: 0.72 })
      );
      cap.position.set(pos.x, 0.65, pos.z);
      cap.rotation.y = -pos.angle;
      boardGroup.add(cap);

      if (tile.type === 'event') {
        const orb = new THREE.Mesh(new THREE.IcosahedronGeometry(0.2, 1), material('#ff4d6d', { emissiveIntensity: 0.75 }));
        orb.position.set(pos.x, 0.95, pos.z);
        orb.userData.orbit = 0.8 + index * 0.05;
        boardGroup.add(orb);
      }
      if (tile.type === 'starshop') {
        const shopStar = new THREE.Mesh(new THREE.OctahedronGeometry(0.22, 1), material('#ffd34e', { emissiveIntensity: 0.85 }));
        shopStar.position.set(pos.x, 0.92, pos.z);
        shopStar.userData.spin = 0.6;
        shopStar.userData.orbit = 0.6 + index * 0.05;
        boardGroup.add(shopStar);
      }
      if (tile.type === 'itemshop') {
        const gift = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.28, 0.28), material('#2bffb9', { emissiveIntensity: 0.7 }));
        gift.position.set(pos.x, 0.92, pos.z);
        gift.userData.spin = 0.4;
        gift.userData.orbit = 0.5 + index * 0.05;
        boardGroup.add(gift);
      }
      if (tile.type === 'lucky') {
        const clover = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.06, 8, 20), material('#7bff7b', { emissiveIntensity: 0.65 }));
        clover.position.set(pos.x, 0.92, pos.z);
        clover.rotation.x = Math.PI / 2;
        clover.userData.spin = 0.3;
        clover.userData.orbit = 0.7 + index * 0.05;
        boardGroup.add(clover);
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
      document.body.classList.add('party3d-fallback');
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
      buildShowcase();
      buildBoard();
      buildArena('reaction');
      state.ready = true;
      activeArenaId = 'reaction';
      syncVisibility();
      document.body.classList.add('party3d-ready');

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
      document.body.classList.add('party3d-fallback');
      console.warn('Party3D konnte nicht initialisiert werden.', error);
    }
  }

  API.init = init;
  API.setBoardState = setBoardState;
  API.showBoard = showBoard;
  API.showMiniGame = showMiniGame;
  API.showShowcase = showShowcase;
  API.setGame = (meta) => showMiniGame(meta && meta.id, meta);
  API.pulse = noop;

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
