/**
 * Menerjemahkan tautan media yang ditempel panitia menjadi URL yang bisa
 * dimuat langsung oleh elemen <img> atau <video>.
 *
 * Masalah utamanya Google Drive: tautan berbagi seperti
 * https://drive.google.com/file/d/<ID>/view?usp=sharing mengembalikan
 * halaman HTML, bukan berkas gambar, sehingga <img> gagal dimuat. Bentuk
 * yang benar adalah /thumbnail?id=<ID> atau lh3.googleusercontent.com.
 *
 * Semua URL lain (Supabase Storage, upload lokal, hosting sekolah) dipakai
 * apa adanya.
 */

const DRIVE_FILE_ID = /drive\.google\.com\/file\/d\/([A-Za-z0-9_-]{10,})/;
const DRIVE_OPEN_ID = /drive\.google\.com\/open\?id=([A-Za-z0-9_-]{10,})/;
const DRIVE_QUERY_ID = /[?&]id=([A-Za-z0-9_-]{10,})/;
const LH3_FILE_ID = /lh3\.googleusercontent\.com\/d\/([A-Za-z0-9_-]{10,})/;

/** Lebar thumbnail Google Drive. 1000px cukup untuk kartu dan layar retina. */
const DRIVE_SIZE = "w1000";

/** Ambil ID berkas Google Drive dari berbagai bentuk tautan. */
export function driveFileId(url: string): string | null {
  const Direct = LH3_FILE_ID.exec(url);
  if (Direct) return Direct[1];
  const paksa = DRIVE_FILE_ID.exec(url) ?? DRIVE_OPEN_ID.exec(url) ?? DRIVE_QUERY_ID.exec(url);
  return paksa ? paksa[1] : null;
}

/** True bila tautan Drive bisa diubah menjadi URL gambar langsung. */
export function isGoogleDrive(url: string) {
  return /drive\.google\.com/.test(url) || /googleusercontent\.com/.test(url);
}

/**
 * Daftar URL untuk dicoba berurutan. Elemen media mencoba tiap daftar
 * sampai satu berhasil; bila semuanya gagal, pemanggil bisa menampilkan
 * placeholder.
 *
 * Urutannya penting: thumbnail lebih dulu karena paling sering berhasil
 * dan ukurannya sudah pas, baru lh3 sebagai cadangan, lalu URL asli
 * untuk kasus tautan Drive yang entah bagaimana sudah berupa gambar.
 */
export function mediaUrlCandidates(raw: string | null | undefined): string[] {
  const url = (raw ?? "").trim();
  if (!url) return [];

  if (isGoogleDrive(url)) {
    const id = driveFileId(url);
    if (id) {
      const kandidat = [
        `https://drive.google.com/thumbnail?id=${id}&sz=${DRIVE_SIZE}`,
        `https://lh3.googleusercontent.com/d/${id}=${DRIVE_SIZE}`,
        `https://lh3.googleusercontent.com/d/${id}=s0`,
      ];
      // URL asli tetap dicoba terakhir, dipakai kalau bentuk di atas gagal.
      if (!kandidat.includes(url)) kandidat.push(url);
      return kandidat;
    }
  }

  return [url];
}
