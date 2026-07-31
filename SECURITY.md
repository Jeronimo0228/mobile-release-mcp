# Security Policy

## Supported versions

| Version | Supported |
|---|---|
| 0.2.x | yes |
| < 0.2.0 | no |

## Reporting a vulnerability

**Do not open public GitHub issues for security vulnerabilities.**

Email: jrestrepoa@eafit.edu.co with:

- Description of the issue
- Steps to reproduce
- Impact assessment
- Suggested fix (optional)

We aim to respond within 72 hours.

## Supply chain

- npm publishes use **GitHub Actions trusted publisher** + **provenance** (no long-lived npm tokens in CI)
- GitHub Actions are **pinned to commit SHAs**
- Dependencies are locked via `package-lock.json`; CI runs `npm ci`
- Dependabot opens weekly update PRs for npm and GitHub Actions

## Secure deployment checklist

- [ ] Use `MCP_TOOLSET=release` or `readonly` in production agents
- [ ] Set `MCP_HTTP_API_KEY` (≥32 chars) when using `MCP_TRANSPORT=http`
- [ ] Set `EAS_WEBHOOK_SECRET` and `GITHUB_WEBHOOK_SECRET`
- [ ] Keep `WEBHOOK_REQUIRE_SECRETS=true`
- [ ] Never commit `.p8`, service account JSON, or `.env`
- [ ] Rotate exposed tokens immediately

See [docs/SECURITY.md](docs/SECURITY.md) for full guidance.
