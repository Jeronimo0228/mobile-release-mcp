# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.1] - 2026-08-03

### Fixed

- **CLI:** remove duplicate shebang in `storepilot` binary (tsup banner + source shebang broke Node 24)

## [1.0.0] - 2026-08-03

### Added

- **`execute_release_intent`** — unified orchestrator (`rollout_production`, `promote_to_production`, `submit_for_review`, `configure_rollout`)
- **`list_projects`** — multi-project registry (`STOREPILOT_PROJECTS_DIR`, `~/.config/storepilot/projects`)
- **Plugin SDK** — `src/plugins/types.ts` hook contract for release gates
- **CLI** — `storepilot status`, `storepilot snapshot`, `storepilot projects` (`dist/cli.js`)
- **Google:** `google_upload_and_release`, `google_upload_deobfuscation_file`, `google_list/get_subscriptions`, internal app sharing uploads
- **Apple:** `apple_set_beta_group_public_link`
- **`docs/COMPARISON.md`** — competitive positioning vs published MCP servers

## [0.4.0] - 2026-08-03

### Added

- **Apple screenshots:** `apple_list_screenshot_sets`, `apple_list_screenshots`, `apple_upload_screenshot`, `apple_upload_screenshots` (reservation + binary upload flow)
- **Export compliance & content rights:** `apple_get/set_content_rights`, `apple_get/set_export_compliance`
- **Submission preflight:** `apple_get_submission_readiness` — build, encryption, content rights, screenshots checklist

## [0.3.1] - 2026-08-03

### Added

- `docs/GAP_ANALYSIS.md` — prioritized top-20 API gaps and coverage roadmap
- `apple_get_version_review_info`, `apple_list_version_review_info` — review/rejection context
- `google_upload_bundle`, `google_upload_apk` — binary upload to Play edits
- `apple_api_call`, `google_api_call` — escape hatches for long-tail API coverage (writes require `confirm: true`)

## [0.3.0] - 2026-08-03

### Added

- **StorePilot project profile** — `storepilot.yaml` auto-discovery + `.storepilot/memory.json` release history
- **Orchestrator tools** (release toolset):
  - `load_project` — load profile and memory
  - `get_release_snapshot` — production vs candidate, blockers, next actions
  - `explain_release_blockers` — human-readable release guidance
  - `create_tester_group` — TestFlight + Play track testers (dry-run by default)
  - `promote_release` — track promotion / submit for review (dry-run by default)
  - `configure_rollout` — staged rollout % or iOS phased release (dry-run by default)
- MCP resource `project://memory`
- `storepilot.example.yaml` template
- Unit tests for profile parsing and release heuristics

### Changed

- Destructive workflow tools allow `dryRun: true` without `confirm`; execution requires `dryRun: false` + `confirm: true`
- `apple_get_price_tiers` requires `appId` (uses app price points API)

## [0.2.3] - 2026-08-03

### Added

- `npm run smoke` — live read-only smoke test script for Apple/Google providers (requires credentials)
- `withOptionalEdit` helper for Google Play read tools when `editId` is omitted
- Regression tests for invalid Apple sort params and Google optional edits

### Changed

- `apple_get_price_tiers` now uses `/v1/apps/{appId}/appPricePoints` (Apple removed global `/v1/appPriceTiers`); requires `appId`, optional `territory` and `limit`
- `google_list_in_app_products` migrated to `monetization.onetimeproducts.list` (legacy API deprecated)

### Fixed

- Apple: remove invalid `sort` params from `listAppStoreVersions`, `listDevices`, `listCertificates`, and `listInAppPurchases`
- Apple: drop invalid `referenceName` field from in-app purchase list requests
- Google: read tools (`list_tracks`, `list_listings`, `get_app_details`, `list_bundles`, `get_testers`, `get_country_availability`, `list_images`) auto-create temporary edits when `editId` is omitted
- Google: `list_reviews` returns structured `{ success, data }` response

## [0.2.2] - 2026-07-31

### Changed

- MCP server version read from `package.json` at build time (no hardcoded string)
- npm tarball excludes GitHub-only assets (`docs/assets/banner.jpg`)
- Deduplicated security docs; `CONTRIBUTING.md` uses the real clone URL

### Fixed

- Transitive dependency audit: pin `gaxios@7.3.0` via npm overrides (0 prod advisories)

## [0.2.1] - 2026-07-31

### Security

- Require `MCP_HTTP_API_KEY` (≥32 chars) for HTTP transport; Bearer auth on `/mcp`
- Disable open CORS by default; optional `MCP_ALLOWED_ORIGINS`
- Webhook parsers reject requests when secrets are missing (no unsigned fallback)
- Limit webhook body size to 256 KB
- Validate `WEBHOOK_STORAGE_PATH` against path traversal
- Hide internal storage path from `/health`
- Pin GitHub Actions to commit SHAs; minimal CI permissions
- Add Dependabot, release workflow with npm provenance (trusted publisher)
- Add `SECURITY.md` and `docs/SECURITY.md`

## [0.2.0] - 2026-07-31

### Added

- MCP HTTP transport (`MCP_TRANSPORT=http`) with `/mcp` endpoint
- Persistent webhook storage (`WEBHOOK_STORAGE_PATH`)
- Configurable toolsets (`MCP_TOOLSET=all|release|readonly`)
- Apple API pagination and retry with exponential backoff
- Google Play `withEdit()` to avoid orphaned edit sessions
- Destructive tool confirmation (`confirm: true`)
- Structured JSON error responses for all tools
- Startup config validation with actionable messages
- Webhook secret enforcement in production (`WEBHOOK_REQUIRE_SECRETS`)
- EAS project mapping via `EAS_PROJECT_MAPPINGS`
- Unit tests and GitHub Actions CI
- Documentation: `docs/CREDENTIALS.md`, `docs/TOOLS.md`, `docs/TOOLSETS.md`, `docs/ARCHITECTURE.md`
- npm package metadata, `bin` entry, and publish scripts

### Changed

- `get_release_status` uses temporary Google edits that are auto-deleted
- Shared tools return `{ success, data }` response shape

[0.4.0]: https://github.com/Jeronimo0228/mobile-release-mcp/releases/tag/v0.4.0
[0.3.1]: https://github.com/Jeronimo0228/mobile-release-mcp/releases/tag/v0.3.1
[0.3.0]: https://github.com/Jeronimo0228/mobile-release-mcp/releases/tag/v0.3.0
[0.2.3]: https://github.com/Jeronimo0228/mobile-release-mcp/releases/tag/v0.2.3
[0.2.2]: https://github.com/Jeronimo0228/mobile-release-mcp/releases/tag/v0.2.2
[0.2.1]: https://github.com/Jeronimo0228/mobile-release-mcp/releases/tag/v0.2.1
[0.2.0]: https://github.com/Jeronimo0228/mobile-release-mcp/releases/tag/v0.2.0
