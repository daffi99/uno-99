-- Insert sample tasks
INSERT INTO tasks (title, description, start_date, end_date, status, priority, recurring) VALUES
('Project Planning and Initial Setup with Team Coordination', 'Plan the upcoming project milestones and coordinate with team members', CURRENT_DATE, CURRENT_DATE + INTERVAL '2 days', 'In Progress', 'high', 'no'),
('Weekly Team Meeting', 'Regular team sync meeting', CURRENT_DATE - INTERVAL '7 days', CURRENT_DATE - INTERVAL '7 days', 'Done', 'medium', 'weekly'),
('Code Review Session', 'Review team code submissions', CURRENT_DATE - INTERVAL '5 days', CURRENT_DATE - INTERVAL '5 days', 'Done', 'high', 'weekly')
ON CONFLICT (id) DO NOTHING;
