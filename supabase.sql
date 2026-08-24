create extension if not exists pgcrypto;

create table if not exists public.quiz_sessions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  quiz jsonb not null,
  host_name text,
  status text not null default 'waiting',
  owner_id uuid,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  expires_at timestamptz not null default (now() + interval '24 hours')
);

alter table public.quiz_sessions
  add column if not exists owner_id uuid;

alter table public.quiz_sessions
  add column if not exists started_at timestamptz;

alter table public.quiz_sessions
  add column if not exists expires_at timestamptz
    default (now() + interval '24 hours');

update public.quiz_sessions
set expires_at = created_at + interval '24 hours'
where expires_at is null;

alter table public.quiz_sessions
  alter column status set default 'waiting';

alter table public.quiz_sessions
  alter column expires_at set not null;

alter table public.quiz_sessions
  drop constraint if exists quiz_sessions_code_format;

alter table public.quiz_sessions
  drop constraint if exists quiz_sessions_status_check;

alter table public.quiz_sessions
  add constraint quiz_sessions_code_format
    check (code ~ '^[A-Z0-9]{6}$');

alter table public.quiz_sessions
  add constraint quiz_sessions_status_check
    check (status in ('waiting', 'active', 'closed'));

create table if not exists public.quiz_participants (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null
    references public.quiz_sessions(id) on delete cascade,
  user_id uuid,
  client_token uuid,
  display_name text not null,
  status text not null default 'waiting',
  score integer not null default 0,
  progress integer not null default 0,
  total_questions integer not null default 0,
  answers jsonb not null default '[]'::jsonb,
  joined_at timestamptz not null default now(),
  last_seen timestamptz not null default now()
);

alter table public.quiz_participants
  add column if not exists user_id uuid;

alter table public.quiz_participants
  add column if not exists client_token uuid;

alter table public.quiz_participants
  alter column client_token drop not null;

alter table public.quiz_participants
  add column if not exists score integer not null default 0;

alter table public.quiz_participants
  add column if not exists progress integer not null default 0;

alter table public.quiz_participants
  add column if not exists total_questions integer not null default 0;

alter table public.quiz_participants
  add column if not exists answers jsonb not null default '[]'::jsonb;

update public.quiz_participants
set answers = '[]'::jsonb
where answers is null
   or jsonb_typeof(answers) <> 'array';

alter table public.quiz_participants
  alter column answers set default '[]'::jsonb;

alter table public.quiz_participants
  alter column answers set not null;

alter table public.quiz_participants
  alter column status set default 'waiting';

delete from public.quiz_participants
where user_id is null;

delete from public.quiz_sessions
where owner_id is null;

alter table public.quiz_sessions
  alter column owner_id set not null;

alter table public.quiz_participants
  alter column user_id set not null;

alter table public.quiz_participants
  drop constraint if exists quiz_participants_name_check;

alter table public.quiz_participants
  drop constraint if exists quiz_participants_status_check;

alter table public.quiz_participants
  drop constraint if exists quiz_participants_score_check;

alter table public.quiz_participants
  drop constraint if exists quiz_participants_progress_check;

alter table public.quiz_participants
  drop constraint if exists quiz_participants_answers_check;

alter table public.quiz_participants
  add constraint quiz_participants_name_check
    check (
      char_length(trim(display_name)) between 2 and 32
      and display_name = trim(display_name)
    );

alter table public.quiz_participants
  add constraint quiz_participants_status_check
    check (status in ('waiting', 'joined', 'completed', 'left'));

alter table public.quiz_participants
  add constraint quiz_participants_score_check
    check (score >= 0 and score <= total_questions);

alter table public.quiz_participants
  add constraint quiz_participants_progress_check
    check (
      progress >= 0
      and progress <= total_questions
      and score <= progress
    );

alter table public.quiz_participants
  add constraint quiz_participants_answers_check
    check (
      jsonb_typeof(answers) = 'array'
      and jsonb_array_length(answers) <= total_questions
    );

create unique index if not exists
  quiz_participants_session_user_idx
on public.quiz_participants(session_id, user_id);

create index if not exists quiz_sessions_code_idx
on public.quiz_sessions(code);

create index if not exists quiz_sessions_owner_idx
on public.quiz_sessions(owner_id);

create index if not exists quiz_sessions_expiry_idx
on public.quiz_sessions(expires_at);

create index if not exists quiz_participants_session_idx
on public.quiz_participants(session_id);

create index if not exists quiz_participants_leaderboard_idx
on public.quiz_participants(session_id, score desc, progress desc);

create index if not exists quiz_participants_presence_idx
on public.quiz_participants(session_id, status, last_seen desc);

alter table public.quiz_sessions enable row level security;
alter table public.quiz_participants enable row level security;

do $$
declare
  policy_record record;
begin
  for policy_record in
    select policyname, tablename
    from pg_policies
    where schemaname = 'public'
      and tablename in ('quiz_sessions', 'quiz_participants')
  loop
    execute format(
      'drop policy if exists %I on public.%I',
      policy_record.policyname,
      policy_record.tablename
    );
  end loop;
end
$$;

create or replace function public.is_quiz_session_host(
  p_session_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.quiz_sessions
    where id = p_session_id
      and owner_id = auth.uid()
  );
$$;

create or replace function public.is_quiz_session_member(
  p_session_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.quiz_participants
    where session_id = p_session_id
      and user_id = auth.uid()
  );
$$;

revoke all on function public.is_quiz_session_host(uuid)
from public, anon;

revoke all on function public.is_quiz_session_member(uuid)
from public, anon;

grant execute on function public.is_quiz_session_host(uuid)
to authenticated;

grant execute on function public.is_quiz_session_member(uuid)
to authenticated;

create policy "Hosts can create sessions"
on public.quiz_sessions
for insert
to authenticated
with check (
  owner_id = auth.uid()
  and code ~ '^[A-Z0-9]{6}$'
  and jsonb_typeof(quiz) = 'object'
  and status = 'waiting'
  and expires_at > now()
  and expires_at <= now() + interval '24 hours 5 minutes'
);

create policy "Hosts and joined participants can read sessions"
on public.quiz_sessions
for select
to authenticated
using (
  owner_id = auth.uid()
  or (
    status in ('waiting', 'active')
    and expires_at > now()
    and public.is_quiz_session_member(id)
  )
);

create policy "Hosts can update their sessions"
on public.quiz_sessions
for update
to authenticated
using (owner_id = auth.uid())
with check (
  owner_id = auth.uid()
  and code ~ '^[A-Z0-9]{6}$'
  and jsonb_typeof(quiz) = 'object'
  and status in ('waiting', 'active', 'closed')
);

create policy "Hosts can delete their sessions"
on public.quiz_sessions
for delete
to authenticated
using (owner_id = auth.uid());

create policy "Participants and hosts can view participant records"
on public.quiz_participants
for select
to authenticated
using (
  user_id = auth.uid()
  or public.is_quiz_session_host(session_id)
);

create policy "Participants can update their own record"
on public.quiz_participants
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "Participants can leave their own record"
on public.quiz_participants
for delete
to authenticated
using (user_id = auth.uid());

create or replace function public.join_quiz_session(
  p_code text,
  p_display_name text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_session public.quiz_sessions%rowtype;
  selected_participant public.quiz_participants%rowtype;
  clean_code text;
  clean_name text;
  question_count integer;
  participant_status text;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required';
  end if;

  clean_code := upper(trim(coalesce(p_code, '')));
  clean_name := trim(regexp_replace(
    coalesce(p_display_name, ''),
    '\s+',
    ' ',
    'g'
  ));

  if clean_code !~ '^[A-Z0-9]{6}$' then
    raise exception 'Enter a valid six-character session code';
  end if;

  if char_length(clean_name) < 2
    or char_length(clean_name) > 32 then
    raise exception 'Display name must contain 2 to 32 characters';
  end if;

  delete from public.quiz_sessions
  where expires_at <= now();

  select *
  into selected_session
  from public.quiz_sessions
  where code = clean_code
    and status in ('waiting', 'active')
    and expires_at > now()
  limit 1;

  if not found then
    raise exception 'Session not found or has expired';
  end if;

  question_count := coalesce(
    jsonb_array_length(selected_session.quiz -> 'questions'),
    0
  );

  participant_status := case
    when selected_session.status = 'active' then 'joined'
    else 'waiting'
  end;

  insert into public.quiz_participants (
    session_id,
    user_id,
    display_name,
    status,
    score,
    progress,
    total_questions,
    answers,
    last_seen
  )
  values (
    selected_session.id,
    auth.uid(),
    clean_name,
    participant_status,
    0,
    0,
    question_count,
    '[]'::jsonb,
    now()
  )
  on conflict (session_id, user_id)
  do update set
    display_name = excluded.display_name,
    status = case
      when quiz_participants.status = 'completed'
        then 'completed'
      else excluded.status
    end,
    last_seen = now()
  returning *
  into selected_participant;

  return jsonb_build_object(
    'session',
    jsonb_build_object(
      'id', selected_session.id,
      'code', selected_session.code,
      'quiz', selected_session.quiz,
      'host_name', selected_session.host_name,
      'status', selected_session.status,
      'expires_at', selected_session.expires_at
    ),
    'participant',
    jsonb_build_object(
      'id', selected_participant.id,
      'display_name', selected_participant.display_name,
      'status', selected_participant.status,
      'score', selected_participant.score,
      'progress', selected_participant.progress,
      'total_questions', selected_participant.total_questions,
      'answers', selected_participant.answers
    )
  );
end;
$$;

create or replace function public.delete_expired_quiz_sessions()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count integer;
begin
  delete from public.quiz_sessions
  where expires_at <= now();

  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

revoke all on function public.join_quiz_session(text, text)
from public, anon;

grant execute on function public.join_quiz_session(text, text)
to authenticated;

revoke all on function public.delete_expired_quiz_sessions()
from public, anon;

grant execute on function public.delete_expired_quiz_sessions()
to authenticated;

revoke all on public.quiz_sessions from anon;
revoke all on public.quiz_participants from anon;

grant select, insert, update, delete
on public.quiz_sessions
to authenticated;

grant select, delete
on public.quiz_participants
to authenticated;

grant update (
  status,
  score,
  progress,
  answers,
  last_seen
)
on public.quiz_participants
to authenticated;

alter table public.quiz_sessions replica identity full;
alter table public.quiz_participants replica identity full;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'quiz_sessions'
  ) then
    alter publication supabase_realtime
      add table public.quiz_sessions;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'quiz_participants'
  ) then
    alter publication supabase_realtime
      add table public.quiz_participants;
  end if;
end
$$;
