// かんたんキー設定: パソコンの画面からキーの名前がポンと飛んで手作りキーボードのボタンに乗る
// → 3 つ決めたら「保存」✓ → ボタンを押すと名前がポップ
import { THREE, defineScene, stage, mesh, group, G, toon, flat, canvasTexture, blobShadow, starShape, FONT,
  clamp, lerp, seg, bump, smooth, easeOutBack, easeOutCubic, easeInOut, rand } from '../engine.js';

defineScene('grid-keymap', () => {
  const { scene, camera, root } = stage({ fov: 30, pos: [0.3, 6.7, 4.75], target: [0.18, 0.42, -0.2], light: [3, 9, 6] });
  const DUR = 10;

  const TEAL = 0x0ea5a5, GREEN = 0x10b981, BLUE = 0x3b82f6, TILE = 0xf0f4f8, TXT = '#2c3e50';
  const INKS = '#2b2320';

  // ---- 机のマット
  mesh(G.box(4.0, 0.12, 3.0, 0.1), 0xf7f3ea, { y: -0.06, x: 0.2, z: -0.1, parent: root });

  // ---- キーボード（3×3）
  const PADX = -0.55, PADZ = 0.55, LAPX = 0.95, LAPZ = -0.85;
  const pad = group(root, { x: PADX, z: PADZ, ry: 0.12 });
  blobShadow(pad, 1.35, { y: 0.004 });
  const CASE_H = 0.3;
  mesh(G.box(1.98, CASE_H, 1.98, 0.16), TEAL, { y: CASE_H / 2, parent: pad });
  mesh(G.box(1.8, 0.04, 1.8, 0.1), 0x0b7f7f, { y: CASE_H + 0.005, parent: pad, line: false });
  const PITCH = 0.6, KS = 0.53, KH = 0.2;
  const capGeo = G.box(KS, KH, KS, 0.08);
  const lblGeo = G.plane(KS - 0.06, KS - 0.06);
  const keys = [];
  // 文字を枠に収める（まず横を最大 72% まで詰め、それでも入らなければ小さく）
  function fitText(ctx, text, maxW, size) {
    let s = size;
    ctx.font = `900 ${s}px ${FONT}`;
    while (ctx.measureText(text).width * 0.6 > maxW && s > 20) { s -= 4; ctx.font = `900 ${s}px ${FONT}`; }
    return Math.min(1, maxW / ctx.measureText(text).width);
  }
  function fillFit(ctx, text, x, y, maxW, size) {
    const k = fitText(ctx, text, maxW, size);
    ctx.save(); ctx.translate(x, y); ctx.scale(k, 1); ctx.fillText(text, 0, 0); ctx.restore();
  }
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
    const g = group(pad, { x: (c - 1) * PITCH, z: (r - 1) * PITCH, y: CASE_H });
    const mat = toon(TILE, { unique: true });
    mesh(capGeo, mat, { y: KH / 2 + 0.01, parent: g });
    const tex = canvasTexture(256, 256, (ctx, w, h, label = '', on = 0) => {
      ctx.setLineDash([]);
      ctx.fillStyle = on ? '#e3fbf7' : '#f0f4f8'; ctx.fillRect(0, 0, w, h);
      if (!label) {
        ctx.strokeStyle = '#c3cfdb'; ctx.lineWidth = 10; ctx.setLineDash([22, 16]);
        ctx.beginPath(); ctx.roundRect(28, 28, w - 56, h - 56, 30); ctx.stroke();
        return;
      }
      ctx.strokeStyle = '#0ea5a5'; ctx.lineWidth = 14;
      ctx.beginPath(); ctx.roundRect(12, 12, w - 24, h - 24, 34); ctx.stroke();
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = TXT;
      fillFit(ctx, label, w / 2, h / 2 + 8, w - 36, label.length === 1 ? 190 : 132);
    });
    mesh(lblGeo, new THREE.MeshBasicMaterial({ map: tex.tex }), { y: KH + 0.012, rx: -Math.PI / 2, parent: g, line: false });
    keys.push({ g, mat, tex, state: '' });
  }

  // ---- ノートパソコン
  const lap = group(root, { x: LAPX, z: LAPZ, ry: -0.28 });
  blobShadow(lap, 1.3, { y: 0.004, sz: 0.75 });
  const LW = 1.95, LD = 1.3;
  mesh(G.box(LW, 0.09, LD, 0.05), 0xdfe5ec, { y: 0.045, parent: lap });
  // キーボード面とタッチパッド（飾り）
  const kbTex = canvasTexture(256, 128, (ctx, w, h) => {
    ctx.fillStyle = '#c9d2dc'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#9aa7b5';
    for (let r = 0; r < 4; r++) for (let c = 0; c < 12; c++) ctx.fillRect(8 + c * 20.5, 8 + r * 20, 16, 15);
    ctx.fillRect(60, 90, 136, 15);
  });
  mesh(G.plane(LW - 0.25, 0.62), new THREE.MeshBasicMaterial({ map: kbTex.tex }), { y: 0.092, z: -0.12, rx: -Math.PI / 2, parent: lap, line: false });
  mesh(G.plane(0.5, 0.26), flat(0xcdd5de), { y: 0.092, z: 0.4, rx: -Math.PI / 2, parent: lap, line: false });
  const lid = group(lap, { y: 0.09, z: -LD / 2 + 0.03, rx: -0.22 });
  const SH = 1.25;
  mesh(G.box(LW, SH, 0.07, 0.05), 0x5d6d85, { y: SH / 2, parent: lid });
  // 画面
  const SW_ = LW - 0.16, SH_ = SH - 0.16;
  const scr = canvasTexture(512, 336, (ctx, w, h, st) => {
    const { hi = -1, labels = [], save = 0, done = false } = st || {};
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, w, h);
    // タイトルバー
    ctx.fillStyle = '#0ea5a5'; ctx.fillRect(0, 0, w, 44);
    ctx.fillStyle = '#fff'; ctx.font = `900 26px ${FONT}`; ctx.textBaseline = 'middle';
    ctx.fillText('キー設定', 16, 23);
    ctx.fillStyle = '#10b981'; ctx.beginPath(); ctx.arc(w - 26, 22, 9, 0, 7); ctx.fill();
    // 3×3 のタイル
    const TS = 76, GX = 22, GY = 60, GAP = 9;
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
      const i = r * 3 + c, x = GX + c * (TS + GAP), y = GY + r * (TS + GAP);
      ctx.fillStyle = i === hi ? '#bdf0e8' : '#f0f4f8';
      ctx.beginPath(); ctx.roundRect(x, y, TS, TS, 12); ctx.fill();
      ctx.lineWidth = i === hi ? 6 : 3; ctx.strokeStyle = i === hi ? '#0ea5a5' : '#c3cfdb';
      ctx.stroke();
      if (labels[i]) {
        ctx.fillStyle = TXT; ctx.textAlign = 'center';
        fillFit(ctx, labels[i], x + TS / 2, y + TS / 2 + 3, TS - 10, labels[i].length === 1 ? 50 : 32);
        ctx.textAlign = 'left';
      }
    }
    // 保存ボタン
    const bx = 300, by = 206, bw = 190, bh = 96;
    ctx.fillStyle = done ? '#10b981' : (save ? '#0b8a8a' : '#0ea5a5');
    ctx.beginPath(); ctx.roundRect(bx, by + save * 4, bw, bh - save * 4, 20); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.font = `900 40px ${FONT}`;
    ctx.fillText(done ? '保存 ✓' : '保存', bx + bw / 2, by + bh / 2 + 3 + save * 2);
    ctx.textAlign = 'left';
    // 説明
    ctx.fillStyle = '#6b7c8d'; ctx.font = `800 22px ${FONT}`;
    ctx.fillText('ボタンを選んで', 300, 84);
    ctx.fillText('キーを押す', 300, 116);
  });
  const screen = mesh(G.plane(SW_, SH_), new THREE.MeshBasicMaterial({ map: scr.tex }), { y: SH / 2, z: 0.037, parent: lid, line: false });

  // ---- USB ケーブル
  const cablePts = [[0, 0, 0], [PADX - 0.15, 0.05, PADZ - 1.2], [PADX - 0.55, 0.04, LAPZ - 0.05], [PADX - 0.1, 0.04, LAPZ - 0.45], [LAPX - 1.25, 0.05, LAPZ - 0.05], [0, 0, 0]];
  // pad の回転を考慮して始点を置き直す
  const padBack = new THREE.Vector3(0, 0.16, -0.98).applyAxisAngle(new THREE.Vector3(0, 1, 0), 0.12).add(new THREE.Vector3(PADX, 0, PADZ));
  const lapSide = new THREE.Vector3(-LW / 2 - 0.02, 0.05, 0.1).applyAxisAngle(new THREE.Vector3(0, 1, 0), -0.28).add(new THREE.Vector3(LAPX, 0, LAPZ));
  cablePts[0] = [padBack.x, padBack.y, padBack.z - 0.08];
  cablePts[cablePts.length - 1] = [lapSide.x - 0.1, lapSide.y, lapSide.z];
  const cableCurve = new THREE.CatmullRomCurve3(cablePts.map(p => new THREE.Vector3(...p)));
  mesh(new THREE.TubeGeometry(cableCurve, 50, 0.04, 8, false), 0x4a5568, { parent: root, px: 1.6 });
  mesh(G.box(0.2, 0.1, 0.16, 0.03), 0x9aa8b8, { x: padBack.x, y: padBack.y, z: padBack.z - 0.02, ry: 0.12, parent: root, px: 1.5 });
  mesh(G.box(0.18, 0.09, 0.16, 0.03), 0x9aa8b8, { x: lapSide.x - 0.05, y: lapSide.y, z: lapSide.z, ry: -0.28 + Math.PI / 2, parent: root, px: 1.5 });
  // ケーブルを流れる光（保存時）
  const pulses = [];
  for (let i = 0; i < 3; i++) pulses.push(mesh(G.sphere(0.075, 14, 10), new THREE.MeshBasicMaterial({ color: 0x7ff5e3 }), { parent: root, px: 1.4 }));

  // ---- 飛んでいく札
  function chipTex(label) {
    return canvasTexture(320, 160, (ctx, w, h) => {
      ctx.fillStyle = INKS; ctx.beginPath(); ctx.roundRect(6, 6, w - 12, h - 12, 40); ctx.fill();
      ctx.fillStyle = '#0ea5a5'; ctx.beginPath(); ctx.roundRect(15, 15, w - 30, h - 30, 32); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      fillFit(ctx, label, w / 2, h / 2 + 5, w - 56, label.length === 1 ? 110 : 84);
    }).tex;
  }
  const ASSIGN = [
    { key: 0, label: 'コピー', t: 0.7 },
    { key: 4, label: 'Enter', t: 2.5 },
    { key: 2, label: 'A', t: 4.3 },
  ];
  const chipGeo = G.plane(0.9, 0.45);
  for (const a of ASSIGN) {
    a.chip = new THREE.Mesh(chipGeo, new THREE.MeshBasicMaterial({ map: chipTex(a.label), transparent: true, depthTest: false }));
    a.chip.renderOrder = 10;
    root.add(a.chip);
  }
  const FLY = 1.0;

  // 画面上のタイル位置（ワールド座標）
  root.updateMatrixWorld(true);
  function screenTileWorld(i) {
    const r = Math.floor(i / 3), c = i % 3;
    const u = (22 + c * 85 + 38) / 512, v = (60 + r * 85 + 38) / 336;
    const p = new THREE.Vector3((u - 0.5) * SW_, (0.5 - v) * SH_, 0.05);
    return screen.localToWorld(p);
  }
  function keyTopWorld(i) {
    return keys[i].g.localToWorld(new THREE.Vector3(0, KH + 0.12, 0));
  }
  for (const a of ASSIGN) { a.from = screenTileWorld(a.key); a.to = keyTopWorld(a.key); }

  // 保存 ✓ バッジ
  const badgeTex = canvasTexture(360, 160, (ctx, w, h) => {
    ctx.fillStyle = INKS; ctx.beginPath(); ctx.roundRect(6, 6, w - 12, h - 12, 60); ctx.fill();
    ctx.fillStyle = '#10b981'; ctx.beginPath(); ctx.roundRect(15, 15, w - 30, h - 30, 52); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = `900 76px ${FONT}`;
    ctx.fillText('保存 ✓', w / 2, h / 2 + 5);
  });
  const badge = new THREE.Mesh(G.plane(1.15, 0.51), new THREE.MeshBasicMaterial({ map: badgeTex.tex, transparent: true, depthTest: false }));
  badge.renderOrder = 11; root.add(badge);

  // テストで押したときのポップ
  const popTex = canvasTexture(360, 200, (ctx, w, h) => {
    ctx.fillStyle = INKS;
    ctx.beginPath(); ctx.roundRect(6, 6, w - 12, h - 52, 44); ctx.fill();
    ctx.beginPath(); ctx.moveTo(w / 2 - 30, h - 50); ctx.lineTo(w / 2, h - 8); ctx.lineTo(w / 2 + 30, h - 50); ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.roundRect(15, 15, w - 30, h - 70, 36); ctx.fill();
    ctx.beginPath(); ctx.moveTo(w / 2 - 20, h - 58); ctx.lineTo(w / 2, h - 24); ctx.lineTo(w / 2 + 20, h - 58); ctx.fill();
    ctx.fillStyle = '#0ea5a5'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = `900 84px ${FONT}`;
    ctx.fillText('コピー', w / 2, (h - 44) / 2 + 6);
  });
  const pop = new THREE.Mesh(G.plane(1.2, 0.667), new THREE.MeshBasicMaterial({ map: popTex.tex, transparent: true, depthTest: false }));
  pop.renderOrder = 12; root.add(pop);

  // キラキラ
  const sparks = [];
  const starGeo = G.extrude(starShape(0.11, 0.05), 0.03, 0.01);
  const Rn = rand(21);
  for (let i = 0; i < 6; i++) {
    const m = mesh(starGeo, [0xffd23f, 0xffffff, 0x7ff5e3][i % 3], { parent: root, px: 1.3 });
    const a = (i / 6) * Math.PI * 2 + Rn() * 0.4;
    sparks.push({ m, a });
  }

  // ---- タイミング
  const SAVE = 6.2, TEST = 7.8, RESET0 = 9.35, RESET1 = 9.75;
  const cTeal = new THREE.Color(0x6fe3d3), cTile = new THREE.Color(TILE), cDone = new THREE.Color(0xe3fbf7);

  let lastScr = '';
  function update(t) {
    const reset = t >= RESET0;
    // 各キーの状態
    const labels = [];
    let hi = -1;
    for (const a of ASSIGN) {
      const k = (t - a.t) / FLY;
      if (t >= a.t - 0.35 && t < a.t + FLY) hi = a.key;
      const landed = k >= 1 && t < RESET0 + a.key * 0.03;
      if (landed) labels[a.key] = a.label;
      // 札の飛行
      const fly = k > 0 && k < 1;
      a.chip.visible = fly;
      if (fly) {
        const e = easeInOut(k);
        a.chip.position.lerpVectors(a.from, a.to, e);
        a.chip.position.y += Math.sin(k * Math.PI) * 0.9;
        const sc = k < 0.15 ? easeOutBack(k / 0.15) : lerp(1, 0.62, seg(k, 0.6, 1));
        a.chip.scale.setScalar(Math.max(0.001, sc));
        a.chip.quaternion.copy(camera.quaternion);
      }
    }
    // キーの表示と光
    keys.forEach((kk, i) => {
      const a = ASSIGN.find(x => x.key === i);
      const lab = labels[i] || '';
      const glow = a ? bump(t, a.t + FLY, a.t + FLY + 0.9) : 0;
      const on = lab ? 1 : 0;
      const st = lab + ':' + on;
      if (st !== kk.state) { kk.tex.redraw(lab, on); kk.state = st; }
      kk.mat.color.copy(on ? cDone : cTile).lerp(cTeal, glow);
      let dy = 0;
      if (a) dy -= 0.06 * bump(t, a.t + FLY - 0.05, a.t + FLY + 0.2);            // 札が乗ったとき
      if (i === 0) dy -= 0.09 * bump(t, TEST, TEST + 0.35);                      // テストで押す
      const rs = reset && lab === '' && a ? 1 - 0.1 * bump(t, RESET0, RESET1) : 1;
      kk.g.position.y = CASE_H + dy;
      kk.g.scale.setScalar(rs);
    });

    // 保存
    const saveP = bump(t, SAVE, SAVE + 0.3);
    const done = t >= SAVE + 0.2 && t < RESET0;
    const st = JSON.stringify([hi, labels, Math.round(saveP * 4) / 4, done]);
    if (st !== lastScr) { scr.redraw({ hi, labels, save: saveP, done }); lastScr = st; }
    // ケーブルの光（パソコン → キーボード）
    pulses.forEach((p, i) => {
      const k = (t - SAVE - 0.2 - i * 0.18) / 0.9;
      p.visible = k > 0 && k < 1;
      if (p.visible) { cableCurve.getPointAt(1 - k, p.position); p.scale.setScalar(0.8 + 0.4 * Math.sin(k * Math.PI)); }
    });
    // バッジ
    const bp = seg(t, SAVE + 0.2, SAVE + 0.55, easeOutBack) * (1 - seg(t, TEST - 0.3, TEST));
    badge.visible = bp > 0.001;
    badge.scale.setScalar(Math.max(0.001, bp));
    badge.position.set(LAPX + 0.35, 1.5 + 0.04 * Math.sin(t * 3), LAPZ + 0.2);
    badge.quaternion.copy(camera.quaternion);
    // パッドのキラキラ（保存が届いたとき）
    const sk = (t - SAVE - 1.0) / 0.9;
    for (const s of sparks) {
      s.m.visible = sk > 0 && sk < 1;
      if (!s.m.visible) continue;
      const rr = 1.05 + sk * 0.35;
      s.m.position.set(PADX + Math.cos(s.a) * rr, 0.55 + sk * 0.3, PADZ + Math.sin(s.a) * rr * 0.7);
      s.m.scale.setScalar(Math.max(0.001, Math.sin(sk * Math.PI)));
      s.m.quaternion.copy(camera.quaternion);
      s.m.rotateZ(sk * 2.4);
    }
    // テスト: 押したキーの名前がポップ
    const pp = seg(t, TEST + 0.1, TEST + 0.45, easeOutBack) * (1 - seg(t, TEST + 1.25, TEST + 1.5));
    pop.visible = pp > 0.001;
    pop.scale.setScalar(Math.max(0.001, pp));
    const k0 = keyTopWorld(0);
    pop.position.set(k0.x, k0.y + 0.45 + 0.25 * seg(t, TEST + 0.1, TEST + 1.5), k0.z);
    pop.quaternion.copy(camera.quaternion);
  }

  return { scene, camera, update, duration: DUR };
});
