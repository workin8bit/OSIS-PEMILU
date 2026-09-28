"use client";

import { useEffect, useState } from "react";
import type { Candidate } from "@/lib/types";
import { formatInline } from "@/lib/richText";
import { mediaUrlCandidates } from "@/lib/mediaUrl";

export { formatInline };

export function isDirectMedia(url: string) {
  return /\.(mp4|webm|ogg|mov|gif)$/i.test(url);
}

export function isYouTube(url: string) {
  return /youtube\.com|youtu\.be/i.test(url);
}

export function isVimeo(url: string) {
  return /vimeo\.com/i.test(url);
}

/**
 * Misi kandidat: mendukung bullet (-/*), penomoran (1. / 1)), dan markdown
 * tebal/miring di dalam sel.
 */
export function MissionList({
  text,
  compact = false,
  className,
}: {
  text: string;
  compact?: boolean;
  /**
   * Menggantikan ukuran teks bawaan, bukan menambahinya. Dipakai halaman
   * Paslon yang butuh ukuran lebih besar dari daftar ringkas di beranda.
   */
  className?: string;
}) {
  if (!text) return null;
  const lines = text.split(/\r?\n/);
  const body =
    className ??
    (compact ? "mt-1 text-[13px] sm:text-[14px] sm:text-justify" : "mt-3 text-sm");

  return (
    <ul className={`space-y-2 leading-relaxed text-neutral-700 ${body}`}>
      {lines.map((line, i) => {
        const trimmed = line.trim();
        if (!trimmed) return null;

        const bulletMatch = trimmed.match(/^[-*]\s+(.*)$/);
        if (bulletMatch) {
          return (
            <li key={i} className="flex gap-2">
              <span
                className={`${compact ? "mt-1.5" : "mt-2"} h-1.5 w-1.5 shrink-0 rounded-full bg-brand-dark`}
              />
              <span
                className="min-w-0 break-words"
                dangerouslySetInnerHTML={{ __html: formatInline(bulletMatch[1]) }}
              />
            </li>
          );
        }

        const numMatch = trimmed.match(/^(\d+)[.)]\s+(.*)$/);
        if (numMatch) {
          return (
            <li key={i} className="flex gap-2">
              <span className="shrink-0 font-mono font-bold text-brand-deep">
                {numMatch[1]}.
              </span>
              <span
                className="min-w-0 break-words"
                dangerouslySetInnerHTML={{ __html: formatInline(numMatch[2]) }}
              />
            </li>
          );
        }

        return (
          <li key={i} className="pl-2">
            <span
              className="min-w-0 break-words"
              dangerouslySetInnerHTML={{ __html: formatInline(trimmed) }}
            />
          </li>
        );
      })}
    </ul>
  );
}

export function CandidateMedia({
  candidate,
  compact = false,
  photoOnly = false,
  photoUrl,
}: {
  candidate: Candidate;
  compact?: boolean;
  /**
   * Ganti sumber foto tanpa mengubah data kandidat. Dipakai bilik suara
   * yang boleh memakai foto khusus (vote_photo_url).
   */
  photoUrl?: string | null;
  /**
   * Abaikan video dan pakai foto saja. Dipakai di beranda supaya kartu
   * ringkas tidak memuat iframe; video tetap bisa dilihat di halaman
   * Paslon yang memanggil tanpa properti ini.
   */
  photoOnly?: boolean;
}) {
  // Tautan Google Drive tidak bisa dipakai apa adanya, jadi foto diubah
  // menjadi beberapa URL yang dicoba berurutan. Video memakai URL aslinya,
  // lalu foto menjadi cadangan terakhir kalau video gagal dimuat.
  const sumberFoto = photoUrl !== undefined ? photoUrl : candidate.photo_url;
  const foto = mediaUrlCandidates(sumberFoto);
  const video =
    !photoOnly && candidate.video_url ? [candidate.video_url.trim()] : [];
  const sumber = [...video, ...foto];

  const [index, setIndex] = useState(0);
  const urlMedia = candidate.video_url || sumberFoto || "";

  // Kandidat bisa berganti lewat tab, jadi urutan dicoba dimulai ulang.
  useEffect(() => {
    setIndex(0);
  }, [urlMedia]);

  const gagal = index >= sumber.length;
  const url = gagal ? "" : sumber[index];

  if (!gagal && !photoOnly && isYouTube(url) ) {
    return (
      <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-950">
        <div className="relative aspect-video">
          <iframe
            src={url}
            className="h-full w-full"
            allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title={candidate.name}
          />
        </div>
      </div>
    );
  }

  if (!gagal && !photoOnly && isVimeo(url)) {
    return (
      <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-950">
        <div className="relative aspect-video">
          <iframe
            src={url}
            className="h-full w-full"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
            title={candidate.name}
          />
        </div>
      </div>
    );
  }

  if (!gagal && !photoOnly && video.length > 0 && url === video[0] && isDirectMedia(url)) {
    return (
      <div
        className="overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-950"
        style={{ aspectRatio: "16/9" }}
      >
        <video
          src={url}
          className="h-full w-full object-cover"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          onError={() => setIndex((i) => i + 1)}
        />
      </div>
    );
  }

  if (!url) {
    // Pada mode compact media jadi thumbnail di samping teks, jadi
    // placeholder harus berukuran sama - bukan blok aspect-video.
    if (compact) {
      return (
        <div className="flex aspect-[3/4] w-full items-center justify-center overflow-hidden rounded-xl border border-dashed border-neutral-300 bg-neutral-50">
          {photoOnly ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-7 w-7 text-neutral-400"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-7 w-7 text-neutral-400"
            >
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          )}
        </div>
      );
    }
    return (
      <div className="flex aspect-video items-center justify-center rounded-2xl border border-dashed border-neutral-300 bg-neutral-50">
        <div className="text-center">
          {photoOnly ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mx-auto h-10 w-10 text-neutral-500"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mx-auto h-10 w-10 text-neutral-500"
            >
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          )}
          <span className="font-medium mt-2 block text-[11px] tracking-normal text-neutral-500">
            {photoOnly ? "Foto Paslon" : "Media Kampanye"}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-200">
      {/* onError dipakai untuk mencoba URL berikutnya, bukan untuk
          interaksi pengguna, jadi aturan elemen non-interaktif tidak
          berlaku di sini. */}
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
      <img
        src={url}
        alt={candidate.name}
        loading="lazy"
        decoding="async"
        onError={() => setIndex((i) => i + 1)}
        className={`w-full object-cover ${compact ? "aspect-[3/4]" : "h-64 sm:h-80"}`}
      />
    </div>
  );
}
