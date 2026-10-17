// Pure typed copy. No imports. Voice: deadpan, specific, escalating, self-referential.
// Recurring motifs: 47 tabs, Mom (Head of Investor Relations), 3 YouTube tutorials, one Notion page,
// the sandwich, Vexxity Labs, self-awarded Employee of the Month, aura points, the parking-ticket post.

export type Accent = 'verm' | 'brass' | 'acid' | 'bone'

/* 1 ─────────────────────────────── ARLO */
export const ARLO = {
  name: 'ARLO PEMBERTON-VEX',
  title: 'Chief Visionary Synergy Architect™',
  titleHonest: 'Guy With 47 Tabs Open (Self-Appointed, Self-Reviewed, Self-Employed in the Legal Sense Only)',
  company: 'Vexxity Labs',
  tagline: 'Disrupting disruption since the sandwich incident.',
  bio: [
    "Few names carry the weight of Arlo Pemberton-Vex. Fewer still carry the hyphen. As founder of Vexxity Labs, Arlo operates at the intersection of vision, synergy, and what he calls 'pre-everything, post-sleep.'",
    "A serial ideator and thought-leader-adjacent futurist, he has mentored dozens (a mentee is anyone who has stood near him at a networking event), keynoted globally (the kitchen), and completed an Executive Mastery Program in Quantum Blockchain Leadership (3 YouTube tutorials, 2x speed).",
    "Vexxity Labs is a lean, agile, borderless organization: one founder, forty-seven open tabs, a single Notion page, and a Head of Investor Relations who has pledged forty dollars and asks every Sunday what a 'runway' is.",
    "Arlo is currently between opportunities, a state he calls 'stealth mode' and his landlord calls 'March.' He is open to collaborations, mentorship, and anyone who can explain what the Notion page is for.",
  ],
}

/* 2 ─────────────────────────────── LEGEND */
export const LEGEND_STATS: { label: string; value: string; note: string }[] = [
  { label: 'Languages spoken', value: '17', note: 'Includes English, Google Translate, and confident pointing.' },
  { label: 'Browser tabs managed', value: '47', note: 'Zero are work. One is a video nobody can locate.' },
  { label: 'Projected valuation', value: '$4.2M', note: 'Projected by Arlo, in the shower, on a Tuesday. Mom has pledged $40.' },
  { label: 'Masterclasses mastered', value: '3', note: 'All at 2x speed. Two were about something else entirely.' },
  { label: 'Aura points', value: '9,000+', note: 'Self-reported. Independent audit declined; auditor was not aligned.' },
  { label: 'Employee of the Month awards', value: '11', note: 'Nominated by Arlo. Voted by Arlo. Presented in the hallway mirror.' },
]

/* 3 ─────────────────────────────── ACHIEVEMENTS */
export const ACHIEVEMENTS: { year: string; title: string; real: string }[] = [
  { year: '2019', title: 'Disrupted the Regional Sandwich Ecosystem', real: 'Asked for no pickle. Staff remember. Staff still bring it up.' },
  { year: '2020', title: 'Founded Vexxity Labs (Pre-Seed, Pre-Product, Pre-Plan)', real: 'Bought a domain. It renews in four days. Nobody is ready.' },
  { year: '2021', title: 'Completed Executive Mastery in Quantum Blockchain Leadership', real: 'Three YouTube tutorials at 2x speed. Fell asleep during the second one.' },
  { year: '2022', title: 'Secured Strategic Funding from a Visionary Early Backer', real: "Mom sent $40 and asked if 'seed' meant gardening." },
  { year: '2023', title: 'Keynote Speaker, Global Thought Summit', real: 'Eleven minutes at a family barbecue. Uncle Dennis clapped once, ironically.' },
  { year: '2023', title: 'Named Employee of the Month, Vexxity Labs', real: 'Awarded by Arlo, to Arlo, for the fourth consecutive month.' },
  { year: '2024', title: 'Viral LinkedIn Thought Leader (14 Impressions)', real: 'A parking ticket post. Eleven impressions were Arlo, refreshing.' },
  { year: '2025', title: 'Pivoted Vexxity Labs to AI-Native Everything', real: 'Renamed the one Notion page. Added a sparkle emoji. Called it a platform.' },
]

/* 4 ─────────────────────────────── FRANCHISE (Unemployment Cinematic Universe) */
export const FRANCHISE: {
  title: string
  phase: string
  year: string
  tagline: string
  rating: string
  trailer: string[]
  accent: Accent
}[] = [
  {
    title: 'REJECTED: GENESIS',
    phase: 'PHASE ONE',
    year: '2019',
    tagline: 'Every legend begins with an autoreply.',
    rating: 'PG-13 · Parental Guidance, Pending Gratitude',
    accent: 'bone',
    trailer: [
      'In a world of 400 applications...',
      'One man dared to attach the wrong cover letter.',
      'The letter was addressed to a different company. The company was a bakery.',
      'He got the bakery interview. He did not get the bakery.',
    ],
  },
  {
    title: 'GHOSTED: SEEN AT 4:12 PM',
    phase: 'PHASE ONE',
    year: '2020',
    tagline: 'The reply was typing. The reply is still typing.',
    rating: 'R · Rated for Realistic Silence',
    accent: 'verm',
    trailer: [
      'In a world where "we will be in touch" is a threat...',
      'Three rounds. Two panels. One take-home assignment of unusual length.',
      'He gave them everything. They gave him a calendar invite, then a deleted calendar invite.',
      'Opening in theatres never, and in his inbox, also never.',
    ],
  },
  {
    title: 'THE OVERQUALIFIED',
    phase: 'PHASE TWO',
    year: '2021',
    tagline: 'He had the skills. They wanted a "culture fit."',
    rating: 'PG · Possibly Gaslit',
    accent: 'brass',
    trailer: [
      'In a world that demands ten years of experience in a four-year-old technology...',
      'One man holds three YouTube certificates and a dream.',
      "The hiring manager said he was 'a lot.' The hiring manager was correct.",
      'This summer: he is still a lot.',
    ],
  },
  {
    title: 'REPLY ALL: THE RECKONING',
    phase: 'PHASE THREE',
    year: '2022',
    tagline: 'Four hundred inboxes. One mistake. No survivors.',
    rating: 'R · Rated Reply-All',
    accent: 'acid',
    trailer: [
      'In a world of mass emails...',
      "One man tried to politely decline an offer, and hit the wrong button, and the wrong list.",
      'Eleven hundred strangers learned his salary expectations and his feelings about Brenda.',
      "Brenda has replied. Brenda has also replied all.",
    ],
  },
  {
    title: 'ENTRY-LEVEL (7 YEARS REQUIRED)',
    phase: 'PHASE FOUR',
    year: '2024',
    tagline: 'Begin at the bottom. Bring a decade.',
    rating: 'PG-13 · Paid in Exposure',
    accent: 'bone',
    trailer: [
      'In a world where the bottom rung has moved to the ceiling...',
      'One man will try to climb it with a LinkedIn post about a parking ticket.',
      'Along the way he will learn the true meaning of "unpaid trial week."',
      'It was week four. Nobody told him the trial was the job.',
    ],
  },
  {
    title: 'VEXXITY FOREVER: ENDGAME PENDING',
    phase: 'FINAL PHASE',
    year: 'SOON™',
    tagline: 'All 47 tabs. One destiny. Mom is in the credits.',
    rating: 'NR · Not Remotely Ready',
    accent: 'verm',
    trailer: [
      'In a world on the brink of an AI-native pivot...',
      'A founder. An empire. A Notion page with a title and nothing under it.',
      'Together they will face the greatest foe of all: a Tuesday.',
      'Head of Investor Relations has pledged another $40. Coming soon to a group chat near you.',
    ],
  },
]

/* 5 ─────────────────────────────── IDLE */
export const IDLE_LINES: string[] = [
  'Still there? No pressure. Arlo is just aware that you are not clicking.',
  'This site is not upset. It is simply noting the time.',
  'Forty-seven tabs open and you chose this one. Arlo is moved. Arlo is also confused.',
  'The silence is fine. We rehearsed it. It went better in rehearsal.',
  'A mouse is a small animal, and also a thing you were holding earlier.',
  "If you're thinking, take your time. If you're gone, Arlo asks only that you update the Notion page.",
  'Arlo has begun to narrate your stillness. It is going well. He is the hero.',
  'The parking ticket post has 15 impressions now. One of them is you, 40 seconds ago. Arlo noticed.',
  'We are not saying you are an NPC. We are saying the NPC has stopped moving and we are watching.',
  'The Notion page has sent flowers. It is not clear why. It is not clear how.',
  'Mom has asked if you are okay. She is the Head of Investor Relations and also, now, Head of Wellness.',
  'I have counted the pixels. I got to 4. There are two million. I am not going to continue.',
  'You have been gone long enough that the sandwich shop has changed its menu. They are still angry about the pickle.',
  'This message is not a message. It is the site, being a presence in the room. Hello.',
]

/* 6 ─────────────────────────────── EGGS */
export const EGG_LINES: Record<
  'konami' | 'hireme' | 'logo7' | 'rightclick' | 'copy' | 'tabaway' | 'tabback' | 'shake' | 'fried' | 'godmode' | 'reset' | 'mute' | 'scrollfast',
  string[]
> = {
  konami: [
    'Cheat code accepted. Arlo has been granted 30 lives and zero additional skills.',
    'Up up down down left right left right B A. Somewhere, a very old console feels seen.',
    'You found the secret. The secret is that there was no secret. Arlo is still thrilled.',
  ],
  hireme: [
    'Hiring Arlo is a decision. Typing it into a box is a hobby. We respect both.',
    'Application received. Status: Under Review by Arlo. Decision: Arlo is intrigued by Arlo.',
    'Your resume has been forwarded to Head of Investor Relations, who will not open it.',
  ],
  logo7: [
    'Seven clicks on a logo. You are either thorough or lonely. Arlo is both.',
    'Vexxity Labs thanks you for engaging with our brand 7 times. Our brand is a V.',
    'The logo has been clicked a lucky number of times. Nothing happens. That is the lucky part.',
  ],
  rightclick: [
    'Right-click is disabled. Not for security. Arlo just wants one thing in his life to be exclusive.',
    "Looking for 'Inspect'? Everyone inspects Arlo. Nobody likes what they find.",
    'You cannot save this image. It is proprietary. It is also a gradient.',
  ],
  copy: [
    'Copied. Please credit Arlo in the footnotes. And the footnotes. And the ones after.',
    'You copied that. Arlo has been informed. Arlo has opened a ticket. The ticket is also Arlo.',
    'Plagiarism is the sincerest form of LinkedIn.',
  ],
  tabaway: [
    "Oh, you left. That's fine. Arlo has 47 of those. He understands.",
    'Going to another tab. Bold. Arlo will wait. Arlo has always waited.',
    'Fine. Go. Look at the thing that is not this. See if it has a hyphen.',
  ],
  tabback: [
    'You came back. Arlo has already told three people. All three are Mom.',
    'Welcome back. Nothing happened here. A lot happened here. It was mostly Arlo.',
    'The other tab was mid, wasn\'t it. You don\'t have to say it.',
  ],
  shake: [
    'Please do not shake the founder.',
    'Whoa. Easy. That is a Chief Visionary Synergy Architect, not a snow globe.',
    'The hyphen came loose. Stand by.',
  ],
  fried: [
    'Brain: fried. Please insert another brain. Arlo has a spare. It is also fried.',
    'You are cooked. Not Arlo-cooked. Regular cooked. We are monitoring both.',
    'Aura levels have left the building and taken the building.',
  ],
  godmode: [
    'GOD MODE ENABLED. Nothing changes. You were already the main character, per the algorithm.',
    'Infinite health. Infinite ammo. Zero tabs closed. This is how Arlo lives.',
    'God mode is on. Please do not use it to unfollow Arlo.',
  ],
  reset: [
    'Everything has been reset, including Arlo. He remembers nothing. He is still hyphenated.',
    'Fresh start. A rare thing for a man with 47 tabs.',
    "Reset complete. The sandwich shop has not forgiven you either way.",
  ],
  mute: [
    'Muted. Arlo is now just a man in a room, which is where it began.',
    'Sound off. The vibes are unaffected. The vibes were never audible.',
    'You muted him. Mom is on mute too. This is a family reunion now.',
  ],
  scrollfast: [
    'Scrolling at that speed, you have missed three achievements and one legitimate warning.',
    'Slow down. Nobody scrolls this fast except people running from their own mistakes.',
    'You are scrolling like a recruiter. Skimming. Disappointed. Eventually ghosting.',
  ],
}

/* 7 ─────────────────────────────── BOSS */
export const BOSS_LINES: {
  intro: string[]
  hit: string[]
  phase2: string[]
  ignored: string[]
  fed: string[]
  blackhole: string[]
  cut: string
  hint: string[]
} = {
  intro: [
    'I AM THE EGO OF ARLO PEMBERTON-VEX. I HAVE A KEYNOTE AT 3.',
    'You have accessed the final protected layer: the Ego. It has a 9,000 aura rating and a very weak chin.',
    'Approach. Strike. Do your worst. He has read worse. He wrote worse.',
  ],
  hit: [
    'Ow. That is a hit. Arlo will call that engagement.',
    'You hit me! Excellent. More of this. Tag me in it.',
    'Another one! My numbers are up. My numbers are very, very up.',
    'Do you know what a hit is, to me? A like. I am being liked.',
    'Keep going. I am being platformed. I am a platform now.',
    'Each blow makes me stronger. I am not saying it is a metaphor. It is the actual mechanic.',
    'Oh, you are STILL hitting? Thank you for the content. I will repurpose it.',
    'I have a following. You are the following. Hello, following.',
    'Another click. I am gaining weight. I am gaining followers. I am gaining a podcast.',
    'You are feeding me. You know that, right? You are the algorithm and I am the meal.',
  ],
  phase2: [
    'PHASE TWO. I HAVE BEEN UPGRADED TO PREMIUM. THE UPGRADE WAS FREE. I HAVE NEVER PAID FOR ANYTHING.',
    'You thought it was over. That was me, taking a sip of water and rebranding.',
    'Behold my second form: the same, with a bigger font.',
  ],
  ignored: [
    'You stopped. That is... fine. Totally fine. I am not looking at you.',
    'It is quiet. I used to like quiet. Then I got a hype man.',
    'I was bigger a minute ago. I think. I do not remember. I remember how it felt.',
    'Mom is calling. I am letting it ring. I want you to know I am letting it ring.',
    'Somewhere, a man is practicing his handshake in a mirror. He is small. He is me.',
    'It is okay if you do not click. Nobody ever really did. Except for the parking-ticket post. That was a good one.',
    'I am getting smaller. You do not need to do anything. I am just noting it. For the record. In the Notion page.',
    'Honestly? This is the nicest anyone has been to me in years. Just... leaving me alone.',
    "I'm just a guy. With a lot of tabs. And one sandwich I regret.",
    'Fine. I am deflating. Please enjoy the sound. It is the sound of a Chief Visionary Synergy Architect.',
  ],
  fed: [
    'I AM THE SIZE OF A CONFERENCE ROOM. A NICE ONE. WITH A WHITEBOARD.',
    'Attention consumed. I now have the mass of a minor LinkedIn influencer.',
    'I am so full. I am so full of you. Please do not stop. Please stop. I do not know.',
    'Congratulations: you have made a monster. A very polite, very boring monster.',
  ],
  blackhole: [
    'I AM NOW A BLACK HOLE OF ATTENTION. NOTHING ESCAPES, INCLUDING YOUR SUNDAY.',
    'My gravity is impressive. It has taken your cursor. Your cursor says hi.',
    'Event horizon reached. Past this point, all content is about me, and so is the sandwich.',
  ],
  cut: 'And now, a word from the one man who truly believes in me...',
  hint: [
    'Hint: the boss gets bigger every time you hit it. Think about why.',
    'Hint: it feeds on attention. Violence is attention. Think harder.',
    "Hint: the way to win is to stop. Put the mouse down. Let him run out of audience. It is the kindest thing and also, mechanically, the only thing.",
  ],
}

/* 8 ─────────────────────────────── FEVER POPUPS */
export const FEVER_POPUPS: { title: string; body: string; ok: string; cancel: string }[] = [
  { title: 'Synergy.exe', body: 'Synergy.exe has stopped responding. It was never responding. Arlo calls this "heads-down time."', ok: 'Pivot', cancel: 'Ideate' },
  { title: 'Tab Manager', body: 'You have 47 open tabs. 46 of them are Arlo. The other one is a loan comparison site.', ok: 'Close Nothing', cancel: 'Close Everything' },
  { title: 'Aura Monitor', body: 'Aura levels are below recommended. Please insert a more convincing personality.', ok: 'Insert', cancel: 'Manifest' },
  { title: 'Windows of Opportunity', body: 'A window of opportunity has opened. It is a window. It has been open since 2019. There is a draft.', ok: 'Close Window', cancel: 'Climb Through' },
  { title: 'LinkedIn Post Drafts', body: "You have 112 unposted thoughts about a parking ticket. Posting all of them would constitute a series.", ok: 'Post Series', cancel: 'Delete Soul' },
  { title: 'Employee of the Month', body: 'Congratulations, Arlo. You have been named Employee of the Month by yourself. A trophy has been printed from a free template.', ok: 'Accept Gracefully', cancel: 'Accept Loudly' },
  { title: 'Head of Investor Relations', body: "Mom is calling. She wants to know if the investment was a loan. The investment was $40. It was a loan.", ok: 'Answer', cancel: 'Let It Ring' },
  { title: 'Notion', body: 'Notion page "Vexxity Labs Master Plan" has been viewed by 1 person. The person is the author. The page is the title.', ok: 'Add Content', cancel: 'Add Emoji' },
  { title: 'Disruption Alert', body: 'The sandwich shop has issued a restraining order. The restraining order has been disrupted.', ok: 'Comply', cancel: 'Innovate' },
  { title: 'Fatal Exception 0xDEAD: PICKLE', body: 'A fatal exception has occurred at 0x0000PICKLE. The application will terminate. The pickle will remain.', ok: 'Mourn', cancel: 'Ignore' },
  { title: 'Cloud Storage', body: 'Your cloud is full. It contains 41,000 screenshots of other people\'s LinkedIn posts, captioned "this but better."', ok: 'Upgrade', cancel: 'Delete Evidence' },
  { title: 'System Restore', body: 'Restoring to your last known stable point. That point was 2018. You had a job. You also had a haircut.', ok: 'Restore', cancel: 'Never Look Back' },
]

/* 9 ─────────────────────────────── APOLOGY ({thing}, {n}) */
export const APOLOGY = {
  openers: [
    'We are deeply committed to transparency, which is why we are writing this.',
    'First, let us say that we hear you, and we have heard you for {n} decisions now.',
    'Vexxity Labs is a values-driven organization, and our values have been at the scene of an incident.',
    'At the highest level, we want to acknowledge that mistakes were made.',
    'We take full responsibility, effective immediately, which we will distribute evenly.',
    'The leadership team (Arlo) has convened (the mirror) to address a matter of public concern.',
    'Moments ago, a number of stakeholders (Mom) raised questions regarding {thing}.',
  ],
  blames: [
    'Certain individuals, whose names we will not say but whose cursor we tracked, chose {thing}.',
    'It has come to light that {thing} was, in fact, a decision made by someone on this very page.',
    'A thorough review has found the root cause: {thing}, performed by a visitor with strong intentions and no supervision.',
    'We acknowledge that {thing} occurred. We would also like to note that we did not click it.',
    'Contributing factors included {thing}, ambient synergy, and the visitor.',
    'The incident, internally referred to as {thing}, was a collaborative effort. Most of the collaboration was yours.',
    'Despite our best efforts, the visitor elected {thing} and the rest followed like a chain of events.',
  ],
  fixes: [
    'Going forward, Arlo will pivot. In a direction. Specifically, sideways.',
    'We have hired a consultant (Arlo) to conduct a review of the consultants (Arlo).',
    "Effective immediately, we're implementing a {n}-step plan, most of the steps being a Notion page.",
    'A task force has been formed. The task force is Mom. She has been briefed.',
    'We will be introducing a culture of accountability, starting at the next all-hands (a Tuesday).',
    'Learnings have been learned, and they have been sent to the shared drive, which is also a Notion page.',
    'We have taken meaningful action: we closed 1 of 47 tabs. We will not say which. We are not ready.',
  ],
  closers: [
    'We remain committed to our mission, whatever it was.',
    'Thank you for your continued trust, which we would like to remind you is not refundable.',
    'This statement is final, unless Mom has notes.',
    'Please direct all questions to our Head of Investor Relations, who will not answer.',
    'Together, we will rise. Separately, we will also rise, but in different tabs.',
    'Sincerely, a Chief Visionary Synergy Architect who is genuinely sorry about the sandwich.',
    'This apology has been brought to you by Vexxity Labs. Disrupting accountability since 2019.',
  ],
}

/* 10 ─────────────────────────────── ENDINGS */
export const ENDINGS: Record<
  'humble' | 'blackhole' | 'employee' | 'npc' | 'grifter' | 'fraud' | 'chosen',
  { name: string; epithet: string; verdict: string; quote: string; voice: string }
> = {
  humble: {
    name: 'The Humble One',
    epithet: 'Quiet. Dangerous. Unfollowed by Arlo, for being too real.',
    verdict:
      'You did the one thing nobody does on the internet: you stopped. You let Arlo shrink until he was just a guy with some tabs and a regret about a pickle. It was the kindest and funniest thing anyone has done to him. Arlo will remember this, probably in a LinkedIn post, probably wrong.',
    quote: '"Honestly? Best day of my professional life, and I wasn\'t even a participant."',
    voice: 'The Humble One has entered the chat. Nobody noticed. That was the point.',
  },
  blackhole: {
    name: 'Attention Singularity',
    epithet: 'You fed him until the page collapsed. Truly, a committed bit.',
    verdict:
      'You gave Arlo every ounce of attention and then some, and he turned into a black hole that swallowed the Notion page, 46 tabs, and your afternoon. Physics has no comment. Vexxity Labs has issued a statement thanking you for your engagement. It has 14 impressions.',
    quote: '"I am become gravity, destroyer of Sundays."',
    voice: 'Event horizon reached. All content is now about him. Please check your calendar.',
  },
  employee: {
    name: 'Employee of the Month',
    epithet: 'Nominated by yourself. Voted by yourself. Framed in the hallway.',
    verdict:
      'You have caught the virus. You are now Employee of the Month at a company with one employee and one stolen idea. Congratulations on the plaque, which you printed, and the speech, which you gave, and the standing ovation, which was mostly your own chair creaking. You and Arlo have so much in common, which is a warning.',
    quote: '"I want to thank myself, for always being there. And Mom, for the $40."',
    voice: 'This month\'s Employee of the Month is: you. The committee is: you. The vote was 1 to 0.',
  },
  npc: {
    name: 'The Certified NPC',
    epithet: 'You did exactly what the page expected. Every time.',
    verdict:
      'You clicked every shiny thing, in order, at the speed the designer imagined. You followed the glowing path like it was an ad, and in a sense it was. Not an insult. Some of the best people are NPCs. They just do not usually get an ending titled that.',
    quote: '"I am a person with unique thoughts and also I clicked the big red button."',
    voice: 'Dialogue option selected. Dialogue option selected. Dialogue option selected. The visitor is in dialogue.',
  },
  grifter: {
    name: 'The Grifter',
    epithet: 'Arlo thinks you are a genius. Arlo thinks everything is a pitch.',
    verdict:
      'You sold things. You took payments. You monetized a moment that did not ask to be monetized. Arlo watches in awe and in fear, a protégé surpassing the master by taking his lunch money. Your aura is negative but your balance is positive, and the sandwich shop has put you on a list.',
    quote: '"It is not scamming if it\'s disruptive. It\'s not disruptive if you pay for the upgrade."',
    voice: 'Funds have moved. A handshake has occurred. Everyone in this scene should be worried.',
  },
  fraud: {
    name: 'Complicit in the Fraud',
    epithet: 'You believed him. You gaslit yourself. Mom is proud.',
    verdict:
      'You accepted claims about 17 languages, a $4.2M valuation, and a quantum credential from three YouTube videos. Not once, not twice, but every time, with a smile. You are now a stakeholder in Vexxity Labs, which means you are legally nothing and spiritually everything. Head of Investor Relations has added you to the group chat.',
    quote: '"I just thought, what if he is right? Also, what if he is not? Anyway, I invested $10."',
    voice: 'Stakeholder detected. Gullibility level: investor-grade. Welcome to the family.',
  },
  chosen: {
    name: 'The Chosen One',
    epithet: 'You did something so odd that the site gave up making a category.',
    verdict:
      'We checked your choices against every ending. We checked twice. We asked Mom. There is no box for you, which is extremely rare and slightly alarming. You are either a prodigy or someone who spent a lot of time on the Notion page. Either way, Arlo is bowing, and he never bows unless a camera is on.',
    quote: '"The prophecy foretold of one who would click unexpectedly. I assumed it was a typo."',
    voice: 'A new variable has entered the equation. The equation has stopped. Please stand by.',
  },
}

/* 11 ─────────────────────────────── POSTS (LinkedIn slot machine) */
export const POSTS: { mundane: string[]; lesson: string[]; tags: string[] } = {
  mundane: [
    'I got a parking ticket today.',
    'I microwaved leftover rice at 11 PM.',
    'My oat milk was out of date.',
    'I waved at a guy who was not waving at me.',
    'I forgot my password for the 14th time this week.',
    'I returned a lamp I never bought.',
    'The Wi-Fi went out for six minutes.',
    'I held a door for someone, and they did not say thanks.',
    'I replied "sounds good" to an email I did not read.',
    'My Notion page had a typo in the title.',
  ],
  lesson: [
    'Accountability is just invoicing yourself.',
    'Real leaders pivot, even when the floor does not.',
    "Failure is a gift, and the receipt is in a tab I can't find.",
    'Growth begins where comfort leaves a voicemail.',
    'Every obstacle is a pitch deck in disguise.',
    "If you can't scale it, rebrand it.",
    'The best ROI is on regret.',
    'Synergy is two things pretending to agree.',
    'Disruption begins at the pickle.',
    'Success is just failure with a sparkle emoji.',
  ],
  tags: [
    '#Leadership',
    '#Grindset',
    '#Accountability',
    '#Disruption',
    '#Synergy',
    '#VexxityLabs',
    '#AuraPoints',
    '#OpenToWork',
    '#47Tabs',
    '#MomBelieves',
  ],
}

/* 12 ─────────────────────────────── CHEEVOS */
export const CHEEVOS: Record<string, { title: string; desc: string }> = {
  gate: { title: 'Entered the Reliquary', desc: 'You came in. Arlo has framed the moment, in his mind, and will reference it at length.' },
  gaslit3: { title: 'Gaslit, Thrice', desc: 'Three claims believed. Arlo is not a liar. He is a 17-language optimist.' },
  konami: { title: 'Old Code, New Shame', desc: 'You entered a 1986 cheat code on a website about a man with 47 tabs. We see you.' },
  eggs5: { title: 'Egg Hunter, Level Five', desc: 'Five secrets found. Most people have no interest in secrets. You have secrets of your own, obviously.' },
  hydra: { title: 'Cut Off One Tab', desc: 'Two more opened. Arlo calls this "scaling."' },
  bossIgnored: { title: 'The Kindest Cut', desc: 'You ignored the Ego until it shrank. Therapists would call this "boundaries."' },
  bossFed: { title: 'Attention Merchant', desc: 'You fed the Ego until it ate a table. Was it worth it? Arlo says yes. Arlo is not objective.' },
  sold: { title: 'Sold Out (To Yourself)', desc: 'You sold a thing nobody asked for to someone who pretended to need it. That is the whole economy.' },
  paid: { title: 'Paid in Exposure', desc: 'Payment received: 14 impressions and a pat on the back. Arlo is thrilled. His landlord is not.' },
  employee: { title: 'Employee of the Month', desc: 'Awarded by you, to you. The plaque is a screenshot. The pride is real.' },
  jackpot: { title: 'Jackpot (of Nothing)', desc: 'Three matching parking tickets. A post is generating. It will be insufferable.' },
  sus100: { title: 'Fully Suspicious', desc: 'Suspicion at 100. Everyone suspects everyone, including the Notion page.' },
  delusion100: { title: 'Peak Delusion', desc: 'Delusion at 100. You and Arlo now share a reality. It has 47 tabs and a smoothie.' },
  fried: { title: 'Totally Cooked', desc: 'Brain: fried. Aura: negative. Vibes: fine, actually. Arlo envies the calm.' },
  idle: { title: 'Touched Grass (Virtually)', desc: 'You did nothing for a while. Arlo respects the courage, and Mom says hi.' },
  allMechanics: { title: 'Completionist of a Mess', desc: 'Every mechanic completed. You are fully informed. Arlo is fully proud. Nobody is fully okay.' },
}
