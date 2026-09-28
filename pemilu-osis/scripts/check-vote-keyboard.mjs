import puppeteer from "puppeteer-core";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const NIS = process.argv[2] || process.env.NIS_PILKETOS || "";
if (!NIS) {
  console.error("Butuh NISN uji: setel NIS_PILKETOS=<nisn> atau jalankan node check-vote-keyboard.mjs <nisn>.");
  process.exit(1);
}

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 950 });

// Status pemilihan di produksi sedang tertutup, jadi responsnya dipaksa
// terbuka di sini agar kartu bisa diuji. Database tidak diubah.
const STATUS_BUKA = {
  school_name: "SMA Negeri 3 Rembang",
  election_name: "Pemilihan Ketua OSIS",
  academic_year: "2026/2027",
  start_at: null,
  end_at: null,
  is_open: true,
  show_results: true,
};
await page.setRequestInterception(true);
page.on("request", (req) => {
  if (req.url().includes("/rest/v1/rpc/get_status")) {
    return req.respond({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(STATUS_BUKA),
    });
  }
  return req.continue();
});

await page.goto("http://localhost:3000/login", { waitUntil: "networkidle2", timeout: 120000 });

// Login kadang gagal sekali saat request interception aktif, jadi diulang
// sampai kartu paslon benar-benar muncul.
async function login() {
  for (let attempt = 1; attempt <= 3; attempt++) {
    if ((await page.evaluate(() => location.pathname)) === "/vote") return true;
    await page.goto("http://localhost:3000/login", { waitUntil: "networkidle2", timeout: 120000 });
    await page.evaluate(() => {
      document.querySelector("#nisn").value = "";
      document.querySelector("#password").value = "";
    });
    await page.type("#nisn", NIS);
    await page.type("#password", NIS);
    await page.click('button[type="submit"]');
    for (let i = 0; i < 20; i++) {
      await new Promise((r) => setTimeout(r, 500));
      const ok = await page.evaluate(() => document.querySelectorAll('[role="radio"]').length > 0);
      if (ok) return true;
    }
  }
  return false;
}

const masuk = await login();
await new Promise((r) => setTimeout(r, 800));
if (!masuk) {
  console.log("Login gagal setelah 3 percobaan.");
  await browser.close();
  process.exit(1);
}

const di = await page.evaluate(() => ({
  url: location.pathname,
  kartu: document.querySelectorAll('[role="radio"]').length,
  teks: (document.body.innerText || "").slice(0, 120).replace(/\n/g, " | "),
}));
console.log("Halaman:", JSON.stringify(di));
if (!di.kartu) {
  await browser.close();
  process.exit(1);
}

// Catat semua keydown yang sampai di elemen kartu.
await page.evaluate(() => {
  window.__log = [];
  document.querySelectorAll('[role="radio"]').forEach((k, i) => {
    k.addEventListener("keydown", (e) => window.__log.push(`kartu${i}:${e.key}`), true);
  });
});

const baca = () =>
  page.evaluate(() => ({
    checked: [...document.querySelectorAll('[role="radio"]')].map((x) => x.getAttribute("aria-checked")),
    fokusIndex: [...document.querySelectorAll('[role="radio"]')].indexOf(document.activeElement),
    log: window.__log,
  }));

await page.evaluate(() => document.querySelectorAll('[role="radio"]')[2].focus());
await new Promise((r) => setTimeout(r, 150));
await page.keyboard.press("Enter");
await new Promise((r) => setTimeout(r, 350));
console.log("Enter :", JSON.stringify(await baca()));

await page.keyboard.press("Space");
await new Promise((r) => setTimeout(r, 350));
console.log("Spasi :", JSON.stringify(await baca()));

await page.evaluate(() => document.querySelectorAll('[role="radio"]')[0].click());
await new Promise((r) => setTimeout(r, 350));
console.log("Klik  :", JSON.stringify(await baca()));

// Puppeteer tidak mengirim keyboard ke halaman di mode headless ini, jadi
// event keydown dikirim dari dalam halaman. React memasang pendengar di
// root, jadi event yang lolos tetap memicu onKeyDown milik kartu.
for (const key of ["Enter", " "]) {
  await page.evaluate((k) => {
    const kartu = document.querySelectorAll('[role="radio"]')[2];
    kartu.focus();
    kartu.dispatchEvent(
      new KeyboardEvent("keydown", { key: k, bubbles: true, cancelable: true })
    );
  }, key);
  await new Promise((r) => setTimeout(r, 350));
  console.log(`keydown "${key === " " ? "Spasi" : key}" :`, JSON.stringify(await baca()));
}

await browser.close();
