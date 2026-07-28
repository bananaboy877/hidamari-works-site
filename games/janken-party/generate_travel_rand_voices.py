"""VOICEVOX ずんだもんで「日本一周の旅(ランダム)」用の音声を生成

前提: VOICEVOX (またはエンジン単体 vv-engine/run.exe) が localhost:50021 で起動していること
"""
import json
import os
import urllib.parse
import urllib.request

VOICEVOX_URL = "http://localhost:50021"
SPEAKER_ID = 3  # ずんだもん ノーマル
OUTPUT_DIR = "C:/hidamari-works/hidamari-works-site/games/janken-party/audio"

VOICES = [
    ("intro_travel_rand.wav",
     "日本一周の旅、ランダム！グー・チョキ・パーがランダムに出るよ。出た手と同じボタンを押して、日本中を歩いて旅しよう"),
]


def generate_voice(text, filename):
    query_url = f"{VOICEVOX_URL}/audio_query?text={urllib.parse.quote(text)}&speaker={SPEAKER_ID}"
    req = urllib.request.Request(query_url, method="POST")
    with urllib.request.urlopen(req) as res:
        query_data = json.loads(res.read())

    # 速度をやや遅めに（高齢者向け）
    query_data["speedScale"] = 0.9
    query_data["pitchScale"] = 0.0
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

    print(f"  OK: {filename} ({len(wav_data)/1024:.0f} KB)")
    return filepath


print(f"=== VOICEVOX音声生成（ずんだもん id:{SPEAKER_ID}）===")
print(f"出力先: {OUTPUT_DIR}\n")

generated = []
for filename, text in VOICES:
    print(f"生成中: {text}")
    try:
        generated.append(generate_voice(text, filename))
    except Exception as e:
        print(f"  ERROR: {e}")

print(f"\n=== 完了: {len(generated)}/{len(VOICES)}ファイル生成 ===")
