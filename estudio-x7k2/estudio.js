/* Estudio · panel privado para manejar la galería de juanguzmanph.com
   Todo pasa en tu navegador: las fotos se achican acá y se guardan en GitHub con tu clave.
   Después GitHub vuelve a generar la web sola (.github/workflows/publicar.yml). */
(() => {
  const CFG = window.ESTUDIO_CONFIG;
  const REPO = { owner: CFG.owner, repo: CFG.repo, rama: CFG.rama };
  const API = `https://api.github.com/repos/${REPO.owner}/${REPO.repo}`;
  const RAW = `https://raw.githubusercontent.com/${REPO.owner}/${REPO.repo}/${REPO.rama}/`;
  const CLAVE = `estudio-sesion-${CFG.repo}`;
  const ANCHOS = CFG.anchos;
  const FOTOS = CFG.carpetaFotos;
  const WEB = CFG.raizWeb;
  document.getElementById('marca').textContent = CFG.marca;

  const $ = (s) => document.querySelector(s);
  const el = (tag, attrs = {}, html = '') => { const n = document.createElement(tag); Object.entries(attrs).forEach(([k, v]) => n.setAttribute(k, v)); if (html) n.innerHTML = html; return n; };

  let token = null;
  let galeria = null;        // contenido de data/galeria.json
  let original = '';         // para saber si hay cambios
  let actual = null;         // id de la categoría que se está viendo
  let vista = 'editar';
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
    await cargarGaleria();
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

  /* ---------- Galería ---------- */
  const cargarGaleria = async () => {
    const texto = await gh(`/contents/${CFG.galeria}?ref=${REPO.rama}`, { accept: 'application/vnd.github.raw+json' });
    galeria = JSON.parse(texto);
    original = JSON.stringify(galeria);
    actual = actual || galeria.categorias[0].id;
    pintar();
  };

  const cat = (id = actual) => galeria.categorias.find((c) => c.id === id);
  const hayCambios = () => galeria && (JSON.stringify(galeria) !== original || [...nuevas.keys()].some(enUso));
  const enUso = (slug) => galeria.categorias.some((c) => c.fotos.some((f) => f.slug === slug));
  const contarCambios = () => {
    if (!galeria) return 0;
    const antes = JSON.parse(original);
    let n = [...nuevas.keys()].filter(enUso).length;
    galeria.categorias.forEach((c) => {
      const a = antes.categorias.find((x) => x.id === c.id);
      if (!a) { n++; return; }
      if (a.portada !== c.portada) n++;
      const sa = a.fotos.map((f) => f.slug).join(), sc = c.fotos.filter((f) => !nuevas.has(f.slug)).map((f) => f.slug).join();
      if (sa !== sc) n++;
    });
    return n;
  };

  const miniatura = (f) => {
    const n = nuevas.get(f.slug);
    return n ? n.url : publicadas.get(f.slug) || `${WEB}${FOTOS}/${f.slug}-${ANCHOS[0]}.jpg`;
  };

  const pintarChips = () => {
    const chips = $('#chips');
    chips.innerHTML = '';
    galeria.categorias.forEach((c) => {
      const b = el('button', { type: 'button', class: 'chip', 'aria-pressed': String(c.id === actual) }, `${c.nombre}<sup>${c.fotos.length}</sup>`);
      b.onclick = () => { actual = c.id; pintar(); window.scrollTo({ top: 0, behavior: 'smooth' }); };
      chips.append(b);
    });
  };

  const pintarEstado = () => {
    const n = contarCambios();
    $('#btnPublicar').disabled = ocupado || n === 0;
    const b = $('#cuentaCambios');
    b.hidden = n === 0;
    b.textContent = n;
    $('#estado').textContent = n ? `${n} cambio${n > 1 ? 's' : ''} sin publicar` : 'Todo publicado';
  };

  const mover = (desde, hasta) => {
    const fotos = cat().fotos;
    const [f] = fotos.splice(desde, 1);
    fotos.splice(hasta, 0, f);
    pintar();
  };

  const pintarGrilla = () => {
    const c = cat();
    const g = $('#grilla');
    g.innerHTML = '';
    c.fotos.forEach((f, i) => {
      const fig = el('figure', { class: 'foto', draggable: 'true', 'data-i': i });
      const img = el('img', { src: miniatura(f), alt: '', loading: i > 11 ? 'lazy' : 'eager', decoding: 'async' });
      // recién publicada: mientras GitHub genera la web, la tomo del repositorio
      img.onerror = () => { if (!img.dataset.raw) { img.dataset.raw = 1; img.src = RAW + `${FOTOS}/${f.slug}-${ANCHOS[0]}.jpg`; } };
      fig.append(img);
      if (c.portada === f.slug) fig.append(el('span', { class: 'foto__sello' }, '<i class="ph-light ph-star"></i> Portada'));
      else if (nuevas.has(f.slug)) fig.append(el('span', { class: 'foto__sello foto__sello--nueva' }, 'Nueva'));
      fig.append(el('span', { class: 'foto__n' }, String(i + 1)));

      const acc = el('div', { class: 'foto__acciones' });
      const boton = (icono, titulo, fn, extra = '') => { const b = el('button', { type: 'button', class: `icono ${extra}`, title: titulo, 'aria-label': titulo }, `<i class="ph-light ${icono}"></i>`); b.onclick = (e) => { e.stopPropagation(); fn(); }; return b; };
      acc.append(boton('ph-caret-left', 'Mover antes', () => i > 0 && mover(i, i - 1)));
      acc.append(boton('ph-caret-right', 'Mover después', () => i < c.fotos.length - 1 && mover(i, i + 1)));
      acc.append(boton('ph-star', 'Usar de portada en el inicio', () => { c.portada = f.slug; pintar(); avisar(`Portada de ${c.nombre} cambiada.`); }, c.portada === f.slug ? 'activo' : ''));
      // mover a otra categoría
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

      // arrastrar para ordenar (computadora)
      fig.addEventListener('dragstart', (e) => { e.dataTransfer.setData('text/plain', String(i)); e.dataTransfer.effectAllowed = 'move'; fig.classList.add('arrastrando'); });
      fig.addEventListener('dragend', () => fig.classList.remove('arrastrando'));
      fig.addEventListener('dragover', (e) => { if (e.dataTransfer.types.includes('text/plain')) { e.preventDefault(); fig.classList.add('destino'); } });
      fig.addEventListener('dragleave', () => fig.classList.remove('destino'));
      fig.addEventListener('drop', (e) => {
        e.preventDefault(); fig.classList.remove('destino');
        const desde = Number(e.dataTransfer.getData('text/plain'));
        if (!Number.isNaN(desde) && desde !== i) mover(desde, i);
      });
      g.append(fig);
    });
    if (!c.fotos.length) g.append(el('p', { class: 'vacio' }, 'Todavía no hay fotos en esta categoría. Subí las primeras arriba.'));
  };

  const pintarPrevia = () => {
    const c = cat();
    const p = $('#previa');
    p.innerHTML = '';
    c.fotos.forEach((f) => {
      const fig = el('figure');
      const img = el('img', { src: miniatura(f), alt: '', loading: 'lazy', width: f.w, height: f.h });
      img.onerror = () => { if (!img.dataset.raw) { img.dataset.raw = 1; img.src = RAW + `${FOTOS}/${f.slug}-${ANCHOS[0]}.jpg`; } };
      const b = el('button', { type: 'button', tabindex: '-1' });
      b.append(img);
      fig.append(b);
      p.append(fig);
    });
    const pp = $('#previaPortada');
    pp.innerHTML = '';
    const port = c.fotos.find((f) => f.slug === c.portada) || c.fotos[0];
    if (port) {
      const tarjeta = el('div', { class: 'cat' });
      const caja = el('div', { class: 'cat__img' });
      const img = el('img', { src: miniatura(port), alt: '' });
      img.onerror = () => { if (!img.dataset.raw) { img.dataset.raw = 1; img.src = RAW + `${FOTOS}/${port.slug}-${ANCHOS[0]}.jpg`; } };
      caja.append(img);
      tarjeta.append(caja, el('div', { class: 'cat__pie' }, `<h3>${c.nombre}</h3><span class="meta">${String(c.fotos.length).padStart(2, '0')}</span>`));
      pp.append(el('p', { class: 'etiqueta' }, 'Tarjeta en el inicio'), tarjeta);
    }
  };

  const pintar = () => {
    const c = cat();
    pintarChips();
    $('#tituloCat').textContent = c.nombre;
    $('#infoCat').textContent = `${c.fotos.length} foto${c.fotos.length === 1 ? '' : 's'} en la web`;
    $('#subirA').textContent = c.nombre;
    $('#verEnWeb').href = `${WEB}${CFG.paginaGaleria}#${c.id}`;
    $('#vistaEditar').hidden = vista !== 'editar';
    $('#vistaPrevia').hidden = vista !== 'previa';
    if (vista === 'editar') pintarGrilla(); else pintarPrevia();
    pintarEstado();
  };

  document.querySelectorAll('[data-vista]').forEach((b) => b.addEventListener('click', () => {
    vista = b.dataset.vista;
    document.querySelectorAll('[data-vista]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    pintar();
  }));

  /* ---------- Subir fotos: se achican en el navegador ---------- */
  const cargarImagen = (file) => new Promise((ok, mal) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => ok({ img, url });
    img.onerror = () => { URL.revokeObjectURL(url); mal(new Error('formato')); };
    img.src = url; // el navegador ya respeta la orientación de la cámara
  });

  // achica por pasos para que quede nítida
  const achicar = (img, ancho) => {
    const w0 = img.naturalWidth, h0 = img.naturalHeight;
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
    x.fillStyle = '#1a1a1a'; x.fillRect(0, 0, w, h);
    x.drawImage(fuente, 0, 0, w, h);
    return c;
  };
  const aBlob = (canvas, tipo, calidad) => new Promise((ok) => canvas.toBlob(ok, tipo, calidad));

  const procesar = async (file, idCat) => {
    const { img, url } = await cargarImagen(file);
    const slug = `${idCat}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
    const archivos = [];
    let webp = true, w = 0, h = 0;
    for (const ancho of ANCHOS) {
      const c = achicar(img, ancho);
      archivos.push({ ruta: `${FOTOS}/${slug}-${ancho}.jpg`, blob: await aBlob(c, 'image/jpeg', 0.84) });
      const bw = await aBlob(c, 'image/webp', 0.8);
      if (bw && bw.type === 'image/webp') archivos.push({ ruta: `${FOTOS}/${slug}-${ancho}.webp`, blob: bw });
      else webp = false;
      w = c.width; h = c.height;
    }
    if (!webp) for (let k = archivos.length - 1; k >= 0; k--) if (archivos[k].ruta.endsWith('.webp')) archivos.splice(k, 1);
    URL.revokeObjectURL(url);
    const vista800 = archivos.find((a) => a.ruta.endsWith(`-${ANCHOS[0]}.jpg`));
    nuevas.set(slug, { archivos, url: URL.createObjectURL(vista800.blob) });
    const foto = { slug, w, h };
    if (!webp) foto.webp = false;
    return foto;
  };

  const subir = async (files) => {
    const lista = [...files].filter((f) => f.type.startsWith('image/') || /\.(heic|heif)$/i.test(f.name));
    if (!lista.length) return;
    const c = cat();
    const zona = $('#zonaSubir');
    zona.classList.add('trabajando');
    let ok = 0, mal = 0;
    for (const [k, file] of lista.entries()) {
      $('#estado').textContent = `Preparando foto ${k + 1} de ${lista.length}…`;
      try {
        const foto = await procesar(file, c.id);
        c.fotos.splice(ok, 0, foto); // las nuevas quedan primero, en el orden elegido
        ok++;
        pintar();
      } catch (e) { mal++; }
    }
    zona.classList.remove('trabajando');
    pintarEstado();
    avisar(mal ? `${ok} lista${ok === 1 ? '' : 's'}. ${mal} no se pudo abrir (exportala en JPG).` : `${ok} foto${ok === 1 ? '' : 's'} lista${ok === 1 ? '' : 's'}. Ordenalas y tocá Publicar.`);
  };

  $('#archivos').addEventListener('change', (e) => { subir(e.target.files); e.target.value = ''; });
  const zona = $('#zonaSubir');
  ['dragenter', 'dragover'].forEach((t) => zona.addEventListener(t, (e) => { if (e.dataTransfer.types.includes('Files')) { e.preventDefault(); zona.classList.add('encima'); } }));
  ['dragleave', 'drop'].forEach((t) => zona.addEventListener(t, () => zona.classList.remove('encima')));
  zona.addEventListener('drop', (e) => { if (e.dataTransfer.files.length) { e.preventDefault(); subir(e.dataTransfer.files); } });

  /* ---------- Publicar: un solo guardado en GitHub con fotos y orden ---------- */
  const publicar = async () => {
    if (ocupado) return;
    ocupado = true;
    const btn = $('#btnPublicar');
    btn.disabled = true;
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
      arbol.push({ path: CFG.galeria, mode: '100644', type: 'blob', content: JSON.stringify(galeria, null, 1) + '\n' });
      const ref = await gh(`/git/ref/heads/${REPO.rama}`);
      const base = await gh(`/git/commits/${ref.object.sha}`);
      const tree = await gh('/git/trees', { method: 'POST', body: { base_tree: base.tree.sha, tree: arbol } });
      const n = pendientes.length;
      const mensaje = n ? `Estudio: ${n} foto${n > 1 ? 's' : ''} nueva${n > 1 ? 's' : ''} y orden de la galería` : 'Estudio: orden de la galería';
      const commit = await gh('/git/commits', { method: 'POST', body: { message: mensaje, tree: tree.sha, parents: [ref.object.sha] } });
      await gh(`/git/refs/heads/${REPO.rama}`, { method: 'PATCH', body: { sha: commit.sha } });
      // las publicadas dejan de contar como nuevas pero conservan la miniatura local
      pendientes.forEach(([slug, v]) => { publicadas.set(slug, v.url); nuevas.delete(slug); });
      [...nuevas.keys()].forEach((slug) => { if (!enUso(slug)) nuevas.delete(slug); });
      original = JSON.stringify(galeria);
      avisar('Publicado. La web se actualiza sola en 3 a 5 minutos.');
    } catch (e) {
      avisar(e.status === 401 ? 'Tu clave venció. Salí y entrá con una nueva.' : e.status === 409 || e.status === 422 ? 'La web cambió mientras editabas. Recargá la página e intentá de nuevo.' : 'No se pudo publicar. Revisá tu conexión e intentá de nuevo; tus cambios siguen acá.');
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
