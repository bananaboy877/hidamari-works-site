"""VOICEVOX ずんだもんで「正解！」音声を生成"""
import json
import urllib.request
import urllib.parse
import os

VOICEVOX_URL = "http://localhost:50021"
SPEAKER_ID = 3  # ずんだもん ノーマル
OUTPUT_DIR = "C:/hidamari-works/hidamari-works-site/games/janken-party/audio"

VOICES = [
    ("seikai.wav", "正解！"),
]

def generate_voice(text, filename):
    query_url = f"{VOICEVOX_URL}/audio_query?text={urllib.parse.quote(text)}&speaker={SPEAKER_ID}"
    req = urllib.request.Request(query_url, method="POST")
    with urllib.request.urlopen(req) as res:
        query_data = json.loads(res.read())

    # 元気よく、少し早めに
    query_data["speedScale"] = 1.1
    query_data["pitchScale"] = 0.05
    query_data["volumeScale"] = 1.0

    synth_url = f"{VOICEVOX_URL}/synthesis?speaker={SPEAKER_ID}"
    synth_req = urllib.request.Request(
        synth_url,
        data=json.dumps(query_data).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST"
    )

    filepath = os.path.join(OUTPUT_DIR, filename)
    with urllib.request.urlopen(synth_req) as res:
        wav_data = res.read()
        with open(filepath, "wb") as f:
            f.write(wav_data)

    size_kb = len(wav_data) / 1024
    print(f"  OK: {filename} ({size_kb:.0f} KB)")
    return filepath

print(f"=== VOICEVOX音声生成（ずんだもん id:{SPEAKER_ID}）===")
print(f"出力先: {OUTPUT_DIR}\n")

for filename, text in VOICES:
    print(f"生成中: {text}")
    try:
        generate_voice(text, filename)
    except Exception as e:
        print(f"  ERROR: {e}")

print("\n=== 完了 ===")
