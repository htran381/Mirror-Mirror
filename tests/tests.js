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
    assistant: []
  };

  const route = loadWithMocks('models/router.js', {
    './local': async prompt => {
      calls.local.push(prompt);
      return localResponse;
    },
    './claude': {
      askClaude: async prompt => {
        calls.claude.push(prompt);
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
