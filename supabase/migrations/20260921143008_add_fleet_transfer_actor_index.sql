create index if not exists fleet_transfers_transferred_by_idx
  on public.fleet_transfers (transferred_by, transferred_at desc);
