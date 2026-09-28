-- ============================================================================
--  Kembalikan role dari check_voter
--  Migration ini menambahkan kolom role ke hasil check_voter supaya aplikasi
--  bisa menulis label "NIP" untuk guru dan "NISN" untuk siswa di bilik suara.
--
--  Catatan: sisi klien sudah aman bila migration ini belum dijalankan.
--  Respons RPC hanya berisi kolom yang ada, jadi billing ke field role akan
--  kosong dan label jatuh ke "NISN" seperti sebelumnya.
-- ============================================================================

drop function if exists public.check_voter(p_nis text, p_password text);

create function public.check_voter(p_nis text, p_password text)
returns table(name text, class_name text, has_voted boolean, role text)
language plpgsql stable security definer set search_path = public
as $$
begin
  return query
    select v.name, v.class_name, v.has_voted, v.role
    from public.voters v
    where (
      (v.role = 'siswa' and v.nis = p_nis)
      or (v.role = 'guru' and v.nip is not null and v.nip = p_nis)
    )
      and crypt(coalesce(p_password, ''), v.password_hash) = v.password_hash
    limit 1;
end;
$$;

-- Verifikasi manual setelah dijalankan (isi NIP asli guru, jangan tuliskan
-- NIP nyata di berkas yang masuk Git):
--   select * from public.check_voter('<NIP>', '<NIP>');
-- harus keluar satu baris dengan role = 'guru'.
