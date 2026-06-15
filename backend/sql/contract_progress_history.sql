-- Lịch sử cập nhật tiến độ & yêu cầu chỉnh sửa trong giai đoạn Thực hiện
BEGIN;

CREATE TABLE IF NOT EXISTS public.contract_progress_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  entry_type character varying(32) NOT NULL
    CHECK (entry_type IN ('progress', 'revision')),
  note text NOT NULL,
  demo_url text,
  actor_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_contract_progress_entries_contract
  ON public.contract_progress_entries (contract_id, created_at ASC);

-- Backfill bản ghi tiến độ hiện có (nếu chưa có lịch sử)
INSERT INTO public.contract_progress_entries (contract_id, entry_type, note, demo_url, actor_id, created_at)
SELECT c.id,
       'progress',
       trim(c.progress_note),
       NULLIF(trim(c.demo_url), ''),
       c.freelancer_id,
       COALESCE(c.updated_at, c.created_at)
FROM public.contracts c
WHERE c.deleted_at IS NULL
  AND c.progress_note IS NOT NULL
  AND trim(c.progress_note) <> ''
  AND NOT EXISTS (
    SELECT 1 FROM public.contract_progress_entries e WHERE e.contract_id = c.id
  );

-- Backfill yêu cầu chỉnh sửa từ workflow events (nếu có)
INSERT INTO public.contract_progress_entries (contract_id, entry_type, note, actor_id, created_at)
SELECT e.contract_id,
       'revision',
       trim(e.payload->>'note'),
       e.actor_id,
       e.created_at
FROM public.contract_workflow_events e
WHERE e.event_type = 'revision_requested'
  AND e.payload->>'note' IS NOT NULL
  AND trim(e.payload->>'note') <> ''
  AND NOT EXISTS (
    SELECT 1
    FROM public.contract_progress_entries pe
    WHERE pe.contract_id = e.contract_id
      AND pe.entry_type = 'revision'
      AND pe.note = trim(e.payload->>'note')
      AND pe.created_at = e.created_at
  );

COMMIT;
