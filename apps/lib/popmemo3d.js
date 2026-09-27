// PoP MeMo! 3D — 3D の世界（メモ帳・キーボード・＋ボタン・演出）
// アプリ本体（tools/pop-memo-3d.html）とトップページのパネル（scenes/pop-memo-3d.js）で共用する。
//
// 見た目は「状態 S と時刻 now」だけから毎フレーム決める。
// 入力やメモ切り替えは時刻付きのイベントとして S に積み、演出はその経過時間で描く。
import { THREE, stage, mesh, group, G, toon, canvasTexture, blobShadow, starShape, heartShape, instanced, FONT,
  clamp, lerp, seg, bump, smooth, easeOutBack, easeOutCubic, easeInCubic, easeInOut, rand } from '../engine.js';

export const PALETTE = [
  { id: 'pink',   hex: '#FF6B9D', num: 0xff6b9d, deep: '#E04A80' },
  { id: 'orange', hex: '#FF8A5C', num: 0xff8a5c, deep: '#E66A3A' },
  { id: 'yellow', hex: '#FFC75F', num: 0xffc75f, deep: '#D9A032' },
  { id: 'green',  hex: '#65E6A7', num: 0x65e6a7, deep: '#2FB978' },
  { id: 'blue',   hex: '#5BB5F0', num: 0x5bb5f0, deep: '#2E8FD0' },
  { id: 'purple', hex: '#B47AEA', num: 0xb47aea, deep: '#9352D6' },
];
const colorOf = (id) => PALETTE.find(p => p.id === id) || PALETTE[0];
const PAL_NUM = PALETTE.map(p => p.num);
const TXT = '#3D2C2E';

export const MODES = ['mix', 'bubble', 'sparkle', 'pop', 'burst', 'note'];
export const LEVELS = { calm: 0.55, normal: 1, lively: 1.8 };

// ---------------------------------------------------------------- メモ帳のサイズ・文字の大きさ
/** メモ帳のサイズ（3D の単位）。wide 系は横に長いノートのように書ける */
export const SIZES = {
  small:  { w: 3.2, h: 2.5,  label: '小さめ' },
  normal: { w: 3.9, h: 2.95, label: 'ふつう' },
  wide:   { w: 5.6, h: 3.0,  label: 'ワイド' },
  xwide:  { w: 7.2, h: 3.1,  label: '特大ワイド' },
};
export const FONT_SCALE = { min: 0.6, max: 1.8, def: 1 };
// 以下はレイアウトの現在値。configure() で書き換える（1 ページに 1 つの世界を想定）
const PX_PER_UNIT = 1024 / 3.7;   // カード面テクスチャの解像度（1 単位あたりの画素）
const FACE_Y = -0.06;
let CW, CH, FW, FH, TW, TH, FRONT;
const SLOT_RZ = [0, 0.045, -0.035, 0.06];
const slot = (k) => ({ p: [0.17 * k, FRONT.p[1] - 0.07 * k, -0.35 - 0.27 * k], r: [-0.08, -0.035 * k, SLOT_RZ[k] || 0.05] });
const KB = { x: -0.45, y: 0.03, z: 2.05, rx: 0.08 };
const U = 0.36;           // キー 1 単位
const PLUS = [3.6, 0.03, 2.05];

// 文字組み（fontScale 倍）
const PAD_X = 60, TOP = 64, BOTTOM = 30;
let TITLE, BODY;
function setLayout(size = 'normal', fontScale = 1) {
  const z = SIZES[size] || SIZES.normal;
  CW = z.w; CH = z.h;
  FW = CW - 0.2; FH = CH - 0.175;
  TW = Math.round(FW * PX_PER_UNIT); TH = Math.round(FH * PX_PER_UNIT);
  // カードの下端の高さはサイズによらずそろえる（キーボードに重ならない）
  FRONT = { p: [0, 0.475 + CH / 2, -0.35], r: [-0.08, 0, 0] };
  const k = clamp(fontScale, FONT_SCALE.min, FONT_SCALE.max);
  TITLE = { size: Math.round(108 * k), lh: Math.round(132 * k), weight: 900 };
  BODY = { size: Math.round(78 * k), lh: Math.round(104 * k), weight: 800 };
}
setLayout();

// ---------------------------------------------------------------- キーボード配列（JIS）
// [code, ラベル, 幅, 種類]  種類: '' 文字 / 'mod' 修飾 / 'enter' / 'bs' / 'space'
const ROWS = [
  [['Backquote', '半/全', 1, 'mod'], ...'1234567890'.split('').map(d => [`Digit${d}`, d, 1, '']), ['Minus', '-', 1, ''], ['Equal', '^', 1, ''], ['IntlYen', '¥', 1, ''], ['Backspace', 'BS', 1, 'bs']],
  [['Tab', 'Tab', 1.6, 'mod'], ...'QWERTYUIOP'.split('').map(c => [`Key${c}`, c, 1, '']), ['BracketLeft', '@', 1, ''], ['BracketRight', '[', 1, '']],
  [['CapsLock', 'Caps', 1.6, 'mod'], ...'ASDFGHJKL'.split('').map(c => [`Key${c}`, c, 1, '']), ['Semicolon', ';', 1, ''], ['Quote', ':', 1, ''], ['Backslash', ']', 1, '']],
  [['ShiftLeft', 'Shift', 2.25, 'mod'], ...'ZXCVBNM'.split('').map(c => [`Key${c}`, c, 1, '']), ['Comma', ',', 1, ''], ['Period', '.', 1, ''], ['Slash', '/', 1, ''], ['IntlRo', '\\', 1, ''], ['ShiftRight', 'Shift', 1.75, 'mod']],
  [['ControlLeft', 'Ctrl', 1.5, 'mod'], ['MetaLeft', 'Win', 1.25, 'mod'], ['AltLeft', 'Alt', 1.25, 'mod'], ['NonConvert', '無変換', 1.25, 'mod'], ['Space', '', 4.5, 'space'], ['Convert', '変換', 1.25, 'mod'], ['KanaMode', 'かな', 1.25, 'mod'], ['AltRight', 'Alt', 1.25, 'mod'], ['ControlRight', 'Ctrl', 1.5, 'mod']],
];
// 画面のキーボードにないキーの割り当て
const CODE_ALIAS = { NumpadEnter: 'Enter', Delete: 'Backspace', MetaRight: 'MetaLeft', Lang1: 'KanaMode', Lang2: 'Backquote' };
for (let i = 0; i <= 9; i++) CODE_ALIAS[`Numpad${i}`] = `Digit${i}`;
/** 画面のキーをクリックしたときに入る文字 */
export const KEY_CHAR = {
  Minus: '-', Equal: '^', IntlYen: '¥', BracketLeft: '@', BracketRight: '[', Semicolon: ';', Quote: ':', Backslash: ']',
  Comma: ',', Period: '.', Slash: '/', IntlRo: '\\', Space: ' ',
};
export const normCode = (code) => CODE_ALIAS[code] || code;

// ---------------------------------------------------------------- 文字組み（折り返し・位置計算）
const measureCtx = document.createElement('canvas').getContext('2d');
function fontOf(st) { return `${st.weight} ${st.size}px ${FONT}`; }

/** text を折り返して行と各文字位置を返す。pos[i] = 文字 i の直前（キャレット）の [x, baseline, 行スタイル] */
function layoutText(text) {
  const lines = [];
  const pos = new Array(text.length + 1);
  const maxW = TW - PAD_X * 2;
  let y = TOP + TITLE.size + 6;
  let st = TITLE, x = PAD_X, lineStart = 0, isTitle = true;
  measureCtx.font = fontOf(st);
  let cur = { start: 0, text: '', y, st, title: true };
  const push = () => { lines.push(cur); };
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '\n') {
      pos[i] = [x, y, st];
      push();
      if (isTitle) { isTitle = false; st = BODY; measureCtx.font = fontOf(st); y += TITLE.lh - TITLE.size + BODY.size + 8; }
      else y += BODY.lh;
      x = PAD_X; lineStart = i + 1;
      cur = { start: i + 1, text: '', y, st, title: false };
      continue;
    }
    const w = measureCtx.measureText(ch).width;
    if (x + w > PAD_X + maxW && cur.text.length) {
      // 英単語の途中なら、単語ごと次の行へ送る（日本語は 1 文字単位で折り返す）
      const sp = cur.text.lastIndexOf(' ');
      if (/[A-Za-z0-9]/.test(ch) && /[A-Za-z0-9]$/.test(cur.text) && sp > 0) {
        const cut = cur.start + sp + 1;
        cur.text = cur.text.slice(0, sp + 1);
        push();
        y += st.lh;
        x = PAD_X;
        cur = { start: cut, text: '', y, st, title: isTitle };
        i = cut - 1;
        continue;
      }
      push();
      y += st.lh;
      x = PAD_X;
      cur = { start: i, text: '', y, st, title: isTitle };
    }
    pos[i] = [x, y, st];
    cur.text += ch;
    x += w;
  }
  pos[text.length] = [x, y, st];
  push();
  return { lines, pos, bottom: y + 20 };
}

// ---------------------------------------------------------------- 世界の生成
export function createMemoWorld() {
  const { scene, camera, root } = stage({ fov: 30, pos: [0, 4, 9], target: [0.3, 1.3, 0.6], light: [3, 9, 7] });

  // ---- 机
  // 横に長い天板。奥の縁はカードのすぐ後ろ（壁ぎわ）で、左右の縁は画面の外
  mesh(G.box(40, 0.34, 10, 0.16), 0xffd3e2, { y: -0.17, z: 3.2, parent: root });
  mesh(G.box(39.6, 0.06, 9.7, 0.03), 0xfff5f0, { y: 0.02, z: 3.2, line: false, parent: root });

  // ---- ノートの罫線テクスチャ（重ねたカード用）
  const ruled = canvasTexture(512, 384, (ctx, w, h) => {
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(61,44,46,0.10)'; ctx.lineWidth = 3;
    for (let y = 120; y < h - 10; y += 46) { ctx.beginPath(); ctx.moveTo(30, y); ctx.lineTo(w - 30, y); ctx.stroke(); }
  });

  // ---- メモカード（表示用 2 枚 + 後ろに重なる 3 枚）。サイズ変更時は作り直す
  let cardGeo, stripGeo, faceGeo;
  const pinSphere = G.sphere(0.14, 20, 14), pinNeck = G.cyl(0.1, 0.055, 0.1, 16);

  function makeCard(textured) {
    const g = group(root);
    const body = group(g);
    mesh(cardGeo, 0xffffff, { parent: body });
    const stripMat = toon(0xff6b9d, { unique: true });
    mesh(stripGeo, stripMat, { y: CH / 2 - 0.13, z: 0.0, parent: body, line: false });
    const pin = group(body, { x: CW / 2 - 0.36, y: CH / 2 - 0.06, z: 0.09, rz: -0.35 });
    const pinMat = toon(0xf0455a, { unique: true });
    mesh(pinSphere, pinMat, { y: 0.1, parent: pin, px: 1.6 });
    mesh(pinNeck, pinMat, { parent: pin, px: 1.4 });
    let tex = null, face;
    if (textured) {
      tex = canvasTexture(TW, TH, drawCardFace);
      face = mesh(faceGeo, new THREE.MeshBasicMaterial({ map: tex.tex, transparent: true }), { y: FACE_Y, z: 0.047, line: false, parent: body });
    } else {
      face = mesh(faceGeo, new THREE.MeshBasicMaterial({ map: ruled.tex }), { y: FACE_Y, z: 0.047, line: false, parent: body });
    }
    const shadow = blobShadow(root, CW * 0.41, { sz: 0.35 });
    return { g, body, stripMat, pinMat, tex, face, shadow, key: '', layout: null };
  }

  // カード面の描画: memo = { text, color }, comp = [a, b] | null, scroll(px)
  function drawCardFace(ctx, w, h, memo, comp, L, scroll = 0) {
    if (!memo) return;
    const c = colorOf(memo.color);
    // 罫線
    ctx.strokeStyle = 'rgba(61,44,46,0.09)'; ctx.lineWidth = 3;
    const first = TOP + TITLE.size + 6 - scroll;
    for (let y = first + 26; y < h - 8; y += BODY.lh) { if (y > TOP) { ctx.beginPath(); ctx.moveTo(40, y); ctx.lineTo(w - 40, y); ctx.stroke(); } }
    ctx.save();
    ctx.beginPath(); ctx.rect(0, TOP - 10, w, h - TOP + 10); ctx.clip();
    ctx.lineJoin = 'round'; ctx.textBaseline = 'alphabetic';
    if (!memo.text) {
      ctx.font = fontOf(TITLE);
      ctx.fillStyle = 'rgba(61,44,46,0.22)';
      ctx.fillText('ここに書いてね ✏', PAD_X, TOP + TITLE.size + 6);
      ctx.font = fontOf(BODY);
      ctx.fillText('キーボードを打つだけ！', PAD_X, TOP + TITLE.size + 6 + TITLE.lh - TITLE.size + BODY.size + 8);
    }
    for (const ln of L.lines) {
      if (!ln.text) continue;
      const y = ln.y - scroll;
      if (y < TOP - 20 || y - ln.st.size > h) continue;
      ctx.font = fontOf(ln.st);
      if (ln.title) {
        ctx.lineWidth = 14; ctx.strokeStyle = TXT; ctx.strokeText(ln.text, PAD_X, y);
        ctx.fillStyle = c.hex; ctx.fillText(ln.text, PAD_X, y);
      } else {
        ctx.lineWidth = 10; ctx.strokeStyle = '#ffffff'; ctx.strokeText(ln.text, PAD_X, y);
        ctx.fillStyle = TXT; ctx.fillText(ln.text, PAD_X, y);
      }
    }
    // 変換中（IME）の下線
    if (comp && comp[1] > comp[0]) {
      ctx.strokeStyle = c.deep; ctx.lineWidth = 6; ctx.setLineDash([10, 8]);
      for (let i = comp[0]; i < comp[1]; i++) {
        const a = L.pos[i], b = L.pos[i + 1];
        if (!a || !b || memo.text[i] === '\n') continue;
        const x2 = b[1] === a[1] ? b[0] : a[0] + 40;
        ctx.beginPath(); ctx.moveTo(a[0], a[1] - scroll + 14); ctx.lineTo(x2, a[1] - scroll + 14); ctx.stroke();
      }
    }
    ctx.restore();
  }

  let cardA, cardB, stack = [];
  let layoutKey = '';
  function disposeCard(c) {
    root.remove(c.g); root.remove(c.shadow);
    if (c.tex) { c.tex.tex.dispose(); c.face.material.dispose(); }
  }
  function buildCards() {
    for (const c of [cardA, cardB, ...stack]) if (c) disposeCard(c);
    for (const gm of [cardGeo, stripGeo, faceGeo]) if (gm) gm.dispose();
    cardGeo = G.box(CW, CH, 0.09, 0.14);
    stripGeo = G.box(CW - 0.12, 0.18, 0.11, 0.05);
    faceGeo = G.plane(FW, FH);
    cardA = makeCard(true); cardB = makeCard(true);
    stack = [makeCard(false), makeCard(false), makeCard(false)];
    layoutKey = TW + 'x' + TH + ':' + TITLE.size;
  }
  buildCards();

  function scrollFor(L, caret) {
    const p = L.pos[Math.min(caret, L.pos.length - 1)] || [0, 0];
    const limit = TH - BOTTOM;
    return Math.max(0, p[1] + 22 - limit);
  }
  function applyCard(card, memo, comp, caret) {
    const L = (card.layout && card.layout.text === memo.text) ? card.layout : Object.assign(layoutText(memo.text), { text: memo.text });
    card.layout = L;
    const scroll = scrollFor(L, caret ?? memo.text.length);
    const key = memo.color + '\u0000' + memo.text + '\u0000' + (comp ? comp.join(',') : '') + '\u0000' + scroll;
    if (card.key !== key) { card.tex.redraw(memo, comp, L, scroll); card.key = key; }
    card.stripMat.color.setHex(colorOf(memo.color).num);
    card.scroll = scroll;
  }
  /** カード面の画素位置 → カードのローカル座標 */
  const toLocal = (px, py) => [-FW / 2 + px / TW * FW, FACE_Y + FH / 2 - py / TH * FH];
  /** memo のキャレット位置（カードローカル）。演出の発生位置に使う */
  function caretLocal(memo, i) {
    const L = (cardA.layout && cardA.layout.text === memo.text) ? cardA.layout : layoutText(memo.text);
    const p = L.pos[clamp(i, 0, memo.text.length)] || [PAD_X, TOP + TITLE.size, TITLE];
    const scroll = scrollFor(L, i);
    const [x, y] = toLocal(p[0] + 6, p[1] - p[2].size * 0.34 - scroll);
    return [x, y, p[2].size / 72];
  }

  // キャレット
  const caretMat = toon(0xff6b9d, { unique: true });
  const caretMesh = mesh(G.box(0.05, 0.3, 0.03, 0.012), caretMat, { parent: cardA.body, line: false });

  // ---- キーボード
  const kb = group(root, { x: KB.x, y: KB.y, z: KB.z, rx: KB.rx });
  const kbW = 15 * U + 0.34, kbD = 5 * U + 0.34;
  mesh(G.box(kbW, 0.24, kbD, 0.14), 0xffe9a8, { y: 0.12, z: 2 * U, parent: kb });
  mesh(G.box(kbW - 0.18, 0.05, kbD - 0.18, 0.05), 0xfff3cc, { y: 0.245, z: 2 * U, parent: kb, line: false });
  blobShadow(root, 3.3, { x: KB.x, z: KB.z + 0.75, sz: 0.42 });
  const keyMeshes = new Map();
  const keyGeoCache = new Map();
  const labelGeoCache = new Map();
  const KEY_COLORS = { '': 0xffffff, mod: 0xf1e4ff, enter: 0xff8a5c, bs: 0xffb3cb, space: 0xd8f1ff };
  function keyLabel(label, wUnits, kind) {
    const cw = Math.round(128 * wUnits), ch = 128;
    return canvasTexture(cw, ch, (ctx, w, h) => {
      if (!label) return;
      const big = kind === '' && label.length <= 1;
      const size = big ? 74 : label.length >= 3 ? 36 : 44;
      ctx.font = `900 ${size}px ${FONT}`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = kind === 'enter' ? '#ffffff' : TXT;
      ctx.fillText(label, w / 2, h / 2 + 4);
    });
  }
  const topY = 0.25;
  ROWS.forEach((row, r) => {
    let x = -15 * U / 2;
    for (const [code, label, w, kind] of row) {
      const cx = x + w * U / 2;
      addKey(code, label, w, 1, kind, cx, r * U);
      x += w * U;
    }
  });
  // Enter（2 段ぶんの縦長キー）
  addKey('Enter', 'Enter', 15 - 13.6, 2, 'enter', 15 * U / 2 - (15 - 13.6) * U / 2, 1.5 * U);
  function addKey(code, label, w, h, kind, cx, cz) {
    const kw = w * U - 0.055, kd = h * U - 0.055;
    const gk = kw.toFixed(3) + 'x' + kd.toFixed(3);
    if (!keyGeoCache.has(gk)) keyGeoCache.set(gk, G.box(kw, 0.13, kd, 0.05));
    const base = KEY_COLORS[kind];
    const mat = toon(base, { unique: true });
    const m = mesh(keyGeoCache.get(gk), mat, { x: cx, y: topY + 0.065, z: cz, parent: kb, px: 1.25 });
    const lt = keyLabel(label, w, kind);
    const lg = kw.toFixed(3);
    if (!labelGeoCache.has(lg)) labelGeoCache.set(lg, G.plane(kw * 0.92, Math.min(kd, U - 0.055) * 0.92));
    const lm = mesh(labelGeoCache.get(lg), new THREE.MeshBasicMaterial({ map: lt.tex, transparent: true, depthWrite: false }), { rx: -Math.PI / 2, y: 0.067, line: false, parent: m });
    lm.raycast = () => {};
    m.userData = { code, kind, base: new THREE.Color(base), label };
    keyMeshes.set(code, m);
  }

  // ---- ＋ボタンと 6 色のドット
  const plusTex = canvasTexture(256, 256, (ctx, w, h) => {
    const gr = ctx.createLinearGradient(0, 0, w, h);
    gr.addColorStop(0, '#FF6B9D'); gr.addColorStop(1, '#FF8A5C');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(w / 2, h / 2, w / 2, 0, 7); ctx.fill();
    ctx.lineCap = 'round'; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 34;
    ctx.beginPath(); ctx.moveTo(w / 2, 64); ctx.lineTo(w / 2, h - 64); ctx.moveTo(64, h / 2); ctx.lineTo(w - 64, h / 2); ctx.stroke();
  });
  const plus = group(root, { x: PLUS[0], y: PLUS[1], z: PLUS[2] });
  const plusBase = mesh(G.puck(0.5, 0.16, 0.06), 0xffffff, { y: 0.08, parent: plus });
  const plusCap = group(plus, { y: 0.16 });
  const plusCapMesh = mesh(G.puck(0.4, 0.18, 0.08), 0xff8a5c, { y: 0.07, parent: plusCap });
  mesh(G.circle(0.35, 40), new THREE.MeshBasicMaterial({ map: plusTex.tex }), { rx: -Math.PI / 2, y: 0.162, line: false, parent: plusCap });
  blobShadow(plus, 0.7);
  plusBase.userData = { pick: 'plus' }; plusCapMesh.userData = { pick: 'plus' };
  const dotGeo = G.sphere(0.17, 22, 16);
  const dots = PALETTE.map((p) => { const d = mesh(dotGeo, p.num, { parent: root, px: 1.7 }); d.userData = { pick: 'dot', color: p.id }; return d; });
  const dotHome = (i, fan) => {
    const ang = Math.PI * (0.95 - 0.5 * (i / 5));
    const R = 1.0 * fan;
    return [PLUS[0] + Math.cos(ang) * R, 0.55 + Math.sin(ang) * R * 1.1, PLUS[2] - 0.1];
  };

  // ---- パーティクル（インスタンス描画）
  const fxRoot = group(root, { x: FRONT.p[0], y: FRONT.p[1], z: FRONT.p[2], rx: FRONT.r[0] });
  const white = () => toon(0xffffff, { unique: true });
  const noteTex = (ch) => canvasTexture(128, 128, (ctx, w, h) => {
    ctx.font = `900 104px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round'; ctx.lineWidth = 14; ctx.strokeStyle = TXT; ctx.strokeText(ch, w / 2, h / 2 + 4);
    ctx.fillStyle = '#ffffff'; ctx.fillText(ch, w / 2, h / 2 + 4);
  }).tex;
  const N = 220;
  const pools = {
    bubble: instanced(G.sphere(0.1, 16, 12), white(), N, { line: { color: 0x5bb5f0, px: 1.3 } }),
    star: instanced(G.extrude(starShape(0.15, 0.065), 0.04, 0.012), white(), N),
    heart: instanced(G.extrude(heartShape(0.11), 0.04, 0.012), white(), N),
    diamond: instanced(new THREE.OctahedronGeometry(0.11), white(), N),
    confetti: instanced(G.box(0.085, 0.14, 0.016, 0.005), white(), N, { line: { px: 1.0 } }),
    dot: instanced(G.sphere(0.075, 14, 10), white(), N),
    puff: instanced(G.sphere(0.13, 14, 10), white(), N, { line: { color: 0x9a8a90, px: 1.1 } }),
    note1: instanced(G.plane(0.36, 0.36), new THREE.MeshBasicMaterial({ map: noteTex('♪'), transparent: true, depthWrite: false }), N, { line: false }),
    note2: instanced(G.plane(0.36, 0.36), new THREE.MeshBasicMaterial({ map: noteTex('♫'), transparent: true, depthWrite: false }), N, { line: false }),
  };
  for (const k in pools) fxRoot.add(pools[k].mesh);
  // 軌跡の星（カード切り替え用）はワールド座標で出すので別プール
  const trail = instanced(G.extrude(starShape(0.13, 0.055), 0.035, 0.01), white(), 80);
  root.add(trail.mesh);
  const confWorld = instanced(G.box(0.09, 0.15, 0.016, 0.005), white(), 80, { line: { px: 1.0 } });
  root.add(confWorld.mesh);

  // リングと光（通常メッシュを使い回す）
  const glowTex = canvasTexture(128, 128, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    g.addColorStop(0, 'rgba(255,240,180,0.95)'); g.addColorStop(0.4, 'rgba(255,200,120,0.5)'); g.addColorStop(1, 'rgba(255,160,160,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  });
  const ringGeo = G.torus(0.3, 0.036, 8, 56);
  const rings = [], glows = [];
  for (let i = 0; i < 8; i++) {
    const rm = new THREE.MeshBasicMaterial({ color: 0xffc75f, transparent: true, depthWrite: false });
    rings.push(mesh(ringGeo, rm, { parent: fxRoot, line: false }));
    const gm = new THREE.MeshBasicMaterial({ map: glowTex.tex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    glows.push(mesh(G.plane(1, 1), gm, { parent: fxRoot, line: false }));
  }
  // 丸めた紙（削除）
  const ball = mesh(new THREE.IcosahedronGeometry(0.42, 1), 0xffffff, { parent: root });
  // 切り替えの光の帯（カード表面を走る）
  const shineTex = canvasTexture(256, 64, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, w, 0);
    g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,0.85)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  });
  const shine = mesh(G.plane(0.9, CH * 1.3), new THREE.MeshBasicMaterial({ map: shineTex.tex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }), { z: 0.06, rz: -0.35, parent: cardA.body, line: false });

  // ---------------------------------------------------------------- サイズ・文字の大きさの変更
  let bumpPending = false, bumpT = -9;
  /** メモ帳のサイズ（SIZES のキー）と文字の倍率を変える。カードを作り直してぽよんと弾ませる */
  function configure({ size = 'normal', fontScale = 1 } = {}) {
    const before = layoutKey + CW;
    setLayout(size, fontScale);
    if (before === TW + 'x' + TH + ':' + TITLE.size + CW) return;
    buildCards();
    cardA.body.add(caretMesh);
    cardA.body.add(shine);
    shine.scale.y = CH / 2.95;
    fxRoot.position.set(FRONT.p[0], FRONT.p[1], FRONT.p[2]);
    bumpPending = true;
  }

  // ---------------------------------------------------------------- パーティクルの仕様
  const MODE_CYCLE = ['bubble', 'sparkle', 'pop', 'burst', 'note'];
  /** 1 イベントぶんの粒リスト（イベントに一度だけ計算してキャッシュ） */
  function particlesOf(e, level) {
    if (e._p && e._lv === level) return e._p;
    const R = rand(e.seed * 7919 + 13);
    const out = [];
    const k = LEVELS[level] ?? 1;
    const pick = (arr) => arr[Math.floor(R() * arr.length)];
    const col = () => PAL_NUM[Math.floor(R() * 6)];
    const add = (kind, motion, o = {}) => {
      const a = o.angle ?? R() * Math.PI * 2;
      const sp = (o.speed ?? 1) * (0.8 + R() * 0.5);
      out.push({ kind, motion, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vz: 0.25 + R() * 0.35, spin: (R() - 0.5) * 12,
        ph: R() * 6.28, life: (o.life ?? 1.0) * (0.85 + R() * 0.3), size: (o.size ?? 1) * (0.8 + R() * 0.45), color: o.color ?? col(), delay: o.delay ?? 0 });
    };
    if (e.kind === 'char') {
      const mode = e.mode === 'mix' ? MODE_CYCLE[e.seed % 5] : e.mode;
      const n = Math.max(2, Math.round(6 * k));
      for (let i = 0; i < n; i++) {
        const ang = (i / n) * Math.PI * 2 + R() * 0.8;
        if (mode === 'bubble') add('bubble', 'float', { angle: ang, speed: 0.55, life: 1.3, color: pick([0xe8f7ff, 0xffe3ef, 0xf0e6ff, 0xe3fff2]) });
        else if (mode === 'sparkle') add(i % 3 === 2 ? 'diamond' : 'star', 'twinkle', { angle: ang, speed: 0.6, life: 0.95, color: pick([0xffc75f, 0xffe27a, 0xff6b9d, 0x5bb5f0]) });
        else if (mode === 'pop') add(pick(['heart', 'diamond', 'dot', 'star']), 'pop', { angle: Math.PI * (0.15 + 0.7 * R()), speed: 1.25, life: 0.95 });
        else if (mode === 'burst') add('confetti', 'burst', { angle: ang, speed: 1.4, life: 0.9 });
        else add(i % 2 ? 'note2' : 'note1', 'float', { angle: ang, speed: 0.5, life: 1.3, size: 1.1, color: pick([0xb47aea, 0xff6b9d, 0x5bb5f0, 0xff8a5c]) });
      }
      if (k > 1.2) for (let i = 0; i < 2; i++) add('dot', 'pop', { speed: 1.0, life: 0.7, size: 0.7 });
    } else if (e.kind === 'enter') {
      const n = Math.round(16 * k);
      for (let i = 0; i < n; i++) {
        const ang = (i / n) * Math.PI * 2 + R() * 0.25;
        add(['star', 'heart', 'bubble', 'confetti', 'diamond'][i % 5], 'burst', { angle: ang, speed: 2.1, life: 1.2, size: 1.15 });
      }
    } else if (e.kind === 'del') {
      const n = Math.max(2, Math.round(4 * Math.min(k, 1.3)));
      for (let i = 0; i < n; i++) add('puff', 'puff', { angle: Math.PI * (0.2 + 0.6 * R()), speed: 0.35, life: 0.7, color: pick([0xffffff, 0xf3eef0, 0xece4e8]) });
    }
    e._p = out; e._lv = level;
    return out;
  }

  // ---------------------------------------------------------------- カメラ
  const camDir = new THREE.Vector3(0, 0.42, 1).normalize();
  const camTarget = new THREE.Vector3(0.3, 1.32, 0.55);
  /**
   * 机の上のもの全体が収まるようにカメラを引く
   * vfrac: 画面の高さのうち実際に使える割合（上下に UI がある場合）
   */
  function fit(aspect, { vfrac = 1, zoom = 1 } = {}) {
    const vf = THREE.MathUtils.degToRad(camera.fov) / 2;
    const hw = 4.45, hh = 3.0;
    const d = Math.max(hh / (Math.tan(vf) * vfrac), hw / (Math.tan(vf) * aspect)) / zoom;
    camera.position.copy(camTarget).addScaledVector(camDir, d);
    camera.lookAt(camTarget);
    camera.userData.base = camera.position.clone();
    camera.userData.target = camTarget.clone();
  }

  // ---------------------------------------------------------------- ピック
  const ray = new THREE.Raycaster();
  function pick(ndcX, ndcY) {
    ray.setFromCamera({ x: ndcX, y: ndcY }, camera);
    const cand = [...keyMeshes.values(), plusBase, plusCapMesh, ...dots.filter(d => d.visible), cardA.g];
    const hit = ray.intersectObjects(cand, true)[0];
    if (!hit) return null;
    let o = hit.object;
    while (o) {
      if (o.userData && o.userData.code) return { type: 'key', code: o.userData.code };
      if (o.userData && o.userData.pick === 'plus') return { type: 'plus' };
      if (o.userData && o.userData.pick === 'dot') return { type: 'dot', color: o.userData.color };
      if (o === cardA.g) return { type: 'card' };
      o = o.parent;
    }
    return null;
  }

  // ---------------------------------------------------------------- 描画ヘルパー
  const setT = (obj, p, r, s = 1) => {
    obj.position.set(p[0], p[1], p[2]);
    obj.rotation.set(r[0], r[1], r[2]);
    obj.scale.setScalar(Math.max(1e-4, s));
  };
  const mixT = (a, b, k) => ({ p: a.p.map((v, i) => lerp(v, b.p[i], k)), r: a.r.map((v, i) => lerp(v, b.r[i], k)) });
  const qbez = (a, c, b, k) => a.map((v, i) => (1 - k) * (1 - k) * v + 2 * (1 - k) * k * c[i] + k * k * b[i]);
  const TR_DUR = { next: 1.0, prev: 1.0, new: 1.15, delete: 1.25 };
  const tmpC = new THREE.Color();

  // ---------------------------------------------------------------- update
  /**
   * @param now 秒
   * @param S {
   *   memos: [{id, text, color}], index, caret, comp,
   *   keys: Map(code -> {down, t}), fx: [{t, kind, x, y, s, seed, mode}],
   *   trans: null | {type, t, from: memo, color}, plus: {open, t}, level, focused, typedAt
   * }
   */
  function update(now, S) {
    const memo = S.memos[S.index];
    const n = S.memos.length;
    const tr = S.trans && now - S.trans.t < TR_DUR[S.trans.type] ? S.trans : null;
    const p = tr ? clamp((now - tr.t) / TR_DUR[tr.type]) : 1;

    // ---- メモカード
    applyCard(cardA, memo, S.comp, S.caret);
    const bob = Math.sin(now * 1.3) * 0.03;
    // 入力のたびに小さく弾む
    let jig = 0, hop = 0;
    for (const e of S.fx) {
      const a = now - e.t;
      if (a < 0 || a > 0.5) continue;
      if (e.kind === 'enter') { jig += bump(a, 0, 0.4) * 0.05; hop += bump(a, 0, 0.35) * 0.09; }
      else jig += bump(a, 0, 0.18) * 0.012;
    }
    const front = { p: [FRONT.p[0], FRONT.p[1] + bob + hop, FRONT.p[2]], r: FRONT.r.slice() };
    front.r[2] = Math.sin(now * 0.9) * 0.012 + jig * 0.4;

    let aT = front, aS = 1 + jig, aVis = true;
    let bVis = false, bT = front, bS = 1, ballVis = false;
    const nStack = Math.min(3, n - 1);
    const lastSlot = slot(Math.max(1, nStack));

    if (tr) {
      const from = tr.from;
      if (from) { applyCard(cardB, from, null, from.text.length); }
      if (tr.type === 'next') {
        // 手前のカード → 右へスワイプしてから一番後ろへ回り込む
        bVis = true;
        const k1 = seg(p, 0, 0.5, easeInOut), k2 = seg(p, 0.45, 1, easeInOut);
        const swipe = { p: [CW / 2 + 1.95, FRONT.p[1] + 0.55, FRONT.p[2] + 0.5], r: [-0.05, -0.85, -0.32] };
        const s1 = mixT(front, swipe, k1);
        bT = k2 > 0 ? mixT(swipe, lastSlot, k2) : s1;
        if (k2 > 0) bT.p = qbez(swipe.p, [CW / 2 + 0.45, FRONT.p[1] + 0.9, lastSlot.p[2] - 0.8], lastSlot.p, k2);
        bS = lerp(1.04, 1, k2);
        // 次のカード: 後ろから手前へ
        const k = seg(p, 0.12, 0.72, easeOutBack);
        aT = mixT(slot(1), front, k);
        aT.p[1] += bump(p, 0.12, 0.72) * 0.35;
        aT.r[0] += (1 - seg(p, 0.12, 0.72)) * -0.25;
        aS = 1 + bump(p, 0.55, 0.9) * 0.05;
      } else if (tr.type === 'prev') {
        // 一番後ろのカードが左から弧を描いて手前へ、手前のカードは 1 枚目の後ろへ
        bVis = true;
        const kb2 = seg(p, 0.1, 0.7, easeInOut);
        bT = mixT(front, slot(1), kb2);
        bS = 1;
        const swipe = { p: [-(CW / 2 + 1.95), FRONT.p[1] + 0.55, FRONT.p[2] + 0.5], r: [-0.05, 0.85, 0.32] };
        const k1 = seg(p, 0, 0.45, easeInOut), k2 = seg(p, 0.4, 1, easeOutBack);
        if (k2 <= 0) { aT = mixT(lastSlot, swipe, k1); aT.p = qbez(lastSlot.p, [-(CW / 2 + 0.45), FRONT.p[1] + 0.9, lastSlot.p[2] - 0.8], swipe.p, k1); }
        else aT = mixT(swipe, front, k2);
        aS = 1 + bump(p, 0.7, 1) * 0.05;
      } else if (tr.type === 'new') {
        // ドットから新しいカードが生まれて飛んでくる。前のカードは後ろへ
        bVis = !!from;
        const kb2 = seg(p, 0, 0.55, easeInOut);
        bT = mixT(front, slot(1), kb2);
        const ci = Math.max(0, PALETTE.findIndex(c => c.id === (tr.color || memo.color)));
        const d0 = dotHome(ci, 1);
        const k = seg(p, 0.18, 0.85, easeOutCubic);
        const start = { p: d0, r: [-0.4, 0.6, 0.8] };
        aT = mixT(start, front, k);
        aT.p = qbez(d0, [1.8, FRONT.p[1] + 1.6, 0.8], front.p, k);
        aS = Math.max(1e-3, lerp(0.08, 1, seg(p, 0.18, 0.75, easeOutBack)));
        aT.r[2] += (1 - k) * 1.2;
      } else if (tr.type === 'delete') {
        // くしゃっと丸めてポイ → 次のカードが前へ
        bVis = p < 0.34;
        const kc = seg(p, 0, 0.34, easeInCubic);
        bT = { p: [front.p[0], front.p[1] - kc * 0.2, front.p[2] + kc * 0.3], r: [front.r[0], kc * 1.2, kc * 2.4] };
        bS = lerp(1, 0.18, kc);
        ballVis = p >= 0.28 && p < 0.95;
        const kb3 = seg(p, 0.3, 0.95);
        const bx = lerp(0, 4.8, kb3), by = FRONT.p[1] - 0.2 + 1.4 * Math.sin(Math.min(1, kb3 * 1.6) * Math.PI) * (1 - kb3 * 0.5) - kb3 * 1.7, bz = lerp(front.p[2] + 0.3, 1.5, kb3);
        setT(ball, [bx, Math.max(0.42, by), bz], [kb3 * 9, kb3 * 6, kb3 * 4], easeOutBack(seg(p, 0.28, 0.4)) * (1 - seg(p, 0.85, 0.95)));
        const k = seg(p, 0.32, 0.9, easeOutBack);
        aT = mixT(slot(1), front, k);
        aT.p[1] += bump(p, 0.32, 0.9) * 0.3;
      }
    }
    if (bumpPending) { bumpT = now; bumpPending = false; }
    const bz = bump(now - bumpT, 0, 0.5);
    aS *= 1 + bz * 0.07;
    aT.r[2] += Math.sin((now - bumpT) * 18) * bz * 0.04;
    setT(cardA.g, aT.p, aT.r, aS);
    cardA.g.visible = aVis;
    cardB.g.visible = bVis;
    if (bVis) setT(cardB.g, bT.p, bT.r, bS);
    ball.visible = ballVis;

    // 後ろに重なるカード（次のメモたちの色を見せる）
    // 切り替え中は、新しい並びでの位置 idx へ、元の位置 idx ± 1 から滑らせる
    let shift = 0, hide = -1;
    if (tr) {
      if (tr.type === 'next') { shift = 1 - seg(p, 0.12, 0.72, easeInOut); if (n - 1 <= 3) hide = n - 1; }
      else if (tr.type === 'delete') shift = 1 - seg(p, 0.32, 0.9, easeInOut);
      else if (tr.type === 'prev') { shift = -(1 - seg(p, 0.1, 0.7, easeInOut)); hide = 1; }
      else if (tr.type === 'new') { shift = -(1 - seg(p, 0, 0.55, easeInOut)); if (tr.from) hide = 1; }
    }
    for (let k = 0; k < 3; k++) {
      const c = stack[k];
      const idx = k + 1;
      const sp = idx + shift;
      const m = S.memos[(S.index + idx) % n];
      c.g.visible = idx <= nStack && idx !== hide && !!m && sp >= 0.5 && sp <= 3.2;
      c.shadow.visible = c.g.visible;
      if (!c.g.visible) continue;
      const cs = clamp(sp, 1, 3), lo = Math.floor(cs), hi = Math.min(3, lo + 1);
      const t2 = mixT(slot(lo), slot(hi), cs - lo);
      setT(c.g, t2.p, t2.r, 1 - 0.02 * sp);
      c.stripMat.color.setHex(colorOf(m.color).num);
      c.shadow.position.set(t2.p[0], 0.012, t2.p[2] + 0.3);
    }
    for (const [c, vis] of [[cardA, aVis], [cardB, bVis]]) {
      c.shadow.visible = vis;
      c.shadow.position.set(c.g.position.x, 0.013, c.g.position.z + 0.3);
      c.shadow.scale.setScalar(Math.max(1e-3, c.g.scale.x * clamp(1.2 - (c.g.position.y - FRONT.p[1]) * 0.35, 0.3, 1.2)));
    }

    // 光の帯（到着した瞬間にカードを走る）
    const shineK = tr ? seg(p, tr.type === 'prev' ? 0.75 : 0.62, 1) : 1;
    shine.visible = tr && shineK > 0 && shineK < 1;
    shine.position.x = lerp(-CW * 0.7, CW * 0.7, shineK);
    shine.material.opacity = bump(shineK, 0, 1);

    // ---- キャレット
    const cl = caretLocal(memo, S.caret);
    const idle = now - (S.typedAt || 0);
    caretMesh.visible = S.focused !== false && (idle < 0.6 || (now % 1) < 0.55) && !(tr && p < 0.7);
    caretMesh.position.set(cl[0], cl[1], 0.065);
    caretMesh.scale.set(1, cl[2], 1);
    caretMat.color.setHex(colorOf(memo.color).num);

    // ---- キー
    for (const m of keyMeshes.values()) {
      const st = S.keys.get(m.userData.code);
      let d = 0, glow = 0;
      if (st) {
        const a = now - st.t;
        if (st.down) { d = clamp(a / 0.035); glow = 1; }
        else { d = Math.exp(-a * 16) * Math.cos(a * 26); glow = 1 - seg(a, 0, 0.35); }
      }
      m.position.y = topY + 0.065 - d * 0.075;
      const accent = m.userData.kind === 'enter' ? 0xffc75f : colorOf(memo.color).num;
      m.material.color.copy(m.userData.base).lerp(tmpC.setHex(accent), glow * 0.75);
    }

    // ---- ＋ボタン / ドット
    const pl = S.plus || { open: false, t: -9 };
    const pa = now - pl.t;
    plusCap.position.y = 0.16 - bump(pa, 0, 0.22) * 0.08;
    plus.scale.setScalar(1 + bump(pa, 0.05, 0.45) * 0.1);
    let fan = pl.open ? seg(pa, 0, 0.45, easeOutBack) : 1 - seg(pa, 0, 0.25);
    if (tr && tr.type === 'new') fan = 0;
    dots.forEach((d, i) => {
      const [x, y, z] = dotHome(i, Math.max(fan, 0));
      d.position.set(x, y + Math.sin(now * 3 + i) * 0.03 * fan, z);
      d.visible = fan > 0.01;
      d.scale.setScalar(Math.max(1e-3, fan));
    });

    // ---- パーティクル
    const counts = {};
    for (const k in pools) counts[k] = 0;
    let ri = 0;
    for (const e of S.fx) {
      const age = now - e.t;
      if (age < 0 || age > 1.8) continue;
      const list = particlesOf(e, S.level || 'normal');
      const big = e.kind === 'enter';
      for (const q of list) {
        const a = age - q.delay;
        if (a < 0 || a > q.life) continue;
        const pool = pools[q.kind];
        const i = counts[q.kind];
        if (i >= N) continue;
        let x = e.x, y = e.y, z = 0.14 + q.vz * a;
        let rx = 0, ry = 0, rz = 0;
        if (q.motion === 'float') {
          x += q.vx * 0.35 * a + Math.sin(a * 6 + q.ph) * 0.06;
          y += 0.08 + a * (0.75 + q.vy * 0.2);
          rz = Math.sin(a * 4 + q.ph) * 0.35;
        } else if (q.motion === 'twinkle') {
          const r = easeOutCubic(clamp(a / 0.35)) * 0.55;
          x += q.vx * r; y += q.vy * r + a * 0.15;
          rz = q.spin * a * 0.6;
        } else if (q.motion === 'pop') {
          x += q.vx * a; y += q.vy * a + 0.5 * a - 1.9 * a * a;
          rx = q.spin * a * 0.4; rz = q.spin * a;
        } else if (q.motion === 'burst') {
          const sp = big ? 1 : 0.8;
          x += q.vx * a * sp; y += q.vy * a * sp - 1.3 * a * a;
          rx = q.spin * a * 0.5; ry = q.spin * a * 0.3; rz = q.spin * a;
        } else if (q.motion === 'puff') {
          x += q.vx * a; y += q.vy * a + a * 0.3;
        }
        const env = easeOutBack(clamp(a / 0.16)) * (1 - seg(a, q.life * 0.6, q.life));
        const s = q.size * env * (e.s || 1) * (q.motion === 'puff' ? lerp(0.6, 1.3, a / q.life) : 1);
        pool.set(i, x, y, z, rx, ry, rz, s, q.color);
        counts[q.kind]++;
      }
      // Enter のリングと光
      if (big && ri < rings.length) {
        const r = rings[ri], g = glows[ri]; ri++;
        const k = easeOutCubic(clamp(age / 0.75));
        r.visible = g.visible = age < 0.8;
        r.position.set(e.x, e.y, 0.1); g.position.set(e.x, e.y, 0.09);
        r.scale.setScalar(0.3 + k * 3.2);
        r.material.color.setHex(colorOf(memo.color).num);
        r.material.opacity = 1 - seg(age, 0.25, 0.8);
        g.scale.setScalar(0.7 + k * 1.8); g.material.opacity = 0.9 * (1 - seg(age, 0.1, 0.7));
      }
    }
    for (; ri < rings.length; ri++) { rings[ri].visible = false; glows[ri].visible = false; }
    for (const k in pools) pools[k].commit(counts[k]);

    // ---- 切り替えの軌跡・紙吹雪（ワールド座標）
    let tc = 0, cc = 0;
    if (tr) {
      const age = now - tr.t;
      if (tr.type === 'next' || tr.type === 'prev') {
        // 飛んでいくカードの縁から星がこぼれる
        const src = tr.type === 'next' ? cardB.g : cardA.g;
        const sign = tr.type === 'next' ? 1 : -1;
        for (let j = 0; j < 14; j++) {
          const born = j * 0.04;
          const a = age - born;
          if (a < 0 || a > 0.6) continue;
          const kk = born / TR_DUR[tr.type];
          const px = tr.type === 'next' ? lerp(FRONT.p[0], CW / 2 + 1.95, easeInOut(clamp(kk * 2))) : lerp(-(CW / 2 + 1.95), FRONT.p[0], easeOutBack(clamp((kk - 0.4) / 0.6)));
          const py = FRONT.p[1] + 0.3 + Math.sin(j * 2.3) * 0.9;
          const s = easeOutBack(clamp(a / 0.12)) * (1 - seg(a, 0.3, 0.6)) * 1.1;
          trail.set(tc++, px - sign * a * 0.8, py - a * 0.6, FRONT.p[2] + 0.4, 0, 0, a * 8 + j, s, PAL_NUM[j % 6]);
        }
        void src;
      }
      if (tr.type === 'new' || tr.type === 'delete') {
        const R = rand(31);
        const ox = tr.type === 'new' ? PLUS[0] : FRONT.p[0], oy = tr.type === 'new' ? 0.5 : FRONT.p[1], oz = tr.type === 'new' ? PLUS[2] : FRONT.p[2] + 0.4;
        const a0 = tr.type === 'new' ? age : age - 0.3;
        for (let j = 0; j < 26; j++) {
          const vx = (R() - 0.5) * 3, vy = 2.4 + R() * 1.6, vz = (R() - 0.3) * 1.4, sp = (R() - 0.5) * 14;
          if (a0 < 0 || a0 > 1.4) continue;
          const s = clamp(a0 / 0.08) * (1 - seg(a0, 1.0, 1.4));
          confWorld.set(cc++, ox + vx * a0, oy + vy * a0 - 3.4 * a0 * a0, oz + vz * a0, sp * a0, sp * 0.6 * a0, 0.4, s, PAL_NUM[j % 6]);
        }
      }
    }
    trail.commit(tc); confWorld.commit(cc);
  }

  return { scene, camera, root, update, fit, pick, caretLocal, configure, keyCodes: () => [...keyMeshes.keys()] };
}
