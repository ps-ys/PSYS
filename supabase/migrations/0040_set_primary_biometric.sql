-- Migration 0040: Atomic RPC for inserting and setting primary student biometric
-- This resolves a concurrency race where two jobs processing the same student
-- might both decide to be primary.

CREATE OR REPLACE FUNCTION atomic_insert_student_biometric(
  p_institution_id uuid,
  p_student_id uuid,
  p_face_embedding vector(128),
  p_face_embedding_v2 vector(512),
  p_embedding_model text,
  p_embedding_version int,
  p_quality_score float
)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  v_lock_key bigint;
  v_current_primary_id uuid;
  v_current_quality float;
  v_is_primary boolean := false;
BEGIN
  -- 1. Acquire transaction-level advisory lock based on student_id
  -- We hash the UUID to text, then to a bigint lock key to ensure jobs
  -- for the same student serialize their is_primary checks.
  v_lock_key := hashtext(p_student_id::text);
  PERFORM pg_advisory_xact_lock(v_lock_key);

  -- 2. Look up current primary biometric
  SELECT id, quality_score INTO v_current_primary_id, v_current_quality
  FROM student_biometrics
  WHERE student_id = p_student_id AND is_primary = true
  LIMIT 1;

  -- 3. Decide if new biometric should be primary
  IF v_current_primary_id IS NULL THEN
    v_is_primary := true;
  ELSIF p_quality_score > COALESCE(v_current_quality, 0.0) THEN
    v_is_primary := true;
  END IF;

  -- 4. If new biometric is primary, demote the old primary
  IF v_is_primary = true AND v_current_primary_id IS NOT NULL THEN
    UPDATE student_biometrics
    SET is_primary = false
    WHERE id = v_current_primary_id;
  END IF;

  -- 5. Insert the new biometric
  INSERT INTO student_biometrics (
    institution_id,
    student_id,
    face_embedding,
    face_embedding_v2,
    embedding_model,
    embedding_version,
    is_primary,
    quality_score
  ) VALUES (
    p_institution_id,
    p_student_id,
    p_face_embedding,
    p_face_embedding_v2,
    p_embedding_model,
    p_embedding_version,
    v_is_primary,
    p_quality_score
  );

  RETURN v_is_primary;
END;
$$;
