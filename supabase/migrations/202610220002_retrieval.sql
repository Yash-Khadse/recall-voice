alter table public.memories add column key text check(length(key)<=100);

-- SECURITY INVOKER keeps RLS effective for any direct authenticated invocation.
create function public.search_memories(query_embedding extensions.vector(384), match_count integer default 8)
returns table(id uuid,content text,type text,score double precision)
language sql stable security invoker set search_path=public,extensions as $$
 select m.id,m.content,m.type,
   (1-(m.embedding <=> query_embedding))*.8 + m.importance*.15 +
   (.05/(1+extract(epoch from now()-m.updated_at)/86400)) as score
 from public.memories m
 where m.user_id=(select auth.uid()) and m.embedding is not null
   and m.superseded_by is null and (m.expires_at is null or m.expires_at>now())
 order by score desc limit least(greatest(match_count,1),20);
$$;
revoke all on function public.search_memories(extensions.vector,integer) from public,anon;
grant execute on function public.search_memories(extensions.vector,integer) to authenticated;

-- Checkpoints contain private prompt data. Use this schema in the worker's DB connection.
create schema if not exists recall_private;
revoke all on schema recall_private from public,anon,authenticated;
alter default privileges in schema recall_private revoke all on tables from public,anon,authenticated;

-- Enable pg_cron in the Supabase dashboard and schedule this manually once:
-- select cron.schedule('recall-retention','*/5 * * * *','select public.purge_expired_data()');
-- Never delete auth.users in this job: identities may also own authenticated data.
