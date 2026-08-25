-- JobMap application lifecycle and follow-up fields.
-- Forward-only migration; existing RLS policies continue to protect rows by user_id.

alter table public.applications
  add column if not exists applied_at timestamptz,
  add column if not exists follow_up_at timestamptz,
  add column if not exists follow_up_note text,
  add column if not exists recruiter_contact text,
  add column if not exists next_action text,
  add column if not exists submission_receipt jsonb,
  add column if not exists execution_state varchar(40) not null default 'not_started';

create index if not exists applications_follow_up_idx
  on public.applications (user_id, follow_up_at)
  where deleted_at is null and follow_up_at is not null;

comment on column public.applications.applied_at is 'User-confirmed or adapter-confirmed application timestamp.';
comment on column public.applications.follow_up_at is 'Optional user-defined follow-up timestamp.';
comment on column public.applications.submission_receipt is 'Non-secret adapter receipt metadata; never stores credentials or tokens.';
comment on column public.applications.execution_state is 'not_started, ready, paused, submitted, failed_safely, or manual_fallback.';
