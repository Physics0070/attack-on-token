# SPEC — shared contract (keep compact; every agent reads this once)

**Product**: a profile page for **ARLO PEMBERTON-VEX** — "Chief Visionary Synergy Architect™ (self-appointed)", founder of **Vexxity Labs** (1 employee: Arlo; 47 open tabs; 1 Notion page; Mom is "Head of Investor Relations"). Looks like an award-winning cinematic WebGL portfolio. Slowly becomes an unhinged internet experience that turns on both Arlo AND the visitor.
**Stack**: Vite + React 19 + TS + three + @react-three/fiber + zustand + gsap. No other deps. No external assets/URLs. All audio procedural (WebAudio) + browser `speechSynthesis`.

## Art direction ("Obsidian Reliquary")
Palette: ink `#0b0907`, ink2 `#14110e`, bone `#ece4d2`, bone2 `#a79f8b`, **vermilion `#ff4b1f`** (danger/action), **brass `#d4a84a`** (glory/achievement), **acid `#cfff2e`** (system chaos). NO blue/purple/cyan glow, NO gradient borders, NO glassmorphism cards-with-glow. Type: `--display` Instrument Serif (big, italic accents), `--mono` JetBrains Mono (labels/UI). Hairline 1px borders, 0 radius, corner ticks (`.panel`). Luxury restraint first → contrast with parody (Win98 `.win` dialogs, brainrot slang) later. All CSS tokens + shared classes (`.panel .btn .btn.hot .btn.ghost .label .h-display .h-mid .lead .dim .hot .brass .acid .win .win-title .win-x .win-body .win-btn .win-icon .stamp .claim`) live in `src/styles.css` — READ IT, reuse, don't redefine. Mechanic-specific CSS goes in `src/mechanics/<Name>.css` imported by the component, class names prefixed with the mechanic (`.infl-…`).

## Voice / humor rules
Deadpan, mock-serious, specific (numbers, odd details, corporate nouns). Escalating; callbacks to earlier mechanics. Brainrot slang (aura, cooked, NPC, ratio, mid, rizz, L, "it's over") sparingly & with timing, never every line. Funniest = setup → reaction → payoff. No real brands/people/trademarks, no slurs, nothing sexual/hateful. Self-aware: Arlo, the site, and the visitor are all targets (visitor-roasting must be playful).

## State API — `import { useStore, fx, scrollState } from '../state/store'` (READ `src/state/store.ts`)
Stats: `delusion` (0–100), `aura` (int, can be negative), `suspicion` (0–100), `ego` (0–100). `bump(stat, delta)`, `setFlag/incFlag`, `note(line)` (push a past-tense human log line like "Rejected Arlo's claim of speaking 17 languages" — used later by Consequences/Final), `unlock(id,title,desc)` (achievement toast). `fx.toast/meme/subtitle/shake/flash/glitch`. Use selectors: `useStore(s=>s.delusion)`. Every mechanic MUST: change ≥1 stat, call `note()` on meaningful outcomes, set the flags below, and trigger audio+fx at key beats. Re-entering after `reset()` must work (read state from store, not stale module vars; mechanic local state may be `useState`, but key the mechanic on `resetKey` — the parent remounts it).

**Canonical flags** (set exactly these): `inflation.peak` (0–5 tier reached), `inflation.burst` (bool), `tribunal.convicted` (n), `tribunal.acquitted` (n), `tribunal.demos` (n), `captcha.score` (0–100 humanness), `captcha.failed` (n), `tabs.closed` (n), `tabs.escaped` (bool), `slot.pulls` (n), `slot.jackpot` (bool), `phone.calls` (n), `aura.scan` (label string), `jobs.applied` (bool), `salary.rounds` (n). Also owned by others: `gaslit`(n), `boss.hits`, `eggs`, `konami`. `salaryOutcome` ('walked'|'paid'|'employed') is set by Salary via `useStore.getState().set({salaryOutcome})`.

## Audio API — `import { audio } from '../audio/engine'` (procedural; owner: audio agent)
```ts
audio.init(): void                       // call inside a user gesture; idempotent; also sets store.audio.enabled=true
audio.sfx(name: SfxName, o?: {vol?:number; pitch?:number; level?:number}): void  // no-op if not enabled/muted
audio.music.play(track: 'ambient'|'dramatic'|'fever'|'boss'|'final'|'none', o?:{fade?:number}): void
audio.music.cut(): void                  // instant hard silence of music+ambient (comedic cut-off). audio.music.resume() brings ambient back.
audio.music.swell(sec?: number): void    // orchestral riser into a hit
audio.say(text: string, o?: {voice?: 'ai'|'announcer'|'corporate'|'arlo'|'mom'|'recruiter'|'robot'; rate?:number; pitch?:number; sub?: boolean|string}): Promise<void> // speechSynthesis; shows fx.subtitle(text, who) unless sub===false; resolves when done (or estimated time if TTS unavailable/muted)
audio.setChapter(n: number): void        // retunes ambient drone per chapter 0..6
audio.setIntensity(v: number): void      // 0..1 chaos → ambient filter/detune/noise
audio.level(): number                    // 0..1 smoothed master RMS (visual reactivity)
audio.stopVoice(): void
type SfxName = 'click'|'hover'|'tick'|'boom'|'orchestra'|'fanfare'|'error'|'ding'|'scratch'|'glitch'|'coin'|'achievement'|'sadTrombone'|'airhorn'|'whoosh'|'laser'|'hit'|'crit'|'heal'|'pop'|'shutter'|'inflate'|'deflate'|'cashRegister'|'drumroll'|'cymbal'|'rimshot'|'applause'|'ring'|'hangup'|'voicemail'|'bell'|'stinger'|'dtmf'|'slot'|'jackpot'|'notify'|'deny'|'success'|'thud'|'riser'|'cut'|'zap'|'dialup'
// dtmf: pass o.level = digit index 0-9 (10='*', 11='#'). inflate: o.level 0..1 raises pitch. 'boom' = vine-boom style. 'error' = original two-tone Windows-style error ding. 'scratch' = record scratch. 'sadTrombone' = wah wah wah waaah.
```
Never auto-play before `audio.init()`. Site must be great muted → always pair sound with visual/subtitle.

## Component contract for mechanics
`export default function Name(): JSX.Element` in `src/mechanics/Name.tsx`; no props; renders its own `.panel` (or `.win`) block (~max-width 1000px), has a `.label` header like `MECHANIC 03 · SKILL TRIBUNAL`, own heading (`.h-mid`), clear instructions, a visible result state, and (where relevant) "again/replay" affordance. Must work with mouse AND touch, keyboard-focusable controls, `aria-live` for results, respect `prefers-reduced-motion` (CSS `@media`), layout OK at 360px width. Sections are inside a `.scroller` with `pointer-events:none`; interactive elements are re-enabled for `.panel .win button input a select textarea` (use those, or add `className="interactive"`).

## Files & owners
`src/state/*, src/scene/*, src/ui/*, src/chapters/*, App.tsx, main.tsx, styles.css` → lead. `src/audio/engine.ts` → audio agent. `src/content/copy.ts` → copy agent. `src/mechanics/<Name>.tsx|css` → assigned mechanic agents (only edit your own files).
