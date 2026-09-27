// テーブルホッケー: ラリー → スマッシュ → ゴール → 紙吹雪
import { THREE, defineScene, stage, mesh, group, G, toon, flat, canvasTexture, blobShadow, starShape, FONT,
  clamp, lerp, seg, bump, smooth, easeOutBack, easeOutCubic, rand } from '../engine.js';

defineScene('table-hockey', () => {
  const { scene, camera, root } = stage({ fov: 30, pos: [4.9, 5.3, 5.9], target: [0.05, -0.2, -0.15], light: [5, 9, 4] });
  const DUR = 8;

  const W = 1.15, L = 2.05;         // テーブル内寸の半幅・半長
  const PR = 0.16;                  // パック半径
  const WALL = W - PR;

  // ---- テーブル本体
  const legs = group(root);
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    mesh(G.box(0.22, 0.9, 0.22, 0.05), 0x5a6b82, { x: x * (W - 0.05), y: -0.62, z: z * (L - 0.1), parent: legs });
  }
  mesh(G.box(W * 2 + 0.5, 0.3, L * 2 + 0.5, 0.1), 0x3a4d63, { y: -0.2, parent: root });

  const surf = canvasTexture(512, 900, (ctx, w, h) => {
    ctx.fillStyle = '#e6f0f7'; ctx.fillRect(0, 0, w, h);
    // エアホール
    ctx.fillStyle = 'rgba(80,130,180,0.22)';
    for (let y = 18; y < h; y += 34) for (let x = 18 + ((y / 34) % 2) * 17; x < w; x += 34) { ctx.beginPath(); ctx.arc(x, y, 3, 0, 7); ctx.fill(); }
    ctx.strokeStyle = '#d65050'; ctx.lineWidth = 8;
    ctx.beginPath(); ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(w / 2, h / 2, 70, 0, 7); ctx.stroke();
    ctx.strokeStyle = '#4a86d8'; ctx.lineWidth = 7;
    ctx.beginPath(); ctx.arc(w / 2, 0, 120, 0, Math.PI); ctx.stroke();
    ctx.beginPath(); ctx.arc(w / 2, h, 120, Math.PI, 2 * Math.PI); ctx.stroke();
  });
  const top = mesh(G.plane(W * 2, L * 2), new THREE.MeshToonMaterial({ map: surf.tex }), { rx: -Math.PI / 2, y: 0.0, line: false, parent: root });

  // レール（ゴールの切り欠きあり）
  const railC = 0xf4f1ea;
  const GOAL = 0.42; // ゴール半幅
  const railH = 0.22, railT = 0.16;
  mesh(G.box(railT, railH, L * 2 + railT * 2, 0.06), railC, { x: -W - railT / 2, y: railH / 2 - 0.02, parent: root });
  mesh(G.box(railT, railH, L * 2 + railT * 2, 0.06), railC, { x: W + railT / 2, y: railH / 2 - 0.02, parent: root });
  for (const sz of [-1, 1]) {
    const segW = W - GOAL;
    for (const sx of [-1, 1]) {
      mesh(G.box(segW + railT, railH, railT, 0.06), railC, { x: sx * (GOAL + segW / 2 + railT / 2), y: railH / 2 - 0.02, z: sz * (L + railT / 2), parent: root });
    }
    // ゴールの口（暗い穴）
    mesh(G.box(GOAL * 2, 0.06, railT + 0.04, 0.02), 0x1d4ea5, { y: 0.0, z: sz * (L + railT / 2), line: false, parent: root });
  }
  // 奥のゴールランプ
  const lampMat = toon(0xffd54a, { unique: true, emissive: new THREE.Color(0x000000) });
  const lamp = mesh(G.puck(0.16, 0.12, 0.05), lampMat, { x: 0, y: 0.3, z: -L - 0.28, parent: root });
  mesh(G.cyl(0.04, 0.04, 0.28), 0x5a6b82, { x: 0, y: 0.12, z: -L - 0.28, parent: root });

  // スコアボード
  const scoreTex = canvasTexture(256, 128, (ctx, w, h, a = 0, b = 0) => {
    ctx.fillStyle = '#2b2320'; ctx.fillRect(0, 0, w, h);
    ctx.font = `900 64px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#8db4e8'; ctx.fillText(String(a), w * 0.28, h * 0.55);
    ctx.fillStyle = '#fff'; ctx.fillText('-', w * 0.5, h * 0.52);
    ctx.fillStyle = '#e8a89a'; ctx.fillText(String(b), w * 0.72, h * 0.55);
  });
  const board = group(root, { y: 0.85, z: -L - 0.55 });
  mesh(G.box(1.25, 0.66, 0.12, 0.06), 0x3f5673, { parent: board });
  mesh(G.plane(1.08, 0.52), new THREE.MeshBasicMaterial({ map: scoreTex.tex }), { z: 0.065, line: false, parent: board });
  mesh(G.cyl(0.05, 0.05, 0.6), 0x5a6b82, { y: -0.55, parent: board });

  // ---- パドル（マレット）
  function mallet(color, knob) {
    const g = group(root);
    mesh(G.puck(0.2, 0.09, 0.04), color, { y: 0.045, parent: g });
    mesh(G.puck(0.16, 0.05, 0.02), knob, { y: 0.1, parent: g });
    mesh(G.cyl(0.055, 0.075, 0.16, 20), color, { y: 0.2, parent: g });
    mesh(G.sphere(0.085), knob, { y: 0.3, parent: g });
    blobShadow(g, 0.3);
    return g;
  }
  const player = mallet(0x3a7ed8, 0xdcebff);
  const cpu = mallet(0xe0604c, 0xffe1d8);

  // ---- パック
  const puck = group(root);
  const puckBody = mesh(G.puck(PR, 0.06, 0.025), 0xf4c430, { y: 0.03, parent: puck });
  mesh(G.puck(PR * 0.55, 0.065, 0.02), 0xffe98a, { y: 0.034, line: false, parent: puck });
  const puckShadow = blobShadow(puck, 0.2);

  // 軌跡（残像）
  const trail = [];
  for (let i = 0; i < 6; i++) {
    const m = new THREE.Mesh(G.circle(PR * 0.9, 20), new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0.0, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.position.y = 0.01;
    root.add(m); trail.push(m);
  }

  // ---- パックの経路（t, x, z）。壁で反射するようにキーフレームを置く
  const P = [
    [0.0, 0.18, 1.62],
    [0.75, WALL, 0.25],
    [1.55, -0.12, -1.62],
    [2.2, -WALL, -0.45],
    [2.95, -0.32, 1.62],
    [3.75, 0.36, -1.62],
    [4.35, WALL, -0.5],
    [5.1, 0.05, 1.62],    // プレイヤーのスマッシュ
    [5.5, -WALL, 0.1],
    [5.95, -0.08, -L - 0.05], // ゴール！
  ];
  const HIT_P = [0.0, 2.95, 5.1, 8.0];
  const HIT_C = [1.55, 3.75];
  const GOAL_T = 5.95;

  function puckAt(t) {
    if (t >= GOAL_T) return null;
    for (let i = 0; i < P.length - 1; i++) {
      const a = P[i], b = P[i + 1];
      if (t >= a[0] && t < b[0]) {
        const k = (t - a[0]) / (b[0] - a[0]);
        return [lerp(a[1], b[1], k), lerp(a[2], b[2], k), i];
      }
    }
    return null;
  }

  // ---- 紙吹雪と星
  const confetti = group(root);
  const R = rand(7);
  const bits = [];
  const colors = [0xff6f61, 0xffd23f, 0x4aa3f0, 0x6fd08c, 0xc58bff];
  const starGeo = G.extrude(starShape(0.09, 0.04), 0.03, 0.01);
  for (let i = 0; i < 22; i++) {
    const isStar = i % 3 === 0;
    const m = mesh(isStar ? starGeo : G.box(0.07, 0.012, 0.11, 0.004), colors[i % colors.length], { parent: confetti, px: 1.4 });
    bits.push({ m, vx: (R() - 0.5) * 2.2, vy: 1.6 + R() * 1.6, vz: 0.4 + R() * 1.2, sp: (R() - 0.5) * 12, d: R() * 0.15 });
  }

  // 「ゴール！」ポップ
  const goalTex = canvasTexture(512, 200, (ctx, w, h) => {
    ctx.font = `900 120px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round'; ctx.lineWidth = 22; ctx.strokeStyle = '#2b2320'; ctx.strokeText('ゴール！', w / 2, h / 2 + 6);
    ctx.fillStyle = '#ffd23f'; ctx.fillText('ゴール！', w / 2, h / 2 + 6);
  });
  const goalPop = new THREE.Mesh(G.plane(1.9, 0.74), new THREE.MeshBasicMaterial({ map: goalTex.tex, transparent: true, depthTest: false }));
  goalPop.renderOrder = 10;
  root.add(goalPop);

  const tmp = new THREE.Vector3();
  function paddleX(hits, t, xs, fallbackX) {
    // ヒット時刻の x を滑らかにつなぐ
    for (let i = 0; i < hits.length - 1; i++) {
      if (t >= hits[i] && t < hits[i + 1]) {
        const k = smooth((t - hits[i]) / (hits[i + 1] - hits[i]));
        return lerp(xs[i], xs[i + 1], k);
      }
    }
    return fallbackX;
  }

  let lastScore = -1;
  function update(t) {
    // パック
    const p = puckAt(t);
    const respawn = seg(t, 7.3, 7.9, easeOutBack);
    if (p) {
      puck.visible = true;
      puck.position.set(p[0], 0, p[1]);
      puck.scale.setScalar(t < 0.35 ? lerp(1, 1, 1) : 1);
      puckBody.rotation.y = t * 9;
    } else if (t >= 7.3) {
      puck.visible = true;
      puck.position.set(0.18, 0, 1.62);
      puck.scale.setScalar(Math.max(0.001, respawn));
    } else {
      puck.visible = false;
    }
    // 残像
    trail.forEach((m, i) => {
      const q = puckAt(t - (i + 1) * 0.035);
      if (q && p) { m.position.x = q[0]; m.position.z = q[1]; m.material.opacity = 0.32 * (1 - i / trail.length); m.visible = true; }
      else m.visible = false;
    });

    // プレイヤーのパドル
    const pxs = [0.18, -0.32, 0.05, 0.18];
    let ppx = paddleX(HIT_P, t, pxs, 0.18);
    if (t > 5.1 && t < 8) ppx = lerp(0.05, 0.18, smooth((t - 5.6) / 2));
    let lunge = 0;
    for (const h of [0, 2.95, 5.1, 8]) lunge = Math.max(lunge, bump(t, h - 0.28, h + 0.18) * (h === 5.1 ? 0.55 : 0.22));
    player.position.set(ppx, 0, 1.86 - lunge);

    // CPU のパドル（ゴール前は逆に振られて間に合わない）
    const cxs = [-0.12, 0.36];
    let cpx;
    if (t < 1.55) cpx = lerp(0.1, -0.12, smooth(t / 1.55));
    else if (t < 3.75) cpx = paddleX([1.55, 3.75], t, cxs, 0);
    else if (t < 5.5) cpx = lerp(0.36, 0.55, smooth((t - 3.75) / 1.5));
    else if (t < 6.2) cpx = lerp(0.55, 0.25, smooth((t - 5.5) / 0.6));
    else cpx = lerp(0.25, 0.1, smooth((t - 6.2) / 1.8));
    let clunge = 0;
    for (const h of HIT_C) clunge = Math.max(clunge, bump(t, h - 0.25, h + 0.15) * 0.2);
    cpu.position.set(cpx, 0, -1.86 + clunge);

    // ゴール演出
    const gt = t - GOAL_T;
    const on = gt > 0 && gt < 1.8;
    lampMat.emissive.setHex(on && Math.floor(gt * 8) % 2 === 0 ? 0xffb300 : 0x000000);
    lamp.scale.setScalar(on ? 1 + 0.15 * Math.sin(gt * 25) : 1);

    const score = t >= GOAL_T + 0.25 ? 1 : 0;
    if (score !== lastScore) { scoreTex.redraw(score, 0); lastScore = score; }
    board.scale.setScalar(1 + 0.12 * bump(t, GOAL_T + 0.2, GOAL_T + 0.6));

    confetti.visible = gt > 0 && gt < 2.2;
    if (confetti.visible) {
      for (const b of bits) {
        const tt = Math.max(0, gt - b.d);
        b.m.position.set(-0.08 + b.vx * tt, 0.1 + b.vy * tt - 2.4 * tt * tt, -L + b.vz * tt);
        b.m.rotation.set(b.sp * tt, b.sp * 0.7 * tt, 0.3);
        b.m.scale.setScalar(tt > 0 ? clamp(1.6 - tt * 0.6, 0, 1) : 0.001);
      }
    }
    const gp = seg(gt, 0.05, 0.45, easeOutBack) * (1 - seg(gt, 1.5, 1.8));
    goalPop.visible = gp > 0.001;
    goalPop.scale.setScalar(Math.max(0.001, gp));
    goalPop.position.set(-0.2, 1.05 + 0.08 * Math.sin(gt * 6), 0.2);
    goalPop.quaternion.copy(camera.quaternion);
  }

  return { scene, camera, update, duration: DUR };
});
