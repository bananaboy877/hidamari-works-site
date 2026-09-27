// 画像縁取り／色変換: 透明チェックの上のネコのシルエット → 白いフチが生えてステッカーに
//   → ローラーで色がオレンジ→黒→青に変わる → ペリッとはがれて宙返り → 次のネコ
import { THREE, defineScene, stage, mesh, group, G, toon, canvasTexture, blobShadow, starShape, renderer,
  clamp, lerp, seg, bump, smooth, easeOutBack, easeOutCubic, easeInCubic, rand } from '../engine.js';

defineScene('image-outline', () => {
  const { scene, camera, root } = stage({ fov: 30, pos: [0, 6.1, 5.0], target: [0, 0.15, 0.12], light: [3, 9, 5] });
  const DUR = 8.5;
  renderer.localClippingEnabled = true;

  const C_ORANGE = 0xd97c2a, C_BLACK = 0x33302e, C_BLUE = 0x3f7fe0;
  const DMAX = 0.15;              // 縁取りの太さ
  const CAT_T = 0.08, WHITE_T = 0.05;

  // ---- 透明チェックのマット
  const MW = 3.7, MD = 3.0;
  const checker = canvasTexture(512, 416, (ctx, w, h) => {
    const n = 32;
    for (let y = 0; y < h; y += n) for (let x = 0; x < w; x += n) {
      ctx.fillStyle = ((x + y) / n) % 2 ? '#dfe4ea' : '#ffffff';
      ctx.fillRect(x, y, n, n);
    }
  });
  mesh(G.box(MW, 0.14, MD, 0.07), 0x8e9aab, { y: -0.07, parent: root });
  mesh(G.plane(MW - 0.1, MD - 0.1), new THREE.MeshToonMaterial({ map: checker.tex }), { rx: -Math.PI / 2, y: 0.002, line: false, parent: root });
  blobShadow(root, 2.8, { y: -0.14, sz: 0.8 });

  // ---- ネコのシルエット（パーツごとに「d だけ太らせた」形を作れる）
  function ellipseShape(rx, ry) { const s = new THREE.Shape(); s.absellipse(0, 0, rx, ry, 0, Math.PI * 2, false, 0); return s; }
  function roundTri(pts, rr) {
    // 凸多角形（CCW）を半径 rr で丸めた形（= 多角形 ⊕ 円）
    const s = new THREE.Shape();
    const n = pts.length;
    for (let i = 0; i < n; i++) {
      const p = pts[(i - 1 + n) % n], c = pts[i], q = pts[(i + 1) % n];
      const a0 = Math.atan2(-(c[0] - p[0]), c[1] - p[1]);
      let a1 = Math.atan2(-(q[0] - c[0]), q[1] - c[1]);
      while (a1 < a0) a1 += Math.PI * 2;
      s.absarc(c[0], c[1], rr, a0, a1, false);
    }
    s.closePath();
    return s;
  }
  function arcStroke(R, hw, a0, a1) {
    const s = new THREE.Shape();
    s.absarc(0, 0, R + hw, a0, a1, false);
    s.absarc(Math.cos(a1) * R, Math.sin(a1) * R, hw, a1, a1 + Math.PI, false);
    s.absarc(0, 0, R - hw, a1, a0, true);
    s.absarc(Math.cos(a0) * R, Math.sin(a0) * R, hw, a0 + Math.PI, a0 + Math.PI * 2, false);
    return s;
  }
  const earL = [[-0.2, -0.16], [0.14, -0.1], [0.0, 0.26]]; // CCW, 重心付近を原点に
  const earR = earL.map(([x, y]) => [-x, y]).reverse();
  const PARTS = [
    { c: [0, 0.58], size: 0.62, shape: (d) => ellipseShape(0.6 + d, 0.66 + d) },           // 胴
    { c: [0, 1.4], size: 0.5, shape: (d) => ellipseShape(0.52 + d, 0.46 + d) },            // 頭
    { c: [-0.34, 1.78], size: 0.2, shape: (d) => roundTri(earL, 0.06 + d) },               // 耳
    { c: [0.34, 1.78], size: 0.2, shape: (d) => roundTri(earR, 0.06 + d) },
    { c: [-0.26, 0.0], size: 0.19, shape: (d) => ellipseShape(0.21 + d, 0.15 + d) },       // 足
    { c: [0.26, 0.0], size: 0.19, shape: (d) => ellipseShape(0.21 + d, 0.15 + d) },
    { c: [0.72, 0.42], size: 0.42, shape: (d) => arcStroke(0.4, 0.1 + d, -1.95, 0.95) },   // しっぽ
  ];
  const CAT_CX = 0.2, CAT_CY = 0.92;     // シルエット中心（ここがステッカーの原点）

  // ステッカー全体: peel(左端で持ち上げる) > sticker
  const peel = group(root, { x: -1.05 });
  const sticker = group(peel, { x: 1.05 });
  const stickerSpin = group(sticker);
  const cat = group(stickerSpin);        // シルエット形状は XY、寝かせて使う
  cat.rotation.x = -Math.PI / 2;

  const planeA = new THREE.Plane(new THREE.Vector3(1, 0, 0), 100);
  const planeB = new THREE.Plane(new THREE.Vector3(-1, 0, 0), -100);
  const matA = toon(C_ORANGE, { unique: true }); matA.clippingPlanes = [planeA];
  const matB = toon(C_BLACK, { unique: true }); matB.clippingPlanes = [planeB];
  const whiteMat = toon(0xffffff);
  const whites = [];
  const catB = [];
  for (const P of PARTS) {
    const x = P.c[0] - CAT_CX, y = P.c[1] - CAT_CY;
    const g = G.extrude(P.shape(0), CAT_T, 0.02, 20);
    mesh(g, matA, { x, y, z: WHITE_T + CAT_T / 2 + 0.01, parent: cat, px: 2.2 });
    catB.push(mesh(g, matB, { x, y, z: WHITE_T + CAT_T / 2 + 0.01, parent: cat, px: 2.2 }));
    const wg = G.extrude(P.shape(DMAX), WHITE_T, 0.015, 20);
    const w = mesh(wg, whiteMat, { x, y, z: WHITE_T / 2 + 0.01, parent: cat, px: 2.2 });
    whites.push({ m: w, sMin: P.size / (P.size + DMAX) });
  }
  const stickerShadow = blobShadow(root, 1.5, { sz: 1.15 });

  // ---- ペンキローラー
  const roller = group(root);
  const RR = 0.17, RLEN = 2.55;
  const rollHead = group(roller);
  const rollMat = toon(C_BLACK, { unique: true });
  mesh(G.capsule(RR, RLEN - RR * 2, 6, 20), rollMat, { rx: Math.PI / 2, parent: rollHead, px: 2 });
  mesh(G.cyl(0.035, 0.035, RLEN + 0.2, 10), 0x9aa6b5, { rx: Math.PI / 2, parent: roller, px: 1.4 });
  const frame = G.tube([[0, 0, RLEN / 2 + 0.1], [0, 0.22, RLEN / 2 + 0.3], [0, 0.55, RLEN / 2 + 0.45], [0, 0.85, RLEN / 2 + 0.55]], 0.035, 24);
  mesh(frame, 0x9aa6b5, { parent: roller, px: 1.4 });
  mesh(G.capsule(0.09, 0.42, 6, 14), 0xf2c94c, { x: 0, y: 1.08, z: RLEN / 2 + 0.66, rx: 0.6, parent: roller, px: 1.8 });
  const rollerShadow = blobShadow(root, 0.9, { sx: 0.5, sz: 1.6 });

  // ---- キラキラ
  const sparkGeo = G.extrude(starShape(0.1, 0.045), 0.02, 0.008);
  const sparks = [];
  const R = rand(5);
  for (let i = 0; i < 10; i++) {
    const m = mesh(sparkGeo, [0xffd23f, 0xffffff, 0x7cc8ff][i % 3], { parent: root, px: 1.2 });
    sparks.push({ m, a: (i / 10) * Math.PI * 2 + R() * 0.4, r: 1.2 + R() * 0.35, d: R() * 0.2 });
  }
  function sparkle(t0, t, cx, cy, cz, sc = 1) {
    const st = t - t0;
    for (const s of sparks) {
      const tt = st - s.d;
      if (!(tt > 0 && tt < 1.1)) continue;
      s.m.visible = true;
      const k = easeOutCubic(tt / 1.1);
      const rr = s.r * (0.75 + 0.35 * k) * sc;
      s.m.position.set(cx + Math.cos(s.a) * rr * 1.1, cy + 0.3 + k * 0.3, cz + Math.sin(s.a) * rr * 0.85);
      s.m.quaternion.copy(camera.quaternion);
      s.m.rotateZ(tt * 4);
      s.m.scale.setScalar(Math.max(0.001, bump(tt, 0, 1.1) * 1.3));
    }
  }

  // タイムライン
  const GROW0 = 0.5, GROWD = 0.6;
  const SW1 = 1.65, SW2 = 3.05, SWD = 1.0;
  const PEEL0 = 4.45, PEELD = 0.5;
  const LIFT0 = 4.85, LIFTD = 0.8;
  const AWAY0 = 6.45, AWAYD = 0.7;
  const NEW0 = 7.3, NEWD = 0.55;
  const X0 = -1.45, X1 = 1.55;           // ローラーの転がる範囲
  const REST_Y = 3.4;

  function rollerPose(t) {
    // [x, y, visible, color]
    const pass = (a, fromX, toX, color) => {
      const kin = seg(t, a - 0.35, a, easeOutCubic);
      const k = seg(t, a, a + SWD, smooth);
      const kout = seg(t, a + SWD, a + SWD + 0.35, easeInCubic);
      return { x: lerp(fromX, toX, k), y: lerp(REST_Y, 0, kin) + lerp(0, REST_Y, kout), color, sx: lerp(fromX, toX, k), k };
    };
    if (t < SW1 + SWD + 0.4) return pass(SW1, X0, X1, C_BLACK);
    return pass(SW2, X1, X0, C_BLUE);
  }

  function update(t) {
    for (const s of sparks) s.m.visible = false;

    // ---- 色（A = 今の色、B = 塗られていく色）
    let colA = C_ORANGE, colB = C_BLACK, cutX = null, bLeft = true;
    const P = rollerPose(t);
    if (t < SW1) colA = C_ORANGE;
    else if (t < SW1 + SWD) { colA = C_ORANGE; colB = C_BLACK; cutX = P.sx; bLeft = true; }
    else if (t < SW2) colA = C_BLACK;
    else if (t < SW2 + SWD) { colA = C_BLACK; colB = C_BLUE; cutX = P.sx; bLeft = false; }
    else if (t < NEW0) colA = C_BLUE;
    else colA = C_ORANGE;
    matA.color.setHex(colA);
    matB.color.setHex(colB);
    rollMat.color.setHex(P.color);
    if (cutX === null) {
      planeA.set(new THREE.Vector3(1, 0, 0), 100);
      catB.forEach(m => { m.visible = false; });
    } else {
      catB.forEach(m => { m.visible = true; });
      if (bLeft) { planeA.set(new THREE.Vector3(1, 0, 0), -cutX); planeB.set(new THREE.Vector3(-1, 0, 0), cutX); }
      else { planeA.set(new THREE.Vector3(-1, 0, 0), cutX); planeB.set(new THREE.Vector3(1, 0, 0), -cutX); }
    }

    // ---- ローラー
    roller.visible = P.y < REST_Y - 0.01;
    rollerShadow.visible = roller.visible;
    const RY = WHITE_T + CAT_T + 0.02 + RR;
    roller.position.set(P.x, RY + P.y, 0.05);
    rollHead.rotation.z = -P.x / RR;
    rollerShadow.position.set(P.x, 0.012, 0.05);
    rollerShadow.material.opacity = clamp(1 - P.y / 1.5);

    // ---- 縁取りが生える
    const newK = seg(t, NEW0, NEW0 + NEWD, easeOutBack);
    const g = t >= NEW0 ? 0 : seg(t, GROW0, GROW0 + GROWD, easeOutBack);
    for (const W of whites) {
      W.m.visible = g > 0.01;
      W.m.scale.setScalar(Math.max(0.001, lerp(W.sMin, 1, g)));
      W.m.scale.z = 1;
    }
    if (t < GROW0 + 1.2) sparkle(GROW0 + 0.35, t, 0, 0.2, 0.1);

    // ---- はがれて宙返り → 飛んでいく
    const pk = seg(t, PEEL0, PEEL0 + PEELD, smooth) * (1 - seg(t, LIFT0, LIFT0 + 0.4));
    peel.rotation.z = pk * 0.55;
    const fresh = t >= NEW0;
    const lk = fresh ? 0 : seg(t, LIFT0, LIFT0 + LIFTD, easeOutBack);
    const ak = fresh ? 0 : seg(t, AWAY0, AWAY0 + AWAYD, easeInCubic);
    const hold = t > LIFT0 + LIFTD && t < AWAY0 ? Math.sin((t - LIFT0 - LIFTD) * 3.2) * 0.06 : 0;
    sticker.position.set(1.05 + ak * 1.4, lerp(0, 0.75, lk) + hold + ak * 3.0, lerp(0, 0.2, lk) - ak * 0.6);
    sticker.rotation.set(lerp(0, 0.55, lk), 0, -0.12 * lk - 0.5 * ak);
    // ネコの縦軸まわりにくるっと回って裏（白）を見せる
    stickerSpin.rotation.z = fresh ? 0 : seg(t, LIFT0 + 0.1, LIFT0 + 1.3, smooth) * Math.PI * 2;
    const alive = t < AWAY0 + AWAYD;
    const sc = t >= NEW0 ? newK : (alive ? 1 : 0);
    sticker.visible = sc > 0.002;
    sticker.scale.setScalar(Math.max(0.001, sc));
    if (t >= AWAY0 + AWAYD && t < NEW0) sticker.visible = false;
    if (t > LIFT0 + 0.5 && t < LIFT0 + 1.9) sparkle(LIFT0 + 0.6, t, 0.05, 0.7, 0.25, 1.05);
    stickerShadow.position.set(0.05, 0.012, 0.05);
    stickerShadow.visible = sticker.visible;
    stickerShadow.material.opacity = clamp(1 - lk * 0.6 - ak) * (t >= NEW0 ? newK : 1);
    stickerShadow.scale.setScalar(Math.max(0.001, 1 - 0.3 * lk));
  }

  return { scene, camera, update, duration: DUR };
});
