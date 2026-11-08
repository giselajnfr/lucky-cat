"use client";
import { useState } from "react";
import { HandCalculator, type CalcPayload } from "./HandCalculator";
import { ScoreCard } from "./ScoreCard";
import { DEFAULT_GAME_CONFIG } from "@/lib/scoring";

/** Standalone calculator: same engine and tile input as inside a game, no game required. */
export function QuickScore() {
  const [payload, setPayload] = useState<CalcPayload | null>(null);
  return (
    <div className="mt-4 space-y-4">
      <HandCalculator config={DEFAULT_GAME_CONFIG} onChange={setPayload} />
      {payload ? <ScoreCard payload={payload} /> : <p className="card text-sm text-muted">Lengkapi tangan untuk melihat skor otomatis.</p>}
    </div>
  );
}
