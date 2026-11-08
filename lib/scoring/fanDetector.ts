import { FAN_TABLE, REVIEW_NOTES } from "./hk18Rules";
import { PATTERN_CHECKS } from "./hk18Patterns";
import type { DetectedFan, ScoringContext } from "./types";

const FLOWER_IDS = ["suitable-flower", "no-flower"];

/** Detect every enabled rule, then drop any rule that an already-detected rule includes. */
export function detectFan(ctx: ScoringContext) {
  const cfg = ctx.config;
  const table = (cfg.fanTable ?? FAN_TABLE).filter((r) => r.enabled && r.id !== "chicken-hand" && (cfg.enableFlowers || !FLOWER_IDS.includes(r.id)));
  const hits: (DetectedFan & { excludes: string[] })[] = [];
  for (const r of table) {
    const res = PATTERN_CHECKS[r.id]?.(ctx);
    const n = res === true ? 1 : !res ? 0 : res;
    if (n > 0) {
      const excludes = (r.excludes ?? []).flatMap((x) => {
        if (x === "dragon-pong:cfg") return cfg.dragonPongStacksWithDragonHands ? [] : ["dragon-pong"];
        if (x === "wind-pong:cfg") return cfg.windPongStacksWithWindHands ? [] : ["seat-wind", "round-wind"];
        return [x];
      });
      hits.push({ id: r.id, name: r.name, fan: r.fan * n, category: r.category, count: n, excludes });
    }
  }
  const excludedBy = new Map<string, string>();
  for (const h of hits) for (const x of h.excludes) if (!excludedBy.has(x)) excludedBy.set(x, h.id);
  const kept = hits.filter((h) => !excludedBy.has(h.id));
  const excludedFan = hits.filter((h) => excludedBy.has(h.id)).map((h) => ({ id: h.id, name: h.name, byId: excludedBy.get(h.id)! }));

  // Chicken Hand: no hand pattern at all. Worth 0 faan, so it only labels the hand.
  const chicken = (cfg.fanTable ?? FAN_TABLE).find((r) => r.id === "chicken-hand");
  const detected: DetectedFan[] = kept.map(({ excludes: _e, ...rest }) => rest);
  if (chicken?.enabled && !detected.some((d) => d.category === "pattern"))
    detected.unshift({ id: "chicken-hand", name: chicken.name, fan: 0, category: "pattern", count: 1 });

  const ids = new Set(detected.map((d) => d.id));
  const reviewFlags = REVIEW_NOTES.filter((n) => n.when.every((w) => ids.has(w))).map((n) => n.note);
  return { detected, excludedFan, reviewFlags };
}

export function calculateFan(ctx: ScoringContext) {
  const d = detectFan(ctx);
  const rawFan = d.detected.reduce((s, f) => s + f.fan, 0);
  const max = ctx.config.maximumFan;
  return { ...d, rawFan, totalFan: max == null ? rawFan : Math.min(rawFan, max) };
}
