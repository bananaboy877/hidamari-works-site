// どうぶつ運動会: じゃんけんコントローラーのボタンを グー→チョキ→パー の順に押すと
// うさぎが走る → ゴール → 金メダル + 紙吹雪
import { THREE, defineScene, stage, mesh, group, G, toon, flat, canvasTexture, blobShadow, starShape, FONT,
  clamp, lerp, seg, bump, smooth, easeOutBack, easeOutCubic, easeInCubic, rand } from '../engine.js';

defineScene('janken-party', () => {
  const { scene, camera, root } = stage({ fov: 30, pos: [0, 5.6, 7.2], target: [0.05, 0.3, -0.3], light: [3, 9, 6] });
  const DUR = 8;
  const EMOJI = '"Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif';

  // ------------------------------------------------------------ 原っぱ（ジオラマ台）
  const FX = 5.1, FZ = 2.6, FZC = -0.78;
  mesh(G.box(FX, 0.26, FZ, 0.1), 0xb98a5e, { y: -0.2, z: FZC, parent: root });
  mesh(G.box(FX + 0.04, 0.12, FZ + 0.04, 0.06), 0x7cc96f, { y: -0.05, z: FZC, parent: root });

  // トラック（キャンバス）
  const TX0 = -1.75, TX1 = 1.75;     // スタート / ゴールの x
  const TW = 4.4, TD = 1.72, TZC = -0.8;
  const trackTex = canvasTexture(1056, 360, (ctx, w, h) => {
    const u = w / TW;
    ctx.fillStyle = '#d2b48c';
    ctx.beginPath(); ctx.roundRect(0, 0, w, h, 60); ctx.fill();
    ctx.strokeStyle = '#fffdf6'; ctx.lineWidth = 9;
    for (const y of [22, h / 2, h - 22]) { ctx.beginPath(); ctx.moveTo(40, y); ctx.lineTo(w - 40, y); ctx.stroke(); }
    // スタートライン
    const sx = (TX0 + TW / 2) * u;
    ctx.fillStyle = '#fffdf6'; ctx.fillRect(sx - 7, 12, 14, h - 24);
    // ゴールライン（チェッカー）
    const gx = (TX1 + TW / 2) * u;
    const cs = 28;
    for (let yy = 12, r = 0; yy < h - 12; yy += cs, r++) for (let c = 0; c < 2; c++) {
      ctx.fillStyle = (r + c) % 2 ? '#2b2320' : '#fffdf6';
      ctx.fillRect(gx - cs + c * cs, yy, cs, Math.min(cs, h - 12 - yy));
    }
  });
  mesh(G.plane(TW, TD), new THREE.MeshToonMaterial({ map: trackTex.tex }), { rx: -Math.PI / 2, y: 0.013, z: TZC, line: false, parent: root });
  const LANE_P = TZC + TD / 4, LANE_R = TZC - TD / 4;   // 手前 = プレイヤー, 奥 = ライバル

  // 万国旗（運動会）
  const buntCols = [0xef5350, 0xffca28, 0x42a5f5, 0x66bb6a, 0xffffff, 0xab77e0];
  const poleGeo = G.cyl(0.035, 0.035, 1.55, 12);
  for (const x of [-2.3, 2.3]) {
    mesh(poleGeo, 0xf4efe6, { x, y: 0.72, z: -1.92, parent: root, px: 1.6 });
    mesh(G.sphere(0.07, 12, 8), 0xffca28, { x, y: 1.52, z: -1.92, parent: root, px: 1.4 });
  }
  const flagTri = new THREE.Shape(); flagTri.moveTo(-0.11, 0); flagTri.lineTo(0.11, 0); flagTri.lineTo(0, -0.2); flagTri.closePath();
  const triGeo = G.extrude(flagTri, 0.01, 0);
  const NB = 13;
  const buntY = (x) => 1.42 - 0.2 * (1 - (x / 2.3) ** 2);
  mesh(G.tube(Array.from({ length: 9 }, (_, i) => { const x = -2.3 + i * 4.6 / 8; return [x, buntY(x) + 0.005, -1.92]; }), 0.008, 30), 0x6b5a50, { parent: root, line: false });
  for (let i = 0; i < NB; i++) {
    const x = -2.3 + (i + 0.5) * 4.6 / NB;
    mesh(triGeo, buntCols[i % buntCols.length], { x, y: buntY(x), z: -1.92, parent: root, px: 1.2 });
  }

  // 木
  const trunkGeo = G.cyl(0.07, 0.09, 0.4, 10);
  const canopyGeo = G.sphere(0.34, 18, 12);
  for (const [x, z, s] of [[-2.2, -1.62, 1], [2.3, -1.2, 0.8], [-2.28, -0.9, 0.7]]) {
    const tr = group(root, { x, z, s });
    mesh(trunkGeo, 0x9b6b43, { y: 0.2, parent: tr });
    mesh(canopyGeo, 0x58b35c, { y: 0.58, parent: tr });
    mesh(G.sphere(0.2, 14, 10), 0x6cc46e, { x: 0.2, y: 0.45, z: 0.1, parent: tr });
  }

  // ゴールの旗
  const goalTex = canvasTexture(320, 180, (ctx, w, h) => {
    ctx.fillStyle = '#e53935'; ctx.fillRect(0, 0, w, h);
    ctx.font = `900 92px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round'; ctx.lineWidth = 10; ctx.strokeStyle = '#8e1b18'; ctx.strokeText('ゴール', w / 2, h / 2 + 4);
    ctx.fillStyle = '#fff'; ctx.fillText('ゴール', w / 2, h / 2 + 4);
  });
  const gpole = group(root, { x: TX1 + 0.05, z: TZC - TD / 2 - 0.08 });
  mesh(G.cyl(0.04, 0.04, 1.6, 12), 0xf4efe6, { y: 0.8, parent: gpole, px: 1.6 });
  mesh(G.sphere(0.075, 12, 8), 0xffca28, { y: 1.62, parent: gpole, px: 1.4 });
  const goalFlag = mesh(new THREE.PlaneGeometry(0.82, 0.46, 10, 1), new THREE.MeshBasicMaterial({ map: goalTex.tex, side: THREE.DoubleSide }), { x: 0.45, y: 1.32, parent: gpole, line: false });
  const flagPos = goalFlag.geometry.getAttribute('position');
  const flagBase = Float32Array.from(flagPos.array);

  // ------------------------------------------------------------ うさぎ
  function rabbit(body, accent, inner) {
    const g = group(root);
    const shadow = blobShadow(g, 0.36);
    const b = group(g);                 // 跳ねる本体
    const lean = group(b);              // 前傾
    mesh(G.sphere(0.25, 22, 16), body, { y: 0.32, sy: 1.06, parent: lean });
    mesh(G.sphere(0.15, 16, 12), 0xffffff, { y: 0.3, z: 0.14, sz: 0.6, parent: lean, line: false });
    mesh(G.sphere(0.085, 12, 10), 0xffffff, { y: 0.26, z: -0.25, parent: lean, px: 1.4 });
    const head = group(lean, { y: 0.66, z: 0.03 });
    mesh(G.sphere(0.235, 24, 18), body, { sx: 1.08, parent: head });
    // 耳
    const ears = [];
    for (const s of [-1, 1]) {
      const e = group(head, { x: s * 0.1, y: 0.16, z: -0.05, rz: -s * 0.24 });
      mesh(G.capsule(0.078, 0.28, 6, 14), body, { y: 0.2, sz: 0.62, parent: e });
      mesh(G.capsule(0.045, 0.2, 4, 10), inner, { y: 0.2, z: 0.035, sz: 0.4, parent: e, line: false });
      ears.push(e);
    }
    // はちまき
    mesh(G.torus(0.214, 0.035, 8, 28), accent, { y: 0.12, rx: Math.PI / 2 - 0.22, sx: 1.08, parent: head, px: 1.4 });
    mesh(G.sphere(0.05, 10, 8), accent, { y: 0.08, z: -0.22, parent: head, px: 1.2 });
    // 顔
    for (const s of [-1, 1]) {
      mesh(G.sphere(0.05, 12, 10), 0x2b2320, { x: s * 0.088, y: 0.03, z: 0.2, sz: 0.6, sy: 1.15, parent: head, line: false });
      mesh(G.sphere(0.017, 8, 6), 0xffffff, { x: s * 0.088 + 0.014, y: 0.055, z: 0.228, parent: head, line: false });
      mesh(G.sphere(0.045, 12, 8), 0xff8fb0, { x: s * 0.155, y: -0.07, z: 0.17, sz: 0.35, ry: s * 0.7, parent: head, line: false });
    }
    mesh(G.sphere(0.028, 10, 8), 0xff6f91, { y: -0.055, z: 0.235, parent: head, line: false });
    mesh(G.torus(0.028, 0.008, 6, 12, Math.PI), 0x2b2320, { y: -0.085, z: 0.228, rz: Math.PI, parent: head, line: false });
    // 手
    const arms = [];
    for (const s of [-1, 1]) {
      const a = group(lean, { x: s * 0.2, y: 0.42, z: 0.04 });
      mesh(G.capsule(0.055, 0.1, 4, 10), body, { y: -0.07, parent: a, px: 1.6 });
      arms.push(a);
    }
    // 足
    const feet = [];
    for (const s of [-1, 1]) {
      const f = group(b, { x: s * 0.12, y: 0.12 });
      mesh(G.sphere(0.085, 14, 10), body, { y: -0.07, z: 0.05, sx: 0.85, sy: 0.6, sz: 1.5, parent: f, px: 1.6 });
      feet.push(f);
    }
    return { g, b, lean, head, ears, arms, feet, shadow };
  }
  const me = rabbit(0xfffbf6, 0xe91e63, 0xffb3c8);
  const rival = rabbit(0xe6c29a, 0x42a5f5, 0xffc9b8);
  me.g.position.z = LANE_P; rival.g.position.z = LANE_R;
  const RS = 1.22;
  const FACE = 0.62;   // 右（ゴール方向）を向きつつ顔をこちらへ
  me.g.rotation.y = FACE; rival.g.rotation.y = FACE;

  // 1 回ぴょんの姿勢
  function pose(r, p, idle, cheer) {
    // p: 0..1 ジャンプ中の位相（-1 なら着地）
    const air = p >= 0 ? Math.sin(Math.PI * p) : 0;
    r.b.position.y = air * 0.22 + cheer * 0.45;
    const squash = p >= 0 ? 1 + 0.08 * Math.sin(Math.PI * 2 * p) : 1 + 0.03 * Math.sin(idle * 6);
    r.b.scale.set(1 / Math.sqrt(squash), squash, 1 / Math.sqrt(squash));
    r.lean.rotation.x = p >= 0 ? 0.16 : 0.03;
    const sw = p >= 0 ? Math.sin(Math.PI * 2 * p) : 0;
    r.feet[0].rotation.x = -sw * 0.7 - air * 0.3; r.feet[1].rotation.x = sw * 0.7 - air * 0.3;
    r.arms[0].rotation.x = sw * 0.9; r.arms[1].rotation.x = -sw * 0.9;
    r.arms[0].rotation.z = -0.25 - cheer * 2.4; r.arms[1].rotation.z = 0.25 + cheer * 2.4;
    r.ears[0].rotation.x = 0.05 - air * 0.5 + 0.06 * Math.sin(idle * 5);
    r.ears[1].rotation.x = 0.05 - air * 0.5 + 0.06 * Math.sin(idle * 5 + 1);
    r.head.rotation.x = -0.3 - 0.12 * cheer;
    r.shadow.scale.setScalar(1 - 0.35 * clamp(r.b.position.y / 0.4));
  }
  // 等間隔の連続ジャンプの状態
  function hops(t, t0, iv, n, d) {
    if (t < t0) return { k: 0, p: -1 };
    const i = Math.min(Math.floor((t - t0) / iv), n - 1);
    const lt = t - (t0 + i * iv);
    return lt < d ? { k: i, p: lt / d } : { k: i + 1, p: -1 };
  }

  // ------------------------------------------------------------ じゃんけんコントローラー
  const CZ = 1.78;
  const ctrl = group(root, { z: CZ, s: 0.9, rx: -0.32 });
  blobShadow(ctrl, 2.1, { sz: 0.55, y: -0.02 });
  mesh(G.box(3.45, 0.84, 1.3, 0.1), 0xfff6e6, { y: 0.42, parent: ctrl });
  mesh(G.box(3.3, 0.06, 1.16, 0.03), 0xf2e3c8, { y: 0.845, parent: ctrl, line: false });
  const BTN = [
    { x: -1.07, col: 0xef5350, css: '#ef5350', dark: '#b3261e', hand: '✊', name: 'グー' },
    { x: 0, col: 0xffca28, css: '#ffca28', dark: '#a8741a', hand: '✌️', name: 'チョキ' },
    { x: 1.07, col: 0x42a5f5, css: '#42a5f5', dark: '#1565c0', hand: '✋', name: 'パー' },
  ];
  // 前面ラベル（手のアイコン + なまえ）
  const labelTex = canvasTexture(1080, 216, (ctx, w, h) => {
    const cw = w / 3;
    BTN.forEach((b, i) => {
      const cx = cw * i + cw / 2;
      ctx.fillStyle = b.css;
      ctx.beginPath(); ctx.roundRect(cw * i + 12, 10, cw - 24, h - 20, 40); ctx.fill();
      ctx.lineWidth = 8; ctx.strokeStyle = '#2b2320'; ctx.stroke();
      ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
      const ex = cx - 88;
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ex, h / 2, 76, 0, 7); ctx.fill();
      ctx.lineWidth = 7; ctx.stroke();
      ctx.font = `108px ${EMOJI}`;
      ctx.fillText(b.hand, ex, h / 2 + 8);
      const fs = b.name.length > 2 ? 62 : 76;
      ctx.font = `900 ${fs}px ${FONT}`;
      ctx.lineJoin = 'round'; ctx.lineWidth = 14; ctx.strokeStyle = '#2b2320';
      ctx.strokeText(b.name, cx + 64, h / 2 + 5);
      ctx.fillStyle = '#fff'; ctx.fillText(b.name, cx + 64, h / 2 + 5);
    });
  });
  mesh(G.plane(3.27, 0.654), new THREE.MeshBasicMaterial({ map: labelTex.tex, transparent: true }), { y: 0.42, z: 0.656, line: false, parent: ctrl });

  const domeGeo = G.sphere(0.34, 32, 20);
  const bezelGeo = G.puck(0.42, 0.12, 0.05);
  const ringGeo = G.torus(0.44, 0.035, 8, 40);
  const buttons = BTN.map((b) => {
    mesh(bezelGeo, 0x3d4250, { x: b.x, y: 0.88, parent: ctrl });
    const mat = toon(b.col, { unique: true, emissive: new THREE.Color(0x000000) });
    const d = mesh(domeGeo, mat, { x: b.x, y: 0.92, sy: 0.62, parent: ctrl });
    mesh(G.sphere(0.07, 10, 8), 0xffffff, { x: -0.13, y: 0.2, z: 0.1, sx: 1.3, sz: 0.7, parent: d, line: false });
    const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: b.col, transparent: true, opacity: 0, depthWrite: false }));
    ring.rotation.x = -Math.PI / 2; ring.position.set(b.x, 0.96, 0);
    ctrl.add(ring);
    return { d, mat, ring, col: new THREE.Color(b.col) };
  });

  // ------------------------------------------------------------ タイミング
  const P0 = 0.6, PIV = 0.37, NP = 12, HOPD = 0.3;
  const DXP = (TX1 + 0.12 - TX0) / NP;
  const R0 = 0.95, RIV = 0.38, NR = 15, DXR = (TX1 + 0.1 - TX0) / NR;
  const TG = P0 + (NP - 1) * PIV + HOPD;   // ゴール（着地）
  const OUT0 = 7.0, IN0 = 7.35;

  // ------------------------------------------------------------ メダル + 紙吹雪
  const medal = group(root);
  const medalTex = canvasTexture(256, 256, (ctx, w, h) => {
    const gr = ctx.createRadialGradient(w * 0.4, h * 0.35, 10, w / 2, h / 2, w / 2);
    gr.addColorStop(0, '#fff3b0'); gr.addColorStop(0.55, '#ffc928'); gr.addColorStop(1, '#e09a10');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(w / 2, h / 2, w / 2 - 2, 0, 7); ctx.fill();
    ctx.lineWidth = 10; ctx.strokeStyle = '#c47d0c'; ctx.beginPath(); ctx.arc(w / 2, h / 2, w / 2 - 26, 0, 7); ctx.stroke();
    ctx.font = `900 150px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round'; ctx.lineWidth = 14; ctx.strokeStyle = '#8a5200'; ctx.strokeText('1', w / 2, h / 2 + 10);
    ctx.fillStyle = '#fff'; ctx.fillText('1', w / 2, h / 2 + 10);
  });
  const coin = group(medal);
  mesh(G.puck(0.3, 0.07, 0.025, 40), 0xf2b21c, { rx: Math.PI / 2, parent: coin });
  for (const s of [1, -1]) mesh(G.circle(0.285, 40), new THREE.MeshBasicMaterial({ map: medalTex.tex }), { z: s * 0.037, ry: s > 0 ? 0 : Math.PI, parent: coin, line: false });
  for (const s of [-1, 1]) mesh(G.box(0.13, 0.42, 0.02, 0.01), s < 0 ? 0xe53935 : 0x1e88e5, { x: s * 0.1, y: 0.4, rz: -s * 0.3, z: -0.02, parent: medal, px: 1.4 });

  const confetti = group(root);
  const R = rand(11);
  const bits = [];
  const ccols = [0xef5350, 0xffca28, 0x42a5f5, 0x66bb6a, 0xe91e63, 0xab77e0];
  const starGeo = G.extrude(starShape(0.08, 0.035), 0.02, 0.008);
  const chipGeo = G.box(0.06, 0.012, 0.1, 0.004);
  for (let i = 0; i < 26; i++) {
    const m = mesh(i % 3 === 0 ? starGeo : chipGeo, ccols[i % ccols.length], { parent: confetti, px: 1.2 });
    bits.push({ m, vx: (R() - 0.5) * 2.6, vy: 1.8 + R() * 1.4, vz: (R() - 0.3) * 1.2, sp: (R() - 0.5) * 12, d: R() * 0.2 });
  }

  let lastFlagT = -1;
  const tmpA = new THREE.Vector3(), tmpB = new THREE.Vector3();
  function update(t) {
    const idle = t * Math.PI * 2 / DUR * 4;   // 4 周で DUR にぴったり

    // ボタン（グー→チョキ→パー の順）
    const glow = [0, 0, 0];
    buttons.forEach((b) => { b.push = 0; });
    for (let k = 0; k < NP; k++) {
      const tk = P0 + k * PIV;
      const i = k % 3;
      const down = t < tk ? seg(t, tk - 0.08, tk) : 1 - seg(t, tk + 0.06, tk + 0.26);
      buttons[i].push = Math.max(buttons[i].push, down);
      glow[i] = Math.max(glow[i], bump(t, tk - 0.05, tk + 0.4));
      if (t > tk && t < tk + 0.45) {
        const q = (t - tk) / 0.45;
        buttons[i].ring.scale.setScalar(1 + q * 0.7);
        buttons[i].ring.material.opacity = 0.9 * (1 - q);
        buttons[i].ringOn = true;
      }
    }
    buttons.forEach((b, i) => {
      b.d.position.y = 0.92 - 0.09 * b.push;
      b.d.scale.y = 0.62 - 0.08 * b.push;
      b.mat.emissive.copy(b.col).multiplyScalar(0.45 * glow[i]);
      if (!b.ringOn) b.ring.material.opacity = 0;
      b.ringOn = false;
    });

    // うさぎ（プレイヤー）
    const hp = hops(t, P0, PIV, NP, HOPD);
    const cheerT = t - TG;
    const cheer = cheerT > 0 ? bump(cheerT, 0.1, 0.7) + bump(cheerT, 0.8, 1.4) * 0.6 : 0;
    const armsUp = cheerT > 0 ? seg(cheerT, 0, 0.2) * (1 - seg(t, OUT0 - 0.3, OUT0)) : 0;
    pose(me, hp.p, idle, 0);
    me.b.position.y += cheer * 0.35;
    me.arms[0].rotation.z = -0.25 - armsUp * 2.3; me.arms[1].rotation.z = 0.25 + armsUp * 2.3;
    if (armsUp > 0) { me.arms[0].rotation.x = 0; me.arms[1].rotation.x = 0; }
    let mx = TX0 + DXP * (hp.k + (hp.p >= 0 ? smooth(hp.p) : 0));
    // ゴール後はこちらを向く
    me.g.rotation.y = lerp(FACE, 0.25, seg(cheerT, 0, 0.35));

    // ライバル
    const hr = hops(t, R0, RIV, NR, HOPD);
    pose(rival, hr.p, idle + 1.3, 0);
    let rx = TX0 + DXR * (hr.k + (hr.p >= 0 ? smooth(hr.p) : 0));

    // リセット（消えてスタートにポン）
    let sc = 1;
    if (t >= OUT0 && t < IN0) sc = 1 - easeInCubic(seg(t, OUT0, OUT0 + 0.3, (x) => x));
    if (t >= IN0) { sc = easeOutBack(seg(t, IN0, IN0 + 0.45, (x) => x)); mx = TX0; rx = TX0; me.g.rotation.y = FACE; }
    me.g.position.x = mx; rival.g.position.x = rx;
    me.g.scale.setScalar(Math.max(0.001, sc) * RS); rival.g.scale.setScalar(Math.max(0.001, sc) * RS);

    // メダル
    const mp = cheerT > 0.15 ? easeOutBack(seg(cheerT, 0.15, 0.6, (x) => x)) : 0;
    const mOut = 1 - seg(t, OUT0, OUT0 + 0.3);
    const ms = mp * mOut;
    medal.visible = ms > 0.001;
    medal.scale.setScalar(Math.max(0.001, ms));
    // 頭の上でくるくる → 胸にかかる
    me.g.updateMatrixWorld(true);
    const above = tmpA.set(0, 1.08, 0.3); me.lean.localToWorld(above);
    const chest = tmpB.set(0, 0.36, 0.3); me.lean.localToWorld(chest);
    const drop = seg(cheerT, 1.35, 1.75);
    medal.position.copy(above).lerp(chest, drop);
    medal.position.y += 0.05 * Math.sin(cheerT * 4) * (1 - drop) + 0.25 * bump(drop, 0, 1) * 0;
    medal.scale.multiplyScalar(lerp(1, 0.78, drop));
    coin.rotation.y = (1 - seg(cheerT, 0.15, 1.3, easeOutCubic)) * Math.PI * 4 - 0.25 * (1 - drop);
    medal.rotation.y = 0;

    // 紙吹雪
    const ct = cheerT - 0.05;
    confetti.visible = ct > 0 && ct < 1.9;
    if (confetti.visible) {
      for (const b of bits) {
        const tt = Math.max(0, ct - b.d);
        b.m.position.set(TX1 + b.vx * tt, 1.0 + b.vy * tt - 2.6 * tt * tt, LANE_P - 0.2 + b.vz * tt);
        b.m.rotation.set(b.sp * tt, b.sp * 0.7 * tt, 0.3);
        b.m.scale.setScalar(tt > 0 ? clamp(1.9 - tt, 0.001, 1) : 0.001);
      }
    }

    // ゴールの旗がはためく
    const ph = idle * 1.5;
    if (ph !== lastFlagT) {
      for (let i = 0; i < flagPos.count; i++) {
        const x0 = flagBase[i * 3];
        const u = (x0 + 0.41) / 0.82;
        flagPos.setZ(i, Math.sin(u * 5 - ph) * 0.06 * u);
      }
      flagPos.needsUpdate = true;
      lastFlagT = ph;
    }
  }

  return { scene, camera, update, duration: DUR };
});
