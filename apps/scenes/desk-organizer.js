// デスクオーガナイザー: おもちゃの 3D プリンターが仕切り付きトレイを 1 層ずつ印刷 → 文房具がポトン → キラキラ
import { THREE, defineScene, stage, mesh, group, G, toon, flat, canvasTexture, blobShadow, starShape, FONT,
  clamp, lerp, seg, bump, smooth, easeOutBack, easeOutCubic, rand } from '../engine.js';

defineScene('desk-organizer', () => {
  const { scene, camera, root } = stage({ fov: 30, pos: [2.6, 4.2, 6.6], target: [0.1, 0.8, 0.2], light: [4, 9, 6] });
  const DUR = 9;

  const AMBER = 0xd97706, AMBER_D = 0xb45309, AMBER_F = 0xc26a0a;
  const FRAME = 0x5d7088, WHITE = 0xf4f1ea;

  // ---- 角丸長方形シェイプ（左下原点ではなく中心基準）
  function rr(w, h, r, cx = 0, cy = 0, path = new THREE.Shape()) {
    const x = cx - w / 2, y = cy - h / 2;
    path.moveTo(x + r, y);
    path.lineTo(x + w - r, y); path.absarc(x + w - r, y + r, r, -Math.PI / 2, 0, false);
    path.lineTo(x + w, y + h - r); path.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2, false);
    path.lineTo(x + r, y + h); path.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI, false);
    path.lineTo(x, y + r); path.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5, false);
    return path;
  }
  // 上向きに押し出す（底面 y=0）
  function extrudeUp(shape, h, bevel = 0.012) {
    const g = new THREE.ExtrudeGeometry(shape, { depth: h - bevel * 2, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 10 });
    g.translate(0, 0, bevel);
    g.rotateX(-Math.PI / 2);
    return g;
  }

  // ---- プリンター本体
  const BASE_H = 0.34;
  mesh(G.box(3.5, BASE_H, 2.7, 0.14), WHITE, { y: BASE_H / 2, parent: root });
  blobShadow(root, 2.4, { sz: 0.85 });
  // 前面の小さな液晶（進捗バー）
  const lcd = canvasTexture(192, 72, (ctx, w, h, p = 0) => {
    ctx.fillStyle = '#23303f'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#3b4a5c'; ctx.fillRect(14, 40, w - 28, 18);
    ctx.fillStyle = '#6ee7a8'; ctx.fillRect(14, 40, (w - 28) * p, 18);
    ctx.font = `900 28px ${FONT}`; ctx.fillStyle = '#6ee7a8'; ctx.textBaseline = 'middle';
    ctx.fillText(p >= 1 ? '完成' : `${Math.round(p * 100)}%`, 16, 20);
  });
  mesh(G.box(0.78, 0.26, 0.06, 0.03), 0x3b4a5c, { x: -0.9, y: BASE_H / 2, z: 1.35, parent: root });
  mesh(G.plane(0.68, 0.2), new THREE.MeshBasicMaterial({ map: lcd.tex }), { x: -0.9, y: BASE_H / 2, z: 1.385, line: false, parent: root });
  mesh(G.puck(0.1, 0.08, 0.03), 0xef5b5b, { x: 1.05, y: BASE_H / 2, z: 1.37, rx: Math.PI / 2, parent: root });

  // 支柱と上梁
  const POST_X = 1.62, TOP_Y = 2.0;
  for (const sx of [-1, 1]) {
    mesh(G.box(0.22, TOP_Y - BASE_H, 0.3, 0.07), FRAME, { x: sx * POST_X, y: BASE_H + (TOP_Y - BASE_H) / 2, z: -0.1, parent: root });
  }
  mesh(G.box(POST_X * 2 + 0.32, 0.22, 0.36, 0.08), FRAME, { y: TOP_Y + 0.06, z: -0.1, parent: root });
  // フィラメントのリール（上に載っている）
  const spool = group(root, { x: POST_X + 0.28, y: 1.35, z: -0.1, rz: Math.PI / 2 });
  mesh(G.puck(0.32, 0.04, 0.015), WHITE, { y: 0.11, parent: spool });
  mesh(G.puck(0.32, 0.04, 0.015), WHITE, { y: -0.11, parent: spool });
  mesh(G.cyl(0.26, 0.26, 0.2, 28), AMBER, { parent: spool });
  mesh(G.cyl(0.07, 0.07, 0.07, 16), 0x8797ab, { y: 0.15, parent: spool, px: 1.4 });

  // ---- ベッド（前後に動く）
  const bed = group(root, { y: BASE_H });
  mesh(G.box(2.6, 0.08, 1.85, 0.04), 0x3f4d5f, { y: 0.04, parent: bed });
  const BED_TOP = 0.08;

  // ---- トレイ（3×2 の仕切り）
  const TW = 2.05, TD = 1.34, TH = 0.36, WALL = 0.085, CR = 0.2, FLOOR = 0.07, DIV = 0.065;
  const tray = group(bed, { y: BED_TOP });
  // 積層の縞テクスチャ
  const stripe = canvasTexture(4, 16, (ctx, w, h) => {
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#f0dcc0'; ctx.fillRect(0, 12, w, 4);
  });
  stripe.tex.wrapS = stripe.tex.wrapT = THREE.RepeatWrapping;
  stripe.tex.repeat.set(1, 1 / 0.06);
  const wallMat = new THREE.MeshToonMaterial({ color: AMBER, map: stripe.tex, gradientMap: toon(AMBER).gradientMap });
  const outer = rr(TW, TD, CR);
  outer.holes.push(rr(TW - WALL * 2, TD - WALL * 2, CR - WALL, 0, 0, new THREE.Path()));
  const floorM = mesh(extrudeUp(rr(TW - 0.02, TD - 0.02, CR - 0.01), FLOOR), AMBER_F, { parent: tray, line: false });
  const wallG = group(tray);
  mesh(extrudeUp(outer, TH), wallMat, { parent: wallG });
  const IW = TW - WALL * 2, ID = TD - WALL * 2;
  const divH = TH - 0.04;
  const divs = group(tray);
  for (const x of [-IW / 6, IW / 6]) mesh(G.box(DIV, divH, ID + 0.02, 0.02), AMBER_D, { x, y: divH / 2, parent: divs });
  mesh(G.box(IW + 0.02, divH - 0.005, DIV, 0.02), AMBER_D, { y: (divH - 0.005) / 2, parent: divs });
  // 仕切りの中の床（少し濃い）
  const pocketX = [-IW / 3, 0, IW / 3], pocketZ = [-ID / 4, ID / 4];

  // ---- プリントヘッド
  const gantry = group(root);
  mesh(G.box(POST_X * 2 + 0.05, 0.13, 0.18, 0.05), 0x8797ab, { z: -0.1, parent: gantry });
  const head = group(gantry);
  mesh(G.box(0.5, 0.42, 0.42, 0.1), WHITE, { y: 0.1, z: 0.0, parent: head });
  mesh(G.circle(0.13, 24), flat(0x2b3542), { y: 0.12, z: 0.215, line: false, parent: head });
  mesh(G.puck(0.05, 0.02, 0.008), 0x9aa8b8, { y: 0.12, z: 0.222, rx: Math.PI / 2, line: false, parent: head });
  mesh(G.box(0.24, 0.14, 0.24, 0.03), 0x8797ab, { y: -0.17, parent: head });
  mesh(G.cone(0.075, 0.14, 16), 0xe0a526, { y: -0.3, rx: Math.PI, parent: head, px: 1.4 });
  const tipMat = new THREE.MeshBasicMaterial({ color: 0xffb347, transparent: true, opacity: 0.9 });
  const tip = mesh(G.sphere(0.045, 12, 8), tipMat, { y: -0.38, parent: head, line: false });
  const NOZ = 0.4; // ヘッド原点からノズル先端まで

  // ---- 小物
  const items = [];
  function item(ix, iz, delay) {
    const g = group(tray, { x: pocketX[ix], z: pocketZ[iz] });
    const inner = group(g);
    items.push({ g, inner, delay });
    return inner;
  }
  const FLOOR_Y = FLOOR;
  // えんぴつ 3 本（奥左）
  const pen = item(0, 0, 0.0);
  const pencilBody = G.cyl(0.055, 0.055, 0.78, 6);
  const pencilWood = G.cone(0.055, 0.14, 6);
  const pencilLead = G.cone(0.02, 0.05, 8);
  [[0xef5b5b, -0.14, 0.02, 0.1], [0x3b82f6, 0.0, -0.08, -0.03], [0x22a861, 0.14, 0.04, -0.14]].forEach(([c, x, z, tilt], i) => {
    const p = group(pen, { x, z, rz: tilt, rx: (i - 1) * 0.08 });
    mesh(pencilBody, c, { y: FLOOR_Y + 0.39, parent: p, px: 1.5 });
    mesh(pencilWood, 0xf5d7a1, { y: FLOOR_Y + 0.85, parent: p, px: 1.5 });
    mesh(pencilLead, 0x3a3a3a, { y: FLOOR_Y + 0.945, parent: p, line: false });
  });
  // SD カード 3 枚（奥中）
  const sd = item(1, 0, 0.3);
  const sdGeo = G.box(0.32, 0.4, 0.035, 0.02);
  const sdLbl = G.plane(0.26, 0.2);
  const sdTex = canvasTexture(128, 96, (ctx, w, h) => {
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#2563eb'; ctx.font = `900 50px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('SD', w / 2, h / 2 + 3);
  });
  [-0.13, 0.0, 0.13].forEach((z, i) => {
    const c = group(sd, { z, x: (i - 1) * 0.03, rx: -0.12 });
    mesh(sdGeo, 0x2563eb, { y: FLOOR_Y + 0.2, parent: c, px: 1.4 });
    mesh(sdLbl, new THREE.MeshBasicMaterial({ map: sdTex.tex }), { y: FLOOR_Y + 0.22, z: 0.019, parent: c, line: false });
  });
  // ふせん（奥右）
  const note = item(2, 0, 0.6);
  mesh(G.box(0.4, 0.3, 0.4, 0.03), 0xffe066, { y: FLOOR_Y + 0.15, ry: 0.2, parent: note, px: 1.5 });
  mesh(G.box(0.4, 0.04, 0.4, 0.015), 0xff9fb2, { y: FLOOR_Y + 0.32, ry: 0.2, parent: note, px: 1.4 });
  // 消しゴム（手前左）
  const er = item(0, 1, 0.9);
  const erG = group(er, { ry: -0.35 });
  mesh(G.box(0.42, 0.16, 0.22, 0.04), 0xffffff, { y: FLOOR_Y + 0.08, parent: erG, px: 1.5 });
  mesh(G.box(0.24, 0.175, 0.235, 0.02), 0x3b82f6, { x: 0.06, y: FLOOR_Y + 0.08, parent: erG, px: 1.4 });
  // クリップ（手前中）
  const clipPts = [];
  {
    const L = 0.34, r1 = 0.07, r2 = 0.05, r3 = 0.035;
    // 簡単なゼムクリップの曲線（xz 平面）
    const P = [];
    const arc = (cx, cz, r, a0, a1, n = 8) => { for (let i = 0; i <= n; i++) { const a = lerp(a0, a1, i / n); P.push([cx + Math.cos(a) * r, 0, cz + Math.sin(a) * r]); } };
    P.push([L / 2 - 0.06, 0, -r3]);
    arc(-L / 2 + 0.05, 0, r3, -Math.PI / 2, -Math.PI * 1.5, 8);
    P.push([L / 2 - 0.02, 0, r3]);
    arc(L / 2 - 0.02, 0, r1 - 0.0, Math.PI / 2, -Math.PI / 2, 8);
    P.push([-L / 2 + 0.02, 0, -r1]);
    arc(-L / 2 + 0.02, -r1 + r2, r2, -Math.PI / 2, -Math.PI * 1.5, 6);
    P.push([0.02, 0, -r1 + r2 * 2]);
    clipPts.push(...P);
  }
  const clipGeo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(clipPts.map(p => new THREE.Vector3(...p))), 80, 0.016, 6, false);
  const clip = item(1, 1, 1.2);
  [[0xa3b1c2, -0.06, -0.08, 0.3], [0xef5b5b, 0.05, 0.06, -0.4], [0x22a861, 0.0, 0.14, 1.2]].forEach(([c, x, z, ry], i) => {
    mesh(clipGeo, c, { x, z, y: FLOOR_Y + 0.02 + i * 0.03, ry, parent: clip, px: 1.1 });
  });
  // マステ（手前右）
  const tape = item(2, 1, 1.5);
  const tapeG = group(tape, { y: FLOOR_Y + 0.2, ry: 0.5 });
  mesh(G.cyl(0.2, 0.2, 0.13, 28), 0xf472b6, { rx: Math.PI / 2, parent: tapeG, px: 1.5 });
  mesh(G.cyl(0.11, 0.11, 0.135, 20), 0xfbe3c8, { rx: Math.PI / 2, parent: tapeG, line: false });

  // ---- キラキラ
  const sparks = [];
  const starGeo = G.extrude(starShape(0.16, 0.07), 0.03, 0.01);
  const R = rand(11);
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + R() * 0.3;
    const m = mesh(starGeo, [0xffd23f, 0xffffff, 0x6ee7a8][i % 3], { parent: root, px: 1.4 });
    sparks.push({ m, a, r: 1.25 + R() * 0.35, y: 0.9 + R() * 0.7, d: R() * 0.3 });
  }

  // ---- タイミング
  const P0 = 0.45, P1 = 3.85;    // 印刷
  const LAYERS = 9;
  const DROP0 = 4.35;            // 小物が落ちる
  const SPARK = 6.5;
  const OUT0 = 7.75, OUT1 = 8.35; // トレイが消える
  const HOME_X = -0.85;

  function bounceDrop(u) {
    // 0→1 で上から落ちて 2 回弾む（戻り値: 高さ係数 1→0）
    u = clamp(u);
    if (u < 0.5) { const k = u / 0.5; return 1 - k * k; }
    if (u < 0.78) { const k = (u - 0.64) / 0.14; return 0.16 * (1 - k * k); }
    const k = (u - 0.89) / 0.11; return Math.max(0, 0.05 * (1 - k * k));
  }

  let lastP = -1;
  function update(t) {
    // 印刷の進み
    const pr = seg(t, P0, P1, x => x);
    const layer = Math.min(LAYERS, Math.floor(pr * LAYERS + 1e-6));
    const layerFrac = pr * LAYERS - layer;
    const out = seg(t, OUT0, OUT1, x => x * x);
    const shown = t >= P0 && t < OUT1;

    // トレイの高さ（1 層ずつ）
    const hk = t >= P1 ? 1 : layer / LAYERS;
    floorM.visible = shown && pr > 0.02;
    wallG.visible = divs.visible = shown && hk > 0;
    const sy = Math.max(0.001, hk);
    wallG.scale.y = sy; divs.scale.y = sy;
    tray.scale.setScalar(Math.max(0.001, 1 - out));

    // ベッドは印刷中だけ前後に揺れる
    const env = seg(t, P0, P0 + 0.3) * (1 - seg(t, P1 - 0.3, P1));
    bed.position.z = env * 0.32 * Math.sin((t - P0) * 5.2);

    // ヘッド
    let hx, hy;
    const printY = BASE_H + BED_TOP + TH * hk + NOZ + 0.02;
    const lowY = BASE_H + BED_TOP + NOZ + 0.04;
    const upY = TOP_Y - 0.5;
    if (t < P0) { hx = HOME_X; hy = lowY; }
    else if (t < P1) {
      // 1 層ごとに左右を往復
      const dir = layer % 2 === 0 ? 1 : -1;
      hx = dir * lerp(-0.85, 0.85, smooth(layerFrac));
      hy = BASE_H + BED_TOP + TH * (layer / LAYERS) + NOZ + 0.02;
    } else if (t < OUT1) {
      const k = seg(t, P1, P1 + 0.6);
      hx = lerp(0.85, 1.22, k);
      hy = lerp(printY, upY, k);
    } else {
      const k = seg(t, OUT1, DUR - 0.05);
      hx = lerp(1.22, HOME_X, k);
      hy = lerp(upY, lowY, k);
    }
    gantry.position.y = hy;
    head.position.x = hx;
    const printing = t > P0 && t < P1;
    tip.visible = printing;
    tip.scale.setScalar(printing ? 0.8 + 0.3 * Math.sin(t * 30) : 1);

    // 液晶
    const pv = Math.round(pr * 20) / 20;
    if (pv !== lastP) { lcd.redraw(t >= OUT1 ? 0 : pv); lastP = pv; }

    // 小物が落ちてくる
    for (const it of items) {
      const u = (t - DROP0 - it.delay) / 0.75;
      const vis = u > 0 && t < OUT1;
      it.g.visible = vis;
      if (!vis) continue;
      const h = bounceDrop(u);
      it.inner.position.y = h * 1.15;
      const land = u > 0.5 ? bump(u, 0.5, 0.64) : 0;
      it.inner.scale.set(1 + land * 0.12, 1 - land * 0.18, 1 + land * 0.12);
    }

    // キラキラ
    for (const s of sparks) {
      const k = (t - SPARK - s.d) / 1.1;
      const on = k > 0 && k < 1;
      s.m.visible = on;
      if (!on) continue;
      const sc = Math.sin(k * Math.PI) * 1.1;
      s.m.scale.setScalar(Math.max(0.001, sc));
      const rr2 = s.r + k * 0.25;
      s.m.position.set(Math.cos(s.a) * rr2, BASE_H + s.y + k * 0.3, Math.sin(s.a) * rr2 * 0.75 + 0.1);
      s.m.quaternion.copy(camera.quaternion);
      s.m.rotateZ(k * 2.5);
    }
  }

  return { scene, camera, update, duration: DUR };
});
