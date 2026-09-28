/**
 * Ukur baris bawah sticky setelah pilih paslon: isi baris, tinggi, dan
 * apakah bertabrakan dengan bottom nav di layar kecil.
 */
import puppeteer from "puppeteer-core";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const NIS = process.argv[2] || process.env.NIS_PILKETOS || "";
if (!NIS) {
  console.error("Butuh NISN uji: setel NIS_PILKETOS=<nisn> atau jalankan node measure-sticky-bar.mjs <nisn>.");
  process.exit(1);
}

const STATUS_BUKA = {
  school_name: "SMA Negeri 3 Rembang",
  election_name: "Pemilihan Ketua OSIS",
  academic_year: "2026/2027",
  start_at: null,
  end_at: null,
  is_open: true,
  show_results: true,
};

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});

for (const width of [360, 390, 768, 1280]) {
  const page = await browser.newPage();
  await page.setViewport({ width, height: 850, isMobile: width < 768, hasTouch: width < 768 });
  await page.setRequestInterception(true);
  page.on("request", (req) => {
    if (req.url().includes("/rest/v1/rpc/get_status")) {
      return req.respond({ status: 200, contentType: "application/json", body: JSON.stringify(STATUS_BUKA) });
    }
    return req.continue();
  });

  let masuk = false;
  for (let a = 0; a < 3 && !masuk; a++) {
    await page.goto("http://localhost:3000/login", { waitUntil: "networkidle2", timeout: 120000 });
    await page.type("#nisn", NIS);
    await page.type("#password", NIS);
    await page.click('button[type="submit"]');
    for (let i = 0; i < 20; i++) {
      await new Promise((r) => setTimeout(r, 500));
      if (await page.evaluate(() => document.querySelectorAll('[role="radio"]').length > 0)) { masuk = true; break; }
    }
  }
  if (!masuk) { console.log(`${width}px: login gagal`); await page.close(); continue; }
  await new Promise((r) => setTimeout(r, 700));

  await page.evaluate(() => document.querySelectorAll('[role="radio"]')[0].click());
  await new Promise((r) => setTimeout(r, 500));
  // Di tengah halaman, bukan di paling bawah: di sanalah elemen sticky
  // benar-benar menempel dan bisa menimpa bottom nav.
  await page.evaluate(() => window.scrollTo({ top: 400, behavior: "instant" }));
  await new Promise((r) => setTimeout(r, 600));

  const r = await page.evaluate(() => {
    // Baris bawah sticky bukan header; header berupa elemen header sticky.
    const sticky = document.querySelector("div.sticky");
    const bar = sticky?.firstElementChild;
    const tombol = bar ? [...bar.querySelectorAll("button")][0] : null;
    // Bottom nav disembunyikan dari md ke atas, jadi rect-nya 0 dan tidak
    // boleh dipakai sebagai pembanding.
    const nav = [...document.querySelectorAll("nav")].find(
      (n) => getComputedStyle(n).position === "fixed" && n.getBoundingClientRect().height > 0
    );
    const bR = bar?.getBoundingClientRect();
    const nR = nav?.getBoundingClientRect();
    return {
      teksBaris: (bar?.innerText || "").trim().replace(/\n/g, " | "),
      tinggiBar: bR ? Math.round(bR.height) : null,
      lebarBar: bR ? Math.round(bR.width) : null,
      tinggiTombol: tombol ? Math.round(tombol.getBoundingClientRect().height) : null,
      tombolTertindih: tombol ? Math.round(tombol.scrollWidth - tombol.clientWidth) : null,
      barisTumpangNav: bR && nR ? bR.bottom > nR.top + 1 : null,
      jarakBarisNav: bR && nR ? Math.round(nR.top - bR.bottom) : null,
      overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    };
  });

  console.log(`${String(width).padStart(4)}px ${JSON.stringify(r)}`);
  await page.close();
}

await browser.close();
