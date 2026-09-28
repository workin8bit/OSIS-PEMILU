/**
 * Google Drive membalas permintaan berkas video dengan halaman
 * "Virus scan warning", bukan berkas video. Skrip ini membaca halaman itu
 * untuk mencari nama berkas dan tautan unduh yang sebenarnya, supaya tahu
 * apakah berkas memang video dan bagaimana cara memainkannya.
 */
const ID = process.argv[2];
if (!ID) {
  console.error("Usage: node scripts/cek-interstitial-drive.mjs <file-id>");
  process.exit(1);
}

const res = await fetch(`https://drive.google.com/uc?export=download&id=${ID}`);
const html = await res.text();

const form = html.match(/<form[\s\S]*?<\/form>/g) ?? [];
console.log("judul   :", (html.match(/<title>([^<]*)<\/title>/)?.[1] ?? "-").trim());
console.log("form    :", form.length);
for (const f of form) {
  const inputs = [...f.matchAll(/name="([^"]+)"[^>]*value="([^"]*)"/g)].map((m) => `${m[1]}=${m[2]}`);
  const action = f.match(/action="([^"]+)"/)?.[1] ?? "-";
  console.log("  action:", action);
  console.log("  input :", inputs.join(" "));
}

const tautan = [...html.matchAll(/href="([^"]+)"/g)]
  .map((m) => m[1])
  .filter((h) => /usercontent|confirm|download/.test(h));
console.log("tautan  :", JSON.stringify([...new Set(tautan)]));

const nama = [...html.matchAll(/>([^<>]{2,80}\.(?:mp4|mov|avi|webm|mkv|m4v|3gp|jpg|jpeg|png|webp|pdf|zip))/gi)].map((m) => m[1]);
console.log("berkas  :", JSON.stringify([...new Set(nama)]));
