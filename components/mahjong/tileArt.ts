/**
 * Mahjong tile faces as SVG markup (60 x 80 viewBox). A pure function so the same art is used by
 * React components, the House Rules guide and the exported scorecard image.
 * Layouts follow the standard tile sets: dots and bamboo are arranged by number, not decorated.
 */
const RED = "#B8312F", GREEN = "#2F7D4F", BLUE = "#2A5CA8", INK = "#2B2B2B";
const CJK = "'Noto Serif CJK SC','Noto Serif SC','Source Han Serif SC','Songti SC','PingFang SC','Hiragino Sans GB','Microsoft YaHei','SimSun',serif";
const NUM = ["", "一", "二", "三", "四", "五", "六", "七", "八", "九"];

const DOTS: Record<number, [number, number][]> = {
  1: [[30, 40]], 2: [[30, 26], [30, 54]], 3: [[18, 22], [30, 40], [42, 58]],
  4: [[20, 26], [40, 26], [20, 54], [40, 54]], 5: [[20, 26], [40, 26], [30, 40], [20, 54], [40, 54]],
  6: [[20, 22], [40, 22], [20, 40], [40, 40], [20, 58], [40, 58]],
  7: [[16, 17], [30, 23], [44, 29], [20, 50], [40, 50], [20, 63], [40, 63]],
  8: [[21, 17], [39, 17], [21, 32], [39, 32], [21, 48], [39, 48], [21, 63], [39, 63]],
  9: [[17, 20], [30, 20], [43, 20], [17, 40], [30, 40], [43, 40], [17, 60], [30, 60], [43, 60]],
};
const G = GREEN, R = RED, B = BLUE;
const DOT_COLORS: Record<number, string[]> = {
  1: [R], 2: [G, B], 3: [B, R, G], 4: [B, G, G, B], 5: [B, G, R, G, B], 6: [G, G, R, R, R, R],
  7: [G, G, G, R, R, R, R], 8: [B, B, B, B, B, B, B, B], 9: [G, G, G, R, R, R, B, B, B],
};
const STICKS: Record<number, [number, number][]> = {
  2: [[30, 25], [30, 55]], 3: [[30, 24], [21, 54], [39, 54]], 4: [[21, 25], [39, 25], [21, 55], [39, 55]],
  5: [[21, 25], [39, 25], [30, 40], [21, 55], [39, 55]], 6: [[17, 26], [30, 26], [43, 26], [17, 54], [30, 54], [43, 54]],
  7: [[30, 17], [17, 38], [30, 38], [43, 38], [17, 62], [30, 62], [43, 62]],
  8: [[14, 26], [25, 26], [36, 26], [47, 26], [14, 54], [25, 54], [36, 54], [47, 54]],
  9: [[17, 19], [30, 19], [43, 19], [17, 40], [30, 40], [43, 40], [17, 61], [30, 61], [43, 61]],
};

const text = (s: string, x: number, y: number, size: number, fill: string, weight = 700) =>
  `<text x="${x}" y="${y}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="middle" font-family="${CJK}">${s}</text>`;
const dot = (x: number, y: number, r: number, c: string) =>
  `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}"/><circle cx="${x}" cy="${y}" r="${r * 0.55}" fill="none" stroke="#FBF4E2" stroke-width="${r * 0.22}"/><circle cx="${x}" cy="${y}" r="${r * 0.18}" fill="#FBF4E2"/>`;
const stick = (x: number, y: number, c: string, h = 16) =>
  `<rect x="${x - 3.2}" y="${y - h / 2}" width="6.4" height="${h}" rx="3" fill="${c}"/><rect x="${x - 3.2}" y="${y - 1}" width="6.4" height="2" fill="#FBF4E2" opacity=".85"/>`;

function face(t: string): string {
  if (/^[1-9][msp]$/.test(t)) {
    const n = Number(t[0]), suit = t[1];
    if (suit === "m") return text(NUM[n], 30, 38, 29, INK) + text("萬", 30, 67, 23, RED);
    if (suit === "p") {
      const r = n === 1 ? 14 : n <= 3 ? 7.5 : n >= 8 ? 5.5 : n === 9 ? 6 : 6.5;
      return DOTS[n].map(([x, y], i) => dot(x, y, r, DOT_COLORS[n][i])).join("");
    }
    if (n === 1) // bamboo 1 is a bird on a branch
      return `<ellipse cx="30" cy="42" rx="11" ry="14" fill="${GREEN}"/><circle cx="30" cy="25" r="7" fill="${GREEN}"/><polygon points="36,25 44,28 36,30" fill="${RED}"/><circle cx="32" cy="23.5" r="1.4" fill="#FBF4E2"/><path d="M26 54 L22 68 M34 54 L38 68" stroke="${RED}" stroke-width="2.4" stroke-linecap="round"/><path d="M26 44 Q30 52 34 44" fill="none" stroke="#FBF4E2" stroke-width="1.6"/>`;
    const red = (i: number) => (n === 5 && i === 2) || (n === 7 && i === 0) || (n === 9 && i % 3 === 1);
    return STICKS[n].map(([x, y], i) => stick(x, y, red(i) ? RED : GREEN, n >= 6 ? 15 : 16)).join("");
  }
  const winds: Record<string, string> = { E: "東", S: "南", W: "西", N: "北" };
  if (winds[t]) return text(winds[t], 30, 52, 38, INK);
  if (t === "RD") return text("中", 30, 52, 38, RED);
  if (t === "GD") return text("發", 30, 52, 36, GREEN);
  if (t === "WD") return `<rect x="12" y="16" width="36" height="48" rx="5" fill="none" stroke="${BLUE}" stroke-width="3.4"/><rect x="18" y="22" width="24" height="36" rx="3" fill="none" stroke="${BLUE}" stroke-width="1.4"/>`;
  const b = /^([FS])([1-4])$/.exec(t);
  if (b) {
    const n = Number(b[2]);
    const glyph = b[1] === "F" ? ["梅", "蘭", "菊", "竹"][n - 1] : ["春", "夏", "秋", "冬"][n - 1];
    const c = b[1] === "F" ? RED : GREEN;
    return text(glyph, 30, 46, 34, c) + `<circle cx="30" cy="64" r="7" fill="none" stroke="${c}" stroke-width="1.4"/>` + text(String(n), 30, 68, 11, c, 800);
  }
  return text("?", 30, 50, 30, INK);
}

/** Complete <svg> markup for one tile. `back` draws a face-down tile. */
export function tileSvg(t: string, opts: { width?: number; ring?: boolean; dim?: boolean; fluid?: boolean } = {}): string {
  const w = opts.width ?? 60, h = Math.round((w * 80) / 60);
  const edge = opts.ring ? "#F2B134" : "#B9A57F";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 80" ${opts.fluid ? 'style="display:block;width:100%;height:auto"' : `width="${w}" height="${h}"`} role="img" aria-label="${t}"><rect x="1.5" y="1.5" width="57" height="77" rx="7" fill="#FBF4E2" stroke="${edge}" stroke-width="${opts.ring ? 3 : 1.6}"/><rect x="4" y="4" width="52" height="72" rx="5" fill="none" stroke="#E8DCB8" stroke-width="1"/><g opacity="${opts.dim ? 0.35 : 1}">${face(t)}</g></svg>`;
}
/** Inner markup (no <svg>) for embedding tiles inside a bigger SVG, e.g. the scorecard image. */
export const tileInner = (t: string) => `<rect x="1.5" y="1.5" width="57" height="77" rx="7" fill="#FBF4E2" stroke="#B9A57F" stroke-width="1.6"/><rect x="4" y="4" width="52" height="72" rx="5" fill="none" stroke="#E8DCB8" stroke-width="1"/>${face(t)}`;
