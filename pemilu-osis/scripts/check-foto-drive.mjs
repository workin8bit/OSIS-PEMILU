/**
 * Cek apakah tautan Google Drive yang ditempel panitia benar-benar tampil
 * sebagai gambar di beranda, halaman paslon, dan bilik suara.
 *
 * Patokan successful: <img> yang termuat punya naturalWidth > 0. Foto dengan
 * naturalWidth 0 berarti tautan Drive masih berupa halaman HTML, bukan gambar.
 *
 * Butuh NISN uji untuk bilik suara:
 *   node scripts/check-foto-drive.mjs <nisn>
 *   setel NIS_PILKETOS=<nisn> lalu jalankan tanpa argumen
 */
import puppeteer from "puppeteer-core";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const ASAL = (process.env.BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const NIS = process.argv[2] || process.env.NIS_PILKETOS || "";
if (!NIS) {
  console.error("Butuh NISN uji: setel NIS_PILKETOS=<nisn> atau jalankan node check-foto-drive.mjs <nisn>.");
  process.exit(1);
}

// Status pemilihan di produksi sedang tertutup, jadi responsnya dipaksa
// terbuka supaya kartu paslon bisa dirender tanpa mengubah data nyata.
const STATUS_BUKA = {
  school_name: "SMA Negeri 3 Rembang",
  election_name: "Pemilihan Ketua OSIS",
  academic_year: "2026/2027",
  start_at: null,
  end_at: null,
  is_open: true,
  show_results: true,
};

const bacaGambar = () =>
  new Promise((res) => {
    // Foto dimuat malas, jadi elemen digeser ke layar dulu supaya browser
    // benar-benar memuatnya.
    document.querySelector("main img")?.scrollIntoView();
    setTimeout(() => {
      const img = document.querySelector("main img");
      res(
        img
          ? {
              ada: true,
              src: img.currentSrc || img.src,
              w: img.naturalWidth,
              h: img.naturalHeight,
              tampilW: Math.round(img.getBoundingClientRect().width),
            }
          : { ada: false }
      );
    }, 4500);
  });

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});

// 1. Beranda: kartu ringkas memakai foto compact.
let page = await browser.newPage();
await page.setViewport({ width: 1280, height: 950 });
await page.goto(ASAL + "/", { waitUntil: "networkidle2", timeout: 120000 });
console.log("Beranda   :", JSON.stringify(await page.evaluate(bacaGambar)));
await page.close();

// 2. Halaman paslon: kartu identitas memuat foto.
page = await browser.newPage();
await page.setViewport({ width: 1280, height: 950 });
await page.goto(ASAL + "/candidates", { waitUntil: "networkidle2", timeout: 120000 });
await new Promise((r) => setTimeout(r, 2500));
console.log("Paslon    :", JSON.stringify(await page.evaluate(bacaGambar)));
await page.close();

// 3. Bilik suara: kartu suara memakai foto compact.
page = await browser.newPage();
await page.setViewport({ width: 1280, height: 950 });
await page.setRequestInterception(true);
page.on("request", (req) => {
  // Pre-flight CORS harus diteruskan apa adanya, hanya GET yang ditimpa.
  if (req.url().includes("/rest/v1/rpc/get_status") && req.method() === "GET") {
    return req.respond({
      status: 200,
      contentType: "application/json",
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify(STATUS_BUKA),
    });
  }
  return req.continue();
});
let masuk = false;
for (let a = 0; a < 3 && !masuk; a++) {
  await page.goto(ASAL + "/login", { waitUntil: "networkidle2", timeout: 120000 });
  await page.type("#nisn", NIS);
  await page.type("#password", NIS);
  await page.click('button[type="submit"]');
  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 500));
    if (await page.evaluate(() => document.querySelectorAll('[role="radio"]').length > 0)) {
      masuk = true;
      break;
    }
  }
}
if (masuk) {
  // Tunggu navigasi selesai dulu; evaluates saat halaman masih berpindah
  // membuat konteks eksekusi hancur.
  await page.waitForSelector('[role="radio"]', { timeout: 30000 });
  await page.waitForNetworkIdle({ idleTime: 1500, timeout: 60000 }).catch(() => {});
  await new Promise((r) => setTimeout(r, 2000));
  console.log("Bilik suara:", JSON.stringify(await page.evaluate(bacaGambar)));
} else {
  console.log("Bilik suara: login gagal");
}
await page.close();

await browser.close();
