const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const path = require('node:path');

const root = path.resolve(__dirname, '../MagicMirror/modules/MMM-Chat');
const handleCommand = require(path.join(root, 'controllers/commandController'));

// Load a module with mocked dependencies without contacting external services
function loadWithMocks(relativePath, mocks) {
  const filename = require.resolve(path.join(root, relativePath));
  const originalLoad = Module._load;

  try {
    Module._load = function (request, parent, isMain) {
      if (parent && parent.filename === filename && Object.hasOwn(mocks, request)) {
        return mocks[request];
      }

      return originalLoad.apply(this, arguments);
    };

    delete require.cache[filename];
    return require(filename);

  } finally {
    Module._load = originalLoad;
    delete require.cache[filename];
  }
}

// Create a router with controlled model availability and mocked AI responses
function makeRouter({
  local = false,
  claude = false,
  localResponse = 'Qwen response',
  claudeResponse = 'Claude response'
} = {}) {

  const calls = {
    local: [],
    claude: [],
    user: [],
    assistant: [],
    claudeOptions: []
  };

  const route = loadWithMocks('models/router.js', {
    './local': async prompt => {
      calls.local.push(prompt);
      return localResponse;
    },
    './claude': {
      askClaude: async (prompt, ...options) => {
        calls.claude.push(prompt);
        calls.claudeOptions.push(options);
        return claudeResponse;
      }
    },
    './health': {
      getAvailability: () => ({
        LOCAL: local,
        CLAUDE: claude
      })
    },
    './memory': {
      addUserMessage: command => calls.user.push(command),
      buildPrompt: command => `Prompt: ${command}`,
      addAssistantMessage: response => calls.assistant.push(response)
    }
  });

  return { route, calls };
}

// Test command recognition
test('TC01: hide weather returns HIDE_WEATHER', () => {
  assert.equal(handleCommand('hide weather'), 'HIDE_WEATHER');
});

test('TC02: show all returns SHOW_ALL', () => {
  assert.equal(handleCommand('show all'), 'SHOW_ALL');
});

test('TC03: conversational text is not a UI command', () => {
  assert.equal(handleCommand('hello world'), null);
  assert.equal(handleCommand('explain how a CPU works'), null);
});

// Test AI model routing
test('TC04: when only Qwen is available, route directly to Qwen', async () => {
  const { route, calls } = makeRouter({
    local: true,
    claude: false
  });

  assert.equal(await route('hello world'), 'Qwen response');
  assert.equal(calls.local.length, 1);
  assert.equal(calls.claude.length, 0);
  assert.deepEqual(calls.assistant, ['Qwen response']);
});

test('TC05: Claude classification and response generation when only Claude is available', async () => {
  const { route, calls } = makeRouter({
    local: false,
    claude: true
  });

  assert.equal(await route('explain how a CPU works'), 'Claude response');
  assert.equal(calls.claude.length, 2);
  assert.equal(calls.local.length, 0);
});

// Test mock mode responses
test('TC06: mock mode returns predetermined greeting if both models are unavailable', async () => {
  const previous = process.env.MOCK_MODE;
  process.env.MOCK_MODE = 'true';

  try {
    const { route, calls } = makeRouter();

    assert.equal(await route('hello world'), 'Hello! How can I help you?');
    assert.equal(calls.local.length, 0);
    assert.equal(calls.claude.length, 0);

  } finally {
    if (previous === undefined) delete process.env.MOCK_MODE;
    else process.env.MOCK_MODE = previous;
  }
});

test('TC07: mock mode returns predetermined CPU explanation', async () => {
  const previous = process.env.MOCK_MODE;
  process.env.MOCK_MODE = 'true';

  try {
    const { route } = makeRouter();

    assert.equal(
      await route('explain how a CPU works'),
      'A CPU fetches, decodes, and executes instructions.'
    );

  } finally {
    if (previous === undefined) delete process.env.MOCK_MODE;
    else process.env.MOCK_MODE = previous;
  }
});

test('TC08: normal mode reports unavailable models instead of simulating an answer', async () => {
  const previous = process.env.MOCK_MODE;
  delete process.env.MOCK_MODE;

  try {
    const { route, calls } = makeRouter();

    assert.equal(
      await route('hello world'),
      'Error: Sorry, neither AI model is currently available.'
    );

    assert.equal(calls.local.length, 0);
    assert.equal(calls.claude.length, 0);

  } finally {
    if (previous === undefined) delete process.env.MOCK_MODE;
    else process.env.MOCK_MODE = previous;
  }
});

// Test mock UI command handling
test('TC09: mock mode handles UI commands without calling the AI router', async () => {
  const previous = process.env.MOCK_MODE;
  process.env.MOCK_MODE = 'true';

  try {
    const helper = loadWithMocks('node_helper.js', {
      node_helper: {
        create: implementation => implementation
      },
      './speech/speechRecognition': () => {},
      './controllers/commandController': handleCommand,
      './models/router': async () => {
        throw new Error('Router must not be called for mock UI commands');
      },
      './models/health': {
        startHealthChecks: () => {}
      }
    });

    const notifications = [];

    helper.sendSocketNotification = (type, payload) => {
      notifications.push([type, payload]);
    };

    await helper.handleSpeech('hide weather');

    assert.deepEqual(notifications, [
      ['TEXT', 'hide weather'],
      ['ACTION', 'HIDE_WEATHER'],
      ['AI_RESPONSE', 'As you command']
    ]);

  } finally {
    if (previous === undefined) delete process.env.MOCK_MODE;
    else process.env.MOCK_MODE = previous;
  }
});

// Test complexity-based AI routing
test('TC10: simple query routes to Qwen when both models are available', async () => {
  const { route, calls } = makeRouter({
    local: true,
    claude: true,
    claudeResponse: 'LOCAL'
  });

  const response = await route('hello world');

  assert.equal(response, 'Qwen response');
  assert.equal(calls.local.length, 1);
  assert.equal(calls.claude.length, 1);
  assert.deepEqual(calls.assistant, ['Qwen response']);
});

test('TC11: complex query routes to Claude when both models are available', async () => {
  const { route, calls } = makeRouter({
    local: true,
    claude: true,
    claudeResponse: 'CLAUDE'
  });

  const response = await route('explain how a CPU works');

  assert.equal(response, 'CLAUDE');
  assert.equal(calls.local.length, 0);
  assert.equal(calls.claude.length, 2);
  assert.deepEqual(calls.assistant, ['CLAUDE']);
});
// Load node_helper with a fake listening loop so no microphone is needed
function makeMicHelper() {
  const listenCalls = [];

  const helper = loadWithMocks('node_helper.js', {
    node_helper: {
      create: implementation => implementation
    },
    './speech/speechRecognition': h => {
      listenCalls.push(h);
      h.listening = true;
    },
    './controllers/commandController': handleCommand,
    './models/router': async () => 'response',
    './models/claude': {
      initializeMCPToolUse: async () => {}
    },
    './mcp/mcpClient': {
      connectMcp: async () => {}
    },
    './models/health': {
      startHealthChecks: () => {}
    }
  });

  const notifications = [];
  helper.sendSocketNotification = (type, payload) => {
    notifications.push([type, payload]);
  };

  helper.muted = false;
  helper.micEnabled = false;
  helper.listening = false;
  helper.recorder = null;

  return { helper, listenCalls, notifications };
}

// Test mute button behavior
test('TC12: muting stops the current recording and reports MUTE_STATE', async () => {
  const { helper, notifications } = makeMicHelper();

  let killed = false;
  helper.recorder = { kill: () => { killed = true; } };

  await helper.socketNotificationReceived('SET_MUTE', true);

  assert.equal(helper.muted, true);
  assert.equal(killed, true);
  assert.deepEqual(notifications, [['MUTE_STATE', true]]);
});

test('TC13: unmuting restarts listening only if the loop had stopped', async () => {
  const { helper, listenCalls } = makeMicHelper();

  helper.startListening();
  assert.equal(listenCalls.length, 1);

  // Loop paused while muted
  helper.setMuted(true);
  helper.listening = false;

  helper.setMuted(false);
  assert.equal(listenCalls.length, 2);

  // Loop still running: unmuting must not start a second loop
  helper.setMuted(true);
  helper.setMuted(false);
  assert.equal(listenCalls.length, 2);
});

test('TC14: unmuting before the mic was ever started does not start listening', async () => {
  const { helper, listenCalls, notifications } = makeMicHelper();

  helper.setMuted(true);
  helper.setMuted(false);

  assert.equal(listenCalls.length, 0);
  assert.deepEqual(notifications, [['MUTE_STATE', true], ['MUTE_STATE', false]]);
});

// Test listening-state reporting
test('TC15: mic state is sent to the mirror only when it changes', async () => {
  const { helper, notifications } = makeMicHelper();
  helper.micState = null;

  helper.reportMicState('listening');
  helper.reportMicState('listening');
  helper.reportMicState('processing');
  helper.reportMicState('listening');

  assert.deepEqual(notifications, [
    ['MIC_STATE', 'listening'],
    ['MIC_STATE', 'processing'],
    ['MIC_STATE', 'listening']
  ]);
});

// Load db/queries/tasks.js against a fresh in-memory database (never touches mirror.db)
function loadTaskQueries() {
  const fs = require('node:fs');
  const Database = require(path.resolve(__dirname, '../MagicMirror/node_modules/better-sqlite3'));
  const dbDir = path.resolve(__dirname, '../MagicMirror/db');

  const memoryDb = new Database(':memory:');
  memoryDb.pragma('foreign_keys = ON');
  memoryDb.exec(fs.readFileSync(path.join(dbDir, 'schema.sql'), 'utf8'));
  memoryDb.exec(fs.readFileSync(path.join(dbDir, 'seed.sql'), 'utf8'));

  const filename = require.resolve(path.join(dbDir, 'queries/tasks.js'));
  const originalLoad = Module._load;

  try {
    Module._load = function (request, parent, isMain) {
      if (parent && parent.filename === filename && request === '../index.js') {
        return memoryDb;
      }
      return originalLoad.apply(this, arguments);
    };
    delete require.cache[filename];
    return { tasks: require(filename), db: memoryDb };
  } finally {
    Module._load = originalLoad;
    delete require.cache[filename];
  }
}

// Test To-Do module queries
test('TC16: To-Do list is priority-first and includes the linked choice', () => {
  const { tasks, db } = loadTaskQueries();
  const userId = db.prepare('SELECT user_id FROM users LIMIT 1').get().user_id;

  db.prepare(`INSERT INTO choices (bin_id, description, status, source) VALUES (7, 'Summer internship', 'active', 'stated')`).run();
  const choiceId = db.prepare('SELECT last_insert_rowid() AS id').get().id;

  tasks.addTask(userId, null, { title: 'Call the dentist' });
  tasks.addTask(userId, null, { title: 'Accept offer', priority: 'urgent', choiceId, position: 1 });
  tasks.addTask(userId, null, { title: 'Finish lab report', priority: 'urgent_important' });

  const list = tasks.getTodoListWithLinks(userId);

  assert.deepEqual(list.map(t => t.title), ['Finish lab report', 'Accept offer', 'Call the dentist']);
  assert.equal(list[1].choice_name, 'Summer internship');
  assert.equal(list[0].choice_name, null);
});

test('TC17: a completed task leaves the list and Undo puts it back', () => {
  const { tasks, db } = loadTaskQueries();
  const userId = db.prepare('SELECT user_id FROM users LIMIT 1').get().user_id;

  const taskId = tasks.addTask(userId, null, { title: 'Call the dentist' });

  assert.equal(tasks.completeTask(taskId, null), 1);
  assert.equal(tasks.getTodoListWithLinks(userId).length, 0);

  // Only open tasks can be finished or removed
  assert.equal(tasks.completeTask(taskId, null), 0);
  assert.equal(tasks.cancelTask(taskId), 0);

  assert.equal(tasks.reopenTask(taskId), 1);
  assert.deepEqual(tasks.getTodoListWithLinks(userId).map(t => t.title), ['Call the dentist']);

  // Reopening an already-open task changes nothing
  assert.equal(tasks.reopenTask(taskId), 0);
});

// Test To-Do routing and tool access
test('TC18: to-do requests route to Claude with the to-do tools', async () => {
  const { route, calls } = makeRouter({
    local: true,
    claude: true,
    claudeResponse: 'TODO'
  });

  await route('add call the dentist to my to-do list');

  assert.equal(calls.local.length, 0);
  assert.equal(calls.claude.length, 2);
  assert.deepEqual(calls.claudeOptions[1], [true, 'todo']);
});

test('TC19: each mode only gets its own tools', () => {
  const { toolsForMode } = loadWithMocks('models/claude.js', {
    '@anthropic-ai/sdk': class {},
    '../mcp/mcpClient': { listMcpTools: async () => ({ tools: [] }), callMcpTool: async () => ({}) }
  });

  const tools = [
    'mirror_module_show', 'mirror_choice_create', 'mirror_choice_search', 'mirror_choice_get',
    'mirror_todo_add', 'mirror_todo_list', 'mirror_todo_edit', 'mirror_todo_complete', 'mirror_todo_remove'
  ].map(name => ({ name }));
  const names = mode => toolsForMode(mode, tools).map(tool => tool.name);

  // To-do mode: to-do tools plus read-only choice lookup for linking, never choice writes
  assert.deepEqual(names('todo'), [
    'mirror_choice_search', 'mirror_choice_get',
    'mirror_todo_add', 'mirror_todo_list', 'mirror_todo_edit', 'mirror_todo_complete', 'mirror_todo_remove'
  ]);
  // Choice Support is unchanged: choice tools only
  assert.deepEqual(names('choice'), ['mirror_choice_create', 'mirror_choice_search', 'mirror_choice_get']);
  // Module control never sees choice or to-do tools
  assert.deepEqual(names('module'), ['mirror_module_show']);
});

// Test editing tasks
test('TC20: editing a task changes only the given fields, and only while open', () => {
  const { tasks, db } = loadTaskQueries();
  const userId = db.prepare('SELECT user_id FROM users LIMIT 1').get().user_id;

  const taskId = tasks.addTask(userId, null, { title: 'Call dentist', dueAt: '2026-12-01' });

  // Rename and raise priority. Kind and due date stay the same
  assert.equal(tasks.updateTask(taskId, { title: 'Call the dentist', priority: 'urgent' }), 1);
  let task = db.prepare('SELECT * FROM tasks WHERE task_id = ?').get(taskId);
  assert.equal(task.title, 'Call the dentist');
  assert.equal(task.priority, 'urgent');
  assert.equal(task.kind, 'other');
  assert.equal(task.due_at, '2026-12-01');

  // null clears the due date
  assert.equal(tasks.updateTask(taskId, { dueAt: null }), 1);
  task = db.prepare('SELECT * FROM tasks WHERE task_id = ?').get(taskId);
  assert.equal(task.due_at, null);

  // Nothing to change, or a finished task: no update
  assert.equal(tasks.updateTask(taskId, {}), 0);
  tasks.completeTask(taskId, null);
  assert.equal(tasks.updateTask(taskId, { title: 'Too late' }), 0);
});

test('TC21: a task tapped on the mirror is passed along with the spoken request', async () => {
  const routed = [];
  const helper = loadWithMocks('node_helper.js', {
    node_helper: { create: implementation => implementation },
    './speech/speechRecognition': () => {},
    './controllers/commandController': handleCommand,
    './models/router': async (command, onRouteSelected) => {
      routed.push(command);
      onRouteSelected('TODO');
      return 'Done';
    },
    './models/claude': { initializeMCPToolUse: async () => {} },
    './mcp/mcpClient': { connectMcp: async () => {} },
    './models/health': { startHealthChecks: () => {} }
  });
  helper.sendSocketNotification = () => {};
  helper.choiceFollowUpUntil = 0;

  const previousMode = process.env.MOCK_MODE;
  process.env.MOCK_MODE = 'false';
  try {
    await helper.socketNotificationReceived('SELECTED_TASK', { task_id: 8, title: 'Call the dentist' });
    await helper.handleSpeech('make this urgent', true);

    await helper.socketNotificationReceived('SELECTED_TASK', null);
    await helper.handleSpeech('what time is it', true);
  } finally {
    process.env.MOCK_MODE = previousMode;
  }

  assert.equal(routed[0], 'make this urgent\n(Selected to-do task: #8 "Call the dentist")');
  assert.equal(routed[1], 'what time is it');
  // "edit" can be followed by the new content without the wake word
  assert.ok(helper.isChoiceFollowUpOpen());
});
