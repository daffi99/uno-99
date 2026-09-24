-- Add end_time column to tasks table to support multi-time slot duration
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS end_time VARCHAR(10) DEFAULT NULL;
