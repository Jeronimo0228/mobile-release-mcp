# Security guide

Hardening practices for deploying and maintaining `mobile-release-mcp`.

## Supply chain protections

| Control | Implementation |
|---|---|
| Locked dependencies | `package-lock.json` + `npm ci` in CI |
| Reproducible installs | No `npm install` in CI |
| Action pinning | GitHub Actions pinned to commit SHAs |
| Minimal CI permissions | `contents: read` only |
| npm provenance | Releases via trusted publisher + `--provenance` |
| Dependabot | Weekly npm + GitHub Actions updates |
| Package allowlist | `files` field in `package.json` (no source in tarball) |
| Pre-publish checks | `prepublishOnly`: typecheck + test + build |

### Publishing model

**Never store npm tokens in the repository.** With trusted publisher configured:

1. Tag a release: `git tag v0.2.1 && git push origin v0.2.1`
2. GitHub Actions `release.yml` publishes with OIDC + provenance
3. npm verifies the package came from your GitHub repo

Consumers can verify provenance on npmjs.com.

### Installing safely

```bash
# Prefer locked version
npm install mobile-release-mcp@0.2.1

# Or run without global install
npx --yes mobile-release-mcp@0.2.1
```

Optional hardening for consumers:

```bash
npm config set ignore-scripts true
```

This package has no install scripts; the setting blocks malicious dependency postinstall hooks.

---

## Runtime security

### HTTP mode (required settings)

```env
MCP_TRANSPORT=http
MCP_HTTP_API_KEY=<random-string-at-least-32-chars>
EAS_WEBHOOK_SECRET=<strong-secret>
GITHUB_WEBHOOK_SECRET=<strong-secret>
WEBHOOK_REQUIRE_SECRETS=true
```

Clients must send:

```http
Authorization: Bearer <MCP_HTTP_API_KEY>
```

Generate a key:

```bash
openssl rand -base64 48
```

### CORS

By default, **CORS is disabled** (no `Access-Control-Allow-Origin`). Browser-based clients cannot call the API unless you explicitly allow origins:

```env
MCP_ALLOWED_ORIGINS=https://app.example.com,https://admin.example.com
```

### Webhooks

- HMAC signature verification (EAS SHA1, GitHub SHA256)
- Secrets are **mandatory** — unsigned payloads are rejected
- Body size limited to 256 KB
- `/health` does not expose internal file paths

### Storage path

`WEBHOOK_STORAGE_PATH` must be a **relative** path within the project directory. Path traversal (`..`) and absolute paths are rejected.

### Agent safety

- Destructive tools require `confirm: true`
- Use `MCP_TOOLSET=release` or `readonly` to limit blast radius
- Store credentials in env vars / secret manager, never in chat or repo

---

## Known dependency advisories

Run regularly:

```bash
npm audit --omit=dev
```

Some advisories may come from transitive Google API / dev tooling dependencies. Dependabot PRs and periodic updates address these. CI runs audit with `continue-on-error: true` until all transitive issues are resolved upstream.

---

## Incident response

1. Rotate compromised credentials (Apple key, Google SA, webhook secrets, MCP HTTP key)
2. Revoke npm tokens if any were exposed
3. Publish patched version
4. Report via [SECURITY.md](../SECURITY.md)
