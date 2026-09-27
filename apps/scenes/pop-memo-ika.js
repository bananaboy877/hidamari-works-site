// PoP MeMo! イカスミ: 深海でイカがペンを持ってメモを書く → 光る粒と泡 → 書き終えたメモは泡のように浮かんでいく
import { THREE, defineScene, stage, mesh, group, G, toon, flat, canvasTexture, blobShadow, starShape, heartShape, FONT,
  clamp, lerp, seg, bump, smooth, easeOutBack, easeOutCubic, easeInCubic, easeInOut, rand } from '../engine.js';

defineScene('pop-memo-ika', () => {
  const { scene, camera, root } = stage({ fov: 30, pos: [0, 2.3, 8.6], target: [0, 1.45, 0], light: [2, 7, 6], ambient: 1.25, sun: 1.9 });
  const DUR = 10;
  // 水中っぽい光
  scene.traverse((o) => { if (o.isHemisphereLight) { o.color.setHex(0xd8e6ff); o.groundColor.setHex(0x3a3f66); } });

  const PINK = 0xc4567a, BLUE = 0x4a92c4, PURPLE = 0x9468c4, GREEN = 0x4ead82;
  const GLOW = [0x7cc4ff, 0xf08ab0, 0xc0a0ff, 0x80e8b8, 0xfff0a0];
  const EDGE = 0x0a0d14;
  const TAU = Math.PI * 2;
  const cyc = (t, n, ph = 0) => Math.sin(TAU * n * t / DUR + ph); // ループで継ぎ目なし

  // ---------------------------------------------------------------- 深海ジオラマ（背景・海底）
  const BW = 5.6, BH = 3.9;
  const backTex = canvasTexture(512, 360, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#24406e'); g.addColorStop(0.45, '#15223d'); g.addColorStop(1, '#0D1117');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    // 光の筋
    ctx.globalCompositeOperation = 'lighter';
    for (const [x, sw] of [[110, 50], [250, 80], [400, 44]]) {
      const lg = ctx.createLinearGradient(0, 0, 0, h * 0.8);
      lg.addColorStop(0, 'rgba(120,170,255,0.22)'); lg.addColorStop(1, 'rgba(120,170,255,0)');
      ctx.fillStyle = lg;
      ctx.beginPath(); ctx.moveTo(x - sw / 2, 0); ctx.lineTo(x + sw / 2, 0); ctx.lineTo(x + sw * 1.3 - 40, h * 0.8); ctx.lineTo(x - sw * 0.6 - 40, h * 0.8); ctx.fill();
    }
    // プランクトンの点
    const R = rand(3);
    for (let i = 0; i < 60; i++) { ctx.fillStyle = `rgba(190,215,255,${0.15 + R() * 0.35})`; ctx.beginPath(); ctx.arc(R() * w, R() * h * 0.85, 0.8 + R() * 1.6, 0, 7); ctx.fill(); }
    ctx.globalCompositeOperation = 'source-over';
  });
  const back = group(root, { z: -1.3, y: 1.55 });
  mesh(G.box(BW + 0.24, BH + 0.24, 0.2, 0.12), 0x22304a, { z: -0.08, parent: back });
  mesh(G.plane(BW, BH), new THREE.MeshBasicMaterial({ map: backTex.tex }), { z: 0.025, line: false, parent: back });

  // 海底
  const floorY = -0.05;
  mesh(G.box(BW + 0.24, 0.42, 2.6, 0.16), 0x2b3550, { y: floorY - 0.21, z: -0.05, parent: root });
  mesh(G.box(BW + 0.05, 0.08, 2.4, 0.04), 0x39456a, { y: floorY + 0.02, z: -0.05, parent: root, line: false });
  // 岩
  const rockGeo = G.sphere(0.3, 14, 10);
  for (const [x, z, s, c] of [[-2.35, -0.4, 1.2, 0x3f4b72], [-1.85, 0.3, 0.7, 0x4b5883], [2.3, -0.5, 1.0, 0x3f4b72], [2.55, 0.25, 0.6, 0x4b5883], [1.1, -0.9, 0.55, 0x46527a]]) {
    const m = mesh(rockGeo, c, { x, y: floorY + 0.05, z, parent: root, px: 1.6 });
    m.scale.set(s, s * 0.62, s * 0.85);
  }
  // 海藻（ゆらゆら）
  const weeds = [];
  const weedGeo = G.capsule(0.06, 0.34, 4, 10);
  for (const [x, z, n, col, ph] of [[-2.1, -0.05, 4, GREEN, 0], [-2.55, 0.1, 3, 0x3f9a70, 1.3], [2.05, -0.15, 5, GREEN, 2.1], [2.5, 0.45, 3, 0x3f9a70, 0.6]]) {
    const base = group(root, { x, y: floorY, z });
    let parent = base;
    const segs = [];
    for (let i = 0; i < n; i++) {
      const g = group(parent, { y: i === 0 ? 0 : 0.36 });
      mesh(weedGeo, col, { y: 0.2, parent: g, px: 1.5, s: 1 - i * 0.08 });
      segs.push(g); parent = g;
    }
    weeds.push({ segs, ph });
  }
  // サンゴ
  const coral = group(root, { x: -1.55, y: floorY, z: 0.55 });
  const branch = G.capsule(0.05, 0.26, 4, 10);
  for (const [rx, rz, y, s] of [[0, 0, 0.15, 1], [0.1, 0.55, 0.2, 0.85], [-0.1, -0.5, 0.18, 0.9], [0.4, 0.2, 0.12, 0.7]]) {
    mesh(branch, PINK, { y, rx, rz, s, parent: coral, px: 1.4 });
  }
  const shellG = group(root, { x: 1.45, y: floorY + 0.06, z: 0.6, ry: -0.4 });
  mesh(G.sphere(0.16, 16, 10, ), 0xe6d4c4, { sy: 0.45, parent: shellG, px: 1.4 });

  // ヒトデ
  const starfish = G.extrude(starShape(0.2, 0.09), 0.05, 0.03);
  mesh(starfish, 0xd4a24e, { x: 0.55, y: floorY + 0.06, z: 0.75, rx: -Math.PI / 2, rz: 0.4, parent: root, px: 1.6 });
  mesh(starfish, 0xc4567a, { x: -0.75, y: floorY + 0.06, z: 0.85, rx: -Math.PI / 2, rz: -0.2, s: 0.7, parent: root, px: 1.4 });
  // 泡（ずっと上っていく）
  const bubbleTex = canvasTexture(96, 96, (ctx, w, h) => {
    ctx.fillStyle = 'rgba(140,200,255,0.18)'; ctx.beginPath(); ctx.arc(w / 2, h / 2, 40, 0, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(175,220,255,0.95)'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(w / 2, h / 2, 40, 0, 7); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.95)'; ctx.lineWidth = 7; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(w / 2, h / 2, 27, Math.PI * 1.05, Math.PI * 1.45); ctx.stroke();
  });
  const bubbleMat = new THREE.MeshBasicMaterial({ map: bubbleTex.tex, transparent: true, depthWrite: false });
  const bubbleGeo = G.plane(0.16, 0.16);
  const bubbles = [];
  const BRr = rand(9);
  for (let i = 0; i < 16; i++) {
    const m = mesh(bubbleGeo, bubbleMat, { parent: root, line: false });
    bubbles.push({ m, x: (BRr() - 0.5) * 5.0, z: -1.0 + BRr() * 1.6, ph: BRr(), n: 1 + (i % 3), s: 0.6 + BRr() * 0.9, wob: BRr() * 6 });
  }

  // ---------------------------------------------------------------- 奥に浮かぶメモ
  function smallCardTex(c1, c2, bars) {
    return canvasTexture(256, 200, (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, w, 0); g.addColorStop(0, c1); g.addColorStop(1, c2);
      ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(14, 12, w - 28, 18, 9); ctx.fill();
      ctx.fillStyle = 'rgba(216,222,233,0.8)';
      bars.forEach((b, i) => { ctx.beginPath(); ctx.roundRect(28, 62 + i * 42, b * (w - 56), 18, 9); ctx.fill(); });
    }).tex;
  }
  const floaters = [];
  for (const [x, y, z, rz, c1, c2, bars, ph] of [
    [-1.95, 2.55, -0.85, 0.16, '#4EAD82', '#4A92C4', [0.75, 0.5, 0.62], 0.4],
    [2.0, 2.35, -0.9, -0.14, '#C4567A', '#9468C4', [0.55, 0.8, 0.4], 2.2],
  ]) {
    const g = group(root, { x, y, z, rz });
    mesh(G.box(1.2, 0.95, 0.05, 0.06), 0x161b22, { parent: g, line: { color: 0x3c5a86, px: 1.6 } });
    mesh(G.plane(1.14, 0.89), new THREE.MeshBasicMaterial({ map: smallCardTex(c1, c2, bars), transparent: true }), { z: 0.027, line: false, parent: g });
    floaters.push({ g, x, y, rz, ph });
  }

  // ---------------------------------------------------------------- メインのメモカード
  const CW = 2.55, CH = 1.9;
  const CARD_Y = 1.95;
  const card = group(root, { x: -0.25, y: CARD_Y, z: 0 });
  const cardBody = group(card);
  mesh(G.box(CW, CH, 0.08, 0.1), 0x161b22, { parent: cardBody, line: { color: 0x6aa8e0, px: 2.2 } });
  const glowTex = canvasTexture(128, 128, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(255,255,255,0.45)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  });
  const halo = mesh(G.plane(CW * 1.7, CH * 1.8), new THREE.MeshBasicMaterial({ map: glowTex.tex, color: 0x5a7fd8, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }), { z: -0.12, line: false, parent: cardBody });

  const TW = 680, TH = 506;
  const lines = [
    { text: 'やること', size: 104, x: 36, y: 162, title: true },
    { text: '・ほんをよむ', size: 88, x: 28, y: 300 },
    { text: '・さんぽ', size: 88, x: 28, y: 430 },
  ];
  const caret = [];
  const textTex = canvasTexture(TW, TH, (ctx, w, h, counts = [0, 0, 0]) => {
    // 青→紫のストライプ
    const sg = ctx.createLinearGradient(0, 0, w, 0); sg.addColorStop(0, '#4A92C4'); sg.addColorStop(1, '#9468C4');
    ctx.fillStyle = sg; ctx.beginPath(); ctx.roundRect(18, 14, w - 36, 22, 11); ctx.fill();
    ctx.textBaseline = 'alphabetic'; ctx.lineJoin = 'round';
    lines.forEach((L, i) => {
      ctx.font = `900 ${L.size}px ${FONT}`;
      const xs = [L.x];
      for (let k = 1; k <= L.text.length; k++) xs.push(L.x + ctx.measureText(L.text.slice(0, k)).width);
      caret[i] = xs;
      const s = L.text.slice(0, counts[i]);
      if (!s) return;
      ctx.save();
      ctx.shadowColor = L.title ? 'rgba(160,140,255,0.9)' : 'rgba(110,170,255,0.8)'; ctx.shadowBlur = 22;
      ctx.lineWidth = 10; ctx.strokeStyle = '#0D1117'; ctx.strokeText(s, L.x, L.y);
      ctx.restore();
      if (L.title) {
        const tg = ctx.createLinearGradient(L.x, 0, L.x + 420, 0); tg.addColorStop(0, '#8cc8ff'); tg.addColorStop(1, '#c9a6ff');
        ctx.fillStyle = tg;
      } else ctx.fillStyle = '#D8DEE9';
      ctx.fillText(s, L.x, L.y);
    });
  });
  const FW = CW - 0.12, FH = FW * TH / TW;
  mesh(G.plane(FW, FH), new THREE.MeshBasicMaterial({ map: textTex.tex, transparent: true }), { y: -0.0, z: 0.042, line: false, parent: cardBody });
  const toLocal = (px, py) => [-FW / 2 + px / TW * FW, FH / 2 - py / TH * FH];
  const cursor = mesh(G.box(0.045, 0.3, 0.02, 0.01), flat(0x8cc8ff), { z: 0.06, parent: cardBody, line: false });

  // ---------------------------------------------------------------- イカ
  const squid = group(root);
  const sq = group(squid);           // 体（はね・回転用）
  const BODY = 0xf4dbe8, FIN = 0xe79ab8, EYE_INK = 0x2b2320;
  // 胴（上がとがった弾丸形）
  const mantle = G.lathe([[0, -0.02], [0.2, 0.0], [0.28, 0.1], [0.3, 0.26], [0.27, 0.46], [0.19, 0.64], [0.08, 0.76], [0, 0.79]], 32);
  mesh(mantle, BODY, { parent: sq, px: 2.2 });
  // ひれ（三角）
  const finShape = new THREE.Shape();
  finShape.moveTo(0, 0); finShape.quadraticCurveTo(0.2, 0.02, 0.3, -0.2); finShape.quadraticCurveTo(0.12, -0.2, 0, -0.26); finShape.lineTo(0, 0);
  const finGeo = G.extrude(finShape, 0.04, 0.02);
  mesh(finGeo, FIN, { x: 0.12, y: 0.74, rz: 0.1, parent: sq, px: 1.8 });
  mesh(finGeo, FIN, { x: -0.12, y: 0.74, ry: Math.PI, rz: 0.1, parent: sq, px: 1.8 });
  // 背中の水玉
  const dotGeo = G.sphere(0.035, 10, 8);
  for (const [x, y] of [[0.14, 0.5], [-0.12, 0.58], [0.02, 0.66]]) mesh(dotGeo, FIN, { x, y, z: Math.sqrt(Math.max(0, 0.27 * 0.27 - x * x)) * 0.93, sz: 0.4, parent: sq, line: false });
  // 目
  const eyes = group(sq, { y: 0.2 });
  const eyeWhite = G.sphere(0.085, 18, 14), pupilG = G.sphere(0.055, 14, 10), hlG = G.sphere(0.022, 8, 6);
  const pupils = [], openEyes = [], happyEyes = [];
  const arcGeo = G.torus(0.05, 0.014, 6, 16, Math.PI);
  for (const sx of [-1, 1]) {
    const e = group(eyes, { x: sx * 0.12, z: 0.25 });
    const op = group(e);
    mesh(eyeWhite, 0xffffff, { parent: op, px: 1.6, sz: 0.6 });
    const p = group(op, { z: 0.035 });
    mesh(pupilG, EYE_INK, { parent: p, line: false, sz: 0.5 });
    mesh(hlG, 0xffffff, { x: 0.02, y: 0.022, z: 0.03, parent: p, line: false });
    pupils.push(p); openEyes.push(op);
    const hp = mesh(arcGeo, EYE_INK, { z: 0.05, parent: e, line: false });
    happyEyes.push(hp);
  }
  const cheekGeo = G.sphere(0.045, 12, 8);
  for (const sx of [-1, 1]) mesh(cheekGeo, 0xf08aa8, { x: sx * 0.21, y: 0.12, z: 0.2, sz: 0.35, parent: sq, line: false });
  mesh(G.torus(0.035, 0.011, 6, 14, Math.PI), EYE_INK, { y: 0.1, z: 0.29, rz: Math.PI, parent: sq, line: false });
  // 足（8 本）
  const legGeo = G.capsule(0.05, 0.26, 4, 10);
  const legs = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU + 0.2;
    const pivot = group(sq, { x: Math.cos(a) * 0.17, y: 0.02, z: Math.sin(a) * 0.17, ry: -a });
    const inner = group(pivot);
    mesh(legGeo, BODY, { y: -0.16, parent: inner, px: 1.6 });
    legs.push({ inner, a });
  }
  // ペンを持つ腕 + 光るペン
  const arm = group(sq, { x: -0.25, y: 0.22, z: 0.2, rz: 1.0 });
  mesh(G.capsule(0.048, 0.28, 4, 10), BODY, { y: 0.18, parent: arm, px: 1.6 });
  mesh(G.sphere(0.07, 12, 10), BODY, { y: 0.36, parent: arm, px: 1.5 });
  const pen = group(arm, { y: 0.36, rz: -0.7 });
  mesh(G.cyl(0.052, 0.052, 0.4, 14), 0x7a6ae0, { y: 0.14, parent: pen, px: 1.6 });
  mesh(G.cyl(0.056, 0.056, 0.07, 14), 0xd8deee, { y: -0.06, parent: pen, px: 1.3 });
  mesh(G.cone(0.052, 0.13, 14), 0xf0e6d4, { y: 0.405, parent: pen, px: 1.4 });
  const tip = group(pen, { y: 0.48 });
  mesh(G.sphere(0.03, 10, 8), flat(0xbfe4ff), { parent: tip, line: false });
  const tipGlowMat = new THREE.MeshBasicMaterial({ map: glowTex.tex, color: 0x7cc4ff, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const tipGlow = mesh(G.plane(0.45, 0.45), tipGlowMat, { parent: tip, line: false });
  squid.scale.setScalar(1.15);

  // ペン先のイカ基準座標（イカを動かして、ペン先をカーソルに合わせる）
  root.updateMatrixWorld(true);
  const tipLocal = new THREE.Vector3();
  function tipOffset() { // squid 原点 → ペン先（ワールド・回転なし前提）
    squid.position.set(0, 0, 0); sq.position.set(0, 0, 0); sq.rotation.set(0, 0, 0);
    squid.updateMatrixWorld(true);
    tip.getWorldPosition(tipLocal);
    return tipLocal.clone().sub(root.position);
  }
  const TIP = tipOffset();
  const TIP_Z = 0.62; // カード面からのペン先の浮き
  const SQ_Z = 0.55; // イカは手前

  // ---------------------------------------------------------------- タイムライン
  const events = [];
  let tt = 0.8;
  const CH_DT = 0.22;
  lines.forEach((L, i) => {
    for (let k = 1; k <= L.text.length; k++) { events.push({ t: tt, type: 'char', line: i, k }); tt += CH_DT; }
    tt += 0.12;
    events.push({ t: tt, type: 'enter', line: i, big: i === lines.length - 1 });
    tt += 0.5; // 次の行頭へ泳ぐ
  });
  const charEvents = events.filter(e => e.type === 'char');
  const enterEvents = events.filter(e => e.type === 'enter');
  const T_DONE = enterEvents[enterEvents.length - 1].t;
  const T_UP = T_DONE + 1.0;       // メモが浮かび上がる
  const T_NEW = T_UP + 1.3;        // 新しいメモが現れる

  function countsAt(t) {
    const c = [0, 0, 0];
    if (t >= T_NEW) return c;
    for (const e of charEvents) if (t >= e.t) c[e.line] = Math.max(c[e.line], e.k);
    return c;
  }
  function caretXY(line, k) {
    const L = lines[line]; const xs = caret[line] || [L.x];
    return toLocal(xs[Math.min(k, xs.length - 1)] + 8, L.y - L.size * 0.36);
  }
  // ペン先の目標（カード座標）: 入力位置 → Enter 後は次の行頭へ
  function penTarget(t) {
    if (t >= T_NEW || t < events[0].t - 0.3) return caretXY(0, 0);
    let line = 0, k = 0;
    for (const e of charEvents) if (t >= e.t) { line = e.line; k = e.k; }
    let p = caretXY(line, k);
    for (const e of enterEvents) {
      if (t >= e.t && e.line + 1 < lines.length) {
        const q = caretXY(e.line + 1, 0), a = caretXY(e.line, lines[e.line].text.length);
        const u = seg(t, e.t + 0.08, e.t + 0.45, easeInOut);
        if (t < e.t + 0.5) p = [lerp(a[0], q[0], u), lerp(a[1], q[1], u) + Math.sin(u * Math.PI) * 0.08];
      }
    }
    return p;
  }

  // ---------------------------------------------------------------- 光る粒
  const sparkGeo = G.extrude(starShape(0.12, 0.05), 0.03, 0.01);
  const heartGeo = G.extrude(heartShape(0.09), 0.03, 0.01);
  const diaGeo = new THREE.OctahedronGeometry(0.08);
  const dotPGeo = G.sphere(0.05, 10, 8);
  const pGlowGeo = G.plane(0.34, 0.34);
  const glowMats = GLOW.map(c => new THREE.MeshBasicMaterial({ map: glowTex.tex, color: c, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  const G_N = 5, P_N = 5;
  const pgroups = [];
  const PR = rand(31);
  for (let g = 0; g < G_N; g++) {
    const arr = [];
    for (let j = 0; j < P_N; j++) {
      const ci = (g + j) % GLOW.length;
      const holder = group(cardBody);
      const geo = [sparkGeo, heartGeo, diaGeo, dotPGeo, bubbleGeo][j];
      if (j === 4) mesh(geo, bubbleMat, { parent: holder, s: 1.4, line: false });
      else mesh(geo, flat(GLOW[ci]), { parent: holder, line: false });
      if (j !== 4) mesh(pGlowGeo, glowMats[ci], { parent: holder, line: false, z: -0.02 });
      const a = (j / P_N) * TAU + PR() * 0.8 + g;
      arr.push({ m: holder, j, vx: Math.cos(a) * (0.45 + PR() * 0.3), vy: Math.sin(a) * 0.35 + 0.45 + PR() * 0.25, sp: (PR() - 0.5) * 8 });
    }
    pgroups.push(arr);
  }
  // Enter のリング + 大きめバースト
  const ringMat = new THREE.MeshBasicMaterial({ color: 0x7cc4ff, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const ring = mesh(G.torus(0.3, 0.035, 8, 48), ringMat, { parent: cardBody, line: false });
  const ring2Mat = new THREE.MeshBasicMaterial({ color: 0xc0a0ff, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const ring2 = mesh(G.torus(0.3, 0.025, 8, 48), ring2Mat, { parent: cardBody, line: false });
  const bglowMat = new THREE.MeshBasicMaterial({ map: glowTex.tex, color: 0x6a90ff, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const bglow = mesh(G.plane(1, 1), bglowMat, { parent: cardBody, line: false });
  const burst = [];
  const BR = rand(12);
  for (let j = 0; j < 12; j++) {
    const ci = j % GLOW.length;
    const holder = group(cardBody);
    mesh(j % 2 ? sparkGeo : dotPGeo, flat(GLOW[ci]), { parent: holder, line: false });
    mesh(pGlowGeo, glowMats[ci], { parent: holder, line: false, z: -0.02 });
    const a = (j / 12) * TAU + BR() * 0.3;
    burst.push({ m: holder, vx: Math.cos(a) * (1.0 + BR() * 0.4), vy: Math.sin(a) * (0.8 + BR() * 0.3) + 0.2, sp: (BR() - 0.5) * 10 });
  }
  // 新しいメモ出現の泡リング
  const popB = [];
  for (let j = 0; j < 10; j++) {
    const m = mesh(bubbleGeo, bubbleMat, { parent: root, line: false });
    popB.push({ m, a: (j / 10) * TAU, s: 1 + (j % 3) * 0.5 });
  }

  // ---------------------------------------------------------------- update
  let lastKey = '';
  const tmp = new THREE.Vector3();
  function update(t) {
    const counts = countsAt(t);
    const key = counts.join(',');
    if (key !== lastKey) { textTex.redraw(counts); lastKey = key; }

    // 海藻・泡・奥のメモ
    for (const w of weeds) w.segs.forEach((s, i) => { s.rotation.z = 0.16 * cyc(t, 2, w.ph + i * 0.7); s.rotation.x = 0.05 * cyc(t, 1, w.ph + i); });
    for (const b of bubbles) {
      const u = (b.ph + t * b.n / DUR) % 1;
      b.m.position.set(b.x + Math.sin(u * 12 + b.wob) * 0.08, -0.1 + u * 4.2, b.z);
      b.m.scale.setScalar(Math.max(0.001, b.s * (u < 0.08 ? u / 0.08 : u > 0.9 ? (1 - u) / 0.1 : 1)));
      b.m.quaternion.copy(camera.quaternion);
    }
    for (const f of floaters) { f.g.position.y = f.y + 0.08 * cyc(t, 2, f.ph); f.g.rotation.z = f.rz + 0.05 * cyc(t, 1, f.ph + 1); }

    // メインカード: ぷかぷか → 完成後に浮かび上がる → 新しいメモが現れる
    const bob = 0.05 * cyc(t, 3);
    const up = seg(t, T_UP, T_UP + 1.3, (x) => x * x);
    const appear = seg(t, T_NEW, T_NEW + 0.7, easeOutBack);
    if (t < T_NEW) {
      card.position.set(-0.25 + Math.sin(up * 5) * 0.12, CARD_Y + bob + up * 3.2, up * 0.4);
      card.rotation.set(0, 0, 0.03 * cyc(t, 2) + up * 0.25);
      card.scale.setScalar(1 + bump(t, T_DONE, T_DONE + 0.45) * 0.05 - up * 0.2);
      card.visible = up < 0.999;
    } else {
      card.visible = true;
      card.position.set(-0.25, CARD_Y + bob - (1 - seg(t, T_NEW, T_NEW + 0.7)) * 0.25, 0);
      card.rotation.set(0, 0, 0.03 * cyc(t, 2));
      card.scale.setScalar(Math.max(0.001, appear));
    }
    halo.material.opacity = 0.45 + 0.15 * cyc(t, 5) + bump(t, T_DONE, T_DONE + 0.9) * 0.4;
    // 出現の泡
    const pa = t - T_NEW;
    for (const b of popB) {
      const on = pa > 0 && pa < 1.2;
      b.m.visible = on;
      if (!on) continue;
      const r = 0.4 + easeOutCubic(clamp(pa / 0.9)) * 1.3;
      b.m.position.set(-0.25 + Math.cos(b.a) * r * 1.1, CARD_Y + Math.sin(b.a) * r * 0.8 + pa * 0.5, 0.25);
      b.m.scale.setScalar(Math.max(0.001, b.s * (1 - seg(pa, 0.7, 1.2))));
    }

    // カーソル
    let lastTyped = -9;
    for (const e of events) if (t >= e.t) lastTyped = e.t;
    const [cx, cy] = penTarget(t);
    const typing = t - lastTyped < 0.45;
    cursor.visible = (typing || (t % 0.5) < 0.3) && t < T_DONE + 0.2 || (t > T_NEW + 0.6 && (t % 0.5) < 0.3);
    let ck = 0, cl = 0;
    for (const e of events) {
      if (t < e.t || t >= T_NEW) break;
      if (e.type === 'char') { cl = e.line; ck = e.k; } else if (e.line + 1 < lines.length) { cl = e.line + 1; ck = 0; }
    }
    const [kx, ky] = caretXY(cl, ck);
    cursor.position.set(kx, ky, 0.06);

    // イカ: ペン先がカーソルに来るように泳ぐ
    const writing = t >= events[0].t - 0.3 && t < T_DONE + 0.3;
    const happy = seg(t, T_DONE, T_DONE + 0.2) * (1 - seg(t, T_UP + 1.2, T_UP + 1.5));
    // 完成後はカードから離れて見送る → 新メモの行頭へ戻る
    const leave = seg(t, T_DONE + 0.2, T_DONE + 0.9, easeInOut) * (1 - seg(t, T_NEW + 0.2, T_NEW + 1.4, easeInOut));
    let jig = 0;
    for (const e of charEvents) jig += bump(t, e.t - 0.05, e.t + 0.12);
    const [tx, ty] = [cx + jig * 0.02, cy - jig * 0.03];
    const cardX = -0.25, cardY = CARD_Y + 0.05 * cyc(t, 3);
    let sx = cardX + tx - TIP.x, sy = cardY + ty - TIP.y, sz = TIP_Z - TIP.z;
    // 見送り位置（右下）
    sx = lerp(sx, 1.35, leave); sy = lerp(sy, 0.55, leave); sz = lerp(sz, SQ_Z, leave);
    squid.position.set(sx, sy + 0.03 * cyc(t, 5), sz + (writing ? 0 : 0));
    // 体のしぐさ
    const hop = bump(t, T_DONE + 0.05, T_DONE + 0.75);
    sq.position.y = hop * 0.35;
    sq.rotation.set(0, lerp(0, -0.5, leave), 0.05 * cyc(t, 4) + (t > T_DONE && t < T_DONE + 0.8 ? -seg(t, T_DONE + 0.05, T_DONE + 0.75) * TAU : 0));
    for (const l of legs) {
      const flare = hop * 0.5 + 0.12;
      l.inner.rotation.z = flare + 0.18 * cyc(t, 6, l.a * 2);
    }
    arm.rotation.z = 1.0 + (writing ? 0.04 * Math.sin(jig * 3) : 0) - leave * 0.5 + bump(t, T_UP, T_UP + 1.4) * 0.3 * Math.sin(t * 12);
    for (const p of pupils) { p.position.x = lerp(-0.022, 0.0, leave); p.position.y = lerp(0.03, 0.035, leave); }
    openEyes.forEach((o, i) => { o.visible = happy < 0.5; happyEyes[i].visible = happy >= 0.5; });
    tipGlowMat.opacity = 0.7 + 0.3 * jig;

    // キー入力の光る粒
    for (let g = 0; g < G_N; g++) {
      let ev = null;
      for (let i = g; i < charEvents.length; i += G_N) if (t >= charEvents[i].t) ev = charEvents[i];
      const age = ev ? t - ev.t : 99;
      const on = age < 1.0 && t < T_UP;
      let ex = 0, ey = 0;
      if (ev) [ex, ey] = caretXY(ev.line, ev.k);
      for (const p of pgroups[g]) {
        p.m.visible = on;
        if (!on) continue;
        const a = age;
        let x = ex + p.vx * a, y = ey + p.vy * a - 0.2 * a * a;
        if (p.j === 4) { x = ex + p.vx * 0.3 * a + Math.sin(a * 8) * 0.04; y = ey + 0.1 + a * 0.85; }
        p.m.position.set(x, y, 0.14 + a * 0.2);
        p.m.rotation.z = p.sp * a;
        p.m.scale.setScalar(Math.max(0.001, easeOutBack(clamp(a / 0.2)) * (1 - seg(a, 0.6, 1.0))));
      }
    }
    // Enter
    let en = null;
    for (const e of enterEvents) if (t >= e.t) en = e;
    const ea = en ? t - en.t : 99;
    const big = en && en.big ? 1.4 : 1;
    let bx = 0, by = 0;
    if (en) [bx, by] = caretXY(en.line, lines[en.line].text.length);
    const eon = ea < 1.1 && t < T_UP + 0.2;
    for (const b of burst) {
      b.m.visible = eon;
      if (!eon) continue;
      b.m.position.set(bx + b.vx * ea * big, by + b.vy * ea * big - 0.4 * ea * ea, 0.15);
      b.m.rotation.z = b.sp * ea;
      b.m.scale.setScalar(Math.max(0.001, easeOutBack(clamp(ea / 0.2)) * (1 - seg(ea, 0.7, 1.1)) * (big > 1 ? 1.2 : 1)));
    }
    const rk = easeOutCubic(clamp(ea / 0.8));
    ring.visible = ring2.visible = bglow.visible = ea < 0.85;
    ring.position.set(bx, by, 0.1); ring2.position.set(bx, by, 0.1);
    ring.scale.setScalar(0.3 + rk * 2.4 * big); ring2.scale.setScalar(0.2 + easeOutCubic(clamp((ea - 0.08) / 0.7)) * 1.8 * big);
    ringMat.opacity = 1 - seg(ea, 0.25, 0.85); ring2Mat.opacity = 1 - seg(ea, 0.3, 0.85);
    bglow.position.set(bx, by, 0.09); bglow.scale.setScalar((0.8 + rk * 1.6) * big); bglowMat.opacity = 0.8 * (1 - seg(ea, 0.1, 0.8));
  }

  return { scene, camera, update, duration: DUR };
});
