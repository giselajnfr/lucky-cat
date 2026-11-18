"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "@/components/i18n/I18nProvider";
import { appLocale } from "@/lib/i18n/locale";
import { renderFinalCard } from "@/lib/scorecard/finalCard";
import { downloadBlob, shareBlob } from "@/lib/scorecard/image";
import { MINUS } from "@/lib/ui/score";
import type { GamePlayerRow, GameRow, HandRow } from "@/lib/game/types";

/** End-of-game result: champion, leaderboard and a story card (1080×1920) with an optional live photo, shareable to Instagram Story. */
export function FinalResult({ game, players, hands }: { game: GameRow; players: GamePlayerRow[]; hands: HandRow[] }) {
  const { t } = useI18n();
  const [photo, setPhoto] = useState<File | null>(null);
  const [cardUrl, setCardUrl] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [busy, setBusy] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const camRef = useRef<HTMLInputElement>(null), galRef = useRef<HTMLInputElement>(null);

  const ranked = useMemo(() => {
    const wins = (id: string) => hands.filter((h) => h.winner_player_id === id).length;
    const fmt = (n: number) => `${n > 0 ? "+" : n < 0 ? MINUS : ""}${Math.abs(n).toLocaleString(appLocale())}`;
    return [...players].sort((a, b) => b.current_score - a.current_score || a.seat_position - b.seat_position).map((p) => {
      const net = p.current_score - game.starting_points, w = wins(p.id);
      return { name: p.player_name, rank: 1 + players.filter((o) => o.current_score > p.current_score).length, net, netText: fmt(net), wins: w, winText: w === 1 ? t("final.win1") : t("final.winN", { n: w }) };
    });
  }, [players, hands, game.starting_points, t]);
  const champs = ranked.filter((p) => p.rank === 1);
  const champName = champs.map((p) => p.name).join(" & ");
  const champLine = champs[0] ? `${t("final.pts", { pts: champs[0].netText })} · ${champs[0].winText}` : "";

  // Re-draw the story card whenever the photo or the result changes.
  const sig = JSON.stringify(ranked) + (photo ? photo.name + photo.size : "");
  useEffect(() => {
    let dead = false, url: string | null = null;
    setBusy(true); setMsg(null);
    renderFinalCard({
      photo, champions: champName, championLine: champLine, championLabel: t("final.champion"),
      players: ranked.map((p) => ({ name: p.name, rank: p.rank, score: p.netText, sub: p.winText })),
      footer: t("final.footer", { code: game.room_code, n: hands.length }),
    }).then((b) => { if (dead) return; url = URL.createObjectURL(b); setBlob(b); setCardUrl(url); setBusy(false); })
      .catch(() => { if (!dead) { setMsg(t("final.err")); setBusy(false); } });
    return () => { dead = true; if (url) setTimeout(() => URL.revokeObjectURL(url!), 1000); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig]);

  const pick = (e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) setPhoto(f); e.target.value = ""; };
  const name = `lucky-cat-${game.room_code}-hasil.png`;
  async function share() {
    if (!blob) return;
    const shared = await shareBlob(blob, name, t("final.shareText", { name: champName }));
    if (!shared) { downloadBlob(blob, name); setMsg(t("final.saved")); }   // no native share (desktop / old browser): save, then post by hand
  }
  function save() { if (!blob) return; downloadBlob(blob, name); setMsg(t("final.saved")); }

  return (
    <section aria-label={t("final.title")} className="space-y-4">
      <h2 className="text-xl">{t("final.title")}</h2>
      <div className="card text-center">
        <p className="text-4xl" aria-hidden>👑</p>
        <p className="section-label mt-1">{t("final.champion")}</p>
        <p className="mt-1 truncate text-3xl font-extrabold">{champName}</p>
        <p className="mt-1 text-sm text-muted">{champLine}</p>
      </div>
      <div>
        <p className="section-label mb-2">{t("final.board")}</p>
        <ul className="space-y-2">{ranked.map((p) => (
          <li key={p.name + p.rank} className={`card flex items-center gap-3 !p-3 ${p.rank === 1 ? "border-cream" : ""}`}>
            <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-extrabold ${p.rank === 1 ? "bg-cream text-base" : "bg-line text-cream"}`}>{p.rank}</span>
            <span className="min-w-0 flex-1"><b className="block truncate">{p.name}</b><span className="text-xs text-muted">{p.winText}</span></span>
            <b className={`text-lg ${p.net < 0 ? "text-neg" : "text-pos"}`}>{p.netText}</b>
          </li>))}</ul>
      </div>

      <div>
        <p className="section-label mb-2">{t("final.cardTitle")}</p>
        <div className="mx-auto w-full max-w-[280px] overflow-hidden rounded-2xl border border-line bg-card" style={{ aspectRatio: "9 / 16" }}>
          {cardUrl && /* eslint-disable-next-line @next/next/no-img-element */ <img src={cardUrl} alt={t("final.cardTitle")} className={`h-full w-full object-cover ${busy ? "opacity-50" : ""}`} />}
          {busy && !cardUrl && <p className="grid h-full place-items-center text-xs text-muted">{t("final.preparing")}</p>}
        </div>
        <input ref={camRef} type="file" accept="image/*" capture="user" hidden onChange={pick} />
        <input ref={galRef} type="file" accept="image/*" hidden onChange={pick} />
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button type="button" className="btn-secondary" onClick={() => camRef.current?.click()}>📷 {photo ? t("final.change") : t("final.photo")}</button>
          <button type="button" className="btn-secondary" onClick={() => galRef.current?.click()}>🖼️ {t("final.gallery")}</button>
        </div>
        {photo && <button type="button" className="mt-2 w-full text-xs text-muted underline" onClick={() => setPhoto(null)}>{t("final.remove")}</button>}
        <p className="mt-2 text-center text-xs text-muted">{t("final.hint")}</p>
        <div className="mt-3 grid gap-2">
          <button type="button" className="btn-primary" disabled={!blob || busy} onClick={share}>{t("final.share")}</button>
          <button type="button" className="btn-secondary" disabled={!blob || busy} onClick={save}>{t("final.save")}</button>
        </div>
        {msg && <p role="status" className="mt-2 text-center text-sm text-muted">{msg}</p>}
      </div>
    </section>
  );
}
