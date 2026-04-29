-- Execute este SQL no painel do Supabase:
-- Dashboard → SQL Editor → New query → cole este conteúdo → Run

create table if not exists sessoes (
  id            text primary key,
  access_token  text not null,
  refresh_token text,
  token_expiry  timestamptz,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

-- Expirar sessões antigas automaticamente
create index if not exists idx_sessoes_criado_em on sessoes (criado_em);

alter table sessoes enable row level security;

create policy "service_role full access" on sessoes
  for all using (true);
