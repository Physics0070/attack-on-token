# How we built this (the short version)

A quick, honest retelling of the conversation between me (Soham) and Claude Code that produced *Attack on Token*.

## The ask
I came in with one big message and a simple goal: build something for the hackathon that nobody else would build. It's a profile page, but I didn't want a normal portfolio with a few animations and funny buttons. I wanted it to look like an extremely expensive experimental site from the future, with real cinematic 3D, and then slowly fall apart into an unhinged internet experience that makes people laugh, get annoyed, and keep clicking just to see what happens next. Claude had full freedom over the character, the story and the jokes. I told it not to play safe, and to come up with things I wouldn't have thought of myself.

The 3D part had to be real. Scrolling should move the camera, change the lighting, switch the scenes and drive the story, so it feels like walking through a world instead of scrolling past cards. I asked for a proper art direction first (a palette, type, materials and lighting that actually belong together) instead of random neon, gradients and glowing borders pretending to be futuristic. The first few seconds had to look impressive, and then start breaking expectations.

For the chaos, I asked Claude to brainstorm at least 25 original ragebait ideas on its own, pick 10 to 14 solid mechanics, and hide smaller secrets and easter eggs around them. I gave it a list of starting points (a confidence tribunal, a gaslighting button, an ego boss fight, a salary negotiation that goes wrong, a corporate apology generator, and so on) but told it not to just copy them or build fourteen versions of a roast generator. Every mechanic had to do something: you interact, the system reacts, the state changes, and something comes back later. Memes, funny sound effects, dramatic music cutting out at the worst moment, fake system errors and a real sound system with volume and mute were all part of it, as long as everything was original or properly licensed and nothing played before the visitor clicked.

I also wanted it to remember what you did, change the ending based on your choices, and let you reset and try another path. It had to work on mobile, respect reduced motion, and not fall over if WebGL wasn't available.

Finally, I told Claude how to work. The judges score features and UI (15%), prompt architecture and efficiency (35%), chaos (30%) and agent autonomy (20%), so it should inspect the project and the installed skills first, use sub-agents only where they genuinely help, keep one short shared spec instead of huge planning documents, and build a working slice before anything else. It had to test the real site in a browser, fix what was broken, and never claim something worked unless it had actually checked. The README, the submission prep and the screen recording were to come last.

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
