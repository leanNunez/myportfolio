# Dirección de arte — myportfolio: "Visor AR"

> Leer este archivo ANTES de tocar cualquier cosa de UI en este proyecto.

## Direction Block

```
Tone: técnico, vivo, inmersivo

Signature move: el visor "engancha" el objetivo. La página es un visor de
  realidad aumentada: cinco cards en un carrusel 3D infinito, un HUD fijo
  (esquinas, lectura yaw/pitch/z) y el mouse como la cabeza que mira.
  Cada sección tiene su color de terminal y, al centrarse una card, el HUD,
  el piso de grilla y la lluvia de código se tiñen de ese color.
  Mover el carrusel cambia el color del mundo.
  El fondo es un cuarto 3D: piso de grilla (como la referencia) y tres
  paredes donde cae la lluvia de código; gira con la mirada del visor.

Type: JetBrains Mono, única familia, pesos 400/700. Escala 1.25:
  11 (ayudas) / 12 / 14 / 16 / 20 / 25 / 31.

Color: tinta azul-noche + un color ANSI por sección.
  Neutros fríos: bg #0a0d12 · bg-soft #10151c · bg-hard #07090d
    borde #1e2630 · fg #d7dce2 (~14:1) · fg-dim #8b95a1 (~6.3:1)
    #3a4552 SOLO decoración (no pasa AA para texto).
  Secciones: 01 sobre mí ámbar #ffb454 · 02 skills cyan #5ccfe6 ·
    03 profesionales verde #3dff8a · 04 personales magenta #ff6ac1 ·
    05 contacto coral #ff7a6b.
  Por qué: en una terminal el color ES categoría (`ls --color`). Cada
    sección es un "tipo de archivo" distinto.
  El acento va solo en trazos de los dibujos, borde de la card activa,
  número de sección y HUD (≤10% de superficie). --accent está registrado
  con @property para poder transicionarlo.

Space: base 8px, densidad comfortable. Cards 16:10, ancho clamp(17rem, 32vw, 34rem).

Motion: el carrusel (lerp 0.085, snap, inercia, inclinación por velocidad),
  la mirada del visor (lerp 0.06, máx. 9° yaw / 5° pitch) y UNA transición
  de color: el tinte del visor, 600ms cubic-bezier(0.16, 1, 0.3, 1).
  prefers-reduced-motion: sin intro, sin inercia, sin mirada, lluvia
  estática, dibujos quietos.

Rejected:
  - Fondo casi negro + un solo verde neón (la versión "Matrix"): banned
    default de art-direction; todo se leía igual y sin vida.
  - Arcoíris sin roles y gradientes multicolor: color sin significado.
  - Cards curvas como la referencia (jesperlandberg.com): el usuario las
    quiere rectangulares; la velocidad las inclina, nunca las curva.
  - Capturas de pantalla como preview: cada card se veía de una "marca"
    distinta. Los dibujos SVG de una misma familia las unifican.
  - WebGL/Three.js: CSS 3D alcanza y deja el texto como HTML real.
```

## Por qué funciona (y cómo no romperlo)

- **El color es la sección.** Un color nuevo sin sección o rol semántico es
  ruido: sacarlo. Los colores viven en `css/tokens.css` (`--c-*`); el HTML
  los referencia por nombre (`data-card-accent="--c-amber"`).
- **Dibujos de una sola familia.** `assets/previews/*.svg`: trazo 1.6 en el
  color de la sección, secundarios #3a4552 / #8b95a1, resalte #d7dce2,
  fondo #0a0d12 con grilla de puntos. Un dibujo nuevo respeta esos valores
  y representa el sistema real, no una metáfora literal del rubro (el
  camión de reparto se descartó por eso).
- **El HUD no se mueve; el mundo sí.** Ese contraste es el efecto visor.
  Nada interactivo va dentro de `.hud` (es `aria-hidden` y sin puntero).
- **Hit-testing 3D:** `.deck__scene` lleva `pointer-events: none`; sin eso,
  su plano en z=0 tapa la parte de las cards que queda detrás.
- **El cuarto es otro contexto 3D** (`.room`), detrás de las cards: misma
  perspectiva y misma rotación, pero nunca las corta. La lluvia solo vive en
  las paredes (`[data-rain]`, una por pared, un solo bucle en `matrix.js`).
- **El piso no es textura.** Una grilla CSS sobre un plano 3D titila al girar
  (las líneas se re-muestrean y cambian de grosor). El piso y las aristas se
  proyectan en `dibujarPiso()` con la misma cámara que el CSS y se trazan a
  1px en un canvas. Si cambia la perspectiva o el giro, cambiar los dos.
- **Sin JS la página está completa:** las secciones quedan apiladas.

## Verificación antes de cerrar cualquier cambio de UI

1. 375px Y 1440px.
2. Teclado: ← → cambian de card sin foco previo, Enter abre, Esc cierra.
3. Hover/click en todo el ancho de cada card (elementFromPoint al 10–90%).
4. `prefers-reduced-motion`: nada se mueve solo.
5. JS off: secciones apiladas y legibles.
6. Swap-test: sin el nombre, ¿se distingue de un portfolio dark genérico?
   El visor que cambia de color tiene que responder que sí.
