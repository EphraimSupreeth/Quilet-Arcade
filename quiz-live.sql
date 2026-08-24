-- Run once in the Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.quilet_quiz_sessions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  host_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  quiz_data jsonb not null,
  settings jsonb not null default '{}'::jsonb,
  status text not null default 'waiting',
  current_question integer not null default -1,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  ended_at timestamptz,
  expires_at timestamptz not null default (now() + interval '6 hours'),
  constraint quilet_quiz_session_code_check
    check (code ~ '^[A-Z0-9]{6}$'),
  constraint quilet_quiz_session_status_check
    check (status in ('waiting', 'active', 'finished', 'closed')),
  constraint quilet_quiz_session_question_check
    check (current_question >= -1),
  constraint quilet_quiz_session_data_check
    check (
      jsonb_typeof(quiz_data) = 'object'
      and jsonb_typeof(settings) = 'object'
    )
);

create table if not exists public.quilet_quiz_answer_keys (
  session_id uuid primary key
    references public.quilet_quiz_sessions(id) on delete cascade,
  host_id uuid not null references auth.users(id) on delete cascade,
  answers jsonb not null,
  constraint quilet_quiz_answer_keys_check
    check (jsonb_typeof(answers) = 'array')
);

create table if not exists public.quilet_quiz_members (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null
    references public.quilet_quiz_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null,
  score integer not null default 0,
  correct_answers integer not null default 0,
  status text not null default 'connected',
  joined_at timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  unique (session_id, user_id),
  constraint quilet_quiz_member_name_check
    check (char_length(trim(display_name)) between 2 and 32),
  constraint quilet_quiz_member_score_check
    check (score >= 0 and correct_answers >= 0),
  constraint quilet_quiz_member_status_check
    check (status in ('connected', 'disconnected', 'removed'))
);

create table if not exists public.quilet_quiz_answers (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null
    references public.quilet_quiz_sessions(id) on delete cascade,
  member_id uuid not null
    references public.quilet_quiz_members(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  question_index integer not null,
  answer_index integer not null,
  is_correct boolean not null,
  points integer not null default 0,
  answered_at timestamptz not null default now(),
  unique (session_id, member_id, question_index),
  constraint quilet_quiz_answer_index_check
    check (question_index >= 0 and answer_index between 0 and 20),
  constraint quilet_quiz_answer_points_check
    check (points >= 0)
);

create index if not exists quilet_quiz_sessions_code_idx
on public.quilet_quiz_sessions(code, status, expires_at);

create index if not exists quilet_quiz_members_session_idx
on public.quilet_quiz_members(session_id, score desc, joined_at);

create index if not exists quilet_quiz_answers_session_idx
on public.quilet_quiz_answers(session_id, question_index);

create or replace function public.quilet_is_quiz_host(
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
    from public.quilet_quiz_sessions
    where id = p_session_id
      and host_id = auth.uid()
  );
$$;

create or replace function public.quilet_is_quiz_member(
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
    from public.quilet_quiz_members
    where session_id = p_session_id
      and user_id = auth.uid()
      and status <> 'removed'
  );
$$;

create or replace function public.quilet_create_quiz_session(
  p_quiz jsonb,
  p_settings jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  clean_quiz jsonb;
  clean_questions jsonb := '[]'::jsonb;
  answer_list jsonb := '[]'::jsonb;
  question jsonb;
  generated_code text;
  created_session public.quilet_quiz_sessions%rowtype;
  attempt integer := 0;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required';
  end if;

  if jsonb_typeof(p_quiz) <> 'object'
    or jsonb_typeof(p_quiz -> 'questions') <> 'array'
    or jsonb_array_length(p_quiz -> 'questions') < 1 then
    raise exception 'The quiz must contain at least one question';
  end if;

  if jsonb_array_length(p_quiz -> 'questions') > 200 then
    raise exception 'The quiz contains too many questions';
  end if;

  for question in
    select value from jsonb_array_elements(p_quiz -> 'questions')
  loop
    if jsonb_typeof(question -> 'options') <> 'array'
      or jsonb_array_length(question -> 'options') < 2 then
      raise exception 'Every question needs at least two options';
    end if;

    clean_questions := clean_questions || jsonb_build_array(
      jsonb_build_object(
        'text', left(coalesce(question ->> 'text', ''), 500),
        'options', question -> 'options'
      )
    );

    answer_list := answer_list || jsonb_build_array(
      greatest(0, coalesce((question ->> 'correct')::integer, 0))
    );
  end loop;

  clean_quiz := jsonb_build_object(
    'title', left(coalesce(p_quiz ->> 'title', 'Live Quiz'), 150),
    'subject', left(coalesce(p_quiz ->> 'subject', 'General'), 100),
    'description', left(coalesce(p_quiz ->> 'description', ''), 500),
    'questions', clean_questions
  );

  loop
    attempt := attempt + 1;

    generated_code := upper(substr(
      encode(gen_random_bytes(8), 'hex'),
      1,
      6
    ));

    begin
      insert into public.quilet_quiz_sessions (
        code,
        host_id,
        title,
        quiz_data,
        settings
      )
      values (
        generated_code,
        auth.uid(),
        clean_quiz ->> 'title',
        clean_quiz,
        coalesce(p_settings, '{}'::jsonb)
      )
      returning * into created_session;

      exit;
    exception
      when unique_violation then
        if attempt >= 20 then
          raise exception 'Unable to create a unique session code';
        end if;
    end;
  end loop;

  insert into public.quilet_quiz_answer_keys (
    session_id,
    host_id,
    answers
  )
  values (
    created_session.id,
    auth.uid(),
    answer_list
  );

  return to_jsonb(created_session);
end;
$$;

create or replace function public.quilet_join_quiz_session(
  p_code text,
  p_display_name text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_session public.quilet_quiz_sessions%rowtype;
  selected_member public.quilet_quiz_members%rowtype;
  clean_code text;
  clean_name text;
  player_count integer;
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

  if char_length(clean_name) not between 2 and 32 then
    raise exception 'Display name must contain 2 to 32 characters';
  end if;

  select *
  into selected_session
  from public.quilet_quiz_sessions
  where code = clean_code
    and status in ('waiting', 'active')
    and expires_at > now()
  for update;

  if not found then
    raise exception 'Session not found or expired';
  end if;

  select count(*)
  into player_count
  from public.quilet_quiz_members
  where session_id = selected_session.id
    and status = 'connected';

  if player_count >= 30 then
    raise exception 'This session is full';
  end if;

  insert into public.quilet_quiz_members (
    session_id,
    user_id,
    display_name,
    status,
    last_seen
  )
  values (
    selected_session.id,
    auth.uid(),
    clean_name,
    'connected',
    now()
  )
  on conflict (session_id, user_id)
  do update set
    display_name = excluded.display_name,
    status = case
      when quilet_quiz_members.status = 'removed'
        then 'removed'
      else 'connected'
    end,
    last_seen = now()
  returning * into selected_member;

  if selected_member.status = 'removed' then
    raise exception 'You were removed from this session';
  end if;

  return jsonb_build_object(
    'session', to_jsonb(selected_session),
    'member', to_jsonb(selected_member)
  );
end;
$$;

create or replace function public.quilet_submit_quiz_answer(
  p_session_id uuid,
  p_question_index integer,
  p_answer_index integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_session public.quilet_quiz_sessions%rowtype;
  selected_member public.quilet_quiz_members%rowtype;
  answer_keys jsonb;
  correct_index integer;
  answer_correct boolean;
  awarded_points integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required';
  end if;

  select *
  into selected_session
  from public.quilet_quiz_sessions
  where id = p_session_id
  for update;

  if not found then
    raise exception 'Session not found';
  end if;

  if selected_session.status <> 'active' then
    raise exception 'This quiz is not currently active';
  end if;

  if selected_session.current_question <> p_question_index then
    raise exception 'This question is no longer active';
  end if;

  select *
  into selected_member
  from public.quilet_quiz_members
  where session_id = p_session_id
    and user_id = auth.uid()
    and status = 'connected'
  for update;

  if not found then
    raise exception 'You are not a member of this session';
  end if;

  if exists (
    select 1
    from public.quilet_quiz_answers
    where session_id = p_session_id
      and member_id = selected_member.id
      and question_index = p_question_index
  ) then
    raise exception 'You already answered this question';
  end if;

  select answers
  into answer_keys
  from public.quilet_quiz_answer_keys
  where session_id = p_session_id;

  correct_index := (answer_keys ->> p_question_index)::integer;
  answer_correct := p_answer_index = correct_index;
  awarded_points := case when answer_correct then 100 else 0 end;

  insert into public.quilet_quiz_answers (
    session_id,
    member_id,
    user_id,
    question_index,
    answer_index,
    is_correct,
    points
  )
  values (
    p_session_id,
    selected_member.id,
    auth.uid(),
    p_question_index,
    p_answer_index,
    answer_correct,
    awarded_points
  );

  update public.quilet_quiz_members
  set
    score = score + awarded_points,
    correct_answers = correct_answers +
      case when answer_correct then 1 else 0 end,
    last_seen = now()
  where id = selected_member.id
  returning * into selected_member;

  return jsonb_build_object(
    'correct', answer_correct,
    'score', selected_member.score,
    'correct_answers', selected_member.correct_answers
  );
end;
$$;

alter table public.quilet_quiz_sessions enable row level security;
alter table public.quilet_quiz_answer_keys enable row level security;
alter table public.quilet_quiz_members enable row level security;
alter table public.quilet_quiz_answers enable row level security;

drop policy if exists "Quiz hosts and members view sessions"
on public.quilet_quiz_sessions;

create policy "Quiz hosts and members view sessions"
on public.quilet_quiz_sessions for select to authenticated
using (
  host_id = auth.uid()
  or public.quilet_is_quiz_member(id)
);

drop policy if exists "Quiz hosts update sessions"
on public.quilet_quiz_sessions;

create policy "Quiz hosts update sessions"
on public.quilet_quiz_sessions for update to authenticated
using (host_id = auth.uid())
with check (host_id = auth.uid());

drop policy if exists "Quiz hosts delete sessions"
on public.quilet_quiz_sessions;

create policy "Quiz hosts delete sessions"
on public.quilet_quiz_sessions for delete to authenticated
using (host_id = auth.uid());

drop policy if exists "Quiz hosts view answer keys"
on public.quilet_quiz_answer_keys;

create policy "Quiz hosts view answer keys"
on public.quilet_quiz_answer_keys for select to authenticated
using (host_id = auth.uid());

drop policy if exists "Quiz members view session members"
on public.quilet_quiz_members;

create policy "Quiz members view session members"
on public.quilet_quiz_members for select to authenticated
using (
  user_id = auth.uid()
  or public.quilet_is_quiz_host(session_id)
  or public.quilet_is_quiz_member(session_id)
);

drop policy if exists "Quiz members update their presence"
on public.quilet_quiz_members;

create policy "Quiz members update their presence"
on public.quilet_quiz_members for update to authenticated
using (
  user_id = auth.uid()
  or public.quilet_is_quiz_host(session_id)
)
with check (
  user_id = auth.uid()
  or public.quilet_is_quiz_host(session_id)
);

drop policy if exists "Users view their quiz answers"
on public.quilet_quiz_answers;

create policy "Users view their quiz answers"
on public.quilet_quiz_answers for select to authenticated
using (
  user_id = auth.uid()
  or public.quilet_is_quiz_host(session_id)
);

revoke all on public.quilet_quiz_sessions from anon;
revoke all on public.quilet_quiz_answer_keys from anon;
revoke all on public.quilet_quiz_members from anon;
revoke all on public.quilet_quiz_answers from anon;

grant select, update, delete
on public.quilet_quiz_sessions to authenticated;

grant select
on public.quilet_quiz_answer_keys to authenticated;

grant select, update
on public.quilet_quiz_members to authenticated;

grant select
on public.quilet_quiz_answers to authenticated;

revoke all on function public.quilet_is_quiz_host(uuid)
from public, anon;

revoke all on function public.quilet_is_quiz_member(uuid)
from public, anon;

revoke all on function public.quilet_create_quiz_session(jsonb, jsonb)
from public, anon;

revoke all on function public.quilet_join_quiz_session(text, text)
from public, anon;

revoke all on function public.quilet_submit_quiz_answer(uuid, integer, integer)
from public, anon;

grant execute on function public.quilet_is_quiz_host(uuid)
to authenticated;

grant execute on function public.quilet_is_quiz_member(uuid)
to authenticated;

grant execute on function public.quilet_create_quiz_session(jsonb, jsonb)
to authenticated;

grant execute on function public.quilet_join_quiz_session(text, text)
to authenticated;

grant execute on function public.quilet_submit_quiz_answer(uuid, integer, integer)
to authenticated;

alter table public.quilet_quiz_sessions replica identity full;
alter table public.quilet_quiz_members replica identity full;

do $$
begin
  if exists (
    select 1
    from pg_publication
    where pubname = 'supabase_realtime'
  ) then
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'quilet_quiz_sessions'
    ) then
      alter publication supabase_realtime
        add table public.quilet_quiz_sessions;
    end if;

    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'quilet_quiz_members'
    ) then
      alter publication supabase_realtime
        add table public.quilet_quiz_members;
    end if;
  end if;
end
$$;
