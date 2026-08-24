-- Run after supabase.sql, account-auth.sql, and quiz-catalog.sql.
-- This migration is additive and does not modify existing quiz tables.

create extension if not exists pgcrypto;

create table if not exists public.quilet_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Learner',
  avatar_url text,
  role text not null default 'student',
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint quilet_profiles_role_check
    check (role in ('student', 'teacher', 'administrator')),
  constraint quilet_profiles_status_check
    check (status in ('active', 'suspended')),
  constraint quilet_profiles_name_check
    check (char_length(trim(display_name)) between 2 and 40)
);

create table if not exists public.quilet_word_lists (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  subject text not null default 'General',
  words jsonb not null default '[]'::jsonb,
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint quilet_word_lists_title_check
    check (char_length(trim(title)) between 2 and 80),
  constraint quilet_word_lists_words_check
    check (
      jsonb_typeof(words) = 'array'
      and jsonb_array_length(words) between 1 and 500
    )
);

create table if not exists public.quilet_draw_rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  host_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Draw & Guess',
  visibility text not null default 'private',
  status text not null default 'waiting',
  subject text not null default 'General',
  word_list_id uuid references public.quilet_word_lists(id)
    on delete set null,
  round_count integer not null default 3,
  drawing_seconds integer not null default 80,
  allow_spectators boolean not null default true,
  max_players integer not null default 12,
  settings jsonb not null default '{}'::jsonb,
  current_state jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  ended_at timestamptz,
  expires_at timestamptz not null default (now() + interval '6 hours'),
  constraint quilet_draw_rooms_code_check
    check (code ~ '^[A-Z0-9]{6}$'),
  constraint quilet_draw_rooms_visibility_check
    check (visibility in ('public', 'private')),
  constraint quilet_draw_rooms_status_check
    check (status in ('waiting', 'active', 'finished', 'closed')),
  constraint quilet_draw_rooms_round_check
    check (round_count between 1 and 20),
  constraint quilet_draw_rooms_time_check
    check (drawing_seconds between 15 and 300),
  constraint quilet_draw_rooms_players_check
    check (max_players between 2 and 50),
  constraint quilet_draw_rooms_state_check
    check (
      jsonb_typeof(settings) = 'object'
      and jsonb_typeof(current_state) = 'object'
    )
);

create table if not exists public.quilet_draw_members (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.quilet_draw_rooms(id)
    on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null,
  member_role text not null default 'player',
  status text not null default 'connected',
  score integer not null default 0,
  reconnect_token uuid not null default gen_random_uuid(),
  joined_at timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  unique (room_id, user_id),
  constraint quilet_draw_member_role_check
    check (member_role in ('host', 'player', 'spectator')),
  constraint quilet_draw_member_status_check
    check (status in ('connected', 'disconnected', 'removed')),
  constraint quilet_draw_member_score_check
    check (score >= 0),
  constraint quilet_draw_member_name_check
    check (char_length(trim(display_name)) between 2 and 32)
);

create table if not exists public.quilet_draw_results (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references public.quilet_draw_rooms(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  score integer not null default 0,
  placement integer,
  rounds_played integer not null default 0,
  correct_guesses integer not null default 0,
  duration_seconds integer not null default 0,
  result_data jsonb not null default '{}'::jsonb,
  completed_at timestamptz not null default now(),
  constraint quilet_draw_results_values_check
    check (
      score >= 0
      and rounds_played >= 0
      and correct_guesses >= 0
      and duration_seconds >= 0
      and (placement is null or placement > 0)
    )
);

create table if not exists public.quilet_quiz_folders (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  color text not null default '#2563eb',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint quilet_quiz_folders_name_check
    check (char_length(trim(name)) between 1 and 80)
);

create table if not exists public.quilet_quiz_documents (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  folder_id uuid references public.quilet_quiz_folders(id)
    on delete set null,
  title text not null default 'Untitled quiz',
  subject text not null default 'General',
  status text not null default 'draft',
  visibility text not null default 'private',
  quiz_data jsonb not null default '{"questions":[]}'::jsonb,
  share_token uuid not null default gen_random_uuid(),
  source_format text not null default 'editor',
  autosaved_at timestamptz not null default now(),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint quilet_quiz_documents_status_check
    check (status in ('draft', 'published', 'archived')),
  constraint quilet_quiz_documents_visibility_check
    check (visibility in ('private', 'shared', 'public')),
  constraint quilet_quiz_documents_source_check
    check (source_format in ('editor', 'csv', 'json', 'duplicate')),
  constraint quilet_quiz_documents_data_check
    check (jsonb_typeof(quiz_data) = 'object')
);

create table if not exists public.quilet_friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users(id) on delete cascade,
  addressee_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint quilet_friendships_different_users
    check (requester_id <> addressee_id),
  constraint quilet_friendships_status_check
    check (status in ('pending', 'accepted', 'declined', 'blocked'))
);

create unique index if not exists quilet_friendship_pair_idx
on public.quilet_friendships (
  least(requester_id, addressee_id),
  greatest(requester_id, addressee_id)
);

create table if not exists public.quilet_classrooms (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  join_code text not null unique,
  description text not null default '',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint quilet_classrooms_name_check
    check (char_length(trim(name)) between 2 and 100),
  constraint quilet_classrooms_code_check
    check (join_code ~ '^[A-Z0-9]{6,10}$')
);

create table if not exists public.quilet_classroom_members (
  classroom_id uuid not null references public.quilet_classrooms(id)
    on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  member_role text not null default 'student',
  joined_at timestamptz not null default now(),
  primary key (classroom_id, user_id),
  constraint quilet_classroom_member_role_check
    check (member_role in ('student', 'teacher'))
);

create table if not exists public.quilet_teams (
  id uuid primary key default gen_random_uuid(),
  classroom_id uuid not null references public.quilet_classrooms(id)
    on delete cascade,
  name text not null,
  color text not null default '#7c3aed',
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (classroom_id, name)
);

create table if not exists public.quilet_team_members (
  team_id uuid not null references public.quilet_teams(id)
    on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (team_id, user_id)
);

create table if not exists public.quilet_activity_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  classroom_id uuid references public.quilet_classrooms(id)
    on delete set null,
  team_id uuid references public.quilet_teams(id) on delete set null,
  activity_type text not null,
  activity_id text,
  title text not null,
  score integer not null default 0,
  maximum_score integer not null default 100,
  duration_seconds integer not null default 0,
  result_data jsonb not null default '{}'::jsonb,
  completed_at timestamptz not null default now(),
  constraint quilet_activity_type_check
    check (activity_type in ('quiz', 'draw_guess', 'daily_challenge')),
  constraint quilet_activity_score_check
    check (
      score >= 0
      and maximum_score > 0
      and duration_seconds >= 0
    )
);

create table if not exists public.quilet_daily_challenges (
  id uuid primary key default gen_random_uuid(),
  challenge_date date not null unique,
  title text not null,
  description text not null default '',
  activity_type text not null default 'quiz',
  activity_data jsonb not null default '{}'::jsonb,
  points integer not null default 100,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint quilet_daily_challenge_type_check
    check (activity_type in ('quiz', 'draw_guess')),
  constraint quilet_daily_challenge_points_check
    check (points > 0)
);

create table if not exists public.quilet_achievements (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  title text not null,
  description text not null,
  icon text not null default '🏆',
  criteria jsonb not null default '{}'::jsonb,
  points integer not null default 0,
  active boolean not null default true,
  constraint quilet_achievement_points_check
    check (points >= 0)
);

create table if not exists public.quilet_user_achievements (
  user_id uuid not null references auth.users(id) on delete cascade,
  achievement_id uuid not null references public.quilet_achievements(id)
    on delete cascade,
  progress integer not null default 100,
  awarded_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  primary key (user_id, achievement_id),
  constraint quilet_achievement_progress_check
    check (progress between 0 and 100)
);

create table if not exists public.quilet_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  target_type text not null,
  target_id text not null,
  category text not null,
  details text not null default '',
  evidence jsonb not null default '{}'::jsonb,
  status text not null default 'open',
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint quilet_reports_target_check
    check (
      target_type in (
        'user',
        'quiz',
        'draw_room',
        'chat_message',
        'classroom'
      )
    ),
  constraint quilet_reports_status_check
    check (status in ('open', 'reviewing', 'resolved', 'dismissed')),
  constraint quilet_reports_category_check
    check (
      category in (
        'profanity',
        'harassment',
        'hate',
        'sexual_content',
        'violence',
        'cheating',
        'spam',
        'other'
      )
    )
);

create index if not exists quilet_draw_rooms_browser_idx
on public.quilet_draw_rooms(visibility, status, created_at desc);

create index if not exists quilet_draw_members_presence_idx
on public.quilet_draw_members(room_id, status, last_seen desc);

create index if not exists quilet_draw_results_user_idx
on public.quilet_draw_results(user_id, completed_at desc);

create index if not exists quilet_quiz_documents_owner_idx
on public.quilet_quiz_documents(owner_id, status, updated_at desc);

create unique index if not exists quilet_quiz_share_token_idx
on public.quilet_quiz_documents(share_token);

create index if not exists quilet_classroom_members_user_idx
on public.quilet_classroom_members(user_id);

create index if not exists quilet_activity_global_leaderboard_idx
on public.quilet_activity_results(score desc, completed_at desc);

create index if not exists quilet_activity_classroom_leaderboard_idx
on public.quilet_activity_results(
  classroom_id,
  score desc,
  completed_at desc
);

create index if not exists quilet_activity_team_leaderboard_idx
on public.quilet_activity_results(
  team_id,
  score desc,
  completed_at desc
);

create index if not exists quilet_reports_status_idx
on public.quilet_reports(status, created_at);

create or replace function public.quilet_is_administrator()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.quilet_profiles
    where user_id = auth.uid()
      and role = 'administrator'
      and status = 'active'
  );
$$;

create or replace function public.quilet_is_teacher()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.quilet_profiles
    where user_id = auth.uid()
      and role in ('teacher', 'administrator')
      and status = 'active'
  );
$$;

create or replace function public.quilet_is_draw_room_member(
  p_room_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.quilet_draw_members
    where room_id = p_room_id
      and user_id = auth.uid()
      and status <> 'removed'
  );
$$;

create or replace function public.quilet_is_draw_room_host(
  p_room_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.quilet_draw_rooms
    where id = p_room_id
      and host_id = auth.uid()
  );
$$;

create or replace function public.quilet_is_classroom_member(
  p_classroom_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.quilet_classroom_members
    where classroom_id = p_classroom_id
      and user_id = auth.uid()
  )
  or exists (
    select 1
    from public.quilet_classrooms
    where id = p_classroom_id
      and owner_id = auth.uid()
  );
$$;

create or replace function public.quilet_is_classroom_teacher(
  p_classroom_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.quilet_classrooms
    where id = p_classroom_id
      and owner_id = auth.uid()
  )
  or exists (
    select 1
    from public.quilet_classroom_members
    where classroom_id = p_classroom_id
      and user_id = auth.uid()
      and member_role = 'teacher'
  );
$$;

create or replace function public.quilet_join_draw_room(
  p_code text,
  p_display_name text,
  p_member_role text default 'player'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_room public.quilet_draw_rooms%rowtype;
  selected_member public.quilet_draw_members%rowtype;
  clean_code text;
  clean_name text;
  clean_role text;
  connected_players integer;
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
  clean_role := lower(trim(coalesce(p_member_role, 'player')));

  if clean_code !~ '^[A-Z0-9]{6}$' then
    raise exception 'Enter a valid six-character room code';
  end if;

  if char_length(clean_name) not between 2 and 32 then
    raise exception 'Display name must contain 2 to 32 characters';
  end if;

  if clean_role not in ('player', 'spectator') then
    raise exception 'Invalid room role';
  end if;

  select *
  into selected_room
  from public.quilet_draw_rooms
  where code = clean_code
    and status in ('waiting', 'active')
    and expires_at > now()
  for update;

  if not found then
    raise exception 'Room not found or expired';
  end if;

  if clean_role = 'spectator'
    and not selected_room.allow_spectators then
    raise exception 'This room does not allow spectators';
  end if;

  select count(*)
  into connected_players
  from public.quilet_draw_members
  where room_id = selected_room.id
    and member_role in ('host', 'player')
    and status <> 'removed';

  if clean_role = 'player'
    and connected_players >= selected_room.max_players then
    raise exception 'This room is full';
  end if;

  insert into public.quilet_draw_members (
    room_id,
    user_id,
    display_name,
    member_role,
    status,
    last_seen
  )
  values (
    selected_room.id,
    auth.uid(),
    clean_name,
    clean_role,
    'connected',
    now()
  )
  on conflict (room_id, user_id)
  do update set
    display_name = excluded.display_name,
    member_role = case
      when quilet_draw_members.member_role = 'host'
        then 'host'
      else excluded.member_role
    end,
    status = case
      when quilet_draw_members.status = 'removed'
        then 'removed'
      else 'connected'
    end,
    reconnect_token = gen_random_uuid(),
    last_seen = now()
  returning *
  into selected_member;

  if selected_member.status = 'removed' then
    raise exception 'You were removed from this room';
  end if;

  return jsonb_build_object(
    'room', jsonb_build_object(
      'id', selected_room.id,
      'code', selected_room.code,
      'title', selected_room.title,
      'visibility', selected_room.visibility,
      'status', selected_room.status,
      'subject', selected_room.subject,
      'round_count', selected_room.round_count,
      'drawing_seconds', selected_room.drawing_seconds,
      'allow_spectators', selected_room.allow_spectators,
      'settings', selected_room.settings,
      'current_state', selected_room.current_state
    ),
    'member', to_jsonb(selected_member)
  );
end;
$$;

create or replace function public.quilet_join_classroom(
  p_join_code text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_classroom public.quilet_classrooms%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required';
  end if;

  select *
  into selected_classroom
  from public.quilet_classrooms
  where join_code = upper(trim(coalesce(p_join_code, '')))
    and is_active = true;

  if not found then
    raise exception 'Classroom not found';
  end if;

  insert into public.quilet_classroom_members (
    classroom_id,
    user_id,
    member_role
  )
  values (
    selected_classroom.id,
    auth.uid(),
    'student'
  )
  on conflict (classroom_id, user_id) do nothing;

  return selected_classroom.id;
end;
$$;

create or replace function public.quilet_get_shared_quiz(
  p_share_token uuid
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'id', id,
    'title', title,
    'subject', subject,
    'quiz_data', quiz_data,
    'owner_id', owner_id,
    'published_at', published_at
  )
  from public.quilet_quiz_documents
  where share_token = p_share_token
    and status = 'published'
    and visibility in ('shared', 'public')
  limit 1;
$$;

create or replace function public.quilet_duplicate_quiz(
  p_quiz_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  source_quiz public.quilet_quiz_documents%rowtype;
  new_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required';
  end if;

  select *
  into source_quiz
  from public.quilet_quiz_documents
  where id = p_quiz_id
    and (
      owner_id = auth.uid()
      or (
        status = 'published'
        and visibility in ('shared', 'public')
      )
    );

  if not found then
    raise exception 'Quiz not found or unavailable';
  end if;

  insert into public.quilet_quiz_documents (
    owner_id,
    title,
    subject,
    status,
    visibility,
    quiz_data,
    source_format
  )
  values (
    auth.uid(),
    left(source_quiz.title || ' (Copy)', 150),
    source_quiz.subject,
    'draft',
    'private',
    source_quiz.quiz_data,
    'duplicate'
  )
  returning id into new_id;

  return new_id;
end;
$$;

revoke all on function public.quilet_is_administrator() from public, anon;
revoke all on function public.quilet_is_teacher() from public, anon;
revoke all on function public.quilet_is_draw_room_member(uuid)
from public, anon;
revoke all on function public.quilet_is_draw_room_host(uuid)
from public, anon;
revoke all on function public.quilet_is_classroom_member(uuid)
from public, anon;
revoke all on function public.quilet_is_classroom_teacher(uuid)
from public, anon;
revoke all on function public.quilet_join_draw_room(text, text, text)
from public, anon;
revoke all on function public.quilet_join_classroom(text)
from public, anon;
revoke all on function public.quilet_duplicate_quiz(uuid)
from public, anon;
revoke all on function public.quilet_get_shared_quiz(uuid) from public;

grant execute on function public.quilet_is_administrator()
to authenticated;
grant execute on function public.quilet_is_teacher()
to authenticated;
grant execute on function public.quilet_is_draw_room_member(uuid)
to authenticated;
grant execute on function public.quilet_is_draw_room_host(uuid)
to authenticated;
grant execute on function public.quilet_is_classroom_member(uuid)
to authenticated;
grant execute on function public.quilet_is_classroom_teacher(uuid)
to authenticated;
grant execute on function public.quilet_join_draw_room(text, text, text)
to authenticated;
grant execute on function public.quilet_join_classroom(text)
to authenticated;
grant execute on function public.quilet_duplicate_quiz(uuid)
to authenticated;
grant execute on function public.quilet_get_shared_quiz(uuid)
to authenticated, anon;

do $$
declare
  table_name text;
  policy_record record;
begin
  foreach table_name in array array[
    'quilet_profiles',
    'quilet_word_lists',
    'quilet_draw_rooms',
    'quilet_draw_members',
    'quilet_draw_results',
    'quilet_quiz_folders',
    'quilet_quiz_documents',
    'quilet_friendships',
    'quilet_classrooms',
    'quilet_classroom_members',
    'quilet_teams',
    'quilet_team_members',
    'quilet_activity_results',
    'quilet_daily_challenges',
    'quilet_achievements',
    'quilet_user_achievements',
    'quilet_reports'
  ]
  loop
    execute format(
      'alter table public.%I enable row level security',
      table_name
    );
  end loop;

  for policy_record in
    select policyname, tablename
    from pg_policies
    where schemaname = 'public'
      and tablename like 'quilet_%'
  loop
    execute format(
      'drop policy if exists %I on public.%I',
      policy_record.policyname,
      policy_record.tablename
    );
  end loop;
end
$$;

create policy "Profiles are visible to signed-in users"
on public.quilet_profiles for select to authenticated
using (status = 'active' or user_id = auth.uid());

create policy "Users create their student profile"
on public.quilet_profiles for insert to authenticated
with check (user_id = auth.uid() and role = 'student');

create policy "Users update their profile"
on public.quilet_profiles for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "Word lists are visible to owner or public"
on public.quilet_word_lists for select to authenticated
using (owner_id = auth.uid() or is_public);

create policy "Users create word lists"
on public.quilet_word_lists for insert to authenticated
with check (owner_id = auth.uid());

create policy "Users update their word lists"
on public.quilet_word_lists for update to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

create policy "Users delete their word lists"
on public.quilet_word_lists for delete to authenticated
using (owner_id = auth.uid());

create policy "Draw rooms are visible to allowed users"
on public.quilet_draw_rooms for select to authenticated
using (
  host_id = auth.uid()
  or (
    visibility = 'public'
    and status in ('waiting', 'active')
    and expires_at > now()
  )
  or public.quilet_is_draw_room_member(id)
);

create policy "Users create draw rooms"
on public.quilet_draw_rooms for insert to authenticated
with check (
  host_id = auth.uid()
  and status = 'waiting'
  and expires_at > now()
);

create policy "Hosts update draw rooms"
on public.quilet_draw_rooms for update to authenticated
using (host_id = auth.uid())
with check (host_id = auth.uid());

create policy "Hosts delete draw rooms"
on public.quilet_draw_rooms for delete to authenticated
using (host_id = auth.uid());

create policy "Room members view memberships"
on public.quilet_draw_members for select to authenticated
using (
  user_id = auth.uid()
  or public.quilet_is_draw_room_member(room_id)
  or public.quilet_is_draw_room_host(room_id)
);

create policy "Hosts add room memberships"
on public.quilet_draw_members for insert to authenticated
with check (
  user_id = auth.uid()
  and public.quilet_is_draw_room_host(room_id)
);

create policy "Members update themselves or host manages room"
on public.quilet_draw_members for update to authenticated
using (
  user_id = auth.uid()
  or public.quilet_is_draw_room_host(room_id)
)
with check (
  user_id = auth.uid()
  or public.quilet_is_draw_room_host(room_id)
);

create policy "Members leave or hosts remove members"
on public.quilet_draw_members for delete to authenticated
using (
  user_id = auth.uid()
  or public.quilet_is_draw_room_host(room_id)
);

create policy "Users view relevant draw results"
on public.quilet_draw_results for select to authenticated
using (
  user_id = auth.uid()
  or public.quilet_is_draw_room_member(room_id)
);

create policy "Users save their draw results"
on public.quilet_draw_results for insert to authenticated
with check (user_id = auth.uid());

create policy "Users manage their quiz folders"
on public.quilet_quiz_folders for all to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

create policy "Users view available quiz documents"
on public.quilet_quiz_documents for select to authenticated
using (
  owner_id = auth.uid()
  or (
    status = 'published'
    and visibility in ('shared', 'public')
  )
);

create policy "Users create quiz documents"
on public.quilet_quiz_documents for insert to authenticated
with check (owner_id = auth.uid());

create policy "Users update their quiz documents"
on public.quilet_quiz_documents for update to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

create policy "Users delete their quiz documents"
on public.quilet_quiz_documents for delete to authenticated
using (owner_id = auth.uid());

create policy "Users view their friendships"
on public.quilet_friendships for select to authenticated
using (
  requester_id = auth.uid()
  or addressee_id = auth.uid()
);

create policy "Users send friend requests"
on public.quilet_friendships for insert to authenticated
with check (
  requester_id = auth.uid()
  and status = 'pending'
);

create policy "Friendship participants update requests"
on public.quilet_friendships for update to authenticated
using (
  requester_id = auth.uid()
  or addressee_id = auth.uid()
)
with check (
  requester_id = auth.uid()
  or addressee_id = auth.uid()
);

create policy "Friendship participants delete requests"
on public.quilet_friendships for delete to authenticated
using (
  requester_id = auth.uid()
  or addressee_id = auth.uid()
);

create policy "Classroom members view classrooms"
on public.quilet_classrooms for select to authenticated
using (
  owner_id = auth.uid()
  or public.quilet_is_classroom_member(id)
);

create policy "Teachers create classrooms"
on public.quilet_classrooms for insert to authenticated
with check (
  owner_id = auth.uid()
  and public.quilet_is_teacher()
);

create policy "Classroom owners update classrooms"
on public.quilet_classrooms for update to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

create policy "Classroom owners delete classrooms"
on public.quilet_classrooms for delete to authenticated
using (owner_id = auth.uid());

create policy "Classroom members view membership"
on public.quilet_classroom_members for select to authenticated
using (public.quilet_is_classroom_member(classroom_id));

create policy "Teachers add classroom members"
on public.quilet_classroom_members for insert to authenticated
with check (public.quilet_is_classroom_teacher(classroom_id));

create policy "Teachers update classroom members"
on public.quilet_classroom_members for update to authenticated
using (public.quilet_is_classroom_teacher(classroom_id))
with check (public.quilet_is_classroom_teacher(classroom_id));

create policy "Members leave or teachers remove members"
on public.quilet_classroom_members for delete to authenticated
using (
  user_id = auth.uid()
  or public.quilet_is_classroom_teacher(classroom_id)
);

create policy "Classroom members view teams"
on public.quilet_teams for select to authenticated
using (public.quilet_is_classroom_member(classroom_id));

create policy "Classroom teachers create teams"
on public.quilet_teams for insert to authenticated
with check (
  created_by = auth.uid()
  and public.quilet_is_classroom_teacher(classroom_id)
);

create policy "Classroom teachers update teams"
on public.quilet_teams for update to authenticated
using (public.quilet_is_classroom_teacher(classroom_id))
with check (public.quilet_is_classroom_teacher(classroom_id));

create policy "Classroom teachers delete teams"
on public.quilet_teams for delete to authenticated
using (public.quilet_is_classroom_teacher(classroom_id));

create policy "Classroom members view team members"
on public.quilet_team_members for select to authenticated
using (
  exists (
    select 1
    from public.quilet_teams team
    where team.id = team_id
      and public.quilet_is_classroom_member(team.classroom_id)
  )
);

create policy "Teachers manage team membership"
on public.quilet_team_members for all to authenticated
using (
  exists (
    select 1
    from public.quilet_teams team
    where team.id = team_id
      and public.quilet_is_classroom_teacher(team.classroom_id)
  )
)
with check (
  exists (
    select 1
    from public.quilet_teams team
    where team.id = team_id
      and public.quilet_is_classroom_teacher(team.classroom_id)
  )
);

create policy "Users view relevant activity results"
on public.quilet_activity_results for select to authenticated
using (
  user_id = auth.uid()
  or classroom_id is null
  or public.quilet_is_classroom_member(classroom_id)
);

create policy "Users save their activity results"
on public.quilet_activity_results for insert to authenticated
with check (
  user_id = auth.uid()
  and (
    classroom_id is null
    or public.quilet_is_classroom_member(classroom_id)
  )
);

create policy "Daily challenges are visible"
on public.quilet_daily_challenges for select to authenticated
using (active or public.quilet_is_administrator());

create policy "Achievements are visible"
on public.quilet_achievements for select to authenticated
using (active or public.quilet_is_administrator());

create policy "Users view their achievements"
on public.quilet_user_achievements for select to authenticated
using (user_id = auth.uid());

create policy "Users save achievement progress"
on public.quilet_user_achievements for insert to authenticated
with check (user_id = auth.uid());

create policy "Users update achievement progress"
on public.quilet_user_achievements for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "Users submit reports"
on public.quilet_reports for insert to authenticated
with check (
  reporter_id = auth.uid()
  and status = 'open'
  and reviewed_by is null
);

create policy "Users and administrators view reports"
on public.quilet_reports for select to authenticated
using (
  reporter_id = auth.uid()
  or public.quilet_is_administrator()
);

create policy "Administrators review reports"
on public.quilet_reports for update to authenticated
using (public.quilet_is_administrator())
with check (public.quilet_is_administrator());

revoke all on all tables in schema public from anon;

grant select, insert on public.quilet_profiles to authenticated;
grant update (display_name, avatar_url, updated_at)
on public.quilet_profiles to authenticated;

grant select, insert, update, delete
on public.quilet_word_lists,
   public.quilet_draw_rooms,
   public.quilet_draw_members,
   public.quilet_quiz_folders,
   public.quilet_quiz_documents,
   public.quilet_friendships,
   public.quilet_classrooms,
   public.quilet_classroom_members,
   public.quilet_teams,
   public.quilet_team_members
to authenticated;

grant select, insert
on public.quilet_draw_results,
   public.quilet_activity_results,
   public.quilet_user_achievements,
   public.quilet_reports
to authenticated;

grant update
on public.quilet_user_achievements,
   public.quilet_reports
to authenticated;

grant select
on public.quilet_daily_challenges,
   public.quilet_achievements
to authenticated;

alter table public.quilet_draw_rooms replica identity full;
alter table public.quilet_draw_members replica identity full;

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
        and tablename = 'quilet_draw_rooms'
    ) then
      alter publication supabase_realtime
        add table public.quilet_draw_rooms;
    end if;

    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'quilet_draw_members'
    ) then
      alter publication supabase_realtime
        add table public.quilet_draw_members;
    end if;
  end if;
end
$$;

insert into public.quilet_achievements (
  code,
  title,
  description,
  icon,
  criteria,
  points
)
values
  (
    'FIRST_QUIZ',
    'Quiz Starter',
    'Complete your first quiz.',
    '📝',
    '{"activity":"quiz","count":1}'::jsonb,
    50
  ),
  (
    'FIRST_DRAW_GAME',
    'Creative Starter',
    'Complete your first Draw & Guess game.',
    '🎨',
    '{"activity":"draw_guess","count":1}'::jsonb,
    50
  ),
  (
    'DRAW_WINNER',
    'Drawing Champion',
    'Finish first in a Draw & Guess game.',
    '🏆',
    '{"activity":"draw_guess","placement":1}'::jsonb,
    100
  ),
  (
    'QUIZ_MASTER',
    'Quiz Master',
    'Complete ten quizzes.',
    '⭐',
    '{"activity":"quiz","count":10}'::jsonb,
    200
  ),
  (
    'DAILY_STREAK',
    'Daily Challenger',
    'Complete seven daily challenges.',
    '🔥',
    '{"activity":"daily_challenge","count":7}'::jsonb,
    250
  )
on conflict (code) do update set
  title = excluded.title,
  description = excluded.description,
  icon = excluded.icon,
  criteria = excluded.criteria,
  points = excluded.points;
