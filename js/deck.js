// Deck 3D de secciones. Cada [data-card] del HTML pasa a ser una card plana en
// un carrusel infinito; al abrirla, la sección se muestra en un <dialog>.
// Sin JS (o sin <dialog>) las secciones quedan apiladas en la página.
//
// Es un scroller virtual: rueda, arrastre (mouse y touch) y flechas mueven un
// `objetivo`; cada frame `actual` lo persigue con lerp (inercia). Cada card se
// ubica en un arco cóncavo girado (la izquierda más cerca, la derecha más lejos)
// y la velocidad la inclina y la aleja. Las cards nunca se curvan.

const secciones = [...document.querySelectorAll('[data-card]')];
const contenedor = document.querySelector('.sections');

if (secciones.length && contenedor && typeof HTMLDialogElement === 'function') {
  const sinMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Ajustes del movimiento. Calibrados mirando la referencia, no copiados.
  const LERP = 0.085;          // cuánto persigue `actual` al objetivo por frame
  const GIRO = 10;             // deg: el arco entero girado (izquierda cerca)
  const RADIO_X_PASO = 3.3;    // radio del arco, en pasos (card + gap)
  const RUEDA = 1;             // px de carrusel por px de rueda
  const ARRASTRE = 1.4;        // px de carrusel por px de puntero
  const LANZAMIENTO = 260;     // ms de "vuelo" que suma un flick al soltar
  const SNAP_MS = 180;         // quietud antes de centrar la card más cercana
  const INTRO_MS = 1500;
  const ZOOM_ACTIVA = 0.2;     // la card centrada crece hasta 1.2x
  const MIRADA_X = 9;          // deg máximos de giro de cabeza (visor AR)
  const MIRADA_Y = 5;
  const MIRADA_LERP = 0.06;
  // Con giroscopio la vista gira una fracción de lo que girás el celular
  // (GIRO_GANANCIA: 1 sería 1 a 1, que se sentía brusco; 0.36 era lento).
  // Rango mayor que el mouse y respuesta más rápida: el sensor ya viene
  // filtrado y un retardo extra se siente como imprecisión.
  const GIRO_YAW = 22;
  const GIRO_PITCH = 14;
  const GIRO_GANANCIA = 0.6;
  const GIRO_LERP = 0.2;

  const el = (tag, clase, texto) => {
    const nodo = document.createElement(tag);
    if (clase) nodo.className = clase;
    if (texto) nodo.textContent = texto;
    return nodo;
  };
  const limitar = (v, min, max) => Math.min(max, Math.max(min, v));
  const easeOutExpo = (t) => (t >= 1 ? 1 : 1 - 2 ** (-10 * t));

  // ── Construcción: deck + un diálogo por sección ──────────────────────────
  const deck = el('section', 'deck');
  deck.setAttribute('aria-label', 'Secciones');

  // El cuarto: piso de grilla y tres paredes con lluvia de código. Es otro
  // contexto 3D detrás de las cards (nunca las corta) pero gira igual que
  // ellas con la mirada, con la misma perspectiva.
  const cuarto = el('div', 'room');
  cuarto.setAttribute('aria-hidden', 'true');
  const espacio = el('div', 'room__space');
  // El piso y las aristas no son textura: se proyectan y se dibujan como
  // trazos de 1px en un canvas, así no titilan al girar la mirada.
  const lienzoPiso = el('canvas', 'room__grid');
  const ctxPiso = lienzoPiso.getContext('2d');
  const paredes = ['back', 'left', 'right'].map((lado) => {
    const pared = el('div', `room__wall room__wall--${lado}`);
    const lienzo = el('canvas', 'room__rain');
    lienzo.dataset.rain = '';   // lo anima js/matrix.js
    pared.append(lienzo);
    return pared;
  });
  espacio.append(...paredes);
  cuarto.append(lienzoPiso, espacio);
  const pista = el('div', 'deck__track');
  // La escena gira alrededor de la cámara: mover el mouse es girar la cabeza.
  const escena = el('div', 'deck__scene');
  pista.append(escena);
  // Ayuda de controles: abajo, chica, fuera del HUD para que la lean los lectores.
  // En touch no hay rueda ni flechas: la ayuda tiene que decir la verdad.
  const tactil = window.matchMedia('(pointer: coarse)').matches;
  // El giroscopio solo existe en contexto seguro (HTTPS o localhost).
  const hayGiroscopio = tactil && window.isSecureContext && 'DeviceOrientationEvent' in window;
  const ayuda = el('p', 'deck__hint', tactil
    ? (hayGiroscopio
      ? 'deslizá · incliná para mirar · tocá para abrir'
      : 'deslizá para moverte — tocá una card para abrirla')
    : 'scroll · arrastrá · ← → para moverte — enter abre');
  deck.append(cuarto, pista, ayuda);

  // HUD del visor: fijo delante de los ojos mientras el mundo se mueve.
  const hud = el('div', 'hud');
  hud.setAttribute('aria-hidden', 'true');
  ['tl', 'tr', 'bl', 'br'].forEach((esq) => hud.append(el('span', `hud__c hud__c--${esq}`)));
  const lectura = el('span', 'hud__readout');
  hud.append(lectura);

  const cards = [];
  const dialogos = new Map(); // id de sección → <dialog>

  for (const seccion of secciones) {
    const { cardKicker, cardTitle, cardImg, cardArt, cardAccent } = seccion.dataset;

    const card = el('button', 'card');
    card.type = 'button';
    card.dataset.open = seccion.id;
    card.setAttribute('aria-haspopup', 'dialog');
    if (cardAccent) card.style.setProperty('--card-accent', `var(${cardAccent})`);

    if (cardImg) {
      cardImg.split('|').forEach((src, i) => {
        const img = el('img', i === 0 ? 'card__media is-on' : 'card__media');
        img.src = src;
        img.alt = '';
        img.decoding = 'async';
        img.draggable = false;
        card.append(img);
      });
    } else if (cardArt) {
      const arte = el('p', 'card__art');
      arte.setAttribute('aria-hidden', 'true');
      for (const linea of cardArt.split('|')) arte.append(el('span', '', linea));
      card.append(arte);
    }

    const etiqueta = el('span', 'card__label');
    etiqueta.append(
      el('span', 'card__kicker', cardKicker),
      el('span', 'card__title', cardTitle),
      el('span', 'card__go', 'abrir →'),
    );
    card.append(etiqueta);
    escena.append(card);
    cards.push(card);

    const dialogo = el('dialog', 'sheet');
    dialogo.setAttribute('aria-labelledby', seccion.getAttribute('aria-labelledby'));
    const barra = el('div', 'sheet__bar');
    const cerrar = el('button', 'sheet__close', '[esc] cerrar');
    cerrar.type = 'button';
    barra.append(cerrar);
    dialogo.append(barra, seccion);
    document.body.append(dialogo);
    dialogos.set(seccion.id, dialogo);

    cerrar.addEventListener('click', () => dialogo.close());
    // Click en el backdrop (fuera del contenido) cierra.
    dialogo.addEventListener('click', (e) => { if (e.target === dialogo) dialogo.close(); });
    dialogo.addEventListener('close', () => {
      if (location.hash === `#${seccion.id}`) history.replaceState(null, '', location.pathname);
    });
  }

  contenedor.replaceWith(deck);
  document.body.append(hud);

  // ── Estado del scroller ──────────────────────────────────────────────────
  let paso = 0;        // ancho de card + gap, en px
  let radio = 0;
  let total = 0;       // largo del loop completo
  let actual = 0;
  let objetivo = 0;
  let velocidad = 0;   // suavizada, px/frame
  let ultimaEntrada = 0;
  let inicioIntro = sinMovimiento ? -Infinity : performance.now();
  let raf = 0;
  let acentoActivo = '';  // token del color publicado en --accent
  let tinteHasta = 0;
  // Mirada: objetivo según el puntero, valor actual suavizado (en -1..1).
  const mirada = { x: 0, y: 0, tx: 0, ty: 0 };

  // Posición de la card i relativa al centro, envuelta en [-total/2, total/2).
  const desplazamiento = (i, pos = actual) => {
    const d = (i * paso - pos) % total;
    return ((d + total * 1.5) % total) - total / 2;
  };
  const indiceCentral = () => {
    let mejor = 0;
    cards.forEach((_, i) => {
      if (Math.abs(desplazamiento(i, objetivo)) < Math.abs(desplazamiento(mejor, objetivo))) mejor = i;
    });
    return mejor;
  };

  function medir() {
    const ancho = cards[0].offsetWidth;
    // Gap amplio: la card activa crece y no debe pisar a sus vecinas.
    const gap = parseFloat(getComputedStyle(document.documentElement).fontSize) * 1.5 + ancho * ZOOM_ACTIVA / 2;
    const pasoViejo = paso || ancho + gap;
    paso = ancho + gap;
    radio = paso * RADIO_X_PASO;
    total = paso * cards.length;
    // Mantener la card centrada al cambiar el tamaño.
    actual *= paso / pasoViejo;
    objetivo *= paso / pasoViejo;
    const persp = Math.round(radio * 0.92);
    deck.style.setProperty('--persp', `${persp}px`);
    armarCuarto(persp);
  }

  // Geometría del cuarto en px, relativa al centro de la vista (y hacia abajo,
  // z hacia la cámara). Las paredes quedan apenas fuera de cuadro en z=0 y
  // convergen hacia el fondo: se ven como un pasillo.
  function armarCuarto(persp) {
    const W = deck.clientWidth;
    const H = deck.clientHeight;
    const x = W * 0.62;            // media anchura
    const pisoY = H * 0.34;       // el piso, apenas debajo de las cards
    const techoY = -H * 1.2;      // el borde superior, fuera de cuadro
    const fondoZ = -persp * 1.2;  // pared del fondo
    const cercaZ = persp * 0.5;   // hasta dónde llegan hacia la cámara
    const alto = pisoY - techoY;
    const prof = cercaZ - fondoZ;
    const yc = (pisoY + techoY) / 2;
    const zc = (cercaZ + fondoZ) / 2;

    const plano = (nodo, w, h, transform) => {
      nodo.style.width = `${w}px`;
      nodo.style.height = `${h}px`;
      nodo.style.margin = `${-h / 2}px 0 0 ${-w / 2}px`;
      nodo.style.transform = transform;
    };
    const [fondo, izq, der] = paredes;
    plano(fondo, x * 2, alto, `translate3d(0, ${yc}px, ${fondoZ}px)`);
    plano(izq, prof, alto, `translate3d(${-x}px, ${yc}px, ${zc}px) rotateY(90deg)`);
    plano(der, prof, alto, `translate3d(${x}px, ${yc}px, ${zc}px) rotateY(-90deg)`);

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    lienzoPiso.width = Math.round(W * dpr);
    lienzoPiso.height = Math.round(H * dpr);
    ctxPiso.setTransform(dpr, 0, 0, dpr, 0, 0);
    geo = { W, H, persp, x, pisoY, techoY, fondoZ, cercaZ, prof };
  }

  // ── Piso proyectado ──────────────────────────────────────────────────────
  // Misma cámara que el CSS: perspectiva `persp` con origen en el centro y la
  // rotación de mirada alrededor de la cámara (rotateX(-pitch) rotateY(yaw),
  // pivote en z = persp). Cada punto del cuarto se proyecta a mano.
  const CUADRO = 160;          // lado de cada cuadro del piso, px de mundo
  const COS_GIRO = Math.cos(GIRO * Math.PI / 180);
  const SIN_GIRO = Math.sin(GIRO * Math.PI / 180);
  const luces = [];            // una por card: dónde y cuánto ilumina el piso
  // Color resuelto de cada card ("r, g, b"): canvas no lee custom properties.
  const coloresCards = cards.map((card) => {
    const hex = getComputedStyle(card).getPropertyValue('--card-accent').trim();
    const n = parseInt(hex.slice(1), 16);
    return Number.isNaN(n) ? '255, 180, 84' : `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
  });
  let geo = null;

  function dibujarPiso(yaw, pitch) {
    if (!geo) return;
    const { W, H, persp: P, x: X, pisoY, techoY, fondoZ, cercaZ, prof } = geo;
    const sy = Math.sin(yaw * Math.PI / 180);
    const cy = Math.cos(yaw * Math.PI / 180);
    const sp = Math.sin(-pitch * Math.PI / 180);
    const cp = Math.cos(-pitch * Math.PI / 180);

    const proyectar = (px, py, pz) => {
      const dz = pz - P;
      const x1 = px * cy + dz * sy;
      const z1 = -px * sy + dz * cy;
      const y2 = py * cp - z1 * sp;
      const z2 = py * sp + z1 * cp + P;
      const k = P / Math.max(P - z2, 1);
      return [W / 2 + x1 * k, H / 2 + y2 * k];
    };

    // Color del visor (en transición) → rgba con alpha variable.
    const rgb = getComputedStyle(document.documentElement).getPropertyValue('--accent').match(/\d+/g) || [255, 180, 84];
    const color = (a) => `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${a.toFixed(3)})`;
    // Niebla: transparente en el fondo, plena desde el 55% de la profundidad.
    const niebla = (z) => Math.min(Math.max((z - fondoZ) / (prof * 0.55), 0), 1);

    const linea = (a, b, estilo, ancho = 1) => {
      ctxPiso.strokeStyle = estilo;
      ctxPiso.lineWidth = ancho;
      ctxPiso.beginPath();
      ctxPiso.moveTo(a[0], a[1]);
      ctxPiso.lineTo(b[0], b[1]);
      ctxPiso.stroke();
    };

    ctxPiso.clearRect(0, 0, W, H);

    // Charcos de luz bajo las cards (antes que las líneas: la grilla queda
    // encima). Elipse proyectada: centro y radios salen de proyectar el
    // centro y dos puntos del borde sobre el piso.
    for (const luz of luces) {
      if (luz.fuerza < 0.005 || luz.z < fondoZ || luz.z > cercaZ) continue;
      const c = proyectar(luz.x, pisoY, luz.z);
      const bx = proyectar(luz.x + luz.radio, pisoY, luz.z);
      const bz = proyectar(luz.x, pisoY, luz.z + luz.radio * 0.45);
      const rx = Math.hypot(bx[0] - c[0], bx[1] - c[1]);
      const ry = Math.max(Math.abs(bz[1] - c[1]), 1);
      ctxPiso.save();
      ctxPiso.translate(c[0], c[1]);
      ctxPiso.scale(1, ry / rx);
      const halo = ctxPiso.createRadialGradient(0, 0, 0, 0, 0, rx);
      halo.addColorStop(0, `rgba(${luz.rgb}, ${luz.fuerza.toFixed(3)})`);
      halo.addColorStop(0.5, `rgba(${luz.rgb}, ${(luz.fuerza * 0.35).toFixed(3)})`);
      halo.addColorStop(1, `rgba(${luz.rgb}, 0)`);
      ctxPiso.fillStyle = halo;
      ctxPiso.fillRect(-rx, -rx, rx * 2, rx * 2);
      ctxPiso.restore();
    }

    // Líneas de profundidad: degradé de la niebla a lo largo del trazo.
    for (let px = -Math.floor(X / CUADRO) * CUADRO; px <= X; px += CUADRO) {
      const lejos = proyectar(px, pisoY, fondoZ);
      const cerca = proyectar(px, pisoY, cercaZ);
      const grad = ctxPiso.createLinearGradient(lejos[0], lejos[1], cerca[0], cerca[1]);
      grad.addColorStop(0, color(0));
      grad.addColorStop(0.55, color(0.34));
      grad.addColorStop(1, color(0.34));
      linea(lejos, cerca, grad);
    }

    // Líneas transversales: alpha según su profundidad.
    for (let pz = fondoZ; pz <= cercaZ; pz += CUADRO) {
      const a = niebla(pz) * 0.34;
      if (a > 0.005) linea(proyectar(-X, pisoY, pz), proyectar(X, pisoY, pz), color(a));
    }

    // Aristas del cuarto: piso con paredes y las dos esquinas del fondo.
    // Siempre 1px: más gruesas competirían con el borde de la card activa.
    const arista = color(0.7);
    linea(proyectar(-X, pisoY, fondoZ), proyectar(X, pisoY, fondoZ), arista);
    for (const lado of [-X, X]) {
      const fondo = proyectar(lado, pisoY, fondoZ);
      const cerca = proyectar(lado, pisoY, cercaZ);
      const grad = ctxPiso.createLinearGradient(...fondo, ...cerca);
      grad.addColorStop(0, arista);
      grad.addColorStop(1, color(0.35));
      linea(fondo, cerca, grad);
      // Esquina vertical hasta arriba de todo: marca dónde termina la pared
      // del fondo y empiezan las laterales; se pierde en el negro al final.
      const arriba = proyectar(lado, techoY, fondoZ);
      const sube = ctxPiso.createLinearGradient(...fondo, ...arriba);
      sube.addColorStop(0, arista);
      sube.addColorStop(0.75, color(0.45));
      sube.addColorStop(1, color(0));
      linea(fondo, arriba, sube);
    }
  }

  function pintar(ahora) {
    raf = 0;
    const anterior = actual;

    if (sinMovimiento) {
      actual = objetivo;
    } else {
      actual += (objetivo - actual) * LERP;
      if (Math.abs(objetivo - actual) < 0.05) actual = objetivo;
    }
    velocidad += (actual - anterior - velocidad) * 0.2;

    // Snap suave a la card más cercana cuando no hay input.
    if (!arrastre && ahora - ultimaEntrada > SNAP_MS) {
      const centrado = Math.round(objetivo / paso) * paso;
      if (centrado !== objetivo) objetivo = centrado;
    }

    const inclinacion = sinMovimiento ? 0 : limitar(velocidad * 0.35, -28, 28);
    const hundimiento = sinMovimiento ? 0 : Math.min(Math.abs(velocidad) * 4, 260);

    luces.length = 0;
    cards.forEach((card, i) => {
      const d = desplazamiento(i);
      const theta = d / radio;
      const x = radio * Math.sin(theta);
      const z = radio * (1 - Math.cos(theta)) - hundimiento;

      // Intro: cada card llega desde el fondo, escalonada.
      const t = limitar((ahora - inicioIntro - i * 90) / INTRO_MS, 0, 1);
      const p = easeOutExpo(t);
      const lejos = (1 - p) * -2400;

      // La card activa crece; la cercanía va de 1 (centrada) a 0 (a un paso).
      const cerca = Math.max(0, 1 - Math.abs(d) / paso);
      const escala = 1 + ZOOM_ACTIVA * cerca * cerca * (3 - 2 * cerca);

      // Fuera de cuadro: oculta (evita el salto visible del loop).
      card.style.visibility = Math.abs(theta) > 1.05 ? 'hidden' : 'visible';
      card.style.opacity = p.toFixed(3);
      card.style.transform =
        `rotateY(${GIRO}deg) translate3d(${x.toFixed(1)}px, 0, ${(z + lejos).toFixed(1)}px) ` +
        `rotateY(${(-theta * 57.2958 - inclinacion).toFixed(2)}deg) scale(${escala.toFixed(3)})`;
      card.classList.toggle('is-active', cerca > 0.5);

      // Luz que la card proyecta en el piso: su centro en el mundo es el
      // translate3d girado por rotateY(GIRO), igual que en el transform.
      const zMundo = z + lejos;
      luces.push({
        x: x * COS_GIRO + zMundo * SIN_GIRO,
        // Un poco detrás de la card: así el charco asoma justo bajo su borde.
        z: -x * SIN_GIRO + zMundo * COS_GIRO - (card.offsetWidth / 2) * 0.6,
        radio: (card.offsetWidth / 2) * escala,
        fuerza: p * (0.06 + 0.34 * cerca * cerca),
        rgb: coloresCards[i],
      });
      // El visor se tiñe con el color de la card que engancha.
      if (cerca > 0.5) {
        const token = secciones[i].dataset.cardAccent;
        if (token && token !== acentoActivo) {
          acentoActivo = token;
          tinteHasta = ahora + 700;   // redibujar el piso durante la transición
          document.documentElement.style.setProperty('--accent', `var(${token})`);
        }
      }
    });


    // Visor: cards y cuarto giran juntos alrededor de la cámara.
    // Sin giroscopio, en touch la cabeza acompaña al dedo: mira hacia donde
    // va el carrusel y vuelve al frente cuando frena.
    if (tactil && !giroscopio.activo && !sinMovimiento) {
      mirada.tx = limitar(velocidad * 0.08, -0.8, 0.8);
      mirada.ty = 0;
    }
    const suave = giroscopio.activo ? GIRO_LERP : MIRADA_LERP;
    mirada.x += (mirada.tx - mirada.x) * suave;
    mirada.y += (mirada.ty - mirada.y) * suave;
    const yaw = mirada.x * (giroscopio.activo ? GIRO_YAW : MIRADA_X);
    const pitch = mirada.y * (giroscopio.activo ? GIRO_PITCH : MIRADA_Y);
    const giro = `rotateX(${(-pitch).toFixed(3)}deg) rotateY(${yaw.toFixed(3)}deg)`;
    escena.style.transform = giro;
    espacio.style.transform = giro;   // el cuarto gira con la cabeza
    dibujarPiso(yaw, pitch);
    const signo = (v) => (v < 0 ? '−' : '+') + Math.abs(v).toFixed(1).padStart(4, '0');
    lectura.textContent = `yaw ${signo(yaw)}°  pitch ${signo(pitch)}°  z ${(1 + ZOOM_ACTIVA).toFixed(2)}`;
    const mirando = Math.abs(mirada.tx - mirada.x) > 0.001 || Math.abs(mirada.ty - mirada.y) > 0.001;

    const quieto = actual === objetivo && Math.abs(velocidad) < 0.01;
    const enIntro = ahora - inicioIntro < INTRO_MS + cards.length * 90;
    if (!quieto || mirando || ahora < tinteHasta || enIntro || arrastre || ahora - ultimaEntrada <= SNAP_MS) solicitar();
  }

  function solicitar() {
    if (!raf) raf = requestAnimationFrame(pintar);
  }

  function mover(delta) {
    objetivo += delta;
    ultimaEntrada = performance.now();
    solicitar();
  }

  function centrar(i) {
    objetivo += desplazamiento(i, objetivo);
    ultimaEntrada = performance.now();
    solicitar();
  }

  // ── Diálogos y navegación ────────────────────────────────────────────────
  const hayDialogoAbierto = () => [...dialogos.values()].some((d) => d.open);

  function abrir(id) {
    const dialogo = dialogos.get(id);
    if (!dialogo || dialogo.open) return;
    const i = cards.findIndex((c) => c.dataset.open === id);
    if (i >= 0) centrar(i);
    dialogo.showModal();
    history.replaceState(null, '', `#${id}`);
  }

  pista.addEventListener('click', (e) => {
    const card = e.target.closest('.card');
    if (card) abrir(card.dataset.open);
  });

  window.addEventListener('hashchange', () => abrir(location.hash.slice(1)));

  // Rueda: vertical u horizontal, ambas mueven el carrusel.
  window.addEventListener('wheel', (e) => {
    if (hayDialogoAbierto()) return;
    e.preventDefault();
    const escala = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? window.innerHeight : 1;
    const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    mover(delta * escala * RUEDA);
  }, { passive: false });

  // Teclado global (no hace falta enfocar nada antes): ← → cambian de card
  // y Enter abre la centrada. Si una card tiene foco, Enter lo resuelve el
  // propio <button>. Con un diálogo abierto, el teclado es del diálogo.
  window.addEventListener('keydown', (e) => {
    if (hayDialogoAbierto() || e.altKey || e.ctrlKey || e.metaKey) return;
    const dir = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (dir) {
      e.preventDefault();
      const i = (indiceCentral() + dir + cards.length) % cards.length;
      cards[i].focus({ preventScroll: true });
      centrar(i);
      return;
    }
    // Solo sin foco: un Enter sobre otro control (p. ej. el skip link) es suyo.
    const sinFoco = !document.activeElement || document.activeElement === document.body;
    if (e.key === 'Enter' && sinFoco) {
      e.preventDefault();
      abrir(cards[indiceCentral()].dataset.open);
    }
  });
  pista.addEventListener('focusin', (e) => {
    // Solo foco de teclado: el mousedown también enfoca el botón y no debe
    // recentrar la card antes de un arrastre.
    const i = cards.indexOf(e.target);
    if (i >= 0 && e.target.matches(':focus-visible')) centrar(i);
  });

  // ── Arrastre con inercia (mouse y touch) ─────────────────────────────────
  let arrastre = null;
  let movido = false;

  pista.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    arrastre = { x: e.clientX, desde: objetivo, ultX: e.clientX, ultT: e.timeStamp, vel: 0 };
    movido = false;
    solicitar();
  });

  window.addEventListener('pointermove', (e) => {
    if (!arrastre) return;
    const dx = e.clientX - arrastre.x;
    if (!movido && Math.abs(dx) > 6) {
      movido = true;
      pista.classList.add('is-dragging');
    }
    if (!movido) return;
    const dt = Math.max(e.timeStamp - arrastre.ultT, 1);
    arrastre.vel = (e.clientX - arrastre.ultX) / dt;   // px/ms del puntero
    arrastre.ultX = e.clientX;
    arrastre.ultT = e.timeStamp;
    objetivo = arrastre.desde - dx * ARRASTRE;
    ultimaEntrada = performance.now();
  });

  const soltar = (e) => {
    if (!arrastre) return;
    // Flick: si el puntero seguía en movimiento, el carrusel sigue de largo.
    if (movido && e.timeStamp - arrastre.ultT < 80) {
      objetivo -= arrastre.vel * ARRASTRE * LANZAMIENTO;
    }
    arrastre = null;
    pista.classList.remove('is-dragging');
    ultimaEntrada = performance.now();
    solicitar();
  };
  window.addEventListener('pointerup', soltar);
  window.addEventListener('pointercancel', soltar);

  // Si hubo drag, el click que sigue no debe abrir la card bajo el cursor.
  pista.addEventListener('click', (e) => {
    if (!movido) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    movido = false;
  }, true);

  // ── Mirada con el mouse (solo puntero fino; en touch no hay "cabeza") ────
  if (!sinMovimiento) {
    window.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      mirada.tx = limitar((e.clientX / window.innerWidth) * 2 - 1, -1, 1);
      mirada.ty = limitar((e.clientY / window.innerHeight) * 2 - 1, -1, 1);
      solicitar();
    }, { passive: true });
    document.documentElement.addEventListener('pointerleave', () => {
      mirada.tx = mirada.ty = 0;
      solicitar();
    });
  }

  // ── Mirada con el giroscopio: el celular es el visor ────────────────────
  // Los ángulos sueltos (beta/gamma) saltan cuando el celular se pone
  // vertical. Se arma la orientación completa como cuaternión (la técnica de
  // los visores VR web), se obtiene hacia dónde apunta la cámara y de ahí el
  // giro alrededor del eje vertical del mundo (yaw) y la altura (pitch),
  // relativos a la postura del arranque. Sin re-centrado: lo que girás, gira.
  const giroscopio = { activo: false, base: null };
  const RAD = Math.PI / 180;

  const multiplicar = (a, b) => [
    a[0] * b[3] + a[3] * b[0] + a[1] * b[2] - a[2] * b[1],
    a[1] * b[3] + a[3] * b[1] + a[2] * b[0] - a[0] * b[2],
    a[2] * b[3] + a[3] * b[2] + a[0] * b[1] - a[1] * b[0],
    a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2],
  ];
  // La cámara mira por la espalda del celular, no por su borde superior.
  const ESPALDA = [-Math.SQRT1_2, 0, 0, Math.SQRT1_2];

  // Hacia dónde mira la cámara (y arriba, -z adelante) → [yaw, pitch] en grados.
  function direccion(e) {
    const x = (e.beta || 0) * RAD;
    const y = (e.alpha || 0) * RAD;
    const z = -(e.gamma || 0) * RAD;
    const [c1, c2, c3] = [Math.cos(x / 2), Math.cos(y / 2), Math.cos(z / 2)];
    const [s1, s2, s3] = [Math.sin(x / 2), Math.sin(y / 2), Math.sin(z / 2)];
    let q = [   // Euler YXZ → cuaternión
      s1 * c2 * c3 + c1 * s2 * s3,
      c1 * s2 * c3 - s1 * c2 * s3,
      c1 * c2 * s3 - s1 * s2 * c3,
      c1 * c2 * c3 + s1 * s2 * s3,
    ];
    q = multiplicar(q, ESPALDA);
    const angulo = ((screen.orientation && screen.orientation.angle) || 0) * RAD;
    q = multiplicar(q, [0, 0, Math.sin(-angulo / 2), Math.cos(-angulo / 2)]);

    // Rotar el vector adelante (0, 0, -1) por q.
    const [qx, qy, qz, qw] = q;
    const tx = 2 * (qy * -1);
    const ty = 2 * (-qx * -1);
    const tz = 0;
    const fx = qw * tx + (qy * tz - qz * ty);
    const fy = qw * ty + (qz * tx - qx * tz);
    const fz = -1 + qw * tz + (qx * ty - qy * tx);
    return [Math.atan2(fx, -fz) / RAD, Math.asin(limitar(fy, -1, 1)) / RAD];
  }

  const envolver = (g) => ((g + 540) % 360) - 180;

  function alInclinar(e) {
    if (e.alpha === null || e.beta === null || e.gamma === null) return;
    const [yaw, pitch] = direccion(e);

    if (!giroscopio.base) {
      giroscopio.base = { yaw, pitch };
      giroscopio.activo = true;
      document.documentElement.classList.add('con-giroscopio');
    }
    // Acá solo se anota la posición real. El filtro del pulso es el lerp de
    // pintar(), por frame: Chrome deja de mandar eventos cuando el celular se
    // queda quieto, y un filtro por evento dejaba el último movimiento a medias.
    // Mirar a la derecha = yaw positivo; mirar arriba = pitch negativo (igual
    // que el mouse arriba de la pantalla).
    mirada.tx = limitar(envolver(yaw - giroscopio.base.yaw) * GIRO_GANANCIA / GIRO_YAW, -1, 1);
    mirada.ty = limitar(-(pitch - giroscopio.base.pitch) * GIRO_GANANCIA / GIRO_PITCH, -1, 1);
    solicitar();
  }

  if (hayGiroscopio && !sinMovimiento) {
    // Se escucha desde el arranque: donde el permiso ya está concedido
    // (Android) los datos llegan solos, sin esperar ningún toque.
    window.addEventListener('deviceorientation', alInclinar);
    // requestPermission no es exclusivo de iOS (Chrome también lo expone),
    // así que su existencia no dice si hace falta. Se pide en el primer toque
    // por si el navegador bloquea los datos hasta entonces (Safari en iOS):
    // solo se puede pedir dentro de un gesto del usuario.
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
      window.addEventListener('touchend', () => {
        DeviceOrientationEvent.requestPermission().catch(() => {});
      }, { once: true });
    }
    // Al rotar la pantalla cambia qué es "frente": recalibrar.
    screen.orientation?.addEventListener('change', () => { giroscopio.base = null; });
  }

  // ── Hover: el preview se anima, la card no se mueve ──────────────────────
  if (!sinMovimiento) {
    for (const card of cards) {
      const imagenes = [...card.querySelectorAll('.card__media')];
      const arte = card.querySelector('.card__art');
      const lineas = arte ? [...arte.children].map((s) => s.textContent) : [];
      let reloj = 0;

      card.addEventListener('pointerenter', (e) => {
        if (e.pointerType !== 'mouse') return;
        clearInterval(reloj);

        if (imagenes.length > 1) {
          let n = 0;
          reloj = setInterval(() => {
            imagenes[n].classList.remove('is-on');
            n = (n + 1) % imagenes.length;
            imagenes[n].classList.add('is-on');
          }, 1100);
        } else if (arte) {
          // Re-tipea las líneas como una terminal.
          const spans = [...arte.children];
          spans.forEach((s) => { s.textContent = ''; });
          arte.classList.add('is-typing');
          let linea = 0;
          let letra = 0;
          reloj = setInterval(() => {
            if (linea >= lineas.length) { clearInterval(reloj); return; }
            spans[linea].textContent = lineas[linea].slice(0, ++letra);
            if (letra >= lineas[linea].length) { linea++; letra = 0; }
          }, 18);
        }
      });

      card.addEventListener('pointerleave', () => {
        clearInterval(reloj);
        imagenes.forEach((img, i) => img.classList.toggle('is-on', i === 0));
        if (arte) {
          [...arte.children].forEach((s, i) => { s.textContent = lineas[i]; });
          arte.classList.remove('is-typing');
        }
      });
    }
  }

  // ── Arranque ─────────────────────────────────────────────────────────────
  window.addEventListener('resize', () => { medir(); solicitar(); });
  medir();

  const inicial = cards.findIndex((c) => `#${c.dataset.open}` === location.hash);
  if (inicial >= 0) {
    actual = objetivo = inicial * paso;
    abrir(cards[inicial].dataset.open);
  } else if (!sinMovimiento) {
    // Entrada: el carrusel llega girando una vuelta parcial.
    actual = -paso * 2;
  }
  solicitar();
}
