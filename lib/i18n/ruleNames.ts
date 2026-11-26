import type { Lang } from "./config";

/**
 * Display names of scoring rules. The scoring engine (and the database, in hand_fan_details.fan_name) keep the English
 * name, so this is keyed by that English name and only changes what is SHOWN. Chinese suffixes "(三暗刻)" are kept.
 * Mahjong loanwords (Chi, Pong, Gong, Faan) stay as they are in Indonesian. Unknown names are returned unchanged.
 */
const ID: Record<string, string> = {
  "2-5-8 Pair": "Pasangan 2-5-8", "Single Wait": "Menunggu Satu Kartu", "Closed Wait": "Tunggu Tengah", "Edge Wait": "Tunggu Tepi", "Two-Sided Wait": "Tunggu Dua Sisi",
  "Double Chi": "Chi Kembar", "Double Double Chis": "Dua Pasang Chi Kembar", "Four into One": "Empat Jadi Satu", "Min-Max Chi": "Chi Ujung", "Min-Max Pung": "Pong Ujung",
  "Three Sequence Pung": "Tiga Pong Berurutan", "Four Sequence Pung": "Empat Pong Berurutan", "Three Concealed Pungs": "Tiga Pong Tertutup",
  "Heavenly Hand": "Tangan Langit", "Earthly Hand": "Tangan Bumi", "All from Others": "Semua dari Buangan", "Three Suits Pung": "Pong Tiga Jenis", "Three Suits Chi": "Chi Tiga Jenis",
  "All Concealed Triplets": "Semua Pong Tertutup", "Lacking a Suit": "Kurang Satu Jenis", "All Types": "Semua Jenis", "Orphans": "Kartu Ujung Murni", "Fully Concealed": "Sepenuhnya Tertutup",
  "Full Flowers / Full Seasons": "Bunga Lengkap / Musim Lengkap", "All 8 Flowers & Seasons": "Delapan Bunga & Musim", "Chicken Hand": "Chicken Hand (Tangan Tanpa Pola)",
  "All Chis / Sequence Hand": "Semua Chi / Tangan Berurutan", "All Simples": "Semua Kartu Biasa", "Pure Straight": "Lurus Murni", "All Pongs": "Semua Pong", "Mixed Orphans": "Ujung Campuran",
  "Pure Orphans": "Ujung Murni", "Half Flush": "Satu Jenis + Kehormatan", "Full Flush": "Satu Jenis Penuh", "Little Dragon": "Naga Kecil", "Great Dragon": "Naga Besar", "Little Wind": "Angin Kecil",
  "Great Wind": "Angin Besar", "Seven Pairs": "Tujuh Pasang", "All Honors": "Semua Kehormatan", "Nine Gates / Heavenly Gates": "Sembilan Gerbang", "Thirteen Orphans": "Tiga Belas Yatim",
  "Four Gongs": "Empat Gong", "Seat Wind": "Angin Kursi", "Round Wind": "Angin Ronde", "Dragon Pong/Gong": "Pong/Gong Naga", "Suitable Flower": "Bunga Sesuai Kursi", "No Flower": "Tanpa Bunga",
  "Self Draw": "Menang Sendiri", "Self Draw After Gong": "Menang Sendiri Setelah Gong", "Last Tile": "Kartu Terakhir", "Robbing Gong": "Merampas Gong", "Concealed Hand": "Tangan Tertutup",
};

/** "Three Concealed Pungs (三暗刻)" → base + Chinese suffix. */
const split = (n: string) => { const m = n.match(/^(.*?)(\s*\([^)]*[\u3400-\u9fff][^)]*\))?$/); return { base: (m?.[1] ?? n).trim(), zh: m?.[2] ?? "" }; };

/** Name to show for a scoring rule. English mode (and unknown names) show the engine's English name. */
export function ruleName(lang: Lang, name: string): string {
  const { base } = split(name);   // the Chinese suffix "(三暗刻)" is never shown
  if (lang !== "id") return base;
  return ID[base] ?? base;
}
