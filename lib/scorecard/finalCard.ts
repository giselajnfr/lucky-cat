/**
 * Final-result story card, 1080×1920 (Instagram Story size), drawn on a canvas. No emoji: every icon is drawn as a shape.
 * - With a photo: the photo fills the card and stays clear; the logo sits top-left and the scores fade in at the bottom.
 * - Without a photo: a green tile-pattern card with the champion box and the other players below it.
 */
export type FinalPlayer = { name: string; rank: number; score: string; wins: string; balance: string };
export type FinalCardInput = {
  photo?: Blob | null;
  brand: string;                // "LUCKY CAT MAHJONG"
  heading: string;              // "Hasil Main Hari Ini"
  subline: string;              // "Ruang YH6DT · Rabu, 4 Nov 2026"
  dayLabel: string;             // "4 NOVEMBER"
  dateLabel: string;            // "Rabu, 4 Nov 2026"
  championLabel: string;        // "JUARA"
  champions: string;            // "Player 1" or "A & B" on a tie
  championLine: string;         // "+960 poin · saldo 1.960 · 6× menang"
  players: FinalPlayer[];       // already ranked
  roomLine: string;             // "Ruang YH6DT · 17 tangan dimainkan"
  madeWith: string;             // "DICATAT DENGAN LUCKY CAT MAHJONG"
};
export const STORY_W = 1080, STORY_H = 1920;

/** One place to restyle the card. */
const THEME = {   // Lucky Cat palette (same values as tailwind.config.ts)
  top: "#5B2F26", bottom: "#34140F", text: "#F7ECD0", gold: "#F0C070", muted: "rgba(247,236,208,.66)", pos: "#9ED8A7", neg: "#FF9288",
  rank: ["#F0C070", "#E4DCC8", "#D9A06F", "#9C7A6C"],   // 1st gold, 2nd silver, 3rd bronze, others warm grey
  shade: "40,15,11",                                      // rgb of the bottom fade on photos
  dark: "#34140F", ink: "#2A1008",
};

type Img = { src: CanvasImageSource; w: number; h: number; close?: () => void };
async function loadPhoto(f: Blob): Promise<Img> {
  try { const b = await createImageBitmap(f, { imageOrientation: "from-image" } as ImageBitmapOptions); return { src: b, w: b.width, h: b.height, close: () => b.close() }; }   // keeps the phone's rotation
  catch { /* older browsers: use <img> */ }
  const url = URL.createObjectURL(f);
  try { const i = await new Promise<HTMLImageElement>((ok, no) => { const m = new Image(); m.onload = () => ok(m); m.onerror = () => no(new Error("Could not read the photo")); m.src = url; }); return { src: i, w: i.naturalWidth, h: i.naturalHeight }; }
  finally { setTimeout(() => URL.revokeObjectURL(url), 1000); }
}
async function loadLogo(): Promise<Img | null> {
  try { const i = await new Promise<HTMLImageElement>((ok, no) => { const m = new Image(); m.onload = () => ok(m); m.onerror = no; m.src = "/logo.png"; }); return { src: i, w: i.naturalWidth, h: i.naturalHeight }; }
  catch { return null; }
}

type C = CanvasRenderingContext2D;
function rr(c: C, x: number, y: number, w: number, h: number, r: number) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
function fit(c: C, text: string, weight: number, max: number, width: number, fam: string) { let s = max; c.font = `${weight} ${s}px ${fam}`; while (s > 24 && c.measureText(text).width > width) { s -= 4; c.font = `${weight} ${s}px ${fam}`; } return s; }
/** Letter-spaced text, centred on cx (canvas letterSpacing is not supported everywhere). */
function spaced(c: C, text: string, cx: number, y: number, gap: number) {
  const chars = [...text]; const w = chars.reduce((a, ch) => a + c.measureText(ch).width, 0) + gap * (chars.length - 1);
  const al = c.textAlign; c.textAlign = "left"; let x = cx - w / 2; for (const ch of chars) { c.fillText(ch, x, y); x += c.measureText(ch).width + gap; } c.textAlign = al;
}
function crown(c: C, cx: number, y: number, w: number, color: string) {
  const h = w * 0.55, x = cx - w / 2; c.fillStyle = color; c.beginPath();
  c.moveTo(x, y + h); c.lineTo(x, y + h * 0.2); c.lineTo(x + w * 0.25, y + h * 0.55); c.lineTo(x + w / 2, y); c.lineTo(x + w * 0.75, y + h * 0.55); c.lineTo(x + w, y + h * 0.2); c.lineTo(x + w, y + h); c.closePath(); c.fill();
}
function logo(c: C, img: Img | null, cx: number, cy: number, r: number) {
  c.save(); c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.fillStyle = THEME.text; c.fill(); c.clip();
  if (img) { const k = Math.min((2 * r * 0.86) / img.w, (2 * r * 0.86) / img.h); c.drawImage(img.src, cx - (img.w * k) / 2, cy - (img.h * k) / 2, img.w * k, img.h * k); }
  c.restore();
}
const rankColor = (rank: number) => THEME.rank[Math.min(rank, 4) - 1];
const scoreColor = (s: string) => (s.startsWith("+") ? THEME.pos : THEME.neg);

function patternBackground(c: C) {
  const g = c.createLinearGradient(0, 0, 0, STORY_H); g.addColorStop(0, THEME.top); g.addColorStop(1, THEME.bottom); c.fillStyle = g; c.fillRect(0, 0, STORY_W, STORY_H);
  c.strokeStyle = "rgba(247,236,208,.06)"; c.lineWidth = 3;
  for (let y = -40, row = 0; y < STORY_H; y += 150, row++) for (let x = (row % 2 ? -60 : 0); x < STORY_W; x += 120) { rr(c, x, y, 92, 124, 18); c.stroke(); }
}

export async function renderFinalCard(o: FinalCardInput): Promise<Blob> {
  const fam = getComputedStyle(document.body).fontFamily || "system-ui, sans-serif";
  try { await document.fonts?.load(`800 40px ${fam}`); await document.fonts?.load(`600 40px ${fam}`); } catch { /* fallback font */ }
  const cv = document.createElement("canvas"); cv.width = STORY_W; cv.height = STORY_H;
  const c = cv.getContext("2d"); if (!c) throw new Error("Canvas is not supported");
  const lg = await loadLogo(); const cx = STORY_W / 2; c.textBaseline = "alphabetic";

  if (o.photo) {
    // ---- photo layout: photo stays clear, scores fade in at the bottom ----
    c.fillStyle = THEME.bottom; c.fillRect(0, 0, STORY_W, STORY_H);
    const p = await loadPhoto(o.photo); const k = Math.max(STORY_W / p.w, STORY_H / p.h), dw = p.w * k, dh = p.h * k;
    c.drawImage(p.src, (STORY_W - dw) / 2, (STORY_H - dh) / 2, dw, dh); p.close?.();
    const top = c.createLinearGradient(0, 0, 0, 340); top.addColorStop(0, "rgba(0,0,0,.45)"); top.addColorStop(1, "rgba(0,0,0,0)"); c.fillStyle = top; c.fillRect(0, 0, STORY_W, 340);
    const bot = c.createLinearGradient(0, 1050, 0, STORY_H);
    bot.addColorStop(0, `rgba(${THEME.shade},0)`); bot.addColorStop(0.45, `rgba(${THEME.shade},.82)`); bot.addColorStop(1, `rgba(${THEME.shade},.97)`); c.fillStyle = bot; c.fillRect(0, 1050, STORY_W, STORY_H - 1050);

    logo(c, lg, 150, 170, 68);
    c.textAlign = "left"; c.fillStyle = THEME.text; c.font = `800 58px ${fam}`; c.fillText("Lucky Cat", 244, 168);
    c.fillStyle = THEME.gold; c.font = `800 30px ${fam}`; spaced(c, "MAHJONG", 244 + 96, 214, 9);

    c.textAlign = "center"; c.fillStyle = THEME.gold; c.font = `800 40px ${fam}`; spaced(c, o.dayLabel, cx, 1405, 10);
    c.fillStyle = THEME.muted; c.font = `600 36px ${fam}`; c.fillText(o.dateLabel, cx, 1458);
    const n = Math.min(o.players.length, 4), colW = 960 / n;
    o.players.slice(0, 4).forEach((pl, i) => {
      const x = 60 + colW * i + colW / 2, y = 1580, first = pl.rank === 1, col = rankColor(pl.rank);
      c.beginPath(); c.arc(x, y, 62, 0, Math.PI * 2);
      if (first) { c.fillStyle = col; c.fill(); } else { c.fillStyle = "rgba(52,20,15,.88)"; c.fill(); c.lineWidth = 6; c.strokeStyle = col; c.stroke(); }
      c.textAlign = "center"; c.fillStyle = first ? THEME.ink : THEME.text; c.font = `800 68px ${fam}`; c.fillText(String(pl.rank), x, y + 24);
      c.fillStyle = THEME.text; fit(c, pl.name, 800, 48, colW - 44, fam); c.fillText(pl.name, x, 1705);
      c.fillStyle = scoreColor(pl.score); c.font = `800 58px ${fam}`; c.fillText(pl.score, x, 1772);
      c.fillStyle = THEME.muted; c.font = `600 30px ${fam}`; c.fillText(pl.wins, x, 1820);
    });
    c.fillStyle = THEME.muted; c.font = `800 25px ${fam}`; c.globalAlpha = 0.8; spaced(c, o.madeWith, cx, 1880, 6); c.globalAlpha = 1;
  } else {
    // ---- pattern layout (no photo) ----
    patternBackground(c);
    logo(c, lg, cx, 235, 88);
    c.textAlign = "center"; c.fillStyle = THEME.gold; c.font = `800 34px ${fam}`; spaced(c, o.brand, cx, 400, 12);
    c.fillStyle = THEME.text; fit(c, o.heading, 800, 84, 900, fam); c.fillText(o.heading, cx, 505);
    c.fillStyle = THEME.muted; c.font = `600 36px ${fam}`; c.fillText(o.subline, cx, 572);

    rr(c, 90, 630, 900, 400, 44); c.fillStyle = "rgba(240,192,112,.16)"; c.fill(); c.lineWidth = 3; c.strokeStyle = THEME.gold; c.stroke();
    crown(c, cx, 676, 110, THEME.gold);
    c.fillStyle = THEME.gold; c.font = `800 34px ${fam}`; spaced(c, o.championLabel.toUpperCase(), cx, 808, 14);
    c.fillStyle = THEME.text; fit(c, o.champions, 800, 108, 800, fam); c.fillText(o.champions, cx, 922);
    c.fillStyle = THEME.gold; fit(c, o.championLine, 600, 38, 820, fam); c.fillText(o.championLine, cx, 992);

    const rest = o.players.filter((p) => p.rank !== 1).slice(0, 3); let y = 1085;
    for (const p of rest) {
      rr(c, 80, y, 920, 150, 36); c.fillStyle = "rgba(247,236,208,.08)"; c.fill();
      rr(c, 112, y + 38, 74, 74, 14); c.fillStyle = rankColor(p.rank); c.fill();
      c.textAlign = "center"; c.fillStyle = THEME.dark; c.font = `800 44px ${fam}`; c.fillText(String(p.rank), 149, y + 91);
      c.textAlign = "left"; c.fillStyle = THEME.text; fit(c, p.name, 800, 56, 470, fam); c.fillText(p.name, 220, y + 70);
      c.fillStyle = THEME.muted; c.font = `600 30px ${fam}`; c.fillText(p.wins, 220, y + 116);
      c.textAlign = "right"; c.fillStyle = scoreColor(p.score); c.font = `800 68px ${fam}`; c.fillText(p.score, 968, y + 84);
      c.fillStyle = THEME.muted; c.font = `600 30px ${fam}`; c.fillText(p.balance, 968, y + 126);
      y += 178;
    }
    c.textAlign = "center"; c.fillStyle = THEME.muted; c.font = `600 34px ${fam}`; c.fillText(o.roomLine, cx, 1700);
    c.strokeStyle = "rgba(247,236,208,.25)"; c.lineWidth = 2; c.beginPath(); c.moveTo(340, 1760); c.lineTo(740, 1760); c.stroke();
    c.fillStyle = THEME.muted; c.font = `800 25px ${fam}`; c.globalAlpha = 0.8; spaced(c, o.madeWith, cx, 1822, 6); c.globalAlpha = 1;
  }
  return new Promise((ok, no) => cv.toBlob((b) => (b ? ok(b) : no(new Error("Could not create the image"))), "image/png"));
}
