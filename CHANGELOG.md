# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

[0.2.2]: https://github.com/Jeronimo0228/mobile-release-mcp/releases/tag/v0.2.2
[0.2.1]: https://github.com/Jeronimo0228/mobile-release-mcp/releases/tag/v0.2.1
[0.2.0]: https://github.com/Jeronimo0228/mobile-release-mcp/releases/tag/v0.2.0
