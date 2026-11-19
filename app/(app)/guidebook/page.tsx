import { ruleName } from "@/lib/i18n/ruleNames";
import { StickyTabs } from "@/components/ui/StickyTabs";
import { HandView } from "@/components/mahjong/HandView";
import { Tile } from "@/components/mahjong/Tile";
import { HK18_RULES, HOUSE_RULE_IDS, RULESETS, FAAN_TO_BASE_POINTS, ruleOrigin, exampleToInput, getRuleset, parseTiles } from "@/lib/scoring";
import type { FanRuleConfig } from "@/lib/scoring";
import { getLang, getT } from "@/lib/i18n/server";
import { ruleNeeds, ruleShort, ruleSummary } from "@/lib/i18n/ruleText";
import { LanguageToggle } from "@/components/i18n/LanguageToggle";
import type { Key } from "@/lib/i18n/dictionary";

/** Renders a dictionary string that contains <b> tags (strings are our own, never user input). */
function Rich({ k, vars, as: Tag = "span" }: { k: Key; vars?: Record<string, string | number>; as?: "span" | "p" | "li" }) {
  return <Tag dangerouslySetInnerHTML={{ __html: getT()(k, vars) }} />;
}

/** A row of tiles: always one single line. Tiles are up to 46px wide and shrink on narrow screens so the row never wraps. */
const row = (s: string, w = 46) => {
  const tiles = parseTiles(s);
  return <div className="flex w-full gap-1" style={{ maxWidth: tiles.length * (w + 4) }}>{tiles.map((t, i) => <div key={i} className="min-w-0 flex-1 [&>span]:block"><Tile t={t} fluid /></div>)}</div>;
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
  const t = getT(), lang = getLang();
  const ex = r.example ? exampleToInput(r.example) : null;
  const ctx = r.example && [r.example.method === "SELF_DRAW" ? t("guide.ctx.self") : r.example.method === "DISCARD" ? t("guide.ctx.discard") : null, r.example.seat ? t("guide.ctx.seat", { w: t(`wind.${r.example.seat}` as Key) }) : null, r.example.round ? t("guide.ctx.round", { w: t(`wind.${r.example.round}` as Key) }) : null, r.example.lastTile ? t("guide.ctx.last") : null, r.example.robbingKong ? t("guide.ctx.rob") : null].filter(Boolean).join(" · ");
  return (
    <article id={r.id} className="card scroll-mt-4 space-y-3">
      <div className="flex items-baseline justify-between gap-3"><h3 className="text-xl font-extrabold leading-tight text-cream">{ruleName(lang, r.name)}{!HOUSE_RULE_IDS.includes(r.id) && ruleOrigin(r.id) !== "classic" ? <span className="ml-2 inline-block align-middle rounded-full border border-line px-2.5 py-1 text-[11px] font-bold text-muted">{RULESETS[ruleOrigin(r.id)].name.replace("Hong Kong ", "HK ")}</span> : null}</h3>
        <span className="shrink-0 rounded-full bg-cream px-3 py-1 text-sm font-extrabold text-base">{r.perUnit ? t("guide.perTile", { fan: r.fan }) : t("guide.faan", { fan: r.fan })}</span></div>
      <p className="text-sm" style={{ color: "rgb(196 173 142 / var(--tw-text-opacity, 1))" }}>{ruleSummary(lang, r.id, r.summary)}</p>
      {r.needsInput && <p className="text-xs text-muted">{t("guide.needs")} <b className="text-cream">{ruleNeeds(lang, r.needsInput)}</b></p>}
      {ex && (<div>{ctx && <p className="mb-1.5 text-xs font-semibold text-muted">{ctx}</p>}<FocusedPatternExample rule={r} hand={r.example!.hand} /></div>)}
    </article>
  );
}

/** Compact "Bonus faan" lists, grouped like a cheat sheet: one short line per rule, tiles only for winds and dragons. */
const UNIT: Record<string, Key> = { "dragon-pong": "guide.u.perSet", "suitable-flower": "guide.u.perTile", "full-flowers": "guide.u.perSet2" };
const GROUPS: { title: Key; ids: string[]; note?: Key }[] = [
  { title: "guide.g.windsDragons", ids: ["seat-wind", "round-wind", "dragon-pong"], note: "guide.g.windsNote" },
  { title: "guide.g.flowers", ids: ["no-flower", "suitable-flower", "full-flowers", "eight-flowers"], note: "guide.g.flowersNote" },
];
// One example per rule: seat wind shows East, round wind shows South.
const tilesFor = (id: string) => id === "seat-wind" ? <div className="mt-2">{row("E E E", 34)}</div>
  : id === "round-wind" ? <div className="mt-2">{row("S S S", 34)}</div> : null;
const DRAGONS = [
  { key: "RD", id: "Merah", en: "Red Dragon" },
  { key: "GD", id: "Hijau", en: "Green Dragon" },
  { key: "WD", id: "Putih", en: "White Dragon" },
];

function AdditionalCard({ r }: { r: FanRuleConfig }) {
  const t = getT(), lang = getLang();
  if (r.id === "dragon-pong") return (<>{DRAGONS.map((d) => (
    <article key={d.key} id={`${r.id}-${d.key}`} className="card scroll-mt-4 !px-4 !py-3">
      <div className="flex items-baseline justify-between gap-3"><h3 className="text-lg font-extrabold leading-tight text-cream">{lang === "id" ? `Naga ${d.id}` : d.en}</h3>
        <span className="shrink-0 rounded-full bg-cream px-3 py-0.5 text-sm font-extrabold text-base">{t("guide.faan", { fan: r.fan })}</span></div>
      <p className="mt-1 text-sm text-muted">{lang === "id" ? `Pong/kong naga ${d.id.toLowerCase()}.` : `Pong/kong of ${d.en.toLowerCase()}.`}</p>
      <div className="mt-2">{row(`${d.key} ${d.key} ${d.key}`, 34)}</div>
    </article>))}</>);
  const origin = HOUSE_RULE_IDS.includes(r.id) ? null : ruleOrigin(r.id);
  return (
    <article id={r.id} className="card scroll-mt-4 !px-4 !py-3">
      <div className="flex items-baseline justify-between gap-3"><h3 className="text-lg font-extrabold leading-tight text-cream">{ruleName(lang, r.name)}{origin && origin !== "classic" ? <span className="ml-2 inline-block align-middle rounded-full border border-line px-2 py-0.5 text-[10px] font-bold text-muted">{RULESETS[origin].name.replace("Hong Kong ", "HK ")}</span> : null}</h3>
        <span className="shrink-0 rounded-full bg-cream px-3 py-0.5 text-sm font-extrabold text-base">{UNIT[r.id] ? t(UNIT[r.id]) : t("guide.faan", { fan: r.fan })}</span></div>
      <p className="mt-1 text-sm text-muted">{ruleShort(lang, r.id, r.summary)}</p>
      {tilesFor(r.id)}
    </article>
  );
}
function AdditionalList({ rules }: { rules: FanRuleConfig[] }) {
  const t = getT();
  const used = new Set(GROUPS.flatMap((g) => g.ids));
  const groups = [...GROUPS.map((g) => ({ ...g, rules: g.ids.map((id) => rules.find((r) => r.id === id)).filter(Boolean) as FanRuleConfig[] })),
    { title: "guide.g.win" as Key, note: undefined as Key | undefined, ids: [] as string[], rules: rules.filter((r) => !used.has(r.id)) }].filter((g) => g.rules.length);
  return (
    <div className="space-y-6">{groups.map((g) => (
      <div key={g.title} className="space-y-2.5"><h2 className="section-label">{t(g.title)}</h2>
        {g.rules.map((r) => <AdditionalCard key={r.id} r={r} />)}
        {g.note && <p className="px-1 text-xs text-muted">{t(g.note)}</p>}</div>))}
    </div>
  );
}

export default function Page() {
  const t = getT();
  const p = HK18_RULES.progression;
  const rs = getRuleset();   // the full rule set (New 18 = superset); each rule is labelled with where it comes from
  const pattern = rs.scoringRules.filter((r) => r.category === "pattern" && r.enabled);
  const additional = rs.scoringRules.filter((r) => r.category === "additional" && r.enabled);
  const header = <div className="flex items-center justify-between gap-3"><h1 className="text-[1.9rem] font-extrabold leading-tight">{t("guide.title")}</h1><LanguageToggle /></div>;
  return (
    <main>
      <StickyTabs header={header} tabs={[
        { id: "dasar", label: t("guide.tab.basics"), content: (
      <section>
        <div className="space-y-4">
          <p className="text-sm text-muted">{t("guide.intro")}</p>
          <p className="text-sm"><Rich k="guide.overview" /></p>
          <div className="card space-y-3"><h3>{t("guide.tiles")}</h3>
            <div><p className="mb-1 text-xs font-semibold text-muted">{t("guide.t.char")}</p>{row("123456789m")}</div>
            <div><p className="mb-1 text-xs font-semibold text-muted">{t("guide.t.bamboo")}</p>{row("123456789s")}</div>
            <div><p className="mb-1 text-xs font-semibold text-muted">{t("guide.t.dots")}</p>{row("123456789p")}</div>
            <div><p className="mb-1 text-xs font-semibold text-muted">{t("guide.t.winds")}</p>{row("E S W N")}</div>
            <div><p className="mb-1 text-xs font-semibold text-muted">{t("guide.t.dragons")}</p>{row("RD GD WD")}</div>
            <div><p className="mb-1 text-xs font-semibold text-muted">{t("guide.t.flowers")}</p>{row("F1 F2 F3 F4 S1 S2 S3 S4")}</div>
            <p className="text-xs text-muted">{t("guide.t.note")}</p></div>
          <div className="card space-y-3"><h3>{t("guide.sets")}</h3>
            <div><p className="text-sm"><Rich k="guide.chow" /></p>{row("345m")}</div>
            <div><p className="text-sm"><Rich k="guide.pong" /></p>{row("777p")}</div>
            <div><p className="text-sm"><Rich k="guide.kong" /></p>{row("RD RD RD RD")}</div>
            <div><p className="text-sm"><Rich k="guide.pair" /></p>{row("EE")}</div></div>
          <div className="card space-y-2 text-sm"><h3>{t("guide.flow")}</h3>
            <ol className="list-decimal space-y-1 pl-5"><li>{t("guide.flow1")}</li><li>{t("guide.flow2")}</li><Rich as="li" k="guide.flow3" /><Rich as="li" k="guide.flow4" /></ol></div>
          <div className="card space-y-2 text-sm"><h3>{t("guide.min", { min: rs.minimumFanToWin, max: rs.maximumFan ?? 13 })}</h3>
            <Rich as="p" k="guide.minBody" vars={{ min: rs.minimumFanToWin, max: rs.maximumFan ?? 13 }} /></div>
        </div></section>
        ) },
        { id: "pola", label: t("guide.tab.patterns"), content: (
      <section><div className="space-y-3">{pattern.map((r) => <RuleCard key={r.id} r={r} />)}</div></section>
        ) },
        { id: "tambahan", label: t("guide.tab.extra"), content: (
      <section><p className="mb-3 text-sm text-muted">{t("guide.extraIntro")}</p><AdditionalList rules={additional} /></section>
        ) },
        { id: "aturan", label: t("guide.tab.other"), content: (
      <section id="aturan" className="scroll-mt-4 space-y-3">
        <section className="card space-y-2 text-sm">
          <h3 className="text-xl font-extrabold tracking-tight text-cream">{t("guide.calc")}</h3>
          <p>{t("guide.calcBody")}</p>
        </section>

        <section className="card space-y-2 text-sm">
          <h3 className="text-xl font-extrabold tracking-tight text-cream">{t("guide.table")}</h3>
          <p>{t("guide.tableBody")}</p>
          <div className="overflow-hidden rounded-xl border border-line">
            <div className="grid grid-cols-2 bg-base/40 px-3 py-2 text-xs font-bold uppercase tracking-wide text-muted"><span>{t("guide.col.faan")}</span><span>{t("guide.col.base")}</span></div>
            {FAAN_TO_BASE_POINTS.map((points, faan) => (
              <div key={faan} className="grid grid-cols-2 border-t border-line px-3 py-2"><b>{faan}</b><span className="tabular-nums">{points}</span></div>
            ))}
          </div>
        </section>

        <section className="card space-y-3 text-sm">
          <h3 className="text-xl font-extrabold tracking-tight text-cream">{t("guide.who")}</h3>
          <div className="space-y-3">
            <div><p className="font-bold text-cream">Self Draw</p><Rich as="p" k="guide.selfBody" /></div>
            <div><p className="font-bold text-cream">Discard Win</p><p>{t("guide.discardIntro")}</p>
              <ul className="list-disc space-y-1 pl-5">
                <Rich as="li" k="guide.discardAll" />
                <Rich as="li" k="guide.discardHalf" />
              </ul>
            </div>
          </div>
        </section>

        <section className="card space-y-1.5 text-sm">
          <h3 className="text-xl font-extrabold tracking-tight text-cream">{t("guide.cap")}</h3>
          <Rich as="p" k="guide.capBody" />
        </section>

        <section className="card space-y-1.5 text-sm">
          <h3 className="text-xl font-extrabold tracking-tight text-cream">{t("guide.minTitle")}</h3>
          <Rich as="p" k="guide.minReq" vars={{ min: rs.minimumFanToWin }} />
        </section>
      </section>
        ) },
      ]} />
    </main>
  );
}
