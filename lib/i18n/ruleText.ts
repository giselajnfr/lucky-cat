import type { Lang } from "./config";

/** English text for scoring rules, keyed by rule id. Indonesian stays in lib/scoring (the source). Missing id => falls back to Indonesian. */
const SUMMARY_EN: Record<string, string> = {
  "chicken-hand": "An ordinary winning hand with no pattern at all.",
  "all-chows": "All four sets are sequences (chows), no pongs or kongs.",
  "all-simples": "Only number tiles 2 to 8. No 1s or 9s and no honor tiles.",
  "pure-straight": "Three chows 123, 456, 789 in the same suit.",
  "all-pongs": "All four sets are pongs or kongs.",
  "mixed-orphans": "Only terminals (1 and 9) and honor tiles, with at least one of each.",
  "pure-orphans": "Only terminals 1 and 9, no honor tiles.",
  "half-flush": "One number suit only, plus honor tiles.",
  "full-flush": "The whole hand is one number suit, no honor tiles.",
  "little-dragon": "Two dragon pongs and a pair of the third dragon.",
  "great-dragon": "Pongs/kongs of all three dragons (Red, Green, White).",
  "little-wind": "Three wind pongs and a pair of the fourth wind.",
  "great-wind": "Pongs/kongs of all four winds (East, South, West, North).",
  "seven-pairs": "Seven different pairs. Does not follow the 4 sets + 1 pair shape.",
  "all-honors": "The whole hand is only winds and dragons.",
  "nine-gates": "Concealed hand in one suit: 1112345678999 plus one more tile of that suit.",
  "thirteen-orphans": "One of each terminal and honor tile (13 kinds), plus one duplicate. Does not follow the 4 sets + 1 pair shape.",
  "four-kongs": "Four kongs (concealed or open) plus a pair.",
  "seat-wind": "Pong/kong of the wind matching the winner's seat wind.",
  "round-wind": "Pong/kong of the current round wind. Can stack with Seat Wind.",
  "dragon-pong": "1 faan for each dragon pong/kong.",
  "suitable-flower": "1 faan for each flower/season whose number matches the winner's seat (East 1, South 2, West 3, North 4).",
  "no-flower": "No flower or season tiles at all.",
  "self-draw": "Win on a tile drawn yourself from the wall.",
  "self-draw-after-kong": "Win on the replacement tile after declaring a kong.",
  "last-tile": "Win on the last tile.",
  "robbing-kong": "Win by robbing the tile an opponent uses to add to a kong.",
  "concealed-hand": "Win on a discard with no open melds (1 faan). If it is also a Self Draw, the two combine into Fully Concealed (3 faan).",
  "pair-258": "The pair (eyes) is a 2, 5 or 8 number tile.",
  "single-wait": "Win by completing the pair: the winning tile is the pair tile you were waiting for.",
  "closed-wait": "The winning tile fills the middle of a chow (e.g. the 2 in 1-_-3).",
  "edge-wait": "The winning tile completes a chow 1-2-3 with the 3, or 7-8-9 with the 7.",
  "two-sided-wait": "The winning tile completes a chow that could be completed from either side.",
  "double-chow": "Two identical chows in one suit.",
  "double-double-chows": "Two pairs of identical chows in different suits.",
  "four-into-one": "Four identical tiles split between one pong and one chow.",
  "min-max-chow": "Chows 1-2-3 and 7-8-9 in one suit.",
  "min-max-pung": "Pongs/kongs of 1 and 9 in one suit.",
  "three-sequence-pung": "Three consecutive pongs/kongs in one suit.",
  "four-sequence-pung": "Four consecutive pongs/kongs in one suit.",
  "three-concealed-pungs": "Three concealed pongs/kongs. Ticked by the player: a pong completed by an opponent's discard counts as open.",
  "heavenly-hand": "The dealer wins with the starting hand.",
  "earthly-hand": "A non-dealer wins on the dealer's first discard.",
  "fully-exposed": "All sets are open, winning on a discard to complete the pair.",
  "three-suits-pung": "Pongs/kongs of the same number in three different suits.",
  "three-suits-chow": "The same chow in three different suits.",
  "all-concealed-triplets": "All four sets are concealed pongs/kongs. Must be Self Draw or win on the pair.",
  "lacking-a-suit": "Only two of the three number suits, with no winds or dragons.",
  "all-types": "All three number suits (characters, bamboo, circles), plus winds and dragons, in one hand.",
  "all-terminals": "The whole hand is only pongs or kongs of 1s and 9s (no winds or dragons).",
  "fully-concealed": "Self Draw with a concealed hand (no set taken from a discard) = 3 faan. Self Draw + Concealed Hand combine into Fully Concealed and replace both.",
  "full-flowers": "Holding all four flowers or all four seasons.",
  "eight-flowers": "Holding all eight flowers and seasons. Replaces Full Flowers / Full Seasons.",
};

/** Short cheat-sheet lines used on the "Bonus faan" tab. */
const SHORT_ID: Record<string, string> = {
  "seat-wind": "Pong/kong angin sesuai kursi pemenang.", "round-wind": "Pong/kong angin ronde yang sedang berjalan.", "dragon-pong": "Pong/kong naga (merah, hijau atau putih).",
  "no-flower": "Tidak punya bunga atau musim sama sekali.", "suitable-flower": "Bunga/musim bernomor sama dengan kursi pemenang.", "full-flowers": "Empat bunga atau empat musim lengkap.", "eight-flowers": "Kedelapan bunga dan musim. Menggantikan Full Flowers.",
  "self-draw": "Kartu menang diambil sendiri dari tumpukan.", "self-draw-after-kong": "Menang dari kartu pengganti setelah menyatakan kong.", "concealed-hand": "Menang dari buangan tanpa set terbuka. Bersama Self Draw jadi Fully Concealed (3 faan).", "fully-concealed": "Self Draw + tangan tertutup digabung: 3 faan.", "last-tile": "Menang dengan kartu terakhir.", "robbing-kong": "Menang dengan kartu yang dipakai lawan untuk menambah kong.",
  "single-wait": "Menunggu satu kartu: melengkapi pasangan.", "heavenly-hand": "Dong menang dengan tangan awalnya.", "earthly-hand": "Pemain non-dong menang dari buangan pertama dong.", "fully-exposed": "Semua set dibuka, menang dari buangan untuk melengkapi pasangan.", "three-concealed-pungs": "Tiga pong/kong tertutup.", 
};
const SHORT_EN: Record<string, string> = {
  "seat-wind": "Pong/kong of the winner's seat wind.", "round-wind": "Pong/kong of the current round wind.", "dragon-pong": "Pong/kong of a dragon (red, green or white).",
  "no-flower": "No flowers or seasons at all.", "suitable-flower": "Flower/season whose number matches the winner's seat.", "full-flowers": "All four flowers or all four seasons.", "eight-flowers": "All eight flowers and seasons. Replaces Full Flowers.",
  "self-draw": "The winning tile is drawn yourself from the wall.", "self-draw-after-kong": "Win on the replacement tile after declaring a kong.", "concealed-hand": "Win on a discard with no open sets. With Self Draw it becomes Fully Concealed (3 faan).", "fully-concealed": "Self Draw + concealed hand combined: 3 faan.", "last-tile": "Win on the last tile.", "robbing-kong": "Win on the tile an opponent uses to add to a kong.",
  "single-wait": "Waiting on one tile: completing the pair.", "heavenly-hand": "Dealer wins with the starting hand.", "earthly-hand": "A non-dealer wins on the dealer's first discard.", "fully-exposed": "All sets open, win on a discard to complete the pair.", "three-concealed-pungs": "Three concealed pongs/kongs.", 
};

const NEEDS_EN: Record<string, string> = {
  "Angin kursi pemenang": "Winner's seat wind", "Angin ronde": "Round wind", "Angin kursi dan bunga yang dimiliki": "Seat wind and the flowers held",
  "Bunga yang dimiliki pemenang": "Flowers held by the winner", "Menang sendiri atau dari buangan": "Self draw or discard win", "Apakah menang setelah menyatakan kong": "Whether the win came after declaring a kong",
  "Apakah ini kartu terakhir": "Whether this is the last tile", "Apakah ini merampas kong": "Whether this robs a kong", "Meld mana yang terbuka": "Which melds are open",
};

export const ruleSummary = (lang: Lang, id: string, fallback: string) => (lang === "en" ? SUMMARY_EN[id] : undefined) ?? fallback;
export const ruleShort = (lang: Lang, id: string, fallback: string) => (lang === "en" ? SHORT_EN[id] : SHORT_ID[id]) ?? ruleSummary(lang, id, fallback);
export const ruleNeeds = (lang: Lang, text: string) => (lang === "en" ? NEEDS_EN[text] : undefined) ?? text;
