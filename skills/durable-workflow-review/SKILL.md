---
name: durable-workflow-review
description: Review and implement lifecycle state machines, external synchronizations, reconcilers, sagas, queues, background workers, retries, idempotent commands, and crash recovery. Use whenever code starts, stops, destroys, provisions, removes, syncs, advances, retries, reconciles, or resumes durable work, including runtime lifecycle and cloud resource operations.
---

# Durable workflow review

Prevent locally correct changes from breaking when another producer, retry, reconciler, or process crash touches the same resource.

## Required context

Read before editing:

- the repo's agent instructions (`AGENTS.md`, `CLAUDE.md`, or equivalent)
- past incidents or postmortems on the resource, if the repo keeps them
- the service, repository, routes, workers, and reconcilers that mutate the resource

Search recent history and tests for the resource and its status fields. Do not limit the review to the reported method.

## Build the transition matrix

Write down:

| Dimension           | Required evidence                                                      |
| ------------------- | ---------------------------------------------------------------------- |
| Durable state       | Current status, desired intent, drain/terminal flags, progress receipt |
| Producers           | User, admin, API, worker, reconciler, scheduler, provider callback     |
| Side effects        | Provider calls, database writes, grants, registrations, counters       |
| Retry points        | Before and after every durable side effect                             |
| Crash boundaries    | Side effect succeeded but progress/receipt write did not               |
| Terminal invariants | States and intents no later producer may reverse                       |

Reject a design if two producers can claim the same transition without an explicit fence, ownership check, lease, or guarded update.

## Review rules

1. Preserve requested intent during reconciliation. Observed provider state must not silently erase an operator stop, drain, destroy, or permanent failure.
2. Make retries safe after partial success. Missing resources and already-completed side effects need explicit semantics, not blanket failure or cancellation.
3. Fence every equivalent entry point. For a human batch decision, validate and lock every selected revision and status before committing any status, audit event, or delivery intent. A missing, withdrawn, or stale member must roll back the complete selection. A guard on a user method is incomplete if admin, organization, worker, or legacy paths can still mutate the resource.
4. Validate ownership before treating an idempotent no-op as success.
5. Persist progress only after defining what happens if the process exits immediately before or after that write.
6. Keep health checks honest. Do not classify broad process errors as recoverable without proving their source and the remaining process integrity. If startup hydration depends on control-plane readiness, test the circular-failure case where an owner deadline persists an application-readiness error before the exact-instance service heartbeat arrives. Recovery authority must be instance- and epoch-fenced, and the repository must keep infrastructure errors fail-closed. Fence the older caller's later timeout write too: if an exact heartbeat already won, a stale provider probe must observe that ready state instead of demoting it.
7. Separate supervisor recovery from fleet reconciliation. If a supervised process regenerates ephemeral identity or authority material on restart, name the restart-time producer that re-establishes it. Do not compensate by waking every idle resource from a periodic fleet scan.
8. Treat external mutation responses as attempt evidence, not final state. A provider may return HTTP 2xx while declining, deferring, or only partially applying a mutation. Read the authoritative resource afterward, compare the exact requested postcondition, and delete rollback artifacts only after that comparison succeeds. Concurrent reconcilers must converge from the same postcondition even when their mutation responses differ.
9. Prove the authentication lane through the full route stack. For machine clients, identify the bearer class, any global auth-gate exception, the scoped operation permission, and the exact session or resource binding. Handler-level auth is insufficient if an earlier middleware rejects the credential.
10. Distinguish durable session identity from operation identity before adding uniqueness. A persistent thread, run container, or workspace may legitimately own multiple sequential commands. Enforce idempotency on the operation key, and test two independent operations in the same session.
11. Keep durable recovery reachable from every client preflight. If a normal read or connect step rejects a transitional state that the idempotent recovery command owns, return a stable machine-readable classification and prove the client can resume only that exact operation key. Never make crash recovery depend on first leaving the state that only recovery can complete.
12. Represent a live ambiguous external effect as a typed, nonsecret retry receipt instead of throwing a generic server error. The retry boundary is the later of the ambiguity deadline and the current owner's lease expiry. Missing ownership or timing proof stays fail-closed, and a takeover compare-and-swap loser returns a typed conflict rather than retrying provider work.
13. Revalidate durable `applied` receipts against the exact live resource whenever later local software can mutate or erase the effect. A matching database generation and instance epoch are insufficient when the guest can rewrite credential or authority state. Compare a nonsecret live generation proof, reclaim only the same exact authority on mismatch, and keep the final transition fenced.
14. Checkpoint expensive derived artifacts before starting the next failure domain. For capture and analysis pipelines, persist the source-selection snapshot, transcript, analysis, and primary user-visible result as separate resumable stages. Indexing, secondary copies, and notifications run downstream and must not erase or downgrade an already-complete upstream artifact. Gate user-visible success on a terminal durable status, never merely on the presence of a response payload.
15. Rehydrate admission and consent from durable server authority before mounting a protected client surface. If an operator intent must survive admission, navigation, or a component remount, carry that intent explicitly through the transition and prove the post-admission producer runs. A session-local boolean is neither authorization nor a durable command receipt.
16. Persist safety-window evidence that must survive retry. A process-local clock can help avoid repeated probes, but it cannot be the only source for a destructive-operation delay, ambiguity window, or durability floor. Store a row-backed first-observed timestamp or retry receipt, re-seed the in-process check from it, and invalidate it with later durable proof of life or an ownership change.
17. Keep the retry command reachable from the failure state that stores its proof. If a destructive-operation floor records evidence on a transitional row, the authorized retry must be allowed to re-enter that row through the canonical fenced service path. Do not require a manual SQL status reset before the operation that is responsible for deciding whether recovery is safe.
18. When a resource looks busy during repair, inspect pending credential or key rotations as well as replacement operations. A rotation row in a pending-recycle state owns a provider effect until its ambiguity window expires. After the window expires, resume that exact operation before starting a new confirmed recycle. Never stack a destructive repair over an ambiguous effect.
19. A resumed operator-confirmed destructive recreate must preserve its durable recreate mode. A `force` flag that only bypasses normal lifecycle guards is not enough to authorize discarding the resource's filesystem. Prove both sides: a confirmed recreate resumes in its destructive mode, while an ordinary recycle still defaults to the in-place mode.
20. Treat provider API documentation and deployed capability as separate evidence. When a deployed provider explicitly classifies an otherwise valid operation as unsupported, fall back only to an equivalent sequence of already-supported, bounded operations. Do not catch authorization, ownership, timeout, or server failures. Preserve the same authoritative postcondition read.
21. Model capacity preflights against the transition's real write sequence. Count reclaimable space only when the workflow owns the exact path and deterministically removes it before the first write. Never count caches or user data merely because they could be deleted. Keep the guard before mutation, and report physical, owned-reclaimable, and effective capacity separately.
22. Treat a suspended or idle state as normal for explicit owner-bound requests. Keep the allowed runtime statuses in one lifecycle-owned definition, require durable running intent, and preserve exact organization, user, runtime, instance, and epoch fences. Never wake a runtime whose owner intent is stopped or destroyed.
23. Enforce execution ownership at durable turn admission, not only in HTTP guards. In some frameworks, guards run before multipart interceptors, so a body-based guard can miss a conversation id. Test JSON and multipart continuations through the real controller. A replicated transcript does not authorize the receiving product to execute its conversation.
24. Preserve UTC instants when raw SQL writes a timestamp-without-time-zone deadline or intent. Raw language-level date parameters can bypass the ORM's UTC encoder. Use ISO UTC text with the appropriate SQL type. Prove the persisted instant and replay stability in the real database under a non-UTC process time zone. Do not mask deadline failures by switching CI to UTC.

## External synchronization gate

For provider imports and migration syncs, add these dimensions to the transition matrix before calling a domain complete:

- **Run authority:** keep provider credentials, the product's own sync-session authority, feature enablement, and organization binding distinct. Persist rotated refresh credentials before entering the next failure domain, and prove long-running work cannot outlive its own authorization.
- **Source snapshot:** enumerate every required partition, including archived, completed, deleted, personal, cross-team, and paginated records. Deduplicate stable source ids, reject conflicting revisions, and treat an advertised total that was not collected as an incomplete run rather than success.
- **Durable stage receipt:** an in-memory preview, item count, or HTTP response is not a staged or published result. Persist a replay-stable operation and source-revision identity, and the artifact or receipt needed for approval, retry, and audit, before advancing the domain.
- **Dependency receipt:** build crosswalks and dependent domains only from the current run's durable, published predecessor receipt. Never read stale mappings or independently refetch a supposedly shared snapshot to bridge a missing handoff.
- **Lifecycle fidelity:** use the provider's stable entity identity, retain aliases separately, and carry archive, deletion, unassignment, and tombstone state through reconciliation. A skipped or missing partition must be a typed blocker, not a successful zero count.
- **Request independence:** if work must survive disconnects or proxy timeouts, acknowledge it with a durable run id and a pollable status. Preview and execution entry points must share the same lifetime, authorization, and receipt contract.

## Tests

For grouped documents, test the root lifecycle separately from child-page lifecycle. Catalogs must exclude structural children consistently across API services. Moving a root to trash must retain membership and prior child trash state, so restore cannot resurrect independently trashed pages.

Add deterministic tests for the applicable cases:

- normal transition
- duplicate request or replay with a stable key
- retry after the external side effect succeeded
- competing command against draining or terminal intent
- next reconciler pass after the command completes
- unchanged supervisor restart or cold boot when process identity is ephemeral
- alternate admin, organization, or legacy entry point
- missing resource versus ownership change
- provider HTTP success with an unchanged authoritative resource
- ambiguous transport failure where the authoritative resource already reached the desired state
- live ambiguous effect with asymmetric ambiguity and owner-lease expiries
- missing ambiguity or ownership proof, and two-owner takeover compare-and-swap loss
- failure in a downstream copy or index after the primary derived artifact is durable
- protected-surface remount with valid server consent and a pending post-admission command
- process restart or a second replica handling the retry for any timed destructive-operation safety floor, plus contradiction by later durable proof of life
- authorized retry from the exact transitional failure row that holds the floor evidence, with the unforced path still refusing
- an expired pending-recycle rotation resumes to completion or terminal failure, while the same row with a future ambiguity expiry blocks a fresh provider effect
- capacity boundaries immediately below and above the effective floor, including an existing workflow-owned artifact that is reclaimed before the first write and user data that is not counted
- provider credential rotation followed by a later domain failure and run retry
- incomplete pagination, missing archive or deletion partitions, and duplicate stable ids
- process exit after preview computation but before its durable stage receipt
- dependent-domain start before the current predecessor publication receipt exists
- HTTP client disconnect while the durable sync continues to a pollable terminal result

Place new composition and boundary tests where the repo keeps its cross-module tests. Assert durable database state and externally visible outcome, not only internal calls.

## Evidence and reporting

Before completion, report:

- the transition matrix and invariants reviewed
- all producers and entry points inspected
- crash and retry boundaries covered
- targeted tests and their output
- any interleaving or provider behavior still unverified

Why this review exists: past fixes in this class each looked correct locally and then failed across source context, a reconciler or competing command, or a crash or retry boundary. External syncs failed repeatedly on credential lanes and rotation, source partition completeness, replay identity, durable preview and publication receipts, dependency handoff, request lifetime, and source lifecycle fidelity.
