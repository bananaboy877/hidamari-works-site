// 画像グリッド分割: 写真にハサミで赤い切り取り線 → 3×3 のタイルに分かれて番号札 → 元に戻る
import { THREE, defineScene, stage, mesh, group, G, flat, canvasTexture, blobShadow, starShape, FONT,
  clamp, lerp, seg, bump, smooth, easeOutBack, easeOutCubic, rand } from '../engine.js';

defineScene('image-splitter', () => {
  const { scene, camera, root } = stage({ fov: 30, pos: [0, 7.4, 5.3], target: [0, -0.05, 0.2], light: [3, 9, 5] });
  const DUR = 10;

  const PW = 2.6, PH = 1.95;       // 写真の幅・奥行き
  const N = 3;
  const TW = PW / N, TH = PH / N;
  const GAP = 0.24;
  const THK = 0.05;
  const RED = 0xf05050;
  const GOLD = 0xf0c040;
  const INKS = '#2b2320';

  // ---- カッティングマット
  const matTex = canvasTexture(512, 400, (ctx, w, h) => {
    ctx.fillStyle = '#5fae8c'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(255,255,255,0.28)'; ctx.lineWidth = 1.5;
    for (let x = 16; x < w; x += 32) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
    for (let y = 8; y < h; y += 32) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 3;
    for (let x = 16; x < w; x += 160) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
    for (let y = 8; y < h; y += 160) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
  });
  const MW = 4.3, MD = 3.35;
  mesh(G.box(MW, 0.14, MD, 0.07), 0x3f8a6c, { y: -0.07, parent: root });
  mesh(G.plane(MW - 0.1, MD - 0.1), new THREE.MeshToonMaterial({ map: matTex.tex }), { rx: -Math.PI / 2, y: 0.002, line: false, parent: root });
  blobShadow(root, 3.2, { y: -0.14, sz: 0.8 });

  // ---- 写真の絵（風景）
  const pic = canvasTexture(768, 576, (ctx, w, h) => {
    const sky = ctx.createLinearGradient(0, 0, 0, h * 0.6);
    sky.addColorStop(0, '#7cc8ff'); sky.addColorStop(1, '#d9f1ff');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.strokeStyle = INKS; ctx.lineWidth = 6;
    // 太陽
    ctx.fillStyle = '#ffd23f';
    ctx.beginPath(); ctx.arc(620, 110, 62, 0, 7); ctx.fill(); ctx.stroke();
    for (let i = 0; i < 10; i++) {
      const a = i / 10 * Math.PI * 2;
      ctx.beginPath(); ctx.moveTo(620 + Math.cos(a) * 80, 110 + Math.sin(a) * 80); ctx.lineTo(620 + Math.cos(a) * 104, 110 + Math.sin(a) * 104); ctx.stroke();
    }
    ctx.fillStyle = INKS;
    ctx.beginPath(); ctx.arc(600, 100, 7, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(640, 100, 7, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(620, 118, 18, 0.2, Math.PI - 0.2); ctx.stroke();
    // 雲
    const cloud = (x, y, s) => {
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(x, y, 30 * s, Math.PI * 0.5, Math.PI * 1.5);
      ctx.arc(x + 40 * s, y - 24 * s, 36 * s, Math.PI, Math.PI * 2);
      ctx.arc(x + 88 * s, y, 30 * s, Math.PI * 1.5, Math.PI * 0.5);
      ctx.closePath(); ctx.fill(); ctx.stroke();
    };
    cloud(80, 110, 1.1); cloud(330, 70, 0.8);
    // 山
    ctx.fillStyle = '#8a8ee0';
    ctx.beginPath(); ctx.moveTo(-20, 390); ctx.lineTo(250, 150); ctx.lineTo(520, 390); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.moveTo(250, 150); ctx.lineTo(310, 204); ctx.lineTo(280, 196); ctx.lineTo(252, 216); ctx.lineTo(222, 194); ctx.lineTo(192, 202); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#a4a8f0';
    ctx.beginPath(); ctx.moveTo(360, 390); ctx.lineTo(560, 230); ctx.lineTo(790, 390); ctx.closePath(); ctx.fill(); ctx.stroke();
    // 丘
    ctx.fillStyle = '#8fd46a';
    ctx.beginPath(); ctx.moveTo(-10, 400); ctx.quadraticCurveTo(200, 320, 420, 390); ctx.quadraticCurveTo(620, 330, 780, 380); ctx.lineTo(780, 600); ctx.lineTo(-10, 600); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#6cc05a';
    ctx.beginPath(); ctx.moveTo(-10, 480); ctx.quadraticCurveTo(300, 420, 780, 470); ctx.lineTo(780, 600); ctx.lineTo(-10, 600); ctx.closePath(); ctx.fill(); ctx.stroke();
    // 家
    ctx.fillStyle = '#fff4dc'; ctx.fillRect(90, 400, 110, 80); ctx.strokeRect(90, 400, 110, 80);
    ctx.fillStyle = '#e8584c';
    ctx.beginPath(); ctx.moveTo(74, 404); ctx.lineTo(145, 345); ctx.lineTo(216, 404); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#b8764a'; ctx.fillRect(130, 435, 30, 45); ctx.strokeRect(130, 435, 30, 45);
    // 木
    const tree = (x, y, s) => {
      ctx.fillStyle = '#9a6a44'; ctx.fillRect(x - 8 * s, y, 16 * s, 40 * s); ctx.strokeRect(x - 8 * s, y, 16 * s, 40 * s);
      ctx.fillStyle = '#3fa45a'; ctx.beginPath(); ctx.arc(x, y - 10 * s, 36 * s, 0, 7); ctx.fill(); ctx.stroke();
    };
    tree(620, 420, 1.1); tree(700, 450, 0.8);
    // 花
    for (const [x, y, c] of [[300, 520, '#ff7aa8'], [360, 540, '#ffd23f'], [420, 515, '#ff7aa8'], [520, 540, '#fff'], [250, 548, '#ffd23f']]) {
      ctx.fillStyle = c; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(x, y, 12, 0, 7); ctx.fill(); ctx.stroke();
    }
  });
  pic.tex.anisotropy = 8;
  const pMat = new THREE.MeshToonMaterial({ map: pic.tex });

  // 1 枚の写真（切る前）
  const whole = group(root, { y: THK / 2 + 0.005 });
  mesh(G.box(PW, THK, PH, 0.02), 0xffffff, { parent: whole, px: 2 });
  // マットに寝ている紙は輪郭線が隠れやすいので、黒い下敷きでフチを描く
  mesh(G.box(PW + 0.04, THK * 0.7, PH + 0.04, 0.03), 0x2b2320, { y: -THK * 0.2, line: false, parent: whole });
  mesh(G.plane(PW - 0.004, PH - 0.004), pMat, { rx: -Math.PI / 2, y: THK / 2 + 0.002, line: false, parent: whole });

  // タイル
  const tileBody = G.box(TW, THK, TH, 0.018);
  const tileInk = G.box(TW + 0.035, THK * 0.7, TH + 0.035, 0.025);
  const tileBack = G.plane(TW, TH);
  const TAGW = 0.5, TAGH = 0.3;
  const tagBody = G.box(TAGW, 0.04, TAGH, 0.06);
  const tagPlane = G.plane(TAGW - 0.03, TAGH - 0.03);
  const tiles = [];
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const k = j * N + i;
    const g = group(root);
    mesh(tileBody, 0xffffff, { parent: g, px: 1.8 });
    mesh(tileInk, 0x2b2320, { y: -THK * 0.2, line: false, parent: g });
    mesh(tileBack, 0xffffff, { rx: Math.PI / 2, y: -THK * 0.55 - 0.002, line: false, parent: g });   // 裏面は白
    const pg = new THREE.PlaneGeometry(TW - 0.004, TH - 0.004);
    const uv = pg.getAttribute('uv');
    for (let v = 0; v < uv.count; v++) uv.setXY(v, (i + uv.getX(v)) / N, 1 - (j + 1 - uv.getY(v)) / N);
    mesh(pg, pMat, { rx: -Math.PI / 2, y: THK / 2 + 0.002, line: false, parent: g });
    // 番号札
    const num = String(k + 1).padStart(2, '0');
    const tt = canvasTexture(200, 120, (ctx, w, h) => {
      ctx.font = `900 96px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = INKS; ctx.fillText(num, w / 2, h / 2 + 6);
    });
    const tag = group(g, { x: -TW / 2 + 0.2, y: THK / 2 + 0.06, z: -TH / 2 + 0.1 });
    mesh(tagBody, GOLD, { parent: tag, px: 1.6 });
    mesh(tagPlane, new THREE.MeshBasicMaterial({ map: tt.tex, transparent: true }), { rx: -Math.PI / 2, y: 0.022, line: false, parent: tag });
    const home = new THREE.Vector3((i - 1) * TW, THK / 2 + 0.005, (j - 1) * TH);
    const away = new THREE.Vector3((i - 1) * (TW + GAP), 0.45, (j - 1) * (TH + GAP) + 0.05);
    const shadow = blobShadow(root, 0.55, { sz: 0.8 });
    tiles.push({ g, tag, home, away, i, j, k, shadow });
  }

  // ---- 赤い切り取り線
  const lineGeo = new THREE.BoxGeometry(1, 1, 1); lineGeo.translate(0.5, 0, 0);
  const lineMat = flat(RED);
  const EXT = 0.14;
  const LINES = [
    [-TW / 2, -PH / 2 - EXT, -TW / 2, PH / 2 + EXT],
    [TW / 2, PH / 2 + EXT, TW / 2, -PH / 2 - EXT],
    [-PW / 2 - EXT, -TH / 2, PW / 2 + EXT, -TH / 2],
    [PW / 2 + EXT, TH / 2, -PW / 2 - EXT, TH / 2],
  ].map(([x0, z0, x1, z1]) => {
    const len = Math.hypot(x1 - x0, z1 - z0);
    const yaw = -Math.atan2(z1 - z0, x1 - x0);
    const m = mesh(lineGeo, lineMat, { x: x0, y: THK + 0.03, z: z0, ry: yaw, sy: 0.02, sz: 0.05, px: 1.2, parent: root });
    return { x0, z0, x1, z1, len, yaw, m };
  });
  const CUT0 = 1.0, CUTD = 0.7, CUTGAP = 0.32;
  const cutStart = (i) => CUT0 + i * (CUTD + CUTGAP);
  const CUT_END = cutStart(3) + CUTD;
  const SPLIT = CUT_END + 0.12;

  // ---- ハサミ（上から見て ✂ の形。原点 = 刃が交わる切断点）
  const scissors = group(root, { s: 1.12 });
  const body = group(scissors, { x: -0.14 });     // 支点（ネジ）の位置
  const bladeShape = new THREE.Shape();
  bladeShape.moveTo(-0.08, 0.06);
  bladeShape.quadraticCurveTo(0.32, 0.075, 0.62, 0.0);
  bladeShape.quadraticCurveTo(0.3, -0.04, -0.08, -0.05);
  bladeShape.closePath();
  const bladeGeo = G.extrude(bladeShape, 0.018, 0.006, 12);
  const ringGeo = G.torus(0.105, 0.036, 10, 28);
  const shankGeo = G.box(0.2, 0.05, 0.06, 0.02);
  function half(sign) {
    const h = group(body, { y: sign * 0.014 });
    // 刃: 片側に傾けておくと閉じたとき中央で重なる
    mesh(bladeGeo, 0xc9d4e4, { rx: -Math.PI / 2, parent: h, px: 1.6 });
    // 持ち手
    const hz = sign * 0.11;
    mesh(shankGeo, GOLD, { x: -0.15, z: hz * 0.45, ry: sign * 0.45, parent: h, px: 1.6 });
    mesh(ringGeo, GOLD, { x: -0.33, z: hz, rx: Math.PI / 2, parent: h, px: 1.6 });
    return h;
  }
  const hA = half(1), hB = half(-1);
  mesh(G.puck(0.045, 0.06, 0.02), 0x8a96a8, { y: 0.03, parent: body, px: 1.4 });
  const scShadow = blobShadow(root, 0.42);

  const REST = { x: PW / 2 + 0.74, z: 0.35, yaw: Math.PI / 2 };
  const angDiff = (a, b) => { let d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; };
  function hop(from, to, k) {
    const e = smooth(k);
    return { x: lerp(from.x, to.x, e), z: lerp(from.z, to.z, e), lift: Math.sin(e * Math.PI) * 0.4, yaw: from.yaw + angDiff(from.yaw, to.yaw) * e, open: 0.35 * Math.sin(e * Math.PI) };
  }
  const start = (L) => ({ x: L.x0, z: L.z0, yaw: L.yaw });
  const end = (L) => ({ x: L.x1, z: L.z1, yaw: L.yaw });
  function scissorsPose(t) {
    const s0 = cutStart(0);
    if (t < s0 - 0.6) return { ...REST, lift: 0, open: 0 };
    if (t < s0) return hop(REST, start(LINES[0]), (t - (s0 - 0.6)) / 0.6);
    for (let i = 0; i < 4; i++) {
      const L = LINES[i], a = cutStart(i), b = a + CUTD;
      if (t < b) {
        const k = clamp((t - a) / CUTD);
        // チョキチョキ（3 回）
        const open = 0.32 * (0.5 - 0.5 * Math.cos(k * Math.PI * 2 * 3));
        return { x: lerp(L.x0, L.x1, k), z: lerp(L.z0, L.z1, k), yaw: L.yaw, lift: 0, open };
      }
      if (i < 3 && t < cutStart(i + 1)) return hop(end(L), start(LINES[i + 1]), (t - b) / CUTGAP);
    }
    if (t < CUT_END + 0.8) return hop(end(LINES[3]), REST, (t - CUT_END) / 0.8);
    return { ...REST, lift: 0, open: 0 };
  }

  // ---- キラキラ
  const sparkGeo = G.extrude(starShape(0.09, 0.04), 0.02, 0.008);
  const sparks = [];
  const R = rand(11);
  for (let i = 0; i < 10; i++) {
    const m = mesh(sparkGeo, [0xffd23f, 0xffffff, 0xff8fb1][i % 3], { parent: root, px: 1.2 });
    const a = (i / 10) * Math.PI * 2 + R() * 0.4;
    sparks.push({ m, a, r: 1.95 + R() * 0.4, d: R() * 0.25 });
  }

  const SPREAD0 = SPLIT + 0.1, SPREADD = 1.1;
  const TAG_IN = SPREAD0 + 0.8;
  const BACK0 = 8.25, BACKD = 1.0;

  function update(t) {
    // ハサミ
    const P = scissorsPose(t);
    scissors.position.set(P.x, THK + 0.1 + P.lift, P.z);
    scissors.rotation.set(0, P.yaw, 0);
    scissors.rotateX(-0.12);               // 少し傾けて立体感
    hA.rotation.y = P.open / 2;
    hB.rotation.y = -P.open / 2;
    scShadow.position.set(P.x - Math.cos(P.yaw) * 0.12, 0.012, P.z + Math.sin(P.yaw) * 0.12);
    scShadow.scale.setScalar(1 - P.lift * 0.8);

    // 赤い線
    LINES.forEach((L, i) => {
      const grow = clamp((t - cutStart(i)) / CUTD);
      const fade = 1 - seg(t, SPREAD0 + 0.1, SPREAD0 + 0.5);
      L.m.visible = grow > 0 && fade > 0.001 && t < BACK0;
      L.m.scale.x = Math.max(0.001, grow * L.len);
      L.m.scale.y = 0.02 * Math.max(0.001, fade);
      L.m.scale.z = 0.05 * Math.max(0.001, fade);
    });

    // 写真 / タイル切り替え
    const split = t >= SPLIT && t < BACK0 + BACKD + 0.2;
    whole.visible = !split;
    for (const T of tiles) {
      T.g.visible = split;
      if (!split) { T.shadow.visible = false; continue; }
      const d = (T.i + T.j) * 0.07;
      const kOut = seg(t, SPREAD0 + d, SPREAD0 + d + SPREADD, easeOutBack);
      const bd = (4 - T.i - T.j) * 0.05;
      const kBack = seg(t, BACK0 + bd, BACK0 + bd + BACKD * 0.8, smooth);
      const k = kOut * (1 - kBack);
      const p = T.g.position;
      p.lerpVectors(T.home, T.away, k);
      const hold = seg(t, SPREAD0 + SPREADD, SPREAD0 + SPREADD + 0.4) * (1 - seg(t, BACK0 - 0.3, BACK0));
      p.y += hold * 0.05 * Math.sin(t * 3 + T.k * 0.9);
      // 裏返り（市松の位置だけ）+ カメラ側へ少し傾ける
      const flip = (T.i + T.j) % 2 === 0 ? seg(t, SPREAD0 + d + 0.1, SPREAD0 + d + 1.0, smooth) : 0;
      T.g.rotation.set(flip * Math.PI * 2 + k * 0.22 + hold * 0.05 * Math.sin(t * 2.2 + T.k), 0, 0);
      // 番号札
      const tg = seg(t, TAG_IN + T.k * 0.09, TAG_IN + T.k * 0.09 + 0.35, easeOutBack) * (1 - seg(t, BACK0 - 0.35, BACK0));
      T.tag.visible = tg > 0.002;
      T.tag.scale.setScalar(Math.max(0.001, tg));
      T.shadow.position.set(p.x, 0.012, p.z);
      T.shadow.material.opacity = 0.2 + 0.8 * k;
      T.shadow.visible = k > 0.02;
    }

    // キラキラ（番号札が揃った瞬間）
    const st = t - (TAG_IN + 0.75);
    for (const s of sparks) {
      const tt = st - s.d;
      const on = tt > 0 && tt < 1.1;
      s.m.visible = on;
      if (!on) continue;
      const k = easeOutCubic(tt / 1.1);
      s.m.position.set(Math.cos(s.a) * s.r * (0.7 + 0.3 * k), 0.5 + k * 0.5, Math.sin(s.a) * s.r * 0.72 * (0.7 + 0.3 * k) + 0.1);
      s.m.rotation.set(-0.9, 0, tt * 4);
      s.m.scale.setScalar(Math.max(0.001, bump(tt, 0, 1.1) * 1.3));
    }
  }

  return { scene, camera, update, duration: DUR };
});
