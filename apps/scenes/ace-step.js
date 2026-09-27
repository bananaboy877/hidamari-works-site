// ACE-Step プロンプト作成: タグのチップを選ぶ → プロンプト欄に飛んで並ぶ → コピー → ラジオから音楽
import { THREE, defineScene, stage, mesh, group, G, toon, flat, canvasTexture, blobShadow, starShape, roundRectShape, FONT,
  clamp, lerp, seg, bump, smooth, easeOutBack, easeOutCubic, easeInOut, rand } from '../engine.js';

defineScene('ace-step', () => {
  const { scene, camera, root } = stage({ fov: 30, pos: [-0.1, 4.15, 8.8], target: [-0.1, 1.08, 0], light: [3, 8, 5] });
  const DUR = 10;
  const TAU = Math.PI * 2;

  const BG = 0x1a1714, CARD = 0x2a2621, CHIP = 0x332e28, CREAM = '#ede7dd';
  const ORANGE = 0xd97746, BLUE = 0x7ca2e0, PINK = 0xd98fa3, PURPLE = 0xa78bfa, YELLOW = 0xd4b94e;

  // チップのアイコン（絵文字の代わりに手描き）
  function drawIcon(ctx, kind, x, y) {
    ctx.save(); ctx.translate(x, y);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.strokeStyle = '#1a1714'; ctx.lineWidth = 7;
    if (kind === 'guitar') {
      ctx.rotate(-0.7);
      ctx.fillStyle = '#6b3a1f'; ctx.fillRect(-7, -52, 14, 50); ctx.strokeRect(-7, -52, 14, 50);
      ctx.fillStyle = '#ffe2a8';
      ctx.beginPath(); ctx.arc(0, 8, 22, 0, 7); ctx.arc(0, 30, 27, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.arc(0, 8, 22, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 30, 27, -0.25, Math.PI + 0.25); ctx.stroke();
      ctx.fillStyle = '#1a1714'; ctx.beginPath(); ctx.arc(0, 20, 8, 0, 7); ctx.fill();
      ctx.fillRect(-12, -62, 24, 14);
    } else if (kind === 'piano') {
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.roundRect(-40, -30, 80, 60, 8); ctx.fill(); ctx.stroke();
      ctx.lineWidth = 4; for (const kx of [-13, 13]) { ctx.beginPath(); ctx.moveTo(kx, -30); ctx.lineTo(kx, 30); ctx.stroke(); }
      ctx.fillStyle = '#1a1714'; for (const kx of [-20, 6, 20]) ctx.fillRect(kx - 5, -30, 10, 34);
      ctx.fillRect(-7 - 1, -30, 10, 34);
    } else if (kind === 'smile') {
      ctx.fillStyle = '#ffe07a'; ctx.beginPath(); ctx.arc(0, 0, 38, 0, 7); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#1a1714';
      ctx.beginPath(); ctx.arc(-13, -8, 6, 0, 7); ctx.arc(13, -8, 6, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.arc(0, 4, 18, 0.2, Math.PI - 0.2); ctx.stroke();
    } else if (kind === 'clock') {
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(0, 4, 36, 0, 7); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#1a1714'; ctx.fillRect(-9, -44, 18, 10);
      ctx.beginPath(); ctx.moveTo(0, 4); ctx.lineTo(0, -20); ctx.moveTo(0, 4); ctx.lineTo(16, 12); ctx.stroke();
    }
    ctx.restore();
  }

  // ---------------------------------------------------------------- 台
  mesh(G.box(5.3, 0.26, 3.2, 0.12), 0x4a3f35, { y: -0.13, z: 0.1, parent: root });
  mesh(G.box(5.1, 0.05, 3.0, 0.03), 0x2e2823, { y: 0.01, z: 0.1, parent: root, line: false });
  blobShadow(root, 3.0, { y: -0.27, sz: 0.75 });

  // ---------------------------------------------------------------- チップ
  const CHIPS = [
    { icon: 'guitar', text: 'ロック', col: '#d97746' },
    { icon: 'piano', text: 'ピアノ', col: '#7ca2e0' },
    { icon: 'smile', text: 'たのしい', col: '#d98fa3' },
    { icon: 'clock', text: 'はやい', col: '#a78bfa' },
  ];
  const CWID = 1.48, CDEP = 0.6, CH_H = 0.15;
  function chipTex(c, selected) {
    return canvasTexture(488, 200, (ctx, w, h) => {
      ctx.fillStyle = selected ? '#3d2a1f' : '#332e28';
      ctx.beginPath(); ctx.roundRect(6, 6, w - 12, h - 12, 90); ctx.fill();
      ctx.lineWidth = selected ? 14 : 6; ctx.strokeStyle = selected ? '#d97746' : '#5a4f44';
      ctx.beginPath(); ctx.roundRect(10, 10, w - 20, h - 20, 86); ctx.stroke();
      // カテゴリ色の丸 + アイコン
      ctx.fillStyle = c.col; ctx.beginPath(); ctx.arc(100, h / 2, 64, 0, 7); ctx.fill();
      drawIcon(ctx, c.icon, 100, h / 2);
      ctx.font = `900 ${c.text.length > 3 ? 74 : 86}px ${FONT}`; ctx.textAlign = 'left';
      ctx.lineJoin = 'round'; ctx.lineWidth = 10; ctx.strokeStyle = '#1a1714';
      ctx.strokeText(c.text, 180, h / 2 + 6);
      ctx.fillStyle = selected ? '#ff9a5e' : CREAM; ctx.fillText(c.text, 180, h / 2 + 6);
    }).tex;
  }
  const chipGeo = G.box(CWID, CH_H, CDEP, 0.12);
  const labelGeo = G.plane(CWID - 0.02, CDEP - 0.02);
  function makeChip(parent, c) {
    const g = group(parent);
    const body = mesh(chipGeo, CHIP, { y: CH_H / 2, parent: g, px: 1.8 });
    const mat = new THREE.MeshBasicMaterial({ map: c.texN, transparent: true });
    mesh(labelGeo, mat, { rx: -Math.PI / 2, y: CH_H + 0.004, parent: g, line: false });
    return { g, mat };
  }
  CHIPS.forEach(c => { c.texN = chipTex(c, false); c.texS = chipTex(c, true); });

  // 斜めのコンソール（くさび形）
  const SLOPE = 0.52;
  const CX = -0.95, CZ = 0.72;
  const wedge = new THREE.Shape();
  const WD = 1.75, h0 = 0.18, h1 = h0 + WD * Math.tan(SLOPE);
  wedge.moveTo(-WD / 2, 0); wedge.lineTo(WD / 2, 0); wedge.lineTo(WD / 2, h1); wedge.lineTo(-WD / 2, h0); wedge.closePath();
  const wedgeGeo = G.extrude(wedge, 3.3, 0.04);
  mesh(wedgeGeo, CARD, { x: CX, y: 0.03, z: CZ, ry: Math.PI / 2, parent: root });
  // 斜面上の座標系
  const slope = group(root, { x: CX, y: 0.03 + (h0 + h1) / 2 + 0.04, z: CZ, rx: SLOPE });
  const chips = [];
  const slots = [[-0.8, -0.4], [0.8, -0.4], [-0.8, 0.4], [0.8, 0.4]];
  CHIPS.forEach((c, i) => {
    const ch = makeChip(slope, c);
    ch.g.position.set(slots[i][0], 0, slots[i][1] * 1.0);
    chips.push(ch);
  });

  // ---------------------------------------------------------------- プロンプト欄
  const BAR_W = 3.45, BAR_H = 1.12;
  const bar = group(root, { x: -0.5, y: 2.2, z: -0.95, rx: -0.22 });
  mesh(G.box(BAR_W, BAR_H, 0.16, 0.14), CARD, { parent: bar, line: { color: 0x120f0d, px: 2.2 } });
  mesh(G.box(BAR_W - 0.1, BAR_H - 0.12, 0.05, 0.1), BG, { z: 0.07, parent: bar, line: false });
  // 支柱
  for (const sx of [-1, 1]) mesh(G.cyl(0.05, 0.05, 1.9, 12), 0x5a4d40, { x: sx * (BAR_W / 2 - 0.35), y: -1.2, z: -0.05, parent: bar, px: 1.5 });
  // タブ「プロンプト」
  const tabTex = canvasTexture(360, 96, (ctx, w, h) => {
    ctx.fillStyle = '#d97746'; ctx.beginPath(); ctx.roundRect(0, 0, w, h + 40, 34); ctx.fill();
    ctx.font = `900 60px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#1a1714'; ctx.fillText('プロンプト', w / 2, h / 2 + 6);
  });
  mesh(G.plane(1.2, 0.32), new THREE.MeshBasicMaterial({ map: tabTex.tex, transparent: true }), { x: -BAR_W / 2 + 0.75, y: BAR_H / 2 + 0.14, z: 0.0, parent: bar, line: false });
  // 欄の文字（チップが着くと言葉になる）
  const WORDS = [['ロック', 0], ['ピアノ', 0], ['たのしい', 1], ['はやい', 1]];
  const PTW = 690, PTH = 220, PFS = 84;
  const wordPos = [];
  const promptTex = canvasTexture(PTW, PTH, (ctx, w, h, n = 0, flash = 0) => {
    ctx.font = `900 ${PFS}px ${FONT}`; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
    const xs = [34, 34];
    WORDS.forEach(([wd, ln], i) => {
      const txt = wd + (i < WORDS.length - 1 ? ',' : '');
      const y = ln ? 162 : 64;
      const wW = ctx.measureText(wd).width;
      wordPos[i] = [xs[ln] + wW / 2, y, xs[ln]];
      if (i < n) {
        ctx.fillStyle = flash > 0.5 ? '#ff9a5e' : '#ede7dd';
        ctx.fillText(txt, xs[ln], y + 4);
      }
      xs[ln] += ctx.measureText(txt + ' ').width;
    });
    if (n < WORDS.length) { // 入力カーソル
      const ln = WORDS[n][1], cx = n > 0 && WORDS[n - 1][1] === ln ? wordPos[n][2] - 4 : 34;
      ctx.fillStyle = '#d97746'; ctx.fillRect(cx - 6, (ln ? 162 : 64) - 38, 9, 76);
    }
  });
  const PFW = BAR_W - 0.16, PFH = PFW * PTH / PTW;
  mesh(G.plane(PFW, PFH), new THREE.MeshBasicMaterial({ map: promptTex.tex, transparent: true }), { z: 0.1, parent: bar, line: false });

  // コピーボタン
  const copyTex = canvasTexture(256, 128, (ctx, w, h) => {
    ctx.font = `900 64px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#1a1714'; ctx.fillText('コピー', w / 2, h / 2 + 5);
  });
  const copyBtn = group(root, { x: 1.72, y: 2.2, z: -0.95, rx: -0.22 });
  mesh(G.box(0.86, 0.5, 0.18, 0.2), 0x7a3d1d, { z: -0.05, parent: copyBtn });
  const copyCap = group(copyBtn);
  mesh(G.box(0.8, 0.44, 0.14, 0.18), ORANGE, { z: 0.05, parent: copyCap, px: 1.8 });
  mesh(G.plane(0.74, 0.37), new THREE.MeshBasicMaterial({ map: copyTex.tex, transparent: true }), { z: 0.125, parent: copyCap, line: false });

  // 欄に並ぶトークン（チップのコピー）
  const TOK_S = 0.62;
  const tokens = CHIPS.map((c, i) => {
    const g = group(root);
    const inner = group(g);
    mesh(chipGeo, CHIP, { y: 0, parent: inner, px: 1.6 });
    mesh(labelGeo, new THREE.MeshBasicMaterial({ map: c.texS, transparent: true }), { rx: -Math.PI / 2, y: CH_H / 2 + 0.004, parent: inner, line: false });
    return g;
  });
  // 欄のスロット位置（bar ローカル）: トークンは「上面」をカメラに向ける → 内側で rx=+90°
  const slotLocal = (i) => new THREE.Vector3(-PFW / 2 + wordPos[i][0] / PTW * PFW, PFH / 2 - wordPos[i][1] / PTH * PFH, 0.16);

  // ---------------------------------------------------------------- ラジオ
  const radio = group(root, { x: 1.62, y: 0.03, z: 0.4, ry: -0.3, s: 0.92 });
  const rbody = group(radio);
  mesh(G.box(1.35, 1.0, 0.62, 0.16), BLUE, { y: 0.52, parent: rbody });
  mesh(G.box(1.2, 0.08, 0.5, 0.03), 0x5a82c0, { y: 0.02, parent: rbody, line: false });
  // 取っ手
  mesh(G.torus(0.42, 0.045, 8, 24, Math.PI), 0x5a4d40, { y: 1.02, parent: rbody, px: 1.6 });
  // アンテナ
  mesh(G.cyl(0.018, 0.018, 0.55, 8), 0xd8d0c4, { x: 0.45, y: 1.3, rz: -0.35, parent: rbody, px: 1.2 });
  mesh(G.sphere(0.055, 12, 8), ORANGE, { x: 0.545, y: 1.555, parent: rbody, px: 1.4 });
  // スピーカー
  const spk = group(rbody, { x: -0.3, y: 0.5, z: 0.31 });
  mesh(G.puck(0.32, 0.06, 0.03), 0xede7dd, { rx: Math.PI / 2, parent: spk, px: 1.8 });
  mesh(G.puck(0.26, 0.07, 0.03), CARD, { rx: Math.PI / 2, z: 0.01, parent: spk, line: false });
  const cone = group(spk, { z: 0.04 });
  mesh(G.puck(0.17, 0.05, 0.025), 0x4a4036, { rx: Math.PI / 2, parent: cone, px: 1.2 });
  mesh(G.sphere(0.07, 14, 10), ORANGE, { z: 0.03, sz: 0.6, parent: cone, px: 1.2 });
  // EQ 画面
  const eqScr = group(rbody, { x: 0.34, y: 0.5, z: 0.31 });
  mesh(G.box(0.46, 0.56, 0.04, 0.05), BG, { parent: eqScr, px: 1.6 });
  const eqCols = [ORANGE, YELLOW, PINK, PURPLE];
  const eqBars = eqCols.map((c, i) => {
    const m = mesh(G.box(0.075, 0.44, 0.02, 0.01), flat(c), { x: -0.15 + i * 0.1, y: -0.22, z: 0.03, parent: eqScr, line: false });
    m.geometry.translate(0, 0.22, 0); // 下端基準（ジオメトリは共有しないので OK）
    m.position.y = -0.22;
    return m;
  });
  // つまみ
  for (const kx of [0.22, 0.46]) mesh(G.puck(0.06, 0.06, 0.02), YELLOW, { x: kx, y: 0.9, z: 0.2, parent: rbody, px: 1.3 });
  blobShadow(radio, 0.95, { sz: 0.6 });

  // 音符
  const noteTex = ['♪', '♫', '♪', '♬'].map((ch, i) => canvasTexture(128, 128, (ctx, w, h) => {
    ctx.font = `900 108px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round'; ctx.lineWidth = 14; ctx.strokeStyle = '#1a1714'; ctx.strokeText(ch, w / 2, h / 2 + 4);
    ctx.fillStyle = ['#d97746', '#d98fa3', '#a78bfa', '#d4b94e'][i]; ctx.fillText(ch, w / 2, h / 2 + 4);
  }).tex);
  const noteGeo = G.plane(0.42, 0.42);
  const notes = [];
  for (let i = 0; i < 6; i++) {
    const m = new THREE.Mesh(noteGeo, new THREE.MeshBasicMaterial({ map: noteTex[i % 4], transparent: true, depthWrite: false }));
    root.add(m); notes.push({ m, ph: i / 6, side: i % 2 ? 1 : -1 });
  }
  // バー → ラジオへ流れる音符
  const stream = [];
  for (let i = 0; i < 5; i++) {
    const m = new THREE.Mesh(noteGeo, new THREE.MeshBasicMaterial({ map: noteTex[(i + 1) % 4], transparent: true, depthWrite: false }));
    root.add(m); stream.push(m);
  }
  // 着地のキラキラ
  const sparkGeo = G.extrude(starShape(0.1, 0.045), 0.03, 0.01);
  const sparks = [];
  for (let i = 0; i < 4; i++) {
    const arr = [];
    for (let j = 0; j < 4; j++) arr.push(mesh(sparkGeo, [YELLOW, ORANGE, PINK, 0xffffff][j], { parent: root, px: 1.2 }));
    sparks.push(arr);
  }

  // ---------------------------------------------------------------- マウスのカーソル
  const arrow = new THREE.Shape();
  [[0, 0], [0, -1], [0.26, -0.76], [0.43, -1.12], [0.6, -1.04], [0.43, -0.7], [0.74, -0.7]].forEach(([x, y], i) => i ? arrow.lineTo(x, y) : arrow.moveTo(x, y));
  arrow.closePath();
  const pointer = group(root);
  const pInner = group(pointer, { s: 0.42 });
  mesh(G.extrude(arrow, 0.1, 0.03), 0xffffff, { parent: pInner, px: 2.0 });
  const clickRingMat = new THREE.MeshBasicMaterial({ color: 0xffb070, transparent: true, depthWrite: false });
  const clickRing = mesh(G.torus(0.2, 0.025, 6, 32), clickRingMat, { parent: root, line: false });

  // ---------------------------------------------------------------- 位置の計算
  root.updateMatrixWorld(true);
  const chipWorld = chips.map(c => { const p = new THREE.Vector3(0, CH_H / 2, 0); return c.g.localToWorld(p); });
  const chipClick = chips.map(c => c.g.localToWorld(new THREE.Vector3(0.54, CH_H, 0.17)));
  const chipQuat = new THREE.Quaternion(); slope.getWorldQuaternion(chipQuat);
  const slotWorld = CHIPS.map((_, i) => bar.localToWorld(slotLocal(i)));
  const barQuat = new THREE.Quaternion(); bar.getWorldQuaternion(barQuat);
  const tokQuat = barQuat.clone().multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2));
  const copyWorld = copyBtn.localToWorld(new THREE.Vector3(0, 0, 0.14));
  const spkWorld = spk.localToWorld(new THREE.Vector3(0, 0, 0.1));
  const camQ = camera.quaternion.clone();

  // タイムライン
  const TC = [0.85, 1.8, 2.75, 3.7];        // チップのクリック
  const FLY = 0.6;
  const T_COPY = 4.9;
  const T_PLAY = 5.55, T_STOP = 8.5;
  const T_CLEAR = 8.65;

  // カーソルの経路（先端の位置）
  const REST = new THREE.Vector3(0.55, 0.7, 1.95);
  const hover = (v) => v.clone().add(new THREE.Vector3(0, 0.06, 0.12));
  const KEYS = [[0, REST], [0.35, REST]];
  TC.forEach((tc, i) => { KEYS.push([tc - 0.22, hover(chipClick[i])]); KEYS.push([tc + 0.18, hover(chipClick[i])]); });
  KEYS.push([T_COPY - 0.2, hover(copyWorld)]); KEYS.push([T_COPY + 0.3, hover(copyWorld)]);
  KEYS.push([T_COPY + 1.1, REST]); KEYS.push([DUR, REST]);
  const pv = new THREE.Vector3();
  function pointerAt(t) {
    for (let i = 0; i < KEYS.length - 1; i++) {
      const [ta, a] = KEYS[i], [tb, b] = KEYS[i + 1];
      if (t >= ta && t <= tb) { const k = easeInOut(clamp((t - ta) / (tb - ta))); pv.lerpVectors(a, b, k); pv.y += Math.sin(k * Math.PI) * 0.15 * a.distanceTo(b); return pv; }
    }
    return pv.copy(REST);
  }

  const tv = new THREE.Vector3(), tq = new THREE.Quaternion();
  const selState = [false, false, false, false];
  let lastPrompt = '';
  function update(t) {
    let nW = 0;
    TC.forEach((tc) => { if (t >= tc + 0.08 + FLY) nW++; });
    if (t >= T_CLEAR + 0.2) nW = 0;
    const flash = t >= T_COPY + 0.05 && t < T_COPY + 0.75 ? 1 : 0;
    const pk = nW + ':' + flash;
    if (pk !== lastPrompt) { promptTex.redraw(nW, flash); lastPrompt = pk; }
    // チップの選択状態
    CHIPS.forEach((c, i) => {
      const sel = t >= TC[i] && t < T_CLEAR + i * 0.08;
      if (sel !== selState[i]) { chips[i].mat.map = sel ? c.texS : c.texN; chips[i].mat.needsUpdate = true; selState[i] = sel; }
      const press = bump(t, TC[i] - 0.06, TC[i] + 0.12);
      const pop = bump(t, TC[i] + 0.05, TC[i] + 0.4) + bump(t, T_CLEAR + i * 0.08, T_CLEAR + i * 0.08 + 0.3) * 0.5;
      chips[i].g.position.y = -press * 0.06 + pop * 0.08;
      chips[i].g.scale.setScalar(1 + pop * 0.08);
    });

    // トークン: チップ → 欄へ弧を描いて飛ぶ → 並ぶ → コピーで跳ねる → 消える
    tokens.forEach((g, i) => {
      const t0 = TC[i] + 0.08;
      const k = clamp((t - t0) / FLY);
      const out = seg(t, t0 + FLY + 0.02, t0 + FLY + 0.2);
      g.visible = t >= t0 && out < 1;
      if (!g.visible) return;
      const e = easeInOut(k);
      tv.lerpVectors(chipWorld[i], slotWorld[i], e);
      tv.y += Math.sin(e * Math.PI) * 0.9;
      tv.z += Math.sin(e * Math.PI) * 0.4;
      const wave = bump(t, T_COPY + 0.05 + i * 0.08, T_COPY + 0.35 + i * 0.08);
      tv.y += wave * 0.12;
      g.position.copy(tv);
      tq.slerpQuaternions(chipQuat, tokQuat, e);
      g.quaternion.copy(tq);
      const land = bump(t, t0 + FLY - 0.02, t0 + FLY + 0.22);
      const s = lerp(1, TOK_S, e) * (1 + land * 0.12) * (1 - out);
      g.scale.setScalar(Math.max(0.001, s));
      g.children[0].rotation.z = Math.sin(e * Math.PI) * 0.25;
    });
    // 着地のキラキラ
    sparks.forEach((arr, i) => {
      const a = t - (TC[i] + 0.08 + FLY);
      const on = a > 0 && a < 0.55;
      arr.forEach((m, j) => {
        m.visible = on;
        if (!on) return;
        const ang = j / 4 * TAU + 0.6;
        m.position.set(slotWorld[i].x + Math.cos(ang) * (0.25 + a * 0.9), slotWorld[i].y + Math.sin(ang) * (0.2 + a * 0.6), slotWorld[i].z + 0.2);
        m.quaternion.copy(camQ); m.rotateZ(a * 6);
        m.scale.setScalar(Math.max(0.001, easeOutBack(clamp(a / 0.15)) * (1 - seg(a, 0.3, 0.55))));
      });
    });

    // カーソル
    const p = pointerAt(t);
    let click = 0;
    for (const tc of TC) click = Math.max(click, bump(t, tc - 0.08, tc + 0.14));
    click = Math.max(click, bump(t, T_COPY - 0.08, T_COPY + 0.14));
    pointer.position.set(p.x, p.y - click * 0.08, p.z - click * 0.06);
    pointer.quaternion.copy(camQ); pointer.rotateZ(0.35);
    pInner.scale.setScalar(0.42 * (1 - click * 0.12));
    // クリックの波紋
    let cr = null;
    for (const [tc, w] of [...TC.map((tc, i) => [tc, chipClick[i]]), [T_COPY, copyWorld]]) if (t >= tc && t < tc + 0.45) cr = [t - tc, w];
    clickRing.visible = !!cr;
    if (cr) {
      clickRing.position.copy(cr[1]).add(new THREE.Vector3(0, 0.05, 0.1));
      clickRing.quaternion.copy(camQ);
      clickRing.scale.setScalar(0.5 + easeOutCubic(cr[0] / 0.45) * 1.6);
      clickRingMat.opacity = 1 - cr[0] / 0.45;
    }

    // コピー
    const cp = bump(t, T_COPY - 0.05, T_COPY + 0.18);
    copyCap.position.z = -cp * 0.07;
    copyBtn.scale.setScalar(1 + bump(t, T_COPY + 0.1, T_COPY + 0.45) * 0.1);
    bar.scale.setScalar(1 + bump(t, T_COPY + 0.05, T_COPY + 0.45) * 0.05);
    // 欄 → ラジオへ流れる音符
    stream.forEach((m, i) => {
      const a = clamp((t - (T_COPY + 0.1 + i * 0.1)) / 0.6);
      m.visible = a > 0 && a < 1;
      if (!m.visible) return;
      const from = slotWorld[Math.min(3, i)];
      const e = easeInOut(a);
      m.position.lerpVectors(from, spkWorld, e);
      m.position.y += Math.sin(e * Math.PI) * 0.6;
      m.position.z += 0.3;
      m.quaternion.copy(camQ); m.rotateZ(Math.sin(a * 8) * 0.3);
      m.scale.setScalar(Math.max(0.001, easeOutBack(clamp(a / 0.2)) * (1 - seg(a, 0.85, 1))));
    });

    // ラジオ演奏
    const amp = seg(t, T_PLAY - 0.1, T_PLAY + 0.25) * (1 - seg(t, T_STOP, T_STOP + 0.4));
    const beat = Math.pow(Math.abs(Math.sin((t - T_PLAY) * Math.PI * 2.4)), 3);
    rbody.scale.set(1 + amp * beat * 0.06, 1 - amp * beat * 0.07 + amp * 0.02, 1 + amp * beat * 0.06);
    rbody.rotation.z = amp * Math.sin((t - T_PLAY) * Math.PI * 1.2) * 0.06;
    radio.position.y = 0.03 + amp * Math.abs(Math.sin((t - T_PLAY) * Math.PI * 1.2)) * 0.12;
    cone.scale.setScalar(1 + amp * beat * 0.3);
    cone.position.z = 0.04 + amp * beat * 0.04;
    eqBars.forEach((b, i) => {
      const lv = 0.5 + 0.5 * Math.sin((t - T_PLAY) * (7 + i * 2.3) + i * 1.7) * Math.sin((t - T_PLAY) * (3.1 + i) + i);
      b.scale.y = Math.max(0.05, 0.12 + amp * (0.3 + 0.58 * Math.abs(lv)));
    });
    notes.forEach((n, i) => {
      const period = 0.95;
      const a = (((t - T_PLAY) / period + n.ph) % 1 + 1) % 1;
      const cycleStart = t - a * period;
      const on = cycleStart >= T_PLAY - 0.05 && cycleStart <= T_STOP - 0.2;
      n.m.visible = on;
      if (!on) return;
      const sway = Math.sin(a * TAU + i) * 0.12;
      n.m.position.set(spkWorld.x + 0.3 + n.side * (0.2 + a * 0.7) + sway, spkWorld.y + 0.55 + a * 1.3, spkWorld.z + 0.1);
      n.m.quaternion.copy(camQ); n.m.rotateZ(n.side * -0.25 + Math.sin(a * 6 + i) * 0.2);
      n.m.scale.setScalar(Math.max(0.001, easeOutBack(clamp(a / 0.2)) * (1 - seg(a, 0.75, 1))));
    });
  }

  return { scene, camera, update, duration: DUR };
});
