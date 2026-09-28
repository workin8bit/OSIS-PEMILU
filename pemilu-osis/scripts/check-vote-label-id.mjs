/**
 * Cek label identitas di baris profil bilik suara: NIP untuk guru,
 * NISN untuk siswa. Role disuntikkan ke sesi localStorage untuk
 * mensimulasikan hasil check_voter yang sudah mengembalikan role.
 */
import puppeteer from "puppeteer-core";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const NIS = process.argv[2] || process.env.NIS_PILKETOS || "";
if (!NIS) {
  console.error("Butuh NISN uji: setel NIS_PILKETOS=<nisn> atau jalankan node check-vote-label-id.mjs <nisn>.");
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

for (const role of ["guru", "siswa", undefined]) {
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 850, isMobile: true, hasTouch: true });
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
  if (!masuk) { console.log("login gagal"); await page.close(); continue; }

  if (role !== undefined) {
    await page.evaluate((r) => {
      const s = JSON.parse(localStorage.getItem("osis_session"));
      s.role = r;
      localStorage.setItem("osis_session", JSON.stringify(s));
    }, role);
  }
  await page.reload({ waitUntil: "networkidle2" });
  await new Promise((r) => setTimeout(r, 1500));

  const hasil = await page.evaluate(() => {
    const bar = [...document.querySelectorAll("div")].find((d) =>
      /NISN \d|NIP \d/.test(d.textContent || "") && d.children.length <= 2
    );
    return {
      url: location.pathname,
      barisProfil: (bar?.innerText || "").trim().replace(/\n/g, " | "),
      pakaiNIP: /NIP \d/.test(bar?.innerText || ""),
      pakaiNISN: /NISN \d/.test(bar?.innerText || ""),
      roleDiSesi: JSON.parse(localStorage.getItem("osis_session") || "{}").role ?? null,
    };
  });
  console.log(`role=${String(role)} ->`, JSON.stringify(hasil));
  await page.close();
}

await browser.close();
