-- =====================================================================
--  PUSTAKA REFERENSI MTA — PENGATURAN SUPABASE
--  Jalankan SEKALI di Supabase: menu SQL Editor → New query → tempel → Run.
--  Aman dijalankan ulang (tidak menghapus data yang sudah ada).
--
--  Yang dibuat:
--   • tabel brosur          : data setiap brosur PDF (judul, tanggal, nomor, file)
--   • tabel brosur_halaman  : teks hasil ekstraksi, satu baris per halaman
--   • tabel upload_log      : riwayat unggah / ubah / hapus
--   • tabel admins          : daftar akun yang boleh mengubah data
--   • bucket brosur-pdf     : tempat file PDF asli (bisa dibaca publik)
--   • aturan keamanan (RLS) : semua orang boleh membaca, hanya admin yang boleh mengubah
-- =====================================================================

-- ---------- Tabel ----------
create table if not exists public.admins (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  email       text,
  dibuat      timestamptz not null default now()
);

create table if not exists public.brosur (
  id                text primary key,                 -- contoh: p20261025-2282
  nama_file         text not null,
  judul             text not null,
  tanggal           date,                             -- tanggal Ahad
  keterangan_tanggal text,                            -- contoh: Ahad, 25 Oktober 2026 / 14 Jumaadal Uulaa 1448
  nomor             text,                             -- contoh: 2282/2322/IA
  jumlah_halaman    int not null default 0,
  ukuran            bigint not null default 0,        -- ukuran file PDF (byte)
  sha256            text unique,                      -- sidik file untuk mendeteksi duplikat
  storage_path      text not null,                    -- lokasi file di bucket brosur-pdf
  status            text not null default 'aktif' check (status in ('aktif', 'arsip')),
  diunggah_oleh     text,
  dibuat            timestamptz not null default now(),
  diubah            timestamptz not null default now()
);
create index if not exists brosur_diubah_idx on public.brosur (diubah);

create table if not exists public.brosur_halaman (
  doc_id   text not null references public.brosur(id) on delete cascade,
  halaman  int  not null,
  blocks   jsonb not null default '[]'::jsonb,         -- paragraf hasil ekstraksi: [[jenis, teks, halaman], ...]
  teks     text,                                       -- teks polos halaman ini
  primary key (doc_id, halaman)
);

create table if not exists public.upload_log (
  id        bigint generated always as identity primary key,
  doc_id    text,
  nama_file text,
  aksi      text not null,      -- unggah | ubah | hapus
  status    text not null,      -- berhasil | gagal
  pesan     text,
  oleh      text,
  dibuat    timestamptz not null default now()
);
create index if not exists upload_log_dibuat_idx on public.upload_log (dibuat desc);

-- ---------- Waktu "diubah" otomatis ----------
create or replace function public.set_diubah() returns trigger
language plpgsql as $$
begin
  new.diubah = now();
  return new;
end $$;
drop trigger if exists brosur_set_diubah on public.brosur;
create trigger brosur_set_diubah before update on public.brosur
  for each row execute function public.set_diubah();

-- ---------- Siapa admin ----------
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

-- ---------- Aturan keamanan (Row Level Security) ----------
alter table public.admins          enable row level security;
alter table public.brosur          enable row level security;
alter table public.brosur_halaman  enable row level security;
alter table public.upload_log      enable row level security;

drop policy if exists "admin lihat diri sendiri" on public.admins;
create policy "admin lihat diri sendiri" on public.admins
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "semua baca brosur aktif" on public.brosur;
create policy "semua baca brosur aktif" on public.brosur
  for select using (status = 'aktif' or public.is_admin());
drop policy if exists "admin tambah brosur" on public.brosur;
create policy "admin tambah brosur" on public.brosur
  for insert to authenticated with check (public.is_admin());
drop policy if exists "admin ubah brosur" on public.brosur;
create policy "admin ubah brosur" on public.brosur
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admin hapus brosur" on public.brosur;
create policy "admin hapus brosur" on public.brosur
  for delete to authenticated using (public.is_admin());

drop policy if exists "semua baca halaman" on public.brosur_halaman;
create policy "semua baca halaman" on public.brosur_halaman
  for select using (exists (select 1 from public.brosur b where b.id = doc_id and (b.status = 'aktif' or public.is_admin())));
drop policy if exists "admin tambah halaman" on public.brosur_halaman;
create policy "admin tambah halaman" on public.brosur_halaman
  for insert to authenticated with check (public.is_admin());
drop policy if exists "admin ubah halaman" on public.brosur_halaman;
create policy "admin ubah halaman" on public.brosur_halaman
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admin hapus halaman" on public.brosur_halaman;
create policy "admin hapus halaman" on public.brosur_halaman
  for delete to authenticated using (public.is_admin());

drop policy if exists "admin baca log" on public.upload_log;
create policy "admin baca log" on public.upload_log
  for select to authenticated using (public.is_admin());
drop policy if exists "admin tulis log" on public.upload_log;
create policy "admin tulis log" on public.upload_log
  for insert to authenticated with check (public.is_admin());

-- ---------- Hak dasar per peran ----------
grant usage on schema public to anon, authenticated;
grant select on public.brosur, public.brosur_halaman to anon, authenticated;
grant insert, update, delete on public.brosur, public.brosur_halaman to authenticated;
grant select, insert on public.upload_log to authenticated;
grant select on public.admins to authenticated;
grant execute on function public.is_admin() to anon, authenticated;

-- ---------- Statistik untuk panel admin ----------
create or replace function public.pustaka_stats() returns json
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'Khusus admin';
  end if;
  return json_build_object(
    'db_bytes',  pg_database_size(current_database()),
    'pdf_bytes', (select coalesce(sum(ukuran), 0) from public.brosur),
    'docs',      (select count(*) from public.brosur),
    'pages',     (select count(*) from public.brosur_halaman)
  );
end $$;
revoke all on function public.pustaka_stats() from public;
grant execute on function public.pustaka_stats() to authenticated;

-- ---------- Tempat file PDF (Storage) ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('brosur-pdf', 'brosur-pdf', true, 20971520, array['application/pdf'])
on conflict (id) do update
  set public = true, file_size_limit = 20971520, allowed_mime_types = array['application/pdf'];

drop policy if exists "brosur-pdf admin lihat" on storage.objects;
create policy "brosur-pdf admin lihat" on storage.objects
  for select to authenticated using (bucket_id = 'brosur-pdf' and public.is_admin());
drop policy if exists "brosur-pdf admin unggah" on storage.objects;
create policy "brosur-pdf admin unggah" on storage.objects
  for insert to authenticated with check (bucket_id = 'brosur-pdf' and public.is_admin());
drop policy if exists "brosur-pdf admin ubah" on storage.objects;
create policy "brosur-pdf admin ubah" on storage.objects
  for update to authenticated using (bucket_id = 'brosur-pdf' and public.is_admin());
drop policy if exists "brosur-pdf admin hapus" on storage.objects;
create policy "brosur-pdf admin hapus" on storage.objects
  for delete to authenticated using (bucket_id = 'brosur-pdf' and public.is_admin());

-- ---------- Jadikan akun yang sudah dibuat sebagai admin ----------
-- Buat dulu akun admin di menu Authentication → Users → Add user, lalu jalankan file ini.
-- Baris di bawah memasukkan SEMUA akun yang ada saat ini ke daftar admin.
insert into public.admins (user_id, email)
select id, email from auth.users
on conflict (user_id) do nothing;

-- Selesai. Di bawah akan muncul tabel kecil: "Pengaturan Pustaka Referensi MTA selesai" dan jumlah_admin (minimal 1).
select 'Pengaturan Pustaka Referensi MTA selesai' as hasil, (select count(*) from public.admins) as jumlah_admin;
