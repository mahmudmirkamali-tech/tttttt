create table if not exists content_items (
  id text primary key,
  channel text not null,
  title text not null,
  body text not null,
  status text not null,
  source text not null,
  scheduled_at timestamptz,
  approved_at timestamptz,
  sent_at timestamptz,
  telegram_message_id text,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists content_items_status_idx on content_items (status, scheduled_at);

create table if not exists send_log (
  id text primary key,
  content_id text not null,
  ok boolean not null,
  telegram_message_id text,
  error text,
  created_at timestamptz not null default now()
);

create index if not exists send_log_created_idx on send_log (created_at);

create table if not exists crm_campaigns (
  id text primary key,
  title text not null,
  channel text not null,
  status text not null,
  created_at timestamptz not null default now()
);

create table if not exists crm_leads (
  id text primary key,
  label text not null,
  stage text not null,
  source text not null,
  campaign_id text,
  created_at timestamptz not null default now()
);

create table if not exists crm_tasks (
  id text primary key,
  title text not null,
  lead_id text,
  campaign_id text,
  done boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists crm_interactions (
  id text primary key,
  lead_id text,
  kind text not null,
  summary text not null,
  created_at timestamptz not null default now()
);

create table if not exists ai_calls (
  id text primary key,
  purpose text not null,
  model text not null,
  prompt_tokens integer,
  completion_tokens integer,
  created_at timestamptz not null default now()
);

create table if not exists studio_settings (
  id integer primary key,
  voice text not null default ''
);

insert into studio_settings (id, voice)
values (1, '')
on conflict (id) do nothing;
