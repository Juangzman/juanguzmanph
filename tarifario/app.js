/* Tarifario · cotizador
   A la izquierda, los servicios en tarjetas: se tocan para sumarlos.
   A la derecha, la hoja del presupuesto en vivo: ahi se editan precios, cantidades y el cliente.
   Todo se guarda en este dispositivo (localStorage); lo unico que sale es el aporte anonimo
   al promedio (servicio + precio), y solo si se tilda en Ajustes. */
(() => {
  const raiz = document.querySelector('[data-tarifario]');
  const fuente = document.getElementById('tf-datos');
  if (!raiz || !fuente) return;
  const D = JSON.parse(fuente.textContent);
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Catalogo ---------- */
  const ITEMS = {};
  D.categorias.forEach((c) => c.grupos.forEach((g) => g.items.forEach((it) => { ITEMS[it.id] = it; })));
  const COMBOS = {};
  D.combos.forEach((co) => { COMBOS[co.id] = co; });
  const medio = (it) => Math.round((it.min + it.max) / 2 / 1000) * 1000;

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
  const movil = () => window.matchMedia('(max-width: 999px)').matches;

  let tostadaT;
  const tostada = (txt, accion) => {
    let t = $('.tf-tostada');
    if (!t) { t = document.createElement('div'); t.className = 'tf-tostada'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.innerHTML = `<span>${esc(txt)}</span>${accion ? `<button type="button">${esc(accion.txt)}</button>` : ''}`;
    if (accion) t.querySelector('button').addEventListener('click', () => { accion.fn(); t.classList.remove('visible'); });
    requestAnimationFrame(() => t.classList.add('visible'));
    clearTimeout(tostadaT);
    tostadaT = setTimeout(() => t.classList.remove('visible'), accion ? 2600 : 3800);
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
    const antes = Math.max(0, neto - desc + urg + viat);
    const iva = a.iva ? antes * 0.21 : 0;
    const total = antes + iva;
    return { bruto, ahorro, neto, dPct, desc, uPct, urg, viat, antes, iva, total, sPct, sena: total * sPct / 100, validez: entero(a.validez) || 15 };
  };
  const subtotalLinea = (l) => {
    if (l.tipo !== 'combo') return l.precio * l.cant;
    const s = l.items.reduce((a, x) => a + x.precio * x.cant, 0);
    return s - s * l.descuento / 100;
  };

  /* =========================================================
     Catalogo: cliente + experiencia acomodan los precios sugeridos
     ========================================================= */
  // Donde cae el precio dentro del rango de referencia (0 = minimo, 1 = maximo)
  const BASE = { particular: 0.15, pyme: 0.5, empresa: 0.85 };
  // La experiencia multiplica el precio: un senior cobra el doble que alguien que recien arranca
  const MULT = { inicial: 0.7, media: 1, senior: 1.4 };
  let nivel = Object.assign({ cliente: 'pyme', experiencia: 'media' }, guardado.get('tf-nivel', {}));
  const sugerido = (mn, mx) => Math.round((mn + (mx - mn) * BASE[nivel.cliente]) * MULT[nivel.experiencia] / 1000) * 1000;
  const sugeridoItem = (it) => sugerido(it.min, it.max);

  const filas = $$('.tf-fila', raiz);
  // Pinta el precio de una fila: el tuyo si lo pusiste, si no el sugerido. El punto de la escala va a ese precio.
  const pintarFila = (f) => {
    const mn = Number(f.dataset.min), mx = Number(f.dataset.max);
    const propio = f.dataset.add && precios[f.dataset.add];
    const v = propio || sugerido(mn, mx);
    const pos = Math.min(1, Math.max(0, (v - mn) / ((mx - mn) || 1)));
    f.style.setProperty('--p', (pos * 100).toFixed(1) + '%');
    f.classList.toggle('propio', !!propio);
    f.classList.toggle('fuera', !!propio && (v < mn || v > mx));
    const el = $('[data-sug]', f);
    if (el.tagName === 'INPUT') { if (document.activeElement !== el) el.value = miles(v); anchoPrecio(el); }
    else el.textContent = fmt(v);
    const com = f.dataset.add && promedioCom(f.dataset.add);
    const ce = $('[data-com]', f);
    if (com) { ce.textContent = `Promedio en Tucumán ${fmt(com.promedio)} · ${com.n} aportes`; ce.hidden = false; } else ce.hidden = true;
  };
  const pintarFilas = () => filas.forEach(pintarFila);
  // el campo de precio crece con el numero (Bebas es angosta: ~0.5em por cifra)
  function anchoPrecio(el) { el.style.width = (Math.max(3, el.value.length) * 0.52 + 0.4).toFixed(2) + 'em'; }
  const promedioCom = (id) => {
    const x = comunidad && comunidad.servicios && comunidad.servicios[id];
    return x && x.n >= (D.minimo_aportes || 5) ? x : null;
  };
  // Precio propio desde la lista
  function ponerPrecio(id, v) {
    if (v) precios[id] = v; else delete precios[id];
    guardado.set('tf-precios', precios);
    const it = ITEMS[id];
    let cambio = false;
    actual.lineas.forEach((l) => {
      if (l.tipo === 'combo') l.items.forEach((x) => { if (x.id === id) { x.precio = v || sugeridoItem(it); x.ref = !v; cambio = true; } });
      else if (l.id === id) { l.precio = v || sugeridoItem(it); l.ref = !v; cambio = true; }
    });
    if (cambio) { actual.aportado = false; persistir(); pintarPapel(); }
  }
  filas.forEach((f) => {
    const input = $('input[data-sug]', f);
    if (!input) return;
    const id = f.dataset.add;
    let inicial = 0;
    input.addEventListener('focus', () => { inicial = entero(input.value); requestAnimationFrame(() => input.select()); });
    input.addEventListener('input', () => {
      anchoPrecio(input);
      const v = entero(input.value);
      ponerPrecio(id, v);
      pintarFila(f);
    });
    input.addEventListener('blur', () => {
      const v = entero(input.value);
      pintarFila(f);
      if (v && v !== inicial) aportarPrecio(id, v);
    });
    input.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter') { ev.preventDefault(); input.blur(); }
      if (ev.key === 'Escape') { ev.preventDefault(); ponerPrecio(id, 0); pintarFila(f); input.blur(); }
    });
  });
  // segmentados (Cliente / Tu experiencia)
  $$('[data-seg]', raiz).forEach((seg) => {
    const clave = seg.dataset.seg === 'cliente' ? 'cliente' : 'experiencia';
    const botones = $$('button', seg);
    const marcar = () => {
      botones.forEach((b, i) => {
        const on = b.dataset.v === nivel[clave];
        b.setAttribute('aria-checked', String(on)); b.tabIndex = on ? 0 : -1;
        if (on) seg.style.setProperty('--i', i);
      });
    };
    botones.forEach((b, i) => {
      b.addEventListener('click', () => cambiarNivel(clave, b.dataset.v));
      b.addEventListener('keydown', (ev) => {
        const d = ev.key === 'ArrowRight' ? 1 : ev.key === 'ArrowLeft' ? -1 : 0;
        if (!d) return;
        ev.preventDefault();
        const sig = botones[(i + d + botones.length) % botones.length];
        cambiarNivel(clave, sig.dataset.v); sig.focus();
      });
    });
    seg.marcar = marcar;
    marcar();
  });
  function cambiarNivel(clave, v) {
    nivel[clave] = v;
    guardado.set('tf-nivel', nivel);
    $$('[data-seg]', raiz).forEach((s) => s.marcar());
    // los precios que siguen siendo de referencia se reacomodan
    actual.lineas.forEach((l) => {
      if (l.tipo === 'combo') l.items.forEach((x) => { if (x.ref) x.precio = sugeridoItem(ITEMS[x.id]); });
      else if (l.ref) l.precio = sugeridoItem(ITEMS[l.id]);
    });
    persistir();
    pintarFilas();
    pintarPapel();
  }

  // filtro por rubro y buscador
  const rubros = $$('[data-rubro]', raiz);
  const chipsF = $$('[data-filtro]', raiz);
  const buscador = $('[data-buscar]', raiz);
  const sinRes = $('[data-sin-resultados]', raiz);
  let filtro = 'todo';
  const norm = (t) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  function filtrar() {
    const q = norm(buscador.value.trim());
    const palabras = q.split(/\s+/).filter(Boolean);
    let visibles = 0;
    rubros.forEach((r) => {
      let enRubro = 0;
      $$('.tf-fila', r).forEach((f) => {
        const ok = (filtro === 'todo' || filtro === r.dataset.rubro || q) && palabras.every((w) => norm(f.dataset.buscar).includes(w));
        f.hidden = !ok; if (ok) enRubro++;
      });
      // los subtitulos de grupo se esconden si su grupo queda vacio
      $$('.tf-fila-grupo', r).forEach((g) => {
        let n = g.nextElementSibling, alguno = false;
        while (n && !n.classList.contains('tf-fila-grupo')) { if (!n.hidden) alguno = true; n = n.nextElementSibling; }
        g.hidden = !alguno || !!q;
      });
      r.hidden = enRubro === 0;
      visibles += enRubro;
    });
    sinRes.hidden = visibles > 0;
  }
  chipsF.forEach((c) => c.addEventListener('click', () => {
    filtro = c.dataset.filtro;
    chipsF.forEach((x) => { const on = x === c; x.classList.toggle('activa', on); x.setAttribute('aria-pressed', String(on)); });
    if (buscador.value) buscador.value = '';
    filtrar();
    const lista = $('[data-lista]', raiz);
    if (lista.getBoundingClientRect().top < 0) lista.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
  }));
  buscador.addEventListener('input', filtrar);
  buscador.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') { buscador.value = ''; filtrar(); buscador.blur(); } });
  document.addEventListener('keydown', (ev) => {
    if (ev.key === '/' && !ev.target.closest('input, textarea, [contenteditable]') && !document.querySelector('dialog[open]')) { ev.preventDefault(); buscador.focus(); }
  });

  const enPresu = (f) => (f.dataset.add
    ? actual.lineas.some((l) => l.tipo !== 'combo' && l.id === f.dataset.add)
    : actual.lineas.some((l) => l.tipo === 'combo' && l.id === f.dataset.combo));
  const pintarCards = () => filas.forEach((f) => {
    const on = enPresu(f);
    const b = $('.tf-fila__mas', f);
    b.setAttribute('aria-pressed', String(on));
    f.classList.toggle('sumado', on);
    $('i', b).className = 'ph-light ' + (on ? 'ph-check' : 'ph-plus');
  });
  let resaltar = null;
  // tocar la fila (menos el precio) tambien suma o quita
  filas.forEach((f) => f.addEventListener('click', (ev) => {
    if (ev.target.closest('.tf-fila__precio') && !ev.target.closest('.tf-fila__precio--fijo')) return;
    if (enPresu(f)) {
      actual.lineas = actual.lineas.filter((l) => (f.dataset.add ? !(l.tipo !== 'combo' && l.id === f.dataset.add) : !(l.tipo === 'combo' && l.id === f.dataset.combo)));
    } else if (f.dataset.add) {
      const it = ITEMS[f.dataset.add];
      const l = { uid: uid(), tipo: 'item', id: it.id, nombre: it.nombre, unidad: it.unidad, cant: 1, precio: precios[it.id] || sugeridoItem(it), ref: !precios[it.id] };
      actual.lineas.push(l); resaltar = l.uid;
    } else {
      const co = COMBOS[f.dataset.combo];
      const l = { uid: uid(), tipo: 'combo', id: co.id, nombre: co.nombre, descuento: co.descuento,
        items: co.items.map((x) => ({ id: x, nombre: ITEMS[x].nombre, cant: 1, precio: precios[x] || sugeridoItem(ITEMS[x]), ref: !precios[x] })) };
      actual.lineas.push(l); resaltar = l.uid;
    }
    actual.aportado = false;
    persistir(); pintarPapel();
    if (resaltar && movil()) tostada('Sumado al presupuesto', { txt: 'Ver', fn: abrirLado });
  }));

  /* =========================================================
     La hoja del presupuesto, en vivo
     ========================================================= */
  const papel = $('[data-papel]', raiz);
  const isoNav = $('.marca svg');
  const ISO = isoNav ? isoNav.outerHTML : '';
  const precioInput = (valor, attrs, etiqueta) => `<label class="tp-precio"><span class="sr-only">${esc(etiqueta)}</span><span aria-hidden="true">$</span><input type="text" inputmode="numeric" autocomplete="off" value="${miles(valor)}" ${attrs}></label>`;

  function pintarPapel() {
    const lineas = actual.lineas.map((l) => {
      if (l.tipo === 'combo') {
        const subs = l.items.map((s, i) => {
          const it = ITEMS[s.id];
          return `<li class="tp-sub"><span>${esc(s.nombre)}<small>Ref. ${fmt(it.min)} – ${fmt(it.max)}</small></span>${precioInput(s.precio, `data-l="${l.uid}" data-s="${i}"`, 'Precio de ' + s.nombre)}</li>`;
        }).join('');
        return `<li class="tp-linea tp-linea--combo${l.uid === resaltar ? ' nueva' : ''}" data-uid="${l.uid}">
          <div class="tp-linea__fila">
            <span class="tp-linea__nombre">Combo ${esc(l.nombre)}<small>${l.descuento}% menos por contratarlo junto</small></span>
            <button class="tp-quitar" type="button" data-quitar="${l.uid}" aria-label="Quitar combo ${esc(l.nombre)}"><i class="ph-light ph-x" aria-hidden="true"></i></button>
          </div>
          <ul class="tp-subs">${subs}</ul>
          <div class="tp-linea__fila"><span class="tp-linea__sub" data-sub="${l.uid}">${fmt(subtotalLinea(l))}</span></div>
        </li>`;
      }
      const it = ITEMS[l.id];
      return `<li class="tp-linea${l.uid === resaltar ? ' nueva' : ''}" data-uid="${l.uid}">
        <div class="tp-linea__fila">
          <span class="tp-linea__nombre">${esc(l.nombre)}<small>Ref. ${fmt(it.min)} – ${fmt(it.max)} / ${esc(it.unidad)}</small></span>
          <button class="tp-quitar" type="button" data-quitar="${l.uid}" aria-label="Quitar ${esc(l.nombre)}"><i class="ph-light ph-x" aria-hidden="true"></i></button>
        </div>
        <div class="tp-linea__fila tp-linea__edicion">
          <span class="tp-cant"><button type="button" data-menos="${l.uid}" aria-label="Uno menos">−</button><span data-cant-txt="${l.uid}">${l.cant}</span><button type="button" data-mas="${l.uid}" aria-label="Uno más">+</button></span>
          <span class="tp-x" aria-hidden="true">×</span>
          ${precioInput(l.precio, `data-l="${l.uid}"`, 'Precio de ' + l.nombre)}
          <span class="tp-linea__sub" data-sub="${l.uid}">${fmt(subtotalLinea(l))}</span>
        </div>
      </li>`;
    }).join('');
    papel.style.setProperty('--acento', perfil.color || '#c27a62');
    papel.innerHTML = `
      <header class="tp-cab">
        <button class="tp-logo${perfil.logo ? ' con' : ''}" type="button" data-abrir-ajustes aria-label="${perfil.logo ? 'Cambiar logo y datos' : 'Agregar tu logo'}">
          ${perfil.logo ? `<img src="${perfil.logo}" alt="">` : '<i class="ph-light ph-plus" aria-hidden="true"></i><span>Tu logo</span>'}
        </button>
        <div class="tp-doc"><span>Presupuesto</span><small>${actual.numero ? 'N° ' + nro(actual.numero) + ' · ' : ''}${fecha(actual.fecha)}</small></div>
      </header>
      <label class="tp-campo tp-campo--marca"><span class="sr-only">Tu nombre o marca</span><input type="text" data-perfil="nombre" value="${esc(perfil.nombre || '')}" placeholder="Tu nombre o marca" autocomplete="off"></label>
      <label class="tp-campo tp-campo--para"><span>Para</span><input type="text" data-cliente="nombre" value="${esc(actual.cliente.nombre)}" placeholder="Nombre del cliente" autocomplete="off"></label>
      ${actual.lineas.length ? `<ul class="tp-lineas">${lineas}</ul>` : `<div class="tp-vacio"><i class="ph-light ph-hand-tap" aria-hidden="true"></i><span>Tocá un servicio de la lista para sumarlo.</span></div>`}
      <dl class="tp-tot" data-tot></dl>
      <footer class="tp-pie">${ISO}<span>Hecho con el tarifario de Juan Guzman</span></footer>`;
    resaltar = null;
    pintarTotales();
    pintarCards();
  }

  function pintarTotales() {
    const t = totales();
    const fila = (dt, dd, cls = '') => `<div${cls ? ` class="${cls}"` : ''}><dt>${dt}</dt><dd>${dd}</dd></div>`;
    let h = '';
    if (actual.lineas.length) {
      if (t.ahorro || t.desc || t.urg || t.viat || t.iva) h += fila('Subtotal', fmt(t.bruto));
      if (t.ahorro) h += fila('Ahorro por combos', '−' + fmt(t.ahorro), 'menos');
      if (t.desc) h += fila(`Descuento ${t.dPct}%`, '−' + fmt(t.desc), 'menos');
      if (t.urg) h += fila(`Urgencia ${t.uPct}%`, '+' + fmt(t.urg));
      if (t.viat) h += fila('Viáticos', '+' + fmt(t.viat));
      if (t.iva) h += fila('IVA 21%', '+' + fmt(t.iva));
      h += fila('Total', fmt(t.total), 'total');
      h += fila(`Seña ${t.sPct}% · válido ${t.validez} días`, fmt(t.sena), 'sena');
    }
    const dl = $('[data-tot]', papel);
    if (dl) dl.innerHTML = h;
    const n = actual.lineas.length;
    $('[data-barra-n]', barra).textContent = n === 1 ? '1 servicio' : `${n} servicios`;
    $('[data-barra-total]', barra).textContent = fmt(t.total);
    actualizarBarra();
  }

  const linea = (u) => actual.lineas.find((l) => l.uid === u);
  papel.addEventListener('click', (ev) => {
    const b = ev.target.closest('button');
    if (!b) return;
    if (b.dataset.quitar) {
      actual.lineas = actual.lineas.filter((l) => l.uid !== b.dataset.quitar);
      actual.aportado = false; persistir(); pintarPapel(); return;
    }
    if (b.hasAttribute('data-abrir-ajustes')) { abrirAjustes(); return; }
    const l = linea(b.dataset.menos || b.dataset.mas);
    if (!l) return;
    l.cant = Math.max(1, l.cant + (b.dataset.mas ? 1 : -1));
    persistir();
    $(`[data-cant-txt="${l.uid}"]`, papel).textContent = l.cant;
    $(`[data-sub="${l.uid}"]`, papel).textContent = fmt(subtotalLinea(l));
    pintarTotales();
  });
  papel.addEventListener('input', (ev) => {
    const el = ev.target;
    if (el.dataset.perfil) { perfil[el.dataset.perfil] = el.value; guardado.set('tf-perfil', perfil); return; }
    if (el.dataset.cliente) { actual.cliente[el.dataset.cliente] = el.value; persistir(); return; }
    if (!el.dataset.l) return;
    const l = linea(el.dataset.l);
    const t = el.dataset.s != null ? l.items[Number(el.dataset.s)] : l;
    t.precio = entero(el.value); t.ref = false;
    if (t.precio) { precios[t.id] = t.precio; guardado.set('tf-precios', precios); pintarFilas(); }
    actual.aportado = false; persistir();
    $(`[data-sub="${l.uid}"]`, papel).textContent = fmt(subtotalLinea(l));
    pintarTotales();
  });
  papel.addEventListener('focusin', (ev) => { if (ev.target.dataset.l) ev.target.dataset.antes = entero(ev.target.value); });
  papel.addEventListener('focusout', (ev) => {
    const el = ev.target;
    if (!el.dataset.l) return;
    const v = entero(el.value);
    el.value = miles(v);
    if (v && String(v) !== el.dataset.antes) {
      const l = linea(el.dataset.l);
      const t = l && (el.dataset.s != null ? l.items[Number(el.dataset.s)] : l);
      if (t) aportarPrecio(t.id, v);
    }
  });
  papel.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' && ev.target.matches('input')) ev.target.blur(); });

  /* ---------- Celular: la hoja se abre desde la barra de abajo ---------- */
  const lado = $('[data-lado]', raiz);
  const barra = $('[data-barra]');
  const abrirLado = () => { lado.classList.add('abierto'); document.documentElement.classList.add('tf-sin-scroll'); actualizarBarra(); };
  const cerrarLado = () => { lado.classList.remove('abierto'); document.documentElement.classList.remove('tf-sin-scroll'); actualizarBarra(); };
  barra.addEventListener('click', abrirLado);
  $('[data-cerrar-lado]', raiz).addEventListener('click', cerrarLado);
  document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape' && lado.classList.contains('abierto')) cerrarLado(); });
  let catVisible = true;
  const actualizarBarra = () => {
    const ver = movil() && actual.lineas.length > 0 && catVisible && !lado.classList.contains('abierto');
    barra.hidden = false;
    barra.classList.toggle('visible', ver);
    barra.setAttribute('aria-hidden', String(!ver));
    barra.tabIndex = ver ? 0 : -1;
  };
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([e]) => { catVisible = e.isIntersecting; actualizarBarra(); }, { threshold: 0 }).observe($('.tf-cat', raiz));
  }
  window.addEventListener('resize', () => { if (!movil()) cerrarLado(); actualizarBarra(); });

  /* =========================================================
     Ajustes (dialogo)
     ========================================================= */
  const dlgAjustes = $('[data-ajustes]', raiz);
  // El color mas presente y con caracter del logo (descarta blancos, negros, grises y transparencias)
  function colorDominante(canvas) {
    const k = 40, c = document.createElement('canvas');
    c.width = k; c.height = Math.max(1, Math.round(k * canvas.height / canvas.width));
    const g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(canvas, 0, 0, c.width, c.height);
    const d = g.getImageData(0, 0, c.width, c.height).data;
    const cubos = {};
    for (let i = 0; i < d.length; i += 4) {
      const [r, gg, b, a] = [d[i], d[i + 1], d[i + 2], d[i + 3]];
      if (a < 160) continue;
      const mx = Math.max(r, gg, b), mn = Math.min(r, gg, b);
      const sat = mx ? (mx - mn) / mx : 0;
      if (sat < 0.28 || mx < 50 || mn > 225) continue;
      const clave = [r >> 4, gg >> 4, b >> 4].join(',');
      const cb = cubos[clave] || (cubos[clave] = { n: 0, r: 0, g: 0, b: 0, s: 0 });
      cb.n++; cb.r += r; cb.g += gg; cb.b += b; cb.s += sat;
    }
    const mejor = Object.values(cubos).sort((a, b) => b.n * (0.6 + b.s / b.n) - a.n * (0.6 + a.s / a.n))[0];
    if (!mejor || mejor.n < 6) return null;
    let [r, gg, b] = [mejor.r, mejor.g, mejor.b].map((v) => Math.round(v / mejor.n));
    // si es muy claro, se oscurece para que se lea sobre papel blanco
    const lum = (0.299 * r + 0.587 * gg + 0.114 * b) / 255;
    if (lum > 0.62) { const f = 0.62 / lum; [r, gg, b] = [r, gg, b].map((v) => Math.round(v * f)); }
    return '#' + [r, gg, b].map((v) => v.toString(16).padStart(2, '0')).join('');
  }
  const vistaLogo = () => {
    $('[data-logo-vista]', dlgAjustes).innerHTML = perfil.logo ? `<img src="${perfil.logo}" alt="Tu logo">` : '<i class="ph-light ph-image-square" aria-hidden="true"></i>';
    $('[data-logo-txt]', dlgAjustes).textContent = perfil.logo ? 'Cambiar logo' : 'Subir logo';
    $('[data-quitar-logo]', dlgAjustes).hidden = !perfil.logo;
  };
  function abrirAjustes() {
    $$('input[name], textarea[name]', dlgAjustes).forEach((el) => {
      const n = el.name;
      if (n.startsWith('perfil_')) el.value = perfil[n.slice(7)] || '';
      else if (n.startsWith('cliente_')) el.value = actual.cliente[n.slice(8)] || '';
      else if (n === 'notas') el.value = actual.notas;
      else if (n === 'viaticos') el.value = miles(entero(actual.ajustes.viaticos));
      else if (n === 'iva') el.checked = !!actual.ajustes.iva;
      else if (n in actual.ajustes) el.value = actual.ajustes[n];
    });
    const col = $('[name="perfil_color"]', dlgAjustes);
    col.value = perfil.color || '#c27a62';
    $('[data-color-txt]', dlgAjustes).textContent = perfil.colorManual ? 'Elegido por vos' : perfil.logo ? 'Tomado de tu logo' : 'Se toma de tu logo al subirlo';
    const ap = $('[data-aportar]', dlgAjustes);
    if (ap) ap.checked = guardado.get('tf-aportar', true);
    vistaLogo();
    dlgAjustes.showModal();
  }
  $$('[data-abrir-ajustes]', raiz).forEach((b) => b.addEventListener('click', abrirAjustes));
  dlgAjustes.addEventListener('input', (ev) => {
    const el = ev.target;
    const n = el.name;
    if (el.matches('[data-aportar]')) { guardado.set('tf-aportar', el.checked); return; }
    if (!n) return;
    if (n === 'perfil_color') { perfil.color = el.value; perfil.colorManual = true; guardado.set('tf-perfil', perfil); $('[data-color-txt]', dlgAjustes).textContent = 'Elegido por vos'; return; }
    if (n.startsWith('perfil_')) { perfil[n.slice(7)] = el.value; guardado.set('tf-perfil', perfil); return; }
    if (n.startsWith('cliente_')) actual.cliente[n.slice(8)] = el.value;
    else if (n === 'notas') actual.notas = el.value;
    else if (n === 'iva') actual.ajustes.iva = el.checked;
    else if (n in actual.ajustes) actual.ajustes[n] = el.value;
    persistir();
  });
  dlgAjustes.addEventListener('focusout', (ev) => { if (ev.target.name === 'viaticos') ev.target.value = miles(entero(ev.target.value)); });
  dlgAjustes.addEventListener('close', () => pintarPapel());
  dlgAjustes.addEventListener('click', (ev) => { if (ev.target === dlgAjustes) dlgAjustes.close(); });
  $('[data-quitar-logo]', dlgAjustes).addEventListener('click', () => { delete perfil.logo; if (!perfil.colorManual) delete perfil.color; guardado.set('tf-perfil', perfil); vistaLogo(); });
  $('[data-logo]', dlgAjustes).addEventListener('change', (ev) => {
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
        if (!perfil.colorManual) {
          const col = colorDominante(c);
          if (col) { perfil.color = col; $('[name="perfil_color"]', dlgAjustes).value = col; $('[data-color-txt]', dlgAjustes).textContent = 'Tomado de tu logo'; }
        }
        if (perfil.logo.length > 900000) perfil.logo = c.toDataURL('image/webp', 0.9);
        guardado.set('tf-perfil', perfil);
        vistaLogo();
      };
      img.onerror = () => tostada('No pude leer esa imagen. Probá con un PNG o JPG.');
      img.src = lector.result;
    };
    lector.readAsDataURL(f);
  });

  /* =========================================================
     Guardados, numeracion y copias
     ========================================================= */
  const dlgGuardados = $('[data-guardados]', raiz);
  const numerar = () => {
    if (actual.numero) return;
    const c = guardado.get('tf-contador', 0) + 1;
    guardado.set('tf-contador', c);
    actual.numero = c; persistir();
  };
  const guardarEnHistorial = () => {
    numerar();
    actual.guardado = new Date().toISOString();
    const copia = JSON.parse(JSON.stringify(actual));
    const i = historial.findIndex((h) => h.id === actual.id);
    if (i >= 0) historial[i] = copia; else historial.unshift(copia);
    historial = historial.slice(0, 200);
    guardado.set('tf-historial', historial);
    pintarHistorial();
    pintarPapel();
  };
  function pintarHistorial() {
    $('[data-historial-n]', raiz).textContent = historial.length ? `(${historial.length})` : '';
    $('[data-historial-vacio]', dlgGuardados).hidden = historial.length > 0;
    $('[data-historial-lista]', dlgGuardados).innerHTML = historial.map((h) => `<li>
      <span>N° ${nro(h.numero)} · ${esc(h.cliente.nombre || 'Sin cliente')}<span class="meta">${fecha(h.fecha)} · ${h.lineas.length} ${h.lineas.length === 1 ? 'servicio' : 'servicios'} · ${fmt(totales(h).total)}</span></span>
      <button class="tf-boton" type="button" data-abrir="${h.id}">Abrir</button>
      <button class="tf-boton" type="button" data-duplicar="${h.id}">Duplicar</button>
      <button class="tf-boton" type="button" data-borrar="${h.id}" aria-label="Borrar presupuesto ${nro(h.numero)}"><i class="ph-light ph-trash" aria-hidden="true"></i></button>
    </li>`).join('');
  }
  $('[data-abrir-guardados]', raiz).addEventListener('click', () => { pintarHistorial(); dlgGuardados.showModal(); });
  dlgGuardados.addEventListener('click', (ev) => {
    if (ev.target === dlgGuardados) { dlgGuardados.close(); return; }
    const b = ev.target.closest('button');
    if (!b) return;
    if (b.hasAttribute('data-cerrar-dialogo')) { dlgGuardados.close(); return; }
    if (b.hasAttribute('data-exportar')) { exportar(); return; }
    const id = b.dataset.abrir || b.dataset.duplicar || b.dataset.borrar;
    const h = historial.find((x) => x.id === id);
    if (!h) return;
    if (b.dataset.borrar) {
      if (!confirm(`¿Borrar el presupuesto N° ${nro(h.numero)}?`)) return;
      historial = historial.filter((x) => x.id !== id);
      guardado.set('tf-historial', historial); pintarHistorial(); return;
    }
    const p = JSON.parse(JSON.stringify(h));
    if (b.dataset.duplicar) Object.assign(p, { id: uid(), numero: 0, fecha: hoyISO(), aportado: false, guardado: null });
    actual = p; persistir(); pintarPapel();
    dlgGuardados.close();
    if (movil()) abrirLado();
    tostada(b.dataset.duplicar ? 'Copia lista para editar.' : `Presupuesto N° ${nro(p.numero)} abierto.`);
  });
  function exportar() {
    const datos = { app: 'tarifario-juanguzmanph', version: 1, exportado: new Date().toISOString(), perfil, precios, historial, contador: guardado.get('tf-contador', 0) };
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' }));
    a.download = `tarifario-copia-${hoyISO()}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }
  $('[data-importar]', dlgGuardados).addEventListener('change', (ev) => {
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
      pintarHistorial(); pintarPapel();
      tostada('Copia importada.');
    }).catch(() => tostada('No pude leer ese archivo. Tiene que ser una copia exportada desde el tarifario.'));
    ev.target.value = '';
  });

  /* ---------- Acciones ---------- */
  const hayLineas = () => {
    if (actual.lineas.length) return true;
    tostada('Sumá al menos un servicio.');
    return false;
  };
  $('[data-pdf]', raiz).addEventListener('click', () => { if (hayLineas()) pdf(); });
  $('[data-whatsapp]', raiz).addEventListener('click', () => { if (hayLineas()) whatsapp(); });
  $('[data-nuevo]', raiz).addEventListener('click', () => {
    if (actual.lineas.length) guardarEnHistorial();
    actual = nuevo(); persistir(); pintarPapel();
    tostada(historial.length ? 'Presupuesto nuevo. El anterior quedó en Guardados.' : 'Presupuesto nuevo.');
  });

  /* =========================================================
     PDF y WhatsApp
     ========================================================= */
  const hoja = $('#hoja');
  const armarHoja = () => {
    const t = totales();
    const contacto = [perfil.whatsapp, perfil.email, perfil.web, perfil.cuit ? 'CUIT ' + perfil.cuit : ''].filter(Boolean).map(esc).join(' · ');
    hoja.style.setProperty('--acento', perfil.color || '#c27a62');
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
    if (t.iva) tot += fila('IVA 21%', '+' + fmt(t.iva));
    tot += fila('Total', fmt(t.total), 'total') + fila(`Seña ${t.sPct}% para confirmar`, fmt(t.sena), 'sena');
    hoja.classList.toggle('margen', margenes);
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
  // Marca de agua: Chrome y Edge (131+) la imprimen en el margen inferior de TODAS las hojas.
  // Safari y Firefox no lo soportan: ahi va al final del presupuesto.
  const chrome = (navigator.userAgent.match(/(?:Chrome|Edg)\/(\d+)/) || [])[1];
  const margenes = Number(chrome) >= 131;
  if (margenes) {
    const svg = ISO.replace(/currentColor/g, '#b5b5b5').replace(/ aria-hidden="true"| focusable="false"/g, '').replace('<svg', '<svg width="7" height="10"');
    const icono = 'data:image/svg+xml,' + encodeURIComponent(svg.includes('xmlns') ? svg : svg.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"'));
    const st = document.createElement('style');
    st.textContent = `@media print { @page { @bottom-center { content: url("${icono}") "   Hecho con el tarifario de Juan Guzman · juanguzmanph.com/tarifario"; font-family: Geist, Helvetica, Arial, sans-serif; font-size: 7pt; letter-spacing: 0.04em; color: #9a9a9a; vertical-align: middle; } } }`;
    document.head.appendChild(st);
  }
  let tituloOriginal = document.title;
  window.addEventListener('afterprint', () => { document.title = tituloOriginal; });
  function pdf() {
    guardarEnHistorial(); armarHoja(); aportar();
    tituloOriginal = document.title;
    document.title = `Presupuesto ${nro(actual.numero)}${actual.cliente.nombre ? ' - ' + actual.cliente.nombre : ''}`;
    tostada('Elegí "Guardar como PDF" en la ventana de impresión.');
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
    if (t.iva) r.push(`IVA 21%: +${fmt(t.iva)}`);
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
  // Cada precio propio que se guarda en la lista suma al promedio (anonimo; el servidor
  // cuenta un aporte por servicio y dispositivo cada 30 dias)
  function aportarPrecio(id, precio) {
    if (!ENDPOINT || !guardado.get('tf-aportar', true)) return;
    const it = ITEMS[id];
    if (!it || precio < it.min * 0.25 || precio > it.max * 4) return;
    const cola = guardado.get('tf-pendientes', []);
    cola.push({ v: D.version, ciudad: 'tucuman', dispositivo, items: [{ id, precio }], web: '' });
    guardado.set('tf-pendientes', cola.slice(-60));
    clearTimeout(aportarPrecio.t);
    aportarPrecio.t = setTimeout(enviarPendientes, 1500);
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
        .then((c) => { if (c && c.servicios) { comunidad = c; guardado.set('tf-comunidad', c); pintarEstadoCom(); pintarFilas(); pintarPapel(); } })
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
  if (ENDPOINT) { $('[data-aporte]', raiz).hidden = false; $('[data-pista-com]', raiz).hidden = false; }
  pintarFilas();
  pintarPapel();
  pintarHistorial();
})();
