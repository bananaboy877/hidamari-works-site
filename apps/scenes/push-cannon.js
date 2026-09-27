// PUSH CANNON 腕立て砲撃: 腕立てで下がる → 砲身が上がり点線の弾道（的に合うと緑）→ 押し上げてドーン → 命中 → 次のモンスター
import { THREE, defineScene, stage, mesh, group, G, toon, flat, canvasTexture, blobShadow, starShape, FONT,
  clamp, lerp, seg, bump, smooth, easeOutBack, easeOutCubic, rand } from '../engine.js';

defineScene('push-cannon', () => {
  const { scene, camera, root } = stage({ fov: 28.5, pos: [0.0, 2.3, 8.0], target: [-0.1, 0.7, 0], light: [2, 8, 6] });
  const DUR = 9;
  const INKS = '#2b2320';

  // ================================================================ 地面の帯（ジオラマ）
  const SW = 5.2, SD = 1.3, SH = 0.42;
  const OX = -0.2;                  // 帯の中心 x
  const X0 = -0.5;                 // 0m の位置（大砲の口あたり）
  const MPX = 0.32;                  // 10m あたりの長さ
  mesh(G.box(SW, SH, SD, 0.08), 0x5a3e2a, { x: OX, y: -SH / 2, parent: root });
  mesh(G.box(SW - 0.02, 0.1, SD - 0.02, 0.05), 0x4c6e34, { x: OX, y: -0.04, parent: root });
  // 前面の目盛り 10m〜80m
  const rulerTex = canvasTexture(1140, 80, (ctx, w, h) => {
    ctx.fillStyle = '#5a3e2a'; ctx.fillRect(0, 0, w, h);
    const px = w / SW;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (let m = 10; m <= 80; m += 10) {
      const x = (X0 + (m / 10) * MPX - OX + SW / 2) * px;
      const big = m % 20 === 0;
      ctx.fillStyle = '#fff6e0';
      ctx.fillRect(x - 3, 0, 6, big ? 22 : 16);
      if (big) {
        ctx.font = `900 44px ${FONT}`;
        ctx.lineJoin = 'round'; ctx.lineWidth = 8; ctx.strokeStyle = '#2b1c12'; ctx.strokeText(`${m}m`, x, 52);
        ctx.fillStyle = '#fff6e0'; ctx.fillText(`${m}m`, x, 52);
      }
    }
  });
  mesh(G.plane(SW - 0.12, (SW - 0.12) * 80 / 1140), new THREE.MeshBasicMaterial({ map: rulerTex.tex }), { x: OX, y: -0.21, z: SD / 2 + 0.004, line: false, parent: root });
  blobShadow(root, 3.1, { x: OX, y: -SH - 0.02, sz: 0.5 });

  // 草むら
  const R = rand(21);
  const bladeGeo = G.cone(0.045, 0.2, 5);
  for (let i = 0; i < 11; i++) {
    const x = OX - SW / 2 + 0.3 + i * 0.46 + R() * 0.12;
    const z = (i % 2 ? -0.45 : 0.5) + R() * 0.08;
    for (let k = -1; k <= 1; k++) mesh(bladeGeo, k ? 0x5f9a3c : 0x72b04a, { x: x + k * 0.05, y: 0.08, z, rz: -k * 0.35, sy: k ? 0.8 : 1, parent: root, px: 1.2 });
  }

  // ================================================================ 夕暮れの背景板
  const BZ = -SD / 2 - 0.12;
  const skyTex = canvasTexture(512, 256, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#0e0828'); g.addColorStop(0.65, '#3a2a50'); g.addColorStop(1, '#6a3a48');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  });
  const BW = SW - 0.1, BH = 2.35;
  mesh(G.box(BW + 0.12, BH + 0.1, 0.08, 0.05), 0x2a1c3a, { x: OX, y: BH / 2 - 0.05, z: BZ - 0.05, parent: root });
  mesh(G.plane(BW, BH), new THREE.MeshBasicMaterial({ map: skyTex.tex }), { x: OX, y: BH / 2 - 0.05, z: BZ - 0.005, line: false, parent: root });
  // 月
  mesh(G.circle(0.2, 28), flat(0xfff1b8), { x: -2.1, y: 1.85, z: BZ + 0.01, parent: root, px: 1.6 });
  // 星
  const stars = [];
  const starGeo = G.extrude(starShape(0.06, 0.026), 0.02, 0.006);
  for (let i = 0; i < 11; i++) {
    const x = OX - 2.3 + R() * 4.6, y = 1.3 + R() * 0.9;
    if (Math.hypot(x + 2.1, y - 1.85) < 0.35) continue;
    stars.push(mesh(starGeo, flat(i % 3 ? 0xfff6c8 : 0xffd0f0), { x, y, z: BZ + 0.02, s: 0.7 + R() * 0.6, parent: root, px: 1.1 }));
  }
  // 山（切り絵）
  function mountain(pts, color, z) {
    const s = new THREE.Shape();
    s.moveTo(pts[0][0], 0);
    for (const p of pts) s.lineTo(p[0], p[1]);
    s.lineTo(pts[pts.length - 1][0], 0); s.closePath();
    return mesh(G.extrude(s, 0.05, 0.015, 8), color, { z, parent: root, px: 1.8 });
  }
  mountain([[-2.8, 0.55], [-2.1, 1.0], [-1.5, 0.7], [-0.7, 1.15], [0.1, 0.75], [0.7, 1.0], [1.5, 0.6], [2.1, 1.05], [2.4, 0.7]], 0x4a3468, BZ + 0.05);
  mountain([[-2.8, 0.35], [-1.9, 0.62], [-1.0, 0.42], [-0.2, 0.7], [0.8, 0.45], [1.7, 0.72], [2.4, 0.4]], 0x2a1c44, BZ + 0.14);

  // ================================================================ 腕立てする人
  const SKIN = 0xffd2b0, SHIRT = 0x4a7fe8, PANTS = 0x3b3f63, BAND = 0xff4d5e;
  const MAT_Y = 0.035;
  mesh(G.box(1.35, 0.05, 0.62, 0.025), 0xff8fb8, { x: -1.92, y: 0.012, z: 0.1, parent: root, px: 1.6 });
  const fig = group(root, { x: -2.5, z: 0.1, s: 0.95 });
  const FX = 0;
  const body = group(fig, { x: FX, y: MAT_Y });
  const AX = 0.1;
  for (const z of [-0.09, 0.09]) {
    mesh(G.capsule(0.072, 0.46, 6, 14), PANTS, { x: 0.3, y: AX, z, rz: Math.PI / 2, parent: body });
    mesh(G.box(0.1, 0.13, 0.12, 0.04), 0xffffff, { x: 0.035, y: 0.06, z, parent: body, px: 1.6 });
  }
  mesh(G.box(0.24, 0.24, 0.32, 0.1), PANTS, { x: 0.58, y: AX + 0.01, parent: body });
  mesh(G.box(0.46, 0.27, 0.34, 0.12), SHIRT, { x: 0.86, y: AX + 0.02, parent: body });
  const head = group(body, { x: 1.2, y: AX + 0.1 });
  mesh(G.cyl(0.06, 0.07, 0.12, 12), SKIN, { x: -0.1, y: -0.04, rz: Math.PI / 2, parent: head, px: 1.6 });
  const headIn = group(head, { ry: -0.75 });
  mesh(G.sphere(0.2, 28, 20), SKIN, { parent: headIn });
  mesh(new THREE.SphereGeometry(0.212, 28, 14, 0, Math.PI * 2, 0, Math.PI * 0.42), 0x4a3226, { rz: 0.35, parent: headIn, px: 1.8 });
  mesh(G.torus(0.203, 0.032, 8, 32), BAND, { y: 0.06, parent: headIn, px: 1.6 }).rotation.set(Math.PI / 2 - 0.35, 0, 0);
  mesh(G.box(0.14, 0.05, 0.03, 0.015), BAND, { x: -0.25, y: 0.02, rz: -0.5, parent: headIn, px: 1.4 });
  mesh(G.box(0.12, 0.05, 0.03, 0.015), BAND, { x: -0.24, y: -0.04, rz: -0.9, parent: headIn, px: 1.4 });
  const eyeGeo = G.sphere(0.028, 12, 10);
  for (const z of [-0.075, 0.075]) mesh(eyeGeo, 0x2b2320, { x: 0.18, z, sy: 1.3, parent: headIn, line: false });
  for (const z of [-0.11, 0.11]) {
    const b = mesh(G.circle(0.03, 16), flat(0xff8aa0), { x: 0.16, y: -0.06, z: z * 1.05, parent: headIn, line: false });
    b.lookAt(new THREE.Vector3(1, -0.4, z * 6));
  }
  mesh(G.torus(0.035, 0.009, 6, 12, Math.PI), 0x2b2320, { x: 0.192, y: -0.055, ry: Math.PI / 2, rz: Math.PI, parent: headIn, line: false });

  const UA = 0.23, LA = 0.23;
  const SHO = [0.98, AX + 0.07];
  const upperGeo = G.capsule(0.058, UA, 6, 12), lowerGeo = G.capsule(0.05, LA, 6, 12), handGeo = G.sphere(0.065, 14, 10);
  const arms = [-0.2, 0.2].map(z => ({
    z,
    up: mesh(upperGeo, SHIRT, { parent: fig, px: 1.8 }),
    lo: mesh(lowerGeo, SKIN, { parent: fig, px: 1.8 }),
    hand: mesh(handGeo, SKIN, { parent: fig, px: 1.6, sy: 0.7 }),
  }));
  const shoulderAt = (th) => [FX + SHO[0] * Math.cos(th) - SHO[1] * Math.sin(th), MAT_Y + SHO[0] * Math.sin(th) + SHO[1] * Math.cos(th)];
  const solveTh = (hgt) => { let a = 0, b = 0.8; for (let i = 0; i < 40; i++) { const m = (a + b) / 2; (shoulderAt(m)[1] - MAT_Y < hgt) ? a = m : b = m; } return (a + b) / 2; };
  const TH_UP = solveTh(UA + LA - 0.02), TH_DN = solveTh(0.17);
  const HAND_X = shoulderAt(TH_UP)[0] + 0.02, HAND_Y = MAT_Y + 0.03;
  const Yv = new THREE.Vector3(0, 1, 0), va = new THREE.Vector3(), vb = new THREE.Vector3(), vd = new THREE.Vector3();
  function bone(m, a, b) { vd.subVectors(b, a); m.position.copy(a).addScaledVector(vd, 0.5); m.quaternion.setFromUnitVectors(Yv, vd.normalize()); }
  function poseFigure(dep) {
    const th = lerp(TH_UP, TH_DN, dep);
    body.rotation.z = th;
    head.rotation.z = -th * 0.7 + 0.15;
    const [sx, sy] = shoulderAt(th);
    for (const a of arms) {
      const dx = HAND_X - sx, dy = HAND_Y - sy, d = Math.hypot(dx, dy);
      const dd = Math.min(d, UA + LA - 1e-4), ux = dx / d, uy = dy / d;
      const xk = (UA * UA - LA * LA + dd * dd) / (2 * dd), hk = Math.sqrt(Math.max(0, UA * UA - xk * xk));
      const ex = sx + ux * xk + uy * hk, ey = sy + uy * xk - ux * hk;
      va.set(sx, sy, a.z * 0.8); vb.set(ex, ey, a.z * 0.95); bone(a.up, va, vb);
      va.set(HAND_X, HAND_Y, a.z); bone(a.lo, vb, va);
      a.hand.position.set(HAND_X + 0.02, HAND_Y, a.z);
    }
  }

  // ================================================================ 大砲
  const CX = -0.6, AXLE_Y = 0.24;
  const cannon = group(root, { x: CX, z: 0.12 });
  const carriage = group(cannon);
  mesh(G.box(0.62, 0.14, 0.34, 0.05), 0x7a5234, { x: -0.12, y: 0.13, rz: 0.12, parent: carriage });
  const wheelGeo = G.puck(0.22, 0.07, 0.025, 28);
  const wheels = [];
  for (const z of [-0.2, 0.2]) {
    const w = group(carriage, { y: 0.22, z });
    mesh(wheelGeo, 0x9a6a3a, { rx: Math.PI / 2, parent: w });
    mesh(G.puck(0.07, 0.1, 0.02, 16), 0x4a4f5c, { rx: Math.PI / 2, parent: w, px: 1.6 });
    for (let k = 0; k < 3; k++) mesh(G.box(0.36, 0.035, 0.075, 0.01), 0x6a4526, { rz: k * Math.PI / 3, parent: w, line: false });
    wheels.push(w);
  }
  const barrel = group(cannon, { y: AXLE_Y });
  const barrelGeo = G.lathe([[0, -0.2], [0.12, -0.2], [0.16, -0.13], [0.16, -0.02], [0.125, 0.3], [0.12, 0.36], [0.155, 0.38], [0.165, 0.46], [0.1, 0.46], [0.09, 0.34], [0, 0.34]], 28);
  mesh(barrelGeo, 0x8a90a0, { rz: -Math.PI / 2, parent: barrel, px: 2.2 });
  mesh(G.sphere(0.07, 14, 10), 0x8a90a0, { x: -0.25, parent: barrel, px: 1.6 });
  mesh(G.torus(0.145, 0.025, 8, 24), 0xf0c040, { x: 0.02, ry: Math.PI / 2, parent: barrel, px: 1.4 });
  // 砲口の黒い穴
  mesh(G.circle(0.095, 20), flat(0x1a1420), { x: 0.462, ry: Math.PI / 2, parent: barrel, line: false });
  blobShadow(cannon, 0.5, { x: -0.1, y: 0.01, sx: 1.3 });
  const muzzleAt = (th) => [CX + Math.cos(th) * 0.46, AXLE_Y + Math.sin(th) * 0.46];

  // ================================================================ 弾道
  const Gv = 6.0, V = Math.sqrt(2.47 * 6.0);
  function landX(th) {
    const [mx, my] = muzzleAt(th);
    const vx = V * Math.cos(th), vy = V * Math.sin(th);
    const tau = (vy + Math.sqrt(vy * vy + 2 * Gv * (my - 0.12))) / Gv;
    return [mx + vx * tau, tau];
  }
  function ballAt(th, tau) {
    const [mx, my] = muzzleAt(th);
    return [mx + V * Math.cos(th) * tau, my + V * Math.sin(th) * tau - 0.5 * Gv * tau * tau];
  }
  // 高い弾道側（45°〜）: 砲身を下げるほど遠くへ飛ぶ
  const solveAngle = (x) => { let a = Math.PI / 4, b = 1.45; for (let i = 0; i < 40; i++) { const m = (a + b) / 2; landX(m)[0] > x ? a = m : b = m; } return (a + b) / 2; };
  const REST = 1.36;

  const NDOT = 20;
  const dotGeo = G.sphere(0.035, 10, 8);
  const dotMat = flat(0xffffff);
  const dots = [];
  for (let i = 0; i < NDOT; i++) dots.push(mesh(dotGeo, dotMat, { parent: root, line: false }));
  const landRing = mesh(G.torus(0.2, 0.03, 6, 28), flat(0xffffff), { rx: Math.PI / 2, parent: root, px: 1.4 });

  // 砲弾（光る）
  const ball = group(root);
  mesh(G.sphere(0.11, 20, 14), flat(0xff8800), { parent: ball, px: 1.8 });
  mesh(G.sphere(0.065, 14, 10), flat(0xffcc00), { x: 0.02, y: 0.02, z: 0.06, parent: ball, line: false });
  const glowTex = canvasTexture(128, 128, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    g.addColorStop(0, 'rgba(255,200,40,0.9)'); g.addColorStop(0.4, 'rgba(255,136,0,0.45)'); g.addColorStop(1, 'rgba(255,136,0,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  }).tex;
  const ballGlow = new THREE.Mesh(G.plane(0.6, 0.6), new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, depthWrite: false }));
  ball.add(ballGlow);
  const trail = [];
  for (let i = 0; i < 7; i++) {
    const m = new THREE.Mesh(G.circle(0.1 - i * 0.008, 16), new THREE.MeshBasicMaterial({ color: i < 3 ? 0xffcc00 : 0xff8800, transparent: true, opacity: 0.7 - i * 0.09, depthWrite: false }));
    root.add(m); trail.push(m);
  }

  // 砲口の閃光・煙
  const flash = group(root);
  mesh(G.extrude(starShape(0.3, 0.13, 7), 0.03, 0.01), flat(0xffb020), { parent: flash, px: 1.8 });
  mesh(G.extrude(starShape(0.16, 0.08, 7), 0.04, 0.01), flat(0xfff2a0), { z: 0.03, parent: flash, line: false });
  const smokeGeo = G.sphere(0.12, 14, 10);
  const smoke = [];
  for (let i = 0; i < 5; i++) smoke.push({ m: mesh(smokeGeo, flat(0xe8e0ea), { parent: root, px: 1.4 }), dx: -0.05 + i * 0.07, dy: 0.12 + (i % 2) * 0.1, s: 0.8 + (i % 3) * 0.25 });

  // 上下の合図（↓ ためる / ↑ 押す）
  const arr = new THREE.Shape();
  arr.moveTo(-0.07, -0.2); arr.lineTo(0.07, -0.2); arr.lineTo(0.07, 0.02); arr.lineTo(0.17, 0.02);
  arr.lineTo(0, 0.22); arr.lineTo(-0.17, 0.02); arr.lineTo(-0.07, 0.02); arr.closePath();
  const arrGeo = G.extrude(arr, 0.05, 0.015);
  const cue = group(root, { x: -1.75, z: 0.3 });
  const cueDn = mesh(arrGeo, flat(0x55e0ff), { rz: Math.PI, parent: cue, px: 2 });
  const cueUp = mesh(arrGeo, flat(0xffee00), { parent: cue, px: 2 });

  // 爆発（星 + 地面の輪）
  const boom = group(root);
  mesh(G.extrude(starShape(0.55, 0.26, 9), 0.04, 0.01), flat(0xff8800), { parent: boom, px: 2 });
  mesh(G.extrude(starShape(0.34, 0.16, 9), 0.05, 0.01), flat(0xffe040), { z: 0.03, parent: boom, line: false });
  const boomRingMat = flat(0xffa030, { transparent: true });
  const boomRing = mesh(G.torus(1, 0.05, 6, 40), boomRingMat, { rx: Math.PI / 2, parent: root, line: false });

  // 「HIT!」
  const hitTex = canvasTexture(512, 200, (ctx, w, h) => {
    ctx.font = `900 150px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round'; ctx.lineWidth = 28; ctx.strokeStyle = '#2b2320'; ctx.strokeText('HIT!', w / 2, h / 2 + 8);
    const g = ctx.createLinearGradient(0, 30, 0, h - 30); g.addColorStop(0, '#ffe040'); g.addColorStop(1, '#ff8800');
    ctx.fillStyle = g; ctx.fillText('HIT!', w / 2, h / 2 + 8);
  });
  const hitPop = new THREE.Mesh(G.plane(1.3, 0.51), new THREE.MeshBasicMaterial({ map: hitTex.tex, transparent: true, depthTest: false }));
  hitPop.renderOrder = 10; root.add(hitPop);

  // ================================================================ モンスター
  const whiteEye = G.sphere(0.075, 16, 12), pupil = G.sphere(0.04, 12, 10);
  function eyes(parent, y, z, sep, look = -0.35) {
    for (const s of [-1, 1]) {
      const e = mesh(whiteEye, 0xffffff, { x: s * sep, y, z, sz: 0.6, parent, px: 1.6 });
      mesh(pupil, 0x14121e, { x: look * 0.09, z: 0.05, parent: e, line: false, sz: 1.2 });
    }
  }
  // スライム
  const slime = group(root, { z: 0.1, s: 0.9 });
  const slimeBody = group(slime);
  const slimeMat = toon(0x22ee44, { unique: true, emissive: new THREE.Color(0x0a3a12) });
  const slimeIn = group(slimeBody, { ry: -0.35 });
  mesh(G.lathe([[0, 0], [0.4, 0.02], [0.47, 0.1], [0.44, 0.26], [0.33, 0.43], [0.16, 0.56], [0.05, 0.64], [0, 0.66]], 36), slimeMat, { parent: slimeIn, px: 2.4 });
  mesh(G.sphere(0.07, 12, 10), flat(0xd8ffe0), { x: -0.2, y: 0.42, z: 0.26, sx: 0.8, sy: 1.3, parent: slimeIn, line: false });
  eyes(slimeIn, 0.3, 0.36, 0.13);
  mesh(G.torus(0.06, 0.014, 6, 14, Math.PI), 0x14121e, { y: 0.17, z: 0.42, rz: Math.PI, parent: slimeIn, line: false });
  blobShadow(slime, 0.55, { y: 0.01 });

  // ゴブリン
  const gob = group(root, { z: 0.1, s: 0.85 });
  const gobBody = group(gob);
  const gobIn = group(gobBody, { ry: -0.4 });
  const gobMat = toon(0xff8a1a, { unique: true, emissive: new THREE.Color(0x3a1800) });
  for (const x of [-0.11, 0.11]) mesh(G.capsule(0.07, 0.14, 4, 12), gobMat, { x, y: 0.12, parent: gobIn });
  mesh(G.sphere(0.26, 24, 16), gobMat, { y: 0.38, sy: 0.9, parent: gobIn });
  mesh(G.cyl(0.28, 0.24, 0.12, 20), 0x7a4a2a, { y: 0.26, parent: gobIn, px: 1.8 });
  mesh(G.sphere(0.27, 24, 16), gobMat, { y: 0.78, parent: gobIn });
  const earGeo = G.cone(0.1, 0.34, 12);
  mesh(earGeo, gobMat, { x: -0.3, y: 0.84, rz: Math.PI / 2 + 0.35, parent: gobIn });
  mesh(earGeo, gobMat, { x: 0.3, y: 0.84, rz: -Math.PI / 2 - 0.35, parent: gobIn });
  eyes(gobIn, 0.82, 0.22, 0.1);
  for (const s of [-1, 1]) mesh(G.box(0.12, 0.035, 0.03, 0.012), 0x14121e, { x: s * 0.1, y: 0.93, z: 0.24, rz: s * 0.4, parent: gobIn, line: false });
  mesh(G.box(0.2, 0.06, 0.04, 0.02), 0x5a1a10, { y: 0.66, z: 0.24, parent: gobIn, px: 1.4 });
  for (const s of [-1, 1]) mesh(G.cone(0.02, 0.05, 6), 0xffffff, { x: s * 0.06, y: 0.68, z: 0.26, parent: gobIn, line: false });
  mesh(G.sphere(0.05, 12, 10), 0xff9f45, { y: 0.76, z: 0.27, parent: gobIn, px: 1.4 });
  const club = group(gobIn, { x: -0.3, y: 0.36, z: 0.12, rz: 0.9 });
  mesh(G.sphere(0.07, 12, 10), gobMat, { parent: club, px: 1.6 });
  mesh(G.cyl(0.09, 0.04, 0.46, 12), 0x9a6a3a, { y: 0.22, parent: club, px: 1.8 });
  blobShadow(gob, 0.5, { y: 0.01 });

  // 撃破のキラキラ + けむり
  const poof = group(root);
  const sparkGeo = G.extrude(starShape(0.08, 0.035), 0.03, 0.008);
  const sparkC = [0xffe040, 0xff8800, 0xffffff, 0x66ff88];
  const sparks = [];
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 + R() * 0.3, sp = 0.9 + R() * 0.7;
    sparks.push({ m: mesh(sparkGeo, flat(sparkC[i % 4]), { parent: poof, px: 1.3 }), vx: Math.cos(a) * sp * 0.6 - 0.15, vy: Math.sin(a) * sp * 0.9 + 1.0, vz: (R() - 0.3) * 0.6, r: (R() - 0.5) * 10 });
  }
  const puffs = [];
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; puffs.push({ m: mesh(smokeGeo, flat(0xffffff), { parent: poof, px: 1.4 }), x: Math.cos(a) * 0.26, y: 0.3 + Math.sin(a) * 0.2 }); }

  // ================================================================ タイムライン
  const MONX = [X0 + 5.5 * MPX, X0 + 7.5 * MPX];      // 55m, 75m
  const SHOTS = [
    { d0: 0.5, a0: 0.95, a1: 2.3, u0: 2.6, fly: 0.7, mon: 0 },
    { d0: 4.55, a0: 5.0, a1: 6.35, u0: 6.6, fly: 0.9, mon: 1 },
  ];
  SHOTS.forEach(s => { s.th = solveAngle(MONX[s.mon]); s.imp = s.u0 + s.fly; s.tau = landX(s.th)[1]; });
  const DROP = [0.0, 3.95];
  const DIE = SHOTS.map(s => s.imp + 0.3);
  const monsters = [
    { g: slime, b: slimeBody, mat: slimeMat, base: 0x0a3a12, cy: 0.3 },
    { g: gob, b: gobBody, mat: gobMat, base: 0x3a1800, cy: 0.45 },
  ];
  const sc = (m, v, min = 0.01) => { m.visible = v > min; m.scale.setScalar(Math.max(0.001, v)); };
  // 追い込み: 最初は手前に落ちる → だんだん的へ（照準が上がる）
  function aimAngle(s, t) {
    const k = seg(t, s.a0, s.a1, x => x * (2 - x));
    return lerp(REST, s.th, k);
  }

  function update(t) {
    // ---- 腕立て / 砲身角度
    let dep = 0, th = REST, aimS = null;
    for (const s of SHOTS) {
      const down = seg(t, s.d0, s.d0 + 0.4) * (1 - seg(t, s.u0, s.u0 + 0.2, easeOutCubic));
      const aimK = seg(t, s.a0, s.a1, x => x * (2 - x));
      dep = Math.max(dep, down * (0.45 + 0.55 * aimK));
      if (t >= s.a0 && t < s.u0 + 1.2) {
        th = t < s.u0 ? aimAngle(s, t) : lerp(s.th, REST, seg(t, s.u0 + 0.5, s.u0 + 1.2));
        aimS = s;
      }
    }
    poseFigure(dep);
    barrel.rotation.z = th;

    // 反動
    let rec = 0;
    for (const s of SHOTS) { const dt = t - s.u0; if (dt > 0 && dt < 0.8) rec = Math.max(rec, Math.exp(-dt * 6) * Math.sin(Math.min(dt * 12, Math.PI / 2))); }
    cannon.position.x = CX - rec * 0.16;
    carriage.rotation.z = rec * 0.06;
    wheels.forEach(w => { w.rotation.z = rec * 0.7; });
    barrel.position.x = -rec * 0.04;

    // 上下の合図
    cue.visible = false;
    for (const s of SHOTS) {
      if (t < s.d0 || t > s.u0 + 0.45) continue;
      const up = t >= s.u0;
      cueDn.visible = !up; cueUp.visible = up;
      const v = up ? easeOutBack(clamp((t - s.u0) / 0.2)) * (1 - seg(t, s.u0 + 0.3, s.u0 + 0.45)) : seg(t, s.d0, s.d0 + 0.2, easeOutBack);
      sc(cue, v);
      cue.position.y = 0.95 + (up ? (t - s.u0) * 0.6 : -0.06 * Math.abs(Math.sin((t - s.d0) * 4)));
      cue.quaternion.copy(camera.quaternion);
    }

    // ---- 点線の弾道
    const aiming = aimS && t >= aimS.a0 && t < aimS.u0;
    dots.forEach(d => { d.visible = false; });
    landRing.visible = false;
    if (aiming) {
      const [lx, tau] = landX(th);
      const onT = Math.abs(lx - MONX[aimS.mon]) < 0.12;
      dotMat.color.setHex(onT ? 0x44ff44 : 0xffffff);
      const fade = seg(t, aimS.a0, aimS.a0 + 0.2);
      const ph = (t * 2.2) % 1;
      for (let i = 0; i < NDOT; i++) {
        const k = (i + ph) / NDOT;
        const [x, y] = ballAt(th, k * tau);
        dots[i].visible = y > 0.02;
        dots[i].position.set(x - cannon.position.x + CX, y, 0.12);
        dots[i].scale.setScalar(fade * (onT ? 1.25 : 1));
      }
      landRing.visible = true;
      landRing.position.set(lx, 0.02, 0.12);
      landRing.material.color.setHex(onT ? 0x44ff44 : 0xffffff);
      sc(landRing, fade * (onT ? 1.2 + 0.1 * Math.sin(t * 20) : 1));
    }

    // ---- 砲弾
    ball.visible = false; trail.forEach(m => m.visible = false);
    flash.visible = false; boom.visible = false; boomRing.visible = false; hitPop.visible = false;
    smoke.forEach(p => p.m.visible = false);
    for (const s of SHOTS) {
      const ft = t - s.u0;
      if (ft >= 0 && ft < s.fly) {
        const k = ft / s.fly;
        const [x, y] = ballAt(s.th, k * s.tau);
        ball.visible = true; ball.position.set(x, y, 0.12);
        ballGlow.quaternion.copy(camera.quaternion);
        trail.forEach((m, i) => {
          const kk = k - (i + 1) * 0.035;
          if (kk < 0) return;
          const [tx, ty] = ballAt(s.th, kk * s.tau);
          m.visible = true; m.position.set(tx, ty, 0.1); m.quaternion.copy(camera.quaternion);
        });
      }
      // 閃光
      if (ft >= 0 && ft < 0.25) {
        const [mx, my] = muzzleAt(s.th);
        flash.visible = true;
        flash.position.set(mx + Math.cos(s.th) * 0.12, my + Math.sin(s.th) * 0.12, 0.2);
        flash.quaternion.copy(camera.quaternion);
        sc(flash, bump(ft, 0, 0.25) * 1.1);
        flash.rotateZ(ft * 4);
      }
      // 煙
      if (ft >= 0.02 && ft < 1.3) {
        const [mx, my] = muzzleAt(s.th);
        smoke.forEach((p, i) => {
          const e = easeOutCubic(clamp((ft - 0.02) / 0.9));
          p.m.position.set(mx + p.dx + e * (0.15 + i * 0.05), my + p.dy * e + e * 0.3, 0.1 + i * 0.02);
          sc(p.m, p.s * (0.4 + e * 0.8) * (1 - seg(ft, 0.7, 1.2)), 0.25);
        });
      }
      // 着弾
      const dt = t - s.imp;
      const tx = MONX[s.mon];
      if (dt >= 0 && dt < 0.5) {
        boom.visible = true;
        boom.position.set(tx, 0.45, 0.5);
        boom.quaternion.copy(camera.quaternion);
        sc(boom, bump(dt, 0, 0.5) * 1.25);
        boom.rotateZ(dt * 2);
        boomRing.visible = true;
        boomRing.position.set(tx, 0.03, 0.12);
        boomRing.scale.setScalar(0.2 + easeOutCubic(dt / 0.5) * 0.9);
        boomRingMat.opacity = 1 - dt / 0.5;
      }
      const pv = seg(dt, 0.05, 0.35, easeOutBack) * (1 - seg(dt, 1.1, 1.35));
      if (dt >= 0 && pv > 0.001) {
        hitPop.visible = true;
        hitPop.scale.setScalar(pv);
        hitPop.position.set(tx - 0.15, 1.35 + dt * 0.12, 0.5);
        hitPop.quaternion.copy(camera.quaternion);
      }
    }

    // ---- モンスター
    monsters.forEach((M, k) => {
      const t0 = DROP[k], td = DIE[k];
      const alive = t >= t0 && t < td + 0.19;
      M.g.visible = alive;
      if (!alive) return;
      M.g.position.x = MONX[k];
      const fall = seg(t, t0, t0 + 0.45, x => x * x);
      const land = t - (t0 + 0.45);
      const sq = land > 0 ? Math.sin(Math.min(land, 0.5) * Math.PI * 2 / 0.5) * Math.exp(-land * 5) * 0.25 : 0;
      M.g.position.y = (1 - fall) * 3.2;
      const idle = k === 0 ? Math.sin(t * 5) * 0.04 : 0;
      const dieS = 1 - seg(t, td, td + 0.18);
      // 飛んでくる弾に気づいてびっくり
      const s = SHOTS[k];
      const scare = bump(t, s.u0, s.imp) * 0.12;
      M.b.position.y = (k === 1 ? Math.abs(Math.sin(t * 4)) * 0.04 : 0) + scare;
      M.b.scale.set((1 - sq * 0.6 - idle) * dieS, (1 + sq + idle) * dieS, (1 - sq * 0.6 - idle) * dieS);
      M.mat.emissive.setHex(t > s.imp - 0.02 && t < s.imp + 0.12 ? 0xffffff : M.base);
      const hs = t > s.imp && t < td ? Math.sin((t - s.imp) * 50) * 0.06 : 0;
      M.b.position.x = hs;
    });

    // ---- 撃破
    poof.visible = false;
    DIE.forEach((td, k) => {
      const dt = t - td;
      if (dt < 0 || dt > 0.8) return;
      poof.visible = true;
      poof.position.set(MONX[k], 0, 0.1);
      for (const p of sparks) {
        p.m.position.set(p.vx * dt, 0.35 + p.vy * dt - 1.0 * dt * dt, p.vz * dt + 0.3);
        p.m.rotation.set(0, 0, p.r * dt);
        sc(p.m, (1 - seg(dt, 0.5, 0.8)) * seg(dt, 0, 0.1) * 1.3);
      }
      for (const p of puffs) {
        const e = easeOutCubic(clamp(dt / 0.5));
        p.m.position.set(p.x * (0.4 + e), p.y * (0.6 + e * 0.6) + dt * 0.2, 0.2);
        sc(p.m, (0.9 + e) * (1 - seg(dt, 0.25, 0.5)), 0.3);
      }
    });

    // 星のまたたき（ループ周期に合わせる）
    const w = Math.PI * 2 / DUR;
    stars.forEach((s, i) => { s.rotation.z = 0.3 * Math.sin(t * w * (3 + (i % 3)) + i); });
  }

  return { scene, camera, update, duration: DUR };
});
