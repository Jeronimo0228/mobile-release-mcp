# Security guide

Hardening practices for deploying and maintaining `mobile-release-mcp`.

For vulnerability reporting, supported versions, and supply-chain policy, see [SECURITY.md](../SECURITY.md) in the repo root.

### Installing safely

```bash
npx --yes mobile-release-mcp@latest
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

## Dependency advisories

Run regularly:

```bash
npm audit --omit=dev
```

Production deps pin `gaxios@7.3.0` via `package.json` overrides to avoid a transitive `rimraf`/`glob` advisory in older `gaxios` releases. Dependabot handles routine updates.

---

## Incident response

1. Rotate compromised credentials (Apple key, Google SA, webhook secrets, MCP HTTP key)
2. Revoke npm tokens if any were exposed
3. Publish patched version
4. Report via [SECURITY.md](../SECURITY.md)
