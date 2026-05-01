# 名前リクエスト 運用ガイド

サイト訪問者から「うちのおばあちゃんの名前を呼んでもらいたい」というリクエストを受け取り、VoiceVox高品質音声を追加する仕組み。

## アーキテクチャ全体像

```
[訪問者] → Google Form → Google Sheet → Apps Script
                                             │
                              ┌──────────────┴──────────────┐
                              │                              │
                        【半自動】                      【全自動】
                        Gmail通知 →                  GitHub Actions →
                        手動生成 →                   VoiceVox container →
                        push                         自動push & deploy
```

まず**半自動**から始めて、リクエスト数が月20件を超えたら全自動への投資を検討するのが現実的。

---

## 半自動レベル（推奨スタート）

### 1. Google Form 作成

https://forms.google.com/ で新規フォーム。質問項目:

| 項目 | タイプ | 必須 |
|------|--------|------|
| お名前のふりがな（ひらがなで） | 短文 | ✓ |
| 漢字での表記（任意） | 短文 | |
| 性別 | ラジオ（女性/男性/その他） | ✓ |
| 申請者のお名前（任意） | 短文 | |
| 連絡先メール（完成通知用、任意） | メール | |
| ご利用施設・ご家族との関係（任意） | 短文 | |

**ポイント**:
- ふりがなは「ひらがな」と明示。カタカナや漢字を混ぜられるとTTS生成で誤読する
- 連絡先メールは任意にしつつ、**「入れていただければお名前準備完了時にお知らせします」と説明文に記載** → 自然な見込み客リスト化

### 2. 回答先 Google Sheet に Apps Script を追加

回答先Sheetを開き、`拡張機能 → Apps Script` を選択。以下を貼り付け:

```javascript
// onFormSubmit トリガーで起動
function onFormSubmit(e) {
  const values = e.values; // [タイムスタンプ, ふりがな, 漢字, 性別, ...]
  const reading = (values[1] || "").trim();
  const kanji   = values[2] || "";
  const gender  = values[3] || "";
  const requesterName = values[4] || "(匿名)";
  const requesterMail = values[5] || "(なし)";
  const facility = values[6] || "";

  // あなた宛にGmail通知
  const subject = `🎤 名前リクエスト: ${reading}`;
  const body = [
    `新しい名前リクエストです。`,
    ``,
    `ふりがな: ${reading}`,
    `漢字: ${kanji}`,
    `性別: ${gender}`,
    `申請者: ${requesterName}`,
    `連絡先: ${requesterMail}`,
    `施設・関係: ${facility}`,
    ``,
    `=== 追加コマンド ===`,
    `cd hidamari-works-site/games/janken-party`,
    `# data/showa_names.json に1行追加してから:`,
    `python generate_showa_name_voices.py --only ${reading}`,
    `git add audio/names/full/${reading}.wav audio/names/full/index.json data/showa_names.json`,
    `git commit -m "add name voice: ${reading}"`,
    `git push`,
  ].join("\n");

  GmailApp.sendEmail("migihiji0218@gmail.com", subject, body);
}
```

`トリガー → トリガーを追加 → onFormSubmit、ソース=スプレッドシートから、イベント=フォーム送信時` で設定。

### 3. 受信時の手動オペレーション（あなた）

1. メール受信
2. ローカルでVoiceVox起動済みを確認
3. `data/showa_names.json` に該当エントリを1行追加:
   ```json
   { "reading": "ななこ", "gender": "F", "kanji_examples": ["菜々子"] }
   ```
4. メール本文のコマンドを実行（`--only ななこ` で1件だけ生成）
5. push → 自動デプロイ
6. 申請者にメール返信（任意。テンプレ化推奨）:
   > ○○さんの音声、サイトで呼べるようになりました！
   > [サイトURL] でお試しください。
   > 
   > ※じゃんけんパーティを楽しんでいただけたら、専用コントローラ（より遊びやすくなります）もぜひご検討ください: [コントローラURL]

### 想定所要時間
- リクエスト受信〜デプロイ完了: 約3分（VoiceVox 1件生成: 10秒、commit/push/deploy: 2分）

---

## 全自動レベル（リクエスト増加時）

### 必要要素
1. Apps Script から GitHub の `repository_dispatch` API を叩く
2. GitHub Actions で VoiceVox コンテナを起動 → 生成 → コミット
3. コミット後、Vercel/Netlify が自動デプロイ
4. ワークフロー成功時に申請者へ完了メール

### Apps Script 改修（GitHub通知）

```javascript
function onFormSubmit(e) {
  const values = e.values;
  const reading = (values[1] || "").trim();
  const gender  = values[3] === "男性" ? "M" : "F";

  // 入力検証: ひらがなのみ許可
  if (!/^[ぁ-ん゛゜ー]+$/.test(reading)) {
    GmailApp.sendEmail("migihiji0218@gmail.com",
      "⚠ 不正な名前リクエスト",
      `非ひらがな入力: "${reading}"`);
    return;
  }

  // GitHub repository_dispatch
  const token = PropertiesService.getScriptProperties().getProperty("GITHUB_TOKEN");
  UrlFetchApp.fetch("https://api.github.com/repos/<owner>/<repo>/dispatches", {
    method: "post",
    contentType: "application/json",
    headers: { Authorization: "Bearer " + token, Accept: "application/vnd.github+json" },
    payload: JSON.stringify({
      event_type: "name-request",
      client_payload: { reading, gender, kanji: values[2] || "", requester_mail: values[5] || "" }
    })
  });
}
```

GitHubでPersonal Access Token (Fine-grained, repo:contents:write 権限) を発行して `Apps Script → プロジェクトの設定 → スクリプトプロパティ` に `GITHUB_TOKEN` として保存。

### GitHub Actions ワークフロー (`.github/workflows/name-request.yml`)

```yaml
name: Name Voice Request
on:
  repository_dispatch:
    types: [name-request]

jobs:
  generate:
    runs-on: ubuntu-latest
    services:
      voicevox:
        image: voicevox/voicevox_engine:cpu-ubuntu20.04-latest
        ports: [50021:50021]
    steps:
      - uses: actions/checkout@v4
      - name: Wait for VoiceVox
        run: |
          for i in {1..60}; do
            curl -sf http://localhost:50021/version && break
            sleep 2
          done
      - name: Add name to JSON
        run: |
          python <<'EOF'
          import json
          p = "games/janken-party/data/showa_names.json"
          d = json.load(open(p, encoding="utf-8"))
          reading = "${{ github.event.client_payload.reading }}"
          gender  = "${{ github.event.client_payload.gender }}"
          kanji   = "${{ github.event.client_payload.kanji }}"
          if not any(n["reading"] == reading for n in d["names"]):
              d["names"].append({"reading": reading, "gender": gender, "kanji_examples": [kanji] if kanji else []})
              json.dump(d, open(p, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
          EOF
      - name: Generate wav
        run: python games/janken-party/generate_showa_name_voices.py --only "${{ github.event.client_payload.reading }}"
      - name: Commit & push
        run: |
          git config user.name  "github-actions[bot]"
          git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
          git add games/janken-party/audio/names/full/ games/janken-party/data/showa_names.json
          git commit -m "add name voice: ${{ github.event.client_payload.reading }}" || exit 0
          git push
      - name: Notify requester
        if: github.event.client_payload.requester_mail != ''
        run: |
          # 例: SendGrid / Resend / Gmail API などで申請者にメール
          echo "TODO: 完了メール送信"
```

### 注意点
- VoiceVoxイメージは ~2GB、毎回pullで1〜2分かかる。GitHub Actions のキャッシュ機能（`actions/cache`）でDockerレイヤーを保持すると改善
- 月間ジョブ実行時間でGitHub Actionsの無料枠（公開リポジトリは無制限、プライベートは2,000分/月）を超えないか監視
- `repository_dispatch` への悪意ある連投対策として、Apps Script側でレート制限（同IP/メールから1日5件まで等）を入れるとよい

---

## 移行判断基準

| リクエスト数 | 推奨レベル | 理由 |
|--------------|------------|------|
| 月10件以下   | 半自動      | 手動5分×10 = 月50分。自動化投資のペイバック遠い |
| 月10〜50件   | 半自動 + テンプレ強化 | 返信メールテンプレ化で更に高速化 |
| 月50件以上   | 全自動移行   | 手動ボトルネックが顕在化 |

## SPAM対策メモ
- Google Form は reCAPTCHA v3 を有効化可能（要 Google Cloud 連携）
- 半自動なら受信メールでフィルタ可能なので無対策でもOK
- 全自動化したら Apps Script 側で `e.namedValues` の内容バリデーション必須
