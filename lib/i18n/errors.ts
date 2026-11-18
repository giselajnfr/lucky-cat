import type { Lang } from "./config";
import { currentLang } from "./locale";

/**
 * Database / API error messages (Supabase RAISE EXCEPTION text, API route errors) → Indonesian.
 * English mode shows the original English; unknown messages are returned unchanged.
 * Add a line when a new RAISE EXCEPTION is added to supabase/*.sql.
 */
const ID: [string, string][] = [
  ["Player not found in your roster", "Pemain tidak ditemukan di daftar kamu"], ["Every seat needs a player", "Setiap kursi harus ada pemainnya"],
  ["A name can have at most 40 characters", "Nama maksimal 40 karakter"], ["Registered player not found", "Pemain terdaftar tidak ditemukan"],
  ["Room not found", "Ruang tidak ditemukan"], ["The same player cannot take two seats", "Satu pemain tidak boleh menempati dua kursi"],
  ["Final scores must cover all four players", "Skor akhir harus mencakup keempat pemain"], ["Hand not found", "Tangan tidak ditemukan"],
  ["Not allowed", "Tidak diizinkan"], ["Game is already finished", "Game sudah selesai"], ["Set up the table before finishing the game", "Atur meja dulu sebelum mengakhiri game"],
  ["A finished game cannot be changed", "Game yang sudah selesai tidak bisa diubah"], ["No hand to undo", "Tidak ada tangan untuk dibatalkan"], ["Game not found", "Game tidak ditemukan"],
  ["Another hand was recorded first. Refresh and try again.", "Tangan lain sudah dicatat lebih dulu. Muat ulang lalu coba lagi."],
  ["Invalid winning method", "Cara menang tidak valid"], ["A draw has no winner and a win needs one", "Seri tidak punya pemenang, sedangkan kemenangan harus punya pemenang"],
  ["Invalid discarding player", "Pemain pembuang kartu tidak valid"], ["Game is not in progress", "Game tidak sedang berlangsung"], ["Score changes must balance to zero", "Perubahan skor harus berjumlah nol"],
  ["Hand not found in this game", "Tangan tidak ditemukan di game ini"], ["A draw cannot award points", "Tangan seri tidak boleh memberi poin"], ["Hand does not meet the minimum faan", "Tangan belum mencapai minimum faan"],
  ["Dealer seat has no player", "Kursi dealer belum ada pemainnya"], ["Admins only", "Hanya untuk admin"], ["Only admins can open a table", "Hanya admin yang bisa membuka meja"], ["Not signed in", "Belum masuk"],
  ["This table has already been set up", "Meja ini sudah diatur"], ["Score update touched an unexpected number of players", "Pembaruan skor mengenai jumlah pemain yang tidak sesuai"],
  ["Invalid status", "Status tidak valid"], ["Choose Classic, New 6 or New 18", "Pilih Classic, New 6 atau New 18"],
  ["Invalid request", "Permintaan tidak valid"], ["requestId must be a UUID", "requestId harus berupa UUID"], ["expectedHand must be a positive integer", "expectedHand harus bilangan bulat positif"],
  ["type must be 'win' or 'draw'", "type harus 'win' atau 'draw'"], ["winnerId is required", "winnerId wajib diisi"], ["method must be SELF_DRAW or DISCARD", "method harus SELF_DRAW atau DISCARD"],
  ["concealedTiles are invalid", "concealedTiles tidak valid"], ["winningTile is invalid", "winningTile tidak valid"], ["flowers are invalid", "flowers tidak valid"], ["melds are invalid", "melds tidak valid"],
  ["meld is invalid", "meld tidak valid"], ["meld tiles are invalid", "kartu meld tidak valid"],
  // Auth (Supabase GoTrue)
  ["Invalid login credentials", "Email atau kata sandi salah"], ["Email not confirmed", "Email belum dikonfirmasi"], ["User already registered", "Email ini sudah terdaftar"],
  ["Password should be at least 6 characters.", "Kata sandi minimal 6 karakter."], ["Password should be at least 6 characters", "Kata sandi minimal 6 karakter"],
  ["Unable to validate email address: invalid format", "Format email tidak valid"], ["Signup requires a valid password", "Daftar membutuhkan kata sandi yang valid"],
  ["Failed to fetch", "Tidak bisa terhubung ke server. Periksa koneksi internet kamu."], ["Load failed", "Tidak bisa terhubung ke server. Periksa koneksi internet kamu."],
  ["JWT expired", "Sesi berakhir. Masuk lagi."], ["Auth session missing!", "Sesi tidak ditemukan. Masuk lagi."],
];
const PATTERNS_ID: [RegExp, (m: RegExpMatchArray) => string][] = [
  [/^Hand (\S+) does not meet the minimum faan$/, (m) => `Tangan ${m[1]} belum mencapai minimum faan`],
  [/^For security purposes, you can only request this after (\d+) seconds?\.?$/, (m) => `Demi keamanan, coba lagi setelah ${m[1]} detik.`],
  [/^duplicate key value violates unique constraint.*$/, () => "Data ini sudah ada."],
  [/^new row violates row-level security policy.*$/, () => "Tidak diizinkan."],
];
const MAP = new Map(ID);

/** Translate a DB/API error message for display. English (and unknown text) is returned unchanged. */
export function translateError(lang: Lang, message: string | null | undefined): string {
  const m = (message ?? "").trim();
  if (!m || lang !== "id") return message ?? "";
  const direct = MAP.get(m) ?? MAP.get(m.replace(/\.$/, ""));
  if (direct) return direct;
  for (const [re, fn] of PATTERNS_ID) { const r = m.match(re); if (r) return fn(r); }
  return message ?? "";
}

/** Same, using the current language (browser: <html lang>; server: the request cookie). Use at every place that shows `error.message`. */
export const errText = (message: string | null | undefined): string => translateError(currentLang(), message);
