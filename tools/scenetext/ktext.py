"""Kinetic flat text rendered to an RGBA bitmap per frame (Pillow), for comp.py.

Units (a glyph or a word) arrive with a short scale-down, a rise, blur and an accent colour on the
leading edge that settles to the base colour within ~0.25 s; units can also be deleted (backspace).
Flat 2D type only: no shadow, no extrusion, no glass (the look that was asked for in a 3D scene).
  KTEXT_FONT   path of the font file (default: a system sans)
  KTEXT_SCALE  multiply every size (wide faces need smaller sizes to fit the same canvas)

  t = Text(W, H, lines); rgba = t.frame(seconds)     # float32 (H, W, 4), RGB order, 0..1
lines: list of dict(text, size, y (baseline px), x ('center' | 'right' | px), track (em),
  units 'glyph'|'word', times [arrival second per unit], base (r,g,b), accent (r,g,b), dur (arrival s),
  grow (extra scale on arrival), rise (em), blur (px), hold, settle, delete [second per unit or None],
  accents [rgb per unit or None], streak (px horizontal smear on arrival))
fit_size(texts, width) = the largest size at which the widest line still fits.
"""
import os

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

_CANDIDATES = ["/System/Library/Fonts/Helvetica.ttc", "/System/Library/Fonts/SFNS.ttf", "/Library/Fonts/Arial.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"]
FONT = os.environ.get("KTEXT_FONT") or next((f for f in _CANDIDATES if os.path.exists(f)), None)
SCALE = float(os.environ.get("KTEXT_SCALE", "1"))
_fc = {}


def font(size):
    size = int(round(size))
    if size not in _fc:
        _fc[size] = ImageFont.truetype(FONT, size) if FONT else ImageFont.load_default()
    return _fc[size]


def fit_size(texts, width, track=0.0, start=400):
    s = start
    while s > 20:
        f = font(s)
        if max(f.getlength(x) + track * s * (len(x) - 1) for x in texts) <= width:
            return s
        s -= 2
    return s


def ease(p, k=4):
    p = min(max(p, 0.0), 1.0)
    return 1 - (1 - p) ** k


class Text:
    def __init__(self, W, H, lines):
        self.W, self.H, self.units = W, H, []
        for L in lines:
            L["size"] = L["size"] * SCALE
            f = font(L["size"])
            tr = L.get("track", 0) * L["size"]
            txt = L["text"]
            xs, x = [], 0.0
            for i, ch in enumerate(txt):
                xs.append(x)
                x += f.getlength(ch) + tr
                if i + 1 < len(txt):
                    x += f.getlength(txt[i:i + 2]) - f.getlength(ch) - f.getlength(txt[i + 1])     # kerning
            total = x - tr
            xa = L.get("x", "center")
            x0 = (W - total) / 2 if xa == "center" else (W - total - 20 if xa == "right" else xa)
            if L.get("units", "glyph") == "glyph":
                groups = [[i] for i, ch in enumerate(txt) if ch != " "]
            else:
                groups, cur = [], []
                for i, ch in enumerate(txt):
                    if ch == " ":
                        if cur:
                            groups.append(cur)
                            cur = []
                    else:
                        cur.append(i)
                if cur:
                    groups.append(cur)
            for k, gidx in enumerate(groups):
                gx0, gx1 = x0 + xs[gidx[0]], x0 + xs[gidx[-1]] + f.getlength(txt[gidx[-1]])
                self.units.append(dict(L=L, chars=[(txt[i], x0 + xs[i]) for i in gidx], cx=(gx0 + gx1) / 2, x1=gx1, t=L["times"][k],
                                       td=(L.get("delete") or [None] * len(groups))[k], acc=(L.get("accents") or [None] * len(groups))[k]))
            L["_end"] = x0 + total

    def frame(self, t):
        out = Image.new("RGBA", (self.W, self.H), (0, 0, 0, 0))
        for u in self.units:
            L = u["L"]
            if t < u["t"] or (u["td"] is not None and t >= u["td"]):
                continue
            p = (t - u["t"]) / L.get("dur", 0.22)
            e = ease(p)
            sc = 1 + L.get("grow", 0.3) * (1 - e)
            dy = L.get("rise", 0.2) * L["size"] * (1 - e)
            al = min(1.0, p * 3.0)
            base = np.array(L.get("base", (16, 16, 18)), float)
            acc = np.array(u["acc"] or L.get("accent", (0, 230, 122)), float)
            m = 0.0 if u["acc"] is not None else ease((t - u["t"] - L.get("hold", 0.07)) / L.get("settle", 0.22), 2)
            col = tuple(int(v) for v in acc + (base - acc) * m) + (int(255 * al),)
            lay = Image.new("RGBA", (self.W, self.H), (0, 0, 0, 0))
            d = ImageDraw.Draw(lay)
            f = font(L["size"] * sc)
            for ch, x in u["chars"]:
                d.text((u["cx"] + (x - u["cx"]) * sc, L["y"] + dy), ch, font=f, fill=col, anchor="ls")
            b = L.get("blur", 0) * (1 - e)
            st = L.get("streak", 0) * (1 - e) ** 2
            if st > 1:
                lay = lay.resize((max(1, int(self.W / (1 + st / 40))), self.H), Image.BILINEAR).filter(ImageFilter.BoxBlur(1)).resize((self.W, self.H), Image.BILINEAR)
                lay = lay.transform((self.W, self.H), Image.AFFINE, (1, 0, st, 0, 1, 0))
            if b > 0.4:
                lay = lay.filter(ImageFilter.GaussianBlur(b))
            out = Image.alpha_composite(out, lay)
        return np.asarray(out).astype(np.float32) / 255.0
