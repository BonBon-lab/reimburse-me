-- ============================================================
-- ReimburseMe — initial schema
-- Matches src/lib/db.ts (pre-auth, single-user phase).
-- When auth lands (Phase 2): add user_id columns + replace the
-- permissive RLS policies below with per-user policies.
-- ============================================================

-- ---------- CATEGORIES ----------
create table if not exists categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  icon        text not null default '📝',
  color       text not null default '#888888',
  is_default  boolean not null default false,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);

-- ---------- REIMBURSEMENT REPORTS ----------
-- (created before expenses because expenses.report_id references it)
create table if not exists reimbursement_reports (
  id            uuid primary key default gen_random_uuid(),
  date_from     date not null,
  date_to       date not null,
  total_amount  bigint not null,                  -- IDR, integer (no decimals)
  expense_count int not null default 0,
  receipt_count int not null default 0,
  status        text not null default 'submitted'
                check (status in ('draft', 'submitted', 'paid')),
  breakdown     jsonb,                            -- {"<category_id>": <subtotal>, ...}
  created_at    timestamptz not null default now()
);

-- ---------- EXPENSES ----------
create table if not exists expenses (
  id            uuid primary key default gen_random_uuid(),
  category_id   uuid not null references categories(id),
  amount        bigint not null check (amount >= 0), -- IDR, integer
  currency      text not null default 'IDR',
  date          date not null,
  note          text,
  has_receipt   boolean not null default false,
  receipt_url   text,
  ai_extracted  boolean not null default false,
  status        text not null default 'pending'
                check (status in ('pending', 'reimbursed')),
  report_id     uuid references reimbursement_reports(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Indexes for the app's query patterns
create index if not exists idx_expenses_status_date on expenses(status, date desc);
create index if not exists idx_expenses_category    on expenses(category_id);
create index if not exists idx_expenses_report      on expenses(report_id);

-- Keep updated_at fresh
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_expenses_updated_at on expenses;
create trigger trg_expenses_updated_at
  before update on expenses
  for each row execute function set_updated_at();

-- ---------- ROW LEVEL SECURITY ----------
-- Enabled now so the structure is in place. The current policies are
-- intentionally permissive (single-user app, anon key). Phase 2 (auth)
-- replaces these with:  using (user_id = auth.uid())
alter table categories            enable row level security;
alter table expenses              enable row level security;
alter table reimbursement_reports enable row level security;

create policy categories_all on categories
  for all to anon, authenticated using (true) with check (true);
create policy expenses_all on expenses
  for all to anon, authenticated using (true) with check (true);
create policy reports_all on reimbursement_reports
  for all to anon, authenticated using (true) with check (true);

-- ---------- STORAGE: receipts bucket ----------
-- Public for now because db.ts uses getPublicUrl(). Phase 2: switch to
-- private bucket + signed URLs.
insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', true)
on conflict (id) do nothing;

create policy receipts_read on storage.objects
  for select to anon, authenticated using (bucket_id = 'receipts');
create policy receipts_insert on storage.objects
  for insert to anon, authenticated with check (bucket_id = 'receipts');
create policy receipts_update on storage.objects
  for update to anon, authenticated using (bucket_id = 'receipts');

-- ---------- SEED: default categories ----------
insert into categories (name, icon, color, is_default, sort_order) values
  ('Samples',        '👗', '#E8927C', true, 1),
  ('Convection Fee', '🧵', '#7CB9E8', true, 2),
  ('Material',       '🧶', '#9FE2BF', true, 3),
  ('Photoshoot',     '📸', '#C3A6FF', true, 4),
  ('Shipping',       '📦', '#FFD580', true, 5),
  ('Marketing',      '📣', '#FF9AA2', true, 6),
  ('Other',          '📝', '#B0B0B0', true, 7)
on conflict (name) do nothing;
