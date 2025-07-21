-- Create colors table
CREATE TABLE IF NOT EXISTS colors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  hex TEXT NOT NULL,
  tailwind_class TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed initial colors from the predefined list
INSERT INTO colors (name, hex, tailwind_class) VALUES
  ('Gray', '#6b7280', 'bg-gray-500'),
  ('Red', '#ef4444', 'bg-red-500'),
  ('Amber', '#f59e0b', 'bg-amber-500'),
  ('Green', '#22c55e', 'bg-green-500'),
  ('Blue', '#3b82f6', 'bg-blue-500'),
  ('Indigo', '#6366f1', 'bg-indigo-500'),
  ('Purple', '#8b5cf6', 'bg-purple-500'),
  ('Pink', '#ec4899', 'bg-pink-500')
ON CONFLICT (name) DO NOTHING;
