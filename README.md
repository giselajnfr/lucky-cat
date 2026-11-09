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

## Demo data (for client presentations)
In the Supabase SQL Editor, with your account already set to ADMIN:
1. Run `supabase/demo/seed_demo_data.sql` — creates 7 demo games across 6 cafe tables (3 playing, 1 paused, 1 empty, 1 finished) with hands, fan details and scores. Safe to re-run.
   Scores follow HK18 (1 point per faan), so they look small; set `mult int := 100` near the top of the script for bigger numbers.
2. Open `/admin`, `/admin/tables` and `/tv`.
3. With `/tv` open, run `supabase/demo/trigger_hu_demo.sql` to fire a live "HU!" highlight (change `tn` for another table).
4. When done, run `supabase/demo/remove_demo_data.sql`.

## Rooms, joining and editing hands
- **Admins open tables.** Admin → Live Tables → *Buka meja* on an empty table, fill in the four players. The table card then shows the **room code**.
- **Players join with the code** (Beranda → *Gabung dengan kode*, or the shared link). Anyone who joined can record, edit and undo hands; only the owner/admin can pause or finish the game.
- **Editing a hand** (*Ubah* in the hand history) replays the whole game from hand 1, so dealer, seat winds, payments and every score after it are recomputed. Finished games are locked.
- Run `supabase/migration_004_rooms_and_edits.sql` after migration 003. It also needs `SUPABASE_SERVICE_ROLE_KEY` on the server (already required for recording hands).
- Demo-seeded games store tile lists but no hand details, so their hands can be viewed but not edited.
