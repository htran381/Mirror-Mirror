-- Mirror Mirror database schema (SQLite)
-- Source: "Mirror Mirror – Relational Schema" doc
-- Foreign keys are turned on in index.js (PRAGMA foreign_keys = ON)
-- =========================================================
-- Defaults
-- =========================================================
CREATE TABLE IF NOT EXISTS settings (
    setting_key TEXT PRIMARY KEY NOT NULL,
    value REAL NOT NULL CHECK (value >= 0),
    unit TEXT NOT NULL CHECK (
        unit IN (
            'count',
            'sessions',
            'days',
            'minutes',
            'points',
            'ratio'
        )
    ),
    description TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime ('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS tone_presets (
    tone_id INTEGER PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    delivery_instructions TEXT NOT NULL,
    is_default BOOLEAN NOT NULL CHECK (is_default IN (0, 1))
);

CREATE UNIQUE INDEX IF NOT EXISTS one_default_tone ON tone_presets (is_default)
WHERE
    is_default = 1;

CREATE TABLE IF NOT EXISTS user_categories (
    category_id INTEGER PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    parent_id INTEGER REFERENCES user_categories (category_id)
);

CREATE TABLE IF NOT EXISTS memory_types (
    memory_type_id INTEGER PRIMARY KEY NOT NULL,
    category_id INTEGER NOT NULL REFERENCES user_categories (category_id),
    section TEXT NOT NULL CHECK (
        section IN ('identity', 'affiliations', 'settings')
    ),
    name TEXT NOT NULL,
    description TEXT,
    value_type TEXT NOT NULL CHECK (
        value_type IN ('text', 'number', 'date', 'yes_no')
    ),
    answered_by TEXT NOT NULL CHECK (answered_by IN ('setup', 'learned')),
    multi_valued BOOLEAN NOT NULL CHECK (multi_valued IN (0, 1)),
    sensitive BOOLEAN NOT NULL CHECK (sensitive IN (0, 1))
);

CREATE TABLE IF NOT EXISTS default_bins (
    default_bin_id INTEGER PRIMARY KEY NOT NULL,
    category_id INTEGER NOT NULL REFERENCES user_categories (category_id),
    mm_role TEXT NOT NULL CHECK (mm_role IN ('inform', 'schedule', 'advise')),
    name TEXT NOT NULL,
    description TEXT,
    content_source TEXT NOT NULL CHECK (
        content_source IN ('module', 'web_search', 'none')
    ),
    module TEXT CHECK (
        module IS NULL
        or content_source = 'module'
    ),
    default_query TEXT CHECK (
        default_query IS NULL
        or content_source = 'web_search'
    ),
    typical_info TEXT,
    app TEXT NOT NULL CHECK (
        app IN (
            'headlines',
            'stocks',
            'calendar',
            'todo',
            'choice',
            'other'
        )
    ),
    config TEXT
);

-- =========================================================
-- User
-- =========================================================
CREATE TABLE IF NOT EXISTS users (
    user_id INTEGER PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    age INTEGER CHECK (age >= 0),
    tone_id INTEGER NOT NULL REFERENCES tone_presets (tone_id),
    tone_notes TEXT,
    format TEXT NOT NULL CHECK (format IN ('conversation', 'brief', 'list')) DEFAULT 'conversation',
    --can put more format types here
    start_summary BOOLEAN NOT NULL CHECK (start_summary IN (0, 1)),
    summary_retention_days INTEGER CHECK (summary_retention_days > 0),
    default_reminder_days INTEGER NOT NULL CHECK (default_reminder_days >= 0),
    onboarded_at TEXT, --empty = run onboarding
    created_at TEXT NOT NULL DEFAULT (datetime ('now', 'localtime')),
    updated_at TEXT NOT NULL DEFAULT (datetime ('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS user_roles (
    user_id INTEGER NOT NULL REFERENCES users (user_id) ON DELETE CASCADE,
    category_id INTEGER NOT NULL REFERENCES user_categories (category_id),
    added_at TEXT NOT NULL DEFAULT (datetime ('now', 'localtime')),
    PRIMARY KEY (user_id, category_id)
);

CREATE TABLE IF NOT EXISTS user_bins (
    bin_id INTEGER PRIMARY KEY NOT NULL,
    user_id INTEGER NOT NULL REFERENCES users (user_id) ON DELETE CASCADE,
    default_bin_id INTEGER REFERENCES default_bins (default_bin_id) ON DELETE SET NULL,
    --empty for bins users create
    mm_role TEXT NOT NULL CHECK (mm_role IN ('inform', 'schedule', 'advise')),
    name TEXT NOT NULL,
    source TEXT NOT NULL CHECK (source IN ('role_default', 'user_created')),
    content_source TEXT NOT NULL CHECK (
        content_source IN ('module', 'web_search', 'none')
    ),
    module TEXT CHECK (
        module IS NULL
        OR content_source = 'module'
    ),
    query TEXT CHECK (
        query IS NULL
        OR content_source = 'web_search'
    ),
    app TEXT NOT NULL CHECK (
        app IN (
            'headlines',
            'stocks',
            'calendar',
            'todo',
            'choice',
            'other'
        )
    ),
    config TEXT,
    weight REAL NOT NULL CHECK (weight >= 0),
    weight_locked BOOLEAN NOT NULL DEFAULT 0 CHECK (weight_locked IN (0, 1)), -- 1 = user said this bin matters; weight update skips it
    active BOOLEAN NOT NULL CHECK (active IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT (datetime ('now', 'localtime')),
    updated_at TEXT NOT NULL DEFAULT (datetime ('now', 'localtime'))
);

-- =========================================================
-- Records
-- =========================================================
CREATE TABLE IF NOT EXISTS memories (
    memory_id INTEGER NOT NULL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users (user_id) ON DELETE CASCADE,
    memory_type_id INTEGER NOT NULL REFERENCES memory_types (memory_type_id),
    bin_id INTEGER REFERENCES user_bins (bin_id) ON DELETE SET NULL,
    value TEXT NOT NULL,
    source TEXT NOT NULL CHECK (source IN ('stated', 'proposal')),
    status TEXT NOT NULL CHECK (status IN ('current', 'replaced')),
    sensitive BOOLEAN NOT NULL CHECK (sensitive IN (0, 1)),
    origin_proposal_id INTEGER REFERENCES learning_proposals (proposal_id) ON DELETE SET NULL,
    created_at TEXT NOT NULL DEFAULT (datetime ('now', 'localtime')),
    updated_at TEXT NOT NULL DEFAULT (datetime ('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS diary_entries (
    entry_id INTEGER NOT NULL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users (user_id) ON DELETE CASCADE,
    bin_id INTEGER REFERENCES user_bins (bin_id) ON DELETE SET NULL,
    entry_type TEXT NOT NULL CHECK (entry_type IN ('event', 'decision', 'note')),
    content TEXT NOT NULL,
    reason TEXT,
    happened_on TEXT NOT NULL,
    source TEXT NOT NULL CHECK (source IN ('stated', 'proposal')),
    origin_session_id INTEGER REFERENCES sessions (session_id) ON DELETE SET NULL,
    created_at TEXT NOT NULL DEFAULT (datetime ('now', 'localtime')),
    updated_at TEXT NOT NULL DEFAULT (datetime ('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS tasks (
    task_id INTEGER NOT NULL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users (user_id) ON DELETE CASCADE,
    bin_id INTEGER REFERENCES user_bins (bin_id) ON DELETE SET NULL,
    choice_id INTEGER REFERENCES choices (choice_id) ON DELETE SET NULL,
    option_id INTEGER REFERENCES options (option_id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    kind TEXT NOT NULL CHECK (
        kind IN (
            'exam',
            'assignment',
            'presentation',
            'meeting',
            'application',
            'other'
        )
    ),
    --can add more kinds
    priority TEXT NOT NULL CHECK (
        priority IN ('urgent_important', 'urgent', 'other')
    ) DEFAULT 'other',
    position INTEGER,
    owner TEXT NOT NULL CHECK (owner IN ('user', 'mm')),
    due_at TEXT,
    --most tasks have no date
    remind_at TEXT,
    status TEXT NOT NULL CHECK (status IN ('open', 'done', 'cancelled')),
    source TEXT NOT NULL CHECK (source IN ('stated', 'proposal')),
    created_session_id INTEGER REFERENCES sessions (session_id) ON DELETE SET NULL,
    completed_session_id INTEGER REFERENCES sessions (session_id) ON DELETE SET NULL,
    created_at TEXT NOT NULL DEFAULT (datetime ('now', 'localtime')),
    updated_at TEXT NOT NULL DEFAULT (datetime ('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS calendar_events (
    event_id INTEGER PRIMARY KEY NOT NULL,
    user_id INTEGER NOT NULL REFERENCES users (user_id) ON DELETE CASCADE,
    bin_id INTEGER REFERENCES user_bins (bin_id) ON DELETE SET NULL,
    task_id INTEGER REFERENCES tasks (task_id) ON DELETE SET NULL,
    start_at TEXT NOT NULL,
    end_at TEXT NOT NULL,
    choice_id INTEGER REFERENCES choices (choice_id) ON DELETE SET NULL,
    option_id INTEGER REFERENCES options (option_id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    remind_at TEXT,
    status TEXT NOT NULL CHECK (status IN ('scheduled', 'completed', 'cancelled')),
    source TEXT NOT NULL CHECK (source IN ('stated', 'proposal')),
    created_session_id INTEGER REFERENCES sessions (session_id) ON DELETE SET NULL,
    completed_session_id INTEGER REFERENCES sessions (session_id) ON DELETE SET NULL,
    created_at TEXT NOT NULL DEFAULT (datetime ('now', 'localtime')),
    updated_at TEXT NOT NULL DEFAULT (datetime ('now', 'localtime')),
    CHECK (end_at > start_at)
);

CREATE TABLE IF NOT EXISTS choices (
    choice_id INTEGER PRIMARY KEY NOT NULL,
    bin_id INTEGER NOT NULL REFERENCES user_bins (bin_id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    context TEXT,
    helpful_info TEXT,
    implementation_plan TEXT,
    result TEXT,
    status TEXT NOT NULL CHECK (
        status IN ('active', 'decided', 'implemented', 'dropped')
    ),
    source TEXT NOT NULL CHECK (source IN ('stated', 'proposal')),
    created_at TEXT NOT NULL DEFAULT (datetime ('now', 'localtime')),
    updated_at TEXT NOT NULL DEFAULT (datetime ('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS options (
    option_id INTEGER PRIMARY KEY NOT NULL,
    bin_id INTEGER NOT NULL REFERENCES user_bins (bin_id) ON DELETE CASCADE,
    choice_id INTEGER REFERENCES choices (choice_id) ON DELETE SET NULL,
    description TEXT NOT NULL,
    is_do_nothing BOOLEAN NOT NULL CHECK (is_do_nothing IN (0, 1)),
    outcomes TEXT,
    pros TEXT,
    cons TEXT,
    status TEXT NOT NULL CHECK (
        status IN (
            'considering',
            'in_progress',
            'available',
            'chosen',
            'not_chosen',
            'dropped'
        )
    ),
    expected_date TEXT,
    mention_days_before INTEGER CHECK (mention_days_before >= 0),
    decision_entry_id INTEGER REFERENCES diary_entries (entry_id) ON DELETE SET NULL,
    source TEXT NOT NULL CHECK (source IN ('stated', 'proposal')),
    created_at TEXT NOT NULL DEFAULT (datetime ('now', 'localtime')),
    updated_at TEXT NOT NULL DEFAULT (datetime ('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS status_history (
    history_id INTEGER PRIMARY KEY NOT NULL,
    choice_id INTEGER REFERENCES choices (choice_id) ON DELETE CASCADE,
    option_id INTEGER REFERENCES options (option_id) ON DELETE CASCADE,
    old_status TEXT,
    new_status TEXT NOT NULL,
    session_id INTEGER REFERENCES sessions (session_id) ON DELETE SET NULL,
    changed_at TEXT NOT NULL DEFAULT (datetime ('now', 'localtime')),
    CHECK ((choice_id IS NULL) <> (option_id IS NULL)) -- exactly one of choice_id / option_id
);

-- =========================================================
-- Sessions and learning
-- =========================================================
CREATE TABLE IF NOT EXISTS sessions (
    session_id INTEGER PRIMARY KEY NOT NULL,
    user_id INTEGER NOT NULL REFERENCES users (user_id) ON DELETE CASCADE,
    session_number INTEGER NOT NULL CHECK (session_number >= 1),
    started_at TEXT NOT NULL DEFAULT (datetime ('now', 'localtime')),
    ended_at TEXT,
    status TEXT NOT NULL CHECK (
        status IN ('active', 'ended', 'processing', 'processed')
    ),
    processed_at TEXT,
    UNIQUE (user_id, session_number)
);

CREATE TABLE IF NOT EXISTS session_buffer (
    buffer_id INTEGER PRIMARY KEY NOT NULL,
    session_id INTEGER NOT NULL REFERENCES sessions (session_id) ON DELETE CASCADE,
    speaker TEXT NOT NULL CHECK (speaker IN ('user', 'mm')),
    content TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime ('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS summary_items (
    item_id INTEGER PRIMARY KEY NOT NULL,
    session_id INTEGER NOT NULL REFERENCES sessions (session_id) ON DELETE CASCADE,
    bin_id INTEGER REFERENCES user_bins (bin_id) ON DELETE SET NULL,
    topic_label TEXT,
    kind TEXT NOT NULL CHECK (
        kind IN ('discussion', 'record_change', 'saved_summary')
    ),
    content TEXT NOT NULL,
    depth TEXT NOT NULL CHECK (depth IN ('quick', 'substantive', 'deep')),
    verification TEXT NOT NULL CHECK (
        verification IN ('pending', 'verified', 'corrected')
    ),
    created_at TEXT NOT NULL DEFAULT (datetime ('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS checkin_summaries (
    checkin_id INTEGER PRIMARY KEY NOT NULL,
    user_id INTEGER NOT NULL REFERENCES users (user_id) ON DELETE CASCADE,
    checkin_type TEXT NOT NULL CHECK (
        checkin_type IN ('bin_review', 'life_check', 'reflection')
    ),
    bin_id INTEGER REFERENCES user_bins (bin_id) ON DELETE SET NULL,
    from_session_id INTEGER NOT NULL REFERENCES sessions (session_id) ON DELETE CASCADE,
    to_session_id INTEGER NOT NULL REFERENCES sessions (session_id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'verified', 'corrected')),
    user_correction TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime ('now', 'localtime')),
    CHECK (bin_id IS NULL OR checkin_type = 'bin_review')
);

CREATE TABLE IF NOT EXISTS session_feedback (
    feedback_id INTEGER PRIMARY KEY NOT NULL,
    session_id INTEGER NOT NULL REFERENCES sessions (session_id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users (user_id) ON DELETE CASCADE,
    bin_id INTEGER REFERENCES user_bins (bin_id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime ('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS learning_proposals (
    proposal_id INTEGER PRIMARY KEY NOT NULL,
    user_id INTEGER NOT NULL REFERENCES users (user_id) ON DELETE CASCADE,
    session_id INTEGER NOT NULL REFERENCES sessions (session_id) ON DELETE CASCADE,
    rule_code TEXT NOT NULL, -- R1-R4, S1-S8, A1-A12, W (weight)
    proposal_type TEXT NOT NULL CHECK (
        proposal_type IN (
            'diary_entry',
            'task',
            'calendar_event',
            'choice',
            'option',
            'status_change',
            'new_bin',
            'hide_bin',
            'memory'
        )
    ),
    bin_id INTEGER REFERENCES user_bins (bin_id) ON DELETE SET NULL,
    payload TEXT NOT NULL, -- JSON
    wording TEXT NOT NULL,
    evidence TEXT, -- JSON list
    priority TEXT NOT NULL CHECK (priority IN ('normal', 'time_sensitive')),
    status TEXT NOT NULL CHECK (
        status IN (
            'pending',
            'accepted',
            'edited',
            'declined',
            'expired'
        )
    ),
    sessions_pending INTEGER NOT NULL CHECK (sessions_pending >= 0),
    reviewed_in TEXT CHECK (
        reviewed_in IN ('session_opener', 'in_context', 'viewer')
    ),
    reviewed_session_id INTEGER REFERENCES sessions (session_id) ON DELETE SET NULL,
    created_at TEXT NOT NULL DEFAULT (datetime ('now', 'localtime')),
    reviewed_at TEXT
);

CREATE TABLE IF NOT EXISTS avoid_topics (
    avoid_id INTEGER PRIMARY KEY NOT NULL,
    user_id INTEGER NOT NULL REFERENCES users (user_id) ON DELETE CASCADE,
    bin_id INTEGER REFERENCES user_bins (bin_id) ON DELETE SET NULL,
    topic TEXT NOT NULL,
    level TEXT NOT NULL CHECK (level IN ('dont_propose', 'do_not_touch')),
    reason TEXT NOT NULL CHECK (reason IN ('declined', 'user_requested')),
    created_at TEXT NOT NULL DEFAULT (datetime ('now', 'localtime')),
    last_reviewed_at TEXT,
    CHECK (level <> 'do_not_touch' OR reason = 'user_requested')
);

CREATE TABLE IF NOT EXISTS corrections (
    correction_id INTEGER PRIMARY KEY NOT NULL,
    user_id INTEGER NOT NULL REFERENCES users (user_id) ON DELETE CASCADE,
    session_id INTEGER REFERENCES sessions (session_id) ON DELETE SET NULL,
    record_type TEXT NOT NULL CHECK (
        record_type IN (
            'summary_item',
            'checkin_summary',
            'diary_entry',
            'task',
            'calendar_event',
            'choice',
            'option',
            'memory'
        )
    ),
    record_id INTEGER NOT NULL, -- id in the table named by record_type (not a foreign key)
    field TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    size TEXT NOT NULL CHECK (size IN ('small', 'big')),
    corrected_from TEXT NOT NULL CHECK (
        corrected_from IN (
            'end_of_session',
            'checkin',
            'conversation',
            'viewer'
        )
    ),
    corrected_at TEXT NOT NULL DEFAULT (datetime ('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS interaction_log (
    event_id INTEGER PRIMARY KEY NOT NULL,
    user_id INTEGER NOT NULL REFERENCES users (user_id) ON DELETE CASCADE,
    session_id INTEGER NOT NULL REFERENCES sessions (session_id) ON DELETE CASCADE,
    bin_id INTEGER REFERENCES user_bins (bin_id) ON DELETE SET NULL,
    topic_label TEXT,
    event_type TEXT NOT NULL CHECK (
        event_type IN (
            'tap',
            'voice_request',
            'service_call',
            'web_search',
            'proposal_shown'
        )
    ),
    detail TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime ('now', 'localtime'))
);
