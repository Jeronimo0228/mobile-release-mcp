# Contributing

Thanks for contributing to StorePilot!

## Development setup

```bash
git clone https://github.com/Jeronimo0228/StorePilot.git
cd StorePilot
npm install
cp .env.example .env
npm run dev
```

## Before submitting a PR

```bash
npm run typecheck
npm run build
npm test
```

## Guidelines

- Keep changes focused — one concern per PR.
- Match existing code style (TypeScript strict, minimal abstractions).
- Add tests for new utility logic (config, webhooks, retry, storage).
- Update docs when changing env vars, tools, or behavior.
- Destructive tools must require `confirm: true`.
- Never commit credentials (`.env`, `.p8`, service account JSON).

## Adding a new tool

1. Implement the provider function in `src/providers/apple/` or `src/providers/google/`.
2. Register the tool in `src/tools/apple-tools.ts` or `src/tools/google-tools.ts` using `tool.tool(...)`.
3. Document it in `docs/TOOLS.md` with the correct category.
4. Tool categories are inferred from naming; override with `{ categories: [...] }` if needed.

## Reporting issues

Include:

- Node.js version
- Transport mode (`stdio` or `http`)
- Toolset (`MCP_TOOLSET`)
- Redacted error output (no credentials)
