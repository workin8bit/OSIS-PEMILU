/**
 * Uji jalur gagal: foto Drive yang tidak ada harus berakhir di placeholder,
 * bukan halaman HTML Drive atau loop tanpa henti.
 */
import puppeteer from "puppeteer-core";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

const PASLON = {
  id: "11111111-1111-1111-1111-111111111111",
  number: 1,
  name: "Uji Gagal",
  class_name: "XI.1",
  photo_url: "https://drive.google.com/file/d/AAAAAAAAAAAAdiTakAda/view?usp=drive_link",
  video_url: null,
  slogan: "Uji",
  vision: "Uji",
  missions: [],
  is_active: true,
  steps: [],
  tagline: "",
};

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--no-proxy-server"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 950 });
let permintaan = 0;
page.on("request", (r) => {
  if (r.url().includes("google")) permintaan++;
});
await page.setRequestInterception(true);
page.on("request", (req) => {
  // Pre-flight CORS harus diteruskan apa adanya; hanya GET yang dimock.
  if (req.url().includes("/rest/v1/candidates") && req.method() === "GET") {
    console.log("INTERCEPT:", req.method(), req.url().slice(0, 90));
    return req.respond({
      status: 200,
      contentType: "application/json",
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify([PASLON]),
    });
  }
  return req.continue();
});
page.on("response", (res) => {
  if (res.url().includes("/rest/v1/candidates")) {
    console.log("RESPONS:", res.status(), res.url().slice(0, 70));
  }
});
page.on("console", (m) => {
  if (m.type() === "error") console.log("CONSOLE:", m.text().slice(0, 160));
});

await page.goto("http://localhost:3000/candidates", { waitUntil: "networkidle2", timeout: 120000 });
await new Promise((r) => setTimeout(r, 3000));
// Foto dimuat malas, jadi digeser ke layar supaya permintaan benar-benar dibuat.
await page.evaluate(() => document.querySelector("main img")?.scrollIntoView());
// Tunggu sampai semua URL percobaan habis (gambar hilang) atau waktu habis.
for (let i = 0; i < 20; i++) {
  const selesai = await page.evaluate(() => !document.querySelector("main img"));
  if (selesai) break;
  await new Promise((r) => setTimeout(r, 1000));
}

const hasil = await page.evaluate(() => ({
  img: [...document.querySelectorAll("main img")].map((i) => (i.currentSrc || i.src).slice(0, 70)),
  placeholder: document.body.innerText.includes("Foto Paslon"),
  teks: document.body.innerText.replace(/\s+/g, " ").slice(0, 160),
}));

console.log("PERMINTAAN GOOGLE:", permintaan, "(harus 4: thumbnail, lh3 w1000, lh3 s0, url asli)");
console.log("IMG              :", JSON.stringify(hasil.img));
console.log("PLACEHOLDER      :", hasil.placeholder);
console.log("TEKS             :", hasil.teks);
await browser.close();
