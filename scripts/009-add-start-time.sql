-- Add start_time column to tasks table to remember time slot (e.g. '09:00', '10:00', '14:00')
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS start_time VARCHAR(10) DEFAULT NULL;
