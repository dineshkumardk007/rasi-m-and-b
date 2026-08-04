-- Retry tracking + dead-letter for the event outbox.
--
-- drainPendingEvents() previously retried every unprocessed row forever, with
-- no attempt counter and no way to tell a transient failure from a
-- permanently-broken payload (e.g. a deleted n8n workflow). That means a bad
-- event sits in the pending queue and gets silently retried once a day,
-- indefinitely, with nothing surfacing that it needs a human. Adding an
-- attempt counter lets deliverToN8n() give up after a bounded number of tries
-- and mark the row so it stops being selected by the drain query, instead of
-- retrying it forever.

alter table events
  add column if not exists attempts int not null default 0,
  add column if not exists last_attempt_at timestamptz,
  add column if not exists dead_lettered_at timestamptz;

-- The old partial index only excluded processed rows; dead-lettered ones
-- should also stop being scanned by the pending-events query.
drop index if exists events_pending_idx;
create index events_pending_idx on events(created_at)
  where processed_at is null and dead_lettered_at is null;
