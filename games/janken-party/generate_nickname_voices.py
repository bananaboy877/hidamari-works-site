"""VOICEVOX ずんだもんで50音すべての頭文字×性別あだ名音声を一括生成

頭文字69音 × 2性別 (◯っちゃん/◯っさん) = 138ファイル
出力: audio/names/name_<char>_<chan|san>.wav
"""
import json
import os
import urllib.parse
import urllib.request

VOICEVOX_URL = "http://localhost:50021"
SPEAKER_ID = 3  # ずんだもん ノーマル
OUTPUT_DIR = "C:/hidamari-works/hidamari-works-site/games/janken-party/audio/names"

# 頭文字として使う文字（ん・を は名前頭文字として除外）
CHARS = list(
    "あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわ"
    "がぎぐげござじずぜぞだぢづでどばびぶべぼ"
    "ぱぴぷぺぽ"
)

VOICES = []
for ch in CHARS:
    VOICES.append((f"name_{ch}_chan.wav", f"{ch}っちゃん"))
    VOICES.append((f"name_{ch}_san.wav",  f"{ch}っさん"))


def generate_voice(text, filename):
    """VOICEVOXで音声合成してファイルに保存"""
    query_url = f"{VOICEVOX_URL}/audio_query?text={urllib.parse.quote(text)}&speaker={SPEAKER_ID}"
    req = urllib.request.Request(query_url, method="POST")
    with urllib.request.urlopen(req) as res:
        query_data = json.loads(res.read())

    query_data["speedScale"] = 0.9
    query_data["pitchScale"] = 0.0
    query_data["volumeScale"] = 1.0

    synth_url = f"{VOICEVOX_URL}/synthesis?speaker={SPEAKER_ID}"
    synth_req = urllib.request.Request(
        synth_url,
        data=json.dumps(query_data).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    filepath = os.path.join(OUTPUT_DIR, filename)
    with urllib.request.urlopen(synth_req) as res:
        wav_data = res.read()
        with open(filepath, "wb") as f:
            f.write(wav_data)

    size_kb = len(wav_data) / 1024
    print(f"  OK: {filename} ({size_kb:.0f} KB) -> {text}")
    return filepath


os.makedirs(OUTPUT_DIR, exist_ok=True)

print(f"=== VOICEVOX あだ名一括生成（ずんだもん id:{SPEAKER_ID}）===")
print(f"出力先: {OUTPUT_DIR}")
print(f"対象: {len(CHARS)}音 x 2性別 = {len(VOICES)}ファイル\n")

generated = []
errors = []
for filename, text in VOICES:
    try:
        path = generate_voice(text, filename)
        generated.append(path)
    except Exception as e:
        print(f"  ERROR: {filename} -> {e}")
        errors.append((filename, str(e)))

print(f"\n=== 完了: {len(generated)}/{len(VOICES)}ファイル生成 ===")
if errors:
    print(f"失敗 {len(errors)}件:")
    for fn, msg in errors:
        print(f"  - {fn}: {msg}")
