#!/usr/bin/env python3
"""Generate a matrix-rain-styled OG badge for ALKEMIST ASCII Dither System.

Strategy: Render logo as bright green glow, then overlay matrix chars on top.
Renders at 3x then downscales for crisp result.
"""

import random
import math
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageChops
import cairosvg
import io

OUT_W, OUT_H = 1200, 630
SCALE = 3
W, H = OUT_W * SCALE, OUT_H * SCALE

BG = (0, 0, 0)
CHARS = "ｦｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾅﾆﾇﾈﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾗﾘﾙﾚﾛﾜﾝ0123456789ABCDEFZ"


def lerp(c1, c2, t):
    t = max(0.0, min(1.0, t))
    return tuple(int(a + (b - a) * t) for a, b in zip(c1, c2))


def get_font(size):
    for p in ["/System/Library/Fonts/Menlo.ttc",
              "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf"]:
        try:
            return ImageFont.truetype(p, size)
        except Exception:
            pass
    return ImageFont.load_default()


def generate():
    # ── Load logo as green-on-black image ──
    logo_w = int(W * 0.55)
    logo_h = int(logo_w / (368 / 63))
    png_data = cairosvg.svg2png(
        url="public/logo/alkemist-logo.svg",
        output_width=logo_w, output_height=logo_h,
    )
    logo_rgba = Image.open(io.BytesIO(png_data)).convert("RGBA")
    alpha = logo_rgba.split()[3]  # Alpha mask

    # Position logo upper-center
    lx = (W - logo_w) // 2
    ly = H // 2 - logo_h - int(35 * SCALE)

    # ── Base layer: black canvas ──
    img = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(img)

    # ── Font setup ──
    fs = int(13 * SCALE)
    mono = get_font(fs)
    cw = int(fs * 0.62)
    ch = int(fs * 1.15)
    cols = W // cw
    rows = H // ch

    # ── 1. Faint background scatter ──
    for _ in range(3500):
        x = random.randint(0, W - cw)
        y = random.randint(0, H - ch)
        b = random.uniform(0.01, 0.06)
        draw.text((x, y), random.choice(CHARS),
                  fill=(0, int(45 * b * 5), int(10 * b * 5)), font=mono)

    # ── 2. Rain columns ──
    # Pre-compute which columns overlap logo
    logo_cols = set()
    for col in range(cols):
        px = col * cw + cw // 2 - lx
        if 0 <= px < logo_w:
            for row in range(rows):
                py = row * ch + ch // 2 - ly
                if 0 <= py < logo_h and alpha.getpixel((px, py)) > 80:
                    logo_cols.add(col)
                    break

    for col in range(cols):
        on_logo = col in logo_cols
        density = 0.6 if on_logo else 0.12
        if random.random() > density:
            continue

        # Multiple rain drops per column for denser effect
        num_drops = random.randint(1, 3) if on_logo else 1
        for _ in range(num_drops):
            head = random.randint(-8, rows + 8)
            length = random.randint(6, 22)

            for t in range(length):
                row = head - t
                if row < 0 or row >= rows:
                    continue
                x, y = col * cw, row * ch
                c = random.choice(CHARS)

                # Check if cell is on logo
                px = col * cw + cw // 2 - lx
                py = row * ch + ch // 2 - ly
                on = (0 <= px < logo_w and 0 <= py < logo_h
                      and alpha.getpixel((px, py)) > 80)

                if t == 0:
                    color = (220, 255, 220) if on else (140, 255, 140)
                elif t < 3:
                    color = (30, 255, 80) if on else (0, 200, 50)
                else:
                    fade = max(0, 1 - t / length)
                    color = lerp(BG, (0, 100, 25) if on else (0, 55, 14), fade)

                draw.text((x, y), c, fill=color, font=mono)

    # ── 3. Logo glow layer ──
    # Create green logo image and blur it for glow
    logo_green = Image.new("RGB", (W, H), BG)
    logo_draw = ImageDraw.Draw(logo_green)
    # Paste logo as bright green
    for py in range(logo_h):
        for px in range(logo_w):
            a = alpha.getpixel((px, py))
            if a > 20:
                n = a / 255.0
                g = int(220 * n)
                r = int(30 * n)
                b = int(8 * n)
                logo_green.putpixel((lx + px, ly + py), (r, g, b))

    # Bloom: blur and composite
    bloom1 = logo_green.filter(ImageFilter.GaussianBlur(radius=3 * SCALE))
    bloom2 = logo_green.filter(ImageFilter.GaussianBlur(radius=8 * SCALE))
    bloom3 = logo_green.filter(ImageFilter.GaussianBlur(radius=16 * SCALE))

    # Add blooms to main image (lighter composite)
    img = ImageChops.add(img, bloom3, scale=3)
    img = ImageChops.add(img, bloom2, scale=4)
    img = ImageChops.add(img, bloom1, scale=3)

    # ── 4. Logo matrix chars layer (on top of glow) ──
    draw = ImageDraw.Draw(img)
    for row in range(rows):
        for col in range(cols):
            px = col * cw + cw // 2 - lx
            py = row * ch + ch // 2 - ly
            if not (0 <= px < logo_w and 0 <= py < logo_h):
                continue
            a = alpha.getpixel((px, py))
            if a < 40:
                continue
            n = a / 255.0
            c = random.choice(CHARS)
            x, y = col * cw, row * ch

            # Wave highlight across logo
            col_frac = px / logo_w
            wave = (math.sin(col_frac * math.pi * 5) + 1) / 2

            # Bright green with occasional white flash
            g = int(n * (180 + wave * 75))
            r = int(n * (20 + wave * 60))
            b_val = int(n * (5 + wave * 25))

            # Random bright flashes
            if random.random() < 0.08 * n:
                g = min(255, g + 80)
                r = min(255, r + 100)
                b_val = min(255, b_val + 80)

            draw.text((x, y), c,
                      fill=(min(255, r), min(255, g), min(255, b_val)),
                      font=mono)

    # ── 5. Subtitle ──
    sub_sz = int(24 * SCALE)
    sub_font = get_font(sub_sz)
    sub = "ASCII Dither System"
    bbox = draw.textbbox((0, 0), sub, font=sub_font)
    sw = bbox[2] - bbox[0]
    sx = W // 2 - sw // 2
    sy = ly + logo_h + int(30 * SCALE)

    # Dark backing rect so subtitle is always readable
    pad = int(12 * SCALE)
    draw.rectangle((sx - pad, sy - pad // 2, sx + sw + pad, sy + sub_sz + pad // 2),
                    fill=(0, 0, 0))

    # Glow
    for dx in range(-2, 3):
        for dy in range(-2, 3):
            d = math.sqrt(dx * dx + dy * dy)
            if d > 2.5:
                continue
            draw.text((sx + dx * SCALE, sy + dy * SCALE), sub,
                      fill=lerp(BG, (0, 50, 12), max(0, 1 - d / 2.5)),
                      font=sub_font)
    draw.text((sx, sy), sub, fill=(0, 255, 65), font=sub_font)

    # URL
    tag_font = get_font(int(12 * SCALE))
    tag = "alkemist.no"
    bbox2 = draw.textbbox((0, 0), tag, font=tag_font)
    tw = bbox2[2] - bbox2[0]
    draw.text((W // 2 - tw // 2, sy + sub_sz + int(14 * SCALE)), tag,
              fill=(0, 60, 16), font=tag_font)

    # ── 6. Scanlines ──
    px_data = img.load()
    for yy in range(0, H, max(2, 2 * SCALE)):
        for xx in range(W):
            r, g, b = px_data[xx, yy]
            px_data[xx, yy] = (max(0, r - 8), max(0, g - 8), max(0, b - 8))

    # ── 7. Final glow pass ──
    glow = img.copy().filter(ImageFilter.GaussianBlur(radius=3 * SCALE))
    img = Image.blend(img, glow, 0.08)

    # ── 8. Downscale ──
    img = img.resize((OUT_W, OUT_H), Image.LANCZOS)
    img.save("public/og-badge.png", "PNG", optimize=True)
    print(f"Generated public/og-badge.png ({OUT_W}x{OUT_H})")


if __name__ == "__main__":
    generate()
