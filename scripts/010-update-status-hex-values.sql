-- Update hex values in the statuses table to match canonical colors
UPDATE statuses
SET hex = '#f59e0b'
WHERE color = 'bg-amber-500' AND hex = '#f59e42';

UPDATE statuses
SET hex = '#8b5cf6'
WHERE color = 'bg-purple-500' AND hex = '#a78bfa';
