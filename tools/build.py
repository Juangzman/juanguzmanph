#!/usr/bin/env python3
"""Genera las paginas del portfolio a partir de los datos de este archivo.

Uso:  python3 tools/build.py   (desde la carpeta del repo)

Para sumar fotos o proyectos, edita las listas de abajo y volve a correrlo.
"""
from pathlib import Path
import html

RAIZ = Path(__file__).resolve().parent.parent
import hashlib
def _ver(ruta):
    """Huella corta del archivo para que el navegador no use una version vieja en cache."""
    return hashlib.md5((RAIZ / ruta).read_bytes()).hexdigest()[:8]
CDN = "https://framerusercontent.com/images/"

EMAIL = "juanguzmanph@gmail.com"
WHATSAPP_URL = "https://wa.me/5493816152579"
WHATSAPP_TXT = "+54 381 615-2579"
INSTAGRAM_URL = "https://www.instagram.com/juanchigzmn/"
INSTAGRAM_TXT = "@juanchigzmn"
LINKEDIN_URL = "https://www.linkedin.com/in/juan-alfredo-guzman-56434258/"
SITIO = "https://www.juanguzmanph.com"

e = html.escape

# ----------------------------------------------------------------------------
# Imagenes
# ----------------------------------------------------------------------------
def remota(f, w, h, alt, sizes="100vw", lazy=True, cls=""):
    """Imagen servida desde el CDN de Framer con tamanos responsive."""
    pasos = [s for s in (512, 1024, 2048) if s < max(w, h)] or [max(w, h)]
    srcset = ", ".join(f"{CDN}{f}?scale-down-to={s} {round(w * min(1, s / max(w, h)))}w" for s in pasos)
    src = f"{CDN}{f}?scale-down-to={pasos[min(1, len(pasos) - 1)]}"
    carga = 'loading="lazy" ' if lazy else 'fetchpriority="high" '
    c = f' class="{cls}"' if cls else ""
    return (f'<img{c} src="{src}" srcset="{srcset}" sizes="{sizes}" width="{w}" height="{h}" '
            f'{carga}decoding="async" alt="{e(alt)}">')


def local(nombre, w, h, alt, sizes="100vw", lazy=True, cls="", webp=True):
    """Imagen guardada en /img con versiones 800 y 1600 en webp y jpg (webp=False: solo jpg)."""
    carga = 'loading="lazy" ' if lazy else 'fetchpriority="high" '
    c = f' class="{cls}"' if cls else ""
    fuente = f'<source type="image/webp" srcset="/img/{nombre}-800.webp 800w, /img/{nombre}-1600.webp 1600w" sizes="{sizes}">' if webp else ""
    return (f'<picture{c}>{fuente}'
            f'<img src="/img/{nombre}-1600.jpg" srcset="/img/{nombre}-800.jpg 800w, /img/{nombre}-1600.jpg 1600w" sizes="{sizes}" '
            f'width="{w}" height="{h}" {carga}decoding="async" alt="{e(alt)}"></picture>')


def full(f, w, h):
    return f"{CDN}{f}?scale-down-to={2048 if max(w, h) > 2048 else max(w, h)}"


# ----------------------------------------------------------------------------
# Datos: fotografia
# La galeria sale de data/galeria.json, que se edita desde el Estudio (pagina privada)
# o se arma de cero con tools/galeria_desde_fotos.py.
# ----------------------------------------------------------------------------
import json
_FOTOS = json.loads((RAIZ / "tools" / "fotos.json").read_text())
_DIS = json.loads((RAIZ / "tools" / "diseno.json").read_text())
_GAL = json.loads((RAIZ / "data" / "galeria.json").read_text())["categorias"]
NOMBRES = {c["id"]: c["nombre"] for c in _GAL}
CATEGORIAS = [(c["id"], c["nombre"], [(f["slug"], f["w"], f["h"]) for f in c["fotos"]]) for c in _GAL]
DIM = {s: (w, h) for k in _FOTOS for s, w, h in _FOTOS[k]}
DIM.update({f["slug"]: (f["w"], f["h"]) for c in _GAL for f in c["fotos"]})
SIN_WEBP = {f["slug"] for c in _GAL for f in c["fotos"] if f.get("webp") is False}


def foto(slug, alt, sizes="100vw", lazy=True, cls=""):
    """Foto propia optimizada en /img/f (800 y 1600 px, webp + jpg)."""
    w, h = DIM[slug]
    return local("f/" + slug, w, h, alt, sizes, lazy, cls, webp=slug not in SIN_WEBP)


def pieza(slug, alt, sizes="100vw", lazy=True):
    """Pieza de diseño optimizada en /img/d."""
    w, h = _DIS[slug]
    return local("d/" + slug, w, h, alt, sizes, lazy)


# Capturas de webs y sistemas (tools/procesar_web.py -> img/w)
_WEB = json.loads((RAIZ / "tools" / "web.json").read_text())


def captura(slug, alt, sizes="100vw", lazy=True, cls=""):
    """Captura de una web o sistema guardada en /img/w."""
    w, h, nombres, reales = _WEB[slug]
    src = lambda ext: ", ".join(f"/img/w/{slug}-{n}.{ext} {r}w" for n, r in zip(nombres, reales))
    carga = 'loading="lazy" ' if lazy else 'fetchpriority="high" '
    c = f' class="{cls}"' if cls else ""
    medio = nombres[min(1, len(nombres) - 1)]
    return (f'<picture{c}><source type="image/webp" srcset="{src("webp")}" sizes="{sizes}">'
            f'<img src="/img/w/{slug}-{medio}.jpg" srcset="{src("jpg")}" sizes="{sizes}" width="{w}" height="{h}" '
            f'{carga}decoding="async" alt="{e(alt)}"></picture>')


def navegador(slug, alt, url="villguzrefrigeracion.com", desliza=True, cls="", sizes="(min-width: 900px) 70vw, 100vw", lazy=True):
    """Ventana de navegador con la captura adentro. Con desliza=True la pagina completa se recorre sola."""
    d = " data-desliza" if desliza else ""
    return (f'<figure class="navegador{" " + cls if cls else ""}" data-r><div class="navegador__barra" aria-hidden="true"><i></i><i></i><i></i>'
            f'<span class="navegador__url"><i class="ph-light ph-lock-simple"></i>{url}</span></div>'
            f'<div class="navegador__pantalla{"" if desliza else " fija"} img-carga"{d}>{captura(slug, alt, sizes, lazy)}</div></figure>')


def telefono(slug, alt, desliza=True, cls=""):
    """Celular con la captura adentro."""
    d = " data-desliza" if desliza else ""
    return (f'<figure class="telefono{" " + cls if cls else ""}" data-r><div class="telefono__pantalla{"" if desliza else " fija"} img-carga"{d}>'
            f'{captura(slug, alt, "300px")}</div></figure>')


PORTADAS = {c["id"]: c.get("portada") or (c["fotos"][0]["slug"] if c["fotos"] else None) for c in _GAL}
ORDEN_INICIO = list(NOMBRES)

# Hero: fotos de la carpeta "Fotos para el incio", en el orden en que se muestran
# (slug, categoria, descripcion)
HERO = [
    ("inicio-13", "Conciertos", "Público con las manos en alto frente al escenario, en blanco y negro"),
    ("inicio-04", "Deportes", "Ciclista de mountain bike levantando polvo en una curva"),
    ("inicio-01", "Moda", "Pareja de novios frente a un castillo"),
    ("inicio-12", "Conciertos", "Cantante con el público en un recital"),
    ("inicio-09", "Eventos", "DJ con luces azules en Medusa"),
    ("inicio-07", "Gastronomía", "Manos espolvoreando harina sobre un bollo de masa"),
    ("inicio-02", "Deportes", "Ciclista bajando entre raíces en el monte"),
    ("inicio-03", "Moda", "Producción de trajes de baño en grupo"),
    ("inicio-14", "Conciertos", "Escenario iluminado frente a una multitud"),
    ("inicio-05", "Eventos", "Consola de sonido en primer plano durante un show"),
    ("inicio-10", "Deportes", "Ciclista de mountain bike en un descenso"),
    ("inicio-06", "Conciertos", "Músico sentado bajo un foco en el escenario"),
    ("inicio-11", "Deportes", "Ciclista en un sendero de tierra"),
    ("inicio-08", "Deportes", "Ciclista bajando un sendero entre árboles"),
]

# ----------------------------------------------------------------------------
# Piezas comunes
# ----------------------------------------------------------------------------
ISO = (RAIZ / "img" / "isotipo.svg").read_text().replace("#333333", "currentColor").replace(
    '<svg ', '<svg aria-hidden="true" focusable="false" ')

NAV = [("Fotografía", "/fotografia.html", "fotografia"), ("Diseño", "/diseno.html", "diseno"),
       ("Servicios", "/#servicios", "servicios"), ("Sobre mí", "/#sobre", "sobre")]


def flecha(clase="ph-arrow-right"):
    return f'<i class="ph-light {clase}" aria-hidden="true"></i>'


def cabeza(titulo, descripcion, ruta, imagen_og=None, extra=""):
    og = imagen_og or f"{SITIO}/img/f/conciertos-01-1600.jpg"
    return f"""<!doctype html>
<html lang="es-AR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{e(titulo)}</title>
<meta name="description" content="{e(descripcion)}">
<link rel="canonical" href="{SITIO}{ruta}">
<meta name="theme-color" content="#1a1a1a">
<meta name="color-scheme" content="dark">
<meta property="og:type" content="website">
<meta property="og:locale" content="es_AR">
<meta property="og:title" content="{e(titulo)}">
<meta property="og:description" content="{e(descripcion)}">
<meta property="og:url" content="{SITIO}{ruta}">
<meta property="og:image" content="{og}">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/img/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="preconnect" href="https://framerusercontent.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Geist:wght@300..600&display=swap">
<link rel="stylesheet" href="https://unpkg.com/@phosphor-icons/web@2.1.1/src/light/style.css">
<link rel="stylesheet" href="/css/styles.css?v={_ver('css/styles.css')}">
<script defer src="/js/main.js?v={_ver('js/main.js')}"></script>
{extra}</head>
<body>
<a class="sr-only" href="#contenido">Saltar al contenido</a>
"""


def navegacion(actual):
    links = "".join(
        f'<a href="{u}"{" aria-current=\"page\"" if k == actual else ""}>{t}</a>' for t, u, k in NAV)
    menu = "".join(
        f'<li><a href="{u}" style="--i:{i}"{" aria-current=\"page\"" if k == actual else ""}>{t}</a></li>'
        for i, (t, u, k) in enumerate(NAV + [("Contacto", "#contacto", "contacto")]))
    return f"""<header class="nav">
  <div class="wrap nav__in">
    <a class="marca" href="/" aria-label="Juan Guzman, inicio">{ISO}<span>Juan Guzman</span></a>
    <nav class="nav__links" aria-label="Principal">{links}</nav>
    <a class="btn btn--primario nav__cta" href="#contacto">Escribime</a>
    <button class="menu-btn" type="button" aria-expanded="false" aria-controls="menu">Menú <span class="menu-btn__icono" aria-hidden="true"></span></button>
  </div>
</header>
<div data-centinela aria-hidden="true" style="position:absolute;top:0;height:8px;width:1px"></div>
<div class="menu" id="menu">
  <nav aria-label="Menú"><ul>{menu}</ul></nav>
  <div class="menu__pie">
    <a href="mailto:{EMAIL}">{EMAIL}</a>
    <a href="{WHATSAPP_URL}" target="_blank" rel="noopener">WhatsApp {WHATSAPP_TXT}</a>
  </div>
</div>
"""


def contacto():
    asunto = "Consulta%20desde%20juanguzmanph.com"
    return f"""<section class="contacto" id="contacto" aria-labelledby="t-contacto">
  <div class="wrap">
    <h2 id="t-contacto" data-r>¿Tenés un<br>proyecto?</h2>
    <p class="lead" data-r style="--d:1">Contame qué necesitás y armamos una propuesta a la medida de tu marca.</p>
    <div class="contacto__acciones" data-r style="--d:2">
      <a class="btn btn--claro" href="mailto:{EMAIL}?subject={asunto}">Escribime {flecha()}</a>
      <a class="btn btn--linea-clara" href="{WHATSAPP_URL}" target="_blank" rel="noopener"><i class="ph-light ph-whatsapp-logo" aria-hidden="true"></i> WhatsApp</a>
    </div>
    <div class="contacto__iso" aria-hidden="true">{ISO}</div>
    <ul class="canales">
      <li><a href="mailto:{EMAIL}"><span>Email</span><span>{EMAIL} {flecha("ph-arrow-up-right")}</span></a></li>
      <li><a href="{WHATSAPP_URL}" target="_blank" rel="noopener"><span>WhatsApp</span><span>{WHATSAPP_TXT} {flecha("ph-arrow-up-right")}</span></a></li>
      <li><a href="{INSTAGRAM_URL}" target="_blank" rel="noopener"><span>Instagram</span><span>{INSTAGRAM_TXT} {flecha("ph-arrow-up-right")}</span></a></li>
      <li><a href="{LINKEDIN_URL}" target="_blank" rel="noopener"><span>LinkedIn</span><span>Juan Alfredo Guzman {flecha("ph-arrow-up-right")}</span></a></li>
    </ul>
    <footer class="pie">
      <a class="marca" href="/" aria-label="Juan Guzman, inicio">{ISO}<span>Juan Guzman</span></a>
      <span>Fotografía y diseño · San Miguel de Tucumán</span>
      <span>© <span data-anio>2026</span> Juan Guzman</span>
    </footer>
  </div>
</section>
"""


def cierre(visor=False):
    v = ""
    if visor:
        v = f"""<dialog class="visor" id="visor" aria-label="Visor de fotos">
  <div class="visor__barra"><span class="etiqueta" data-categoria></span><span data-contador></span>
    <button class="icono" type="button" data-cerrar aria-label="Cerrar"><i class="ph-light ph-x" aria-hidden="true"></i></button></div>
  <div class="visor__escena"><img alt=""></div>
  <div class="visor__nav">
    <button class="icono" type="button" data-prev aria-label="Foto anterior">{flecha("ph-arrow-left")}</button>
    <button class="icono" type="button" data-next aria-label="Foto siguiente">{flecha()}</button>
  </div>
</dialog>
"""
    return f"{v}</body>\n</html>\n"


# ----------------------------------------------------------------------------
# Inicio
# ----------------------------------------------------------------------------
# Areas de diseño: (id, titulo, bajada, imagen, alt). La imagen puede ser
# ("f", slug) foto, ("d", slug) pieza, ("v", ruta) poster de video o ("r", archivo, w, h) remota.
AREAS = [
    ("web", "Diseño web", "Sitios que trabajan", ("w", "vg-web-hero"), "Portada de la web de Villguz Refrigeración"),
    ("sistemas", "Sistemas internos", "Turnos y liquidaciones", ("w", "sis-turnos"), "Sistema de turnos de Villguz"),
    ("rebranding", "Rebranding", "Identidad completa", ("d", "vg-remera-espalda"), "Remera de trabajo con la nueva marca de Villguz"),
    ("logos", "Logos", "Marcas e isotipos", ("d", "suna-logo"), "Logotipo de Suna, jabones naturales"),
    ("placas", "Placas", "Piezas para vender", ("d", "fiat-strada"), "Placa de financiación de Fiat Strada"),
    ("redes", "Redes", "Carruseles e historias", ("d", "vg-feed-aa"), "Carrusel de consejos para el aire acondicionado"),
    ("motion", "Motion", "Videos en After Effects", ("v", "/video/yaris.jpg"), "Cuadro del video de lanzamiento del Yaris Cross"),
]

SERVICIOS = [
    ("ph-camera", "Fotografía", "Conciertos, eventos, deportes, gastronomía, producto, moda, book y retratos, con dirección de arte en cada sesión."),
    ("ph-browser", "Diseño y desarrollo web", "Webs únicas, pensadas para el celular, que transmiten confianza y te traen consultas. También sistemas a medida para ordenar turnos, clientes y pagos."),
    ("ph-pen-nib", "Identidad visual", "Logotipo, manual de marca y sistema gráfico para que tu marca se vea igual en todos lados."),
    ("ph-instagram-logo", "Redes y <span class=\"nw\">e-commerce</span>", "Carruseles, historias y campañas que acompañan tus ventas."),
    ("ph-film-slate", "Filmmaker", "Reels y videos cortos con la misma mirada que mi fotografía."),
]

FORMACION = [
    ("Lic. en Diseño Digital", "Universidad del Este, en curso"),
    ("Marketing Digital y E-commerce", "EAE Madrid, 2019"),
    ("Fotografía Social y Fotoperiodismo", "UBA, 2020"),
    ("Diseño Web HTML y CSS", "Coderhouse, 2022"),
]
HERRAMIENTAS = ["Figma", "Photoshop", "Illustrator", "Lightroom", "After Effects", "CapCut", "Canva", "Notion"]


def img_trabajo(ref, alt, sizes):
    tipo = ref[0]
    if tipo == "f": return foto(ref[1], alt, sizes)
    if tipo == "d": return pieza(ref[1], alt, sizes)
    if tipo == "r": return remota(ref[1], ref[2], ref[3], alt, sizes, cls="arriba")
    if tipo == "w": return captura(ref[1], alt, sizes, cls="arriba")
    return f'<img src="{ref[1]}" width="720" height="1280" loading="lazy" decoding="async" alt="{e(alt)}">'


HERO_DIM = {sl: (w, h, nombres, reales) for sl, w, h, nombres, reales in json.loads((RAIZ / "tools" / "hero.json").read_text())}


# Portada en pantallas anchas: las horizontales solas y las verticales agrupadas de a 2 o 3
# (categoria, [(slug, foco)], descripcion)
HERO_ESCRITORIO = [
    ("Conciertos", [("inicio-13", "55% 45%")], "Público con las manos en alto frente al escenario, en blanco y negro"),
    ("Deportes", [("inicio-04", "50% 35%"), ("inicio-02", "50% 40%"), ("inicio-10", "50% 40%")], "Tres ciclistas de mountain bike en carrera"),
    ("Moda", [("inicio-01", "30% 60%")], "Pareja de novios frente a un castillo"),
    ("Conciertos", [("inicio-14", "50% 40%"), ("inicio-12", "75% 35%"), ("inicio-06", "50% 50%")], "Escenario, cantante y músico en vivo"),
    ("Eventos", [("inicio-09", "50% 50%")], "DJ con luces azules en Medusa"),
    ("Deportes", [("inicio-11", "50% 40%"), ("deportes-12", "50% 30%"), ("inicio-08", "50% 40%")], "Ciclistas bajando senderos de tierra"),
    ("Gastronomía", [("inicio-07", "62% 55%")], "Manos espolvoreando harina sobre un bollo de masa"),
    ("Eventos", [("eventos-17", "50% 40%"), ("inicio-05", "50% 50%"), ("eventos-23", "50% 35%")], "DJ, consola de sonido y público en una fiesta"),
    ("Moda", [("inicio-03", "50% 40%")], "Producción de trajes de baño en grupo"),
]


def _hero_img(slug, alt, sizes, carga, foco=None):
    st = f' style="object-position:{foco}"' if foco else ""
    if slug in HERO_DIM:
        w, h, nombres, reales = HERO_DIM[slug]
        src = lambda ext: ", ".join(f"/img/h/{slug}-{n}.{ext} {r}w" for n, r in zip(nombres, reales))
        return (f'<picture><source type="image/webp" srcset="{src("webp")}" sizes="{sizes}">'
                f'<img src="/img/h/{slug}-1600.jpg" srcset="{src("jpg")}" sizes="{sizes}" width="{w}" height="{h}" {carga} decoding="async" alt="{e(alt)}"{st}></picture>')
    w, h = DIM[slug]
    return (f'<picture><source type="image/webp" srcset="/img/f/{slug}-800.webp 800w, /img/f/{slug}-1600.webp 1600w" sizes="{sizes}">'
            f'<img src="/img/f/{slug}-1600.jpg" srcset="/img/f/{slug}-800.jpg 800w, /img/f/{slug}-1600.jpg 1600w" sizes="{sizes}" width="{w}" height="{h}" {carga} decoding="async" alt="{e(alt)}"{st}></picture>')


def hero():
    movil = ""
    for i, (slug, cat, alt, *foco) in enumerate(HERO):
        carga = 'fetchpriority="high"' if i == 0 else 'loading="lazy"'
        f = f' style="--foco:{foco[0]}"' if foco else ""
        movil += f"""    <div class="diapo{' activa' if i == 0 else ''}" data-cat="{cat}"{f}>{_hero_img(slug, alt, "100vw", carga)}</div>\n"""
    ancho = ""
    for i, (cat, fotos, alt) in enumerate(HERO_ESCRITORIO):
        carga = 'fetchpriority="high"' if i == 0 else 'loading="lazy"'
        n = len(fotos)
        cols = "".join(f'<div class="diapo__col">{_hero_img(sl, alt if j == 0 else "", "100vw" if n == 1 else f"{100 // n}vw", carga, fo)}</div>'
                       for j, (sl, fo) in enumerate(fotos))
        ancho += f"""    <div class="diapo diapo--x{n}{' activa' if i == 0 else ''}" data-cat="{cat}">{cols}</div>\n"""
    slides = f"""  <div class="hero__set hero__set--movil" data-hero-set>\n{movil}  </div>
  <div class="hero__set hero__set--ancho" data-hero-set>\n{ancho}  </div>
"""
    return f"""<section class="hero" aria-labelledby="t-hero">
  <div class="hero__fotos" data-hero>
{slides}  </div>
  <div class="hero__velo" aria-hidden="true"></div>
  <div class="wrap hero__pie">
    <div class="hero__texto">
      <p class="etiqueta hero__kicker" data-r>Fotografía y diseño · Tucumán, Argentina</p>
      <h1 id="t-hero" class="lineas"><span><span style="--i:0">Juan</span></span><span><span style="--i:1">Guzman</span></span></h1>
    </div>
    <div class="hero__estado" data-r style="--d:3">
      <span class="hero__cat" data-hero-cat aria-hidden="true">{HERO[0][1]}</span>
      <button class="hero__flecha" type="button" data-hero-prev aria-label="Foto anterior">{flecha("ph-arrow-left")}</button>
      <span class="hero__num" aria-live="polite"><span data-hero-num>01</span> / <span data-hero-total>{len(HERO):02d}</span></span>
      <button class="hero__flecha" type="button" data-hero-next aria-label="Foto siguiente">{flecha()}</button>
      <span class="hero__barra" aria-hidden="true"><span data-hero-barra></span></span>
    </div>
  </div>
</section>
"""


def pagina_inicio():
    filas = ""
    for i, (k, titulo, bajada, ref, alt) in enumerate(AREAS):
        filas += f"""<li data-r style="--d:{i % 3}"><a class="fila" href="/diseno.html#{k}">
      <span class="fila__n">{i + 1:02d}</span>
      <div class="fila__img img-carga">{img_trabajo(ref, alt, "(min-width: 900px) 300px, 100vw")}</div>
      <div class="fila__cuerpo"><span class="fila__titulo">{titulo}</span><span class="fila__meta"><span>Diseño</span><span>{bajada}</span></span></div>
    </a></li>
"""
    conteo = {k: len(f) for k, _, f in CATEGORIAS}
    cats = ""
    for i, k in enumerate([k for k in ORDEN_INICIO if PORTADAS.get(k)]):
        cats += f"""<a class="cat" href="/fotografia.html#{k}" data-r style="--d:{i}">
      <div class="cat__img img-carga">{foto(PORTADAS[k], f"Fotografía de {NOMBRES[k].lower()}", "(min-width: 1100px) 25vw, 72vw")}</div>
      <div class="cat__pie"><h3>{NOMBRES[k]}</h3><span class="meta">{conteo[k]:02d}</span></div>
    </a>
"""
    servicios = "".join(
        f'<li class="servicio" data-r style="--d:{i % 2}"><i class="ph-light {ic}" aria-hidden="true"></i><h3>{t}</h3><p>{d}</p></li>\n'
        for i, (ic, t, d) in enumerate(SERVICIOS))
    formacion = "".join(f"<li>{t}<span>{d}</span></li>" for t, d in FORMACION)
    herramientas = "".join(f"<li>{h}</li>" for h in HERRAMIENTAS)

    cuerpo = f"""{navegacion("")}
<main id="contenido">
{hero()}
<section class="intro" aria-label="Presentación">
  <div class="wrap intro__in">
    <span class="intro__iso" data-r aria-hidden="true">{ISO}</span>
    <p class="intro__frase" data-r>Ayudo a marcas, negocios y personas a profesionalizar su imagen, <em>del lente al píxel.</em></p>
    <div class="intro__acciones" data-r style="--d:1">
      <a class="btn btn--primario" href="#fotografia">Fotografía {flecha()}</a>
      <a class="btn btn--secundario" href="#diseno">Diseño {flecha()}</a>
    </div>
  </div>
</section>

<section class="seccion" id="fotografia" aria-labelledby="t-foto">
  <div class="wrap">
    <div class="seccion__cab">
      <div style="display:grid;gap:20px">
        <span class="etiqueta" data-r>01 — Fotografía</span>
        <h2 id="t-foto" data-r>Fotografía</h2>
        <p class="lead" data-r style="--d:1">Conciertos, eventos, deportes, gastronomía, moda, book y retratos. Elegí una categoría.</p>
      </div>
      <a class="link" href="/fotografia.html" data-r style="--d:2">Ver toda la galería {flecha()}</a>
    </div>
    <div class="riel">
{cats}    </div>
  </div>
</section>

<div class="banda paralaje" aria-hidden="true">{foto("deportes-13", "", "100vw")}</div>

<section class="seccion" id="diseno" aria-labelledby="t-diseno">
  <div class="wrap">
    <div class="seccion__cab">
      <div style="display:grid;gap:20px">
        <span class="etiqueta" data-r>02 — Diseño</span>
        <h2 id="t-diseno" data-r>Diseño</h2>
        <p class="lead" data-r style="--d:1">Webs, sistemas, identidad, piezas y motion. Cada área con ejemplos reales.</p>
      </div>
      <a class="link" href="/diseno.html" data-r style="--d:2">Ver todo el diseño {flecha()}</a>
    </div>
    <div class="destacado">
      <div class="destacado__texto" data-r>
        <span class="etiqueta">Proyecto destacado · Diseño web</span>
        <h3>Web Villguz</h3>
        <span class="meta">villguzrefrigeracion.com</span>
        <p class="texto">Una web pensada para que el cliente confíe y pida turno en un minuto, con sistemas propios para ordenar el trabajo del equipo.</p>
        <div class="acciones">
          <a class="btn btn--primario" href="/proyectos/villguz-web.html">Ver el caso {flecha()}</a>
          <a class="btn btn--secundario" href="{VG_URL}" target="_blank" rel="noopener">En vivo {flecha("ph-arrow-up-right")}</a>
        </div>
      </div>
      {navegador("vg-web-full", "Página completa de la web de Villguz Refrigeración", sizes="(min-width: 900px) 60vw, 100vw")}
    </div>
    <ul class="indice">
{filas}    </ul>
  </div>
</section>

<section class="seccion" id="servicios" aria-labelledby="t-serv" style="padding-top:0">
  <div class="wrap servicios">
    <div class="servicios__cab">
      <span class="etiqueta" data-r>03 — Servicios</span>
      <h2 id="t-serv" data-r>Lo que hago</h2>
      <p class="lead" data-r style="--d:1">Un solo aliado para la imagen de tu marca: la foto, el diseño y la experiencia digital.</p>
    </div>
    <ul class="servicios__lista">
{servicios}    </ul>
  </div>
</section>

<section class="seccion" id="sobre" aria-labelledby="t-sobre" style="padding-top:0">
  <div class="wrap sobre">
    <div class="sobre__foto img-carga" data-r>{remota("mS6satP1zghi9fVVNLxIgfro8.jpg", 3195, 4792, "Retrato de Juan Guzman", "(min-width: 900px) 40vw, 100vw")}</div>
    <div class="sobre__texto">
      <span class="etiqueta" data-r>04 — Sobre mí</span>
      <h2 id="t-sobre" data-r>Sobre mí</h2>
      <p class="texto" data-r style="--d:1">Soy Juan Alfredo Guzman, fotógrafo y diseñador digital en San Miguel de Tucumán. Trabajo de forma remota con marcas, negocios y personas.</p>
      <p class="texto" data-r style="--d:2">Mi formación en marketing digital y e-commerce me lleva a pensar cada imagen en función de un resultado. Soy fotógrafo y filmmaker, y esa mirada guía mi dirección de arte.</p>
      <div class="datos" data-r style="--d:3">
        <div><h4>Formación</h4><ul>{formacion}</ul></div>
        <div><h4>Herramientas</h4><ul class="herramientas">{herramientas}</ul></div>
      </div>
    </div>
  </div>
</section>
</main>
{contacto()}"""
    return (cabeza("Juan Guzman · Fotografía y diseño",
                   "Fotógrafo y diseñador digital en Tucumán. Fotografía de conciertos, eventos, deportes, gastronomía, producto, moda, book y retratos, identidad visual, UX/UI y contenido para redes.",
                   "/") + cuerpo + cierre())


# ----------------------------------------------------------------------------
# Galeria de fotografia
# ----------------------------------------------------------------------------
def pagina_fotografia():
    # intercala categorias para que "Todo" se vea variado
    colas = [[(k, n, f) for f in fotos] for k, n, fotos in CATEGORIAS]
    orden = []
    while any(colas):
        for c in colas:
            if c:
                orden.append(c.pop(0))
    figs = ""
    cuenta = {}
    for i, (k, n, (slug, w, h)) in enumerate(orden):
        cuenta[k] = cuenta.get(k, 0) + 1
        alt = f"Fotografía de {n.lower()} {cuenta[k]}"
        sizes = "(min-width: 1200px) 25vw, (min-width: 700px) 33vw, 50vw"
        img = foto(slug, alt, sizes, lazy=i > 5)
        figs += f'<figure data-cat="{k}" data-nombre="{n}" data-full="/img/f/{slug}-1600.{'jpg' if slug in SIN_WEBP else 'webp'}"><button type="button" class="img-carga" aria-label="Ampliar {e(alt)}">{img}</button></figure>\n'
    total = len(orden)
    chips = f'<button class="chip" type="button" data-filtro="todo" aria-pressed="true">Todo<sup>{total}</sup></button>'
    chips += "".join(f'<button class="chip" type="button" data-filtro="{k}" aria-pressed="false">{n}<sup>{len(f)}</sup></button>'
                     for k, n, f in CATEGORIAS)
    cuerpo = f"""{navegacion("fotografia")}
<main id="contenido">
<div class="wrap pag-cab">
  <h1 class="lineas" style="font-size:clamp(64px,15vw,184px)"><span><span style="--i:0">Fotografía</span></span></h1>
  <p class="lead" data-r style="--d:2">Conciertos, eventos, deportes, gastronomía, moda, book y retratos. Tocá cualquier foto para verla en grande.</p>
</div>
<div class="filtros"><div class="wrap filtros__in" role="toolbar" aria-label="Filtrar por categoría">{chips}</div></div>
<div class="wrap"><div class="galeria">
{figs}</div></div>
</main>
{contacto()}"""
    return (cabeza("Fotografía · Juan Guzman",
                   "Galería de fotografía de Juan Guzman: conciertos, eventos, deportes, gastronomía, moda, book y retratos en Tucumán.",
                   "/fotografia.html") + cuerpo + cierre(visor=True))


# ----------------------------------------------------------------------------
# Proyectos de diseno
# ----------------------------------------------------------------------------
def fig(slug, alt, cls, ratio=None, sizes="(min-width: 900px) 33vw, 50vw", claro=False):
    st = f' style="aspect-ratio:{ratio}"' if ratio else ""
    c = " claro" if claro else ""
    return f'<figure class="{cls}{c} img-carga" data-r{st}>{pieza(slug, alt, sizes)}</figure>'


def video(src, poster, cls, etiqueta, pie=""):
    p = f'<figcaption>{pie}</figcaption>' if pie else ""
    return (f'<figure class="{cls}" data-r style="aspect-ratio:9/16">{p}<video data-auto muted loop playsinline preload="none" '
            f'poster="{poster}" src="{src}" aria-label="{e(etiqueta)}"></video></figure>')


def ficha(items):
    return '<dl class="ficha" data-r style="--d:2">' + "".join(f"<div><dt>{a}</dt><dd>{b}</dd></div>" for a, b in items) + "</dl>"


def bloque(titulo, *parrafos, puntos=None):
    ps = "".join(f'<p class="texto">{p}</p>' for p in parrafos)
    pts = ("<ul class=\"puntos\">" + "".join(f"<li>{x}</li>" for x in puntos) + "</ul>") if puntos else ""
    return f'<section class="bloque" data-r><h3>{titulo}</h3><div>{ps}{pts}</div></section>'


def pagina_proyecto(slug, titulo, lead, datos, contenido, sig_titulo, sig_url, desc, og):
    cuerpo = f"""{navegacion("diseno")}
<main id="contenido">
<div class="wrap proy-cab">
  <a class="volver" href="/diseno.html">{flecha("ph-arrow-left")} Diseño</a>
  <h1 class="lineas" style="font-size:clamp(56px,13vw,168px)"><span><span style="--i:0">{titulo}</span></span></h1>
  <p class="lead" data-r style="--d:1">{lead}</p>
  {ficha(datos)}
</div>
<div class="wrap">
{contenido}
  <a class="siguiente" href="{sig_url}"><span class="etiqueta">Siguiente</span><strong>{sig_titulo} {flecha()}</strong></a>
</div>
</main>
{contacto()}"""
    import re as _re
    return cabeza(_re.sub(r"<[^>]+>", "", titulo) + " · Juan Guzman", desc, f"/proyectos/{slug}.html", og) + cuerpo + cierre()


def proyectos():
    villguz = f"""
  <div class="portada img-carga paralaje" data-r>{pieza("vg-remera-espalda", "Remera de trabajo con la nueva marca de Villguz", "(min-width: 900px) 90vw, 100vw", lazy=False)}</div>
  {bloque("El desafío", "Villguz es un servicio técnico de línea blanca en Tucumán. Trabajaba con una imagen genérica, muy parecida a la del resto del rubro, y necesitaba transmitir confianza y respaldo oficial sin perder cercanía.")}
  {bloque("Rebranding", "Redibujé la marca alrededor de la V, que funciona sola como isotipo, con un azul profundo y un verde que la vuelve reconocible en la calle y en el celular.", "La llevé a todo lo que el cliente toca: uniformes, papelería, merchandising y señalética.")}
  <div class="mosaico">
    {fig("vg-logo", "Logotipo de Villguz Refrigeración", "c4", "1", claro=True)}
    {fig("vg-remera-frente", "Remera de trabajo con el isotipo de Villguz", "c4", "1", claro=True)}
    {fig("vg-gorra", "Gorra con la marca Villguz", "c4", "1", claro=True)}
    {fig("vg-credencial", "Credencial y lanyard de Villguz", "c6 ancho", "4/3", "(min-width: 900px) 50vw, 100vw")}
    {fig("vg-llavero", "Lanyard con el patrón de la marca", "c6 ancho", "4/3", "(min-width: 900px) 50vw, 100vw")}
    {fig("vg-sello", "Sello de madera con el isotipo de Villguz", "c4", "1")}
    {fig("vg-taza", "Taza con la marca Villguz", "c4", "1", claro=True)}
    {fig("vg-botella", "Botella con la marca Villguz", "c4 ancho", "1", claro=True)}
  </div>
  {bloque("Redes que educan y venden", "Armé un sistema de plantillas para Instagram: carruseles con consejos de uso, historias de producto y piezas institucionales. El objetivo es que el cliente encuentre valor antes de necesitar el servicio.", puntos=["Carruseles de consejos por electrodoméstico", "Historias de venta de equipos reacondicionados", "Piezas institucionales con las marcas oficiales"])}
  <div class="mosaico">
    {fig("vg-feed-inverter", "Carrusel: electrodomésticos comunes contra inverter", "c4", "4/5")}
    {fig("vg-feed-inverter-2", "Carrusel: comparación motor común e inverter", "c4", "4/5")}
    {fig("vg-feed-aa", "Carrusel: recomendaciones para el aire acondicionado", "c4 ancho", "4/5")}
    {fig("vg-feed-heladera", "Carrusel: recomendaciones para la heladera", "c4", "4/5")}
    {fig("vg-feed-lavarropas", "Carrusel: recomendaciones para el lavarropas", "c4", "4/5")}
    {fig("vg-feed-oficial-1", "Publicación de servicio técnico oficial", "c4 ancho", "4/5")}
    {fig("vg-historia-venta", "Historia de venta de un lavarropas reacondicionado", "c4", "9/16")}
    {video("/video/villguz-reel.mp4", "/video/villguz-reel.jpg", "c4", "Reel de Villguz recorriendo el local")}
    {fig("vg-historia-corea", "Historia sobre la visita del equipo técnico de LG", "c4 ancho", "9/16")}
  </div>
  {bloque("En la calle y en el mostrador", "Cartel de fachada y flyers para el local, con códigos QR que llevan directo a Instagram y WhatsApp.")}
  <div class="mosaico">
    {fig("vg-cartel", "Cartel de fachada de Villguz", "c12 ancho", "17788/7159", "(min-width: 900px) 90vw, 100vw")}
    {fig("vg-flyer-qr", "Flyer con QR a Instagram", "c4", "596/842")}
    {fig("vg-flyer-whatsapp", "Flyer con QR a WhatsApp", "c4", "596/842")}
    {fig("vg-flyer-costos", "Flyer de costos de asistencia técnica", "c4 ancho", "596/842")}
  </div>
  {bloque("La web", "La nueva identidad llega a la web: un sitio pensado para que el cliente confíe, encuentre su equipo y pida turno desde el celular.")}
  {vitrina_villguz()}
  <div class="acciones" data-r>
    <a class="btn btn--primario" href="/proyectos/villguz-web.html">Ver el caso de la web {flecha()}</a>
    <a class="btn btn--secundario" href="{VG_URL}" target="_blank" rel="noopener">Ver la web en vivo {flecha("ph-arrow-up-right")}</a>
  </div>"""

    auto = f"""
  {bloque("El encargo", "Piezas verticales para concesionarias de Tucumán: placas de financiación para los planes de Fiat y un video para el lanzamiento de un modelo híbrido.", "Jerarquía clara para que la cuota y el beneficio se lean en un segundo, y un sistema que se repite modelo por modelo sin perder impacto.")}
  <div class="mosaico">
    {fig("fiat-argo", "Placa de financiación Fiat Argo", "c3", "9/16", "(min-width: 900px) 25vw, 50vw")}
    {fig("fiat-cronos", "Placa de financiación Fiat Cronos", "c3", "9/16", "(min-width: 900px) 25vw, 50vw")}
    {fig("fiat-strada", "Placa de financiación Fiat Strada", "c3", "9/16", "(min-width: 900px) 25vw, 50vw")}
    {fig("fiat-titano", "Placa de financiación Fiat Titano", "c3", "9/16", "(min-width: 900px) 25vw, 50vw")}
  </div>
  {bloque("Video de lanzamiento", "Animación vertical para historias y reels: el auto entra en escena, aparece el mensaje principal y cierra con la financiación y la marca.")}
  <div class="mosaico">
    {video("/video/yaris.mp4", "/video/yaris.jpg", "c4 centro", "Video de lanzamiento del Toyota Yaris Cross")}
  </div>"""

    web = f"""
  <div class="portada portada--web" data-r>{navegador("vg-web-hero", "Portada de la web de Villguz Refrigeración", desliza=False, sizes="(min-width: 900px) 90vw, 100vw", lazy=False)}</div>
  {bloque("El desafío", "Villguz necesitaba que su web hiciera el trabajo del mostrador: que el cliente confíe, encuentre lo que busca y pida turno sin tener que llamar.", "Tenía que estar a la altura de las marcas oficiales que representa y verse perfecta en cualquier celular.")}
  {bloque("La solución", "Una web nueva, hecha a medida con la identidad de la marca. Cada sección responde una duda del cliente y lo acerca a pedir turno.", puntos=["Pedir turno o escribir por WhatsApp, siempre a un toque", "Marcas oficiales que transmiten respaldo", "Consejos que ayudan al cliente antes de que algo se rompa", "La historia de una empresa familiar con más de 30 años"])}
  {vitrina_villguz()}
  {logros()}
  {bloque("Sección por sección", "Una estética clara y moderna, con los colores de la marca y el verde reservado para lo importante: pedir turno.")}
  {secciones_villguz()}
  {bloque("Sistemas internos", "Detrás de la web, el equipo tiene sus propias herramientas privadas para organizar los turnos y las cuentas, con la misma identidad visual.")}
  {sistemas_villguz()}
  <div class="acciones" data-r>
    <a class="btn btn--primario" href="{VG_URL}" target="_blank" rel="noopener">Ver la web en vivo {flecha("ph-arrow-up-right")}</a>
    <a class="btn btn--secundario" href="#contacto">Quiero una web así</a>
  </div>"""

    return {
        "villguz-web": pagina_proyecto(
            "villguz-web", "Web Villguz",
            "Diseño y desarrollo de la web de un servicio técnico oficial: más confianza, más turnos y un equipo mejor organizado.",
            [("Cliente", "Villguz Refrigeración"), ("Servicios", "UX/UI, diseño y desarrollo web"),
             ("Entregables", "Web, turnos online y sistemas internos"),
             ("En línea", f'<a class="link" href="{VG_URL}" target="_blank" rel="noopener">villguzrefrigeracion.com</a>')],
            web, "Villguz Refrigeración", "/proyectos/villguz.html",
            "Caso de diseño web: villguzrefrigeracion.com, diseñada y programada por Juan Guzman.",
            f"{SITIO}/img/w/vg-web-hero-1600.jpg"),
        "villguz": pagina_proyecto(
            "villguz", "Villguz Refrigeración",
            "Rebranding, redes, gráfica y experiencia digital para un servicio técnico oficial de línea blanca en Tucumán.",
            [("Cliente", "Villguz Refrigeración"), ("Servicios", "Identidad, redes, gráfica y web"),
             ("Herramientas", "Illustrator, Photoshop, After Effects, Figma"),
             ("En línea", '<a class="link" href="https://www.villguzrefrigeracion.com/" target="_blank" rel="noopener">villguzrefrigeracion.com</a>')],
            villguz, "Concesionarias", "/proyectos/automotriz.html",
            "Caso de estudio: rebranding, redes, gráfica y plataforma web para Villguz Refrigeración.",
            f"{SITIO}/img/d/vg-remera-espalda-1600.jpg"),
        "automotriz": pagina_proyecto(
            "automotriz", "Concesionarias",
            "Placas de financiación y video vertical para concesionarias de autos en Tucumán.",
            [("Rubro", "Automotriz"), ("Formatos", "Historias y reels"),
             ("Servicios", "Diseño gráfico y motion"), ("Herramientas", "Photoshop, After Effects")],
            auto, "Web Villguz", "/proyectos/villguz-web.html",
            "Placas de financiación y video para concesionarias, diseñados por Juan Guzman.",
            f"{SITIO}/img/d/fiat-strada-1600.jpg"),
    }


# ----------------------------------------------------------------------------
# Web de Villguz: piezas que se usan en Diseño, en el inicio y en los casos
# ----------------------------------------------------------------------------
VG_URL = "https://www.villguzrefrigeracion.com/"


def vitrina_villguz(lazy=True):
    return f"""<div class="vitrina">
    {navegador("vg-web-full", "Página completa de la web de Villguz Refrigeración en computadora", lazy=lazy)}
    {telefono("vg-web-movil-full", "Página completa de la web de Villguz Refrigeración en el celular")}
  </div>"""


LOGROS_WEB = [
    ("ph-device-mobile", "Pensada para el celular", "Tus clientes te buscan desde el teléfono. La web se ve y se usa perfecto ahí, donde se decide."),
    ("ph-chat-circle-text", "Más consultas, menos vueltas", "Botones claros para escribirte, pedir turno o presupuesto, y cada consulta llega directo a tu WhatsApp."),
    ("ph-seal-check", "Confianza al primer vistazo", "Una imagen profesional y fiel a tu marca, que muestra respaldo y experiencia."),
    ("ph-compass", "Fácil de recorrer", "El contenido ordenado según lo que busca tu cliente, para que encuentre lo que necesita sin perderse."),
    ("ph-lightning", "Rápida y única", "Un diseño hecho para tu marca, sin plantillas, que carga rápido y está pensado para que te encuentren."),
    ("ph-trend-up", "Lista para crecer", "Publicada con tu propio dominio y preparada para sumar secciones, turnos o sistemas cuando los necesites."),
]


def logros():
    return '<ul class="logros">' + "".join(
        f'<li data-r style="--d:{i % 3}"><i class="ph-light {ic}" aria-hidden="true"></i><h3>{t}</h3><p>{d}</p></li>'
        for i, (ic, t, d) in enumerate(LOGROS_WEB)) + "</ul>"


def secciones_villguz():
    return f"""<div class="mosaico">
    {navegador("vg-web-equipos", "Sección ¿Qué equipo necesitás reparar? de la web de Villguz", desliza=False, cls="c6 ancho", sizes="(min-width: 900px) 45vw, 100vw")}
    {navegador("vg-web-servicios", "Sección Qué reparamos, con pestañas por equipo", desliza=False, cls="c6 ancho", sizes="(min-width: 900px) 45vw, 100vw")}
    {navegador("vg-web-proceso", "Sección De tu consulta a tu equipo funcionando", desliza=False, cls="c12 ancho", sizes="(min-width: 900px) 90vw, 100vw")}
    {navegador("vg-web-consejos", "Consejos de uso por electrodoméstico", desliza=False, cls="c6 ancho", sizes="(min-width: 900px) 45vw, 100vw")}
    {navegador("vg-web-turno", "Formulario de turno online que se envía por WhatsApp", desliza=False, cls="c6 ancho", sizes="(min-width: 900px) 45vw, 100vw")}
  </div>"""


SISTEMAS = [
    ("ph-calendar-check", "Agenda de turnos", "Un sistema simple para que tu equipo tome cada pedido, organice la agenda y no se olvide de ningún cliente.",
     ["Todos los pedidos en un solo lugar", "Avisos cuando un cliente lleva mucho tiempo esperando",
      "La agenda del día lista para compartir con el equipo", "Fácil de usar, aunque no seas de la compu"]),
    ("ph-receipt", "Administración y pagos", "Un panel privado para llevar las cuentas del negocio claras y al día, sin hacer cálculos a mano.",
     ["Liquidaciones y pagos que se calculan solos", "Resúmenes listos para imprimir o enviar",
      "Historial de todo lo que se pagó", "Acceso con contraseña y datos guardados en la nube"]),
]


def sistemas_villguz():
    tarjetas = "".join(sistema(*x) for x in SISTEMAS)
    return f"""<div class="vitrina">
    {navegador("sis-turnos", "Pantalla de inicio del sistema de turnos de Villguz, sin datos de clientes", "villguzrefrigeracion.com/turnos", desliza=False)}
    {telefono("sis-turnos-movil", "Sistema de turnos en el celular", desliza=False)}
  </div>
  <div class="mosaico">
    {tarjetas}
    {navegador("sis-panel", "Panel de liquidación a técnicos de Villguz, sin datos", "villguzrefrigeracion.com/panel", desliza=False, cls="c12 ancho", sizes="(min-width: 900px) 90vw, 100vw")}
  </div>"""


# ----------------------------------------------------------------------------
# Diseño: todas las areas en una pagina, con indice fijo
# ----------------------------------------------------------------------------
def area(k, n, titulo, texto, contenido, enlace=None):
    l = f'<a class="link" href="{enlace[1]}" data-r style="--d:2">{enlace[0]} {flecha()}</a>' if enlace else ""
    return f"""<section class="area" id="{k}" aria-labelledby="t-{k}">
  <div class="area__cab">
    <span class="etiqueta" data-r>{n:02d}</span>
    <h2 id="t-{k}" data-r>{titulo}</h2>
    <p class="texto" data-r style="--d:1">{texto}</p>
    {l}
  </div>
  {contenido}
</section>
"""


def sistema(icono, titulo, texto, puntos):
    pts = "".join(f"<li>{p}</li>" for p in puntos)
    return f"""<article class="sistema c6 ancho" data-r>
      <i class="ph-light {icono}" aria-hidden="true"></i>
      <h3>{titulo}</h3>
      <p class="texto">{texto}</p>
      <ul class="puntos">{pts}</ul>
    </article>"""


def pagina_diseno():
    sq = "(min-width: 900px) 25vw, 50vw"
    secciones = [
        area("web", 1, "Diseño web",
             "Webs que trabajan para tu negocio: transmiten confianza, se ven perfectas en cualquier pantalla y convierten visitas en clientes. Como la de Villguz Refrigeración, donde el cliente encuentra lo que necesita y pide turno en un minuto.",
             f"""{vitrina_villguz()}
  {logros()}
  {secciones_villguz()}
  <div class="acciones" data-r>
    <a class="btn btn--primario" href="/proyectos/villguz-web.html">Ver el caso completo {flecha()}</a>
    <a class="btn btn--secundario" href="{VG_URL}" target="_blank" rel="noopener">Ver la web en vivo {flecha("ph-arrow-up-right")}</a>
  </div>""", ("Ver el caso completo", "/proyectos/villguz-web.html")),
        area("sistemas", 2, "Sistemas internos",
             "Herramientas a medida para ordenar el día a día de tu negocio: menos planillas sueltas, menos errores y todo el equipo con la misma información, desde la compu o el celular.",
             sistemas_villguz(), ("Pedime una demo", "#contacto")),
        area("rebranding", 3, "Rebranding",
             "Rediseño integral de Villguz Refrigeración: nueva marca, uniformes, papelería y merchandising para que un servicio técnico se vea tan confiable como las marcas que representa.",
             f"""<div class="mosaico">
    {fig("vg-logo", "Logotipo de Villguz Refrigeración", "c4", "1", claro=True)}
    {fig("vg-remera-espalda", "Remera de trabajo con la marca Villguz", "c4", "1", claro=True)}
    {fig("vg-gorra", "Gorra con la marca Villguz", "c4 ancho", "1", claro=True)}
    {fig("vg-credencial", "Credencial y lanyard de Villguz", "c6 ancho", "4/3", "(min-width: 900px) 50vw, 100vw")}
    {fig("vg-sello", "Sello de madera con el isotipo de Villguz", "c6 ancho", "4/3", "(min-width: 900px) 50vw, 100vw")}
  </div>""", ("Ver el caso completo", "/proyectos/villguz.html")),
        area("logos", 4, "Logos",
             "Marcas pensadas para funcionar en grande y en chico: logotipo, isotipo y sus versiones en color, negativo y monocromo.",
             f"""<div class="mosaico">
    {fig("vibra-logo", "Logo de Vibra Dulce, pastelería", "c6", "1", "(min-width: 900px) 45vw, 50vw")}
    {fig("maggie-logo", "Logo de Maggie Moon, velas aromáticas", "c6", "1", "(min-width: 900px) 45vw, 50vw")}
    {fig("suna-logo", "Logotipo de Suna, jabones naturales, sobre terracota", "c3", "1", sq)}
    {fig("suna-logo-negro", "Logotipo de Suna en negativo", "c3", "1", sq)}
    {fig("suna-iso", "Isotipo de Suna sobre terracota", "c3", "1", sq)}
    {fig("suna-iso-negro", "Isotipo de Suna en negativo", "c3", "1", sq)}
    {fig("vg-logo-claro", "Logotipo de Villguz en positivo", "c3", "1", sq)}
    {fig("vg-logo-azul", "Logotipo de Villguz sobre azul", "c3", "1", sq)}
    {fig("vg-iso-verde", "Isotipo de Villguz sobre azul", "c3", "1", sq)}
    {fig("vg-iso-negro", "Isotipo de Villguz en negro", "c3", "1", sq)}
  </div>"""),
        area("placas", 5, "Placas",
             "Piezas de venta para redes: la cuota, el beneficio o el precio se leen en un segundo y el sistema se repite producto por producto.",
             f"""<div class="mosaico">
    {fig("fiat-argo", "Placa de financiación Fiat Argo", "c3", "9/16", sq)}
    {fig("fiat-cronos", "Placa de financiación Fiat Cronos", "c3", "9/16", sq)}
    {fig("fiat-strada", "Placa de financiación Fiat Strada", "c3", "9/16", sq)}
    {fig("fiat-titano", "Placa de financiación Fiat Titano", "c3", "9/16", sq)}
    {fig("vg-placa-venta", "Placa de venta de un lavarropas reacondicionado", "c6", "1", "(min-width: 900px) 50vw, 50vw")}
    {fig("vg-placa-hotsale", "Placa de Hot Sale para Villguz", "c6", "1", "(min-width: 900px) 50vw, 50vw")}
  </div>
  <div class="mosaico tres">
    {fig("vibra-placa-brownie", "Historia de Vibra Dulce: torta brownie", "c4", "636/1152", "(min-width: 900px) 33vw, 33vw")}
    {fig("vibra-placa-imperial", "Historia de Vibra Dulce: imperial ruso", "c4", "635/1152", "(min-width: 900px) 33vw, 33vw")}
    {fig("vibra-placa-chaja", "Historia de Vibra Dulce: torta chajá", "c4", "635/1152", "(min-width: 900px) 33vw, 33vw")}
  </div>""", ("Ver el proyecto de concesionarias", "/proyectos/automotriz.html")),
        area("redes", 6, "Redes",
             "Sistemas de plantillas para Instagram: carruseles que educan, historias que venden y piezas institucionales que construyen confianza.",
             f"""<div class="mosaico">
    {fig("vg-feed-inverter", "Carrusel: electrodomésticos comunes contra inverter", "c3", "4/5", sq)}
    {fig("vg-feed-heladera", "Carrusel: recomendaciones para la heladera", "c3", "4/5", sq)}
    {fig("vg-feed-lavarropas", "Carrusel: recomendaciones para el lavarropas", "c3", "4/5", sq)}
    {fig("vg-feed-oficial-1", "Publicación de servicio técnico oficial", "c3", "4/5", sq)}
    {fig("vg-historia-trabajador", "Historia por el Día del Trabajador", "c4", "9/16")}
    {fig("vg-historia-corea", "Historia sobre la visita del equipo técnico de LG", "c4", "9/16")}
    {fig("vg-historia-venta", "Historia de venta de un lavarropas reacondicionado", "c4 ancho", "9/16")}
  </div>"""),
        area("motion", 7, "Motion",
             "Animaciones hechas en After Effects: logos que cobran vida, firmas animadas, reels y lanzamientos de producto. También filmo y edito video deportivo.",
             f"""<div class="mosaico">
    {video("/video/villguz-logo.mp4", "/video/villguz-logo.jpg", "c3", "Animación del logo de Villguz", "Logo animado")}
    {video("/video/villguz-firma.mp4", "/video/villguz-firma.jpg", "c3", "Firma animada de Villguz", "Firma animada")}
    {video("/video/villguz-reel.mp4", "/video/villguz-reel.jpg", "c3", "Reel de Villguz recorriendo el local", "Reel")}
    {video("/video/yaris.mp4", "/video/yaris.jpg", "c3", "Video de lanzamiento del Toyota Yaris Cross", "Lanzamiento")}
  </div>
  <div class="mosaico">
    {video("/video/xco.mp4", "/video/xco.jpg", "c4 centro", "Video de mountain bike del XCO argentino", "Filmmaker · XCO argentino")}
  </div>"""),
    ]
    chips = "".join(f'<a class="chip" href="#{k}">{t}</a>' for k, t, *_ in AREAS)
    cuerpo = f"""{navegacion("diseno")}
<main id="contenido">
<div class="wrap pag-cab">
  <h1 class="lineas" style="font-size:clamp(64px,15vw,184px)"><span><span style="--i:0">Diseño</span></span></h1>
  <p class="lead" data-r style="--d:2">Diseño web, sistemas internos, rebranding, logos, placas, redes y motion. Elegí un área o recorré todo.</p>
</div>
<nav class="filtros" aria-label="Áreas de diseño"><div class="wrap filtros__in" data-espia>{chips}</div></nav>
<div class="wrap areas">
{"".join(secciones)}</div>
</main>
{contacto()}"""
    return (cabeza("Diseño · Juan Guzman",
                   "Diseño de Juan Guzman: diseño y desarrollo web, sistemas internos, rebranding, logos, placas, redes y motion en After Effects.",
                   "/diseno.html", f"{SITIO}/img/w/vg-web-hero-1600.jpg") + cuerpo + cierre())


def relativas(doc, prefijo):
    """Convierte rutas absolutas (/css, /img...) en relativas para que el sitio
    funcione en cualquier servidor, no solo en la raiz del dominio."""
    import re
    inicio = prefijo or "./"
    doc = doc.replace('href="/"', f'href="{inicio}"')
    doc = doc.replace('href="/#', f'href="{prefijo}index.html#')
    doc = re.sub(r'(href|src|srcset|data-full|poster)="/(?!/)', lambda m: f'{m.group(1)}="{prefijo}', doc)
    doc = re.sub(r', /(?=img/)', f', {prefijo}', doc)
    return doc


def main():
    (RAIZ / "index.html").write_text(relativas(pagina_inicio(), ""))
    (RAIZ / "fotografia.html").write_text(relativas(pagina_fotografia(), ""))
    (RAIZ / "diseno.html").write_text(relativas(pagina_diseno(), ""))
    (RAIZ / "proyectos").mkdir(exist_ok=True)
    # cotizador privado (antes /tarifario/): no se enlaza desde ningun lado
    (RAIZ / "cotizador-q4m9" / "index.html").write_text(relativas(pagina_tarifario(sys.modules[__name__]), "../"))
    for slug, contenido in proyectos().items():
        (RAIZ / "proyectos" / f"{slug}.html").write_text(relativas(contenido, "../"))
    # favicon: isotipo en tinta
    (RAIZ / "img" / "favicon.svg").write_text(
        (RAIZ / "img" / "isotipo.svg").read_text().replace("#333333", "#1a1a1a"))
    print("Listo: index.html, fotografia.html, diseno.html y", len(proyectos()), "proyectos")


import sys  # noqa: E402
from tarifario import pagina_tarifario  # noqa: E402  (tools/tarifario.py: pagina del tarifario)


if __name__ == "__main__":
    main()
