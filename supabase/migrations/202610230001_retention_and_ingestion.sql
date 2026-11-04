-- Keep admission evidence for the hourly window while removing guest content.
create or replace function public.purge_expired_data() returns void
language plpgsql security definer set search_path='' as $$
declare t text;
begin
 foreach t in array array['memories','messages','notes','tasks','reminders','documents','tool_events'] loop
  execute format('delete from public.%I r using public.sessions s where r.session_id=s.id and s.mode=''anonymous'' and (s.expires_at<=now() or s.ended_at is not null)',t);
 end loop;
 delete from public.user_settings u where exists (
  select 1 from auth.users a where a.id=u.user_id and a.is_anonymous
 ) and not exists (
  select 1 from public.sessions s where s.user_id=u.user_id and s.expires_at>now() and s.ended_at is null
 );
 -- The worker also deletes checkpoints on exit. This covers crashed workers.
 foreach t in array array['checkpoint_writes','checkpoint_blobs','checkpoints'] loop
  if to_regclass('recall_private.'||t) is not null then
   execute format('delete from recall_private.%I c where not exists (select 1 from public.sessions s where c.thread_id=s.user_id::text||'':''||s.id::text and s.expires_at>now() and s.ended_at is null)',t);
  end if;
 end loop;
 delete from public.sessions where mode='anonymous' and created_at<=now()-interval '1 hour' and (expires_at<=now() or ended_at is not null);
 delete from public.sessions where created_at<now()-interval '90 days';
 delete from public.memories where expires_at<now();
end $$;

-- Serialize uploads for each owner so concurrent requests cannot exceed the cap.
create function public.ingest_document(p_user_id uuid,p_title text,p_content text)
returns integer language plpgsql security definer set search_path='' as $$
declare sid uuid; chunks integer; existing integer; i integer;
begin
 perform 1 from auth.users where id=p_user_id and not coalesce(is_anonymous,true) for update;
 if not found then raise exception 'invalid_user'; end if;
 if p_title is null or length(p_title) not between 1 and 200 or p_content is null or length(p_content) not between 1 and 16000 then raise exception 'invalid_document'; end if;
 select id into sid from public.sessions where user_id=p_user_id and mode='authenticated' and ended_at is null and expires_at>now() order by created_at desc limit 1;
 if sid is null then raise exception 'session_required'; end if;
 chunks := (length(p_content)+999)/1000;
 select count(*) into existing from public.documents where user_id=p_user_id;
 if existing+chunks>100 then raise exception 'storage_limit'; end if;
 for i in 0..chunks-1 loop
  insert into public.documents(user_id,session_id,title,content) values(p_user_id,sid,p_title,substring(p_content from i*1000+1 for 1200));
 end loop;
 return chunks;
end $$;
revoke all on function public.ingest_document(uuid,text,text) from public,anon,authenticated;
grant execute on function public.ingest_document(uuid,text,text) to service_role;
