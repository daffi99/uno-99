-- Verify the constraint allows all expected values
INSERT INTO tasks (title, description, start_date, end_date, status, priority, recurring) 
VALUES ('Test Daily Task', 'Testing daily recurring', CURRENT_DATE, CURRENT_DATE, 'Not started', 'medium', 'daily')
ON CONFLICT (id) DO NOTHING;

-- Clean up test data
DELETE FROM tasks WHERE title = 'Test Daily Task';

-- Show current constraint
SELECT conname, consrc 
FROM pg_constraint 
WHERE conrelid = 'tasks'::regclass 
AND conname = 'tasks_recurring_check';
