/**
 * Uji bentuk URL Google Drive mana yang benar-benar memuat gambar di
 * elemen <img>:Share link, uc?export=view, thumbnail, dan lh3.
 */
import puppeteer from "puppeteer-core";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const ID = process.argv[2];

const KANDIDAT = [
  ["share /view", `https://drive.google.com/file/d/${ID}/view?usp=drive_link`],
  ["uc?export=view", `https://drive.google.com/uc?export=view&id=${ID}`],
  ["uc?export=download", `https://drive.google.com/uc?export=download&id=${ID}`],
  ["thumbnail sz=w1000", `https://drive.google.com/thumbnail?id=${ID}&sz=w1000`],
  ["thumbnail sz=w800", `https://drive.google.com/thumbnail?id=${ID}&sz=w800`],
  ["lh3 =w1000", `https://lh3.googleusercontent.com/d/${ID}=w1000`],
  ["lh3 =s0", `https://lh3.googleusercontent.com/d/${ID}=s0`],
];

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const page = await browser.newPage();
await page.setViewport({ width: 900, height: 700 });

console.log("ID uji:", ID);
for (const [label, url] of KANDIDAT) {
  const hasil = await page.evaluate(
    (u) =>
      new Promise((res) => {
        const img = new Image();
        const t = setTimeout(() => res({ ok: false, alasan: "timeout 12 detik" }), 12000);
        img.onload = () => {
          clearTimeout(t);
          res({ ok: true, w: img.naturalWidth, h: img.naturalHeight, final: img.currentSrc || img.src });
        };
        img.onerror = () => {
          clearTimeout(t);
          res({ ok: false, alasan: "gagal dimuat" });
        };
        img.src = u;
      }),
    url
  );
  console.log(`${label.padEnd(22)} ${JSON.stringify(hasil)}`);
}

await browser.close();
