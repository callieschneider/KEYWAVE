# Comprehensive Planning Protocol

> **This is the authoritative reference for how agents create plans in KEYWAVE.**

*Adapted from abstraKt planning protocol. Created: March 12, 2026*

---

## Core Principle

**A plan should be so detailed that any agent (or a future you with zero context) could execute it mechanically, phase by phase, without asking a single clarifying question.** If a plan has gaps, ambiguities, or hand-waves — it's not done yet.

Second principle: **A plan is not done until every gray area is scripted and every button is wired.**

---

## When to Enter Plan Mode

Produce a comprehensive plan for tasks involving:
- New features spanning multiple files
- More than 3 files or new patterns
- Architecture changes or new data flows
- New input modes or audio processing chains
- Anything the user explicitly asks for a plan on

---

## Before Proposing Anything

1. Read `README.md` and any existing docs in `docs/`
2. Read the relevant sections of `static/app.js`, `static/index.html`, `static/style.css`
3. Understand the **current state** of the code you'll touch — don't plan against assumptions
4. Ask 2-3 clarifying questions upfront if there's genuine ambiguity

---

## What "Scripts in the Gray Areas" Means

Between every major component of a plan, there are **gray areas** — the connecting logic, data transformations, edge cases, error paths, and integration points where things typically break. A good plan **fills these in explicitly** with:

- **Exact code snippets** for non-obvious implementations (real JavaScript, not pseudocode)
- **Data shape examples** showing what flows between functions (input → output with real field names)
- **Edge case handling** — what happens when the browser denies permission, the data is empty, the user switches modes, the canvas isn't ready?
- **Integration seams** — where does function A end and function B begin? What's the exact interface?
- **Error states** — what does the UI show? What gets logged to console?

**Anti-pattern (vague plan):**
> "Phase 3: Add motion detection to the webcam feed"

**Good plan (gray areas scripted):**
> **Phase 3: Motion Detection — `evaluateNoteGrid(motionMap)`**
>
> For each cell in `gridCells`:
> ```javascript
> const rawEnergy = sumPixelsInBounds(motionMap, cell.x, cell.y, cell.w, cell.h) / cellPixelCount;
> cell.motionEnergy = cell.motionEnergy * 0.6 + rawEnergy * 0.4; // EMA smoothing
> if (cell.motionEnergy > settings.webcam.threshold && !cell.isActive && (now - cell.lastTriggerTime) > settings.webcam.cooldownMs) {
>     triggerCellNote(cell);
>     cell.isActive = true;
>     cell.lastTriggerTime = now;
> }
> ```
>
> **Gray area: What if the video element isn't playing yet?** Check `webcamVideo.readyState >= 2` before calling `getImageData`. If not ready, skip the frame.
>
> **Gray area: What if all cells trigger at once (lighting change)?** Cap new triggers per frame to 3. Pick the 3 cells with highest `motionEnergy`.

---

## Full Wire Tracing — No Dead Buttons

> **This is the single most common failure mode in agent-built features.** A button renders but does nothing. A dropdown shows options but doesn't fire a handler. The feature *looks* complete but is functionally dead.

### The Rule

**Every interactive UI element in a plan must have its complete wire traced:**

```
User action → event listener → handler function → settings update / state change → side effect (audio, visual, etc.) → UI feedback
```

A button that renders without an event listener is a bug. A slider that shows a value but doesn't update `settings` is a bug. **If it's interactive, the plan must specify the full path from action to result.**

### Anti-Pattern vs. Good Pattern

**BAD (scaffold with no wire):**
> "Add a sensitivity slider to the webcam panel"

**GOOD (full wire trace):**
> Sensitivity slider (`webcamSensitivity`):
> - `input` event → handler in `setupWebcamControls()`
> - Handler updates `settings.webcam.sensitivity` to `parseFloat(e.target.value)`
> - Updates display span: `document.getElementById('sensitivityValue').textContent = e.target.value`
> - Effect is immediate: next `computeMotionMap()` call uses the new sensitivity as a multiplier
> - No failure state (slider with fixed range)

### Interactive Element Audit

Before finalizing any plan phase that creates UI, **list every interactive element** (button, link, dropdown, toggle, slider, clickable area) and for each one specify:

1. **What event triggers it** — `click`, `change`, `input`, etc.
2. **What function handles it** — exact function name
3. **What that function calls** — settings update, state change, side effect
4. **What success looks like** — UI change, audio change, visual feedback
5. **What failure looks like** — error text, disabled state, console warning

If an element can't answer all 5, it's incomplete.

### No Scaffold-Only Phases

A phase **cannot** end with "UI scaffold created, will wire up in Phase N." Every phase must leave every rendered element in a working state. Wire the connection first (event → handler → effect), then make it pretty. **Function before form.**

### "Click Every Button" Verification

After implementing any phase with UI, **manually interact with every single interactive element** and verify it produces the expected result. This is not optional.

---

## Wiring & Registration Checklist

Creating a new "thing" in KEYWAVE requires touching multiple files. Miss one and the feature silently doesn't work. **Every plan that creates a new entity must include a Wiring Checklist.**

### Adding a New Interactive UI Control
| # | File | What to Add |
|---|------|-------------|
| 1 | `static/index.html` | DOM element with correct ID |
| 2 | `static/app.js` — `settings` | Default value for any new tunable |
| 3 | `static/app.js` — `setupControls()` or feature-specific setup function | Get element by ID, set initial value, add event listener |
| 4 | `static/app.js` — `DOMContentLoaded` | Call setup function if new |
| 5 | `static/style.css` | Styles for the element |

### Adding a New Audio Feature
| # | File | What to Add |
|---|------|-------------|
| 1 | `static/app.js` — global state | New state variables |
| 2 | `static/app.js` — `settings` | Feature flags and tunables |
| 3 | `static/app.js` — audio engine section | New audio nodes or processing |
| 4 | `static/app.js` — `initAudio()` or `createEffectsChain()` | Wire into existing audio graph |
| 5 | `static/index.html` | UI controls for the feature |
| 6 | `static/style.css` | Styles for new UI |

### Adding a New Input Mode
| # | File | What to Add |
|---|------|-------------|
| 1 | `static/app.js` — global state | Mode flag and mode-specific state |
| 2 | `static/app.js` — `handleKeyDown()` | Guard check for input mode |
| 3 | `static/app.js` — `setupPowerButton()` | Power-off cleanup for new mode |
| 4 | `static/app.js` — `DOMContentLoaded` | Setup function call |
| 5 | `static/index.html` | Mode toggle UI and mode-specific panel |
| 6 | `static/style.css` | Styles for mode UI |

> **Rule:** If your plan creates something that spans multiple files, include a wiring checklist.

---

## Naming Dictionary

Before implementation begins, establish a naming dictionary that locks the name of every new concept across all layers. Inconsistent names between phases become bugs at integration time.

```
Example for a "Webcam Motion" feature:

  Settings keys:    settings.webcam.threshold, settings.webcam.sensitivity
  DOM IDs:          webcamToggle, webcamPanel, webcamOverlay
  CSS classes:      .webcam-section, .webcam-preview, .webcam-cell-active
  JS functions:     initWebcam(), evaluateNoteGrid(), triggerCellNote()
  JS state vars:    webcamStream, gridCells[], controlStripState
```

Use these names consistently in every phase. If Phase 2 calls it `gridCells` and Phase 5 calls it `cellArray`, that's a bug waiting to happen.

---

## Existing Pattern Audit

Before designing anything new, answer: **"What's the closest thing that already exists in this codebase?"**

Then note explicitly what to reuse vs. what's new:

```
Closest existing pattern: setupControls() slider wiring
Reuse: get element by ID, set initial value, add input listener, update settings, call side-effect
New:   requestAnimationFrame analysis loop, canvas overlay rendering
```

KEYWAVE has established patterns for:

- **Control wiring** — `setupControls()` wires every slider, select, and toggle the same way
- **Audio playback** — `playNote()` / `playNoteImmediate()` with velocity, decay, sustained options
- **Settings management** — mutable `settings` object, updated by UI controls, read by audio engine
- **Effects modulation** — `updateEffects()` smoothly ramps parameters via `setTargetAtTime`
- **CSS variables** — `var(--bg-tertiary)`, `var(--accent-cyan)`, etc. for theming
- **Card layout** — `.control-panel.compact` for grouped controls

Don't reinvent these. Extend them.

---

## Pre-Flight Checklist

Before starting Phase 1 of any plan, verify these preconditions:

- [ ] Git working tree is clean (or checkpoint commit created)
- [ ] Dev server is **stopped**
- [ ] No pre-existing lint/build errors that would mask new ones
- [ ] You've read the **actual current code** of files you'll modify, not just the plan's description
- [ ] Browser supports target APIs (e.g. `getUserMedia` for webcam features)
- [ ] Required hardware is available on the dev machine (e.g. webcam, microphone)

---

## Git Checkpoint Strategy

Define explicit commit points in the plan. Each phase should be a safe rollback point:

```
Phase 1 (UI shell + lifecycle) → COMMIT "feat: webcam UI shell and camera lifecycle"
Phase 2 (analysis engine)      → COMMIT "feat: frame differencing and motion analysis loop"
Phase 3 (note triggering)      → COMMIT "feat: playable note grid with motion triggering"
Phase 4 (expression controls)  → COMMIT "feat: control strip with sustain and swell lanes"
```

If Phase 3 breaks everything, you can roll back to the Phase 2 commit and retry.

> **Note:** Follow the user's Git Checkpoint Rule — ask before creating commits if the change is multi-file.

---

## Known Landmines

Every plan must include a "Landmines" section listing codebase-specific gotchas. Common ones for KEYWAVE:

| Landmine | What Happens If You Ignore It |
|----------|-------------------------------|
| **`getUserMedia` requires HTTPS** in production (localhost and GitHub Pages are fine) | Webcam silently unavailable on HTTP deployments |
| **`requestAnimationFrame` pauses** in background tabs | If you use `setInterval` instead, it wastes CPU in background |
| **`getImageData()` is slow** on high-res canvases | Always use a low-res analysis canvas, never full video resolution |
| **Browser autoplay policy** — AudioContext must init on user gesture | No sound plays until user clicks something |
| **CSS variables** — use `var(--bg-primary)` etc., never hardcoded colors | Component looks wrong on the dark theme |
| **`MAX_VOICES` polyphony cap** — currently 6 | New features that trigger multiple notes can feel broken if voices evict too aggressively |
| **`settings` is flat** — new features may namespace with nested objects | Inconsistency between flat existing keys and nested new keys |
| **Canvas text in CSS-mirrored elements** renders backwards | Must counter-flip text with `ctx.scale(-1, 1)` |

Include in your plan only the landmines relevant to that specific feature.

---

## Open Questions & Out of Scope

### Open Questions

Surface things the plan genuinely can't answer alone. These need user input before implementation starts. Include the impact of each decision:

```
Open Questions:
1. Should webcam and keyboard modes be simultaneous or exclusive?
   (Affects: input gating, polyphony budget, UI complexity)
2. Should the control strip width be fixed or adjustable?
   (Affects: UI controls, grid geometry computation)
```

**Do not start implementing if there are unresolved open questions that affect the architecture.** Get answers first.

### Out of Scope

Explicitly state what the plan does NOT do. This prevents scope creep during execution. If during implementation you realize something out-of-scope is actually needed, **stop and discuss** — don't silently expand scope.

---

## Required Plan Structure

Every plan MUST include ALL of the following sections:

| # | Section | Purpose |
|---|---------|---------|
| 1 | **Current State** | What exists today — cite specific files and line ranges |
| 2 | **Future State** | What the system looks like after — target UX, architecture, data shapes |
| 3 | **Architecture** | Mermaid diagram for 3+ component features, data flow |
| 4 | **Naming Dictionary** | Lock names for every layer (settings, DOM, CSS, functions, state) |
| 5 | **Existing Pattern Audit** | Closest existing pattern, what to reuse vs. what's new |
| 6 | **Data Model** | JS object shapes, settings keys, example data |
| 7 | **Wiring Checklist** | Every file that must know about each new entity |
| 8 | **Implementation Phases** | Ordered phases with: files, code, gray areas, wire traces, checkpoint |
| 9 | **Interface Contracts** | Function signatures, data shapes, return types |
| 10 | **Edge Cases & Error Handling** | Empty data, permission denied, concurrent states, error UI |
| 11 | **Landmines** | Codebase-specific gotchas this plan will encounter |
| 12 | **Testing & Verification** | Per-phase checkpoints + "click every button" + end-to-end |
| 13 | **Git Checkpoint Strategy** | Commit points between phases |
| 14 | **Open Questions** | Decisions the user needs to make before implementation |
| 15 | **Out of Scope** | What this plan explicitly does NOT do |
| 16 | **Documentation Updates** | Which docs change and what to add |

### Phase Requirements

Each implementation phase MUST include:
- **Files touched** — exact paths
- **What changes** — specific additions/modifications with code snippets
- **Gray area scripts** — connecting logic between this phase and the next
- **Interactive element audit** — every button/link/dropdown with full wire trace
- **Verification checkpoint** — how to confirm this phase works before moving on

Phases must be ordered so each one produces a testable increment. Never leave the system in a broken state between phases.

---

## Plan Quality Checklist

Before presenting a plan, verify ALL of these:

### Completeness
- [ ] Could someone execute this plan with zero prior context?
- [ ] Are all gray areas between phases scripted with real code?
- [ ] Are all data shapes defined with exact field names and types?
- [ ] Is every file path explicit (no "create a file for X")?

### Wiring & Registration
- [ ] Is there a wiring checklist for every new entity type?
- [ ] Is there a naming dictionary locking names across all layers?
- [ ] Has the closest existing pattern been identified for reuse?

### Functional Completeness
- [ ] Does every button/link/toggle/dropdown/slider have a full wire trace (action → result)?
- [ ] Does every interactive element specify: event, handler, effect, success state, failure state?
- [ ] Are there no scaffold-only phases (UI rendered but not connected)?
- [ ] Does the "click every button" test pass for every phase with UI?

### Safety
- [ ] Are all edge cases addressed (empty states, errors, permissions)?
- [ ] Are known codebase landmines called out?
- [ ] Are git checkpoint commits defined between phases?
- [ ] Is every phase independently verifiable?
- [ ] Are there no hand-waves like "handle errors appropriately" or "add necessary types"?

### Scope
- [ ] Are open questions surfaced for user decision?
- [ ] Are out-of-scope items explicitly defined?
- [ ] Does the plan account for the current codebase state (not an idealized version)?

---

## Anti-Patterns — Never Do These

| Anti-Pattern | Why It's Bad | What to Do Instead |
|---|---|---|
| "Add appropriate error handling" | Every implementer interprets this differently | Write the exact try/catch, error message, and UI state |
| "Create a function for X" | No signature, no data flow, no return type | Define exact parameters, return shape, and caller |
| "Update the settings object" | No key name, no type, no default | Write the exact key, value type, and default |
| "Wire it up to the audio engine" | No node connections, no parameter values | Write the exact Web Audio API node chain and parameter ramps |
| Rendered button with no event listener | Looks like a bug to the user, not a missing feature | Specify the full wire: click → handler → effect → UI update |
| "Will wire up in a later phase" | Later phase forgets or connects it wrong | Every phase must leave every rendered element functional |
| Scaffold-first, connect-later | Creates dead UI that gets shipped | Connect first (event → handler → effect), then style |
| Phases that can't be tested independently | Broken intermediate states cause cascading bugs | Each phase must leave the system in a working state |
| Missing the "what if empty?" question | Empty states are the #1 missed edge case | Every list, panel, and data source needs an explicit empty state |
| Inconsistent names between phases | `gridCells` in Phase 2, `cellArray` in Phase 5 | Lock names in the naming dictionary before starting |
| Forgetting a registration file | Control exists in HTML but has no event listener in JS | Use the wiring checklist — enumerate every file that must know about the new thing |
