/**
 * Uji status pemuatan: gagal saat memuat data harus memunculkan kartu error
 * dengan tombol coba lagi, bukan kalimat "belum ada kandidat".
 */
import puppeteer from "puppeteer-core";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--no-proxy-server"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 950 });
let gagal = 0;
await page.setRequestInterception(true);
page.on("request", (req) => {
  // Gagalkan empat percobaan awal supaya status error terlihat; setelah itu
  // request diteruskan supaya tombol coba lagi bisa berhasil.
  if (req.url().includes("/rest/v1/candidates") && req.method() === "GET" && gagal < 4) {
    gagal++;
    return req.respond({ status: 503, contentType: "application/json", headers: { "Access-Control-Allow-Origin": "*" }, body: JSON.stringify({ message: "upstream gagal" }) });
  }
  return req.continue();
});

await page.goto("http://localhost:3000/candidates", { waitUntil: "networkidle2", timeout: 120000 });
await page.waitForFunction(() => document.body.innerText.includes("gagal dimuat"), { timeout: 20000 });

const sebelum = await page.evaluate(() => ({
  error: document.body.innerText.includes("Data paslon gagal dimuat"),
  kosong: document.body.innerText.includes("Belum ada kandidat aktif"),
}));
console.log("SETELAH GAGAL:", JSON.stringify(sebelum), "| percobaan:", gagal);

// Tombol coba lagi harus menembak ulang; request setelah empat kegagalan
// pertama sudah diteruskan sehingga data asli kembali muncul.
await page.evaluate(() => {
  const t = [...document.querySelectorAll("button")].find((b) => b.textContent?.includes("Coba lagi"));
  t?.click();
});
await new Promise((r) => setTimeout(r, 4000));
const sesudah = await page.evaluate(() => ({
  error: document.body.innerText.includes("Data paslon gagal dimuat"),
  paslon: document.body.innerText.includes("Anindya Aya Kurniawan"),
}));
console.log("SETELAH COBA LAGI:", JSON.stringify(sesudah));

await browser.close();
