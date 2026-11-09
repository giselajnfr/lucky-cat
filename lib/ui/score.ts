/** Score display rules: green = ahead, red = behind, neutral = 0. The +/− sign is always shown too, so colour is never the only signal. */
export const MINUS = "\u2212";

export function fmtScore(n: number, signed = true): string {
  const a = Math.abs(n).toLocaleString("id-ID");
  return n > 0 ? (signed ? `+${a}` : a) : n < 0 ? `${MINUS}${a}` : "0";
}

/** Tailwind text colour. Use onLight=true when the number sits on a cream background. */
export function scoreTone(n: number, onLight = false): string {
  if (n > 0) return onLight ? "text-posdark" : "text-pos";
  if (n < 0) return onLight ? "text-negdark" : "text-neg";
  return "";
}
