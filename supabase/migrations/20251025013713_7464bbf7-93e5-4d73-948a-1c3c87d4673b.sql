create extension if not exists vector;

create table if not exists public.manual_chunks (
  id uuid primary key default gen_random_uuid(),
  chapter text,
  page int,
  content text not null,
  embedding vector(1536),
  created_at timestamptz default now()
);

create index if not exists manual_chunks_embedding_idx
on public.manual_chunks
using hnsw (embedding vector_cosine_ops);

create or replace function public.match_manual_chunks(
  query_embedding vector(1536),
  match_count int default 8
)
returns table(
  id uuid,
  content text,
  chapter text,
  page int,
  similarity float
)
language sql stable as $$
  select
    mc.id,
    mc.content,
    mc.chapter,
    mc.page,
    1 - (mc.embedding <=> query_embedding) as similarity
  from public.manual_chunks mc
  where mc.embedding is not null
  order by mc.embedding <=> query_embedding
  limit match_count;
$$;

alter table public.manual_chunks enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where tablename = 'manual_chunks' and policyname = 'Allow read to all users'
  ) then
    create policy "Allow read to all users"
      on public.manual_chunks
      for select
      to public
      using (true);
  end if;
end$$;