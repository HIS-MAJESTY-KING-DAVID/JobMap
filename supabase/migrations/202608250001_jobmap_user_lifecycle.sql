begin;

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

-- Existing foundation tables: preserve current columns and add lifecycle metadata.
alter table public.profiles
  add column if not exists onboarding_status varchar(40) not null default 'started',
  add column if not exists gpa numeric(4,2),
  add column if not exists preferences jsonb,
  add column if not exists profile_strength integer not null default 0,
  add column if not exists deleted_at timestamptz,
  add column if not exists created_at timestamptz not null default timezone('utc', now()),
  add column if not exists updated_at timestamptz not null default timezone('utc', now());

alter table public.cv_documents
  add column if not exists profile_id uuid,
  add column if not exists version_label varchar(120),
  add column if not exists is_default boolean not null default false,
  add column if not exists checksum varchar(128),
  add column if not exists deleted_at timestamptz,
  add column if not exists updated_at timestamptz not null default timezone('utc', now());

create table if not exists public.profile_versions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label varchar(120) not null,
  snapshot jsonb not null default '{}'::jsonb,
  is_default boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.job_sources (
  id uuid primary key default gen_random_uuid(),
  slug varchar(100) not null unique,
  name varchar(160) not null,
  source_type varchar(40) not null,
  application_mode varchar(40) not null default 'manual_fallback',
  coverage varchar(40) not null default 'global',
  status varchar(60) not null default 'candidate',
  owner varchar(255),
  base_url varchar(500),
  machine_endpoint varchar(1000),
  terms_state varchar(120),
  notes text,
  enabled boolean not null default false,
  verified_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.job_sources
  add column if not exists coverage varchar(40) not null default 'global',
  add column if not exists status varchar(60) not null default 'candidate',
  add column if not exists owner varchar(255),
  add column if not exists machine_endpoint varchar(1000),
  add column if not exists terms_state varchar(120),
  add column if not exists notes text;

create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.job_sources(id) on delete restrict,
  external_id varchar(255) not null,
  title varchar(255) not null,
  company varchar(255) not null,
  location varchar(255),
  country varchar(120),
  work_mode varchar(40),
  employment_type varchar(80),
  description text,
  application_url varchar(1500),
  application_endpoint varchar(1500),
  eligibility jsonb,
  published_at timestamptz,
  expires_at timestamptz,
  last_seen_at timestamptz not null default timezone('utc', now()),
  raw_payload jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (source_id, external_id)
);

create table if not exists public.saved_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  job_id uuid not null references public.jobs(id) on delete cascade,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, job_id)
);

create table if not exists public.saved_searches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label varchar(120) not null,
  criteria jsonb not null default '{}'::jsonb,
  alerts_on boolean not null default false,
  last_sent_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  job_id uuid references public.jobs(id) on delete set null,
  job_fingerprint varchar(255) not null,
  profile_version_id uuid references public.profile_versions(id) on delete set null,
  cv_document_id uuid references public.cv_documents(id) on delete set null,
  status varchar(40) not null default 'draft',
  application_mode varchar(40) not null default 'manual_fallback',
  headline text,
  cover_note text,
  screening_answers jsonb,
  eligibility jsonb,
  source_url varchar(1500),
  submitted_at timestamptz,
  withdrawn_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, job_fingerprint)
);

create table if not exists public.application_answers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  question_key varchar(180) not null,
  question_text text,
  answer_value jsonb not null,
  sensitivity varchar(30) not null default 'sensitive',
  confirmed_at timestamptz not null,
  last_used_at timestamptz,
  use_count integer not null default 0,
  revoked_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, question_key)
);

create table if not exists public.application_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  application_id uuid not null references public.applications(id) on delete cascade,
  event_type varchar(60) not null,
  actor varchar(30) not null default 'user',
  metadata jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.consent_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  consent_type varchar(80) not null,
  policy_version varchar(40) not null,
  granted boolean not null,
  granted_at timestamptz not null,
  revoked_at timestamptz,
  metadata jsonb
);

create table if not exists public.notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email_enabled boolean not null default true,
  application_updates boolean not null default true,
  saved_search_alerts boolean not null default false,
  marketing_enabled boolean not null default false,
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.user_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  requested_at timestamptz not null default timezone('utc', now()),
  scheduled_purge_at timestamptz not null,
  status varchar(30) not null default 'requested',
  completed_at timestamptz,
  cancelled_at timestamptz,
  reason text
);

-- Foreign keys for the existing tables are added only when absent.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_id_fkey') then
    alter table public.profiles add constraint profiles_id_fkey foreign key (id) references auth.users(id) on delete cascade;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'cv_documents_user_id_fkey') then
    alter table public.cv_documents add constraint cv_documents_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'cv_documents_profile_id_fkey') then
    alter table public.cv_documents add constraint cv_documents_profile_id_fkey foreign key (profile_id) references public.profiles(id) on delete set null;
  end if;
end $$;

create index if not exists profile_versions_user_created_idx on public.profile_versions(user_id, created_at desc);
create index if not exists cv_documents_user_created_idx on public.cv_documents(user_id, created_at desc);
create index if not exists jobs_discovery_idx on public.jobs(country, work_mode, last_seen_at desc);
create index if not exists saved_jobs_user_idx on public.saved_jobs(user_id, created_at desc);
create index if not exists saved_searches_user_idx on public.saved_searches(user_id, updated_at desc);
create index if not exists applications_user_status_idx on public.applications(user_id, status, updated_at desc);
create index if not exists application_events_user_created_idx on public.application_events(user_id, created_at desc);
create index if not exists application_events_application_created_idx on public.application_events(application_id, created_at desc);
create index if not exists deletion_queue_idx on public.user_deletion_requests(status, scheduled_purge_at);

-- Keep timestamps consistent for mutable records.
do $$
declare
  table_name text;
begin
  for table_name in select unnest(array['profiles','cv_documents','profile_versions','job_sources','jobs','saved_jobs','saved_searches','applications','application_answers']) loop
    execute format('drop trigger if exists %I on public.%I', table_name || '_updated_at', table_name);
    execute format('create trigger %I before update on public.%I for each row execute function public.set_updated_at()', table_name || '_updated_at', table_name);
  end loop;
end $$;

-- New accounts get a minimal profile row; profile fields are completed by the user.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'))
  on conflict (id) do update set email = excluded.email;
  insert into public.notification_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- RLS: enable it on every application table. Shared job catalog is read-only to clients;
-- ingestion/admin writes must use a trusted server role, never the browser anon key.

do $$
declare
  t text;
begin
  for t in select unnest(array['profiles','cv_documents','profile_versions','saved_jobs','saved_searches','applications','application_answers','application_events','consent_records','notification_preferences','user_deletion_requests','job_sources','jobs']) loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- Re-runnable policies.
do $$
declare
  p record;
begin
  for p in select schemaname, tablename, policyname from pg_policies where schemaname = 'public' loop
    if p.tablename in ('profiles','cv_documents','profile_versions','saved_jobs','saved_searches','applications','application_answers','application_events','consent_records','notification_preferences','user_deletion_requests','job_sources','jobs') then
      execute format('drop policy if exists %I on public.%I', p.policyname, p.tablename);
    end if;
  end loop;
end $$;

create policy profiles_select_own on public.profiles for select to authenticated using (auth.uid() = id);
create policy profiles_insert_own on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy profiles_update_own on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);
create policy profiles_delete_own on public.profiles for delete to authenticated using (auth.uid() = id);

create policy cv_documents_select_own on public.cv_documents for select to authenticated using (auth.uid() = user_id and deleted_at is null);
create policy cv_documents_insert_own on public.cv_documents for insert to authenticated with check (auth.uid() = user_id);
create policy cv_documents_update_own on public.cv_documents for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy cv_documents_delete_own on public.cv_documents for delete to authenticated using (auth.uid() = user_id);

create policy profile_versions_select_own on public.profile_versions for select to authenticated using (auth.uid() = user_id);
create policy profile_versions_insert_own on public.profile_versions for insert to authenticated with check (auth.uid() = user_id);
create policy profile_versions_update_own on public.profile_versions for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy profile_versions_delete_own on public.profile_versions for delete to authenticated using (auth.uid() = user_id);

create policy saved_jobs_select_own on public.saved_jobs for select to authenticated using (auth.uid() = user_id);
create policy saved_jobs_insert_own on public.saved_jobs for insert to authenticated with check (auth.uid() = user_id);
create policy saved_jobs_update_own on public.saved_jobs for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy saved_jobs_delete_own on public.saved_jobs for delete to authenticated using (auth.uid() = user_id);

create policy saved_searches_select_own on public.saved_searches for select to authenticated using (auth.uid() = user_id);
create policy saved_searches_insert_own on public.saved_searches for insert to authenticated with check (auth.uid() = user_id);
create policy saved_searches_update_own on public.saved_searches for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy saved_searches_delete_own on public.saved_searches for delete to authenticated using (auth.uid() = user_id);

create policy applications_select_own on public.applications for select to authenticated using (auth.uid() = user_id and deleted_at is null);
create policy applications_insert_own on public.applications for insert to authenticated with check (auth.uid() = user_id);
create policy applications_update_own on public.applications for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy applications_delete_own on public.applications for delete to authenticated using (auth.uid() = user_id);

create policy application_answers_select_own on public.application_answers for select to authenticated using (auth.uid() = user_id and revoked_at is null);
create policy application_answers_insert_own on public.application_answers for insert to authenticated with check (auth.uid() = user_id);
create policy application_answers_update_own on public.application_answers for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy application_answers_delete_own on public.application_answers for delete to authenticated using (auth.uid() = user_id);

create policy application_events_select_own on public.application_events for select to authenticated using (auth.uid() = user_id);
create policy application_events_insert_own on public.application_events for insert to authenticated with check (auth.uid() = user_id);

create policy consent_records_select_own on public.consent_records for select to authenticated using (auth.uid() = user_id);
create policy consent_records_insert_own on public.consent_records for insert to authenticated with check (auth.uid() = user_id);

create policy notification_preferences_select_own on public.notification_preferences for select to authenticated using (auth.uid() = user_id);
create policy notification_preferences_insert_own on public.notification_preferences for insert to authenticated with check (auth.uid() = user_id);
create policy notification_preferences_update_own on public.notification_preferences for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy deletion_requests_select_own on public.user_deletion_requests for select to authenticated using (auth.uid() = user_id);
create policy deletion_requests_insert_own on public.user_deletion_requests for insert to authenticated with check (auth.uid() = user_id);
create policy deletion_requests_update_own on public.user_deletion_requests for update to authenticated using (auth.uid() = user_id);

create policy job_sources_public_read on public.job_sources for select to anon, authenticated using (enabled = true);
create policy jobs_public_read on public.jobs for select to anon, authenticated using (true);

-- Ensure Storage remains private and path-scoped to each authenticated user.
insert into storage.buckets (id, name, public)
values ('cv-documents', 'cv-documents', false)
on conflict (id) do update set public = false;

drop policy if exists cv_documents_storage_select on storage.objects;
drop policy if exists cv_documents_storage_insert on storage.objects;
drop policy if exists cv_documents_storage_update on storage.objects;
drop policy if exists cv_documents_storage_delete on storage.objects;
create policy cv_documents_storage_select on storage.objects for select to authenticated using (bucket_id = 'cv-documents' and (storage.foldername(name))[1] = (select auth.uid()::text));
create policy cv_documents_storage_insert on storage.objects for insert to authenticated with check (bucket_id = 'cv-documents' and (storage.foldername(name))[1] = (select auth.uid()::text));
create policy cv_documents_storage_update on storage.objects for update to authenticated using (bucket_id = 'cv-documents' and (storage.foldername(name))[1] = (select auth.uid()::text)) with check (bucket_id = 'cv-documents' and (storage.foldername(name))[1] = (select auth.uid()::text));
create policy cv_documents_storage_delete on storage.objects for delete to authenticated using (bucket_id = 'cv-documents' and (storage.foldername(name))[1] = (select auth.uid()::text));

commit;
