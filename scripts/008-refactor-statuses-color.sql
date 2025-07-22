-- Make the 'color' column in the 'statuses' table nullable
-- as it will no longer be used for styling.
-- Styling will be handled by the 'hex' column directly.
ALTER TABLE statuses ALTER COLUMN color DROP NOT NULL; 