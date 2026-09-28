/**
 * Cari halaman supabase.com yang masih login di browser CDP, lalu cek
 * di localStorage / sessionStorage mana yang menyimpan token dashboard.
 */
import puppeteer from "puppeteer-core";

const browser = await puppeteer.connect({
  browserURL: "http://127.0.0.1:9222",
  defaultViewport: { width: 1280, height: 800 },
});
const pages = await browser.pages();
console.log("halaman terbuka:", pages.length);
for (const p of pages) {
  const u = p.url();
  if (!u.includes("supabase.com")) continue;
  const info = await p
    .evaluate(() => {
      const kandidat = Object.keys(localStorage).filter((k) => /auth|token|session|supabase/i.test(k));
      return {
        url: location.href.slice(0, 90),
        title: document.title.slice(0, 60),
        keys: kandidat.slice(0, 12),
        sessionKeys: Object.keys(sessionStorage).filter((k) => /auth|token|session|supabase/i.test(k)).slice(0, 12),
        adaSignIn: /sign in|log in/i.test(document.body.innerText.slice(0, 400)),
      };
    })
    .catch((e) => ({ url: u.slice(0, 90), error: String(e).slice(0, 60) }));
  console.log(JSON.stringify(info, null, 1));
}
await browser.disconnect();
