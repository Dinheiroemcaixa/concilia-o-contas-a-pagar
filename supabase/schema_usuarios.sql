-- Execute no Supabase: Dashboard → SQL Editor → New query → cole → Run

create table if not exists usuarios (
  id            bigint generated always as identity primary key,
  nome          text not null,
  usuario       text not null unique,
  senha_hash    text not null,
  criado_em     timestamptz not null default now()
);

create index if not exists idx_usuarios_usuario on usuarios (usuario);

alter table usuarios enable row level security;

create policy "service_role full access" on usuarios
  for all using (true);
