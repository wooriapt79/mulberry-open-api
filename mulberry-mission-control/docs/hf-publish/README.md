# HF Publication Set

Files prepared per Issue #47 for potential publication to
https://huggingface.co/mulberry-research-lab. Final publish action
(uploading to the HF space) is left to Trang Manager / re.eul — this
PR only prepares and security-reviews the file.

## safety-classify.js

A standalone, dependency-free extraction of Mulberry Mission Control's
Search safety classification module (`utils/safety-classify.js`).

**Design pattern demonstrated**: 4-tier intelligent refusal (GREEN/YELLOW/RED/CRITICAL)
combined with Privacy-by-Design audit logging — only a SHA-256 hash of the
original request is ever stored, never the request text itself.

**Difference from the internal version**: the internal file imports a
Mongoose model (`../models/SafetyLog`) and checks `mongoose.connection`
directly. This published version takes an optional `persist` callback
instead, so it has zero dependencies and zero coupling to Mulberry's
internal infrastructure — safe to read, run, and adapt standalone.

**Security review** (2026-07-01, CTO Koda):
- No hardcoded secrets, API keys, or connection strings
- No references to internal infra (MongoDB URI, JWT_SECRET, Railway env vars)
- No internal file imports — fully self-contained

## Held back (not in this publication)

- `agent_router.py` — pending CSA Kbin review (per Issue #47)
- `AgentMemory.js` (Memory Layer) — scheduled separately (per Issue #47)
