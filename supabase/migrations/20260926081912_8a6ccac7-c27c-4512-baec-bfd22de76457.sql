
create table public.profiles (
  id uuid primary key,
  full_name text,
  email text,
  job_title text default 'Inventory Manager',
  created_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "profiles readable by team" on public.profiles for select to authenticated using (true);
create policy "profiles insert own" on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "profiles update own" on public.profiles for update to authenticated using (auth.uid() = id);

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email,'@',1)), new.email)
  on conflict (id) do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  created_at timestamptz not null default now()
);
create table public.warehouses (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  address text,
  created_at timestamptz not null default now()
);
create table public.locations (
  id uuid primary key default gen_random_uuid(),
  warehouse_id uuid not null references public.warehouses(id) on delete restrict,
  code text not null,
  name text not null,
  kind text not null default 'internal',
  created_at timestamptz not null default now(),
  unique (warehouse_id, code)
);
create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  sku text not null,
  category_id uuid references public.categories(id) on delete set null,
  uom text not null default 'Units',
  reorder_level numeric not null default 0 check (reorder_level >= 0),
  unit_cost numeric not null default 0 check (unit_cost >= 0),
  description text,
  created_at timestamptz not null default now()
);
create unique index products_sku_unique on public.products (upper(sku));

create table public.stock (
  product_id uuid not null references public.products(id) on delete cascade,
  location_id uuid not null references public.locations(id) on delete restrict,
  quantity numeric not null default 0 check (quantity >= 0),
  updated_at timestamptz not null default now(),
  primary key (product_id, location_id)
);

create table public.reorder_rules (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  location_id uuid references public.locations(id) on delete cascade,
  min_qty numeric not null check (min_qty >= 0),
  max_qty numeric not null check (max_qty >= 0),
  created_at timestamptz not null default now(),
  check (max_qty >= min_qty)
);

create sequence public.seq_receipt;
create sequence public.seq_delivery;
create sequence public.seq_transfer;
create sequence public.seq_adjustment;

create table public.operations (
  id uuid primary key default gen_random_uuid(),
  reference text unique,
  type text not null check (type in ('receipt','delivery','transfer')),
  partner text,
  source_location_id uuid references public.locations(id),
  dest_location_id uuid references public.locations(id),
  status text not null default 'draft' check (status in ('draft','waiting','ready','done','canceled')),
  scheduled_date date not null default current_date,
  notes text,
  created_by uuid default auth.uid(),
  validated_by uuid,
  validated_at timestamptz,
  created_at timestamptz not null default now(),
  check (
    (type = 'receipt' and dest_location_id is not null) or
    (type = 'delivery' and source_location_id is not null) or
    (type = 'transfer' and source_location_id is not null and dest_location_id is not null and source_location_id <> dest_location_id)
  )
);
create table public.operation_lines (
  id uuid primary key default gen_random_uuid(),
  operation_id uuid not null references public.operations(id) on delete cascade,
  product_id uuid not null references public.products(id),
  quantity numeric not null check (quantity > 0),
  created_at timestamptz not null default now()
);

create or replace function public.set_operation_reference() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.reference is null then
    new.reference := case new.type
      when 'receipt' then 'WH/IN/' || lpad(nextval('seq_receipt')::text, 5, '0')
      when 'delivery' then 'WH/OUT/' || lpad(nextval('seq_delivery')::text, 5, '0')
      else 'WH/INT/' || lpad(nextval('seq_transfer')::text, 5, '0') end;
  end if;
  return new;
end $$;
create trigger trg_operation_reference before insert on public.operations for each row execute function public.set_operation_reference();

create table public.adjustments (
  id uuid primary key default gen_random_uuid(),
  reference text unique,
  product_id uuid not null references public.products(id),
  location_id uuid not null references public.locations(id),
  system_qty numeric not null,
  counted_qty numeric not null check (counted_qty >= 0),
  difference numeric generated always as (counted_qty - system_qty) stored,
  reason text,
  status text not null default 'done',
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);

create table public.stock_ledger (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  reference text not null,
  operation text not null check (operation in ('receipt','delivery','transfer','adjustment')),
  product_id uuid not null references public.products(id) on delete cascade,
  source_location_id uuid references public.locations(id),
  dest_location_id uuid references public.locations(id),
  quantity numeric not null,
  before_qty numeric not null,
  after_qty numeric not null,
  user_id uuid,
  user_name text,
  status text not null default 'done'
);
create index stock_ledger_created_idx on public.stock_ledger (created_at desc);
create index stock_ledger_product_idx on public.stock_ledger (product_id);

do $$
declare t text;
begin
  foreach t in array array['categories','warehouses','locations','products','reorder_rules','operations','operation_lines'] loop
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('grant all on public.%I to service_role', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "team read %1$s" on public.%1$I for select to authenticated using (true)', t);
    execute format('create policy "team insert %1$s" on public.%1$I for insert to authenticated with check (true)', t);
    execute format('create policy "team update %1$s" on public.%1$I for update to authenticated using (true)', t);
    execute format('create policy "team delete %1$s" on public.%1$I for delete to authenticated using (true)', t);
  end loop;
  foreach t in array array['stock','adjustments','stock_ledger'] loop
    execute format('grant select on public.%I to authenticated', t);
    execute format('grant all on public.%I to service_role', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "team read %1$s" on public.%1$I for select to authenticated using (true)', t);
  end loop;
end $$;

create or replace function public.guard_operation_edit() returns trigger
language plpgsql set search_path = public as $$
declare st text;
begin
  if current_setting('stocksense.internal', true) = 'on' then return coalesce(new, old); end if;
  if tg_table_name = 'operation_lines' then
    select status into st from operations where id = coalesce(new.operation_id, old.operation_id);
    if st in ('done','canceled') then raise exception 'This document is % and can no longer be edited', st; end if;
  elsif tg_op = 'UPDATE' and old.status in ('done','canceled') then
    raise exception 'This document is % and can no longer be edited', old.status;
  elsif tg_op = 'UPDATE' and new.status = 'done' then
    raise exception 'Documents can only be completed through validation';
  end if;
  return coalesce(new, old);
end $$;
create trigger trg_guard_lines before insert or update or delete on public.operation_lines for each row execute function public.guard_operation_edit();
create trigger trg_guard_ops before update on public.operations for each row execute function public.guard_operation_edit();

create or replace function public._current_user_name() returns text
language sql stable security definer set search_path = public as $$
  select coalesce((select full_name from profiles where id = auth.uid()), 'System')
$$;

create or replace function public._qty(_product uuid, _location uuid) returns numeric
language sql stable security definer set search_path = public as $$
  select coalesce((select quantity from stock where product_id = _product and location_id = _location), 0)
$$;

create or replace function public.confirm_operation(_id uuid) returns text
language plpgsql security definer set search_path = public as $$
declare op operations; ok boolean := true; ln record; n int;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  select * into op from operations where id = _id for update;
  if not found then raise exception 'Document not found'; end if;
  if op.status in ('done','canceled') then raise exception 'Document is already %', op.status; end if;
  select count(*) into n from operation_lines where operation_id = _id;
  if n = 0 then raise exception 'Add at least one product line before confirming'; end if;
  if op.type in ('delivery','transfer') then
    for ln in select product_id, sum(quantity) q from operation_lines where operation_id = _id group by product_id loop
      if _qty(ln.product_id, op.source_location_id) < ln.q then ok := false; end if;
    end loop;
  end if;
  update operations set status = case when ok then 'ready' else 'waiting' end where id = _id;
  return case when ok then 'ready' else 'waiting' end;
end $$;

create or replace function public.cancel_operation(_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  update operations set status = 'canceled' where id = _id and status not in ('done','canceled');
  if not found then raise exception 'Only open documents can be canceled'; end if;
end $$;

create or replace function public.validate_operation(_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare op operations; ln record; before_src numeric; before_dst numeric; uname text; n int;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  select * into op from operations where id = _id for update;
  if not found then raise exception 'Document not found'; end if;
  if op.status in ('done','canceled') then raise exception 'Document is already %', op.status; end if;
  select count(*) into n from operation_lines where operation_id = _id;
  if n = 0 then raise exception 'Add at least one product line before validating'; end if;
  uname := _current_user_name();

  for ln in select l.product_id, sum(l.quantity) q, max(p.name) pname
            from operation_lines l join products p on p.id = l.product_id
            where l.operation_id = _id group by l.product_id loop
    if op.type in ('delivery','transfer') then
      select quantity into before_src from stock where product_id = ln.product_id and location_id = op.source_location_id for update;
      before_src := coalesce(before_src, 0);
      if before_src < ln.q then
        raise exception 'Insufficient stock for %: % available, % requested', ln.pname, before_src, ln.q;
      end if;
      update stock set quantity = quantity - ln.q, updated_at = now() where product_id = ln.product_id and location_id = op.source_location_id;
    end if;
    if op.type in ('receipt','transfer') then
      before_dst := _qty(ln.product_id, op.dest_location_id);
      insert into stock (product_id, location_id, quantity) values (ln.product_id, op.dest_location_id, ln.q)
        on conflict (product_id, location_id) do update set quantity = stock.quantity + excluded.quantity, updated_at = now();
    end if;

    insert into stock_ledger (reference, operation, product_id, source_location_id, dest_location_id, quantity, before_qty, after_qty, user_id, user_name)
    values (op.reference, op.type, ln.product_id, op.source_location_id, op.dest_location_id,
      case when op.type = 'delivery' then -ln.q else ln.q end,
      case when op.type = 'receipt' then before_dst else before_src end,
      case when op.type = 'receipt' then before_dst + ln.q else before_src - ln.q end,
      auth.uid(), uname);
  end loop;

  perform set_config('stocksense.internal', 'on', true);
  update operations set status = 'done', validated_at = now(), validated_by = auth.uid() where id = _id;
  perform set_config('stocksense.internal', 'off', true);
end $$;

create or replace function public.apply_adjustment(_product uuid, _location uuid, _counted numeric, _reason text) returns uuid
language plpgsql security definer set search_path = public as $$
declare sys numeric; ref text; adj_id uuid;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  if _counted is null or _counted < 0 then raise exception 'Physical count cannot be negative'; end if;
  if not exists (select 1 from products where id = _product) then raise exception 'Invalid product'; end if;
  if not exists (select 1 from locations where id = _location) then raise exception 'Invalid location'; end if;
  select quantity into sys from stock where product_id = _product and location_id = _location for update;
  sys := coalesce(sys, 0);
  ref := 'WH/ADJ/' || lpad(nextval('seq_adjustment')::text, 5, '0');
  insert into stock (product_id, location_id, quantity) values (_product, _location, _counted)
    on conflict (product_id, location_id) do update set quantity = excluded.quantity, updated_at = now();
  insert into adjustments (reference, product_id, location_id, system_qty, counted_qty, reason)
    values (ref, _product, _location, sys, _counted, _reason) returning id into adj_id;
  insert into stock_ledger (reference, operation, product_id, source_location_id, dest_location_id, quantity, before_qty, after_qty, user_id, user_name)
    values (ref, 'adjustment', _product, null, _location, _counted - sys, sys, _counted, auth.uid(), _current_user_name());
  return adj_id;
end $$;

revoke execute on function public.confirm_operation(uuid), public.cancel_operation(uuid), public.validate_operation(uuid), public.apply_adjustment(uuid,uuid,numeric,text) from public, anon;
grant execute on function public.confirm_operation(uuid), public.cancel_operation(uuid), public.validate_operation(uuid), public.apply_adjustment(uuid,uuid,numeric,text) to authenticated;
revoke execute on function public._qty(uuid,uuid), public._current_user_name() from public, anon;

insert into categories (id, name, description) values
 ('c0000000-0000-0000-0000-000000000001','Raw Materials','Metals, stock and bulk inputs'),
 ('c0000000-0000-0000-0000-000000000002','Furniture','Office and facility furniture'),
 ('c0000000-0000-0000-0000-000000000003','Electronics','IT hardware and devices'),
 ('c0000000-0000-0000-0000-000000000004','Safety Equipment','PPE and site safety'),
 ('c0000000-0000-0000-0000-000000000005','Packaging','Boxes, wrap and consumables');

insert into warehouses (id, code, name, address) values
 ('a0000000-0000-0000-0000-000000000001','WH01','Main Distribution Center','Plot 14, Industrial Estate Phase II'),
 ('a0000000-0000-0000-0000-000000000002','WH02','North Fulfilment Hub','Unit 7, Logistics Park North');

insert into locations (id, warehouse_id, code, name) values
 ('b0000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000001','STOCK','Main Store'),
 ('b0000000-0000-0000-0000-000000000002','a0000000-0000-0000-0000-000000000001','RACK-A','Rack A'),
 ('b0000000-0000-0000-0000-000000000003','a0000000-0000-0000-0000-000000000001','RACK-B','Rack B'),
 ('b0000000-0000-0000-0000-000000000004','a0000000-0000-0000-0000-000000000001','PROD','Production Floor'),
 ('b0000000-0000-0000-0000-000000000005','a0000000-0000-0000-0000-000000000002','STOCK','North Store'),
 ('b0000000-0000-0000-0000-000000000006','a0000000-0000-0000-0000-000000000002','DOCK','Dispatch Dock');

insert into products (id, name, sku, category_id, uom, reorder_level, unit_cost) values
 ('d0000000-0000-0000-0000-000000000001','Steel Rods 12mm','RM-STL-012','c0000000-0000-0000-0000-000000000001','kg',200,1.8),
 ('d0000000-0000-0000-0000-000000000002','Aluminium Sheet 2mm','RM-ALU-002','c0000000-0000-0000-0000-000000000001','Sheets',40,24),
 ('d0000000-0000-0000-0000-000000000003','Ergonomic Office Chair','FN-CHR-001','c0000000-0000-0000-0000-000000000002','Units',15,145),
 ('d0000000-0000-0000-0000-000000000004','Standing Desk 140cm','FN-DSK-140','c0000000-0000-0000-0000-000000000002','Units',8,320),
 ('d0000000-0000-0000-0000-000000000005','Laptop 14" Pro','EL-LAP-014','c0000000-0000-0000-0000-000000000003','Units',10,1150),
 ('d0000000-0000-0000-0000-000000000006','27" Monitor','EL-MON-027','c0000000-0000-0000-0000-000000000003','Units',12,260),
 ('d0000000-0000-0000-0000-000000000007','Safety Helmet Class E','SF-HLM-00E','c0000000-0000-0000-0000-000000000004','Units',50,18),
 ('d0000000-0000-0000-0000-000000000008','Hi-Vis Vest','SF-VST-001','c0000000-0000-0000-0000-000000000004','Units',60,6.5),
 ('d0000000-0000-0000-0000-000000000009','Packaging Box Large','PK-BOX-L01','c0000000-0000-0000-0000-000000000005','Units',300,1.2),
 ('d0000000-0000-0000-0000-000000000010','Stretch Wrap Roll','PK-WRP-500','c0000000-0000-0000-0000-000000000005','Rolls',25,14);

insert into stock (product_id, location_id, quantity) values
 ('d0000000-0000-0000-0000-000000000001','b0000000-0000-0000-0000-000000000001',850),
 ('d0000000-0000-0000-0000-000000000001','b0000000-0000-0000-0000-000000000004',120),
 ('d0000000-0000-0000-0000-000000000002','b0000000-0000-0000-0000-000000000002',32),
 ('d0000000-0000-0000-0000-000000000003','b0000000-0000-0000-0000-000000000003',46),
 ('d0000000-0000-0000-0000-000000000003','b0000000-0000-0000-0000-000000000005',18),
 ('d0000000-0000-0000-0000-000000000004','b0000000-0000-0000-0000-000000000003',6),
 ('d0000000-0000-0000-0000-000000000005','b0000000-0000-0000-0000-000000000002',24),
 ('d0000000-0000-0000-0000-000000000006','b0000000-0000-0000-0000-000000000002',38),
 ('d0000000-0000-0000-0000-000000000007','b0000000-0000-0000-0000-000000000001',140),
 ('d0000000-0000-0000-0000-000000000007','b0000000-0000-0000-0000-000000000004',35),
 ('d0000000-0000-0000-0000-000000000009','b0000000-0000-0000-0000-000000000001',1200),
 ('d0000000-0000-0000-0000-000000000009','b0000000-0000-0000-0000-000000000006',260),
 ('d0000000-0000-0000-0000-000000000010','b0000000-0000-0000-0000-000000000006',9);

insert into reorder_rules (product_id, location_id, min_qty, max_qty) values
 ('d0000000-0000-0000-0000-000000000001','b0000000-0000-0000-0000-000000000001',200,1200),
 ('d0000000-0000-0000-0000-000000000004','b0000000-0000-0000-0000-000000000003',8,30),
 ('d0000000-0000-0000-0000-000000000008',null,60,300),
 ('d0000000-0000-0000-0000-000000000010','b0000000-0000-0000-0000-000000000006',25,120);

select set_config('stocksense.internal', 'on', true);

insert into operations (id, reference, type, partner, source_location_id, dest_location_id, status, scheduled_date, validated_at, created_at) values
 ('e0000000-0000-0000-0000-000000000001','WH/IN/00001','receipt','Tata Steel Distributors',null,'b0000000-0000-0000-0000-000000000001','done',current_date-9, now()-interval '9 days', now()-interval '10 days'),
 ('e0000000-0000-0000-0000-000000000002','WH/IN/00002','receipt','Northwind Electronics',null,'b0000000-0000-0000-0000-000000000002','done',current_date-6, now()-interval '6 days', now()-interval '7 days'),
 ('e0000000-0000-0000-0000-000000000003','WH/OUT/00001','delivery','Apex Constructions','b0000000-0000-0000-0000-000000000001',null,'done',current_date-4, now()-interval '4 days', now()-interval '5 days'),
 ('e0000000-0000-0000-0000-000000000004','WH/INT/00001','transfer',null,'b0000000-0000-0000-0000-000000000001','b0000000-0000-0000-0000-000000000004','done',current_date-2, now()-interval '2 days', now()-interval '3 days'),
 ('e0000000-0000-0000-0000-000000000005','WH/IN/00003','receipt','Global Pack Supplies',null,'b0000000-0000-0000-0000-000000000001','ready',current_date+1,null, now()-interval '1 day'),
 ('e0000000-0000-0000-0000-000000000006','WH/IN/00004','receipt','SafeGuard PPE Ltd',null,'b0000000-0000-0000-0000-000000000001','waiting',current_date+3,null, now()-interval '12 hours'),
 ('e0000000-0000-0000-0000-000000000007','WH/OUT/00002','delivery','Meridian Offices','b0000000-0000-0000-0000-000000000003',null,'ready',current_date,null, now()-interval '8 hours'),
 ('e0000000-0000-0000-0000-000000000008','WH/OUT/00003','delivery','Horizon Retail','b0000000-0000-0000-0000-000000000006',null,'draft',current_date+2,null, now()-interval '3 hours'),
 ('e0000000-0000-0000-0000-000000000009','WH/INT/00002','transfer',null,'b0000000-0000-0000-0000-000000000003','b0000000-0000-0000-0000-000000000005','draft',current_date+1,null, now()-interval '2 hours');

insert into operation_lines (operation_id, product_id, quantity) values
 ('e0000000-0000-0000-0000-000000000001','d0000000-0000-0000-0000-000000000001',500),
 ('e0000000-0000-0000-0000-000000000002','d0000000-0000-0000-0000-000000000005',12),
 ('e0000000-0000-0000-0000-000000000002','d0000000-0000-0000-0000-000000000006',20),
 ('e0000000-0000-0000-0000-000000000003','d0000000-0000-0000-0000-000000000007',40),
 ('e0000000-0000-0000-0000-000000000004','d0000000-0000-0000-0000-000000000001',120),
 ('e0000000-0000-0000-0000-000000000005','d0000000-0000-0000-0000-000000000009',800),
 ('e0000000-0000-0000-0000-000000000005','d0000000-0000-0000-0000-000000000010',60),
 ('e0000000-0000-0000-0000-000000000006','d0000000-0000-0000-0000-000000000008',200),
 ('e0000000-0000-0000-0000-000000000007','d0000000-0000-0000-0000-000000000003',10),
 ('e0000000-0000-0000-0000-000000000008','d0000000-0000-0000-0000-000000000009',150),
 ('e0000000-0000-0000-0000-000000000009','d0000000-0000-0000-0000-000000000003',8);

select set_config('stocksense.internal', 'off', true);

select setval('seq_receipt', 4), setval('seq_delivery', 3), setval('seq_transfer', 2), setval('seq_adjustment', 1);

insert into adjustments (reference, product_id, location_id, system_qty, counted_qty, reason, created_at) values
 ('WH/ADJ/00001','d0000000-0000-0000-0000-000000000002','b0000000-0000-0000-0000-000000000002',35,32,'Damaged during handling', now()-interval '1 day');

insert into stock_ledger (created_at, reference, operation, product_id, source_location_id, dest_location_id, quantity, before_qty, after_qty, user_name) values
 (now()-interval '9 days','WH/IN/00001','receipt','d0000000-0000-0000-0000-000000000001',null,'b0000000-0000-0000-0000-000000000001',500,470,970,'System'),
 (now()-interval '6 days','WH/IN/00002','receipt','d0000000-0000-0000-0000-000000000005',null,'b0000000-0000-0000-0000-000000000002',12,12,24,'System'),
 (now()-interval '6 days','WH/IN/00002','receipt','d0000000-0000-0000-0000-000000000006',null,'b0000000-0000-0000-0000-000000000002',20,18,38,'System'),
 (now()-interval '4 days','WH/OUT/00001','delivery','d0000000-0000-0000-0000-000000000007','b0000000-0000-0000-0000-000000000001',null,-40,180,140,'System'),
 (now()-interval '2 days','WH/INT/00001','transfer','d0000000-0000-0000-0000-000000000001','b0000000-0000-0000-0000-000000000001','b0000000-0000-0000-0000-000000000004',120,970,850,'System'),
 (now()-interval '1 day','WH/ADJ/00001','adjustment','d0000000-0000-0000-0000-000000000002',null,'b0000000-0000-0000-0000-000000000002',-3,35,32,'System');
