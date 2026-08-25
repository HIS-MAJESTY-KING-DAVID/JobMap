-- JobMap ApplyFlow autofill contract
-- Stores only the generated source-backed bundle and review state; execution remains user-controlled.
alter table public.applications
  add column if not exists autofill_bundle jsonb,
  add column if not exists autofill_state varchar(30) not null default 'needs_review';

create index if not exists applications_autofill_state_idx
  on public.applications (user_id, autofill_state, updated_at desc);

comment on column public.applications.autofill_bundle is 'Source-backed field suggestions and origin-bound handoff metadata; never contains credentials or service-role secrets.';
comment on column public.applications.autofill_state is 'needs_review, ready_for_handoff, paused, blocked, or completed.';
