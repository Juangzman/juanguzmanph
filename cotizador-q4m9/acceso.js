/* Cotizador privado: se abre con el mismo usuario y contraseña del Estudio.
   Si en este dispositivo ya entraste al Estudio (o al cotizador), abre directo. */
(() => {
  const html = document.documentElement;
  const LLAVE = 'cotizador-acceso';
  const ESTUDIO = 'estudio-sesion-juanguzmanph';
  const ACCESOS = '/estudio-x7k2/accesos.json';
  const leer = (k) => { try { return localStorage.getItem(k) || sessionStorage.getItem(k); } catch (e) { return null; } };
  // Abierto adentro del Interno: sin el menú ni el pie de la web, para no salir del panel
  if (window.self !== window.top) {
    html.classList.add('incrustado');
    const e = document.createElement('style');
    e.textContent = `html.incrustado .nav, html.incrustado .menu, html.incrustado [data-centinela], html.incrustado .contacto, html.incrustado .sr-only { display: none !important; }
      html.incrustado .pag-cab { padding-top: 28px !important; }`;
    document.head.append(e);
  }
  if (leer(LLAVE) === '1' || leer(ESTUDIO)) return;

  html.classList.add('bloqueado');
  const estilo = document.createElement('style');
  estilo.textContent = `
    html.bloqueado body > :not(.acceso) { display: none !important; }
    .acceso { min-height: 100svh; display: grid; place-items: center; padding: 24px var(--pad, 16px); }
    .acceso form { width: min(100%, 400px); display: grid; gap: 16px; padding: clamp(24px, 5vw, 36px); background: var(--carbon-2, #262626); border: 1px solid var(--linea, rgba(250,250,250,.12)); border-radius: 16px; }
    .acceso .etiqueta { color: var(--terracota, #c27a62); }
    .acceso h1 { font-size: clamp(56px, 14vw, 84px); line-height: .85; }
    .acceso label { display: grid; gap: 8px; font-size: 14px; color: var(--texto-2, #ccc); }
    .acceso input[type=text], .acceso input[type=password] { min-height: 50px; padding: 0 16px; border-radius: 12px; border: 1px solid var(--linea-2, #555); background: var(--negro, #1a1a1a); color: var(--blanco, #fafafa); font: inherit; font-size: 16px; }
    .acceso .check { display: flex; align-items: center; gap: 10px; }
    .acceso .check input { width: 18px; height: 18px; accent-color: var(--terracota, #c27a62); }
    .acceso .btn { width: 100%; }
    .acceso .error { margin: 0; padding: 10px 14px; border-radius: 10px; background: rgba(194,122,98,.14); color: #f0c2b2; font-size: 14px; }`;
  document.head.append(estilo);

  const te = new TextEncoder();
  const deB64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
  const comprobar = async (usuario, contrasena) => {
    const r = await fetch(`${ACCESOS}?nc=${Date.now()}`, { cache: 'no-store' });
    if (!r.ok) throw new Error('red');
    const acc = await r.json();
    const u = acc.usuarios.find((x) => x.usuario === usuario.trim().toLowerCase());
    if (!u) return false;
    try {
      const base = await crypto.subtle.importKey('raw', te.encode(contrasena), 'PBKDF2', false, ['deriveKey']);
      const llave = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt: deB64(u.sal), iterations: 600000, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
      await crypto.subtle.decrypt({ name: 'AES-GCM', iv: deB64(u.iv), additionalData: te.encode(u.usuario) }, llave, deB64(u.datos));
      return true;
    } catch (e) { return false; }
  };

  document.addEventListener('DOMContentLoaded', () => {
    const caja = document.createElement('section');
    caja.className = 'acceso';
    caja.innerHTML = `<form autocomplete="on">
      <span class="etiqueta">Juan Guzman</span>
      <h1>Cotizador</h1>
      <p class="texto">Herramienta privada. Entrá con tu usuario y contraseña del Estudio.</p>
      <label>Usuario<input type="text" name="username" autocomplete="username" autocapitalize="none" spellcheck="false" required></label>
      <label>Contraseña<input type="password" name="password" autocomplete="current-password" required></label>
      <label class="check"><input type="checkbox" checked> Recordar en este dispositivo</label>
      <button class="btn btn--primario" type="submit">Entrar</button>
      <p class="error" role="alert" hidden></p>
    </form>`;
    document.body.prepend(caja);
    const f = caja.querySelector('form'), err = caja.querySelector('.error'), btn = caja.querySelector('button');
    f.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      err.hidden = true; btn.disabled = true;
      try {
        const ok = await comprobar(f.username.value, f.password.value);
        if (!ok) { err.textContent = 'Usuario o contraseña incorrectos.'; err.hidden = false; }
        else {
          try { (caja.querySelector('.check input').checked ? localStorage : sessionStorage).setItem(LLAVE, '1'); } catch (e) {}
          html.classList.remove('bloqueado');
          caja.remove();
          window.scrollTo(0, 0);
        }
      } catch (e) { err.textContent = 'No pude conectar. Revisá tu conexión.'; err.hidden = false; }
      btn.disabled = false;
    });
  });
})();
