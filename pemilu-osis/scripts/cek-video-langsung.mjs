/**
 * Dua pertanyaan menentukan Patio videoampaign Display optimum:
 * 1. Apakah berkas Drive yang kecil bisa diputar langsung dari Drive, tanpa
 *    lewat proxy server? Kalau bisa,videonya jauh lebih ringan.
 * 2. Kalau harus lewat proxy, seberapa besar biaya latency-nya?
 *
 *   node scripts/cek-video-langsung.mjs <id-kecil> <id-besar>
 */
import puppeteer from "puppeteer-core";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const [kecil, besar] = process.argv.slice(2);
if (!kecil || !besar) {
  console.error("Usage: node scripts/cek-video-langsung.mjs <id-kecil> <id-besar>");
  process.exit(1);
}

const BENTUK = (id) => [
  ["langsung uc", `https://drive.google.com/uc?export=download&id=${id}`],
  ["lewat proxy", `http://localhost:3000/api/media/drive?id=${id}`],
];

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: [
    "--no-sandbox",
    "--disable-dev-shm-usage",
    "--autoplay-policy=no-user-gesture-required",
    "--no-proxy-server",
  ],
});
const page = await browser.newPage();
await page.goto("http://localhost:3000/", { waitUntil: "domcontentloaded", timeout: 120000 });

for (const [label, id] of [
  ["kecil", kecil],
  ["besar", besar],
]) {
  const hasil = await page.evaluate(
    (daftar) =>
      Promise.all(
        daftar.map(
          ([nama, url]) =>
            new Promise((res) => {
              const mulai = performance.now();
              const v = document.createElement("video");
              v.muted = true;
              v.playsInline = true;
              const jawab = (status, ket) =>
                res({
                  nama,
                  status,
                  ket,
                  ms: Math.round(performance.now() - mulai),
                });
              v.addEventListener("loadeddata", async () => {
                try {
                  await v.play();
                } catch {
                  /* diabaikan: yang diukur adalah availability data */
                }
                setTimeout(() => jawab("bisa", `${v.videoWidth}x${v.videoHeight} ${Math.round(v.duration)}s main ${v.currentTime.toFixed(1)}s`), 2500);
              });
              v.addEventListener("error", () =>
                jawab("gagal", v.error ? `kode ${v.error.code} ${v.error.message || "-"}` : "tanpa pesan"),
              );
              v.src = url;
              v.load();
              setTimeout(() => jawab("timeout", "tidak merespons dalam 20 detik"), 20000);
            })
        )
      ),
    BENTUK(id),
  );
  console.log(`# ${label}`);
  for (const h of hasil) console.log(`   ${h.nama.padEnd(12)} ${h.status.padEnd(8)} ${String(h.ms).padStart(6)} ms  ${h.ket}`);
}

await browser.close();
