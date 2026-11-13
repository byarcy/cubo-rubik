<div align="center">

# 🟥🟩🟦 RUBIK'S CUBE · byarcy

**Interactive 3D Rubik's Cube, made for the phone, with a synthwave look.**

Race the clock in Challenge mode and learn the layer-by-layer method, stage by stage, in Practice mode.

[English](README.md) · [Español](README.es.md)

### [▶ Open the app](https://byarcy.github.io/cubo-rubik/)

`https://byarcy.github.io/cubo-rubik/`

![version](https://img.shields.io/badge/version-0.34.1-ff2e97)
![works offline](https://img.shields.io/badge/offline-PWA-00e5ff)
![no dependencies](https://img.shields.io/badge/dependencies-0-8b5cf6)
![languages](https://img.shields.io/badge/languages-English%20%C2%B7%20Espa%C3%B1ol-ffd500)

</div>

<p align="center">
  <img src="screenshots/challenge.jpg" width="250" alt="Challenge mode: a scrambled cube and the timer">
  &nbsp;
  <img src="screenshots/practice.jpg" width="250" alt="Practice mode: the piece to move lit up, its slot framed and an arrow on the layer to turn">
</p>
<p align="center"><sub>Challenge with a timer · Guided practice, stage by stage</sub></p>

> **Since version 0.30 the app is rewritten from scratch**, and since 0.34 the whole project (code, comments, file
> names and documentation) is in English, with the texts of the interface in separate language files. Practice mode
> has two lessons so far (the white layer); the rest are on the way (see [TODO.md](TODO.md)). The previous version
> is kept in the `v0.21` tag.

---

## ✨ What you can do

### ⏱️ Challenge
Scramble the cube and solve it against the clock. The time starts with your first turn, counts your moves and keeps your best time. You can pause it.

### 🧭 Practice
To learn the **layer-by-layer method**, the beginner one, split into 7 stages.

- **Stage bar:** the app looks at your cube and shows how many stages you have completed and which one is next.
- **Lesson 1 · White cross:** starts from a scrambled cube and teaches a recipe that always works: take the edge to the yellow layer, turn it until it is on the face of its color and put it in with a half turn.
- **Lesson 2 · White corners:** each exercise starts with the cross already done and several corners out of place.
- **White on top:** as in the guides, the cube is shown with white on top. It turns by itself to bring the faces to move in front of you, but it respects the view you choose with your fingers or with the cube button. For the bottom layer, which can't be seen from above, the arrow is stuck on the bottom row of the visible faces.
- **Piece in focus:** the piece to move lights up and the rest of the cube is dimmed. A pink frame marks its slot.
- **Arrow on the cube:** the face you have to turn shows an arrow with the direction of the turn, and the turns appear below as letters so you learn the notation along the way.
- **It corrects you, without punishing valid routes:** if you turn another face in the middle of a step, it asks you to undo it. But if the step can be solved another way that is just as good (turning the layer the other way, or handling a piece on the diagonal through the face next to it), it accepts that and follows you along that route.
- **Three help levels:** *Guided* (piece, slot, arrow and turns), *Piece only* (piece and slot, no turns) and *No help* (it only tells you when the layer is complete).

#### The 7 stages

| # | Stage | Lesson |
| --- | --- | --- |
| 1 | White cross | ✅ Ready |
| 2 | White corners | ✅ Ready |
| 3 | Second layer | Coming |
| 4 | Yellow cross | Coming |
| 5 | Yellow edges | Coming |
| 6 | Yellow corners in place | Coming |
| 7 | Yellow corners oriented | Coming |

### 🌍 Languages
English and Spanish for now. The app picks the language of your browser (English if it doesn't have yours) and you can change it in **Help**. Adding a language is just adding a text file: see [Adding a language](#adding-a-language).

### 🧊 2×2 cube
A button next to the title switches between 3×3 and 2×2 in Challenge. Each size keeps its own cube, time and record. Practice uses the 3×3.

### And also
- Turn the faces by dragging with your finger, or use the **TURNS** menu with the notation (R, U', F2…).
- Drag outside the cube to rotate it as a whole. With two fingers, moving them rotates the cube and twisting them turns it on the screen, like a knob, from any position; the box in the corner shows the side you can't see.
- Help with the use of the app and the notation.
- Your progress is saved on its own, in your browser (progress saved by older versions is kept).
- There is a secret hidden for whoever solves the cube. 😉

---

## 📲 Install it on your phone

It works in the browser and it can also be **installed as an app**. Once installed, it opens offline.

| Android (Chrome) | iPhone (Safari) |
| --- | --- |
| Open the app → menu **⋮** → **Install app** or **Add to Home screen** | Open the app → **Share** → **Add to Home Screen** |

---

## 🛠️ How it is built

- **No libraries:** plain HTML, CSS and JavaScript. Nothing to compile.
- **Own 3D engine** on WebGL, which only draws when something moves, to save battery.
- **Logic separated from drawing:** the cube state and the coach don't know the interface, so they can be tested on their own.
- **Generated exercises:** the coach starts from a solved cube, scrambles what the lesson doesn't use and takes the pieces you will practice out of place. That way every exercise has a solution.
- **Texts apart from code:** the interface never contains literal text; everything comes from `i18n/` by key.
- **PWA:** `manifest.webmanifest` and a *service worker* (`sw.js`) that keeps the app for use without internet.

### Repository contents

| File | What it is |
| --- | --- |
| `index.html` | The page: structure (its texts come from `i18n/`) |
| `styles.css` | Visual design |
| `graphics_engine.js` | 3D engine (WebGL), scene, lights and animation of the layers |
| `cube_logic.js` | Cube state, turns, notation and the stage detector |
| `algorithms.js` | Sequences of each method, in standard notation |
| `coach.js` | The "teacher" of Practice: recognizes the case, offers equivalent routes and prepares exercises |
| `game_controller.js` | Input (finger, buttons), Challenge, Practice, saving and main loop |
| `i18n/i18n.js` | Language module: looks up texts by key, plurals, language detection |
| `i18n/en.js`, `i18n/es.js` | The texts of each language (one file per language) |
| `sw.js` | Service worker: keeps the app for offline use |
| `manifest.webmanifest` | Data to install it as an app |
| `orbitron.woff` | Font of the titles |
| `icon.svg`, `icon-192.png`, `icon-512.png`, `apple-touch-icon.png` | Icons |
| `tests/lessons.test.js` | Browser-free test: solves hundreds of exercises of every registered lesson |
| `tests/i18n.test.js` | Browser-free test: every language is complete and consistent |
| `TODO.md` | What is missing: lessons, other methods and languages |
| `screenshots/` | Images for this README |

### Running it on your computer

The app opens straight from `index.html`. To also try the installation and offline use you need a local server; with Python installed:

```bash
python -m http.server 8123
```

Then open `http://localhost:8123`. With `?debug=true` at the end, scrambling messes up a single turn and progress is saved separately.

### Tests

```bash
node tests/lessons.test.js
node tests/i18n.test.js
```

The first one goes through every lesson that exists, so it also works for the ones that get added. The second one goes through every language file in `i18n/`.

### Adding a language

1. Copy `i18n/en.js` to `i18n/xx.js` (`xx` = language code, for example `pt` or `fr`), change the code and the name at the top, and translate the texts. Keep the `{parameters}` as they are; plurals have the forms of the language (`one`, `other`…).
2. Add `<script src="i18n/xx.js"></script>` in `index.html` and `'./i18n/xx.js'` in the `FILES` list of `sw.js`.
3. Run `node tests/i18n.test.js`: it tells you if any key or parameter is missing.

### Publishing a new version

Change the number in `index.html` (`data-version`, the `<title>` and the footer), in `CACHE` in `sw.js`, and in the version badge of both READMEs.

The page is published with **GitHub Pages** from the `main` branch.

---

## 🙌 Credits

- Design and development: **byarcy** · © 2026
- [Orbitron](https://fonts.google.com/specimen/Orbitron) font, under the SIL Open Font License.
