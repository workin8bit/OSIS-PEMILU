"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/backend";
import type { Candidate } from "@/lib/types";
import { CandidateMedia, MissionList } from "@/components/CandidateMedia";

export default function CandidatesPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  // Status pemuatan dipisah dari daftar kandidat supaya kegagalan jaringan
  // tidak disamarkan sebagai "belum ada kandidat".
  const [status, setStatus] = useState<"memuat" | "siap" | "gagal">("memuat");
  const [percobaan, setPercobaan] = useState(0);

  useEffect(() => {
    let batal = false;
    setStatus("memuat");
    api
      .listCandidates()
      .then((cs) => {
        if (batal) return;
        const list = cs.filter((c) => c.is_active);
        setCandidates(list);
        setStatus("siap");
        // Deep-link dari beranda: /candidates?paslon=<id>
        const wanted = new URLSearchParams(window.location.search).get("paslon");
        const match = list.find((c) => c.id === wanted);
        if (match) setActiveTab(match.id);
        else if (list.length > 0) setActiveTab(list[0].id);
      })
      .catch(() => {
        if (!batal) setStatus("gagal");
      });
    return () => {
      batal = true;
    };
  }, [percobaan]);

  // Jaga URL tetap sinkron dengan tab aktif supaya tautan bisa dibagikan.
  const selectTab = (id: string) => {
    setActiveTab(id);
    const url = new URL(window.location.href);
    url.searchParams.set("paslon", id);
    window.history.replaceState(null, "", url);
  };

  const active = candidates.find((c) => c.id === activeTab) ?? candidates[0];
  // Foto sudah tampil di kartu identitas, jadi blok media besar di bawah
  // hanya perlu ada kalau paslon punya video. Tanpa syarat ini, paslon
  // tanpa video akan menampilkan fotonya dua kali di satu kartu.
  const hasVideo = Boolean(active?.video_url);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="flex flex-col justify-between gap-4 border-b border-neutral-200/80 pb-6 sm:flex-row sm:items-end">
        <div>
          <div className="text-xs font-medium tracking-normal text-neutral-500">
            Daftar Calon Ketua & Wakil OSIS
          </div>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-neutral-950 sm:text-4xl">
            Profil &amp; Visi Misi Paslon
          </h1>
        </div>
        <Link
          href="/vote"
          className="press inline-flex items-center justify-center rounded-full bg-brand px-5 py-2.5 text-sm font-semibold tracking-normal text-brand-ink shadow-brand transition-all hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-dark"
        >
          Masuk Bilik Suara &rarr;
        </Link>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {candidates.map((c) => {
          const isCurrent = (activeTab || candidates[0]?.id) === c.id;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => selectTab(c.id)}
              aria-pressed={isCurrent}
              className={`press flex items-center gap-3 rounded-full border px-4 py-2.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-dark ${
                isCurrent
                  ? "border-brand-dark bg-brand text-brand-ink shadow-brand"
                  : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-400"
              }`}
            >
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-md font-mono text-xs font-bold ${
                  isCurrent ? "bg-brand-ink text-brand" : "bg-neutral-100 text-neutral-700"
                }`}
              >
                {c.number}
              </span>
              <span className="text-xs font-semibold">{c.name}</span>
            </button>
          );
        })}
      </div>

      {active && (
        <article className="surface fade-up mt-6 overflow-hidden shadow-xs">
          {/* Identitas paslon memakai layout yang sama persis dengan kartu
              di beranda, hanya saja kolom kiri memakai foto paslon, bukan
              badge nomor urut. */}
          <div className="border-b border-neutral-100 p-6 sm:p-8">
            <div className="flex items-start gap-4 sm:gap-5">
              <div className="w-20 shrink-0 sm:w-24">
                <CandidateMedia candidate={active} compact photoOnly />
              </div>

              <div className="min-w-0 flex-1">
                <div className="grid grid-cols-[1fr_auto] items-start gap-x-3 gap-y-2">
                  <h2 className="min-w-0 text-xl font-bold tracking-tight text-neutral-950 sm:text-2xl">
                    {active.name}
                  </h2>
                  <span className="rounded-md border border-neutral-200 bg-neutral-50 px-2.5 py-1 font-mono text-[13px] font-medium text-neutral-600">
                    {active.class_name}
                  </span>

                  {active.wakil_name && (
                    <>
                      <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 text-[15px] leading-snug sm:text-base">
                        <span className="text-sm font-semibold text-neutral-500">
                          Wakil:
                        </span>
                        <span className="min-w-0 font-semibold text-neutral-800">
                          {active.wakil_name}
                        </span>
                      </div>
                      {active.wakil_class_name && (
                        <span className="rounded-md border border-neutral-200 bg-neutral-50 px-2.5 py-1 font-mono text-[13px] text-neutral-500">
                          {active.wakil_class_name}
                        </span>
                      )}
                    </>
                  )}
                </div>

                {active.slogan && (
                  <p className="mt-1 text-xs italic text-neutral-600 sm:text-sm">
                    <span className="font-medium">
                      &ldquo;{active.slogan}&rdquo;
                    </span>
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-8">
            {/* Video kampanye berada di atas visi supaya yang pertama dibaca
                pengunjung adalah wajah dan gaya kampanyenya. Kalau belum ada
                video, kotak kosong tetap ditampilkan supaya panitia tahu
                tempatnya, bukan hilangnya fitur diam-diam. */}
            <section aria-labelledby="video-paslon" className="overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-50/60">
              <h3
                id="video-paslon"
                className="px-5 pt-5 text-[12px] font-bold tracking-[0.08em] text-neutral-900 uppercase sm:px-6 sm:pt-6"
              >
                Video Kampanye
              </h3>
              <div className="p-5 sm:p-6">
                {hasVideo ? (
                  // Kalau video gagal dimuat, cadangan terakhirnya foto profil
                  // paslon - bukan foto khusus bilik suara.
                  <CandidateMedia candidate={active} />
                ) : (
                  <div className="flex aspect-video w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-neutral-300 bg-white text-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-7 w-7 text-neutral-400"
                      aria-hidden="true"
                    >
                      <rect x="2.5" y="5.5" width="14" height="13" rx="2" />
                      <path d="m16.5 10.5 5-3v9l-5-3z" />
                    </svg>
                    <p className="text-sm font-medium text-neutral-700">
                      Video belum diunggah
                    </p>
                    <p className="max-w-xs text-xs leading-relaxed text-neutral-500">
                      Tempelkan tautan YouTube, Vimeo, atau berkas video lewat
                      panel panitia.
                    </p>
                  </div>
                )}
              </div>
            </section>

            {/* Visi dan misi dalam satu container dengan dua baris terpisah.
                Penomoran "01 / 02" dihapus karena tidak menambah informasi. */}
            <div className="mt-6 overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-50/60">
              <div className="p-5 sm:p-6">
                <h3 className="text-[12px] font-bold tracking-[0.08em] text-neutral-900 uppercase">
                  Visi Strategis
                </h3>
                <p className="mt-2.5 text-[15px] leading-relaxed whitespace-pre-line text-neutral-700 text-left sm:text-justify">
                  {active.vision || "Belum ada visi tercantum."}
                </p>
              </div>

              <div className="border-t border-neutral-200 p-5 sm:p-6">
                <h3 className="text-[12px] font-bold tracking-[0.08em] text-neutral-900 uppercase">
                  Program &amp; Misi
                </h3>
                {active.mission ? (
                  <MissionList
                    text={active.mission}
                    className="mt-2.5 text-[15px] leading-relaxed text-left sm:text-justify"
                  />
                ) : (
                  <p className="mt-2.5 text-[15px] leading-relaxed text-neutral-700 text-left sm:text-justify">
                    Belum ada rincian misi tercantum.
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center justify-between gap-4 border-t border-neutral-100 px-6 py-5 sm:flex-row sm:px-8">
            <span className="text-xs text-neutral-500">
              Yakin dengan kandidat ini? Gunakan hak suaramu di bilik suara
              digital.
            </span>
            <Link
              href="/vote"
              className="press w-full rounded-full bg-brand px-6 py-3 text-center text-sm font-semibold tracking-normal text-brand-ink shadow-brand transition-all hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-dark sm:w-auto"
            >
              Coblos Nomor {active.number} Sekarang
            </Link>
          </div>
        </article>
      )}

      {status === "memuat" && (
        <div className="mt-8 rounded-2xl border border-neutral-200 bg-white p-12 text-center">
          <p className="text-base font-semibold text-neutral-800">Memuat data paslon…</p>
          <p className="mx-auto mt-1 max-w-sm text-sm leading-relaxed text-neutral-600">
            Sebentar, data pasangan calon sedang diambil dari server.
          </p>
        </div>
      )}

      {status === "gagal" && (
        <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-12 text-center">
          <p className="text-base font-semibold text-red-900">Data paslon gagal dimuat</p>
          <p className="mx-auto mt-1 max-w-sm text-sm leading-relaxed text-red-800">
            Koneksi ke server terputus. Coba muat ulang data; daftar paslon tidak
            dikosongkan karena jaringan bermasalah.
          </p>
          <button
            type="button"
            onClick={() => setPercobaan((n) => n + 1)}
            className="mt-4 inline-flex h-10 items-center justify-center rounded-full bg-neutral-900 px-5 text-sm font-semibold text-white transition hover:bg-neutral-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900"
          >
            Coba lagi
          </button>
        </div>
      )}

      {status === "siap" && candidates.length === 0 && (
        <div className="mt-8 rounded-2xl border border-dashed border-neutral-300 bg-white p-12 text-center">
          <p className="text-base font-semibold text-neutral-800">
            Belum ada kandidat aktif
          </p>
          <p className="mx-auto mt-1 max-w-sm text-sm leading-relaxed text-neutral-600">
            Halaman ini akan terisi begitu panitia menambahkan pasangan calon.
          </p>
        </div>
      )}
    </div>
  );
}
