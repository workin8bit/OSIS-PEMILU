/**
 * Cek cepat halaman paslon di server sungguhan: apakah bagian Video
 * Kampanye ada, dan apa yang isinya untuk kandidat tanpa video.
 *
 *   node scripts/check-video-halaman.mjs [url]
 */
import puppeteer from "puppeteer-core";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const ASAL = (process.argv[2] || "http://localhost:3000").replace(/\/$/, "");

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 950 });
await page.goto(`${ASAL}/candidates`, { waitUntil: "networkidle2", timeout: 120000 });
await page.waitForSelector('section[aria-labelledby="video-paslon"]', { timeout: 30000 });

const hasil = await page.evaluate(() => {
  const section = document.querySelector('section[aria-labelledby="video-paslon"]');
  return {
    judul: [...document.querySelectorAll("main h3")].map((x) => x.textContent?.trim()),
    videoDiAtasVisi:
      [...document.querySelectorAll("main h3")].findIndex((x) => x.textContent?.trim() === "Video Kampanye") <
      [...document.querySelectorAll("main h3")].findIndex((x) => x.textContent?.trim() === "Visi Strategis"),
    isiVideo: section?.querySelector("iframe")
      ? "iframe"
      : section?.textContent?.includes("Video belum diunggah")
        ? "placeholder"
        : "tidak diketahui",
  };
});

console.log(ASAL, JSON.stringify(hasil));
await browser.close();
