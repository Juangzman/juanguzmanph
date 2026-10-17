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
                  f'<td>{pesos(int(round(sum(x["min"] for x in its) * f, -3)))} – {pesos(int(round(sum(x["max"] for x in its) * f, -3)))}</td><td class="meta">combo</td></tr>')
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


def herramienta(b):
    """Lista de servicios con su escala de precios a la izquierda; la hoja del presupuesto, en vivo, a la derecha."""
    e = b.e
    por_id = _items_por_id()
    k_fmt = lambda n: f"${n // 1000:,}k".replace(",", ".") if n < 1000000 else f"${n / 1000000:.2f}".rstrip("0").rstrip(".").replace(".", ",") + "M"

    def fila(attrs, nombre, det, mn, mx, unidad, buscar, extra=""):
        medio = round((mn + mx) / 2 / 1000) * 1000
        return f"""
      <li class="tf-fila" {attrs} data-buscar="{e(buscar.lower())}">
        <button class="tf-fila__btn" type="button" aria-pressed="false">
          <span class="tf-fila__txt"><span class="tf-fila__nombre">{nombre}</span><span class="tf-fila__det">{e(det)}</span></span>
          <span class="tf-fila__escala" aria-hidden="true"><span class="tf-escala"><i></i></span><span class="tf-escala__ext"><span>{k_fmt(mn)}</span><span>{k_fmt(mx)}</span></span></span>
          <span class="tf-fila__precio"><strong data-sug>{pesos(medio)}</strong><small>{e(unidad)}</small></span>
          <span class="tf-fila__mas" aria-hidden="true"><i class="ph-light ph-plus"></i></span>
        </button>
      </li>"""

    bloques, chips = "", ['<button class="chip activa" type="button" data-filtro="todo" aria-pressed="true">Todo</button>']
    for n, c in enumerate(DATOS["categorias"], 1):
        cant = sum(len(g["items"]) for g in c["grupos"])
        chips.append(f'<button class="chip" type="button" data-filtro="{c["id"]}" aria-pressed="false">{e(c["titulo"])} <sup>{cant}</sup></button>')
        filas = ""
        for g in c["grupos"]:
            filas += f'<li class="tf-fila-grupo" data-grupo-de="{c["id"]}">{e(g["titulo"])}</li>'
            filas += "".join(fila(f'data-add="{it["id"]}" data-min="{it["min"]}" data-max="{it["max"]}"', e(it["nombre"]), it["detalle"],
                                  it["min"], it["max"], f'/ {it["unidad"]}', f'{it["nombre"]} {it["detalle"]} {g["titulo"]} {c["titulo"]}')
                             for it in g["items"])
        bloques += f"""
    <section class="tf-rubro" data-rubro="{c["id"]}" aria-labelledby="r-{c["id"]}">
      <h2 class="tf-rubro__titulo" id="r-{c["id"]}"><span class="etiqueta">{n:02d}</span>{e(c["titulo"])}</h2>
      <ul class="tf-filas">{filas}
      </ul>
    </section>"""
    filas = ""
    for co in DATOS["combos"]:
        its = [por_id[x] for x in co["items"]]
        f = 1 - co["descuento"] / 100
        mn, mx = int(round(sum(x["min"] for x in its) * f, -3)), int(round(sum(x["max"] for x in its) * f, -3))
        filas += fila(f'data-combo="{co["id"]}" data-min="{mn}" data-max="{mx}"', f'{e(co["nombre"])} <em>−{co["descuento"]}%</em>',
                      " + ".join(x["nombre"] for x in its), mn, mx, "combo", f'{co["nombre"]} combo {" ".join(x["nombre"] for x in its)}')
    n = len(DATOS["categorias"]) + 1
    chips.append(f'<button class="chip" type="button" data-filtro="combos" aria-pressed="false">Combos <sup>{len(DATOS["combos"])}</sup></button>')
    bloques += f"""
    <section class="tf-rubro" data-rubro="combos" aria-labelledby="r-combos">
      <h2 class="tf-rubro__titulo" id="r-combos"><span class="etiqueta">{n:02d}</span>Combos</h2>
      <ul class="tf-filas">{filas}
      </ul>
    </section>"""
    seg = lambda nombre, ops, sel: (f'<div class="tf-seg" role="radiogroup" aria-label="{nombre}" data-seg="{nombre.lower()}">'
                                     + "".join(f'<button type="button" role="radio" aria-checked="{"true" if v == sel else "false"}" data-v="{v}">{t}</button>' for v, t in ops)
                                     + '<span class="tf-seg__marca" aria-hidden="true"></span></div>')
    return f"""<section class="tf-app" id="cotizar" aria-label="Cotizador">
  <div class="tf-cat">
    <div class="tf-control">
      <label class="tf-buscar"><i class="ph-light ph-magnifying-glass" aria-hidden="true"></i><span class="sr-only">Buscar un servicio</span><input type="search" placeholder="Buscar: logo, book, landing…" data-buscar autocomplete="off"><kbd aria-hidden="true">/</kbd></label>
      <div class="tf-control__fila">
        <div class="tf-control__grupo"><span class="tf-control__etq">Cliente</span>{seg("Cliente", [("particular", "Particular"), ("pyme", "Pyme"), ("empresa", "Empresa")], "pyme")}</div>
        <div class="tf-control__grupo"><span class="tf-control__etq">Tu experiencia</span>{seg("Experiencia", [("inicial", "Inicial"), ("media", "Media"), ("senior", "Senior")], "media")}</div>
      </div>
      <div class="tf-chips">{"".join(chips)}</div>
    </div>
    <div class="tf-lista" data-lista>{bloques}
      <p class="tf-sin-resultados" data-sin-resultados hidden>No encontré ese servicio. Probá con otra palabra.</p>
    </div>
  </div>
  <div class="tf-lado" data-lado>
    <div class="tf-lado__cab"><strong>Tu presupuesto</strong><button class="tf-icono" type="button" data-cerrar-lado aria-label="Cerrar"><i class="ph-light ph-x" aria-hidden="true"></i></button></div>
    <article class="tf-papel" data-papel aria-label="Vista previa del presupuesto"></article>
    <div class="tf-acc">
      <button class="btn btn--primario" type="button" data-pdf><i class="ph-light ph-file-pdf" aria-hidden="true"></i> Descargar PDF</button>
      <button class="btn btn--secundario" type="button" data-whatsapp><i class="ph-light ph-whatsapp-logo" aria-hidden="true"></i> WhatsApp</button>
    </div>
    <div class="tf-acc__mas">
      <button class="tf-boton" type="button" data-abrir-ajustes><i class="ph-light ph-sliders-horizontal" aria-hidden="true"></i> Ajustes</button>
      <button class="tf-boton" type="button" data-abrir-guardados><i class="ph-light ph-folder-simple" aria-hidden="true"></i> Guardados <span data-historial-n></span></button>
      <button class="tf-boton" type="button" data-nuevo><i class="ph-light ph-file-plus" aria-hidden="true"></i> Nuevo</button>
    </div>
    <p class="tf-aviso-precios"><i class="ph-light ph-info" aria-hidden="true"></i><span>{e(DATOS["aviso"])}</span></p>
  </div>
</section>
<dialog class="tf-dialogo" data-ajustes aria-labelledby="t-ajustes">
  <form method="dialog" class="tf-dialogo__in">
    <div class="tf-dialogo__cab"><h2 id="t-ajustes">Ajustes</h2><button class="tf-icono" value="cerrar" aria-label="Cerrar"><i class="ph-light ph-x" aria-hidden="true"></i></button></div>
    <h3 class="tf-grupo">Tu marca</h3>
    <div class="tf-logo">
      <div class="tf-logo__vista" data-logo-vista></div>
      <div class="tf-logo__txt">
        <span class="meta">Tu logo sale arriba del PDF. Mejor PNG con fondo transparente.</span>
        <div class="tf-logo__botones">
          <label class="tf-boton"><i class="ph-light ph-upload-simple" aria-hidden="true"></i> <span data-logo-txt>Subir logo</span><input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" data-logo hidden></label>
          <button class="tf-boton" type="button" data-quitar-logo hidden><i class="ph-light ph-trash" aria-hidden="true"></i> Quitar</button>
        </div>
      </div>
    </div>
    <div class="tf-campos">
      <label class="tf-campo"><span>Nombre o marca</span><input type="text" name="perfil_nombre" autocomplete="off"></label>
      <label class="tf-campo"><span>Qué hacés</span><input type="text" name="perfil_rubro" autocomplete="off" placeholder="Fotografía y diseño"></label>
      <label class="tf-campo"><span>WhatsApp</span><input type="text" inputmode="tel" name="perfil_whatsapp" autocomplete="off"></label>
      <label class="tf-campo"><span>Email</span><input type="text" inputmode="email" name="perfil_email" autocomplete="off"></label>
      <label class="tf-campo"><span>Instagram o web</span><input type="text" name="perfil_web" autocomplete="off"></label>
      <label class="tf-campo"><span>Ciudad</span><input type="text" name="perfil_ciudad" autocomplete="off"></label>
      <label class="tf-campo"><span>CUIT (opcional)</span><input type="text" inputmode="numeric" name="perfil_cuit" autocomplete="off"></label>
      <label class="tf-campo tf-campo--color"><span>Color del PDF</span><span class="tf-color"><input type="color" name="perfil_color" value="#c27a62"><span class="meta" data-color-txt>Se toma de tu logo</span></span></label>
    </div>
    <h3 class="tf-grupo">Este presupuesto</h3>
    <div class="tf-campos tf-campos--3">
      <label class="tf-campo"><span>Descuento %</span><input type="text" inputmode="decimal" name="descuento" placeholder="0"></label>
      <label class="tf-campo"><span>Urgencia %</span><input type="text" inputmode="decimal" name="urgencia" placeholder="0"></label>
      <label class="tf-campo"><span>Viáticos $</span><input type="text" inputmode="numeric" name="viaticos" placeholder="0"></label>
      <label class="tf-campo"><span>Seña %</span><input type="text" inputmode="decimal" name="sena" placeholder="50"></label>
      <label class="tf-campo"><span>Validez (días)</span><input type="text" inputmode="numeric" name="validez" placeholder="15"></label>
      <label class="tf-campo"><span>Contacto del cliente</span><input type="text" name="cliente_contacto" autocomplete="off"></label>
    </div>
    <label class="tf-check"><input type="checkbox" name="iva"><span>Sumar IVA 21% al total</span></label>
    <label class="tf-campo"><span>Condiciones</span><textarea name="notas" rows="4"></textarea></label>
    <label class="tf-aporte" data-aporte hidden><input type="checkbox" data-aportar><span>Sumar mis precios al promedio de Tucumán. Es anónimo: solo se envía el servicio y el precio.</span></label>
    <button class="btn btn--primario tf-dialogo__listo" value="listo">Listo</button>
  </form>
</dialog>
<dialog class="tf-dialogo" data-guardados aria-labelledby="t-guardados">
  <div class="tf-dialogo__in">
    <div class="tf-dialogo__cab"><h2 id="t-guardados">Guardados</h2><button class="tf-icono" type="button" data-cerrar-dialogo aria-label="Cerrar"><i class="ph-light ph-x" aria-hidden="true"></i></button></div>
    <ul class="tf-historial__lista" data-historial-lista></ul>
    <p class="meta" data-historial-vacio>Todavía no guardaste presupuestos. Se guardan solos cuando descargás el PDF o lo mandás por WhatsApp.</p>
    <div class="tf-historial__pie">
      <button class="tf-boton" type="button" data-exportar><i class="ph-light ph-download-simple" aria-hidden="true"></i> Exportar copia</button>
      <label class="tf-boton"><i class="ph-light ph-upload-simple" aria-hidden="true"></i> Importar copia<input type="file" accept="application/json,.json" data-importar hidden></label>
    </div>
    <p class="meta">Todo se guarda solo en este dispositivo. Con la copia lo pasás de la compu al celular.</p>
  </div>
</dialog>"""


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
  <h1 class="lineas" style="font-size:clamp(64px,11vw,148px)"><span><span style="--i:0">Tarifario</span></span></h1>
  <p class="lead" data-r style="--d:2">Elegí para quién es y tu experiencia: los precios de referencia se acomodan solos. Sumá servicios, ajustá lo que quieras y descargá el PDF con tu marca.</p>
  <div class="tf-estado" data-r style="--d:3">
    <span class="etiqueta">Actualizado · {b.e(DATOS['actualizado'])}</span>
    <span class="etiqueta" data-com-estado hidden></span>
    <button class="link" type="button" data-instalar hidden>Instalar y usar sin internet {b.flecha("ph-download-simple")}</button>
  </div>
</div>
<div class="wrap">
{herramienta(b)}
{referencias(b)}
<div class="areas tf-areas">
{metodo(b, 1)}</div>
</div>
</main>
<button class="tf-barra" type="button" data-barra hidden><span class="nw">Presupuesto · <span data-barra-n>0</span></span><strong data-barra-total>$0</strong><i class="ph-light ph-caret-up" aria-hidden="true"></i></button>
<div class="tf-hoja" id="hoja" aria-hidden="true"></div>
<script type="application/json" id="tf-datos">{datos_js}</script>
{b.contacto()}"""
    return (b.cabeza("Tarifario 2026 · Precios de fotografía, diseño y web en Tucumán",
                     f"Cotizador gratis con precios de referencia ({DATOS['actualizado']}) para fotografía, books, foto de producto, logos, manuales de marca y páginas web en Tucumán. Armá tu presupuesto y descargalo en PDF.",
                     "/tarifario/", f"{b.SITIO}/img/w/vg-web-hero-1600.jpg", extra) + cuerpo + b.cierre())
