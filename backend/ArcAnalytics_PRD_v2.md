# ArcAnalytics — Product Requirements Document
### Feature Pages & UI Specification
**Version**: 1.1 | **Status**: Pre-Hackathon | **Audience**: Dev + Design

---

## Product Vision

> "Upload your ad. Understand your brain. Beat your competitors."

ArcAnalytics automatically breaks down every element in your ad and scores how strongly each one registers in the human brain — giving marketers the science behind what makes creative work, without needing to understand the technology.

---

## Information Architecture

```
/                      Landing / Login
/dashboard             Home — brand overview
/analyze               Upload & Analyze (core feature)
/industry              Industry Intelligence
/history               Previous Analyses
/clients               Client Management
/settings              Account & API config
```

---

# PAGE 1: /analyze — Ad Analysis

## Purpose
The core product loop. Upload one or more ads, instantly see every element in the ad identified and scored by brain engagement.

## What It Does (Non-Technical)
When a marketer uploads an ad, ArcAnalytics automatically finds and outlines every visual element — the face, the button, the logo, the headline — like drawing boxes around each part of the ad. Then it scores how much each element actually registers in the human brain based on neuroscience research.

No manual work. No tagging. Just upload and get answers.

## User Stories
- As a marketer, I can upload a single image ad and see every visual element scored by brain engagement
- As a marketer, I can upload two ads and compare which one is more neurologically effective
- As a marketer, I can upload a video ad and see which moments capture the most attention
- As a marketer, I can upload multiple ads and rank them by effectiveness

---

## UI Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  HEADER: "Ad Analysis"          [New Analysis]  [History ↗]    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              UPLOAD YOUR AD                              │   │
│  │                                                          │   │
│  │   [  Drop your ad here — image or video  ]               │   │
│  │        or  [Browse Files]   [Paste URL]                  │   │
│  │                                                          │   │
│  │   Works with: Images (JPG, PNG) and Video (MP4, MOV)    │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ANALYSIS MODE:  ● Single Ad   ○ Compare Two Ads   ○ Batch     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Results: Single Ad
```
┌──────────────────────────┬──────────────────────────────────────┐
│   YOUR AD                │   WHAT WE FOUND                     │
│                          │                                      │
│   [Ad image with         │   The coloured outlines show each   │
│    coloured outlines     │   part of your ad we identified.    │
│    drawn around each     │   Each one is scored on how         │
│    element — face,       │   strongly it registers in the      │
│    CTA, logo, etc]       │   human brain.                      │
│                          │                                      │
│   Toggle:                │   ● Person / Face       9.1 ████▉  │
│   [Show Elements]        │     Takes up 28% of your ad        │
│   [Brain Heatmap]        │     ★ Highest brain engagement     │
│                          │                                      │
│                          │   ● Call to Action       3.2 ███░░ │
│                          │     Takes up 4% of your ad         │
│                          │     ⚠ Low brain engagement         │
│                          │                                      │
│                          │   ● Background Scene     1.1 █░░░░ │
│                          │     Takes up 45% of your ad        │
│                          │     ✗ Almost invisible to brain    │
│                          │                                      │
│                          │   ● Brand Logo           6.4 ████░ │
│                          │     Takes up 6% of your ad         │
│                          │     ✓ Good brain engagement        │
└──────────────────────────┴──────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  💡 WHAT THIS MEANS FOR YOUR AD                                 │
│                                                                  │
│  "The person in your ad is doing all the heavy lifting —        │
│   the brain locks onto faces instantly. But your               │
│   'Shop Now' button barely registers. Your background          │
│   takes up nearly half your ad but the brain ignores it        │
│   almost completely."                                           │
│                                                                  │
│  3 THINGS TO FIX:                                               │
│  1. Move your button next to the face — eyes naturally         │
│     follow where the person is looking                         │
│  2. Make your button bigger — it needs more space to be seen   │
│  3. Reduce background — it's wasting valuable visual space     │
│                                                                  │
│  [Download Report]  [Save]  [Share]                            │
└─────────────────────────────────────────────────────────────────┘
```

### Results: Compare Two Ads
```
┌──────────────────────────┬──────────────────────────────────────┐
│   AD VERSION A           │   AD VERSION B                       │
│   [Image + outlines]     │   [Image + outlines]                 │
│                          │                                      │
│   Overall: 7.2/10        │   Overall: 5.4/10                   │
│   Strongest: Face        │   Strongest: Product                 │
│   Weakest: CTA 3.2/10   │   Weakest: Logo 2.1/10              │
└──────────────────────────┴──────────────────────────────────────┘
│  VERDICT                                                        │
│  Version A is stronger overall — the face drives more           │
│  brain engagement. But Version B has a better-placed button.   │
│  Best approach: use A's face with B's button position.         │
```

### Results: Video Ad
```
┌──────────────────────────────────────────────────────────────────┐
│  [Video Player]  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  0:15           │
├──────────────────────────────────────────────────────────────────┤
│  HOW ATTENTION CHANGES THROUGH YOUR VIDEO                        │
│                                                                  │
│  High │        ╭──╮                                             │
│       │   ╭────╯  ╰──╮        ╭────╮                          │
│  Mid  │───╯           ╰────────╯    ╰───                       │
│  Low  │                                                         │
│       └───────────────────────────────── time                  │
│       0s     3s     6s     9s    12s    15s                    │
│                                                                  │
│  📍 4 seconds: Face appears — attention spikes                  │
│  📍 8 seconds: Face leaves frame — attention drops              │
│  📍 12 seconds: Face + button together — sweet spot             │
│                                                                  │
│  TIP: Keep the face on screen longer — attention drops          │
│  sharply when it disappears at 8 seconds.                       │
└──────────────────────────────────────────────────────────────────┘
```

---

# PAGE 2: /industry — Industry Intelligence

## Purpose
Show marketers how their ads compare to competitors and what makes viral campaigns work — in plain language, backed by neuroscience.

## What It Does (Non-Technical)
Marketers can see how their brand's brain engagement scores compare to others in their industry. They can also drop in a competitor's ad URL to see how it scores, and browse a library of viral campaigns with plain-English explanations of why they worked neurologically.

---

## UI Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  HEADER: "Industry Intelligence"                                 │
│  Filter: [Your Industry ▾]  [Region ▾]  [Last 90 days ▾]      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────────────┐  ┌─────────────────────────┐ │
│  │  HOW YOU COMPARE             │  │  WHAT WORKS IN YOUR     │ │
│  │                              │  │  INDUSTRY               │ │
│  │  Your ads:      7.1/10 ✅    │  │                         │ │
│  │  Industry avg:  5.9/10       │  │  Faces:       7.2/10   │ │
│  │  Top brands:    8.4/10       │  │  Buttons:     6.1/10   │ │
│  │                              │  │  Logos:       4.8/10   │ │
│  │  You're above average 🎉     │  │  Reviews:     5.5/10   │ │
│  └──────────────────────────────┘  └─────────────────────────┘ │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│  ANALYSE A COMPETITOR AD                                         │
│  Paste a link to any ad or upload an image                      │
│                                                                  │
│  [🔗 Paste ad URL or drop image here]        [Analyse]          │
│                                                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │ Competitor A │  │ Competitor B │  │ Competitor C │           │
│  │ 7.4/10       │  │ 5.2/10      │  │ 8.8/10 👑   │           │
│  │ Strong: Face │  │ Strong: CTA │  │ Strong: All  │           │
│  │ [View]       │  │ [View]      │  │ [View]       │           │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│  WHY DID THESE GO VIRAL?                                        │
│  Real campaigns. Real neuroscience. Plain English.              │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 🏆 Nike — "Just Do It" Super Bowl 2024    9.4/10         │  │
│  │                                                          │  │
│  │ Why it worked:                                           │  │
│  │ The athlete looks directly into camera for 3.2 seconds  │  │
│  │ — that length of direct eye contact triggers the same   │  │
│  │ brain response as real human connection. Combined with  │  │
│  │ the emotional music, it's almost impossible to ignore.  │  │
│  │                                                         │  │
│  │ [See Full Breakdown]                                    │  │
│  └──────────────────────────────────────────────────────────┘ │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 🏆 Monzo — "Coral Card" Campaign          8.7/10         │  │
│  │                                                          │  │
│  │ Why it worked:                                           │  │
│  │ The coral colour is unique in financial advertising.     │  │
│  │ The brain flags anything unusual — Monzo's card stood   │  │
│  │ out in a sea of blue and grey bank ads. Distinctive     │  │
│  │ colour alone drove 40% of brand recall.                 │  │
│  │                                                         │  │
│  │ [See Full Breakdown]                                    │  │
│  └──────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

# PAGE 3: /history — Previous Analyses

## Purpose
Scientific record of what worked over time. Every analysis stored and searchable, with a running summary of what elements consistently drive better results.

---

## UI Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  HEADER: "What's Working"                                        │
│  Based on your last 47 ad analyses                              │
├─────────────────────────────────────────────────────────────────┤
│  YOUR PATTERNS                                                   │
│                                                                  │
│  ┌───────────────────┐  ┌───────────────────┐                  │
│  │ 🏆 BEST ELEMENT   │  │ ⚠️  BIGGEST DRAG  │                  │
│  │ Direct eye contact│  │ Heavy background  │                  │
│  │ Boosts clicks +34%│  │ Hurts clicks -18% │                  │
│  └───────────────────┘  └───────────────────┘                  │
│  ┌───────────────────┐  ┌───────────────────┐                  │
│  │ 💡 BEST COMBO     │  │ 📈 YOUR TREND     │                  │
│  │ Face next to CTA  │  │ Avg score up 0.4  │                  │
│  │ 9.2/10 average    │  │ in last 30 days   │                  │
│  └───────────────────┘  └───────────────────┘                  │
├─────────────────────────────────────────────────────────────────┤
│  ALL YOUR ADS                                                    │
│  [🔍 Search]  [Sort: Latest ▾]  [Filter: Score ▾]             │
│                                                                  │
│  [img] Nike_SS25_01   Apr 23   8.4/10  Eye contact   [View]   │
│  [img] Monzo_Apr_A    Apr 21   6.1/10  CTA button    [View]   │
│  [img] Nike_SS25_02   Apr 20   7.8/10  Smiling face  [View]   │
│  [img] Monzo_Apr_B    Apr 18   5.4/10  Product shot  [View]   │
└─────────────────────────────────────────────────────────────────┘
```

---

# PAGE 4: /clients — Client Management

## Purpose
For agencies managing multiple brands — one place to see all clients, their latest analyses, and generate shareable reports.

---

## UI Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  HEADER: "Your Clients"               [+ Add New Client]        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │ 🟠 NIKE UK  │  │ 🔴 MONZO    │  │ ⚫ ADD NEW  │            │
│  │             │  │             │  │             │            │
│  │ 12 analyses │  │  8 analyses │  │             │            │
│  │ Avg: 7.8/10 │  │ Avg: 6.2/10 │  │     +       │            │
│  │ ↑ improving │  │ ↓ slipping  │  │             │            │
│  │             │  │             │  │             │            │
│  │ [Open]      │  │ [Open]      │  │ [Create]    │            │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│  NIKE UK — LATEST                                                │
│                                                                  │
│  [img]  Nike_SS25_Hero.jpg                                       │
│         Score: 8.4/10 ✅                                        │
│         "The face and button placement is working well.         │
│          Background is still too heavy — reduce it."            │
│                                                                  │
│  [View Full Report]  [Send to Client]  [Download PDF]          │
└─────────────────────────────────────────────────────────────────┘
```

---

# UI Design System

## Principles
```
1. Plain language first  — no technical jargon visible to marketers
2. Dark, modern UI       — dark background, clean cards
3. Colour = meaning      — scores always red/amber/green, nothing else
4. Numbers are heroes    — big, bold scores front and centre
5. One action per card   — never overwhelm with options
```

## Colour Palette
```
Background:      #0A0A0F   (near black)
Surface:         #13131A   (card background)
Border:          #1E1E2E   (divider)
Brand purple:    #6C63FF
Text primary:    #F0F0F5
Text muted:      #6B6B7B

Score HIGH:      #FF4D6D   (red — strong brain engagement)
Score MED:       #FFB800   (amber — moderate)
Score LOW:       #00D4AA   (teal — weak)
```

## Score Language (Non-Technical)
```
9-10:  "Extremely strong brain engagement" 🔴
7-8:   "Strong brain engagement"           🔴
5-6:   "Moderate — could be stronger"      🟡
3-4:   "Low — brain barely notices this"   🟢
1-2:   "Almost invisible to the brain"     🟢
```

## Component Patterns
```
Score bar:      horizontal fill, coloured by level
Element tag:    plain English label — "Person / Face" not "human_face"
Insight box:    bold summary + 3 numbered fixes
Ad card:        thumbnail + score + plain English top element
Compare panel:  side by side, winner highlighted
Video timeline: engagement line chart, annotated peaks
```

## Key Interactions
```
Upload:      drag-drop with dotted animated border
Processing:  "Finding elements in your ad..." → outlines fade in
             "Scoring brain engagement..."    → bars fill
             "Writing your recommendations..." → insight appears
Hover:       hover element row → highlights region on ad
Compare:     slider between A and B
Export:      one click → PDF with brand logo + plain English report
```

---

# MVP Scope for Hackathon

## Build (Core)
```
✅ /analyze — single ad upload + element detection + brain scores
✅ /analyze — A/B compare mode
✅ Coloured element outlines on ad image
✅ Brain engagement score per element (plain language)
✅ AI insight card — plain English summary + 3 fixes
✅ /clients — basic client switcher
```

## Nice to Have
```
🟡 /history — table + "what's working" summary
🟡 /industry — competitor ad upload + viral library
🟡 Video ad support
🟡 PDF export
```

## Skip
```
❌ Full client CRUD
❌ Billing
❌ Team collaboration
❌ API access
```
