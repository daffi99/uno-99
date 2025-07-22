-- Add missing colors to the colors table
INSERT INTO colors (name, hex, tailwind_class) VALUES
  ('Amber-600', '#d97706', 'bg-amber-600'),
  ('Gray-400', '#9ca3af', 'bg-gray-400')
ON CONFLICT (name) DO NOTHING;
