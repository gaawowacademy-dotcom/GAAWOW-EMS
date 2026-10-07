-- GAAWOW EMS: additive RLS fix for Student Portal Grades
-- This DOES NOT drop or replace existing policies.
-- It only adds student-specific SELECT access to subject/exam rows
-- that are already referenced by the student's published results.

CREATE POLICY "Students can view subjects for own results"
ON public.subjects
FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT r.subject_id
    FROM public.results r
    JOIN public.students s ON s.id = r.student_id
    WHERE s.auth_user_id = auth.uid()
      AND r.is_published = true
  )
);

CREATE POLICY "Students can view exams for own results"
ON public.exams
FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT r.exam_id
    FROM public.results r
    JOIN public.students s ON s.id = r.student_id
    WHERE s.auth_user_id = auth.uid()
      AND r.is_published = true
  )
);

-- Existing policies on classes, subjects, exams and results are preserved.
