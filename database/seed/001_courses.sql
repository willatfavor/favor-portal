-- Insert sample courses
INSERT INTO courses (id, title, description, thumbnail_url, access_level, sort_order) VALUES
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Africa Programs Overview', 'Deep dive into Favor International''s four core program areas across Africa. Learn about our education initiatives, healthcare programs, community development, and discipleship training.', 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=800&q=80', 'partner', 1),
('b2c3d4e5-f6a7-8901-bcde-f12345678901', 'Vision and Great Commission', 'Carol Ward teaches on Favor''s unique model of indigenous leadership and discipleship. Understand our philosophy and how we differ from other nonprofit organizations.', 'https://images.unsplash.com/photo-1507692049790-de58290a4334?w=800&q=80', 'partner', 2),
('c3d4e5f6-a7b8-9012-cdef-123456789012', 'Favor US Introduction', 'Meet the US team and discover ways to get involved domestically. Learn about our trauma healing program for high school students and ambassador opportunities.', 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&q=80', 'partner', 3),
('d4e5f6a7-b8c9-0123-defa-234567890123', 'Advanced Partnership Strategies', 'Exclusive content for major donors and foundation partners. Deep strategic insights into Favor''s long-term vision and sustainability model.', 'https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=800&q=80', 'major_donor', 4);

-- Insert course modules for Africa Programs Overview
INSERT INTO course_modules (course_id, title, description, cloudflare_video_id, sort_order, duration_seconds) VALUES
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Introduction to Favor Africa', 'Overview of our African operations and the communities we serve', 'sample-video-1', 1, 1800),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Education Programs', 'Deep dive into our schools, scholarships, and literacy initiatives', 'sample-video-2', 2, 2400),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Healthcare Initiatives', 'Medical clinics, clean water projects, and health education', 'sample-video-3', 3, 2100),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Community Development', 'Economic empowerment and sustainable development programs', 'sample-video-4', 4, 1950);

-- Insert course modules for Vision and Great Commission
INSERT INTO course_modules (course_id, title, description, cloudflare_video_id, sort_order, duration_seconds) VALUES
('b2c3d4e5-f6a7-8901-bcde-f12345678901', 'Carol Ward: Our Founding Vision', 'Carol shares the story of how Favor began and the vision that drives us', 'sample-video-5', 1, 2700),
('b2c3d4e5-f6a7-8901-bcde-f12345678901', 'Indigenous Leadership Model', 'Why we prioritize local leadership over Western management', 'sample-video-6', 2, 2250),
('b2c3d4e5-f6a7-8901-bcde-f12345678901', 'Discipleship Philosophy', 'How we follow Jesus'' model of multiplication and discipleship', 'sample-video-7', 3, 2400),
('b2c3d4e5-f6a7-8901-bcde-f12345678901', 'What Makes Favor Different', 'Comparing our approach to traditional nonprofit models', 'sample-video-8', 4, 1800),
('b2c3d4e5-f6a7-8901-bcde-f12345678901', 'The Great Commission Today', 'How Favor contributes to making disciples of all nations', 'sample-video-9', 5, 2100);

-- Insert course modules for Favor US Introduction
INSERT INTO course_modules (course_id, title, description, cloudflare_video_id, sort_order, duration_seconds) VALUES
('c3d4e5f6-a7b8-9012-cdef-123456789012', 'Meet the US Team', 'Introduction to our domestic staff and their roles', 'sample-video-10', 1, 1500),
('c3d4e5f6-a7b8-9012-cdef-123456789012', 'Trauma Healing Program', 'Our new initiative for high school students in the US', 'sample-video-11', 2, 1800),
('c3d4e5f6-a7b8-9012-cdef-123456789012', 'Ambassador Opportunities', 'How to become a Favor ambassador in your community', 'sample-video-12', 3, 1650);
