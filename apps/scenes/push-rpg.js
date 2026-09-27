// PUSH QUEST 腕立てRPG: 腕立てで下がる → チャージリングが縮む → 押し上げて斬撃 → CRITICAL! → 撃破 → 次のモンスター
import { THREE, defineScene, stage, mesh, group, G, toon, flat, canvasTexture, blobShadow, starShape, FONT,
  clamp, lerp, seg, bump, smooth, easeOutBack, easeOutCubic, rand } from '../engine.js';

defineScene('push-rpg', () => {
  const { scene, camera, root } = stage({ fov: 30, pos: [0.25, 2.85, 6.7], target: [0.0, 0.62, 0], light: [3, 8, 6] });
  const DUR = 9;
  const INKS = '#2b2320';
  const GROUND = 0.0;

  // ================================================================ dungeon floor platform
  const PW = 4.4, PD = 2.2;
  const floorTex = canvasTexture(768, 360, (ctx, w, h) => {
    ctx.fillStyle = '#3a3452'; ctx.fillRect(0, 0, w, h);
    const R = rand(11);
    const tw = w / 8, th = h / 4;
    for (let j = 0; j < 4; j++) for (let i = 0; i < 8; i++) {
      const off = (j % 2) * tw * 0.5;
      const v = 48 + Math.floor(R() * 16);
      ctx.fillStyle = `rgb(${v + 6},${v},${v + 30})`;
      ctx.fillRect(i * tw + off - tw + 5, j * th + 5, tw - 10, th - 10);
      ctx.fillRect(i * tw + off + 5, j * th + 5, tw - 10, th - 10);
    }
    ctx.strokeStyle = 'rgba(20,16,32,0.9)'; ctx.lineWidth = 8;
    for (let j = 0; j <= 4; j++) { ctx.beginPath(); ctx.moveTo(0, j * th); ctx.lineTo(w, j * th); ctx.stroke(); }
  });
  mesh(G.box(PW, 0.34, PD, 0.08), 0x2a2540, { y: GROUND - 0.17, parent: root });
  mesh(G.plane(PW - 0.08, PD - 0.08), new THREE.MeshToonMaterial({ map: floorTex.tex }), { rx: -Math.PI / 2, y: GROUND + 0.002, line: false, parent: root });
  // 前面のネオン帯（ゲームのグラデ #0f0→#0ff→#f0f）
  const neonTex = canvasTexture(512, 16, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, w, 0);
    g.addColorStop(0, '#00ff66'); g.addColorStop(0.5, '#00ffff'); g.addColorStop(1, '#ff33ff');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  });
  mesh(G.plane(PW - 0.2, 0.07), new THREE.MeshBasicMaterial({ map: neonTex.tex }), { y: GROUND - 0.12, z: PD / 2 + 0.003, line: false, parent: root });
  blobShadow(root, 3.3, { y: -0.36, sz: 0.55 });

  // 奥の石壁
  const wallC = [0x453d63, 0x3d365a, 0x4b4369];
  const brick = G.box(0.58, 0.3, 0.3, 0.06);
  for (let row = 0; row < 2; row++) {
    for (let i = 0; i < 8; i++) {
      const x = -PW / 2 + 0.34 + i * 0.6 + (row % 2) * 0.3;
      if (x > PW / 2 - 0.25) continue;
      mesh(brick, wallC[(i + row) % 3], { x, y: GROUND + 0.16 + row * 0.31, z: -PD / 2 + 0.2, parent: root, px: 1.8 });
    }
  }
  // たいまつ（ネオンの炎）
  const flames = [];
  for (const [x, c] of [[-1.95, 0xff44ff], [1.95, 0x33ffff]]) {
    const g = group(root, { x, y: GROUND, z: -PD / 2 + 0.2 });
    mesh(G.cyl(0.05, 0.07, 0.8, 12), 0x5a4a3a, { y: 0.4, parent: g, px: 1.6 });
    mesh(G.cyl(0.12, 0.07, 0.1, 14), 0x7a6a58, { y: 0.83, parent: g, px: 1.6 });
    const f = mesh(G.sphere(0.1, 16, 12), flat(c), { y: 0.96, sy: 1.5, parent: g, px: 1.6 });
    flames.push(f);
  }

  // ================================================================ FLOOR / COMBO 看板
  const signTex = canvasTexture(512, 256, (ctx, w, h, floor = 1, combo = 0) => {
    ctx.fillStyle = '#0a0a0f'; ctx.fillRect(0, 0, w, h);
    const g = ctx.createLinearGradient(0, 0, w, 0);
    g.addColorStop(0, '#00ff00'); g.addColorStop(0.5, '#00ffff'); g.addColorStop(1, '#ff00ff');
    ctx.strokeStyle = g; ctx.lineWidth = 12; ctx.strokeRect(10, 10, w - 20, h - 20);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `900 112px ${FONT}`; ctx.fillStyle = g;
    ctx.fillText(`FLOOR ${floor}`, w / 2, h * 0.4);
    ctx.font = `900 64px ${FONT}`; ctx.fillStyle = '#ffff33';
    ctx.fillText(`COMBO ${combo}`, w / 2, h * 0.76);
  });
  const sign = group(root, { x: -1.0, y: GROUND + 1.72, z: -PD / 2 + 0.2 });
  const signFace = group(sign);
  mesh(G.box(1.3, 0.68, 0.08, 0.05), 0x14121e, { parent: signFace });
  mesh(G.plane(1.2, 0.6), new THREE.MeshBasicMaterial({ map: signTex.tex }), { z: 0.045, line: false, parent: signFace });
  mesh(G.plane(1.2, 0.6), new THREE.MeshBasicMaterial({ map: signTex.tex }), { z: -0.045, ry: Math.PI, line: false, parent: signFace });
  for (const x of [-0.45, 0.45]) mesh(G.cyl(0.012, 0.012, 0.6, 6), 0x7a7098, { x, y: 0.62, parent: sign, px: 1.1 });

  // ================================================================ ヨガマット + 腕立てする人
  const FX = -1.62;                 // つま先の x
  const MAT_Y = GROUND + 0.035;
  mesh(G.box(1.7, 0.05, 0.78, 0.025), 0xff8fb8, { x: -1.18, y: GROUND + 0.012, z: 0.02, sx: 1.2, sz: 1.1, parent: root, px: 1.6 });
  blobShadow(root, 1.1, { x: -1.18, y: GROUND + 0.04, sz: 0.5 });

  const SKIN = 0xffd2b0, SHIRT = 0x4a7fe8, PANTS = 0x3b3f63, BAND = 0xff4d5e;
  const fig = group(root, { s: 1.2 }); fig.position.y = -0.2 * MAT_Y;
  const body = group(fig, { x: FX, y: MAT_Y });
  const AX = 0.1;                   // 体軸の高さ（ピボットからのオフセット）
  // 脚
  for (const z of [-0.09, 0.09]) {
    mesh(G.capsule(0.072, 0.46, 6, 14), PANTS, { x: 0.3, y: AX, z, rz: Math.PI / 2, parent: body });
    mesh(G.box(0.1, 0.13, 0.12, 0.04), 0xffffff, { x: 0.035, y: 0.06, z, parent: body, px: 1.6 });
  }
  // 胴
  mesh(G.box(0.24, 0.24, 0.32, 0.1), PANTS, { x: 0.58, y: AX + 0.01, parent: body });
  mesh(G.box(0.46, 0.27, 0.34, 0.12), SHIRT, { x: 0.86, y: AX + 0.02, parent: body });
  // 頭
  const head = group(body, { x: 1.2, y: AX + 0.1 });
  mesh(G.cyl(0.06, 0.07, 0.12, 12), SKIN, { x: -0.1, y: -0.04, rz: Math.PI / 2, parent: head, px: 1.6 });
  const headIn = group(head, { ry: -0.75 });
  mesh(G.sphere(0.2, 28, 20), SKIN, { parent: headIn });
  const hairGeo = new THREE.SphereGeometry(0.212, 28, 14, 0, Math.PI * 2, 0, Math.PI * 0.42);
  mesh(hairGeo, 0x4a3226, { rz: 0.35, parent: headIn, px: 1.8 });
  mesh(G.torus(0.203, 0.032, 8, 32), BAND, { rx: Math.PI / 2, rz: 0.0, y: 0.06, rotOrder: 0, parent: headIn, px: 1.6 }).rotation.set(Math.PI / 2 - 0.35, 0, 0, 'ZXY');
  // バンダナの結び目（後ろ）
  mesh(G.box(0.14, 0.05, 0.03, 0.015), BAND, { x: -0.25, y: 0.02, rz: -0.5, parent: headIn, px: 1.4 });
  mesh(G.box(0.12, 0.05, 0.03, 0.015), BAND, { x: -0.24, y: -0.04, rz: -0.9, parent: headIn, px: 1.4 });
  // 顔（+x 向き）
  const eyeGeo = G.sphere(0.028, 12, 10);
  for (const z of [-0.075, 0.075]) mesh(eyeGeo, 0x2b2320, { x: 0.18, y: 0.0, z, sy: 1.3, parent: headIn, line: false });
  const blushGeo = G.circle(0.03, 16);
  for (const z of [-0.11, 0.11]) {
    const b = mesh(blushGeo, flat(0xff8aa0), { x: 0.16, y: -0.06, z: z * 1.05, parent: headIn, line: false });
    b.lookAt(new THREE.Vector3(1, -0.4, z * 6));
  }
  const mouth = mesh(G.torus(0.035, 0.009, 6, 12, Math.PI), 0x2b2320, { x: 0.192, y: -0.055, ry: Math.PI / 2, rz: Math.PI, parent: headIn, line: false });

  // 腕（肩→ひじ→手 を IK で置く）
  const UA = 0.23, LA = 0.23;
  const SH = [0.98, AX + 0.07];     // 体ローカルの肩
  const upperGeo = G.capsule(0.058, UA, 6, 12);
  const lowerGeo = G.capsule(0.05, LA, 6, 12);
  const arms = [-0.2, 0.2].map(z => ({
    z,
    up: mesh(upperGeo, SHIRT, { parent: fig, px: 1.8 }),
    lo: mesh(lowerGeo, SKIN, { parent: fig, px: 1.8 }),
    hand: mesh(G.sphere(0.065, 14, 10), SKIN, { parent: fig, px: 1.6, sy: 0.7 }),
  }));
  const shoulderAt = (th) => [FX + SH[0] * Math.cos(th) - SH[1] * Math.sin(th), MAT_Y + SH[0] * Math.sin(th) + SH[1] * Math.cos(th)];
  const solveTh = (hgt) => { let a = 0, b = 0.8; for (let i = 0; i < 40; i++) { const m = (a + b) / 2; (shoulderAt(m)[1] - MAT_Y < hgt) ? a = m : b = m; } return (a + b) / 2; };
  const TH_UP = solveTh(UA + LA - 0.02);
  const TH_DN = solveTh(0.17);
  const HAND_X = shoulderAt(TH_UP)[0] + 0.02, HAND_Y = MAT_Y + 0.03;
  const Yv = new THREE.Vector3(0, 1, 0), va = new THREE.Vector3(), vb = new THREE.Vector3(), vd = new THREE.Vector3();
  function bone(m, a, b) {
    vd.subVectors(b, a);
    m.position.copy(a).addScaledVector(vd, 0.5);
    m.quaternion.setFromUnitVectors(Yv, vd.normalize());
  }
  function poseFigure(dep) {
    const th = lerp(TH_UP, TH_DN, dep);
    body.rotation.z = th;
    head.rotation.z = -th * 0.7 + 0.15;
    const [sx, sy] = shoulderAt(th);
    for (const a of arms) {
      const hx = HAND_X, hy = HAND_Y;
      let dx = hx - sx, dy = hy - sy;
      let d = Math.hypot(dx, dy);
      const dd = Math.min(d, UA + LA - 1e-4);
      const ux = dx / d, uy = dy / d;
      const xk = (UA * UA - LA * LA + dd * dd) / (2 * dd);
      const hk = Math.sqrt(Math.max(0, UA * UA - xk * xk));
      const ex = sx + ux * xk + uy * hk, ey = sy + uy * xk - ux * hk;
      va.set(sx, sy, a.z * 0.8); vb.set(ex, ey, a.z * 0.95);
      bone(a.up, va, vb);
      va.set(hx, hy, a.z);
      bone(a.lo, vb, va);
      a.hand.position.set(hx + 0.02, hy, a.z);
    }
  }

  // ================================================================ モンスター
  function glowSprite(color, r) {
    const tex = canvasTexture(128, 128, (ctx, w, h) => {
      const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
      g.addColorStop(0, color + 'aa'); g.addColorStop(0.5, color + '44'); g.addColorStop(1, color + '00');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    }).tex;
    return new THREE.Mesh(G.plane(r * 2, r * 2), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
  }
  const whiteEye = G.sphere(0.075, 16, 12), pupil = G.sphere(0.04, 12, 10);
  function eyes(parent, y, z, sep, look = -0.35) {
    for (const s of [-1, 1]) {
      const e = mesh(whiteEye, 0xffffff, { x: s * sep, y, z, sz: 0.6, parent, px: 1.6 });
      mesh(pupil, 0x14121e, { x: look * 0.09, y: 0.0, z: 0.05, parent: e, line: false, sz: 1.2 });
    }
  }
  function hpBar(parent, y) {
    const g = group(parent, { y });
    mesh(G.box(0.86, 0.15, 0.06, 0.05), 0x14121e, { parent: g, px: 1.8 });
    const fillGeo = G.box(0.76, 0.08, 0.05, 0.03); fillGeo.translate(0.38, 0, 0);
    const mat = toon(0x33ff66, { unique: true });
    const fill = mesh(fillGeo, mat, { x: -0.38, z: 0.02, parent: g, line: false });
    return { g, fill, mat };
  }
  const MX = 1.25;                    // モンスターの x

  // スライム（緑のぷるぷる）
  const slime = group(root, { x: MX, y: GROUND, z: 0.1 }); const MS = 1.15;
  const slimeBody = group(slime);
  const slimeMat = toon(0x22ee44, { unique: true, emissive: new THREE.Color(0x0a3a12) });
  const slimeGeo = G.lathe([[0, 0], [0.4, 0.02], [0.47, 0.1], [0.44, 0.26], [0.33, 0.43], [0.16, 0.56], [0.05, 0.64], [0, 0.66]], 36);
  const slimeInner = group(slimeBody, { ry: -0.35 });
  mesh(slimeGeo, slimeMat, { parent: slimeInner, px: 2.4 });
  mesh(G.sphere(0.07, 12, 10), flat(0xd8ffe0), { x: -0.2, y: 0.42, z: 0.26, sx: 0.8, sy: 1.3, parent: slimeInner, line: false });
  eyes(slimeInner, 0.3, 0.36, 0.13);
  mesh(G.torus(0.06, 0.014, 6, 14, Math.PI), 0x14121e, { y: 0.17, z: 0.42, rz: Math.PI, parent: slimeInner, line: false });
  const slimeGlow = glowSprite('#33ff66', 0.95); slimeGlow.position.set(0, 0.35, -0.35); slime.add(slimeGlow);
  const slimeShadow = blobShadow(slime, 0.55, { y: 0.01 });
  const slimeHP = hpBar(slime, 0.98);
  slime.scale.setScalar(MS);

  // ゴブリン（オレンジ）
  const gob = group(root, { x: MX, y: GROUND, z: 0.1 });
  const gobBody = group(gob);
  const gobIn = group(gobBody, { ry: -0.4 });
  const gobMat = toon(0xff8a1a, { unique: true, emissive: new THREE.Color(0x3a1800) });
  mesh(G.capsule(0.07, 0.14, 4, 12), gobMat, { x: -0.11, y: 0.12, parent: gobIn });
  mesh(G.capsule(0.07, 0.14, 4, 12), gobMat, { x: 0.11, y: 0.12, parent: gobIn });
  mesh(G.sphere(0.26, 24, 16), gobMat, { y: 0.38, sy: 0.9, parent: gobIn });
  mesh(G.cyl(0.28, 0.24, 0.12, 20), 0x7a4a2a, { y: 0.26, parent: gobIn, px: 1.8 });   // 腰布
  mesh(G.sphere(0.27, 24, 16), gobMat, { y: 0.78, parent: gobIn });
  const earGeo = G.cone(0.1, 0.34, 12);
  mesh(earGeo, gobMat, { x: -0.3, y: 0.84, rz: Math.PI / 2 + 0.35, parent: gobIn });
  mesh(earGeo, gobMat, { x: 0.3, y: 0.84, rz: -Math.PI / 2 - 0.35, parent: gobIn });
  eyes(gobIn, 0.82, 0.22, 0.1);
  for (const s of [-1, 1]) mesh(G.box(0.12, 0.035, 0.03, 0.012), 0x14121e, { x: s * 0.1, y: 0.93, z: 0.24, rz: s * 0.4, parent: gobIn, line: false });
  mesh(G.box(0.2, 0.06, 0.04, 0.02), 0x5a1a10, { y: 0.66, z: 0.24, parent: gobIn, px: 1.4 });
  for (const s of [-1, 1]) mesh(G.cone(0.02, 0.05, 6), 0xffffff, { x: s * 0.06, y: 0.68, z: 0.26, parent: gobIn, line: false });
  mesh(G.sphere(0.05, 12, 10), 0xff9f45, { y: 0.76, z: 0.27, parent: gobIn, px: 1.4 });
  // こん棒
  const club = group(gobIn, { x: -0.3, y: 0.36, z: 0.12, rz: 0.9 });
  mesh(G.sphere(0.07, 12, 10), gobMat, { parent: club, px: 1.6 });
  mesh(G.cyl(0.09, 0.04, 0.46, 12), 0x9a6a3a, { y: 0.22, parent: club, px: 1.8 });
  const gobGlow = glowSprite('#ff9922', 1.05); gobGlow.position.set(0, 0.5, -0.35); gob.add(gobGlow);
  blobShadow(gob, 0.5, { y: 0.01 });
  const gobHP = hpBar(gob, 1.28);
  gob.scale.setScalar(MS);

  // ================================================================ エフェクト
  // チャージリング（黄色）
  const ringMat = flat(0xffee00, { transparent: true, depthTest: false });
  const ringInkMat = flat(0x14121e, { transparent: true, depthTest: false });
  const ring = mesh(G.torus(1, 0.055, 10, 64), ringMat, { parent: root, line: false });
  const ringInk = mesh(G.torus(1, 0.085, 10, 64), ringInkMat, { parent: ring, line: false });
  ring.renderOrder = 6; ringInk.renderOrder = 5;
  const target = mesh(G.torus(1, 0.018, 6, 64), flat(0xfff7a0, { transparent: true, opacity: 0.8, depthTest: false }), { parent: root, line: false });
  target.renderOrder = 6;

  // 斬撃（三日月）
  const cres = new THREE.Shape();
  cres.absarc(0, 0, 0.42, -1.25, 1.25, false);
  cres.absarc(-0.16, 0, 0.34, 1.1, -1.1, true);
  const slashGeo = G.extrude(cres, 0.04, 0.012);
  const slash = group(root);
  mesh(slashGeo, flat(0xaaffff), { parent: slash, px: 2 });
  const slashTrail = [0, 1, 2].map(i => mesh(slashGeo, flat(0x66ffff, { transparent: true, opacity: 0.4 - i * 0.12, depthWrite: false }), { parent: root, line: false }));

  // 衝撃の星と光線
  const burst = group(root);
  mesh(G.extrude(starShape(0.5, 0.22, 8), 0.04, 0.01), flat(0xffff66), { parent: burst, px: 2 });
  mesh(G.extrude(starShape(0.28, 0.13, 8), 0.05, 0.01), flat(0xffffff), { z: 0.03, parent: burst, line: false });

  function textPlane(txt, fill, w, h, size, pw) {
    const tx = canvasTexture(w, h, (ctx, W, H) => {
      ctx.font = `900 ${size}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineJoin = 'round'; ctx.lineWidth = size * 0.22; ctx.strokeStyle = '#14121e'; ctx.strokeText(txt, W / 2, H / 2 + 4);
      ctx.fillStyle = fill; ctx.fillText(txt, W / 2, H / 2 + 4);
    });
    const m = new THREE.Mesh(G.plane(pw, pw * h / w), new THREE.MeshBasicMaterial({ map: tx.tex, transparent: true, depthTest: false }));
    m.renderOrder = 10;
    root.add(m);
    return m;
  }
  const goodPop = textPlane('GOOD!', '#33ff33', 512, 160, 120, 1.5);
  const critPop = textPlane('CRITICAL!', '#ffff00', 640, 160, 116, 1.85);
  const dmg = [textPlane('-45', '#ffffff', 256, 128, 100, 0.6), textPlane('-99', '#ff5577', 256, 128, 100, 0.66), textPlane('-99', '#ff5577', 256, 128, 100, 0.66)];

  // 上下の合図（↓ ためる / ↑ 押す）
  const arr = new THREE.Shape();
  arr.moveTo(-0.07, -0.2); arr.lineTo(0.07, -0.2); arr.lineTo(0.07, 0.02); arr.lineTo(0.17, 0.02);
  arr.lineTo(0, 0.22); arr.lineTo(-0.17, 0.02); arr.lineTo(-0.07, 0.02); arr.closePath();
  const arrGeo = G.extrude(arr, 0.05, 0.015);
  const cue = group(root, { x: -0.95, z: 0.3 });
  const cueDn = mesh(arrGeo, flat(0x55e0ff), { rz: Math.PI, parent: cue, px: 2 });
  const cueUp = mesh(arrGeo, flat(0xffee00), { parent: cue, px: 2 });

  // 撃破のキラキラ
  const poof = group(root);
  const R = rand(5);
  const sparkGeo = G.extrude(starShape(0.08, 0.035), 0.03, 0.008);
  const sparkC = [0x33ff66, 0x33ffff, 0xff55ff, 0xffff44];
  const sparks = [];
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2 + R() * 0.3;
    const sp = 0.9 + R() * 0.8;
    sparks.push({ m: mesh(sparkGeo, flat(sparkC[i % 4]), { parent: poof, px: 1.3 }), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.9 + 1.0, vz: (R() - 0.3) * 0.6, r: (R() - 0.5) * 10 });
  }
  const puffGeo = G.sphere(0.2, 16, 12);
  const puffs = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    puffs.push({ m: mesh(puffGeo, flat(0xffffff), { parent: poof, px: 1.4 }), x: Math.cos(a) * 0.28, y: 0.35 + Math.sin(a) * 0.22 });
  }

  // ================================================================ タイムライン
  const REPS = [
    { d0: 0.55, u0: 2.0, crit: false, hp0: 1, hp1: 0.55, mon: 0 },
    { d0: 2.7, u0: 4.15, crit: true, hp0: 0.55, hp1: 0, mon: 0 },
    { d0: 6.0, u0: 7.4, crit: true, hp0: 1, hp1: 0, mon: 1 },
  ];
  const FLY = 0.3;
  REPS.forEach(r => { r.imp = r.u0 + FLY; });
  const DIE = [REPS[1].imp + 0.45, REPS[2].imp + 0.45];   // 撃破の時刻
  const DROP = [0.0, 5.3];                               // 登場の時刻
  const monsters = [
    { g: slime, b: slimeBody, mat: slimeMat, base: 0x0a3a12, hp: slimeHP, cy: 0.33 * MS, rr: 0.6 * MS },
    { g: gob, b: gobBody, mat: gobMat, base: 0x3a1800, hp: gobHP, cy: 0.55 * MS, rr: 0.72 * MS },
  ];

  const sc = (m, v) => { m.visible = v > 0.01; m.scale.setScalar(Math.max(0.001, v)); };
  let lastSign = '';
  function update(t) {
    // ---- 腕立ての深さ
    let dep = 0;
    for (const r of REPS) dep = Math.max(dep, seg(t, r.d0, r.d0 + 0.45) * (1 - seg(t, r.u0, r.u0 + 0.2, easeOutCubic)));
    poseFigure(dep);

    // ---- モンスター
    monsters.forEach((M, k) => {
      const t0 = DROP[k], td = DIE[k];
      const alive = t >= t0 && t < td + 0.19;
      M.g.visible = alive;
      if (!alive) return;
      const fall = seg(t, t0, t0 + 0.45, x => x * x);
      const land = t - (t0 + 0.45);
      const sq = land > 0 ? Math.sin(Math.min(land, 0.5) * Math.PI * 2 / 0.5) * Math.exp(-land * 5) * 0.25 : 0;
      M.g.position.y = GROUND + (1 - fall) * 3.2;
      // 被弾
      let shake = 0, flash = 0, hp = 1;
      for (const r of REPS) {
        if (r.mon !== k) continue;
        const dt = t - r.imp;
        if (dt > 0 && dt < 0.6) shake += Math.sin(dt * 45) * Math.exp(-dt * 7) * 0.12;
        if (dt > 0 && dt < 0.14) flash = 1;
        if (t >= r.imp) hp = lerp(r.hp0, r.hp1, seg(t, r.imp, r.imp + 0.3));
      }
      const idle = k === 0 ? Math.sin(t * 5) * 0.04 : Math.sin(t * 4) * 0.02;
      const dieS = 1 - seg(t, td, td + 0.2);
      M.b.position.x = shake;
      M.b.position.y = k === 1 ? Math.abs(Math.sin(t * 4)) * 0.04 : 0;
      M.b.scale.set((1 - sq * 0.6 - idle) * dieS, (1 + sq + idle) * dieS, (1 - sq * 0.6 - idle) * dieS);
      M.b.rotation.z = shake * 1.2;
      M.mat.emissive.setHex(flash ? 0xffffff : M.base);
      M.hp.fill.scale.x = Math.max(0.001, hp);
      M.hp.mat.color.setHex(hp > 0.6 ? 0x33ff66 : hp > 0.3 ? 0xffdd22 : 0xff4466);
      M.hp.g.visible = t < td;
      M.hp.g.position.x = shake * 0.5;
    });

    // ---- チャージリング
    ring.visible = false; target.visible = false;
    for (const r of REPS) {
      const a = r.d0 + 0.35, b = r.u0 - 0.25;
      if (t < a || t > r.u0 + 0.16) continue;
      const M = monsters[r.mon];
      const c = seg(t, a, b, x => x);
      const full = t >= b;
      let rad = lerp(1.35, M.rr, smooth(c));
      let op = seg(t, a, a + 0.15);
      if (full && t < r.u0) rad *= 1 + 0.05 * Math.sin((t - b) * 30);
      if (t >= r.u0) { const k = (t - r.u0) / 0.16; rad *= 1 + k * 0.6; op = 1 - k; }
      ring.visible = true;
      ring.position.set(MX, GROUND + M.cy, 0.1);
      ring.quaternion.copy(camera.quaternion);
      ring.scale.setScalar(rad);
      ringMat.opacity = op; ringInkMat.opacity = op;
      ringMat.color.setHex(full && Math.floor((t - b) * 10) % 2 === 0 ? 0xffffff : 0xffee00);
      target.visible = t < r.u0;
      target.position.copy(ring.position);
      target.quaternion.copy(camera.quaternion);
      target.scale.setScalar(M.rr);
      target.material.opacity = 0.55 * op;
    }

    // ---- 斬撃
    slash.visible = false; slashTrail.forEach(m => m.visible = false);
    burst.visible = false;
    goodPop.visible = critPop.visible = false;
    dmg.forEach(m => m.visible = false);
    REPS.forEach((r, i) => {
      const M = monsters[r.mon];
      const sp = (tt) => {
        const k = clamp((tt - r.u0) / FLY);
        return [lerp(-0.55, MX - 0.1, k), GROUND + lerp(0.55, M.cy + 0.05, k) + Math.sin(k * Math.PI) * 0.25];
      };
      if (t >= r.u0 && t < r.imp) {
        const [x, y] = sp(t);
        slash.visible = true;
        slash.position.set(x, y, 0.15);
        slash.rotation.set(0, 0, -0.35 + (t - r.u0) * 1.2);
        slash.scale.setScalar(lerp(0.7, r.crit ? 1.35 : 1.1, (t - r.u0) / FLY));
        slashTrail.forEach((m, j) => {
          const tt = t - (j + 1) * 0.05;
          if (tt < r.u0) return;
          const [px, py] = sp(tt);
          m.visible = true; m.position.set(px, py, 0.12); m.rotation.copy(slash.rotation); m.scale.copy(slash.scale).multiplyScalar(0.9);
        });
      }
      const dt = t - r.imp;
      if (dt >= 0 && dt < 0.45) {
        burst.visible = true;
        burst.position.set(MX - 0.05, GROUND + M.cy + 0.05, 0.6);
        burst.quaternion.copy(camera.quaternion);
        const s = bump(dt, 0, 0.45) * (r.crit ? 1.25 : 0.95);
        sc(burst, s);
        burst.rotateZ(dt * 3);
      }
      // 評価ポップ
      const pop = r.crit ? critPop : goodPop;
      const pv = seg(dt, 0, 0.3, easeOutBack) * (1 - seg(dt, 0.95, 1.15));
      if (dt >= 0 && pv > 0.001) {
        pop.visible = true;
        pop.scale.setScalar(pv);
        pop.position.set(MX - 0.35, GROUND + (r.mon ? 1.98 : 1.66) + dt * 0.1, 0.5);
        pop.quaternion.copy(camera.quaternion);
      }
      // ダメージ数字
      const dm = dmg[i];
      if (dt >= 0.05 && dt < 1.0) {
        dm.visible = true;
        const k = (dt - 0.05) / 0.95;
        dm.position.set(MX + 0.62, GROUND + M.cy + 0.25 + easeOutCubic(k) * 0.45, 0.5);
        dm.scale.setScalar(seg(dt, 0.05, 0.25, easeOutBack) * (1 - seg(k, 0.75, 1)) + 0.001);
        dm.quaternion.copy(camera.quaternion);
      }
    });

    // ---- 上下の合図
    cue.visible = false;
    for (const r of REPS) {
      if (t < r.d0 || t > r.u0 + 0.45) continue;
      cue.visible = true;
      const up = t >= r.u0;
      cueDn.visible = !up; cueUp.visible = up;
      const s = up ? easeOutBack(clamp((t - r.u0) / 0.2)) * (1 - seg(t, r.u0 + 0.3, r.u0 + 0.45)) : seg(t, r.d0, r.d0 + 0.2, easeOutBack);
      sc(cue, s * 1.1);
      cue.position.y = GROUND + 0.95 + (up ? (t - r.u0) * 0.6 : -0.06 * Math.abs(Math.sin((t - r.d0) * 4)));
      cue.quaternion.copy(camera.quaternion);
    }

    // ---- 撃破のキラキラ
    poof.visible = false;
    DIE.forEach((td, k) => {
      const dt = t - td;
      if (dt < 0 || dt > 0.8) return;
      poof.visible = true;
      poof.position.set(MX, GROUND, 0.1);
      for (const s of sparks) {
        s.m.position.set(s.vx * dt, 0.35 + s.vy * dt - 1.6 * dt * dt, s.vz * dt + 0.3);
        s.m.rotation.set(0, 0, s.r * dt);
        sc(s.m, (1 - seg(dt, 0.5, 0.8)) * seg(dt, 0, 0.1) * 1.3);
      }
      for (const p of puffs) {
        const e = easeOutCubic(clamp(dt / 0.5));
        p.m.position.set(p.x * (0.4 + e), p.y * (0.6 + e * 0.6) + dt * 0.2, 0.2);
        sc(p.m, (0.5 + e) * (1 - seg(dt, 0.25, 0.55)));
      }
    });

    // ---- 看板
    const floor = t >= 5.5 && t < DUR ? 2 : 1;
    let combo = 0; for (const r of REPS) if (t >= r.imp) combo++;
    const key = floor + ':' + combo;
    if (key !== lastSign) { signTex.redraw(floor, combo); lastSign = key; }
    let flip = 0;
    flip = t > 5.3 && t < 5.7 ? (t < 5.5 ? seg(t, 5.3, 5.5) : -(1 - seg(t, 5.5, 5.7))) * Math.PI / 2 : 0;
    if (t > DUR - 0.25) flip = seg(t, DUR - 0.25, DUR) * Math.PI / 2;
    if (t < 0.25) flip = -(1 - seg(t, 0, 0.25)) * Math.PI / 2;
    signFace.rotation.y = flip;
    let comboPop = 0; for (const r of REPS) comboPop = Math.max(comboPop, bump(t, r.imp, r.imp + 0.35));
    sign.scale.setScalar(1 + comboPop * 0.1);
    sign.rotation.z = Math.sin(t * 2 * Math.PI / DUR * 3) * 0.03;

    flames.forEach((f, i) => { const w = Math.PI * 2 / DUR; f.scale.set(1 + 0.08 * Math.sin(t * w * 13 + i), 1.5 + 0.15 * Math.sin(t * w * 10 + i * 2), 1); });
  }

  return { scene, camera, update, duration: DUR };
});
