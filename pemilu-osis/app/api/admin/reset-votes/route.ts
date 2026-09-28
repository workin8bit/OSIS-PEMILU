/**
 * Hapus semua suara + reset status memilih.
 *
 * Jalur ini sengaja memakai service-role key di server, bukan RPC
 * `admin_reset_votes` yang berbasis `truncate`:
 *
 *   1. service role bypassing RLS, jadi tidak bergantung pada hak TRUNCATE
 *      atau TRUNCATE yang terkunci oleh foreign key;
 *   2. PostgREST membalas jumlah baris yang benar-benar terpengaruh, jadi
 *      klien bisa menampilkan angka nyata, bukan sekadar "sukses" buta;
 *   3. kredensial admin tetap wajib: username + kunci dicek lebih dulu lewat
 *      RPC `admin_stats` (security definer, sudah ada di database). Salah satu
 *      tidak cocok -> 401 dan tidak ada satu baris pun yang tersentuh.
 *
 * Service-role key hanya dibaca di server dan tidak pernah dikirim ke klien.
 */
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function POST(req: Request) {
  if (!URL || !ANON || !SERVICE) {
    return NextResponse.json(
      { error: "Server belum dikonfigurasi (kunci Supabase tidak ada)." },
      { status: 500 },
    );
  }

  let body: { username?: unknown; key?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Permintaan tidak valid." }, { status: 400 });
  }
  const username = typeof body.username === "string" ? body.username.trim() : "";
  const key = typeof body.key === "string" ? body.key : "";
  if (!username || !key || username.length > 64 || key.length > 128) {
    return NextResponse.json({ error: "Kredensial admin tidak lengkap." }, { status: 400 });
  }

  // Gerbang kredensial: RPC yang sama dipakai_panel admin untuk membuka sesi.
  const anon = createClient(URL, ANON, { auth: { persistSession: false } });
  const { error: cek } = await anon.rpc("admin_stats", {
    p_username: username,
    p_key: key,
  });
  if (cek) {
    return NextResponse.json({ error: "Kunci admin salah." }, { status: 401 });
  }

  const db = createClient(URL, SERVICE, { auth: { persistSession: false } });

  // Dihitung lebih dulu supaya angka yang dilaporkan benar-benar berasal dari
  // database, bukan tebakan sisi klien.
  const sebelumSuara = await db
    .from("votes")
    .select("id", { count: "exact", head: true });
  if (sebelumSuara.error) {
    return NextResponse.json(
      { error: `Gagal menghitung suara: ${sebelumSuara.error.message}` },
      { status: 500 },
    );
  }
  const sebelumVoted = await db
    .from("voters")
    .select("id", { count: "exact", head: true })
    .eq("has_voted", true);
  if (sebelumVoted.error) {
    return NextResponse.json(
      { error: `Gagal menghitung status pemilih: ${sebelumVoted.error.message}` },
      { status: 500 },
    );
  }

  const hapus = await db.from("votes").delete().gt("id", 0);
  if (hapus.error) {
    return NextResponse.json(
      { error: `Gagal menghapus suara: ${hapus.error.message}` },
      { status: 500 },
    );
  }

  const reset = await db
    .from("voters")
    .update({ has_voted: false })
    .eq("has_voted", true);
  if (reset.error) {
    return NextResponse.json(
      { error: `Suara terhapus, tetapi reset status pemilih gagal: ${reset.error.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json(
    {
      ok: true,
      deleted: sebelumSuara.count ?? 0,
      reset: sebelumVoted.count ?? 0,
    },
    { headers: { "cache-control": "no-store" } },
  );
}
