"""Optimiza las fotos elegidas del SSD -> img/f/<slug>-{800,1600}.{webp,jpg} y escribe tools/fotos.json"""
import json, os, sys
from PIL import Image, ImageOps, ImageCms
Image.MAX_IMAGE_PIXELS = None
SRC = "/mnt/user-data/uploads/Cloude Juan Guzman Web"
REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

F = SRC + "/Fotos/"
FOTOS = {
 "musica": [("Urban Indie", "IMG_"+x) for x in "2450 2960 6055 2621 6095 6153 2991 6104 6070 6182 3042 6088 6191 2726 6206 6062 6224 6253 6011 6255-2".split()]
         + [("Ril Fella editado", x) for x in "CG1_0655 CG1_7029 CG1_0715 CG1_7062 CG1_0672 CG1_7350 IMG_6999 CG1_0595 CG1_7205 IMG_7044".split()],
 "deportes": [("Batalla de Tucuman 2025 MTB/Nueva edicion", "CG1_"+x) for x in "0013 0410 0278 0424 0943 0460 0633 1004 1008 9973 9889".split()]
         + [("San Javier XCO TUCUMANO/Fotos", "CG1_"+x) for x in "0058 9727 0036 0070 9887 9725 0055 9769 9665 9827".split()]
         + [("Tafi 2500", "CG1_"+x) for x in "1914 1955 1987 1948 1983".split()]
         + [("Defensores FC editadas", "CG1_"+x) for x in "9177 8764 9170 8777 9184 9004 9216 8877 9088 9492 9416 8911".split()],
 "gastronomia": [("Tete pizzeria", "CG1_"+x) for x in "8123 8231 8166 8209 8181 8306 8226 8356".split()]
         + [("Sangucheria", "CG1_"+x) for x in "9965 0010 9887 9930".split()],
 "moda": [("EG", x) for x in "CG1_0192 3_(1) CG1_0154 CG1_9905 CG1_0254".split()],
}
srgb = ImageCms.createProfile("sRGB")

def abrir(path):
    im = Image.open(path)
    im = ImageOps.exif_transpose(im)
    if im.mode == "CMYK":
        icc = im.info.get("icc_profile")
        if icc:
            import io
            im = ImageCms.profileToProfile(im, ImageCms.ImageCmsProfile(io.BytesIO(icc)), srgb, outputMode="RGB")
        else:
            im = im.convert("RGB")
    return im

def guardar(im, base, anchos=(800, 1600), fondo=None):
    if im.mode in ("RGBA", "LA", "P"):
        im = im.convert("RGBA")
        bg = Image.new("RGB", im.size, fondo or (26, 26, 26)); bg.paste(im, mask=im.split()[-1]); im = bg
    else:
        im = im.convert("RGB")
    out = []
    for w in anchos:
        r = im if im.width <= w else im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
        r.save(f"{base}-{w}.jpg", quality=80, optimize=True, progressive=True)
        r.save(f"{base}-{w}.webp", quality=78, method=6)
        out.append(r.size)
    return out[-1]

if __name__ == "__main__":
    data = {}
    for cat, items in FOTOS.items():
        data[cat] = []
        for i, (folder, name) in enumerate(items, 1):
            p = f"{F}{folder}/{name.replace('_(', ' (')}.jpg"
            slug = f"{cat}-{i:02d}"
            im = abrir(p)
            w, h = guardar(im, f"{REPO}/img/f/{slug}")
            data[cat].append([slug, w, h])
            print(slug, w, h, flush=True)
    json.dump(data, open(f"{REPO}/tools/fotos.json", "w"), indent=1)
