/**
 * Proxy video perlu membedakan dua kasus Drive: berkas kecil dibalas langsung
 * sebagai video, berkas besar dibalas halaman peringatan yang harus dibaca
 * token uuid-nya. Skrip ini menguji cara paling murah untuk membedakan keduanya.
 */
const IDS = process.argv.slice(2);
if (!IDS.length) {
  console.error("Usage: node scripts/cek-probe-drive.mjs <id> [<id> ...]");
  process.exit(1);
}

for (const id of IDS) {
  const url = `https://drive.google.com/uc?export=download&id=${id}`;

  const head = await fetch(url, { method: "HEAD" }).catch((e) => ({ error: String(e) }));
  console.log(`#${id.slice(0, 8)}`);
  console.log("  HEAD          :", head.status, head.headers?.get?.("content-type") ?? head.error);

  const nol = await fetch(url, { headers: { Range: "bytes=0-0" } }).catch((e) => ({ error: String(e) }));
  console.log("  Range 0-0     :", nol.status, nol.headers?.get?.("content-type"), "|", nol.headers?.get?.("content-range"));
  if (nol.body) await nol.body.cancel();

  const penuh = await fetch(url).catch((e) => ({ error: String(e) }));
  console.log("  GET penuh     :", penuh.status, penuh.headers?.get?.("content-type"), "|", penuh.headers?.get?.("content-length"));
  if (penuh.body) await penuh.body.cancel();
}
