// アプリ一覧データ
// slug は scenes/<slug>.js と対応。wide: true は 2 列ぶんの横長カード（段の余りを埋める）。poster は「動きを減らす」設定のときに表示する時刻（秒）。
export const GROUPS = [
  { id: 'play',  label: 'からだを動かして遊ぶ', icon: '🎮', color: '#ffc9a8', lead: 'コントローラーやマウスホイール、カメラを使って、楽しく体を動かすゲームです。' },
  { id: 'write', label: 'メモ・音楽をつくる',   icon: '✏️', color: '#ffe38a', lead: 'メモを書いたり、AI 音楽のもとになる文章を組み立てたりできます。' },
  { id: 'image', label: '画像をととのえる',     icon: '🖼️', color: '#bfe3ff', lead: '写真やロゴを切ったり、縁取りしたり、色を変えたりできます。' },
  { id: 'make',  label: '3D プリント・機器の設定', icon: '🛠️', color: '#c9f0c4', lead: '3D プリンターで印刷できる小物のデータを作ったり、手作りキーボードを設定したりできます。' },
];

export const APPS = [
  // ---- あそぶ
  { slug: 'janken-party', wide: true, group: 'play', kind: 'ゲーム', emoji: '✊', title: 'どうぶつ運動会',
    can: 'グー・チョキ・パーのボタンで、どうぶつたちとミニゲーム。かけっこ、もぐらたたき、クイズなどたくさんあります。',
    needs: ['じゃんけんコントローラー', 'キーボードでも可'], href: '../games/janken-party/index.html', bg: '#d8f5c8', poster: 2 },
  { slug: 'table-hockey', group: 'play', kind: 'ゲーム', emoji: '🏒', title: 'テーブルホッケー',
    can: 'マウスホイールでパドルを動かして、コンピューターとエアホッケーで勝負します。',
    needs: ['マウスホイール'], href: '../games/table-hockey/index.html', bg: '#d6ecff', poster: 6.4 },
  { slug: 'bicycle-dash', group: 'play', kind: 'ゲーム', emoji: '🚲', title: 'ひたすら自転車',
    can: 'マウスホイールをくるくる回して自転車をこぎ、日本中を旅します。',
    needs: ['マウスホイール'], href: '../games/bicycle-dash/index.html', bg: '#e3f6c6', poster: 3 },
  { slug: 'push-rpg', group: 'play', kind: 'ゲーム', emoji: '⚔️', title: 'PUSH QUEST 腕立てRPG',
    can: '腕立て伏せをするたびに勇者が攻撃！ モンスターをたおして進みます。',
    needs: ['カメラ'], href: '../games/push-rpg/index.html', bg: '#eadcff', poster: 3 },
  { slug: 'push-cannon', group: 'play', kind: 'ゲーム', emoji: '💥', title: 'PUSH CANNON 腕立て砲撃',
    can: '腕立て伏せで大砲をドーン！ 体を動かして敵をうちおとします。',
    needs: ['カメラ'], href: '../games/push-cannon/index.html', bg: '#ffe0cc', poster: 3 },

  // ---- かく・つくる
  { slug: 'pop-memo', group: 'write', kind: 'ツール', emoji: '📝', title: 'PoP MeMo!',
    can: 'ポップでカラフルなメモ帳。書くたびにキラキラの演出が出て、楽しく記録できます。',
    needs: ['キーボード'], href: '../tools/pop-memo.html', bg: '#ffe0ec', poster: 4 },
  { slug: 'pop-memo-ika', group: 'write', kind: 'ツール', emoji: '🦑', title: 'PoP MeMo! イカスミ',
    can: '深い海のような黒いテーマのメモ帳。落ち着いた画面で書けます。',
    needs: ['キーボード'], href: '../tools/pop-memo-ika.html', bg: '#bfd0ff', poster: 4 },
  { slug: 'ace-step', group: 'write', kind: 'ツール', emoji: '🎵', title: 'ACE-Step プロンプト作成',
    can: 'ジャンルや楽器をえらぶだけで、AI 作曲用の文章ができあがります。',
    needs: ['マウス'], href: '../tools/ace-step-prompt-builder.html', bg: '#ffe7c2', poster: 5 },

  // ---- 画像
  { slug: 'image-splitter', wide: true, group: 'image', kind: 'ツール', emoji: '✂️', title: '画像グリッド分割',
    can: '1 枚の画像を、ます目のように切り分けて保存できます。',
    needs: ['画像ファイル'], href: '../tools/image-splitter.html', bg: '#dcdcff', poster: 4 },
  { slug: 'image-trimmer', group: 'image', kind: 'ツール', emoji: '🖼️', title: '画像トリミング',
    can: '白い余白を自動でカット。写っているものだけを切り出します。',
    needs: ['画像ファイル'], href: '../tools/image-trimmer.html', bg: '#fff1bf', poster: 4 },
  { slug: 'image-outline', group: 'image', kind: 'ツール', emoji: '🖍️', title: '画像縁取り／色変換',
    can: 'ロゴやイラストに縁取りを足したり、色をまるごと変えたりできます。',
    needs: ['透過 PNG 画像'], href: '../tools/image-outline.html', bg: '#cfeeff', poster: 4 },
  { slug: 'logo-gradient', wide: true, group: 'image', kind: 'ツール', emoji: '🌈', title: 'ロゴ グラデーション',
    can: 'ロゴ画像に、にじのようなグラデーションやフチを付けて加工します。',
    needs: ['画像ファイル'], href: '../tools/logo-gradient.html', bg: '#f1dcff', poster: 4 },

  // ---- 3D プリント・機器
  { slug: 'desk-organizer', group: 'make', kind: 'ツール', emoji: '🗂️', title: 'デスクオーガナイザーメーカー',
    can: '大きさと仕切りを決めるだけで、机の上の小物入れを 3D プリント用に作れます。',
    needs: ['3D プリンター'], href: '../tools/desk-organizer.html', bg: '#d7f3d0', poster: 5 },
  { slug: 'shutter-box', group: 'make', kind: 'ツール', emoji: '📦', title: 'スライドシャッターBOX',
    can: 'すべるシャッターの付いた小物入れを、好きな大きさで設計して 3D プリントできます。',
    needs: ['3D プリンター'], href: '../tools/shutter-box.html', bg: '#ffe6cf', poster: 5 },
  { slug: 'grid-keymap', group: 'make', kind: 'ツール', emoji: '⌨️', title: 'かんたんキー設定',
    can: '手作りキーボードのボタンに、好きなキーを割り当てます。',
    needs: ['拡張キーボード', 'Chrome / Edge'], href: '../tools/grid-keymap-editor.html', bg: '#cdf3ea', poster: 4 },
];
