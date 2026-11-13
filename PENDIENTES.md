# Pendientes

Lista viva de lo que falta. Lo que se termina se borra de aquí y queda en el historial de versiones.

## Lecciones de Práctica

Hechas: **1 · Cruz blanca**, **2 · Esquinas blancas**. Faltan, en este orden:

- [ ] 3 · Segunda capa (reutiliza casi todo lo de esquinas: dos casos espejo y uno de «pieza mal puesta»).
- [ ] 4 · Cruz amarilla.
- [ ] 5 · Aristas amarillas.
- [ ] 6 · Esquinas amarillas en su sitio.
- [ ] 7 · Esquinas amarillas giradas (aquí la guía dice «no desesperes»: bloquear el giro del cubo entero, contar repeticiones y avisar que el desorden es temporal).
- [ ] Armado completo con pistas: mezcla normal y el entrenador solo ayuda si se le pide (pista en tres niveles: qué pieza, adónde va, los giros). Es el puente hacia Reto.
- [ ] Ideas sueltas: «repite hasta que vuelva» (secuencias que devuelven el cubo a armado tras 6 repeticiones), reconocer el caso eligiendo entre 2 o 3 opciones, esquinas en el 2×2 como escalón previo.

Cada lección nueva se suma en `ENTRENADOR.LECCIONES` y debe pasar `node pruebas/lecciones.test.js`.

## Preparar la base para otros métodos (CFOP, Roux, ZZ)

Hacerlo **cuando estén las 7 lecciones del método por capas**, no antes: con el método completo se ve qué comparten y se evita adivinar. Tres cosas hoy están pensadas solo para capas:

- [ ] **Etapas por método.** `CUBO.ETAPAS` y la barra de 7 etapas viven en la lógica del cubo. Cada método necesita su propia lista de etapas y habrá que agregar un selector de método. Los métodos pasan a ser datos: `{id, nombre, etapas, lecciones}`.
- [ ] **Lecciones de algoritmos** (OLL, PLL, pares de F2L). Son casos que se memorizan, no piezas que se colocan: se generan deshaciendo el algoritmo y piden otro tipo de ejercicio (reconocer el caso, repetirlo). `ALGORITMOS.cfop`, `roux` y `zz` están vacíos esperando esto.
- [ ] **Foco de grupos.** Hoy se ilumina una sola pieza. En OLL hay que iluminar un grupo de calcomanías amarillas y en F2L, un par de piezas.

## Idiomas

Decidido: el idioma principal pasa a **inglés** y se agregan **español, portugués y francés**. Debe hacerse de forma modular (ver el plan abajo) y **antes de escribir más lecciones**, para no traducir dos veces cada texto nuevo.

- [ ] Módulo de idiomas separado de la lógica y del dibujo.
- [ ] Diccionarios `en`, `es`, `pt`, `fr`.
- [ ] Textos estáticos de `index.html` por `data-i18n`; mensajes del entrenador y de la Práctica con plantillas y parámetros.
- [ ] Selector de idioma, detección por el navegador (inglés si no hay coincidencia) y guardado de la elección.
- [ ] README en inglés (principal) y versiones en los otros idiomas; descripción del manifest.
- [ ] Prueba sin navegador que compruebe que los cuatro diccionarios tienen las mismas claves y los mismos parámetros.

## Verificación pendiente

- [ ] Probar la instalación como app y el uso sin conexión en un teléfono real tras cada versión nueva (en la v0.33 ya se probaron en un teléfono las rutas equivalentes y el giro con dos dedos).
- [ ] Cargar en la v0.33 un avance guardado real de la v0.21 (la clave de guardado es la misma y no se ha comprobado).
- [ ] Capturas del README: la de Práctica no muestra el selector de lección.
