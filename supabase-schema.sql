-- ============================================================
-- RACHA DOS AMIGOS — supabase-schema.sql
-- ============================================================
-- Rode este arquivo inteiro de uma vez em:
-- Supabase > SQL Editor > New query > colar tudo > Run
--
-- O que este arquivo cria:
--   1. Tabelas (temporadas, jogadores, partidas, partida_jogadores)
--   2. Views de ranking (calculadas na hora, nunca guardadas)
--   3. RLS (Row Level Security): qualquer pessoa PODE LER,
--      só admin logado (Supabase Auth) PODE ESCREVER
--
-- Pode rodar de novo sem medo: os "IF NOT EXISTS" e "OR REPLACE"
-- evitam erro de "já existe" se você rodar duas vezes.
-- ============================================================


-- ============================================================
-- 1. TABELA: temporadas
-- ============================================================
create table if not exists temporadas (
  id            bigint generated always as identity primary key,
  ano           integer not null unique,
  nome          text not null,              -- ex: "Temporada 2026"
  ativa         boolean not null default false,
  data_inicio   date,
  data_fim      date,
  criado_em     timestamptz not null default now()
);

comment on table temporadas is 'Cada temporada do racha (ex: 2025, 2026...). Só uma deve estar ativa=true por vez — isso é responsabilidade do admin.js, não do banco.';


-- ============================================================
-- 2. TABELA: jogadores
-- ============================================================
create table if not exists jogadores (
  id            bigint generated always as identity primary key,
  nome          text not null,
  apelido       text,                       -- ex: "Diegão" (opcional)
  posicao       text not null check (posicao in ('linha', 'goleiro')),
  ativo         boolean not null default true,
  criado_em     timestamptz not null default now()
);

comment on table jogadores is 'Cadastro geral de jogadores. Um jogador existe independente de temporada — as estatísticas por temporada vêm de partida_jogadores + partidas.temporada_id.';
comment on column jogadores.posicao is 'linha = jogador de linha (mostra gols/assistências). goleiro = mostra defesas também.';


-- ============================================================
-- 3. TABELA: partidas
-- ============================================================
create table if not exists partidas (
  id              bigint generated always as identity primary key,
  temporada_id    bigint not null references temporadas(id) on delete restrict,
  rodada          integer not null,
  data            date not null,
  placar_verde    integer not null default 0,
  placar_preto    integer not null default 0,
  campeao         text check (campeao in ('verde', 'preto', 'empate')),
  criado_em       timestamptz not null default now(),

  unique (temporada_id, rodada)
);

comment on table partidas is 'Uma partida = uma rodada. Times são sempre "Colete Verde" vs "Colete Preto" (cores fixas do projeto). O campo campeao é preenchido automaticamente pelo registrar-partida.js comparando os placares — não precisa digitar manualmente.';


-- ============================================================
-- 4. TABELA: partida_jogadores (o coração do sistema)
-- ============================================================
-- Uma linha = um jogador, em uma partida específica, com suas
-- estatísticas daquele jogo. TODOS os rankings são somados
-- a partir desta tabela — nada de estatística "solta" duplicada.
-- ============================================================
create table if not exists partida_jogadores (
  id                  bigint generated always as identity primary key,
  partida_id          bigint not null references partidas(id) on delete cascade,
  jogador_id          bigint not null references jogadores(id) on delete restrict,
  time                text not null check (time in ('verde', 'preto')),

  gols                integer not null default 0,
  assistencias        integer not null default 0,
  defesas             integer not null default 0,   -- só relevante se o jogador é goleiro

  selecao_rodada      boolean not null default false, -- foi 1 dos destaques (⭐) da rodada?
  melhor_goleiro      boolean not null default false, -- foi o goleiro destaque (🥇) da rodada?

  unique (partida_id, jogador_id)
);

comment on table partida_jogadores is 'Estatísticas de um jogador em uma partida. jogos = COUNT(*) desta tabela por jogador. Toda a artilharia, assistências, títulos, seleções e defesas vêm daqui via SUM/COUNT nas views abaixo.';
comment on column partida_jogadores.melhor_goleiro is 'No máximo 1 jogador com true por partida — validado em registrar-partida.js, não no banco (mais simples de dar mensagem de erro amigável no front).';


-- ============================================================
-- ÍNDICES — deixam os rankings e o histórico rápidos
-- ============================================================
create index if not exists idx_partidas_temporada on partidas(temporada_id);
create index if not exists idx_pj_jogador on partida_jogadores(jogador_id);
create index if not exists idx_pj_partida on partida_jogadores(partida_id);


-- ============================================================
-- 5. VIEW: estatísticas agregadas por jogador (TEMPORADA ATUAL)
-- ============================================================
-- Esta é a view principal — jogador.html, jogadores.html e
-- todos os rankings.html leem daqui. Sempre filtrada pela
-- temporada marcada como ativa=true.
-- ============================================================
create or replace view vw_estatisticas_jogador as
select
  j.id                                            as jogador_id,
  j.nome,
  j.apelido,
  j.posicao,
  j.ativo,
  t.id                                             as temporada_id,
  t.ano                                            as temporada_ano,
  count(pj.id)                                     as jogos,
  coalesce(sum(pj.gols), 0)                        as gols,
  coalesce(sum(pj.assistencias), 0)                as assistencias,
  coalesce(sum(pj.defesas), 0)                     as defesas,
  count(*) filter (where pj.selecao_rodada)        as selecoes,
  count(*) filter (where pj.melhor_goleiro)        as melhor_goleiro_qtd,
  count(*) filter (
    where (pj.time = 'verde' and p.campeao = 'verde')
       or (pj.time = 'preto' and p.campeao = 'preto')
  )                                                 as titulos,
  case when count(pj.id) > 0
    then round(coalesce(sum(pj.gols), 0)::numeric / count(pj.id), 2)
    else 0
  end                                               as media_gols
from jogadores j
join temporadas t on t.ativa = true
left join partida_jogadores pj on pj.jogador_id = j.id
left join partidas p on p.id = pj.partida_id and p.temporada_id = t.id
group by j.id, j.nome, j.apelido, j.posicao, j.ativo, t.id, t.ano;

comment on view vw_estatisticas_jogador is 'Uma linha por jogador com todas as estatísticas já somadas, sempre da temporada ativa. Rankings (rankings.html) só precisam fazer ORDER BY na coluna certa + LIMIT.';


-- ============================================================
-- 6. VIEW: resumo geral da temporada ativa (para temporada.html)
-- ============================================================
create or replace view vw_resumo_temporada as
select
  t.id                              as temporada_id,
  t.ano,
  t.nome,
  t.ativa,
  count(distinct p.id)              as total_partidas,
  coalesce(sum(p.placar_verde + p.placar_preto), 0) as total_gols,
  coalesce(sum(pj.assistencias), 0) as total_assistencias,
  coalesce(sum(pj.defesas), 0)      as total_defesas
from temporadas t
left join partidas p on p.temporada_id = t.id
left join partida_jogadores pj on pj.partida_id = p.id
group by t.id, t.ano, t.nome, t.ativa;


-- ============================================================
-- 7. ROW LEVEL SECURITY (RLS)
-- ============================================================
-- Regra do projeto: QUALQUER pessoa pode LER (site público).
-- Só admin autenticado (Supabase Auth) pode ESCREVER.
-- ============================================================

alter table temporadas enable row level security;
alter table jogadores enable row level security;
alter table partidas enable row level security;
alter table partida_jogadores enable row level security;

-- Leitura pública (site sem login) -----------------------------
create policy "leitura publica temporadas" on temporadas
  for select using (true);

create policy "leitura publica jogadores" on jogadores
  for select using (true);

create policy "leitura publica partidas" on partidas
  for select using (true);

create policy "leitura publica partida_jogadores" on partida_jogadores
  for select using (true);

-- Escrita só para admin logado ----------------------------------
create policy "escrita admin temporadas" on temporadas
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "escrita admin jogadores" on jogadores
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "escrita admin partidas" on partidas
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "escrita admin partida_jogadores" on partida_jogadores
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- Views herdam a segurança das tabelas de baixo — não precisa
-- (e não dá pra) habilitar RLS diretamente numa view.


-- ============================================================
-- 8. DADOS DE EXEMPLO (iguais aos que já estão no front-end)
-- ============================================================
-- Comentado de propósito. Quando você quiser popular o banco
-- com os mesmos dados de exemplo que aparecem no site agora
-- (Diego, Léo, Gui, Rafa, João, Pedro...), me avisa que eu
-- gero os INSERTs — assim você pode ver o site funcionando de
-- verdade com o Supabase antes de apagar tudo e cadastrar sua
-- galera real pelo painel do admin.
-- ============================================================