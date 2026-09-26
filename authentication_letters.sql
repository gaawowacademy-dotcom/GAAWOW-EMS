-- GAAWOW EMS: dedicated Authentication Letter storage
-- IMPORTANT: this does NOT modify public.certificates.

create table if not exists public.authentication_letters (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid,
  student_id uuid,
  course_id uuid,
  reference_no text not null unique,
  authentication_id text not null unique,
  verification_code text not null unique,
  student_name text not null,
  course_name text not null,
  institution_name text,
  date_started date,
  date_completed date,
  issue_date date not null default current_date,
  expiry_date date,
  status text not null default 'valid',
  director_name text,
  academic_head_name text,
  verification_url text,
  template_url text,
  student_photo_url text,
  user_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists authentication_letters_verification_code_idx
  on public.authentication_letters (verification_code);

create index if not exists authentication_letters_student_id_idx
  on public.authentication_letters (student_id);

create index if not exists authentication_letters_institution_id_idx
  on public.authentication_letters (institution_id);

alter table public.authentication_letters enable row level security;

-- Authenticated EMS users can create/update their letters.
drop policy if exists "authentication_letters_insert_authenticated" on public.authentication_letters;
create policy "authentication_letters_insert_authenticated"
on public.authentication_letters
for insert to authenticated
with check (auth.uid() = user_id or user_id is null);

drop policy if exists "authentication_letters_update_authenticated" on public.authentication_letters;
create policy "authentication_letters_update_authenticated"
on public.authentication_letters
for update to authenticated
using (auth.uid() = user_id or user_id is null)
with check (auth.uid() = user_id or user_id is null);

-- Public verification is handled through the SECURITY DEFINER RPC below,
-- so the table itself is not exposed to anonymous users.
drop function if exists public.verify_authentication_letter(text,text);
create or replace function public.verify_authentication_letter(p_code text, p_id text default null)
returns table (
  reference_no text,
  authentication_id text,
  verification_code text,
  student_name text,
  course_name text,
  institution_name text,
  date_started date,
  date_completed date,
  issue_date date,
  expiry_date date,
  status text,
  verification_url text,
  student_photo_url text
)
language sql
security definer
set search_path = public
as $$
  select
    a.reference_no,
    a.authentication_id,
    a.verification_code,
    a.student_name,
    a.course_name,
    a.institution_name,
    a.date_started,
    a.date_completed,
    a.issue_date,
    a.expiry_date,
    a.status,
    a.verification_url,
    a.student_photo_url
  from public.authentication_letters a
  where a.verification_code = p_code
    and (p_id is null or a.authentication_id = p_id)
  limit 1;
$$;

grant execute on function public.verify_authentication_letter(text,text) to anon, authenticated;

create or replace function public.set_authentication_letters_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_authentication_letters_updated_at on public.authentication_letters;
create trigger trg_authentication_letters_updated_at
before update on public.authentication_letters
for each row execute function public.set_authentication_letters_updated_at();

notify pgrst, 'reload schema';
