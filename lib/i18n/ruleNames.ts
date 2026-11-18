import type { Lang } from "./config";

/**
 * Display names of scoring rules. The scoring engine (and the database, in hand_fan_details.fan_name) keep the English
 * name, so this is keyed by that English name and only changes what is SHOWN. Chinese suffixes "(三暗刻)" are kept.
 * Mahjong loanwords (Chow, Pong, Kong, Faan) stay as they are in Indonesian. Unknown names are returned unchanged.
 */
const ID: Record<string, string> = {
  "2-5-8 Pair": "Pasangan 2-5-8", "Single Wait": "Menunggu Satu Kartu", "Closed Wait": "Tunggu Tengah", "Edge Wait": "Tunggu Tepi", "Two-Sided Wait": "Tunggu Dua Sisi",
  "Double Chow": "Chow Kembar", "Double Double Chows": "Dua Pasang Chow Kembar", "Four into One": "Empat Jadi Satu", "Min-Max Chow": "Chow Ujung", "Min-Max Pung": "Pong Ujung",
  "Three Sequence Pung": "Tiga Pong Berurutan", "Four Sequence Pung": "Empat Pong Berurutan", "Three Concealed Pungs": "Tiga Pong Tertutup",
  "Heavenly Hand": "Tangan Langit", "Earthly Hand": "Tangan Bumi", "All from Others": "Semua dari Buangan", "Three Suits Pung": "Pong Tiga Jenis", "Three Suits Chow": "Chow Tiga Jenis",
  "All Concealed Triplets": "Semua Pong Tertutup", "Lacking a Suit": "Kurang Satu Jenis", "All Types": "Semua Jenis", "Orphans": "Kartu Ujung Murni", "Fully Concealed": "Sepenuhnya Tertutup",
  "Full Flowers / Full Seasons": "Bunga Lengkap / Musim Lengkap", "All 8 Flowers & Seasons": "Delapan Bunga & Musim", "Chicken Hand": "Chicken Hand (Tangan Tanpa Pola)",
  "All Chows / Sequence Hand": "Semua Chow / Tangan Berurutan", "All Simples": "Semua Kartu Biasa", "Pure Straight": "Lurus Murni", "All Pongs": "Semua Pong", "Mixed Orphans": "Ujung Campuran",
  "Pure Orphans": "Ujung Murni", "Half Flush": "Satu Jenis + Kehormatan", "Full Flush": "Satu Jenis Penuh", "Little Dragon": "Naga Kecil", "Great Dragon": "Naga Besar", "Little Wind": "Angin Kecil",
  "Great Wind": "Angin Besar", "Seven Pairs": "Tujuh Pasang", "All Honors": "Semua Kehormatan", "Nine Gates / Heavenly Gates": "Sembilan Gerbang", "Thirteen Orphans": "Tiga Belas Yatim",
  "Four Kongs": "Empat Kong", "Seat Wind": "Angin Kursi", "Round Wind": "Angin Ronde", "Dragon Pong/Kong": "Pong/Kong Naga", "Suitable Flower": "Bunga Sesuai Kursi", "No Flower": "Tanpa Bunga",
  "Self Draw": "Menang Sendiri", "Self Draw After Kong": "Menang Sendiri Setelah Kong", "Last Tile": "Kartu Terakhir", "Robbing Kong": "Merampas Kong", "Concealed Hand": "Tangan Tertutup",
};

/** "Three Concealed Pungs (三暗刻)" → base + Chinese suffix. */
const split = (n: string) => { const m = n.match(/^(.*?)(\s*\([^)]*[\u3400-\u9fff][^)]*\))?$/); return { base: (m?.[1] ?? n).trim(), zh: m?.[2] ?? "" }; };

/** Name to show for a scoring rule. English mode (and unknown names) show the engine's English name. */
export function ruleName(lang: Lang, name: string): string {
  if (lang !== "id") return name;
  const { base, zh } = split(name);
  const t = ID[base];
  return t ? t + zh : name;
}
