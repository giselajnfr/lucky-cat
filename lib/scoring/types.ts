export type Wind = "E" | "S" | "W" | "N";
export type Dragon = "RD" | "GD" | "WD";
export type NumberedTile = `${1|2|3|4|5|6|7|8|9}${"m"|"s"|"p"}`; // m=characters s=bamboo p=dots
export type PlayTile = NumberedTile | Wind | Dragon;
export type BonusTile = "F1"|"F2"|"F3"|"F4"|"S1"|"S2"|"S3"|"S4"; // F = flowers, S = seasons (1=Spring..4=Winter)
export type Tile = PlayTile | BonusTile;

export type SetType = "CHOW" | "PUNG" | "KONG";
export type Meld = { type: SetType; tiles: PlayTile[]; exposed: boolean };
export type HandKind = "STANDARD" | "SEVEN_PAIRS" | "THIRTEEN_ORPHANS";
export type HandDecomposition = { kind: HandKind; sets: Meld[]; pair: PlayTile[] };
export type WinMethod = "SELF_DRAW" | "DISCARD";

/** How the winning tile completed the hand. single = pair (eyes) wait, closed = middle of a chow, edge = 3 of 123 / 7 of 789, twoSided = open-ended chow wait, dualPung = waiting on two pungs. */
export type WaitType = "single" | "closed" | "edge" | "twoSided" | "dualPung";
export type RulesetId = "classic" | "new6" | "new18";
/** A conflict: when `rule` is detected, the rules in `supersedes` are NOT counted (they are already included, or the two may not stack). */
export type RuleConflict = { rule: string; supersedes: string[]; reason: string };

export type DiscardPaymentMode = "DISCARDER_PAYS_ALL" | "DISCARDER_FULL_OTHERS_HALF";
export type RuleCategory = "pattern" | "additional";

/** Hand written as text so rule examples stay readable: "123m 456p E E", melds "+P:RD K:5m". */
export type RuleExample = {
  hand: string; melds?: string; win: string; flowers?: string;
  method?: WinMethod; seat?: Wind; round?: Wind; lastTile?: boolean; robbingKong?: boolean; note?: string;
};

export type FanRuleConfig = {
  id: string; name: string; fan: number; enabled: boolean; category: RuleCategory;
  perUnit?: boolean;            // fan is multiplied by a count (dragon pongs, matching flowers)
  excludes?: string[];          // rule ids that are already included in this rule
  summary: string;              // plain-language explanation (Indonesian, the app's UI language)
  conditions: string[];         // exact conditions
  needsInput?: string;          // context the tiles alone cannot tell us
  example?: RuleExample;
};

export type GameConfig = {
  rulesId: string;
  minimumFan: number;
  maximumFan: number | null;    // HK18 has no cap
  enableFlowers: boolean;
  specialHands: { sevenPairs: boolean; thirteenOrphans: boolean };
  allChowsRequiresPlainPair: boolean;
  /** false = Little/Great Dragon and Little/Great Wind already include the single pongs, so those are not counted again. */
  dragonPongStacksWithDragonHands: boolean;
  windPongStacksWithWindHands: boolean;
  /** true: a Chicken Hand may still win if bonus faan (flowers, self draw...) reach the minimum. */
  chickenHandCanWinOnBonusFaan: boolean;
  pointsPerFan: number;         // 1 = points equal faan. No money, no 1.5 multiplier.
  /** Chicken Hand table: faan are not counted at all and every valid win is worth exactly this many points. null = normal faan scoring. */
  flatPointsPerWin?: number | null;
  selfDrawRules: { dealerMultiplier: number; nonDealerMultiplier: number };
  discardRules: { dealerMultiplier: number; paymentMode: DiscardPaymentMode };
  progression: { drawKeepsDealer: boolean; dealerWinKeepsDealer: boolean; lastRoundWind: "east" | "south" | "west" | "north" };
  fanTable?: FanRuleConfig[];
  /** Set by a ruleset (lib/scoring/rulesets.ts). Absent = the legacy single HK18 table. */
  rulesetId?: RulesetId;
  rulesetName?: string;
  /** Extra stacking/conflict rules of the ruleset, applied on top of each rule's own `excludes`. */
  conflicts?: RuleConflict[];
  /** "pair": Single Wait = the winning tile completed the pair (eyes). "only-one-tile": the hand could be completed by exactly one tile. */
  singleWaitMode?: "pair" | "only-one-tile";
};

export type WinningHandInput = {
  concealedTiles: PlayTile[];   // includes the winning tile
  melds: Meld[];
  winningTile: PlayTile;
  flowers: BonusTile[];
  winningMethod: WinMethod;
  winnerSeatWind: Wind;
  roundWind: Wind;
  isDealer: boolean;
  isLastTile?: boolean;
  isRobbingKong?: boolean;
  gameConfig: GameConfig;
  /** The tiles are entered as one flat list, so the app cannot see which sets were taken from a discard. The player says so here. */
  hasOpenMelds?: boolean;
};

export type ScoringContext = {
  kind: HandKind; sets: Meld[]; pair: PlayTile[]; allTiles: PlayTile[]; flowers: BonusTile[];
  method: WinMethod; seatWind: Wind; roundWind: Wind; isDealer: boolean; winningTile: PlayTile;
  waits: WaitType[]; /** every way the winning tile could have completed this reading (see waits.ts) */ completingTiles: number | null;
  declaredMelds: Meld[]; /** any set taken from a discard (declared exposed meld, or flagged by the player) */ openHand: boolean; isLastTile: boolean; isRobbingKong: boolean; config: GameConfig;
};

export type DetectedFan = { id: string; name: string; fan: number; category: RuleCategory; count: number; /** why it qualified, in plain language */ why?: string };
export type ScoreDistribution = {
  winner: { playerId: string; points: number };
  payments: { playerId: string; points: number }[]; // points = amount paid
};
export type ScoringResult = {
  valid: boolean;            // legal winning hand structure
  errors: string[];
  meetsMinimum: boolean;     // totalFan >= minimumFan
  minimumFan: number;
  canRecord: boolean;        // valid && meetsMinimum
  reason?: string;
  handDecomposition?: HandDecomposition;
  detectedFan: DetectedFan[];
  excludedFan: { id: string; name: string; byId: string; reason?: string }[];
  rawFan: number; totalFan: number; basePoints: number;
  /** Cap of the game (null = none) and the ruleset that produced this score, for the transparent breakdown. */
  maximumFan?: number | null; rulesetId?: RulesetId; rulesetName?: string; waits?: WaitType[];
  reviewFlags: string[];
  scoreDistribution?: ScoreDistribution;
  explanation: string[];
};
