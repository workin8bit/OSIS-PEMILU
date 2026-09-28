/**
 * Pastikan kartu suara tidak lagi menampilkan nama, kelas, atau slogan,
 * dan tetap punya aria-label yang berguna.
 */
import puppeteer from "puppeteer-core";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const NIS = process.argv[2] || process.env.NIS_PILKETOS || "";
if (!NIS) {
  console.error("Butuh NISN uji: setel NIS_PILKETOS=<nisn> atau jalankan node check-vote-card-teks.mjs <nisn>.");
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

for (const width of [360, 768, 1280]) {
  const page = await browser.newPage();
  await page.setViewport({ width, height: 950, isMobile: width < 768, hasTouch: width < 768 });
  await page.setRequestInterception(true);
  page.on("request", (req) => {
    if (req.url().includes("/rest/v1/rpc/get_status")) {
      return req.respond({ status: 200, contentType: "application/json", body: JSON.stringify(STATUS_BUKA) });
    }
    return req.continue();
  });

  let masuk = false;
  for (let attempt = 0; attempt < 3 && !masuk; attempt++) {
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
  await new Promise((r) => setTimeout(r, 800));

  const r = await page.evaluate(() => {
    const kartu = [...document.querySelectorAll('[role="radio"]')];
    const grup = document.querySelector('[role="radiogroup"]');
    return {
      jumlahKartu: kartu.length,
      kartu: kartu.map((k) => {
        const b = k.getBoundingClientRect();
        const teks = (k.innerText || "").trim().replace(/\n/g, " | ");
        return {
          ariaLabel: k.getAttribute("aria-label"),
          tinggi: Math.round(b.height),
          lebar: Math.round(b.width),
          teks,
          adaNama: /Anindya|Dinda|Anzil/.test(teks),
          adaKelas: /XI\.\d/.test(teks),
          adaSlogan: /[%“”"]/.test(teks),
        };
      }),
      namaDiGrup: /Anindya|Dinda|Anzil/.test(grup.innerText || ""),
      kelasDiGrup: /XI\.\d/.test(grup.innerText || ""),
      overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    };
  });

  console.log(`\n=== ${width}px ===`);
  console.log(JSON.stringify(r, null, 1));
  await page.close();
}

await browser.close();
