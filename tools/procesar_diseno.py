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
 "vg-web-hero": (V+"Web/HERO.jpg", None),
 "vg-web-banner": (V+"Web/banner1.png", None),
 "vg-cartel": (V+"Grafica/Cartel calle-01.jpg", None),
 "vg-flyer-qr": (V+"Grafica/Mesa de trabajo 1.jpg", None),
 "vg-flyer-whatsapp": (V+"Grafica/Mesa de trabajo 2.jpg", None),
 "vg-flyer-costos": (V+"Grafica/flyersfrente.jpg", None),
 "fiat-argo": (SRC+"/Diseño/placas-Tucumán-ARGO.png", None),
 "fiat-cronos": (SRC+"/Diseño/placas-Tucumán-CRONOS.png", None),
 "fiat-strada": (SRC+"/Diseño/placas-Tucumán-STRADA.png", None),
 "fiat-titano": (SRC+"/Diseño/placas-Tucumán-TITANO.png", None),
}
data = {}
for slug, (p, fondo) in D.items():
    w, h = guardar(abrir(p), f"{REPO}/img/d/{slug}", fondo=fondo)
    data[slug] = [w, h]; print(slug, w, h, flush=True)
json.dump(data, open(f"{REPO}/tools/diseno.json", "w"), indent=1)
