-- Add calendar type to support TimeTree-style Personal + Shared calendars

alter table public.calendars
  add column if not exists type text;

-- Backfill + default
update public.calendars set type = 'shared' where type is null;

alter table public.calendars
  alter column type set default 'shared',
  alter column type set not null;

-- Constrain values
alter table public.calendars
  add constraint if not exists calendars_type_check check (type in ('personal', 'shared'));

-- Helpful index for lookups
create index if not exists idx_calendars_created_by_type on public.calendars(created_by, type);
