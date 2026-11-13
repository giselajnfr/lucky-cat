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


// ---- Flower and season pictures (drawn in the 60 x 80 tile space, picture area about y 8 to 56) ----
const BROWN = "#7A4B2A", PINK = "#D2566B", GOLD = "#E0A82E", ORANGE = "#E58A1F", MAPLE = "#C8561F", ICE = "#2A5CA8", LEAF = "#3E9A63";
/** Five-petal blossom */
const blossom = (x: number, y: number, r: number, petal: string, heart = GOLD) =>
  [0, 1, 2, 3, 4].map((i) => { const a = ((-90 + i * 72) * Math.PI) / 180; return `<circle cx="${(x + Math.cos(a) * r * 0.68).toFixed(1)}" cy="${(y + Math.sin(a) * r * 0.68).toFixed(1)}" r="${(r * 0.55).toFixed(1)}" fill="${petal}"/>`; }).join("") + `<circle cx="${x}" cy="${y}" r="${(r * 0.3).toFixed(1)}" fill="${heart}"/>`;
const plum = () => `<path d="M8 54 Q22 44 32 32 T50 12" fill="none" stroke="${BROWN}" stroke-width="2.8" stroke-linecap="round"/><path d="M24 43 Q28 47 36 46 M33 31 Q30 23 22 22" fill="none" stroke="${BROWN}" stroke-width="1.8" stroke-linecap="round"/>${blossom(20, 24, 7, PINK)}${blossom(41, 20, 6.5, PINK)}${blossom(40, 42, 7.5, PINK)}${blossom(15, 45, 5, PINK)}`;
const orchid = () => `<path d="M20 55 Q10 34 24 11" fill="none" stroke="${LEAF}" stroke-width="3.4" stroke-linecap="round"/><path d="M23 55 Q30 32 47 20" fill="none" stroke="${LEAF}" stroke-width="3.4" stroke-linecap="round"/><path d="M26 55 Q26 40 40 33" fill="none" stroke="${GREEN}" stroke-width="2.8" stroke-linecap="round"/><path d="M28 55 Q31 38 33 24" fill="none" stroke="${BROWN}" stroke-width="1.4" stroke-linecap="round"/>${blossom(33, 21, 6.5, "#B04A8A", "#F4D27A")}${blossom(37, 34, 5, "#B04A8A", "#F4D27A")}`;
const chrysanthemum = () => Array.from({ length: 16 }, (_, i) => `<ellipse cx="30" cy="20" rx="2.5" ry="8.5" fill="${i % 2 ? "#C9821A" : GOLD}" transform="rotate(${i * 22.5} 30 30)"/>`).join("") + `<circle cx="30" cy="30" r="5.5" fill="${RED}"/><circle cx="30" cy="30" r="2" fill="${GOLD}"/><path d="M30 44 L30 56" stroke="${GREEN}" stroke-width="2.4" stroke-linecap="round"/><path d="M30 52 Q20 52 15 46 Q25 45 30 52Z M30 52 Q40 52 45 46 Q35 45 30 52Z" fill="${LEAF}"/>`;
const bamboo = () => [[20, 16, 56], [32, 9, 56], [44, 20, 56]].map(([x, y0, y1]) => `<rect x="${x - 2.8}" y="${y0}" width="5.6" height="${y1 - y0}" rx="2.6" fill="${GREEN}"/>${[0.3, 0.6, 0.85].map((f) => `<rect x="${x - 3.6}" y="${(y0 + (y1 - y0) * f).toFixed(1)}" width="7.2" height="2.2" rx="1" fill="#1F5A38"/>`).join("")}`).join("") + `<path d="M33 22 Q43 15 50 19 Q41 26 33 22Z M31 30 Q21 24 13 27 Q22 34 31 30Z M45 30 Q53 27 56 32 Q49 36 45 30Z" fill="${LEAF}"/>`;
const spring = () => `<path d="M14 56 H46" stroke="${BROWN}" stroke-width="3" stroke-linecap="round"/><path d="M30 56 Q30 44 30 30" fill="none" stroke="${GREEN}" stroke-width="3" stroke-linecap="round"/><path d="M30 42 Q14 42 11 24 Q28 24 30 42Z" fill="${LEAF}"/><path d="M30 34 Q46 34 49 15 Q32 15 30 34Z" fill="${GREEN}"/><circle cx="30" cy="27" r="3.2" fill="${PINK}"/>`;
const summer = () => `<circle cx="30" cy="32" r="11" fill="${ORANGE}"/><circle cx="30" cy="32" r="6" fill="#F7C95C"/>` + Array.from({ length: 12 }, (_, i) => `<path d="M30 14 L30 8" stroke="${ORANGE}" stroke-width="3" stroke-linecap="round" transform="rotate(${i * 30} 30 32)"/>`).join("");
const autumn = () => `<path d="M30 9 L34 19 L42 14 L40 25 L51 25 L44 33 L49 42 L38 40 L36 48 L30 43 L24 48 L22 40 L11 42 L16 33 L9 25 L20 25 L18 14 L26 19 Z" fill="${MAPLE}"/><path d="M30 43 L30 57 M30 40 L30 18 M30 34 L20 27 M30 34 L40 27" stroke="#F3C27A" stroke-width="1.3" stroke-linecap="round" fill="none"/><path d="M30 43 L30 57" stroke="${BROWN}" stroke-width="2.4" stroke-linecap="round"/>`;
const winter = () => [0, 60, 120].map((r) => `<g transform="rotate(${r} 30 32)" stroke="${ICE}" stroke-width="2.6" stroke-linecap="round" fill="none"><path d="M30 10 L30 54"/><path d="M30 18 L24 12 M30 18 L36 12 M30 46 L24 52 M30 46 L36 52"/></g>`).join("") + `<circle cx="30" cy="32" r="3.4" fill="${ICE}"/>`;

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
    // Flowers and seasons are drawn pictures. The small corner character names the tile and the circled number is the seat number.
    const n = Number(b[2]), isFlower = b[1] === "F", c = isFlower ? RED : GREEN;
    const glyph = isFlower ? ["梅", "蘭", "菊", "竹"][n - 1] : ["春", "夏", "秋", "冬"][n - 1];
    const art = isFlower ? [plum, orchid, chrysanthemum, bamboo][n - 1]() : [spring, summer, autumn, winter][n - 1]();
    return art + text(glyph, 11, 17, 12, c, 800) + `<circle cx="30" cy="66" r="6.5" fill="none" stroke="${c}" stroke-width="1.3"/>` + text(String(n), 30, 70, 10, c, 800);
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
