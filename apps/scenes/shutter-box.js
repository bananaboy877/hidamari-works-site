// スライドシャッターBOX: 青いジャバラのシャッターがレールに沿って奥へすべり、背面の内側へくるっと丸まって下りる
// → 中のえんぴつ・消しゴムが見える → また閉まる
import { THREE, defineScene, stage, mesh, group, G, toon, flat, canvasTexture, blobShadow, starShape, FONT,
  clamp, lerp, seg, bump, smooth, easeOutBack, easeOutCubic, easeInOut, rand } from '../engine.js';

defineScene('shutter-box', () => {
  const { scene, camera, root } = stage({ fov: 30, pos: [5.3, 4.1, 2.0], target: [0.35, 0.55, -0.05], light: [5, 9, 6] });
  const DUR = 8;

  const AMBER = 0xd97706, AMBER_IN = 0xc26a0a, AMBER_RAIL = 0x92400e;
  const BLUE = 0x3b82f6, BLUE_D = 0x1e40af;

  // 箱の寸法（おもちゃ風に少しずんぐり）
  const W = 2.7, D = 1.55, H = 1.12, T = 0.09, BOT = 0.09;
  const R = 0.3;               // シャッターが曲がる半径
  const YT = H - 0.07;         // シャッターの通る高さ
  const ST = 0.05;             // スラットの厚み

  // ---- 机
  mesh(G.box(4.0, 0.16, 2.5, 0.08), 0xf6dcb6, { y: -0.08, parent: root });
  blobShadow(root, 2.0, { y: 0.004, sx: 1.2, sz: 0.62 });

  const box = group(root);
  // 底
  mesh(G.box(W, BOT, D, 0.04), AMBER, { y: BOT / 2, parent: box });
  // 前の壁（シャッターが乗る分だけ低い）
  const FH = YT - ST / 2 - 0.01;
  mesh(G.box(W, FH, T, 0.04), AMBER, { y: FH / 2, z: D / 2 - T / 2, parent: box });
  // 奥の壁
  mesh(G.box(W, H, T, 0.04), AMBER, { y: H / 2, z: -D / 2 + T / 2, parent: box });
  // 左の壁
  mesh(G.box(T, H, D, 0.04), AMBER, { x: -W / 2 + T / 2, y: H / 2, parent: box });
  // 右の壁（のぞき窓つき）
  {
    const s = new THREE.Shape();
    const rr = (path, w, h, r, cx, cy) => {
      const x = cx - w / 2, y = cy - h / 2;
      path.moveTo(x + r, y);
      path.lineTo(x + w - r, y); path.absarc(x + w - r, y + r, r, -Math.PI / 2, 0, false);
      path.lineTo(x + w, y + h - r); path.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2, false);
      path.lineTo(x + r, y + h); path.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI, false);
      path.lineTo(x, y + r); path.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5, false);
      return path;
    };
    rr(s, D, H, 0.05, 0, H / 2);
    s.holes.push(rr(new THREE.Path(), D - T * 2, H - BOT - 0.04, 0.06, 0, BOT + (H - BOT - 0.04) / 2));
    const g = new THREE.ExtrudeGeometry(s, { depth: T - 0.02, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.01, bevelSegments: 2, curveSegments: 10 });
    g.translate(0, 0, -(T - 0.02) / 2);
    g.rotateY(Math.PI / 2);
    mesh(g, AMBER, { x: W / 2 - T / 2, parent: box });
    // 透明な窓
    const glass = new THREE.MeshBasicMaterial({ color: 0xdff3ff, transparent: true, opacity: 0.22, depthWrite: false });
    mesh(G.plane(D - T * 2, H - BOT - 0.04), glass, { x: W / 2 - T / 2, y: BOT + (H - BOT - 0.04) / 2, ry: Math.PI / 2, parent: box, line: false });
    const shine = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, depthWrite: false });
    mesh(G.plane(0.07, H - 0.5), shine, { x: W / 2 - T / 2 + 0.005, y: H / 2 + 0.05, z: 0.35, ry: Math.PI / 2, rx: 0.5, parent: box, line: false });
    mesh(G.plane(0.035, H - 0.6), shine, { x: W / 2 - T / 2 + 0.005, y: H / 2 + 0.05, z: 0.22, ry: Math.PI / 2, rx: 0.5, parent: box, line: false });
  }
  // 中の上げ底（小物を見やすく）
  const IFY = 0.78;
  mesh(G.box(W - T * 2 - 0.02, 0.05, D - T * 2 - R - 0.2, 0.02), AMBER_IN, { y: IFY - 0.025, z: (R + 0.2) / 2, parent: box, px: 1.4 });

  // ---- シャッターの通り道（パラメトリック）
  const Z0 = D / 2 - T * 0.5;             // 前端
  const ZC = -D / 2 + T + R + 0.02;       // 曲がりの中心 z
  const YC = YT - R;                      // 曲がりの中心 y
  const L1 = Z0 - ZC, L2 = Math.PI * R / 2, L3 = YC - (BOT + 0.08);
  const LT = L1 + L2 + L3;
  function pathAt(s) {
    if (s <= L1) return [Z0 - s, YT, 0];
    if (s <= L1 + L2) { const a = (s - L1) / R; return [ZC - R * Math.sin(a), YC + R * Math.cos(a), a]; }
    const ds = s - L1 - L2; return [ZC - R, YC - ds, Math.PI / 2];
  }
  // レール（両側の壁の内側）
  const railPts = [];
  for (let i = 0; i <= 40; i++) { const p = pathAt(LT * i / 40); railPts.push(new THREE.Vector3(0, p[1] - ST / 2 - 0.02, p[0])); }
  const railGeo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(railPts, false, 'catmullrom', 0.0), 60, 0.028, 6, false);
  for (const sx of [-1, 1]) mesh(railGeo, AMBER_RAIL, { x: sx * (W / 2 - T - 0.02), parent: box, px: 1.2 });

  // ---- 動く向きを示す矢印（窓の外側に、通り道に沿って）
  function arrow(forward) {
    const g = group(box, { x: W / 2 + 0.06 });
    const pts = [];
    const sA = L1 - 0.4, sB = L1 + L2 + 0.3, OFF = 0.2;
    for (let i = 0; i <= 16; i++) {
      const [z, y, a] = pathAt(lerp(sA, sB, i / 16));
      pts.push(new THREE.Vector3(0, y + Math.cos(a) * OFF, z - Math.sin(a) * OFF));
    }
    const c = pts[8].clone();
    g.position.y = c.y; g.position.z = c.z;
    for (const q of pts) q.sub(c);
    const tip = forward ? pts[pts.length - 1] : pts[0];
    const prev = forward ? pts[pts.length - 2] : pts[1];
    mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 30, 0.04, 6, false), 0xffffff, { parent: g, px: 1.8 });
    const head = mesh(G.cone(0.1, 0.2, 12), 0xffffff, { parent: g, px: 1.8 });
    const dir = tip.clone().sub(prev).normalize();
    head.position.copy(tip).addScaledVector(dir, 0.06);
    head.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    return g;
  }
  const arrowOpen = arrow(true), arrowClose = arrow(false);

  // ---- スラット
  const PITCH = 0.1;
  const SW = W - T * 2 - 0.03;
  const LS = L1 + L2 * 0.5;                 // 閉じたときの長さ
  const N = Math.round(LS / PITCH);
  const OPEN = Math.min(L1 * 0.78, LT - LS - 0.04);
  const slatGeo = G.box(SW, ST, PITCH * 0.8, 0.02);
  const slats = [];
  const slatLine = { color: BLUE_D, px: 2.0 };
  for (let i = 0; i < N; i++) {
    const g = group(box);
    mesh(slatGeo, BLUE, { parent: g, line: slatLine });
    slats.push(g);
  }
  // 先頭のつまみ
  const grip = mesh(G.box(0.7, 0.07, 0.07, 0.03), BLUE_D, { y: ST / 2 + 0.03, z: 0.0, parent: slats[0], px: 1.6 });

  // ---- 中身
  const goods = group(box, { y: IFY });
  const pencils = [];
  const pBody = G.cyl(0.075, 0.075, 1.8, 6);
  const pWood = G.cone(0.075, 0.2, 6);
  const pLead = G.cone(0.028, 0.07, 8);
  [[0xef5b5b, 0.52], [0xffc83d, 0.34], [0x22a861, 0.16], [0x7c3aed, -0.02]].forEach(([c, z], i) => {
    const g = group(goods, { x: -0.42 + i * 0.07, y: 0.075, z, rz: Math.PI / 2 });
    mesh(pBody, c, { parent: g, px: 1.6 });
    mesh(pWood, 0xf5d7a1, { y: -1.0, rx: Math.PI, parent: g, px: 1.5 });
    mesh(pLead, 0x3a3a3a, { y: -1.135, rx: Math.PI, parent: g, line: false });
    pencils.push(g);
  });
  // 消しゴム
  const eraser = group(goods, { x: 0.78, y: 0.08, z: 0.3, ry: 0.3 });
  mesh(G.box(0.44, 0.16, 0.26, 0.05), 0xffffff, { parent: eraser, px: 1.6 });
  mesh(G.box(0.24, 0.175, 0.275, 0.02), 0x3b82f6, { x: 0.07, parent: eraser, px: 1.4 });
  // ものさし
  const ruler = mesh(G.box(1.5, 0.04, 0.18, 0.015), 0xfff3b0, { x: -0.3, y: 0.02, z: -0.2, ry: 0.04, parent: goods, px: 1.4 });

  // ---- OPEN / CLOSE の札
  function tagTex(text, bg) {
    return canvasTexture(320, 128, (ctx, w, h) => {
      ctx.fillStyle = '#2b2320';
      ctx.beginPath(); ctx.roundRect(6, 6, w - 12, h - 12, 56); ctx.fill();
      ctx.fillStyle = bg;
      ctx.beginPath(); ctx.roundRect(14, 14, w - 28, h - 28, 48); ctx.fill();
      ctx.font = `900 72px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffffff'; ctx.fillText(text, w / 2, h / 2 + 4);
    }).tex;
  }
  const tagGeo = G.plane(1.0, 0.4);
  const tagOpen = new THREE.Mesh(tagGeo, new THREE.MeshBasicMaterial({ map: tagTex('OPEN', '#10b981'), transparent: true, depthTest: false }));
  const tagClose = new THREE.Mesh(tagGeo, new THREE.MeshBasicMaterial({ map: tagTex('CLOSE', '#3b82f6'), transparent: true, depthTest: false }));
  tagOpen.renderOrder = tagClose.renderOrder = 10;
  root.add(tagOpen, tagClose);

  // ---- キラキラ
  const sparks = [];
  const starGeo = G.extrude(starShape(0.13, 0.055), 0.03, 0.01);
  const Rn = rand(5);
  for (let i = 0; i < 7; i++) {
    const m = mesh(starGeo, [0xffd23f, 0xffffff, 0x6ee7a8][i % 3], { parent: root, px: 1.3 });
    sparks.push({ m, x: -1.2 + (i / 6) * 2.4 + (Rn() - 0.5) * 0.2, z: 0.1 + Rn() * 0.5, d: Rn() * 0.35 });
  }

  // ---- タイミング
  const O0 = 0.9, O1 = 2.9;     // 開く
  const C0 = 5.2, C1 = 7.1;     // 閉じる
  function openAt(t) { return OPEN * (easeInOut(clamp((t - O0) / (O1 - O0))) - easeInOut(clamp((t - C0) / (C1 - C0)))); }

  function update(t) {
    const o = openAt(t);
    for (let i = 0; i < N; i++) {
      const s = o + (i + 0.5) * PITCH;
      const [z, y, a] = pathAt(s);
      slats[i].position.set(0, y, z);
      slats[i].rotation.x = -a;
    }

    const ao = bump(t, O0 - 0.1, O1 + 0.1), ac = bump(t, C0 - 0.1, C1 + 0.1);
    arrowOpen.visible = ao > 0.01; arrowOpen.scale.setScalar(Math.max(0.001, clamp(ao * 1.6)));
    arrowClose.visible = ac > 0.01; arrowClose.scale.setScalar(Math.max(0.001, clamp(ac * 1.6)));

    // 中身がぴょこっと
    pencils.forEach((p, i) => {
      p.position.y = 0.075 + 0.2 * bump(t, 3.1 + i * 0.18, 3.6 + i * 0.18);
    });
    eraser.position.y = 0.08 + 0.2 * bump(t, 3.9, 4.4);
    eraser.rotation.y = 0.3 + 0.4 * bump(t, 3.8, 4.3);

    // 札（状態が変わるたびにポップ）
    const isOpen = t > 2.2 && t < 6.4;
    const sinceChange = isOpen ? t - 2.2 : (t >= 6.4 ? t - 6.4 : t + DUR - 6.4);
    const pop = easeOutBack(clamp(sinceChange / 0.35));
    const tg = isOpen ? tagOpen : tagClose;
    tagOpen.visible = isOpen; tagClose.visible = !isOpen;
    tg.scale.setScalar(Math.max(0.001, pop));
    tg.position.set(-0.3, 1.9 + 0.04 * Math.sin(t * 2.4), 0.75);
    tg.quaternion.copy(camera.quaternion);

    // キラキラ（開ききったとき）
    for (const s of sparks) {
      const k = (t - 2.8 - s.d) / 1.0;
      const on = k > 0 && k < 1;
      s.m.visible = on;
      if (!on) continue;
      s.m.scale.setScalar(Math.max(0.001, Math.sin(k * Math.PI)));
      s.m.position.set(s.x, IFY + 0.4 + k * 0.45, s.z);
      s.m.quaternion.copy(camera.quaternion);
      s.m.rotateZ(k * 2.4);
    }
  }

  return { scene, camera, update, duration: DUR };
});
