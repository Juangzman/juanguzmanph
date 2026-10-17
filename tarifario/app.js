/* Tarifario · cotizador
   Todo se guarda en este dispositivo (localStorage). Nada sale de acá salvo
   el aporte anonimo al promedio (servicio + precio), y solo si se tilda. */
(() => {
  const raiz = document.querySelector('[data-tarifario]');
  const fuente = document.getElementById('tf-datos');
  if (!raiz || !fuente) return;
  const D = JSON.parse(fuente.textContent);
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Datos del catalogo ---------- */
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

  let tostadaT;
  const tostada = (txt) => {
    let t = $('.tf-tostada');
    if (!t) {
      t = document.createElement('div');
      t.className = 'tf-tostada';
      t.setAttribute('role', 'status');
      t.style.cssText = 'position:fixed;z-index:60;left:50%;top:calc(var(--nav-h) + env(safe-area-inset-top) + 12px);transform:translateX(-50%);max-width:min(92vw,440px);padding:12px 18px;border-radius:14px;background:var(--blanco);color:var(--negro);font-size:14px;line-height:1.45;box-shadow:0 18px 50px -12px rgba(0,0,0,.7);transition:opacity 300ms ease;opacity:0;pointer-events:none';
      document.body.appendChild(t);
    }
    t.textContent = txt;
    requestAnimationFrame(() => { t.style.opacity = '1'; });
    clearTimeout(tostadaT);
    tostadaT = setTimeout(() => { t.style.opacity = '0'; }, 3800);
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
  // descarta lineas de servicios que ya no existen en el catalogo
  actual.lineas = actual.lineas.filter((l) => (l.tipo === 'combo' ? l.items.every((s) => ITEMS[s.id]) : ITEMS[l.id]));
  const persistir = () => { guardado.set('tf-actual', actual); };

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
    return { bruto, ahorro, dPct, desc, uPct, urg, viat, total, sPct, sena: total * sPct / 100, validez: entero(a.validez) || 15 };
  };
  const subtotalLinea = (l) => {
    if (l.tipo !== 'combo') return l.precio * l.cant;
    const s = l.items.reduce((a, x) => a + x.precio * x.cant, 0);
    return s - s * l.descuento / 100;
  };

  /* ---------- Catalogo: precio propio y boton Sumar ---------- */
  const filas = $$('.tf-item', raiz);
  const enPresu = (id) => actual.lineas.some((l) => l.tipo !== 'combo' && l.id === id);
  const pintarFila = (fila) => {
    const on = enPresu(fila.dataset.id);
    const b = $('[data-sumar]', fila);
    b.setAttribute('aria-pressed', String(on));
    b.querySelector('i').className = 'ph-light ' + (on ? 'ph-check' : 'ph-plus');
    b.querySelector('span').textContent = on ? 'Sumado' : 'Sumar';
  };
  filas.forEach((fila) => {
    const id = fila.dataset.id;
    const input = $('[data-precio]', fila);
    if (precios[id]) input.value = miles(precios[id]);
    input.addEventListener('input', () => {
      const v = entero(input.value);
      if (v) precios[id] = v; else delete precios[id];
      guardado.set('tf-precios', precios);
      // el precio nuevo se aplica a ese servicio si ya esta en el presupuesto
      let cambio = false;
      actual.lineas.forEach((l) => {
        if (l.tipo === 'combo') l.items.forEach((s) => { if (s.id === id) { s.precio = v || medio(ITEMS[id]); s.ref = !v; cambio = true; } });
        else if (l.id === id) { l.precio = v || medio(ITEMS[id]); l.ref = !v; cambio = true; }
      });
      if (cambio) { persistir(); pintarLineas(); }
      pintarCombos();
    });
    input.addEventListener('blur', () => { input.value = miles(entero(input.value)); });
    input.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') { ev.preventDefault(); if (!enPresu(id)) $('[data-sumar]', fila).click(); input.blur(); } });
    $('[data-sumar]', fila).addEventListener('click', () => {
      if (enPresu(id)) {
        actual.lineas = actual.lineas.filter((l) => !(l.tipo !== 'combo' && l.id === id));
      } else {
        const it = ITEMS[id];
        const v = precios[id];
        actual.lineas.push({ uid: uid(), tipo: 'item', id, nombre: it.nombre, unidad: it.unidad, cant: 1, precio: v || medio(it), ref: !v });
        if (!v) tostada(`${it.nombre}: sumado con el precio medio de referencia. Podés cambiarlo en el presupuesto.`);
      }
      actual.aportado = false;
      persistir(); pintarFila(fila); pintarLineas();
    });
    pintarFila(fila);
  });

  /* ---------- Combos ---------- */
  const tarjetas = $$('[data-combo]', raiz);
  const comboEnPresu = (id) => actual.lineas.some((l) => l.tipo === 'combo' && l.id === id);
  const pintarCombos = () => tarjetas.forEach((t) => {
    const co = COMBOS[t.dataset.combo];
    const its = co.items.map((x) => ITEMS[x]);
    const propios = its.filter((it) => precios[it.id]).length;
    const f = 1 - co.descuento / 100;
    if (propios) {
      const suelto = its.reduce((a, it) => a + (precios[it.id] || medio(it)), 0);
      $('[data-combo-suelto]', t).textContent = fmt(suelto);
      $('[data-combo-total]', t).textContent = fmt(Math.round(suelto * f / 1000) * 1000);
      $('[data-combo-nota]', t).textContent = propios === its.length ? 'Con tus precios' : 'Con tus precios y la referencia';
    } else {
      const smin = its.reduce((a, it) => a + it.min, 0), smax = its.reduce((a, it) => a + it.max, 0);
      $('[data-combo-suelto]', t).textContent = `${fmt(smin)} – ${fmt(smax)}`;
      $('[data-combo-total]', t).textContent = `${fmt(Math.round(smin * f / 1000) * 1000)} – ${fmt(Math.round(smax * f / 1000) * 1000)}`;
      $('[data-combo-nota]', t).textContent = 'Con los precios de referencia';
    }
    const on = comboEnPresu(co.id);
    const b = $('[data-sumar-combo]', t);
    b.setAttribute('aria-pressed', String(on));
    b.innerHTML = `<i class="ph-light ${on ? 'ph-check' : 'ph-plus'}" aria-hidden="true"></i> ${on ? 'Combo sumado' : 'Sumar combo'}`;
  });
  tarjetas.forEach((t) => $('[data-sumar-combo]', t).addEventListener('click', () => {
    const co = COMBOS[t.dataset.combo];
    if (comboEnPresu(co.id)) actual.lineas = actual.lineas.filter((l) => !(l.tipo === 'combo' && l.id === co.id));
    else {
      actual.lineas.push({
        uid: uid(), tipo: 'combo', id: co.id, nombre: co.nombre, descuento: co.descuento,
        items: co.items.map((x) => ({ id: x, nombre: ITEMS[x].nombre, cant: 1, precio: precios[x] || medio(ITEMS[x]), ref: !precios[x] })),
      });
    }
    actual.aportado = false;
    persistir(); pintarLineas();
  }));

  /* ---------- Lineas del presupuesto ---------- */
  const lista = $('[data-lineas]', raiz);
  const vacio = $('[data-vacio]', raiz);
  const campoPrecio = (valor, attrs, etiqueta) => `<label class="tf-precio"><span class="sr-only">${esc(etiqueta)}</span><span aria-hidden="true">$</span><input type="text" inputmode="numeric" autocomplete="off" value="${miles(valor)}" ${attrs}></label>`;
  function pintarLineas() {
    lista.innerHTML = actual.lineas.map((l) => {
      if (l.tipo === 'combo') {
        const subs = l.items.map((s, i) => `<li><span>${esc(s.nombre)}${s.ref ? ' <small class="meta">· referencia</small>' : ''}</span>${campoPrecio(s.precio, `data-l="${l.uid}" data-s="${i}"`, 'Precio de ' + s.nombre)}</li>`).join('');
        return `<li class="tf-linea tf-linea--combo">
          <div class="tf-linea__nombre">${esc(l.nombre)}<small>${l.descuento}% menos por contratarlo junto</small></div>
          <button class="tf-linea__quitar" type="button" data-quitar="${l.uid}" aria-label="Quitar combo ${esc(l.nombre)}"><i class="ph-light ph-x" aria-hidden="true"></i></button>
          <ul class="tf-sublineas">${subs}</ul>
          <div class="tf-linea__fila"><span class="tf-linea__sub" data-sub="${l.uid}">${fmt(subtotalLinea(l))}</span></div>
        </li>`;
      }
      return `<li class="tf-linea">
        <div class="tf-linea__nombre">${esc(l.nombre)}<small${l.ref ? ' class="ref"' : ''}>Por ${esc(l.unidad)}${l.ref ? ' · precio medio de referencia' : ''}</small></div>
        <button class="tf-linea__quitar" type="button" data-quitar="${l.uid}" aria-label="Quitar ${esc(l.nombre)}"><i class="ph-light ph-x" aria-hidden="true"></i></button>
        <div class="tf-linea__fila">
          <div class="tf-cant"><button type="button" data-menos="${l.uid}" aria-label="Uno menos">−</button><input type="text" inputmode="numeric" value="${l.cant}" data-cant="${l.uid}" aria-label="Cantidad"><button type="button" data-mas="${l.uid}" aria-label="Uno más">+</button></div>
          ${campoPrecio(l.precio, `data-l="${l.uid}"`, 'Precio de ' + l.nombre)}
          <span class="tf-linea__sub" data-sub="${l.uid}">${fmt(subtotalLinea(l))}</span>
        </div>
      </li>`;
    }).join('');
    vacio.hidden = actual.lineas.length > 0;
    pintarTotales();
    filas.forEach(pintarFila);
    pintarCombos();
  }
  const linea = (u) => actual.lineas.find((l) => l.uid === u);
  lista.addEventListener('click', (ev) => {
    const b = ev.target.closest('button');
    if (!b) return;
    if (b.dataset.quitar) { actual.lineas = actual.lineas.filter((l) => l.uid !== b.dataset.quitar); actual.aportado = false; persistir(); pintarLineas(); return; }
    const l = linea(b.dataset.menos || b.dataset.mas);
    if (!l) return;
    l.cant = Math.max(1, l.cant + (b.dataset.mas ? 1 : -1));
    persistir(); pintarLineas();
  });
  lista.addEventListener('input', (ev) => {
    const el = ev.target;
    if (el.dataset.cant) {
      const l = linea(el.dataset.cant);
      l.cant = Math.max(1, entero(el.value) || 1);
    } else if (el.dataset.l) {
      const l = linea(el.dataset.l);
      const v = entero(el.value);
      const t = el.dataset.s != null ? l.items[Number(el.dataset.s)] : l;
      t.precio = v; t.ref = false;
      actual.aportado = false;
    } else return;
    persistir();
    $$('[data-sub]', lista).forEach((s) => { const l = linea(s.dataset.sub); if (l) s.textContent = fmt(subtotalLinea(l)); });
    pintarTotales();
  });
  lista.addEventListener('focusout', (ev) => {
    const el = ev.target;
    if (el.dataset.l) el.value = miles(entero(el.value));
    if (el.dataset.cant) el.value = linea(el.dataset.cant).cant;
    if (el.dataset.l && !el.closest('.tf-sublineas')) {
      // al salir del campo, se quita la marca "referencia"
      const l = linea(el.dataset.l);
      const small = el.closest('.tf-linea').querySelector('.tf-linea__nombre small');
      if (l && small && !l.ref) { small.className = ''; small.textContent = 'Por ' + l.unidad; }
    }
  });

  /* ---------- Totales y barra flotante ---------- */
  const dl = $('[data-totales]', raiz);
  const barra = $('[data-barra]');
  function pintarTotales() {
    const t = totales();
    const fila = (dt, dd, cls = '') => `<div${cls ? ` class="${cls}"` : ''}><dt>${dt}</dt><dd>${dd}</dd></div>`;
    let h = fila('Subtotal', fmt(t.bruto));
    if (t.ahorro) h += fila('Ahorro por combos', '−' + fmt(t.ahorro), 'menos');
    if (t.desc) h += fila(`Descuento ${t.dPct}%`, '−' + fmt(t.desc), 'menos');
    if (t.urg) h += fila(`Urgencia ${t.uPct}%`, '+' + fmt(t.urg));
    if (t.viat) h += fila('Viáticos', '+' + fmt(t.viat));
    h += fila('Total', fmt(t.total), 'total');
    h += fila(`Seña ${t.sPct}%`, fmt(t.sena), 'sena');
    dl.innerHTML = h;
    const n = actual.lineas.length;
    $('[data-barra-n]', barra).textContent = n === 1 ? '1 servicio' : `${n} servicios`;
    $('[data-barra-total]', barra).textContent = fmt(t.total);
    actualizarBarra();
    $('[data-numero]', raiz).textContent = actual.numero ? 'N° ' + nro(actual.numero) : '';
  }
  let presuVisible = false;
  const actualizarBarra = () => {
    const ver = actual.lineas.length > 0 && !presuVisible;
    barra.hidden = false;
    barra.classList.toggle('visible', ver);
    barra.setAttribute('aria-hidden', String(!ver));
    barra.tabIndex = ver ? 0 : -1;
  };
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([e]) => { presuVisible = e.isIntersecting; actualizarBarra(); }, { rootMargin: '0px 0px -30% 0px' })
      .observe($('#presupuesto'));
  }

  /* ---------- Formularios: cliente, perfil, ajustes, notas ---------- */
  const presu = $('[data-presu]', raiz);
  const cargarCampos = () => {
    $$('input[name], textarea[name]', presu).forEach((el) => {
      const n = el.name;
      if (n === 'aportar') return;
      if (n.startsWith('perfil_')) el.value = perfil[n.slice(7)] ?? el.value;
      else if (n.startsWith('cliente_')) el.value = actual.cliente[n.slice(8)] || '';
      else if (n === 'notas') el.value = actual.notas;
      else if (n === 'viaticos') el.value = miles(entero(actual.ajustes.viaticos));
      else if (n in actual.ajustes) el.value = actual.ajustes[n];
    });
  };
  presu.addEventListener('input', (ev) => {
    const el = ev.target;
    const n = el.name;
    if (!n || n === 'aportar') return;
    if (n.startsWith('perfil_')) { perfil[n.slice(7)] = el.value; guardado.set('tf-perfil', perfil); return; }
    if (n.startsWith('cliente_')) actual.cliente[n.slice(8)] = el.value;
    else if (n === 'notas') actual.notas = el.value;
    else if (n in actual.ajustes) { actual.ajustes[n] = el.value; pintarTotales(); }
    persistir();
  });
  presu.addEventListener('focusout', (ev) => {
    if (ev.target.name === 'viaticos') ev.target.value = miles(entero(ev.target.value));
  });

  /* ---------- Numeracion e historial ---------- */
  const numerar = () => {
    if (!actual.numero) {
      const c = guardado.get('tf-contador', 0) + 1;
      guardado.set('tf-contador', c);
      actual.numero = c;
      persistir();
      pintarTotales();
    }
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
  };
  const hLista = $('[data-historial-lista]', raiz);
  function pintarHistorial() {
    $('[data-historial-n]', raiz).textContent = historial.length;
    hLista.innerHTML = historial.map((h) => `<li>
      <span>N° ${nro(h.numero)} · ${esc(h.cliente.nombre || 'Sin cliente')}<span class="meta">${fecha(h.fecha)} · ${h.lineas.length} ${h.lineas.length === 1 ? 'servicio' : 'servicios'} · ${fmt(totales(h).total)}</span></span>
      <button class="tf-boton" type="button" data-abrir="${h.id}">Abrir</button>
      <button class="tf-boton" type="button" data-duplicar="${h.id}">Duplicar</button>
      <button class="tf-boton" type="button" data-borrar="${h.id}" aria-label="Borrar presupuesto ${nro(h.numero)}"><i class="ph-light ph-trash" aria-hidden="true"></i></button>
    </li>`).join('');
  }
  const abrir = (p) => {
    actual = p; persistir(); cargarCampos(); pintarLineas();
    $('#presupuesto').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
  };
  hLista.addEventListener('click', (ev) => {
    const b = ev.target.closest('button');
    if (!b) return;
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
    abrir(p);
    tostada(b.dataset.duplicar ? 'Copia lista para editar. Tiene número nuevo al guardarla.' : `Presupuesto N° ${nro(p.numero)} abierto.`);
  });

  /* ---------- Copia de seguridad ---------- */
  $('[data-exportar]', raiz).addEventListener('click', () => {
    const datos = { app: 'tarifario-juanguzmanph', version: 1, exportado: new Date().toISOString(), perfil, precios, historial, contador: guardado.get('tf-contador', 0) };
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' }));
    a.download = `tarifario-copia-${hoyISO()}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  });
  $('[data-importar]', raiz).addEventListener('change', (ev) => {
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
      filas.forEach((fila) => { const v = precios[fila.dataset.id]; $('[data-precio]', fila).value = v ? miles(v) : ''; });
      cargarCampos(); pintarHistorial(); pintarLineas();
      tostada('Copia importada: precios, datos y presupuestos guardados.');
    }).catch(() => tostada('No pude leer ese archivo. Tiene que ser una copia exportada desde el tarifario.'));
    ev.target.value = '';
  });

  /* ---------- Aviso del panel ---------- */
  const aviso = $('[data-aviso]', raiz);
  let avisoT;
  const avisar = (txt) => { aviso.textContent = txt; clearTimeout(avisoT); avisoT = setTimeout(() => { aviso.textContent = ''; }, 4000); };
  const hayLineas = () => {
    if (actual.lineas.length) return true;
    avisar('Sumá al menos un servicio.');
    return false;
  };

  /* ---------- PDF (hoja para imprimir o guardar como PDF) ---------- */
  const hoja = $('#hoja');
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
    let tot = fila('Subtotal', fmt(t.bruto - t.ahorro));
    if (t.desc) tot += fila(`Descuento ${t.dPct}%`, '−' + fmt(t.desc), 'menos');
    if (t.urg) tot += fila(`Recargo por urgencia ${t.uPct}%`, '+' + fmt(t.urg));
    if (t.viat) tot += fila('Viáticos', '+' + fmt(t.viat));
    tot += fila('Total', fmt(t.total), 'total') + fila(`Seña ${t.sPct}% para confirmar`, fmt(t.sena), 'sena');
    hoja.innerHTML = `
      <header class="hj-cab">
        <div><div class="hj-marca">${esc(perfil.nombre || 'Presupuesto')}</div>
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
      <footer class="hj-pie"><span>Hecho con el tarifario gratuito de juanguzmanph.com/tarifario</span><span>N° ${nro(actual.numero)}</span></footer>`;
  };
  let tituloOriginal = document.title;
  window.addEventListener('afterprint', () => { document.title = tituloOriginal; });
  $('[data-pdf]', raiz).addEventListener('click', () => {
    if (!hayLineas()) return;
    guardarEnHistorial();
    armarHoja();
    aportar();
    tituloOriginal = document.title;
    document.title = `Presupuesto ${nro(actual.numero)}${actual.cliente.nombre ? ' - ' + actual.cliente.nombre : ''}`;
    avisar('Elegí "Guardar como PDF" en la ventana de impresión.');
    setTimeout(() => window.print(), 60);
  });

  /* ---------- WhatsApp ---------- */
  $('[data-whatsapp]', raiz).addEventListener('click', () => {
    if (!hayLineas()) return;
    guardarEnHistorial();
    aportar();
    const t = totales();
    const r = [];
    r.push(`*Presupuesto N° ${nro(actual.numero)}*${perfil.nombre ? ' · ' + perfil.nombre : ''}`);
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
    r.push(`*Total: ${fmt(t.total)}*`);
    r.push(`Seña ${t.sPct}%: ${fmt(t.sena)}`);
    r.push(`Válido hasta el ${fecha(actual.fecha, t.validez)}.`);
    window.open('https://wa.me/?text=' + encodeURIComponent(r.join('\n')), '_blank', 'noopener');
  });

  /* ---------- Guardar y nuevo ---------- */
  $('[data-guardar]', raiz).addEventListener('click', () => {
    if (!hayLineas()) return;
    guardarEnHistorial(); aportar();
    avisar(`Guardado como N° ${nro(actual.numero)}.`);
  });
  $('[data-nuevo]', raiz).addEventListener('click', () => {
    if (actual.lineas.length) guardarEnHistorial();
    actual = nuevo(); persistir(); cargarCampos(); pintarLineas();
    avisar('Presupuesto nuevo. El anterior quedó guardado.');
  });

  /* ---------- Promedio de la comunidad (Google Sheets) ---------- */
  const ENDPOINT = (D.endpoint || '').trim();
  const MIN = D.minimo_aportes || 5;
  const casilla = $('[data-aporte]', raiz);
  let dispositivo = guardado.get('tf-dispositivo', '');
  if (!dispositivo) { dispositivo = uid() + uid(); guardado.set('tf-dispositivo', dispositivo); }

  function aportar() {
    if (!ENDPOINT || actual.aportado || !$('input', casilla).checked) return;
    const vistos = {};
    const sumar = (id, precio, ref) => {
      const it = ITEMS[id];
      if (!it || ref || !precio) return;
      if (precio < it.min * 0.25 || precio > it.max * 4) return; // valores absurdos no se mandan
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
    const p = cola[0];
    fetch(ENDPOINT, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(p) })
      .then(() => {
        guardado.set('tf-pendientes', guardado.get('tf-pendientes', []).slice(1));
        enviando = false; enviarPendientes();
      })
      .catch(() => { enviando = false; });
  }

  const pintarComunidad = (c) => {
    if (!c || !c.servicios) return;
    let total = 0;
    filas.forEach((fila) => {
      const s = c.servicios[fila.dataset.id];
      const el = $('[data-com]', fila);
      if (s) total += s.n;
      if (s && s.n >= MIN) {
        el.textContent = `Promedio en Tucumán ${fmt(s.promedio)} · ${s.n} aportes`;
        el.title = `La mitad de los aportes está entre ${fmt(s.p25)} y ${fmt(s.p75)}`;
        el.hidden = false;
      } else el.hidden = true;
    });
    const estado = $('[data-com-estado]', raiz);
    if (total) { estado.textContent = `${total.toLocaleString('es-AR')} aportes de la comunidad`; estado.hidden = false; }
  };
  if (ENDPOINT) {
    casilla.hidden = false;
    pintarComunidad(guardado.get('tf-comunidad', null));
    if (navigator.onLine) {
      fetch(ENDPOINT + (ENDPOINT.includes('?') ? '&' : '?') + 'accion=promedios', { cache: 'no-store' })
        .then((r) => r.json())
        .then((c) => { if (c && c.servicios) { guardado.set('tf-comunidad', c); pintarComunidad(c); } })
        .catch(() => {});
    }
    enviarPendientes();
    window.addEventListener('online', enviarPendientes);
  }

  /* ---------- Compartir ---------- */
  $('[data-compartir]', raiz).addEventListener('click', () => {
    const url = 'https://www.juanguzmanph.com/tarifario/';
    const datos = { title: 'Tarifario de fotografía, diseño y web en Tucumán', text: 'Precios de referencia y cotizador gratis para fotógrafos y diseñadores de Tucumán.', url };
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
  cargarCampos();
  pintarLineas();
  pintarHistorial();
})();
