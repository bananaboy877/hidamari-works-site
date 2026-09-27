// PoP MeMo! 3D: アプリ本体と同じ 3D 世界を、台本どおりに自動入力して見せる
import { defineScene } from '../engine.js';
import { createMemoWorld } from '../lib/popmemo3d.js';

defineScene('pop-memo-3d', () => {
  const W = createMemoWorld();
  W.fit(4 / 3, { zoom: 0.95 });
  const DUR = 10;

  const B = { id: 'b', text: 'やること\n・さんぽ\n・ほんをよむ', color: 'blue' };
  const C = { id: 'c', text: 'レシピ\n・カレー', color: 'green' };
  const D = { id: 'd', text: 'メモ', color: 'yellow' };

  // ---- 台本（ローマ字で打つ → 変換中は下線 → Enter で確定 → Enter で改行）
  const script = [
    [['k', 'a', 'か'], ['i', 'い'], ['m', 'o', 'も'], ['n', 'o', 'の']], 'CONFIRM', 'NL',
    [['/', '・'], ['t', 'a', 'た'], ['m', 'a', 'ま'], ['g', 'o', 'ご']], 'CONFIRM', 'NL',
    [['/', '・'], ['g', 'y', 'u', 'ぎゅ'], ['u', 'う'], ['n', 'y', 'u', 'にゅ'], ['u', 'う']], 'CONFIRM',
  ];
  const codeOf = (c) => c === '/' ? 'Slash' : 'Key' + c.toUpperCase();
  const steps = []; // { t, code, committed, pending, fx: 'char'|'enter'|null }
  let t = 0.6, committed = '', seed = 1;
  const KEY_DT = 0.12;
  for (const item of script) {
    if (item === 'CONFIRM') { t += 0.16; steps.push({ t, code: 'Enter', committed, pending: '', fx: null }); t += 0.2; continue; }
    if (item === 'NL') { committed += '\n'; steps.push({ t, code: 'Enter', committed, pending: '', fx: 'enter', seed: seed++ }); t += 0.3; continue; }
    let kana = '';
    for (const grp of item) {
      const letters = grp.slice(0, -1), out = grp[grp.length - 1];
      letters.forEach((ch, i) => {
        const last = i === letters.length - 1;
        const pending = kana + (last ? out : letters.slice(0, i + 1).join(''));
        steps.push({ t, code: codeOf(ch), committed, pending, fx: 'char', seed: seed++ });
        t += KEY_DT;
      });
      kana += out;
    }
    committed += kana;
  }
  const T_NEXT = 4.95, T_PLUS = 6.7, T_NEW = 7.4;
  const N0full = { id: 'n0', text: committed, color: 'pink' };

  const fxCache = new Map();
  function state(now) {
    let memos, index = 0, trans = null, plus = { open: false, t: -9 };
    let text = '', comp = null, caret = 0;
    const keys = new Map();
    const fx = [];
    let typedAt = -9;
    if (now < T_NEXT) {
      let cur = null;
      for (const s of steps) {
        if (s.t > now) break;
        cur = s;
        keys.set(s.code, { down: now < s.t + 0.08, t: now < s.t + 0.08 ? s.t : s.t + 0.08 });
        typedAt = s.t;
      }
      if (cur) {
        text = cur.committed + cur.pending;
        comp = cur.pending ? [cur.committed.length, text.length] : null;
      }
      caret = text.length;
      memos = [{ id: 'n0', text, color: 'pink' }, B, C, D];
    } else if (now < T_NEW) {
      memos = [N0full, B, C, D]; index = 1;
      trans = { type: 'next', t: T_NEXT, from: N0full };
      caret = B.text.length; typedAt = T_NEXT + 1;
      if (now >= T_PLUS) plus = { open: true, t: T_PLUS };
    } else {
      memos = [{ id: 'new', text: '', color: 'pink' }, B, C, D]; index = 0;
      trans = { type: 'new', t: T_NEW, from: B, color: 'pink' };
      plus = { open: false, t: T_NEW };
      typedAt = T_NEW + 1.2;
    }
    // 演出イベント（打鍵のたび / 改行）
    for (const s of steps) {
      if (!s.fx || s.t > now || now - s.t > 1.8 || now >= T_NEXT + 0.6) continue;
      let e = fxCache.get(s);
      if (!e) {
        const txt = s.committed + s.pending;
        const [x, y, sc] = W.caretLocal({ text: txt, color: 'pink' }, txt.length);
        e = { t: s.t, kind: s.fx, x, y, s: sc, seed: s.seed, mode: 'mix' };
        fxCache.set(s, e);
      }
      fx.push(e);
    }
    return { memos, index, caret, comp, keys, fx, trans, plus, level: 'normal', focused: true, typedAt };
  }

  return { scene: W.scene, camera: W.camera, update: (tt) => W.update(tt, state(tt)), duration: DUR };
});
