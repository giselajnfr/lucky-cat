/**
 * Final-result story card (1080×1920, Instagram Story size), drawn on a canvas so a live photo can be the background.
 * Keep important text inside y 250–1670: Instagram covers the top and bottom of a story with its own UI.
 */
export type FinalPlayer = { name: string; rank: number; score: string; sub: string };
export type FinalCardInput = {
  photo?: Blob | null;
  champions: string;            // "Player 1" or "Player 1 & Player 2" on a tie
  championLine: string;         // "+384 pts · 1 win"
  championLabel: string;        // "CHAMPION"
  players: FinalPlayer[];
  footer: string;               // "Room YH6DT · 1 hands played"
};
export const STORY_W = 1080, STORY_H = 1920;

type Bitmap = { src: CanvasImageSource; w: number; h: number; close?: () => void };
async function loadBitmap(f: Blob): Promise<Bitmap> {
  try {
    const b = await createImageBitmap(f, { imageOrientation: "from-image" } as ImageBitmapOptions);   // respects the phone's EXIF rotation
    return { src: b, w: b.width, h: b.height, close: () => b.close() };
  } catch { /* older browsers: fall back to <img> */ }
  const url = URL.createObjectURL(f);
  try {
    const img = await new Promise<HTMLImageElement>((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => no(new Error("Could not read the photo")); i.src = url; });
    return { src: img, w: img.naturalWidth, h: img.naturalHeight };
  } finally { setTimeout(() => URL.revokeObjectURL(url), 1000); }
}

function rr(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
}
/** Largest font size (≤ max) at which `text` fits in `width`. */
function fit(c: CanvasRenderingContext2D, text: string, weight: number, max: number, width: number, fam: string) {
  let s = max; c.font = `${weight} ${s}px ${fam}`;
  while (s > 28 && c.measureText(text).width > width) { s -= 4; c.font = `${weight} ${s}px ${fam}`; }
  return s;
}

export async function renderFinalCard(o: FinalCardInput): Promise<Blob> {
  const fam = typeof document !== "undefined" ? getComputedStyle(document.body).fontFamily || "system-ui, sans-serif" : "system-ui, sans-serif";
  try { await document.fonts?.load(`800 40px ${fam}`); await document.fonts?.load(`600 40px ${fam}`); } catch { /* use fallback font */ }
  const cv = document.createElement("canvas"); cv.width = STORY_W; cv.height = STORY_H;
  const c = cv.getContext("2d"); if (!c) throw new Error("Canvas is not supported");

  // Background: the live photo (cover-fit) or the brand gradient.
  const g = c.createLinearGradient(0, 0, 0, STORY_H); g.addColorStop(0, "#5A1620"); g.addColorStop(1, "#2A0A10");
  c.fillStyle = g; c.fillRect(0, 0, STORY_W, STORY_H);
  if (o.photo) {
    const bm = await loadBitmap(o.photo);
    const k = Math.max(STORY_W / bm.w, STORY_H / bm.h), dw = bm.w * k, dh = bm.h * k;
    c.drawImage(bm.src, (STORY_W - dw) / 2, (STORY_H - dh) / 2, dw, dh); bm.close?.();
    const shade = c.createLinearGradient(0, 0, 0, STORY_H);          // keep text readable on any photo
    shade.addColorStop(0, "rgba(25,6,10,.55)"); shade.addColorStop(0.35, "rgba(25,6,10,.25)"); shade.addColorStop(0.6, "rgba(25,6,10,.7)"); shade.addColorStop(1, "rgba(25,6,10,.92)");
    c.fillStyle = shade; c.fillRect(0, 0, STORY_W, STORY_H);
  }
  c.textBaseline = "alphabetic"; c.textAlign = "center"; c.fillStyle = "#F7ECD0";

  c.font = `800 30px ${fam}`; c.globalAlpha = 0.8; c.fillText("LUCKY CAT MAHJONG", STORY_W / 2, 290); c.globalAlpha = 1;
  c.font = `700 120px ${fam}`; c.fillText("👑", STORY_W / 2, 470);
  c.font = `800 38px ${fam}`; c.globalAlpha = 0.85; c.fillText(o.championLabel.toUpperCase().split("").join(" "), STORY_W / 2, 545); c.globalAlpha = 1;
  fit(c, o.champions, 800, 120, 900, fam); c.fillText(o.champions, STORY_W / 2, 680);
  c.font = `600 44px ${fam}`; c.globalAlpha = 0.9; c.fillText(o.championLine, STORY_W / 2, 755); c.globalAlpha = 1;

  // Leaderboard
  const rows = o.players.slice(0, 4), rowH = 128, gap = 22, x0 = 80, rw = STORY_W - 160; let y = 880;
  for (const p of rows) {
    const first = p.rank === 1;
    rr(c, x0, y, rw, rowH, 36); c.fillStyle = first ? "rgba(247,236,208,.96)" : "rgba(15,4,6,.55)"; c.fill();
    c.strokeStyle = first ? "#F7ECD0" : "rgba(247,236,208,.25)"; c.lineWidth = 3; c.stroke();
    c.beginPath(); c.arc(x0 + 64, y + rowH / 2, 36, 0, Math.PI * 2); c.fillStyle = first ? "#5A1620" : "rgba(247,236,208,.2)"; c.fill();
    c.fillStyle = first ? "#F7ECD0" : "#F7ECD0"; c.textAlign = "center"; c.font = `800 38px ${fam}`; c.fillText(String(p.rank), x0 + 64, y + rowH / 2 + 14);
    c.textAlign = "left"; c.fillStyle = first ? "#2A0A10" : "#F7ECD0";
    fit(c, p.name, 800, 44, 460, fam); c.fillText(p.name, x0 + 128, y + 60);
    c.font = `600 28px ${fam}`; c.globalAlpha = 0.75; c.fillText(p.sub, x0 + 128, y + 100); c.globalAlpha = 1;
    c.textAlign = "right"; c.font = `800 50px ${fam}`; c.fillStyle = first ? "#2A0A10" : p.score.startsWith("+") ? "#BDE8B0" : "#F4A6A6"; c.fillText(p.score, x0 + rw - 36, y + rowH / 2 + 18);
    y += rowH + gap;
  }
  c.textAlign = "center"; c.fillStyle = "#F7ECD0"; c.font = `600 32px ${fam}`; c.globalAlpha = 0.85; c.fillText(o.footer, STORY_W / 2, 1640); c.globalAlpha = 1;

  return new Promise((ok, no) => cv.toBlob((b) => (b ? ok(b) : no(new Error("Could not create the image"))), "image/png"));
}
