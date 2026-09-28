/**
 * Login ke bilik suara lokal lalu ukur kartu paslon di /vote.
 * Tidak pernah menekan tombol konfirmasi, jadi tidak ada suara terkirim.
 */
import puppeteer from "puppeteer-core";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const NIS = process.argv[2] || process.env.NIS_PILKETOS || "";
if (!NIS) {
  console.error("Butuh NISN uji: setel NIS_PILKETOS=<nisn> atau jalankan node measure-vote-card.mjs <nisn>.");
  process.exit(1);
}
const PW = process.argv[3] || NIS;

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});

for (const width of [360, 768, 1280]) {
  const page = await browser.newPage();
  await page.setViewport({ width, height: 900, isMobile: width < 768, hasTouch: width < 768 });
  await page.goto("http://localhost:3000/login", { waitUntil: "networkidle2", timeout: 120000 });
  await page.type("#nisn", NIS);
  await page.type("#password", PW);
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle2", timeout: 120000 }).catch(() => {}),
    page.click('button[type="submit"]'),
  ]);
  await new Promise((r) => setTimeout(r, 1800));

  const url = page.url();
  const r = await page.evaluate(() => {
    const grup = document.querySelector('[role="radiogroup"]');
    if (!grup) return { error: "radiogroup tidak ada", url: location.pathname };
    const kartu = [...grup.querySelectorAll('[role="radio"]')];
    return {
      jumlahKartu: kartu.length,
      detail: kartu.map((k) => {
        const b = k.getBoundingClientRect();
        const media = k.querySelector("img, .aspect-\\[3\\/4\\], [class*='aspect-']");
        const chip = k.querySelector("span.font-mono");
        const cek = k.querySelector('[aria-hidden="true"]');
        return {
          nama: (k.querySelector(".font-bold")?.textContent || "").trim(),
          w: Math.round(b.width),
          h: Math.round(b.height),
          media: media ? `${media.tagName} ${Math.round(media.getBoundingClientRect().width)}x${Math.round(media.getBoundingClientRect().height)}` : "tidak ada",
          adaChipNomor: !!chip,
          chipTeks: (chip?.textContent || "").trim(),
          adaPenandaCek: !!cek,
          grayscale: media?.tagName === "IMG" ? getComputedStyle(media).filter : null,
        };
      }),
      overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    };
  });

  console.log(`\n=== ${width}px (${url.replace("http://localhost:3000", "")}) ===`);
  console.log(JSON.stringify(r, null, 1));
  await page.close();
}

await browser.close();
