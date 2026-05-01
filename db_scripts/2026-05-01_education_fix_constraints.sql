-- Fix: Add missing unique constraint on exam_marks for ON CONFLICT to work
ALTER TABLE exam_marks ADD CONSTRAINT exam_marks_exam_student_uidx UNIQUE (examination_id, student_id);
-- Fix: Add unique constraint on fee_structure_components for ON CONFLICT DO NOTHING
ALTER TABLE fee_structure_components ADD CONSTRAINT fsc_structure_component_uidx UNIQUE (structure_id, component_id);
