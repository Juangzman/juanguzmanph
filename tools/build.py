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


def local(nombre, w, h, alt, sizes="100vw", lazy=True, cls=""):
    """Imagen guardada en /img con versiones 800 y 1600 en webp y jpg."""
    carga = 'loading="lazy" ' if lazy else 'fetchpriority="high" '
    c = f' class="{cls}"' if cls else ""
    return (f'<picture{c}><source type="image/webp" srcset="/img/{nombre}-800.webp 800w, /img/{nombre}-1600.webp 1600w" sizes="{sizes}">'
            f'<img src="/img/{nombre}-1600.jpg" srcset="/img/{nombre}-800.jpg 800w, /img/{nombre}-1600.jpg 1600w" sizes="{sizes}" '
            f'width="{w}" height="{h}" {carga}decoding="async" alt="{e(alt)}"></picture>')


def full(f, w, h):
    return f"{CDN}{f}?scale-down-to={2048 if max(w, h) > 2048 else max(w, h)}"


# ----------------------------------------------------------------------------
# Datos: fotografia (generados por tools/procesar.py desde el SSD)
# ----------------------------------------------------------------------------
import json
_FOTOS = json.loads((RAIZ / "tools" / "fotos.json").read_text())
_DIS = json.loads((RAIZ / "tools" / "diseno.json").read_text())
NOMBRES = {"musica": "Música", "deportes": "Deportes", "gastronomia": "Gastronomía", "moda": "Moda"}
CATEGORIAS = [(k, NOMBRES[k], [(s, w, h) for s, w, h in _FOTOS[k]]) for k in NOMBRES]
DIM = {s: (w, h) for k in _FOTOS for s, w, h in _FOTOS[k]}


def foto(slug, alt, sizes="100vw", lazy=True, cls=""):
    """Foto propia optimizada en /img/f (800 y 1600 px, webp + jpg)."""
    w, h = DIM[slug]
    return local("f/" + slug, w, h, alt, sizes, lazy, cls)


def pieza(slug, alt, sizes="100vw", lazy=True):
    """Pieza de diseño optimizada en /img/d."""
    w, h = _DIS[slug]
    return local("d/" + slug, w, h, alt, sizes, lazy)


PORTADAS = {"musica": "musica-02", "deportes": "deportes-02", "gastronomia": "gastronomia-01", "moda": "moda-01"}
ORDEN_INICIO = ["musica", "deportes", "gastronomia", "moda"]

# Hero: (horizontal para escritorio, vertical para celular, categoria, descripcion)
HERO = [
    ("musica-01", "musica-02", "Música", "Show en vivo con luces sobre el escenario"),
    ("deportes-14", "deportes-02", "Deportes", "Ciclista de mountain bike en un sendero de montaña"),
    ("gastronomia-10", "gastronomia-01", "Gastronomía", "Hamburguesa con papas sobre una mesa de madera"),
    ("musica-06", "musica-03", "Música", "Banda en blanco y negro con haces de luz"),
    ("moda-05", "moda-01", "Moda", "Producción de trajes de baño junto a una pileta"),
]

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
    og = imagen_og or f"{SITIO}/img/f/musica-01-1600.jpg"
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
TRABAJOS = [  # (titulo, rubro, tipo, url, slug de imagen, alt)
    ("Villguz Refrigeración", "Rebranding, redes y web", "Diseño", "/proyectos/villguz.html",
     ("d", "vg-remera-espalda"), "Remera de trabajo con la nueva marca de Villguz"),
    ("Tucumán Urban Indie", "Conciertos", "Fotografía", "/fotografia.html#musica",
     ("f", "musica-05"), "Cantante en el escenario con luces violetas"),
    ("Batalla de Tucumán", "Mountain bike", "Fotografía", "/fotografia.html#deportes",
     ("f", "deportes-01"), "Ciclista bajando un terraplén de piedras"),
    ("Tete Pizzería", "Gastronomía", "Fotografía", "/fotografia.html#gastronomia",
     ("f", "gastronomia-01"), "Porción de pizza con queso estirándose"),
    ("Concesionarias", "Placas y video para redes", "Diseño", "/proyectos/automotriz.html",
     ("d", "fiat-strada"), "Placa de financiación de Fiat Strada"),
    ("Defensores FC", "Fútbol", "Fotografía", "/fotografia.html#deportes",
     ("f", "deportes-27"), "Camiseta número 10 de Defensores FC"),
]

SERVICIOS = [
    ("ph-camera", "Fotografía", "Gastronomía, producto, deportes, conciertos, eventos y moda, con dirección de arte en cada sesión."),
    ("ph-pen-nib", "Identidad visual", "Logotipo, manual de marca y sistema gráfico para que tu marca se vea igual en todos lados."),
    ("ph-devices", "UX/UI y web", "Sitios y plataformas pensados para tu cliente, prototipados en Figma y listos para usar."),
    ("ph-instagram-logo", "Redes y <span class=\"nw\">e-commerce</span>", "Carruseles, historias y campañas que acompañan tus ventas."),
    ("ph-film-slate", "Filmmaking", "Reels y videos cortos con la misma mirada que mi fotografía."),
]

FORMACION = [
    ("Lic. en Diseño Digital", "Universidad del Este, en curso"),
    ("Marketing Digital y E-commerce", "EAE Madrid, 2019"),
    ("Fotografía Social y Fotoperiodismo", "UBA, 2020"),
    ("Diseño Web HTML y CSS", "Coderhouse, 2022"),
]
HERRAMIENTAS = ["Figma", "Photoshop", "Illustrator", "Lightroom", "After Effects", "CapCut", "Canva", "Notion"]


def img_trabajo(ref, alt, sizes):
    tipo, slug = ref
    return foto(slug, alt, sizes) if tipo == "f" else pieza(slug, alt, sizes)


def hero():
    slides = ""
    for i, (ancha, alta, cat, alt) in enumerate(HERO):
        wa, ha = DIM[ancha]
        carga = 'fetchpriority="high"' if i == 0 else 'loading="lazy"'
        slides += f"""    <picture class="diapo{' activa' if i == 0 else ''}" data-cat="{cat}">
      <source media="(max-width: 699px)" type="image/webp" srcset="/img/f/{alta}-800.webp 800w, /img/f/{alta}-1600.webp 1600w" sizes="100vw">
      <source media="(max-width: 699px)" srcset="/img/f/{alta}-800.jpg 800w, /img/f/{alta}-1600.jpg 1600w" sizes="100vw">
      <source type="image/webp" srcset="/img/f/{ancha}-800.webp 800w, /img/f/{ancha}-1600.webp 1600w" sizes="100vw">
      <img src="/img/f/{ancha}-1600.jpg" width="{wa}" height="{ha}" {carga} decoding="async" alt="{e(alt)}">
    </picture>
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
    <div class="hero__estado" data-r style="--d:3" aria-hidden="true">
      <span class="hero__cat" data-hero-cat>{HERO[0][2]}</span>
      <span class="hero__num"><span data-hero-num>01</span> / {len(HERO):02d}</span>
      <span class="hero__barra"><span data-hero-barra></span></span>
    </div>
  </div>
</section>
"""


def pagina_inicio():
    filas = ""
    for i, (titulo, cat, tipo, url, ref, alt) in enumerate(TRABAJOS):
        filas += f"""<li data-r style="--d:{i % 3}"><a class="fila" href="{url}">
      <span class="fila__n">{i + 1:02d}</span>
      <div class="fila__img img-carga">{img_trabajo(ref, alt, "(min-width: 900px) 300px, 100vw")}</div>
      <div class="fila__cuerpo"><span class="fila__titulo">{titulo}</span><span class="fila__meta"><span>{tipo}</span><span>{cat}</span></span></div>
    </a></li>
"""
    conteo = {k: len(f) for k, _, f in CATEGORIAS}
    cats = ""
    for i, k in enumerate(ORDEN_INICIO):
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
    <p class="intro__frase" data-r>Ayudo a marcas, negocios y personas a profesionalizar su imagen, <em>del lente al píxel.</em></p>
    <div class="intro__acciones" data-r style="--d:1">
      <a class="btn btn--primario" href="#trabajos">Ver trabajos {flecha()}</a>
      <a class="btn btn--secundario" href="#contacto">Escribime</a>
    </div>
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

<div class="banda paralaje" aria-hidden="true">{foto("deportes-13", "", "100vw")}</div>

<section class="seccion" id="fotografia" aria-labelledby="t-foto">
  <div class="wrap">
    <div class="seccion__cab">
      <div style="display:grid;gap:20px">
        <h2 id="t-foto" data-r>Fotografía</h2>
        <p class="lead" data-r style="--d:1">Música, deporte, gastronomía y moda. Cada imagen con un propósito claro.</p>
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
    <div class="sobre__foto img-carga paralaje" data-r>{remota("mS6satP1zghi9fVVNLxIgfro8.jpg", 3195, 4792, "Retrato de Juan Guzman", "(min-width: 900px) 40vw, 100vw")}</div>
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
                   "Fotógrafo y diseñador digital en Tucumán. Fotografía de conciertos, deportes, gastronomía y moda, identidad visual, UX/UI y contenido para redes.",
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
        figs += f'<figure data-cat="{k}" data-nombre="{n}" data-full="/img/f/{slug}-1600.webp"><button type="button" class="img-carga" aria-label="Ampliar {e(alt)}">{img}</button></figure>\n'
    total = len(orden)
    chips = f'<button class="chip" type="button" data-filtro="todo" aria-pressed="true">Todo<sup>{total}</sup></button>'
    chips += "".join(f'<button class="chip" type="button" data-filtro="{k}" aria-pressed="false">{n}<sup>{len(f)}</sup></button>'
                     for k, n, f in CATEGORIAS)
    cuerpo = f"""{navegacion("fotografia")}
<main id="contenido">
<div class="wrap pag-cab">
  <h1 class="lineas" style="font-size:clamp(64px,15vw,184px)"><span><span style="--i:0">Fotografía</span></span></h1>
  <p class="lead" data-r style="--d:2">Música, deporte, gastronomía y moda. Tocá cualquier foto para verla en grande.</p>
</div>
<div class="filtros"><div class="wrap filtros__in" role="toolbar" aria-label="Filtrar por categoría">{chips}</div></div>
<div class="wrap"><div class="galeria">
{figs}</div></div>
</main>
{contacto()}"""
    return (cabeza("Fotografía · Juan Guzman",
                   "Galería de fotografía de Juan Guzman: conciertos, deportes, gastronomía y moda en Tucumán.",
                   "/fotografia.html") + cuerpo + cierre(visor=True))


# ----------------------------------------------------------------------------
# Proyectos de diseno
# ----------------------------------------------------------------------------
def fig(slug, alt, cls, ratio=None, sizes="(min-width: 900px) 33vw, 50vw", claro=False):
    st = f' style="aspect-ratio:{ratio}"' if ratio else ""
    c = " claro" if claro else ""
    return f'<figure class="{cls}{c} img-carga" data-r{st}>{pieza(slug, alt, sizes)}</figure>'


def video(src, poster, cls, etiqueta):
    return (f'<figure class="{cls}" data-r style="aspect-ratio:9/16"><video data-auto muted loop playsinline preload="none" '
            f'poster="{poster}" src="{src}" aria-label="{e(etiqueta)}"></video></figure>')


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
  <a class="siguiente" href="{sig_url}"><span class="etiqueta">Siguiente</span><strong>{sig_titulo} {flecha()}</strong></a>
</div>
</main>
{contacto()}"""
    import re as _re
    return cabeza(_re.sub(r"<[^>]+>", "", titulo) + " · Juan Guzman", desc, f"/proyectos/{slug}.html", og) + cuerpo + cierre()


def proyectos():
    villguz = f"""
  <div class="portada img-carga paralaje" data-r>{pieza("vg-web-hero", "Portada de la web de Villguz con las marcas oficiales", "(min-width: 900px) 90vw, 100vw", lazy=False)}</div>
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
  {bloque("Plataforma digital", "Diseñé una plataforma para gestionar servicios técnicos y turnos, pensada para que el cliente resuelva todo desde el celular.", puntos=["Pedido de servicio digital para reducir esperas", "Información de pagos y facturación integrada", "Turnos online que llegan por WhatsApp"])}
  <div class="mosaico">
    <div class="pantalla c6 ancho img-carga" data-r>{remota("zP6jGJwKEB57uMsX9el3H6AU4I.jpg", 786, 11552, "Versión móvil de la web de Villguz", "(min-width: 900px) 45vw, 100vw")}</div>
    <div class="c6 ancho" data-r style="display:grid;align-content:end;gap:20px;padding:8px 0">
      {fig("vg-web-banner", "Banner de la web con las marcas oficiales", "", "1920/900", "(min-width: 900px) 45vw, 100vw")}
      <p class="texto">La web está en línea y la usan los clientes de Villguz para pedir turnos, consultar el estado de su equipo y contactar al equipo técnico.</p>
      <a class="btn btn--primario" href="https://www.villguzrefrigeracion.com/" target="_blank" rel="noopener" style="width:fit-content">Ver la web en vivo {flecha("ph-arrow-up-right")}</a>
    </div>
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
    {video("/video/yaris.mp4", "/video/yaris.jpg", "c4 desplazado", "Video de lanzamiento del Toyota Yaris Cross")}
    {video("/video/villguz-logo.mp4", "/video/villguz-logo.jpg", "c4", "Animación del logotipo de Villguz")}
  </div>"""

    return {
        "villguz": pagina_proyecto(
            "villguz", "Villguz Refrigeración",
            "Rebranding, redes, gráfica y experiencia digital para un servicio técnico oficial de línea blanca en Tucumán.",
            [("Cliente", "Villguz Refrigeración"), ("Servicios", "Identidad, redes, gráfica y web"),
             ("Herramientas", "Illustrator, Photoshop, After Effects, Figma"),
             ("En línea", '<a class="link" href="https://www.villguzrefrigeracion.com/" target="_blank" rel="noopener">villguzrefrigeracion.com</a>')],
            villguz, "Concesionarias", "/proyectos/automotriz.html",
            "Caso de estudio: rebranding, redes, gráfica y plataforma web para Villguz Refrigeración.",
            f"{SITIO}/img/d/vg-web-hero-1600.jpg"),
        "automotriz": pagina_proyecto(
            "automotriz", "Concesionarias",
            "Placas de financiación y video vertical para concesionarias de autos en Tucumán.",
            [("Rubro", "Automotriz"), ("Formatos", "Historias y reels"),
             ("Servicios", "Diseño gráfico y motion"), ("Herramientas", "Photoshop, After Effects")],
            auto, "Villguz Refrigeración", "/proyectos/villguz.html",
            "Placas de financiación y video para concesionarias, diseñados por Juan Guzman.",
            f"{SITIO}/img/d/fiat-strada-1600.jpg"),
    }


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
    (RAIZ / "proyectos").mkdir(exist_ok=True)
    for slug, contenido in proyectos().items():
        (RAIZ / "proyectos" / f"{slug}.html").write_text(relativas(contenido, "../"))
    # favicon: isotipo en tinta
    (RAIZ / "img" / "favicon.svg").write_text(
        (RAIZ / "img" / "isotipo.svg").read_text().replace("#333333", "#1a1a1a"))
    print("Listo: index.html, fotografia.html y", len(proyectos()), "proyectos")


if __name__ == "__main__":
    main()
