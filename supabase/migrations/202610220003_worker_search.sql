-- Worker-only search. Server supplies owner/session from the admitted session.
create function public.worker_search(p_user_id uuid,p_session_id uuid,p_kind text,p_vector extensions.vector(384))
returns jsonb language plpgsql security definer set search_path=public,extensions as $$
declare mode text; result jsonb; begin
 select s.mode into mode from public.sessions s where s.id=p_session_id and s.user_id=p_user_id and s.ended_at is null and s.expires_at>now();
 if mode is null then raise exception 'invalid_session'; end if;
 if p_kind='memories' then
  select coalesce(jsonb_agg(to_jsonb(found)-'embedding'),'[]'::jsonb) into result from (
   select m.* from public.memories m where m.user_id=p_user_id and (mode='authenticated' or m.session_id=p_session_id)
    and m.embedding is not null and m.superseded_by is null and (m.expires_at is null or m.expires_at>now())
   order by m.embedding <=> p_vector limit 8
  ) found;
 elsif p_kind='documents' then
  select coalesce(jsonb_agg(to_jsonb(found)-'embedding'),'[]'::jsonb) into result from (
   select d.* from public.documents d where d.user_id=p_user_id and (mode='authenticated' or d.session_id=p_session_id)
    and d.embedding is not null order by d.embedding <=> p_vector limit 5
  ) found;
 else raise exception 'invalid_kind'; end if;
 return result;
end $$;
revoke all on function public.worker_search(uuid,uuid,text,extensions.vector) from public,anon,authenticated;
grant execute on function public.worker_search(uuid,uuid,text,extensions.vector) to service_role;
