# 🀄 Lucky Cat Mahjong — Your Mahjong Companion

Game Tracker · HK18 score calculator · statistics · House Rules guide. Next.js 14 + TypeScript + Tailwind + Supabase.

## Run locally
1. `npm install`
2. Create a Supabase project. In **SQL Editor** run, in order: `supabase/schema.sql`, then every migration from `002` up to `014`, in numeric order (all in `supabase/`). Later sections below explain what each one adds.
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

## Rulesets (Hong Kong Classic / New 6 / New 18)
Run `supabase/migration_007_rulesets.sql` (after 006) **before** deploying: it adds `games.ruleset` (existing games become `new18` and keep their own cap) and gives `setup_game` a `p_ruleset` argument.
- **All rules live in `lib/scoring/rulesets.ts`**: one catalog of patterns, and per ruleset the patterns it recognises, fan values, minimum (`minimumFanToWin`), default cap (`maximumFan`), `specialRules`, `stackingRules` and `conflicts`. Detection code for each pattern id is in `hk18Patterns.ts`; wait types in `waits.ts`.
- Classic = foundation hands · New 6 = Classic + 6 patterns (258 pair, Concealed Hand, Single Wait, Fully Concealed, All Simples, Lacking a Suit) · New 18 = New 6 + the "eighteen" (double chi, min-max, three/four sequence pungs, concealed triplets, orphans, all terminals...). The legacy `hk18Rules.ts` table is kept as the source of the foundation values.
- The engine detects every pattern, drops conflicting ones (each rule's `excludes` + the ruleset's `conflicts`), sums the rest (Raw Fan) and applies the cap (Final Fan). Each pattern reports *why* it qualified.
- The table picks the ruleset when it starts a game (default New 18). The cap defaults to the ruleset's maximum; the table may also choose no cap or another number.
- Sources: TileBuddy Faan Wiki (rule-style labels Classic/New 6/New 18) and the Hong Kong mahjong pages on Wikipedia. Hong Kong tables differ, so every disputed value is a plain number/flag in `rulesets.ts`; the *Catatan interpretasi* section of the House Rules page lists the interpretations used.
- Not implemented (need extra input, not derivable from tiles): Blessing of Heaven/Earth, Win by Gong Replacement, Fully Exposed, Seven-Flowers instant win.

## TV display (`/tv`)
Run `supabase/migration_008_tv_main_leaderboard.sql` once (adds the `main` mode). Admin → TV Display picks the mode: **Live · Per Table**, **Live · Main Leaderboard** (all players from all tables, ranked by points won/lost against each table's starting points), Table Spotlight, Today's Stats, Auto Rotate. For two screens use `/tv?view=tables` and `/tv?view=main`: the link overrides the admin mode for that screen only.

## Rules decisions you can change (all in `hk18Rules.ts`)
Anything the HK18 table does not define is a config flag, listed on the in-app *Aturan → Perlu konfirmasi* section: dragon/wind pong stacking with Little/Great hands, whether a Chicken Hand may win on bonus faan, payment multipliers (default: faan converted with the Hong Kong faan-to-points table, e.g. 5 faan = 24 points base; discarder pays all, each opponent pays on self draw), all-chows pair rule, last-tile definition.

## Tests
`npm test` (vitest): scoring engine, game engine, statistics, request validation.

## Demo data (for client presentations)
In the Supabase SQL Editor, with your account already set to ADMIN:
1. Run `supabase/demo/seed_demo_data.sql` — creates 7 demo games across 6 cafe tables (3 playing, 1 paused, 1 empty, 1 finished) with hands, fan details and scores. Safe to re-run.
   The demo script scores each hand as 1 point per faan, which is simpler than the live app (the live app uses the faan-to-points table: 3 faan = 8, 4 = 16, 5 = 24, 6 = 32 ... base points), so demo scores look small; set `mult int := 100` near the top of the script for bigger numbers.
2. Open `/admin`, `/admin/tables` and `/tv`.
3. With `/tv` open, run `supabase/demo/trigger_hu_demo.sql` to fire a live "HU!" highlight (change `tn` for another table).
4. When done, run `supabase/demo/remove_demo_data.sql`.

## Rooms, joining and editing hands
**1. Admin opens a room** (Admin → Live Tables → *Buka ruang*). The admin only picks the **play time** (1/2/3/4 hours, custom, or no limit). The table card then shows the **room code**.
- The play time is a **guide, not a lock**. Players see a countdown (`h:mm:ss`) on their phone; when it hits zero it keeps counting as overtime and nothing is paused or closed.
- Admin can add time any moment from the table card (**+30 menit / +1 jam / +2 jam**, or *Atur…* for an exact total, empty = no clock).

**2. Players join with the code** (Beranda → *Gabung dengan kode*, or the shared link) and the first screen is the table setup:
- type the four player names around the table (East deals first; names from your earlier games are suggested),
- pick the rule book: **Chicken Hand** (no faan: every valid win is 1 point), **Beginner** (minimum 3 faan) or **Advanced** (minimum 5 faan),
- pick the **starting points** (default 1.000; or 0 / 5.000 / 10.000 / any number) and whether to use a **faan cap** (8 / 10 / 13 / custom). A hand worth more than the cap is paid as the cap,
- *Mulai sesi*. The first player to submit wins; everybody else at the table sees the same scoreboard live. 

**3. Playing.** Anyone who joined can record, edit and undo hands; only the owner/admin can pause or finish the game.
- **Editing a hand** (*Ubah* in the hand history) replays the whole game from hand 1, so dealer, seat winds, payments and every score after it are recomputed. Finished games are locked.
- **Editing hands:** every hand has an **Ubah** button, also after the game is finished. Saving replays the whole game from hand 1 (dealer, seat winds, payments, later scores) and, for a finished game, recalculates the final ranking. The finished-game summary links to it (*Lihat dan ubah tangan*).
- **Finishing:** the game never ends by itself. Anyone at the table can press **Akhiri game** at any time (a dialog shows the current ranking first); final ranks are saved and the game is locked. There is no Jeda (pause) button any more. The old "game ends after round" choice was removed from the setup screen.
- **Logout:** tap the avatar on the home screen (*Keluar dari akun*), or *Keluar* in the admin sidebar.
- **House scoring rules (confirmed):** Little/Great Dragon do not count each Dragon Pong again; Little/Great Wind do not count Seat Wind or Round Wind again; Seven Pairs, Nine Gates and Thirteen Orphans already include Concealed Hand, so it is not added; **Self Draw + Concealed Hand combine into Fully Concealed Self Draw = 3 faan** (Classic has no such rule; New 6 and New 18 both do, and New 18 contains every New 6 rule); Chicken Hand may still win when bonus faan reach the minimum. The two stacking switches are in `lib/scoring/hk18Rules.ts` (`dragonPongStacksWithDragonHands`, `windPongStacksWithWindHands`, both `false`).
- **Flower and season tiles** are drawn pictures (plum, orchid, chrysanthemum, bamboo, spring sprout, sun, maple leaf, snowflake) in `components/mahjong/tileArt.ts`, with the character in the corner and the circled seat number below.
- **Quick-score codes:** *Hitung skor cepat* asks for a 6-character code that an admin generates in Admin → *Kode Kalkulator* (label, validity 3 jam to 30 hari, max number of people, copy, revoke). Players enter it once and keep access until it expires or is revoked; admins never need one. Run `supabase/migration_006_quick_score_codes.sql`. The calculator itself runs in the browser, so the code controls who is offered the page; it is not a secret-protecting barrier.
- **Entering tiles:** the calculator takes ONE flat list of tiles (no Chi / Pong / Gong buttons). Chis and pongs are found by the scoring engine. A gong is recognised from the count: 14 tiles = no gong, 15 = one four-of-a-kind is a gong, 16 = two, up to 18 (`lib/scoring/inferMelds.ts`). If several four-of-a-kinds could be the gong, the best-scoring reading wins.
- **Opened sets:** because the list is flat, the app cannot see which sets were taken from a discard. The *Tangan tertutup* row under *Poin tambahan* is a checkbox (on by default for discard wins); untick it when any set was taken from a discard. It is stored with the hand (`openMelds`) so edits and replays stay correct.
- The minimum faan and the cap are stored per game and enforced on the server (the browser only previews).
- Run `supabase/migration_005_room_setup_and_clock.sql` after migration 004. It also needs `SUPABASE_SERVICE_ROLE_KEY` on the server (already required for recording hands).
- Demo-seeded games store tile lists but no hand details, so their hands can be viewed but not edited.
- Chicken Hand: faan are not counted and there is no cap. Every valid win is worth 1 point (`flatPointsPerWin` in the scoring config), paid from the bank: the winner gets +1 (discard or self draw) and **nobody pays**, so Chicken Hand is not zero-sum. Run `supabase/migration_014_chicken_bank_and_join_limit.sql` for this (the database otherwise requires every hand to balance to zero).
- Beginner / Advanced: the minimum faan is checked **without** flower points (Suitable Flower, No Flower, Full Flowers). Those are added to the total afterwards, only when the hand already reached the minimum with other faan.
- Seven Pairs needs seven different pairs; four identical tiles do not count as two pairs.
- Room codes: after 7 wrong codes within 1 minute a user must wait 1 minute (migration 014).


Run `supabase/migration_010_discard_payment_mode.sql` after migration 009 to add the per-table discard settlement choice (Discarder Pays All or Split) and update `setup_game`.

## Languages (ID / EN)
- Dictionary keys (`lib/i18n/dictionary.ts`): home page, rules guide, nav, auth. Everything else uses the phrase table (`lib/i18n/phrases.ts`, `phrasesExtra.ts`) applied by `<AutoTranslate/>` in English mode.
- `npm run check:i18n` lists Indonesian text in the source that English mode cannot translate yet (add a line to `phrasesExtra.ts`). Template-string fragments in the output are usually fine: test the full rendered text.
- Database/API errors: wrap with `errText(message)` from `lib/i18n/errors.ts` (Indonesian translation of Supabase `RAISE EXCEPTION` text; add a line when you add a new exception).
- Number/date formatting uses `appLocale()`; on the server it reads the request cookie, so concurrent requests cannot mix languages.
- Rule names (Chicken Hand, Pong…) intentionally stay in English mahjong terminology in both languages.
