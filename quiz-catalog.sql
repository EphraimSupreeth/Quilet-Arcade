create extension if not exists pgcrypto;

create table if not exists public.quizzes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid(),
  creator_name text not null default 'Quilet creator',
  title text not null,
  subject text not null default 'General',
  description text not null default '',
  category text not null default '',
  difficulty text not null default 'medium',
  visibility text not null default 'private',
  quiz jsonb not null,
  play_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.quizzes
  drop constraint if exists quizzes_visibility_check;

alter table public.quizzes
  add constraint quizzes_visibility_check
  check (visibility in ('public', 'private'));

alter table public.quizzes
  drop constraint if exists quizzes_difficulty_check;

alter table public.quizzes
  add constraint quizzes_difficulty_check
  check (difficulty in ('easy', 'medium', 'hard'));

alter table public.quizzes
  drop constraint if exists quizzes_title_check;

alter table public.quizzes
  add constraint quizzes_title_check
  check (char_length(trim(title)) between 1 and 160);

alter table public.quizzes
  drop constraint if exists quizzes_subject_check;

alter table public.quizzes
  add constraint quizzes_subject_check
  check (char_length(trim(subject)) between 1 and 80);

alter table public.quizzes
  drop constraint if exists quizzes_creator_name_check;

alter table public.quizzes
  add constraint quizzes_creator_name_check
  check (char_length(trim(creator_name)) between 1 and 80);

alter table public.quizzes
  drop constraint if exists quizzes_quiz_shape_check;

alter table public.quizzes
  add constraint quizzes_quiz_shape_check
  check (
    jsonb_typeof(quiz) = 'object'
    and jsonb_typeof(quiz -> 'questions') = 'array'
    and jsonb_array_length(quiz -> 'questions') between 1 and 200
  );

alter table public.quizzes
  drop constraint if exists quizzes_play_count_check;

alter table public.quizzes
  add constraint quizzes_play_count_check
  check (play_count >= 0);

create index if not exists quizzes_owner_idx
on public.quizzes(owner_id);

create index if not exists quizzes_visibility_created_idx
on public.quizzes(visibility, created_at desc);

create index if not exists quizzes_title_lower_idx
on public.quizzes(lower(title));

create index if not exists quizzes_subject_lower_idx
on public.quizzes(lower(subject));

alter table public.quizzes enable row level security;

drop policy if exists "Public quizzes and owners can read quizzes"
on public.quizzes;

drop policy if exists "Authenticated users can create their quizzes"
on public.quizzes;

drop policy if exists "Owners can update their quizzes"
on public.quizzes;

drop policy if exists "Owners can delete their quizzes"
on public.quizzes;

create policy "Public quizzes and owners can read quizzes"
on public.quizzes
for select
to authenticated
using (
  visibility = 'public'
  or owner_id = auth.uid()
);

create policy "Authenticated users can create their quizzes"
on public.quizzes
for insert
to authenticated
with check (
  owner_id = auth.uid()
  and visibility in ('public', 'private')
);

create policy "Owners can update their quizzes"
on public.quizzes
for update
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

create policy "Owners can delete their quizzes"
on public.quizzes
for delete
to authenticated
using (owner_id = auth.uid());

revoke all on public.quizzes from anon;
grant select, insert, update, delete
on public.quizzes
to authenticated;

create or replace function public.increment_quiz_play_count(
  p_quiz_id uuid
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_count integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required';
  end if;

  update public.quizzes
  set play_count = play_count + 1
  where id = p_quiz_id
    and visibility = 'public'
  returning play_count into updated_count;

  if updated_count is null then
    raise exception 'Public quiz not found';
  end if;

  return updated_count;
end;
$$;

revoke all on function public.increment_quiz_play_count(uuid)
from public, anon;

grant execute on function public.increment_quiz_play_count(uuid)
to authenticated;
