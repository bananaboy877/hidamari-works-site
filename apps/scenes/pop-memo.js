// PoP MeMo!: キーボードを打つたびにカーソルからキラキラ → Enter でリング → ＋ボタンで次のメモが跳んでくる
import { THREE, defineScene, stage, mesh, group, G, toon, flat, canvasTexture, blobShadow, starShape, heartShape, FONT,
  clamp, lerp, seg, bump, smooth, easeOutBack, easeOutCubic, easeInCubic, rand } from '../engine.js';

defineScene('pop-memo', () => {
  const { scene, camera, root } = stage({ fov: 30, pos: [0, 3.5, 7.5], target: [0, 1.04, 0.15], light: [3, 8, 6] });
  const DUR = 9;

  const PINK = 0xff6b9d, ORANGE = 0xff8a5c, YELLOW = 0xffc75f, GREEN = 0x65e6a7, BLUE = 0x5bb5f0, PURPLE = 0xb47aea;
  const PAL = [PINK, ORANGE, YELLOW, GREEN, BLUE, PURPLE];
  const CREAM = 0xfff5f0, TXT = '#3D2C2E';
  const BX = 1.5; // ＋ボタンの x

  // ---------------------------------------------------------------- 机
  mesh(G.box(8.4, 0.3, 4.2, 0.12), 0xffd3e2, { y: -0.15, z: 0.4, parent: root });
  mesh(G.box(8.1, 0.06, 3.9, 0.03), CREAM, { y: 0.02, z: 0.4, line: false, parent: root });

  // 奥に置いてある書き終わりのメモ（飾り）
  function miniMemoTex(color, lines) {
    return canvasTexture(256, 220, (ctx, w, h) => {
      ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = color; ctx.fillRect(0, 0, w, 26);
      ctx.fillStyle = 'rgba(61,44,46,0.55)';
      lines.forEach((l, i) => { ctx.beginPath(); ctx.roundRect(28, 60 + i * 46, l * (w - 56), 20, 10); ctx.fill(); });
    }).tex;
  }
  function decoMemo(x, z, ry, color, lines, sticker) {
    const g = group(root, { x, y: 0.07, z, ry });
    mesh(G.box(1.25, 0.05, 1.05, 0.05), 0xffffff, { parent: g, px: 1.6 });
    mesh(G.plane(1.17, 0.97), new THREE.MeshToonMaterial({ map: miniMemoTex(color, lines) }), { rx: -Math.PI / 2, y: 0.027, line: false, parent: g });
    if (sticker) sticker(g);
    return g;
  }
  const heartGeo = G.extrude(heartShape(0.13), 0.05, 0.015);
  const starGeoS = G.extrude(starShape(0.15, 0.07), 0.05, 0.015);
  decoMemo(-2.05, -0.55, 0.35, '#65E6A7', [0.8, 0.55, 0.7], (g) => mesh(starGeoS, YELLOW, { x: 0.42, y: 0.07, z: -0.3, rx: -Math.PI / 2, rz: 0.3, parent: g, px: 1.4 }));
  decoMemo(2.1, -0.6, -0.3, '#5BB5F0', [0.6, 0.85, 0.45], (g) => mesh(heartGeo, PINK, { x: -0.4, y: 0.07, z: -0.28, rx: -Math.PI / 2, rz: -0.2, parent: g, px: 1.4 }));

  // ---------------------------------------------------------------- キーボード（おもちゃ）
  const kb = group(root, { x: -0.55, y: 0.05, z: 1.35, rx: 0.12 });
  mesh(G.box(2.75, 0.2, 1.02, 0.1), 0xffe9a8, { y: 0.1, parent: kb });
  const KP = 0.235, KS = 0.19;
  const keys = [];
  const keyGeo = G.box(KS, 0.1, KS, 0.045);
  const keyCols = [0xffffff, 0xffffff, 0xffffff, 0xffd0e0, 0xffffff, 0xd8f5ff, 0xffffff];
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 9; c++) {
      const m = mesh(keyGeo, keyCols[(r * 9 + c * 5) % keyCols.length], { x: -1.12 + c * KP + (r === 1 ? 0.05 : r === 2 ? 0.1 : 0), y: 0.25, z: -0.3 + r * KP, parent: kb, px: 1.3 });
      m.userData.y0 = 0.25; keys.push(m);
    }
  }
  const space = mesh(G.box(KP * 5, 0.1, KS, 0.045), 0xffffff, { x: -0.18, y: 0.25, z: -0.3 + 3 * KP - 0.02, parent: kb, px: 1.3 });
  space.userData.y0 = 0.25;
  const enterKey = mesh(G.box(0.38, 0.12, KP + KS, 0.05), ORANGE, { x: 1.03, y: 0.26, z: -0.3 + KP * 0.5, parent: kb, px: 1.4 });
  enterKey.userData.y0 = 0.26;
  blobShadow(root, 1.7, { x: -0.55, z: 1.5, sz: 0.45 });

  // ---------------------------------------------------------------- ＋ボタン
  const plusTex = canvasTexture(256, 256, (ctx, w, h) => {
    const gr = ctx.createLinearGradient(0, 0, w, h);
    gr.addColorStop(0, '#FF6B9D'); gr.addColorStop(1, '#FF8A5C');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(w / 2, h / 2, w / 2, 0, 7); ctx.fill();
    ctx.lineCap = 'round'; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 34;
    ctx.beginPath(); ctx.moveTo(w / 2, 62); ctx.lineTo(w / 2, h - 62); ctx.moveTo(62, h / 2); ctx.lineTo(w - 62, h / 2); ctx.stroke();
  });
  const btn = group(root, { x: BX, y: 0.05, z: 1.35 });
  mesh(G.puck(0.4, 0.14, 0.05), 0xffffff, { y: 0.07, parent: btn });
  const btnCap = group(btn, { y: 0.14 });
  mesh(G.puck(0.32, 0.16, 0.07), ORANGE, { y: 0.06, parent: btnCap });
  mesh(G.circle(0.28, 40), new THREE.MeshBasicMaterial({ map: plusTex.tex }), { rx: -Math.PI / 2, y: 0.142, line: false, parent: btnCap });
  blobShadow(btn, 0.55);

  // 扇状に出る 6 色のドット
  const dots = PAL.map((c) => mesh(G.sphere(0.13, 20, 14), c, { parent: root, px: 1.6 }));

  // ---------------------------------------------------------------- メモカード
  const CW = 2.7, CH = 2.05;
  const card = group(root, { x: 0, y: 1.55, z: -0.45 });
  const cardBody = group(card);
  mesh(G.box(CW, CH, 0.08, 0.1), 0xffffff, { parent: cardBody });
  mesh(G.box(CW - 0.08, 0.12, 0.1, 0.04), PINK, { y: CH / 2 - 0.1, parent: cardBody, line: false });
  // 📌
  const pin = group(cardBody, { x: CW / 2 - 0.32, y: CH / 2 - 0.05, z: 0.08, rz: -0.35 });
  mesh(G.sphere(0.13, 20, 14), 0xf0455a, { y: 0.1, parent: pin, px: 1.6 });
  mesh(G.cyl(0.09, 0.05, 0.1, 16), 0xf0455a, { y: -0.0, parent: pin, px: 1.4 });
  mesh(G.cyl(0.015, 0.015, 0.14, 8), 0xb8b8c8, { y: -0.1, parent: pin, px: 1 });

  const TW = 704, TH = 500;
  const lines = [
    { text: 'かいもの', size: 112, x: 34, y: 128, color: '#FF6B9D', title: true },
    { text: '・たまご', size: 90, x: 30, y: 262 },
    { text: '・ぎゅうにゅう', size: 90, x: 30, y: 392 },
  ];
  const caret = []; // 各行の文字ごとの x（canvas px）
  const textTex = canvasTexture(TW, TH, (ctx, w, h, counts = [0, 0, 0]) => {
    ctx.textBaseline = 'alphabetic'; ctx.lineJoin = 'round';
    lines.forEach((L, i) => {
      ctx.font = `900 ${L.size}px ${FONT}`;
      const xs = [L.x];
      for (let k = 1; k <= L.text.length; k++) xs.push(L.x + ctx.measureText(L.text.slice(0, k)).width);
      caret[i] = xs;
      const s = L.text.slice(0, counts[i]);
      if (!s) return;
      if (L.title) {
        ctx.lineWidth = 14; ctx.strokeStyle = TXT; ctx.strokeText(s, L.x, L.y);
        ctx.fillStyle = L.color; ctx.fillText(s, L.x, L.y);
      } else {
        ctx.lineWidth = 10; ctx.strokeStyle = '#ffffff'; ctx.strokeText(s, L.x, L.y);
        ctx.fillStyle = TXT; ctx.fillText(s, L.x, L.y);
      }
    });
  });
  const FW = CW - 0.16, FH = FW * TH / TW;
  const face = mesh(G.plane(FW, FH), new THREE.MeshBasicMaterial({ map: textTex.tex, transparent: true }), { y: -0.08, z: 0.042, line: false, parent: cardBody });
  const toLocal = (px, py) => [-FW / 2 + px / TW * FW, -0.08 + FH / 2 - py / TH * FH];

  // テキストカーソル
  const cursor = mesh(G.box(0.05, 0.3, 0.02, 0.01), PINK, { z: 0.06, parent: cardBody, line: false });
  // シール（完成時にペタッ）
  const sticker = group(cardBody, { x: 1.02, y: 0.5, z: 0.07 });
  mesh(G.extrude(heartShape(0.24), 0.06, 0.02), PINK, { rz: 0.25, parent: sticker, px: 1.6 });
  mesh(G.extrude(starShape(0.13, 0.06), 0.06, 0.015), YELLOW, { x: -0.2, y: -0.3, rz: -0.3, parent: sticker, px: 1.4 });
  const cardShadow = blobShadow(root, 1.3, { x: 0, z: -0.3, sz: 0.4 });

  // ---------------------------------------------------------------- タイムライン
  const events = [];
  let tt = 0.7;
  const CH_DT = 0.2;
  lines.forEach((L, i) => {
    const n = L.text.length;
    for (let k = 1; k <= n; k++) { events.push({ t: tt, type: 'char', line: i, k }); tt += CH_DT; }
    tt += 0.15;
    events.push({ t: tt, type: 'enter', line: i, big: i === lines.length - 1 });
    tt += 0.35;
  });
  const T_DONE = events[events.length - 1].t; // 最後の Enter
  const T_FLY = T_DONE + 0.85, T_BTN = T_FLY + 0.35, T_NEW = T_BTN + 0.75;
  const charEvents = events.filter(e => e.type === 'char');
  const enterEvents = events.filter(e => e.type === 'enter');
  const R0 = rand(11);
  charEvents.forEach(e => { e.key = Math.floor(R0() * 27); });

  function countsAt(t) {
    const c = [0, 0, 0];
    if (t >= T_NEW - 0.05) return c;
    for (const e of charEvents) if (t >= e.t) c[e.line] = Math.max(c[e.line], e.k);
    return c;
  }
  function cursorPos(t, counts) {
    // 現在の行 = 最後の enter の次の行
    let line = 0;
    for (const e of enterEvents) if (t >= e.t && t < T_NEW - 0.05) line = e.line + 1;
    line = Math.min(line, lines.length - 1);
    const done = t >= T_DONE && t < T_NEW - 0.05;
    const L = lines[line];
    const k = done ? L.text.length : counts[line];
    const xs = caret[line] || [L.x];
    const [x, y] = toLocal(xs[Math.min(k, xs.length - 1)] + 8, L.y - L.size * 0.36);
    return [x, y, L.size / 80];
  }

  // ---------------------------------------------------------------- パーティクル
  const G_N = 6, P_N = 7; // 同時に生きるキー入力数 × 1 回の粒数
  const bubbleGeo = G.sphere(0.095, 16, 12);
  const sparkGeo = G.extrude(starShape(0.14, 0.06), 0.035, 0.012);
  const heartP = G.extrude(heartShape(0.1), 0.035, 0.012);
  const diaGeo = new THREE.OctahedronGeometry(0.1);
  const confGeo = G.box(0.08, 0.13, 0.014, 0.005);
  const noteTex = canvasTexture(128, 128, (ctx, w, h) => {
    ctx.font = `900 104px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round'; ctx.lineWidth = 14; ctx.strokeStyle = TXT; ctx.strokeText('♪', w / 2, h / 2 + 4);
    ctx.fillStyle = '#B47AEA'; ctx.fillText('♪', w / 2, h / 2 + 4);
  });
  const noteMat = new THREE.MeshBasicMaterial({ map: noteTex.tex, transparent: true, depthWrite: false });
  const noteGeo = G.plane(0.34, 0.34);
  const pgroups = [];
  const PR = rand(23);
  for (let g = 0; g < G_N; g++) {
    const arr = [];
    for (let j = 0; j < P_N; j++) {
      const type = j;
      const col = PAL[(g * 2 + j) % 6];
      let m;
      if (type === 0 || type === 6) m = mesh(bubbleGeo, 0xe8f7ff, { parent: cardBody, px: 1.2, line: { color: 0x5bb5f0, px: 1.2 } });
      else if (type === 1) m = mesh(sparkGeo, YELLOW, { parent: cardBody, px: 1.2 });
      else if (type === 2) m = mesh(heartP, PINK, { parent: cardBody, px: 1.2 });
      else if (type === 3) m = mesh(diaGeo, col === YELLOW ? BLUE : col, { parent: cardBody, px: 1.2 });
      else if (type === 4) m = mesh(noteGeo, noteMat, { parent: cardBody, line: false });
      else m = mesh(confGeo, col, { parent: cardBody, px: 1 });
      const a = (j / P_N) * Math.PI * 2 + PR() * 0.6;
      arr.push({ m, type, vx: Math.cos(a) * (0.55 + PR() * 0.35), vy: Math.sin(a) * 0.45 + 0.35 + PR() * 0.3, vz: 0.25 + PR() * 0.3, sp: (PR() - 0.5) * 10, wob: PR() * 6 });
    }
    pgroups.push(arr);
  }
  const P_LIFE = 1.0;

  // Enter のバースト + リング
  const burst = [];
  const BR = rand(5);
  for (let j = 0; j < 14; j++) {
    const kind = j % 4;
    const m = kind === 0 ? mesh(sparkGeo, PAL[j % 6], { parent: cardBody, px: 1.2 })
      : kind === 1 ? mesh(heartP, PAL[(j + 1) % 6], { parent: cardBody, px: 1.2 })
      : kind === 2 ? mesh(bubbleGeo, 0xe8f7ff, { parent: cardBody, line: { color: 0x5bb5f0, px: 1.2 } })
      : mesh(confGeo, PAL[(j + 3) % 6], { parent: cardBody, px: 1 });
    const a = (j / 14) * Math.PI * 2 + BR() * 0.3;
    burst.push({ m, vx: Math.cos(a) * (1.1 + BR() * 0.5), vy: Math.sin(a) * (0.9 + BR() * 0.4) + 0.3, vz: 0.3 + BR() * 0.3, sp: (BR() - 0.5) * 12 });
  }
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xffc75f, transparent: true, depthWrite: false });
  const ring = mesh(G.torus(0.3, 0.035, 8, 48), ringMat, { parent: cardBody, line: false });
  const ring2Mat = new THREE.MeshBasicMaterial({ color: 0xff6b9d, transparent: true, depthWrite: false });
  const ring2 = mesh(G.torus(0.3, 0.025, 8, 48), ring2Mat, { parent: cardBody, line: false });
  const glowTex = canvasTexture(128, 128, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    g.addColorStop(0, 'rgba(255,240,180,0.95)'); g.addColorStop(0.4, 'rgba(255,200,120,0.5)'); g.addColorStop(1, 'rgba(255,160,160,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  });
  const glowMat = new THREE.MeshBasicMaterial({ map: glowTex.tex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const glow = mesh(G.plane(1, 1), glowMat, { parent: cardBody, line: false });

  // 新しいメモの紙吹雪（＋ボタンから）
  const conf = [];
  const CR = rand(77);
  for (let j = 0; j < 14; j++) {
    const m = mesh(j % 3 === 0 ? sparkGeo : confGeo, PAL[j % 6], { parent: root, px: 1 });
    conf.push({ m, vx: (CR() - 0.5) * 2.2, vy: 2.2 + CR() * 1.4, vz: (CR() - 0.3) * 1.2, sp: (CR() - 0.5) * 14 });
  }

  // ---------------------------------------------------------------- update
  let lastKey = '';
  function update(t) {
    const counts = countsAt(t);
    const key = counts.join(',');
    if (key !== lastKey) { textTex.redraw(counts); lastKey = key; }

    // カードの出入り
    const fly = seg(t, T_FLY, T_FLY + 0.6, easeInCubic);
    const pop = bump(t, T_FLY - 0.3, T_FLY + 0.05);
    const arrive = seg(t, T_NEW, T_NEW + 0.6, easeOutBack);
    const bob = Math.sin(t / DUR * Math.PI * 2 * 3) * 0.04;
    if (t < T_NEW) {
      card.position.set(lerp(0, -4.2, fly), 1.55 + bob + fly * 0.9, -0.45 - fly * 0.6);
      card.rotation.set(-0.16, fly * 0.6, 0.02 + fly * 0.7 - pop * 0.06);
      card.scale.setScalar(1 + pop * 0.06 - fly * 0.35);
      card.visible = fly < 0.999;
    } else {
      const k = arrive;
      const dotStart = new THREE.Vector3(BX - 0.78, 0.9, 1.35);
      card.visible = true;
      const kp = seg(t, T_NEW, T_NEW + 0.45);
      card.position.set(lerp(dotStart.x, 0, kp), lerp(dotStart.y, 1.55, kp) + bob + bump(t, T_NEW, T_NEW + 0.5) * 0.12, lerp(dotStart.z, -0.45, kp));
      card.rotation.set(-0.16, 0, 0.02 + (1 - k) * 0.25);
      card.scale.setScalar(Math.max(0.001, k));
    }
    cardShadow.scale.setScalar(Math.max(0.001, card.visible ? card.scale.x * (1 - fly) : 0));
    cardShadow.position.x = card.position.x;

    // カーソル
    const [cx, cy, cs] = cursorPos(t, counts);
    let lastTyped = -9;
    for (const e of events) if (t >= e.t) lastTyped = e.t;
    const typing = t - lastTyped < 0.5;
    cursor.visible = (typing || (t % 0.5) < 0.3) && t < T_FLY - 0.3 || (t > T_NEW + 0.5 && (t % 0.5) < 0.3);
    cursor.position.set(cx, cy, 0.06);
    cursor.scale.set(1, cs, 1);

    // キーの沈み込み
    for (const k of keys) k.position.y = k.userData.y0;
    space.position.y = space.userData.y0; enterKey.position.y = enterKey.userData.y0;
    for (const e of charEvents) { const d = bump(t, e.t - 0.06, e.t + 0.1); if (d > 0) { keys[e.key].position.y -= d * 0.08; } }
    for (const e of enterEvents) { const d = bump(t, e.t - 0.08, e.t + 0.16); if (d > 0) enterKey.position.y -= d * 0.07; }

    // キー入力パーティクル
    for (let g = 0; g < G_N; g++) {
      let ev = null;
      for (let i = g; i < charEvents.length; i += G_N) if (t >= charEvents[i].t) ev = charEvents[i];
      const age = ev ? t - ev.t : 99;
      const on = age < P_LIFE && t < T_FLY;
      const idx = ev ? charEvents.indexOf(ev) : 0;
      let ex = 0, ey = 0;
      if (ev) { const L = lines[ev.line]; const xs = caret[ev.line] || [L.x]; [ex, ey] = toLocal(xs[Math.min(ev.k, xs.length - 1)] + 8, L.y - L.size * 0.36); }
      for (const p of pgroups[g]) {
        p.m.visible = on;
        if (!on) continue;
        const a = age;
        const flip = idx % 2 ? -1 : 1;
        let x, y, z = 0.12 + p.vz * a;
        if (p.type === 0 || p.type === 6) { // 泡: ふわっと上へ
          x = ex + p.vx * 0.35 * a * flip + Math.sin(a * 7 + p.wob) * 0.05; y = ey + 0.1 + a * 0.9;
        } else if (p.type === 5) { // 紙吹雪: 落ちる
          x = ex + p.vx * a * flip; y = ey + p.vy * 1.6 * a - 1.6 * a * a;
        } else if (p.type === 4) { // 音符
          x = ex + p.vx * 0.5 * a * flip; y = ey + 0.15 + a * 0.75;
        } else {
          x = ex + p.vx * a * flip; y = ey + p.vy * a - 0.3 * a * a;
        }
        p.m.position.set(x, y, z);
        p.m.rotation.set(p.type === 3 ? a * 3 : 0, p.type === 3 ? a * 4 : 0, p.type === 1 ? p.sp * a : p.type === 5 ? p.sp * a : Math.sin(a * 5) * 0.3);
        const s = easeOutBack(clamp(a / 0.18)) * (1 - seg(a, 0.6, P_LIFE));
        p.m.scale.setScalar(Math.max(0.001, s * (p.type === 6 ? 0.7 : 1)));
      }
    }

    // Enter バースト
    let en = null;
    for (const e of enterEvents) if (t >= e.t) en = e;
    const ea = en ? t - en.t : 99;
    const big = en && en.big ? 1.45 : 1;
    const eon = ea < 1.1;
    let bx = 0, by = 0;
    if (en) { const L = lines[en.line]; const xs = caret[en.line] || [L.x]; [bx, by] = toLocal(xs[xs.length - 1] + 8, L.y - L.size * 0.36); }
    for (const b of burst) {
      b.m.visible = eon;
      if (!eon) continue;
      b.m.position.set(bx + b.vx * ea * big, by + b.vy * ea * big - 0.9 * ea * ea, 0.15 + b.vz * ea);
      b.m.rotation.set(b.sp * ea * 0.4, b.sp * ea * 0.3, b.sp * ea);
      b.m.scale.setScalar(Math.max(0.001, easeOutBack(clamp(ea / 0.2)) * (1 - seg(ea, 0.7, 1.1)) * (big > 1 ? 1.25 : 1)));
    }
    const rk = easeOutCubic(clamp(ea / 0.75));
    ring.visible = ring2.visible = glow.visible = ea < 0.8;
    ring.position.set(bx, by, 0.1); ring2.position.set(bx, by, 0.1);
    ring.scale.setScalar(0.3 + rk * 2.6 * big); ring2.scale.setScalar(0.2 + easeOutCubic(clamp((ea - 0.08) / 0.7)) * 1.9 * big);
    ringMat.opacity = 1 - seg(ea, 0.25, 0.8); ring2Mat.opacity = 1 - seg(ea, 0.3, 0.8);
    glow.position.set(bx, by, 0.09); glow.scale.setScalar((0.6 + rk * 1.4) * big); glowMat.opacity = 0.9 * (1 - seg(ea, 0.1, 0.7));

    // シール
    const st = seg(t, T_DONE + 0.25, T_DONE + 0.6, easeOutBack);
    sticker.visible = st > 0.001 && t < T_NEW;
    sticker.scale.setScalar(Math.max(0.001, st));

    // ＋ボタン: 押す → 6 色のドットが扇状に → ピンクがカードに
    btnCap.position.y = 0.14 - bump(t, T_BTN - 0.1, T_BTN + 0.15) * 0.07;
    btn.scale.setScalar(1 + bump(t, T_BTN + 0.05, T_BTN + 0.4) * 0.12);
    const fan = seg(t, T_BTN, T_BTN + 0.45, easeOutBack);
    const back = seg(t, T_NEW + 0.1, T_NEW + 0.6);
    dots.forEach((d, i) => {
      const ang = Math.PI * (0.9 - 0.52 * (i / 5));
      const R = 0.78 * fan;
      let x = BX + Math.cos(ang) * R, y = 0.45 + Math.sin(ang) * R * 1.05, z = 1.35;
      let s = fan * (1 - back);
      if (i === 0) { // ピンク: 選ばれて少しふくらむ → カードへ
        s = fan * (1 + 0.5 * bump(t, T_NEW - 0.35, T_NEW + 0.05)) * (1 - seg(t, T_NEW, T_NEW + 0.12));
      } else {
        x = lerp(x, BX, back); y = lerp(y, 0.45, back);
      }
      d.position.set(x, y, z);
      d.visible = s > 0.001;
      d.scale.setScalar(Math.max(0.001, s));
    });
    const ca = t - T_BTN;
    const con = ca > 0 && ca < 1.4;
    for (const c of conf) {
      c.m.visible = con;
      if (!con) continue;
      c.m.position.set(BX + c.vx * ca, 0.4 + c.vy * ca - 3.2 * ca * ca, 1.35 + c.vz * ca);
      c.m.rotation.set(c.sp * ca, c.sp * 0.6 * ca, 0.4);
      c.m.scale.setScalar(Math.max(0.001, clamp(ca / 0.1) * (1 - seg(ca, 1.0, 1.4))));
    }
  }

  return { scene, camera, update, duration: DUR };
});
