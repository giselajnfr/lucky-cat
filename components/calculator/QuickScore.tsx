"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { HandCalculator, type CalcPayload } from "./HandCalculator";
import { ScoreCard } from "./ScoreCard";
import { DEFAULT_RULESET_ID, RULESETS, RULESET_IDS, configFromRuleset } from "@/lib/scoring";
import type { RulesetId } from "@/lib/scoring";

/** Standalone calculator: same engine and tile input as inside a game, no game required. The ruleset decides the fan table, minimum and cap. */
export function QuickScore() {
  const [payload, setPayload] = useState<CalcPayload | null>(null);
  const [ruleset, setRuleset] = useState<RulesetId>(DEFAULT_RULESET_ID);
  const config = useMemo(() => configFromRuleset(ruleset), [ruleset]);
  const rs = RULESETS[ruleset];
  return (
    <div className="mt-4 space-y-4">
      <section className="card space-y-3" aria-label="Aturan Hong Kong">
        <h2 className="section-label">Aturan yang dipakai</h2>
        <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Aturan Hong Kong">
          {RULESET_IDS.map((id) => (
            <button key={id} type="button" role="radio" aria-checked={ruleset === id} onClick={() => setRuleset(id)}
              className={`min-h-[48px] rounded-xl border px-2 text-sm font-bold transition ${ruleset === id ? "border-cream bg-cream text-base" : "border-line bg-card text-cream"}`}>
              {RULESETS[id].name.replace("Hong Kong ", "")}
            </button>))}
        </div>
        <p className="text-xs text-muted"><b className="text-cream">{rs.name}</b> · minimum {rs.minimumFanToWin} faan · maksimum {rs.maximumFan} faan. <Link href="/guidebook" className="underline">Lihat aturan</Link></p>
      </section>
      <HandCalculator key={ruleset} config={config} onChange={setPayload} />
      {payload ? <ScoreCard payload={payload} /> : <p className="card text-sm text-muted">Lengkapi tangan untuk melihat skor otomatis.</p>}
    </div>
  );
}
