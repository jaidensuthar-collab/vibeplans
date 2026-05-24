# VibePlan Roadmap

---

## Phase 1 — Working Demo (Current)

**Status: Complete**

- [x] Vite + React + TypeScript + Tailwind setup
- [x] Homepage with Chat Mode and Group Mode pathways
- [x] 20+ starter activities database
- [x] Mock AI ranking engine (budget, distance, vibe scoring)
- [x] Chat Mode with natural language input and Top 3 results
- [x] Activity cards with warning badges
- [x] Group Mode: create group code, add constraints, vote on top 3
- [x] Improve Winning Plan feature
- [x] Dark mode toggle
- [x] Empty states and error states
- [x] Mobile-first responsive layout
- [x] Unit and component tests

---

## Phase 2 — Real Backend

**Goal:** Persist groups, votes, and saved plans across sessions and devices.

- [ ] Add Supabase or Firebase
- [ ] Real group links (shareable URLs instead of codes)
- [ ] Persistent voting — votes survive page refresh
- [ ] Saved plans — users can bookmark or share a plan
- [ ] Basic user identity (optional anonymous auth)
- [ ] Group history — see past group plans

---

## Phase 3 — OpenAI Integration

**Goal:** Replace mock AI with real natural language understanding and smart plan generation.

- [ ] Integrate OpenAI API in `src/lib/mockPlanner.ts` (drop-in replacement)
- [ ] Better prompt parsing using GPT function calling
- [ ] Smart plan generation based on group constraints and winning vote
- [ ] Personalized ranking explanations
- [ ] Conversational follow-up ("What if we had more budget?")

---

## Phase 4 — Google Maps / Places

**Goal:** Add real nearby location data and drive-time radius filtering.

- [ ] Google Maps Places API integration
- [ ] Real nearby places for each activity type
- [ ] Drive-time radius from user's starting location
- [ ] Austin mode — curated local spots for Austin, TX
- [ ] Map preview on activity cards

---

## Phase 5 — Weather, Events, and Sharing

**Goal:** Make plans smarter and shareable.

- [ ] Weather API — warn about rain/heat for outdoor activities
- [ ] Local events API — pull in concerts, markets, pop-ups
- [ ] Calendar integration — add plan to Google Calendar
- [ ] SMS / group chat sharing — send the plan link to a thread
- [ ] Push notifications — "The group picked a winner!" alerts

---

## Long-Term Vision

- Mobile app (React Native or PWA)
- User profiles and friend lists
- Reputation system — rate completed plans
- City-by-city expansion (Austin → other cities)
- Business partnerships — sponsored activity suggestions
