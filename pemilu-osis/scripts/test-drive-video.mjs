/**
 * Tautan video dari Google Drive harus bisa diputar sebagai <video>, bukan
 * hanya diambil lewat fetch. Skrip ini mencoba beberapa bentuk URL dan
 * melaporkan apakah Chrome benar-benar memutar videonya.
 */
import puppeteer from "puppeteer-core";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const ID = process.argv[2];
if (!ID) {
  console.error("Usage: node scripts/test-drive-video.mjs <file-id>");
  process.exit(1);
}

const BENTUK = [
  ["share /view", `https://drive.google.com/file/d/${ID}/view?usp=drive_link`],
  ["uc?export=download", `https://drive.google.com/uc?export=download&id=${ID}`],
  ["usercontent download", `https://drive.usercontent.google.com/download?id=${ID}&export=download`],
  ["usercontent + confirm", `https://drive.usercontent.google.com/download?id=${ID}&export=download&confirm=t`],
  ["thumbnail (harus gagal)", `https://drive.google.com/thumbnail?id=${ID}&sz=w1000`],
];

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--autoplay-policy=no-user-gesture-required"],
});
const page = await browser.newPage();
await page.goto("http://localhost:3000/", { waitUntil: "domcontentloaded", timeout: 120000 });

const hasil = await page.evaluate(
  (daftar) =>
    Promise.all(
      daftar.map(
        ([nama, url]) =>
          new Promise((res) => {
            const v = document.createElement("video");
            v.muted = true;
            v.playsInline = true;
            const selesai = (status, ket) => res({ nama, status, ket, src: v.currentSrc || url });
            v.addEventListener("loadedmetadata", () =>
              selesai("bisa", `${v.videoWidth}x${v.videoHeight} durasi ${Math.round(v.duration)}s`),
            );
            v.addEventListener("error", () =>
              selesai("gagal", v.error ? `kode ${v.error.code}: ${v.error.message || "-"}` : "tanpa pesan"),
            );
            v.src = url;
            v.load();
            setTimeout(() => selesai("timeout", "tidak ada respons dalam 12 detik"), 12000);
          })
      )
    ),
  BENTUK,
);

for (const h of hasil) {
  console.log(`${h.nama.padEnd(24)} ${h.status.padEnd(8)} ${h.ket}`);
}
await browser.close();
