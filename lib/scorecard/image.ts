import { tileInner } from "@/components/mahjong/tileArt";
import { sortTiles } from "@/lib/scoring/tiles";
import type { Meld } from "@/lib/scoring/types";

export type ScorecardData = {
  total: number; method: "SELF_DRAW" | "DISCARD"; seatLabel: string; roundLabel?: string; winnerName?: string; title?: string;
  concealed: string[]; melds: Meld[]; winningTile: string; flowers: string[]; breakdown: { name: string; fan: number; count?: number }[];
};

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const FONT = "Nunito, ui-rounded, system-ui, -apple-system, 'Segoe UI', sans-serif";

/** Self-contained SVG scorecard in the app's colours. Tiles use the same art as the screen. */
export function buildScorecardSvg(d: ScorecardData): { svg: string; width: number; height: number } {
  const W = 720, pad = 36, inner = W - pad * 2 - 32;
  const rest = [...d.concealed]; const wi = rest.indexOf(d.winningTile); if (wi >= 0) rest.splice(wi, 1);
  const row = [...d.melds.flatMap((m, i) => m.tiles.map((t, j) => ({ t, gapBefore: j === 0 && i > 0 ? 12 : 0 }))), ...sortTiles(rest).map((t, i) => ({ t, gapBefore: i === 0 && d.melds.length ? 12 : 0 }))];
  const n = row.length + 1, gap = 4, extra = row.reduce((s, r) => s + r.gapBefore, 0) + 16;
  const tw = Math.min(44, Math.floor((inner - extra - gap * (n - 1)) / n)), th = Math.round((tw * 80) / 60);
  const sc = tw / 60;
  let x = 16; let tiles = "";
  const place = (t: string, ring = false) => { tiles += `<g transform="translate(${x},16) scale(${sc})">${tileInner(t)}${ring ? '<rect x="1.5" y="1.5" width="57" height="77" rx="7" fill="none" stroke="#F2B134" stroke-width="4"/>' : ""}</g>`; x += tw + gap; };
  row.forEach((r) => { x += r.gapBefore; place(r.t); });
  x += 16; place(d.winningTile, true);
  let boxH = th + 32;
  if (d.flowers.length) {
    const fw = 28, fh = Math.round((fw * 80) / 60); let fx = 16;
    d.flowers.forEach((f) => { tiles += `<g transform="translate(${fx},${th + 28}) scale(${fw / 60})">${tileInner(f)}</g>`; fx += fw + 4; });
    boxH += fh + 12;
  }
  const rows = d.breakdown.map((b, i) => {
    const y = i * 38;
    return `<text x="0" y="${y + 24}" font-size="22" fill="#F7ECD0" font-family="${FONT}">${esc(b.name)}${b.count && b.count > 1 ? ` ×${b.count}` : ""}</text><text x="${W - pad * 2}" y="${y + 24}" font-size="22" font-weight="800" fill="#F7ECD0" text-anchor="end" font-family="${FONT}">+${b.fan}</text><line x1="0" x2="${W - pad * 2}" y1="${y + 38}" y2="${y + 38}" stroke="#7A564C"/>`;
  }).join("");
  const top = 36 + 40 + 100 + 38 + 20;
  const boxY = top, listY = boxY + boxH + 40, H = listY + d.breakdown.length * 38 + 70;
  const method = d.method === "SELF_DRAW" ? "Self Draw" : "Menang dari buangan";
  const sub = [method, d.seatLabel, d.roundLabel].filter(Boolean).join(" · ");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><rect width="${W}" height="${H}" rx="28" fill="#461F1A"/>
<text x="${pad}" y="58" font-size="18" font-weight="800" letter-spacing="3" fill="#C4AD8E" font-family="${FONT}">LUCKY CAT MAHJONG · HK18</text>
<text x="${pad}" y="${36 + 40 + 84}" font-size="96" font-weight="800" fill="#F7ECD0" font-family="${FONT}">${d.total} POIN</text>
<text x="${pad}" y="${36 + 40 + 84 + 40}" font-size="24" fill="#C4AD8E" font-family="${FONT}">${esc(sub)}${d.winnerName ? ` · ${esc(d.winnerName)}` : ""}</text>
<g transform="translate(${pad},${boxY})"><rect width="${W - pad * 2}" height="${boxH}" rx="18" fill="#5B2F26" stroke="#7A564C"/>${tiles}</g>
<g transform="translate(${pad},${listY})"><text x="0" y="-12" font-size="14" font-weight="800" letter-spacing="3" fill="#C4AD8E" font-family="${FONT}">RINCIAN</text>${rows}</g>
<text x="${W / 2}" y="${H - 26}" font-size="15" fill="#C4AD8E" text-anchor="middle" font-family="${FONT}">${esc(d.title ?? "Hitungan skor Mahjong")}</text></svg>`;
  return { svg, width: W, height: H };
}

export function svgToPng(svg: string, w: number, h: number, scale = 2): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas"); c.width = w * scale; c.height = h * scale;
      const ctx = c.getContext("2d"); if (!ctx) return reject(new Error("Canvas is not available"));
      ctx.scale(scale, scale); ctx.drawImage(img, 0, 0, w, h);
      c.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not create the image"))), "image/png");
    };
    img.onerror = () => reject(new Error("Could not render the scorecard"));
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob); const a = document.createElement("a");
  a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** Uses the native share sheet with the image when the device supports it; otherwise returns false. */
export async function shareBlob(blob: Blob, filename: string, text: string): Promise<boolean> {
  const file = new File([blob], filename, { type: "image/png" });
  if (typeof navigator !== "undefined" && navigator.canShare?.({ files: [file] })) { try { await navigator.share({ files: [file], text, title: "Lucky Cat Mahjong" }); return true; } catch { return true; /* user cancelled */ } }
  return false;
}
