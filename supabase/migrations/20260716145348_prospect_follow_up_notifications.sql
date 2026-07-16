-- Internal prospect follow-up reminders.
-- Additive and backward-compatible: existing prospects remain unchanged.

BEGIN;

ALTER TABLE public.prospects
  ADD COLUMN IF NOT EXISTS follow_up_at timestamptz,
  ADD COLUMN IF NOT EXISTS follow_up_note text,
  ADD COLUMN IF NOT EXISTS follow_up_notified_at timestamptz;

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS prospect_id uuid REFERENCES public.prospects(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS dedupe_key text;

CREATE INDEX IF NOT EXISTS idx_prospects_follow_up_due
  ON public.prospects (follow_up_at)
  WHERE follow_up_at IS NOT NULL AND follow_up_notified_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_prospect_id
  ON public.notifications (prospect_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_dedupe_key_unique
  ON public.notifications (dedupe_key)
  WHERE dedupe_key IS NOT NULL;

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION private.dispatch_due_prospect_follow_ups()
RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public, private
AS $$
DECLARE
  processed_count integer;
BEGIN
  WITH due AS (
    SELECT
      p.id,
      p.company,
      p.owner_id,
      p.is_test_data,
      p.follow_up_at,
      'prospect_follow_up:' || p.id::text || ':' || extract(epoch FROM p.follow_up_at)::bigint::text AS dedupe_key
    FROM public.prospects p
    WHERE p.follow_up_at IS NOT NULL
      AND p.follow_up_at <= now()
      AND p.follow_up_notified_at IS NULL
    ORDER BY p.follow_up_at ASC
    FOR UPDATE SKIP LOCKED
    LIMIT 100
  ), inserted AS (
    INSERT INTO public.notifications (
      user_id,
      title,
      message,
      is_test_data,
      is_read,
      prospect_id,
      dedupe_key
    )
    SELECT
      due.owner_id,
      'Retorno com cliente: ' || due.company,
      'Chegou a hora de retornar o contato com ' || due.company || '.',
      due.is_test_data,
      false,
      due.id,
      due.dedupe_key
    FROM due
    ON CONFLICT (dedupe_key) WHERE dedupe_key IS NOT NULL DO NOTHING
    RETURNING dedupe_key
  ), marked AS (
    UPDATE public.prospects p
    SET follow_up_notified_at = now()
    FROM due
    WHERE p.id = due.id
      AND (
        EXISTS (
          SELECT 1
          FROM inserted
          WHERE inserted.dedupe_key = due.dedupe_key
        )
        OR EXISTS (
          SELECT 1
          FROM public.notifications n
          WHERE n.dedupe_key = due.dedupe_key
        )
      )
    RETURNING p.id
  )
  SELECT count(*)::integer
  INTO processed_count
  FROM marked;

  RETURN processed_count;
END;
$$;

REVOKE ALL ON FUNCTION private.dispatch_due_prospect_follow_ups() FROM PUBLIC, anon, authenticated;

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;

SELECT cron.unschedule(jobid)
FROM cron.job
WHERE jobname = 'dispatch-due-prospect-follow-ups';

SELECT cron.schedule(
  'dispatch-due-prospect-follow-ups',
  '* * * * *',
  'SELECT private.dispatch_due_prospect_follow_ups();'
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_publication
    WHERE pubname = 'supabase_realtime'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'notifications'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications';
  END IF;
END;
$$;

COMMIT;
