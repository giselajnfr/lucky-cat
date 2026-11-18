// Finds Indonesian UI text in the source that English mode cannot translate yet.
// Usage: npm run check:i18n   (needs `npx tsc` once to compile lib/i18n/phrases.ts into a temp dir)
import { execSync } from "node:child_process";
import { readFileSync, readdirSync, statSync, mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";

const out = mkdtempSync(join(tmpdir(), "lc-i18n-"));
try { execSync(`npx tsc lib/i18n/phrases.ts lib/i18n/phrasesRules.ts lib/i18n/phrasesExtra.ts --outDir ${out} --module esnext --target es2020 --moduleResolution bundler --skipLibCheck --ignoreConfig`, { stdio: "ignore" }); } catch { /* tsc exits non-zero on type errors but still emits */ }
// tsc keeps extensionless imports; patch for node ESM
import { writeFileSync } from "node:fs";
const pj = join(out, "phrases.js");
writeFileSync(pj, readFileSync(pj, "utf8").replace('"./phrasesRules"', '"./phrasesRules.js"').replace('"./phrasesExtra"', '"./phrasesExtra.js"'));
const { translatePhrase } = await import(pathToFileURL(pj).href);

const WORDS = new Set(("yang dan atau untuk dengan dari ke di pada tidak belum sudah akan bisa boleh harus mau semua setiap ini itu kamu anda saya kami " +
  "gagal berhasil simpan hapus tambah ubah batal lanjut kembali selesai mulai akhiri buka tutup pilih masukkan isi nama kode meja pemain kartu tangan " +
  "menang kalah poin skor riwayat game permainan aturan bantuan terlalu banyak coba lagi sampai selama ruang gabung keluar masuk daftar sandi " +
  "belum ada tidak ada minimal maksimal jumlah waktu jam menit detik hari bulan tahun lihat semua lainnya sedang berjalan dijeda menunggu " +
  "pemenang seri buangan bunga angin naga set kursi putaran ronde").split(" "));
const SKIP_DIRS = new Set(["node_modules", ".next", "__tests__", "supabase", "scripts", "public"]);
const SKIP_FILES = /(phrases|phrasesRules|dictionary|ruleText|errors)\.ts$|\.test\.ts$|lib\/scoring\/|lib\/i18n\//;

function walk(d, acc = []) {
  for (const f of readdirSync(d)) {
    if (SKIP_DIRS.has(f)) continue;
    const p = join(d, f), s = statSync(p);
    if (s.isDirectory()) walk(p, acc); else if (/\.(tsx?|ts)$/.test(f) && !SKIP_FILES.test(p.replaceAll("\\", "/"))) acc.push(p);
  }
  return acc;
}
const looksId = (t) => { const w = t.toLowerCase().match(/[a-zA-Zàéèü']+/g) ?? []; return w.length > 0 && w.some((x) => WORDS.has(x)); };
const missing = new Map();
for (const file of walk(".")) {
  const src = readFileSync(file, "utf8");
  const cands = [];
  for (const m of src.matchAll(/"((?:[^"\\\n]|\\.)+)"|'((?:[^'\\\n]|\\.)+)'|`((?:[^`\\]|\\.)+)`/g)) cands.push(m[1] ?? m[2] ?? m[3]);
  for (const m of src.matchAll(/>([^<>{}\n]*[A-Za-z][^<>{}\n]*)</g)) cands.push(m[1]);
  for (const raw of cands) {
    const t = raw.replace(/\\n/g, "\n").trim();
    if (t.length < 3 || /^[\w./:#@\-\[\]]+$/.test(t) && !t.includes(" ")) continue;   // identifiers, paths, classes of one token
    if (/^(use client|bg-|text-|flex|grid|border|rounded|px-|py-|w-|h-|min-|max-|hover:|sm:|md:|\/)/.test(t) && !/[A-Z][a-z]+ [a-z]/.test(t)) continue;
    if (!looksId(t) || /^[\w*:!.()=, \n]+$/.test(t) && t.includes(",") && !/[a-z]{3,} [a-z]{3,}/.test(t)) continue;   // skips SQL column lists
    const parts = t.split(/\$\{[^}]*\}/).map((x) => x.trim()).filter((x) => x.length > 2 && looksId(x));
    const unit = t.includes("${") ? parts : [t];
    for (const u of unit) if (translatePhrase(u) === u) { const k = u; (missing.get(k) ?? missing.set(k, new Set()).get(k)).add(file); }
  }
}
const rows = [...missing].sort((a, b) => [...a[1]][0].localeCompare([...b[1]][0]));
for (const [t, f] of rows) console.log(`${[...f][0]}\t${JSON.stringify(t)}`);
console.log(`\n${rows.length} candidate Indonesian strings without an English translation.`);
process.exit(rows.length && process.argv.includes("--strict") ? 1 : 0);
