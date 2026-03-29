// ── Scroll progress bar
window.addEventListener('scroll', () => {
  const el = document.getElementById('sp');
  const pct = window.pageYOffset / (document.documentElement.scrollHeight - window.innerHeight) * 100;
  el.style.width = pct + '%';
});

// ── Smooth scroll para links internos
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    e.preventDefault();
    document.querySelector(a.getAttribute('href'))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
});

// ── Reveal animado con stagger al hacer scroll
const cards = document.querySelectorAll('.skill-card, .proj-card, .contact-card');

const io = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const siblings = [...entry.target.parentElement.children];
      const idx = siblings.indexOf(entry.target);
      entry.target.style.animationDelay = (idx * 0.07) + 's';
      entry.target.classList.add('in');
      io.unobserve(entry.target);
    }
  });
}, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

cards.forEach(el => io.observe(el));