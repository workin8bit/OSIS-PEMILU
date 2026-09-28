/**
 * Proxy video Google Drive.
 *
 * Tautan berbagi Drive (`/file/d/<ID>/view`) tidak bisa diputar langsung.
 * Drive membalas dua bentuk berbeda:
 *   - berkas kecil: `uc?export=download` langsung mengembalikan video;
 *   - berkas besar: halaman HTML "Virus scan warning" yang di dalamnya ada
 *     parameter `uuid`, dan baru `drive.usercontent.google.com/download`
 *     dengan uuid itu yang benar-benar mengembalikan video.
 *
 *HEAD dipakai untuk membedakan keduanya supaya berkas besar tidak ikut
 * terunduh utuh hanya untuk membaca halaman peringatannya. Range diteruskan
 * supaya video bisa di-seek dan tidak perlu diunduh seluruhnya.
 *
 * Kalau Drive membalas HTML (berkas bukan video, atau sudah dihapus), route
 * mengembalikan 502 supaya pemanggil bisa mencoba kandidat berikutnya.
 */
import { NextResponse } from "next/server";

const POLA_ID = /^[A-Za-z0-9_-]{10,64}$/;
const TTL_URL_MS = 10 * 60 * 1000;
const TTL_GAGAL_MS = 60 * 1000;
const UA = "Mozilla/5.0 (compatible; pemilu-osis/1.0)";

type Cache = { url: string; sampai: number };
const cache = new Map<string, Cache>();

const uc = (fileId: string) => `https://drive.google.com/uc?export=download&id=${fileId}`;

function ambilUuid(html: string, fileId: string) {
  const peta = new Map(
    [...html.matchAll(/<input[^>]*name="([^"]+)"[^>]*value="([^"]*)"/g)].map((m) => [m[1], m[2]]),
  );
  const uuid = peta.get("uuid");
  if (!uuid) return null;
  const qs = new URLSearchParams({ id: fileId, export: "download", confirm: "t", uuid });
  return `https://drive.usercontent.google.com/download?${qs.toString()}`;
}

/**
 * URL yang benar-benar mengembalikan byte video untuk sebuah id.
 * Hasilnya disimpan singkat karena uuid Drive cepat kedaluwarsa.
 */
async function urlVideo(fileId: string): Promise<string | null> {
  const tersimpan = cache.get(fileId);
  if (tersimpan) {
    if (tersimpan.sampai > Date.now()) return tersimpan.url || null;
    cache.delete(fileId);
  }

  const simpan = (url: string, ttl: number) => {
    cache.set(fileId, { url, sampai: Date.now() + ttl });
    return url || null;
  };

  try {
    // Berkas kecil dilayani langsung, berkas besar lewat halaman peringatan.
    // HEAD cukup untuk membedakannya tanpa mengunduh berkas.
    const probe = await fetch(uc(fileId), { method: "HEAD", headers: { "user-agent": UA } });
    if (probe.ok && (probe.headers.get("content-type") ?? "").toLowerCase().startsWith("video/")) {
      return simpan(uc(fileId), TTL_URL_MS);
    }

    const halaman = await fetch(uc(fileId), { headers: { "user-agent": UA }, cache: "no-store" });
    const tipeHalaman = (halaman.headers.get("content-type") ?? "").toLowerCase();
    if (tipeHalaman.startsWith("video/")) {
      // Jarang: Drive mengirim video tanpa halaman peringatan.
      await halaman.body?.cancel();
      return simpan(uc(fileId), TTL_URL_MS);
    }

    const denganUuid = ambilUuid(await halaman.text(), fileId);
    if (denganUuid) {
      const cek = await fetch(denganUuid, { method: "HEAD", headers: { "user-agent": UA } });
      if (cek.ok && (cek.headers.get("content-type") ?? "").toLowerCase().startsWith("video/")) {
        return simpan(denganUuid, TTL_URL_MS);
      }
    }
    return simpan("", TTL_GAGAL_MS);
  } catch {
    return simpan("", TTL_GAGAL_MS);
  }
}

async function headersBalik(asal: Headers) {
  const hulu = new Headers();
  const tipe = asal.get("content-type") ?? "video/mp4";
  hulu.set("content-type", tipe);
  hulu.set("accept-ranges", asal.get("accept-ranges") ?? "bytes");
  hulu.set("cache-control", "public, max-age=3600");
  // Unggahan Drive memakai "attachment"; untuk elemen media tidak perlu.
  hulu.set("content-disposition", "inline");
  for (const nama of ["content-length", "content-range"]) {
    const nilai = asal.get(nama);
    if (nilai) hulu.set(nama, nilai);
  }
  return hulu;
}

export async function GET(req: Request) {
  const fileId = new URL(req.url).searchParams.get("id") ?? "";
  if (!POLA_ID.test(fileId)) {
    return NextResponse.json({ error: "id berkas tidak valid" }, { status: 400 });
  }

  const target = await urlVideo(fileId);
  if (!target) {
    return NextResponse.json(
      { error: "berkas tidak bisa diputar: Drive tidak memberi akses video" },
      { status: 404 },
    );
  }

  const range = req.headers.get("range");
  const hulu: Record<string, string> = { "user-agent": UA };
  if (range) hulu.Range = range;

  const upstream = await fetch(target, { headers: hulu, cache: "no-store" });
  const tipe = (upstream.headers.get("content-type") ?? "").toLowerCase();
  if (!upstream.ok || !tipe.startsWith("video/")) {
    return NextResponse.json(
      { error: `Drive membalas ${tipe || upstream.status}, bukan video` },
      { status: 502 },
    );
  }

  return new Response(upstream.body, {
    status: upstream.status,
    headers: await headersBalik(upstream.headers),
  });
}
