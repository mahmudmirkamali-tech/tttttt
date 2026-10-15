alter table content_items add column if not exists user_id text;
alter table send_log add column if not exists user_id text;
alter table crm_campaigns add column if not exists user_id text;
alter table crm_leads add column if not exists user_id text;
alter table crm_tasks add column if not exists user_id text;
alter table crm_interactions add column if not exists user_id text;
alter table ai_calls add column if not exists user_id text;

delete from send_log where user_id is null;
delete from content_items where user_id is null;
delete from crm_campaigns where user_id is null;
delete from crm_leads where user_id is null;
delete from crm_tasks where user_id is null;
delete from crm_interactions where user_id is null;
delete from ai_calls where user_id is null;

alter table content_items alter column user_id set not null;
alter table send_log alter column user_id set not null;
alter table crm_campaigns alter column user_id set not null;
alter table crm_leads alter column user_id set not null;
alter table crm_tasks alter column user_id set not null;
alter table crm_interactions alter column user_id set not null;
alter table ai_calls alter column user_id set not null;

alter table crm_leads add column if not exists follow_up text not null default 'open';
alter table crm_leads add column if not exists tags text not null default '';

create index if not exists content_items_user_idx on content_items (user_id, created_at);
create index if not exists send_log_user_idx on send_log (user_id, created_at);

create table if not exists studio_voice (
  user_id text primary key,
  voice text not null default ''
);

create table if not exists crm_contacts (
  id text primary key,
  user_id text not null,
  label text not null,
  kind text not null,
  source text not null,
  tags text not null default '',
  created_at timestamptz not null default now()
);

create unique index if not exists crm_contacts_user_label_idx on crm_contacts (user_id, label);

create table if not exists crm_opportunities (
  id text primary key,
  user_id text not null,
  title text not null,
  stage text not null,
  contact_label text,
  created_at timestamptz not null default now()
);

create index if not exists crm_opportunities_user_idx on crm_opportunities (user_id, created_at);

create unique index if not exists crm_leads_user_label_idx on crm_leads (user_id, label);
