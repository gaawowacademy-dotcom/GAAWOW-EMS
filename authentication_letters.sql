-- Run this once in Supabase SQL Editor.
create table if not exists public.authentication_letters (
  id uuid primary key default gen_random_uuid(),
  certificate_id uuid unique references public.certificates(id) on delete set null,
  reference_no text not null,
  date_issued date,
  verification_code text unique,
  status text,
  student_name text,
  student_id text,
  course_name text,
  course_code text,
  date_started date,
  date_completed date,
  grade text,
  student_status text,
  letter_body text,
  director_name text,
  awarding_authority text,
  verification_status text,
  verification_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.authentication_letters enable row level security;

-- Adjust these policies to your existing EMS security model.
create policy "authenticated users can read authentication letters"
on public.authentication_letters for select
to authenticated using (true);

create policy "authenticated users can insert authentication letters"
on public.authentication_letters for insert
to authenticated with check (true);

create policy "authenticated users can update authentication letters"
on public.authentication_letters for update
to authenticated using (true) with check (true);
