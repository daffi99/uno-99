-- Drop the existing check constraint completely
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_recurring_check;

-- Add the new constraint with all valid values including 'daily'
ALTER TABLE tasks ADD CONSTRAINT tasks_recurring_check 
CHECK (recurring IN ('no', 'daily', 'weekly', 'monthly'));

-- Update any existing 'monthly' values to 'daily' if they exist
UPDATE tasks SET recurring = 'daily' WHERE recurring = 'monthly';

-- Verify the constraint is working by checking current values
SELECT DISTINCT recurring FROM tasks;
