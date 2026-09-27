# アプリ一覧 3D パネル — シーン制作ガイド

`apps/index.html` は各アプリで「できること」を three.js の小さなアニメーションで見せる入口ページ。
対象は **GUI を初めて触る人（高齢者を含む）**。一目で「何ができるアプリか」が伝わることが最優先。

## ファイル構成
- `apps/engine.js` … 共通エンジン（トゥーン陰影・輪郭線・ヘルパー）。
- `apps/scenes/<slug>.js` … 1 アプリ = 1 シーン。`defineScene(slug, factory)` で登録する。
- `apps/apps-data.js` … 一覧データ（タイトル・説明・背景色など）。
- `apps/preview.html?slug=<slug>` … 単体プレビュー（スライダーで時間を動かせる）。
- `python apps/capture.py <slug> [--n 12] [--t0 a --t1 b]` … 連続フレームを撮り `apps/_frames/<slug>.png` にコンタクトシートを書き出す。

## シーンの約束
```js
import { THREE, defineScene, stage, mesh, group, G, toon, flat, canvasTexture, blobShadow, FONT,
  clamp, lerp, seg, bump, smooth, easeOutBack, rand } from '../engine.js';
defineScene('slug', () => {
  const { scene, camera, root } = stage({ fov: 30, pos: [x, y, z], target: [x, y, z] });
  // ... root にモデルを組む
  function update(t) { /* t は 0〜duration。t だけから姿勢を決める（純関数） */ }
  return { scene, camera, update, duration: 8 };
});
```
- **update(t) は t だけで決まる純関数にする**（dt 積分・Math.random 禁止。乱数は `rand(seed)` で初期化時に固定）。キャプチャで任意時刻を撮るため。
- **ループ**: t=duration と t=0 がつながること（始点と終点の姿勢を合わせる）。
- 背景は透明（パネルの CSS 背景色が見える）。地面が必要なら床やテーブルなどモデルとして置く。
- カメラは `stage()` の pos/target で固定。ホバー時はエンジンが自動で少し回り込む（左右 ±0.22rad）ので、端ギリギリに置かない。
- パネル比率は 4:3。重要な被写体は中央 80% 以内に。

## 見た目のルール
- `mesh(geo, color, opts)` は自動で輪郭線（反転ハル・画面上で一定の太さ）が付く。小物は `px: 1.4` 程度、付けないなら `line: false`。
- 角がある物は `G.box(w,h,d,r)`（角丸）を基本に。平たい円柱は `G.puck(r,h,bevel)`。
- 色はパステル寄りの明るい色 + 濃いインク色の輪郭。1 シーンのメイン色は 3〜4 色まで。
- 文字はキャンバステクスチャ（`canvasTexture`）で。大きく太く（FONT, 800〜900）。フチ取りをすると読みやすい。
- 接地感は `blobShadow(parent, r)`。
- 演出は「作れるもの・遊んでいる様子」が主役。UI 画面の再現ではなく、**そのアプリで作ったモノ / 遊んでいる光景をオモチャのように**見せる。
- 動きはゆっくり・はっきり。1 ループ 6〜10 秒。見せ場（完成・ゴール・ヒット）を 1 回入れ、ポップ（easeOutBack）・キラキラ・紙吹雪で気持ちよく。
- 速すぎるフラッシュや激しい点滅は避ける。

## 検証
`python apps/capture.py <slug> --n 12` でコンタクトシートを撮り、画像を見て以下を確認して直す。
1. 何のアプリか 1 枚目から分かるか
2. 被写体がフレームに収まっているか・小さすぎないか
3. 動きの流れ（始まり → 見せ場 → 戻り）が読めるか、ループの継ぎ目が飛ばないか
4. 輪郭線の欠け・Z ファイティング・めり込みがないか
見せ場の前後は `--t0 --t1` で細かく撮って確認する。
