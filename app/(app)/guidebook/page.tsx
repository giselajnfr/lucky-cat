import Link from "next/link";
import { HandView } from "@/components/mahjong/HandView";
import { Tile } from "@/components/mahjong/Tile";
import { HK18_RULES, RULESETS, RULESET_IDS, exampleToInput, getRuleset, parseTiles } from "@/lib/scoring";
import type { FanRuleConfig, RulesetId } from "@/lib/scoring";

const ROUND_NAME: Record<string, string> = { east: "Timur", south: "Selatan", west: "Barat", north: "Utara" };
const WIND = { E: "Timur", S: "Selatan", W: "Barat", N: "Utara" } as const;
/** A row of tiles: always one single line. Tiles are up to 46px wide and shrink on narrow screens so the row never wraps. */
const row = (s: string, w = 46) => {
  const tiles = parseTiles(s);
  return <div className="flex gap-1" style={{ maxWidth: tiles.length * (w + 4) }}>{tiles.map((t, i) => <div key={i} className="min-w-0 flex-1 [&>span]:block"><Tile t={t} fluid /></div>)}</div>;
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
      {ex && (<div><p className="mb-1.5 text-xs font-semibold text-muted">Contoh{ctx ? ` (${ctx})` : ""}</p><HandView concealed={ex.concealedTiles} melds={ex.melds} winningTile={ex.winningTile} flowers={ex.flowers} width={32} fit /></div>)}
    </article>
  );
}


export default function Page({ searchParams }: { searchParams?: { ruleset?: string } }) {
  const p = HK18_RULES.progression;
  const rs = getRuleset(searchParams?.ruleset);
  const pattern = rs.scoringRules.filter((r) => r.category === "pattern" && r.enabled);
  const additional = rs.scoringRules.filter((r) => r.category === "additional" && r.enabled);
  const waits = RULESETS.new18.scoringRules.filter((r) => r.id === "single-wait");
  const waitFan = (id: string) => (id === "single-wait" ? rs.specialRules.waitFan.single : id === "closed-wait" ? rs.specialRules.waitFan.closed : id === "edge-wait" ? rs.specialRules.waitFan.edge : rs.specialRules.waitFan.twoSided);
  return (
    <main className="space-y-8">
      <header><h1 className="text-[1.75rem]">Aturan Hong Kong</h1><p className="mt-1 text-sm text-muted">Panduan Mahjong untuk pemula dan pemain lama. Nilai faan di halaman ini diambil dari konfigurasi yang sama dengan kalkulator.</p>
        <nav className="-mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-1 text-sm font-semibold" aria-label="Lompat ke">
          {[["dasar", "Dasar"], ["pola", "Pola tangan"], ["tambahan", "Faan tambahan"], ["wait", "Jenis wait"], ["aturan", "Aturan lain"]].map(([id, l]) => <a key={id} href={`#${id}`} className="shrink-0 rounded-full border border-line bg-card px-3.5 py-2">{l}</a>)}</nav>
        <div className="mt-3 grid grid-cols-3 gap-2" role="tablist" aria-label="Pilih ruleset">{RULESET_IDS.map((id) => <Link key={id} href={`/guidebook?ruleset=${id}`} scroll={false} role="tab" aria-selected={rs.id === id} className={`flex min-h-[44px] items-center justify-center rounded-xl border px-2 text-center text-sm font-bold ${rs.id === id ? "border-cream bg-cream text-base" : "border-line bg-card text-cream"}`}>{RULESETS[id as RulesetId].name.replace("Hong Kong ", "")}</Link>)}</div>
        <div className="card mt-3 space-y-1" aria-live="polite"><p className="section-label">Ruleset aktif</p><p className="text-xl font-extrabold">{rs.emoji} {rs.name} <span className="text-base font-semibold text-muted">{rs.nameZh}</span></p>
          <p className="text-sm">Minimum untuk menang: <b>{rs.minimumFanToWin} faan</b> · Maksimum: <b>{rs.maximumFan} faan</b></p><p className="text-xs text-muted">{rs.description} Aturan di bawah hanya berlaku untuk {rs.name}.</p></div>
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
          <div className="card space-y-2 text-sm"><h3>Minimum {rs.minimumFanToWin} faan · maksimum {rs.maximumFan} faan</h3>
            <p>Pada {rs.name}, tangan menang harus bernilai minimal <b>{rs.minimumFanToWin} faan</b> untuk sah, dan faan dibayar paling banyak <b>{rs.maximumFan} faan</b> (meja boleh memilih batas lain saat membuat game). Faan dari pola tangan dan faan tambahan dijumlahkan. Chicken Hand bernilai 0 faan, jadi tidak cukup sendirian. Pemain memilih buku aturan sendiri saat memulai meja: <b>Chicken Hand</b> (tanpa minimum), <b>Beginner</b> (minimum 3 faan) atau <b>Advanced</b> (minimum 5 faan), dan boleh memakai batas faan (cap).</p></div>
        </div></section>

      <section><H2 id="pola">Pola tangan</H2><div className="space-y-3">{pattern.map((r) => <RuleCard key={r.id} r={r} />)}</div></section>
      <section><H2 id="tambahan">Faan tambahan</H2><p className="mb-3 text-sm text-muted">Ditambahkan di atas pola tangan.</p><div className="space-y-3">{additional.map((r) => <RuleCard key={r.id} r={r} />)}</div></section>

      <section id="wait" className="scroll-mt-4 space-y-3"><H2 id="wait-h">Jenis wait dan pasangan</H2>
        <div className="card space-y-2 text-sm"><p>Wait adalah cara kartu menang melengkapi tangan. Aplikasi membacanya dari susunan tangan: bila satu kartu bisa dibaca lebih dari satu cara, nilai terbaik bagi pemenang yang dipakai.</p>
          <p><b>Pasangan 2-5-8 (二五八將)</b>: {rs.specialRules.pair258 ? "pasangan berupa angka 2, 5 atau 8 memberi 1 faan." : "tidak dihitung di ruleset ini."}</p></div>
        {waits.map((r) => { const f = waitFan(r.id); return <RuleCard key={r.id} r={{ ...r, fan: f, enabled: true, summary: (r.id === "single-wait" && !rs.specialRules.waitBonuses) || (r.id !== "single-wait" && f === 0) ? `${r.summary} Di ${rs.name}: dideteksi dan ditampilkan, tanpa faan.` : r.summary }} />; })}</section>

      <section id="aturan" className="scroll-mt-4 space-y-3"><H2 id="aturan-lain">Aturan lain</H2>
        <div className="card space-y-2 text-sm"><h3>Cara faan dijumlahkan</h3>
          <ul className="list-disc space-y-1 pl-5">
            <li>Semua pola yang cocok dijumlahkan.</li>
            <li>Pola yang sudah tercakup tidak dihitung dua kali. Contoh: Full Flush menggantikan Half Flush.</li>
            <li>Total dibatasi maksimum <b>{rs.maximumFan} faan</b>. Poin = faan.</li>
          </ul></div>
        <div className="card space-y-2 text-sm"><h3>Cara menang</h3>
          <ul className="list-disc space-y-1 pl-5">
            <li><b>Self Draw</b>: +1 faan, dibayar ketiga lawan.</li>
            <li><b>Dari buangan</b>: dibayar oleh pembuang kartu.</li>
            {rs.id !== "classic" && <li><b>Concealed Hand</b>: +1 faan jika tangan tertutup dan menang dari buangan.</li>}
            {rs.id === "new6" && <li><b>Fully Concealed</b>: +3 faan menggantikan Self Draw pada tangan tertutup.</li>}
          </ul></div>
        <div className="card space-y-2 text-sm"><h3>Angin kursi dan angin ronde</h3>
          <ul className="list-disc space-y-1 pl-5">
            <li><b>Angin kursi</b>: dealer = Timur, lalu Selatan, Barat, Utara.</li>
            <li><b>Angin ronde</b>: angin ronde yang sedang berjalan.</li>
            <li>Pong angin yang cocok: +1 faan. Jika kursi dan ronde sama, +2 faan.</li>
          </ul></div>
        <div className="card space-y-2 text-sm"><h3>Bunga dan musim</h3>
          <ul className="list-disc space-y-1 pl-5">
            <li>Nomor sama dengan kursi (Timur 1, Selatan 2, Barat 3, Utara 4): +1 faan per kartu.</li>
            <li>Tanpa bunga sama sekali: +1 faan.</li>
            <li>Empat bunga atau empat musim lengkap: +2 faan.</li>
            <li>Delapan kartu lengkap: 8 faan (menggantikan bonus set lengkap).</li>
          </ul></div>
        <div className="card space-y-2 text-sm"><h3>Dealer dan ronde</h3>
          <ul className="list-disc space-y-1 pl-5">
            <li>Dealer menang: {p.dealerWinKeepsDealer ? "dealer tetap" : "dealer berpindah"}. Tangan seri: {p.drawKeepsDealer ? "dealer tetap" : "dealer berpindah"}.</li>
            <li>Orang lain menang: dealer pindah ke kursi berikutnya.</li>
            <li>Setelah keempat pemain jadi dealer, ronde berganti: Timur → Selatan → Barat → Utara.</li>
            <li>Game selesai setelah ronde {ROUND_NAME[p.lastRoundWind]}.</li>
          </ul></div>
      </section>

    </main>
  );
}
