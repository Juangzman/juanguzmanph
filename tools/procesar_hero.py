"""Fotos de la portada (hero) en alta calidad -> img/h/<slug>-<ancho>.{webp,jpg} y tools/hero.json
Se generan a 960, 1600 y 2560 px (sin agrandar nunca la original) con calidad alta y un enfoque suave."""
import json, os
from PIL import Image, ImageFilter
from procesar import FOTOS, abrir, REPO

ANCHOS = (960, 1600, 2560)
os.makedirs(f"{REPO}/img/h", exist_ok=True)
data = []
for i, it in enumerate(FOTOS["inicio"], 1):
    if it[0] == "@cr2":
        _, cr2, prev = it
        giro = Image.open(cr2).getexif().get(274, 1)
        im = abrir(prev)
        im = im.transpose({3: Image.ROTATE_180, 6: Image.ROTATE_270, 8: Image.ROTATE_90}[giro]) if giro in (3, 6, 8) else im
    else:
        im = abrir(it[1])
    im = im.convert("RGB")
    slug = f"inicio-{i:02d}"
    hechos = []
    for w in ANCHOS:
        if hechos and im.width <= hechos[-1]:
            break
        ww = min(w, im.width)
        r = im if im.width == ww else im.resize((ww, round(im.height * ww / im.width)), Image.LANCZOS)
        if ww < im.width:  # recupera nitidez perdida al achicar
            r = r.filter(ImageFilter.UnsharpMask(radius=0.8, percent=60, threshold=2))
        r.save(f"{REPO}/img/h/{slug}-{w}.jpg", quality=88, optimize=True, progressive=False, subsampling=0)
        r.save(f"{REPO}/img/h/{slug}-{w}.webp", quality=86, method=6)
        hechos.append(ww)
    data.append([slug, im.width, im.height, [w for w, _ in zip(ANCHOS, hechos)], hechos])
    print(slug, im.size, hechos, flush=True)
json.dump(data, open(f"{REPO}/tools/hero.json", "w"), indent=1)
