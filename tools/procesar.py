"""Optimiza las fotos elegidas del SSD -> img/f/<slug>-{800,1600}.{webp,jpg} y escribe tools/fotos.json"""
import json, os, sys
from PIL import Image, ImageOps, ImageCms
Image.MAX_IMAGE_PIXELS = None
# Carpeta del SSD con todo el material. En la Mac suele ser /Volumes/<nombre del SSD>/Cloude Juan Guzman Web
# Se puede cambiar sin tocar el código:  FOTOS_SSD="/Volumes/MiSSD/Cloude Juan Guzman Web" python3 tools/procesar.py
SRC = os.environ.get("FOTOS_SSD", "/mnt/user-data/uploads/Cloude Juan Guzman Web")
REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

F = SRC + "/Fotos/"
SUBIR = SRC + "/Fotos para subir/"
CARPETAS = {"inicio": "Fotos para el incio", "conciertos": "Conciertos", "eventos": "Eventos",
            "gastronomia": "Gastronomia", "moda": "Moda"}
RETRATOS = "CG1_4569 CG1_4572 CG1_4575 CG1_4578 CG1_4579".split()  # Emma

def carpeta(nombre, filtro=lambda n: True):
    out = []
    for f in sorted(os.listdir(SUBIR + nombre)):
        base, ext = os.path.splitext(f)
        if not filtro(base): continue
        if ext.lower() in (".jpg", ".jpeg", ".png", ".cr2"):
            out.append(("@", SUBIR + nombre + "/" + f))
    return out

FOTOS = {k: carpeta(v) for k, v in CARPETAS.items()}
FOTOS["deportes"] = ([("Batalla de Tucuman 2025 MTB/Nueva edicion", "CG1_"+x) for x in "0013 0410 0278 0424 0943 0460 0633 1004 1008 9973 9889".split()]
         + [("San Javier XCO TUCUMANO/Fotos", "CG1_"+x) for x in "0058 9727 0036 0070 9887 9725 0055 9769 9665 9827".split()]
         + [("Tafi 2500", "CG1_"+x) for x in "1914 1955 1987 1948 1983".split()]
         + [("Defensores FC editadas", "CG1_"+x) for x in "9177 8764 9170 8777 9184 9004 9216 8877 9088 9492 9416 8911".split()])
FOTOS["book"] = carpeta("Book", lambda n: n not in RETRATOS)
FOTOS["retratos"] = carpeta("Book", lambda n: n in RETRATOS)
srgb = ImageCms.createProfile("sRGB")

def vista_cr2(path):
    """Los RAW de Canon (.CR2) traen adentro una copia JPEG en tamaño completo.
    La buscamos (la más grande) y la giramos según la orientación guardada en el RAW."""
    import io
    datos = open(path, "rb").read()
    mejor, pos = None, datos.find(b"\xff\xd8\xff")
    while pos != -1:
        try:
            im = Image.open(io.BytesIO(datos[pos:])); im.load()
            if not mejor or im.width * im.height > mejor.width * mejor.height:
                mejor = im
        except Exception:
            pass
        pos = datos.find(b"\xff\xd8\xff", pos + 3)
    giro = Image.open(path).getexif().get(274, 1)
    giros = {3: Image.ROTATE_180, 6: Image.ROTATE_270, 8: Image.ROTATE_90}
    return mejor.transpose(giros[giro]) if giro in giros else mejor


def abrir(path):
    if path.lower().endswith(".cr2"):
        return vista_cr2(path).convert("RGB")
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
        for i, it in enumerate(items, 1):
            folder, name = it
            p = name if folder == "@" else f"{F}{folder}/{name.replace('_(', ' (')}.jpg"
            im = abrir(p)
            slug = f"{cat}-{i:02d}"
            w, h = guardar(im, f"{REPO}/img/f/{slug}")
            data[cat].append([slug, w, h])
            print(slug, w, h, flush=True)
    json.dump(data, open(f"{REPO}/tools/fotos.json", "w"), indent=1)
