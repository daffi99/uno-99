-- Update the recurring column to include daily option
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_recurring_check;
ALTER TABLE tasks ADD CONSTRAINT tasks_recurring_check CHECK (recurring IN ('no', 'daily', 'weekly', 'monthly'));

-- Update existing monthly tasks to daily (if any)
UPDATE tasks SET recurring = 'daily' WHERE recurring = 'monthly';
