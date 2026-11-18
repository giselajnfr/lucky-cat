import { DEFAULT_LANG, type Lang } from "./config";

/** Indonesian is the source language; English must have the same keys (enforced by the type below). */
const id = {
  "nav.aria": "Menu utama", "nav.home": "Beranda", "nav.game": "Game", "nav.stats": "Statistik", "nav.rules": "Aturan",
  "account.aria": "Akun {name}", "account.logout": "Keluar dari akun", "logout": "Keluar", "logout.busy": "Keluar…", "language": "Bahasa",
  "app.tagline": "Teman Mahjong kamu",
  "home.hello": "Halo, {name}!", "home.guest": "teman", "home.ask": "Mau main mahjong hari ini?", "home.start": "Mulai",
  "home.join": "Gabung dengan kode", "home.quick": "Hitung skor cepat", "home.openTable": "Buka meja (admin)", "home.hint": "Minta kode ruang dari staf di meja kamu, lalu masukkan di sini.",
  "home.live": "Game berlangsung", "home.liveTitle": "Sedang berlangsung", "home.all": "Semua", "home.noLive": "Tidak ada game yang sedang berlangsung. Gabung dengan kode untuk mulai.",
  "home.done": "Game selesai", "home.doneTitle": "Selesai", "home.seeAll": "Lihat semua", "home.noDone": "Belum ada game selesai. Hasilnya muncul di sini setelah game berakhir.",
  "auth.name": "Nama", "auth.namePh": "Nama kamu", "auth.email": "Email", "auth.password": "Kata sandi", "auth.passwordPh": "Minimal 6 karakter",
  "auth.login": "Masuk", "auth.register": "Daftar", "auth.google": "Lanjut dengan Google", "auth.noAccount": "Belum punya akun?", "auth.hasAccount": "Sudah punya akun?",
  "auth.checkEmail": "Cek email kamu untuk konfirmasi, lalu masuk.",
  "wind.E": "Timur", "wind.S": "Selatan", "wind.W": "Barat", "wind.N": "Utara",
  "guide.title": "Aturan Mahjong", "guide.tab.basics": "Dasar", "guide.tab.patterns": "Pola tangan", "guide.tab.extra": "Faan tambahan", "guide.tab.other": "Aturan lain",
  "guide.intro": "Panduan Mahjong untuk pemula dan pemain lama. Nilai faan di halaman ini diambil dari konfigurasi yang sama dengan kalkulator.",
  "guide.overview": "Mahjong dimainkan empat orang dengan 136 kartu (ditambah kartu bunga dan musim). Tujuannya menyusun <b>4 set dan 1 pasangan</b> dari 14 kartu, lebih dulu dari lawan.",
  "guide.tiles": "Jenis kartu", "guide.t.char": "Karakter (萬) 1–9", "guide.t.bamboo": "Bambu 1–9", "guide.t.dots": "Lingkaran (Dots) 1–9", "guide.t.winds": "Angin: Timur, Selatan, Barat, Utara",
  "guide.t.dragons": "Naga: Merah, Hijau, Putih", "guide.t.flowers": "Bunga (1–4) dan Musim (Semi, Panas, Gugur, Dingin = 1–4)", "guide.t.note": "Bunga dan musim tidak masuk tangan. Kartu itu diletakkan di samping dan hanya menambah faan.",
  "guide.sets": "Set dan pasangan", "guide.chow": "<b>Chow</b>: tiga angka berurutan, satu jenis.", "guide.pong": "<b>Pong</b>: tiga kartu yang sama.", "guide.kong": "<b>Kong</b>: empat kartu yang sama (dihitung satu set).", "guide.pair": "<b>Pasangan</b>: dua kartu yang sama.",
  "guide.flow": "Jalannya permainan",
  "guide.flow1": "Setiap pemain mengambil lalu membuang satu kartu secara bergiliran.", "guide.flow2": "Kartu buangan boleh diambil untuk Chow (hanya dari pemain sebelumnya), Pong, atau Kong.",
  "guide.flow3": "Menang dari kartu buangan lawan disebut <b>menang dari buangan</b>. Menang dari kartu yang diambil sendiri disebut <b>Self Draw</b>.", "guide.flow4": "Jika kartu habis tanpa pemenang, tangan itu <b>seri</b> dan tidak ada poin berpindah.",
  "guide.min": "Minimum {min} faan · maksimum {max} faan",
  "guide.minBody": "Untuk menang, kumpulkan minimal <b>{min} faan</b>. Semua faan pola dan bonus dijumlahkan, hingga batas maksimum <b>{max} faan</b>. Pilih mode <b>Chicken Hand</b> (tanpa minimum), <b>Beginner</b> (3 faan), atau <b>Advanced</b> (5 faan) saat membuat meja.",
  "guide.extraIntro": "Ditambahkan di atas faan pola tangan.",
  "guide.perTile": "{fan} per kartu", "guide.faan": "{fan} faan", "guide.needs": "Perlu diisi pemain:",
  "guide.ctx.self": "Self Draw", "guide.ctx.discard": "dari buangan", "guide.ctx.seat": "kursi {w}", "guide.ctx.round": "ronde {w}", "guide.ctx.last": "kartu terakhir", "guide.ctx.rob": "rampas kong",
  "guide.g.windsDragons": "Angin & naga", "guide.g.windsNote": "Angin ganda: bila angin kursi sama dengan angin ronde, pong-nya bernilai 2 faan.", "guide.g.flowers": "Bunga & musim",
  "guide.g.flowersNote": "Nomor bunga dan musim mengikuti angin: 1 Timur, 2 Selatan, 3 Barat, 4 Utara.", "guide.g.win": "Cara menang",
  "guide.u.perSet": "1 per set", "guide.u.perTile": "1 per kartu", "guide.u.perSet2": "2 per set",
  "guide.calc": "Cara menghitung poin", "guide.calcBody": "Jumlahkan faan dari pola tangan dan faan tambahan. Total faan yang didapat kemudian dikonversi menjadi base points menggunakan tabel Hong Kong Mahjong.",
  "guide.table": "Faan → base points", "guide.tableBody": "Setiap jumlah faan memiliki nilai base points tersendiri. Contoh: 4 faan = 16 base points.", "guide.col.faan": "Faan", "guide.col.base": "Base points",
  "guide.who": "Siapa yang bayar?", "guide.selfBody": "Ketiga pemain lain masing-masing membayar <b>2× base points</b> kepada pemenang. Contoh 4 faan = 16 base points, jadi setiap pemain membayar 32 poin dan pemenang menerima 96 poin.",
  "guide.discardIntro": "Pembayaran mengikuti mode yang digunakan pada game:",
  "guide.discardAll": "<b>Discarder Pays All:</b> pemain yang membuang kartu membayar 3× base points. Contoh 4 faan = 16, discarder membayar 48 poin.",
  "guide.discardHalf": "<b>Half Pay / Split:</b> discarder membayar 2× base points, sedangkan dua pemain lainnya masing-masing membayar 1×. Contoh 4 faan = 16, discarder membayar 32 poin dan dua pemain lainnya masing-masing 16 poin; pemenang menerima 64 poin.",
  "guide.cap": "Batas faan", "guide.capBody": "Konversi poin mengikuti tabel hingga maksimum <b>13 faan = 384 base points</b>. Batas faan permainan mengikuti pengaturan meja.",
  "guide.minTitle": "Syarat minimum", "guide.minReq": "Untuk menang, total harus mencapai minimum <b>{min} faan</b> sesuai pengaturan meja. Jika belum mencapai minimum, tangan belum dihitung sebagai kemenangan.",
} as const;

export type Key = keyof typeof id;

const en: Record<Key, string> = {
  "nav.aria": "Main menu", "nav.home": "Home", "nav.game": "Games", "nav.stats": "Stats", "nav.rules": "Rules",
  "account.aria": "Account {name}", "account.logout": "Log out", "logout": "Log out", "logout.busy": "Logging out…", "language": "Language",
  "app.tagline": "Your Mahjong Companion",
  "home.hello": "Hi, {name}!", "home.guest": "friend", "home.ask": "Ready to play mahjong today?", "home.start": "Start",
  "home.join": "Join with a code", "home.quick": "Quick score calculator", "home.openTable": "Open a table (admin)", "home.hint": "Ask the staff at your table for the room code, then enter it here.",
  "home.live": "Ongoing games", "home.liveTitle": "In progress", "home.all": "All", "home.noLive": "No games in progress. Join with a code to get started.",
  "home.done": "Finished games", "home.doneTitle": "Finished", "home.seeAll": "See all", "home.noDone": "No finished games yet. Results appear here once a game ends.",
  "auth.name": "Name", "auth.namePh": "Your name", "auth.email": "Email", "auth.password": "Password", "auth.passwordPh": "At least 6 characters",
  "auth.login": "Log in", "auth.register": "Sign up", "auth.google": "Continue with Google", "auth.noAccount": "Don't have an account?", "auth.hasAccount": "Already have an account?",
  "auth.checkEmail": "Check your email to confirm, then log in.",
  "wind.E": "East", "wind.S": "South", "wind.W": "West", "wind.N": "North",
  "guide.title": "Mahjong Rules", "guide.tab.basics": "Basics", "guide.tab.patterns": "Hand patterns", "guide.tab.extra": "Bonus faan", "guide.tab.other": "Other rules",
  "guide.intro": "A Mahjong guide for beginners and veterans. The faan values on this page come from the same configuration as the calculator.",
  "guide.overview": "Mahjong is played by four people with 136 tiles (plus flower and season tiles). The goal is to form <b>4 sets and 1 pair</b> from 14 tiles before your opponents do.",
  "guide.tiles": "Tile types", "guide.t.char": "Characters (萬) 1–9", "guide.t.bamboo": "Bamboo 1–9", "guide.t.dots": "Circles (Dots) 1–9", "guide.t.winds": "Winds: East, South, West, North",
  "guide.t.dragons": "Dragons: Red, Green, White", "guide.t.flowers": "Flowers (1–4) and Seasons (Spring, Summer, Autumn, Winter = 1–4)", "guide.t.note": "Flowers and seasons are not part of the hand. They are set aside and only add faan.",
  "guide.sets": "Sets and pair", "guide.chow": "<b>Chow</b>: three consecutive numbers of one suit.", "guide.pong": "<b>Pong</b>: three identical tiles.", "guide.kong": "<b>Kong</b>: four identical tiles (counts as one set).", "guide.pair": "<b>Pair</b>: two identical tiles.",
  "guide.flow": "How a game flows",
  "guide.flow1": "Players take turns drawing and then discarding one tile.", "guide.flow2": "A discarded tile can be claimed for a Chow (only from the previous player), Pong, or Kong.",
  "guide.flow3": "Winning on an opponent's discard is called a <b>discard win</b>. Winning on a tile you drew yourself is called <b>Self Draw</b>.", "guide.flow4": "If the wall runs out with no winner, the hand is a <b>draw</b> and no points change hands.",
  "guide.min": "Minimum {min} faan · maximum {max} faan",
  "guide.minBody": "To win you need at least <b>{min} faan</b>. All pattern and bonus faan are added up, to a maximum of <b>{max} faan</b>. Choose <b>Chicken Hand</b> (no minimum), <b>Beginner</b> (3 faan), or <b>Advanced</b> (5 faan) when creating a table.",
  "guide.extraIntro": "Added on top of the hand pattern faan.",
  "guide.perTile": "{fan} per tile", "guide.faan": "{fan} faan", "guide.needs": "Player must provide:",
  "guide.ctx.self": "Self Draw", "guide.ctx.discard": "on discard", "guide.ctx.seat": "{w} seat", "guide.ctx.round": "{w} round", "guide.ctx.last": "last tile", "guide.ctx.rob": "robbing the kong",
  "guide.g.windsDragons": "Winds & dragons", "guide.g.windsNote": "Double wind: if the seat wind equals the round wind, the pong is worth 2 faan.", "guide.g.flowers": "Flowers & seasons",
  "guide.g.flowersNote": "Flower and season numbers follow the winds: 1 East, 2 South, 3 West, 4 North.", "guide.g.win": "Ways to win",
  "guide.u.perSet": "1 per set", "guide.u.perTile": "1 per tile", "guide.u.perSet2": "2 per set",
  "guide.calc": "How points are calculated", "guide.calcBody": "Add up the faan from hand patterns and bonus faan. The total faan is then converted to base points using the Hong Kong Mahjong table.",
  "guide.table": "Faan → base points", "guide.tableBody": "Each faan total has its own base points value. Example: 4 faan = 16 base points.", "guide.col.faan": "Faan", "guide.col.base": "Base points",
  "guide.who": "Who pays?", "guide.selfBody": "Each of the other three players pays the winner <b>2× base points</b>. Example: 4 faan = 16 base points, so each player pays 32 points and the winner receives 96 points.",
  "guide.discardIntro": "Payment follows the mode used in the game:",
  "guide.discardAll": "<b>Discarder Pays All:</b> the player who discarded pays 3× base points. Example: 4 faan = 16, the discarder pays 48 points.",
  "guide.discardHalf": "<b>Half Pay / Split:</b> the discarder pays 2× base points, while the other two players pay 1× each. Example: 4 faan = 16, the discarder pays 32 points and the other two pay 16 points each; the winner receives 64 points.",
  "guide.cap": "Faan limit", "guide.capBody": "Point conversion follows the table up to a maximum of <b>13 faan = 384 base points</b>. The game's faan limit follows the table settings.",
  "guide.minTitle": "Minimum requirement", "guide.minReq": "To win, the total must reach at least <b>{min} faan</b> per the table settings. If the minimum is not reached, the hand does not count as a win.",
};

export function translate(lang: Lang, key: Key, vars?: Record<string, string | number>): string {
  let s: string = (lang === "en" ? en[key] : id[key]) ?? id[key] ?? key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
  return s;
}
export { DEFAULT_LANG };
