<div align="center">

# 🟥🟩🟦 CUBO RUBIK · byarcy

**Cubo Rubik interactivo en 3D, hecho para el celular y con estilo synthwave.**

Mide tu tiempo en el modo Reto y aprende el método por capas, etapa por etapa, en el modo Práctica.

[English](README.md) · [Español](README.es.md)

### [▶ Abrir la app](https://byarcy.github.io/cubo-rubik/)

`https://byarcy.github.io/cubo-rubik/`

![versión](https://img.shields.io/badge/versión-0.46-ff2e97)
![funciona sin conexión](https://img.shields.io/badge/sin_conexión-PWA-00e5ff)
![sin dependencias](https://img.shields.io/badge/dependencias-0-8b5cf6)
![idiomas](https://img.shields.io/badge/idiomas-English%20%C2%B7%20Espa%C3%B1ol-ffd500)

</div>

<p align="center">
  <img src="screenshots/challenge.jpg" width="250" alt="Modo Reto: cubo mezclado y temporizador">
  &nbsp;
  <img src="screenshots/practice.jpg" width="250" alt="Modo Práctica: la pieza que toca iluminada, su hueco enmarcado y una flecha sobre la capa que hay que girar">
</p>
<p align="center"><sub>Reto con temporizador · Práctica guiada, etapa por etapa (capturas en inglés)</sub></p>

> **Desde la versión 0.30 la app está reescrita desde cero**, y desde la 0.34 todo el proyecto (código, comentarios,
> nombres de archivos y documentación) está en inglés, con los textos de la interfaz en archivos de traducción planos (`locales/`).
> El modo Práctica trae las siete lecciones del método por capas, un armado completo con pistas, dos ejercicios más y las seis lecciones de CFOP para principiantes (ver
> [TODO.md](TODO.md), en inglés, para lo que sigue). La versión anterior quedó guardada en la etiqueta `v0.21`.

---

## ✨ Qué puedes hacer

### ⏱️ Reto
Mezcla el cubo y resuélvelo contra el reloj. El tiempo empieza con tu primer giro, cuenta tus movimientos y guarda tu mejor marca. Puedes pausarlo.

### 🧭 Práctica
Para aprender el **método por capas**, el de principiantes, dividido en 7 etapas.

- **Barra de etapas:** la app mira tu cubo y muestra cuántas etapas llevas completas y cuál toca. Mientras haces una lección no baja cuando un algoritmo desarma un momento la parte resuelta.
- **Lección 1 · Cruz blanca:** parte de un cubo mezclado y enseña una receta que siempre funciona: llevar la arista a la capa amarilla, girarla hasta la cara de su color y meterla con media vuelta.
- **Lección 2 · Esquinas blancas:** cada ejercicio empieza con la cruz ya hecha y varias esquinas fuera de sitio.
- **Lección 3 · Segunda capa:** empieza con la capa blanca hecha. Cada arista del medio sube desde la capa amarilla: giras esa capa hasta dejar la arista debajo del centro de su color del costado, y entra hacia la derecha o hacia la izquierda con 8 giros. Si una arista está en la capa del medio pero mal puesta o volteada, esos mismos 8 giros primero la bajan.
- **Lecciones 4 a 6 · Última capa:** como en la guía, el cubo se da vuelta (amarillo arriba) y cada lección usa un algoritmo, que la app muestra desde el lado que haga falta: **4 · Cruz amarilla** (6 giros: la figura amarilla pasa de punto a L, a línea y a cruz), **5 · Aristas amarillas** (7 giros: cambia dos aristas de lugar para que cada una quede sobre su centro) y **6 · Esquinas amarillas** (8 giros: mueve tres esquinas alrededor de la que ya está en su sitio).
- **Lección 7 · Girar esquinas:** el último paso de la guía. Siempre la misma cara hacia ti y el mismo sitio (adelante, arriba, a la derecha): `R' D' R D` dos veces gira la esquina que está ahí, y solo se gira la capa de arriba para traer la siguiente. Mientras tanto el resto del cubo se ve desarmado, como avisa la guía; la app lo explica, deja la vista quieta y la barra de etapas no baja, y al final el cubo vuelve solo.
- **Blanco arriba, después amarillo arriba:** como en las guías, el cubo se muestra con el blanco arriba en las dos primeras capas y dado vuelta para la última. Gira solo para dejar de frente las caras que toca mover, pero respeta la vista que tú elijas con los dedos o con el botón del cubo. Para la capa de abajo, que no se ve desde arriba, la flecha se pega en la fila de abajo de las caras visibles.
- **Pieza en foco:** la pieza que toca se ilumina y el resto del cubo se atenúa. Un marco rosa señala su hueco.
- **Flecha sobre el cubo:** la cara que debes girar muestra una flecha con el sentido del giro, y debajo aparecen los giros en letras para ir aprendiendo la notación.
- **Te corrige, sin castigar rutas válidas:** si giras otra cara a mitad de un paso, te pide deshacerla. Pero si el paso se puede resolver por otro camino igual de bueno (girar la capa al otro lado, o tratar una pieza de la diagonal por la cara de al lado), lo acepta y sigue contigo por ese camino. Todo lo mide contra los centros: si una capa del medio o dos capas los movieron, calcula el paso con el cubo sostenido así.
- **Un panel liviano:** bajo el cubo hay solo una línea con la lección (una imagen de su meta, su nombre, el nivel de ayuda y cuántos llevas), el mensaje y los giros, separados en los grupos que usan las guías (`F · R U R' U' · F'`). Así el cubo puede ser más grande. Al tocar la línea se abre la lista: el nivel de ayuda, las siete etapas con una imagen de cada meta y, en *Más práctica*, las otras tres. Al terminar un ejercicio se ilumina el botón de otro ejercicio, bajo el cubo.
- **Tres niveles de ayuda:** *Guiado* (pieza, hueco, flecha y giros), *Solo la pieza* (pieza y hueco, sin giros) y *Sin ayuda* (solo te avisa cuando la capa está completa), que se eligen en la lista de lecciones. Con menos ayuda, mientras un algoritmo desarma por unos giros la parte resuelta, la app espera en vez de reclamar.
- **Armado completo:** un cubo mezclado normal, armado con las siete etapas. La ayuda solo llega si la pides: cada toque de **PISTA** muestra un poco más del paso actual (qué pieza → a dónde va → los giros, guiados). Al final dice cuántas pistas usaste. Es el puente hacia el Reto.
- **Repetir:** desde el cubo armado, un algoritmo del método una y otra vez. El cubo se desarma y, tras unas repeticiones (6 en la mayoría), vuelve solo. Sirve para aprender el algoritmo de memoria; con *Solo la pieza* lo haces sin ver los giros.
- **Reconocer:** el cubo muestra un caso de alguna lección y eliges cuál es entre 2 o 3 opciones (hacia dónde apunta el blanco, hacia qué lado sube la arista, la forma amarilla de arriba…). Después la app muestra los giros de ese caso.

#### Las 7 etapas

| # | Etapa | Lección |
| --- | --- | --- |
| 1 | Cruz blanca | ✅ Lista |
| 2 | Esquinas blancas | ✅ Lista |
| 3 | Segunda capa | ✅ Lista |
| 4 | Cruz amarilla | ✅ Lista |
| 5 | Aristas amarillas | ✅ Lista |
| 6 | Esquinas amarillas en su sitio | ✅ Lista |
| 7 | Esquinas amarillas giradas | ✅ Lista |

### 🌍 Idiomas
Por ahora, inglés y español. La app toma el idioma de tu navegador (inglés si no tiene el tuyo) y lo puedes cambiar en **Ayuda**. Agregar un idioma es agregar un archivo de traducción: ver [Agregar un idioma](#agregar-un-idioma).

### 🧊 Cubo 2×2
Botón junto al título para cambiar entre 3×3 y 2×2 en el Reto. Cada tamaño guarda su propio cubo, tiempo y récord. La Práctica usa el 3×3.

### Y además
- **CFOP (principiante):** la lista de lecciones tiene un selector de método. CFOP se sostiene con la cruz abajo y el amarillo arriba. **1 · Cruz** da la cruz entera en la menor cantidad de giros (nunca más de 8) y **2 · F2L** mete, cada vez, el par de esquina y arista que entra con menos giros: para estas dos, sin receta, la app busca el camino más corto. Después, la última capa en dos pasos: **3 · OLL cruz** (dos algoritmos: la línea y la L), **4 · OLL cara** (siete: Sune, Antisune, H, Pi, faros, T, corbata), **5 · PLL esquinas** (permutaciones T e Y) y **6 · PLL aristas** (permutaciones U, H y Z). Todos los algoritmos giran solo caras, así que se pueden hacer arrastrando, y cada caso dice cómo reconocerlo. Su propia hoja de Algoritmos está en Ayuda. En *Más práctica*, CFOP tiene su propio **Armado completo** (un cubo mezclado armado con los seis pasos, con pistas), **Repetir** (los 15 algoritmos de OLL y PLL) y **Reconocer** (los casos de OLL y PLL).
- Gira las caras arrastrando con el dedo (una fila o columna del medio gira esa capa del medio), o usa el menú **GIROS** con la notación, en tres grupos: caras (R, U', F2…), dos capas (r, u…) y capas del medio y cubo entero (M, E, S, x, y, z; los giros del cubo entero giran la vista).
- Arrastra fuera del cubo para girarlo entero. Con dos dedos, moverlos gira el cubo y rotarlos lo gira en la pantalla, como una perilla, desde cualquier posición; el recuadro de la esquina muestra el lado que no ves.
- **Ayuda:** cómo se usa la app, la notación con un dibujo de cada giro como en las guías (U mueve la fila de arriba a la izquierda, R la columna derecha hacia arriba…, y también M, r, x…) y una hoja de **Algoritmos**: todos los algoritmos del método elegido, etapa por etapa, escritos como la guía sostiene el cubo, con sus grupos, cuándo usarlos y desde qué lado y, en la última capa, un *antes → después* visto desde arriba.
- Tu avance se guarda solo, en tu navegador (el avance guardado por versiones anteriores se conserva). Un cubo guardado que no puede existir (un guardado dañado) no se carga: ese modo empieza armado y la app lo avisa.
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
- **Textos aparte del código:** la interfaz nunca lleva texto escrito; todo sale de `locales/` por clave. Las traducciones son JSON planos (datos, nunca código) y solo pueden usar `<b>` y `<small>`: lo demás se escapa, así que una traducción no puede meter nada en la página.
- **PWA:** `manifest.webmanifest` y un *service worker* (`sw.js`) que guarda la app para usarla sin internet.

### Contenido del repositorio

| Archivo | Qué es |
| --- | --- |
| `index.html` | La página: estructura (sus textos salen de `locales/`) |
| `styles.css` | Diseño visual |
| `graphics_engine.js` | Motor 3D (WebGL), escena, luces y animación de las capas |
| `cube_logic.js` | Estado del cubo (una rotación por pieza), todos los giros (caras, capas del medio, dos capas, cubo entero), notación, la comprobación de que un cubo sea posible y el detector de etapas |
| `algorithms.js` | Secuencias de cada método, en notación estándar |
| `methods.js` | Los métodos de armado como datos: sus etapas, lecciones, hoja de Algoritmos e imágenes de las metas (por capas, CFOP) |
| `search.js` | Busca los caminos más cortos para los pasos sin receta (la cruz y los pares de F2L de CFOP), con tablas de distancias |
| `coach.js` | El «profe» de la Práctica: reconoce el caso, ofrece rutas equivalentes y prepara los ejercicios |
| `diagrams.js` | Dibujos planos pequeños, en SVG: cada giro (Ayuda) y la capa de arriba vista desde arriba (el antes → después de los algoritmos y la meta de cada lección) |
| `game_controller.js` | Entrada (dedo, botones), Reto, Práctica, guardado y bucle principal |
| `i18n.js` | Módulo de idiomas: carga las traducciones, busca los textos por clave, plurales, escape, detección del idioma |
| `locales/languages.json` | La lista de idiomas disponibles |
| `locales/en.json`, `locales/es.json` | Los textos de cada idioma (un JSON plano por idioma) |
| `sw.js` | Service worker: guarda la app para usarla sin conexión |
| `manifest.webmanifest` | Datos para instalarla como app |
| `orbitron.woff` | Fuente de los títulos |
| `icon.svg`, `icon-192.png`, `icon-512.png`, `apple-touch-icon.png` | Íconos |
| `tests/cube.test.js` | Prueba sin navegador de la lógica del cubo por sí sola: identidades de un cubo real, notación, cubos válidos e imposibles, guardados viejos |
| `tests/lessons.test.js` | Prueba sin navegador: resuelve cientos de ejercicios de cada lección registrada |
| `tests/i18n.test.js` | Prueba sin navegador: cada idioma está completo y es coherente |
| `TODO.md` | Lo que falta: lecciones, otros métodos e idiomas |
| `screenshots/` | Imágenes de este README |

### Probarla en tu computadora

La app carga sus textos con `fetch`, así que necesita un servidor web (abrir `index.html` como archivo no funciona). Con Python instalado:

```bash
python -m http.server 8123
```

Luego abre `http://localhost:8123`. Con `?debug=true` al final, mezclar desordena un solo giro y el avance se guarda aparte.

### Pruebas

```bash
node tests/cube.test.js
node tests/lessons.test.js
node tests/i18n.test.js
```

La primera revisa la lógica del cubo con hechos que cumple cualquier cubo real (cada cara girada cuatro veces da el mismo cubo, `R U R' U'` vuelve tras 6 repeticiones, `M` es `R L' x'`…) y que un cubo imposible se rechace. La segunda recorre todas las lecciones que existan, así que sirve también para las que se agreguen. La tercera recorre todos los idiomas de `locales/` y además comprueba que una traducción no pueda meter código en la página.

### Agregar un idioma

1. Copia `locales/en.json` a `locales/xx.json` (`xx` = código del idioma, por ejemplo `pt` o `fr`) y traduce los textos. Deja las claves y los `{parámetros}` tal cual; los plurales llevan las formas del idioma (`one`, `few`, `other`…); solo se permiten `<b>` y `<small>`.
2. Agrega `"xx": "Nombre del idioma"` en `locales/languages.json` y `'./locales/xx.json'` en la lista `FILES` de `sw.js`.
3. Corre `node tests/i18n.test.js`: te avisa si falta alguna clave, parámetro o archivo.

Una traducción es un archivo de datos: no hace falta programar y nunca puede ejecutar código en la app.

### Publicar una versión nueva

Cambia el número en `index.html` (`data-version`, el `<title>` y el pie), en `CACHE` de `sw.js` y en la insignia de versión de los dos README.

La página se publica con **GitHub Pages** desde la rama `main`.

---

## 🙌 Créditos

- Diseño y desarrollo: **byarcy** · © 2026
- Fuente [Orbitron](https://fonts.google.com/specimen/Orbitron), con licencia SIL Open Font License.
