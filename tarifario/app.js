/* Tarifario · asistente para armar presupuestos
   Preguntas paso a paso (qué → tipo → servicio → precio), sugerencia de precio al costado
   y, al final, cliente, ajustes y PDF. Todo se guarda en este dispositivo (localStorage);
   lo único que sale es el aporte anónimo al promedio (servicio + precio), y solo si se tilda. */
(() => {
  const raiz = document.querySelector('[data-tarifario]');
  const fuente = document.getElementById('tf-datos');
  if (!raiz || !fuente) return;
  const D = JSON.parse(fuente.textContent);
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Catalogo ---------- */
  const ITEMS = {};
  const CATS = {};
  D.categorias.forEach((c) => {
    CATS[c.id] = c;
    c.grupos.forEach((g, gi) => g.items.forEach((it) => { ITEMS[it.id] = Object.assign(it, { cat: c.id, grupo: gi }); }));
  });
  const COMBOS = {};
  D.combos.forEach((co) => { COMBOS[co.id] = co; });
  const medio = (it) => Math.round((it.min + it.max) / 2 / 1000) * 1000;
  const rango = (its) => [Math.min(...its.map((i) => i.min)), Math.max(...its.map((i) => i.max))];
  const itemsDe = (c) => c.grupos.flatMap((g) => g.items);
  // "desde": el servicio principal mas barato (el primer grupo), sin extras sueltos como un retoque
  const desde = (c) => Math.min(...c.grupos[0].items.map((i) => i.min));

  /* ---------- Utilidades ---------- */
  const guardado = {
    get(k, def) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : def; } catch (e) { return def; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* sin espacio o modo privado */ } },
  };
  const fmt = (n) => '$' + Math.round(n || 0).toLocaleString('es-AR');
  const miles = (n) => (n ? Math.round(n).toLocaleString('es-AR') : '');
  const entero = (s) => { const d = String(s || '').replace(/\D/g, ''); return d ? Number(d) : 0; };
  const decimal = (s) => { const n = parseFloat(String(s || '').replace(',', '.').replace(/[^\d.]/g, '')); return Number.isFinite(n) ? n : 0; };
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
  const hoyISO = () => new Date().toISOString().slice(0, 10);
  const fecha = (iso, dias = 0) => { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + dias); return d.toLocaleDateString('es-AR'); };
  const nro = (n) => (n ? String(n).padStart(4, '0') : '');
  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];
  const flecha = (c = 'ph-arrow-right') => `<i class="ph-light ${c}" aria-hidden="true"></i>`;

  let tostadaT;
  const tostada = (txt) => {
    let t = $('.tf-tostada');
    if (!t) { t = document.createElement('div'); t.className = 'tf-tostada'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.textContent = txt;
    requestAnimationFrame(() => t.classList.add('visible'));
    clearTimeout(tostadaT);
    tostadaT = setTimeout(() => t.classList.remove('visible'), 3800);
  };

  /* ---------- Estado ---------- */
  const NOTAS = 'Para confirmar el trabajo se abona la seña indicada; el saldo, contra entrega.\nIncluye dos rondas de cambios. Los cambios extra se cotizan aparte.\nPrecios en pesos argentinos.';
  const nuevo = () => ({
    id: uid(), numero: 0, fecha: hoyISO(), lineas: [],
    cliente: { nombre: '', contacto: '' },
    ajustes: { descuento: '', urgencia: '', viaticos: '', sena: '', validez: '' },
    notas: NOTAS, aportado: false,
  });
  let actual = guardado.get('tf-actual', null) || nuevo();
  let perfil = guardado.get('tf-perfil', { ciudad: 'San Miguel de Tucumán' });
  let precios = guardado.get('tf-precios', {});
  let historial = guardado.get('tf-historial', []);
  let comunidad = guardado.get('tf-comunidad', null);
  actual.lineas = actual.lineas.filter((l) => (l.tipo === 'combo' ? l.items.every((s) => ITEMS[s.id]) : ITEMS[l.id]));
  const persistir = () => guardado.set('tf-actual', actual);
  const promedioCom = (id) => {
    const s = comunidad && comunidad.servicios && comunidad.servicios[id];
    return s && s.n >= (D.minimo_aportes || 5) ? s : null;
  };

  /* ---------- Totales ---------- */
  const totales = (p = actual) => {
    let bruto = 0, ahorro = 0;
    p.lineas.forEach((l) => {
      if (l.tipo === 'combo') {
        const s = l.items.reduce((a, x) => a + x.precio * x.cant, 0);
        bruto += s; ahorro += s * l.descuento / 100;
      } else bruto += l.precio * l.cant;
    });
    const neto = bruto - ahorro;
    const a = p.ajustes;
    const dPct = decimal(a.descuento), uPct = decimal(a.urgencia), sPct = a.sena === '' ? 50 : decimal(a.sena);
    const desc = neto * dPct / 100, urg = neto * uPct / 100, viat = entero(a.viaticos);
    const total = Math.max(0, neto - desc + urg + viat);
    return { bruto, ahorro, neto, dPct, desc, uPct, urg, viat, total, sPct, sena: total * sPct / 100, validez: entero(a.validez) || 15 };
  };
  const subtotalLinea = (l) => {
    if (l.tipo !== 'combo') return l.precio * l.cant;
    const s = l.items.reduce((a, x) => a + x.precio * x.cant, 0);
    return s - s * l.descuento / 100;
  };

  /* =========================================================
     Asistente: pasos deslizables
     ========================================================= */
  const escena = $('[data-escena]', raiz);
  const atras = $('[data-atras]', raiz);
  const progreso = $('[data-progreso]', raiz);
  const sug = $('[data-sugerencia]', raiz);
  let pila = [];            // pasos recorridos, para "Volver"
  let paso = null;          // { tipo, ...datos }
  let borrador = null;      // servicio o combo que se esta cotizando

  const ETAPAS = ['Qué', 'Tipo', 'Servicio', 'Precio', 'Cliente', 'Ajustes', 'Listo'];
  const etapaDe = (t) => ({ que: 0, tipo: 1, servicio: 2, combos: 2, precio: 3, combo: 3, otro: 3, cliente: 4, ajustes: 5, final: 6 }[t]);
  const pintarProgreso = () => {
    const n = etapaDe(paso.tipo);
    progreso.innerHTML = ETAPAS.map((t, i) => `<li class="${i < n ? 'hecho' : ''}${i === n ? ' actual' : ''}"${i === n ? ' aria-current="step"' : ''}><span>${t}</span></li>`).join('');
    atras.hidden = pila.length === 0;
  };

  const opcion = (attrs, titulo, bajada, precio, extra = '') => `
    <button class="tf-op" type="button" ${attrs}>
      <span class="tf-op__titulo">${esc(titulo)}</span>
      ${bajada ? `<span class="tf-op__bajada">${esc(bajada)}</span>` : ''}
      ${precio ? `<span class="tf-op__precio">${precio}</span>` : ''}${extra}
      ${flecha()}
    </button>`;

  const cabeza = (kicker, titulo, bajada = '') => `
    <span class="etiqueta tf-paso__kicker">${kicker}</span>
    <h2 class="tf-paso__titulo" tabindex="-1">${titulo}</h2>
    ${bajada ? `<p class="texto">${bajada}</p>` : ''}`;

  /* --- cada paso: html + que sugiere al costado --- */
  const PASOS = {
    que() {
      const ops = D.categorias.map((c) => {
        return opcion(`data-cat="${c.id}"`, c.titulo, c.bajada, `desde ${fmt(desde(c))}`);
      }).join('') + opcion('data-ir="combos"', 'Combos', 'Varios servicios juntos, con descuento.', `${D.combos.length} combos`);
      return cabeza('Empecemos', '¿Qué querés presupuestar?', 'Elegí una opción. Después vas a poder sumar más servicios al mismo presupuesto.')
        + `<div class="tf-ops tf-ops--grande">${ops}</div>`;
    },
    tipo({ cat }) {
      const c = CATS[cat];
      const ops = c.grupos.map((g, i) => {
        const [mn, mx] = rango(g.items);
        return opcion(`data-grupo="${i}"`, g.titulo, g.bajada, `${fmt(mn)} – ${fmt(mx)}`);
      }).join('');
      return cabeza(c.titulo, c.pregunta) + `<div class="tf-ops">${ops}</div>`;
    },
    servicio({ cat, grupo }) {
      const g = CATS[cat].grupos[grupo];
      const ops = g.items.map((it) => opcion(`data-item="${it.id}"`, it.nombre, it.detalle,
        `${fmt(it.min)} – ${fmt(it.max)} <small>por ${esc(it.unidad)}</small>`)).join('');
      return cabeza(`${CATS[cat].titulo} · ${g.titulo}`, '¿Cuál de estos?') + `<div class="tf-ops">${ops}</div>`;
    },
    combos() {
      const ops = D.combos.map((co) => {
        const its = co.items.map((x) => ITEMS[x]);
        const f = 1 - co.descuento / 100;
        const mn = Math.round(its.reduce((a, i) => a + i.min, 0) * f / 1000) * 1000;
        return opcion(`data-combo="${co.id}"`, co.nombre, its.map((i) => i.nombre).join(' + '), `desde ${fmt(mn)} · ${co.descuento}% menos`);
      }).join('');
      return cabeza('Combos', '¿Qué combo te sirve?', 'Servicios que se piden juntos. El descuento se aplica sobre tus propios precios.')
        + `<div class="tf-ops">${ops}</div>`;
    },
    precio() {
      const it = ITEMS[borrador.id];
      const com = promedioCom(it.id);
      return cabeza(esc(it.nombre), '¿Cuánto vas a cobrar?', esc(it.detalle))
        + deslizador(it, borrador.precio, com)
        + `<div class="tf-cant-fila">
            <span class="tf-cant-fila__txt">Cantidad <small class="meta">por ${esc(it.unidad)}</small></span>
            <div class="tf-cant"><button type="button" data-menos aria-label="Uno menos">−</button><input type="text" inputmode="numeric" value="${borrador.cant}" data-cant aria-label="Cantidad"><button type="button" data-mas aria-label="Uno más">+</button></div>
          </div>
          <div class="tf-paso__acciones">
            <button class="btn btn--primario" type="button" data-confirmar>${borrador.uid ? 'Guardar cambios' : 'Sumar al presupuesto'} ${flecha(borrador.uid ? 'ph-check' : 'ph-plus')}</button>
            ${borrador.uid ? '<button class="btn btn--secundario" type="button" data-quitar-borrador>Quitar del presupuesto</button>' : ''}
          </div>`;
    },
    combo() {
      const co = COMBOS[borrador.id];
      const filas = borrador.items.map((s, i) => {
        const it = ITEMS[s.id];
        return `<li><span>${esc(it.nombre)}<small class="meta">Referencia ${fmt(it.min)} – ${fmt(it.max)}</small></span>
          <label class="tf-precio"><span class="sr-only">Tu precio para ${esc(it.nombre)}</span><span aria-hidden="true">$</span><input type="text" inputmode="numeric" autocomplete="off" value="${miles(s.precio)}" data-sub="${i}"></label></li>`;
      }).join('');
      return cabeza(`Combo · ${co.descuento}% menos`, esc(co.nombre), esc(co.para))
        + `<p class="tf-paso__pregunta">¿Cuánto cobrás cada parte?</p>
          <ul class="tf-combo-items">${filas}</ul>
          <div class="tf-combo-total" data-combo-total></div>
          <div class="tf-paso__acciones">
            <button class="btn btn--primario" type="button" data-confirmar>${borrador.uid ? 'Guardar cambios' : 'Sumar al presupuesto'} ${flecha(borrador.uid ? 'ph-check' : 'ph-plus')}</button>
            ${borrador.uid ? '<button class="btn btn--secundario" type="button" data-quitar-borrador>Quitar del presupuesto</button>' : ''}
          </div>`;
    },
    otro({ nombre }) {
      return cabeza('Sumado', `${esc(nombre)} ya está en tu presupuesto. ¿Algo más?`)
        + `<div class="tf-ops tf-ops--grande">
            ${opcion('data-ir="que"', 'Sumar otro servicio', 'Fotografía, diseño, web o un combo.', '')}
            ${opcion('data-ir="cliente"', 'No, armar el presupuesto', 'Cargá el cliente, los ajustes y descargalo en PDF.', '')}
          </div>`;
    },
    cliente() {
      const p = perfil;
      const conPerfil = !!(p.nombre || p.logo);
      const campo = (name, label, valor, extra = '') => `<label class="tf-campo"><span>${label}</span><input type="text" name="${name}" value="${esc(valor || '')}" ${extra}></label>`;
      return cabeza('Datos', '¿Para quién es el presupuesto?')
        + `<div class="tf-campos">
            ${campo('cliente_nombre', 'Nombre o empresa', actual.cliente.nombre, 'autocomplete="off"')}
            ${campo('cliente_contacto', 'Contacto', actual.cliente.contacto, 'autocomplete="off" placeholder="WhatsApp o email"')}
          </div>
          <details class="tf-perfil"${conPerfil ? '' : ' open'}>
            <summary><span>Tu marca en el PDF</span><span class="meta">${conPerfil ? esc(p.nombre || 'Con logo') : 'Se guarda en este dispositivo'}</span></summary>
            <div class="tf-logo" data-logo-caja>
              <div class="tf-logo__vista" data-logo-vista>${p.logo ? `<img src="${p.logo}" alt="Tu logo">` : '<i class="ph-light ph-image-square" aria-hidden="true"></i>'}</div>
              <div class="tf-logo__txt">
                <strong>Tu logo</strong>
                <span class="meta">PNG o JPG, idealmente con fondo transparente. Sale arriba a la izquierda del PDF.</span>
                <div class="tf-logo__botones">
                  <label class="tf-boton">${flecha('ph-upload-simple')} ${p.logo ? 'Cambiar logo' : 'Subir logo'}<input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" data-logo hidden></label>
                  ${p.logo ? `<button class="tf-boton" type="button" data-quitar-logo>${flecha('ph-trash')} Quitar</button>` : ''}
                </div>
              </div>
            </div>
            <div class="tf-campos">
              ${campo('perfil_nombre', 'Tu nombre o marca', p.nombre, 'autocomplete="off"')}
              ${campo('perfil_rubro', 'Qué hacés', p.rubro, 'placeholder="Fotografía y diseño"')}
              ${campo('perfil_whatsapp', 'WhatsApp', p.whatsapp, 'inputmode="tel" autocomplete="off"')}
              ${campo('perfil_email', 'Email', p.email, 'inputmode="email" autocomplete="off"')}
              ${campo('perfil_web', 'Instagram o web', p.web, 'autocomplete="off"')}
              ${campo('perfil_ciudad', 'Ciudad', p.ciudad)}
            </div>
          </details>
          <div class="tf-paso__acciones"><button class="btn btn--primario" type="button" data-ir="ajustes">Continuar ${flecha()}</button></div>`;
    },
    ajustes() {
      const a = actual.ajustes;
      const campo = (name, label, valor, ph, modo = 'decimal') => `<label class="tf-campo"><span>${label}</span><input type="text" inputmode="${modo}" name="${name}" value="${esc(valor)}" placeholder="${ph}"></label>`;
      return cabeza('Ajustes', '¿Algún ajuste final?', 'Todo es opcional. Si no tocás nada, se usa una seña del 50% y validez de 15 días.')
        + `<div class="tf-campos tf-campos--3">
            ${campo('descuento', 'Descuento %', a.descuento, '0')}
            ${campo('urgencia', 'Recargo por urgencia %', a.urgencia, '0')}
            ${campo('viaticos', 'Viáticos $', miles(entero(a.viaticos)), '0', 'numeric')}
            ${campo('sena', 'Seña %', a.sena, '50')}
            ${campo('validez', 'Validez (días)', a.validez, '15', 'numeric')}
          </div>
          <label class="tf-campo"><span>Condiciones</span><textarea name="notas" rows="4">${esc(actual.notas)}</textarea></label>
          <div class="tf-paso__acciones"><button class="btn btn--primario" type="button" data-ir="final">Ver el presupuesto ${flecha()}</button></div>`;
    },
    final() {
      const t = totales();
      return cabeza('Listo', 'Tu presupuesto está listo', actual.cliente.nombre ? `Para ${esc(actual.cliente.nombre)} · Total ${fmt(t.total)}` : `Total ${fmt(t.total)}`)
        + `<div class="tf-final">
            <button class="btn btn--primario" type="button" data-pdf>${flecha('ph-file-pdf')} Descargar PDF</button>
            <button class="btn btn--secundario" type="button" data-whatsapp>${flecha('ph-whatsapp-logo')} Enviar por WhatsApp</button>
          </div>
          ${D.endpoint ? `<label class="tf-aporte"><input type="checkbox" data-aportar ${guardado.get('tf-aportar', true) ? 'checked' : ''}>
            <span>Sumar mis precios al promedio de Tucumán. Es anónimo: solo se envía el servicio y el precio, nunca tus datos ni los del cliente.</span></label>` : ''}
          <div class="tf-final__mas">
            <button class="tf-boton" type="button" data-ir="que">${flecha('ph-plus')} Sumar otro servicio</button>
            <button class="tf-boton" type="button" data-guardar>${flecha('ph-floppy-disk')} Guardar</button>
            <button class="tf-boton" type="button" data-nuevo>${flecha('ph-file-plus')} Empezar uno nuevo</button>
          </div>
          <p class="tf-aviso" data-aviso role="status" aria-live="polite"></p>
          ${historialHTML()}`;
    },
  };

  /* --- el deslizador de precio --- */
  function deslizador(it, valor, com) {
    const lo = Math.max(1000, Math.round(it.min * 0.5 / 1000) * 1000);
    const hi = Math.round(it.max * 1.6 / 1000) * 1000;
    const pos = (v) => ((v - lo) / (hi - lo) * 100).toFixed(2);
    const paso = hi - lo > 2000000 ? 10000 : hi - lo > 300000 ? 5000 : 1000;
    return `<div class="tf-desl" style="--a:${pos(it.min)}%;--b:${pos(it.max)}%">
      <div class="tf-desl__valor">
        <label class="tf-precio tf-precio--grande"><span class="sr-only">Tu precio</span><span aria-hidden="true">$</span><input type="text" inputmode="numeric" autocomplete="off" value="${miles(valor)}" data-precio></label>
        <span class="tf-desl__estado meta" data-estado></span>
      </div>
      <div class="tf-desl__pista">
        <input type="range" min="${lo}" max="${hi}" step="${paso}" value="${Math.min(hi, Math.max(lo, valor))}" data-rango aria-label="Ajustar precio">
        <span class="tf-desl__zona" aria-hidden="true"></span>
        ${com ? `<span class="tf-desl__com" style="--c:${pos(com.promedio)}%" title="Promedio de la comunidad" aria-hidden="true"></span>` : ''}
      </div>
      <div class="tf-desl__marcas">
        <button type="button" data-fijar="${it.min}"><span>Mínimo</span>${fmt(it.min)}</button>
        <button type="button" data-fijar="${medio(it)}"><span>Medio</span>${fmt(medio(it))}</button>
        <button type="button" data-fijar="${it.max}"><span>Máximo</span>${fmt(it.max)}</button>
        ${com ? `<button type="button" data-fijar="${com.promedio}" class="com"><span>Tucumán</span>${fmt(com.promedio)}</button>` : ''}
      </div>
      <p class="tf-desl__nota">Referencia orientativa, armada con precios publicados en internet. El precio lo definís vos según tu trabajo y trayectoria.</p>
    </div>`;
  }

  /* --- panel del costado: que sugiere segun el paso --- */
  function sugerir(foco) {
    const t = paso.tipo;
    let h = '';
    const bloque = (titulo, cuerpo) => `<span class="etiqueta">Sugerencia</span><h3>${titulo}</h3>${cuerpo}`;
    const lista = (filas) => `<ul class="tf-sug__lista">${filas.map(([a, b]) => `<li><span>${esc(a)}</span><span>${b}</span></li>`).join('')}</ul>`;
    if (t === 'que') {
      h = bloque('Precios desde', lista(D.categorias.map((c) => [c.titulo, fmt(desde(c))]).concat([['Combos', 'hasta 15% menos']])));
    } else if (t === 'tipo') {
      const c = CATS[paso.cat];
      h = bloque(c.titulo, lista(c.grupos.map((g) => [g.titulo, `${fmt(rango(g.items)[0])} – ${fmt(rango(g.items)[1])}`])));
    } else if (t === 'servicio') {
      const g = CATS[paso.cat].grupos[paso.grupo];
      const it = foco ? ITEMS[foco] : null;
      h = it ? fichaItem(it) : bloque(g.titulo, lista(g.items.map((i) => [i.nombre, `${fmt(i.min)} – ${fmt(i.max)}`])));
    } else if (t === 'combos') {
      const co = foco ? COMBOS[foco] : null;
      h = co ? bloque(co.nombre, `<p>${esc(co.para)}</p>` + lista(co.items.map((x) => [ITEMS[x].nombre, `${fmt(ITEMS[x].min)} – ${fmt(ITEMS[x].max)}`])) + `<p class="meta">${co.descuento}% menos sobre la suma de tus precios.</p>`)
        : bloque('Combos', `<p>Elegí un combo para ver qué incluye y sus referencias.</p>`);
    } else if (t === 'precio') {
      h = fichaItem(ITEMS[borrador.id]);
    } else if (t === 'combo') {
      const co = COMBOS[borrador.id];
      h = bloque(co.nombre, lista(co.items.map((x) => [ITEMS[x].nombre, `${fmt(ITEMS[x].min)} – ${fmt(ITEMS[x].max)}`])));
    } else {
      h = bloque('Consejos', `<ul class="tf-sug__tips">
        <li>Con la inflación, poné una validez corta: 10 a 15 días.</li>
        <li>Pedí seña para reservar la fecha o arrancar el trabajo.</li>
        <li>Aclará cuántas rondas de cambios incluye.</li>
        <li>Si hay que viajar, sumá los viáticos aparte.</li></ul>`);
    }
    sug.innerHTML = h;
  }
  function fichaItem(it) {
    const com = promedioCom(it.id);
    const mio = precios[it.id];
    return `<span class="etiqueta">Sugerencia · por ${esc(it.unidad)}</span>
      <h3>${esc(it.nombre)}</h3>
      <div class="tf-sug__rango"><strong>${fmt(it.min)} – ${fmt(it.max)}</strong><span class="meta">Medio ${fmt(medio(it))}</span></div>
      <ul class="tf-sug__lista">
        <li><span>Emprendedores y particulares</span><span>${fmt(it.min)}</span></li>
        <li><span>Pymes y empresas</span><span>${fmt(it.max)}</span></li>
        ${com ? `<li class="com"><span>Promedio en Tucumán · ${com.n} aportes</span><span>${fmt(com.promedio)}</span></li>` : ''}
        ${mio ? `<li><span>Tu último precio</span><span>${fmt(mio)}</span></li>` : ''}
      </ul>
      <p class="meta">${esc(it.detalle)}</p>`;
  }

  /* --- mostrar un paso con transicion --- */
  let direccion = 1;
  function ir(nuevoPaso, { atras: volver = false } = {}) {
    if (!volver && paso) pila.push(paso);
    direccion = volver ? -1 : 1;
    paso = nuevoPaso;
    const html = `<div class="tf-paso" data-paso="${paso.tipo}">${PASOS[paso.tipo](paso)}</div>`;
    const viejo = escena.firstElementChild;
    const montar = () => {
      escena.innerHTML = html;
      const el = escena.firstElementChild;
      if (!reduce && viejo) { el.style.setProperty('--dir', direccion); el.classList.add('entra'); requestAnimationFrame(() => requestAnimationFrame(() => el.classList.remove('entra'))); }
      conectarPaso(el);
      pintarProgreso();
      sugerir();
      pintarResumen();
      if (viejo) {
        const titulo = $('.tf-paso__titulo', el);
        titulo && titulo.focus({ preventScroll: true });
        const top = escena.getBoundingClientRect().top;
        if (top < 70 || top > window.innerHeight * 0.6) $('#cotizar').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
      }
    };
    if (viejo && !reduce) {
      viejo.style.setProperty('--dir', direccion);
      viejo.classList.add('sale');
      setTimeout(montar, 180);
    } else montar();
  }
  atras.addEventListener('click', () => { if (pila.length) ir(pila.pop(), { atras: true }); });

  function empezarItem(id, linea = null) {
    const it = ITEMS[id];
    borrador = linea ? { uid: linea.uid, id, cant: linea.cant, precio: linea.precio }
      : { uid: null, id, cant: 1, precio: precios[id] || medio(it), propio: !!precios[id] };
    ir({ tipo: 'precio' });
  }
  function empezarCombo(id, linea = null) {
    const co = COMBOS[id];
    borrador = linea ? { uid: linea.uid, id, items: linea.items.map((s) => Object.assign({}, s)) }
      : { uid: null, id, items: co.items.map((x) => ({ id: x, nombre: ITEMS[x].nombre, cant: 1, precio: precios[x] || medio(ITEMS[x]), ref: !precios[x] })) };
    ir({ tipo: 'combo' });
  }

  /* --- eventos de cada paso --- */
  function conectarPaso(el) {
    el.addEventListener('click', (ev) => {
      const b = ev.target.closest('button');
      if (!b) return;
      const ds = b.dataset;
      if (ds.cat) ir({ tipo: 'tipo', cat: ds.cat });
      else if (ds.grupo != null) ir({ tipo: 'servicio', cat: paso.cat, grupo: Number(ds.grupo) });
      else if (ds.item) empezarItem(ds.item);
      else if (ds.combo) empezarCombo(ds.combo);
      else if (ds.ir === 'que') { pila = []; ir({ tipo: 'que' }); }
      else if (ds.ir) ir({ tipo: ds.ir });
      else if (ds.fijar) fijarPrecio(el, Number(ds.fijar));
      else if (ds.menos != null || ds.mas != null) {
        borrador.cant = Math.max(1, borrador.cant + (ds.mas != null ? 1 : -1));
        $('[data-cant]', el).value = borrador.cant;
      } else if (ds.confirmar != null) confirmar();
      else if (ds.quitarBorrador != null) {
        actual.lineas = actual.lineas.filter((l) => l.uid !== borrador.uid);
        actual.aportado = false; persistir(); pintarResumen();
        tostada('Quitado del presupuesto.');
        pila = []; ir({ tipo: 'que' });
      } else if (ds.pdf != null) pdf();
      else if (ds.whatsapp != null) whatsapp();
      else if (ds.guardar != null) { guardarEnHistorial(); aportar(); avisar(`Guardado como N° ${nro(actual.numero)}.`); }
      else if (ds.nuevo != null) {
        if (actual.lineas.length) guardarEnHistorial();
        actual = nuevo(); persistir(); pintarResumen();
        pila = []; ir({ tipo: 'que' });
        tostada('Presupuesto nuevo. El anterior quedó guardado.');
      }
      else if (ds.abrir || ds.duplicar || ds.borrar) accionHistorial(b);
      else if (ds.quitarLogo != null) { delete perfil.logo; guardado.set('tf-perfil', perfil); refrescarPaso(); }
      else if (ds.exportar != null) exportar();
    });
    // la sugerencia del costado sigue a la opcion que se mira
    el.addEventListener('pointerover', (ev) => { const b = ev.target.closest('[data-item],[data-combo]'); if (b) sugerir(b.dataset.item || b.dataset.combo); });
    el.addEventListener('focusin', (ev) => { const b = ev.target.closest('[data-item],[data-combo]'); if (b) sugerir(b.dataset.item || b.dataset.combo); });
    el.addEventListener('input', (ev) => {
      const t = ev.target;
      if (t.matches('[data-precio]')) { borrador.precio = entero(t.value); borrador.propio = true; sincronizar(el, 'texto'); }
      else if (t.matches('[data-rango]')) { borrador.precio = Number(t.value); borrador.propio = true; sincronizar(el, 'rango'); }
      else if (t.matches('[data-cant]')) borrador.cant = Math.max(1, entero(t.value) || 1);
      else if (t.matches('[data-sub]')) { const s = borrador.items[Number(t.dataset.sub)]; s.precio = entero(t.value); s.ref = false; totalCombo(el); }
      else if (t.matches('[data-aportar]')) guardado.set('tf-aportar', t.checked);
      else if (t.name) campo(t);
    });
    el.addEventListener('focusout', (ev) => {
      const t = ev.target;
      if (t.matches('[data-precio], [data-sub]') || t.name === 'viaticos') t.value = miles(entero(t.value));
      if (t.matches('[data-cant]')) t.value = borrador.cant;
    });
    el.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter' && ev.target.matches('input:not([type=checkbox]):not([type=range])')) {
        ev.preventDefault();
        const b = $('[data-confirmar], [data-ir="ajustes"], [data-ir="final"]', el);
        b && b.click();
      }
    });
    const imp = $('[data-importar]', el);
    imp && imp.addEventListener('change', importar);
    const logo = $('[data-logo]', el);
    logo && logo.addEventListener('change', subirLogo);
    if (paso.tipo === 'precio') sincronizar(el);
    if (paso.tipo === 'combo') totalCombo(el);
  }

  function sincronizar(el, desde) {
    const it = ITEMS[borrador.id];
    const v = borrador.precio;
    const texto = $('[data-precio]', el), r = $('[data-rango]', el);
    if (desde !== 'texto') texto.value = miles(v);
    if (desde !== 'rango') r.value = Math.min(Number(r.max), Math.max(Number(r.min), v || 0));
    const pct = ((Number(r.value) - r.min) / (r.max - r.min) * 100).toFixed(2);
    el.querySelector('.tf-desl').style.setProperty('--v', pct + '%');
    let estado = '';
    if (!v) estado = 'Poné tu precio o mové el deslizador.';
    else if (v < it.min) estado = 'Por debajo de la referencia.';
    else if (v > it.max) estado = 'Por encima de la referencia.';
    else estado = v < medio(it) ? 'Dentro de la referencia, en la franja baja.' : v > medio(it) ? 'Dentro de la referencia, en la franja alta.' : 'Justo en el medio de la referencia.';
    $('[data-estado]', el).textContent = estado;
    $$('[data-fijar]', el).forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.fijar) === v)));
  }
  function fijarPrecio(el, v) { borrador.precio = v; borrador.propio = true; sincronizar(el); }
  function totalCombo(el) {
    const co = COMBOS[borrador.id];
    const s = borrador.items.reduce((a, x) => a + x.precio, 0);
    $('[data-combo-total]', el).innerHTML = `<div><span>Por separado</span><s>${fmt(s)}</s></div><div><span>Combo, ${co.descuento}% menos</span><strong>${fmt(s * (1 - co.descuento / 100))}</strong></div>`;
  }

  function confirmar() {
    if (paso.tipo === 'precio') {
      const it = ITEMS[borrador.id];
      if (!borrador.precio) { tostada('Poné un precio para sumarlo.'); return; }
      const ref = !borrador.propio && !precios[it.id];
      if (!ref) { precios[it.id] = borrador.precio; guardado.set('tf-precios', precios); }
      const ex = borrador.uid && actual.lineas.find((l) => l.uid === borrador.uid);
      if (ex) Object.assign(ex, { cant: borrador.cant, precio: borrador.precio, ref });
      else actual.lineas.push({ uid: uid(), tipo: 'item', id: it.id, nombre: it.nombre, unidad: it.unidad, cant: borrador.cant, precio: borrador.precio, ref });
      terminarBorrador(it.nombre, !!ex);
    } else {
      const co = COMBOS[borrador.id];
      if (borrador.items.some((s) => !s.precio)) { tostada('Completá el precio de cada parte del combo.'); return; }
      borrador.items.forEach((s) => { if (!s.ref) precios[s.id] = s.precio; });
      guardado.set('tf-precios', precios);
      const ex = borrador.uid && actual.lineas.find((l) => l.uid === borrador.uid);
      if (ex) ex.items = borrador.items;
      else actual.lineas.push({ uid: uid(), tipo: 'combo', id: co.id, nombre: co.nombre, descuento: co.descuento, items: borrador.items });
      terminarBorrador('El combo ' + co.nombre, !!ex);
    }
  }
  function terminarBorrador(nombre, editado) {
    actual.aportado = false; persistir(); pintarResumen();
    borrador = null;
    if (editado) { tostada('Cambios guardados.'); pila = []; ir({ tipo: 'final' }); return; }
    pila = [];
    ir({ tipo: 'otro', nombre });
  }

  // vuelve a dibujar el paso actual sin animacion (por ejemplo, al subir el logo)
  function refrescarPaso() {
    const abierto = $('.tf-perfil', escena) && $('.tf-perfil', escena).open;
    escena.innerHTML = `<div class="tf-paso" data-paso="${paso.tipo}">${PASOS[paso.tipo](paso)}</div>`;
    conectarPaso(escena.firstElementChild);
    const d = $('.tf-perfil', escena);
    if (d && abierto) d.open = true;
  }

  // El logo se achica en el navegador (max. 800 px) y se guarda en este dispositivo
  function subirLogo(ev) {
    const f = ev.target.files[0];
    ev.target.value = '';
    if (!f) return;
    if (f.size > 8 * 1024 * 1024) { tostada('Ese archivo es muy pesado. Probá con uno de menos de 8 MB.'); return; }
    const lector = new FileReader();
    lector.onload = () => {
      const img = new Image();
      img.onload = () => {
        const max = 800, k = Math.min(1, max / Math.max(img.naturalWidth || max, img.naturalHeight || max));
        const c = document.createElement('canvas');
        c.width = Math.max(1, Math.round((img.naturalWidth || max) * k));
        c.height = Math.max(1, Math.round((img.naturalHeight || max) * k));
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        perfil.logo = c.toDataURL('image/png');
        if (perfil.logo.length > 900000) perfil.logo = c.toDataURL('image/webp', 0.9);
        guardado.set('tf-perfil', perfil);
        refrescarPaso();
        tostada('Logo guardado. Va a salir en el encabezado del PDF.');
      };
      img.onerror = () => tostada('No pude leer esa imagen. Probá con un PNG o JPG.');
      img.src = lector.result;
    };
    lector.readAsDataURL(f);
  }

  function campo(t) {
    const n = t.name;
    if (n.startsWith('perfil_')) { perfil[n.slice(7)] = t.value; guardado.set('tf-perfil', perfil); return; }
    if (n.startsWith('cliente_')) actual.cliente[n.slice(8)] = t.value;
    else if (n === 'notas') actual.notas = t.value;
    else if (n in actual.ajustes) { actual.ajustes[n] = t.value; pintarTotales(); }
    persistir();
  }

  /* =========================================================
     Resumen del costado
     ========================================================= */
  const resumen = $('[data-resumen]', raiz);
  const vacio = $('[data-vacio]', raiz);
  const armar = $('[data-armar]', raiz);
  function pintarResumen() {
    resumen.innerHTML = actual.lineas.map((l) => {
      const detalle = l.tipo === 'combo'
        ? `${l.items.map((x) => esc(x.nombre)).join(' + ')} · ${l.descuento}% menos`
        : `${l.cant > 1 ? `${l.cant} × ${fmt(l.precio)}` : `Por ${esc(l.unidad)}`}${l.ref ? ' · precio de referencia' : ''}`;
      return `<li>
        <button type="button" class="tf-resu__linea" data-editar="${l.uid}" aria-label="Editar ${esc(l.nombre)}">
          <span class="tf-resu__nombre">${l.tipo === 'combo' ? '<em>Combo</em> ' : ''}${esc(l.nombre)}<small${l.ref ? ' class="ref"' : ''}>${detalle}</small></span>
          <span class="tf-resu__precio">${fmt(subtotalLinea(l))}</span>
        </button>
        <button type="button" class="tf-resu__quitar" data-quitar="${l.uid}" aria-label="Quitar ${esc(l.nombre)}"><i class="ph-light ph-x" aria-hidden="true"></i></button>
      </li>`;
    }).join('');
    vacio.hidden = actual.lineas.length > 0;
    armar.hidden = actual.lineas.length === 0 || ['cliente', 'ajustes', 'final'].includes(paso && paso.tipo);
    pintarTotales();
  }
  resumen.addEventListener('click', (ev) => {
    const b = ev.target.closest('button');
    if (!b) return;
    if (b.dataset.quitar) {
      actual.lineas = actual.lineas.filter((l) => l.uid !== b.dataset.quitar);
      actual.aportado = false; persistir(); pintarResumen();
      if (paso.tipo === 'final') ir(paso, { atras: true });
      return;
    }
    const l = actual.lineas.find((x) => x.uid === b.dataset.editar);
    if (!l) return;
    if (l.tipo === 'combo') empezarCombo(l.id, l); else empezarItem(l.id, l);
  });
  armar.addEventListener('click', () => { pila = []; ir({ tipo: 'cliente' }); });

  const dl = $('[data-totales]', raiz);
  const barra = $('[data-barra]');
  function pintarTotales() {
    const t = totales();
    const fila = (dt, dd, cls = '') => `<div${cls ? ` class="${cls}"` : ''}><dt>${dt}</dt><dd>${dd}</dd></div>`;
    let h = '';
    if (actual.lineas.length) {
      if (t.ahorro || t.desc || t.urg || t.viat) h += fila('Subtotal', fmt(t.bruto));
      if (t.ahorro) h += fila('Ahorro por combos', '−' + fmt(t.ahorro), 'menos');
      if (t.desc) h += fila(`Descuento ${t.dPct}%`, '−' + fmt(t.desc), 'menos');
      if (t.urg) h += fila(`Urgencia ${t.uPct}%`, '+' + fmt(t.urg));
      if (t.viat) h += fila('Viáticos', '+' + fmt(t.viat));
      h += fila('Total', fmt(t.total), 'total');
      h += fila(`Seña ${t.sPct}%`, fmt(t.sena), 'sena');
    }
    dl.innerHTML = h;
    const n = actual.lineas.length;
    $('[data-barra-n]', barra).textContent = n === 1 ? '1 servicio' : `${n} servicios`;
    $('[data-barra-total]', barra).textContent = fmt(t.total);
    $('[data-numero]', raiz).textContent = actual.numero ? 'N° ' + nro(actual.numero) : '';
    actualizarBarra();
  }
  let resuVisible = false;
  const actualizarBarra = () => {
    const ver = actual.lineas.length > 0 && !resuVisible && window.innerWidth < 1000;
    barra.hidden = false;
    barra.classList.toggle('visible', ver);
    barra.setAttribute('aria-hidden', String(!ver));
    barra.tabIndex = ver ? 0 : -1;
  };
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([e]) => { resuVisible = e.isIntersecting; actualizarBarra(); }, { threshold: 0.15 }).observe($('#resumen'));
  }
  window.addEventListener('resize', actualizarBarra);

  /* =========================================================
     Historial, numeracion y copias
     ========================================================= */
  const numerar = () => {
    if (actual.numero) return;
    const c = guardado.get('tf-contador', 0) + 1;
    guardado.set('tf-contador', c);
    actual.numero = c; persistir(); pintarTotales();
  };
  const guardarEnHistorial = () => {
    numerar();
    actual.guardado = new Date().toISOString();
    const copia = JSON.parse(JSON.stringify(actual));
    const i = historial.findIndex((h) => h.id === actual.id);
    if (i >= 0) historial[i] = copia; else historial.unshift(copia);
    historial = historial.slice(0, 200);
    guardado.set('tf-historial', historial);
    const lista = $('[data-historial-lista]', escena);
    if (lista) { lista.outerHTML = historialLista(); $('[data-historial-n]', escena).textContent = historial.length; }
  };
  const historialLista = () => `<ul class="tf-historial__lista" data-historial-lista>${historial.map((h) => `<li>
      <span>N° ${nro(h.numero)} · ${esc(h.cliente.nombre || 'Sin cliente')}<span class="meta">${fecha(h.fecha)} · ${h.lineas.length} ${h.lineas.length === 1 ? 'servicio' : 'servicios'} · ${fmt(totales(h).total)}</span></span>
      <button class="tf-boton" type="button" data-abrir="${h.id}">Abrir</button>
      <button class="tf-boton" type="button" data-duplicar="${h.id}">Duplicar</button>
      <button class="tf-boton" type="button" data-borrar="${h.id}" aria-label="Borrar presupuesto ${nro(h.numero)}"><i class="ph-light ph-trash" aria-hidden="true"></i></button>
    </li>`).join('')}</ul>`;
  const historialHTML = () => `<details class="tf-historial">
      <summary><span>Presupuestos guardados</span> <span class="meta" data-historial-n>${historial.length}</span></summary>
      ${historialLista()}
      <div class="tf-historial__pie">
        <button class="tf-boton" type="button" data-exportar>${flecha('ph-download-simple')} Exportar copia</button>
        <label class="tf-boton">${flecha('ph-upload-simple')} Importar copia<input type="file" accept="application/json,.json" data-importar hidden></label>
      </div>
      <p class="meta">Tus presupuestos y precios se guardan solo en este dispositivo. Con la copia los pasás de la compu al celular.</p>
    </details>`;
  function accionHistorial(b) {
    const id = b.dataset.abrir || b.dataset.duplicar || b.dataset.borrar;
    const h = historial.find((x) => x.id === id);
    if (!h) return;
    if (b.dataset.borrar) {
      if (!confirm(`¿Borrar el presupuesto N° ${nro(h.numero)}?`)) return;
      historial = historial.filter((x) => x.id !== id);
      guardado.set('tf-historial', historial);
      ir(paso, { atras: true });
      return;
    }
    const p = JSON.parse(JSON.stringify(h));
    if (b.dataset.duplicar) Object.assign(p, { id: uid(), numero: 0, fecha: hoyISO(), aportado: false, guardado: null });
    actual = p; persistir(); pintarResumen();
    pila = []; ir({ tipo: 'final' });
    tostada(b.dataset.duplicar ? 'Copia lista para editar. Toma número nuevo al guardarla.' : `Presupuesto N° ${nro(p.numero)} abierto.`);
  }
  function exportar() {
    const datos = { app: 'tarifario-juanguzmanph', version: 1, exportado: new Date().toISOString(), perfil, precios, historial, contador: guardado.get('tf-contador', 0) };
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' }));
    a.download = `tarifario-copia-${hoyISO()}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }
  function importar(ev) {
    const f = ev.target.files[0];
    if (!f) return;
    f.text().then((txt) => {
      const d = JSON.parse(txt);
      if (d.app !== 'tarifario-juanguzmanph') throw new Error('formato');
      perfil = Object.assign({}, perfil, d.perfil || {});
      precios = Object.assign({}, precios, d.precios || {});
      const ids = new Set(historial.map((h) => h.id));
      (d.historial || []).forEach((h) => { if (!ids.has(h.id)) historial.push(h); });
      historial.sort((a, b) => (b.guardado || b.fecha).localeCompare(a.guardado || a.fecha));
      guardado.set('tf-perfil', perfil); guardado.set('tf-precios', precios); guardado.set('tf-historial', historial);
      guardado.set('tf-contador', Math.max(guardado.get('tf-contador', 0), d.contador || 0));
      ir(paso, { atras: true });
      tostada('Copia importada: precios, datos y presupuestos guardados.');
    }).catch(() => tostada('No pude leer ese archivo. Tiene que ser una copia exportada desde el tarifario.'));
    ev.target.value = '';
  }

  let avisoT;
  const avisar = (txt) => {
    const a = $('[data-aviso]', escena);
    if (!a) return tostada(txt);
    a.textContent = txt; clearTimeout(avisoT); avisoT = setTimeout(() => { a.textContent = ''; }, 4500);
  };

  /* =========================================================
     PDF y WhatsApp
     ========================================================= */
  const hoja = $('#hoja');
  const isoNav = $('.marca svg');
  const ISO = isoNav ? isoNav.outerHTML : '';
  const armarHoja = () => {
    const t = totales();
    const contacto = [perfil.whatsapp, perfil.email, perfil.web].filter(Boolean).map(esc).join(' · ');
    const filasT = actual.lineas.map((l) => {
      if (l.tipo === 'combo') {
        const s = l.items.reduce((a, x) => a + x.precio * x.cant, 0);
        return `<tr><td colspan="3"><strong>Combo ${esc(l.nombre)}</strong></td><td class="num"></td></tr>`
          + l.items.map((x) => `<tr class="sub"><td>${esc(x.nombre)}</td><td class="num">1</td><td class="num">${fmt(x.precio)}</td><td class="num">${fmt(x.precio)}</td></tr>`).join('')
          + `<tr class="desc"><td colspan="3">Descuento por combo ${l.descuento}%</td><td class="num">−${fmt(s * l.descuento / 100)}</td></tr>`;
      }
      return `<tr><td>${esc(l.nombre)}<small>Por ${esc(l.unidad)}</small></td><td class="num">${l.cant}</td><td class="num">${fmt(l.precio)}</td><td class="num">${fmt(l.precio * l.cant)}</td></tr>`;
    }).join('');
    const fila = (a, b, cls = '') => `<div${cls ? ` class="${cls}"` : ''}><span>${a}</span><span>${b}</span></div>`;
    let tot = fila('Subtotal', fmt(t.neto));
    if (t.desc) tot += fila(`Descuento ${t.dPct}%`, '−' + fmt(t.desc), 'menos');
    if (t.urg) tot += fila(`Recargo por urgencia ${t.uPct}%`, '+' + fmt(t.urg));
    if (t.viat) tot += fila('Viáticos', '+' + fmt(t.viat));
    tot += fila('Total', fmt(t.total), 'total') + fila(`Seña ${t.sPct}% para confirmar`, fmt(t.sena), 'sena');
    hoja.innerHTML = `
      <header class="hj-cab">
        <div class="hj-emisor">
          ${perfil.logo ? `<img class="hj-logo" src="${perfil.logo}" alt="">` : ''}
          ${perfil.nombre ? `<div class="hj-marca${perfil.logo ? ' chica' : ''}">${esc(perfil.nombre)}</div>` : ''}
          <div class="hj-rubro">${[perfil.rubro, perfil.ciudad].filter(Boolean).map(esc).join(' · ')}${contacto ? '<br>' + contacto : ''}</div></div>
        <div class="hj-doc"><h1>Presupuesto</h1><p>N° ${nro(actual.numero)} · ${fecha(actual.fecha)}<br>Válido hasta el ${fecha(actual.fecha, t.validez)}</p></div>
      </header>
      <section class="hj-datos">
        <div><div class="hj-etq">Cliente</div>${esc(actual.cliente.nombre || '—')}${actual.cliente.contacto ? '<br>' + esc(actual.cliente.contacto) : ''}</div>
        <div><div class="hj-etq">Forma de pago</div>Seña del ${t.sPct}% para confirmar. Validez ${t.validez} días.</div>
      </section>
      <table class="hj-tabla">
        <thead><tr><th>Servicio</th><th class="num">Cant.</th><th class="num">Precio</th><th class="num">Subtotal</th></tr></thead>
        <tbody>${filasT}</tbody>
      </table>
      <div class="hj-totales">${tot}</div>
      ${actual.notas.trim() ? `<div class="hj-notas"><div class="hj-etq">Condiciones</div>${esc(actual.notas.trim())}</div>` : ''}
      <footer class="hj-pie">${ISO}<span>Hecho con el tarifario de <strong>Juan Guzman</strong> · juanguzmanph.com/tarifario</span></footer>`;
  };
  let tituloOriginal = document.title;
  window.addEventListener('afterprint', () => { document.title = tituloOriginal; });
  function pdf() {
    guardarEnHistorial(); armarHoja(); aportar();
    tituloOriginal = document.title;
    document.title = `Presupuesto ${nro(actual.numero)}${actual.cliente.nombre ? ' - ' + actual.cliente.nombre : ''}`;
    avisar('Elegí "Guardar como PDF" en la ventana de impresión.');
    setTimeout(() => window.print(), 60);
  }
  function whatsapp() {
    guardarEnHistorial(); aportar();
    const t = totales();
    const r = [`*Presupuesto N° ${nro(actual.numero)}*${perfil.nombre ? ' · ' + perfil.nombre : ''}`];
    if (actual.cliente.nombre) r.push(`Para: ${actual.cliente.nombre}`);
    r.push('');
    actual.lineas.forEach((l) => {
      if (l.tipo === 'combo') r.push(`• Combo ${l.nombre} (${l.items.map((x) => x.nombre).join(' + ')}), ${l.descuento}% menos: ${fmt(subtotalLinea(l))}`);
      else r.push(`• ${l.nombre}${l.cant > 1 ? ' x' + l.cant : ''}: ${fmt(l.precio * l.cant)}`);
    });
    r.push('');
    if (t.desc) r.push(`Descuento ${t.dPct}%: −${fmt(t.desc)}`);
    if (t.urg) r.push(`Urgencia ${t.uPct}%: +${fmt(t.urg)}`);
    if (t.viat) r.push(`Viáticos: +${fmt(t.viat)}`);
    r.push(`*Total: ${fmt(t.total)}*`, `Seña ${t.sPct}%: ${fmt(t.sena)}`, `Válido hasta el ${fecha(actual.fecha, t.validez)}.`);
    window.open('https://wa.me/?text=' + encodeURIComponent(r.join('\n')), '_blank', 'noopener');
  }

  /* =========================================================
     Promedio de la comunidad (Google Sheets)
     ========================================================= */
  const ENDPOINT = (D.endpoint || '').trim();
  let dispositivo = guardado.get('tf-dispositivo', '');
  if (!dispositivo) { dispositivo = uid() + uid(); guardado.set('tf-dispositivo', dispositivo); }
  function aportar() {
    if (!ENDPOINT || actual.aportado || !guardado.get('tf-aportar', true)) return;
    const vistos = {};
    const sumar = (id, precio, ref) => {
      const it = ITEMS[id];
      if (!it || ref || !precio) return;
      if (precio < it.min * 0.25 || precio > it.max * 4) return;
      vistos[id] = precio;
    };
    actual.lineas.forEach((l) => (l.tipo === 'combo' ? l.items.forEach((s) => sumar(s.id, s.precio, s.ref)) : sumar(l.id, l.precio, l.ref)));
    const items = Object.entries(vistos).map(([id, precio]) => ({ id, precio }));
    actual.aportado = true; persistir();
    if (!items.length) return;
    const cola = guardado.get('tf-pendientes', []);
    cola.push({ v: D.version, ciudad: 'tucuman', dispositivo, items, web: '' });
    guardado.set('tf-pendientes', cola.slice(-30));
    enviarPendientes();
  }
  let enviando = false;
  function enviarPendientes() {
    if (!ENDPOINT || enviando || !navigator.onLine) return;
    const cola = guardado.get('tf-pendientes', []);
    if (!cola.length) return;
    enviando = true;
    fetch(ENDPOINT, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(cola[0]) })
      .then(() => { guardado.set('tf-pendientes', guardado.get('tf-pendientes', []).slice(1)); enviando = false; enviarPendientes(); })
      .catch(() => { enviando = false; });
  }
  const pintarEstadoCom = () => {
    if (!comunidad || !comunidad.servicios) return;
    const total = Object.values(comunidad.servicios).reduce((a, s) => a + s.n, 0);
    const el = $('[data-com-estado]', raiz);
    if (total) { el.textContent = `${total.toLocaleString('es-AR')} aportes de la comunidad`; el.hidden = false; }
  };
  if (ENDPOINT) {
    pintarEstadoCom();
    if (navigator.onLine) {
      fetch(ENDPOINT + (ENDPOINT.includes('?') ? '&' : '?') + 'accion=promedios', { cache: 'no-store' })
        .then((r) => r.json())
        .then((c) => { if (c && c.servicios) { comunidad = c; guardado.set('tf-comunidad', c); pintarEstadoCom(); if (paso) sugerir(); } })
        .catch(() => {});
    }
    enviarPendientes();
    window.addEventListener('online', enviarPendientes);
  }

  /* ---------- Compartir ---------- */
  const compartir = $('[data-compartir]', raiz);
  compartir && compartir.addEventListener('click', () => {
    const url = 'https://www.juanguzmanph.com/tarifario/';
    const datos = { title: 'Tarifario de fotografía, diseño y web en Tucumán', text: 'Cotizador gratis con precios de referencia para fotógrafos y diseñadores de Tucumán.', url };
    if (navigator.share) navigator.share(datos).catch(() => {});
    else if (navigator.clipboard) navigator.clipboard.writeText(url).then(() => tostada('Link copiado. Pegalo donde quieras compartirlo.'));
    else prompt('Copiá el link:', url);
  });

  /* ---------- Instalar y usar sin internet ---------- */
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }
  const instalar = $('[data-instalar]', raiz);
  const instalada = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  let pedido = null;
  window.addEventListener('beforeinstallprompt', (ev) => { ev.preventDefault(); pedido = ev; instalar.hidden = false; });
  if (!instalada && 'serviceWorker' in navigator) instalar.hidden = false;
  instalar.addEventListener('click', () => {
    if (pedido) { pedido.prompt(); pedido.userChoice.finally(() => { pedido = null; }); return; }
    const ua = navigator.userAgent;
    if (/iPhone|iPad|iPod/.test(ua)) tostada('En Safari tocá Compartir y después "Agregar a inicio". Queda como una app y funciona sin internet.');
    else if (/Macintosh/.test(ua) && /Safari/.test(ua) && !/Chrome|Edg/.test(ua)) tostada('En Safari andá a Archivo → "Agregar al Dock". Queda como una app y funciona sin internet.');
    else tostada('Buscá "Instalar" o "Agregar a la pantalla de inicio" en el menú del navegador. Igual, esta página ya queda guardada para usarla sin internet.');
  });
  window.addEventListener('appinstalled', () => { instalar.hidden = true; tostada('Tarifario instalado.'); });

  /* ---------- Arranque ---------- */
  ir({ tipo: 'que' });
})();
