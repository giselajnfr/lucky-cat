import { LogoMark } from "./LogoMark";

export function Logo() {
  return (
    <div className="flex flex-col items-center text-center">
      <LogoMark size="124px" />
      <h1 className="mt-5 text-[1.65rem] font-bold text-cream">Lucky Cat Mahjong</h1>
      <p className="mt-1 text-sm text-muted">Your Mahjong Companion</p>
    </div>
  );
}
