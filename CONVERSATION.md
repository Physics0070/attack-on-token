# How we built this (the short version)

A quick, honest retelling of the conversation between me (Soham) and Claude Code that produced *Attack on Token*.

## The ask
I wanted a profile page for the hackathon that looks like an award-winning 3D portfolio from the future and then slowly turns into a chaotic, insulting, can't-stop-clicking internet experience. Real WebGL, scroll-driven camera, lots of original ragebait mechanics, memes and funny sound, a story that remembers what you did, and a proper ending. The judges score features and UI (15%), prompt architecture and efficiency (35%), chaos (30%) and agent autonomy (20%), so I asked Claude to be efficient and to use sub-agents sensibly. I also told it not to claim anything worked unless it had actually checked.

## What Claude did
- Looked at the empty repo and the installed skills first. There was no SCALE or model-routing config, so it said so instead of inventing one.
- Picked an art direction (obsidian, bone and vermilion, no neon blue) and wrote one short shared spec so every agent worked from the same rules.
- Invented the character: Arlo Pemberton-Vex, founder of a one-person company with 47 open tabs.
- Split the work across five parallel sub-agents: audio, comedy writing, and three batches of mechanics. It built the 3D world, the boss fight and the endings itself.
- Ran the site, played through it, and fixed what broke (a boss-fight bug, a mobile layout overlap).

## Then I steered
- **"Make it fast, taking too long."** It stopped polishing and shipped the essentials.
- **"Have you skipped anything?"** It admitted what it hadn't tested (most mechanics, audio, mobile) and what it had left out of my brief.
- **"Complete it ASAP."** It tested the boss fight end to end, fixed a bug that ended it instantly, and checked the ending and reset.
- **"Only 2 pages allowed."** I picked "2 website screens", so the site is now Page 1 (Arrival, Legend, Interrogation) and Page 2 (Fever Dream, Boss, Consequences, Final Form).
- **"Use the ragebait from this zip."** I gave it another portfolio's chaos engine and told it to take only the features. It ported them into a separate module without touching the rest.
- **"That's funny, not ragebaiting. Make it more annoying."** It added events that actually fight you: clicks that don't register, reversed scroll, fake "connection lost", an ad popup whose close button runs away, and more. They all expire and can be switched off.
- **"Make it final, put it on GitHub, deploy it, and give me a README."** Done. Repo, Vercel deployment and a full feature README.

## Where things stand
- Live site: https://attack-on-token.vercel.app
- Repo: https://github.com/Physics0070/attack-on-token
- Full feature list: see [README.md](README.md)
- Honest gaps: I haven't listened to the audio, haven't played every mechanic by hand, and haven't recorded the demo video yet.
