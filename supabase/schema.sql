-- Execute este SQL no painel do Supabase:
-- Dashboard → SQL Editor → New query → cole este conteúdo → Run

create table if not exists importacoes (
  id            bigint generated always as identity primary key,
  empresa       text not null,
  total_contas  integer not null default 0,
  total_valor   numeric(12,2) not null default 0,
  ok            integer not null default 0,
  erros         integer not null default 0,
  detalhes      jsonb,
  criado_em     timestamptz not null default now()
);

-- Índice para buscar por empresa e data
create index if not exists idx_importacoes_empresa   on importacoes (empresa);
create index if not exists idx_importacoes_criado_em on importacoes (criado_em desc);

-- Política de segurança (Row Level Security)
alter table importacoes enable row level security;

-- Permite acesso total via service_role (usado pelo backend)
create policy "service_role full access" on importacoes
  for all using (true);
