-- Apply with Supabase CLI. Privileged RPCs are NEVER callable by browser roles.
create extension if not exists vector with schema extensions;

create table public.demo_limits (
 id boolean primary key default true check(id),
 duration_seconds integer not null default 180 check(duration_seconds between 30 and 300),
 concurrent_sessions integer not null default 3 check(concurrent_sessions between 1 and 20),
 sessions_per_hour integer not null default 3 check(sessions_per_hour between 1 and 20),
 monthly_minutes integer not null default 800 check(monthly_minutes between 0 and 1000),
 monthly_provider_requests integer not null default 2000 check(monthly_provider_requests >= 0),
 session_provider_requests integer not null default 40 check(session_provider_requests between 1 and 100)
);
insert into public.demo_limits(id) values(true);
create table public.sessions (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 room_name text not null unique, mode text not null check(mode in ('anonymous','authenticated')),
 language text not null default 'auto' check(language in ('auto','en','hi','te')),
 memory_consent boolean not null default false, ip_hash text not null,
 created_at timestamptz not null default now(), expires_at timestamptz not null, ended_at timestamptz,
 provider_requests integer not null default 0, unique(id,user_id)
);
create index sessions_admission on public.sessions(created_at,ip_hash,user_id);
create table public.monthly_usage (
 month date primary key, reserved_seconds integer not null default 0, provider_requests integer not null default 0
);
create table public.user_settings (
 user_id uuid primary key references auth.users(id) on delete cascade,
 language text not null default 'auto' check(language in ('auto','en','hi','te')),
 memory_consent boolean not null default false,
 theme text not null default 'system' check(theme in ('light','dark','system')),
 voice_preference text not null default 'browser' check(length(voice_preference)<=100)
);
create table public.memories (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
 session_id uuid not null, type text not null check(type in ('semantic','episodic','procedural')),
 content text not null check(length(content) between 1 and 4000), embedding extensions.vector(384),
 confidence real not null default 1 check(confidence between 0 and 1), importance real not null default 0.5 check(importance between 0 and 1),
 source text not null default 'explicit', created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 expires_at timestamptz, superseded_by uuid references public.memories(id) on delete set null,
 foreign key(session_id,user_id) references public.sessions(id,user_id) on delete cascade
);
create index memories_owner on public.memories(user_id,session_id);
create table public.messages (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 session_id uuid not null, role text not null check(role in ('user','assistant','tool','system')),
 content text not null check(length(content)<=16000), created_at timestamptz not null default now(),
 foreign key(session_id,user_id) references public.sessions(id,user_id) on delete cascade
);
create table public.notes (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 session_id uuid not null, content text not null check(length(content) between 1 and 8000),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 foreign key(session_id,user_id) references public.sessions(id,user_id) on delete cascade
);
create table public.tasks (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 session_id uuid not null, content text not null check(length(content) between 1 and 8000),
 status text not null default 'pending' check(status in ('pending','done')),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 foreign key(session_id,user_id) references public.sessions(id,user_id) on delete cascade
);
create table public.reminders (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 session_id uuid not null,content text not null check(length(content) between 1 and 8000),due_at timestamptz not null,
 status text not null default 'pending' check(status in ('pending','delivered')),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 foreign key(session_id,user_id) references public.sessions(id,user_id) on delete cascade
);
create table public.documents (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
 session_id uuid not null,title text not null check(length(title)<=200),content text not null check(length(content)<=16000),
 embedding extensions.vector(384),created_at timestamptz not null default now(),
 foreign key(session_id,user_id) references public.sessions(id,user_id) on delete cascade
);
create table public.tool_events (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
 session_id uuid not null,name text not null,result jsonb not null,created_at timestamptz not null default now(),
 foreign key(session_id,user_id) references public.sessions(id,user_id) on delete cascade
);

-- Only permanent users can read their persistent data directly. Anonymous data is
-- available only through an active, server-validated session, then cascades away.
do $$ declare t text; begin
 foreach t in array array['sessions','user_settings','memories','messages','notes','tasks','reminders','documents','tool_events'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('create policy owner_read on public.%I for select to authenticated using (user_id = (select auth.uid()) and not coalesce((select auth.jwt())->>''is_anonymous'',''true'')::boolean)',t);
  execute format('revoke all on public.%I from anon, authenticated',t);
  execute format('grant select on public.%I to authenticated',t);
 end loop;
 foreach t in array array['demo_limits','monthly_usage'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from anon, authenticated',t);
 end loop;
end $$;

create function public.admit_session(p_user_id uuid,p_ip_hash text,p_language text,p_memory_consent boolean)
returns public.sessions language plpgsql security definer set search_path='' as $$
declare lim public.demo_limits; result public.sessions; usage public.monthly_usage; anonymous boolean; begin
 -- A singleton row lock serializes admission and budget consumption across instances.
 select * into lim from public.demo_limits where id=true for update;
 select is_anonymous into anonymous from auth.users where id=p_user_id;
 if anonymous is null then raise exception 'invalid_user'; end if;
 if length(p_ip_hash)<>64 then raise exception 'invalid_ip_hash'; end if;
 if (select count(*) from public.sessions where ended_at is null and expires_at>now())>=lim.concurrent_sessions then raise exception 'concurrency_limit'; end if;
 if (select count(*) from public.sessions where created_at>now()-interval '1 hour' and (user_id=p_user_id or ip_hash=p_ip_hash))>=lim.sessions_per_hour then raise exception 'frequency_limit'; end if;
 insert into public.monthly_usage(month) values(date_trunc('month',now())::date) on conflict do nothing;
 select * into usage from public.monthly_usage where month=date_trunc('month',now())::date;
 if usage.reserved_seconds+lim.duration_seconds>lim.monthly_minutes*60 or usage.provider_requests>=lim.monthly_provider_requests then raise exception 'monthly_limit'; end if;
 insert into public.sessions(user_id,room_name,mode,language,memory_consent,ip_hash,expires_at)
 values(p_user_id,'recall-'||gen_random_uuid(),case when anonymous then 'anonymous' else 'authenticated' end,p_language,p_memory_consent and not anonymous,p_ip_hash,now()+make_interval(secs=>lim.duration_seconds)) returning * into result;
 update public.monthly_usage set reserved_seconds=reserved_seconds+lim.duration_seconds where month=date_trunc('month',now())::date;
 return result;
end $$;

create function public.consume_provider_budget(p_session_id uuid,p_requests integer default 1)
returns boolean language plpgsql security definer set search_path='' as $$
declare lim public.demo_limits; sess public.sessions; begin
 if p_requests<1 or p_requests>10 then return false; end if;
 select * into lim from public.demo_limits where id=true for update;
 select * into sess from public.sessions where id=p_session_id for update;
 if sess.id is null or sess.ended_at is not null or sess.expires_at<=now() or sess.provider_requests+p_requests>lim.session_provider_requests then return false; end if;
 insert into public.monthly_usage(month) values(date_trunc('month',now())::date) on conflict do nothing;
 update public.monthly_usage set provider_requests=provider_requests+p_requests where month=date_trunc('month',now())::date and provider_requests+p_requests<=lim.monthly_provider_requests;
 if not found then return false; end if;
 update public.sessions set provider_requests=provider_requests+p_requests where id=p_session_id;
 return true;
end $$;

create function public.purge_expired_data() returns void language sql security definer set search_path='' as $$
 delete from public.sessions where mode='anonymous' and expires_at<now();
 delete from public.sessions where created_at<now()-interval '90 days';
 delete from public.memories where expires_at<now();
$$;
revoke all on function public.admit_session(uuid,text,text,boolean) from public,anon,authenticated;
revoke all on function public.consume_provider_budget(uuid,integer) from public,anon,authenticated;
revoke all on function public.purge_expired_data() from public,anon,authenticated;
grant execute on function public.admit_session(uuid,text,text,boolean) to service_role;
grant execute on function public.consume_provider_budget(uuid,integer) to service_role;
grant execute on function public.purge_expired_data() to service_role;
