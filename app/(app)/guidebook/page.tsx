import { StickyTabs } from "@/components/ui/StickyTabs";
import { HandView } from "@/components/mahjong/HandView";
import { Tile } from "@/components/mahjong/Tile";
import { HK18_RULES, HOUSE_RULE_IDS, RULESETS, ruleOrigin, exampleToInput, getRuleset, parseTiles } from "@/lib/scoring";
import type { FanRuleConfig } from "@/lib/scoring";

const ROUND_NAME: Record<string, string> = { east: "Timur", south: "Selatan", west: "Barat", north: "Utara" };
const WIND = { E: "Timur", S: "Selatan", W: "Barat", N: "Utara" } as const;
/** A row of tiles: always one single line. Tiles are up to 46px wide and shrink on narrow screens so the row never wraps. */
const row = (s: string, w = 46) => {
  const tiles = parseTiles(s);
  return <div className="flex gap-1" style={{ maxWidth: tiles.length * (w + 4) }}>{tiles.map((t, i) => <div key={i} className="min-w-0 flex-1 [&>span]:block"><Tile t={t} fluid /></div>)}</div>;
};
/** Rule example in the order it is written: one block per set, the pair last (so chows read 123 123 456, never 112233). */
function exampleGroups(hand: string): string[][] {
  const out: string[][] = [];
  for (const tok of hand.trim().split(/\s+/)) {
    const tiles = parseTiles(tok), prev = out[out.length - 1];
    if (tiles.length === 1 && prev && prev.length < 4 && prev.every((t) => t === tiles[0]) && !/^\d/.test(tok)) prev.push(tiles[0]);
    else out.push([...tiles]);
  }
  return out.length > 8 ? [out.flat()] : out;   // e.g. Thirteen Orphans: one plain row
}

/** Show only the tile groups that demonstrate each pattern; the remaining winning-hand tiles are intentionally omitted. */
const PATTERN_GROUPS: Record<string, number> = {
  "double-chow": 2, "double-double-chows": 4, "four-into-one": 2,
  "min-max-chow": 2, "min-max-pung": 2,
  "three-sequence-pung": 3, "four-sequence-pung": 4,
  "three-suits-pung": 3, "three-suits-chow": 3,
  "all-concealed-triplets": 4,
  "pure-straight": 3,
};
function FocusedPatternExample({ rule, hand }: { rule: FanRuleConfig; hand: string }) {
  const count = PATTERN_GROUPS[rule.id];
  if (!count) return <HandView concealed={exampleToInput(rule.example!).concealedTiles} groups={exampleGroups(hand)} melds={exampleToInput(rule.example!).melds} winningTile={exampleToInput(rule.example!).winningTile} flowers={exampleToInput(rule.example!).flowers} width={32} fit />;
  const tokens = hand.trim().split(/\s+/).slice(0, count);
  return <div className="flex flex-wrap items-center gap-x-3 gap-y-1">{tokens.map((token, i) => <div key={`${token}-${i}`}>{row(token, 34)}</div>)}</div>;
}
const H2 = ({ id, children }: { id: string; children: React.ReactNode }) => <h2 id={id} className="mb-3 scroll-mt-4 text-xl">{children}</h2>;

function RuleCard({ r }: { r: FanRuleConfig }) {
  const ex = r.example ? exampleToInput(r.example) : null;
  const ctx = r.example && [r.example.method === "SELF_DRAW" ? "Self Draw" : r.example.method === "DISCARD" ? "dari buangan" : null, r.example.seat ? `kursi ${WIND[r.example.seat]}` : null, r.example.round ? `ronde ${WIND[r.example.round]}` : null, r.example.lastTile ? "kartu terakhir" : null, r.example.robbingKong ? "rampas kong" : null].filter(Boolean).join(" · ");
  return (
    <article id={r.id} className="card scroll-mt-4 space-y-3">
      <div className="flex items-baseline justify-between gap-3"><h3 className="text-xl font-extrabold leading-tight text-cream">{r.name}{!HOUSE_RULE_IDS.includes(r.id) && ruleOrigin(r.id) !== "classic" ? <span className="ml-2 inline-block align-middle rounded-full border border-line px-2.5 py-1 text-[11px] font-bold text-muted">{RULESETS[ruleOrigin(r.id)].name.replace("Hong Kong ", "HK ")}</span> : null}</h3>
        <span className="shrink-0 rounded-full bg-cream px-3 py-1 text-sm font-extrabold text-base">{r.perUnit ? `${r.fan} per kartu` : `${r.fan} faan`}</span></div>
      <p className="text-sm" style={{ color: "rgb(196 173 142 / var(--tw-text-opacity, 1))" }}>{r.summary}</p>
      {r.needsInput && <p className="text-xs text-muted">Perlu diisi pemain: <b className="text-cream">{r.needsInput}</b></p>}
      {ex && (<div>{ctx && <p className="mb-1.5 text-xs font-semibold text-muted">{ctx}</p>}<FocusedPatternExample rule={r} hand={r.example!.hand} /></div>)}
    </article>
  );
}

/** Compact "Faan tambahan" lists, grouped like a cheat sheet: one short line per rule, tiles only for winds and dragons. */
const SHORT: Record<string, string> = {
  "seat-wind": "Pong/kong angin sesuai kursi pemenang.", "round-wind": "Pong/kong angin ronde yang sedang berjalan.", "dragon-pong": "Pong/kong naga (merah, hijau atau putih).",
  "no-flower": "Tidak punya bunga atau musim sama sekali.", "suitable-flower": "Bunga/musim bernomor sama dengan kursi pemenang.", "full-flowers": "Empat bunga atau empat musim lengkap.", "eight-flowers": "Kedelapan bunga dan musim. Menggantikan Full Flowers.",
  "self-draw": "Kartu menang diambil sendiri dari tumpukan.", "self-draw-after-kong": "Menang dari kartu pengganti setelah menyatakan kong.", "concealed-hand": "Menang dari buangan tanpa set terbuka.", "last-tile": "Menang dengan kartu terakhir.", "robbing-kong": "Menang dengan kartu yang dipakai lawan untuk menambah kong.",
  "single-wait": "Menunggu satu kartu: melengkapi pasangan.", "heavenly-hand": "Dong menang dengan tangan awalnya.", "earthly-hand": "Pemain non-dong menang dari buangan pertama dong.", "fully-exposed": "Semua set dibuka, menang dari buangan untuk melengkapi pasangan.", "three-concealed-pungs": "Tiga pong/kong tertutup.", "fully-concealed": "Self Draw tanpa set terbuka (menggantikan Self Draw + Concealed Hand).",
};
const UNIT: Record<string, string> = { "dragon-pong": "1 per set", "suitable-flower": "1 per kartu", "full-flowers": "2 per set" };
const GROUPS: { title: string; ids: string[]; note?: string }[] = [
  { title: "Angin & naga", ids: ["seat-wind", "round-wind", "dragon-pong"], note: "Angin ganda: bila angin kursi sama dengan angin ronde, pong-nya bernilai 2 faan." },
  { title: "Bunga & musim", ids: ["no-flower", "suitable-flower", "full-flowers", "eight-flowers"], note: "Nomor bunga dan musim mengikuti angin: 1 Timur, 2 Selatan, 3 Barat, 4 Utara." },
];
const slashRows = (items: string[]) => <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">{items.map((t, i) => <div key={t} className="flex items-center gap-2">{i > 0 && <span className="text-lg font-bold text-muted">/</span>}{row(t, 34)}</div>)}</div>;
const tilesFor = (id: string) => id === "seat-wind" || id === "round-wind"
  ? slashRows(["E E E", "S S S", "W W W", "N N N"])
  : id === "dragon-pong" ? slashRows(["RD RD RD", "GD GD GD", "WD WD WD"]) : null;

function AdditionalCard({ r }: { r: FanRuleConfig }) {
  const origin = HOUSE_RULE_IDS.includes(r.id) ? null : ruleOrigin(r.id);
  return (
    <article id={r.id} className="card scroll-mt-4 !px-4 !py-3">
      <div className="flex items-baseline justify-between gap-3"><h3 className="text-lg font-extrabold leading-tight text-cream">{r.name}{origin && origin !== "classic" ? <span className="ml-2 inline-block align-middle rounded-full border border-line px-2 py-0.5 text-[10px] font-bold text-muted">{RULESETS[origin].name.replace("Hong Kong ", "HK ")}</span> : null}</h3>
        <span className="shrink-0 rounded-full bg-cream px-3 py-0.5 text-sm font-extrabold text-base">{UNIT[r.id] ?? `${r.fan} faan`}</span></div>
      <p className="mt-1 text-sm text-muted">{SHORT[r.id] ?? r.summary}</p>
      {tilesFor(r.id)}
    </article>
  );
}
function AdditionalList({ rules }: { rules: FanRuleConfig[] }) {
  const used = new Set(GROUPS.flatMap((g) => g.ids));
  const groups = [...GROUPS.map((g) => ({ ...g, rules: g.ids.map((id) => rules.find((r) => r.id === id)).filter(Boolean) as FanRuleConfig[] })),
    { title: "Cara menang", note: undefined as string | undefined, ids: [], rules: rules.filter((r) => !used.has(r.id)) }].filter((g) => g.rules.length);
  return (
    <div className="space-y-6">{groups.map((g) => (
      <div key={g.title} className="space-y-2.5"><h2 className="section-label">{g.title}</h2>
        {g.rules.map((r) => <AdditionalCard key={r.id} r={r} />)}
        {g.note && <p className="px-1 text-xs text-muted">{g.note}</p>}</div>))}
    </div>
  );
}

export default function Page() {
  const p = HK18_RULES.progression;
  const rs = getRuleset();   // the full rule set (New 18 = superset); each rule is labelled with where it comes from
  const pattern = rs.scoringRules.filter((r) => r.category === "pattern" && r.enabled);
  const additional = rs.scoringRules.filter((r) => r.category === "additional" && r.enabled);
  const header = <h1 className="text-[1.9rem] font-extrabold leading-tight">Aturan Hong Kong</h1>;
  return (
    <main>
      <StickyTabs header={header} tabs={[
        { id: "dasar", label: "Dasar", content: (
      <section>
        <div className="space-y-4">
          <p className="text-sm text-muted">Panduan Mahjong untuk pemula dan pemain lama. Nilai faan di halaman ini diambil dari konfigurasi yang sama dengan kalkulator.</p>
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
          <div className="card space-y-2 text-sm"><h3>Minimum {rs.minimumFanToWin} faan · maksimum {rs.maximumFan ?? 13} faan</h3>
            <p>Untuk menang, kumpulkan minimal <b>{rs.minimumFanToWin} faan</b>. Semua faan pola dan bonus dijumlahkan, hingga batas maksimum <b>{rs.maximumFan ?? 13} faan</b>. Pilih mode <b>Chicken Hand</b> (tanpa minimum), <b>Beginner</b> (3 faan), atau <b>Advanced</b> (5 faan) saat membuat meja.</p></div>
        </div></section>
        ) },
        { id: "pola", label: "Pola tangan", content: (
      <section><div className="space-y-3">{pattern.map((r) => <RuleCard key={r.id} r={r} />)}</div></section>
        ) },
        { id: "tambahan", label: "Faan tambahan", content: (
      <section><p className="mb-3 text-sm text-muted">Ditambahkan di atas faan pola tangan.</p><AdditionalList rules={additional} /></section>
        ) },
        { id: "aturan", label: "Aturan lain", content: (
      <section id="aturan" className="scroll-mt-4 space-y-3">
        <div className="card space-y-2 text-sm"><h3>Cara faan dijumlahkan</h3>
          <ul className="list-disc space-y-1 pl-5">
            <li>Semua pola yang cocok dijumlahkan.</li>
            <li>Pola yang sudah tercakup tidak dihitung dua kali. Contoh: Full Flush menggantikan Half Flush.</li>
            <li>Total dibatasi maksimum <b>{rs.maximumFan ?? 13} faan</b>. Poin = faan.</li>
          </ul></div>
        <div className="card space-y-2 text-sm"><h3>Cara menang</h3>
          <ul className="list-disc space-y-1 pl-5">
            <li><b>Self Draw</b>: +1 faan, dibayar ketiga lawan.</li>
            <li><b>Self Draw After Kong</b>: +1 faan jika menang dari kartu pengganti setelah menyatakan kong.</li>
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
        ) },
      ]} />
    </main>
  );
}
