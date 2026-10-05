-- Axious Office database schema.
-- Run once in Supabase: Dashboard → SQL Editor → New query → paste → Run.

create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  business jsonb not null default '{}'::jsonb,   -- name, address, email, phone, vatNo, regNo
  bank jsonb not null default '{}'::jsonb,       -- bank, holder, account, branch, type
  logo_url text,
  plan text not null default 'free' check (plan in ('free', 'pro')),
  plan_expires_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  name text not null,
  email text, phone text, address text, vat_no text,
  created_at timestamptz not null default now()
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  client_id uuid references public.clients on delete set null,
  type text not null check (type in ('invoice', 'quote')),
  number text not null,
  status text not null default 'draft'
    check (status in ('draft', 'sent', 'viewed', 'accepted', 'declined', 'paid', 'overdue', 'cancelled')),
  data jsonb not null,                -- full editor state (same shape as invoice.js draft)
  total numeric(14, 2) not null default 0,
  currency text not null default 'R',
  due_date date,
  public_token text not null unique default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists documents_user_idx on public.documents (user_id, created_at desc);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('subscription', 'invoice')),
  user_id uuid not null references auth.users on delete cascade,
  document_id uuid references public.documents on delete set null,
  yoco_checkout_id text unique,      -- unique = webhook handling is idempotent
  amount_cents integer not null,
  currency text not null default 'ZAR',
  status text not null default 'pending' check (status in ('pending', 'succeeded', 'failed')),
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

-- Users' own Yoco keys, encrypted by the server. Never readable from the browser.
create table if not exists public.merchant_settings (
  user_id uuid primary key references auth.users on delete cascade,
  yoco_key_encrypted text,
  yoco_webhook_id text,
  updated_at timestamptz not null default now()
);

create table if not exists public.email_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  document_id uuid references public.documents on delete cascade,
  to_email text not null,
  template text not null,
  brevo_message_id text,
  status text not null default 'sent',
  created_at timestamptz not null default now()
);

-- Row-level security: users only see their own rows.
alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.documents enable row level security;
alter table public.payments enable row level security;
alter table public.merchant_settings enable row level security;
alter table public.email_log enable row level security;

create policy "own profile" on public.profiles for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "own clients" on public.clients for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own documents" on public.documents for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "read own payments" on public.payments for select using (auth.uid() = user_id);
create policy "read own email log" on public.email_log for select using (auth.uid() = user_id);
-- merchant_settings: no policies → only the server (service role) can read/write it.

-- Users may not upgrade themselves: plan columns are changed only by the server (service role).
create or replace function public.protect_plan() returns trigger
language plpgsql as $$
begin
  if coalesce(auth.role(), '') <> 'service_role'
     and (new.plan is distinct from old.plan or new.plan_expires_at is distinct from old.plan_expires_at) then
    raise exception 'plan can only be changed by the server';
  end if;
  return new;
end $$;
drop trigger if exists profiles_protect_plan on public.profiles;
create trigger profiles_protect_plan before update on public.profiles
  for each row execute function public.protect_plan();

-- Create a profile row for every new sign-up.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Logos bucket: public read, users write only inside their own folder (<user id>/...).
insert into storage.buckets (id, name, public) values ('logos', 'logos', true) on conflict do nothing;
create policy "logo upload own folder" on storage.objects for insert to authenticated
  with check (bucket_id = 'logos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "logo update own folder" on storage.objects for update to authenticated
  using (bucket_id = 'logos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "logo delete own folder" on storage.objects for delete to authenticated
  using (bucket_id = 'logos' and (storage.foldername(name))[1] = auth.uid()::text);
