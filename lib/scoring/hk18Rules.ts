/**
 * HK18 house rules — THE single source of truth.
 * The scoring engine, the House Rules page and the calculator all read this file.
 * Fan values are exactly the HK18 table. Anything the table does not define is a configurable
 * assumption listed in REVIEW_NOTES (never silently invented).
 */
import type { FanRuleConfig, GameConfig } from "./types";

export const HK18_RULES = {
  rulesId: "HK18",
  minimumFan: 3,
  maximumFan: null as number | null,
  enableFlowers: true,
  specialHands: { sevenPairs: true, thirteenOrphans: true },
  allChowsRequiresPlainPair: true,
  dragonPongStacksWithDragonHands: true,
  windPongStacksWithWindHands: true,
  chickenHandCanWinOnBonusFaan: true,
  pointsPerFan: 1,
  progression: { drawKeepsDealer: true, dealerWinKeepsDealer: true, lastRoundWind: "north" as const },
};

const p = (id: string, name: string, fan: number, summary: string, conditions: string[], example: FanRuleConfig["example"], excludes?: string[]): FanRuleConfig =>
  ({ id, name, fan, enabled: true, category: "pattern", summary, conditions, example, excludes });
const a = (id: string, name: string, fan: number, summary: string, conditions: string[], example: FanRuleConfig["example"], extra: Partial<FanRuleConfig> = {}): FanRuleConfig =>
  ({ id, name, fan, enabled: true, category: "additional", summary, conditions, example, ...extra });

export const FAN_TABLE: FanRuleConfig[] = [
  // ---------- Winning hand patterns ----------
  p("chicken-hand", "Chicken Hand", 0, "Tangan menang biasa tanpa pola apa pun. Bernilai 0 faan, jadi tidak bisa memenuhi syarat minimum 3 faan sendirian.",
    ["Tidak ada pola tangan lain dari tabel ini", "Faan tambahan tetap boleh dihitung"],
    { hand: "123m 456p 789s 111p 55s", win: "5s" }),
  p("all-chows", "All Chows / Sequence Hand", 1, "Keempat set adalah urutan (chow), tidak ada pong atau kong.",
    ["4 set semuanya chow", "Pasangan (pair) harus kartu biasa: bukan naga, bukan angin kursi, bukan angin ronde"],
    { hand: "123m 456m 234p 678s 55p", win: "5p" }),
  p("all-simples", "All Simples", 1, "Hanya kartu angka 2 sampai 8. Tidak ada angka 1 atau 9 dan tidak ada kartu kehormatan.",
    ["Semua kartu berupa angka 2–8", "Tidak ada angin atau naga"],
    { hand: "234m 567p 345s 222p 66s", win: "6s" }),
  p("pure-straight", "Pure Straight", 3, "Tiga chow 123, 456, 789 dalam satu jenis yang sama.",
    ["Chow 123, 456 dan 789 dari jenis yang sama"],
    { hand: "123m 456m 789m 234p 55s", win: "5s" }),
  p("all-pongs", "All Pongs", 3, "Keempat set adalah pong atau kong.",
    ["4 set semuanya pong/kong", "Ditambah satu pasangan"],
    { hand: "111m 999p 222s 555p 33s", win: "3s" }),
  p("mixed-orphans", "Mixed Orphans", 3, "Hanya kartu ujung (1 dan 9) dan kartu kehormatan, dengan minimal satu dari masing-masing.",
    ["Semua kartu 1, 9, angin atau naga", "Minimal satu kartu ujung dan satu kartu kehormatan"],
    { hand: "111m 999p 111s E E E RD RD", win: "RD" }, ["all-pongs"]),
  p("pure-orphans", "Pure Orphans", 5, "Hanya kartu ujung 1 dan 9, tanpa kartu kehormatan.",
    ["Semua kartu adalah 1 atau 9", "Tidak ada angin atau naga"],
    { hand: "111m 999m 111p 999p 11s", win: "1s" }, ["mixed-orphans", "all-pongs"]),
  p("half-flush", "Half Flush", 3, "Satu jenis angka saja, ditambah kartu kehormatan.",
    ["Hanya satu jenis angka", "Minimal ada satu kartu kehormatan"],
    { hand: "123m 456m 789m EEE 55m", win: "5m" }),
  p("full-flush", "Full Flush", 7, "Seluruh tangan satu jenis angka, tanpa kartu kehormatan.",
    ["Hanya satu jenis angka", "Tidak ada kartu kehormatan"],
    { hand: "123m 456m 789m 234m 55m", win: "5m" }, ["half-flush"]),
  p("little-dragon", "Little Dragon", 5, "Dua pong naga dan pasangan dari naga ketiga.",
    ["Pong/kong dua naga berbeda", "Pasangan adalah naga ketiga"],
    { hand: "RD RD RD GD GD GD 123m 456p WD WD", win: "WD" }, ["dragon-pong:cfg"]),
  p("great-dragon", "Great Dragon", 8, "Pong/kong ketiga naga (Merah, Hijau, Putih).",
    ["Pong/kong dari ketiga naga"],
    { hand: "RD RD RD GD GD GD WD WD WD 123m 55p", win: "5p" }, ["little-dragon", "dragon-pong:cfg"]),
  p("little-wind", "Little Wind", 10, "Tiga pong angin dan pasangan dari angin keempat.",
    ["Pong/kong tiga angin berbeda", "Pasangan adalah angin keempat"],
    { hand: "EEE SSS WWW 123m NN", win: "N" }, ["wind-pong:cfg"]),
  p("great-wind", "Great Wind", 13, "Pong/kong keempat angin (Timur, Selatan, Barat, Utara).",
    ["Pong/kong dari keempat angin"],
    { hand: "EEE SSS WWW NNN 55p", win: "5p" }, ["little-wind", "all-pongs", "wind-pong:cfg"]),
  p("seven-pairs", "Seven Pairs", 4, "Tujuh pasangan berbeda. Tidak mengikuti bentuk 4 set + 1 pasangan.",
    ["7 pasangan, masing-masing kartu berbeda", "Tidak ada meld", "4 kartu sama tidak dihitung sebagai 2 pasangan"],
    { hand: "11m 33m 55p 77p 99s 22s EE", win: "E" }),
  p("all-honors", "All Honors", 10, "Seluruh tangan hanya angin dan naga.",
    ["Semua kartu adalah angin atau naga"],
    { hand: "EEE SSS RD RD RD GD GD GD WD WD", win: "WD" }, ["mixed-orphans", "all-pongs"]),
  p("nine-gates", "Nine Gates / Heavenly Gates", 15, "Tangan tertutup satu jenis: 1112345678999 ditambah satu kartu sejenis.",
    ["Tanpa meld sama sekali", "Satu jenis angka", "Susunan 111 2345678 999 + 1 kartu apa pun dari jenis itu"],
    { hand: "1112345678999m 5m", win: "5m" }, ["full-flush", "pure-straight"]),
  p("thirteen-orphans", "Thirteen Orphans", 13, "Satu dari tiap kartu ujung dan kehormatan (13 jenis), ditambah satu kartu duplikat. Tidak mengikuti bentuk 4 set + 1 pasangan.",
    ["Memiliki ke-13 kartu ujung/kehormatan", "Satu di antaranya berpasangan", "Tidak ada meld"],
    { hand: "1m 9m 1p 9p 1s 9s E S W N RD GD WD 1m", win: "1m" }, ["mixed-orphans"]),
  p("four-kongs", "Four Kongs", 12, "Empat kong (tertutup atau terbuka) ditambah satu pasangan.",
    ["4 set semuanya kong"],
    { hand: "55s", melds: "+K:1m +K:RD K:9p +K:E", win: "5s" }, ["all-pongs"]),

  // ---------- Additional faan ----------
  a("seat-wind", "Seat Wind", 1, "Pong/kong angin yang sama dengan angin kursi pemenang.",
    ["Pong/kong angin kursi pemenang"],
    { hand: "EEE 123m 456p 789s 55p", win: "5p", seat: "E", round: "N" }, { needsInput: "Angin kursi pemenang" }),
  a("round-wind", "Round Wind", 1, "Pong/kong angin yang sama dengan angin ronde. Bisa digabung dengan Seat Wind.",
    ["Pong/kong angin ronde"],
    { hand: "SSS 123m 456p 789s 55p", win: "5p", seat: "W", round: "S" }, { needsInput: "Angin ronde" }),
  a("dragon-pong", "Dragon Pong/Kong", 1, "1 faan untuk setiap pong/kong naga.",
    ["Pong/kong Naga Merah, Hijau atau Putih", "1 faan per pong/kong"],
    { hand: "RD RD RD 123m 456p 789s 22s", win: "2s" }, { perUnit: true }),
  a("suitable-flower", "Suitable Flower", 1, "1 faan untuk setiap bunga/musim bernomor sama dengan kursi pemenang (Timur 1, Selatan 2, Barat 3, Utara 4).",
    ["Bunga atau musim bernomor sama dengan kursi", "1 faan per kartu yang cocok", "1 Semi · 2 Panas · 3 Gugur · 4 Dingin"],
    { hand: "123m 456p 789s 111p 55s", win: "5s", flowers: "F1 S1", seat: "E" }, { perUnit: true, needsInput: "Angin kursi dan bunga yang dimiliki" }),
  a("no-flower", "No Flower", 1, "Tidak memiliki kartu bunga atau musim sama sekali.",
    ["Tidak ada bunga atau musim"],
    { hand: "123m 456p 789s 111p 55s", win: "5s" }, { needsInput: "Bunga yang dimiliki pemenang" }),
  a("self-draw", "Self Draw", 1, "Menang dengan kartu yang diambil sendiri dari tumpukan.",
    ["Kartu kemenangan diambil sendiri"],
    { hand: "123m 456p 789s 111p 55s", win: "5s", method: "SELF_DRAW" }, { needsInput: "Menang sendiri atau dari buangan" }),
  a("last-tile", "Last Tile", 1, "Menang dengan kartu terakhir.",
    ["Kartu kemenangan adalah kartu terakhir"],
    { hand: "123m 456p 789s 111p 55s", win: "5s", lastTile: true }, { needsInput: "Apakah ini kartu terakhir" }),
  a("robbing-kong", "Robbing Kong", 1, "Menang dengan merampas kartu yang dipakai lawan untuk menambah kong.",
    ["Menang dari kartu tambahan kong lawan", "Hanya untuk kemenangan dari buangan"],
    { hand: "123m 456p 789s 111p 55s", win: "5s", method: "DISCARD", robbingKong: true }, { needsInput: "Apakah ini merampas kong" }),
  a("concealed-hand", "Concealed Hand", 1, "Menang dari buangan tanpa meld terbuka. Pada Self Draw yang dihitung adalah Self Draw, bukan Concealed Hand.",
    ["Menang dari buangan", "Tidak ada meld terbuka (kong tertutup boleh)", "Tidak dihitung bersama Self Draw"],
    { hand: "123m 456p 789s 111p 55s", win: "5s", method: "DISCARD" }, { needsInput: "Meld mana yang terbuka" }),
];

/**
 * Judgement calls the HK18 table does not spell out. Each is shown on the House Rules page and,
 * when a scored hand triggers one, attached to the result so it can be reviewed.
 */
export const REVIEW_NOTES: { id: string; when: string[]; note: string }[] = [
  { id: "dragon-stack", when: ["little-dragon", "dragon-pong"], note: "Little Dragon dan Dragon Pong dihitung bersama. Ubah dragonPongStacksWithDragonHands jika aturan rumah menganggapnya sudah termasuk." },
  { id: "dragon-stack-great", when: ["great-dragon", "dragon-pong"], note: "Great Dragon dan Dragon Pong dihitung bersama (sama seperti di atas)." },
  { id: "wind-stack", when: ["little-wind", "seat-wind"], note: "Little Wind dan Seat Wind dihitung bersama. Ubah windPongStacksWithWindHands jika dianggap sudah termasuk." },
  { id: "wind-stack-round", when: ["little-wind", "round-wind"], note: "Little Wind dan Round Wind dihitung bersama." },
  { id: "wind-stack-great", when: ["great-wind", "seat-wind"], note: "Great Wind dan Seat/Round Wind dihitung bersama." },
  { id: "chicken", when: ["chicken-hand"], note: "Chicken Hand (tanpa pola) tetap boleh menang jika faan tambahan mencapai minimum. Ubah chickenHandCanWinOnBonusFaan jika aturan rumah melarangnya." },
  { id: "last-tile", when: ["last-tile"], note: "Last Tile diisi manual oleh pemain; definisi persis (kartu terakhir tumpukan) perlu dikonfirmasi." },
  { id: "nine-gates-concealed", when: ["nine-gates", "concealed-hand"], note: "Nine Gates sudah tertutup; Concealed Hand tetap dihitung karena tabel tidak melarangnya. Mohon konfirmasi." },
];

export const DEFAULT_GAME_CONFIG: GameConfig = {
  ...HK18_RULES,
  selfDrawRules: { dealerMultiplier: 1, nonDealerMultiplier: 1 },
  discardRules: { dealerMultiplier: 1, paymentMode: "DISCARDER_PAYS_ALL" },
};

/** Rule lookup helpers shared by the engine and the UI. */
export const ruleById = (id: string, table: FanRuleConfig[] = FAN_TABLE) => table.find((r) => r.id === id);
export const PATTERN_RULES = FAN_TABLE.filter((r) => r.category === "pattern");
export const ADDITIONAL_RULES = FAN_TABLE.filter((r) => r.category === "additional");
