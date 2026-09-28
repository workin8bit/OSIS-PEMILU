/**
 * Setelah uuid diambil dari halaman peringatan, unduhan sungguhan bisa
 * diperiksa: tipe konten, dukungan Range, dan apakah Chrome bisa
 * memutarnya (diformat .MOV yang merekam HP sering tidak didukung).
 */
const ID = process.argv[2];
if (!ID) {
  console.error("Usage: node scripts/cek-uuid-drive.mjs <file-id>");
  process.exit(1);
}

const interstitial = await fetch(`https://drive.google.com/uc?export=download&id=${ID}`);
const html = await interstitial.text();
const params = new URLSearchParams(
  [...html.matchAll(/<input[^>]*name="([^"]+)"[^>]*value="([^"]*)"/g)].map((m) => [m[1], m[2]]),
);
params.set("id", ID);
const nyata = `https://drive.usercontent.google.com/download?${params.toString()}`;
console.log("url nyata  :", nyata.replace(params.get("uuid") ?? "", "<uuid>"));

const res = await fetch(nyata, { headers: { Range: "bytes=0-1023" } });
const buf = new Uint8Array(await res.arrayBuffer());
console.log("status     :", res.status);
console.log("tipe       :", res.headers.get("content-type"));
console.log("panjang    :", res.headers.get("content-length"), "total", res.headers.get("content-range"));
console.log("accept-range:", res.headers.get("accept-ranges"));
console.log("disposisi  :", res.headers.get("content-disposition"));
console.log("atom ftyp  :", Buffer.from(buf.slice(4, 16)).toString("latin1").replace(/[^\x20-\x7e]/g, "."));
console.log("kodek      :", [...buf.slice(0, 64)].includes(0x76) ? "memuat codec info" : "-");
