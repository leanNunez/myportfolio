// Sesión TUI — todo lo decorativo respeta prefers-reduced-motion y
// degrada a página completa si este archivo no carga (gate html.js).

const sinMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ── Posición de scroll en la status bar, como en vim: top / % / bot.
//    rAF-throttled: una lectura y una escritura por frame como máximo.
const pos = document.querySelector('[data-scrollpos]');
let ticking = false;

function pintarPos() {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  const pct = max > 0 ? Math.round((window.scrollY / max) * 100) : 0;
  pos.textContent = pct <= 0 ? 'top' : pct >= 100 ? 'bot' : pct + '%';
  ticking = false;
}

if (pos) {
  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(pintarPos);
  }, { passive: true });
  pintarPos();
}

// ── El prompt "ejecuta" whoami: tipea el comando y muestra la salida.
//    Con reduced-motion no se tipea nada (el CSS ya muestra la salida).
const prompt = document.querySelector('.prompt');
const cmd = prompt?.querySelector('[data-type]');

if (prompt && cmd && !sinMovimiento) {
  const texto = cmd.textContent;
  cmd.textContent = '';
  let i = 0;
  const tipear = () => {
    cmd.textContent = texto.slice(0, ++i);
    if (i < texto.length) {
      setTimeout(tipear, 90);
    } else {
      setTimeout(() => prompt.classList.add('done'), 250);
    }
  };
  setTimeout(tipear, 400);
} else {
  prompt?.classList.add('done');
}

// ── Reveal sobrio de panes (transition, no animation — el kill switch
//    de reduced-motion la deja en 0.01ms y el resultado es instantáneo).
const io = new IntersectionObserver((entradas) => {
  for (const entrada of entradas) {
    if (!entrada.isIntersecting) continue;
    entrada.target.classList.add('in');
    io.unobserve(entrada.target);
  }
}, { threshold: 0.1 });

document.querySelectorAll('.pane').forEach((el) => io.observe(el));
