/** The logo on a cream rounded tile, exactly as in the design reference. `size` accepts any CSS length (px, vw, vh). */
export function LogoMark({ size = "56px", className = "" }: { size?: string; className?: string }) {
  return (
    <div className={`flex shrink-0 items-center justify-center bg-cream ${className}`} style={{ width: size, height: size, borderRadius: "22%" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo.png" alt="Lucky Cat Mahjong" style={{ maxHeight: "80%", maxWidth: "80%", width: "auto", height: "auto" }} />
    </div>
  );
}
