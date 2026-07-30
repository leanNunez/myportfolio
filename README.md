# Portfolio — Leandro Nuñez

Sitio personal de portfolio, construido en **HTML5, CSS3 y JavaScript vanilla** (sin framework) y desplegado en **GitHub Pages**. Muestra mis proyectos, mi stack y cómo contactarme.

🔗 **En vivo → [leannunez.github.io/myportfolio](https://leannunez.github.io/myportfolio)**

## Sobre mí

Desarrollador **Full Stack** con foco en **IA generativa** (RAG, NL2SQL, sistemas agénticos). Curso el **último año** de la Tecnicatura Universitaria en Programación (UTN FRT) y estoy certificado por IBM en *RAG and Agentic AI*.

Construyo aplicaciones reales de punta a punta: APIs con FastAPI/Express sobre PostgreSQL, frontends en React 19, e integración de LLMs en producción. Trabajo principalmente desde la terminal en Linux.

## Stack

| Área | Tecnologías |
|------|-------------|
| Frontend | React 19 · TypeScript · TanStack Router/Query · Zustand · Tailwind CSS · HTML/CSS/JS vanilla |
| Backend | FastAPI · Node.js/Express · SQLAlchemy · REST · JWT · SSE |
| Datos | PostgreSQL (pgvector, Alembic) · Prisma |
| IA | RAG · embeddings · NL2SQL · function calling · LangGraph |
| Tooling | Git/GitHub · Docker · Vercel · Render · Supabase · Neovim · Linux |

## Este repositorio

Portfolio estático, sin build step ni dependencias. El diseño es una
**sesión de terminal (tmux/Zellij) con paleta gruvbox**: status bar con
posición de scroll estilo vim, secciones como panes, hero estilo neofetch
y skills como salida de `pacman -Q`. La dirección de arte completa vive en
[`docs/art-direction.md`](docs/art-direction.md).

- `index.html` — estructura y contenido.
- `css/tokens.css` — design tokens (paleta gruvbox, escala, espaciado).
- `css/styles.css` — componentes (status bar, panes, ventanas, prompt).
- `script.js` — posición de scroll (rAF), typing del prompt, reveals.
  Todo respeta `prefers-reduced-motion` y sin JS la página se ve completa.
- `assets/` — foto en WebP (8,9 KB — el PNG original pesaba 9,5 MB) y
  tarjeta Open Graph.

### Correrlo local

Al ser estático, alcanza con servir la carpeta:

```bash
python3 -m http.server 8080
# o
npx serve .
```

El deploy a GitHub Pages es automático al mergear a `main`.

## Contacto

- **Portfolio** — [leannunez.github.io/myportfolio](https://leannunez.github.io/myportfolio)
- **GitHub** — [github.com/leanNunez](https://github.com/leanNunez)
- **LinkedIn** — [Leandro Nuñez](https://www.linkedin.com/in/leandro-nu%C3%B1ez-661461388/)
