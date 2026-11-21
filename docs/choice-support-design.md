# MirrorMirror Choice Support Design

Choice Support helps users work through decisions in MMM-Chat. Claude guides the conversation, MCP connects it to the application, and SQLite stores the choices, options, and decisions the user records.

## Functional requirements

The [Choice Support requirements specification](choice-support-requirements.md) defines the requirements and scope. The tables below preserve its IDs and wording.

### General Functionality (CS-001–012)

| ID | Requirement |
| --- | --- |
| CS-001 | The system shall create a choice when requested by the user. |
| CS-002 | The system shall ask the user whether they would like to create a choice when the user expresses a need to make a decision. |
| CS-003 | The system shall obtain user confirmation before creating a choice that was not explicitly requested by the user. |
| CS-004 | The system shall allow the user to maintain multiple choices simultaneously. |
| CS-005 | The system shall allow the user to retrieve previously created choices. |
| CS-006 | The system shall allow the user to revisit and modify existing choices. |
| CS-007 | The system shall allow the user to discontinue pursuing a choice. |
| CS-008 | The system shall guide the user through the development and evaluation of a choice through natural language conversation. |
| CS-009 | The system shall retain choices and their associated information across sessions. |
| CS-010 | The system shall utilize relevant information from previously recorded choices to contextualize future interactions with the user. |
| CS-011 | The system shall allow the user to exit the Choice Support Module without making a decision. |
| CS-012 | The system shall allow the user to resume developing an incomplete choice in a subsequent session. |

### Choice Management (CS-013–024)

| ID | Requirement |
| --- | --- |
| CS-013 | The system shall assign an identifiable name to each choice based on the information provided by the user. |
| CS-014 | The system shall allow the user to provide the context associated with a choice. |
| CS-015 | The system shall allow the user to record constraints associated with a choice. |
| CS-016 | The system shall allow a choice to be created without requiring all associated information to be provided. |
| CS-017 | The system shall assign an initial status of `active` to newly created choices. |
| CS-018 | The system shall allow the user to modify the name, context, and constraints of an active choice. |
| CS-019 | The system shall assign a status of `dropped` when the user discontinues pursuing a choice. |
| CS-020 | The system shall allow the user to reopen a decided or dropped choice. |
| CS-021 | The system shall prevent an implemented choice from being reopened. |
| CS-022 | The system shall allow the user to permanently delete a choice upon explicit request and confirmation. |
| CS-023 | The system shall request clarification when it cannot determine which choice the user is referring to. |
| CS-024 | The system shall retain dropped choices until explicitly deleted by the user. |

### Option Management (CS-025–036)

| ID | Requirement |
| --- | --- |
| CS-025 | The system shall automatically create a do-nothing option when a choice is created. |
| CS-026 | The system shall ensure that each choice contains exactly one do-nothing option. |
| CS-027 | The system shall prevent the do-nothing option from being dropped or deleted independently of its associated choice. |
| CS-028 | The system shall allow the user to add options to an active choice. |
| CS-029 | The system shall assist the user in identifying additional options through conversational questioning and relevant suggestions. |
| CS-030 | The system shall obtain user confirmation before recording an option suggested by Claude. |
| CS-031 | The system shall associate each recorded option with its corresponding choice. |
| CS-032 | The system shall allow the user to modify existing options within an active choice. |
| CS-033 | The system shall allow the user to drop an option that is no longer being considered. |
| CS-034 | The system shall allow the user to restore a previously dropped option within an active choice. |
| CS-035 | The system shall retain dropped options until explicitly deleted by the user. |
| CS-036 | The system shall allow the user to permanently delete an option upon explicit request and confirmation, except for the do-nothing option. |

### Outcome and Evaluation Management (CS-037–048)

| ID | Requirement |
| --- | --- |
| CS-037 | The system shall allow the user to record possible outcomes associated with an option. |
| CS-038 | The system shall assist the user in identifying possible outcomes through conversational questioning and relevant suggestions. |
| CS-039 | The system shall obtain user confirmation before recording outcomes suggested by Claude. |
| CS-040 | The system shall allow the user to record the advantages associated with an option. |
| CS-041 | The system shall allow the user to record the disadvantages associated with an option. |
| CS-042 | The system shall assist the user in evaluating options based on the user's expressed values, preferences, and circumstances. |
| CS-043 | The system shall obtain user confirmation before recording evaluations inferred or suggested by Claude. |
| CS-044 | The system shall allow the user to modify or remove previously recorded outcomes, advantages, and disadvantages within an active choice. |
| CS-045 | The system shall encourage the user to revisit existing outcomes and evaluations when an associated option is modified. |
| CS-046 | The system shall allow options to exist without requiring outcomes, advantages, or disadvantages to be recorded. |
| CS-047 | The system shall allow the user to make a decision without requiring all options to be fully evaluated. |
| CS-048 | The system shall distinguish possible outcomes from confirmed events when communicating with the user. |

### Valuable Information Management (CS-049–057)

| ID | Requirement |
| --- | --- |
| CS-049 | The system shall assist the user in identifying information that could improve their understanding or evaluation of a choice. |
| CS-050 | The system shall allow the user to record information they consider valuable to a choice. |
| CS-051 | The system shall obtain user confirmation before recording valuable information suggested by Claude. |
| CS-052 | The system shall allow the user to retrieve previously recorded valuable information associated with a choice. |
| CS-053 | The system shall allow the user to add, modify, or remove valuable information associated with an active choice. |
| CS-054 | The system shall assist the user in determining how newly acquired information may affect their choice, options, outcomes, and evaluations. |
| CS-055 | The system shall obtain user approval before modifying existing choice information based on conclusions drawn by Claude from newly acquired information. |
| CS-056 | The system shall acknowledge uncertainty or limitations when it cannot reliably provide requested information. |
| CS-057 | The system shall allow the user to make a decision without requiring all identified valuable information to be acquired. |

### Decision Management (CS-058–072)

| ID | Requirement |
| --- | --- |
| CS-058 | The system shall allow the user to select an option as their decision. |
| CS-059 | The system shall allow the user to select the do-nothing option as their decision. |
| CS-060 | The system shall obtain user confirmation before finalizing a decision inferred from conversation. |
| CS-061 | The system shall prevent Claude from independently selecting a decision on behalf of the user. |
| CS-062 | The system shall update the choice's status to `decided` when a decision is confirmed. |
| CS-063 | The system shall update the selected option's status to `chosen`. |
| CS-064 | The system shall update the status of other non-dropped options to `not_chosen`. |
| CS-065 | The system shall retain the information associated with a choice and its options after a decision is made. |
| CS-066 | The system shall reset the previously selected and unselected options to a considering status when a decided choice is reopened. |
| CS-067 | The system shall allow the user to indicate that they have acted upon a recorded decision. |
| CS-068 | The system shall recognize conversational indications that the user may have acted upon a recorded decision. |
| CS-069 | The system shall obtain user confirmation before marking a decision as implemented based on conversational inference. |
| CS-070 | The system shall update the choice's status to `implemented` when the user confirms that they have acted upon their decision. |
| CS-071 | The system shall retain implemented choices as historical information unless explicitly deleted by the user. |
| CS-072 | The system shall assist the user in creating a new choice when reconsidering a previously implemented decision. |

### AI Advising and Contextual Awareness (CS-073–087)

| ID | Requirement |
| --- | --- |
| CS-073 | The system shall adapt its conversational guidance based on the information already associated with a choice. |
| CS-074 | The system shall allow the user to develop and evaluate a choice without following a predetermined sequence of steps. |
| CS-075 | The system shall use neutral, open-ended questions to encourage the user to reflect on their options, outcomes, and evaluations. |
| CS-076 | The system shall assist the user in examining trade-offs between options and their alignment with the user's expressed values and circumstances without favoring a particular option. |
| CS-077 | The system shall respect the user's autonomy throughout the decision-making process. |
| CS-078 | The system shall refrain from imposing its own values, preferences, or judgments on the user's decisions. |
| CS-079 | The system shall utilize relevant previously recorded choices, options, evaluations, and decisions when communicating with the user. |
| CS-080 | The system shall utilize the status of previously recorded choices to contextualize its responses. |
| CS-081 | The system shall distinguish user-provided information from AI-generated inferences. |
| CS-082 | The system shall avoid treating situational evaluations as permanent user preferences without sufficient evidence. |
| CS-083 | The system shall obtain user confirmation before persisting new information inferred by Claude about a choice. |
| CS-084 | The system shall avoid requesting information already provided by the user unless clarification or verification is necessary. |
| CS-085 | The system shall provide conversational assistance related to a choice or decision when requested by the user. |
| CS-086 | The system shall respect the user's decision to discontinue or postpone the decision-making process. |
| CS-087 | The system shall refrain from recommending, ranking, or endorsing a particular option as the preferred decision during the choice support process. |

### Data Persistence and Integrity (CS-088–101)

| ID | Requirement |
| --- | --- |
| CS-088 | The system shall persist recorded choice information as it is created or modified. |
| CS-089 | The system shall associate recorded choices with the persistent default user. |
| CS-090 | The system shall ensure that options and their associated information maintain valid relationships with their corresponding choices. |
| CS-091 | The system shall validate requested database operations before modifying stored choice information. |
| CS-092 | The system shall enforce valid choice and option status transitions. |
| CS-093 | The system shall perform related database updates atomically when an operation affects multiple dependent records. |
| CS-094 | The system shall maintain a history of choice and option status changes. |
| CS-095 | The system shall remove associated dependent records when a choice is permanently deleted. |
| CS-096 | The system shall prevent failed database operations from leaving choice information in an inconsistent state. |
| CS-097 | The system shall inform the user when a requested choice operation cannot be successfully completed. |
| CS-098 | The system shall support retrieving choices based on their associated identifiers and statuses. |
| CS-099 | The system shall support retrieving the complete recorded information associated with a specific choice. |
| CS-100 | The system shall retrieve and modify choice information associated with the default user. |
| CS-101 | The system shall retain recorded choice information across program termination and subsequent startups. |

### User Interface (CS-102–111)

| ID | Requirement |
| --- | --- |
| CS-102 | The system shall visually present information associated with the choice currently being developed by the user. |
| CS-103 | The system shall display a list of active choices upon user request. |
| CS-104 | The system shall allow the user to view a specific recorded choice upon request, regardless of its status. |
| CS-105 | The system shall display the recorded details of the requested choice in a structured and readable format. |
| CS-106 | The system shall visually present relevant updates following successful modifications to the choice being developed. |
| CS-107 | The system shall visually distinguish the user's selected decision from other options when displaying a decided or implemented choice. |
| CS-108 | The system shall display the current status of a choice when presenting its details. |
| CS-109 | The system shall present options without implying an AI-generated preference or ranking. |
| CS-110 | The system shall exclude dropped options from the default presentation of an active choice unless requested by the user. |
| CS-111 | The system shall present only successfully recorded choice information as confirmed information. |

## System design

### System flow

```text
+--------------------------+
| Microphone and Whisper   |
| Transcribe speech        |
+------------+-------------+
             |
             v
+--------------------------+      +--------------------------+
| Wake word or open        | No   | Wait for the next        |
| follow-up window?        +----->| utterance                |
+------------+-------------+      +--------------------------+
             | Yes
             v
+--------------------------+
| MMM-Chat routes request  |
+------------+-------------+
             |
             +---------------------+---------------------+
             v                     v                     v
+-------------------+   +-------------------+   +-------------------+
| Choice Support    |   | Choice history    |   | Other request     |
| Discuss or save   |   | Read saved choices|   | Chat or controls  |
+---------+---------+   +---------+---------+   +---------+---------+
          |                       |                       |
          +---------------------->+<----------------------+
                                  v
                        +-------------------+
                        | Reply in MMM-Chat |
                        +-------------------+
```

### Architecture workflow

```text
ON THE MIRROR                                     CLOUD

+--------------------------+  Context and tools  +------------------+
| MMM-Chat Node helper     +-------------------->| Claude           |
| Routes requests and      |<--------------------+ Requests tools   |
| dispatches tool calls    |  Tool call or reply | or replies       |
+------------+-------------+                     +------------------+
             | ^
    MCP call | | Tool result or error
             v |
+------------+-+-----------+
| Local MCP subprocess     |
| Runs Choice Support tools|
+------------+-------------+
             | ^
       Query | | Rows, write result, or error
             v |
+------------+-+-----------+
| Query functions + SQLite |
| Records, rules, history  |
+--------------------------+
```

1. **MMM-Chat → Claude.** The Node helper routes the transcribed request and sends Claude the recent conversation and tool schemas for that route.
2. **Claude → MMM-Chat → MCP.** Claude requests a tool when it needs saved information or an approved change. MMM-Chat checks that the tool belongs to the selected route and calls the local MCP subprocess over stdio.
3. **MCP → SQLite.** The plugin calls the query functions. They check ownership and applicable lifecycle rules, then read the saved data or commit the change.
4. **SQLite → MCP → MMM-Chat → Claude.** MMM-Chat passes the result or tool error back to Claude. Claude can request another tool or send the final reply for MMM-Chat to display.

### Conversation and tool routing

MMM-Chat passes recognized speech to the conversation router with recent chat context. The `CHOICE` route gives Claude the Choice Support tools and instructions for neutral questions, target lookup, and confirmation. The read-only `HISTORY` route gives Claude search, list, and detail tools. The module-control route keeps its own tools. The router and tool allowlist are in [router.js](../MagicMirror/modules/MMM-Chat/models/router.js) and [claude.js](../MagicMirror/modules/MMM-Chat/models/claude.js).

The microphone follow-up window is a prototype addition. After a wake-word request routed to `CHOICE`, the app accepts follow-up speech without the wake word for 90 seconds. A `CHOICE` or `HISTORY` reply to a request received while the window was open refreshes the deadline. An unrelated reply leaves the deadline as it was. The timer lives in memory. See [node_helper.js](../MagicMirror/modules/MMM-Chat/node_helper.js) and [speechRecognition.js](../MagicMirror/modules/MMM-Chat/speech/speechRecognition.js).

Claude is instructed to resolve the intended record with a lookup before editing, ask when the target is ambiguous, and report an update only when the tool succeeds. The backend enforces ownership and valid transitions. For operations that require a confirmation flag, the backend checks the flag and Claude is responsible for obtaining confirmation from the user. When the user wraps up a choice, Claude can offer a brief recap and append it to existing context after approval.

### Persistence and ownership

The database initializer opens `MagicMirror/db/mirror.db`, enables foreign keys, and loads the schema and seed data. The app resolves the seeded `Guest` account by name and verifies its `Student` persona. Choices belong to the user through a user-owned advising bin. New Choice Support records use **General Choices**, created on first use. See [Database initialization](../MagicMirror/db/index.js), [User lookup](../MagicMirror/db/queries/users.js), and [Choice queries](../MagicMirror/db/queries/choices.js).

| Record | Stored information |
| --- | --- |
| Choice | Name in `description`, context and constraints in `context`, helpful notes in `helpful_info`, and lifecycle status |
| Option | Parent choice, description, built-in option flag, possible outcomes, pros, cons, and status |
| Status history | Previous and new statuses for choice and option transitions |

The MCP plugin calls the database queries directly from the local server subprocess. Search matches each supplied term across a choice and its associated option fields and returns up to five summaries in update order. The detail tool retrieves the selected record and its options. See [Choice Support MCP plugin](../magicmirror-mcp/src/plugins/choicePlugin.ts).

### Lifecycle rules

| User action | Saved result |
| --- | --- |
| Create a choice | Save an active choice and exactly one **Do nothing** option in one transaction. |
| Drop a choice | Move an active or decided choice to dropped and retain its options and evaluations. |
| Reopen a choice | Move a decided or dropped choice to active. Reset chosen and not-chosen options to considering and preserve dropped options. |
| Record a decision | Mark the choice decided and the selected option chosen. Mark other non-dropped options not chosen. |
| Mark implemented | Require a decided choice with exactly one chosen option. Preserve the selection and record the status change after confirmation. An implemented choice stays closed. |
| Drop or restore an option | Change the option status and retain its possible outcomes, pros, and cons. The built-in option is protected from dropping or independent deletion. |
| Permanently delete | Require confirmation. Deleting a choice removes its options and their status history. Linked tasks, calendar events, and diary entries are preserved. Links to deleted choices or options on tasks and events are cleared. |

Related writes and history entries use transactions so a failed write can roll back the operation. [Choice queries](../MagicMirror/db/queries/choices.js) and [SQLite schema](../MagicMirror/db/schema.sql) define these behaviors.

