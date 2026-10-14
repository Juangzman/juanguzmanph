"""Capturas de webs y sistemas -> img/w/<slug>-<ancho>.{webp,jpg} y tools/web.json
Las capturas salen de tools/capturar_web.js (Playwright) y se guardan en CAPTURAS."""
import json, os
from PIL import Image
from procesar import REPO

CAPTURAS = os.environ.get("CAPTURAS", "/tmp/claude-0/vgc")
# slug: (archivo de captura, anchos[, alto en px para recortar])
W = {
    "vg-web-hero": ("d-hero.png", (800, 1600, 2400)),
    "vg-web-full": ("d-full.png", (900, 1440)),
    "vg-web-movil-full": ("m-full.png", (390, 520)),  # webp admite hasta 16383 px de alto
    "vg-web-movil-hero": ("m-hero.png", (600, 1170)),
    "vg-web-equipos": ("d-quick.png", (800, 1600)),
    "vg-web-servicios": ("d-services.png", (800, 1600)),
    "vg-web-consejos": ("d-tips.png", (800, 1600)),
    "vg-web-proceso": ("d-process.png", (800, 1600, 2400)),
    "vg-web-nosotros": ("d-about.png", (800, 1600)),
    "vg-web-turno": ("d-form.png", (800, 1600)),
    "vg-web-pie": ("d-footer.png", (800, 1600)),
    "sis-turnos": ("d-turnos.png", (800, 1600, 2400), 1530),  # alto: recorta el espacio vacio de abajo
    "sis-panel": ("d-panel.png", (800, 1600, 2400), 1160),
    "sis-turnos-movil": ("m-turnos.png", (390, 780)),
}
os.makedirs(f"{REPO}/img/w", exist_ok=True)
data = {}
for slug, (archivo, anchos, *alto) in W.items():
    im = Image.open(f"{CAPTURAS}/{archivo}").convert("RGB")
    if alto:
        im = im.crop((0, 0, im.width, min(alto[0], im.height)))
    reales = []
    for w in anchos:
        ww = min(w, im.width)
        r = im if ww == im.width else im.resize((ww, round(im.height * ww / im.width)), Image.LANCZOS)
        r.save(f"{REPO}/img/w/{slug}-{w}.webp", quality=82, method=6)
        r.save(f"{REPO}/img/w/{slug}-{w}.jpg", quality=84, optimize=True, progressive=True)
        reales.append(ww)
    data[slug] = [im.width, im.height, list(anchos), reales]
    print(slug, im.size, reales, flush=True)
json.dump(data, open(f"{REPO}/tools/web.json", "w"), indent=1)
