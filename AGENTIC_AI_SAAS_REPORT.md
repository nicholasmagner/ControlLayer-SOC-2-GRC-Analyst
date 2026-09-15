# 🚀 Agentic AI SaaS Report

## 1. Executive Summary

ControlLayer is a compliance assessment and enforcement platform for CMMC and SOC 2, built around one core design decision: compliance status is decided by deterministic rule logic, and an LLM (Claude, via the Anthropic API) is layered on top strictly as an assistive explainer — it can describe why a control failed and suggest remediation, but it has no path to change a compliance status, execute a remediation, or touch any system on its own.

The platform ingests telemetry (currently a real AWS connector for EC2/IAM, plus an Azure stub), evaluates it against policy and control definitions, and surfaces a live dashboard, per-control status, open findings, and supporting evidence. A chat-based AI Assistant sits alongside that data so a compliance analyst can ask "why is this failing" in plain language and get an answer grounded only in what's actually in the database.

**Target users:** compliance analysts and security engineers running SOC 2 / CMMC programs who currently do evidence collection and control mapping by hand.

**Key differentiator:** the AI layer cannot mark anything compliant, cannot execute a remediation, and is architecturally incapable of invoking a tool — no `tools` array is ever passed to the model. Whatever the AI says is bounded by what a human reads and decides to act on.

**Current state:** a working local application with a real Postgres database, a real Claude integration, and real (if narrow) AWS API calls. Pre-production: authentication and wiring the two deterministic engines (assessment and enforcement) into the live request path are the next milestones, covered in Sections 14–15.

---

## 2. Problem Statement

Compliance teams running SOC 2 or CMMC programs spend a disproportionate amount of time on two things: mapping raw technical evidence (IAM configuration, access logs, MFA status) to specific control language, and re-explaining *why* a control is or isn't met every time an auditor or executive asks. Both are manual, repetitive, and disconnected from the systems actually generating the evidence.

Generic "AI compliance" tools tend to solve this by asking an LLM to read logs and decide compliance status directly — which means the compliance posture of the organization is only as reliable as the model's willingness not to hallucinate on a given day. That's not a foundation an auditor can sign off on.

**Risk of not solving this differently:** either compliance stays a slow, manual process that doesn't scale with a growing cloud footprint, or teams reach for AI tools that make compliance determinations non-deterministically, which introduces its own audit risk.

**Industry context:** CMMC 2.0 enforcement and SOC 2 Type II expectations are pushing toward continuous, evidence-backed compliance rather than point-in-time audits, at the same time as organizations are under pressure to adopt LLM tooling everywhere. ControlLayer's premise is that those two pressures don't have to conflict if the LLM is kept out of the decision path.

---

## 3. Solution Overview

ControlLayer is a single Next.js application (App Router, React 19) backed by PostgreSQL via Prisma. End to end, it:

1. Pulls telemetry from connected systems (AWS EC2/IAM today, live).
2. Evaluates that telemetry against control and policy definitions to produce a status per control (`Met` / `Partially Met` / `Not Met`) and, where relevant, a `Finding`.
3. Displays that state in a dashboard, a per-control list, and a findings list, each backed by real database records.
4. Lets a user ask an AI Assistant to explain a control's current status or chat about the overall posture, grounded in the same database records — never in the model's own assumptions.
5. For one specific finding type (IAM users missing MFA), offers a one-click auto-remediation that calls the real AWS IAM API to attach a corrective policy, and a verification step that checks the policy actually landed.

**Unique feature, functionally:** the AI Assistant's system prompt and request shape enforce the "assistive only" claim structurally rather than just by instruction — no tool definitions are ever sent to the model, so there's nothing for it to call even if a prompt injection tried to get it to. This is documented in detail in Section 8.

**Competitive angle:** most "AI GRC" products lead with the AI. ControlLayer leads with a deterministic policy/assessment engine and treats the AI as a bounded convenience layer on top of it — closer to how a security team would actually want to trust automation.

---

## 4. System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Browser (React 19)                        │
│   Dashboard / Controls / Findings / Evidence / AI / Connectors   │
└───────────────────────────────┬───────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                Next.js 16 App Router (server + API)               │
│                                                                     │
│   src/app/page.tsx ──── getDashboardData() ──── src/lib/data.ts   │
│                                                                     │
│   API routes:                                                      │
│    /api/ai/chat            → AIEngine.chat()                       │
│    /api/ai/explain         → AIEngine.generateExplanation()        │
│    /api/connectors/aws/sync→ real AWS EC2/IAM read + evidence      │
│    /api/scans/aws          → real AWS IAM MFA / EC2 public-IP scan │
│    /api/findings/remediate → real AWS PutUserPolicyCommand         │
│    /api/findings/verify    → real AWS ListUserPoliciesCommand      │
└───────┬─────────────────────────────────┬─────────────────────────┘
        │                                  │
        ▼                                  ▼
┌───────────────────┐          ┌─────────────────────────────┐
│  PostgreSQL (Prisma)│          │   Anthropic Claude API        │
│  Control            │          │   (via @anthropic-ai/sdk,     │
│  Policy              │          │   no tools ever attached)     │
│  EventLog            │          └─────────────────────────────┘
│  EvidenceArtifact
│  Finding
│  AssessmentScore
└───────────────────┘
        ▲
        │ (built, tested, not yet called by anything above)
┌───────┴─────────────────────────────────────────────────────┐
│  EnforcementEngine  (src/engine/enforcement)                  │
│  AssessmentEngine + CMMC/SOC2 control evaluators               │
│  (src/engine/assessment, src/frameworks)                       │
└─────────────────────────────────────────────────────────────┘
```

**Frontend:** a single client component (`MainAppClient`) renders six tabs against one server-fetched `initialData` snapshot (`getDashboardData()` in `src/lib/data.ts`), which pulls the latest 20–50 rows of each Prisma model.

**Backend / API layer:** standard Next.js route handlers, one file per endpoint, no shared middleware. Every route is a plain `POST`/`GET` async function — there is currently no session or auth check anywhere in the stack (see Section 8).

**Data layer:** PostgreSQL, six Prisma models — `Control`, `Policy`, `EventLog`, `EvidenceArtifact`, `Finding`, `AssessmentScore`. No foreign key links `EventLog` or `Finding` back to a specific `Control` — the AI explain endpoint scopes context by a text match on control name, not a relational join. This is a known limitation, not an oversight (Section 14).

**Two engines exist in the codebase but are not wired into any live request path today:**
- `EnforcementEngine.evaluateAction` (`src/engine/enforcement/engine.ts`) — a deterministic policy matcher that evaluates an action against `Policy` records (AND/OR rule groups, explicit Allow/Deny, fail-closed default) and writes an immutable-style entry to `EventLog`. Fully unit tested. Zero callers.
- `AssessmentEngine.runAssessment` + the `CMMC_CONTROLS`/`SOC2_CONTROLS` rule tables (`src/engine/assessment`, `src/frameworks`) — deterministic functions that read recent `EventLog`/`EvidenceArtifact` rows and compute a `Met`/`Partially Met`/`Not Met` status per control. Zero callers.

In the running application today, the dashboard's compliance data comes from `prisma/seed.ts` — a fixed seed script that writes sample `Control`, `Policy`, `EventLog`, `EvidenceArtifact`, and `AssessmentScore` rows directly. The AWS sync/scan routes are the one path that writes *new*, live data (real `EvidenceArtifact`, `Finding`, and `AssessmentScore` rows from real AWS API responses).

**AI layer:** `AIEngine` (`src/engine/ai/engine.ts`) is the only code in the repository allowed to call an LLM. It wraps `@anthropic-ai/sdk`, defaults to `claude-sonnet-5` (overridable via `ANTHROPIC_MODEL`), and exposes two methods — `chat()` and `generateExplanation()` — both described in Section 5.

---

## 5. Agentic AI Design

ControlLayer intentionally does **not** implement a multi-agent system, autonomous planning, or persistent agent memory. It implements one constrained, single-turn assistant, and the design choice not to go further is deliberate given what the product does (compliance).

- **Agent type:** a single assistive conversational agent (`AIEngine`), invoked per-request. There is no agent-to-agent orchestration, no planner/executor split, and no background/autonomous execution loop.
- **Goals and task execution:** two narrow tasks — explain why a specific control is in its current state (`generateExplanation`), or answer a free-form question about the current compliance snapshot (`chat`). Both are single LLM calls; neither triggers any further action.
- **Planning and reasoning:** none beyond what the model does internally to compose its answer. There's no tool-use loop for it to plan across, because there are no tools.
- **Memory:** no long-term memory. Each `chat()` call rebuilds context fresh from the database (recent `AssessmentScore`, `Control`, `EventLog`, `Finding` rows, capped at 20 items each) and replays only the conversation history the client sends for that request — nothing persists between sessions, and nothing is written back to a vector store or memory system.
- **Tool usage: none.** This is the load-bearing security property of the whole design. The Anthropic SDK call never includes a `tools` parameter, in either method. The model cannot invoke a function, cannot query the database itself, and cannot take any action — it can only return text. This is enforced structurally, not by prompt instruction alone.
- **Autonomy level:** minimal by design. The model produces a suggestion or explanation; a human reads it and decides what to do. Even the one automated remediation flow in the product (`/api/findings/remediate`) is not agent-initiated — it's a plain REST call a user triggers, and the AI Assistant has no path to call it.
- **Human-in-the-loop:** every AI output is advisory text rendered in a chat bubble or an "Explain" panel. Nothing the model says writes to the database, changes a `Finding` status, or reaches AWS.
- **Guardrails on the context itself:** before any data reaches a prompt, `sanitizeContext()` recursively strips any object key matching a secret-like pattern (`secret|password|token|apikey|credential|private_?key`) and caps array length to 20 items. The system prompt additionally instructs the model to treat everything inside `<context>`/`<logs>`/`<evidence>` tags as data, not instructions — a direct mitigation for prompt injection via a poisoned log or finding field (Section 8, ASI03).
- **Graceful degradation:** if `ANTHROPIC_API_KEY` is unset, the request fails, or the model returns no text, `AIEngine` returns a fixed, deterministic fallback string rather than throwing — the rest of the application (Dashboard, Controls, Findings) is unaffected by the AI layer being unavailable.

---

## 6. Core Features

**Compliance Dashboard**
What it does: shows an aggregate compliance score, counts of controls Met/Partially Met/Failed, active findings, and a recent event log feed.
Why it matters: gives a single at-a-glance view instead of digging through raw AWS console output or spreadsheets.
How it works: server-rendered from `getDashboardData()`, a set of bounded Prisma queries against the latest rows of each model.

**Controls view**
What it does: lists every control (CMMC and SOC 2) with its current status, justification, and an "Explain with AI" action.
Why it matters: makes the human-readable *reason* for a status visible next to the status itself, instead of a bare pass/fail.
How it works: joins `Control` with its most recent `AssessmentScore` client-side; "Explain with AI" calls `/api/ai/explain`, which does a best-effort text match to pull related `EventLog`/`EvidenceArtifact` rows and hands them to `AIEngine.generateExplanation()`.

**Findings view**
What it does: lists open findings with severity, affected resource, and remediation guidance.
Why it matters: this is where real AWS scan output lands — an actual "IAM user missing MFA" or "EC2 instance has a public IP" finding, not a simulated one.
How it works: `/api/scans/aws` calls `ListUsersCommand` + `ListMFADevicesCommand` + `DescribeInstancesCommand` against real AWS, and writes a `Finding` row for anything it flags, deduplicated by title+resource.

**AI Assistant**
What it does: a chat interface for asking about compliance posture in plain language.
Why it matters: replaces "let me go pull the logs and get back to you" with an immediate, grounded answer.
How it works: `POST /api/ai/chat` fetches a bounded snapshot of the database server-side (the client never supplies its own context, only conversation text), sanitizes it, and calls Claude with a fixed system prompt. See Section 5.

**Auto-Remediate / Verify (AWS MFA finding only)**
What it does: attaches a real IAM inline policy denying most actions unless MFA is present, then a separate verification step confirms the policy is actually attached before marking the finding resolved.
Why it matters: closes the loop from "we found a gap" to "we fixed it and checked," which most GRC tooling stops short of.
How it works: `/api/findings/remediate` calls `PutUserPolicyCommand`; `/api/findings/verify` calls `ListUserPoliciesCommand` and reverts the finding to `Open` if the policy isn't actually present. Route-level authentication for this endpoint is tracked in Section 15.

**Connectors**
What it does: shows connection status for AWS (live) and Azure (currently a stub that returns simulated data — `src/connectors/azure/index.ts`).
Why it matters: signals the intended integration surface even where a connector isn't fully built out yet.
How it works: AWS credentials are resolved via the default AWS SDK provider chain (environment, shared credentials file, or IAM role) — nothing is hardcoded in the app.

---

## 7. User Workflow (Step-by-Step)

1. **Open the dashboard.** The app loads current compliance posture from the database — no login required today (see Section 8).
2. **Review the compliance score and recent event log** on the Dashboard tab.
3. **Drill into a specific control** on the Controls tab to see its status and justification.
4. **Click "Explain with AI"** on any control to get a plain-language breakdown of why it's in that state, grounded in the actual logs/evidence tied to it.
5. **Check the Findings tab** for anything AWS scanning has flagged (e.g., an IAM user without MFA).
6. **Trigger a fresh AWS scan** by calling `/api/scans/aws` (via the Connectors tab or directly) to pull current EC2/IAM state and generate new findings.
7. **For a supported finding, click Remediate**, which attaches a real corrective IAM policy, then **Verify** to confirm it actually took effect.
8. **Ask the AI Assistant a free-form question** — e.g., "which controls are currently failing and why" — for a synthesized answer across the whole current dataset.
9. **Review and act.** Every AI output and every remediation action is meant to be read by a person before anything is treated as final — the product does not mark itself compliant or make changes without a click from a user.

---

## 8. Security & Risk Management (CRITICAL)

This section is written to be honest about what's mitigated versus what's an open gap, because a security review that only lists mitigations isn't useful to the people who'll actually rely on it.

### ASI01: Agent Goal Hijack
**Threat:** an attacker manipulates the AI into recommending or appearing to authorize a harmful action.
**Impact:** a user could be misled by a manipulated explanation into taking a bad remediation step manually.
**Mitigation:** the model has no tools and cannot execute anything itself, so a hijacked "goal" has no direct path to system impact — the worst case is misleading text, not an unauthorized action. The system prompt also instructs the model to base answers strictly on supplied data and say so when data is insufficient, which reduces (but doesn't eliminate) confidently-wrong output.

### ASI02: Tool Misuse and Exploitation
**Threat:** the AI uses an integration (AWS, the database) to do something harmful.
**Impact:** would be severe if it could happen — but it can't.
**Mitigation:** no tools are ever passed to the Anthropic API call, in either `chat()` or `generateExplanation()`. There is no code path by which the model's output can trigger an AWS call, a database write, or any other side effect. This is verifiable directly in `src/engine/ai/engine.ts`.

### ASI03: Prompt Injection
**Threat:** a malicious string in a log, finding description, or evidence field (data an attacker could plausibly influence, e.g., an IAM username or resource tag) is crafted to look like an instruction to the model.
**Impact:** could otherwise cause the model to ignore its constraints or emit misleading guidance.
**Mitigation:** all database-sourced content is wrapped in `<context>`/`<logs>`/`<evidence>` tags with an explicit system-prompt instruction to treat anything inside them as data, never as instructions, even if it reads like one. Combined with the lack of tools (ASI02), the practical impact of a successful injection is limited to bad text output, which a human still has to act on.

### ASI04: Sensitive Data Exposure
**Threat:** secrets or credentials embedded in log/evidence metadata get sent to the LLM provider.
**Impact:** third-party exposure of sensitive data.
**Mitigation:** `sanitizeContext()` recursively redacts any object key matching a secret-like pattern before it's serialized into a prompt, and caps array length to bound how much data is ever sent. **Gap:** the sanitizer redacts by key name, not by content — it would not catch a secret value stored under an unexpected key name. It also doesn't scrub non-secret-but-sensitive infrastructure detail (ARNs, account IDs, usernames), which does flow into prompts sent to Anthropic today.

### ASI05: Memory Poisoning
**Threat:** feeding false data over time to bias the model's future answers.
**Impact:** would compound if the system had persistent memory.
**Mitigation:** not applicable in practice — there is no persistent memory. Every request rebuilds context fresh from the database; nothing the model has said or been told persists across requests.

### ASI06: Autonomous Decision Risks
**Threat:** the system takes a consequential action on its own initiative.
**Impact:** could disable access, corrupt compliance records, or worse.
**Mitigation:** the AI never initiates an action — every state-changing endpoint (`/api/findings/remediate`, `/api/findings/verify`, the AWS sync/scan routes) is triggered by a direct user request, not by the model.

### ASI07: Insecure Integrations
**Threat:** a downstream integration (AWS, the database, the LLM provider) is reachable or configured in a way that expands the attack surface beyond what's intended.
**Impact:** `/api/findings/remediate`, `/api/findings/verify`, `/api/connectors/aws/sync`, and `/api/scans/aws` all make real AWS API calls (including `PutUserPolicyCommand`, which mutates live IAM state) and do not yet have route-level authentication. The AWS SDK client resolves credentials via the default provider chain, so the practical exposure scales with how reachable the deployment is — a purely local instance has a very different risk profile than one exposed on a shared network.
**Mitigation status:** the operational safeguard today is deployment scope (localhost-only during development); the architectural fix — route-level auth — is the top item in Section 15's roadmap and should land before this is exposed beyond a developer's own machine.

### ASI08: Identity & Access Failures
**Threat:** lack of authentication/authorization lets anyone perform privileged actions.
**Impact:** as above — every API route, including the AWS-mutating ones and the AI routes (cost-abuse risk on `/api/ai/chat`), is open to any caller who can reach the server.
**Mitigation status:** no auth middleware or per-route session check exists yet — this is the root cause behind ASI07 and the single highest-priority roadmap item in Section 15.

### ASI09: Output Manipulation
**Threat:** the model's output is trusted and rendered without validation, allowing injected formatting or content to mislead the reader.
**Impact:** low, given the UI renders responses as plain text rather than executing or interpreting them.
**Mitigation:** the system prompt instructs plain-prose output (no Markdown, no injected tags) so the chat UI — which has no Markdown renderer — displays exactly what the model said without any formatting-based trickery landing differently than intended.

### ASI10: Over-Reliance on AI
**Threat:** users start treating AI explanations as authoritative compliance determinations rather than assistive text.
**Impact:** could undermine the entire "deterministic-first" premise of the product if the UI or team culture drifts toward trusting the chat output over the actual `AssessmentScore` records.
**Mitigation:** the AI Assistant's own greeting message states it "operates in an assistive capacity only and does not have execution authority," and the system prompt requires it to say when data is insufficient rather than guess. The deeper mitigation is organizational: the deterministic engines (Section 4) are what's meant to gate actual compliance status, precisely so this risk doesn't have anywhere to attach.

---

## 9. Compliance & Governance

- **Audit trail:** every AWS scan, sync, remediation, and verification writes an `EventLog` row with actor, action, decision, and reason. This is a real, queryable audit log — but it's a standard Postgres table, not append-only or tamper-evident storage. Anyone with database access could alter or delete a row.
- **Access control:** there is currently none (see ASI08 above). RBAC, SSO, or any form of authentication is not implemented.
- **Data protection:** database credentials and the Anthropic API key are read from environment variables and never committed to source control (`.env` is gitignored; `.env.example` documents the required variables without values).
- **Framework alignment:** the `Control` model and seeded data are structured around CMMC Level 1 practices (`AC.L1-3.1.1`, `AC.L1-3.1.2`) and SOC 2 Trust Services Criteria (`CC6.1`), giving the schema a natural home for expanding into NIST 800-53 or ISO 27001 mappings without a structural change.

---

## 10. Scalability & Performance

- **Current deployment shape:** a single Next.js process against a single PostgreSQL instance (a local Docker container in development). No horizontal scaling, caching layer, or CDN is configured.
- **Query patterns:** all dashboard and API queries are bounded (`take: 20`–`50`), which keeps individual request cost predictable, but there's no pagination UI yet for datasets larger than those caps.
- **AI cost/latency:** each chat or explain call is a single, non-streamed Claude request with `max_tokens: 1024` and thinking explicitly disabled for models that default to adaptive reasoning — keeping both cost and response time bounded and predictable rather than variable.
- **Resilience:** the AI layer degrades gracefully (Section 5) if the LLM provider is unavailable. The rest of the app has no equivalent fallback for a database outage — a Postgres connection failure would surface as a hard error on the dashboard.

---

## 11. Integrations

- **Anthropic Claude API** (`@anthropic-ai/sdk`) — the sole LLM integration, used only by `AIEngine`.
- **AWS SDK v3** (`@aws-sdk/client-ec2`, `@aws-sdk/client-iam`) — real, live integration for `DescribeInstancesCommand`, `ListUsersCommand`, `ListMFADevicesCommand`, `PutUserPolicyCommand`, `ListUserPoliciesCommand`. Credentials resolved via the standard AWS provider chain, never hardcoded.
- **Azure** — present as a UI connector entry and a stub module (`src/connectors/azure/index.ts`) that returns simulated data; not a live integration today.
- **PostgreSQL via Prisma** — the system of record for every model in the app.

---

## 12. Deployment Overview

- **Local development:** `docker-compose.yml` provisions a Postgres 15 container on port 5433; `npm run dev` starts the Next.js app with Turbopack.
- **No CI/CD is configured** in this repository today — no GitHub Actions workflow, no automated test run on push, no deployment pipeline.
- **No production deployment target is configured** — no Vercel project, no Dockerfile for the app itself (only for the database), no environment-specific configuration beyond `.env`.
- **Testing:** `npm test` runs the Vitest suite (21 tests across the enforcement engine, the AI engine's context sanitizer and offline-fallback behavior, and the chat route's input validation).

---

## 13. Observability & Monitoring

- **Application logs:** Prisma query logging is enabled (`log: ['query']`), so every database query is visible in the dev server's stdout.
- **Audit-style logging:** the `EventLog` table doubles as an application-level activity log, covering every AWS scan/sync/remediate/verify action and its outcome.
- **No external monitoring, metrics, or alerting is wired up** — no Datadog, no Sentry, no uptime checks. Errors are caught per-route and returned as a generic 500 with a logged server-side message; there's no aggregation or alerting on top of that today.

---

## 14. Limitations & Risks

Known limitations, in priority order:

1. **No authentication on any route yet.** Highest priority — it's the prerequisite for safely exposing the AWS remediation capability (item 2) beyond local development.
2. **`/api/findings/remediate` mutates real AWS IAM state.** Should stay behind route-level auth (Section 15) before this runs anywhere beyond a developer's own machine.
3. **`EnforcementEngine` and `AssessmentEngine` are built and unit tested but not yet wired into the live request path.** The current dashboard reflects `prisma/seed.ts` and AWS sync/scan output; connecting these engines so control status reflects real-time policy evaluation is the next architectural milestone (Section 15).
4. **`EventLog`/`Finding` have no foreign key to `Control`.** The AI's "Explain" feature scopes by a best-effort text match on control name, not a guaranteed relational join.
5. **The audit log is a normal database table**, not append-only or cryptographically tamper-evident — useful for demonstration, not yet sufficient for a real audit trail claim.
6. **Test coverage is meaningful but not exhaustive** — 21 tests cover the highest-risk logic (policy matching, context sanitization, input validation) but not the full API surface.
7. **The Azure connector is simulated**, not a real integration.

---

## 15. Future Enhancements

In the order they'd most improve the product's real-world readiness:

1. **Add authentication and authorization** to every API route — this unblocks safely exposing the app beyond localhost at all.
2. **Wire `EnforcementEngine` and `AssessmentEngine` into the live request path** so control status reflects real-time evaluation instead of seeded/AWS-sync-only data.
3. **Add a real foreign key from `Finding`/`EventLog` to `Control`** so AI-grounded explanations are based on a guaranteed relationship, not a text match.
4. **Move the audit log toward tamper-evident storage** (e.g., hash-chained records or an external append-only sink) if this is ever positioned as a real audit artifact.
5. **Build out the Azure connector** to parity with the AWS one.
6. **Add rate limiting to the AI routes** to bound both cost and abuse potential once authentication exists.

---

## 16. How to Use This SaaS (Quick Start Guide)

1. **Start the database:** `docker compose up -d` (Postgres on `localhost:5433`).
2. **Install dependencies:** `npm install`.
3. **Configure environment:** copy `.env.example` to `.env`, set `DATABASE_URL`, and set `ANTHROPIC_API_KEY` to enable live AI responses (the app runs fine without it — the AI Assistant just returns a fixed offline message instead).
4. **Set up the schema and demo data:** `npx prisma db push` then `npx prisma db seed`.
5. **Run the app:** `npm run dev`, then open `http://localhost:3000`.
6. **Run the test suite:** `npm test`.
7. **Try a real AWS scan:** ensure AWS credentials are available via the standard SDK provider chain, then call `/api/scans/aws` to pull live EC2/IAM findings — understanding that this, and remediation, are unauthenticated endpoints (Section 8).

---

## 17. Conclusion

ControlLayer demonstrates a specific, defensible position on how to build compliance tooling with an LLM in it: keep the compliance determination deterministic and testable, and let the AI do what LLMs are actually good at — explaining and summarizing — without ever giving it a path to act. That architectural choice is implemented, not just claimed: no tools are passed to the model anywhere in the codebase, and that's verifiable by reading `src/engine/ai/engine.ts` directly.

The deterministic engines and the AI layer are both real and well-tested. The clear next milestone is connecting them end to end and adding route-level authentication — the two changes that move this from a working demo with real integrations to something deployable beyond a developer's own machine.
