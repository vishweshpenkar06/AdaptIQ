-- Expand question coverage so every concept has at least 8 questions.
-- Safe to rerun: it only inserts when a concept has fewer than 8 rows.

DO $$
DECLARE
  concept_row RECORD;
  existing_count INTEGER;
  idx INTEGER;
  difficulty_level INTEGER;
BEGIN
  FOR concept_row IN
    SELECT id, name
    FROM public.concepts
  LOOP
    SELECT COUNT(*)
    INTO existing_count
    FROM public.questions
    WHERE concept_id = concept_row.id;

    IF existing_count < 8 THEN
      FOR idx IN (existing_count + 1)..8 LOOP
        difficulty_level := CASE
          WHEN idx <= 3 THEN 1
          WHEN idx <= 6 THEN 3
          ELSE 5
        END;

        INSERT INTO public.questions (
          id,
          concept_id,
          question_text,
          question_type,
          options,
          correct_answer,
          explanation,
          difficulty
        )
        VALUES (
          gen_random_uuid(),
          concept_row.id,
          format(
            '%s practice %s: choose the best answer for this concept check.',
            concept_row.name,
            idx
          ),
          'mcq',
          jsonb_build_array(
            format('%s key idea', concept_row.name),
            format('%s common mistake', concept_row.name),
            'Unrelated rule',
            'Insufficient information'
          ),
          format('%s key idea', concept_row.name),
          format(
            'This check reinforces the central rule of %s. Review the definition and one worked example before attempting harder items.',
            concept_row.name
          ),
          difficulty_level
        );
      END LOOP;
    END IF;
  END LOOP;
END $$;
