/* Estudio · panel privado para manejar la galería de juanguzmanph.com
   Todo pasa en tu navegador: las fotos se achican acá y se guardan en GitHub con tu clave.
   Después GitHub vuelve a generar la web sola (.github/workflows/publicar.yml). */
(() => {
  const CFG = window.ESTUDIO_CONFIG;
  const REPO = { owner: CFG.owner, repo: CFG.repo, rama: CFG.rama };
  const API = `https://api.github.com/repos/${REPO.owner}/${REPO.repo}`;
  const RAW = `https://raw.githubusercontent.com/${REPO.owner}/${REPO.repo}/${REPO.rama}/`;
  const CLAVE = `estudio-sesion-${CFG.repo}`;
  const CARPETAS = CFG.carpetas || { fotos: CFG.carpetaFotos, portada: 'img/h', piezas: 'img/d', videos: 'video' };
  const ANCHOS = CFG.anchos;
  const FOTOS = CFG.carpetaFotos;
  const WEB = CFG.raizWeb;
  document.getElementById('marca').textContent = CFG.marca;

  const $ = (s) => document.querySelector(s);
  const el = (tag, attrs = {}, html = '') => { const n = document.createElement(tag); Object.entries(attrs).forEach(([k, v]) => n.setAttribute(k, v)); if (html) n.innerHTML = html; return n; };

  let token = null;
  let galeria = null;        // contenido de data/galeria.json (atajo a DOCS.galeria.datos)
  let actual = null;         // id de la categoría que se está viendo
  const nuevas = new Map();  // slug -> { archivos: [{ ruta, blob }], url }  (subidas sin publicar)
  const publicadas = new Map(); // slug -> miniatura local, hasta que GitHub regenere la web
  let ocupado = false;

  /* ---------- Avisos ---------- */
  let avisoTimer;
  const avisar = (texto, accion) => {
    const a = $('#aviso');
    a.innerHTML = '';
    a.append(el('span', {}, texto));
    if (accion) { const b = el('button', { type: 'button' }, accion.texto); b.onclick = () => { accion.fn(); a.hidden = true; }; a.append(b); }
    a.hidden = false;
    clearTimeout(avisoTimer);
    avisoTimer = setTimeout(() => { a.hidden = true; }, accion ? 7000 : 4500);
  };

  /* ---------- GitHub ---------- */
  const gh = async (ruta, { method = 'GET', body, accept } = {}) => {
    const r = await fetch(API + ruta, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: accept || 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      cache: 'no-store',
    });
    if (!r.ok) {
      const e = new Error(`GitHub respondió ${r.status}`);
      e.status = r.status;
      throw e;
    }
    return accept && accept.includes('raw') ? r.text() : r.json();
  };

  const aBase64 = (blob) => new Promise((ok, mal) => {
    const fr = new FileReader();
    fr.onload = () => ok(String(fr.result).split(',')[1]);
    fr.onerror = mal;
    fr.readAsDataURL(blob);
  });

  /* ---------- Cifrado de accesos ----------
     La clave de GitHub se guarda cifrada en accesos.json con una llave al azar (K).
     Cada usuario guarda K cifrada con su propia contraseña. Así:
     - se entra con usuario y contraseña, sin tocar GitHub;
     - si la clave de GitHub vence, se cambia una sola vez y todos siguen entrando. */
  const te = new TextEncoder(), td = new TextDecoder();
  const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
  const deB64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
  const azar = (n) => crypto.getRandomValues(new Uint8Array(n));
  const ITER = 600000;
  const norm = (u) => u.trim().toLowerCase();
  const llaveDeContrasena = async (contrasena, sal) => {
    const base = await crypto.subtle.importKey('raw', te.encode(contrasena), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: sal, iterations: ITER, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  };
  const llaveCruda = (bytes) => crypto.subtle.importKey('raw', bytes, 'AES-GCM', false, ['encrypt', 'decrypt']);
  const cifrar = async (llave, datos, extra) => {
    const iv = azar(12);
    const c = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: te.encode(extra || '') }, llave, datos);
    return { iv: b64(iv), datos: b64(c) };
  };
  const descifrar = async (llave, { iv, datos }, extra) =>
    crypto.subtle.decrypt({ name: 'AES-GCM', iv: deB64(iv), additionalData: te.encode(extra || '') }, llave, deB64(datos));

  let accesos = null;   // contenido de accesos.json (null = todavía no hay)
  let K = null;         // llave de los accesos (solo si se entró con usuario y contraseña o se crearon recién)
  let quien = '';       // usuario que entró ('' = con clave de GitHub)

  const leerAccesos = async () => {
    const urls = [`${WEB}${CFG.accesos}?nc=${Date.now()}`, `${RAW}${CFG.accesos}?nc=${Date.now()}`];
    for (const u of urls) {
      try { const r = await fetch(u, { cache: 'no-store' }); if (r.ok) return await r.json(); } catch (e) {}
    }
    return null;
  };

  /* ---------- Ingreso ---------- */
  const guardarSesion = (recordar) => {
    const s = JSON.stringify({ token, k: K ? b64(K) : null, quien });
    try { sessionStorage.setItem(CLAVE, s); if (recordar) localStorage.setItem(CLAVE, s); } catch (e) { /* modo privado: funciona mientras la pestaña esté abierta */ }
  };

  const abrir = async () => {
    const repo = await gh('');
    if (!repo.permissions || !repo.permissions.push) { const e = new Error('sin permiso'); e.status = 403; throw e; }
    await cargarTodo();
    $('#quien').textContent = quien ? `Hola, ${quien}` : 'Administrador';
    $('#ingreso').hidden = true;
    $('#app').hidden = false;
  };

  const entrarConUsuario = async (usuario, contrasena) => {
    accesos = await leerAccesos();
    const u = accesos && accesos.usuarios.find((x) => x.usuario === norm(usuario));
    if (!u) { const e = new Error('usuario'); e.motivo = 'datos'; throw e; }
    try {
      const llave = await llaveDeContrasena(contrasena, deB64(u.sal));
      K = new Uint8Array(await descifrar(llave, u, u.usuario));
      token = td.decode(await descifrar(await llaveCruda(K), accesos.clave, 'github'));
    } catch (e) { const x = new Error('contraseña'); x.motivo = 'datos'; throw x; }
    quien = u.usuario;
  };

  const salir = () => {
    if (hayCambios() && !confirm('Tenés cambios sin publicar. ¿Salir igual?')) return;
    try { localStorage.removeItem(CLAVE); sessionStorage.removeItem(CLAVE); } catch (e) {}
    location.reload();
  };

  const modoIngreso = (github) => {
    $('#camposUsuario').hidden = github;
    $('#camposGithub').hidden = !github;
    $('#usuario').required = !github; $('#contrasena').required = !github; $('#clave').required = github;
    $('#cambiarModo').textContent = github ? 'Entrar con usuario y contraseña' : 'Entrar con clave de GitHub';
    $('#formIngreso').dataset.modo = github ? 'github' : 'usuario';
  };
  $('#cambiarModo').addEventListener('click', () => modoIngreso($('#formIngreso').dataset.modo !== 'github'));

  $('#formIngreso').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const err = $('#errorIngreso');
    err.hidden = true;
    $('#btnEntrar').disabled = true;
    $('#btnEntrar').classList.add('esperando');
    try {
      if ($('#formIngreso').dataset.modo === 'github') {
        token = $('#clave').value.trim(); K = null; quien = '';
        accesos = await leerAccesos();
      } else {
        await entrarConUsuario($('#usuario').value, $('#contrasena').value);
      }
      await abrir();
      guardarSesion($('#recordar').checked);
    } catch (e) {
      token = null; K = null;
      err.textContent = e.motivo === 'datos' ? 'Usuario o contraseña incorrectos.'
        : e.status === 401 ? 'La clave de GitHub no es válida o venció. Pedile al administrador que la actualice.'
        : e.status === 403 || e.status === 404 ? 'Esa clave no tiene permiso para cambiar la web (necesita Contents: Read and write).'
        : 'No pude conectar. Revisá tu conexión e intentá de nuevo.';
      err.hidden = false;
    }
    $('#btnEntrar').disabled = false;
    $('#btnEntrar').classList.remove('esperando');
  });
  $('#btnSalir').addEventListener('click', salir);

  /* ---------- Accesos: usuarios y contraseñas ---------- */
  const guardarAccesos = async (mensaje) => {
    let sha;
    try { sha = (await gh(`/contents/${CFG.accesos}?ref=${REPO.rama}`)).sha; } catch (e) { if (e.status !== 404) throw e; }
    const contenido = btoa(unescape(encodeURIComponent(JSON.stringify(accesos, null, 1) + '\n')));
    await gh(`/contents/${CFG.accesos}`, { method: 'PUT', body: { message: mensaje, content: contenido, branch: REPO.rama, ...(sha ? { sha } : {}) } });
  };

  const pintarAccesos = () => {
    const lista = $('#listaAccesos');
    lista.innerHTML = '';
    const usuarios = accesos ? accesos.usuarios : [];
    usuarios.forEach((u) => {
      const li = el('li', {}, `<span><i class="ph-light ph-user-circle"></i> ${u.usuario}${u.usuario === quien ? ' <small>(vos)</small>' : ''}</span>`);
      const b = el('button', { type: 'button', class: 'link' }, 'Quitar');
      b.disabled = usuarios.length === 1;
      b.onclick = async () => {
        if (!confirm(`¿Quitar el acceso de ${u.usuario}?`)) return;
        accesos.usuarios = accesos.usuarios.filter((x) => x !== u);
        try { await guardarAccesos(`Estudio: quito el acceso de ${u.usuario}`); avisar(`Acceso de ${u.usuario} quitado.`); } catch (e) { avisar('No se pudo guardar. Intentá de nuevo.'); }
        pintarAccesos();
      };
      li.append(b);
      lista.append(li);
    });
    if (!usuarios.length) lista.append(el('li', { class: 'meta' }, 'Todavía no hay usuarios. Creá el primero abajo.'));
    const sinLlave = accesos && !K;
    $('#accesosBloqueo').hidden = !sinLlave;
    $('#formAcceso').hidden = sinLlave;
    $('#formClaveGithub').hidden = !K;
  };

  $('#btnAccesos').addEventListener('click', () => { pintarAccesos(); $('#accesos').showModal(); });
  $('#cerrarAccesos').addEventListener('click', () => $('#accesos').close());

  $('#formAcceso').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const usuario = norm($('#nuevoUsuario').value), c1 = $('#nuevaContrasena').value, c2 = $('#repetirContrasena').value;
    const err = $('#errorAcceso');
    err.hidden = true;
    const falla = !/^[a-z0-9._-]{3,30}$/.test(usuario) ? 'El usuario lleva de 3 a 30 letras o números, sin espacios.'
      : c1.length < 10 ? 'La contraseña tiene que tener al menos 10 caracteres.'
      : c1 !== c2 ? 'Las contraseñas no coinciden.'
      : accesos && accesos.usuarios.some((u) => u.usuario === usuario) ? 'Ese usuario ya existe.' : '';
    if (falla) { err.textContent = falla; err.hidden = false; return; }
    const btn = $('#btnCrearAcceso');
    btn.disabled = true;
    try {
      if (!accesos) { // primera vez: se crea la llave y se guarda la clave de GitHub cifrada
        K = azar(32);
        accesos = { version: 1, clave: await cifrar(await llaveCruda(K), te.encode(token), 'github'), usuarios: [] };
      }
      const sal = azar(16);
      const envuelta = await cifrar(await llaveDeContrasena(c1, sal), K, usuario);
      accesos.usuarios.push({ usuario, sal: b64(sal), ...envuelta });
      await guardarAccesos(`Estudio: acceso para ${usuario}`);
      ev.target.reset();
      avisar(`Listo: ${usuario} ya puede entrar con su contraseña (en unos minutos).`);
      pintarAccesos();
    } catch (e) {
      err.textContent = 'No se pudo guardar. Revisá tu conexión e intentá de nuevo.';
      err.hidden = false;
    }
    btn.disabled = false;
  });

  $('#formClaveGithub').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const nueva = $('#nuevaClaveGithub').value.trim();
    const anterior = token;
    try {
      token = nueva;
      const repo = await gh('');
      if (!repo.permissions || !repo.permissions.push) throw new Error('permiso');
      accesos.clave = await cifrar(await llaveCruda(K), te.encode(token), 'github');
      await guardarAccesos('Estudio: actualizo la clave de GitHub');
      guardarSesion(!!localStorage.getItem(CLAVE));
      ev.target.reset();
      avisar('Clave de GitHub actualizada. Todos siguen entrando con su contraseña.');
    } catch (e) {
      token = anterior;
      avisar('Esa clave no funciona o no tiene permiso de escritura.');
    }
  });

  $('#reiniciarAccesos').addEventListener('click', async () => {
    if (!confirm('Se borran todos los usuarios y vas a crear el primero de nuevo. ¿Seguir?')) return;
    accesos = null; K = null;
    pintarAccesos();
    $('#accesosBloqueo').hidden = true;
    $('#formAcceso').hidden = false;
    avisar('Creá el primer usuario: al guardarlo se reemplazan los accesos anteriores.');
  });

  /* =====================================================================
     CONTENIDO: cada parte de la web vive en un archivo de data/
     ===================================================================== */
  const DOCS = {};            // clave -> { ruta, datos, original }
  const RUTAS = CFG.datos || { galeria: CFG.galeria };
  let panel = 'fotos';

  const cargarTodo = async () => {
    for (const [k, ruta] of Object.entries(RUTAS)) {
      try {
        const t = await gh(`/contents/${ruta}?ref=${REPO.rama}`, { accept: 'application/vnd.github.raw+json' });
        const datos = JSON.parse(t);
        DOCS[k] = { ruta, datos, original: JSON.stringify(datos) };
      } catch (e) { if (e.status !== 404) throw e; }
    }
    galeria = DOCS.galeria ? DOCS.galeria.datos : null;
    if (galeria) actual = actual || galeria.categorias[0].id;
    // pestañas que no aplican a esta web (por ejemplo, un cliente sin portada editable)
    document.querySelectorAll('[data-panel]').forEach((b) => {
      const k = b.dataset.panel;
      const falta = { fotos: !DOCS.galeria, inicio: !DOCS.inicio, diseno: !DOCS.diseno, textos: !DOCS.sitio, cotizador: !CFG.cotizador }[k];
      b.hidden = !!falta;
    });
    pintar();
  };

  const enUso = (slug) => Object.values(DOCS).some((d) => JSON.stringify(d.datos).includes(`"${slug}"`));
  const docsCambiados = () => Object.entries(DOCS).filter(([, d]) => JSON.stringify(d.datos) !== d.original);
  const hayCambios = () => docsCambiados().length > 0 || [...nuevas.keys()].some(enUso);
  const contarCambios = () => docsCambiados().length + [...nuevas.keys()].filter(enUso).length;

  /* ---------- Miniaturas ---------- */
  const RUTA_MINI = {
    f: (s) => `${CARPETAS.fotos}/${s}-${ANCHOS[0]}.jpg`,
    h: (s) => `${CARPETAS.portada}/${s}-960.jpg`,
    d: (s) => `${CARPETAS.piezas}/${s}-800.jpg`,
    v: (s) => `${CARPETAS.videos}/${s}.jpg`,
  };
  const tipoFoto = (slug) => (DOCS.inicio && DOCS.inicio.datos.fotos && DOCS.inicio.datos.fotos[slug] ? 'h' : 'f');
  const mini = (tipo, slug, attrs = {}) => {
    const n = nuevas.get(slug);
    const ruta = RUTA_MINI[tipo](slug);
    const img = el('img', { alt: '', decoding: 'async', loading: 'lazy', ...attrs });
    img.src = n ? n.url : publicadas.get(slug) || WEB + ruta;
    img.onerror = () => { if (!img.dataset.raw) { img.dataset.raw = 1; img.src = RAW + ruta; } };
    return img;
  };
  const miniatura = (f) => mini('f', f.slug).src;

  /* ---------- Pestañas ---------- */
  document.querySelectorAll('[data-panel]').forEach((b) => b.addEventListener('click', () => {
    panel = b.dataset.panel;
    pintar();
    window.scrollTo({ top: 0 });
  }));

  const pintarEstado = () => {
    const n = contarCambios();
    $('#btnPublicar').disabled = ocupado || n === 0;
    const b = $('#cuentaCambios');
    b.hidden = n === 0;
    b.textContent = n;
    $('#estado').textContent = n ? `${n} cambio${n > 1 ? 's' : ''} sin publicar` : 'Todo publicado';
  };

  const pintar = () => {
    document.querySelectorAll('[data-panel]').forEach((b) => b.setAttribute('aria-current', String(b.dataset.panel === panel)));
    document.querySelectorAll('.panel').forEach((p) => { p.hidden = p.id !== `panel-${panel}`; });
    if (panel === 'fotos' && galeria) pintarFotos();
    if (panel === 'inicio' && DOCS.inicio) pintarInicio();
    if (panel === 'diseno' && DOCS.diseno) pintarDiseno();
    if (panel === 'textos' && DOCS.sitio) pintarTextos();
    if (panel === 'cotizador') abrirCotizador();
    pintarEstado();
  };

  const boton = (icono, titulo, fn, extra = '') => {
    const b = el('button', { type: 'button', class: `icono ${extra}`, title: titulo, 'aria-label': titulo }, `<i class="ph-light ${icono}"></i>`);
    b.onclick = (e) => { e.stopPropagation(); fn(); };
    return b;
  };
  const moverEn = (lista, desde, hasta) => { if (hasta < 0 || hasta >= lista.length) return; const [x] = lista.splice(desde, 1); lista.splice(hasta, 0, x); };
  const arrastrable = (nodo, i, alSoltar) => {
    nodo.draggable = true;
    nodo.addEventListener('dragstart', (e) => { e.dataTransfer.setData('text/plain', String(i)); e.dataTransfer.effectAllowed = 'move'; nodo.classList.add('arrastrando'); });
    nodo.addEventListener('dragend', () => nodo.classList.remove('arrastrando'));
    nodo.addEventListener('dragover', (e) => { if (e.dataTransfer.types.includes('text/plain')) { e.preventDefault(); nodo.classList.add('destino'); } });
    nodo.addEventListener('dragleave', () => nodo.classList.remove('destino'));
    nodo.addEventListener('drop', (e) => { e.preventDefault(); nodo.classList.remove('destino'); const d = Number(e.dataTransfer.getData('text/plain')); if (!Number.isNaN(d) && d !== i) alSoltar(d, i); });
  };
  const zonaArchivos = (zona, input, fn) => {
    input.onchange = (e) => { fn(e.target.files); e.target.value = ''; };
    ['dragenter', 'dragover'].forEach((t) => zona.addEventListener(t, (e) => { if (e.dataTransfer.types.includes('Files')) { e.preventDefault(); zona.classList.add('encima'); } }));
    ['dragleave', 'drop'].forEach((t) => zona.addEventListener(t, () => zona.classList.remove('encima')));
    zona.addEventListener('drop', (e) => { if (e.dataTransfer.files.length) { e.preventDefault(); fn(e.dataTransfer.files); } });
  };

  /* =====================================================================
     FOTOGRAFÍA: galería por categorías
     ===================================================================== */
  let vista = 'editar';
  const cat = (id = actual) => galeria.categorias.find((c) => c.id === id);

  const pintarFotos = () => {
    const c = cat();
    const chips = $('#chips');
    chips.innerHTML = '';
    galeria.categorias.forEach((x) => {
      const b = el('button', { type: 'button', class: 'chip', 'aria-pressed': String(x.id === actual) }, `${x.nombre}<sup>${x.fotos.length}</sup>`);
      b.onclick = () => { actual = x.id; pintar(); };
      chips.append(b);
    });
    $('#tituloCat').textContent = c.nombre;
    $('#infoCat').textContent = `${c.fotos.length} foto${c.fotos.length === 1 ? '' : 's'} en la web`;
    $('#subirA').textContent = c.nombre;
    $('#verEnWeb').href = `${WEB}${CFG.paginaGaleria}#${c.id}`;
    $('#vistaEditar').hidden = vista !== 'editar';
    $('#vistaPrevia').hidden = vista !== 'previa';
    if (vista === 'editar') pintarGrilla(c); else pintarPrevia(c);
  };

  const pintarGrilla = (c) => {
    const g = $('#grilla');
    g.innerHTML = '';
    c.fotos.forEach((f, i) => {
      const fig = el('figure', { class: 'foto' });
      fig.append(mini('f', f.slug, { loading: i > 11 ? 'lazy' : 'eager' }));
      if (c.portada === f.slug) fig.append(el('span', { class: 'foto__sello' }, '<i class="ph-light ph-star"></i> Portada'));
      else if (nuevas.has(f.slug)) fig.append(el('span', { class: 'foto__sello foto__sello--nueva' }, 'Nueva'));
      fig.append(el('span', { class: 'foto__n' }, String(i + 1)));
      const acc = el('div', { class: 'foto__acciones' });
      acc.append(boton('ph-caret-left', 'Mover antes', () => { moverEn(c.fotos, i, i - 1); pintar(); }));
      acc.append(boton('ph-caret-right', 'Mover después', () => { moverEn(c.fotos, i, i + 1); pintar(); }));
      acc.append(boton('ph-star', 'Portada del álbum en el inicio', () => { c.portada = f.slug; pintar(); avisar(`Portada de ${c.nombre} cambiada.`); }, c.portada === f.slug ? 'activo' : ''));
      const sel = el('select', { 'aria-label': 'Mover a otra categoría', title: 'Mover a otra categoría' });
      sel.append(el('option', { value: '' }, 'Mover a…'));
      galeria.categorias.filter((x) => x.id !== c.id).forEach((x) => sel.append(el('option', { value: x.id }, x.nombre)));
      sel.onchange = () => {
        const destino = cat(sel.value);
        if (!destino) return;
        c.fotos.splice(i, 1);
        destino.fotos.unshift(f);
        if (c.portada === f.slug) c.portada = c.fotos[0] ? c.fotos[0].slug : null;
        pintar();
        avisar(`Foto movida a ${destino.nombre}.`);
      };
      const lab = el('label', { class: 'icono icono--select' }, '<i class="ph-light ph-folder-simple"></i>');
      lab.append(sel);
      acc.append(lab);
      acc.append(boton('ph-trash', 'Sacar de la web', () => {
        c.fotos.splice(i, 1);
        const eraPortada = c.portada === f.slug;
        if (eraPortada) c.portada = c.fotos[0] ? c.fotos[0].slug : null;
        pintar();
        avisar('Foto sacada de la web.', { texto: 'Deshacer', fn: () => { c.fotos.splice(i, 0, f); if (eraPortada) c.portada = f.slug; pintar(); } });
      }, 'peligro'));
      fig.append(acc);
      arrastrable(fig, i, (d, h) => { moverEn(c.fotos, d, h); pintar(); });
      g.append(fig);
    });
    if (!c.fotos.length) g.append(el('p', { class: 'vacio' }, 'Todavía no hay fotos en esta categoría. Subí las primeras arriba.'));
  };

  const pintarPrevia = (c) => {
    const p = $('#previa');
    p.innerHTML = '';
    c.fotos.forEach((f) => {
      const fig = el('figure');
      const b = el('button', { type: 'button', tabindex: '-1' });
      b.append(mini('f', f.slug, { width: f.w, height: f.h }));
      fig.append(b);
      p.append(fig);
    });
    const pp = $('#previaPortada');
    pp.innerHTML = '';
    const port = c.fotos.find((f) => f.slug === c.portada) || c.fotos[0];
    if (port) {
      const tarjeta = el('div', { class: 'cat' });
      const caja = el('div', { class: 'cat__img' });
      caja.append(mini('f', port.slug));
      tarjeta.append(caja, el('div', { class: 'cat__pie' }, `<h3>${c.nombre}</h3><span class="meta">${String(c.fotos.length).padStart(2, '0')}</span>`));
      pp.append(el('p', { class: 'etiqueta' }, 'Tarjeta del álbum en el inicio'), tarjeta);
    }
  };

  document.querySelectorAll('[data-vista]').forEach((b) => b.addEventListener('click', () => {
    vista = b.dataset.vista;
    document.querySelectorAll('[data-vista]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    pintar();
  }));

  /* ---------- Procesar imágenes y videos en el navegador ---------- */
  const cargarImagen = (file) => new Promise((ok, mal) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => ok({ img, url });
    img.onerror = () => { URL.revokeObjectURL(url); mal(new Error('formato')); };
    img.src = url; // el navegador ya respeta la orientación de la cámara
  });
  const achicar = (img, ancho, fondo) => { // por pasos, para que quede nítida
    const w0 = img.naturalWidth || img.videoWidth, h0 = img.naturalHeight || img.videoHeight;
    const w = Math.min(ancho, w0), h = Math.round(h0 * w / w0);
    let fuente = img, cw = w0, ch = h0;
    while (cw / 2 >= w) {
      cw = Math.round(cw / 2); ch = Math.round(ch / 2);
      const c = document.createElement('canvas'); c.width = cw; c.height = ch;
      const x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(fuente, 0, 0, cw, ch);
      fuente = c;
    }
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const x = c.getContext('2d'); x.imageSmoothingQuality = 'high';
    x.fillStyle = fondo || '#1a1a1a'; x.fillRect(0, 0, w, h); // los PNG transparentes quedan sobre este color
    x.drawImage(fuente, 0, 0, w, h);
    return c;
  };
  const aBlob = (canvas, tipo, calidad) => new Promise((ok) => canvas.toBlob(ok, tipo, calidad));
  const nuevoSlug = (prefijo) => `${prefijo}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;

  // devuelve { slug, w, h, webp, nombres, reales } y deja los archivos listos para publicar
  const procesarImagen = async (file, { carpeta, anchos, prefijo, fondo }) => {
    const { img, url } = await cargarImagen(file);
    const slug = nuevoSlug(prefijo);
    const archivos = [];
    const reales = [];
    let webp = true, w = 0, h = 0, previa = null;
    for (const ancho of anchos) {
      if (reales.length && reales[reales.length - 1] >= img.naturalWidth) break; // nunca se agranda
      const c = achicar(img, ancho, fondo);
      const jpg = await aBlob(c, 'image/jpeg', 0.86);
      archivos.push({ ruta: `${carpeta}/${slug}-${ancho}.jpg`, blob: jpg });
      if (!previa) previa = jpg;
      const bw = await aBlob(c, 'image/webp', 0.82);
      if (bw && bw.type === 'image/webp') archivos.push({ ruta: `${carpeta}/${slug}-${ancho}.webp`, blob: bw });
      else webp = false;
      reales.push(c.width); w = c.width; h = c.height;
    }
    if (!webp) for (let k = archivos.length - 1; k >= 0; k--) if (archivos[k].ruta.endsWith('.webp')) archivos.splice(k, 1);
    URL.revokeObjectURL(url);
    nuevas.set(slug, { archivos, url: URL.createObjectURL(previa) });
    return { slug, w, h, webp, nombres: anchos.slice(0, reales.length), reales };
  };

  const procesarVideo = async (file, prefijo) => {
    if (!/\.mp4$/i.test(file.name) && file.type !== 'video/mp4') throw Object.assign(new Error('formato'), { motivo: 'El video tiene que ser .mp4.' });
    if (file.size > 40 * 1024 * 1024) throw Object.assign(new Error('pesado'), { motivo: 'El video pesa más de 40 MB. Comprimilo antes (por ejemplo con HandBrake, 720 px de ancho).' });
    const url = URL.createObjectURL(file);
    const v = document.createElement('video');
    v.muted = true; v.playsInline = true; v.preload = 'auto'; v.src = url;
    await new Promise((ok, mal) => { v.onloadeddata = ok; v.onerror = mal; });
    v.currentTime = Math.min(1, (v.duration || 2) / 2);
    await new Promise((ok) => { v.onseeked = ok; });
    const c = achicar(v, 720);
    const poster = await aBlob(c, 'image/jpeg', 0.84);
    URL.revokeObjectURL(url);
    const slug = nuevoSlug(prefijo);
    nuevas.set(slug, { archivos: [{ ruta: `${CARPETAS.videos}/${slug}.mp4`, blob: file }, { ruta: `${CARPETAS.videos}/${slug}.jpg`, blob: poster }], url: URL.createObjectURL(poster) });
    return { slug, w: c.width, h: c.height };
  };

  const trabajando = async (zona, lista, fn) => {
    zona.classList.add('trabajando');
    let ok = 0, mal = 0, motivo = '';
    for (const [k, file] of [...lista].entries()) {
      $('#estado').textContent = `Preparando ${k + 1} de ${lista.length}…`;
      try { await fn(file, ok); ok++; pintar(); } catch (e) { mal++; motivo = e.motivo || 'exportalo en JPG o PNG'; }
    }
    zona.classList.remove('trabajando');
    pintarEstado();
    avisar(mal ? `${ok} listo${ok === 1 ? '' : 's'}. ${mal} no se pudo usar: ${motivo}` : `${ok} listo${ok === 1 ? '' : 's'}. Revisá cómo queda y tocá Publicar.`);
  };

  // subir a la galería
  zonaArchivos($('#zonaSubir'), $('#archivos'), (files) => {
    const c = cat();
    trabajando($('#zonaSubir'), files, async (file, k) => {
      const r = await procesarImagen(file, { carpeta: CARPETAS.fotos, anchos: ANCHOS, prefijo: c.id });
      const foto = { slug: r.slug, w: r.w, h: r.h };
      if (!r.webp) foto.webp = false;
      c.fotos.splice(k, 0, foto); // las nuevas quedan primero, en el orden elegido
    });
  });

  /* ---------- Elegir una foto ya subida ---------- */
  const elegir = ({ titulo = 'Elegí una foto', conPortada = false } = {}) => new Promise((ok) => {
    const d = $('#selector');
    $('#selectorTitulo').textContent = titulo;
    const grupos = galeria.categorias.map((c) => ({ id: c.id, nombre: c.nombre, fotos: c.fotos.map((f) => ({ slug: f.slug, tipo: 'f' })) }));
    if (conPortada && DOCS.inicio) grupos.unshift({ id: '_portada', nombre: 'Fotos de portada', fotos: Object.keys(DOCS.inicio.datos.fotos || {}).map((s) => ({ slug: s, tipo: 'h' })) });
    let g = grupos[0].id;
    const dibujar = () => {
      const chips = $('#selectorChips'); chips.innerHTML = '';
      grupos.forEach((x) => { const b = el('button', { type: 'button', class: 'chip', 'aria-pressed': String(x.id === g) }, `${x.nombre}<sup>${x.fotos.length}</sup>`); b.onclick = () => { g = x.id; dibujar(); }; chips.append(b); });
      const grilla = $('#selectorGrilla'); grilla.innerHTML = '';
      grupos.find((x) => x.id === g).fotos.forEach((f) => {
        const b = el('button', { type: 'button', class: 'selector__foto' });
        b.append(mini(f.tipo, f.slug));
        b.onclick = () => { d.close(); ok(f.slug); };
        grilla.append(b);
      });
    };
    dibujar();
    d.onclose = () => ok(null);
    d.showModal();
  });
  $('#cerrarSelector').addEventListener('click', () => $('#selector').close());

  /* =====================================================================
     INICIO: portada en celular, en computadora y foto de la franja
     ===================================================================== */
  const nombresCategorias = () => (galeria ? galeria.categorias.map((c) => c.nombre) : []);
  const selectCategoria = (valor, alCambiar) => {
    const s = el('select', { class: 'campo-mini', 'aria-label': 'Categoría que se muestra' });
    [...new Set([...nombresCategorias(), valor].filter(Boolean))].forEach((n) => s.append(el('option', { value: n }, n)));
    s.value = valor || '';
    s.onchange = () => alCambiar(s.value);
    return s;
  };

  const pintarInicio = () => {
    const ini = DOCS.inicio.datos;
    // celular
    const g = $('#inicioMovil');
    g.innerHTML = '';
    ini.movil.forEach((x, i) => {
      const fig = el('figure', { class: 'foto foto--alta' });
      fig.append(mini(tipoFoto(x.slug), x.slug));
      fig.append(el('span', { class: 'foto__n' }, String(i + 1)));
      if (nuevas.has(x.slug)) fig.append(el('span', { class: 'foto__sello foto__sello--nueva' }, 'Nueva'));
      const pie = el('div', { class: 'foto__pie' });
      pie.append(selectCategoria(x.cat, (v) => { x.cat = v; x.alt = x.alt || `Fotografía de ${v.toLowerCase()}`; pintarEstado(); }));
      fig.append(pie);
      const acc = el('div', { class: 'foto__acciones' });
      acc.append(boton('ph-caret-left', 'Antes', () => { moverEn(ini.movil, i, i - 1); pintar(); }));
      acc.append(boton('ph-caret-right', 'Después', () => { moverEn(ini.movil, i, i + 1); pintar(); }));
      acc.append(boton('ph-trash', 'Sacar de la portada', () => { ini.movil.splice(i, 1); pintar(); avisar('Foto sacada de la portada.', { texto: 'Deshacer', fn: () => { ini.movil.splice(i, 0, x); pintar(); } }); }, 'peligro'));
      fig.append(acc);
      arrastrable(fig, i, (d, h) => { moverEn(ini.movil, d, h); pintar(); });
      g.append(fig);
    });
    // computadora
    const p = $('#inicioAncho');
    p.innerHTML = '';
    ini.escritorio.forEach((pant, i) => {
      const fila = el('div', { class: 'pantalla-fila' });
      const cab = el('div', { class: 'pantalla-fila__cab' });
      cab.append(el('span', { class: 'etiqueta' }, `Pantalla ${i + 1}`), selectCategoria(pant.cat, (v) => { pant.cat = v; pintarEstado(); }));
      const acc = el('div', { class: 'pantalla-fila__acc' });
      acc.append(boton('ph-caret-up', 'Subir', () => { moverEn(ini.escritorio, i, i - 1); pintar(); }));
      acc.append(boton('ph-caret-down', 'Bajar', () => { moverEn(ini.escritorio, i, i + 1); pintar(); }));
      acc.append(boton('ph-trash', 'Borrar pantalla', () => { ini.escritorio.splice(i, 1); pintar(); avisar('Pantalla borrada.', { texto: 'Deshacer', fn: () => { ini.escritorio.splice(i, 0, pant); pintar(); } }); }, 'peligro'));
      cab.append(acc);
      const fotos = el('div', { class: `pantalla-fila__fotos n${pant.fotos.length}` });
      pant.fotos.forEach((f, j) => {
        const caja = el('div', { class: 'pantalla-fila__foto' });
        caja.append(mini(tipoFoto(f.slug), f.slug));
        if (pant.fotos.length > 1) caja.append(boton('ph-x', 'Quitar esta foto', () => { pant.fotos.splice(j, 1); pintar(); }, 'quitar'));
        fotos.append(caja);
      });
      if (pant.fotos.length < 3) {
        const mas = el('button', { type: 'button', class: 'pantalla-fila__mas' }, '<i class="ph-light ph-plus"></i><span>Sumar foto</span>');
        mas.onclick = async () => { const s = await elegir({ titulo: 'Sumar foto a la pantalla', conPortada: true }); if (s) { pant.fotos.push({ slug: s, foco: '50% 40%' }); pintar(); } };
        fotos.append(mas);
      }
      fila.append(cab, fotos);
      p.append(fila);
    });
    // franja
    const b = $('#inicioBanda');
    b.innerHTML = '';
    if (ini.banda) b.append(mini('f', ini.banda));
  };

  zonaArchivos($('#zonaPortada'), $('#archivosPortada'), (files) => {
    const ini = DOCS.inicio.datos;
    trabajando($('#zonaPortada'), files, async (file) => {
      const r = await procesarImagen(file, { carpeta: CARPETAS.portada, anchos: [960, 1600, 2560], prefijo: 'inicio' });
      ini.fotos = ini.fotos || {};
      ini.fotos[r.slug] = { w: r.w, h: r.h, nombres: r.nombres, reales: r.reales, ...(r.webp ? {} : { webp: false }) };
      const c = nombresCategorias()[0] || '';
      ini.movil.unshift({ slug: r.slug, cat: c, alt: `Fotografía de ${c.toLowerCase()}` });
      const vertical = r.h > r.w;
      if (!vertical) ini.escritorio.unshift({ cat: c, alt: `Fotografía de ${c.toLowerCase()}`, fotos: [{ slug: r.slug, foco: '50% 50%' }] });
    });
  });
  $('#elegirPortada').addEventListener('click', async () => {
    const s = await elegir({ titulo: 'Sumar a la portada (celular)', conPortada: true });
    if (!s) return;
    const c = nombresCategorias()[0] || '';
    DOCS.inicio.datos.movil.unshift({ slug: s, cat: c, alt: `Fotografía de ${c.toLowerCase()}` });
    pintar();
  });
  $('#nuevaPantalla').addEventListener('click', async () => {
    const s = await elegir({ titulo: 'Primera foto de la nueva pantalla', conPortada: true });
    if (!s) return;
    const c = nombresCategorias()[0] || '';
    DOCS.inicio.datos.escritorio.push({ cat: c, alt: `Fotografía de ${c.toLowerCase()}`, fotos: [{ slug: s, foco: '50% 40%' }] });
    pintar();
  });
  $('#cambiarBanda').addEventListener('click', async () => {
    const s = await elegir({ titulo: 'Foto de la franja del inicio' });
    if (s) { DOCS.inicio.datos.banda = s; pintar(); }
  });

  /* =====================================================================
     DISEÑO: logos, placas, redes y videos
     ===================================================================== */
  const AREAS_DIS = { logos: 'Logos', placas: 'Placas', redes: 'Redes', motion: 'Videos (motion)' };
  const TAM = { c3: 'Chico · 4 por fila', c4: 'Mediano · 3 por fila', c6: 'Grande · 2 por fila', c12: 'Ancho completo', centro: 'Destacado al centro' };
  let areaDis = 'logos';

  const pintarDiseno = () => {
    const dis = DOCS.diseno.datos;
    const chips = $('#chipsDiseno');
    chips.innerHTML = '';
    Object.entries(AREAS_DIS).forEach(([k, n]) => {
      const b = el('button', { type: 'button', class: 'chip', 'aria-pressed': String(k === areaDis) }, `${n}<sup>${(dis.areas[k] || []).length}</sup>`);
      b.onclick = () => { areaDis = k; pintar(); };
      chips.append(b);
    });
    const esVideo = areaDis === 'motion';
    $('#subirDisenoTexto').innerHTML = esVideo ? `Subí videos a <b>${AREAS_DIS[areaDis]}</b>` : `Subí piezas a <b>${AREAS_DIS[areaDis]}</b>`;
    $('#subirDisenoMeta').textContent = esVideo ? 'Videos .mp4 de hasta 40 MB. La portada del video se toma sola.' : 'JPG o PNG. Los PNG transparentes quedan sobre el color de fondo elegido.';
    $('#archivosDiseno').accept = esVideo ? 'video/mp4' : 'image/jpeg,image/png,image/webp';
    $('#fondoDiseno').closest('label').hidden = esVideo;
    $('#verDiseno').href = `${WEB}diseno.html#${areaDis}`;
    const g = $('#grillaDiseno');
    g.innerHTML = '';
    const items = dis.areas[areaDis] = dis.areas[areaDis] || [];
    items.forEach((x, i) => {
      const fig = el('figure', { class: `pieza pieza--${x.tam || 'c3'}` });
      const caja = el('div', { class: 'pieza__img' });
      if (x.ratio) caja.style.aspectRatio = x.ratio;
      caja.append(mini(x.tipo === 'video' ? 'v' : 'd', x.slug));
      if (x.tipo === 'video') caja.append(el('span', { class: 'foto__sello' }, '<i class="ph-light ph-play"></i> Video'));
      else if (nuevas.has(x.slug)) caja.append(el('span', { class: 'foto__sello foto__sello--nueva' }, 'Nueva'));
      const pie = el('div', { class: 'pieza__pie' });
      const tam = el('select', { class: 'campo-mini', 'aria-label': 'Tamaño' });
      Object.entries(TAM).forEach(([k, n]) => tam.append(el('option', { value: k }, n)));
      tam.value = x.tam || 'c3';
      tam.onchange = () => { x.tam = tam.value; pintar(); };
      const desc = el('input', { class: 'campo-mini', type: 'text', placeholder: x.tipo === 'video' ? 'Etiqueta (ej. Logo animado)' : 'Descripción (para Google y accesibilidad)' });
      desc.value = x.tipo === 'video' ? (x.pie || '') : (x.alt || '');
      desc.oninput = () => { if (x.tipo === 'video') { x.pie = desc.value; x.alt = x.alt || desc.value; } else x.alt = desc.value; pintarEstado(); };
      const acc = el('div', { class: 'pieza__acc' });
      acc.append(boton('ph-caret-left', 'Antes', () => { moverEn(items, i, i - 1); pintar(); }));
      acc.append(boton('ph-caret-right', 'Después', () => { moverEn(items, i, i + 1); pintar(); }));
      acc.append(boton('ph-trash', 'Sacar de la web', () => { items.splice(i, 1); pintar(); avisar('Pieza sacada de la web.', { texto: 'Deshacer', fn: () => { items.splice(i, 0, x); pintar(); } }); }, 'peligro'));
      pie.append(tam, desc, acc);
      fig.append(caja, pie);
      arrastrable(fig, i, (d, h) => { moverEn(items, d, h); pintar(); });
      g.append(fig);
    });
    if (!items.length) g.append(el('p', { class: 'vacio' }, 'Todavía no hay piezas en esta área.'));
  };

  zonaArchivos($('#zonaDiseno'), $('#archivosDiseno'), (files) => {
    const dis = DOCS.diseno.datos;
    const items = dis.areas[areaDis] = dis.areas[areaDis] || [];
    trabajando($('#zonaDiseno'), files, async (file, k) => {
      if (areaDis === 'motion') {
        const r = await procesarVideo(file, 'video');
        items.splice(k, 0, { tipo: 'video', slug: r.slug, alt: 'Video', pie: '', tam: 'c3', ratio: `${r.w}/${r.h}` });
      } else {
        const r = await procesarImagen(file, { carpeta: CARPETAS.piezas, anchos: [800, 1600], prefijo: areaDis, fondo: $('#fondoDiseno').value });
        dis.piezas = dis.piezas || {};
        dis.piezas[r.slug] = [r.w, r.h];
        if (!r.webp) { dis.sin_webp = dis.sin_webp || []; dis.sin_webp.push(r.slug); }
        const tam = areaDis === 'logos' ? 'c3' : r.h > r.w * 1.3 ? 'c3' : 'c6';
        items.splice(k, 0, { tipo: 'pieza', slug: r.slug, alt: `${AREAS_DIS[areaDis]}: pieza de diseño`, tam, ratio: areaDis === 'logos' ? '1' : `${r.w}/${r.h}` });
      }
    });
  });

  /* =====================================================================
     TEXTOS Y DATOS
     ===================================================================== */
  const campo = (etiqueta, valor, alCambiar, { tipo = 'text', area = false, ayuda = '' } = {}) => {
    const l = el('label', { class: 'campo' });
    l.append(el('span', {}, etiqueta));
    const i = area ? el('textarea', { rows: 4 }) : el('input', { type: tipo });
    i.value = valor || '';
    i.oninput = () => { alCambiar(i.value); pintarEstado(); };
    l.append(i);
    if (ayuda) l.append(el('small', { class: 'meta' }, ayuda));
    return l;
  };
  const tarjeta = (titulo, ...hijos) => { const s = el('section', { class: 'tarjeta' }); s.append(el('h3', {}, titulo), ...hijos); return s; };
  const lista = (items, dibujar, nuevo, etiquetaNuevo) => {
    const cont = el('div', { class: 'lista' });
    items.forEach((x, i) => {
      const fila = el('div', { class: 'lista__fila' });
      const cuerpo = el('div', { class: 'lista__cuerpo' });
      dibujar(x, cuerpo);
      const acc = el('div', { class: 'lista__acc' });
      acc.append(boton('ph-caret-up', 'Subir', () => { moverEn(items, i, i - 1); pintar(); }));
      acc.append(boton('ph-caret-down', 'Bajar', () => { moverEn(items, i, i + 1); pintar(); }));
      acc.append(boton('ph-trash', 'Borrar', () => { items.splice(i, 1); pintar(); }, 'peligro'));
      fila.append(cuerpo, acc);
      cont.append(fila);
    });
    const mas = el('button', { type: 'button', class: 'btn btn--secundario' }, `<i class="ph-light ph-plus"></i> ${etiquetaNuevo}`);
    mas.onclick = () => { items.push(nuevo()); pintar(); };
    cont.append(mas);
    return cont;
  };

  const pintarTextos = () => {
    const s = DOCS.sitio.datos;
    const t = $('#textos');
    t.innerHTML = '';
    const c = s.contacto;
    t.append(tarjeta('Contacto',
      campo('Email', c.email, (v) => { c.email = v; }, { tipo: 'email' }),
      campo('WhatsApp / teléfono', c.whatsapp, (v) => { c.whatsapp = v; }, { ayuda: 'Como querés que se lea, con código de país. Ej.: +54 381 615-2579. El botón de WhatsApp se arma solo.' }),
      campo('Instagram (usuario)', c.instagram, (v) => { c.instagram = v.replace(/^@/, ''); }, { ayuda: 'Sin la @. Ej.: juanchigzmn' }),
      campo('LinkedIn (dirección)', c.linkedin, (v) => { c.linkedin = v; }, { tipo: 'url' }),
      campo('LinkedIn (nombre que se ve)', c.linkedin_nombre, (v) => { c.linkedin_nombre = v; })));
    const pr = s.presentacion;
    t.append(tarjeta('Presentación del inicio',
      campo('Texto sobre tu nombre en la portada', pr.kicker, (v) => { pr.kicker = v; }),
      campo('Frase', pr.frase, (v) => { pr.frase = v; }, { area: true }),
      campo('Final destacado en color', pr.destacado, (v) => { pr.destacado = v; })));
    t.append(tarjeta('Servicios', lista(s.servicios, (x, cuerpo) => {
      cuerpo.append(campo('Título', x.titulo, (v) => { x.titulo = v; }), campo('Texto', x.texto, (v) => { x.texto = v; }, { area: true }));
    }, () => ({ icono: 'ph-sparkle', titulo: 'Nuevo servicio', texto: '' }), 'Sumar servicio')));
    const so = s.sobre;
    const fotoSobre = el('div', { class: 'sobre-foto' });
    const fimg = so.foto.remota ? el('img', { src: `https://framerusercontent.com/images/${so.foto.remota}?scale-down-to=512`, alt: '' }) : mini('f', so.foto.slug);
    const cambiarFoto = el('label', { class: 'btn btn--secundario' }, '<i class="ph-light ph-image"></i> Cambiar foto');
    const inFoto = el('input', { type: 'file', accept: 'image/jpeg,image/png,image/webp', hidden: '' });
    inFoto.onchange = async () => {
      const file = inFoto.files[0]; if (!file) return;
      try {
        const r = await procesarImagen(file, { carpeta: CARPETAS.fotos, anchos: ANCHOS, prefijo: 'sobre' });
        so.foto = { slug: r.slug, w: r.w, h: r.h, ...(r.webp ? {} : { webp: false }) };
        pintar(); avisar('Foto lista. Tocá Publicar para verla en la web.');
      } catch (e) { avisar('No pude abrir esa foto: exportala en JPG.'); }
    };
    cambiarFoto.append(inFoto);
    fotoSobre.append(fimg, cambiarFoto);
    t.append(tarjeta('Sobre mí',
      fotoSobre,
      campo('Texto', so.parrafos.join('\n\n'), (v) => { so.parrafos = v.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean); }, { area: true, ayuda: 'Dejá una línea en blanco entre párrafos.' }),
      el('h4', {}, 'Formación'),
      lista(so.formacion, (x, cuerpo) => { cuerpo.append(campo('Título', x.titulo, (v) => { x.titulo = v; }), campo('Dónde y cuándo', x.detalle, (v) => { x.detalle = v; })); },
        () => ({ titulo: '', detalle: '' }), 'Sumar estudio'),
      campo('Herramientas', so.herramientas.join(', '), (v) => { so.herramientas = v.split(',').map((x) => x.trim()).filter(Boolean); }, { ayuda: 'Separadas por coma.' })));
  };

  /* =====================================================================
     COTIZADOR: se abre adentro, sin salir del interno
     ===================================================================== */
  const abrirCotizador = () => {
    const f = $('#marcoCotizador');
    if (!f.getAttribute('src')) f.src = `${WEB}${CFG.cotizador}`;
  };

  /* =====================================================================
     PUBLICAR: un solo guardado en GitHub con archivos y textos
     ===================================================================== */
  const publicar = async () => {
    if (ocupado) return;
    ocupado = true;
    $('#btnPublicar').disabled = true;
    try {
      const pendientes = [...nuevas.entries()].filter(([slug]) => enUso(slug));
      const total = pendientes.reduce((n, [, v]) => n + v.archivos.length, 0);
      const arbol = [];
      let hechos = 0;
      for (const [, v] of pendientes) {
        for (const a of v.archivos) {
          $('#estado').textContent = `Subiendo ${++hechos} de ${total}…`;
          const blob = await gh('/git/blobs', { method: 'POST', body: { content: await aBase64(a.blob), encoding: 'base64' } });
          arbol.push({ path: a.ruta, mode: '100644', type: 'blob', sha: blob.sha });
        }
      }
      $('#estado').textContent = 'Guardando…';
      const cambiados = docsCambiados();
      cambiados.forEach(([, d]) => arbol.push({ path: d.ruta, mode: '100644', type: 'blob', content: JSON.stringify(d.datos, null, 1) + '\n' }));
      const ref = await gh(`/git/ref/heads/${REPO.rama}`);
      const base = await gh(`/git/commits/${ref.object.sha}`);
      const tree = await gh('/git/trees', { method: 'POST', body: { base_tree: base.tree.sha, tree: arbol } });
      const partes = cambiados.map(([k]) => ({ galeria: 'galería', sitio: 'textos', inicio: 'portada', diseno: 'diseño' }[k] || k));
      const mensaje = `Interno: ${pendientes.length ? `${pendientes.length} archivo${pendientes.length > 1 ? 's' : ''} nuevo${pendientes.length > 1 ? 's' : ''}, ` : ''}cambios en ${partes.join(', ') || 'archivos'}`;
      const commit = await gh('/git/commits', { method: 'POST', body: { message: mensaje, tree: tree.sha, parents: [ref.object.sha] } });
      await gh(`/git/refs/heads/${REPO.rama}`, { method: 'PATCH', body: { sha: commit.sha } });
      pendientes.forEach(([slug, v]) => { publicadas.set(slug, v.url); nuevas.delete(slug); });
      [...nuevas.keys()].forEach((slug) => { if (!enUso(slug)) nuevas.delete(slug); });
      cambiados.forEach(([, d]) => { d.original = JSON.stringify(d.datos); });
      avisar('Publicado. La web se actualiza sola en 3 a 5 minutos.');
    } catch (e) {
      avisar(e.status === 401 ? 'La clave de GitHub venció. Actualizala en Accesos.' : e.status === 409 || e.status === 422 ? 'La web cambió mientras editabas. Recargá la página e intentá de nuevo.' : 'No se pudo publicar. Revisá tu conexión e intentá de nuevo; tus cambios siguen acá.');
    }
    ocupado = false;
    pintar();
  };
  $('#btnPublicar').addEventListener('click', publicar);

  window.addEventListener('beforeunload', (e) => { if (hayCambios()) { e.preventDefault(); e.returnValue = ''; } });

  /* ---------- Arranque ---------- */
  (async () => {
    let ses = null;
    try { ses = JSON.parse(sessionStorage.getItem(CLAVE) || localStorage.getItem(CLAVE) || 'null'); } catch (e) {}
    if (ses && ses.token) {
      token = ses.token; K = ses.k ? deB64(ses.k) : null; quien = ses.quien || '';
      try { accesos = await leerAccesos(); await abrir(); return; } catch (e) {
        token = null; K = null;
        if (e.status === 401 || e.status === 403) { try { localStorage.removeItem(CLAVE); sessionStorage.removeItem(CLAVE); } catch (x) {} }
        $('#errorIngreso').textContent = e.status === 401 ? 'Tu sesión venció. Entrá de nuevo.' : 'No pude conectar. Revisá tu conexión y recargá.';
        $('#errorIngreso').hidden = false;
      }
    }
    // primera vez (todavía no hay usuarios): se entra con la clave de GitHub
    const hay = await leerAccesos();
    modoIngreso(!hay);
    if (!hay) $('#primeraVez').hidden = false;
  })();
})();
