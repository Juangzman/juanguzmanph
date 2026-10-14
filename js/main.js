/* Juan Guzman · Portfolio · interacciones */
(() => {
  const html = document.documentElement;
  html.classList.add('js');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Navegacion: fondo solido al dejar el inicio ---------- */
  const nav = document.querySelector('.nav');
  const centinela = document.querySelector('[data-centinela]');
  if (nav && centinela && 'IntersectionObserver' in window) {
    new IntersectionObserver(([e]) => nav.classList.toggle('is-solid', !e.isIntersecting), { threshold: 0 }).observe(centinela);
  } else if (nav) {
    nav.classList.add('is-solid');
  }

  /* ---------- Menu movil ---------- */
  const menuBtn = document.querySelector('.menu-btn');
  const menu = document.getElementById('menu');
  const cerrarMenu = () => {
    html.removeAttribute('data-menu-open');
    menuBtn && menuBtn.setAttribute('aria-expanded', 'false');
    menu && menu.setAttribute('inert', '');
  };
  if (menuBtn && menu) {
    menu.setAttribute('inert', '');
    menuBtn.addEventListener('click', () => {
      const abierto = html.hasAttribute('data-menu-open');
      if (abierto) return cerrarMenu();
      html.setAttribute('data-menu-open', '');
      menuBtn.setAttribute('aria-expanded', 'true');
      menu.removeAttribute('inert');
    });
    menu.addEventListener('click', (e) => { if (e.target.closest('a')) cerrarMenu(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && html.hasAttribute('data-menu-open')) { cerrarMenu(); menuBtn.focus(); } });
    window.matchMedia('(min-width: 900px)').addEventListener('change', (m) => { if (m.matches) cerrarMenu(); });
  }

  /* ---------- Titular del hero ---------- */
  requestAnimationFrame(() => requestAnimationFrame(() => { document.body.classList.add('is-listo'); html.classList.add('listo'); }));

  /* ---------- Hero: fotos que se funden ---------- */
  const heroFotos = document.querySelector('[data-hero]');
  if (heroFotos) {
    const diapos = [...heroFotos.querySelectorAll('.diapo')];
    const cat = document.querySelector('[data-hero-cat]');
    const num = document.querySelector('[data-hero-num]');
    const barra = document.querySelector('[data-hero-barra]');
    const DUR = 6000;
    let i = 0, timer = null;
    const correrBarra = () => {
      if (!barra) return;
      barra.classList.remove('corre'); void barra.offsetWidth;
      barra.style.setProperty('--dur', DUR + 'ms'); barra.classList.add('corre');
    };
    const mostrar = (n) => {
      diapos[i].classList.remove('activa');
      i = (n + diapos.length) % diapos.length;
      const d = diapos[i];
      const img = d.querySelector('img');
      if (img.loading === 'lazy') img.loading = 'eager';
      d.classList.add('activa');
      if (cat) cat.textContent = d.dataset.cat;
      if (num) num.textContent = String(i + 1).padStart(2, '0');
      correrBarra();
    };
    const iniciar = () => { clearInterval(timer); correrBarra(); timer = setInterval(() => mostrar(i + 1), DUR); };
    if (diapos.length > 1 && !reduce) {
      // precarga la segunda foto apenas termina la primera
      const primera = diapos[0].querySelector('img');
      const precargar = () => { const s = diapos[1] && diapos[1].querySelector('img'); if (s) s.loading = 'eager'; };
      if (primera.complete) precargar(); else primera.addEventListener('load', precargar, { once: true });
      iniciar();
      document.addEventListener('visibilitychange', () => { if (document.hidden) clearInterval(timer); else iniciar(); });
    }
    // Flechas: pasan la foto y reinician el temporizador
    const paso = (d) => { mostrar(i + d); if (!reduce) iniciar(); };
    const prev = document.querySelector('[data-hero-prev]');
    const next = document.querySelector('[data-hero-next]');
    prev && prev.addEventListener('click', () => paso(-1));
    next && next.addEventListener('click', () => paso(1));
    // Deslizar con el dedo sobre la foto (celular)
    const hero = heroFotos.closest('.hero');
    let x0 = null, y0 = 0;
    hero.addEventListener('touchstart', (e) => { if (e.target.closest('a, button')) return; x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
    hero.addEventListener('touchend', (e) => {
      if (x0 === null) return;
      const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0;
      x0 = null;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.4) paso(dx < 0 ? 1 : -1);
    }, { passive: true });
  }

  /* ---------- Entradas al hacer scroll ---------- */
  const reveal = document.querySelectorAll('[data-r]');
  if (!reduce && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    reveal.forEach((el) => io.observe(el));
  } else {
    reveal.forEach((el) => el.classList.add('is-in'));
  }

  /* ---------- Imagenes: aparecen al terminar de cargar ---------- */
  document.querySelectorAll('.img-carga img').forEach((img) => {
    const ok = () => img.classList.add('ok');
    if (img.complete && img.naturalWidth) ok(); else { img.addEventListener('load', ok, { once: true }); img.addEventListener('error', ok, { once: true }); }
  });

  /* ---------- Videos: solo se reproducen cuando estan a la vista ---------- */
  const videos = document.querySelectorAll('video[data-auto]');
  if (videos.length && 'IntersectionObserver' in window) {
    const vo = new IntersectionObserver((entries) => entries.forEach((e) => {
      if (e.isIntersecting && !reduce) e.target.play().catch(() => {}); else e.target.pause();
    }), { threshold: 0.35 });
    videos.forEach((v) => vo.observe(v));
  }

  /* ---------- Galeria: filtros ---------- */
  const galeria = document.querySelector('.galeria');
  const chips = document.querySelectorAll('.chip[data-filtro]');
  const figuras = galeria ? [...galeria.querySelectorAll('figure')] : [];
  const visibles = () => figuras.filter((f) => !f.hidden);

  const filtrar = (cat, desdeHash) => {
    chips.forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.filtro === cat)));
    figuras.forEach((f) => {
      const mostrar = cat === 'todo' || f.dataset.cat === cat;
      const estaba = !f.hidden;
      f.hidden = !mostrar;
      f.classList.remove('entra');
      if (mostrar && !estaba && !reduce) { void f.offsetWidth; f.classList.add('entra'); }
    });
    if (!desdeHash) history.replaceState(null, '', cat === 'todo' ? location.pathname : `#${cat}`);
  };
  if (galeria) {
    chips.forEach((c) => c.addEventListener('click', () => filtrar(c.dataset.filtro)));
    const inicial = location.hash.slice(1);
    if (inicial && document.querySelector(`.chip[data-filtro="${inicial}"]`)) filtrar(inicial, true);
  }

  /* ---------- Visor de fotos ---------- */
  const visor = document.getElementById('visor');
  if (visor && galeria) {
    const vImg = visor.querySelector('img');
    const vCont = visor.querySelector('[data-contador]');
    const vCat = visor.querySelector('[data-categoria]');
    let lista = [];
    let actual = 0;
    let ultimoFoco = null;

    const pintar = (i, animar) => {
      actual = (i + lista.length) % lista.length;
      const fig = lista[actual];
      const src = fig.dataset.full;
      const alt = fig.querySelector('img').alt;
      const poner = () => {
        vImg.src = src; vImg.alt = alt;
        vCont.textContent = `${actual + 1} / ${lista.length}`;
        vCat.textContent = fig.dataset.nombre;
      };
      if (animar && !reduce) {
        vImg.classList.add('cambia');
        setTimeout(() => { poner(); vImg.onload = () => vImg.classList.remove('cambia'); }, 140);
      } else poner();
      // precarga la siguiente
      const sig = lista[(actual + 1) % lista.length];
      if (sig) { const p = new Image(); p.src = sig.dataset.full; }
    };
    const abrir = (fig) => {
      lista = visibles();
      ultimoFoco = document.activeElement;
      pintar(lista.indexOf(fig), false);
      visor.showModal();
      html.style.overflow = 'hidden';
    };
    const cerrar = () => { visor.close(); };
    visor.addEventListener('close', () => { html.style.overflow = ''; vImg.removeAttribute('src'); ultimoFoco && ultimoFoco.focus(); });

    galeria.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) abrir(b.closest('figure')); });
    visor.querySelector('[data-cerrar]').addEventListener('click', cerrar);
    visor.querySelector('[data-prev]').addEventListener('click', () => pintar(actual - 1, true));
    visor.querySelector('[data-next]').addEventListener('click', () => pintar(actual + 1, true));
    visor.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') { e.preventDefault(); pintar(actual + 1, false); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); pintar(actual - 1, false); }
    });
    // Deslizar: velocidad o distancia, un solo dedo
    const escena = visor.querySelector('.visor__escena');
    let x0 = null, t0 = 0, id = null, arrastro = false;
    escena.addEventListener('click', (e) => { if (e.target === e.currentTarget && !arrastro) cerrar(); arrastro = false; });
    escena.addEventListener('pointerdown', (e) => { if (id !== null) return; id = e.pointerId; x0 = e.clientX; t0 = performance.now(); });
    escena.addEventListener('pointermove', (e) => {
      if (e.pointerId !== id || x0 === null || reduce) return;
      vImg.style.transition = 'none';
      vImg.style.transform = `translateX(${(e.clientX - x0) * 0.6}px)`;
    });
    const fin = (e) => {
      if (e.pointerId !== id) return;
      const dx = e.clientX - x0; const v = Math.abs(dx) / (performance.now() - t0);
      arrastro = Math.abs(dx) > 10;
      vImg.style.transition = ''; vImg.style.transform = '';
      if (Math.abs(dx) > 60 || (v > 0.11 && Math.abs(dx) > 12)) pintar(actual + (dx < 0 ? 1 : -1), true);
      x0 = null; id = null;
    };
    escena.addEventListener('pointerup', fin);
    escena.addEventListener('pointercancel', fin);
  }

  /* ---------- Diseño: el indice marca el area que se esta viendo ---------- */
  const espia = document.querySelector('[data-espia]');
  if (espia && 'IntersectionObserver' in window) {
    const links = [...espia.querySelectorAll('a')];
    const marcar = (id) => links.forEach((a) => {
      const on = a.getAttribute('href') === '#' + id;
      a.classList.toggle('activa', on);
      if (on) { a.setAttribute('aria-current', 'true'); espia.scrollTo({ left: a.offsetLeft - 16, behavior: reduce ? 'auto' : 'smooth' }); }
      else a.removeAttribute('aria-current');
    });
    const so = new IntersectionObserver((entries) => entries.forEach((e) => { if (e.isIntersecting) marcar(e.target.id); }),
      { rootMargin: '-35% 0px -60% 0px' });
    document.querySelectorAll('.area[id]').forEach((s) => so.observe(s));
  }

  /* ---------- Anio en el pie ---------- */
  document.querySelectorAll('[data-anio]').forEach((el) => { el.textContent = new Date().getFullYear(); });
})();
