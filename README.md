<div align="center">

# 🟥🟩🟦 RUBIK'S CUBE · byarcy

**Interactive 3D Rubik's Cube, made for the phone, with a synthwave look.**

Race the clock in Challenge mode and learn the layer-by-layer method, stage by stage, in Practice mode.

[English](README.md) · [Español](README.es.md)

### [▶ Open the app](https://byarcy.github.io/cubo-rubik/)

`https://byarcy.github.io/cubo-rubik/`

![version](https://img.shields.io/badge/version-0.46-ff2e97)
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
> names and documentation) is in English, with the texts of the interface in plain translation files (`locales/`). Practice mode
> has all seven lessons of the layer-by-layer method, a full solve with hints, two drills and the six lessons of CFOP for beginners (see [TODO.md](TODO.md) for what comes next). The previous version
> is kept in the `v0.21` tag.

---

## ✨ What you can do

### ⏱️ Challenge
Scramble the cube and solve it against the clock. The time starts with your first turn, counts your moves and keeps your best time. You can pause it.

### 🧭 Practice
To learn the **layer-by-layer method**, the beginner one, split into 7 stages.

- **Stage bar:** the app looks at your cube and shows how many stages you have completed and which one is next. While you do a lesson it doesn't drop when an algorithm takes the solved part apart for a moment.
- **Lesson 1 · White cross:** starts from a scrambled cube and teaches a recipe that always works: take the edge to the yellow layer, turn it until it is on the face of its color and put it in with a half turn.
- **Lesson 2 · White corners:** each exercise starts with the cross already done and several corners out of place.
- **Lesson 3 · Second layer:** starts with the white layer done. Each middle edge comes up from the yellow layer: turn that layer until the edge sits under the center of its side color, and it goes up to the right or to the left with 8 turns. If an edge is in the middle layer but in the wrong place or flipped, the same 8 turns take it down first.
- **Lessons 4 to 6 · Last layer:** as in the guide, the cube is turned over (yellow on top) and each lesson uses one algorithm, that the app shows from whichever side is needed: **4 · Yellow cross** (6 turns: the yellow shape goes from dot to L to line to cross), **5 · Yellow edges** (7 turns: swaps two edges so that each one sits over its center) and **6 · Yellow corners** (8 turns: moves three corners around the one already in place).
- **Lesson 7 · Turn corners:** the guide's last step. Always the same side facing you and the same spot (front, top, right): `R' D' R D` twice turns the corner there, and only the top layer is turned to bring the next one. The rest of the cube looks messed up in between, as the guide warns; the app says so, keeps the view still and the stage bar doesn't drop, and at the end the cube comes back by itself.
- **White on top, then yellow on top:** as in the guides, the cube is shown with white on top for the first two layers and turned over for the last one. It turns by itself to bring the faces to move in front of you, but it respects the view you choose with your fingers or with the cube button. For the bottom layer, which can't be seen from above, the arrow is stuck on the bottom row of the visible faces.
- **Piece in focus:** the piece to move lights up and the rest of the cube is dimmed. A pink frame marks its slot.
- **Arrow on the cube:** the face you have to turn shows an arrow with the direction of the turn, and the turns appear below as letters so you learn the notation along the way.
- **It corrects you, without punishing valid routes:** if you turn another face in the middle of a step, it asks you to undo it. But if the step can be solved another way that is just as good (turning the layer the other way, or handling a piece on the diagonal through the face next to it), it accepts that and follows you along that route. It measures everything against the centers: if a middle layer or two layers moved them, it works the step out with the cube held that way.
- **A light panel:** under the cube there is only one line with the lesson (a picture of its goal, its name, the help level and how many you have done), the message and the turns, split into the groups the guides use (`F · R U R' U' · F'`). That leaves room for a bigger cube. Tapping the line opens the list: the help level, the seven stages with a picture of each goal and, under *More practice*, the other three. When an exercise is done, the new-exercise button under the cube lights up.
- **Three help levels:** *Guided* (piece, slot, arrow and turns), *Piece only* (piece and slot, no turns) and *No help* (it only tells you when the layer is complete), chosen in the lesson list. With less help, while an algorithm takes the solved part apart for a few turns, the app waits instead of complaining.
- **Full solve:** a normal scramble, solved with the seven stages. Help only comes when you ask for it: each tap of **HINT** shows a bit more of the current step (which piece → where it goes → the turns, guided). At the end it says how many hints you used. It is the bridge to Challenge.
- **Repeat:** starting from a solved cube, one algorithm of the method again and again. The cube comes apart and, after a few repetitions (6 for most of them), it comes back by itself. It is for learning the algorithm by heart; with *Piece only* you do it from memory.
- **Recognize:** the cube shows a case from one of the lessons and you choose which one it is among 2 or 3 options (where the white sticker points, which way the edge goes up, the yellow shape on top…). Then the app shows that case's turns.

#### The 7 stages

| # | Stage | Lesson |
| --- | --- | --- |
| 1 | White cross | ✅ Ready |
| 2 | White corners | ✅ Ready |
| 3 | Second layer | ✅ Ready |
| 4 | Yellow cross | ✅ Ready |
| 5 | Yellow edges | ✅ Ready |
| 6 | Yellow corners in place | ✅ Ready |
| 7 | Yellow corners oriented | ✅ Ready |

### 🌍 Languages
English and Spanish for now. The app picks the language of your browser (English if it doesn't have yours) and you can change it in **Help**. Adding a language is just adding a translation file: see [Adding a language](#adding-a-language).

### 🧊 2×2 cube
A button next to the title switches between 3×3 and 2×2 in Challenge. Each size keeps its own cube, time and record. Practice uses the 3×3.

### And also
- **CFOP (beginner):** the lesson list has a method selector. CFOP is held with the cross at the bottom and yellow on top. **1 · Cross** gives the whole cross in the fewest turns (never more than 8) and **2 · F2L** puts in, each time, the corner-and-edge pair that goes in with the fewest turns: for these two, with no recipe, the app searches for the shortest way. Then the last layer in two looks: **3 · OLL cross** (two algorithms: the line and the L), **4 · OLL face** (seven: Sune, Antisune, H, Pi, headlights, T, bowtie), **5 · PLL corners** (T and Y perms) and **6 · PLL edges** (U, H and Z perms). Every algorithm only turns faces, so it can be made by dragging, and each case says how to recognize it. Its own Algorithms sheet is in Help. Under *More practice*, CFOP has its own **Full solve** (a scrambled cube solved with the six steps, with hints), **Repeat** (the 15 OLL and PLL algorithms) and **Recognize** (the OLL and PLL cases).
- Turn the faces by dragging with your finger (a middle row or column turns that middle layer), or use the **TURNS** menu with the notation, in three groups: faces (R, U', F2…), two layers (r, u…) and the middle layers and whole cube (M, E, S, x, y, z; the whole-cube turns turn the view).
- Drag outside the cube to rotate it as a whole. With two fingers, moving them rotates the cube and twisting them turns it on the screen, like a knob, from any position; the box in the corner shows the side you can't see.
- **Help:** how to use the app, the notation with a drawing of each turn as the guides draw it (U moves the top row to the left, R the right column up…, and also M, r, x…), and an **Algorithms** sheet: every algorithm of the chosen method, stage by stage, written the way the guide holds the cube, with its groups, when to use it and from which side and, for the last layer, a *before → after* seen from above.
- Your progress is saved on its own, in your browser (progress saved by older versions is kept). A saved cube that can't exist (a damaged save) is not loaded: that mode starts solved and the app says so.
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
- **Texts apart from code:** the interface never contains literal text; everything comes from `locales/` by key. The translations are plain JSON (data, never code) and may only use `<b>` and `<small>`: anything else is escaped, so a translation can't inject anything into the page.
- **PWA:** `manifest.webmanifest` and a *service worker* (`sw.js`) that keeps the app for use without internet.

### Repository contents

| File | What it is |
| --- | --- |
| `index.html` | The page: structure (its texts come from `locales/`) |
| `styles.css` | Visual design |
| `graphics_engine.js` | 3D engine (WebGL), scene, lights and animation of the layers |
| `cube_logic.js` | Cube state (one rotation per piece), every turn (faces, middle layers, two layers, whole cube), notation, the validity check of a cube and the stage detector |
| `algorithms.js` | Sequences of each method, in standard notation |
| `methods.js` | The solving methods as data: their stages, lessons, Algorithms sheet and goal pictures (layer by layer, CFOP) |
| `search.js` | Finds the shortest ways for the steps with no recipe (the CFOP cross and F2L pairs), with tables of distances |
| `coach.js` | The "teacher" of Practice: recognizes the case, offers equivalent routes and prepares exercises |
| `diagrams.js` | Small flat drawings, as SVG: each turn (Help) and the top layer seen from above (the algorithms' before → after and the goal of each lesson) |
| `game_controller.js` | Input (finger, buttons), Challenge, Practice, saving and main loop |
| `i18n.js` | Language module: loads the translations, looks up texts by key, plurals, escaping, language detection |
| `locales/languages.json` | The list of available languages |
| `locales/en.json`, `locales/es.json` | The texts of each language (one plain JSON file per language) |
| `sw.js` | Service worker: keeps the app for offline use |
| `manifest.webmanifest` | Data to install it as an app |
| `orbitron.woff` | Font of the titles |
| `icon.svg`, `icon-192.png`, `icon-512.png`, `apple-touch-icon.png` | Icons |
| `tests/cube.test.js` | Browser-free test of the cube logic on its own: identities of a real cube, notation, valid and impossible cubes, old saves |
| `tests/lessons.test.js` | Browser-free test: solves hundreds of exercises of every registered lesson |
| `tests/i18n.test.js` | Browser-free test: every language is complete and consistent |
| `TODO.md` | What is missing: lessons, other methods and languages |
| `screenshots/` | Images for this README |

### Running it on your computer

The app loads its texts with `fetch`, so it needs to be served by a web server (opening `index.html` as a file doesn't work). With Python installed:

```bash
python -m http.server 8123
```

Then open `http://localhost:8123`. With `?debug=true` at the end, scrambling messes up a single turn and progress is saved separately.

### Tests

```bash
node tests/cube.test.js
node tests/lessons.test.js
node tests/i18n.test.js
```

The first one checks the cube logic with facts any real cube obeys (each face turned four times gives the same cube, `R U R' U'` comes back after 6 repetitions, `M` is `R L' x'`…) and that a cube that can't exist is refused. The second one goes through every lesson that exists, so it also works for the ones that get added. The third one goes through every language in `locales/` and also checks that translations can't inject markup.

### Adding a language

1. Copy `locales/en.json` to `locales/xx.json` (`xx` = language code, for example `pt` or `fr`) and translate the texts. Keep the keys and the `{parameters}` as they are; plurals have the forms of the language (`one`, `few`, `other`…); only `<b>` and `<small>` are allowed.
2. Add `"xx": "Name of the language"` to `locales/languages.json` and `'./locales/xx.json'` to the `FILES` list of `sw.js`.
3. Run `node tests/i18n.test.js`: it tells you if any key, parameter or file is missing.

A translation is a plain data file: no programming is needed, and it can never run code in the app.

### Publishing a new version

Change the number in `index.html` (`data-version`, the `<title>` and the footer), in `CACHE` in `sw.js`, and in the version badge of both READMEs.

The page is published with **GitHub Pages** from the `main` branch.

---

## 🙌 Credits

- Design and development: **byarcy** · © 2026
- [Orbitron](https://fonts.google.com/specimen/Orbitron) font, under the SIL Open Font License.
