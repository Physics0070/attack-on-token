# Attack on Token — ARLO PEMBERTON-VEX, Verified Legend™

**Live:** https://attack-on-token.vercel.app · **Repo:** https://github.com/Physics0070/attack-on-token · **Build conversation:** [CONVERSATION.md](CONVERSATION.md)

A cinematic WebGL profile page that slowly loses its mind. It opens like an award-winning portfolio from the future, then turns on Arlo, the visitor, and eventually itself.

**Stack:** Vite · React 19 · TypeScript · three.js / React Three Fiber · zustand · GSAP. No API keys, no external assets, no network calls at runtime. Audio is generated in the browser (WebAudio + the built-in speech synthesis).

## Run locally (optional — the live link above needs nothing)
```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # typecheck + production build -> dist/
npm run preview
```

## The site: exactly 2 pages
- **Page 1** — The Arrival · The Legend · The Interrogation (ends with a "Continue to page 2" button)
- **Page 2** — The Corporate Fever Dream · The Ego (boss fight) · The Consequences · The Final Form

Scroll drives the 3D camera, lighting, palette and a global glitch level. Session state (Delusion, Suspicion, Aura, decision log, flags) carries across pages and decides the ending (7 endings). Reset restarts the timeline. No sound ever autoplays; everything works muted.

---

# Chaos & ragebait features (complete list)

## A. Story mechanics (the designed ragebait)
| # | Mechanic | What it does to you |
|---|----------|--------------------|
| 1 | **Gaslight gate** | "Enter" doesn't enter. It tells you that you already entered, then that you've entered twice, before letting you in on the third click. |
| 2 | **Achievement Inflation Machine** | Hold to pump a mundane achievement through 5 absurd tiers. Hold too long and it bursts (music cuts, sad trombone, a fake Win98 error). |
| 3 | **Unemployment Cinematic Universe** | Six fake movie posters; each plays a voice-over trailer that ends in a record scratch, dead silence, then a bathos title card. |
| 4 | **Skill Tribunal** | Convict, acquit or demand a live demo of 6 skill claims. Demos fail differently each time. One claim is true, so convicting it is a miscarriage. Sentencing can find *you* guilty of wasting time. |
| 5 | **CAPTCHA of Self-Awareness** | Starts normal, then asks you to select tiles containing your ego, answer "are you a robot", hold a button "with feeling", and prove you are not Arlo. Failing never ends it. |
| 6 | **Professional Aura Scanner** | Hold and move to paint an aura; the verdict depends on how you moved and everything you did earlier. Each rescan is less impressed. |
| 7 | **Reference Check Hotline** | A dial pad with real DTMF tones, answering-machine voicemails with callbacks to your earlier decisions, hidden numbers (911, operator, awful hold music). |
| 8 | **Tab Hydra** | Close a tab, two more appear. The only way out is the tab called "Work (1)". |
| 9 | **Thought Leadership Engine** | A slot machine for LinkedIn-style posts. The lever sometimes jams and insists you never pulled it. Mom always comments first. |
| 10 | **Salary Negotiation** | A handle that dodges and resists, then reverses: Arlo asks *you* for a signing bonus. Walk away, pay, or accept and become Employee #1 (unpaid). Secret: negotiate exactly $1,000,000. |
| 11 | **Recruiter Rage** | A job post for a "junior" role with 12+ years experience. You can't untick requirements, the match score recomputes unfairly, apply progress grows to 140 steps, then a 0.3s auto-rejection. |
| 12 | **Ego Boss Fight (3D)** | Attacking feeds the boss. At the worst moment the music cuts out and it heals. The only way to win is to stop clicking. Feed it to 100% and it collapses into a black hole. |
| 13 | **Corporate Apology Engine** | Generates a polished non-apology about whatever you actually did. |
| 14 | **Reverse Portfolio** | The more Arlo proves himself, the more suspicious the site gets: `[citation needed]`, then strike-through, then full redaction of his claims. |
| 15 | **Final Form** | Seven endings computed from your session, each with a different 3D form. |

Also: Win98 fake-error popups that spawn while you're in the fever dream (the Cancel button runs away), achievement toasts, meme stickers, voice-over announcements, record scratches, vine-boom style hits.

## B. Hidden interactions
- Konami code → god mode · type `hireme` · type `fry` (deep-fried mode) · click the logo 7 times
- Right-click, copy, tab-away, idle, fast scroll and mouse-shake each trigger their own reaction
- Backtick opens a hidden terminal (see below)

## C. Chaos engine (`src/chaos/`) — the part that actively fights you
A behaviour tracker watches rage-clicks, fast typing, fast scrolling, idling and hovering. A scheduler fires a weighted random event every 15–30 seconds (faster if you rage-click), and some behaviours trigger an immediate reaction. All events expire on their own.

**Annoying, on purpose**
- **Click latency** — for 6 seconds every first click on a button is "not registered"
- **Reversed scroll** — scroll direction flips for 3.5s
- **Slow-motion / ludicrous-speed scroll**, scroll overshoot, tiny random reverse scrolls, **scroll position "restored"** 500px up
- **Connection lost** overlay ("attempt 1 of ∞")
- **"Are you still there?"** 5-second countdown that logs you out of nothing
- **Fake ad popup** ("You are visitor 1,000,000") whose close button runs away three times
- **Orientation lock lost** (page flips 180°), **auto-zoom for accessibility**, **font licence expired** (Comic Sans), **text selection banned**
- Fake permission prompts: location, microphone, camera, cookies (both buttons say "Accept all", the box follows your cursor), session expired, browser too modern, captcha, AI assistant offering to scroll "but worse"
- **Popups that shrink out of shame or grow until you notice**, and "One more thing…" follow-ups
- **Buttons**: swap places, clone themselves, disable for a second, stretch, blink, shrink, shiver ("Please don't"), randomly jump 5px every 3 seconds
- **Big decision buttons** dodge once, ask "Are you sure?" / "Really sure?", demand a double-click, or spin for 1.2 seconds before working
- **Inputs**: placeholders that leave when you focus ("Too slow. It left."), moving placeholders, enchanted emoji typing, 800ms delayed backspace, "Deleting is a privilege", caret jumps back every 7 characters, "Slow down, champ"
- **Audio**: volume sliders lag 350ms then overshoot
- **Cursor**: lagging trail, random emoji/giant/vanishing cursor, hammer, sword, hourglass, upside-down, spinning, tiny, rainbow, ghost cursors, googly eyes that watch you
- **Scroll UI**: a progress bar that lies, fake breadcrumbs ("Home / Cart"), nav that vanishes the moment you scroll up, a back-to-top button that runs away
- **System notifications**: fake screenshot, download, upload, RAM, antivirus, "saving…/undo is fake", battery at 1%, WiFi drop, "working on updates" blue screen, resize complaints

**Visual modes and critters**
- Windows XP mode, CRT mode, disco, Matrix rain, bouncing DVD logo, fake boot log, "opening something unrelated", seasonal confetti
- A duck that walks across the bottom of the screen, a cat to pet, a bug to squash (5 clicks, confetti)

**Kill switches (the original's rules)**
- Type `please` — trolling pauses for 15 seconds
- Triple-click the logo — normal mode
- **Zen / Potato / Chaos** switch bottom-left (Potato = degraded graphics)
- Chaos never fires during the boss fight, trailers, or the entry gate, and heavy effects respect `prefers-reduced-motion`

**Hidden terminal** (press backtick): `help` `whoami` `stats` `ai <msg>` `sudo` `chaos` `normal` `matrix` `bsod` `exit`

## D. Sound
Procedural WebAudio: vine-boom style hits, original Windows-style error tones, record scratch, sad trombone, airhorn, orchestral hits, DTMF dial tones, phone ring, slot reels, jackpots, ambient/boss/fever/final music, and a hard "music cut" for comic timing. Voice uses the browser's speech synthesis with several characters. Mixer with master/music/sfx/voice/ambient sliders and mute (the sliders lag on purpose, see above).

## E. Accessibility & performance
Reduced-motion fallbacks, keyboard-operable controls, `aria-live` results, a no-WebGL fallback, mobile HUD, adaptive pixel ratio when frames drop.

## Layout
- `src/scene/` — WebGL world: shaders, camera rig, zones, post-processing
- `src/mechanics/` — one component per mechanic · `src/chapters/` — page sections
- `src/chaos/` — ragebait engine · `src/audio/` — procedural audio · `src/state/` — store
- `SPEC.md` — compact shared contract used to parallelise the build across sub-agents
