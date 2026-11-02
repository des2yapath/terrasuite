-- TerraSuite keepalive schedules. Requires pg_cron and pg_net enabled in Supabase.
create extension if not exists pg_cron;
create extension if not exists pg_net;

create table if not exists public.terrasuite_keepalive_log (
  id bigint generated always as identity primary key,
  ran_at timestamptz not null default now(),
  parcels_count integer not null
);

do $$
begin
  if exists (select 1 from cron.job where jobname = 'terrasuite-keepalive') then
    perform cron.unschedule('terrasuite-keepalive');
  end if;
  if exists (select 1 from cron.job where jobname = 'terrasuite-keepalive-trim') then
    perform cron.unschedule('terrasuite-keepalive-trim');
  end if;
end
$$;

select cron.schedule(
  'terrasuite-keepalive',
  '0 */6 * * *',
  $$
    insert into public.terrasuite_keepalive_log (ran_at, parcels_count)
    select now(), (select count(*) from public.parcels);
  $$
);

select cron.schedule(
  'terrasuite-keepalive-trim',
  '0 3 * * *',
  $$
    delete from public.terrasuite_keepalive_log
    where id not in (
      select id from public.terrasuite_keepalive_log order by id desc limit 50
    );
  $$
);
