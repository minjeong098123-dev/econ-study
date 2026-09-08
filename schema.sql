-- 경제소학회 스터디 홈페이지 — Supabase 설정
--
-- Supabase 대시보드 왼쪽 메뉴에서 SQL Editor 를 열고, 이 파일을 통째로 붙여넣은 뒤 Run 하세요.
-- 표 7개와 파일 저장소가 한 번에 만들어집니다. 여러 번 실행해도 괜찮습니다.
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
  link       text default '',
  file_id    text,
  file_name  text
);
-- 이미 만들어 둔 표에도 링크 칸을 붙입니다
alter table notice add column if not exists link text default '';

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

-- repeat 는 '' | 'weekly' | 'biweekly' | 'monthly'.
-- repeat_until 이 비어 있으면 끝없이 반복합니다.
-- skips 는 '이 날만 빼기'로 건너뛴 날짜들입니다. 예: ["2026-09-15"]
create table if not exists schedule (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  "date"       text not null,
  "time"       text default '',
  title        text not null,
  repeat       text default '',
  repeat_until text default '',
  skips        jsonb not null default '[]'::jsonb
);
-- 이미 만들어 둔 표에도 반복 칸을 붙입니다
alter table schedule add column if not exists repeat text default '';
alter table schedule add column if not exists repeat_until text default '';
alter table schedule add column if not exists skips jsonb not null default '[]'::jsonb;

-- 주차별 발표자 배정 결과. map 은 { "주제키": "이름" } 모양입니다.
create table if not exists presentation (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  week       text not null unique,
  map        jsonb not null default '{}'::jsonb
);

-- 회의록. attendees 는 참석자 이름 목록입니다. 예: ["김민정","곽병서"]
create table if not exists minutes (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  "date"     text not null,
  title      text not null,
  attendees  jsonb not null default '[]'::jsonb,
  body       text default '',
  file_id    text,
  file_name  text
);

-- 스터디원 명단. 홈페이지의 '명단 관리' 화면에서 고칩니다.
create table if not exists member (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name       text not null unique
);

-- 처음 한 번만 채워 넣습니다 (이미 있으면 건너뜁니다)
insert into member (name) values
  ('김민정'), ('김민성'), ('김초원'), ('신기현'), ('곽병서')
on conflict (name) do nothing;

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
alter table minutes      enable row level security;
alter table member       enable row level security;

drop policy if exists "누구나" on notice;
drop policy if exists "누구나" on info;
drop policy if exists "누구나" on news;
drop policy if exists "누구나" on schedule;
drop policy if exists "누구나" on presentation;
drop policy if exists "누구나" on minutes;
drop policy if exists "누구나" on member;

create policy "누구나" on notice       for all to anon, authenticated using (true) with check (true);
create policy "누구나" on info         for all to anon, authenticated using (true) with check (true);
create policy "누구나" on news         for all to anon, authenticated using (true) with check (true);
create policy "누구나" on schedule     for all to anon, authenticated using (true) with check (true);
create policy "누구나" on presentation for all to anon, authenticated using (true) with check (true);
create policy "누구나" on minutes      for all to anon, authenticated using (true) with check (true);
create policy "누구나" on member       for all to anon, authenticated using (true) with check (true);

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
