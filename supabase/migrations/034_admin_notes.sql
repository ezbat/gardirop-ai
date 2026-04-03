-- ─── 034_admin_notes.sql ─────────────────────────────────────────────────────
-- Internal admin notes system.
-- Admins can attach private operational notes to any resource:
-- sellers, products, orders, payouts.
-- All notes are internal-only (visibility = 'internal').
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.admin_notes (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  resource_type text        NOT NULL CHECK (resource_type IN ('seller','product','order','payout')),
  resource_id   text        NOT NULL,
  admin_actor   text        NULL,       -- free-text identifier for the admin who wrote the note
  note          text        NOT NULL CHECK (char_length(note) > 0),
  visibility    text        NOT NULL DEFAULT 'internal' CHECK (visibility IN ('internal'))
);

-- Fast lookup by resource (the primary access pattern)
CREATE INDEX IF NOT EXISTS idx_admin_notes_resource
  ON public.admin_notes (resource_type, resource_id, created_at DESC);

-- Optional: chronological view across all notes
CREATE INDEX IF NOT EXISTS idx_admin_notes_created
  ON public.admin_notes (created_at DESC);

-- ── Auto-update updated_at ────────────────────────────────────────────────────
-- Reuses set_updated_at() from migration 033 if it exists; otherwise creates it.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'set_updated_at'
  ) THEN
    EXECUTE $fn$
      CREATE FUNCTION public.set_updated_at()
      RETURNS trigger LANGUAGE plpgsql AS $body$
      BEGIN
        NEW.updated_at = now();
        RETURN NEW;
      END;
      $body$;
    $fn$;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'admin_notes_set_updated_at'
  ) THEN
    CREATE TRIGGER admin_notes_set_updated_at
      BEFORE UPDATE ON public.admin_notes
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE public.admin_notes ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'admin_notes'
      AND policyname = 'service_role_all'
  ) THEN
    CREATE POLICY service_role_all ON public.admin_notes
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;
