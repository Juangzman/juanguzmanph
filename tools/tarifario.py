"""Pagina del tarifario: precios de referencia + cotizador (juanguzmanph.com/tarifario/).

La genera tools/build.py. Los precios se editan en tools/tarifario.json.
La logica del cotizador esta en tarifario/app.js y el estilo en tarifario/tarifario.css.
"""
import json
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
DATOS = json.loads((RAIZ / "tools" / "tarifario.json").read_text())


def pesos(n):
    return "$" + f"{n:,}".replace(",", ".")


def _items_por_id():
    return {it["id"]: it for c in DATOS["categorias"] for g in c["grupos"] for it in g["items"]}


def referencias(b):
    """Lista completa de precios, plegada: para consultar de un vistazo y para que Google la lea."""
    e = b.e
    bloques = ""
    for c in DATOS["categorias"]:
        filas = ""
        for g in c["grupos"]:
            filas += f'<tr class="tf-tabla__grupo"><th colspan="3" scope="colgroup">{e(g["titulo"])}</th></tr>'
            for it in g["items"]:
                filas += (f'<tr><th scope="row">{e(it["nombre"])}<small>{e(it["detalle"])}</small></th>'
                          f'<td>{pesos(it["min"])} – {pesos(it["max"])}</td><td class="meta">por {e(it["unidad"])}</td></tr>')
        bloques += f"""
    <details class="tf-ref">
      <summary><span>{e(c["titulo"])}</span><span class="meta">{sum(len(g["items"]) for g in c["grupos"])} servicios</span></summary>
      <table class="tf-tabla"><tbody>{filas}</tbody></table>
    </details>"""
    por_id = _items_por_id()
    filas = ""
    for co in DATOS["combos"]:
        its = [por_id[x] for x in co["items"]]
        f = 1 - co["descuento"] / 100
        filas += (f'<tr><th scope="row">{e(co["nombre"])}<small>{e(" + ".join(x["nombre"] for x in its))} · {co["descuento"]}% menos</small></th>'
                  f'<td>{pesos(round(sum(x["min"] for x in its) * f, -3))} – {pesos(round(sum(x["max"] for x in its) * f, -3))}</td><td class="meta">combo</td></tr>')
    bloques += f"""
    <details class="tf-ref">
      <summary><span>Combos</span><span class="meta">{len(DATOS["combos"])} combos</span></summary>
      <table class="tf-tabla"><tbody>{filas}</tbody></table>
    </details>"""
    return f"""<section class="tf-seccion" id="precios" aria-labelledby="t-precios">
  <div class="tf-seccion__cab">
    <h2 id="t-precios" data-r>Todos los precios</h2>
    <p class="texto" data-r style="--d:1">La lista completa de referencias, por si querés verla de un vistazo. {e(DATOS["aviso"])}</p>
  </div>
  <div class="tf-refs">{bloques}
  </div>
</section>"""


def asistente(b):
    e = b.e
    return f"""<section class="tf-asis" id="cotizar" aria-label="Asistente para armar el presupuesto">
  <div class="tf-asis__pasos">
    <div class="tf-asis__barra">
      <button class="volver" type="button" data-atras hidden>{b.flecha("ph-arrow-left")} Volver</button>
      <ol class="tf-progreso" data-progreso aria-label="Progreso"></ol>
    </div>
    <div class="tf-escena" data-escena></div>
  </div>
  <aside class="tf-lado" aria-label="Sugerencia de precio y presupuesto">
    <div class="tf-sug" data-sugerencia aria-live="polite"></div>
    <div class="tf-resu" id="resumen">
      <div class="tf-resu__cab"><h3>Tu presupuesto</h3><span class="meta" data-numero></span></div>
      <ol class="tf-resu__lista" data-resumen></ol>
      <p class="tf-resu__vacio meta" data-vacio>Todavía está vacío. Respondé las preguntas y los servicios aparecen acá.</p>
      <dl class="tf-totales" data-totales></dl>
      <button class="btn btn--primario" type="button" data-armar hidden>Armar el presupuesto {b.flecha()}</button>
    </div>
    <p class="tf-aviso-precios"><i class="ph-light ph-info" aria-hidden="true"></i><span>{e(DATOS["aviso"])}</span></p>
  </aside>
</section>"""


def metodo(b, n):
    e = b.e
    usadas = []
    for c in DATOS["categorias"]:
        for g in c["grupos"]:
            for it in g["items"]:
                if it["fuente"] not in usadas:
                    usadas.append(it["fuente"])
    fuentes = ""
    for k in usadas:
        f = DATOS["fuentes"][k]
        if f["url"]:
            fuentes += f'<li><a class="link" href="{f["url"]}" target="_blank" rel="noopener">{e(f["nombre"])} {b.flecha("ph-arrow-up-right")}</a></li>'
        else:
            fuentes += f"<li>{e(f['nombre'])}</li>"
    contenido = f"""<div class="tf-metodo">
    <div class="tf-metodo__col">
      <h3>Los rangos</h3>
      <ul class="puntos">
        <li>El mínimo apunta a emprendedores y particulares; el máximo, a pymes y empresas.</li>
        <li>Parten de tarifarios nacionales actualizados y se ajustan al mercado de Tucumán, que suele ubicarse en la franja media o baja.</li>
        <li>Son una guía, no una regla: tu experiencia, el alcance del trabajo y el cliente definen el precio final.</li>
        <li>Con la inflación, conviene presupuestar con validez corta y pedir seña.</li>
      </ul>
    </div>
    <div class="tf-metodo__col">
      <h3>El promedio de la comunidad</h3>
      <ul class="puntos">
        <li>Cuando alguien arma un presupuesto con sus propios precios, puede sumarlos de forma anónima.</li>
        <li>Solo se guarda el servicio y el precio. Nunca nombres, contactos ni datos del cliente.</li>
        <li>Se descartan los valores muy alejados del rango y se usan los aportes de los últimos 6 meses.</li>
        <li>El promedio aparece cuando un servicio junta al menos {DATOS['minimo_aportes']} aportes.</li>
      </ul>
    </div>
    <div class="tf-metodo__col">
      <h3>Fuentes</h3>
      <ul class="tf-fuentes">{fuentes}</ul>
      <button class="btn btn--secundario" type="button" data-compartir><i class="ph-light ph-share-network" aria-hidden="true"></i> Compartir el tarifario</button>
    </div>
  </div>"""
    return b.area("metodo", n, "Cómo se arma",
                  "Un tarifario abierto para fotógrafos, diseñadores y desarrolladores de Tucumán, y para quien quiera saber cuánto cuesta un trabajo antes de pedirlo.",
                  contenido)


def pagina_tarifario(b):
    datos_js = json.dumps(DATOS, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")
    extra = (f'<link rel="stylesheet" href="/tarifario/tarifario.css?v={b._ver("tarifario/tarifario.css")}">\n'
             '<link rel="manifest" href="/tarifario/manifest.webmanifest">\n'
             '<link rel="apple-touch-icon" href="/tarifario/icono-180.png">\n'
             '<meta name="apple-mobile-web-app-capable" content="yes">\n'
             '<meta name="apple-mobile-web-app-title" content="Tarifario">\n'
             f'<script defer src="/tarifario/app.js?v={b._ver("tarifario/app.js")}"></script>\n')
    cuerpo = f"""{b.navegacion("tarifario")}
<main id="contenido" class="tf" data-tarifario>
<div class="wrap pag-cab tf-cab">
  <h1 class="lineas" style="font-size:clamp(64px,15vw,184px)"><span><span style="--i:0">Tarifario</span></span></h1>
  <p class="lead" data-r style="--d:2">Armá un presupuesto de fotografía, diseño o web respondiendo unas preguntas simples. Te sugerimos precios de referencia para Tucumán; el valor final lo ponés vos.</p>
  <div class="tf-estado" data-r style="--d:3">
    <span class="etiqueta">Actualizado · {b.e(DATOS['actualizado'])}</span>
    <span class="etiqueta" data-com-estado hidden></span>
    <button class="link" type="button" data-instalar hidden>Instalar y usar sin internet {b.flecha("ph-download-simple")}</button>
  </div>
</div>
<div class="wrap">
{asistente(b)}
{referencias(b)}
<div class="areas tf-areas">
{metodo(b, 1)}</div>
</div>
</main>
<a class="tf-barra" href="#resumen" data-barra hidden><span class="nw">Presupuesto · <span data-barra-n>0</span></span><strong data-barra-total>$0</strong><i class="ph-light ph-arrow-down" aria-hidden="true"></i></a>
<div class="tf-hoja" id="hoja" aria-hidden="true"></div>
<script type="application/json" id="tf-datos">{datos_js}</script>
{b.contacto()}"""
    return (b.cabeza("Tarifario 2026 · Precios de fotografía, diseño y web en Tucumán",
                     f"Cotizador gratis con precios de referencia ({DATOS['actualizado']}) para fotografía, books, foto de producto, logos, manuales de marca y páginas web en Tucumán. Armá tu presupuesto y descargalo en PDF.",
                     "/tarifario/", f"{b.SITIO}/img/w/vg-web-hero-1600.jpg", extra) + cuerpo + b.cierre())
