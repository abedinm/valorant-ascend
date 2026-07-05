/* ==========================================================================
   VALORANT ASCEND — Course content
   All course data lives here so the app is data-driven and easy to edit.
   Edit text below to change lessons; the UI re-renders from this object.
   ========================================================================== */

const COURSE = {
  student: {
    name: "Operator",
    rank: "Silver",
    goalShort: "Ascendant",
    goalLong: "Radiant",
    agent: "Reyna",
    role: "Duelist (Disciplined Entry)",
    sens: { dpi: 800, inGame: 0.375, edpi: 300 }
  },

  /* The non-negotiables shown at the top of the course. */
  creed: [
    "One agent. Reyna. FINAL lock — chosen by you, on record. Swapping is the failure now, not losing.",
    "One sens. 800 DPI x 0.375 = 300 eDPI. Set it once, never touch it again.",
    "Judge the session by your focus goal, not by RR.",
    "Your gear is elite. It is never the problem. The reps are the problem.",
    "You entry ON A COUNT with trade cover — never dry, never solo, never a re-peek after the kill. Frag inside the system."
  ],

  /* -----------------------------------------------------------------------
     MODULES — six pillars. Each has sections (teaching) + a checklist.
     Checklist item ids must be unique within a module.
     -------------------------------------------------------------------- */
  modules: [
    {
      id: "mindset",
      no: "01",
      icon: "ti-brain",
      title: "Mindset & Anti-Tilt",
      tagline: "Kill the self-talk. Play the process, not the scoreboard.",
      accent: "teal",
      sections: [
        {
          heading: "The one rule",
          body: "You do not queue to win RR. You queue to complete ONE focus goal. Win or lose, if you executed the focus goal, the session was a success. RR is the byproduct of habits — chase the habit, the RR follows."
        },
        {
          heading: "Banned phrases (and the reframe)",
          body: "You said the quiet part out loud: \"trash aim, no game sense.\" That sentence is a habit, and it is making you worse. Every time you catch it, swap it for a process sentence:",
          list: [
            "\"My aim is trash\"  ->  \"My crosshair sat below head level that round. Fixable in the next DM.\"",
            "\"I have no game sense\"  ->  \"I peeked without a trade. Next round I peek within trade distance.\"",
            "\"I'm hardstuck Silver\"  ->  \"I'm running the habits that rank up. Today's habit is the one I picked.\"",
            "\"I'm throwing\"  ->  \"I lost an aim duel. The next round is a coin flip I can win.\""
          ]
        },
        {
          heading: "Pre-game ritual (90 seconds)",
          body: "Before you press Find Match: one slow breath in for 4, out for 6. Say your focus goal out loud. Confirm: one agent (Reyna), one sens. That's it. You are now playing for a goal, not for validation."
        },
        {
          heading: "Between rounds: the 1-breath reset",
          body: "Lost the round? One breath. Ask 'what's the next play?' — NOT 'why did that happen?'. Post-mortems belong in VOD review, never mid-game. Carrying the last round into this one is how a 2-round skid becomes a 9-round skid."
        },
        {
          heading: "The hard stop",
          body: "Lost 2-3 in a row AND you feel heat instead of focus? Log off. No 'one more'. The tilt-check button (bottom-right, anywhere in this app) exists for exactly this moment — use it before you queue."
        }
      ],
      checklist: [
        { id: "focus", text: "Set a focus goal before the session (a habit, not an RR target)" },
        { id: "reframe", text: "Caught and reframed at least one self-deprecating thought" },
        { id: "ritual", text: "Did the 90-second pre-game breath + focus ritual" },
        { id: "reset", text: "Used the 1-breath reset between rounds instead of spiraling" },
        { id: "stop", text: "Logged off when tilted instead of forcing 'one more'" }
      ]
    },

    {
      id: "aim",
      no: "02",
      icon: "ti-crosshair",
      title: "Aim Mechanics",
      tagline: "Crosshair at head height. Stop to shoot. One sens forever.",
      accent: "red",
      sections: [
        {
          heading: "Lock your sens — today, permanently",
          body: "800 DPI x 0.375 in-game = 300 eDPI. This is your sensitivity for the rest of this climb. Set it now. Every time you 'try a new sens' you reset your muscle memory to zero — that is the single most common reason Silver aim stays inconsistent. There is a confirmation toggle on this card. Tick it once and never reopen the settings.",
          list: [
            "In-game Sensitivity: 0.375",
            "Mouse DPI: 800",
            "Resulting eDPI: 300",
            "Scoped sens multiplier: leave at 1 (default)"
          ]
        },
        {
          heading: "Crosshair placement at head height (your biggest free win)",
          body: "Your crosshair should already be where a head will appear BEFORE you see the enemy. Keep it level with the top of doorways, boxes, and railings — never resting on the floor. If you pre-place at head height, fights become a small horizontal adjustment instead of a panic flick up. This fixes 'inconsistent aim' faster than any aim trainer."
        },
        {
          heading: "Counter-strafing — the stop that lets you shoot",
          body: "In Valorant, moving = your bullets spray wide. First-shot accuracy needs you fully stopped. Counter-strafe = tap the OPPOSITE movement key to brake instantly, then fire in the stopped window. Moving right on D? Tap A to stop, shoot. This is the difference between a clean tap and a missed spray.",
          list: [
            "Strafe A -> tap D -> fire (stopped)",
            "Strafe D -> tap A -> fire (stopped)",
            "Peek -> stop -> shoot -> re-strafe to cover (peek, don't stand)"
          ]
        },
        {
          heading: "Tap, burst, spray — and reset",
          body: "Long range: single taps. Mid: 2-3 round bursts. Close: controlled spray with the recoil pull-down. After every kill, snap the crosshair back to head height for the next angle — don't let it drift to the floor while you admire the frag."
        }
      ],
      checklist: [
        { id: "sens", text: "Confirmed sens 800 DPI / 0.375 (300 eDPI) and have NOT changed it" },
        { id: "headheight", text: "Held crosshair at head height for a full DM (no floor-resting)" },
        { id: "preaim", text: "Pre-aimed angles before arriving instead of flicking up" },
        { id: "counterstrafe", text: "Did 50 counter-strafe reps in the Range" },
        { id: "reset", text: "Re-centered crosshair to head height after every kill" }
      ]
    },

    {
      id: "warmup",
      no: "03",
      icon: "ti-flame",
      title: "Training Blocks",
      tagline: "Research-backed structure: short blocks, hard caps, stop-loss. Never queue cold.",
      accent: "amber",
      sections: [
        {
          heading: "The block system (what the science says)",
          body: "Skill studies are blunt: 90% of daily aim gains come in the first 30-50 minutes, cognitive accuracy degrades inside a single ~2.5 hour session, and binge-grinding produces LOWER final skill than spaced play. So you train in BLOCKS, max 2 hours each, max 3 per day, with real breaks between.",
          list: [
            "One block = 15 min drills + 25 min DM + 3-4 ranked games + 10 min death review.",
            "Cap TOTAL aim practice at ~45 min per day — beyond that is proven wasted effort.",
            "STOP-LOSS: 2 losses in a row OR any anger = block over. Walk away from the PC.",
            "3 sharp blocks beat 10 zombie hours. Every time."
          ]
        },
        {
          heading: "The routine (in order)",
          body: "Pick ONE aim-trainer platform for step 4 (Aim Lab or Kovaak's) and stick with it. Don't do both — you don't have time and consistency matters more than volume.",
          list: [
            "1. The Range — 100 bots, Hard, no timer. One-taps to the head only. (4 min)",
            "2. The Range — counter-strafe lane: strafe-stop-shoot, 50 clean reps. (3 min)",
            "3. Deathmatch — ONE game. Focus: crosshair at head height + counter-strafe. Ignore the scoreboard. (8 min)",
            "4a. AIM LAB option: Gridshot Ultimate x2 (3 min) + Spidershot x1 for target-switching (2 min)",
            "4b. KOVAAK'S option: 1wall6targets TE x2 (3 min) + Close Long Strafes Invincible x1 for tracking (2 min)"
          ]
        },
        {
          heading: "Reyna-specific add-on (optional, 2 min)",
          body: "If you have a spare 2 minutes: in the Range, drill the entry combo — throw Leer (C) high at an angle, swing as it lands, one-tap, then Dismiss (E) back behind cover. Ten clean reps. Building the Leer-count-swing rhythm before you queue means your entries run on muscle memory, not adrenaline."
        }
      ],
      checklist: [
        { id: "range1", text: "Block opener: 15 min drills (head-taps + counter-strafe)" },
        { id: "range2", text: "25 min DM — gunfight hygiene only, ignore the score" },
        { id: "dm", text: "Kept ranked to 3-4 games per block, real break after" },
        { id: "trainer", text: "Capped total aim practice at ~45 min today" },
        { id: "consistency", text: "Honored the stop-loss (2 losses in a row or anger = done)" }
      ]
    },

    {
      id: "reyna",
      no: "04",
      icon: "ti-bolt",
      title: "Reyna Entry Discipline",
      tagline: "You get to frag — inside a system. Counted entries, trade cover, no hero-ball.",
      accent: "pink",
      sections: [
        {
          heading: "The deal you made",
          body: "Reyna is YOUR pick, chosen with open eyes — the final lock. Here's the deal that comes with her: you get the fragging role you actually enjoy, and in exchange you entry like a professional, not a hero. Your own data is the contract: your 24/16, 23/17 and 18/11 MVP games all LOST, because kills without structure don't win rounds. Fragging inside the system does."
        },
        {
          heading: "The entry, done right",
          body: "You take the first fight — but never a coin flip. Every entry has three parts, every time:",
          list: [
            "ON A COUNT: 'swinging in 3, 2, 1' — util lands (yours or a teammate's), THEN you swing. Never trickle in alone.",
            "TRADE COVER: a teammate within refrag distance BEFORE you peek. If you die and nobody can punish it, the entry was wrong — even if you got a kill first.",
            "ONE SWING, ONE PURPOSE: clear your angle, take your duel, get out or get forward. No wandering."
          ]
        },
        {
          heading: "Leer (C) before you commit",
          body: "Throw Leer to nearsight the defender holding your angle, THEN swing. Leer-then-peek is the whole trick: the duel you were 50/50 on becomes 80/20. One Leer per entry, placed high where they can't shoot it easily.",
          list: [
            "Leer -> count -> swing. In that order, every site take.",
            "No Leer and no teammate util? Then it's not an entry — it's a gamble. Wait for the count."
          ]
        },
        {
          heading: "Soul Orbs: Dismiss (E) vs Devour (Q)",
          body: "Every kill drops an orb. The decision rule, so you never freeze:",
          list: [
            "Outnumbered or low HP -> DISMISS to cover. You won the duel; now survive the trade attempt.",
            "Even/ahead and healthy -> DEVOUR, reset HP, keep the pressure with your team.",
            "The orb is your discipline check: taking it should move you TOWARD your team, never deeper alone."
          ]
        },
        {
          heading: "The hero-ball trap (your #1 leak)",
          body: "Your deaths don't come from entrying — they come from what happens AFTER the entry works. You get a kill, feel the heat, re-peek the same angle or push deeper solo... and die un-traded. That death costs more than your kill earned.",
          list: [
            "NO RE-PEEK after a kill. Dismiss or reset behind cover. The next angle is a new decision with your team.",
            "NO 1vX dry swings to 'carry'. Down a player? Play the man-advantage rules: trade, don't donate.",
            "Empress (X) is for executes, retakes and clutches — not for tilted revenge swings."
          ]
        },
        {
          heading: "Defense: picks, not wars",
          body: "On defense Reyna hunts ONE pick, then Dismisses out and resets. You are not holding a site 1v5 with your body. Take the opening duel from a strong angle with an escape plan, cash the orb, fall back, let the round come to you."
        },
        {
          heading: "If Reyna is taken — your one backup",
          body: "Backup is PHOENIX — same job (entry on a count), more forgiving kit. Your entry habits transfer completely.",
          list: [
            "Curveball (Q) — self-flash around the corner, swing as it pops. Your Leer substitute.",
            "Hot Hands / Blaze — heal yourself or cut the site in half for the take.",
            "Run It Back (X) — a FREE entry: swing first, die, respawn at your marker. The perfect entry-duelist ult.",
            "Rule: Phoenix is the 'Reyna is taken' option only. Not a second main. The lock stands."
          ]
        }
      ],
      checklist: [
        { id: "count", text: "Every entry on a count with trade cover — zero dry solo swings" },
        { id: "leer", text: "Leer (or teammate util) before every committed swing" },
        { id: "norepeek", text: "ZERO re-peeks after a kill — Dismissed or reset instead" },
        { id: "orbs", text: "Orb rule followed: Dismiss when outnumbered, Devour when ahead" },
        { id: "fb", text: "Hunted 2+ first bloods the right way (counted, covered)" },
        { id: "noswap", text: "Did NOT swap off Reyna all session — the lock held" }
      ]
    },

    {
      id: "gamesense",
      no: "05",
      icon: "ti-map-2",
      title: "Game Sense",
      tagline: "One new habit per week. Trading, economy, timing, post-plant, control.",
      accent: "blue",
      sections: [
        {
          heading: "How to use this module",
          body: "Don't try to learn all of game sense at once — that's how it stays vague. Pick ONE weekly habit, set it as your focus goal for the week, and drill only that until it's automatic. Use the Habit-of-the-Week tracker in the Daily view to lock your current week. Five weeks = five permanent habits."
        },
        {
          heading: "The five weekly habits",
          body: "Run them in order. Each builds on the last.",
          list: [
            "WEEK 1 — Trade discipline: never peek alone. Stay within trade distance of a teammate so if you die, they instantly get the kill. As entry, make sure someone is right behind you.",
            "WEEK 2 — Economy discipline: know the buy. Full-buy / light-buy / full-save — and buy WITH your team. Don't force a lone rifle when the team ecos; save together to guarantee a full-buy next round.",
            "WEEK 3 — Entry timing: takes happen ON A COUNT with util. Leer or teammate flash lands, THEN everyone swings together. No trickle entries, no dry pushes.",
            "WEEK 4 — Post-plant discipline: after the plant, play for TIME and play off the bomb. Hold an angle the defenders MUST clear; don't push into the retake. Default to crossfires with a teammate.",
            "WEEK 5 — Map control & defaults: take map control early with a default spread, gather info, then commit as 5 to the weak side. On defense, hold info spots and retake with util instead of solo-dueling."
          ]
        },
        {
          heading: "Trading — the habit that fixes your deaths",
          body: "Most Silver deaths are un-traded deaths: you peeked, you died, nobody was there to punish the enemy. As the entry this is YOUR lifeline: you take the first fight, so a teammate within refrag distance is what turns your death into a 1-for-1 instead of a donation. Entry with trade cover = your team profits even when you lose the duel. Entry without it = hero-ball."
        }
      ],
      checklist: [
        { id: "trade", text: "W1: Stayed within trade distance — no solo peeks" },
        { id: "eco", text: "W2: Bought with the team (no lone force-buys)" },
        { id: "timing", text: "W3: Entered on a count with util — no trickle takes" },
        { id: "postplant", text: "W4: Played post-plant for time, off the bomb" },
        { id: "control", text: "W5: Took early map control with a default" }
      ]
    },

    {
      id: "vod",
      no: "06",
      icon: "ti-device-tv",
      title: "VOD Review System",
      tagline: "Review only your deaths. Four questions. Find the pattern.",
      accent: "purple",
      sections: [
        {
          heading: "Review ONLY your deaths",
          body: "Don't rewatch whole games — that's hours you won't spend. Open the match replay (or your recording) and jump death to death. Your deaths ARE the syllabus: every death is a mistake you can name and fix. Wins teach you almost nothing; deaths teach you everything."
        },
        {
          heading: "The four diagnostic questions",
          body: "Ask these on each death, out loud or written down:",
          list: [
            "1. INFO — Did I have information this fight was coming, and did I use it? (sound, minimap, comms)",
            "2. WAS IT MINE — Was this fight mine to take? Was I traded/supported? Was the timing right, or did I solo-dive?",
            "3. TYPE — Mechanical miss (crosshair below head, moving while shooting, lost the aim duel) OR decision error (bad position, bad timing, over-peek)?",
            "4. PATTERN — Have I died this exact way already this week? A repeat is your #1 fix."
          ]
        },
        {
          heading: "Turn the pattern into tomorrow's focus goal",
          body: "The recurring death is the gold. If 3 of 5 deaths were 'peeked alone, got traded' -> tomorrow's focus goal is 'never peek without a teammate in trade distance'. The loop is: play -> review deaths -> find pattern -> set focus goal -> play. That loop is the entire climb."
        },
        {
          heading: "Cadence",
          body: "Review 3-5 deaths after every session, or one full game's deaths twice a week. Five minutes of honest death review beats an hour of mindless queuing."
        }
      ],
      checklist: [
        { id: "deathsonly", text: "Reviewed only deaths (didn't rewatch full rounds)" },
        { id: "fourq", text: "Answered all 4 questions on at least 3 deaths" },
        { id: "label", text: "Labeled each death: mechanical vs decision" },
        { id: "pattern", text: "Identified the recurring death pattern" },
        { id: "nextgoal", text: "Turned the pattern into tomorrow's focus goal" }
      ]
    }
  ],

  /* -----------------------------------------------------------------------
     ROADMAP — Silver to Ascendant (and beyond). order = progression.
     -------------------------------------------------------------------- */
  roadmap: [
    {
      id: "silver",
      tier: "Silver",
      state: "current",
      color: "#9aa6ad",
      focus: "Lock the fundamentals",
      points: [
        "One sens (300 eDPI), set and forgotten",
        "Crosshair lives at head height",
        "Self-talk under control",
        "Full warmup before every session",
        "No agent-hop — Reyna only"
      ]
    },
    {
      id: "gold",
      tier: "Gold",
      state: "next",
      color: "#f2c94c",
      focus: "Mechanical consistency",
      points: [
        "Counter-strafe is automatic",
        "Win your share of aim duels",
        "Leer before every committed swing",
        "Orb decisions automatic: Dismiss out, Devour ahead"
      ]
    },
    {
      id: "platinum",
      tier: "Platinum",
      state: "locked",
      color: "#56ccf2",
      focus: "Trading & timing",
      points: [
        "Never peek alone",
        "Entry on a count, team floods in behind you",
        "Buy with the team, every round",
        "Trade-aware positioning"
      ]
    },
    {
      id: "diamond",
      tier: "Diamond",
      state: "locked",
      color: "#b06ef2",
      focus: "Map control & impact",
      points: [
        "Your flashes convert to opening picks",
        "Post-plant discipline locked in",
        "Win rounds with post-plant discipline + Empress timing",
        "Read the enemy's defaults"
      ]
    },
    {
      id: "ascendant",
      tier: "Ascendant",
      state: "goal",
      color: "#3be8b0",
      focus: "Repeatable entry impact",
      points: [
        "Your entries consistently open rounds for the team",
        "IGL-lite: simple, clear calls",
        "Empress on the rounds that matter",
        "Tilt-proof — process over RR, always"
      ]
    },
    {
      id: "radiant",
      tier: "Radiant",
      state: "dream",
      color: "#fff09a",
      focus: "Do all of the above — every game",
      points: [
        "The habits never slip, win or lose",
        "Mechanics + decisions both elite",
        "You teach this to someone else"
      ]
    }
  ],

  /* -----------------------------------------------------------------------
     PATHWAY — Silver 2 -> Diamond, stage by stage, with measurable GATES.
     A gate is a condition over your recent games — not a timer. You advance
     when the gates hold, and that IS the fastest honest route.
     -------------------------------------------------------------------- */
  pathway: [
    {
      id: "s2", tier: "Silver 2", color: "#9aa6ad", kind: "start",
      focus: "Stop donating deaths",
      gates: [
        "Every entry counted + trade-covered — zero dry solo swings (10 games)",
        "Deaths under 13 in at least half your games",
        "Every session: block structure + stop-loss honored"
      ],
      drill: "Leer, count, swing. After the kill: reset or Dismiss — never re-peek."
    },
    {
      id: "s3", tier: "Silver 3", color: "#b8c4cc", kind: "stage",
      focus: "Win the trade game",
      gates: [
        "Win rate over 50% across last 10 comp games",
        "Never fight alone — trade cover on every entry",
        "First bloods 2+ per game average (the entry is doing its job)"
      ],
      drill: "You crack the site open; your team floods behind. Die traded or don't die."
    },
    {
      id: "g1", tier: "Gold 1", color: "#e6b400", kind: "stage",
      focus: "Gunfight hygiene",
      gates: [
        "Crosshair head-height + counter-strafe automatic (DM check)",
        "Take clean 1v1s with the gun — no util crutch in duels",
        "Refuse disadvantaged fights (eco peeks, Op angles, no-trade)"
      ],
      drill: "Woohoojin doctrine: clean duels win Gold. 25 min DM per block."
    },
    {
      id: "g2", tier: "Gold 2", color: "#f2c94c", kind: "stage",
      focus: "Economy discipline",
      gates: [
        "Buy with the team every round — zero lone forces (10 games)",
        "Deaths under 13 in 7 of last 10 games",
        "K/D at or above 1.0 over the window"
      ],
      drill: "Your money is team money. Full-buy together, save together."
    },
    {
      id: "g3", tier: "Gold 3", color: "#ffd97a", kind: "stage",
      focus: "Info converts to rounds",
      gates: [
        "Your entries convert — team takes the space you open (VOD check)",
        "Post-plant: play for TIME off the bomb, crossfire with a teammate",
        "Win rate still over 50% at Gold MMR"
      ],
      drill: "You are the eyes. A reveal nobody uses is a wasted orb — CALL it."
    },
    {
      id: "p1", tier: "Platinum 1", color: "#3fb6c2", kind: "stage",
      focus: "Timing and map control",
      gates: [
        "Executes on a count with full util — no trickle entries",
        "Early map control taken with a default most rounds",
        "Opening duel record positive: more first bloods than first deaths"
      ],
      drill: "Plat rounds are won before the fight: space, info, then commit."
    },
    {
      id: "p2", tier: "Platinum 2", color: "#5fd0dc", kind: "stage",
      focus: "Consistency under pressure",
      gates: [
        "ACS floor rising: no bottom-frag games in last 10",
        "Clutch/retake decisions reviewed weekly (VOD)",
        "Stop-loss NEVER broken — zero tilt sessions in 2 weeks"
      ],
      drill: "Your floor, not your ceiling, is what ranks up from here."
    },
    {
      id: "p3", tier: "Platinum 3", color: "#8ee3ec", kind: "stage",
      focus: "Read the enemy",
      gates: [
        "Mid-round adaptation: catch their default by round 4",
        "Empress timing wins retakes (not wasted on saves)",
        "Win rate over 50% at Plat MMR"
      ],
      drill: "Same info, better questions: WHERE are they, and WHY there?"
    },
    {
      id: "d1", tier: "DIAMOND", color: "#b388eb", kind: "summit",
      focus: "The summit — top ~10% of all players",
      gates: [
        "All previous gates hold simultaneously",
        "You are the calmest player in every lobby",
        "The habits run on autopilot, win or lose"
      ],
      drill: "Same blocks, same discipline. Then we talk Immortal."
    }
  ],

  /* -----------------------------------------------------------------------
     WEEKLY SCHEDULE — a suggested 7-day rhythm.
     -------------------------------------------------------------------- */
  schedule: [
    { day: "Mon", label: "Ladder + review", plan: ["Full warmup", "2 comp games", "VOD: 3 deaths"] },
    { day: "Tue", label: "Aim focus", plan: ["Full warmup", "DM placement focus", "2 comp games"] },
    { day: "Wed", label: "Mechanics", plan: ["Aim-trainer heavy", "1 comp game", "Counter-strafe reps"] },
    { day: "Thu", label: "Ladder + review", plan: ["Full warmup", "2 comp games", "VOD: 3 deaths"] },
    { day: "Fri", label: "Push", plan: ["Full warmup", "3 comp games (push)", "Stop if tilted"] },
    { day: "Sat", label: "Long session", plan: ["Full warmup", "5-stack or 3 comp", "VOD: full game"] },
    { day: "Sun", label: "Light + plan", plan: ["1 DM only", "Review week's patterns", "Set next week's habit"] }
  ],

  /* -----------------------------------------------------------------------
     FOCUS GOAL suggestions for the daily tracker (one per day).
     -------------------------------------------------------------------- */
  focusGoals: [
    "Entry ONLY on a count with trade cover — never dry",
    "ZERO re-peeks after a kill — reset or Dismiss",
    "Crosshair at head height EVERY round",
    "Counter-strafe before every shot",
    "Leer before every committed swing",
    "Never fight alone (trade distance)",
    "Orb rule: Dismiss outnumbered, Devour ahead",
    "Hunt 2+ first bloods — counted and covered",
    "Pop Empress on an execute or retake",
    "Buy with the team — no lone force",
    "Reframe every tilt thought into process",
    "Review 3 deaths after the session",
    "Stay on Reyna — the lock holds"
  ],

  /* -----------------------------------------------------------------------
     TILT CHECK — warning-sign questions. 2+ yes = log off.
     -------------------------------------------------------------------- */
  tiltCheck: {
    questions: [
      "Did you just lose 2+ rounds/games in a row and feel anger, not focus?",
      "Are you blaming teammates — out loud or in your head?",
      "Did you queue the last game instantly, with no breath or reset?",
      "Are you instalocking and forcing aggro to 'prove' your aim?",
      "Has your crosshair stopped going to head height because you stopped caring?",
      "Are you 3+ hours in and playing worse than when you started?",
      "Are you saying 'trash aim / no game sense / hardstuck' to yourself?"
    ],
    tilted: {
      title: "You're tilted. Log off. Now.",
      body: "Two or more warning signs. Queuing again will lose RR AND reinforce the exact habits this course is killing. Close the client. Come back tomorrow with a warmup and a focus goal. This is the most +EV decision you can make right now."
    },
    clear: {
      title: "You're good to play.",
      body: "Zero or one warning sign. Take one breath, set your focus goal for the next round, and keep your crosshair at head height. Go."
    }
  }
};
