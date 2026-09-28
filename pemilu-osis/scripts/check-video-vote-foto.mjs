/**
 * Dua hal yang tidak bisa dicek dengan data asli sekarang:
 * 1. Video kampanye harus tampil di atas visi kalau paslon punya video_url.
 * 2. Foto bilik suara harus memakai vote_photo_url kalau ada, dan
 *    photo_url kalau kosong.
 *
 * Keduanya dicek dengan memalsukan respons daftar kandidat, lalu
 * membandingkan apa yang benar-benar dirender halaman.
 */
import puppeteer from "puppeteer-core";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const NIS = process.argv[2] || process.env.NIS_PILKETOS || "";
if (!NIS) {
  console.error("Butuh NISN uji: setel NIS_PILKETOS=<nisn> atau jalankan node check-video-vote-foto.mjs <nisn>.");
  process.exit(1);
}

// Foto pakai URL biasa, bukan tautan Drive palsu: yang diperiksa adalah
// URL mana yang dipakai elemen gambar, bukan apakah berkasnya termuat.
const FOTO_A = "https://contoh.sekolah.test/foto-profil-paslon.jpg";
const FOTO_B = "https://contoh.sekolah.test/foto-bilik-suara.jpg";

const buatPaslon = (nomor, nama, video, voteFoto) => ({
  id: `00000000-0000-4000-8000-00000000000${nomor}`,
  number: nomor,
  name: nama,
  class_name: "XI.1",
  wakil_name: "Wakil",
  wakil_class_name: "XI.2",
  photo_url: FOTO_A,
  vote_photo_url: voteFoto,
  video_url: video,
  slogan: "Slogan uji",
  vision: "Visi uji",
  mission: "1. Misi satu\n2. Misi dua",
  is_active: true,
});

const STATUS_BUKA = {
  school_name: "SMA Negeri 3 Rembang",
  election_name: "Pemilihan Ketua OSIS",
  academic_year: "2026/2027",
  start_at: null,
  end_at: null,
  is_open: true,
  show_results: true,
};

const PASLON = [
  buatPaslon(1, "Paslon dengan Video", "https://www.youtube.com/watch?v=aqz-KE-bpKQ", FOTO_B),
  buatPaslon(2, "Paslon Tanpa Video", null, null),
];

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--no-proxy-server"],
});

const pasangIntercept = (page) => {
  page.on("request", (req) => {
    if (req.url().includes("/rest/v1/candidates") && req.method() === "GET") {
      return req.respond({
        status: 200,
        contentType: "application/json",
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify(PASLON),
      });
    }
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
  page.setRequestInterception(true);
};

// 1. Halaman paslon: video di atas visi, dan foto profil tetap foto profil.
let page = await browser.newPage();
await page.setViewport({ width: 1280, height: 950 });
pasangIntercept(page);
await page.goto("http://localhost:3000/candidates", { waitUntil: "networkidle2", timeout: 120000 });
// Tunggu kartu paslon benar-benar muncul; daftar kandidat diambil dari
// server jadi baru ada setelah network idle.
await page.waitForSelector('section[aria-labelledby="video-paslon"]', { timeout: 30000 });
await new Promise((r) => setTimeout(r, 1500));

const denganVideo = await page.evaluate(() => {
  const judul = [...document.querySelectorAll("h3")].map((h) => h.textContent?.trim());
  const posisi = (t) => judul.findIndex((x) => x === t);
  const section = document.querySelector('section[aria-labelledby="video-paslon"]');
  return {
    judul,
    videoDiAtasVisi: posisi("Video Kampanye") > -1 && posisi("Video Kampanye") < posisi("Visi Strategis"),
    adaIframe: Boolean(section?.querySelector("iframe")),
    adaPlaceholder: Boolean(section?.querySelector("svg")),
  };
});
console.log("PASLON + VIDEO :", JSON.stringify({ ...denganVideo, judul: denganVideo.judul.slice(0, 4) }));

// Ganti ke paslon kedua yang tidak punya video.
await page.evaluate(() => {
  const t = [...document.querySelectorAll("button")].find((b) => b.textContent?.includes("Tanpa Video"));
  t?.click();
});
await new Promise((r) => setTimeout(r, 1500));
const tanpaVideo = await page.evaluate(() => {
  const section = document.querySelector('section[aria-labelledby="video-paslon"]');
  return {
    adaIframe: Boolean(section?.querySelector("iframe")),
    teksPlaceholder: section?.textContent?.includes("Video belum diunggah") ?? false,
  };
});
console.log("PASLON TANPA VIDEO:", JSON.stringify(tanpaVideo));
await page.close();

// 2. Bilik suara: foto kartu harus vote_photo_url untuk paslon 1 dan
//    photo_url untuk paslon 2 yang vote_photonya kosong.
page = await browser.newPage();
await page.setViewport({ width: 1280, height: 950 });
pasangIntercept(page);
// URL foto yang benar-benar diminta browser adalah bukti mana yang dipakai;
// setelah semuanya gagal, <img> diganti placeholder tanpa atribut src.
const diminta = [];
page.on("request", (r) => {
  if (r.url().includes("contoh.sekolah.test")) diminta.push(r.url());
});
let masuk = false;
for (let a = 0; a < 3 && !masuk; a++) {
  await page.goto("http://localhost:3000/login", { waitUntil: "networkidle2", timeout: 120000 });
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
  await page.waitForSelector('[role="radio"]', { timeout: 30000 });
  await new Promise((r) => setTimeout(r, 2500));
  const foto = await page.evaluate(() => {
    const dalamKartu = [...document.querySelectorAll('[role="radio"] img')].map((i) => i.currentSrc || i.src);
    const kartu = document.querySelector('[role="radio"]');
    return {
      dalamKartu,
      semuaGambar: [...document.querySelectorAll("img")].map((i) => (i.currentSrc || i.src).slice(0, 80)),
      radio: document.querySelectorAll('[role="radio"]').length,
      adaMain: Boolean(document.querySelector("main")),
      htmlKartu: (kartu?.outerHTML || "").slice(0, 400),
    };
  });
  const fotoKartu = foto.dalamKartu.length ? foto.dalamKartu : foto.semuaGambar;
  const khusus = fotoKartu.filter((u) => u.includes("foto-bilik-suara")).length;
  const profil = fotoKartu.filter((u) => u.includes("foto-profil-paslon")).length;
  console.log("BILIK SUARA        :", JSON.stringify({ radio: foto.radio, jumlahKartu: fotoKartu.length, adaMain: foto.adaMain }));
  console.log("FOTO BILIK SUARA  :", JSON.stringify(diminta));
  console.log("  foto khusus:", diminta.filter((u) => u.includes("foto-bilik-suara")).length, "| foto profil:", diminta.filter((u) => u.includes("foto-profil-paslon")).length, "(harus 1 dan 1)");
  console.log("HTML KARTU        :", foto.htmlKartu.replace(/\s+/g, " ").slice(0, 220));
} else {
  console.log("BILIK SUARA: login gagal");
}
await page.close();

await browser.close();
