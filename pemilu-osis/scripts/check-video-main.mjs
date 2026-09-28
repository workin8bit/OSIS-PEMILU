/**
 * Video kampanye harus benar-benar diputar, bukan hanya tampil sebagai
 * elemen video: cek readyState, dimensi, dan durasi setelah dimuat.
 *
 *   node scripts/check-video-main.mjs [url]
 */
import puppeteer from "puppeteer-core";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const ASAL = (process.argv[2] || "http://localhost:3000").replace(/\/$/, "");

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: [
    "--no-sandbox",
    "--disable-dev-shm-usage",
    "--autoplay-policy=no-user-gesture-required",
    "--no-proxy-server",
  ],
});
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 950 });
const gagalJaringan = [];
page.on("requestfailed", (r) => {
  if (r.url().includes("/api/media/drive")) gagalJaringan.push(`${r.failure()?.errorText} ${r.url()}`);
});

await page.goto(`${ASAL}/candidates`, { waitUntil: "networkidle2", timeout: 120000 });
await page.waitForSelector('section[aria-labelledby="video-paslon"]', { timeout: 30000 });

// Cek setiap paslon: video harus ada dan benar-benar berjalan, bukan cuma
// elemennya muncul.
const jumlahTab = await page.evaluate(() => document.querySelectorAll('[aria-pressed]').length);
for (let i = 0; i < jumlahTab; i++) {
  if (i > 0) {
    await page.evaluate((idx) => {
      document.querySelectorAll('[aria-pressed]')[idx]?.click();
    }, i);
    await new Promise((r) => setTimeout(r, 1200));
  }
  await page
    .waitForFunction(
      () => {
        const v = document.querySelector('section[aria-labelledby="video-paslon"] video');
        return v ? v.readyState >= 2 : true;
      },
      { timeout: 60000 },
    )
    .catch(() => {});

  const hasil = await page.evaluate(() => {
    const section = document.querySelector('section[aria-labelledby="video-paslon"]');
    const v = section?.querySelector("video");
    return {
      paslon: document.querySelector('[aria-pressed="true"]')?.textContent?.trim().slice(0, 28),
      adaVideo: Boolean(v),
      src: v ? (v.currentSrc || v.src).replace(/^https?:\/\/[^/]+/, "").slice(0, 60) : "",
      siap: v?.readyState ?? -1,
      dimensi: v ? `${v.videoWidth}x${v.videoHeight}` : "-",
      durasi: v ? Math.round(v.duration) : -1,
      berjalan: v ? v.currentTime : -1,
      adaImg: Boolean(section?.querySelector("img")),
      adaIframe: Boolean(section?.querySelector("iframe")),
      placeholder: section?.textContent?.includes("Video belum diunggah") ?? false,
    };
  });
  // Buktikan benar-benar diputar: tekan play lalu lihat currentTime bergerak.
  const main = await page.evaluate(async () => {
    const v = document.querySelector('section[aria-labelledby="video-paslon"] video');
    if (!v) return { bisaMain: false };
    const awal = v.currentTime;
    try {
      await v.play();
    } catch (e) {
      return { bisaMain: false, alasan: String(e).slice(0, 80) };
    }
    await new Promise((r) => setTimeout(r, 3000));
    return { bisaMain: true, awal, akhir: v.currentTime };
  });

  console.log(`#${i + 1}`, JSON.stringify({ ...hasil, main }));
}
if (gagalJaringan.length) console.log("  request gagal:", JSON.stringify(gagalJaringan));
await browser.close();
