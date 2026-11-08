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
  /** Review items: see REVIEW_NOTES. false = limit-style hands already include these. */
  dragonPongStacksWithDragonHands: boolean;
  windPongStacksWithWindHands: boolean;
  /** true: a Chicken Hand may still win if bonus faan (flowers, self draw...) reach the minimum. */
  chickenHandCanWinOnBonusFaan: boolean;
  pointsPerFan: number;         // 1 = points equal faan. No money, no 1.5 multiplier.
  selfDrawRules: { dealerMultiplier: number; nonDealerMultiplier: number };
  discardRules: { dealerMultiplier: number; paymentMode: DiscardPaymentMode };
  progression: { drawKeepsDealer: boolean; dealerWinKeepsDealer: boolean; lastRoundWind: "east" | "south" | "west" | "north" };
  fanTable?: FanRuleConfig[];
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
};

export type ScoringContext = {
  kind: HandKind; sets: Meld[]; pair: PlayTile[]; allTiles: PlayTile[]; flowers: BonusTile[];
  method: WinMethod; seatWind: Wind; roundWind: Wind; isDealer: boolean; winningTile: PlayTile;
  declaredMelds: Meld[]; isLastTile: boolean; isRobbingKong: boolean; config: GameConfig;
};

export type DetectedFan = { id: string; name: string; fan: number; category: RuleCategory; count: number };
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
  excludedFan: { id: string; name: string; byId: string }[];
  rawFan: number; totalFan: number; basePoints: number;
  reviewFlags: string[];
  scoreDistribution?: ScoreDistribution;
  explanation: string[];
};
