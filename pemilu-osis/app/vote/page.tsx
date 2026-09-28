"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/backend";
import type { Candidate, Status, VoterSession } from "@/lib/types";
import { CandidateMedia } from "@/components/CandidateMedia";

const SESSION_KEY = "osis_session";

export default function VotePage() {
  const router = useRouter();
  const [session, setSession] = useState<VoterSession | null>(null);
  const [status, setStatus] = useState<Status | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [votedNow, setVotedNow] = useState(false);
  const [ready, setReady] = useState(false);
  const confirmRef = useRef<HTMLDivElement>(null);

  // Move focus into the dialog and keep Tab inside it while it is open.
  useEffect(() => {
    if (!confirmOpen) return;
    confirmRef.current?.focus();
    const node = confirmRef.current;
    if (!node) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !submitting) {
        setConfirmOpen(false);
        return;
      }
      if (e.key !== "Tab") return;
      const focusables = node.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], input, [tabindex]:not([tabindex="-1"])'
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [confirmOpen, submitting]);

  useEffect(() => {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) {
      router.replace("/login");
      return;
    }
    const s: VoterSession = JSON.parse(raw);
    setSession(s);
    api.getStatus().then(setStatus).catch(() => {});
    api
      .listCandidates()
      .then((cs) => setCandidates(cs.filter((c) => c.is_active)))
      .catch(() => {});

    const pw = sessionStorage.getItem("osis_pw");
    if (pw) {
      api
        .checkVoter(s.NISN, pw)
        .then((info) => {
          if (info) {
            const next = { ...s, has_voted: info.has_voted, role: info.role ?? s.role };
            setSession(next);
            localStorage.setItem(SESSION_KEY, JSON.stringify(next));
          }
        })
        .catch(() => {});
    }
    setReady(true);
  }, [router]);

  // Redirect setelah memilih: harus didaftarkan sebelum return awal,
  // jika tidak hook hanya berjalan setelah render pertama selesai.
  useEffect(() => {
    if (votedNow) {
      const t = setTimeout(() => router.replace("/"), 5000);
      return () => clearTimeout(t);
    }
  }, [votedNow, router]);

  if (!ready) return null;
  if (!session) return null;

  const voted = votedNow || session.has_voted;
  const notOpen = status ? !status.is_open : false;
  const chosen = candidates.find((c) => c.id === selected) ?? null;
  // Guru memakai NIP, siswa memakai NISN. Field yang menyimpan identitas
  // sama, hanya labelnya yang berbeda.
  const labelId = session.role === "guru" ? "NIP" : "NISN";

  const submit = async () => {
    if (!selected) return;
    const pw = sessionStorage.getItem("osis_pw");
    if (!pw) {
      setError("Sesi telah habis. Silakan login kembali untuk validasi suara.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const res = await api.castVote(session.NISN, pw, selected);
      if (res === "ok") {
        const next = { ...session, has_voted: true };
        setSession(next);
        localStorage.setItem(SESSION_KEY, JSON.stringify(next));
        sessionStorage.removeItem("osis_pw");
        setVotedNow(true);
        setConfirmOpen(false);
      } else {
        setError(res.replace(/^error:/, ""));
        setConfirmOpen(false);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal mengirimkan suara.");
      setConfirmOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  // SUDAH MEMILIH
  if (voted) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-4 py-12">
        <div className="surface fade-up w-full max-w-md p-8 text-center shadow-xs">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-10 w-10 text-emerald-600"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h1 className="mt-5 text-3xl font-black tracking-tight text-neutral-950">
            Terima Kasih!
          </h1>
          <p className="mt-3 text-sm font-bold text-neutral-800">
            Hak Suara Berhasil Disalurkan
          </p>
          <p className="mt-3 text-xs leading-relaxed text-neutral-600">
            Terima kasih, <span className="font-bold text-neutral-900">{session.name}</span> ({session.class_name}). Suaramu telah tercatat dalam tabulasi terenkripsi dan tidak dapat diubah kembali.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row justify-center gap-2">
            <Link
              href="/results"
              className="rounded-full bg-brand px-5 py-3 text-sm font-semibold tracking-normal text-brand-ink shadow-brand hover:bg-brand-hover"
            >
              Lihat Quick Count
            </Link>
            <Link
              href="/"
              className="rounded-xl border border-neutral-300 px-5 py-3 text-xs font-semibold tracking-normal text-neutral-700 hover:border-neutral-900"
            >
              Beranda
            </Link>
          </div>
          <p className="mt-4 text-[11px] text-neutral-500">
            Kamu akan dialihkan otomatis ke beranda dalam 5 detik...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      {/* Voter Profile Bar */}
      <div className="surface flex flex-wrap items-center justify-between gap-4 p-5 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-950 font-mono text-sm font-bold text-white">
            {session.name.slice(0, 1).toUpperCase()}
          </div>
          <div>
            <div className="font-bold text-neutral-900 text-sm">{session.name}</div>
            <div className="font-mono text-xs text-neutral-500">
              {session.class_name} · {labelId} {session.NISN}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-medium text-[11px] tracking-normal rounded-md border border-brand/40 bg-brand-wash px-2.5 py-1 text-brand-deep">
            1 Hak Suara Aktif
          </span>
          <button
            onClick={() => {
              localStorage.removeItem(SESSION_KEY);
              sessionStorage.removeItem("osis_pw");
              router.push("/login");
            }}
            className="font-mono text-[11px] text-neutral-500 hover:text-neutral-900 underline"
          >
            Keluar Sesi
          </button>
        </div>
      </div>

      {notOpen && (
        <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4 font-mono text-xs text-amber-900">
          * Bilik suara sedang dinonaktifkan oleh panitia pemilihan.
        </div>
      )}

      {/* Instructions */}
      <div className="mt-8 border-b border-brand/30 pb-4">
        <span className="font-medium text-xs tracking-normal text-brand-deep">
          Surat Suara Digital
        </span>
        <h1 className="mt-1 text-2xl sm:text-3xl font-black tracking-tight text-neutral-950">
          Tentukan Pasangan Calon Pilihanmu
        </h1>
        <p className="mt-1 text-xs text-neutral-500">
          Pilih salah satu nomor urut di bawah, lalu klik konfirmasi untuk mengunci suara.
        </p>
      </div>

      {/* Ballot Cards Grid */}
      <div
        role="radiogroup"
        aria-label="Daftar pasangan calon"
        className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        {candidates.map((c) => {
          const isSel = selected === c.id;
          return (
            <div
              key={c.id}
              role="radio"
              aria-checked={isSel}
              aria-label={`Paslon nomor ${c.number}`}
              aria-disabled={notOpen || undefined}
              tabIndex={notOpen ? -1 : 0}
              onClick={() => !notOpen && setSelected(c.id)}
              onKeyDown={(e) => {
                if (notOpen) return;
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setSelected(c.id);
                }
              }}
              className={`press group cursor-pointer rounded-2xl border p-4 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-dark sm:p-5 ${
                isSel
                  ? "border-brand-dark bg-brand-wash ring-2 ring-brand shadow-brand"
                  : "border-brand/25 bg-white hover:border-brand hover:bg-brand-wash/50"
              } ${notOpen ? "pointer-events-none opacity-60" : ""}`}
            >
              {/* Foto paslon sebagai elemen visual kartu. Nomor urut tetap
                  tampil sebagai chip kecil di sudut foto supaya mudah dipindai,
                  dan tampil lagi di kaki kartu. Foto khusus bilik suara
                  dipakai kalau panitia mengisinya; kalau kosong, turun ke foto
                  profil supaya kartu tidak pernah kosong tanpa alasan. */}
              <div className="relative overflow-hidden rounded-xl border border-neutral-200 bg-neutral-50">
                <CandidateMedia
                  candidate={c}
                  compact
                  photoOnly
                  photoUrl={c.vote_photo_url || c.photo_url}
                />

                <span className="absolute left-2 top-2 rounded-md bg-neutral-950/85 px-2 py-0.5 font-mono text-[11px] font-black text-white">
                  {String(c.number).padStart(2, "0")}
                </span>

                <span
                  aria-hidden
                  className={`absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-md border transition-all ${
                    isSel
                      ? "border-brand bg-brand text-brand-ink"
                      : "border-brand/40 bg-white/85 text-transparent"
                  }`}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-3 w-3"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
              </div>

              {/* Kartu sengaja hanya menampilkan foto dan nomor urut. Nama,
                  kelas, dan slogan tidak ditampilkan supaya pilihan tidak
                  dipengaruhi bacaan teks. Nama yang terbaca pembaca layar
                  diambil dari aria-label, dan nama lengkap tetap muncul di
                  dialog konfirmasi sebagai pengaman salah klik. */}
              <div className="mt-4 flex items-center justify-between border-t border-neutral-100 pt-3 font-mono text-[11px]">
                <span className="text-neutral-500">Nomor {c.number}</span>
                <span className={isSel ? "font-bold text-brand-deep" : "text-neutral-500"}>
                  {isSel ? "Terpilih" : "Klik untuk memilih"}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {error && (
        <div
          role="alert"
          className="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-[13px] font-medium text-rose-800"
        >
          {error}
        </div>
      )}

      {/* Sticky Bottom Confirmation Bar. Di layar kecil baris ini ditumpuk
          dan dinaikkan di atas bottom nav, kalau tidak barisnya menutupi
          navigasi. Dari md ke atas bottom nav hilang, jadi cukup 1rem. */}
      <div className="sticky bottom-[calc(4.75rem+env(safe-area-inset-bottom))] mt-8 md:bottom-4">
        <div className="mx-auto flex max-w-2xl flex-col gap-3 rounded-2xl border border-neutral-300 bg-white/95 p-4 shadow-lg backdrop-blur-md sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div className="min-w-0">
            {chosen ? (
              <div className="text-xs">
                <div className="flex min-w-0 flex-wrap items-baseline gap-x-2">
                  <span className="font-mono text-neutral-500">Pilihan: </span>
                  <span className="min-w-0 font-bold text-neutral-950">
                    No. {chosen.number}
                  </span>
                </div>
                <div className="mt-0.5 min-w-0 font-bold text-neutral-950">
                  {chosen.name}
                  {chosen.wakil_name && ` & ${chosen.wakil_name}`}
                </div>
              </div>
            ) : (
              <span className="font-mono text-xs text-neutral-500">
                Belum ada paslon yang dipilih
              </span>
            )}
          </div>

          <button
            disabled={!chosen || notOpen}
            onClick={() => setConfirmOpen(true)}
            className="press w-full rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-brand-ink shadow-brand transition-all hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-dark disabled:opacity-40 sm:w-auto"
          >
            <span className="flex items-center justify-center gap-1.5">
              Kunci &amp; Gunakan Hak Suara
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4"
                aria-hidden
              >
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </span>
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmOpen && chosen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Batal dan tutup konfirmasi"
            onClick={() => !submitting && setConfirmOpen(false)}
            className="absolute inset-0 cursor-default bg-neutral-950/40 backdrop-blur-xs"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            aria-describedby="confirm-desc"
            ref={confirmRef}
            className="surface fade-up relative w-full max-w-sm p-7 shadow-xl focus:outline-none"
          >
            <div className="text-[13px] font-medium text-neutral-500">
              Konfirmasi Pilihan Final
            </div>
            <h2
              id="confirm-title"
              className="mt-1 text-xl font-black tracking-tight text-neutral-950"
            >
              Kirimkan Surat Suara?
            </h2>
            <p id="confirm-desc" className="mt-2 text-[13px] leading-relaxed text-neutral-600">
              Kamu akan memberikan 1 suara sah kepada:
            </p>

            <div className="mt-4 flex items-center gap-4 rounded-xl border border-neutral-200 bg-neutral-50 p-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-950 font-mono text-base font-bold text-white">
                {chosen.number}
              </span>
              <div>
                <div className="font-bold text-neutral-950 text-sm">{chosen.name}</div>
                <div className="font-mono text-xs text-neutral-500">{chosen.class_name}</div>
              </div>
            </div>

            <p className="mt-4 font-mono text-[11px] leading-relaxed text-neutral-500">
              * Suara yang sudah terkirim tidak dapat ditarik atau diganti dengan alasan apa pun.
            </p>

            <div className="mt-6 flex gap-2">
              <button
                type="button"
                disabled={submitting}
                onClick={() => setConfirmOpen(false)}
                className="press flex-1 rounded-full border border-neutral-300 py-2.5 text-sm font-semibold text-neutral-700 hover:border-neutral-900 hover:bg-neutral-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-dark disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={submitting}
                aria-busy={submitting}
                onClick={submit}
                className="press flex-1 rounded-full bg-brand py-2.5 text-sm font-semibold text-brand-ink shadow-brand hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-dark disabled:opacity-50"
              >
                {submitting ? "Mengunci..." : "Ya, Coblos"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
