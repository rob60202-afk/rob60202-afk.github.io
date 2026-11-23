"""Check images for the channel art (run by build.sh).

usage: python3 previews.py <avatar.png> <banner.png> <thumbnail.png> <out_dir>

- avatar-circle-preview.png   the avatar under YouTube's circular crop, full size,
                              plus the small sizes it is shown at, on light and dark pages
- banner-safe-area-preview.png the banner with everything outside the 1546x423 safe area
                              darkened; dashed lines mark what tablets and desktops show
- L003-thumbnail-small.png    the thumbnail at 320x180, the size of a phone list item
"""
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ACID = (183, 243, 61)
NAVY = (10, 20, 33)


def font(size):
    for f in ("/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc", "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"):
        try:
            return ImageFont.truetype(f, size)
        except OSError:
            pass
    return ImageFont.load_default()


def circle(img, size):
    """img resized to size x size, transparent outside the inscribed circle (drawn at 4x, then shrunk, for a smooth edge)."""
    big = img.convert("RGBA").resize((size * 4, size * 4), Image.LANCZOS)
    mask = Image.new("L", big.size, 0)
    ImageDraw.Draw(mask).ellipse((0, 0, big.size[0] - 1, big.size[1] - 1), fill=255)
    big.putalpha(mask)
    return big.resize((size, size), Image.LANCZOS)


def avatar_preview(src, dst):
    av = Image.open(src)
    W, H = 1300, 860
    out = Image.new("RGB", (W, H), (236, 236, 236))
    d = ImageDraw.Draw(out)
    # left: the full 800 px avatar as YouTube crops it, with the square's corners shown faintly
    sq = av.convert("RGB").resize((800, 800), Image.LANCZOS)
    faint = Image.blend(Image.new("RGB", sq.size, (236, 236, 236)), sq, 0.18)
    out.paste(faint, (30, 30))
    out.paste(circle(av, 800), (30, 30), circle(av, 800))
    d.ellipse((30, 30, 829, 829), outline=ACID, width=3)
    d.text((30, 834), "800 px,圓形遮罩(淡色的四角會被裁掉)", fill=(60, 60, 60), font=font(18))
    # right: small sizes on a light and a dark page
    x0 = 870
    for k, (bg, fg) in enumerate([((255, 255, 255), (40, 40, 40)), ((15, 15, 15), (220, 220, 220))]):
        y0 = 30 + k * 410
        d.rectangle((x0, y0, W - 30, y0 + 390), fill=bg)
        x = x0 + 20
        for size in (176, 98, 48, 32):
            c = circle(av, size)
            yy = y0 + 30 + (176 - size) // 2
            out.paste(c, (x, yy), c)
            d.text((x, y0 + 230), f"{size}px", fill=fg, font=font(16))
            x += size + 22
        d.text((x0 + 20, y0 + 300), "淺色頁面" if k == 0 else "深色頁面", fill=fg, font=font(18))
    out.save(dst, optimize=True)


def banner_preview(src, dst):
    b = Image.open(src).convert("RGB")
    W, H = b.size  # 2560 x 1440
    sw, sh = 1546, 423  # visible on every device
    sx, sy = (W - sw) // 2, (H - sh) // 2
    dark = Image.blend(b, Image.new("RGB", b.size, (0, 0, 0)), 0.62)
    dark.paste(b.crop((sx, sy, sx + sw, sy + sh)), (sx, sy))
    d = ImageDraw.Draw(dark)

    def dashed(x0, y0, x1, y1, color, width=4, dash=28, gap=18):
        for y in (y0, y1):
            x = x0
            while x < x1:
                d.line((x, y, min(x + dash, x1), y), fill=color, width=width)
                x += dash + gap
        for x in (x0, x1):
            y = y0
            while y < y1:
                d.line((x, y, x, min(y + dash, y1)), fill=color, width=width)
                y += dash + gap

    dashed(0 + 3, sy, W - 4, sy + sh, (255, 255, 255))  # desktop: 2560 x 423
    tw = 1855
    dashed((W - tw) // 2, sy - 2, (W + tw) // 2, sy + sh + 2, (200, 200, 200), width=3)  # tablet: 1855 x 423
    d.rectangle((sx - 3, sy - 3, sx + sw + 3, sy + sh + 3), outline=ACID, width=6)
    f = font(34)
    d.text((sx, sy + sh + 18), "安全區 1546×423(手機、平板、電腦、電視都看得到)", fill=ACID, font=f)
    d.text((24, sy - 48), "電腦 2560×423(白色虛線)", fill=(255, 255, 255), font=f)
    d.text(((W - tw) // 2 + 6, sy + sh + 70), "平板 1855×423(灰色虛線)", fill=(200, 200, 200), font=f)
    d.text((24, 24), "整張 2560×1440 只在電視上看得到", fill=(255, 255, 255), font=f)
    dark.save(dst, optimize=True)


def thumb_small(src, dst):
    Image.open(src).convert("RGB").resize((320, 180), Image.LANCZOS).save(dst, optimize=True)


if __name__ == "__main__":
    avatar, banner, thumb, out = sys.argv[1:5]
    out = Path(out)
    avatar_preview(avatar, out / "avatar-circle-preview.png")
    banner_preview(banner, out / "banner-safe-area-preview.png")
    thumb_small(thumb, out / "L003-thumbnail-small.png")
    print("previews written to", out)
