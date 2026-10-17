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


def item_html(b, it):
    e = b.e
    medio = round((it["min"] + it["max"]) / 2 / 1000) * 1000
    return f"""<li class="tf-item" data-id="{it['id']}">
        <div class="tf-item__info">
          <h4>{e(it['nombre'])}</h4>
          <p>{e(it['detalle'])}</p>
        </div>
        <div class="tf-item__ref">
          <span class="tf-item__rango">{pesos(it['min'])} – {pesos(it['max'])}</span>
          <span class="meta">por {e(it['unidad'])}</span>
          <span class="tf-item__com" data-com hidden></span>
        </div>
        <div class="tf-item__accion">
          <label class="tf-precio"><span class="sr-only">Tu precio para {e(it['nombre'])}</span><span aria-hidden="true">$</span><input type="text" inputmode="numeric" autocomplete="off" placeholder="{f'{medio:,}'.replace(',', '.')}" data-precio></label>
          <button class="tf-sumar" type="button" data-sumar aria-pressed="false"><i class="ph-light ph-plus" aria-hidden="true"></i><span>Sumar</span></button>
        </div>
      </li>"""


def categoria(b, n, c):
    grupos = ""
    for g in c["grupos"]:
        items = "\n      ".join(item_html(b, it) for it in g["items"])
        grupos += f"""
  <div class="tf-grupo">
    <h3 class="tf-grupo__titulo">{b.e(g['titulo'])}</h3>
    <ul class="tf-lista">
      {items}
    </ul>
  </div>"""
    return b.area(c["id"], n, c["titulo"], b.e(c["texto"]), grupos)


def combos(b, n):
    por_id = _items_por_id()
    tarjetas = ""
    for i, co in enumerate(DATOS["combos"]):
        its = [por_id[x] for x in co["items"]]
        smin, smax = sum(x["min"] for x in its), sum(x["max"] for x in its)
        f = 1 - co["descuento"] / 100
        puntos = "".join(f"<li>{b.e(x['nombre'])}</li>" for x in its)
        tarjetas += f"""
    <article class="sistema tf-combo c6" data-combo="{co['id']}" data-r style="--d:{i % 2}">
      <span class="etiqueta">Combo · {co['descuento']}% menos</span>
      <h3>{b.e(co['nombre'])}</h3>
      <p class="texto">{b.e(co['para'])}</p>
      <ul class="puntos">{puntos}</ul>
      <div class="tf-combo__precio">
        <s class="meta" data-combo-suelto>{pesos(smin)} – {pesos(smax)}</s>
        <strong data-combo-total>{pesos(round(smin * f, -3))} – {pesos(round(smax * f, -3))}</strong>
        <span class="meta" data-combo-nota>Con los precios de referencia</span>
      </div>
      <button class="btn btn--secundario" type="button" data-sumar-combo><i class="ph-light ph-plus" aria-hidden="true"></i> Sumar combo</button>
    </article>"""
    return b.area("combos", n, "Combos",
                  "Servicios que se piden juntos, con un descuento por contratarlos de una vez. El precio se calcula con tus propios valores: cargalos arriba y el combo se actualiza solo.",
                  f'<div class="mosaico tf-combos">{tarjetas}\n  </div>')


def presupuesto(b, n):
    contenido = """<div class="tf-presu" data-presu>
    <div class="tf-presu__cuerpo">
      <div class="tf-bloque">
        <div class="tf-bloque__cab"><h3>Servicios</h3><span class="meta" data-numero></span></div>
        <ol class="tf-lineas" data-lineas></ol>
        <p class="tf-vacio" data-vacio>Todavía no sumaste servicios. Elegilos de la lista de arriba, con tu precio o el de referencia, y aparecen acá.</p>
      </div>

      <fieldset class="tf-bloque">
        <legend><h3>Cliente</h3></legend>
        <div class="tf-campos">
          <label class="tf-campo"><span>Nombre o empresa</span><input type="text" name="cliente_nombre" autocomplete="off"></label>
          <label class="tf-campo"><span>Contacto</span><input type="text" name="cliente_contacto" autocomplete="off" placeholder="WhatsApp o email"></label>
        </div>
      </fieldset>

      <fieldset class="tf-bloque">
        <legend><h3>Tus datos</h3></legend>
        <p class="meta">Salen en el encabezado del PDF. Quedan guardados en este dispositivo.</p>
        <div class="tf-campos">
          <label class="tf-campo"><span>Tu nombre o marca</span><input type="text" name="perfil_nombre" autocomplete="name"></label>
          <label class="tf-campo"><span>Qué hacés</span><input type="text" name="perfil_rubro" placeholder="Fotografía y diseño"></label>
          <label class="tf-campo"><span>WhatsApp</span><input type="tel" name="perfil_whatsapp" autocomplete="tel"></label>
          <label class="tf-campo"><span>Email</span><input type="email" name="perfil_email" autocomplete="email"></label>
          <label class="tf-campo"><span>Instagram o web</span><input type="text" name="perfil_web" autocomplete="off"></label>
          <label class="tf-campo"><span>Ciudad</span><input type="text" name="perfil_ciudad" value="San Miguel de Tucumán"></label>
        </div>
      </fieldset>

      <fieldset class="tf-bloque">
        <legend><h3>Condiciones</h3></legend>
        <label class="tf-campo"><span class="sr-only">Condiciones del presupuesto</span><textarea name="notas" rows="5"></textarea></label>
      </fieldset>
    </div>

    <aside class="tf-presu__panel" aria-label="Totales">
      <div class="tf-ajustes">
        <label class="tf-campo"><span>Descuento %</span><input type="text" inputmode="decimal" name="descuento" placeholder="0"></label>
        <label class="tf-campo"><span>Urgencia %</span><input type="text" inputmode="decimal" name="urgencia" placeholder="0"></label>
        <label class="tf-campo"><span>Viáticos $</span><input type="text" inputmode="numeric" name="viaticos" placeholder="0"></label>
        <label class="tf-campo"><span>Seña %</span><input type="text" inputmode="decimal" name="sena" placeholder="50"></label>
        <label class="tf-campo"><span>Validez (días)</span><input type="text" inputmode="numeric" name="validez" placeholder="15"></label>
      </div>
      <dl class="tf-totales" data-totales></dl>
      <label class="tf-aporte" data-aporte hidden>
        <input type="checkbox" name="aportar" checked>
        <span>Sumar mis precios al promedio de Tucumán. Es anónimo: solo se envía el servicio y el precio, nunca tus datos ni los del cliente.</span>
      </label>
      <div class="tf-acciones">
        <button class="btn btn--primario" type="button" data-pdf><i class="ph-light ph-file-pdf" aria-hidden="true"></i> Descargar PDF</button>
        <button class="btn btn--secundario" type="button" data-whatsapp><i class="ph-light ph-whatsapp-logo" aria-hidden="true"></i> Enviar por WhatsApp</button>
        <div class="tf-acciones__fila">
          <button class="tf-boton" type="button" data-guardar><i class="ph-light ph-floppy-disk" aria-hidden="true"></i> Guardar</button>
          <button class="tf-boton" type="button" data-nuevo><i class="ph-light ph-file-plus" aria-hidden="true"></i> Nuevo</button>
        </div>
      </div>
      <p class="tf-aviso" data-aviso role="status" aria-live="polite"></p>
    </aside>

    <details class="tf-historial" data-historial>
      <summary><span>Presupuestos guardados</span> <span class="meta" data-historial-n>0</span></summary>
      <ul class="tf-historial__lista" data-historial-lista></ul>
      <div class="tf-historial__pie">
        <button class="tf-boton" type="button" data-exportar><i class="ph-light ph-download-simple" aria-hidden="true"></i> Exportar copia</button>
        <label class="tf-boton"><i class="ph-light ph-upload-simple" aria-hidden="true"></i> Importar copia<input type="file" accept="application/json,.json" data-importar hidden></label>
      </div>
      <p class="meta">Tus presupuestos y precios se guardan solo en este dispositivo. Con la copia los pasás de la compu al celular.</p>
    </details>
  </div>"""
    return b.area("presupuesto", n, "Presupuesto",
                  "Ajustá cantidades y precios, sumá descuento, urgencia o viáticos, y descargalo en PDF con tus datos. Funciona sin internet.",
                  contenido)


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
    secciones = [categoria(b, i + 1, c) for i, c in enumerate(DATOS["categorias"])]
    n = len(secciones)
    secciones += [combos(b, n + 1), presupuesto(b, n + 2), metodo(b, n + 3)]
    chips = [(c["id"], c["titulo"]) for c in DATOS["categorias"]] + [
        ("combos", "Combos"), ("presupuesto", "Presupuesto"), ("metodo", "Cómo se arma")]
    chips_html = "".join(f'<a class="chip" href="#{k}">{t}</a>' for k, t in chips)
    datos_js = json.dumps(DATOS, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")
    extra = (f'<link rel="stylesheet" href="/tarifario/tarifario.css?v={b._ver("tarifario/tarifario.css")}">\n'
             '<link rel="manifest" href="/tarifario/manifest.webmanifest">\n'
             '<link rel="apple-touch-icon" href="/tarifario/icono-180.png">\n'
             '<meta name="apple-mobile-web-app-capable" content="yes">\n'
             '<meta name="apple-mobile-web-app-title" content="Tarifario">\n'
             f'<script defer src="/tarifario/app.js?v={b._ver("tarifario/app.js")}"></script>\n')
    cuerpo = f"""{b.navegacion("tarifario")}
<main id="contenido" class="tf" data-tarifario>
<div class="wrap pag-cab">
  <h1 class="lineas" style="font-size:clamp(64px,15vw,184px)"><span><span style="--i:0">Tarifario</span></span></h1>
  <p class="lead" data-r style="--d:2">Precios de referencia para fotografía, diseño y web en Tucumán. Armá tu presupuesto con tus propios valores y descargalo en PDF.</p>
  <div class="tf-estado" data-r style="--d:3">
    <span class="etiqueta">Actualizado · {b.e(DATOS['actualizado'])}</span>
    <span class="etiqueta" data-com-estado hidden></span>
    <button class="link" type="button" data-instalar hidden>Instalar y usar sin internet {b.flecha("ph-download-simple")}</button>
  </div>
</div>
<nav class="filtros" aria-label="Secciones del tarifario"><div class="wrap filtros__in" data-espia>{chips_html}</div></nav>
<div class="wrap areas">
{"".join(secciones)}</div>
</main>
<a class="tf-barra" href="#presupuesto" data-barra hidden><span class="nw">Presupuesto · <span data-barra-n>0</span></span><strong data-barra-total>$0</strong><i class="ph-light ph-arrow-down" aria-hidden="true"></i></a>
<div class="tf-hoja" id="hoja" aria-hidden="true"></div>
<script type="application/json" id="tf-datos">{datos_js}</script>
{b.contacto()}"""
    return (b.cabeza("Tarifario 2026 · Precios de fotografía, diseño y web en Tucumán",
                     f"Precios de referencia actualizados ({DATOS['actualizado']}) para fotografía, books, foto de producto, logos, manuales de marca y páginas web en Tucumán. Con cotizador gratis y PDF.",
                     "/tarifario/", f"{b.SITIO}/img/w/vg-web-hero-1600.jpg", extra) + cuerpo + b.cierre())
