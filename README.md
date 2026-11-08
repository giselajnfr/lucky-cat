# 🀄 Lucky Cat Mahjong — Your Mahjong Companion

Game Tracker · HK18 score calculator · statistics · House Rules guide. Next.js 14 + TypeScript + Tailwind + Supabase.

## Run locally
1. `npm install`
2. Create a Supabase project. In **SQL Editor** run, in order: `supabase/schema.sql`, `supabase/migration_002_admin_tv.sql`, `supabase/migration_003_game_tracker.sql`.
3. Copy `.env.example` to `.env.local` and fill in all three values (URL, anon key, **service-role key**).
4. Auth → URL Configuration: add `http://localhost:3000/auth/callback`. For Google login add the provider in Auth → Providers.
5. `npm run dev` → http://localhost:3000

Optional check of the database rules: run `supabase/tests/smoke_test_003.sql` in the SQL editor of a **dev** project (edit the two user UUIDs at the top; it rolls back).

## Deploy to Vercel
Push to GitHub, import in Vercel, add the three env vars (the service-role key must NOT be public), deploy, then add `https://YOUR-APP.vercel.app/auth/callback` to Supabase Redirect URLs. Apply migration 003 to the production database **before** deploying.

## Where things live
| Area | Location |
|---|---|
| HK18 rules (single source of truth, edit faan here) | `lib/scoring/hk18Rules.ts` |
| Scoring engine (pure, deterministic) | `lib/scoring/*` |
| Dealer/round progression, per-game scoring, settlement | `lib/game-engine/*` |
| Statistics aggregation | `lib/stats/aggregate.ts` |
| Server-side hand recording (recalculates everything) | `app/api/games/[id]/hands/route.ts` |
| Atomic DB functions + RLS | `supabase/migration_003_game_tracker.sql` |
| Tile art, tile input, scorecard image | `components/mahjong`, `components/calculator`, `lib/scorecard` |

## Rules decisions you can change (all in `hk18Rules.ts`)
Anything the HK18 table does not define is a config flag, listed on the in-app *Aturan → Perlu konfirmasi* section: dragon/wind pong stacking with Little/Great hands, whether a Chicken Hand may win on bonus faan, payment multipliers (default: points = faan, discarder pays all, each opponent pays on self draw), all-chows pair rule, last-tile definition.

## Tests
`npm test` (vitest): scoring engine, game engine, statistics, request validation.
