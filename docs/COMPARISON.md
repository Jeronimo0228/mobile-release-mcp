# StorePilot vs published MCP servers

Comparison of **StorePilot** (`storepilot-mcp`) **v1.1.0** against published alternatives.

| Factor | **StorePilot** (this) | [app-publish-mcp](https://github.com/mikusnuz/app-publish-mcp) | [google-play-developer-mcp](https://github.com/devinwang/google-play-developer-mcp) | [silviosotelo/mobile-release-mcp](https://github.com/silviosotelo/mobile-release-mcp) | [google-play-mcp](https://github.com/Jang-myoung-gyoon/google-play-mcp) |
|---|---|---|---|---|---|
| **Primary goal** | Unified release orchestration for agents | Unified store CRUD | Google API completeness | Local build + Fastlane/EAS | Google deploy only |
| **Apple + Google unified** | ✅ Both | ✅ Both | ❌ Google only | ✅ Both (+ local builds) | ❌ Google only |
| **Typed tools** | ~135 | ~91 | ~150 (Google only) | ~59 | ~15 |
| **Effective API coverage** | ✅ ~95% release value via typed + escape hatch | Partial long tail | ✅ Google long tail | Build-focused | Partial |
| **High-level orchestrator** | ✅ `execute_release_intent`, snapshot, blockers | ❌ Tool-per-call only | ❌ | ❌ (Fastlane wrappers) | ❌ |
| **Project profile + memory** | ✅ `storepilot.yaml` + `.storepilot/memory.json` | ❌ | Multi-account registry only | JSON config in repo | ❌ |
| **Dry-run by default** | ✅ Workflows preview before writes | ❌ | ❌ | Partial | ❌ |
| **Release snapshot / blockers** | ✅ Cross-platform readiness | ❌ | ❌ | Version check only | ❌ |
| **Submission preflight** | ✅ iOS readiness checklist | Partial | N/A | ❌ | ❌ |
| **Upload + release workflow** | ✅ `google_upload_and_release` | Separate steps | Separate steps | Via Fastlane | Partial |
| **Escape hatch (long tail)** | ✅ `apple_api_call`, `google_api_call` | ❌ | N/A (150 typed) | `fastlane_run` | ❌ |
| **Webhooks (EAS / GitHub)** | ✅ Built-in HTTP server | ❌ | ❌ | ❌ | ❌ |
| **Plugin SDK** | ✅ Hook contract v1.0 | ❌ | ❌ | ❌ | ❌ |
| **CLI without MCP client** | ✅ `storepilot status/snapshot/projects` | ❌ | ❌ | ❌ | ✅ `start` only |
| **Toolsets (release / readonly)** | ✅ `MCP_TOOLSET` | ❌ | ❌ | ❌ | ❌ |
| **HTTP + stdio transport** | ✅ Both | stdio | stdio | stdio / SSH | stdio |
| **Smoke / regression tests** | ✅ `npm test`, `npm run smoke` | Unknown | Unknown | Unknown | Unknown |
| **npm provenance** | ✅ Trusted publisher | ❌ | ✅ | ❌ | Unknown |
| **Play Reporting (crashes/ANR)** | Escape + planned plugin | ❌ | ✅ Full | ❌ | ❌ |
| **Local code signing / match** | Out of scope (by design) | ❌ | N/A | ✅ Fastlane match | ❌ |
| **Shorebird OTA** | Out of scope | ❌ | N/A | ✅ | ❌ |

## Verdict by agent workflow

For **“ship this app to TestFlight and Play production with guardrails”**, StorePilot wins on every row that affects **agent reliability**:

1. **One mental model** — profile, snapshot, intent, then typed or escape calls.
2. **Safer automation** — dry-run + confirm on destructive ops; blockers explained before submit.
3. **CI integration** — webhooks + smoke tests + CLI for pipelines without an IDE.
4. **No dead ends** — escape hatch covers APIs not worth 150 typed tools.

### Where competitors still lead (raw scope)

| Competitor | They lead on | StorePilot answer |
|---|---|---|
| google-play-developer-mcp | 150 Google-only tools + Play Reporting | `google_api_call` + subscriptions/deobfuscation/internal sharing in v1.0; reporting via plugin/escape |
| app-publish-mcp | Similar tool count, simpler onboarding | StorePilot adds orchestration layer they lack |
| silviosotelo | Fastlane, match, Shorebird, gym | Different product — complements StorePilot for **build**; StorePilot for **store ops** |

## Recommended stack

```
Build (EAS / Fastlane / silviosotelo MCP)  →  StorePilot MCP  →  App Store + Play
                      ↑                              ↑
               CI webhook (EAS/GitHub)         storepilot.yaml memory
```

## Install

```bash
npx -y storepilot-mcp@1.1.0
storepilot snapshot   # CLI
```

See [TOOLS.md](./TOOLS.md) and [GAP_ANALYSIS.md](./GAP_ANALYSIS.md) for coverage details.
