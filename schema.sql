-- 경제소학회 스터디 홈페이지 — Supabase 설정
--
-- Supabase 대시보드 왼쪽 메뉴에서 SQL Editor 를 열고, 이 파일을 통째로 붙여넣은 뒤 Run 하세요.
-- 표 5개와 파일 저장소가 한 번에 만들어집니다. 여러 번 실행해도 괜찮습니다.
--
-- file_id 는 저장소에 올린 파일의 경로입니다. file_name 은 올릴 때의 원래 이름입니다.
-- date/time 은 '2026-09-01', '19:30' 처럼 글자로 넣습니다.
-- (종일 일정은 time 이 빈 글자라서 시간 자료형을 쓰지 않습니다.)

-- ── 표 ──────────────────────────────────────

create table if not exists notice (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  title      text not null,
  body       text default '',
  file_id    text,
  file_name  text
);

create table if not exists info (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  title      text not null,
  body       text default '',
  link       text default '',
  file_id    text,
  file_name  text
);

create table if not exists news (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  "date"     text not null,
  author     text not null,
  title      text not null,
  memo       text default '',
  t1         text default '',
  t2         text default '',
  file_id    text,
  file_name  text
);

create table if not exists schedule (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  "date"     text not null,
  "time"     text default '',
  title      text not null
);

-- 주차별 발표자 배정 결과. map 은 { "주제키": "이름" } 모양입니다.
create table if not exists presentation (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  week       text not null unique,
  map        jsonb not null default '{}'::jsonb
);

-- ── 권한 ────────────────────────────────────
--
-- 로그인 기능이 없어서, 주소를 아는 사람은 누구나 읽고 쓰고 지울 수 있습니다.
-- 스터디원끼리 주소를 공유해 쓰는 용도입니다.
-- 나중에 로그인을 붙이면 아래 'anon,' 을 지워 authenticated 만 남기면 됩니다.

alter table notice       enable row level security;
alter table info         enable row level security;
alter table news         enable row level security;
alter table schedule     enable row level security;
alter table presentation enable row level security;

drop policy if exists "누구나" on notice;
drop policy if exists "누구나" on info;
drop policy if exists "누구나" on news;
drop policy if exists "누구나" on schedule;
drop policy if exists "누구나" on presentation;

create policy "누구나" on notice       for all to anon, authenticated using (true) with check (true);
create policy "누구나" on info         for all to anon, authenticated using (true) with check (true);
create policy "누구나" on news         for all to anon, authenticated using (true) with check (true);
create policy "누구나" on schedule     for all to anon, authenticated using (true) with check (true);
create policy "누구나" on presentation for all to anon, authenticated using (true) with check (true);

-- ── 파일 저장소 ─────────────────────────────

insert into storage.buckets (id, name, public)
values ('study-files', 'study-files', true)
on conflict (id) do update set public = true;

drop policy if exists "파일 보기"   on storage.objects;
drop policy if exists "파일 올리기" on storage.objects;
drop policy if exists "파일 지우기" on storage.objects;

create policy "파일 보기" on storage.objects
  for select to anon, authenticated using (bucket_id = 'study-files');

create policy "파일 올리기" on storage.objects
  for insert to anon, authenticated with check (bucket_id = 'study-files');

create policy "파일 지우기" on storage.objects
  for delete to anon, authenticated using (bucket_id = 'study-files');
