# Dirección de arte — myportfolio: "Sesión TUI"

> Leer este archivo ANTES de tocar cualquier cosa de UI en este proyecto.

## Direction Block

```
Tone: técnico, habitado, sin humo

Signature move: la página ES una sesión de tmux/Zellij. Status bar fija
  con nombre de sesión y posición de scroll estilo vim (top/42%/bot);
  secciones como panes con marco y título en el borde (" 0:hero ");
  hero estilo neofetch con foto, tabla clave:valor y la fila de colores.
  LazyVim/Tmux/Zellij son el entorno REAL del autor: el mundo del sujeto
  genera el diseño, no un tema comprado.

Type: JetBrains Mono, única familia, pesos 400/700 (2 archivos de fuente).
  Escala 1.25: 16/20/25/31. En una TUI la jerarquía la dan el color, el
  peso y los marcos — no el tamaño gigante.
  (Se descartó el nombre en ASCII figlet: a 375px un figlet de "Leandro"
  necesita ~60ch y rompe el layout. El guiño neofetch cumple ese rol.)

Color: gruvbox dark — oscuro CÁLIDO PLANO:
  bg #282828 · bg-soft #32302f · bg-hard #1d2021 · borde #504945
  fg #ebdbb2 (10.8:1) · fg-dim #a89984 (5.3:1; 4.7:1 sobre bg-soft)
  #928374 SOLO decoración (4.0:1 — no pasa AA para texto)
  ANSI semántico: green #b8bb26 ok/live/disponible · yellow #fabd2f
  en curso/títulos de pane · blue #83a598 links · orange #fe8019
  hover/acción · red #fb4934 casi no existe · aqua #8ec07c tags.
  PROHIBIDO: glow, blur, backdrop-filter, gradientes, border-radius
  (única excepción: el LED de "disponible", que es redondo porque es
  un LED). 16 pares verificados por script antes de escribir el CSS.

Space: base 8px, densidad tight-comfortable (archetype dev-tool).
  Panes con gap constante, como un tiling window manager real.

Motion: 150ms lineal. Personalidad concentrada en UNA secuencia: el
  prompt tipea `whoami` una sola vez y aparece la salida; cursor y LED
  parpadean. reduced-motion: nada parpadea, nada tipea, salida visible
  — y NADA se re-activa con !important (el bug del diseño anterior).

Rejected:
  - Near-black + cyan/violeta + glow + gradiente en texto: lo que había.
    Es el banned default de art-direction — el look de cualquier
    portfolio dev del planeta.
  - Space invaders flotando en animación infinita (5 SVGs, ~80 líneas).
  - Carruseles: un tiling manager no carrusela, tilea. Grid.
  - Iconos devicon desde CDN de terceros: en una TUI desentonan y son
    8 requests. Los reemplaza la lista estilo `pacman -Q`.
```

## Por qué funciona (y cómo no romperlo)

- **El color ES la jerarquía.** Verde = estado bueno/acción principal,
  amarillo = en curso/atención, azul = navegable, naranja = hover. Si un
  color nuevo aparece sin rol semántico, es ruido: sacarlo.
- **Los caracteres de guion** (`$`, `>`, `●`, `▸`, `0:`) van SIEMPRE en
  `aria-hidden` o pseudo-elementos: un lector de pantalla debe escuchar
  "hero", no "cero dos puntos hero".
- **Sin JS la página está completa**: el gate `html.js` protege reveals y
  typing. Probarlo deshabilitando JS antes de cualquier release.
- La página entera (HTML+CSS+JS+foto+og) pesa menos que el 2% de la foto
  del diseño anterior. Mantener ese presupuesto: ningún asset nuevo
  arriba de 100 KB sin justificación escrita acá.

## Verificación antes de cerrar cualquier pantalla

1. 375px Y 1440px.
2. Tab por toda la página: foco amarillo visible en cada parada.
3. `prefers-reduced-motion`: nada parpadea, salida del prompt visible.
4. JS off: página completa.
5. Swap-test: ¿se distingue de un portfolio dark genérico? El neofetch,
   la status bar y los panes tienen que responder que sí.
