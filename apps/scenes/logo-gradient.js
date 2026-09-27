// ロゴクリエイター: 「LOGO」の立体文字がピョンとアーチに並ぶ → グラデーション（炎→海→虹）
//   → 白＋黒のフチ取り → 光のにじみとキラキラ → 元に戻る
import { THREE, defineScene, stage, mesh, group, G, toon, outline, canvasTexture, blobShadow, starShape,
  clamp, lerp, seg, bump, smooth, easeOutBack, easeOutCubic, rand } from '../engine.js';

defineScene('logo-gradient', () => {
  const { scene, camera, root } = stage({ fov: 30, pos: [0, 2.35, 8.7], target: [0, 0.78, 0], light: [2.5, 6, 7] });
  const DUR = 9;

  // ---- パレット（ツールのプリセットと同じ色）
  const PAL = {
    plain: ['#ffffff', '#ffffff'],
    fire: ['#ff4500', '#ff8c00', '#ffd700'],
    sea: ['#0077b6', '#00b4d8', '#90e0ef'],
    rainbow: ['#ff0000', '#ff8800', '#ffff00', '#00cc00', '#0066ff', '#8800ff'],
  };
  const LUT_N = 128;
  function makeLut(stops) {
    const cs = stops.map(h => new THREE.Color().setStyle(h, THREE.LinearSRGBColorSpace)); // sRGB 値のまま補間
    const out = new Float32Array(LUT_N * 3);
    const tmp = new THREE.Color();
    for (let i = 0; i < LUT_N; i++) {
      const s = i / (LUT_N - 1) * (cs.length - 1);
      const a = Math.min(cs.length - 2, Math.floor(s));
      tmp.copy(cs[a]).lerp(cs[a + 1], s - a);
      out.set([tmp.r, tmp.g, tmp.b], i * 3);
    }
    return out;
  }
  const LUT = Object.fromEntries(Object.entries(PAL).map(([k, v]) => [k, makeLut(v)]));

  // ---- 文字の形（XY、ベースライン y=0、高さ 1）
  function shapeL() {
    const s = new THREE.Shape();
    const w = 0.66, t = 0.27, r = 0.06;
    s.moveTo(r, 0);
    s.lineTo(w - r, 0); s.quadraticCurveTo(w, 0, w, r);
    s.lineTo(w, t - r); s.quadraticCurveTo(w, t, w - r, t);
    s.lineTo(t, t);
    s.lineTo(t, 1 - r); s.quadraticCurveTo(t, 1, t - r, 1);
    s.lineTo(r, 1); s.quadraticCurveTo(0, 1, 0, 1 - r);
    s.lineTo(0, r); s.quadraticCurveTo(0, 0, r, 0);
    return s;
  }
  function shapeO() {
    const s = new THREE.Shape();
    s.absellipse(0.45, 0.5, 0.45, 0.5, 0, Math.PI * 2, false, 0);
    const h = new THREE.Path();
    h.absellipse(0.45, 0.5, 0.2, 0.27, 0, Math.PI * 2, true, 0);
    s.holes.push(h);
    return s;
  }
  function shapeG() {
    const s = new THREE.Shape();
    const cx = 0.5, cy = 0.5, Ro = 0.5, Ri = 0.24;
    const a0 = 0.62;
    s.moveTo(cx + Math.cos(a0) * Ro, cy + Math.sin(a0) * Ro);
    s.absarc(cx, cy, Ro, a0, Math.PI * 2, false);
    s.lineTo(cx + Ro, cy + 0.08);
    s.lineTo(cx + 0.03, cy + 0.08);
    s.lineTo(cx + 0.03, cy - 0.15);
    const b = -0.66;
    s.lineTo(cx + Math.cos(b) * Ri, cy + Math.sin(b) * Ri);
    s.absarc(cx, cy, Ri, b, a0 - Math.PI * 2, true);
    s.closePath();
    return s;
  }
  const DEPTH = 0.34;
  const letters = [
    { shape: shapeL(), w: 0.66 },
    { shape: shapeO(), w: 0.9 },
    { shape: shapeG(), w: 1.0 },
    { shape: shapeO(), w: 0.9 },
  ];
  const GAPX = 0.13;
  const TOTAL = letters.reduce((a, L) => a + L.w, 0) + GAPX * (letters.length - 1);

  // ---- 台
  const podium = group(root, { y: -0.14 });
  mesh(G.puck(2.35, 0.24, 0.09, 48), 0xe3cffc, { parent: podium });
  mesh(G.puck(2.5, 0.12, 0.05, 48), 0xa97fe0, { y: -0.14, parent: podium });
  blobShadow(root, 2.9, { y: -0.3, sz: 0.55 });

  // ---- 光のにじみ（後光）
  const glowTex = canvasTexture(256, 256, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    g.addColorStop(0, 'rgba(255,255,255,0.95)');
    g.addColorStop(0.45, 'rgba(255,255,255,0.55)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  });
  const glowMat = new THREE.MeshBasicMaterial({ map: glowTex.tex, transparent: true, depthWrite: false, opacity: 0, color: 0xffd27a });
  const glow = new THREE.Mesh(G.plane(5.6, 3.0), glowMat);
  glow.position.set(0, 0.95, -0.6);
  root.add(glow);

  // ---- 文字メッシュ
  // グラデーションは 1D テクスチャ（uv.x = グラデーション座標）
  const gradTex = canvasTexture(LUT_N, 1, null);
  gradTex.tex.minFilter = gradTex.tex.magFilter = THREE.LinearFilter;
  gradTex.tex.generateMipmaps = false;
  gradTex.tex.wrapS = THREE.ClampToEdgeWrapping;
  const gradImg = gradTex.ctx.createImageData(LUT_N, 1);
  const letterMat = new THREE.MeshToonMaterial({ map: gradTex.tex, color: 0xffffff, gradientMap: toon(0xffffff).gradientMap });
  const WHITE_PX = 6.37, DARK_PX = 11.41;          // このシーン専用の太さキー
  const rims = [];
  let x = -TOTAL / 2;
  const items = letters.map((L, i) => {
    const geo = G.extrude(L.shape, DEPTH, 0.04, 24);
    geo.translate(-L.w / 2, -0.5, 0);
    const cxw = x + L.w / 2;
    x += L.w + GAPX;
    // グラデーション座標（135° 方向: 左上 → 右下）
    const pos = geo.getAttribute('position');
    const uvArr = new Float32Array(pos.count * 2);
    for (let k = 0; k < pos.count; k++) {
      const u = (cxw + pos.getX(k) + TOTAL / 2) / TOTAL;
      const v = 1 - (pos.getY(k) + 0.5);
      uvArr[k * 2] = clamp(u * 0.72 + v * 0.28, 0.004, 0.996);
      uvArr[k * 2 + 1] = 0.5;
    }
    geo.setAttribute('uv', new THREE.BufferAttribute(uvArr, 2));
    const hop = group(root);
    const m = mesh(geo, letterMat, { parent: hop, px: 2.4 });
    // 白 → 黒 の二重フチ（輪郭線シェーダーを太くして使う）
    outline(m, { color: 0xffffff, px: WHITE_PX });
    outline(m, { color: 0x2b2320, px: DARK_PX });
    const hulls = m.children.filter(c => c.name === '__outline');
    const white = hulls[1], dark = hulls[2];
    white.position.z = -0.03; dark.position.z = -0.06;
    white.renderOrder = -1; dark.renderOrder = -2;
    rims.push(white, dark);
    const sh = blobShadow(root, L.w * 0.62, { sz: 0.45 });
    return { hop, m, geo, cxw, i, sh };
  });
  const whiteU = rims[0].material.uniforms.uPx;
  const darkU = rims[1].material.uniforms.uPx;

  // ---- キラキラ
  const sparkGeo = G.extrude(starShape(0.13, 0.055), 0.03, 0.01);
  const sparks = [];
  const R = rand(9);
  for (let i = 0; i < 12; i++) {
    const m = mesh(sparkGeo, [0xffd23f, 0xffffff, 0xff8fd8][i % 3], { parent: root, px: 1.3 });
    sparks.push({ m, a: (i / 12) * Math.PI * 2 + R() * 0.3, r: 1.0 + R() * 0.25, d: R() * 0.25 });
  }

  // ---- タイムライン
  const ARC_R = 3.1;
  const HOP_IN = 0.5, HOP_OUT = 7.75, HOPD = 0.55, STAG = 0.14;
  const WIPES = [      // [開始, from, to]
    [1.75, 'plain', 'fire'],
    [4.2, 'fire', 'sea'],
    [5.5, 'sea', 'rainbow'],
    [7.2, 'rainbow', 'plain'],
  ];
  const WIPED = 0.75;
  const RIM_W0 = 2.6, RIM_D0 = 2.85, RIM_OFF = 7.0;
  const GLOW0 = 3.1, SPARK0 = 3.2;

  function paletteState(t) {
    let from = 'plain', to = 'plain', k = 0;
    for (const [a, f, g] of WIPES) {
      if (t >= a) { from = f; to = g; k = clamp((t - a) / WIPED); }
    }
    return [from, to, k];
  }
  const glowColors = { plain: new THREE.Color(0xffffff), fire: new THREE.Color(0xffc060), sea: new THREE.Color(0x9fe6ff), rainbow: new THREE.Color(0xfff08a) };
  const tmpC = new THREE.Color();

  function update(t) {
    // 色
    const [from, to, wk] = paletteState(t);
    const A = LUT[from], B = LUT[to];
    const edge = wk * 1.5 - 0.25;
    const px = gradImg.data;
    for (let k = 0; k < LUT_N; k++) {
      const s = k / (LUT_N - 1);
      const bl = smooth((edge - s) / 0.25 + 0.5);
      const li = k * 3;
      px[k * 4] = 255 * (A[li] + (B[li] - A[li]) * bl);
      px[k * 4 + 1] = 255 * (A[li + 1] + (B[li + 1] - A[li + 1]) * bl);
      px[k * 4 + 2] = 255 * (A[li + 2] + (B[li + 2] - A[li + 2]) * bl);
      px[k * 4 + 3] = 255;
    }
    gradTex.ctx.putImageData(gradImg, 0, 0);
    gradTex.tex.needsUpdate = true;

    // アーチへピョン → 戻る
    for (const it of items) {
      const a = HOP_IN + it.i * STAG, b = HOP_OUT + (3 - it.i) * STAG;
      const kin = seg(t, a, a + HOPD, smooth), kout = seg(t, b, b + HOPD, smooth);
      const w = kin * (1 - kout);
      const jump = bump(t, a, a + HOPD) + bump(t, b, b + HOPD);
      const th = it.cxw / ARC_R;
      const thMax = (TOTAL / 2 - 0.3) / ARC_R;
      const ax = ARC_R * Math.sin(th), ay = ARC_R * Math.cos(th) - ARC_R * Math.cos(thMax) + 0.72;
      it.hop.position.set(lerp(it.cxw, ax, w), lerp(0.5, ay, w) + jump * 0.45, 0);
      it.hop.rotation.z = -th * w;
      // 着地のつぶれ
      const land = bump(t, a + HOPD - 0.06, a + HOPD + 0.18) + bump(t, b + HOPD - 0.06, b + HOPD + 0.18);
      it.m.scale.set(1 + 0.1 * land, 1 - 0.12 * land, 1);
      it.m.position.y = -0.06 * land;
      // 見せ場のゆらゆら
      const show = seg(t, 3.4, 3.8) * (1 - seg(t, 6.9, 7.3));
      it.hop.position.y += show * 0.05 * Math.sin(t * 3.2 - it.i * 0.9);
      it.sh.position.set(it.hop.position.x, 0.005, 0.1);
      it.sh.material.opacity = 1 - 0.5 * clamp(it.hop.position.y - 0.5);
    }

    // 二重フチ
    const wOn = seg(t, RIM_W0, RIM_W0 + 0.4, easeOutBack) * (1 - seg(t, RIM_OFF, RIM_OFF + 0.35));
    const dOn = seg(t, RIM_D0, RIM_D0 + 0.4, easeOutBack) * (1 - seg(t, RIM_OFF - 0.1, RIM_OFF + 0.3));
    const dpx = lerp(0, DARK_PX, dOn);
    const wpx = lerp(0, WHITE_PX, wOn) + (dOn > 0.01 ? 0 : 0);
    whiteU.value = Math.max(wpx, 0.01);
    darkU.value = Math.max(dpx, wpx + 0.5 * dOn, 0.01);
    for (let i = 0; i < rims.length; i += 2) {
      rims[i].visible = wOn > 0.01;
      rims[i + 1].visible = dOn > 0.01;
    }

    // 後光
    const gk = seg(t, GLOW0, GLOW0 + 0.5) * (1 - seg(t, RIM_OFF, RIM_OFF + 0.5));
    glowMat.opacity = gk * (0.75 + 0.15 * Math.sin(t * 4));
    tmpC.copy(glowColors[from]).lerp(glowColors[to], wk);
    glowMat.color.copy(tmpC);
    glow.scale.setScalar(0.9 + 0.1 * gk);
    glow.visible = gk > 0.005;

    // キラキラ（フチが付いた瞬間と虹のとき）
    for (const s of sparks) s.m.visible = false;
    for (const t0 of [SPARK0, 5.5 + WIPED]) {
      const st = t - t0;
      for (const s of sparks) {
        const tt = st - s.d;
        if (!(tt > 0 && tt < 1.2)) continue;
        s.m.visible = true;
        const k = easeOutCubic(tt / 1.2);
        const rr = s.r * (0.8 + 0.4 * k);
        s.m.position.set(Math.cos(s.a) * rr * 2.2, 1.0 + Math.sin(s.a) * rr * 0.95, 0.5);
        s.m.rotation.set(0, 0, tt * 3 + s.a);
        s.m.scale.setScalar(Math.max(0.001, bump(tt, 0, 1.2) * 1.2));
      }
    }
  }

  return { scene, camera, update, duration: DUR };
});
