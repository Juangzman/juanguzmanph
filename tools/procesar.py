"""Optimiza las fotos elegidas del SSD -> img/f/<slug>-{800,1600}.{webp,jpg} y escribe tools/fotos.json"""
import json, os, sys
from PIL import Image, ImageOps, ImageCms
Image.MAX_IMAGE_PIXELS = None
SRC = "/mnt/user-data/uploads/Cloude Juan Guzman Web"
REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

F = SRC + "/Fotos/"
X = "\uf028"  # algunas carpetas del SSD terminan con este caracter invisible
EV = "FOTO CONCIERTO Y EVENTOS/"
BK = "BOOK DE FOTOS/"
PG = "FOTO PRODUCTO GASTRONOMIA/"
PORTADA_CONCIERTOS = "/root/.claude/uploads/361b438a-296a-5d3a-b3a3-f972a291ff2d/08cd95b2-image.jpg"
FOTOS = {
 "conciertos": [("@", PORTADA_CONCIERTOS)]
         + [("Urban Indie", "IMG_"+x) for x in "2450 2960 6055 2621 6095 6153 2991 6104 6070 6182 3042 6088 6191 2726 6206 6062 6224 6253 6011 6255-2".split()]
         + [("Ril Fella editado", x) for x in "CG1_0655 CG1_7029 CG1_0715 CG1_7062 CG1_0672 CG1_7350 IMG_6999 CG1_0595 CG1_7205 IMG_7044".split()],
 "eventos": [(EV+"La sala inauguracion"+X, x) for x in "CG1_0396 IMG_0047 CG1_0233-2 IMG_0216 CG1_0358 IMG_0091-2 CG1_0437 IMG_0322-2 CG1_0501 IMG_0154 CG1_0517".split()]
         + [(EV+"Medusa"+X, "CG1_"+x) for x in "9465 9150 9881 9383 9519 9683 9584 9739 9827".split()],
 "deportes": [("Batalla de Tucuman 2025 MTB/Nueva edicion", "CG1_"+x) for x in "0013 0410 0278 0424 0943 0460 0633 1004 1008 9973 9889".split()]
         + [("San Javier XCO TUCUMANO/Fotos", "CG1_"+x) for x in "0058 9727 0036 0070 9887 9725 0055 9769 9665 9827".split()]
         + [("Tafi 2500", "CG1_"+x) for x in "1914 1955 1987 1948 1983".split()]
         + [("Defensores FC editadas", "CG1_"+x) for x in "9177 8764 9170 8777 9184 9004 9216 8877 9088 9492 9416 8911".split()],
 "gastronomia": [("Tete pizzeria", "CG1_"+x) for x in "8123 8231 8166 8209 8181 8306 8226 8356".split()]
         + [("Sangucheria", "CG1_"+x) for x in "9965 0010 9887 9930".split()]
         + [(PG+"Fotografia Gastronomia", "CG1_"+x) for x in "0125 0077 0186 0141 0046 0174 0560".split()],
 "producto": [(PG+"Vibra dulce", "_LEA"+x) for x in "2165 2181 2204 2189 2218 2184 2199 2230 2212 2234".split()],
 "moda": [("EG", x) for x in "CG1_0192 3_(1) CG1_0154 CG1_9905 CG1_0254".split()],
 "book": [(BK+"Belen y Emma", "CG1_"+x) for x in "4438 4376 4565 4433 4499 4388 4540 4399".split()],
 "retratos": [(BK+"Belen y Emma", "CG1_"+x) for x in "4574 4471 4578 4569 4362".split()],
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
            p = name if folder == "@" else f"{F}{folder}/{name.replace('_(', ' (')}.jpg"
            slug = f"{cat}-{i:02d}"
            im = abrir(p)
            w, h = guardar(im, f"{REPO}/img/f/{slug}")
            data[cat].append([slug, w, h])
            print(slug, w, h, flush=True)
    json.dump(data, open(f"{REPO}/tools/fotos.json", "w"), indent=1)
