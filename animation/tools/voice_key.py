#!/usr/bin/env python3
"""付費配音的快取工具。

一集的每一句台詞,引擎會用「語音設定 + 台詞文字」呼叫 tools/piper。
把付費配音存成 animation/voice-cache/<代號>.mp3,piper 就會改用它。

用法:
  列出一集每一句的代號與目前狀態(已有付費錄音/仍用 gTTS):
    python3 animation/tools/voice_key.py list animation/films/field-01-quotation
  把下載好的錄音放進快取(語音設定要和該句在引擎裡用的一樣):
    python3 animation/tools/voice_key.py put "zh-TW,pitch=0.86" "這麼高,你的高空車,算在哪一行?" 下載的檔案.mp3

放完之後,在該集資料夾重跑 prep-voice.js 與 song.js,再算圖。
"""
import hashlib, json, os, re, shutil, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
CACHE = os.environ.get("VOICE_CACHE", os.path.join(HERE, "..", "voice-cache"))


def key(model, text):
    """與 tools/piper 相同:只看語言(逗號前)與文字。"""
    lang = model.split(",")[0]
    return hashlib.sha1(f"{lang}\n{text.strip()}".encode("utf-8")).hexdigest()[:16]


def lines_of(film):
    """用 node 讀出該集的 lines.js,回傳 [(語音設定, 台詞)]。"""
    js = ("const L=require(process.argv[1]);"
          "console.log(JSON.stringify(L.map(l=>({text:l.text,voice:l.voice||null,who:l.who||null}))))")
    raw = subprocess.run(["node", "-e", js, os.path.join(os.path.abspath(film), "lines.js")],
                         capture_output=True, text=True, check=True).stdout
    return json.loads(raw)


def main():
    if len(sys.argv) < 2 or sys.argv[1] not in ("list", "put", "key"):
        print(__doc__); sys.exit(1)
    cmd = sys.argv[1]
    if cmd == "key":
        print(key(sys.argv[2], sys.argv[3]))
    elif cmd == "put":
        model, text, src = sys.argv[2], sys.argv[3], sys.argv[4]
        os.makedirs(CACHE, exist_ok=True)
        ext = os.path.splitext(src)[1].lower() or ".mp3"
        dst = os.path.join(CACHE, key(model, text) + ext)
        shutil.copyfile(src, dst)
        print("saved", os.path.relpath(dst))
    else:
        film = sys.argv[2]
        default = os.environ.get("PIPER_MODEL", "zh-TW")
        for i, l in enumerate(lines_of(film)):
            model = l["voice"] or default
            k = key(model, l["text"])
            have = any(os.path.exists(os.path.join(CACHE, k + e)) for e in (".mp3", ".wav"))
            print(f'{i:>2} {k} {"付費" if have else "gTTS"} [{model}] {l["text"]}')


if __name__ == "__main__":
    main()
