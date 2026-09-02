-- ============================================================
-- GOAL-IA CONTENT ENGINE — Schéma Supabase (PRD §14/§29/§30)
-- À EXÉCUTER dans le SQL Editor de Supabase (Dashboard → SQL Editor).
-- Les fichiers lourds restent dans Cloudflare R2 ; cette table porte
-- les MÉTADONNÉES (PRD §30 : Supabase = mémoire, R2 = coffre-fort).
-- ============================================================

create extension if not exists "pgcrypto";

-- Fichiers / rendus (voix off, vidéos finales, previews, exports)
create table if not exists public.files (
  id           uuid primary key default gen_random_uuid(),
  content_key  text not null unique,        -- chemin R2 : content/AAAA/MM/JJ/REF/final.mp4
  kind         text not null default 'other', -- voice | video | preview | image | audio | other
  file_name    text not null,
  size_bytes   bigint not null default 0,
  content_type text not null default 'application/octet-stream',
  status       text not null default 'UPLOADED', -- PRD §15 : UPLOADED, READY_FOR_APPROVAL…
  version      int  not null default 1,
  sha256       text,
  bucket       text not null default 'r2',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists files_kind_idx on public.files (kind);
create index if not exists files_status_idx on public.files (status);
create index if not exists files_created_idx on public.files (created_at desc);

-- Contenus (rattachement futur script → fichier final, PRD §29)
create table if not exists public.content (
  id          uuid primary key default gen_random_uuid(),
  ref         text not null unique,         -- CONTENT-20260901-001
  title       text,
  status      text not null default 'DRAFT', -- PRD §15 : DRAFT → PRODUCING → … → PUBLISHED
  file_id     uuid references public.files (id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Aide : activer le « Realtime » si besoin plus tard ; ici non requis.
