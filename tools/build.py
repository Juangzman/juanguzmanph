#!/usr/bin/env python3
"""Genera las paginas del portfolio a partir de los datos de este archivo.

Uso:  python3 tools/build.py   (desde la carpeta del repo)

Para sumar fotos o proyectos, edita las listas de abajo y volve a correrlo.
"""
from pathlib import Path
import html

RAIZ = Path(__file__).resolve().parent.parent
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


def local(nombre, w, h, alt, sizes="100vw", lazy=True):
    """Imagen guardada en /img con versiones 800 y 1600 en webp y jpg."""
    carga = 'loading="lazy" ' if lazy else 'fetchpriority="high" '
    return (f'<picture><source type="image/webp" srcset="/img/{nombre}-800.webp 800w, /img/{nombre}-1600.webp 1600w" sizes="{sizes}">'
            f'<img src="/img/{nombre}-1600.jpg" srcset="/img/{nombre}-800.jpg 800w, /img/{nombre}-1600.jpg 1600w" sizes="{sizes}" '
            f'width="{w}" height="{h}" {carga}decoding="async" alt="{e(alt)}"></picture>')


def full(f, w, h):
    return f"{CDN}{f}?scale-down-to={2048 if max(w, h) > 2048 else max(w, h)}"


# ----------------------------------------------------------------------------
# Datos: fotografia (archivo, ancho, alto)
# ----------------------------------------------------------------------------
CATEGORIAS = [
    ("conciertos", "Conciertos", [
        ("local:concierto", 1600, 1067),
        ("GQDhEs2rckKZrHb1lOFEpsS3ddE.jpg", 3840, 5760), ("UCA8SScmp4wXLie8pNslMKz4.jpg", 5760, 3840),
        ("F9H75qVUGReHrs0iH4vDNYdFxYg.jpg", 4500, 3000), ("1L9HsPtrrPx24XjVo2c5O5UQ.jpg", 4000, 6000),
        ("bKOWxAAZ9ataNw3riROooW9WRc.jpg", 1843, 2764), ("JXaQttlXrGYqdrR4IEMJgo3U8.jpg", 6000, 4000),
        ("ViP8uq7qzJWWGFZY6TtHKT5548.jpg", 5107, 3405), ("16RcmKsmKl3V3qtd41Ct57AD6cQ.jpg", 3185, 4778),
        ("KcKgJlT8KKoIgZ2yeCtTA6yIw.jpg", 3060, 4590), ("aEykBq1bjkdUJoKLsAQcjf0COVc.jpg", 4000, 6000),
        ("Hx1vbc2IBYEP61WNXAV9TEZlxE.jpg", 4468, 2979), ("pZDtLS0coHSDZpS0sPsuFXJrNY.jpg", 3222, 4833),
    ]),
    ("deportes", "Deportes", [
        ("local:mtb", 1067, 1600),
        ("70x9SxsnGhkqygTR8LGU0IkmE.jpg", 2000, 3000), ("5A7dXZOxR0XSeD6Xq3Du3LZpE.jpg", 2048, 1365),
        ("ahEcRWav2ttK2OW0cF2DHmcN1Kg.jpg", 2048, 1365), ("zjUKY8EDxp1vdIwkjSgW08qGEV0.jpg", 2000, 1333),
        ("S6rwcG4Mt31Hhwm5C0nkmL62uIA.jpg", 2000, 3000), ("RHOmeukHpkQgRikBPh7ih3QEfo.jpg", 2000, 3000),
        ("txXjWPePNz6JyAsSdyLpVGPRZJ4.jpg", 1365, 2048), ("NKl2nqe1IbyPIST5Ctk2sbYnIl4.jpg", 2000, 3000),
        ("C0w7JGWCExYnakmIApzwgPsToM0.jpg", 3049, 4573), ("R9qhs4OJvPscMWOd34ts4Gsu3A.jpg", 3840, 5760),
    ]),
    ("gastronomia", "Gastronomía", [
        ("local:torta", 1600, 1600),
        ("cIeyb476Wz7FQbI6OSBDP9LcNk.jpg", 1365, 2048), ("3YB9BZvSrrFpsNdkoUnjtjBBiM.jpg", 2048, 1365),
        ("XF2V9JALcgoagvFTPkeXDvdw8I0.jpg", 1365, 2048), ("P3iMZ9jzpZaSb9NkMJ1TciJQWg.jpg", 3840, 5760),
        ("1xgcE4DPjvrMc4RIm0zawvvImM.jpg", 3840, 5760), ("7ajok6UG1GorcztKdGtkSuxyF8.jpg", 2048, 1365),
        ("QF9kGORb5CGwsCdXtby7HIpBEYM.jpg", 2048, 1365), ("kp3kZY93tVuenjwFmbqVH2EHQxs.jpg", 1365, 2048),
    ]),
    ("eventos", "Eventos", [
        ("XiPP4FQh3EjvfC7Y25ak4XmLow.jpg", 3025, 4537), ("4m6XhvZHuFSyEBNjIjyv0Rc0AYc.jpg", 3840, 5760),
        ("KvB39y48SaECOoR99RtQKVNDI.jpg", 3029, 4544), ("9VSitWnocz6q458O4GgPQjsGrg.jpg", 5760, 3840),
        ("9ZDb3o7JHpeoXTivkiyfrIaL40.jpg", 5760, 3840), ("RoHbc2phFHHyu6mtpaoeWpa4Fs.jpg", 3840, 5760),
    ]),
    ("moda", "Moda", [
        ("KE7NfYxYHyaQ3WVaLMmQ2wBptv0.jpg", 2048, 1365), ("ut4F6WcXLXBkXeeE7vO72bzgU.jpg", 2048, 1365),
        ("K9utb99KDAgCjhcUOQSTmKbwU.jpg", 2048, 1365), ("5JKn5mcHalmv9rdEaPQZvedI.jpg", 1365, 2048),
        ("qCtBH1orOs87TLiz6zYZ8tMyyE.jpg", 1365, 2048), ("qfpA4l0N0dcM6BwoF6Tv48XT2Oc.jpg", 2048, 1365),
    ]),
]
PORTADAS = {  # portada de cada categoria en el inicio
    "gastronomia": ("cIeyb476Wz7FQbI6OSBDP9LcNk.jpg", 1365, 2048),
    "deportes": ("70x9SxsnGhkqygTR8LGU0IkmE.jpg", 2000, 3000),
    "conciertos": ("1L9HsPtrrPx24XjVo2c5O5UQ.jpg", 4000, 6000),
    "eventos": ("XiPP4FQh3EjvfC7Y25ak4XmLow.jpg", 3025, 4537),
    "moda": ("qCtBH1orOs87TLiz6zYZ8tMyyE.jpg", 1365, 2048),
}
ORDEN_INICIO = ["gastronomia", "deportes", "conciertos", "eventos", "moda"]

# ----------------------------------------------------------------------------
# Piezas comunes
# ----------------------------------------------------------------------------
ISO = (RAIZ / "img" / "isotipo.svg").read_text().replace("#333333", "currentColor").replace(
    '<svg ', '<svg aria-hidden="true" focusable="false" ')

NAV = [("Trabajos", "/#trabajos", "trabajos"), ("Fotografía", "/fotografia.html", "fotografia"),
       ("Servicios", "/#servicios", "servicios"), ("Sobre mí", "/#sobre", "sobre")]


def flecha(clase="ph-arrow-right"):
    return f'<i class="ph-light {clase}" aria-hidden="true"></i>'


def cabeza(titulo, descripcion, ruta, imagen_og=None):
    og = imagen_og or f"{SITIO}/img/concierto-1600.jpg"
    return f"""<!doctype html>
<html lang="es-AR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{e(titulo)}</title>
<meta name="description" content="{e(descripcion)}">
<link rel="canonical" href="{SITIO}{ruta}">
<meta name="theme-color" content="#fafafa">
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
<link rel="stylesheet" href="/css/styles.css">
<script defer src="/js/main.js"></script>
</head>
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
TRABAJOS = [
    ("Villguz Refrigeración", "Identidad y web", "Diseño", "/proyectos/villguz.html",
     remota("6pbUvDWK0VDV2ztUf8KaI05LGo.png", 1080, 1920, "Historia de Instagram de Villguz con un técnico trabajando", "(min-width: 900px) 260px, 100vw")),
    ("Carreras MTB", "Deporte", "Fotografía", "/fotografia.html#deportes",
     local("mtb", 1067, 1600, "Ciclista de mountain bike tomando una curva en un sendero", "(min-width: 900px) 260px, 100vw")),
    ("Pana GOGA", "Identidad de marca", "Diseño", "/proyectos/pana-goga.html",
     remota("q9dmkLIpQ5ubBnPHSzGg1YmlPD0.png", 3000, 2000, "Cartel de la fachada de Pana GOGA", "(min-width: 900px) 260px, 100vw")),
    ("Tucumán urban indie", "Conciertos", "Fotografía", "/fotografia.html#conciertos",
     remota("GQDhEs2rckKZrHb1lOFEpsS3ddE.jpg", 3840, 5760, "Banda tocando en vivo en Tucumán", "(min-width: 900px) 260px, 100vw")),
    ("Marketing y <span class=\"nw\">e-commerce</span>", "Redes y video", "Diseño", "/proyectos/marketing.html",
     remota("eVvKZTysTmFRyBY2m0p5FmgBU.png", 1080, 1080, "Pieza para redes de un gimnasio", "(min-width: 900px) 260px, 100vw")),
]

SERVICIOS = [
    ("ph-camera", "Fotografía", "Gastronomía, producto, deportes, conciertos, eventos y retrato, con dirección de arte en cada sesión."),
    ("ph-pen-nib", "Identidad visual", "Logotipo, manual de marca y sistema gráfico para que tu marca se vea igual en todos lados."),
    ("ph-devices", "UX/UI y web", "Sitios y plataformas pensados para tu cliente, prototipados en Figma y listos para usar."),
    ("ph-instagram-logo", "Redes y <span class=\"nw\">e-commerce</span>", "Piezas para Instagram, campañas y tiendas online que acompañan tus ventas."),
    ("ph-film-slate", "Filmmaking", "Videos cortos para redes con la misma mirada que mi fotografía."),
]

FORMACION = [
    ("Lic. en Diseño Digital", "Universidad del Este, en curso"),
    ("Marketing Digital y E-commerce", "EAE Madrid, 2019"),
    ("Fotografía Social y Fotoperiodismo", "UBA, 2020"),
    ("Diseño Web HTML y CSS", "Coderhouse, 2022"),
]
HERRAMIENTAS = ["Figma", "Photoshop", "Illustrator", "Lightroom", "After Effects", "CapCut", "Canva", "Notion"]


def pagina_inicio():
    filas = ""
    for i, (titulo, cat, tipo, url, img) in enumerate(TRABAJOS):
        filas += f"""<li data-r style="--d:{i % 3}"><a class="fila" href="{url}">
      <div class="fila__img img-carga">{img}</div>
      <div class="fila__cuerpo"><span class="fila__titulo">{titulo}</span><span class="fila__meta"><span>{tipo}</span><span>{cat}</span></span></div>
    </a></li>
"""
    conteo = {k: len(fotos) for k, _, fotos in CATEGORIAS}
    nombres = {k: n for k, n, _ in CATEGORIAS}
    cats = ""
    for i, k in enumerate(ORDEN_INICIO):
        f, w, h = PORTADAS[k]
        cats += f"""<a class="cat" href="/fotografia.html#{k}" data-r style="--d:{i}">
      <div class="cat__img img-carga">{remota(f, w, h, f"Fotografía de {nombres[k].lower()}", "(min-width: 1100px) 20vw, 72vw")}</div>
      <div class="cat__pie"><h3>{nombres[k]}</h3><span class="meta">{conteo[k]} fotos</span></div>
    </a>
"""
    servicios = "".join(
        f'<li class="servicio" data-r style="--d:{i % 2}"><i class="ph-light {ic}" aria-hidden="true"></i><h3>{t}</h3><p>{d}</p></li>\n'
        for i, (ic, t, d) in enumerate(SERVICIOS))
    formacion = "".join(f"<li>{t}<span>{d}</span></li>" for t, d in FORMACION)
    herramientas = "".join(f"<li>{h}</li>" for h in HERRAMIENTAS)

    cuerpo = f"""{navegacion("")}
<main id="contenido">
<section class="hero" aria-labelledby="t-hero">
  <div class="wrap hero__grid">
    <div class="hero__texto">
      <h1 id="t-hero" class="lineas"><span><span style="--i:0">Fotografía</span></span><span><span style="--i:1">y diseño</span></span><span><span style="--i:2">con propósito</span></span></h1>
      <p class="lead" data-r style="--d:3">Ayudo a marcas, negocios y personas a profesionalizar su imagen, del lente al píxel.</p>
      <div class="hero__acciones" data-r style="--d:4">
        <a class="btn btn--primario" href="#trabajos">Ver trabajos {flecha()}</a>
        <a class="btn btn--secundario" href="#contacto">Escribime</a>
      </div>
    </div>
    <div class="hero__foto">{local("concierto", 1600, 1067, "Público con las manos en alto frente a un escenario iluminado, en blanco y negro", "(min-width: 900px) 50vw, 100vw", lazy=False)}</div>
  </div>
  </section>

<section class="seccion" id="trabajos" aria-labelledby="t-trabajos">
  <div class="wrap">
    <div class="seccion__cab">
      <h2 id="t-trabajos" data-r>Trabajo<br>seleccionado</h2>
      <a class="link" href="/fotografia.html" data-r style="--d:1">Ver toda la fotografía {flecha()}</a>
    </div>
    <ul class="indice">
{filas}    </ul>
  </div>
</section>

<section class="seccion" id="fotografia" aria-labelledby="t-foto" style="padding-top:0">
  <div class="wrap">
    <div class="seccion__cab">
      <div style="display:grid;gap:20px">
        <h2 id="t-foto" data-r>Fotografía</h2>
        <p class="lead" data-r style="--d:1">Gastronomía, deporte, música, eventos y moda. Cada imagen con un propósito claro.</p>
      </div>
      <a class="link" href="/fotografia.html" data-r style="--d:2">Ver galería completa {flecha()}</a>
    </div>
    <div class="riel">
{cats}    </div>
  </div>
</section>

<section class="seccion" id="servicios" aria-labelledby="t-serv" style="padding-top:0">
  <div class="wrap servicios">
    <div class="servicios__cab">
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
      <h2 id="t-sobre" data-r>Sobre mí</h2>
      <p class="texto" data-r style="--d:1">Soy Juan Alfredo Guzman, fotógrafo y diseñador digital en San Miguel de Tucumán. Trabajo de forma remota con marcas, negocios y personas.</p>
      <p class="texto" data-r style="--d:2">Mi formación en marketing digital y e-commerce me lleva a pensar cada imagen en función de un resultado. Vengo de la fotografía y el filmmaking, y esa mirada guía mi dirección de arte.</p>
      <p class="texto" data-r style="--d:3">Fuera del trabajo toco el bajo y le hago el mantenimiento a mi moto.</p>
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
                   "Fotógrafo y diseñador digital en Tucumán. Fotografía gastronómica, deportiva, de conciertos y eventos, identidad visual, UX/UI y contenido para redes.",
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
    for i, (k, n, (f, w, h)) in enumerate(orden):
        cuenta[k] = cuenta.get(k, 0) + 1
        alt = f"Fotografía de {n.lower()} {cuenta[k]}"
        sizes = "(min-width: 1200px) 25vw, (min-width: 700px) 33vw, 50vw"
        if f.startswith("local:"):
            nombre = f.split(":")[1]
            img = local(nombre, w, h, alt, sizes, lazy=i > 5)
            grande = f"/img/{nombre}-1600.jpg"
        else:
            img = remota(f, w, h, alt, sizes, lazy=i > 5)
            grande = full(f, w, h)
        figs += f'<figure data-cat="{k}" data-nombre="{n}" data-full="{grande}"><button type="button" class="img-carga" aria-label="Ampliar {e(alt)}">{img}</button></figure>\n'
    total = len(orden)
    chips = f'<button class="chip" type="button" data-filtro="todo" aria-pressed="true">Todo<sup>{total}</sup></button>'
    chips += "".join(f'<button class="chip" type="button" data-filtro="{k}" aria-pressed="false">{n}<sup>{len(f)}</sup></button>'
                     for k, n, f in CATEGORIAS)
    cuerpo = f"""{navegacion("fotografia")}
<main id="contenido">
<div class="wrap pag-cab">
  <h1 class="lineas" style="font-size:clamp(64px,15vw,184px)"><span><span style="--i:0">Fotografía</span></span></h1>
  <p class="lead" data-r style="--d:2">Gastronomía, deporte, música, eventos y moda. Tocá cualquier foto para verla en grande.</p>
</div>
<div class="filtros"><div class="wrap filtros__in" role="toolbar" aria-label="Filtrar por categoría">{chips}</div></div>
<div class="wrap"><div class="galeria">
{figs}</div></div>
</main>
{contacto()}"""
    return (cabeza("Fotografía · Juan Guzman",
                   "Galería de fotografía de Juan Guzman: gastronomía, deportes, conciertos, eventos y moda en Tucumán.",
                   "/fotografia.html") + cuerpo + cierre(visor=True))


# ----------------------------------------------------------------------------
# Proyectos de diseno
# ----------------------------------------------------------------------------
def fig(f, w, h, alt, cls, ratio=None, sizes="(min-width: 900px) 33vw, 50vw"):
    st = f' style="aspect-ratio:{ratio}"' if ratio else ""
    return f'<figure class="{cls} img-carga" data-r{st}>{remota(f, w, h, alt, sizes)}</figure>'


def video(src, cls):
    return (f'<figure class="{cls}" data-r style="aspect-ratio:9/16"><video data-auto muted loop playsinline preload="metadata" '
            f'src="{src}" aria-label="Video de campaña para redes"></video></figure>')


def ficha(items):
    return '<dl class="ficha" data-r style="--d:2">' + "".join(f"<div><dt>{a}</dt><dd>{b}</dd></div>" for a, b in items) + "</dl>"


def bloque(titulo, *parrafos, puntos=None):
    ps = "".join(f'<p class="texto">{p}</p>' for p in parrafos)
    pts = ("<ul class=\"puntos\">" + "".join(f"<li>{x}</li>" for x in puntos) + "</ul>") if puntos else ""
    return f'<section class="bloque" data-r><h3>{titulo}</h3><div>{ps}{pts}</div></section>'


def pagina_proyecto(slug, titulo, lead, datos, contenido, sig_titulo, sig_url, desc, og):
    cuerpo = f"""{navegacion("trabajos")}
<main id="contenido">
<div class="wrap proy-cab">
  <a class="volver" href="/#trabajos">{flecha("ph-arrow-left")} Trabajos</a>
  <h1 class="lineas" style="font-size:clamp(56px,13vw,168px)"><span><span style="--i:0">{titulo}</span></span></h1>
  <p class="lead" data-r style="--d:1">{lead}</p>
  {ficha(datos)}
</div>
<div class="wrap">
{contenido}
  <a class="siguiente" href="{sig_url}"><span class="etiqueta">Siguiente proyecto</span><strong>{sig_titulo} {flecha()}</strong></a>
</div>
</main>
{contacto()}"""
    import re as _re
    return cabeza(_re.sub(r"<[^>]+>", "", titulo) + " · Juan Guzman", desc, f"/proyectos/{slug}.html", og) + cuerpo + cierre()


def proyectos():
    villguz = f"""
  <div class="portada pantalla img-carga" data-r>{remota("7lkFkoo52oNNyhNa2HQHszYXSo.png", 2940, 9890, "Diseño de la web de Villguz Refrigeración", "(min-width: 900px) 90vw, 100vw", lazy=False)}</div>
  {bloque("El desafío", "Villguz trabaja en un rubro con una estética muy genérica. Necesitaba transmitir confianza y diferenciarse sin perder la cercanía con sus clientes.")}
  {bloque("Identidad y redes", "Rediseñé la identidad y la llevé a las piezas que el cliente ve todos los días, en el local y en Instagram.", puntos=["Flyers para el mostrador", "Carrusel informativo para Instagram", "Plantillas para historias"])}
  <div class="mosaico">
    {fig("m32zrjPmZjRcdZaDXiG7383Q.jpg", 596, 839, "Flyer de mostrador de Villguz", "c6")}
    {fig("7G4XQ9G01NHqtprEOBEG20grVi8.jpg", 596, 842, "Segundo flyer de mostrador de Villguz", "c6")}
    {fig("3SJY065xbSk48zsbDRvZwlHRfo.jpg", 1080, 1350, "Carrusel de Instagram de Villguz, placa 1", "c4")}
    {fig("JKsg7pAABbfC2jGBUjrwp8CJhJA.jpg", 1080, 1350, "Carrusel de Instagram de Villguz, placa 2", "c4")}
    {fig("imfe3c4Qe1N6uWHmAZoxqJefPRI.jpg", 1080, 1350, "Carrusel de Instagram de Villguz, placa 3", "c4 ancho")}
    {fig("YWXTeTS6050uFF60OAG6fZa2ok.jpg", 1080, 1350, "Carrusel de Instagram de Villguz, placa 4", "c6")}
    {fig("MoukaPeZFIw33M91xPoB8PcZA.jpg", 1081, 1351, "Carrusel de Instagram de Villguz, placa 5", "c6")}
    {fig("6pbUvDWK0VDV2ztUf8KaI05LGo.png", 1080, 1920, "Plantilla de historia de Villguz 1", "c4")}
    {fig("BwIFUiu0NEco13WNdrzBdugNos0.png", 1080, 1920, "Plantilla de historia de Villguz 2", "c4")}
    {fig("gpHzRr7bzVshwY62QA9fOOZYU.png", 1080, 1920, "Plantilla de historia de Villguz 3", "c4 ancho")}
  </div>
  {bloque("Plataforma digital", "Diseñé una plataforma para gestionar servicios técnicos y turnos, pensada para que el cliente resuelva todo desde el celular.", puntos=["Pedido de servicio digital para reducir esperas", "Rebranding para salir de la estética genérica del rubro", "Información de pagos y facturación integrada", "Turnos online que llegan por WhatsApp"])}
  <div class="mosaico">
    <div class="pantalla c6 ancho img-carga" data-r>{remota("zP6jGJwKEB57uMsX9el3H6AU4I.jpg", 786, 11552, "Versión móvil de la web de Villguz", "(min-width: 900px) 45vw, 100vw")}</div>
    <div class="c6 ancho" data-r style="display:grid;align-content:end;gap:20px;padding:8px 0">
      <p class="texto">La web está en línea y la usan los clientes de Villguz para pedir turnos, consultar el estado de su equipo y contactar al equipo técnico.</p>
      <a class="btn btn--primario" href="https://www.villguzrefrigeracion.com/" target="_blank" rel="noopener" style="width:fit-content">Ver la web en vivo {flecha("ph-arrow-up-right")}</a>
    </div>
  </div>"""

    pana = f"""
  <div class="portada img-carga" data-r>{remota("hxVvXtWb2eFpZWbkRtnShDyA.png", 5400, 4000, "Aplicaciones de la marca Pana GOGA", "(min-width: 900px) 90vw, 100vw", lazy=False)}</div>
  {bloque("La idea", "Una marca para una panadería de autor que pone en valor el tiempo lento y el pan tradicional.", "El tono de voz es cercano, humano y sensorial, como la experiencia de entrar a la panadería.")}
  {bloque("Sistema visual", "Paleta de tonos tierra con un marrón profundo como color principal, y una combinación de Montserrat con Francoeur para equilibrar claridad y calidez.")}
  <div class="mosaico">
    {fig("9mdfWkFbLoR7GlUwkAsu2oiF8.png", 600, 600, "Logotipo de Pana GOGA", "c4", "1")}
    {fig("1NGtswZ4ok4tT5mXIrX4yqqTI.png", 600, 600, "Variante del logotipo de Pana GOGA", "c4", "1")}
    {fig("YtLK4mnBxa4PzpH7PooMPeaPZI.png", 2500, 2500, "Aplicación de la marca Pana GOGA", "c4 ancho", "1")}
    {fig("q9dmkLIpQ5ubBnPHSzGg1YmlPD0.png", 3000, 2000, "Mockup de packaging de Pana GOGA", "c6 ancho", "3/2")}
    {fig("akl6pV4CBiIMPnfMMWnj0G7UKw.png", 4000, 3000, "Mockup de papelería de Pana GOGA", "c6 ancho", "4/3")}
    {fig("m4uaIsAroY9AFRNwZXH389yZtzo.png", 1280, 960, "Pieza de redes de Pana GOGA", "c6", "4/3")}
    {fig("Pe2MxpGIJheT2XKPoUW3RmNdW0.png", 2225, 2239, "Aplicación de la marca Pana GOGA en local", "c6", "4/3")}
  </div>"""

    mk_imgs = [("ZmRvjCRg1DtzQl2z3S8GNrGI7bs.jpg", 1081, 1920), ("hCw9jdtOyYoUGaiHkKgra6vj0T4.png", 1080, 1920),
               ("aoiq6ZNjTrgFqGa6AD45rEd1M.jpg", 1081, 1920), ("TWJn9lU17Pni0FNsQMk5ySlAYJ8.jpg", 1080, 1920),
               ("j2WTs0CLzQCLL9ogs9m8lRBY8Q.jpeg", 720, 1280), ("aSq6ANyyqGfdlK4pRZlretDGYrM.jpg", 1081, 1920),
               ("a8f2pt9tKAqrjSgZlpNwsNcE7c.png", 1080, 1920), ("dZzj1KezR9t6zHgxy1ZTzQqPVj8.png", 1080, 1920)]
    piezas = "\n    ".join(fig(f, w, h, f"Pieza vertical para redes {i + 1}", "c3", "9/16", "(min-width: 900px) 25vw, 50vw")
                           for i, (f, w, h) in enumerate(mk_imgs))
    marketing = f"""
  {bloque("El enfoque", "Contenido pensado para el formato vertical del celular: mensajes cortos, jerarquía clara y una imagen que frena el scroll.", "Cada pieza parte de un objetivo comercial, ya sea lanzar un producto, comunicar una promoción o llevar tráfico a la tienda.")}
  <div class="mosaico">
    {video("https://framerusercontent.com/assets/1YaB2PqlpeSrqvgdM1zliY43wlM.mp4", "c3")}
    {video("https://framerusercontent.com/assets/ZwiKaWLSsqcYoL3JckmaWV9ErKk.mp4", "c3")}
    {piezas}
  </div>"""

    salida = {
        "villguz": pagina_proyecto(
            "villguz", "Villguz Refrigeración",
            "Identidad visual y experiencia digital para un servicio técnico de línea blanca en Tucumán.",
            [("Cliente", "Villguz Refrigeración"), ("Servicios", "Identidad, web y UX, redes"),
             ("Herramientas", "Figma, Illustrator, Photoshop"),
             ("En línea", '<a class="link" href="https://www.villguzrefrigeracion.com/" target="_blank" rel="noopener">villguzrefrigeracion.com</a>')],
            villguz, "Pana GOGA", "/proyectos/pana-goga.html",
            "Caso de estudio: identidad visual, redes y plataforma web para Villguz Refrigeración.",
            f"{CDN}3SJY065xbSk48zsbDRvZwlHRfo.jpg?scale-down-to=1024"),
        "pana-goga": pagina_proyecto(
            "pana-goga", "Pana GOGA",
            "Identidad para una panadería de autor que celebra el tiempo lento y el pan de siempre.",
            [("Cliente", "Pana GOGA"), ("Servicio", "Identidad de marca"),
             ("Tipografías", "Montserrat y Francoeur"), ("Color", "Tonos tierra, #735541")],
            pana, "Marketing y <span class=\"nw\">e-commerce</span>", "/proyectos/marketing.html",
            "Caso de estudio: identidad de marca para Pana GOGA, panadería de autor.",
            f"{CDN}hxVvXtWb2eFpZWbkRtnShDyA.png?scale-down-to=1024"),
        "marketing": pagina_proyecto(
            "marketing", "Marketing y <span class=\"nw\">e-commerce</span>",
            "Piezas verticales y video para redes y tiendas online, pensadas para vender.",
            [("Formatos", "Historias, reels y posts"), ("Servicios", "Diseño y edición de video"),
             ("Herramientas", "Photoshop, After Effects, CapCut"), ("Uso", "Instagram y e-commerce")],
            marketing, "Villguz Refrigeración", "/proyectos/villguz.html",
            "Piezas de marketing digital y e-commerce diseñadas por Juan Guzman.",
            f"{CDN}dZzj1KezR9t6zHgxy1ZTzQqPVj8.png?scale-down-to=1024"),
    }
    return salida


def relativas(doc, prefijo):
    """Convierte rutas absolutas (/css, /img...) en relativas para que el sitio
    funcione en cualquier servidor, no solo en la raiz del dominio."""
    import re
    inicio = prefijo or "./"
    doc = doc.replace('href="/"', f'href="{inicio}"')
    doc = doc.replace('href="/#', f'href="{prefijo}index.html#')
    doc = re.sub(r'(href|src|srcset|data-full)="/(?!/)', lambda m: f'{m.group(1)}="{prefijo}', doc)
    doc = re.sub(r', /(?=img/)', f', {prefijo}', doc)
    return doc


def main():
    (RAIZ / "index.html").write_text(relativas(pagina_inicio(), ""))
    (RAIZ / "fotografia.html").write_text(relativas(pagina_fotografia(), ""))
    (RAIZ / "proyectos").mkdir(exist_ok=True)
    for slug, contenido in proyectos().items():
        (RAIZ / "proyectos" / f"{slug}.html").write_text(relativas(contenido, "../"))
    # favicon: isotipo en tinta
    (RAIZ / "img" / "favicon.svg").write_text(
        (RAIZ / "img" / "isotipo.svg").read_text().replace("#333333", "#1a1a1a"))
    print("Listo: index.html, fotografia.html y", len(proyectos()), "proyectos")


if __name__ == "__main__":
    main()
