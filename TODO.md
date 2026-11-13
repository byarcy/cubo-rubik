# TODO

Living list of what is missing. When something is finished it is deleted from here and stays in the version history.

## Practice lessons

Done: the seven lessons of the layer-by-layer method (white cross, white corners, second layer, yellow cross, yellow edges, yellow corners in place, yellow corners turned), Full solve with hints (v0.39), the drills Repeat and Recognize (v0.39), turn groups and the yellow-cross fix (v0.40), and in v0.41 the Notation drawings and the Algorithms sheet in Help, and a lighter practice panel (one lesson line with a picture of its goal, the lesson list in a drawer, a bigger cube). Next:

- [ ] Full solve: keep a record (time, turns and hints of each solve) to see progress.
- [ ] Recognize: add the remaining cases (white corner in the wrong slot, edge flipped in the middle layer) and the yellow-corner twists of lesson 7.
- [ ] 2×2 practice: the hard part is done (since v0.42 "solved" and "in place" are measured against one corner, so turning the left face is the same as turning the right one plus the whole cube). Missing: allow Practice on the 2×2 (today switching to Practice forces the 3×3), lessons for it that reuse the white-corner and last-layer corner ones, and coach cases that don't rely on centers.

Every new lesson is added to `COACH.LESSONS` and must pass `node tests/lessons.test.js`.
Its texts go in `locales/en.json` and every other language (`node tests/i18n.test.js` complains if one is missing).

## Other methods (CFOP, Roux, ZZ)

The condition to start is met: the seven lessons of the layer-by-layer method are done, so it is clear what methods share. Where things stand:

- **Exercise types:** Repeat (an algorithm until the cube comes back) and Recognize (choose the case) already exist and work for any algorithm.
- **Focus on groups:** several pieces can already be lit at once (the yellow shape, the edges in place). Missing: lighting only some stickers (the yellow ones in OLL).
- **Turns (phase 2, done):** the cube logic knows `M E S`, `r`/`Rw` and `x y z` and measures "solved" against the centers (v0.42). On the screen, the turns menu has three groups (faces, two layers, middle layers and the whole cube); dragging a middle row or column turns that middle layer; `x y z` turn the view, not the pieces, so lessons and stages are not affected; and every turn has its drawing in `DIAGRAMS.turn` and in Help · Notation. In a layer-by-layer lesson a middle-layer turn is just a turn that is not in the plan (the coach asks to undo it).
- **Methods as data (phase 1, done):** `methods.js` has each method's stages, lessons, Algorithms sheet and goal pictures; the stage bar, the lesson picker, Help · Algorithms and the pictures are built from it, and the stages left the cube logic. Every message follows the rule `msg.<lesson>.<case>` (`tests/lessons.test.js` checks that every case has one), and saved progress is kept per method (older saves are upgraded). Still only for layers, inside the coach: `REPEAT` and `QUIZ` (which algorithms to repeat and which cases to recognize), and which lessons are shown with yellow on top (`yellowUp` in `COACH.LESSONS`).

Plan, in this order (each phase leaves the app working). Next:

- **Phase 3a · CFOP last layer in two looks (done, not published yet).** A method selector in the lesson list (Layer by layer · CFOP); `ALGORITHMS.cfop` has 15 face-only algorithms written as the guides write them (verified by simulation; the Z perm needs a final U2); the `cfop` method in `methods.js` (6 stages, its sheet and pictures); four lessons in `coach.js` (OLL cross with 2 algorithms, OLL face with 7, PLL corners with the T and Y perms, PLL edges with the U, H and Z perms), each passing 300 exercises with every case; Help · Algorithms shows each method's sheet. Still layer-only: Full solve, Repeat and Recognize.
- [ ] **Phase 3b · CFOP cross and F2L.** The cross (in 8 turns or fewer) and the F2L pairs, so CFOP has all its six lessons; then Full solve, Repeat and Recognize for CFOP. Needs:
  - a coach that searches for the intuitive steps (the cross in 8 turns or fewer, the F2L pairs): a small solver with a table of distances, built when the app opens (for the cross, about 190 000 positions);
  - for Recognize: case recognition by pattern (the same case from any side and any top-layer turn);
  - lighting only the stickers that matter (OLL);
- [ ] **Phase 4 · ZZ and Roux.** ZZ needs a new idea, edge orientation (good and bad edges); Roux needs `M` and blocks (two 1×2×3 blocks, then the corners, then only `M` and `U`). Full CFOP (57 OLL, 21 PLL, 41 F2L cases) can come after, with filters in the sheet.

`ALGORITHMS.roux` and `zz` are empty, waiting for phase 4.

## Sturdier cube logic

Done (v0.42). Phase A: `tests/cube.test.js` checks the logic on its own (identities of real cubes, notation, valid and impossible snapshots); a saved cube that can't exist is refused and the app says so; the coach tries turns with `CUBE.withSnapshot`, which always leaves the cube as it was; half turns are split into quarter turns in a single place (`CUBE.move`); and the cube is never an empty list. Phase B: the state is one rotation per piece (its position follows from it, and the centers keep their spin: the logo on the white center turns with U); the stickers are worked out from it, so the rest of the app reads them as before; saves made up to v0.41 (one entry per sticker) still load. Phase C: every turn is an axis, its layers and its sign (`CUBE.TURNS`): faces, middle layers `M E S`, two layers `r`/`Rw`… and the whole cube `x y z`; the notation reads them as guides and websites write them (brackets, no spaces, ’, `R2'`); "solved" and "in place" are measured against the centers (`CUBE.frame`; on the 2×2, against one corner), so a turned cube is still solved; the validity check allows moved centers; and the 3D cube can animate several layers at once.

The last step, taking the stages out of the logic, was done with phase 1 of "Other methods".

## Languages

Done: English is the main language and Spanish is the first translation (v0.34). Since v0.35 the translations are plain JSON files in `locales/` (data only, only `<b>` and `<small>` allowed), the language is detected from the browser (English if there is no match) and can be changed in Help; `node tests/i18n.test.js` checks that every language is complete and safe.

- [ ] Portuguese (`locales/pt.json`) and French (`locales/fr.json`): translate, then have a native speaker review them before publishing. French needs care with gender agreement in the piece names (arête, coin).
- [ ] More languages whenever someone wants to add one (README, "Adding a language": copy `en.json`, translate, list it in `languages.json` and `sw.js`).
- [ ] Languages with other scripts: the title font (Orbitron) only has Latin letters, so titles fall back to another font; right-to-left languages (Arabic, Hebrew) would need `dir="rtl"` and layout checks.
- [ ] README: the English one is the main one; add `README.pt.md` and `README.fr.md` together with those languages.
- [ ] The installed-app name and description (`manifest.webmanifest`) are static, so they stay in English.

## Offline and weak connections

- [ ] **Bad connection (not offline):** the service worker always asks the network first, with no time limit. In airplane mode the app opens at once from the cache, but on a connection that exists and doesn't answer (Wi-Fi without internet) it waits for the network and can take long to open. Fix: give the network a short time limit (for example 3 seconds) and fall back to the cache, or serve the cache first and update in the background.
- [ ] Confirm on a real phone with the app installed: open it once online, close it, turn on airplane mode and open it again (it was checked in a desktop browser with the server off, v0.35).

## Pending checks

- [ ] Check on a real phone: a few lessons, the 2×2, and dragging a middle row with a finger (in the browser pane, with a mouse, the turns menu groups, x, dragging the middle column, Undo and the drawings of Help · Notation were checked, v0.43).
- [ ] Retake the README screenshots: the current ones show lessons 1 and 2 in English and the interface before the light practice panel (v0.41).
