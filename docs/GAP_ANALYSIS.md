# API gap analysis

Prioritized gaps vs. full App Store Connect + Google Play Developer API coverage.
Goal: **~95% of real-world release value** without 300+ MCP tools.

**Legend**

| Priority | Meaning |
|---|---|
| P0 | Blocks common release flows — implement as typed tool next |
| P1 | High value for agents — typed tool or orchestrator workflow |
| P2 | Admin/monetization — typed tool in admin toolset |
| P3 | Long tail — use `apple_api_call` / `google_api_call` |

**Implementation**

| Strategy | When |
|---|---|
| **Typed tool** | Frequent, needs validation, part of golden path |
| **Workflow** | Multi-step (upload + release + commit) |
| **Escape hatch** | Rare, new API fields, long tail |

---

## Current coverage (v1.0.0)

| Area | Apple | Google | Notes |
|---|---|---|---|
| Release & tracks | ~85% | ~80% | Orchestrator + upload-and-release workflow |
| TestFlight / testers | ~75% | ~55% | Public link + groups |
| Metadata & listings | ~55% | ~55% | Screenshots + compliance |
| Reviews | ~45% | ~60% | List/reply + review info |
| IAP / subscriptions | ~40% | ~45% | Subscriptions list/get (Google v2) |
| Signing / devices | ~50% | N/A | Apple certs/profiles/devices |
| Analytics / vitals | ~25% | ~0% | ASC analytics; Play Reporting via escape/plugin |
| Escape hatch | ✅ | ✅ | Long-tail without tool explosion |
| Orchestrator | ✅ | ✅ | Snapshot, intents, plugins, multi-project |

---

## Top 20 gaps (by impact)

| # | P | Platform | Gap | Strategy | Status |
|---|---|---|---|---|---|
| 1 | P0 | Google | Upload AAB/APK to edit | `google_upload_bundle` typed | v0.3.1 |
| 2 | P0 | Apple | App Review submission + rejection detail | `apple_get_version_review_info` | v0.3.1 |
| 3 | P0 | Both | Generic API for long tail | `apple_api_call`, `google_api_call` | v0.3.1 |
| 4 | P0 | Apple | Screenshot / preview upload | Typed + binary helper | **v0.4.0** |
| 5 | P0 | Google | Commit edit after upload workflow | `google_upload_and_release` | **v1.0.0** |
| 6 | P1 | Apple | Export compliance + content rights on version | Typed patch fields | **v0.4.0** |
| 7 | P1 | Google | Play Developer Reporting (crashes, ANR) | Plugin or escape | Backlog (escape) |
| 8 | P1 | Google | Subscriptions catalog (`monetization.subscriptions`) | Typed list/get | **v1.0.0** |
| 9 | P1 | Apple | Subscription pricing / localizations | Typed | Backlog |
| 10 | P1 | Google | Internal app sharing | Typed upload | **v1.0.0** |
| 11 | P1 | Apple | TestFlight public link + beta review detail | Typed | **v1.0.0** |
| 12 | P1 | Google | Deobfuscation (ProGuard) file upload | Typed | **v1.0.0** |
| 13 | P1 | Both | Multi-account / multi-app registry | `list_projects` | **v1.0.0** |
| 14 | P2 | Apple | Custom Product Pages | Escape or plugin | Backlog |
| 15 | P2 | Apple | In-App Events | Escape or plugin | Backlog |
| 16 | P2 | Google | Orders / refunds API | Escape + docs | Backlog |
| 17 | P2 | Apple | Game Center / App Clips | Plugin | Backlog |
| 18 | P2 | Google | Expansion files / TV assets | Typed | Backlog |
| 19 | P2 | Apple | Finance / sales reports | Separate toolset + role warning | Backlog |
| 20 | P2 | Both | Video preview upload | Workflow + storage | Backlog |

---

## Escape hatch safety (v0.3.1)

### `apple_api_call`

- Path must match `^/v[12]/[\w./-]+$`
- `GET` allowed without confirm
- `POST`, `PATCH`, `DELETE` require `confirm: true`
- No binary upload in escape hatch (use typed tools)

### `google_api_call`

- Resource path like `edits.tracks.list` (dot notation under `androidpublisher`)
- `get` / `list` allowed without confirm
- Mutating methods require `confirm: true`
- Params passed as JSON (no file streams — use typed upload tools)

---

## Target tool counts

| Milestone | Typed tools | Escape | Effective coverage |
|---|---|---|---|
| v0.3.0 | 107 | 0 | ~60% release value |
| v0.3.1 | 111 | 2 | ~65% + long tail |
| v0.4.0 | ~120 | 2 | ~80% release value |
| v1.0.0 | ~135 | 2 + plugins | ~95% release value |

---

## What we explicitly do NOT target

- Full parity with 150-tool Google-only servers (reporting every Publisher method)
- Every ASC finance endpoint
- Play Billing real-time purchase APIs (different product surface)
- Wrapper for every deprecated endpoint Apple/Google remove each year

Use escape hatches + semver + smoke tests to stay current without tool explosion.
