# MirrorMirror — Choice Support Module

**Purpose:** Define the feature, its scope, functional requirements, and agreed implementation decisions for incremental development.

## 1. Feature objective

The Choice Support Module helps the user develop choices, discover alternatives, reflect on possible outcomes and trade-offs, and arrive at their own decisions through natural language conversation with Claude. It preserves recorded choices and decisions across sessions and program restarts so that Claude can provide context-aware assistance in future interactions.

MirrorMirror is an advisor, not a decision-maker. It uses neutral, open-ended, non-leading questions to help the user determine what matters to them. Claude may suggest alternatives and possible consequences for exploration, but must not recommend, rank, or endorse a preferred decision. The user controls what is recorded and when to decide.

### Terminology

- **Choice:** A matter requiring a decision, including its name, context, constraints, options and helpful information.
- **Option:** A possible course of action, including doing nothing.
- **Outcome:** A possible consequence of selecting an option, not a confirmed event.
- **Evaluation:** The user's assessment of an option's advantages and disadvantages.
- **Decision:** The option selected by the user.
- **Implemented decision:** A decision the user confirms they have acted upon; not evidence that a particular outcome occurred.
- **Valuable information:** Information that could improve understanding or evaluation of a choice.

## 2. Scope and architectural constraints

### In scope

- Create, retrieve, revise, drop, reopen and explicitly delete choices and options, subject to lifecycle rules.
- Automatically create exactly one do-nothing option per choice.
- Record possible outcomes, overall option-level pros and cons, and valuable information.
- Record decisions and confirmation that the user has acted on them.
- Persist choice information and use relevant historical records in ordinary conversations.
- Present structured choice information through the existing MMM-Chat chat box.
- Support one persistent default user with the student persona.

### Out of scope or deferred

- Dedicated implementation plans, execution management, progress tracking and actual implementation outcome tracking. Ordinary conversational assistance remains available.
- Calendar, To-Do and choice deadline integration. When implemented separately, choice deadlines should be added to the To-Do list.
- Formal session management, persistent conversation history and broader conversational learning (separate functional area).
- Multi-user registration, authentication and user switching.
- Dedicated Choice Support UI module, persistent dashboards, touch controls and complex animations.
- Mathematical decision engines, numerical scoring, weighted rankings, probability calculations, separate learning engines, embeddings and vector databases.
- Dedicated external research, automated fact-checking and background information gathering.
- Automatic retention limits or cleanup, and full record version history.

### Architectural direction

Reuse the existing SQLite schema, MCP integration and MMM-Chat. Avoid database schema changes; any essential change requires explicit approval. Favor simple, readable code and incremental implementation. Recorded choices themselves serve as a source of user knowledge, without a separate learning mechanism.

## 3. Functional requirements

The following 111 requirements preserve the agreed identifiers and incorporate the approved revisions. Implementation considerations are recorded separately from required behavior.

### 3.1 General Functionality (CS-001–012)

| ID | Requirement |
|---|---|
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

### 3.2 Choice Management (CS-013–024)

| ID | Requirement |
|---|---|
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

**Decisions:** Only a name is required at creation. Derive the name from the user's description. Store constraints in the existing context field. Defer deadline functionality. Claude handles naming and ambiguity conversationally; the backend requires a valid target and enforces status transitions. No automatic cleanup.

### 3.3 Option Management (CS-025–036)

| ID | Requirement |
|---|---|
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

**Decisions:** Require only an option description. No arbitrary maximum number of options. Keep AI suggestions in conversation until accepted. Address potential duplicates conversationally. Create the default option and choice in one transaction. The do-nothing option is evaluable and selectable. Exclude dropped options from ordinary comparisons unless requested. Encourage reevaluation when an option changes; no automated invalidation.

### 3.4 Outcome and Evaluation Management (CS-037–048)

| ID | Requirement |
|---|---|
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

**Decisions:** Store overall evaluations at the option level using existing `outcomes`, `pros`, and `cons` fields. Claude may discuss individual outcomes conversationally without storing separate outcome-level evaluations. No mandatory evaluation fields, numerical scores, weighted rankings, probabilities, dependency tracking or automated invalidation. Evaluations must reflect user-expressed values.

### 3.5 Valuable Information Management (CS-049–057)

| ID | Requirement |
|---|---|
| CS-049 | The system shall assist the user in identifying information that could improve their understanding or evaluation of a choice. |
| CS-050 | The system shall allow the user to record information they consider valuable to a choice. |
| CS-051 | The system shall obtain user confirmation before recording valuable information suggested by Claude. |
| CS-052 | The system shall allow the user to retrieve previously recorded valuable information associated with a choice. |
| CS-053 | The system shall allow the user to add, modify, or remove valuable information associated with an active choice. |
| CS-054 | The system shall assist the user in determining how newly acquired information may affect their choice, options, outcomes, and evaluations. |
| CS-055 | The system shall obtain user approval before modifying existing choice information based on conclusions drawn by Claude from newly acquired information. |
| CS-056 | The system shall acknowledge uncertainty or limitations when it cannot reliably provide requested information. |
| CS-057 | The system shall allow the user to make a decision without requiring all identified valuable information to be acquired. |

**Decisions:** Reuse `helpful_info` and `context`. Distinguish information needed from information acquired through descriptive text; incorporate relevant approved acquired information into context. Reuse general choice updates. Depend on user-provided information and existing Claude capabilities, not a dedicated research subsystem. Do not automatically revise evaluations.

### 3.6 Decision Management (CS-058–072)

| ID | Requirement |
|---|---|
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

**Decisions:** Exactly one chosen option per decided or implemented choice; combined actions may be represented as one option. No separate mandatory decision-reasoning field. Use existing evaluations and context. Use `implemented` status rather than introduce a Boolean. Record whether the user acted, not how to manage implementation. Apply related status changes atomically.

### 3.7 AI Advising and Contextual Awareness (CS-073–087)

| ID | Requirement |
|---|---|
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

**Decisions:** Use Claude system prompt instructions, MCP retrieval and backend validation; no separate learning or relevance-ranking engine. Use recorded choices in ordinary conversations when relevant. Do not treat considered options as intentions, decisions as completed actions, or potential outcomes as facts. Factual comparisons are permitted without endorsing an option. Neutrality must be tested; prompt instructions alone cannot guarantee it.

Example: Ask “How would each option affect your financial goals?” instead of “Option A is better for your financial goals” or the leading question “Don't you think Option A is better?”

### 3.8 Data Persistence and Integrity (CS-088–101)

| ID | Requirement |
|---|---|
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

**Decisions:** Save immediately after confirmed or explicitly requested operations succeed. Use existing SQLite relationships, foreign keys, transactions and status history where supported. Use cascading or transactional deletion as appropriate. Return clear results through MCP; never claim success after failure. Retrieve lightweight summaries before full detail when appropriate. No full record versioning or automatic cleanup. Identify the same default user at startup, with student persona; no formal session dependency for initial Choice Support.

### 3.9 User Interface (CS-102–111)

| ID | Requirement |
|---|---|
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

**Decisions:** Reuse MMM-Chat and begin with Claude-generated structured text or Markdown, depending on renderer support. Show only the choice being worked on, list active choices on request, and show individual details on request. Present relevant updates rather than repeat the full choice after each change. Use database records as the source of truth. No separate module, dashboard, navigation or additional UI state management unless later approved. Keep formatting neutral and simple.

## 4. Choice lifecycle and business rules

| Choice status | Meaning | Behavior |
|---|---|---|
| `active` | Choice is being developed. | Add and revise information; select a decision or drop the choice. |
| `decided` | User selected an option. | Retain all records; may reopen or confirm implementation. |
| `implemented` | User confirmed acting on the decision. | Retain historical context; do not reopen; create a new choice for reconsideration. |
| `dropped` | User discontinued pursuing a choice. | Retain until explicit deletion; may reopen. |

- Creation: choice is `active` and exactly one do-nothing option exists.
- Decision: selected option becomes `chosen`; other non-dropped options become `not_chosen`; dropped options remain `dropped`.
- Reopen a decided choice: choice becomes `active`; previously chosen and not-chosen options become `considering`; dropped options remain dropped. Preserve recorded information.
- Reopen a dropped choice: return to active; exact handling of previous option statuses must be checked against existing schema and history, particularly if dropped after a decision.
- Implementation: confirmed action changes `decided` to `implemented`; do not infer actual results.
- Deletion: explicit request and confirmation; delete dependent choice records consistently. Do-nothing cannot be independently dropped or deleted.

## 5. Implementation roadmap

| Step | Sub-feature | Responsibility |
|---|---|---|
| SF-01 | Database and Default User Setup | Inspect and reuse database utilities; identify persistent default user. |
| SF-02 | Choice Management | Create, retrieve, modify, drop, reopen and delete choices. |
| SF-03 | Option Management | Manage options and default do-nothing invariant. |
| SF-04 | Outcome and Evaluation Management | Record and update outcomes, pros and cons. |
| SF-05 | Valuable Information Management | Record and incorporate helpful information. |
| SF-06 | Decision and Status Management | Record decisions and implementation confirmation; manage transitions. |
| SF-07 | MCP Integration | Expose Choice Support operations to Claude. |
| SF-08 | AI-Guided Decision Support | Implement neutral conversational elicitation and confirmation behavior. |
| SF-09 | Contextual Awareness | Retrieve relevant historical choices for future interactions. |
| SF-10 | Visual Presentation | Present structured information through existing MMM-Chat. |

Implement and test MCP integration incrementally with backend operations where practical. SF-02 and SF-03 must cooperate so choice creation never leaves a choice without its default option. Incorporate validation, transactions, error handling and testing throughout.

### Development workflow

1. Inspect existing repository and database implementation before making changes.
2. Work on one sub-feature or small coherent increment at a time.
3. Explain the proposed approach and exact affected file paths and locations before editing.
4. Obtain user approval before modifying code; never change the schema without explicit approval.
5. Test the increment and report results before proceeding.

## 6. Deferred session and memory integration

The following is agreed direction for a separate functional area, not a prerequisite for basic Choice Support:

- One persistent default user with student persona, reused across startups.
- Wake-word detection starts a conversational session.
- End a session after five minutes of inactivity; avoid timing out while Claude is processing or responding.
- Reset active chat context when the session ends, while retaining conversation history and user knowledge.
- Retain history and user knowledge across program restarts; do not send all historical conversations to Claude on every turn.
- Implement basic Choice Support first with the minimal default-user foundation, then implement formal sessions and broader memory.

## 7. Repository verification and unresolved technical details

This specification records agreed behavior, not a verified description of the current implementation. Before coding, inspect:

- Actual SQLite schema and utilities, including user/advising-bin representation, status history, required session references and foreign-key deletion behavior.
- Existing MCP server and Claude integration, including schema conversion and tool result handling.
- Exact formatting support in MMM-Chat and whether small renderer changes are necessary.
- How to retrieve relevant historical choices without a separate retrieval engine or excessive context usage.
- Exact status transitions for previously dropped choices and consistency of related options; protect implemented history and the do-nothing invariant.
- How deletion interacts with any existing linked records, including records belonging to deferred Calendar, To-Do or diary functionality. Do not silently delete unrelated records.

The existing relational design and advisor notes informed the discussion; implementation feasibility has not been verified against the repository. Option-level evaluations, Claude-suggested alternatives with approval, and chat-only presentation are agreed project scope decisions rather than claims that the advisor explicitly mandated those particular designs.
