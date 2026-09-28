/**
 * Jalankan SQL dari berkas migrasi lewat sesi dashboard Supabase yang
 * sudah terbuka di browser (CDP 9222). Dipakai karena proyek ini tidak
 * punya SUPABASE_ACCESS_TOKEN untuk `supabase db push`.
 *
 *   node scripts/terapkan-migrasi.mjs supabase/migrations/000000000018_candidate_vote_photo.sql
 *
 * Browser harus sudah login ke supabase.com dan dibuka dengan
 * --remote-debugging-port=9222.
 */
import { readFileSync } from "node:fs";
import puppeteer from "puppeteer-core";

const REF = "rhmyqlxzuezmmjwbghfw";
const berkas = process.argv[2];
if (!berkas) {
  console.error("Usage: node scripts/terapkan-migrasi.mjs <file.sql>");
  process.exit(1);
}
const sql = readFileSync(berkas, "utf8");

const browser = await puppeteer.connect({
  browserURL: "http://127.0.0.1:9222",
  defaultViewport: { width: 1440, height: 900 },
});

const pages = await browser.pages();
let sqlPage = pages.find((p) => p.url().includes(`supabase.com/dashboard/project/${REF}`));
if (!sqlPage) {
  console.log("Membuka SQL editor...");
  sqlPage = await browser.newPage();
  await sqlPage.goto(`https://supabase.com/dashboard/project/${REF}/sql/new`, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  await new Promise((r) => setTimeout(r, 6000));
}

const hasil = await sqlPage.evaluate(
  async (sqlText, ref) => {
    const token = localStorage.getItem("supabase.dashboard.auth.token");
    if (!token) return { ok: false, pesan: "Token dashboard tidak ditemukan di localStorage" };
    let accessToken = token;
    try {
      accessToken = JSON.parse(token).access_token;
    } catch {
      /* token sudah berupa string biasa */
    }
    const res = await fetch(`https://api.supabase.com/platform/pg-meta/${ref}/query`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "x-connection-encrypted": "true",
      },
      body: JSON.stringify({ query: sqlText }),
    });
    return { ok: res.ok, status: res.status, body: (await res.text()).slice(0, 1200) };
  },
  sql,
  REF,
);

console.log("STATUS :", hasil.status ?? "-");
console.log("HASIL  :", hasil.body ?? hasil.pesan ?? "-");
await browser.disconnect();
process.exit(hasil.ok ? 0 : 1);
