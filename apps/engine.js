// ひだまりワークス アプリ一覧 — 共通 3D エンジン
// 1 つの WebGLRenderer で全パネルを順番に描き、各パネルの 2D canvas へ転写する。
// 描画スタイル: トゥーン陰影 + 反転ハル方式の輪郭線（画面上で一定の太さ）。
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

export { THREE, RoundedBoxGeometry };

export const INK = 0x2b2320;

// ---------------------------------------------------------------- renderer
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
renderer.setPixelRatio(1);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setClearColor(0x000000, 0);
export { renderer };

const resUniform = { value: new THREE.Vector2(640, 480) };

// ---------------------------------------------------------------- toon ramp
function makeRamp(steps) {
  const data = new Uint8Array(steps.length * 4);
  steps.forEach((v, i) => { data.set([v, v, v, 255], i * 4); });
  const tex = new THREE.DataTexture(data, steps.length, 1, THREE.RGBAFormat);
  tex.minFilter = tex.magFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return tex;
}
const RAMP = makeRamp([120, 195, 255]);

const toonCache = new Map();
/** トゥーンマテリアル（色ごとにキャッシュ） */
export function toon(color, opts = {}) {
  const key = color + JSON.stringify(opts);
  if (!opts.unique && toonCache.has(key)) return toonCache.get(key);
  const m = new THREE.MeshToonMaterial({ color, gradientMap: RAMP, ...stripOpts(opts) });
  if (!opts.unique) toonCache.set(key, m);
  return m;
}
function stripOpts(o) { const { unique, ...rest } = o; return rest; }

/** ライティングの影響を受けないベタ塗り */
export function flat(color, opts = {}) {
  return new THREE.MeshBasicMaterial({ color, ...opts });
}

// ---------------------------------------------------------------- outlines
const hullCache = new WeakMap();
function hullGeometry(geo) {
  let h = hullCache.get(geo);
  if (h) return h;
  const c = new THREE.BufferGeometry();
  c.setAttribute('position', geo.getAttribute('position').clone());
  if (geo.index) c.setIndex(geo.index.clone());
  h = mergeVertices(c, 1e-3);
  h.computeVertexNormals();
  hullCache.set(geo, h);
  return h;
}

const outlineMats = new Map();
/** 輪郭線マテリアル。px は 480px 高さ基準の太さ（解像度に合わせて自動で拡縮） */
export function outlineMaterial(color = INK, px = 2.2) {
  const key = color + ':' + px;
  if (outlineMats.has(key)) return outlineMats.get(key);
  const m = new THREE.ShaderMaterial({
    uniforms: { uRes: resUniform, uPx: { value: px }, uColor: { value: new THREE.Color(color) } },
    vertexShader: /* glsl */`
      uniform vec2 uRes; uniform float uPx;
      void main() {
        vec4 clip = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        vec3 vn = normalize(normalMatrix * normal);
        vec2 d = (projectionMatrix * vec4(vn, 0.0)).xy * uRes;
        float l = length(d);
        d = l > 1e-6 ? d / l : vec2(0.0);
        // ポップ登場などで極小スケールになったメッシュは輪郭も細らせる（点だけ残るのを防ぐ）
        float sc = pow(abs(determinant(mat3(modelMatrix))), 1.0 / 3.0);
        float px = uPx * uRes.y / 480.0 * smoothstep(0.0, 0.03, sc);
        clip.xy += d * px * 2.0 / uRes * clip.w;
        clip.z += 0.0004 * clip.w;
        gl_Position = clip;
      }`,
    fragmentShader: /* glsl */`
      uniform vec3 uColor; uniform float uOpacity;
      void main() { gl_FragColor = vec4(uColor, 1.0); }`,
    side: THREE.BackSide,
  });
  m.uniforms.uColor.value.convertSRGBToLinear();
  outlineMats.set(key, m);
  return m;
}

/** メッシュに輪郭線を付ける */
export function outline(mesh, { color = INK, px = 2.2 } = {}) {
  const h = new THREE.Mesh(hullGeometry(mesh.geometry), outlineMaterial(color, px));
  h.name = '__outline';
  h.raycast = () => {};
  h.renderOrder = mesh.renderOrder;
  mesh.add(h);
  return mesh;
}

/**
 * メッシュ生成ヘルパー
 * @param geo  ジオメトリ
 * @param color 色 or マテリアル
 * @param o   { x,y,z, rx,ry,rz, s, sx,sy,sz, parent, line:false|{color,px}, px }
 */
export function mesh(geo, color, o = {}) {
  const mat = (color && color.isMaterial) ? color : toon(color);
  const m = new THREE.Mesh(geo, mat);
  m.position.set(o.x || 0, o.y || 0, o.z || 0);
  m.rotation.set(o.rx || 0, o.ry || 0, o.rz || 0);
  if (o.s != null) m.scale.setScalar(o.s);
  if (o.sx != null) m.scale.x = o.sx;
  if (o.sy != null) m.scale.y = o.sy;
  if (o.sz != null) m.scale.z = o.sz;
  if (o.line !== false) outline(m, { color: (o.line && o.line.color) ?? INK, px: (o.line && o.line.px) ?? o.px ?? 2.2 });
  if (o.parent) o.parent.add(m);
  return m;
}

export function group(parent, o = {}) {
  const g = new THREE.Group();
  g.position.set(o.x || 0, o.y || 0, o.z || 0);
  g.rotation.set(o.rx || 0, o.ry || 0, o.rz || 0);
  if (o.s != null) g.scale.setScalar(o.s);
  if (parent) parent.add(g);
  return g;
}

// ---------------------------------------------------------------- geometry shortcuts
export const G = {
  box: (w, h, d, r = 0.06, seg = 3) => new RoundedBoxGeometry(w, h, d, seg, Math.min(r, w / 2 - 1e-3, h / 2 - 1e-3, d / 2 - 1e-3)),
  sharpBox: (w, h, d) => new THREE.BoxGeometry(w, h, d),
  sphere: (r, ws = 24, hs = 16) => new THREE.SphereGeometry(r, ws, hs),
  cyl: (rt, rb, h, seg = 28) => new THREE.CylinderGeometry(rt, rb, h, seg),
  /** 角が丸い円柱（パック・パドル・ボタン向け） */
  puck: (r, h, bevel = 0.3, seg = 32) => {
    const b = Math.min(bevel, h / 2 - 1e-3, r - 1e-3);
    const pts = [];
    pts.push(new THREE.Vector2(0, -h / 2));
    const N = 5;
    for (let i = 0; i <= N; i++) { const a = -Math.PI / 2 + (i / N) * Math.PI / 2; pts.push(new THREE.Vector2(r - b + Math.cos(a) * b, -h / 2 + b + Math.sin(a) * b)); }
    for (let i = 0; i <= N; i++) { const a = (i / N) * Math.PI / 2; pts.push(new THREE.Vector2(r - b + Math.cos(a) * b, h / 2 - b + Math.sin(a) * b)); }
    pts.push(new THREE.Vector2(0, h / 2));
    return new THREE.LatheGeometry(pts, seg);
  },
  torus: (r, t, rs = 12, ts = 32, arc = Math.PI * 2) => new THREE.TorusGeometry(r, t, rs, ts, arc),
  cone: (r, h, seg = 24) => new THREE.ConeGeometry(r, h, seg),
  capsule: (r, len, cs = 6, rs = 16) => new THREE.CapsuleGeometry(r, len, cs, rs),
  plane: (w, h) => new THREE.PlaneGeometry(w, h),
  circle: (r, seg = 32) => new THREE.CircleGeometry(r, seg),
  /** 2D シェイプの押し出し（角を少し丸める） */
  extrude: (shape, depth, bevel = 0.03, curveSegments = 24) => {
    const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments });
    g.translate(0, 0, -depth / 2);
    return g;
  },
  lathe: (pts, seg = 32) => new THREE.LatheGeometry(pts.map(p => new THREE.Vector2(p[0], p[1])), seg),
  tube: (points, r = 0.03, seg = 40) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p))), seg, r, 8, false),
};

/** 星形シェイプ */
export function starShape(outer = 1, inner = 0.45, n = 5) {
  const s = new THREE.Shape();
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 ? inner : outer;
    const a = Math.PI / 2 + (i / (n * 2)) * Math.PI * 2;
    const x = Math.cos(a) * r, y = Math.sin(a) * r;
    i ? s.lineTo(x, y) : s.moveTo(x, y);
  }
  s.closePath();
  return s;
}
/** ハート形シェイプ */
export function heartShape(size = 1) {
  const s = new THREE.Shape();
  const k = size;
  s.moveTo(0, -0.9 * k);
  s.bezierCurveTo(0.2 * k, -0.62 * k, 1.0 * k, -0.25 * k, 1.0 * k, 0.28 * k);
  s.bezierCurveTo(1.0 * k, 0.72 * k, 0.52 * k, 0.95 * k, 0, 0.55 * k);
  s.bezierCurveTo(-0.52 * k, 0.95 * k, -1.0 * k, 0.72 * k, -1.0 * k, 0.28 * k);
  s.bezierCurveTo(-1.0 * k, -0.25 * k, -0.2 * k, -0.62 * k, 0, -0.9 * k);
  return s;
}
/** 角丸長方形シェイプ */
export function roundRectShape(w, h, r) {
  const s = new THREE.Shape();
  const x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

// ---------------------------------------------------------------- canvas textures
/** 2D canvas で描いたテクスチャ。draw(ctx, w, h) を呼び直したら tex.needsUpdate = true */
export function canvasTexture(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  // 描いた文字を記録し、未読込のフォント片（日本語フォントは文字範囲ごとに分割配信）が
  // 読み込まれたら最後の引数で描き直す
  const used = new Map();
  for (const fn of ['fillText', 'strokeText']) {
    const orig = ctx[fn].bind(ctx);
    ctx[fn] = (text, ...rest) => { const k = ctx.font; used.set(k, (used.get(k) || '') + text); return orig(text, ...rest); };
  }
  let lastArgs = [];
  const api = {
    tex, canvas: c, ctx,
    // save/restore で線種・破線などの描画状態を毎回リセットする
    redraw(...args) {
      lastArgs = args;
      used.clear();
      ctx.clearRect(0, 0, w, h); ctx.save(); draw(ctx, w, h, ...args); ctx.restore();
      tex.needsUpdate = true;
      watchFonts(used, () => api.redraw(...lastArgs));
    },
  };
  if (draw) api.redraw();
  return api;
}
const fontLoads = new Map(); // key -> null（読込済み）| { p, done }
function watchFonts(used, redo) {
  if (!document.fonts) return;
  const pending = [];
  for (const [font, text] of used) {
    const chars = [...new Set(text)].join('');
    const key = font + '|' + chars;
    let e = fontLoads.get(key);
    if (e === undefined) {
      let ok = true;
      try { ok = document.fonts.check(font, chars); } catch (_) {}
      e = ok ? null : { done: false, p: null };
      if (e) e.p = document.fonts.load(font, chars).catch(() => {}).then(() => { e.done = true; });
      fontLoads.set(key, e);
    }
    if (e && !e.done) pending.push(e.p);
  }
  if (pending.length) Promise.all(pending).then(redo);
}
export const FONT = '"M PLUS Rounded 1c", "Hiragino Maru Gothic ProN", "Hiragino Sans", sans-serif';

// 丸い接地影
let shadowTex;
export function blobShadow(parent, r = 1, o = {}) {
  if (!shadowTex) {
    shadowTex = canvasTexture(128, 128, (ctx, w, h) => {
      const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
      g.addColorStop(0, 'rgba(60,40,20,0.35)');
      g.addColorStop(0.6, 'rgba(60,40,20,0.18)');
      g.addColorStop(1, 'rgba(60,40,20,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    }).tex;
  }
  const m = new THREE.Mesh(new THREE.PlaneGeometry(r * 2, r * 2), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false }));
  m.rotation.x = -Math.PI / 2;
  m.position.set(o.x || 0, o.y ?? 0.005, o.z || 0);
  if (o.sx) m.scale.x = o.sx;
  if (o.sz) m.scale.y = o.sz;
  parent.add(m);
  return m;
}

// ---------------------------------------------------------------- math helpers
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (t) => { t = clamp(t); return t * t * (3 - 2 * t); };
/** a〜b の区間で 0→1 に進む（イージング付き） */
export const seg = (t, a, b, ease = smooth) => ease(clamp((t - a) / (b - a)));
export const easeOutBack = (t) => { t = clamp(t); const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
export const easeOutCubic = (t) => 1 - Math.pow(1 - clamp(t), 3);
export const easeInCubic = (t) => Math.pow(clamp(t), 3);
export const easeInOut = (t) => { t = clamp(t); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
/** 0→1→0 の山 */
export const bump = (t, a, b) => { const x = clamp((t - a) / (b - a)); return Math.sin(x * Math.PI); };
export const rand = (seed) => { let s = seed >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); };

// ---------------------------------------------------------------- scene scaffold
/**
 * 標準のシーン（背景なし・ライト付き・カメラ付き）を作る
 * @returns {{scene, camera, root}}
 */
export function stage({ fov = 30, pos = [0, 6, 10], target = [0, 0.5, 0], light = [4, 8, 5], ambient = 1.35, sun = 2.1, fog = null } = {}) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(fov, 4 / 3, 0.1, 200);
  camera.position.set(...pos);
  camera.lookAt(...target);
  camera.userData.target = new THREE.Vector3(...target);
  camera.userData.base = new THREE.Vector3(...pos);
  scene.add(new THREE.HemisphereLight(0xfff6e8, 0xd9c7b0, ambient));
  const d = new THREE.DirectionalLight(0xffffff, sun);
  d.position.set(...light);
  scene.add(d);
  if (fog) scene.fog = new THREE.Fog(fog[0], fog[1], fog[2]);
  const root = new THREE.Group();
  scene.add(root);
  return { scene, camera, root };
}

// ---------------------------------------------------------------- panel runtime
const REGISTRY = new Map();
/** シーン定義を登録。factory() は { scene, camera, update(t, dt), duration } を返す */
export function defineScene(slug, factory) { REGISTRY.set(slug, factory); }

// キャンバス文字で使う丸ゴシックを先に読み込む（未読込だと代替フォントで焼き込まれるため）
let fontsReady;
export function loadFonts() {
  if (!fontsReady) {
    fontsReady = document.fonts
      ? Promise.race([
          Promise.all(['800', '900', '700'].map(w => document.fonts.load(`${w} 32px "M PLUS Rounded 1c"`, 'あア亜AZ09'))),
          new Promise(r => setTimeout(r, 4000)),
        ]).catch(() => {})
      : Promise.resolve();
  }
  return fontsReady;
}

export async function loadScene(slug) {
  await loadFonts();
  if (!REGISTRY.has(slug)) await import(`./scenes/${slug}.js`);
  const inst = REGISTRY.get(slug)();
  inst.duration = inst.duration || 8;
  return inst;
}

function ensureSize(w, h) {
  const c = renderer.domElement;
  if (c.width < w || c.height < h) renderer.setSize(Math.max(c.width, w), Math.max(c.height, h), false);
}

/** 1 フレームをレンダリングして dst(2D canvas) へ転写 */
export function renderTo(inst, dst, t, pointer) {
  const w = dst.width, h = dst.height;
  if (!w || !h) return;
  ensureSize(w, h);
  const { scene, camera } = inst;
  // ポインタに合わせてカメラを少し回り込ませる
  if (camera.userData.base) {
    const b = camera.userData.base, tg = camera.userData.target;
    const px = pointer ? pointer.x : 0, py = pointer ? pointer.y : 0;
    const off = b.clone().sub(tg);
    off.applyAxisAngle(new THREE.Vector3(0, 1, 0), -px * 0.22);
    off.y += py * off.length() * 0.08;
    camera.position.copy(tg).add(off);
    camera.lookAt(tg);
  }
  // 4:3 より縦長のパネルでは画角を広げ、左右が切れないようにする（contain 表示）
  if (camera.isPerspectiveCamera) {
    if (camera.userData.baseFov == null) camera.userData.baseFov = camera.fov;
    const base = camera.userData.baseFov, aspect = w / h, ref = 4 / 3;
    camera.fov = aspect >= ref ? base
      : THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(base) / 2) * ref / aspect));
  }
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  inst.update && inst.update(t % inst.duration, t);
  resUniform.value.set(w, h);
  const H = renderer.domElement.height;
  renderer.setViewport(0, 0, w, h);
  renderer.setScissor(0, 0, w, h);
  renderer.setScissorTest(true);
  renderer.clear();
  renderer.render(scene, camera);
  const ctx = dst.getContext('2d');
  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(renderer.domElement, 0, H - h, w, h, 0, 0, w, h);
}
