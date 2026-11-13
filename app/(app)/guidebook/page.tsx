import Link from "next/link";
import { HandView } from "@/components/mahjong/HandView";
import { Tile } from "@/components/mahjong/Tile";
import { ADDITIONAL_RULES, HK18_RULES, PATTERN_RULES, exampleToInput, parseTiles } from "@/lib/scoring";
import type { FanRuleConfig } from "@/lib/scoring";

const ROUND_NAME: Record<string, string> = { east: "Timur", south: "Selatan", west: "Barat", north: "Utara" };
const WIND = { E: "Timur", S: "Selatan", W: "Barat", N: "Utara" } as const;
/** A row of tiles: 46px wide, wrapped into even lines (9 tiles = 5 + 4, 8 = 4 + 4) instead of a long row with leftovers. */
const row = (s: string, w = 46) => {
  const tiles = parseTiles(s); const per = tiles.length <= 5 ? tiles.length : Math.ceil(tiles.length / 2);
  return <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${per}, ${w}px)` }}>{tiles.map((t, i) => <Tile key={i} t={t} width={w} />)}</div>;
};
const H2 = ({ id, children }: { id: string; children: React.ReactNode }) => <h2 id={id} className="mb-3 scroll-mt-4 text-xl">{children}</h2>;

function RuleCard({ r }: { r: FanRuleConfig }) {
  const ex = r.example ? exampleToInput(r.example) : null;
  const ctx = r.example && [r.example.method === "SELF_DRAW" ? "Self Draw" : r.example.method === "DISCARD" ? "dari buangan" : null, r.example.seat ? `kursi ${WIND[r.example.seat]}` : null, r.example.round ? `ronde ${WIND[r.example.round]}` : null, r.example.lastTile ? "kartu terakhir" : null, r.example.robbingKong ? "rampas kong" : null].filter(Boolean).join(" · ");
  return (
    <article id={r.id} className="card scroll-mt-4 space-y-3">
      <div className="flex items-baseline justify-between gap-3"><h3 className="text-lg font-bold leading-tight text-cream">{r.name}</h3>
        <span className="shrink-0 rounded-full bg-cream px-3 py-1 text-sm font-extrabold text-base">{r.perUnit ? `${r.fan} per kartu` : `${r.fan} faan`}</span></div>
      <p className="text-sm">{r.summary}</p>
      <ul className="list-disc space-y-0.5 pl-5 text-sm text-muted">{r.conditions.map((c) => <li key={c}>{c}</li>)}</ul>
      {r.needsInput && <p className="text-xs text-muted">Perlu diisi pemain: <b className="text-cream">{r.needsInput}</b></p>}
      {ex && (<div><p className="mb-1.5 text-xs font-semibold text-muted">Contoh{ctx ? ` (${ctx})` : ""}</p><HandView concealed={ex.concealedTiles} melds={ex.melds} winningTile={ex.winningTile} flowers={ex.flowers} width={32} balanced /></div>)}
    </article>
  );
}

export default function Page() {
  const p = HK18_RULES.progression;
  return (
    <main className="space-y-8">
      <header><h1 className="text-[1.75rem]">Aturan rumah HK18</h1><p className="mt-1 text-sm text-muted">Panduan Mahjong untuk pemula dan pemain lama. Nilai faan di halaman ini diambil dari konfigurasi yang sama dengan kalkulator.</p>
        <nav className="-mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-1 text-sm font-semibold" aria-label="Lompat ke">
          {[["dasar", "Dasar"], ["pola", "Pola tangan"], ["tambahan", "Faan tambahan"], ["aturan", "Aturan lain"]].map(([id, l]) => <a key={id} href={`#${id}`} className="shrink-0 rounded-full border border-line bg-card px-3.5 py-2">{l}</a>)}</nav>
        <div className="mt-3 grid grid-cols-2 gap-2"><Link href="/quick-score" className="btn-secondary">Hitung skor</Link><Link href="/game" className="btn-secondary">Game Tracker</Link></div></header>

      <section><H2 id="dasar">Dasar Mahjong</H2>
        <div className="space-y-4">
          <p className="text-sm">Mahjong dimainkan empat orang dengan 136 kartu (ditambah kartu bunga dan musim). Tujuannya menyusun <b>4 set dan 1 pasangan</b> dari 14 kartu, lebih dulu dari lawan.</p>
          <div className="card space-y-3"><h3>Jenis kartu</h3>
            <div><p className="mb-1 text-xs font-semibold text-muted">Karakter (萬) 1–9</p>{row("123456789m")}</div>
            <div><p className="mb-1 text-xs font-semibold text-muted">Bambu 1–9</p>{row("123456789s")}</div>
            <div><p className="mb-1 text-xs font-semibold text-muted">Lingkaran (Dots) 1–9</p>{row("123456789p")}</div>
            <div><p className="mb-1 text-xs font-semibold text-muted">Angin: Timur, Selatan, Barat, Utara</p>{row("E S W N")}</div>
            <div><p className="mb-1 text-xs font-semibold text-muted">Naga: Merah, Hijau, Putih</p>{row("RD GD WD")}</div>
            <div><p className="mb-1 text-xs font-semibold text-muted">Bunga (1–4) dan Musim (Semi, Panas, Gugur, Dingin = 1–4)</p>{row("F1 F2 F3 F4 S1 S2 S3 S4")}</div>
            <p className="text-xs text-muted">Bunga dan musim tidak masuk tangan. Kartu itu diletakkan di samping dan hanya menambah faan.</p></div>
          <div className="card space-y-3"><h3>Set dan pasangan</h3>
            <div><p className="text-sm"><b>Chow</b>: tiga angka berurutan, satu jenis.</p>{row("345m")}</div>
            <div><p className="text-sm"><b>Pong</b>: tiga kartu yang sama.</p>{row("777p")}</div>
            <div><p className="text-sm"><b>Kong</b>: empat kartu yang sama (dihitung satu set).</p>{row("RD RD RD RD")}</div>
            <div><p className="text-sm"><b>Pasangan</b>: dua kartu yang sama.</p>{row("EE")}</div></div>
          <div className="card space-y-2 text-sm"><h3>Jalannya permainan</h3>
            <ol className="list-decimal space-y-1 pl-5"><li>Setiap pemain mengambil lalu membuang satu kartu secara bergiliran.</li><li>Kartu buangan boleh diambil untuk Chow (hanya dari pemain sebelumnya), Pong, atau Kong.</li><li>Menang dari kartu buangan lawan disebut <b>menang dari buangan</b>. Menang dari kartu yang diambil sendiri disebut <b>Self Draw</b>.</li><li>Jika kartu habis tanpa pemenang, tangan itu <b>seri</b> dan tidak ada poin berpindah.</li></ol></div>
          <div className="card space-y-2 text-sm"><h3>Minimum {HK18_RULES.minimumFan} faan</h3>
            <p>Tangan menang harus bernilai minimal <b>{HK18_RULES.minimumFan} faan</b> untuk sah. Faan dari pola tangan dan faan tambahan dijumlahkan. Chicken Hand bernilai 0 faan, jadi tidak cukup sendirian. Pemain memilih buku aturan sendiri saat memulai meja: <b>Chicken Hand</b> (tanpa minimum), <b>Beginner</b> (minimum 3 faan) atau <b>Advanced</b> (minimum 5 faan), dan boleh memakai batas faan (cap).</p></div>
        </div></section>

      <section><H2 id="pola">Pola tangan</H2><div className="space-y-3">{PATTERN_RULES.map((r) => <RuleCard key={r.id} r={r} />)}</div></section>
      <section><H2 id="tambahan">Faan tambahan</H2><p className="mb-3 text-sm text-muted">Ditambahkan di atas pola tangan.</p><div className="space-y-3">{ADDITIONAL_RULES.map((r) => <RuleCard key={r.id} r={r} />)}</div></section>

      <section id="aturan" className="scroll-mt-4 space-y-3"><H2 id="aturan-lain">Aturan lain</H2>
        <div className="card space-y-2 text-sm"><h3>Cara faan dijumlahkan</h3>
          <ul className="list-disc space-y-1 pl-5"><li>Pola yang berdiri sendiri-sendiri dijumlahkan, misalnya Pure Straight + Half Flush.</li><li>Pola yang sudah tercakup pola lain tidak dihitung dua kali. Contoh: All Honors sudah mencakup All Pongs dan Mixed Orphans; Full Flush menggantikan Half Flush.</li><li>Hasil akhir ditampilkan dalam poin/faan saja: tanpa uang dan tanpa pengali 1,5. Poin = faan.</li></ul></div>
        <div className="card space-y-2 text-sm"><h3>Self Draw vs menang dari buangan</h3>
          <p>Self Draw memberi +1 faan dan <b>dibayar oleh ketiga lawan</b>. Menang dari buangan <b>dibayar oleh pembuang kartu</b>. Pada tangan yang tertutup, kemenangan dari buangan mendapat Concealed Hand +1, sedangkan Self Draw mendapat Self Draw +1 (tidak keduanya). Seven Pairs, Nine Gates, dan Thirteen Orphans sudah termasuk Concealed Hand, jadi tidak ditambah lagi.</p></div>
        <div className="card space-y-2 text-sm"><h3>Angin kursi vs angin ronde</h3>
          <p><b>Angin kursi</b> mengikuti posisi pemain terhadap dealer: dealer = Timur, lalu Selatan, Barat, Utara. <b>Angin ronde</b> adalah angin ronde yang sedang berjalan. Pong angin yang cocok dengan salah satunya +1; jika sama (mis. Timur di ronde Timur) dua-duanya dihitung, total +2. Pada Little Wind dan Great Wind, faan angin kursi dan angin ronde sudah termasuk dan tidak dihitung lagi.</p></div>
        <div className="card space-y-2 text-sm"><h3>Bunga dan Musim</h3>
          <p>Nomor bunga atau musim yang sama dengan nomor kursi (Timur 1, Selatan 2, Barat 3, Utara 4) memberi +1 faan per kartu. Musim: 1 Semi, 2 Panas, 3 Gugur, 4 Dingin. Tanpa bunga sama sekali memberi No Flower +1.</p></div>
        <div className="card space-y-2 text-sm"><h3>Giliran dealer dan ronde</h3>
          <ul className="list-disc space-y-1 pl-5"><li>Dealer menang: {p.dealerWinKeepsDealer ? "dealer tetap" : "dealer berpindah"}.</li><li>Tangan seri: {p.drawKeepsDealer ? "dealer tetap" : "dealer berpindah"}.</li><li>Jika orang lain menang, dealer pindah ke kursi berikutnya dan angin kursi semua pemain ikut bergeser.</li><li>Setelah keempat pemain pernah menjadi dealer, angin ronde berganti: Timur → Selatan → Barat → Utara.</li><li>Game berakhir setelah ronde {ROUND_NAME[p.lastRoundWind]} selesai (bisa diubah saat membuat game).</li></ul></div>
      </section>
    </main>
  );
}
