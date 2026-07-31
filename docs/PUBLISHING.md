# Publishing to npm

Maintainer checklist for releasing a new version.

## Prerequisites

- npm account with publish access
- `npm login` completed
- Clean git tree; version bumped in `package.json`
- GitHub release tag created (recommended)

## Dry run

Preview the tarball contents:

```bash
npm run prepublishOnly
npm pack --dry-run
```

Verify the package includes:

- `dist/index.js` (with shebang)
- `README.md`, `LICENSE`, `docs/`, `.env.example`

## Publish

```bash
# First publish (public, unscoped)
npm publish

# Subsequent releases
npm version patch   # or minor / major
git push && git push --tags
npm publish
```

## After publish

Users can install via:

```bash
npx -y mobile-release-mcp
npm install -g mobile-release-mcp
```

## Cursor / Claude config with npx

```json
{
  "mcpServers": {
    "mobile-release": {
      "command": "npx",
      "args": ["-y", "mobile-release-mcp"],
      "env": {
        "APPLE_KEY_ID": "...",
        "APPLE_ISSUER_ID": "...",
        "APPLE_PRIVATE_KEY_PATH": "/path/to/AuthKey.p8",
        "MCP_TOOLSET": "release"
      }
    }
  }
}
```

## Troubleshooting

| Issue | Fix |
|---|---|
| `403 Forbidden` on publish | Run `npm login`; verify package name ownership |
| Missing `dist/` in tarball | Run `npm run build` before publish |
| Wrong version published | `npm deprecate mobile-release-mcp@x.y.z "message"` |
