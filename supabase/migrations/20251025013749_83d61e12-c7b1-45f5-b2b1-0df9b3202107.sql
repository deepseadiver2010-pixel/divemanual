-- Fix search_path security for match_manual_chunks function
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
language sql stable
security definer
set search_path = public
as $$
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