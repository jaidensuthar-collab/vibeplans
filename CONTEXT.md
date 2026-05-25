# VibePlan — Session Context Log

> This file is the single source of truth for any AI agent picking up this project.
> Update the "Current State" section after every significant session.

---

## Project Location

```
/Users/Jaiden/Projects/Summer Planning Site/vibeplan/
```

---

## How to Run

### Backend (FastAPI)
```bash
cd "/Users/Jaiden/Projects/Summer Planning Site/vibeplan"
export PATH="$PATH:/Users/Jaiden/Library/Python/3.14/bin"
PIP_NO_PROXY="*" pip3 install -r backend/requirements.txt   # first time only
uvicorn backend.main:app --reload --port 8000
```

### Frontend (Vite + React)
```bash
cd "/Users/Jaiden/Projects/Summer Planning Site/vibeplan"
export PATH="/Users/Jaiden/cursor-mcp-runtime/node-v22.14.0-darwin-x64/bin:$PATH"
unset HTTP_PROXY HTTPS_PROXY http_proxy https_proxy ALL_PROXY
npm install   # first time only
npm run dev   # runs at http://localhost:5173
```

### Standalone (no install needed)
```bash
open "/Users/Jaiden/Projects/Summer Planning Site/vibeplan/vibeplan-standalone.html"
```

### Network note
- VPN Proxy Master injects `HTTP_PROXY=http://127.0.0.1:8118` — always `unset` before installing
- `PIP_NO_PROXY="*"` bypasses the system-level proxy for pip
- npm works fine once the env vars are unset
- The shell tool inside Cursor has no outbound internet — all installs must run in Terminal.app

---

## Tech Stack

| Layer | Tool | Version |
|---|---|---|
| Frontend | Vite + React + TypeScript | Vite 5, React 18, TS 5 |
| Styling | Tailwind CSS | 3.x (dark mode: class) |
| Backend | FastAPI + Uvicorn | 0.136, 0.47 |
| Database | SQLite via SQLAlchemy async | 2.0 |
| Python | Python | 3.14.3 |
| Node | Node (from cursor-mcp-runtime) | 22.14.0 |
| Tests | Vitest + React Testing Library | 2.x |

---

## File Structure

```
vibeplan/
  vibeplan-standalone.html     ← full app in one HTML file (CDN React, no install)
  index.html                   ← Vite entry
  vite.config.ts               ← proxies /api → localhost:8000
  package.json
  tailwind.config.js
  postcss.config.js
  tsconfig*.json
  CONTEXT.md                   ← this file

  backend/
    main.py                    ← FastAPI app, CORS (allows :5173), lifespan DB init
    database.py                ← SQLAlchemy async engine, get_db dependency
    models.py                  ← ORM: Group (code PK), Constraint, Vote
    schemas.py                 ← Pydantic: Activity, RankedActivity, Group, etc.
    activities.py              ← 75 activities as list[dict]
    mock_planner.py            ← ranking engine (Python port of mockPlanner.ts)
    requirements.txt
    routers/
      activities.py            ← GET /api/activities
      rank.py                  ← POST /api/rank
      groups.py                ← POST/GET /api/groups + constraints/vote/improve

  src/
    App.tsx                    ← page routing (home/chat/group), dark mode state
    main.tsx                   ← React entry
    styles/index.css           ← Tailwind directives
    vite-env.d.ts
    components/
      Header.tsx               ← sticky header, VibePlan logo, dark mode toggle
      HomePage.tsx             ← landing, two mode cards
      ModeCard.tsx             ← clickable card (Chat / Group)
      ChatMode.tsx             ← textarea, suggestion chips, calls api.rankPrompt()
      GroupMode.tsx            ← multi-step: entry→setup→vote→improved
      ActivityCard.tsx         ← title, cost, time, distance, badges, vote button
      WarningBadge.tsx         ← colored pill badge (weather-risk, needs-ride, etc.)
      DarkModeToggle.tsx       ← sun/moon button
      VotePanel.tsx            ← 3 activity cards with vote counts, winner crown
      ImprovedPlanCard.tsx     ← polished plan + nearby options + backup plan
      EmptyState.tsx           ← friendly zero-state
    data/
      activities.ts            ← 75 activities (TypeScript, mirrors backend/activities.py)
    lib/
      types.ts                 ← all shared TypeScript interfaces
      api.ts                   ← typed fetch client (all 7 API endpoints)
      mockPlanner.ts           ← kept for reference / offline fallback
      groupUtils.ts            ← kept for reference / offline fallback

  tests/
    setup.ts
    mockPlanner.test.ts        ← 8 unit tests
    groupUtils.test.ts         ← 7 unit tests
    ActivityCard.test.tsx      ← 6 component tests
    ChatMode.test.tsx          ← 5 component tests
    GroupMode.test.tsx         ← 5 component tests

  README.md
  ROADMAP.md
  BUG_LOG.md
  TEST_REPORT.md
```

---

## API Endpoints

| Method | Path | Body | Returns |
|---|---|---|---|
| GET | `/api/activities` | — | `Activity[]` (all 75) |
| POST | `/api/rank` | `{prompt: str}` | `RankedActivity[]` (top 3) |
| POST | `/api/groups` | `{prompt: str}` | `Group` |
| GET | `/api/groups/{code}` | — | `Group` |
| POST | `/api/groups/{code}/constraints` | `GroupConstraint` | `Group` |
| POST | `/api/groups/{code}/vote` | `{memberId, activityId}` | `Group` |
| POST | `/api/groups/{code}/improve` | — | `ImprovedPlan` |

---

## Key Types (shared between frontend and backend)

```typescript
// src/lib/types.ts (TypeScript) — mirrored in backend/schemas.py (Pydantic)
Activity          { id, title, summary, vibes[], estimatedCostMin/Max, timeNeeded,
                    distanceType, bestFor, effortLevel, indoorOutdoor, warnings[], planningNotes }
RankedActivity    { activity, score, rankingReason }
Group             { id, code, prompt, constraints[], topActivities[], votes[], winningActivityId? }
GroupConstraint   { memberId, name, maxBudget?, maxDistanceMinutes? }
Vote              { memberId, activityId }
ImprovedPlan      { activityTitle, polishedPlan, nearbyOptions[], backupPlan }
```

---

## Ranking Logic (mock_planner.py / mockPlanner.ts)

Base score: 50  
+20 if estimatedCostMax ≤ budget  
+5 if estimatedCostMin ≤ budget  
-20 if over budget  
+15 if distanceType fits within maxMinutes  
+5 if slightly over maxMinutes (×1.3)  
-15 if too far  
+15 per matching vibe tag  
+10 if no vibes specified (neutral)  
-3 per warning badge  

---

## SQLite Schema

```
groups       (code TEXT PK, id TEXT, prompt TEXT, created_at DATETIME)
constraints  (id INT PK, group_code FK, member_id TEXT, name TEXT,
              max_budget INT?, max_distance_minutes INT?)
             UNIQUE(group_code, member_id) — upsert on change
votes        (id INT PK, group_code FK, member_id TEXT, activity_id TEXT)
             UNIQUE(group_code, member_id) — one vote per member
```

---

## How to Run Tests

```bash
# Pure function tests (no server, instant)
cd "/Users/Jaiden/Projects/Summer Planning Site/vibeplan"
python3 tests/test_functions.py

# HTTP integration tests (no live server needed — uses TestClient)
python3 tests/test_api.py

# Frontend tests (needs npm install)
export PATH="/Users/Jaiden/cursor-mcp-runtime/node-v22.14.0-darwin-x64/bin:$PATH"
npm run test
```

## Logging

- All backend functions emit structured logs: `TIMESTAMP | LEVEL | module | message`
- Console: INFO and above
- File: `logs/vibeplan.log` (DEBUG and above, full detail)
- Key log names: `vibeplan.app`, `vibeplan.planner`, `vibeplan.routes.activities`, `vibeplan.routes.rank`, `vibeplan.routes.groups`

---

## Current State

**Phase 1 complete and tested:**
- [x] Standalone HTML works (open vibeplan-standalone.html in browser, no install)
- [x] 194 activities in frontend (activities.ts) — backend/activities.py needs sync to match
- [x] FastAPI backend running (must `cd vibeplan/` before uvicorn)
- [x] Structured logging in every backend function → `logs/vibeplan.log`
- [x] Frontend updated to call API (ChatMode, GroupMode use api.ts)
- [x] SQLite persistence for groups/votes/constraints
- [x] Dark mode, mobile layout, warning badges, improved plan
- [x] 42 pure-function tests — ALL PASSED, logs clean
- [x] 24 HTTP integration tests — ALL PASSED, logs clean
- [x] pip packages installed (FastAPI, SQLAlchemy, httpx, etc.)
- [x] npm packages installed (Vite, React, Tailwind, etc.)

**Known issues:**
- Must `cd vibeplan/` before running uvicorn (ModuleNotFoundError otherwise)
- Proxy blocks pip/npm — always `unset HTTP_PROXY HTTPS_PROXY http_proxy https_proxy ALL_PROXY` first
- `PIP_NO_PROXY="*"` needed for pip installs

---

## Roadmap Summary

| Phase | Focus | Status |
|---|---|---|
| 1 | Frontend demo + Mock AI + Mock voting | Done |
| 2 | Supabase/Firebase — real groups, persistent votes | Not started |
| 3 | OpenAI API — replace mock ranking | Not started |
| 4 | Google Maps/Places — real nearby locations | Not started |
| 5 | Weather API + Events API + Calendar sharing | Not started |

---

## Activity Categories (194 total)

Original 20: Sunset Snack Run, Random Playlist Drive, Park Picnic, Thrift Outfit Challenge, DIY Photo Hunt, Coffee Card Game, Mini Golf, Bowling, Late-Night Dessert, Lake/Pool Day, Outdoor Movie Night, Board Game Cafe, Farmers Market, Content Creation Walk, Mall Challenge, Picnic+Painting, Park Sports, Bookstore Roulette, Ice Cream Crawl, Sunrise Breakfast

Batch 2 — generic (17): Escape Room, Karaoke Night, Food Truck Hop, Bike Ride, Stargazing, DIY Cooking Challenge, Arcade, Roller Skating, Pickleball/Tennis, Go-Karts, Night Market, Tie-Dye Day, Trivia Night, Hiking, DIY Photoshoot, Garage Sale Hunt, Night Swim

Austin-specific — Thrills, Water, Venues, Nature, Culture, Food (87): Lake Travis Zipline, Waterloo Adventures, iFLY Indoor Skydiving, Devil\'s Waterhole Cliff Jump, Pace Bend Cliffs, Barton Creek Rock Climbing, Austin Bouldering Project, Rage Room, K1 Speed Karting, Zip Lost Pines, San Marcos River Float, Comal River Float, Barton Springs Pool, Lady Bird Lake Kayak, Bull Creek Swimming, Hamilton Pool, Deep Eddy Pool, Guadalupe River Tubing, Pinballz Arcade, Axe Escape Austin, Topgolf Austin, The Escape Game Austin, Peter Pan Mini Golf, Main Event, Alamo Drafthouse, Sandbox VR, Round1 Bowling, Blazer Tag, Enchanted Rock Hike, McKinney Falls, Natural Bridge Caverns, Inner Space Cavern, Pedernales Falls, Lockhart BBQ, Schlitterbahn, Wimberley Blue Hole, Gruene Hall, Mount Bonnell, Barton Creek Greenbelt, Congress Bridge Bats, Walnut Creek MTB, Pfluger Bridge, Shoal Creek Trail, Zilker Park Day, Stubb\'s Amphitheater, Continental Club, 6th Street Night Out, East 6th Food Crawl, Red River Cultural District, UT Tower Observation Deck, SoCo Vintage Crawl, Austin Graffiti Park, Texas Capitol Explore, Austin Ghost Tour, Blanton Museum, Austin FC Game, Texas Longhorns Game, Austin Paintball, Indoor Archery, Beach Volleyball Fiesta Gardens, Skateboarding Austin, Midnight Swim Barton Springs, Night Cycling Lady Bird, Slacklining Pease Park, Sunrise Barton Creek, Parkour Downtown, Night Fishing Lake Travis, Hammock Camping McKinney, Franklin Barbecue, Austin Taco Crawl, Late Night Kerbey Lane, Whole Foods Flagship, East Austin Food Halls, Amy\'s Ice Creams Crawl, Haunted House, Cap City Comedy, ColdTowne Improv, Trampoline Park, Outdoor Movie Austin, Austin Urban Hike, Hill Country Winery, The Veloway, Lone Star Riverboat, Barton Creek Night Hike, Austin Trivia Bar Tour, Inner Space Wild Cave Tour, SUP Yoga Lady Bird

Generic batch 3 (70): Disc Golf, Hammock Day, Campfire Night, Kayaking, Paddleboarding, Overnight Camping, Laser Tag, Axe Throwing, Board Game Home Night, Card Tournament, Video Game Tournament, Puzzle Race, Vending Machine Roulette, Pottery Class, Candle Making, Vision Board Party, Film Camera Day, Friendship Bracelets, Short Film Project, Time Capsule, Boba Crawl, Late-Night Diner Run, International Snack Haul, Backyard BBQ, Chopped Cooking Night, Open Mic Night, Free Concert, Music Video Shoot, Backyard Jam Session, Movie Marathon, DIY Spa Day, Blanket Fort Night, All-Nighter, Volunteer Day, Dog Shelter Visit, Clothing Swap, Yes Day, Spin the Wheel Restaurant, Geocaching, Murder Mystery Night, Record Store Dig, Night Sky Photography, Spikeball Tournament, Random Road Trip, Thrift Style-Each-Other, Swimming Hole Hunt, Cooking Class, Rooftop Bar Hop

Austin-specific batch 2 (17): Cathedral of Junk, East Austin Mural Tour, Bullock Museum + IMAX, Garner State Park, Lost Maples Fall Hike, Fossil Rim Wildlife Safari, San Antonio Riverwalk Day Trip, Fredericksburg Main Street, Wimberley Square Wander, Mueller Lake Park, South Lamar Food Trucks, Onion Creek Greenbelt, Lake Austin Boat Rental, UMLAUF Sculpture Garden, Rainey Street Patio Crawl, Longhorn Cavern State Park, Inks Lake Day Trip, Big Bend Road Trip, Volente Beach Waterpark, Austin Steam Train, Republic Square Farmers Market, Bat Watch + Dinner
