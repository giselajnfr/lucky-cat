/**
 * Hong Kong rulesets — Classic (舊章), New 6 (新章六) and New 18 (新章十八).
 *
 * ONE catalog of patterns (their detection lives in hk18Patterns.ts), and each ruleset picks the patterns it recognises,
 * with its own fan values, minimum, cap, special-hand switches, stacking switches and conflicts. The scoring engine only
 * ever reads the GameConfig built by `configFromRuleset`, so adding or changing a rule means editing THIS file.
 *
 * How the three relate (source: TileBuddy Faan Wiki "HK rule style" filter + the Hong Kong mahjong pages on Wikipedia):
 *   Classic = the foundation hands every Hong Kong table plays.
 *   New 6   = Classic + six extra patterns (258 pair, Concealed Hand, Single Wait, Fully Concealed, All Simples, Lacking a Suit).
 *   New 18  = New 6 + the "eighteen" extra patterns (double chi, min-max, three/four sequence pungs, concealed triplets, orphans...).
 * The foundation hands keep the HOUSE values of this app (hk18Rules.ts), identical in all three rulesets.
 * Anything that sources disagree on (cap 8/10/13, Great Four Winds 13 vs 15, Seven Pairs, ...) is a plain number or flag below.
 */
import { FAN_TABLE, DEFAULT_GAME_CONFIG } from "./hk18Rules";
import type { FanRuleConfig, GameConfig, RuleConflict, RulesetId, WaitType } from "./types";

const legacy = (id: string) => { const r = FAN_TABLE.find((x) => x.id === id); if (!r) throw new Error(`Unknown legacy rule ${id}`); return r; };
const np = (id: string, name: string, fan: number, summary: string, conditions: string[], example: FanRuleConfig["example"], extra: Partial<FanRuleConfig> = {}): FanRuleConfig =>
  ({ id, name, fan, enabled: true, category: "pattern", summary, conditions, example, ...extra });
const na = (id: string, name: string, fan: number, summary: string, conditions: string[], example: FanRuleConfig["example"], extra: Partial<FanRuleConfig> = {}): FanRuleConfig =>
  ({ id, name, fan, enabled: true, category: "additional", summary, conditions, example, ...extra });
const BASE = "123m 456p 789s 111p 55s";

/** Rules that do not exist in the legacy HK18 table. */
const NEW_RULES: FanRuleConfig[] = [
  np("pair-258", "2-5-8 Pair (二五八將)", 1, "Pasangan (mata) berupa angka 2, 5 atau 8.", ["Pasangan adalah kartu angka 2, 5 atau 8", "Angin dan naga tidak dihitung"], { hand: BASE, win: "5s" }),
  na("single-wait", "Single Wait (單釣)", 1, "Menang dengan menyelesaikan pasangan: kartu menang adalah kartu mata yang ditunggu.", ["Kartu menang melengkapi pasangan"], { hand: BASE, win: "5s" }),
  na("closed-wait", "Closed Wait (坎張)", 0, "Kartu menang mengisi tengah sebuah chi (mis. 2 pada 1-_-3).", ["Kartu menang di tengah chi"], { hand: BASE, win: "2m" }, { enabled: false }),
  na("edge-wait", "Edge Wait (邊張)", 0, "Kartu menang melengkapi chi 1-2-3 dengan angka 3, atau 7-8-9 dengan angka 7.", ["3 pada 1-2-3 atau 7 pada 7-8-9"], { hand: BASE, win: "3m" }, { enabled: false }),
  na("two-sided-wait", "Two-Sided Wait (兩面)", 0, "Kartu menang melengkapi chi yang bisa dilengkapi dari dua sisi.", ["Kartu menang di ujung chi, bukan tepi (edge)"], { hand: BASE, win: "4p" }, { enabled: false }),
  np("double-chow", "Double Chi (一般高)", 1, "Dua chi identik dalam satu jenis.", ["Dua chi identik"], { hand: "345s 345s 678p 789m 55p", win: "5p" }),
  np("double-double-chows", "Double Double Chis (雙龍抱)", 10, "Dua pasang chi kembar dari jenis angka berbeda.", ["Dua pasang chi identik", "Double Chi tidak dihitung lagi (sudah termasuk)"], { hand: "123m 123m 456p 456p 55s", win: "5s" }),
  np("four-into-one", "Four into One (四歸一)", 1, "Empat kartu sama terbagi dalam satu pong dan satu chi.", ["Pong dan chi memakai kartu yang sama", "Keempat kartu itu ada di tangan"], { hand: "111p 123p 456s 789s 55p", win: "5p" }),
  np("min-max-chow", "Min-Max Chi (么九順)", 1, "Chi 1-2-3 dan 7-8-9 dalam satu jenis.", ["Chi 123 dan 789 satu jenis"], { hand: "123s 789s 456p 111p 55s", win: "5s" }),
  np("min-max-pung", "Min-Max Pung (么九刻)", 1, "Pong/gong angka 1 dan 9 dalam satu jenis.", ["Pong 1 dan pong 9 satu jenis"], { hand: "111p 999p 456s 234s 55p", win: "5p" }),
  np("three-sequence-pung", "Three Sequence Pung (三連刻)", 2, "Tiga pong/gong berurutan dalam satu jenis.", ["Tiga pong angka berurutan satu jenis"], { hand: "333s 444s 555s 456p 55p", win: "5p" }),
  np("four-sequence-pung", "Four Sequence Pung (四連刻)", 8, "Empat pong/gong berurutan dalam satu jenis.", ["Empat pong angka berurutan satu jenis", "Three Sequence Pung tidak dihitung lagi"], { hand: "222p 333p 444p 555p 66s", win: "6s" }),
  na("three-concealed-pungs", "Three Concealed Pungs (三暗刻)", 2, "Tiga pong/gong tertutup. Dicentang pemain: pong yang diselesaikan kartu buangan lawan dianggap terbuka.", ["Minimal tiga set pong/gong di tangan", "Ketiganya tertutup (tidak diambil dari buangan)", "Dicentang manual di Poin tambahan"], undefined),
  na("heavenly-hand", "Heavenly Hand (天胡)", 13, "Dong menang dengan tangan awalnya.", ["Pemenang adalah dong", "Menang dengan 14 kartu awal"], undefined),
  na("earthly-hand", "Earthly Hand (地胡)", 13, "Pemain non-dong menang dari buangan pertama dong.", ["Pemenang bukan dong", "Menang dari buangan pertama dong"], undefined),
  na("fully-exposed", "All from Others", 1, "Semua set dibuka, menang dari buangan untuk melengkapi pasangan.", ["Semua set diambil dari buangan", "Menang dari buangan, kartu menang melengkapi pasangan"], undefined),
  np("three-suits-pung", "Three Suits Pung (三同刻)", 3, "Tiga pong/gong angka yang sama di tiga jenis berbeda.", ["Pong angka sama di karakter, bambu dan lingkaran"], { hand: "555m 555p 555s 123p 99m", win: "9m" }),
  np("three-suits-chow", "Three Suits Chi (三同順)", 3, "Tiga chi yang sama di tiga jenis berbeda.", ["Chi identik di karakter, bambu dan lingkaran"], { hand: "234m 234p 234s 678p 55s", win: "5s" }),
  np("all-concealed-triplets", "All Concealed Triplets (坎坎胡)", 10, "Keempat set adalah pong/gong tertutup. Harus Self Draw atau menang pada pasangan.", ["4 pong tertutup", "Pong yang diselesaikan buangan lawan tidak tertutup", "Three Concealed Pungs dan All Pongs tidak dihitung lagi"], { hand: "111m 222p 333s 444m 55p", win: "5p", method: "SELF_DRAW" }),
  np("lacking-a-suit", "Lacking a Suit (缺一門)", 1, "Hanya dua dari tiga jenis angka, tanpa angin atau naga.", ["Tepat dua jenis angka", "Tidak ada kartu kehormatan"], { hand: "123m 456m 789p 234p 55m", win: "5m" }),
  np("all-types", "All Types (五門齊)", 1, "Ada ketiga jenis angka (karakter, bambu, lingkaran), angin dan naga sekaligus dalam satu tangan.", ["Karakter, bambu dan lingkaran: ketiganya ada", "Minimal satu kartu angin dan satu kartu naga"], { hand: "123m 456p 789s EEE RD RD", win: "RD" }),
  np("all-terminals", "Orphans (清么九)", 10, "Seluruh tangan hanya pong atau gong dari kartu 1 dan 9 (tanpa angin dan naga).", ["Semua set adalah pong atau gong dari kartu 1 atau 9", "Pasangan juga kartu 1 atau 9", "Pure Orphans, Mixed Orphans dan All Pongs tidak dihitung lagi"], { hand: "111m 999m 111p 999p 11s", win: "1s" }),
  na("fully-concealed", "Fully Concealed (門前清自摸)", 3, "Self Draw dengan tangan tertutup (tanpa set dari buangan) = 3 faan. Self Draw + Concealed Hand digabung menjadi Fully Concealed dan menggantikan keduanya.", ["Menang dengan kartu ambil sendiri", "Tidak ada set yang diambil dari buangan"], { hand: BASE, win: "5s", method: "SELF_DRAW" }),
  na("full-flowers", "Full Flowers / Full Seasons (一檯花)", 2, "Memiliki keempat bunga atau keempat musim.", ["Bunga 1-4 lengkap, atau musim 1-4 lengkap", "2 faan untuk masing-masing set lengkap"], { hand: BASE, win: "5s", flowers: "F1 F2 F3 F4" }, { perUnit: true }),
  na("eight-flowers", "All 8 Flowers & Seasons (八仙過海)", 8, "Memiliki kedelapan bunga dan musim. Menggantikan Full Flowers / Full Seasons.", ["Semua 8 kartu bunga dan musim"], { hand: BASE, win: "5s", flowers: "F1 F2 F3 F4 S1 S2 S3 S4" }),
];
const CATALOG = new Map<string, FanRuleConfig>([...FAN_TABLE, ...NEW_RULES].map((r) => [r.id, r]));
const get = (id: string, over: Partial<FanRuleConfig> = {}): FanRuleConfig => { const r = CATALOG.get(id); if (!r) throw new Error(`Unknown rule ${id}`); return { ...r, ...over }; };

/** Foundation hands: the same in all three rulesets. */
const FOUNDATION = ["chicken-hand", "all-chows", "all-pongs", "half-flush", "full-flush", "little-dragon", "great-dragon", "little-wind", "great-wind", "all-honors", "seven-pairs",
  "nine-gates", "thirteen-orphans", "four-kongs", "seat-wind", "round-wind", "dragon-pong", "suitable-flower", "no-flower", "full-flowers", "eight-flowers", "self-draw", "self-draw-after-kong", "last-tile", "robbing-kong", "heavenly-hand", "earthly-hand"];
/** The six extra patterns of New 6. */
const NEW6_EXTRA = ["pair-258", "concealed-hand", "single-wait", "fully-concealed", "all-simples", "lacking-a-suit"];
/** What New 18 adds on top of New 6 (Snake Hand 一條龍 is the app's Pure Straight). All from Others and Three Concealed Pungs are ticked by hand (MANUAL_FAN_IDS). */
const NEW18_EXTRA = ["pure-straight", "double-chow", "four-into-one", "min-max-chow", "min-max-pung", "three-sequence-pung", "three-concealed-pungs", "fully-exposed", "three-suits-pung", "three-suits-chow",
  "four-sequence-pung", "all-concealed-triplets", "double-double-chows", "all-types", "mixed-orphans", "pure-orphans", "all-terminals", "closed-wait", "edge-wait", "two-sided-wait"];

export type RulesetConfig = {
  id: RulesetId; name: string; nameZh: string; emoji: string; description: string;
  minimumFanToWin: number;
  /** Default faan cap. A table may still choose its own cap when it starts a game. */
  maximumFan: number | null;
  specialRules: {
    sevenPairs: boolean; thirteenOrphans: boolean; pair258: boolean; doubleChow: boolean; waitBonuses: boolean; flowerBonuses: boolean;
    chickenHandCanWinOnBonusFaan: boolean; allChowsRequiresPlainPair: boolean;
    singleWaitMode: "pair" | "only-one-tile";
    waitFan: Record<Exclude<WaitType, "dualPung">, number>;
  };
  scoringRules: FanRuleConfig[];
  stackingRules: { dragonPongStacksWithDragonHands: boolean; windPongStacksWithWindHands: boolean };
  conflicts: RuleConflict[];
  /** Interpretations that sources disagree on, shown on the House Rules page. */
  notes: string[];
};

const CONFLICTS_COMMON: RuleConflict[] = [
  { rule: "eight-flowers", supersedes: ["full-flowers"], reason: "Delapan bunga menggantikan bonus empat bunga / empat musim" },
  { rule: "seven-pairs", supersedes: ["single-wait", "all-types", "lacking-a-suit"], reason: "Seven Pairs selalu menunggu satu pasangan; dibayar sebagai satu tangan khusus" },
];
const CONFLICTS_NEW6: RuleConflict[] = [
  { rule: "fully-concealed", supersedes: ["self-draw", "concealed-hand"], reason: "Fully Concealed sudah mencakup Self Draw dan Concealed Hand" },
  { rule: "thirteen-orphans", supersedes: ["all-types", "lacking-a-suit", "pair-258", "single-wait"], reason: "Thirteen Orphans adalah tangan khusus: pola susunan tidak berlaku" },
];
const CONFLICTS_NEW18: RuleConflict[] = [
  { rule: "double-double-chows", supersedes: ["double-chow"], reason: "Dua pasang chi kembar sudah mencakup Double Chi" },
  { rule: "four-sequence-pung", supersedes: ["three-sequence-pung"], reason: "Empat pong berurutan sudah mencakup tiga pong berurutan" },
  { rule: "all-concealed-triplets", supersedes: ["three-concealed-pungs", "all-pongs"], reason: "Semua pong tertutup sudah mencakup Three Concealed Pungs dan All Pongs" },
  { rule: "all-terminals", supersedes: ["pure-orphans", "mixed-orphans", "all-pongs", "lacking-a-suit"], reason: "Orphans (pong/gong 1 dan 9) sudah mencakup Pure/Mixed Orphans dan All Pongs" },
  { rule: "pure-straight", supersedes: ["min-max-chow"], reason: "Pure Straight (123-456-789) sudah memuat chi 123 dan 789" },
];

const SPECIAL = { chickenHandCanWinOnBonusFaan: true, allChowsRequiresPlainPair: true, singleWaitMode: "pair" as const, waitFan: { single: 0, closed: 0, edge: 0, twoSided: 0 } };
const STACK = { dragonPongStacksWithDragonHands: false, windPongStacksWithWindHands: false };

export const RULESETS: Record<RulesetId, RulesetConfig> = {
  classic: {
    id: "classic", name: "Hong Kong Classic", nameZh: "舊章", emoji: "🀄",
    description: "Aturan tradisional yang dikenal semua meja Hong Kong: pola dasar (All Chis, All Pongs, Flush, Naga, Angin, bunga). Tidak ada pola tambahan New Style.",
    minimumFanToWin: 3, maximumFan: 13,
    specialRules: { ...SPECIAL, sevenPairs: true, thirteenOrphans: true, pair258: false, doubleChow: false, waitBonuses: false, flowerBonuses: true, waitFan: { ...SPECIAL.waitFan } },
    scoringRules: FOUNDATION.map((id) => get(id)),
    stackingRules: { ...STACK },
    conflicts: [...CONFLICTS_COMMON, { rule: "thirteen-orphans", supersedes: ["all-types"], reason: "Thirteen Orphans adalah tangan khusus" }],
    notes: [
      "Minimum 3 faan adalah standar meja Hong Kong; batas (cap) yang umum 8, 10 atau 13 faan. Default Classic: 13. Ubah di rulesets.ts atau pilih batas lain saat membuat game.",
      "Double Chi, 2-5-8 Pair, Single Wait dan Concealed Hand tidak dihitung di Classic (memberi 0 faan).",
      "Seven Pairs (4 faan) termasuk pola dasar HK Classic dan berlaku di ketiga ruleset.",
      "Great Four Winds bernilai 13 (nilai rumah aplikasi ini). Beberapa sumber memberi 15 faan 'atau limit'.",
    ],
  },
  new6: {
    id: "new6", name: "Hong Kong New 6", nameZh: "新章六", emoji: "🀄",
    description: "Classic ditambah enam pola New Style: 2-5-8 Pair, Concealed Hand, Single Wait, Fully Concealed, All Simples dan Lacking a Suit.",
    minimumFanToWin: 3, maximumFan: 13,
    specialRules: { ...SPECIAL, sevenPairs: true, thirteenOrphans: true, pair258: true, doubleChow: false, waitBonuses: true, flowerBonuses: true, waitFan: { ...SPECIAL.waitFan, single: 1 } },
    scoringRules: [...FOUNDATION, ...NEW6_EXTRA].map((id) => get(id)),
    stackingRules: { ...STACK },
    conflicts: [...CONFLICTS_COMMON, ...CONFLICTS_NEW6],
    notes: [
      "New 6 = Classic + tepat enam pola: 258 Pair (1), Concealed Hand (1), Single Wait (1), Fully Concealed (3), All Simples (1), Lacking a Suit (1).",
      "New 6 BUKAN New 18 dengan cap lain: Double Chi, Min-Max, Three Suits, Sequence Pung, Concealed Triplets, Orphans dan pola New 18 lain tidak dihitung.",
      "Single Wait dihitung bila kartu menang melengkapi pasangan. Closed, Edge dan Two-Sided Wait dideteksi dan ditampilkan, tanpa faan (nilai 0, bisa diatur).",
      "Fully Concealed (3) menggantikan Self Draw (1) pada tangan tertutup.",
      "Cap default 13 faan (sumber berbeda: 8, 10 atau 13). Bisa diubah.",
    ],
  },
  new18: {
    id: "new18", name: "Hong Kong New 18", nameZh: "新章十八", emoji: "🀄",
    description: "Ruleset paling lengkap: New 6 ditambah pola sekuens, pong dan orphans New 18. Ini adalah aturan rumah HK18 yang sudah ada di aplikasi, dilengkapi.",
    minimumFanToWin: 3, maximumFan: 13,
    specialRules: { ...SPECIAL, sevenPairs: true, thirteenOrphans: true, pair258: true, doubleChow: true, waitBonuses: true, flowerBonuses: true, waitFan: { ...SPECIAL.waitFan, single: 1 } },
    // New 18 contains every New 6 rule, including Fully Concealed: a Self Draw with a concealed hand scores 3 faan (it replaces Self Draw + Concealed Hand).
    scoringRules: [...FOUNDATION, ...NEW6_EXTRA, ...NEW18_EXTRA].map((id) => get(id)),
    stackingRules: { ...STACK },
    conflicts: [...CONFLICTS_COMMON, ...CONFLICTS_NEW6, ...CONFLICTS_NEW18],
    notes: [
      "Cap default 13 faan. Minimum 3 faan.",
      "Pola New 18 yang dihitung: Double Chi, Four into One, Min-Max Chi/Pung, Three Sequence Pung, Three Concealed Pungs, Three Suits Pung/Chi, Four Sequence Pung, All Concealed Triplets, Double Double Chis, All Types, Mixed Orphans, Pure Orphans, Orphans (pong/gong 1 dan 9, 10 faan), dan Snake Hand (= Pure Straight).",
      "All from Others, Three Concealed Pungs, Heavenly Hand dan Earthly Hand dicentang manual di Poin tambahan (kartu saja tidak cukup untuk mengetahuinya).",
      "Mixed / Pure Orphans: setiap set dan pasangan memuat kartu 1/9 (atau kehormatan). Chi 123 dan 789 dihitung.",
      "Fully Concealed (3 faan) tersedia tetapi NONAKTIF: aturan rumah yang sudah dikonfirmasi memberi Self Draw +1 pada tangan tertutup. Ubah enabled di rulesets.ts untuk mengaktifkan.",
      "Pure Straight menggantikan Min-Max Chi, All Concealed Triplets menggantikan All Pongs: dibuat agar faan tidak terhitung ganda. Tambahkan/ubah di daftar conflicts bila meja Anda berbeda.",
    ],
  },
};

export const RULESET_IDS = Object.keys(RULESETS) as RulesetId[];
export const DEFAULT_RULESET_ID: RulesetId = "new18";
export const isRulesetId = (x: unknown): x is RulesetId => typeof x === "string" && x in RULESETS;
export const getRuleset = (id?: string | null): RulesetConfig => (isRulesetId(id) ? RULESETS[id] : RULESETS[DEFAULT_RULESET_ID]);

/** The GameConfig the scoring engine reads for one ruleset. */
export function configFromRuleset(id: RulesetId): GameConfig {
  const r = RULESETS[id];
  const waits = r.specialRules.waitFan;
  const table = r.scoringRules.map((x) => {
    const w = x.id === "closed-wait" ? waits.closed : x.id === "edge-wait" ? waits.edge : x.id === "two-sided-wait" ? waits.twoSided : x.id === "single-wait" ? waits.single : null;
    return w === null ? x : { ...x, fan: w, enabled: x.id === "single-wait" ? r.specialRules.waitBonuses && x.enabled : w > 0 };
  });
  return {
    ...DEFAULT_GAME_CONFIG,
    rulesId: r.id, rulesetId: r.id, rulesetName: r.name,
    minimumFan: r.minimumFanToWin, maximumFan: r.maximumFan,
    specialHands: { sevenPairs: r.specialRules.sevenPairs, thirteenOrphans: r.specialRules.thirteenOrphans },
    allChowsRequiresPlainPair: r.specialRules.allChowsRequiresPlainPair,
    chickenHandCanWinOnBonusFaan: r.specialRules.chickenHandCanWinOnBonusFaan,
    singleWaitMode: r.specialRules.singleWaitMode,
    ...r.stackingRules, conflicts: r.conflicts, fanTable: table,
  };
}
export const patternRulesOf = (id: RulesetId) => RULESETS[id].scoringRules.filter((x) => x.category === "pattern" && x.enabled);
export const additionalRulesOf = (id: RulesetId) => RULESETS[id].scoringRules.filter((x) => x.category === "additional" && x.enabled);

/** Where a rule first appears: "classic" (all three rulesets have it), "new6" (New 6 and New 18) or "new18" (New 18 only). */
export function ruleOrigin(ruleId: string): RulesetId {
  const has = (id: RulesetId) => RULESETS[id].scoringRules.some((r) => r.id === ruleId);
  return has("classic") ? "classic" : has("new6") ? "new6" : "new18";
}
/** Rules this app adds on its own (not part of the published rule style). */
export const HOUSE_RULE_IDS: string[] = [];
