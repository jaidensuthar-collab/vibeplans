# VibePlan

**Find the vibe. Make the plan.**

VibePlan is an AI-powered summer social planner for teens and friend groups. It helps you figure out what to do when you're bored, ranks fun summer activity ideas, and lets groups vote on plans — no spam group chat required.

---

## Features

- **Chat Mode** — Describe your vibe, budget, and distance in plain text. Get a ranked Top 3 list instantly.
- **Group Mode** — Create a group code, add constraints, vote on the top 3 ideas, and generate an improved plan.
- **Mock AI Ranking Engine** — Scores activities by budget fit, distance match, vibe alignment, and effort level.
- **20+ Starter Activities** — A mix of free, cheap, outdoor, indoor, chill, and adventure ideas.
- **Warning Badges** — Visual flags for late-night, cost risk, weather risk, needs-ride, and planning-needed situations.
- **Dark Mode** — Full dark/light mode toggle, persists across all pages.
- **Mobile-First** — Responsive layout designed for phones first.

---

## Tech Stack

| Tool | Version | Purpose |
|------|---------|---------|
| Vite | 5.x | Build tool and dev server |
| React | 18.x | UI framework |
| TypeScript | 5.x | Type safety |
| Tailwind CSS | 3.x | Utility-first styling |
| Vitest | 2.x | Unit testing |
| React Testing Library | 16.x | Component testing |

---

## Install

```bash
cd vibeplan
npm install
```

> Requires Node.js 18+. If npm is not available, install Node from [nodejs.org](https://nodejs.org).

---

## Run Locally

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Run Tests

```bash
npm run test
```

To watch for changes:

```bash
npm run test:watch
```

---

## Build for Production

```bash
npm run build
```

---

## How Mock AI Works

The mock ranking engine lives in `src/lib/mockPlanner.ts`. It works in three steps:

1. **Parse the prompt** — `parsePrompt()` scans the user's text for dollar amounts (`$15`), minute references (`20 min`), and vibe keywords (`chill`, `random`, `adventure`, etc.).

2. **Score each activity** — `rankActivities()` starts every activity at a base score of 50, then adds or subtracts points:
   - Budget match: +20 if under budget, +5 if partial, -20 if over
   - Distance match: +15 if within limit, +5 if slightly over, -15 if too far
   - Vibe match: +15 per matching vibe tag
   - Warning penalty: -3 per warning badge

3. **Return Top 3** — Sorted by score, top 3 are returned with a plain-English ranking reason.

### Swapping in Real AI

To replace mock AI with OpenAI, replace the body of `rankActivities()` in `src/lib/mockPlanner.ts` with an API call. The function signature stays the same — components don't need to change.

---

## Future API Plan

| Phase | Integration |
|-------|------------|
| Phase 3 | OpenAI API for natural language understanding and smart plan generation |
| Phase 4 | Google Maps / Places API for real nearby locations and drive-time radius |
| Phase 5 | Weather API for outdoor activity risk warnings |
| Phase 5 | Event APIs for local activities and pop-ups |

---

## Project Structure

```
src/
  App.tsx                — Root app with dark mode state and page routing
  main.tsx               — React entry point
  components/
    Header.tsx           — Sticky header with logo and dark mode toggle
    HomePage.tsx         — Landing page with Chat/Group mode cards
    ModeCard.tsx         — Reusable clickable mode card
    ChatMode.tsx         — Chat input, suggestion chips, and results
    GroupMode.tsx        — Group create, constraints, voting, improve plan
    ActivityCard.tsx     — Single ranked activity with badges and vote button
    WarningBadge.tsx     — Color-coded warning badge with tooltip
    DarkModeToggle.tsx   — Sun/moon icon button
    VotePanel.tsx        — Activity list with vote counts and winner highlight
    ImprovedPlanCard.tsx — Polished plan, nearby options, backup plan
    EmptyState.tsx       — Zero-state display with message and hint
  data/
    activities.ts        — 20 starter activities
  lib/
    types.ts             — All TypeScript interfaces and type aliases
    mockPlanner.ts       — Prompt parser + ranking engine
    groupUtils.ts        — Group code generation and vote management
  styles/
    index.css            — Tailwind base + font settings
tests/
  setup.ts               — jest-dom setup
  mockPlanner.test.ts    — 8 unit tests for parser and ranker
  groupUtils.test.ts     — 7 unit tests for group and vote utilities
  ActivityCard.test.tsx  — 6 component tests
  ChatMode.test.tsx      — 5 component tests
  GroupMode.test.tsx     — 5 component tests
```
