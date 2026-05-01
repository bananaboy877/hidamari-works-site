"""VOICEVOX で昭和頻出名前のフルネーム音声を一括生成

入力: data/showa_names.json
出力: audio/names/full/<reading>.wav  (内容は「<reading>さん」を一体合成、自然な抑揚)
     audio/names/full/index.json (JSが起動時に読むインデックス)

性別は問わず一律「さん」を付加して合成（名前と敬称を別ファイルにすると
合間に間ができて不自然になるため）。

オプション: --only <reading> で特定の名前だけ追加生成
            （Google Form リクエスト経由の単発追加用）
"""
import argparse
import datetime
import json
import os
import sys
import urllib.parse
import urllib.request

VOICEVOX_URL = "http://localhost:50021"
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_FILE = os.path.join(SCRIPT_DIR, "data", "showa_names.json")
OUTPUT_DIR = os.path.join(SCRIPT_DIR, "audio", "names", "full")
INDEX_FILE = os.path.join(OUTPUT_DIR, "index.json")


def generate_voice(text, filepath, speaker_id):
    query_url = f"{VOICEVOX_URL}/audio_query?text={urllib.parse.quote(text)}&speaker={speaker_id}"
    req = urllib.request.Request(query_url, method="POST")
    with urllib.request.urlopen(req) as res:
        query_data = json.loads(res.read())

    query_data["speedScale"] = 0.9
    query_data["pitchScale"] = 0.0
    query_data["volumeScale"] = 1.0

    synth_url = f"{VOICEVOX_URL}/synthesis?speaker={speaker_id}"
    synth_req = urllib.request.Request(
        synth_url,
        data=json.dumps(query_data).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(synth_req) as res:
        wav_data = res.read()
        with open(filepath, "wb") as f:
            f.write(wav_data)
    return len(wav_data)


def write_index(speaker_id):
    """既存wavを走査してindex.jsonを再構築。性別はshowa_names.jsonから引く"""
    names = sorted(
        os.path.splitext(f)[0]
        for f in os.listdir(OUTPUT_DIR)
        if f.endswith(".wav")
    )
    # 性別ルックアップ
    gender_map = {}
    try:
        with open(DATA_FILE, encoding="utf-8") as f:
            for n in json.load(f).get("names", []):
                gender_map[n["reading"]] = n.get("gender", "?")
    except Exception:
        pass
    names_data = [{"reading": r, "gender": gender_map.get(r, "?")} for r in names]
    index = {
        "generated_at": datetime.datetime.now().isoformat(timespec="seconds"),
        "speaker_id": speaker_id,
        "count": len(names),
        "names": names,         # 後方互換: 文字列配列
        "names_data": names_data,  # 新: {reading, gender} 配列
    }
    with open(INDEX_FILE, "w", encoding="utf-8") as f:
        json.dump(index, f, ensure_ascii=False, indent=2)
    print(f"\n=== index.json 更新: {len(names)}名前 (性別マップ {len(gender_map)}件) ===")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--only", help="この読みのみ生成 (例: --only たかし)")
    parser.add_argument("--force", action="store_true", help="既存wavも再生成")
    args = parser.parse_args()

    with open(DATA_FILE, encoding="utf-8") as f:
        data = json.load(f)

    speaker_id = data["speaker_id"]
    all_names = data["names"]

    # 重複除去（同じreadingは1件にまとめる）
    seen = set()
    unique_names = []
    for n in all_names:
        if n["reading"] not in seen:
            seen.add(n["reading"])
            unique_names.append(n)
    skipped_dup = len(all_names) - len(unique_names)
    if skipped_dup:
        print(f"重複除去: {skipped_dup}件スキップ → {len(unique_names)}件で実行")

    if args.only:
        unique_names = [n for n in unique_names if n["reading"] == args.only]
        if not unique_names:
            print(f"ERROR: '{args.only}' は data/showa_names.json に未登録")
            sys.exit(1)

    os.makedirs(OUTPUT_DIR, exist_ok=True)

    print(f"=== VOICEVOX 昭和名前生成 (speaker_id={speaker_id}) ===")
    print(f"出力先: {OUTPUT_DIR}")
    print(f"対象: {len(unique_names)}件\n")

    generated = []
    skipped_exists = []
    errors = []

    for entry in unique_names:
        reading = entry["reading"]
        gender = entry.get("gender", "?")
        filepath = os.path.join(OUTPUT_DIR, f"{reading}.wav")

        if not args.force and os.path.exists(filepath):
            skipped_exists.append(reading)
            continue

        try:
            text = reading + "さん"  # 名前+敬称を一体で合成（自然な抑揚）
            size = generate_voice(text, filepath, speaker_id)
            print(f"  OK [{gender}] {reading} -> '{text}' ({size/1024:.0f} KB)")
            generated.append(reading)
        except Exception as e:
            print(f"  ERROR [{gender}] {reading}: {e}")
            errors.append((reading, str(e)))

    print(f"\n=== 生成: {len(generated)}件 / スキップ(既存): {len(skipped_exists)}件 / 失敗: {len(errors)}件 ===")
    if errors:
        for r, msg in errors:
            print(f"  失敗 - {r}: {msg}")

    write_index(speaker_id)


if __name__ == "__main__":
    main()
