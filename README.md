<div align="center">

# 🟥🟩🟦 CUBO RUBIK · byarcy

**Cubo Rubik interactivo en 3D, en español, hecho para el celular y con estilo synthwave.**

Mide tu tiempo en el modo Reto y aprende el método por capas, etapa por etapa, en el modo Práctica.

### [▶ Abrir la app](https://byarcy.github.io/cubo-rubik/)

`https://byarcy.github.io/cubo-rubik/`

![versión](https://img.shields.io/badge/versión-0.33-ff2e97)
![funciona sin conexión](https://img.shields.io/badge/sin_conexión-PWA-00e5ff)
![sin dependencias](https://img.shields.io/badge/dependencias-0-8b5cf6)
![idioma](https://img.shields.io/badge/idioma-español-ffd500)

</div>

<p align="center">
  <img src="capturas/reto.jpg" width="250" alt="Modo Reto: cubo mezclado y temporizador">
  &nbsp;
  <img src="capturas/practica.jpg" width="250" alt="Modo Práctica: la esquina que toca iluminada, su hueco enmarcado y una flecha sobre la cara que hay que girar">
</p>
<p align="center"><sub>Reto con temporizador · Práctica guiada, etapa por etapa</sub></p>

> **Desde la versión 0.30 la app está reescrita desde cero.** El código ahora está separado en archivos y el modo
> Práctica empezó de nuevo, con otra idea: lecciones cortas, una etapa a la vez. Por ahora trae las dos
> lecciones de la primera capa; las demás están en construcción. La versión anterior quedó guardada en la etiqueta `v0.21`.

---

## ✨ Qué puedes hacer

### ⏱️ Reto
Mezcla el cubo y resuélvelo contra el reloj. El tiempo empieza con tu primer giro, cuenta tus movimientos y guarda tu mejor marca. Puedes pausarlo.

### 🧭 Práctica
Para aprender el **método por capas**, el de principiantes, dividido en 7 etapas.

- **Barra de etapas:** la app mira tu cubo y muestra cuántas etapas llevas completas y cuál toca.
- **Lección 1 · Cruz blanca:** parte de un cubo mezclado y enseña una receta que siempre funciona: llevar la arista a la capa amarilla, girarla hasta la cara de su color y meterla con media vuelta.
- **Lección 2 · Esquinas blancas:** cada ejercicio empieza con la cruz ya hecha y varias esquinas fuera de sitio.
- **Blanco arriba:** como en las guías, el cubo se muestra con el blanco arriba. Gira solo para dejar de frente las caras que toca mover, pero respeta la vista que tú elijas con los dedos o con el botón del cubo. Para la capa de abajo, que no se ve desde arriba, la flecha se pega en la fila de abajo de las caras visibles.
- **Pieza en foco:** la pieza que toca se ilumina y el resto del cubo se atenúa. Un marco rosa señala su hueco.
- **Flecha sobre el cubo:** la cara que debes girar muestra una flecha con el sentido del giro, y debajo aparecen los giros en letras para ir aprendiendo la notación.
- **Te corrige, sin castigar rutas válidas:** si giras otra cara a mitad de un paso, te pide deshacerla. Pero si el paso se puede resolver por otro camino igual de bueno (girar la capa al otro lado, o tratar una pieza de la diagonal por la cara de al lado), lo acepta y sigue contigo por ese camino.
- **Tres niveles de ayuda:** *Guiado* (pieza, hueco, flecha y giros), *Solo la pieza* (pieza y hueco, sin giros) y *Sin ayuda* (solo te avisa cuando la capa está completa).

#### Las 7 etapas

| # | Etapa | Lección |
| --- | --- | --- |
| 1 | Cruz blanca | ✅ Lista |
| 2 | Esquinas blancas | ✅ Lista |
| 3 | Segunda capa | En construcción |
| 4 | Cruz amarilla | En construcción |
| 5 | Aristas amarillas | En construcción |
| 6 | Esquinas amarillas en su sitio | En construcción |
| 7 | Esquinas amarillas giradas | En construcción |

### 🧊 Cubo 2×2
Botón junto al título para cambiar entre 3×3 y 2×2 en el Reto. Cada tamaño guarda su propio cubo, tiempo y récord. La Práctica usa el 3×3.

### Y además
- Gira las caras arrastrando con el dedo, o usa el menú **GIROS** con la notación (R, U', F2…).
- Arrastra fuera del cubo para girarlo entero. Con dos dedos, mover gira el cubo y rotar los dedos lo gira en la pantalla, como una perilla, desde cualquier posición; el recuadro de la esquina muestra el lado que no ves.
- Ayuda con el uso de la app y la notación.
- Tu avance se guarda solo, en tu navegador.
- Hay un secreto escondido para quien resuelva el cubo. 😉

---

## 📲 Instalarla en el celular

Funciona en el navegador y también se puede **instalar como app**. Una vez instalada, abre sin conexión.

| Android (Chrome) | iPhone (Safari) |
| --- | --- |
| Abre la app → menú **⋮** → **Instalar app** o **Agregar a la pantalla principal** | Abre la app → **Compartir** → **Agregar a inicio** |

---

## 🛠️ Cómo está hecha

- **Sin librerías:** HTML, CSS y JavaScript puros. No hay que compilar nada.
- **Motor 3D propio** sobre WebGL, que dibuja solo cuando algo se mueve, para cuidar la batería.
- **Lógica separada del dibujo:** el estado del cubo y el entrenador no conocen la interfaz, así que se pueden probar solos.
- **Ejercicios generados:** el entrenador parte de un cubo armado, revuelve lo que la lección no usa y saca de sitio las piezas que vas a practicar. Así todos los ejercicios tienen solución.
- **PWA:** `manifest.webmanifest` y un *service worker* (`sw.js`) que guarda la app para usarla sin internet.

### Contenido del repositorio

| Archivo | Qué es |
| --- | --- |
| `index.html` | La página: estructura y textos |
| `estilos.css` | Diseño visual |
| `motor_grafico.js` | Motor 3D (WebGL), escena, luces y animación de las capas |
| `logica_cubo.js` | Estado del cubo, giros, notación y detector de etapas |
| `algoritmos.js` | Secuencias de cada método, en notación estándar |
| `entrenador.js` | El «profe» de la Práctica: reconoce el caso y prepara los ejercicios |
| `controlador_juego.js` | Entrada (dedo, botones), Reto, Práctica, guardado y bucle principal |
| `sw.js` | Service worker: guarda la app para usarla sin conexión |
| `manifest.webmanifest` | Datos para instalarla como app |
| `orbitron.woff` | Fuente de los títulos |
| `icon.svg`, `icon-192.png`, `icon-512.png`, `apple-touch-icon.png` | Íconos |
| `PENDIENTES.md` | Lo que falta: lecciones, otros métodos e idiomas |
| `pruebas/lecciones.test.js` | Prueba sin navegador: resuelve cientos de ejercicios de cada lección registrada |
| `capturas/` | Imágenes de este README |

### Probarla en tu computadora

La app abre directamente desde `index.html`. Para probar también la instalación y el uso sin conexión hace falta un servidor local; con Python instalado:

```bash
python -m http.server 8123
```

Luego abre `http://localhost:8123`. Con `?debug=true` al final, mezclar desordena un solo giro y el avance se guarda aparte.

Para comprobar las lecciones sin abrir el navegador:

```bash
node pruebas/lecciones.test.js
```

Recorre solas todas las lecciones que existan, así que sirve también para las que se agreguen.

Al publicar una versión nueva hay que cambiar el número en tres lugares: `index.html` (título y pie de la ayuda), `sw.js` (`CACHE`) y la insignia de este README.

La página se publica con **GitHub Pages** desde la rama `main`.

---

## 🙌 Créditos

- Diseño y desarrollo: **byarcy** · © 2026
- Fuente [Orbitron](https://fonts.google.com/specimen/Orbitron), con licencia SIL Open Font License.
