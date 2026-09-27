// 画像トリミング: 白い紙のまん中にりんご → オレンジの点線枠がキュッと縮む → 白い余白が落ちる → 切り出したカードが ✓ でポップ
import { THREE, defineScene, stage, mesh, group, G, flat, canvasTexture, blobShadow, starShape, FONT,
  clamp, lerp, seg, bump, smooth, easeOutBack, easeOutCubic, easeInCubic, rand } from '../engine.js';

defineScene('image-trimmer', () => {
  const { scene, camera, root } = stage({ fov: 30, pos: [0, 5.2, 4.6], target: [0, 0.1, 0.15], light: [3, 9, 5] });
  const DUR = 8;

  const ORANGE = 0xe07a3a;
  const GREEN = 0x4a8a4a;
  const INKS = '#2b2320';
  const SW = 2.8, SD = 2.1, THK = 0.04;      // 紙の幅・奥行き・厚み
  // りんご（中身）の範囲（ワールド座標）
  const AX = 0.28, AZ = 0.04, AW = 0.86, AD = 0.9;
  const CX0 = AX - AW / 2, CX1 = AX + AW / 2, CZ0 = AZ - AD / 2, CZ1 = AZ + AD / 2;

  // ---- 机
  const deskTex = canvasTexture(512, 400, (ctx, w, h) => {
    ctx.fillStyle = '#d9a86e'; ctx.fillRect(0, 0, w, h);
    const R = rand(3);
    for (let i = 0; i < 26; i++) {
      const y = R() * h;
      ctx.strokeStyle = `rgba(150,95,45,${0.12 + R() * 0.12})`; ctx.lineWidth = 2 + R() * 3;
      ctx.beginPath(); ctx.moveTo(0, y);
      ctx.bezierCurveTo(w * 0.3, y + (R() - 0.5) * 20, w * 0.7, y + (R() - 0.5) * 20, w, y + (R() - 0.5) * 10);
      ctx.stroke();
    }
  });
  const DW = 3.6, DD = 2.75;
  mesh(G.box(DW, 0.2, DD, 0.08), 0xb9824a, { y: -0.1, parent: root });
  mesh(G.plane(DW - 0.12, DD - 0.12), new THREE.MeshToonMaterial({ map: deskTex.tex }), { rx: -Math.PI / 2, y: 0.002, line: false, parent: root });
  blobShadow(root, 2.7, { y: -0.2, sz: 0.8 });

  // ---- 紙の絵（白地にりんご）
  const TXW = 1024, TXH = 768;
  const toPx = (x, z) => [(x + SW / 2) / SW * TXW, (z + SD / 2) / SD * TXH];
  const sheetTex = canvasTexture(TXW, TXH, (ctx, w, h) => {
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, w, h);
    const [px, py] = toPx(AX, AZ);
    const s = (AW / SW * TXW) / 300;   // りんご ≒ 300px 幅
    ctx.save(); ctx.translate(px, py + 12 * s); ctx.scale(s, s);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.strokeStyle = INKS; ctx.lineWidth = 9;
    // 影
    ctx.fillStyle = 'rgba(60,40,20,0.12)';
    ctx.beginPath(); ctx.ellipse(0, 118, 105, 18, 0, 0, 7); ctx.fill();
    // 実
    ctx.fillStyle = '#e8453c';
    ctx.beginPath();
    ctx.moveTo(0, -78);
    ctx.bezierCurveTo(40, -112, 128, -96, 130, -8);
    ctx.bezierCurveTo(132, 70, 72, 118, 34, 110);
    ctx.bezierCurveTo(16, 106, -16, 106, -34, 110);
    ctx.bezierCurveTo(-72, 118, -132, 70, -130, -8);
    ctx.bezierCurveTo(-128, -96, -40, -112, 0, -78);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    // ハイライト
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.beginPath(); ctx.ellipse(-70, -36, 16, 30, 0.5, 0, 7); ctx.fill();
    // ほっぺと顔
    ctx.fillStyle = '#ff9a9a';
    ctx.beginPath(); ctx.ellipse(-58, 30, 18, 11, 0, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.ellipse(58, 30, 18, 11, 0, 0, 7); ctx.fill();
    ctx.fillStyle = INKS;
    ctx.beginPath(); ctx.arc(-34, 8, 9, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(34, 8, 9, 0, 7); ctx.fill();
    ctx.lineWidth = 7;
    ctx.beginPath(); ctx.arc(0, 22, 16, 0.25, Math.PI - 0.25); ctx.stroke();
    // 軸と葉
    ctx.lineWidth = 11; ctx.strokeStyle = '#6b4226';
    ctx.beginPath(); ctx.moveTo(0, -76); ctx.quadraticCurveTo(-4, -110, 8, -132); ctx.stroke();
    ctx.lineWidth = 8; ctx.strokeStyle = INKS; ctx.fillStyle = '#5cb85c';
    ctx.beginPath(); ctx.moveTo(8, -112);
    ctx.quadraticCurveTo(46, -150, 92, -128);
    ctx.quadraticCurveTo(56, -88, 8, -112);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
  });
  sheetTex.tex.anisotropy = 8;
  const sheetMat = new THREE.MeshToonMaterial({ map: sheetTex.tex });
  const paperWhite = 0xffffff;
  // 机にぴったり寝ている紙は輪郭線シェーダーの線が机に隠れやすいので、黒い下敷きでフチを描く
  function inkUnder(w, d, parent) {
    mesh(G.box(w + 0.04, THK * 0.7, d + 0.04, 0.03), 0x2b2320, { y: -THK * 0.2, line: false, parent });
  }

  // 切る前の 1 枚
  const whole = group(root, { y: THK / 2 + 0.005 });
  mesh(G.box(SW, THK, SD, 0.02), paperWhite, { parent: whole, px: 2 });
  inkUnder(SW, SD, whole);
  mesh(G.plane(SW - 0.004, SD - 0.004), sheetMat, { rx: -Math.PI / 2, y: THK / 2 + 0.002, line: false, parent: whole });

  // 余白（4 本の帯）: [x0, x1, z0, z1, 外向き dx, dz]
  const strips = [
    [-SW / 2, SW / 2, -SD / 2, CZ0, 0, -1],
    [-SW / 2, SW / 2, CZ1, SD / 2, 0, 1],
    [-SW / 2, CX0, CZ0, CZ1, -1, 0],
    [CX1, SW / 2, CZ0, CZ1, 1, 0],
  ].map(([x0, x1, z0, z1, dx, dz], i) => {
    const g = group(root);
    mesh(G.box(x1 - x0, THK, z1 - z0, 0.015), paperWhite, { parent: g, px: 1.8 });
    inkUnder(x1 - x0, z1 - z0, g);
    const home = new THREE.Vector3((x0 + x1) / 2, THK / 2 + 0.005, (z0 + z1) / 2);
    return { g, home, dx, dz, i };
  });

  // 切り出しカード
  const CW = AW, CD = AD;
  const card = group(root);
  const cardInner = group(card);
  mesh(G.box(CW, THK, CD, 0.02), paperWhite, { parent: cardInner, px: 2 });
  inkUnder(CW, CD, cardInner);
  const cg = new THREE.PlaneGeometry(CW - 0.004, CD - 0.004);
  {
    const uv = cg.getAttribute('uv');
    const u0 = (CX0 + SW / 2) / SW, u1 = (CX1 + SW / 2) / SW;
    const v0 = 1 - (CZ1 + SD / 2) / SD, v1 = 1 - (CZ0 + SD / 2) / SD;
    for (let k = 0; k < uv.count; k++) uv.setXY(k, lerp(u0, u1, uv.getX(k)), lerp(v0, v1, uv.getY(k)));
  }
  mesh(cg, sheetMat, { rx: -Math.PI / 2, y: THK / 2 + 0.002, line: false, parent: cardInner });
  const CARD_HOME = new THREE.Vector3(AX, THK / 2 + 0.005, AZ);
  const cardShadow = blobShadow(root, 0.75);

  // ✓ バッジ
  const badge = group(cardInner, { x: CW / 2 - 0.02, y: THK / 2 + 0.05, z: -CD / 2 + 0.02 });
  mesh(G.puck(0.17, 0.07, 0.03), GREEN, { parent: badge, px: 1.8 });
  const checkTex = canvasTexture(128, 128, (ctx, w, h) => {
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 20;
    ctx.beginPath(); ctx.moveTo(30, 66); ctx.lineTo(54, 90); ctx.lineTo(98, 40); ctx.stroke();
  });
  mesh(G.plane(0.3, 0.3), new THREE.MeshBasicMaterial({ map: checkTex.tex, transparent: true }), { rx: -Math.PI / 2, y: 0.037, line: false, parent: badge });

  // ---- オレンジの点線の枠 + 角のカギ
  const NDASH = 9;
  const dashGeo = G.box(1, 1, 1, 0.3);
  const dashMat = flat(ORANGE);
  const dashes = [];
  for (let s = 0; s < 4; s++) for (let i = 0; i < NDASH; i++) {
    dashes.push({ s, i, m: mesh(dashGeo, dashMat, { parent: root, px: 1.1 }) });
  }
  const cornerGeo = G.box(1, 1, 1, 0.3);
  const corners = [];
  for (let c = 0; c < 4; c++) {
    corners.push([mesh(cornerGeo, ORANGE, { parent: root, px: 1.5 }), mesh(cornerGeo, ORANGE, { parent: root, px: 1.5 })]);
  }
  const FULL = { x0: -SW / 2 + 0.12, x1: SW / 2 - 0.12, z0: -SD / 2 + 0.12, z1: SD / 2 - 0.12 };
  const HUG = { x0: CX0, x1: CX1, z0: CZ0, z1: CZ1 };

  function placeFrame(r, y, sc) {
    const sides = [
      [r.x0, r.z0, r.x1, r.z0], [r.x1, r.z0, r.x1, r.z1],
      [r.x1, r.z1, r.x0, r.z1], [r.x0, r.z1, r.x0, r.z0],
    ];
    for (const d of dashes) {
      const [ax, az, bx, bz] = sides[d.s];
      const len = Math.hypot(bx - ax, bz - az);
      const k = (d.i + 0.5) / NDASH;
      const L = len / NDASH * 0.55;
      d.m.position.set(lerp(ax, bx, k), y, lerp(az, bz, k));
      const horiz = Math.abs(bz - az) < 1e-6;
      d.m.scale.set(horiz ? L : 0.065 * sc, 0.035 * sc, horiz ? 0.065 * sc : L);
      d.m.visible = sc > 0.01;
    }
    const cl = 0.24 * sc, ct = 0.075 * sc;
    const cs = [[r.x0, r.z0, 1, 1], [r.x1, r.z0, -1, 1], [r.x1, r.z1, -1, -1], [r.x0, r.z1, 1, -1]];
    cs.forEach(([x, z, sx, sz], c) => {
      const [a, b] = corners[c];
      a.position.set(x + sx * (cl / 2 - ct / 2), y + 0.01, z); a.scale.set(cl, 0.05 * sc, ct);
      b.position.set(x, y + 0.01, z + sz * (cl / 2 - ct / 2)); b.scale.set(ct, 0.05 * sc, cl);
      a.visible = b.visible = sc > 0.01;
    });
  }

  // ---- キラキラ
  const sparkGeo = G.extrude(starShape(0.09, 0.04), 0.02, 0.008);
  const sparks = [];
  const R = rand(21);
  for (let i = 0; i < 9; i++) {
    const m = mesh(sparkGeo, [0xffd23f, 0xffffff, 0xe07a3a][i % 3], { parent: root, px: 1.2 });
    sparks.push({ m, a: (i / 9) * Math.PI * 2 + R() * 0.5, r: 1.05 + R() * 0.3, d: R() * 0.2 });
  }

  // タイムライン
  const SNAP0 = 0.9, SNAPD = 0.7;
  const FALL0 = 1.75, FALLD = 1.25;
  const POP0 = 2.95, POPD = 0.6;
  const BADGE0 = 3.5;
  const DOWN0 = 5.55, DOWND = 0.7;
  const RET0 = 6.15, RETD = 0.8;
  const FRAME_IN = 6.95;
  const POP_POS = new THREE.Vector3(0, 1.05, 0.55);
  const POP_RX = 0.72, POP_S = 1.55;

  function update(t) {
    // 枠
    let r, fsc;
    if (t < FALL0 + 0.35) {
      const k = seg(t, SNAP0, SNAP0 + SNAPD, easeOutBack);
      r = { x0: lerp(FULL.x0, HUG.x0, k), x1: lerp(FULL.x1, HUG.x1, k), z0: lerp(FULL.z0, HUG.z0, k), z1: lerp(FULL.z1, HUG.z1, k) };
      fsc = 1 - seg(t, FALL0 + 0.1, FALL0 + 0.35);
    } else {
      r = FULL;
      fsc = seg(t, FRAME_IN, FRAME_IN + 0.45, easeOutBack);
    }
    placeFrame(r, THK + 0.03, Math.max(0.001, fsc));

    // 余白の帯
    const pieces = t >= FALL0 && t < RET0 + RETD + 0.1;
    whole.visible = !pieces;
    for (const S of strips) {
      S.g.visible = pieces;
      if (!pieces) continue;
      const d = S.i * 0.08;
      const kf = clamp((t - FALL0 - d) / FALLD);
      const kr = 1 - seg(t, RET0 + d, RET0 + d + RETD * 0.8, easeOutCubic);
      const k = t < RET0 ? kf : kr;
      const out = k < 0.45 ? 0.5 * smooth(k / 0.45) : 0.5 + (k - 0.45) * 1.3;
      const drop = -2.4 * Math.pow(clamp((k - 0.4) / 0.6), 2);
      S.g.position.set(S.home.x + S.dx * out, S.home.y + drop, S.home.z + S.dz * out);
      const tip = 1.2 * smooth(clamp((k - 0.38) / 0.62));
      S.g.rotation.set(S.dz * tip, 0, -S.dx * tip);
      const sc = 1 - seg(k, 0.6, 1);
      S.g.scale.setScalar(Math.max(0.001, sc));
      S.g.visible = sc > 0.002;
    }

    // カード
    card.visible = pieces;
    cardShadow.visible = pieces;
    if (pieces) {
      const up = seg(t, POP0, POP0 + POPD, easeOutBack) * (1 - seg(t, DOWN0, DOWN0 + DOWND, smooth));
      card.position.lerpVectors(CARD_HOME, POP_POS, up);
      // ポンポンと弾む
      const bt = t - (POP0 + POPD);
      let hopY = 0;
      if (bt > 0 && t < DOWN0) hopY = Math.abs(Math.sin(bt * 5.2)) * 0.16 * Math.exp(-bt * 1.1);
      card.position.y += hopY;
      card.rotation.set(POP_RX * up, -0.12 * up * Math.sin(Math.max(0, bt) * 2.6) * (t < DOWN0 ? 1 : 0), 0);
      const sq = 1 + 0.06 * bump(t, POP0 + POPD - 0.1, POP0 + POPD + 0.2);
      card.scale.setScalar(lerp(1, POP_S, up) * sq);
      cardShadow.position.set(card.position.x, 0.012, card.position.z - 0.1 * up);
      cardShadow.scale.setScalar(1 - 0.35 * up);
      // バッジ
      const bk = seg(t, BADGE0, BADGE0 + 0.4, easeOutBack) * (1 - seg(t, DOWN0 - 0.2, DOWN0 + 0.1));
      badge.visible = bk > 0.002;
      badge.scale.setScalar(Math.max(0.001, bk) * (1 + 0.1 * Math.sin(Math.max(0, t - BADGE0) * 6) * (1 - seg(t, BADGE0, BADGE0 + 1.5))));
      badge.rotation.y = -0.6 * (1 - seg(t, BADGE0, BADGE0 + 0.5, easeOutBack));
    }

    // キラキラ
    const st = t - BADGE0;
    for (const s of sparks) {
      const tt = st - s.d;
      const on = tt > 0 && tt < 1.1;
      s.m.visible = on;
      if (!on) continue;
      const k = easeOutCubic(tt / 1.1);
      const rr = s.r * (0.75 + 0.35 * k);
      s.m.position.set(POP_POS.x + Math.cos(s.a) * rr * 1.1, POP_POS.y + Math.sin(s.a) * rr * 0.8, POP_POS.z + 0.2);
      s.m.quaternion.copy(camera.quaternion);
      s.m.rotateZ(tt * 4);
      s.m.scale.setScalar(Math.max(0.001, bump(tt, 0, 1.1) * 1.3));
    }
  }

  return { scene, camera, update, duration: DUR };
});
