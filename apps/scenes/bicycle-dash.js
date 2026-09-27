// ひたすら自転車: マウスのホイールをくるくる → ペダルが回って日本を走る
// 東京（東京タワー）→ 川と青いアーチ橋 → 「神奈川県」の看板 → 家と木 → また「東京都」
import { THREE, defineScene, stage, mesh, group, G, toon, flat, canvasTexture, blobShadow, FONT,
  clamp, lerp, seg, bump, smooth, easeOutBack, rand } from '../engine.js';

defineScene('bicycle-dash', () => {
  const { scene, camera, root } = stage({ fov: 30, pos: [0, 2.55, 8.55], target: [0.05, 0.62, -0.25], light: [3, 8, 6] });
  const DUR = 8;
  const V = 1.5, L = 12;             // 流れる速さ / 景色の一周の長さ（V*DUR = L）
  const XE = 2.35;                   // ジオラマの端（ここで出入りする）
  const XR = -0.55;                  // 自転車の x
  const INK = '#10202a', CREAM = '#fff8e8', CORAL = '#f25534';

  const wrap = (x, len) => ((((x + len / 2) % len) + len) % len) - len / 2;
  const tmpV = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0);
  function rod(parent, a, b, r, color, px = 1.3) {
    const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
    const len = A.distanceTo(B);
    const m = mesh(G.cyl(r, r, len, 10), color, { parent, px });
    m.position.copy(A).add(B).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(UP, tmpV.copy(B).sub(A).normalize());
    return m;
  }

  // ------------------------------------------------------------ 空の書き割り + 富士山 + 雲
  const skyTex = canvasTexture(256, 256, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#4fb5e8'); g.addColorStop(0.75, '#a9dcf5'); g.addColorStop(1, '#d8f1fb');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  });
  const SKW = 5.9, SKH = 3.0;
  const skyShape = new THREE.Shape();
  { const r = 0.5, x = -SKW / 2, y = 0; skyShape.moveTo(x, y); skyShape.lineTo(x + SKW, y); skyShape.lineTo(x + SKW, y + SKH - r);
    skyShape.quadraticCurveTo(x + SKW, y + SKH, x + SKW - r, y + SKH); skyShape.lineTo(x + r, y + SKH); skyShape.quadraticCurveTo(x, y + SKH, x, y + SKH - r); skyShape.closePath(); }
  const skyGeo = new THREE.ShapeGeometry(skyShape, 12);
  { const p = skyGeo.getAttribute('position'), uv = skyGeo.getAttribute('uv');
    for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) + SKW / 2) / SKW, p.getY(i) / SKH); }
  mesh(skyGeo, new THREE.MeshBasicMaterial({ map: skyTex.tex }), { y: -0.1, z: -2.6, parent: root, px: 2.2 });

  // 富士山
  const fuji = group(root, { x: 1.15, y: -0.05, z: -2.45, s: 0.95 });
  mesh(G.cone(1.35, 1.45, 40), 0x5b8fd6, { y: 0.72, sz: 0.35, parent: fuji });
  const capShape = new THREE.Shape();
  capShape.moveTo(0, 0.02);
  capShape.lineTo(0.47, -0.5); capShape.lineTo(0.3, -0.42); capShape.lineTo(0.16, -0.54); capShape.lineTo(0, -0.42);
  capShape.lineTo(-0.16, -0.54); capShape.lineTo(-0.3, -0.42); capShape.lineTo(-0.47, -0.5); capShape.closePath();
  mesh(G.extrude(capShape, 0.02, 0), 0xffffff, { y: 1.43, z: 0.2, parent: fuji, px: 1.2 });

  // 雲
  const clouds = [];
  const puffGeo = G.sphere(0.25, 18, 12);
  for (const [x, y, s, ph] of [[-2.05, 2.45, 0.9, 0], [0.35, 2.62, 0.75, 2], [2.1, 2.3, 0.85, 4]]) {
    const c = group(root, { x, y, z: -2.35, s });
    for (const [dx, dy, r] of [[-0.28, 0, 0.8], [0, 0.1, 1.1], [0.3, 0.02, 0.85], [0.1, -0.08, 0.9]]) mesh(puffGeo, 0xffffff, { x: dx, y: dy, s: r, sz: 0.5, parent: c, px: 1.6 });
    clouds.push({ c, x, ph });
  }

  // ------------------------------------------------------------ ジオラマ台
  const BW = 5.2, BZ0 = 1.3, BZ1 = -2.1;
  mesh(G.box(BW, 0.34, BZ0 - BZ1, 0.12), 0xb98a5e, { y: -0.2, z: (BZ0 + BZ1) / 2, parent: root });
  mesh(G.box(BW + 0.04, 0.1, BZ0 - BZ1 + 0.04, 0.05), 0x7cc96f, { y: -0.03, z: (BZ0 + BZ1) / 2, parent: root });

  // 道路（テクスチャで白線を流す）
  const RZ0 = 0.95, RZ1 = -0.1;
  const roadTex = canvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#8d949c'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#fbfbf6';
    ctx.fillRect(0, 12, w, 14); ctx.fillRect(0, h - 26, w, 14);
    ctx.fillRect(0, h / 2 - 7, w * 0.3, 14); ctx.fillRect(w * 0.5, h / 2 - 7, w * 0.3, 14);
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    for (let i = 0; i < 40; i++) ctx.fillRect((i * 53) % w, (i * 97) % h, 4, 4);
  });
  roadTex.tex.wrapS = THREE.RepeatWrapping;
  roadTex.tex.repeat.set(BW - 0.2, 1);
  mesh(G.plane(BW - 0.2, RZ0 - RZ1), new THREE.MeshToonMaterial({ map: roadTex.tex }), { rx: -Math.PI / 2, y: 0.04, z: (RZ0 + RZ1) / 2, line: false, parent: root });

  // ガードレール（レールは固定・支柱が流れる）
  const GZ = -0.3;
  for (const y of [0.3, 0.19]) mesh(G.box(BW - 0.3, 0.07, 0.04, 0.02), 0xffffff, { y, z: GZ + 0.03, parent: root, px: 1.4 });
  const posts = [];
  const postGeo = G.box(0.06, 0.36, 0.06, 0.02);
  for (let i = 0; i < 10; i++) posts.push({ m: mesh(postGeo, 0xf2f2f2, { y: 0.18, z: GZ, parent: root, px: 1.3 }), x0: i * 0.6 });

  // 手前の草花
  const flowers = [];
  const petalCols = [0xfff176, 0xff8a80, 0xffffff, 0xf8bbd0];
  const stemGeo = G.cyl(0.012, 0.012, 0.12, 6), headGeo = G.sphere(0.05, 10, 8), leafGeo = G.sphere(0.07, 10, 8);
  for (let i = 0; i < 8; i++) {
    const f = group(root, { z: 1.12 - (i % 2) * 0.1 });
    if (i % 3 === 2) { mesh(leafGeo, 0x4caf50, { y: 0.05, sy: 0.7, parent: f, px: 1.1 }); mesh(leafGeo, 0x5cbf60, { x: 0.07, y: 0.04, s: 0.7, parent: f, px: 1.1 }); }
    else { mesh(stemGeo, 0x3f9a4a, { y: 0.06, parent: f, line: false }); mesh(headGeo, petalCols[i % 4], { y: 0.13, sy: 0.7, parent: f, px: 1.1 }); }
    flowers.push({ g: f, x0: i * 0.75 + (i % 2) * 0.2 });
  }

  // ------------------------------------------------------------ 流れる景色（到着時刻 ta で配置）
  const items = [];
  const addItem = (g, ta) => { items.push({ g, x0: XR + V * ta, s0: g.scale.x }); return g; };

  // 県境の看板
  function signTex(text) {
    return canvasTexture(512, 208, (ctx, w, h) => {
      ctx.fillStyle = '#2f6fd0'; ctx.beginPath(); ctx.roundRect(4, 4, w - 8, h - 8, 26); ctx.fill();
      ctx.lineWidth = 10; ctx.strokeStyle = '#ffffff'; ctx.beginPath(); ctx.roundRect(18, 18, w - 36, h - 36, 18); ctx.stroke();
      ctx.font = `900 ${text.length > 3 ? 112 : 124}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffffff'; ctx.fillText(text, w / 2, h / 2 + 6);
    });
  }
  function signpost(text, ta) {
    const g = group(root, { z: -0.62 });
    for (const x of [-0.42, 0.42]) mesh(G.cyl(0.035, 0.035, 1.0, 10), 0xb0b8c0, { x, y: 0.5, parent: g, px: 1.3 });
    const board = mesh(G.box(1.24, 0.52, 0.06, 0.04), 0x2f6fd0, { y: 1.0, parent: g, px: 1.8 });
    mesh(G.plane(1.2, 0.49), new THREE.MeshBasicMaterial({ map: signTex(text).tex }), { z: 0.032, parent: board, line: false });
    return addItem(g, ta);
  }
  signpost('東京都', 0.25);
  signpost('神奈川県', 4.55);

  // ビル
  function winTex(col, rows, cols) {
    return canvasTexture(128, 256, (ctx, w, h) => {
      ctx.fillStyle = col; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#dff4ff';
      const cw = w / cols, rh = h / rows;
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) ctx.fillRect(c * cw + cw * 0.22, r * rh + rh * 0.25, cw * 0.56, rh * 0.5);
    }).tex;
  }
  const bTex = [winTex('#f0c987', 7, 3), winTex('#b8c9dd', 9, 3), winTex('#f2a58e', 6, 2)];
  function building(ta, w, h, ti, z = -1.55) {
    const g = group(root, { z });
    mesh(G.box(w, h, 0.5, 0.05), new THREE.MeshToonMaterial({ map: bTex[ti] }), { y: h / 2, parent: g });
    mesh(G.box(w + 0.06, 0.06, 0.56, 0.02), 0xe9e4da, { y: h, parent: g, px: 1.2 });
    return addItem(g, ta);
  }
  building(1.0, 0.55, 1.15, 1);
  building(1.45, 0.5, 0.8, 2, -1.3);
  building(2.55, 0.6, 1.3, 0);
  building(2.95, 0.45, 0.85, 1, -1.25);
  building(7.55, 0.5, 0.95, 2);

  // 東京タワー
  {
    const g = group(root, { z: -1.6 });
    const RED = 0xf0592f, WHT = 0xfbf7ef;
    const sec = [[0, 0.32, 0.5, 0.22, RED], [0.32, 0.16, 0.22, 0.2, WHT], [0.48, 0.34, 0.2, 0.13, RED]];
    // 4 本脚
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) rod(g, [sx * 0.34, 0, sz * 0.2], [sx * 0.13, 0.62, sz * 0.08], 0.045, RED, 1.2);
    mesh(G.box(0.36, 0.06, 0.24, 0.02), WHT, { y: 0.4, parent: g, px: 1.2 });
    const bands = [[0.62, 0.3, 0.14, 0.1, RED], [0.92, 0.12, 0.1, 0.09, WHT], [1.04, 0.3, 0.09, 0.055, RED], [1.34, 0.2, 0.055, 0.04, WHT], [1.54, 0.28, 0.04, 0.02, RED]];
    for (const [y, h, rb, rt, c] of bands) mesh(G.cyl(rt, rb, h, 4), c, { y: y + h / 2, ry: Math.PI / 4, parent: g, px: 1.2 });
    mesh(G.box(0.3, 0.1, 0.22, 0.03), WHT, { y: 0.97, parent: g, px: 1.3 });
    mesh(G.box(0.16, 0.06, 0.12, 0.02), WHT, { y: 1.4, parent: g, px: 1.2 });
    mesh(G.cyl(0.012, 0.012, 0.3, 6), WHT, { y: 1.95, parent: g, px: 1 });
    addItem(g, 2.0);
  }

  // 川 + 青いアーチ橋
  {
    const g = group(root);
    mesh(G.box(1.1, 0.02, BZ0 - BZ1 - 0.06, 0.008), 0x5ab8ea, { y: 0.02, z: (BZ0 + BZ1) / 2, parent: g, line: false });
    for (const x of [-0.52, 0.52]) mesh(G.box(0.06, 0.02, BZ0 - BZ1 - 0.06, 0.008), 0xc8ecfa, { x, y: 0.024, z: (BZ0 + BZ1) / 2, parent: g, line: false });
    const BLUE = 0x2f7fe0;
    mesh(G.torus(0.72, 0.045, 8, 36, Math.PI), BLUE, { y: 0.05, z: RZ1 - 0.04, sy: 0.95, parent: g, px: 1.5 });
    for (const x of [-0.45, -0.2, 0.05, 0.3, 0.55]) {
      const hgt = Math.sqrt(Math.max(0, 0.72 * 0.72 - (x - 0.05) ** 2)) * 0.95;
      mesh(G.cyl(0.013, 0.013, hgt, 6), BLUE, { x: x - 0.05, y: 0.05 + hgt / 2, z: RZ1 - 0.04, parent: g, line: false });
    }
    mesh(G.box(1.5, 0.08, 0.05, 0.02), BLUE, { y: 0.1, z: RZ0 + 0.02, parent: g, px: 1.3 });
    for (const x of [-0.72, 0.72]) mesh(G.box(0.08, 0.16, 0.08, 0.02), BLUE, { x, y: 0.08, z: RZ0 + 0.02, parent: g, px: 1.3 });
    addItem(g, 3.4);
  }

  // 家
  function house(ta, wall, roof, z = -1.35) {
    const g = group(root, { z });
    mesh(G.box(0.62, 0.45, 0.5, 0.04), wall, { y: 0.225, parent: g });
    const rs = new THREE.Shape(); rs.moveTo(-0.4, 0); rs.lineTo(0.4, 0); rs.lineTo(0, 0.32); rs.closePath();
    mesh(G.extrude(rs, 0.58, 0.02), roof, { y: 0.45, parent: g });
    mesh(G.box(0.14, 0.22, 0.02, 0.01), 0x9b6b43, { x: 0.12, y: 0.11, z: 0.255, parent: g, px: 1.1 });
    mesh(G.box(0.14, 0.12, 0.02, 0.01), 0xdff4ff, { x: -0.14, y: 0.28, z: 0.255, parent: g, px: 1.1 });
    return addItem(g, ta);
  }
  house(5.2, 0xfff3d6, 0xe0604c);
  house(6.35, 0xe9f3ff, 0x4f7fc8, -1.45);

  // 木
  const trunkGeo = G.cyl(0.05, 0.07, 0.3, 8), canopyGeo = G.sphere(0.3, 16, 12), pineGeo = G.cone(0.28, 0.6, 12);
  function tree(ta, z, s, pine = false) {
    const g = group(root, { z, s });
    mesh(trunkGeo, 0x9b6b43, { y: 0.15, parent: g });
    if (pine) { mesh(pineGeo, 0x3f9e57, { y: 0.55, parent: g }); mesh(G.cone(0.2, 0.42, 12), 0x4fb565, { y: 0.8, parent: g }); }
    else { mesh(canopyGeo, 0x58b35c, { y: 0.48, parent: g }); mesh(G.sphere(0.17, 12, 9), 0x6cc46e, { x: 0.17, y: 0.38, z: 0.1, parent: g }); }
    return addItem(g, ta);
  }
  tree(0.6, -0.95, 0.85); tree(1.75, -1.0, 0.75, true); tree(4.1, -1.0, 0.9);
  tree(4.95, -1.8, 1.0, true); tree(5.75, -1.05, 0.85); tree(6.9, -1.0, 1.0, true); tree(7.25, -1.8, 0.9);
  tree(2.3, -0.95, 0.7);

  // ------------------------------------------------------------ 自転車 + 男の子
  const bike = group(root, { x: XR, z: 0.42, ry: -0.28 });
  blobShadow(bike, 0.95, { sz: 0.35, y: 0.03 });
  const rig = group(bike);        // 上下ゆれ
  const SIL = 0xc9d1da, TIRE = 0x3a3d46;
  const WR = 0.36;
  const RW = [-0.56, WR], FW = [0.56, WR], BB = [-0.04, 0.3];
  const wheels = [];
  const spokeGeo = G.cyl(0.008, 0.008, WR * 2 - 0.06, 5);
  for (const [x, y] of [RW, FW]) {
    const w = group(rig, { x, y });
    mesh(G.torus(WR - 0.035, 0.038, 10, 40), TIRE, { parent: w, px: 1.5 });
    mesh(G.torus(WR - 0.07, 0.012, 6, 36), SIL, { parent: w, line: false });
    const sp = group(w);
    for (let i = 0; i < 6; i++) mesh(spokeGeo, 0xe6ebf0, { rz: i * Math.PI / 6, parent: sp, line: false });
    mesh(G.cyl(0.04, 0.04, 0.1, 12), SIL, { rx: Math.PI / 2, parent: w, px: 1.1 });
    // 泥よけ
    mesh(G.torus(WR + 0.03, 0.022, 6, 24, Math.PI * 0.55), SIL, { rz: Math.PI * 0.22, parent: rig, x, y, px: 1.1 });
    wheels.push(sp);
  }
  const HT = [0.42, 0.82];   // ヘッドチューブ上端
  rod(rig, [0.46, 0.72], FW.concat(0), 0.022, SIL);            // フォーク
  rod(rig, [0.4, 0.86], [0.47, 0.66], 0.03, SIL);              // ヘッド
  rod(rig, [0.44, 0.7], [0.1, 0.34], 0.03, SIL);               // ダウンチューブ（ママチャリ型）
  rod(rig, [0.1, 0.34], BB.concat(0), 0.03, SIL);
  rod(rig, BB.concat(0), [-0.3, 0.86], 0.028, SIL);           // シートチューブ
  rod(rig, BB.concat(0), RW.concat(0), 0.02, SIL);            // チェーンステー
  rod(rig, [-0.26, 0.76], RW.concat(0), 0.02, SIL);           // シートステー
  rod(rig, [-0.3, 0.86], [-0.32, 0.96], 0.02, 0x555a64);
  mesh(G.capsule(0.06, 0.14, 4, 10), 0x4a3a32, { x: -0.33, y: 0.99, rz: Math.PI / 2, sz: 1.2, parent: rig, px: 1.3 }); // サドル
  // ハンドル
  rod(rig, [0.4, 0.86], [0.36, 1.03], 0.02, SIL);
  rod(rig, [0.36, 1.03, -0.2], [0.36, 1.03, 0.2], 0.02, SIL);
  for (const z of [-0.22, 0.22]) mesh(G.capsule(0.03, 0.06, 4, 8), 0x4a3a32, { x: 0.3, y: 1.03, z, rz: Math.PI / 2, parent: rig, px: 1.1 });
  // かご
  const basket = mesh(G.box(0.3, 0.2, 0.3, 0.03), 0xdfe5ea, { x: 0.66, y: 0.84, parent: rig, px: 1.4 });
  mesh(G.box(0.26, 0.02, 0.26, 0.01), 0x9aa3ad, { y: 0.1, parent: basket, line: false });
  // 荷台
  mesh(G.box(0.34, 0.03, 0.2, 0.01), SIL, { x: -0.52, y: 0.78, parent: rig, px: 1.1 });
  rod(rig, [-0.4, 0.78], [-0.56, WR], 0.012, SIL, 1);
  // クランク
  const crank = group(rig, { x: BB[0], y: BB[1] });
  mesh(G.puck(0.11, 0.03, 0.01, 24), 0xaab3bd, { rx: Math.PI / 2, z: 0.06, parent: crank, px: 1.2 });
  const CR = 0.15;
  const arms = [];
  for (const s of [1, -1]) {
    const a = mesh(G.box(0.03, CR, 0.02, 0.01), 0x8a939d, { z: s * 0.085, parent: crank, px: 1 });
    arms.push(a);
  }

  // 男の子
  const SKIN = 0xffd9bd, HOOD = 0xe53935, SHORTS = 0x1f3a68, SHOE = 0x2f8be6;
  const HIP = [-0.3, 1.05];
  const L1 = 0.45, L2 = 0.47;
  const legs = [];
  for (const s of [1, -1]) {
    const zz = s * 0.12;
    const thigh = mesh(G.capsule(0.075, L1 - 0.06, 4, 10), SKIN, { z: zz, parent: rig, px: 1.5 });
    mesh(G.capsule(0.095, L1 * 0.45, 4, 10), SHORTS, { y: L1 * 0.22, parent: thigh, px: 1.5 });
    const shin = mesh(G.capsule(0.062, L2 - 0.06, 4, 10), SKIN, { z: zz, parent: rig, px: 1.5 });
    const foot = group(rig, { z: zz });
    mesh(G.box(0.2, 0.09, 0.11, 0.04), SHOE, { x: 0.04, y: 0.04, parent: foot, px: 1.4 });
    mesh(G.box(0.21, 0.03, 0.12, 0.012), 0xffffff, { x: 0.04, y: -0.005, parent: foot, px: 1.1 });
    const pedal = mesh(G.box(0.1, 0.025, 0.08, 0.01), 0x555a64, { z: zz, parent: rig, px: 1 });
    legs.push({ thigh, shin, foot, pedal, s });
  }
  // 胴体
  const torso = group(rig, { x: HIP[0], y: HIP[1] });
  mesh(G.sphere(0.17, 16, 12), SHORTS, { y: 0.02, sx: 1.1, sz: 1.25, parent: torso });
  const body = mesh(G.capsule(0.2, 0.2, 6, 14), HOOD, { x: 0.08, y: 0.24, rz: -0.35, sz: 1.05, parent: torso });
  mesh(G.box(0.1, 0.14, 0.02, 0.03), 0xc62828, { x: 0.07, y: -0.03, z: 0.2, parent: body, px: 1.1 }); // ポケット
  // フード
  mesh(G.sphere(0.15, 14, 10), 0xd32f2f, { x: -0.1, y: 0.5, sx: 0.8, parent: torso, px: 1.4 });
  // 腕
  const SH = [HIP[0] + 0.22, HIP[1] + 0.42];
  const GRIP = [0.3, 1.03];
  for (const s of [1, -1]) {
    rod(rig, [SH[0], SH[1], s * 0.17], [GRIP[0] - 0.05, GRIP[1] + 0.02, s * 0.21], 0.06, HOOD, 1.4);
    mesh(G.sphere(0.055, 10, 8), SKIN, { x: GRIP[0], y: GRIP[1] + 0.02, z: s * 0.22, parent: rig, px: 1.2 });
  }
  // 頭
  const head = group(rig, { x: HIP[0] + 0.3, y: HIP[1] + 0.72, ry: 0.75 });
  mesh(G.sphere(0.25, 24, 18), SKIN, { parent: head });
  const hair = new THREE.SphereGeometry(0.265, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.5);
  mesh(hair, 0x4a2f22, { y: 0.02, rx: -0.32, parent: head });
  for (const [x, y] of [[-0.1, 0.17], [0.02, 0.19], [0.13, 0.16]]) mesh(G.sphere(0.07, 10, 8), 0x4a2f22, { x, y, z: 0.17, sz: 0.6, parent: head, line: false });
  for (const s of [-1, 1]) {
    mesh(G.sphere(0.038, 10, 8), 0x10202a, { x: s * 0.085, y: 0.03, z: 0.225, sy: 1.25, sz: 0.5, parent: head, line: false });
    mesh(G.sphere(0.012, 6, 5), 0xffffff, { x: s * 0.085 + 0.012, y: 0.05, z: 0.243, parent: head, line: false });
    mesh(G.sphere(0.045, 10, 8), 0xff9e9e, { x: s * 0.15, y: -0.05, z: 0.19, sz: 0.3, ry: s * 0.6, parent: head, line: false });
    mesh(G.sphere(0.055, 10, 8), SKIN, { x: s * 0.245, y: 0.0, sx: 0.5, parent: head, px: 1.2 });
  }
  mesh(G.torus(0.06, 0.014, 6, 14, Math.PI), 0x10202a, { y: -0.06, z: 0.228, rz: Math.PI, parent: head, line: false });

  function ik(h, p) {
    const dx = p[0] - h[0], dy = p[1] - h[1];
    const d = Math.min(Math.hypot(dx, dy), L1 + L2 - 1e-3);
    const a = Math.atan2(dy, dx);
    const A = Math.acos(clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1));
    return [h[0] + L1 * Math.cos(a + A), h[1] + L1 * Math.sin(a + A)];
  }
  function placeLimb(m, a, b) {
    m.position.x = (a[0] + b[0]) / 2; m.position.y = (a[1] + b[1]) / 2;
    m.rotation.z = Math.atan2(b[1] - a[1], b[0] - a[0]) - Math.PI / 2;
  }

  // ------------------------------------------------------------ マウス（ホイール = ペダル）
  const mouse = group(root, { x: 1.62, y: -0.3, z: 1.85, ry: 0.95, s: 1.7 });
  blobShadow(mouse, 0.5, { y: -0.005, sz: 1.3 });
  const mb = group(mouse);
  const shellTex = canvasTexture(512, 256, (ctx, w, h) => {
    ctx.fillStyle = '#fff8e8'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#8a7d6a'; ctx.lineWidth = 7; ctx.lineCap = 'round';
    // 左右ボタンの境目（前側 = -z = u 0.75）と、ボタンの下端
    ctx.beginPath(); ctx.moveTo(w * 0.75, 0); ctx.lineTo(w * 0.75, h * 0.42); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(w * 0.5, h * 0.2); ctx.quadraticCurveTo(w * 0.62, h * 0.12, w * 0.75, h * 0.12); ctx.quadraticCurveTo(w * 0.88, h * 0.12, w * 1.0, h * 0.2); ctx.stroke();
  });
  mesh(G.sphere(0.3, 32, 22), new THREE.MeshToonMaterial({ map: shellTex.tex }), { y: 0.0, sx: 0.8, sy: 0.48, sz: 1.28, parent: mb });
  const wheelTex = canvasTexture(256, 32, (ctx, w, h) => {
    ctx.fillStyle = '#3a3f4a'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#f25534';
    for (let i = 0; i < 8; i++) ctx.fillRect(i * 32 + 6, 0, 14, h);
  });
  mesh(G.box(0.1, 0.03, 0.2, 0.012), 0x2b2f38, { y: 0.125, z: -0.17, rx: -0.12, parent: mb, line: false });
  const mw = group(mb, { y: 0.13, z: -0.17 });
  mesh(G.cyl(0.085, 0.085, 0.07, 24), new THREE.MeshToonMaterial({ map: wheelTex.tex }), { rz: Math.PI / 2, parent: mw, px: 1.3 });
  // コード（ジオラマへつながる）
  mouse.updateMatrixWorld(true);
  const c0 = new THREE.Vector3(0, -0.03, -0.37).applyMatrix4(mouse.matrixWorld);
  mesh(G.tube([[c0.x, c0.y, c0.z], [c0.x - 0.25, -0.29, c0.z - 0.05], [c0.x - 0.7, -0.29, 1.62], [c0.x - 1.05, -0.26, 1.33]], 0.02, 30), 0x5a6068, { parent: root, px: 1.1 });
  // くるくる矢印（ホイールの回転面）
  const arrow = group(mb, { y: 0.13, z: -0.17, ry: Math.PI / 2 });
  const ARC = Math.PI * 0.95, AR = 0.19;
  mesh(G.torus(AR, 0.028, 8, 28, ARC), CORAL, { rz: 0.1, parent: arrow, px: 1.4 });
  mesh(G.cone(0.065, 0.14, 12), CORAL, { x: AR * Math.cos(0.1) , y: AR * Math.sin(0.1) - 0.05, rz: Math.PI, parent: arrow, px: 1.4 });

  // ------------------------------------------------------------ 県名トースト
  function toastTex(text) {
    return canvasTexture(640, 220, (ctx, w, h) => {
      ctx.font = `900 ${text.length > 3 ? 132 : 150}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineJoin = 'round';
      ctx.lineWidth = 34; ctx.strokeStyle = INK; ctx.strokeText(text, w / 2, h / 2 + 8);
      ctx.lineWidth = 20; ctx.strokeStyle = CREAM; ctx.strokeText(text, w / 2, h / 2 + 8);
      ctx.fillStyle = CORAL; ctx.fillText(text, w / 2, h / 2 + 8);
    });
  }
  const toasts = [['東京都', 0.25], ['神奈川県', 4.55]].map(([txt, ta]) => {
    const m = new THREE.Mesh(G.plane(2.3, 0.79), new THREE.MeshBasicMaterial({ map: toastTex(txt).tex, transparent: true, depthTest: false }));
    m.renderOrder = 10; root.add(m);
    return { m, ta };
  });

  // ------------------------------------------------------------ update
  function update(t) {
    const TAU = Math.PI * 2;
    const scroll = V * t;

    // 景色
    for (const it of items) {
      const x = wrap(it.x0 - scroll, L);
      const e = clamp((XE - Math.abs(x)) / 0.45);
      it.g.visible = e > 0.001;
      it.g.position.x = x;
      const k = easeOutBack(e);
      it.g.scale.setScalar(it.s0 * Math.max(0.001, k));
    }
    for (const p of posts) {
      const x = wrap(p.x0 - scroll, 6);
      p.m.position.x = x;
      p.m.visible = Math.abs(x) < XE - 0.15;
    }
    for (const f of flowers) {
      const x = wrap(f.x0 - scroll, 6);
      const e = clamp((XE - 0.1 - Math.abs(x)) / 0.3);
      f.g.position.x = x; f.g.scale.setScalar(Math.max(0.001, e));
    }
    roadTex.tex.offset.x = (scroll) % 1;

    // ペダル（8 回転 / ループ）とタイヤ（5 回転 / ループ）
    const ca = -TAU * 8 * t / DUR;
    const wa = -TAU * 5 * t / DUR;
    wheels.forEach((w) => { w.rotation.z = wa; });
    crank.rotation.z = ca;
    rig.position.y = 0.018 * Math.sin(2 * ca) ** 2;
    for (const lg of legs) {
      const pa = ca + (lg.s > 0 ? 0 : Math.PI);
      const P = [BB[0] + Math.cos(pa) * CR, BB[1] + Math.sin(pa) * CR];
      const K = ik(HIP, P);
      placeLimb(lg.thigh, HIP, K);
      placeLimb(lg.shin, K, P);
      lg.foot.position.set(P[0], P[1] + 0.02, lg.foot.position.z);
      lg.foot.rotation.z = 0.12 * Math.sin(pa);
      lg.pedal.position.set(P[0], P[1] - 0.01, lg.pedal.position.z);
    }
    // クランクアーム（左右）
    for (let i = 0; i < 2; i++) {
      const pa = (i === 0 ? 0 : Math.PI);
      arms[i].rotation.z = pa - Math.PI / 2;
      arms[i].position.x = Math.cos(pa) * CR / 2; arms[i].position.y = Math.sin(pa) * CR / 2;
    }
    head.rotation.z = 0.04 * Math.sin(ca);

    // マウスのホイール
    mw.rotation.x = ca;
    arrow.scale.setScalar(1 + 0.07 * Math.sin(ca) ** 2);

    // 雲
    for (const c of clouds) c.c.position.x = c.x + 0.12 * Math.sin(TAU * t / DUR + c.ph);

    // 県名トースト
    for (const ts of toasts) {
      const ph = ((t - ts.ta - 0.15) % DUR + DUR) % DUR;
      const k = ph < 2.2 ? easeOutBack(seg(ph, 0, 0.4, (x) => x)) * (1 - seg(ph, 1.9, 2.2)) : 0;
      ts.m.visible = k > 0.001;
      ts.m.scale.setScalar(Math.max(0.001, k) * 0.88);
      ts.m.position.set(0.5, 2.3 + 0.04 * Math.sin(ph * 5), 0.6);
      ts.m.quaternion.copy(camera.quaternion);
    }
  }

  return { scene, camera, update, duration: DUR };
});
