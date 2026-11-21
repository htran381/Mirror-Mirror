-- Mirror Mirror seed data (SQLite)
-- Runs on every boot from index.js, after schema.sql.
-- Every row has a fixed id and uses INSERT OR IGNORE, so running it again changes nothing.
-- Starting values are placeholders to tune once the basics work.

-- =========================================================
-- settings (values from the schema doc's Starting values table)
-- =========================================================

INSERT OR IGNORE INTO settings (setting_key, value, unit, description) VALUES
    ('max_proposals_per_response', 1,   'count',    'Most proposals MM raises in one response'),
    ('max_proposals_per_session',  3,   'count',    'Most proposals MM raises in one session'),
    ('max_opener_proposals',       2,   'count',    'Most time-sensitive proposals raised at the start of a session'),
    ('proposal_expiry_sessions',   5,   'sessions', 'Sessions a proposal can go unanswered before it expires'),
    ('initial_bin_weight',         1.0, 'ratio',    'Weight a new bin starts with'),
    ('weight_rate',                0.3, 'ratio',    'How much one session counts in the weight update'),
    ('session_value_divisor',      2,   'count',    'Total points are divided by this to get the session value'),
    ('session_value_cap',          2,   'points',   'Highest possible session value'),
    ('points_quick',               1,   'points',   'Points for a quick summary item'),
    ('points_substantive',         2,   'points',   'Points for a substantive item or a small record change'),
    ('points_deep',                3,   'points',   'Points for a deep item or a big record change'),
    ('hide_bin_threshold',         0.4, 'ratio',    'Weight below which MM proposes hiding a bin'),
    ('default_reminder_days',      1,   'days',     'Starting value of users.default_reminder_days for new users (S4)'),
    ('upcoming_task_days',         3,   'days',     'A task or event due within this many days is brought up at the start of a session (S5)'),
    ('choice_no_options_sessions', 3,   'sessions', 'Sessions a choice can go with only its do-nothing option before MM offers to help list some (A3)'),
    ('choice_inactive_sessions',   10,  'sessions', 'Sessions without activity before MM proposes dropping a choice (A5)'),
    ('bin_review_every',           5,   'sessions', 'N: sessions between bin reviews'),
    ('life_check_every',           15,  'sessions', 'M: sessions between life checks'),
    ('reflection_every',           30,  'sessions', 'K: sessions between reflections'),
    ('inactivity_timeout_minutes', 5,   'minutes',  'Minutes without activity before a session ends');

-- =========================================================
-- tone_presets (exactly one default)
-- =========================================================

INSERT OR IGNORE INTO tone_presets (tone_id, name, description, delivery_instructions, is_default) VALUES
    (1, 'Friendly', 'Warm and encouraging, like a supportive friend',
        'Speak warmly and casually. Use short sentences and the user''s name now and then. Encourage without exaggerating. Never lecture.', 1),
    (2, 'Calm', 'Quiet, steady and unhurried',
        'Speak calmly and evenly. Keep a slow, reassuring pace with plain words. Avoid exclamation marks and urgency unless something is truly time-sensitive.', 0),
    (3, 'Direct', 'Brief and to the point',
        'Be brief. Lead with the answer, then stop. No greetings, filler or small talk. Use the fewest words that stay clear and polite.', 0);

-- =========================================================
-- user_categories (role tree; each role inherits the bins and memory types above it)
--   General User
--     Student
--       Undergrad
--     Working Professional
-- =========================================================

INSERT OR IGNORE INTO user_categories (category_id, name, description, parent_id) VALUES
    (1, 'General User',         'Everyone. Defaults here apply to every role.',      NULL),
    (2, 'Student',              'Anyone currently in school',                        1),
    (3, 'Undergrad',            'An undergraduate student',                          2),
    (4, 'Working Professional', 'Works a job outside of school',                     1);

-- =========================================================
-- memory_types (setup questions and learned facts, by role)
-- =========================================================

INSERT OR IGNORE INTO memory_types
    (memory_type_id, category_id, section, name, description, value_type, answered_by, multi_valued, sensitive) VALUES
    (1,  1, 'identity',     'City',                    'The city the user lives in, for weather and local news', 'text', 'setup',   0, 0),
    (2,  1, 'settings',     'Usual time to use MM',    'When the user usually uses the mirror',                  'text', 'learned', 0, 0),
    (3,  2, 'affiliations', 'School',                  'The school the user attends',                            'text', 'setup',   0, 0),
    (4,  2, 'identity',     'Major',                   'The user''s major or field of study',                    'text', 'setup',   0, 0),
    (5,  2, 'settings',     'Usual study time',        'When the user usually studies',                          'text', 'learned', 0, 0),
    (6,  3, 'identity',     'Year',                    'Freshman, sophomore, junior or senior',                  'text', 'setup',   0, 0),
    (7,  3, 'identity',     'Expected graduation',     'When the user expects to graduate',                      'date', 'setup',   0, 0),
    (8,  4, 'affiliations', 'Employer',                'Where the user works',                                   'text', 'setup',   0, 0),
    (9,  4, 'identity',     'Job title',               'The user''s role at work',                               'text', 'setup',   0, 0);

-- =========================================================
-- default_bins (offered at setup; app decides mm_role:
--   headlines, stocks, other -> inform; calendar, todo -> schedule; choice -> advise)
-- =========================================================

INSERT OR IGNORE INTO default_bins
    (default_bin_id, category_id, mm_role, name, description, content_source, module, default_query, typical_info, app, config) VALUES
    -- General User (everyone)
    (1,  1, 'inform',   'Weather',              'Today''s weather and forecast',                     'module', 'weather',  NULL, NULL,
         'other',     NULL),
    (2,  1, 'inform',   'Headlines',            'Top global, US and local headlines',                'module', 'newsfeed', NULL, NULL,
         'headlines', '{"feeds": ["global", "us", "local"], "categories": []}'),
    (3,  1, 'schedule', 'Personal and family',  'Personal events and family plans',                  'none',   NULL,       NULL, NULL,
         'calendar',  '{"category": "personal"}'),
    -- Student
    (4,  2, 'schedule', 'Exams',                'Midterms, finals and quizzes',                      'none',   NULL,       NULL, 'Midterms fall mid-semester; finals are in December and May',
         'calendar',  '{"category": "exams"}'),
    (5,  2, 'schedule', 'Group projects',       'Project meetings and deadlines',                    'none',   NULL,       NULL, NULL,
         'calendar',  '{"category": "project_meetings"}'),
    (6,  2, 'schedule', 'Homework',             'Assignments and their due dates',                   'none',   NULL,       NULL, NULL,
         'todo',      '{"default_kind": "assignment"}'),
    (7,  2, 'advise',   'Internship search',    'Finding and choosing an internship',                'none',   NULL,       NULL, 'Many summer internships recruit in the fall',
         'choice',    NULL),
    -- Undergrad
    (8,  3, 'advise',   'Grad school',          'Whether and where to go to grad school',            'none',   NULL,       NULL, NULL,
         'choice',    NULL),
    -- Working Professional
    (9,  4, 'schedule', 'Meetings',             'Work meetings and briefings',                       'none',   NULL,       NULL, NULL,
         'calendar',  '{"category": "meetings"}'),
    (10, 4, 'schedule', 'Travel',               'Work trips',                                        'none',   NULL,       NULL, NULL,
         'calendar',  '{"category": "travel"}'),
    (11, 4, 'schedule', 'Deadlines',            'Work deadlines and deliverables',                   'none',   NULL,       NULL, NULL,
         'todo',      '{"default_kind": "other"}'),
    (12, 4, 'inform',   'Stocks',               'Prices for the indexes and tickers you follow',     'none',   NULL,       NULL, NULL,
         'stocks',    '{"tickers": ["^GSPC", "^IXIC"]}'),
    (13, 4, 'advise',   'Career moves',         'Job changes, promotions and offers',                'none',   NULL,       NULL, NULL,
         'choice',    NULL);

-- =========================================================
-- Temporary guest user (until profiles are built in Phase 5)
-- A Student, with the General User and Student default bins copied in.
-- onboarded_at is empty, so onboarding will run for Guest once it exists.
-- =========================================================

INSERT OR IGNORE INTO users
    (user_id, name, tone_id, format, start_summary, default_reminder_days) VALUES
    (1, 'Guest', 1, 'conversation', 1, 1);

INSERT OR IGNORE INTO user_roles (user_id, category_id) VALUES
    (1, 2);

INSERT OR IGNORE INTO user_bins
    (bin_id, user_id, default_bin_id, mm_role, name, source, content_source, module, query, app, config, weight, active) VALUES
    (1, 1, 1, 'inform',   'Weather',             'role_default', 'module', 'weather',  NULL, 'other',     NULL,                                                      1.0, 1),
    (2, 1, 2, 'inform',   'Headlines',           'role_default', 'module', 'newsfeed', NULL, 'headlines', '{"feeds": ["global", "us", "local"], "categories": []}', 1.0, 1),
    (3, 1, 3, 'schedule', 'Personal and family', 'role_default', 'none',   NULL,       NULL, 'calendar',  '{"category": "personal"}',                              1.0, 1),
    (4, 1, 4, 'schedule', 'Exams',               'role_default', 'none',   NULL,       NULL, 'calendar',  '{"category": "exams"}',                                 1.0, 1),
    (5, 1, 5, 'schedule', 'Group projects',      'role_default', 'none',   NULL,       NULL, 'calendar',  '{"category": "project_meetings"}',                      1.0, 1),
    (6, 1, 6, 'schedule', 'Homework',            'role_default', 'none',   NULL,       NULL, 'todo',      '{"default_kind": "assignment"}',                        1.0, 1),
    (7, 1, 7, 'advise',   'Internship search',   'role_default', 'none',   NULL,       NULL, 'choice',    NULL,                                                      1.0, 1);
