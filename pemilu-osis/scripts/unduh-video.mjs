/**
 * Unduh video kampanye dari Google Drive ke folder lokal.
 *
 * Drive tidak punya URL video langsung: halaman peringatan memuat token uuid
 * yang harus dipakai untuk mengunduh. Skrip ini mengikuti alur itu, jadi
 * tidak perlu membuka browser.
 *
 *   node scripts/unduh-video.mjs <file-id> <keluaran.mp4>
 */
import { writeFile } from "node:fs/promises";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

const [id, keluar] = process.argv.slice(2);
if (!id || !keluar) {
  console.error("Usage: node scripts/unduh-video.mjs <file-id> <keluaran.mp4>");
  process.exit(1);
}

const catat = (s) => console.log(`[${new Date().toISOString().slice(11, 19)}] ${s}`);

async function urlUnduhan(fileId) {
  const probe = await fetch(`https://drive.google.com/uc?export=download&id=${fileId}`, {
    method: "HEAD",
    headers: { "user-agent": "Mozilla/5.0" },
  });
  const tipe = (probe.headers.get("content-type") ?? "").toLowerCase();
  if (probe.ok && tipe.startsWith("video/")) {
    catat("Drive melayani berkas langsung");
    return `https://drive.google.com/uc?export=download&id=${fileId}`;
  }

  catat("Drive membalas halaman peringatan, ambil token uuid");
  const html = await (
    await fetch(`https://drive.google.com/uc?export=download&id=${fileId}`, {
      headers: { "user-agent": "Mozilla/5.0" },
    })
  ).text();
  const peta = new Map(
    [...html.matchAll(/<input[^>]*name="([^"]+)"[^>]*value="([^"]*)"/g)].map((m) => [m[1], m[2]]),
  );
  const uuid = peta.get("uuid");
  if (!uuid) throw new Error("token uuid tidak ditemukan di halaman Drive");
  const qs = new URLSearchParams({ id: fileId, export: "download", confirm: "t", uuid });
  return `https://drive.usercontent.google.com/download?${qs.toString()}`;
}

const url = await urlUnduhan(id);
catat(`mengunduh dari ${url.replace(/\?.*/, "?…")}`);

const res = await fetch(url, { headers: { "user-agent": "Mozilla/5.0" } });
if (!res.ok) throw new Error(`unduhan gagal: ${res.status}`);
const total = Number(res.headers.get("content-length") ?? 0);
catat(`tipe ${res.headers.get("content-type")} | ${(total / 1048576).toFixed(1)} MB`);

let diterima = 0;
let terakhir = 0;
const sumber = Readable.fromWeb(res.body);
sumber.on("data", (tiris) => {
  diterima += tiris.length;
  const sekarang = Date.now();
  if (sekarang - terakhir > 3000) {
    terakhir = sekarang;
    catat(`${(diterima / 1048576).toFixed(1)} MB${total ? ` / ${(total / 1048576).toFixed(1)} MB` : ""}`);
  }
});
await pipeline(sumber, (await import("node:fs")).createWriteStream(keluar));
catat(`selesai: ${keluar} (${(diterima / 1048576).toFixed(1)} MB)`);
