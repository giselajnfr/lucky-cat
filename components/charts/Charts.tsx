const PALETTE = ["#F7ECD0", "#E8A87C", "#85C1A3", "#9DB4E8", "#D98BA8", "#C4AD8E"];

export function BarList({ data, unit = "", empty = "Belum ada data." }: { data: { name: string; value: number; note?: string }[]; unit?: string; empty?: string }) {
  if (!data.length) return <p className="text-sm text-muted">{empty}</p>;
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <ul className="space-y-2.5">
      {data.map((d) => (
        <li key={d.name}>
          <div className="mb-1 flex justify-between text-sm"><span className="truncate">{d.name}</span><b>{d.value}{unit}{d.note ? <span className="font-normal text-muted"> · {d.note}</span> : null}</b></div>
          <div className="h-2.5 rounded-full bg-base/60" role="img" aria-label={`${d.name}: ${d.value}${unit}`}><div className="h-full rounded-full bg-cream" style={{ width: `${Math.max(2, (d.value / max) * 100)}%` }} /></div>
        </li>
      ))}
    </ul>
  );
}

export function Split({ a, b, aLabel, bLabel }: { a: number; b: number; aLabel: string; bLabel: string }) {
  const t = a + b;
  if (!t) return <p className="text-sm text-muted">Belum ada kemenangan.</p>;
  const pa = (a / t) * 100;
  return (
    <div>
      <div className="flex h-4 overflow-hidden rounded-full bg-base/60" role="img" aria-label={`${aLabel} ${a}, ${bLabel} ${b}`}>
        <div style={{ width: `${pa}%`, background: PALETTE[0] }} /><div style={{ width: `${100 - pa}%`, background: PALETTE[3] }} />
      </div>
      <div className="mt-2 flex justify-between text-sm"><span><i className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full align-middle" style={{ background: PALETTE[0] }} />{aLabel} <b>{a}</b></span><span><i className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full align-middle" style={{ background: PALETTE[3] }} />{bLabel} <b>{b}</b></span></div>
    </div>
  );
}

export function LineChart({ series, xLabels }: { series: { name: string; values: number[] }[]; xLabels?: string[] }) {
  const n = Math.max(...series.map((s) => s.values.length), 0);
  if (n < 2) return <p className="text-sm text-muted">Butuh minimal dua titik data untuk grafik.</p>;
  const all = series.flatMap((s) => s.values); const lo = Math.min(...all, 0), hi = Math.max(...all, 0), span = hi - lo || 1;
  const W = 320, H = 150, px = 28, py = 12;
  const X = (i: number) => px + (i / (n - 1)) * (W - px - 6), Y = (v: number) => H - py - ((v - lo) / span) * (H - py * 2);
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H + 14}`} className="w-full" role="img" aria-label="Grafik">
        <line x1={px} x2={W - 6} y1={Y(0)} y2={Y(0)} stroke="#7A564C" strokeDasharray="3 3" />
        <text x={2} y={Y(hi) + 3} fontSize="9" fill="#C4AD8E">{hi}</text><text x={2} y={Y(lo) + 3} fontSize="9" fill="#C4AD8E">{lo}</text>
        {series.map((s, k) => <polyline key={s.name} fill="none" stroke={PALETTE[k % PALETTE.length]} strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" points={s.values.map((v, i) => `${X(i)},${Y(v)}`).join(" ")} />)}
        {xLabels && <><text x={px} y={H + 10} fontSize="9" fill="#C4AD8E">{xLabels[0]}</text><text x={W - 6} y={H + 10} fontSize="9" fill="#C4AD8E" textAnchor="end">{xLabels[xLabels.length - 1]}</text></>}
      </svg>
      <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs">{series.map((s, k) => <li key={s.name}><i className="mr-1.5 inline-block h-2 w-2 rounded-full align-middle" style={{ background: PALETTE[k % PALETTE.length] }} />{s.name}</li>)}</ul>
    </div>
  );
}

export function Columns({ data }: { data: { label: string; value: number }[] }) {
  if (!data.length) return <p className="text-sm text-muted">Belum ada game selesai.</p>;
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="flex h-32 items-end gap-2" role="img" aria-label="Aktivitas bulanan">
      {data.map((d) => (<div key={d.label} className="flex flex-1 flex-col items-center justify-end gap-1"><b className="text-xs">{d.value}</b><div className="w-full rounded-t-md bg-cream" style={{ height: `${Math.max(6, (d.value / max) * 90)}px` }} /><span className="text-[10px] text-muted">{d.label}</span></div>))}
    </div>
  );
}
