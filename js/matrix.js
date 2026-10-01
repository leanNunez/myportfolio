// Lluvia de código en las paredes del cuarto: un canvas 2D por pared
// ([data-rain], los crea js/deck.js) y un solo bucle para todas.
// Con prefers-reduced-motion se pinta un único frame estático.

const lienzos = [...document.querySelectorAll('[data-rain]')];

if (lienzos.length) {
  const sinMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const GLIFOS = '01{}[]()<>/\\;:=+-*&|!?$#@%アイウエオカキクケコサシスセソタチツテト';
  const TAM = 20;            // px de CSS por celda (las paredes son grandes)
  const RES = 0.5;           // px de canvas por px de CSS: las paredes quedan
                             // lejos y en ángulo, no hace falta más definición
  const FPS = 24;            // la lluvia no necesita 60
  // Canvas no lee custom properties: espejo de --bg en tokens.css.
  const FONDO = '#0a0d12';
  const VELO = 'rgba(10, 13, 18, 0.09)';

  const glifo = () => GLIFOS[Math.floor(Math.random() * GLIFOS.length)];

  // Una lluvia por pared: tamaño propio, columnas propias.
  const paredes = lienzos
    .map((canvas) => ({ canvas, ctx: canvas.getContext('2d'), ancho: 0, alto: 0, gotas: [] }))
    .filter((p) => p.ctx);

  let ultimo = 0;
  let raf = 0;

  function medir(p) {
    // clientWidth es el tamaño de layout: la transformación 3D no lo altera.
    p.ancho = p.canvas.clientWidth;
    p.alto = p.canvas.clientHeight;
    p.canvas.width = Math.max(1, Math.floor(p.ancho * RES));
    p.canvas.height = Math.max(1, Math.floor(p.alto * RES));
    p.ctx.setTransform(RES, 0, 0, RES, 0, 0);
    p.ctx.fillStyle = FONDO;
    p.ctx.fillRect(0, 0, p.ancho, p.alto);
    p.ctx.font = `${TAM}px "JetBrains Mono", monospace`;
    p.ctx.textBaseline = 'top';
    const cols = Math.ceil(p.ancho / TAM);
    p.gotas = Array.from({ length: cols }, () => -Math.floor(Math.random() * (p.alto / TAM)));
  }

  function paso() {
    // El color de la lluvia es el del visor (--accent, en transición).
    const color = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#ffb454';

    for (const p of paredes) {
      // El velo semitransparente deja la estela: cuanto más bajo el alpha, más larga.
      p.ctx.fillStyle = VELO;
      p.ctx.fillRect(0, 0, p.ancho, p.alto);
      p.ctx.fillStyle = color;

      for (let i = 0; i < p.gotas.length; i++) {
        const y = p.gotas[i] * TAM;
        p.ctx.fillText(glifo(), i * TAM, y);
        if (y > p.alto && Math.random() > 0.975) p.gotas[i] = 0;
        p.gotas[i] += 1;
      }
    }
  }

  function bucle(t) {
    raf = requestAnimationFrame(bucle);
    if (t - ultimo < 1000 / FPS) return;
    ultimo = t;
    paso();
  }

  function iniciar() {
    cancelAnimationFrame(raf);
    paredes.forEach(medir);
    // Arranca con la lluvia ya cayendo: paredes vacías no se leen como cuarto.
    for (let i = 0; i < 90; i++) paso();
    if (sinMovimiento) return;              // queda ese cuadro estático
    raf = requestAnimationFrame(bucle);
  }

  // Después del resize de deck.js, que es el que redimensiona las paredes.
  let temporizador = 0;
  window.addEventListener('resize', () => {
    clearTimeout(temporizador);
    temporizador = setTimeout(iniciar, 200);
  });

  if (!sinMovimiento) {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) cancelAnimationFrame(raf);
      else raf = requestAnimationFrame(bucle);
    });
  }

  iniciar();
}
