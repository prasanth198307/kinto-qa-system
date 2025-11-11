-- Migration: Add photo and spare parts columns to partial_task_answers
-- Date: 2025-11-11
-- Description: Adds columns for photo capture and spare parts requests in WhatsApp checklist workflow

-- Add photo URL column
ALTER TABLE partial_task_answers 
ADD COLUMN IF NOT EXISTS photo_url VARCHAR(500);

-- Add spare part reference column
ALTER TABLE partial_task_answers 
ADD COLUMN IF NOT EXISTS spare_part_id VARCHAR 
REFERENCES spare_parts_catalog(id);

-- Add spare part request text column (for free-text requests)
ALTER TABLE partial_task_answers 
ADD COLUMN IF NOT EXISTS spare_part_request_text TEXT;

-- Add waiting for photo flag
ALTER TABLE partial_task_answers 
ADD COLUMN IF NOT EXISTS waiting_for_photo INTEGER DEFAULT 0;

-- Add waiting for spare part flag
ALTER TABLE partial_task_answers 
ADD COLUMN IF NOT EXISTS waiting_for_spare_part INTEGER DEFAULT 0;

-- Add comments for new columns
COMMENT ON COLUMN partial_task_answers.photo_url IS 'Local file path to uploaded photo for NOK tasks';
COMMENT ON COLUMN partial_task_answers.spare_part_id IS 'FK to spare_parts_catalog - linked spare part request';
COMMENT ON COLUMN partial_task_answers.spare_part_request_text IS 'Free-text spare part request from operator';
COMMENT ON COLUMN partial_task_answers.waiting_for_photo IS '1 = waiting for photo upload from operator';
COMMENT ON COLUMN partial_task_answers.waiting_for_spare_part IS '1 = waiting for spare part response from operator';
