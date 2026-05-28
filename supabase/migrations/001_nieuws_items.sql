-- Nieuws items tabel voor BD dashboard
-- Uitvoeren in: Supabase Dashboard → SQL Editor

create table if not exists public.nieuws_items (
  id          uuid primary key default gen_random_uuid(),
  guid        text unique not null,          -- RSS guid, voorkomt duplicaten
  titel       text not null,
  url         text not null,
  samenvatting text,
  bron        text not null default 'PropertyNL',
  gepubliceerd timestamptz not null,
  aangemaakt  timestamptz not null default now(),

  -- Classificatie (ingevuld door Edge Function)
  categorie   text,                          -- 'transactie' | 'huurprijs' | 'ontwikkeling' | 'bedrijf' | 'overig'
  stad        text[],                        -- ['rotterdam', 'eindhoven'] — kan beide bevatten
  relevant    boolean not null default true  -- false = gefilterd maar bewaard voor audit
);

-- Realtime inschakelen voor live push naar dashboard
alter publication supabase_realtime add table public.nieuws_items;

-- Index voor snelle queries
create index if not exists nieuws_items_gepubliceerd_idx on public.nieuws_items (gepubliceerd desc);
create index if not exists nieuws_items_stad_idx on public.nieuws_items using gin (stad);

-- Leesbaarheid voor anonieme gebruikers (anon key)
alter table public.nieuws_items enable row level security;
create policy "publiek leesbaar" on public.nieuws_items
  for select using (true);
