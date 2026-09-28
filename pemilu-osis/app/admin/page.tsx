"use client";

import { type FC, useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { api, isDemoMode } from "@/lib/backend";
import { fmtDateTime, fromLocalInput, pct, toLocalInput } from "@/lib/format";
import {
  ACCEPTED_IMPORT,
  buildVoters,
  readVoterFile,
  type ImportResult,
} from "@/lib/importVoters";
import type {
  AdminStats,
  Candidate,
  CandidateInput,
  ResultRow,
  SettingsPatch,
  Status,
  VoterRow,
  NewVoter,
} from "@/lib/types";
import {
  LayoutDashboardIcon,
  UsersIcon,
  UserIcon,
  SettingsIcon,
  AlertTriangleIcon,
  LockIcon,
  XIcon,
  AlertCircleIcon,
} from "@/components/Icons";

const ADMIN_KEY = "osis_admin_key";
const ADMIN_USER = "osis_admin_user";

type Tab = "dashboard" | "candidates" | "voters" | "settings" | "danger";

const TABS: { id: Tab; label: string; icon: FC<{ className?: string }> }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboardIcon },
  { id: "candidates", label: "Kandidat", icon: UsersIcon },
  { id: "voters", label: "Pemilih", icon: UserIcon },
  { id: "settings", label: "Pengaturan", icon: SettingsIcon },
  { id: "danger", label: "Zona Bahaya", icon: AlertTriangleIcon },
];

// ---------------------------------------------------------------------------

export default function AdminPage() {
  const [unlocked, setUnlocked] = useState(false);
  const [username, setUsername] = useState("");
  const [key, setKey] = useState("");
  const [keyError, setKeyError] = useState("");
  const [checking, setChecking] = useState(false);
  const [tab, setTab] = useState<Tab>("dashboard");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (sessionStorage.getItem(ADMIN_KEY)) setUnlocked(true);
  }, []);

  const flash = useCallback((msg: string) => {
    setNotice(msg);
    window.setTimeout(() => setNotice(""), 4000);
  }, []);

  const fail = useCallback((e: unknown) => {
    setError(e instanceof Error ? e.message : String(e));
    window.setTimeout(() => setError(""), 6000);
  }, []);

  const unlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setChecking(true);
    setKeyError("");
    try {
      await api.adminStats(username, key);
      sessionStorage.setItem(ADMIN_KEY, key);
      sessionStorage.setItem(ADMIN_USER, username);
      setUnlocked(true);
      setKey("");
      setUsername("");
    } catch (err) {
      setKeyError(err instanceof Error ? err.message : "Kunci salah.");
    } finally {
      setChecking(false);
    }
  };

  const lock = () => {
    sessionStorage.removeItem(ADMIN_KEY);
    sessionStorage.removeItem(ADMIN_USER);
    setUnlocked(false);
  };

  const adminKey =
    typeof window !== "undefined"
      ? (sessionStorage.getItem(ADMIN_KEY) ?? "")
      : "";
  const adminUser =
    typeof window !== "undefined"
      ? (sessionStorage.getItem(ADMIN_USER) ?? "")
      : "";

  if (!unlocked) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-4 py-12">
        <div className="fade-up w-full max-w-sm">
          <div className="surface p-8">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-900">
              <LockIcon className="h-6 w-6 text-white" />
            </div>
            <h1 className="mt-5 text-center text-xl font-extrabold text-neutral-900">
              Panel Administrator
            </h1>
            <p className="mt-1 text-center text-sm text-neutral-500">
              Masukkan kunci admin untuk mengelola pemilihan.
            </p>
            <form onSubmit={unlock} className="mt-6 space-y-4">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Nama pengguna"
                autoFocus
                className="w-full rounded-xl border border-neutral-300 px-4 py-3 text-sm outline-none transition focus-visible:border-brand-dark focus-visible:ring-4 focus-visible:ring-brand/30"
              />
              <input
                type="password"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="Kunci admin"
                className="w-full rounded-xl border border-neutral-300 px-4 py-3 text-sm outline-none transition focus-visible:border-brand-dark focus-visible:ring-4 focus-visible:ring-brand/30"
              />
              {keyError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-800">
                  {keyError}
                </div>
              )}
              <button
                disabled={checking}
                className="press w-full rounded-full bg-neutral-900 py-3 text-sm font-bold text-white transition hover:bg-neutral-700 disabled:opacity-60"
              >
                {checking ? "Memeriksa..." : "Buka Panel"}
              </button>
            </form>
            {isDemoMode && (
              <p className="mt-4 rounded-xl border border-brand-wash bg-brand-wash px-4 py-2.5 text-center text-xs text-brand-deep">
                Mode demo: kunci admin <code className="font-bold">admin123</code>
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-neutral-900">
            Panel Admin
          </h1>
          <p className="text-sm text-neutral-500">
            Kelola kandidat, pemilih, periode, dan hasil.
          </p>
        </div>
        <button
          onClick={lock}
          className="rounded-xl border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-600 hover:bg-neutral-100"
        >
          Ganti Sesi
        </button>
      </div>

      {(error || notice) && (
        <div className="pointer-events-none fixed inset-x-0 top-3 z-50 flex justify-center px-4">
          <div
            role="status"
            aria-live="polite"
            className={`pointer-events-auto max-w-md rounded-2xl border px-5 py-3.5 text-sm font-medium shadow-lg ${
              error
                ? "border-rose-300 bg-rose-50 text-rose-800"
                : "border-emerald-300 bg-emerald-50 text-emerald-800"
            }`}
          >
            {error || notice}
          </div>
        </div>
      )}


      <div className="mt-6 flex flex-wrap gap-2">
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`press rounded-full px-4 py-2.5 text-sm font-bold transition-colors ${
                  tab === t.id
                    ? "bg-brand text-brand-ink shadow-brand"
                    : "bg-white text-neutral-600 ring-1 ring-neutral-200 hover:bg-neutral-100"
                }`}
              >
                <span className="mr-1.5">
                  <Icon className="h-4 w-4" />
                </span>
                {t.label}
              </button>
            );
          })}
      </div>

      <div className="mt-6">
        {tab === "dashboard" && (
          <DashboardTab username={adminUser} key_={adminKey} />
        )}
        {tab === "candidates" && (
          <CandidatesTab
            username={adminUser}
            key_={adminKey}
            flash={flash}
            fail={fail}
          />
        )}
        {tab === "voters" && (
          <VotersTab
            username={adminUser}
            key_={adminKey}
            flash={flash}
            fail={fail}
          />
        )}
        {tab === "settings" && (
          <SettingsTab
            username={adminUser}
            key_={adminKey}
            flash={flash}
            fail={fail}
            onPasswordChanged={lock}
          />
        )}
        {tab === "danger" && (
          <DangerTab
            username={adminUser}
            key_={adminKey}
            flash={flash}
            fail={fail}
          />
        )}
      </div>
    </div>
  );
}

// ------------------------------- DASHBOARD ---------------------------------

function StatCard({
  label,
  value,
  sub,
  tone = "default",
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "default" | "accent";
}) {
  return (
    <div
      className={`rounded-2xl border p-5 shadow-sm ${
        tone === "accent"
          ? "border-brand/40 bg-brand-wash"
          : "border-neutral-200 bg-white"
      }`}
    >
      <div
        className={`text-xs font-semibold tracking-normal ${ tone === "accent" ? "text-brand-deep" : "text-neutral-500" }`}
      >
        {label}
      </div>
      <div
        className={`mt-1 text-3xl font-extrabold ${
          tone === "accent" ? "text-neutral-950" : "text-neutral-900"
        }`}
      >
        {value}
      </div>
      {sub && (
        <div className="mt-0.5 text-xs font-medium text-neutral-600">{sub}</div>
      )}
    </div>
  );
}

function DashboardTab({ username, key_ }: { username: string; key_: string }) {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [rows, setRows] = useState<ResultRow[]>([]);
  const [status, setStatus] = useState<Status | null>(null);
  const [cands, setCands] = useState<Candidate[]>([]);

  const load = useCallback(async () => {
    try {
      const [s, r, st, cands] = await Promise.all([
        api.adminStats(username, key_),
        api.adminResults(username, key_),
        api.getStatus(),
        api.listCandidates(),
      ]);
      setStats(s);
      setRows(r);
      setStatus(st);
      setCands(cands);
    } catch {
      /* noop */
    }
  }, [username, key_]);

  useEffect(() => {
    load();
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
  }, [load]);

  const participation = stats ? pct(stats.voted, stats.total_voters) : 0;
  const max = Math.max(...rows.map((r) => r.total), 1);
  const totalVotes = rows.reduce((a, r) => a + r.total, 0);

  // Gabungkan data kandidat lengkap dengan perolehan suara.
  const voteById = new Map(rows.map((r) => [r.candidate_id, r.total]));
  const voteByNumber = new Map(rows.map((r) => [r.candidate_number, r.total]));
  const merged = cands
    .map((c) => ({
      c,
      votes: voteById.get(c.id) ?? voteByNumber.get(c.number) ?? 0,
    }))
    .sort((a, b) => b.votes - a.votes || a.c.number - b.c.number);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Pemilih Terdaftar"
          value={String(stats?.total_voters ?? "—")}
        />
        <StatCard
          label="Suara Masuk"
          value={String(stats?.total_votes ?? "—")}
        />
        <StatCard
          label="Partisipasi"
          value={`${participation}%`}
          tone="accent"
          sub={
            stats ? `${stats.voted}/${stats.total_voters} pemilih` : undefined
          }
        />
        <StatCard
          label="Kandidat Aktif"
          value={String(stats?.candidates ?? "—")}
        />
      </div>

      {/* Ringkasan kandidat + perolehan suara */}
      <div className="surface p-6">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h3 className="font-bold text-neutral-900">
            Perolehan Suara per Kandidat
          </h3>
          <span className="font-mono text-xs text-neutral-500">
            {merged.length} paslon &middot; {totalVotes} suara
          </span>
        </div>

        {merged.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-neutral-300 p-8 text-center text-sm text-neutral-500">
            Belum ada kandidat. Tambahkan lewat tab Kandidat.
          </p>
        ) : (
          <div className="mt-4 space-y-2.5">
            {merged.map(({ c, votes }) => (
              <div
                key={c.id}
                className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-neutral-50/60 px-3.5 py-3"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand font-mono text-xs font-black text-brand-ink">
                  {String(c.number).padStart(2, "0")}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-neutral-900">
                    {c.name}
                  </div>
                  <div className="truncate font-mono text-[11px] text-neutral-500">
                    {c.class_name}
                    {c.wakil_name ? ` · Wakil ${c.wakil_name}` : ""}
                  </div>
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-neutral-200">
                    <div
                      className={`h-full rounded-full ${
                        votes === max && votes > 0 ? "bg-brand-dark" : "bg-neutral-400"
                      }`}
                      style={{ width: `${Math.max(pct(votes, max), votes > 0 ? 3 : 0)}%` }}
                    />
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-lg font-black leading-none text-neutral-950 tabular-nums">
                    {votes}
                  </div>
                  <div className="mt-0.5 font-mono text-[11px] text-brand-deep">
                    {pct(votes, totalVotes)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="surface p-6">
        <h3 className="font-bold text-neutral-900">Status Pemilihan</h3>
        <dl className="mt-4 space-y-3 text-sm">
          <Row label="Sekolah" value={status?.school_name ?? "—"} />
          <Row label="Nama Pemilihan" value={status?.election_name ?? "—"} />
          <Row label="Tahun Ajaran" value={status?.academic_year ?? "—"} />
          <Row label="Mulai" value={fmtDateTime(status?.start_at)} />
          <Row label="Selesai" value={fmtDateTime(status?.end_at)} />
          <Row
            label="Voting"
            value={status?.is_open ? "DIBUKA 🔓" : "DITUTUP 🔒"}
          />
          <Row
            label="Halaman Hasil"
            value={status?.show_results ? "DIBUKA 🔓" : "DITUTUP 🔒"}
          />
        </dl>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-neutral-100 pb-2.5 last:border-0">
      <dt className="text-neutral-500">{label}</dt>
      <dd className="text-right font-semibold text-neutral-800">{value}</dd>
    </div>
  );
}

// ------------------------------- KANDIDAT ----------------------------------

const EMPTY_CAND: CandidateInput = {
  number: 0,
  name: "",
  class_name: "",
  wakil_name: "",
  wakil_class_name: "",
  photo_url: "",
  vote_photo_url: "",
  video_url: "",
  slogan: "",
  vision: "",
  mission: "",
  is_active: true,
};

function CandidatesTab({
  username,
  key_,
  flash,
  fail,
}: {
  username: string;
  key_: string;
  flash: (m: string) => void;
  fail: (e: unknown) => void;
}) {
  const [list, setList] = useState<Candidate[]>([]);
  const [editing, setEditing] = useState<CandidateInput | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const load = useCallback(async () => {
    try {
      setList(await api.listCandidates());
    } catch (e) {
      fail(e);
    }
  }, [fail]);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    if (!editing) return;
    if (!editing.name.trim()) {
      setFormError("Nama wajib diisi.");
      return;
    }
    if (!editing.number || editing.number < 1) {
      setFormError("Nomor urut minimal 1.");
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      await api.adminUpsertCandidate(username, key_, {
        ...editing,
        name: editing.name.trim(),
      });
      flash(editing.id ? "Kandidat diperbarui." : "Kandidat ditambahkan.");
      setEditing(null);
      load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Gagal menyimpan.");
    } finally {
      setSaving(false);
    }
  };

  const del = async (c: Candidate) => {
    if (
      !window.confirm(
        `Hapus kandidat ${c.name}? Semua suara untuk kandidat ini ikut terhapus.`,
      )
    )
      return;
    try {
      await api.adminDeleteCandidate(username, key_, c.id);
      flash("Kandidat dihapus.");
      load();
    } catch (e) {
      fail(e);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-extrabold text-neutral-900">
          Kandidat ({list.length})
        </h2>
        <button
          onClick={() => {
            setFormError("");
            setEditing({ ...EMPTY_CAND, number: list.length + 1 });
          }}
          className="rounded-full bg-brand px-4 py-2.5 text-sm font-bold text-brand-ink shadow-brand hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-dark"
        >
          + Tambah Kandidat
        </button>
      </div>

      <div className="surface mt-4 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full table-fixed text-sm">
            <thead>
              <tr className="border-b border-neutral-100 text-left text-[11px] font-semibold tracking-normal text-neutral-500 sm:text-xs">
                <th scope="col" className="w-[52px] px-3 py-3 sm:px-4">
                  No.
                </th>
                <th scope="col" className="px-2 py-3 sm:px-4">
                  Nama
                </th>
                <th scope="col" className="hidden px-4 py-3 sm:table-cell">
                  Kelas
                </th>
                <th scope="col" className="w-[92px] px-2 py-3 sm:px-4">
                  Status
                </th>
                <th
                  scope="col"
                  className="w-[84px] px-2 py-3 text-right sm:w-[124px] sm:px-4"
                >
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody>
              {list.map((c) => (
                <tr key={c.id} className="border-b border-neutral-50 last:border-0">
                  <td className="px-3 py-3 font-bold text-brand-deep sm:px-4">
                    {c.number}
                  </td>
                  <td className="px-2 py-3 sm:px-4">
                    <div
                      className="truncate font-semibold text-neutral-800"
                      title={c.name}
                    >
                      {c.name}
                    </div>
                    {c.slogan && (
                      <div className="truncate text-[11px] italic text-neutral-500 sm:text-xs">
                        &ldquo;{c.slogan}&rdquo;
                      </div>
                    )}
                    <div className="truncate text-[11px] text-neutral-500 sm:hidden">
                      {c.class_name}
                    </div>
                  </td>
                  <td className="hidden truncate px-4 py-3 text-neutral-500 sm:table-cell">
                    {c.class_name}
                  </td>
                  <td className="px-2 py-3 sm:px-4">
                    <span
                      className={`inline-block whitespace-nowrap rounded-full px-2 py-1 text-[10px] font-bold sm:px-2.5 sm:text-xs ${
                        c.is_active
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-neutral-100 text-neutral-500"
                      }`}
                    >
                      {c.is_active ? "Aktif" : "Nonaktif"}
                    </span>
                  </td>
                  <td className="px-2 py-3 text-right sm:px-4">
                    <span className="flex flex-col items-end gap-0.5 sm:flex-row sm:justify-end sm:gap-1">
                      <button
                        onClick={() => {
                          setFormError("");
                          setEditing({
                            id: c.id,
                            number: c.number,
                            name: c.name,
                            class_name: c.class_name,
                            wakil_name: c.wakil_name ?? "",
                            wakil_class_name: c.wakil_class_name ?? "",
                            photo_url: c.photo_url ?? "",
                            vote_photo_url: c.vote_photo_url ?? "",
                            video_url: c.video_url ?? "",
                            slogan: c.slogan ?? "",
                            vision: c.vision,
                            mission: c.mission,
                            is_active: c.is_active,
                          });
                        }}
                        className="rounded-lg px-1.5 py-1 text-[11px] font-bold text-brand-deep hover:bg-brand-wash sm:px-3 sm:text-sm"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => del(c)}
                        aria-label={`Hapus kandidat ${c.name}`}
                        className="rounded-lg px-1.5 py-1 text-[11px] font-bold text-rose-600 hover:bg-rose-50 sm:px-3 sm:text-xs"
                      >
                        Hapus
                      </button>
                    </span>
                  </td>
                </tr>
              ))}
              {list.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-10 text-center text-neutral-500"
                  >
                    Belum ada kandidat.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editing && (
        <Modal
          title={editing.id ? "Edit Kandidat" : "Tambah Kandidat"}
          onClose={() => !saving && setEditing(null)}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nomor Urut">
              <input
                type="number"
                min={1}
                value={editing.number || ""}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    number: parseInt(e.target.value || "0", 10),
                  })
                }
                className="input"
              />
            </Field>
            <Field label="Kelas">
              <input
                value={editing.class_name}
                onChange={(e) =>
                  setEditing({ ...editing, class_name: e.target.value })
                }
                placeholder="XII IPA 1"
                className="input"
              />
            </Field>
          </div>
          <Field label="Nama Lengkap" className="mt-4">
            <input
              value={editing.name}
              onChange={(e) => setEditing({ ...editing, name: e.target.value })}
              className="input"
            />
          </Field>
          <Field label="Slogan" className="mt-4">
            <input
              value={editing.slogan}
              onChange={(e) =>
                setEditing({ ...editing, slogan: e.target.value })
              }
              className="input"
            />
          </Field>
          <Field label="URL Foto Profil (opsional)" className="mt-4">
            <input
              value={editing.photo_url}
              onChange={(e) =>
                setEditing({ ...editing, photo_url: e.target.value })
              }
              placeholder="https://..."
              className="input"
            />
            <p className="mt-1.5 text-xs text-neutral-500">
              Dipakai di beranda dan halaman profil paslon. Tautan Google Drive
              sharing otomatis diubah ke bentuk thumbnail.
            </p>
          </Field>
          <Field label="URL Foto Bilik Suara (opsional)" className="mt-4">
            <input
              value={editing.vote_photo_url}
              onChange={(e) =>
                setEditing({ ...editing, vote_photo_url: e.target.value })
              }
              placeholder="https://... (kosongkan untuk memakai foto profil)"
              className="input"
            />
            <p className="mt-1.5 text-xs text-neutral-500">
              Foto khusus kartu di bilik suara. Kalau dikosongkan, kartu memakai
              foto profil; mengosongkan kolom ini menghapus foto khusus.
            </p>
          </Field>
          <Field label="URL Video Kampanye (opsional)" className="mt-4">
            <input
              value={editing.video_url}
              onChange={(e) =>
                setEditing({ ...editing, video_url: e.target.value })
              }
              placeholder="https://youtube.com/watch?v=... atau https://.../video.mp4"
              className="input"
            />
            <p className="mt-1.5 text-xs text-neutral-500">
              Tampil di bagian Video Kampanye pada halaman profil paslon, di
              atas visi. Kosongkan kalau paslon belum punya video.
            </p>
          </Field>
          <Field label="Visi" className="mt-4">
            <textarea
              rows={3}
              value={editing.vision}
              onChange={(e) =>
                setEditing({ ...editing, vision: e.target.value })
              }
              className="input"
            />
          </Field>
          <Field label="Misi" className="mt-4">
            <textarea
              rows={5}
              value={editing.mission}
              onChange={(e) =>
                setEditing({ ...editing, mission: e.target.value })
              }
              placeholder={"- Poin 1\n- Poin 2"}
              className="input"
            />
          </Field>
          <label className="mt-4 flex items-center gap-2.5 text-sm font-semibold text-neutral-700">
            <input
              type="checkbox"
              checked={editing.is_active}
              onChange={(e) =>
                setEditing({ ...editing, is_active: e.target.checked })
              }
              className="h-4 w-4 accent-brand-dark"
            />
            Kandidat aktif (terlihat oleh pemilih)
          </label>

          {formError && (
            <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-800">
              {formError}
            </div>
          )}

          <div className="mt-6 flex gap-3">
            <button
              disabled={saving}
              onClick={() => setEditing(null)}
              className="flex-1 rounded-xl border border-neutral-300 py-3 text-sm font-bold text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
            >
              Batal
            </button>
            <button
              disabled={saving}
              onClick={save}
              className="flex-1 rounded-full bg-brand py-3 text-sm font-bold text-brand-ink shadow-brand hover:bg-brand-hover disabled:opacity-60"
            >
              {saving ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// -------------------------------- PEMILIH ----------------------------------

function parseVoterLines(text: string): {
  rows: NewVoter[];
  errors: string[];
} {
  const rows: NewVoter[] = [];
  const errors: string[] = [];
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  lines.forEach((line, i) => {
    const parts = line.split(/[;,\t]/).map((s) => s.trim());
    if (parts.length < 4) {
      errors.push(`Baris ${i + 1}: format NIS;Nama;Kelas;Password`);
      return;
    }
    const [nis, name, class_name, password, roleRaw] = parts;
    // Kolom kelima opsional: "guru" mengizinkan ID non-numerik, misalnya
    // NUPK atau username. Tanpa kolom itu, aturan NISN siswa tetap berlaku.
    const role = (roleRaw || "").toLowerCase() === "guru" ? "guru" : "siswa";
    const idValid =
      role === "guru" ? /^[A-Za-z0-9._-]{3,32}$/.test(nis) : /^\d+$/.test(nis);
    if (!idValid) {
      errors.push(
        role === "guru"
          ? `Baris ${i + 1}: ID guru hanya boleh huruf/angka (3-32 karakter).`
          : `Baris ${i + 1}: NIS harus angka.`
      );
    }
    if (!name) errors.push(`Baris ${i + 1}: nama kosong.`);
    rows.push({
      NISN: nis,
      name,
      class_name,
      password,
      role,
      NIP: role === "guru" ? nis : "",
    });
  });
  return { rows, errors };
}

function VotersTab({
  username,
  key_,
  flash,
  fail,
}: {
  username: string;
  key_: string;
  flash: (m: string) => void;
  fail: (e: unknown) => void;
}) {
  const [list, setList] = useState<VoterRow[]>([]);
  const [bulk, setBulk] = useState("2025100;Contoh Nama;XII IPA 1;password123");
  const [bulkErrors, setBulkErrors] = useState<string[]>([]);
  const [adding, setAdding] = useState(false);
  const [imported, setImported] = useState<ImportResult | null>(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState("");
  const [importName, setImportName] = useState("");
  const [dragging, setDragging] = useState(false);
  const [q, setQ] = useState("");
  const [sortKey, setSortKey] = useState<
    "class_name" | "name" | "nis" | "status"
  >("class_name");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  const load = useCallback(async () => {
    try {
      setList(await api.adminListVoters(username, key_));
    } catch (e) {
      fail(e);
    }
  }, [username, key_, fail]);

  useEffect(() => {
    load();
  }, [load]);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setImporting(true);
    setImportError("");
    try {
      const matrix = await readVoterFile(file);
      const res = buildVoters(matrix);
      setImported(res);
      setImportName(file.name);
      if (!res.rows.length && !res.errors.length) {
        setImportError("File tidak berisi data pemilih.");
      }
    } catch (e) {
      setImported(null);
      setImportName("");
      setImportError(e instanceof Error ? e.message : "Gagal membaca file.");
    } finally {
      setImporting(false);
    }
  };

  const add = async () => {
    // Impor file (kalau ada) menggantikan input teks manual.
    const { rows, errors } = imported
      ? { rows: imported.rows, errors: imported.errors }
      : parseVoterLines(bulk);
    if (imported) setBulkErrors([]);
    else setBulkErrors(errors);
    if (rows.length === 0) return;
    setAdding(true);
    try {
      const n = await api.adminAddVoters(username, key_, rows);
      flash(`${n} pemilih berhasil ditambahkan/diperbarui.`);
      setBulk("");
      setBulkErrors([]);
      setImported(null);
      setImportName("");
      setImportError("");
      load();
    } catch (e) {
      fail(e);
    } finally {
      setAdding(false);
    }
  };

  const downloadTemplate = () => {
    const csv =
      "\uFEFFNIS;Nama;Kelas;Password;Role\n" +
      "2025100;Ahmad Fauzi;XII IPA 1;password123;siswa\n" +
      "2025101;Dewi Lestari;XII IPA 2;password123;siswa\n";
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "template-pemilih.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const pendingCount = imported ? imported.rows.length : null;

  const resetVote = async (v: VoterRow) => {
    const id = v.role === "guru" && v.NIP ? v.NIP : v.NISN;
    if (!window.confirm(`Reset status vote ${v.name} (${id})?`)) return;
    try {
      await api.adminResetVote(username, key_, id);
      flash("Status vote direset.");
      load();
    } catch (e) {
      fail(e);
    }
  };

  const remove = async (v: VoterRow) => {
    const id = v.role === "guru" && v.NIP ? v.NIP : v.NISN;
    if (!window.confirm(`Hapus pemilih ${v.name} (${id})?`)) return;
    try {
      await api.adminRemoveVoter(username, key_, id);
      flash("Pemilih dihapus.");
      load();
    } catch (e) {
      fail(e);
    }
  };

  const filtered = useMemo(() => {
    const search = q.toLowerCase();
    const f = list.filter((v) => {
      const nisn = v.NISN ?? "";
      const name = v.name ?? "";
      const cls = v.class_name ?? "";
      const nip = v.NIP ?? "";
      return (
        nisn.includes(q) ||
        name.toLowerCase().includes(search) ||
        cls.toLowerCase().includes(search) ||
        nip.includes(q)
      );
    });
    f.sort((a, b) => {
      const natCmp = (x: string, y: string) =>
        x.localeCompare(y, undefined, { numeric: true, sensitivity: "base" });
      if (sortKey === "class_name") {
        const cmp = natCmp(a.class_name ?? "", b.class_name ?? "");
        if (cmp !== 0) return cmp;
        const cmp2 = (a.name ?? "").localeCompare(b.name ?? "");
        if (cmp2 !== 0) return cmp2;
        return (a.NISN ?? "").localeCompare(b.NISN ?? "");
      }
      if (sortKey === "name") {
        const cmp = (a.name ?? "").localeCompare(b.name ?? "");
        if (cmp !== 0) return cmp;
        return natCmp(a.class_name ?? "", b.class_name ?? "");
      }
      if (sortKey === "nis") {
        return (a.NISN ?? "").localeCompare(b.NISN ?? "");
      }
      if (sortKey === "status") {
        return Number(a.has_voted) - Number(b.has_voted);
      }
      return 0;
    });
    return f;
  }, [list, q, sortKey]);

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const paginated = filtered.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  return (
    <div className="space-y-6">
      <div className="surface p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="font-bold text-neutral-900">Tambah Pemilih Massal</h3>
            <p className="mt-1 text-xs text-neutral-500">
              Impor dari file CSV/Excel, atau tempel manual. NIS yang sudah ada
              akan diperbarui password-nya.
            </p>
          </div>
          <button
            onClick={downloadTemplate}
            className="press shrink-0 rounded-lg border border-neutral-300 px-3 py-1.5 text-sm font-bold text-neutral-700 transition-colors hover:border-brand-dark hover:bg-brand-wash"
          >
            Unduh Template CSV
          </button>
        </div>

        {/* Drop zone / pilih file */}
        <label
          htmlFor="voter-file"
          className={`relative mt-4 block cursor-pointer rounded-xl border-2 border-dashed p-5 text-center transition-colors ${
            dragging
              ? "border-brand-dark bg-brand-wash"
              : "border-neutral-300 bg-neutral-50/60"
          }`}
        >
          {/* Drag-and-drop tidak punya padanan keyboard; jalur keyboard dan
              screen reader memakai input file di bawah lewat label ini. */}
          <div
            aria-hidden
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              void handleFile(e.dataTransfer.files?.[0]);
            }}
            className="absolute inset-0"
          />
          <input
            id="voter-file"
            type="file"
            accept={ACCEPTED_IMPORT}
            className="sr-only"
            onChange={(e) => {
              void handleFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          <p className="text-sm font-semibold text-neutral-700">
            Tarik file ke sini, atau{" "}
            <span className="font-bold text-brand-deep underline underline-offset-4">
              pilih file
            </span>
          </p>
          <p className="mt-1 text-xs text-neutral-500">
            Format: <code className="rounded bg-neutral-100 px-1.5 py-0.5 font-mono">.csv</code>,{" "}
            <code className="rounded bg-neutral-100 px-1.5 py-0.5 font-mono">.tsv</code>,{" "}
            <code className="rounded bg-neutral-100 px-1.5 py-0.5 font-mono">.xlsx</code>{" "}
            &mdash; kolom: NIS, Nama, Kelas, Password (Role/NIP opsional).
          </p>

          {importing && (
            <p className="mt-2 font-mono text-xs text-neutral-500">
              Membaca file...
            </p>
          )}

          {importError && (
            <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-800">
              {importError}
            </div>
          )}

          {imported && (
            <div className="mt-3 rounded-lg border border-brand/40 bg-brand-wash px-3.5 py-2.5 text-left text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono font-bold text-neutral-900">
                  {importName}
                </span>
                <span className="font-mono text-brand-deep">
                  {imported.rows.length} siap impor / {imported.total} baris
                </span>
              </div>
              <div className="mt-1 text-neutral-600">
                {imported.hasHeader
                  ? "Header dikenali, kolom dipetakan otomatis."
                  : "Tanpa header, memakai urutan NIS;Nama;Kelas;Password."}
                {imported.errors.length > 0 && (
                  <span className="ml-1 font-semibold text-rose-700">
                    {imported.errors.length} baris dilewati.
                  </span>
                )}
              </div>
              {imported.errors.length > 0 && (
                <ul className="mt-2 max-h-28 space-y-1 overflow-y-auto border-t border-brand/30 pt-2 font-mono text-[11px] text-rose-800">
                  {imported.errors.slice(0, 50).map((e, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <AlertCircleIcon className="mt-px h-3.5 w-3.5 shrink-0 text-rose-600" />
                      {e}
                    </li>
                  ))}
                  {imported.errors.length > 50 && (
                    <li className="text-neutral-600">
                      ...dan {imported.errors.length - 50} baris lain.
                    </li>
                  )}
                </ul>
              )}
            </div>
          )}
        </label>

        <div className="my-4 flex items-center gap-3">
          <span className="h-px flex-1 bg-neutral-200" />
          <span className="font-medium text-[11px] tracking-normal text-neutral-500">
            atau tempel manual
          </span>
          <span className="h-px flex-1 bg-neutral-200" />
        </div>

        <p className="text-xs text-neutral-500">
          Satu baris per pemilih, dipisah titik koma:{" "}
          <code className="rounded bg-neutral-100 px-1.5 py-0.5 font-mono">
            NIS;Nama;Kelas;Password;Role
          </code>
          . Kolom Role opsional; isi <code className="font-mono">guru</code>{" "}
          bila ID-nya NIP atau NUPK non-numerik.
        </p>
        <textarea
          rows={5}
          value={bulk}
          onChange={(e) => setBulk(e.target.value)}
          className="input mt-3 font-mono text-xs"
          placeholder={
            "2025100;Ahmad Fauzi;XII IPA 1;password123\n2025101;Dewi Lestari;XII IPA 2;password123"
          }
        />
        {bulkErrors.length > 0 && (
          <div className="mt-3 max-h-32 overflow-y-auto rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-medium text-rose-800">
          {bulkErrors.map((e, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <AlertCircleIcon className="h-4 w-4 shrink-0 text-rose-600" />
                {e}
              </div>
            ))}
          </div>
        )}
        <button
          onClick={add}
          disabled={adding || importing || pendingCount === 0}
          className="mt-3 rounded-full bg-brand px-5 py-2.5 text-sm font-bold text-brand-ink shadow-brand hover:bg-brand-hover disabled:opacity-60"
        >
          {adding
            ? "Menambahkan..."
            : pendingCount !== null
              ? `+ Simpan ${pendingCount} Pemilih dari File`
              : "+ Simpan Pemilih"}
        </button>
        {pendingCount === 0 && imported && (
          <p className="mt-2 text-xs text-rose-700">
            Tidak ada baris valid di file tersebut. Perbaiki format lalu impor ulang.
          </p>
        )}
      </div>

      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-bold text-neutral-900">
            Daftar Pemilih ({list.length})
          </h3>
          <div className="flex items-center gap-2">
            <select
              value={sortKey}
              onChange={(e) =>
                setSortKey(
                  e.target.value as "class_name" | "name" | "nis" | "status",
                )
              }
              className="rounded-xl border border-neutral-300 px-3 py-1.5 text-xs outline-none focus-visible:border-brand-dark focus-visible:ring-4 focus-visible:ring-brand/30"
            >
              <option value="class_name">Kelas &darr; Nama &darr; NIS</option>
              <option value="name">Nama</option>
              <option value="nis">NIS</option>
              <option value="status">Status Vote</option>
            </select>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari NIS / nama / kelas..."
              className="w-64 rounded-xl border border-neutral-300 px-4 py-2 text-sm outline-none focus-visible:border-brand-dark focus-visible:ring-4 focus-visible:ring-brand/30"
            />
          </div>
        </div>
        <div className="surface mt-3 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full table-fixed text-sm">
              <thead className="sticky top-0 z-10 bg-neutral-50">
                <tr className="text-left text-[11px] font-semibold tracking-normal text-neutral-500 sm:text-xs">
                  <th scope="col" className="w-[30%] px-3 py-3 sm:w-[16%] sm:px-4">
                    NIS / NIP
                  </th>
                  <th scope="col" className="px-2 py-3 sm:px-4">
                    Nama
                  </th>
                  <th scope="col" className="hidden px-4 py-3 sm:table-cell">
                    Kelas
                  </th>
                  <th
                    scope="col"
                    className="w-[84px] px-2 py-3 sm:w-[104px] sm:px-4"
                  >
                    Status
                  </th>
                  <th scope="col" className="hidden px-4 py-3 sm:table-cell">
                    Role
                  </th>
                  <th
                    scope="col"
                    className="w-[76px] px-2 py-3 text-right sm:w-[112px] sm:px-4"
                  >
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((v) => (
                  <tr key={v.NISN} className="border-t border-neutral-50">
                    <td
                      className="break-all px-3 py-2.5 font-mono text-[11px] font-semibold leading-tight text-neutral-700 sm:text-xs sm:px-4"
                      title={v.NISN}
                    >
                      {v.NISN}
                    </td>
                    <td className="px-2 py-2.5 sm:px-4">
                      <div
                        className="truncate font-medium text-neutral-800"
                        title={v.name}
                      >
                        {v.name}
                      </div>
                      <div className="truncate text-[11px] text-neutral-500 sm:hidden">
                        {v.class_name} &middot;{" "}
                        {v.role === "guru" ? "Guru" : "Siswa"}
                      </div>
                    </td>
                    <td className="hidden truncate px-4 py-2.5 text-neutral-500 sm:table-cell">
                      {v.class_name}
                    </td>
                    <td className="px-2 py-2.5 sm:px-4">
                      <span
                        className={`inline-block whitespace-nowrap rounded-full px-1.5 py-1 text-[10px] font-bold sm:px-2.5 sm:text-xs ${
                          v.has_voted
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-neutral-100 text-neutral-500"
                        }`}
                      >
                        {v.has_voted ? "Sudah vote" : "Belum vote"}
                      </span>
                    </td>
                    <td className="hidden px-4 py-2.5 text-xs text-neutral-600 sm:table-cell">
                      {v.role === "guru" ? "Guru" : "Siswa"}
                    </td>
                    <td className="px-2 py-2.5 text-right sm:px-4">
                      <span className="flex flex-col items-end gap-0.5 sm:flex-row sm:justify-end sm:gap-1">
                        {v.has_voted && (
                          <button
                            onClick={() => resetVote(v)}
                            aria-label={`Reset status vote ${v.name}`}
                            className="rounded-lg px-1.5 py-1 text-[11px] font-bold text-brand-deep hover:bg-brand-wash sm:px-2.5 sm:text-sm"
                          >
                            Reset
                          </button>
                        )}
                        <button
                          onClick={() => remove(v)}
                          aria-label={`Hapus pemilih ${v.name}`}
                          className="rounded-lg px-1.5 py-1 text-[11px] font-bold text-rose-600 hover:bg-rose-50 sm:px-2.5 sm:text-xs"
                        >
                          Hapus
                        </button>
                      </span>
                    </td>
                  </tr>
                ))}
                {paginated.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-10 text-center text-neutral-500"
                    >
                      Tidak ada pemilih{q ? " yang cocok" : ""}.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="rounded-lg border border-neutral-300 px-3 py-1 text-xs font-bold text-neutral-600 hover:bg-neutral-100 disabled:opacity-40"
            >
              Sebelumnya
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => {
              if (
                totalPages <= 7 ||
                Math.abs(n - currentPage) <= 2 ||
                n === 1 ||
                n === totalPages
              ) {
                return (
                  <button
                    key={n}
                    onClick={() => setCurrentPage(n)}
                    className={`rounded-lg px-3 py-1 text-sm font-bold ${
                      currentPage === n
                        ? "bg-brand text-brand-ink"
                        : "border border-neutral-300 text-neutral-600 hover:bg-neutral-100"
                    }}`}
                  >
                    {n}
                  </button>
                );
              }
              if (n === currentPage - 3 || n === currentPage + 3) {
                return (
                  <span key={n} className="px-1 text-xs text-neutral-500">
                    &hellip;
                  </span>
                );
              }
              return null;
            })}
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="rounded-lg border border-neutral-300 px-3 py-1 text-xs font-bold text-neutral-600 hover:bg-neutral-100 disabled:opacity-40"
            >
              Selanjutnya
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ------------------------------- PENGATURAN --------------------------------

function SettingsTab({
  username,
  key_,
  flash,
  fail,
  onPasswordChanged,
}: {
  username: string;
  key_: string;
  flash: (m: string) => void;
  fail: (e: unknown) => void;
  onPasswordChanged: () => void;
}) {
  const [status, setStatus] = useState<Status | null>(null);
  const [school, setSchool] = useState("");
  const [election, setElection] = useState("");
  const [year, setYear] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const [pwOld, setPwOld] = useState("");
  const [pwNew, setPwNew] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState<"" | "ok" | "err">("");

  useEffect(() => {
    api
      .getStatus()
      .then((st) => {
        setStatus(st);
        setSchool(st.school_name);
        setElection(st.election_name);
        setYear(st.academic_year);
        setStart(toLocalInput(st.start_at));
        setEnd(toLocalInput(st.end_at));
        setIsOpen(st.is_open);
        setShowResults(st.show_results);
      })
      .catch(fail);
  }, [fail]);

  const save = async () => {
    setSaving(true);
    setFormError("");
    try {
      const patch: SettingsPatch = {
        school_name: school,
        election_name: election,
        academic_year: year,
        is_open: isOpen,
        show_results: showResults,
        // kosongkan periode jika field di-clear (sebelumnya terisi)
        start_at: !start
          ? status?.start_at
            ? "CLEAR"
            : undefined
          : (fromLocalInput(start) ?? undefined),
        end_at: !end
          ? status?.end_at
            ? "CLEAR"
            : undefined
          : (fromLocalInput(end) ?? undefined),
      };
      await api.adminSetSettings(username, key_, patch);
      flash("Pengaturan disimpan.");
      const st = await api.getStatus();
      setStatus(st);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Gagal menyimpan.");
    } finally {
      setSaving(false);
    }
  };

  const changePw = async () => {
    setPwSaving(true);
    setPwMsg("");
    try {
      await api.adminSetAdminPassword(username, key_, pwNew);
      setPwMsg("ok");
      setPwOld("");
      setPwNew("");
      setTimeout(onPasswordChanged, 1500);
    } catch (e) {
      setPwMsg("err");
      window.alert(
        e instanceof Error ? e.message : "Gagal mengganti password.",
      );
    } finally {
      setPwSaving(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="surface p-6">
        <h3 className="font-bold text-neutral-900">Informasi Pemilihan</h3>
        <div className="mt-4 space-y-4">
          <Field label="Nama Sekolah">
            <input
              value={school}
              onChange={(e) => setSchool(e.target.value)}
              className="input"
            />
          </Field>
          <Field label="Nama Pemilihan">
            <input
              value={election}
              onChange={(e) => setElection(e.target.value)}
              className="input"
            />
          </Field>
          <Field label="Tahun Ajaran">
            <input
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="input"
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Mulai Voting (WIB)">
              <input
                type="datetime-local"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className="input"
              />
            </Field>
            <Field label="Selesai Voting (WIB)">
              <input
                type="datetime-local"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                className="input"
              />
            </Field>
          </div>
          <p className="text-xs text-neutral-500">
            Kosongkan field untuk tanpa batas waktu.
          </p>

          <div className="flex items-center justify-between gap-4 rounded-xl bg-neutral-50 px-4 py-3">
            <span className="text-sm font-semibold text-neutral-700">
              Buka voting (siswa bisa memilih)
            </span>
            <Switch
              label="Buka voting (siswa bisa memilih)"
              on={isOpen}
              onChange={setIsOpen}
            />
          </div>
          <div className="flex items-center justify-between gap-4 rounded-xl bg-neutral-50 px-4 py-3">
            <span className="text-sm font-semibold text-neutral-700">
              Tampilkan hasil publik
            </span>
            <Switch
              label="Tampilkan hasil publik"
              on={showResults}
              onChange={setShowResults}
            />
          </div>

          {formError && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-800">
              {formError}
            </div>
          )}

          <button
            onClick={save}
            disabled={saving}
            className="w-full rounded-full bg-brand py-3 text-sm font-bold text-brand-ink shadow-brand hover:bg-brand-hover disabled:opacity-60"
          >
            {saving ? "Menyimpan..." : "Simpan Pengaturan"}
          </button>
        </div>
      </div>

      <div className="surface p-6">
        <h3 className="font-bold text-neutral-900">Ganti Kunci Admin</h3>
        <p className="mt-1 text-xs text-neutral-500">
          Gunakan password yang baru dan kuat. Kunci lama otomatis tidak
          berlaku.
        </p>
        <div className="mt-4 space-y-4">
          <Field label="Kunci Saat Ini">
            <input
              type="password"
              value={pwOld}
              onChange={(e) => setPwOld(e.target.value)}
              className="input"
            />
          </Field>
          <Field label="Kunci Baru (min. 4 karakter)">
            <input
              type="password"
              value={pwNew}
              onChange={(e) => setPwNew(e.target.value)}
              className="input"
            />
          </Field>
          {pwMsg === "ok" && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-800">
              &#10003; Kunci berhasil diganti. Kamu akan di-logout sebentar lagi.
            </div>
          )}
          {pwMsg === "err" && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-800">
              Gagal mengganti kunci.
            </div>
          )}
          <button
            onClick={changePw}
            disabled={pwSaving || !pwOld || pwNew.length < 4}
            className="w-full rounded-full bg-neutral-900 py-3 text-sm font-bold text-white hover:bg-neutral-700 disabled:opacity-50"
          >
            {pwSaving ? "Mengganti..." : "Ganti Kunci Admin"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Switch({
  on,
  onChange,
  label,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className={`press relative h-6 w-11 shrink-0 rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-dark ${
        on ? "bg-emerald-500" : "bg-neutral-300"
      }`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
          on ? "left-[22px]" : "left-0.5"
        }`}
      />
    </button>
  );
}

// ------------------------------- ZONA BAHAYA -------------------------------

function DangerTab({
  username,
  key_,
  flash,
  fail,
}: {
  username: string;
  key_: string;
  flash: (m: string) => void;
  fail: (e: unknown) => void;
}) {
  const [confirmText, setConfirmText] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(
    null,
  );
  const confirmOk = confirmText.trim().toUpperCase() === "RESET";

  const resetAll = async () => {
    if (busy) return;
    setBusy(true);
    setResult(null);
    try {
      await api.adminResetVotes(username, key_);
      const stats = await api.adminStats(username, key_);
      setConfirmText("");
      if (stats.total_votes === 0) {
        const msg = `Berhasil: semua suara dihapus, ${stats.voted} pemilih kini belum vote.`;
        setResult({ ok: true, msg });
        flash(msg);
      } else {
        const msg = `Gagal: masih ada ${stats.total_votes} suara di database. Muat ulang halaman lalu coba lagi.`;
        setResult({ ok: false, msg });
        fail(new Error(msg));
      }
    } catch (e) {
      setResult({
        ok: false,
        msg: e instanceof Error ? e.message : String(e),
      });
      fail(e);
    } finally {
      setBusy(false);
    }
  };

  const resetDemo = async () => {
    try {
      await api.resetDemo();
      flash("Data demo direset.");
      window.setTimeout(() => window.location.reload(), 800);
    } catch (e) {
      fail(e);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border-2 border-rose-200 bg-rose-50/50 p-6">
          <h3 className="font-extrabold text-rose-800">Hapus Semua Suara</h3>
          <p className="mt-1 text-sm text-rose-700">
          Menghapus seluruh suara yang masuk dan mengembalikan semua pemilih ke
          status <b>belum vote</b>. Tindakan ini tidak dapat dibatalkan.
        </p>
        <form
          className="mt-4 flex flex-wrap items-center gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (confirmOk) void resetAll();
          }}
        >
          <label htmlFor="konfirmasi-reset" className="sr-only">
            Ketik RESET untuk mengonfirmasi penghapusan semua suara
          </label>
          <input
            id="konfirmasi-reset"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder='Ketik "RESET" untuk konfirmasi'
            autoComplete="off"
            className="min-w-[200px] flex-1 rounded-xl border border-rose-300 bg-white px-4 py-2.5 text-sm uppercase outline-none focus:border-rose-500"
          />
          <button
            type="submit"
            disabled={!confirmOk || busy}
            className="rounded-xl bg-rose-600 px-6 py-2.5 text-sm font-bold text-white shadow-md shadow-rose-200 hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? "Menghapus..." : "Hapus Semua Suara"}
          </button>
        </form>
        {result && (
          <p
            role="status"
            className={`mt-3 rounded-xl border px-4 py-3 text-sm font-semibold ${
              result.ok
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-rose-300 bg-rose-100 text-rose-800"
            }`}
          >
            {result.msg}
          </p>
        )}
      </div>

      {isDemoMode && (
        <div className="rounded-2xl border border-brand-wash bg-brand-wash p-6">
          <h3 className="font-extrabold text-brand-deep">Reset Data Demo</h3>
          <p className="mt-1 text-sm text-neutral-800">
            Kembalikan seluruh data demo (kandidat, pemilih, suara, pengaturan)
            ke kondisi awal.
          </p>
          <button
            onClick={resetDemo}
            className="mt-4 rounded-full bg-brand px-6 py-2.5 text-sm font-bold text-brand-ink shadow-brand hover:bg-brand-hover"
          >
            Reset Data Demo
          </button>
        </div>
      )}
    </div>
  );
}

// ------------------------------- UTIL UI ------------------------------------

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const headingId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    panelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:items-center">
      <button
        type="button"
        aria-label="Tutup"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-neutral-900/50 backdrop-blur-sm"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        tabIndex={-1}
        className="fade-up relative my-4 w-full max-w-2xl rounded-3xl bg-white p-7 shadow-2xl focus:outline-none"
      >
        <div className="flex items-center justify-between">
          <h2 id={headingId} className="text-xl font-extrabold text-neutral-900">
            {title}
          </h2>
          <button
            type="button"
            aria-label="Tutup"
            onClick={onClose}
            className="press flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100 hover:text-neutral-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-dark"
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-5">{children}</div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-sm font-semibold text-neutral-700">
        {label}
      </span>
      {children}
    </label>
  );
}


