"""Optimiza piezas de diseño -> img/d/<slug>-{800,1600}.{webp,jpg} y tools/diseno.json"""
import json, os
from procesar import abrir, guardar, REPO, SRC
V = SRC + "/Villguz Rebranding/"
D = {
 "vg-logo": (V+"Logos/Logos Villguz/logo.png", (12,30,70)),
 "vg-remera-espalda": (V+"Mockup/BackVillguz.png", (236,236,236)),
 "vg-remera-frente": (V+"Mockup/FrontVILLGUZ.png", (236,236,236)),
 "vg-botella": (V+"Mockup/Botella Villguz.png", (236,236,236)),
 "vg-gorra": (V+"Mockup/Gorravillguz.png", (236,236,236)),
 "vg-credencial": (V+"Mockup/Lanyard_ID_badge_mockup_1.png", None),
 "vg-llavero": (V+"Mockup/Llavero villguz.png", None),
 "vg-sello": (V+"Mockup/SelloVillguz.png", None),
 "vg-taza": (V+"Mockup/Tazavillguz.png", (236,236,236)),
 "vg-feed-inverter": (V+"Publicaciones Feed IG/Carrosuel inverter/Mesa de trabajo 1.jpg", None),
 "vg-feed-inverter-2": (V+"Publicaciones Feed IG/Carrosuel inverter/Mesa de trabajo 2.jpg", None),
 "vg-feed-aa": (V+"Publicaciones Feed IG/Carrusel AA/Mesa de trabajo 1.jpg", None),
 "vg-feed-heladera": (V+"Publicaciones Feed IG/Carrusel heladera/Mesa de trabajo 1.jpg", None),
 "vg-feed-lavarropas": (V+"Publicaciones Feed IG/Carrusel lavarropas/Mesa de trabajo 1.png", None),
 "vg-feed-oficial-1": (V+"Publicaciones Feed IG/publicaciones-ig1.png", None),
 "vg-feed-oficial-2": (V+"Publicaciones Feed IG/publicaciones-ig2.png", None),
 "vg-historia-trabajador": (V+"PublicacionesHISTORIASig/Diadeltrabajador.png", None),
 "vg-historia-corea": (V+"PublicacionesHISTORIASig/HistoriaCorea.png", None),
 "vg-historia-venta": (V+"PublicacionesHISTORIASig/lgt9010.png", None),
 "vg-cartel": (V+"Grafica/Cartel calle-01.jpg", None),
 "vg-flyer-qr": (V+"Grafica/Mesa de trabajo 1.jpg", None),
 "vg-flyer-whatsapp": (V+"Grafica/Mesa de trabajo 2.jpg", None),
 "vg-flyer-costos": (V+"Grafica/flyersfrente.jpg", None),
 "fiat-argo": (SRC+"/Diseño/placas-Tucumán-ARGO.png", None),
 "fiat-cronos": (SRC+"/Diseño/placas-Tucumán-CRONOS.png", None),
 "fiat-strada": (SRC+"/Diseño/placas-Tucumán-STRADA.png", None),
 "fiat-titano": (SRC+"/Diseño/placas-Tucumán-TITANO.png", None),
 # Logos
 "suna-logo": (SRC+"/Diseño/Logo/Mesa de trabajo 2.png", None),
 "suna-logo-negro": (SRC+"/Diseño/Logo/Mesa de trabajo 3.png", None),
 "suna-iso": (SRC+"/Diseño/Logo/Mesa de trabajo 5.png", None),
 "suna-iso-negro": (SRC+"/Diseño/Logo/Mesa de trabajo 6.png", None),
 "vg-logo-claro": (V+"Logos/Logos Villguz/Mesa de trabajo 1.png", (245,245,245)),
 "vg-logo-azul": (V+"Logos/Logos Villguz/Mesa de trabajo 8.png", (22,45,95)),
 "vg-iso-verde": (V+"Logos/Logos Villguz/Mesa de trabajo 7.png", (22,45,95)),
 "vg-iso-negro": (V+"Logos/Logos Villguz/Mesa de trabajo 4.png", (245,245,245)),
 "vibra-logo": (REPO+"/tools/fuentes/vibra-dulce-logo.png", (247, 217, 227)),
 "maggie-logo": (REPO+"/tools/fuentes/maggie-moon-logo.png", (244, 240, 250)),
 # Placas
 "vibra-placa-brownie": (REPO+"/tools/fuentes/vibra-placa-brownie.jpg", None),
 "vibra-placa-imperial": (REPO+"/tools/fuentes/vibra-placa-imperial.jpg", None),
 "vibra-placa-chaja": (REPO+"/tools/fuentes/vibra-placa-chaja.jpg", None),
 "vg-placa-venta": (V+"PublicacionesHISTORIASig/MARKETT9010.png", None),
 "vg-placa-hotsale": (V+"PublicacionesHISTORIASig/hotsaley9010.png", None),
}
RUTA = f"{REPO}/tools/diseno.json"
data = json.load(open(RUTA)) if os.path.exists(RUTA) else {}
for slug, (p, fondo) in D.items():
    if slug in data and os.path.exists(f"{REPO}/img/d/{slug}-800.jpg"): continue
    w, h = guardar(abrir(p), f"{REPO}/img/d/{slug}", fondo=fondo)
    data[slug] = [w, h]; print(slug, w, h, flush=True)
json.dump(data, open(f"{REPO}/tools/diseno.json", "w"), indent=1)
