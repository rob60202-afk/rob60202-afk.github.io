#!/usr/bin/env python3
"""故事動畫自動製作流程:故事 JSON -> 配音 -> AI 繪圖 -> 鏡頭推移 -> 字幕 -> MP4。

用法:
    python3 animation/make_video.py animation/stories/001-crooked-chair.json
    python3 animation/make_video.py <story.json> --vertical   # 9:16 短影音版

需要:ffmpeg、pip install gTTS。圖片與配音都會快取,中斷後重跑會從斷點接續。
"""
import argparse
import json
import re
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

FPS = 30
VOICE_SPEED = 1.22      # gTTS 原速偏慢,加速後比較像說故事的節奏
SCENE_GAP = 0.55        # 每幕配音結束後的停頓秒數
FADE = 0.35
SUB_MAX_CHARS = 16      # 單行字幕最多字數
FONT = "WenQuanYi Zen Hei"
IMAGE_API = "https://image.pollinations.ai/prompt/"


def run(cmd):
    proc = subprocess.run(cmd, capture_output=True, text=True)
    if proc.returncode != 0:
        sys.exit(f"指令失敗: {' '.join(map(str, cmd))}\n{proc.stderr[-1500:]}")
    return proc.stdout


def duration(path):
    out = run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
               "-of", "csv=p=0", str(path)])
    return float(out.strip())


def make_voice(text, lang, out):
    if out.exists():
        return
    from gtts import gTTS
    raw = out.with_suffix(".raw.mp3")
    gTTS(text, lang=lang).save(str(raw))
    run(["ffmpeg", "-y", "-i", raw, "-af", f"atempo={VOICE_SPEED}",
         "-ar", "44100", "-ac", "2", out])
    raw.unlink()


def make_image(prompt, seed, width, height, out):
    if out.exists():
        return
    query = urllib.parse.urlencode(
        {"width": width, "height": height, "seed": seed, "nologo": "true"})
    url = IMAGE_API + urllib.parse.quote(prompt, safe="") + "?" + query
    for attempt in range(1, 21):
        wait = 20
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "story-pipeline"})
            with urllib.request.urlopen(req, timeout=180) as resp:
                data = resp.read()
            if data[:3] == b"\xff\xd8\xff" or data[:4] == b"\x89PNG":
                out.write_bytes(data)
                return
            reason = "回傳的不是圖片"
        except urllib.error.HTTPError as err:
            body = err.read().decode("utf-8", "replace")
            hint = re.search(r"Retry after (\d+)s", body)
            if hint:
                wait = int(hint.group(1)) + 3
            reason = f"HTTP {err.code}"
        except (urllib.error.URLError, TimeoutError) as err:
            reason = str(err)
        print(f"    繪圖服務暫時無法使用({reason}),{wait} 秒後重試 [{attempt}/20]")
        time.sleep(wait)
    sys.exit(f"圖片生成失敗: {out.name}")


def split_subtitle(text):
    """依標點切成短句,太長的再對半切;回傳不含句尾標點的字幕行。"""
    parts = [p for p in re.split(r"(?<=[,。?!:;、,?!:;])", text) if p.strip()]
    lines = []
    for part in parts:
        clean = part.strip().rstrip(",。:;、,:;")
        while len(clean) > SUB_MAX_CHARS:
            cut = len(clean) // 2
            lines.append(clean[:cut])
            clean = clean[cut:]
        if clean:
            lines.append(clean)
    return lines


def ass_time(sec):
    h, rem = divmod(sec, 3600)
    m, s = divmod(rem, 60)
    return f"{int(h)}:{int(m):02d}:{s:05.2f}"


def srt_time(sec):
    ms = int(round(sec * 1000))
    h, ms = divmod(ms, 3600000)
    m, ms = divmod(ms, 60000)
    s, ms = divmod(ms, 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def make_clip(image, voice, clip_len, index, width, height, out):
    frames = int(round(clip_len * FPS))
    moves = [
        ("1+0.12*on/{n}", "iw/2-(iw/zoom/2)", "ih/2-(ih/zoom/2)"),        # 推近
        ("1.12-0.12*on/{n}", "iw/2-(iw/zoom/2)", "ih/2-(ih/zoom/2)"),     # 拉遠
        ("1.12", "(iw-iw/zoom)*on/{n}", "ih/2-(ih/zoom/2)"),              # 右移
        ("1.12", "(iw-iw/zoom)*(1-on/{n})", "ih/2-(ih/zoom/2)"),          # 左移
    ]
    z, x, y = (expr.format(n=frames) for expr in moves[index % len(moves)])
    video = (
        f"scale={width * 2}:{height * 2}:force_original_aspect_ratio=increase,"
        f"crop={width * 2}:{height * 2},"
        f"zoompan=z='{z}':x='{x}':y='{y}':d={frames}:s={width}x{height}:fps={FPS},"
        f"fade=t=in:st=0:d={FADE},fade=t=out:st={clip_len - FADE:.3f}:d={FADE},"
        f"format=yuv420p"
    )
    run(["ffmpeg", "-y", "-i", image, "-i", voice,
         "-filter_complex", f"[0:v]{video}[v];[1:a]apad[a]",
         "-map", "[v]", "-map", "[a]", "-t", f"{clip_len:.3f}",
         "-c:v", "libx264", "-preset", "medium", "-crf", "18",
         "-c:a", "aac", "-b:a", "160k", out])


def main():
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("story", type=Path)
    parser.add_argument("--vertical", action="store_true", help="輸出 9:16 短影音")
    args = parser.parse_args()

    story = json.loads(args.story.read_text(encoding="utf-8"))
    width, height = (1080, 1920) if args.vertical else (1920, 1080)
    shape = "vertical" if args.vertical else "wide"
    root = Path(__file__).resolve().parent
    work = root / ".cache" / story["id"] / shape
    final_dir = root / "output" / story["id"]
    work.mkdir(parents=True, exist_ok=True)
    final_dir.mkdir(parents=True, exist_ok=True)

    clips, events, clock = [], [], 0.0
    total = len(story["scenes"])
    for i, scene in enumerate(story["scenes"]):
        print(f"[{i + 1}/{total}] {scene['narration'][:20]}…")
        voice = work.parent / f"voice{i:02d}.m4a"
        image = work / f"image{i:02d}.jpg"
        clip = work / f"clip{i:02d}.mp4"

        make_voice(scene["narration"], story.get("lang", "zh-TW"), voice)

        prompt = scene["image"]
        for token, look in story.get("characters", {}).items():
            prompt = prompt.replace(token, look)
        make_image(f"{prompt}, {story['style']}", story.get("seed", 1), width, height, image)

        voice_len = duration(voice)
        clip_len = voice_len + SCENE_GAP
        make_clip(image, voice, clip_len, i, width, height, clip)

        lines = split_subtitle(scene["narration"])
        chars = sum(len(line) for line in lines)
        start = clock
        for line in lines:
            end = start + voice_len * len(line) / chars
            events.append((start, end, line))
            start = end
        clips.append(clip)
        clock += clip_len

    font_size = 64 if args.vertical else 58
    margin_v = 260 if args.vertical else 70
    ass = work / "subs.ass"
    ass.write_text(
        "[Script Info]\nScriptType: v4.00+\n"
        f"PlayResX: {width}\nPlayResY: {height}\n\n"
        "[V4+ Styles]\n"
        "Format: Name, Fontname, Fontsize, PrimaryColour, OutlineColour, BackColour, "
        "Bold, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV\n"
        f"Style: Default,{FONT},{font_size},&H00FFFFFF,&H00202020,&H80000000,"
        f"1,1,4,1,2,60,60,{margin_v}\n\n"
        "[Events]\nFormat: Layer, Start, End, Style, Text\n"
        + "".join(f"Dialogue: 0,{ass_time(s)},{ass_time(e)},Default,{t}\n"
                  for s, e, t in events),
        encoding="utf-8")

    concat = work / "concat.txt"
    concat.write_text("".join(f"file '{c}'\n" for c in clips), encoding="utf-8")
    name = story["id"] + ("-vertical" if args.vertical else "")
    final = final_dir / f"{name}.mp4"
    escaped = str(ass).replace("\\", "/").replace(":", "\\:")
    run(["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", concat,
         "-vf", f"ass='{escaped}'",
         "-c:v", "libx264", "-preset", "medium", "-crf", "23",
         "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart", final])

    (final_dir / f"{story['id']}.srt").write_text(
        "".join(f"{n}\n{srt_time(s)} --> {srt_time(e)}\n{t}\n\n"
                for n, (s, e, t) in enumerate(events, 1)),
        encoding="utf-8")
    (final_dir / "upload.txt").write_text(
        f"標題:{story['title']}\n\n說明:{story['description']}\n\n"
        f"標籤:{', '.join(story.get('tags', []))}\n\n"
        "上傳提醒:\n"
        "1. 勾選「內容經過變造或為合成內容」(畫面與配音皆為 AI 生成)。\n"
        "2. 目標觀眾選「不是為兒童打造」。\n"
        "3. 封面與標題請親自確認後再發佈。\n",
        encoding="utf-8")

    print(f"完成:{final}(片長 {clock:.1f} 秒)")


if __name__ == "__main__":
    main()
