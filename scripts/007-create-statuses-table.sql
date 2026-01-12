CREATE TABLE statuses (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL,
  hex TEXT NOT NULL,
  category TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed initial statuses from the old hardcoded list
INSERT INTO statuses (name, color, hex, category) VALUES
  ('Follow Up', 'bg-amber-500', '#f59e42', 'To-do'),
  ('Night Work', 'bg-purple-500', '#a78bfa', 'To-do'),
  ('Pending', 'bg-pink-500', '#ec4899', 'To-do'),
  ('Later', 'bg-gray-500', '#6b7280', 'To-do'),
  ('Search BGM & Trim SFX', 'bg-red-500', '#ef4444', 'To-do'),
  ('Not started', 'bg-gray-400', '#9ca3af', 'To-do'),
  ('Everyday', 'bg-pink-500', '#ec4899', 'In progress'),
  ('Ready To Render', 'bg-amber-500', '#f59e42', 'In progress'),
  ('Rough Cut', 'bg-amber-600', '#d97706', 'In progress'),
  ('Waiting VO or assets', 'bg-purple-500', '#a78bfa', 'In progress'),
  ('Waiting Revision', 'bg-red-500', '#ef4444', 'In progress'),
  ('On Revision', 'bg-amber-500', '#f59e42', 'In progress'),
  ('In Progress', 'bg-amber-500', '#f59e42', 'In progress'),
  ('Ready deliver', 'bg-blue-500', '#3b82f6', 'In progress'),
  ('Preview Done', 'bg-blue-500', '#3b82f6', 'In progress'),
  ('Series Customer Review', 'bg-amber-500', '#f59e42', 'In progress'),
  ('Continue next day', 'bg-blue-500', '#3b82f6', 'In progress'),
  ('Done', 'bg-green-500', '#22c55e', 'Completed'),
  ('Meeting', 'bg-purple-500', '#a78bfa', 'Completed');
