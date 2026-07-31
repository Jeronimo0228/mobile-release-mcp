# Credentials guide

This MCP server talks **directly** to App Store Connect and Google Play Developer APIs. EAS webhooks do **not** replace store credentials.

## What you must configure

| Credential | Required for | Provided by EAS webhook? |
|---|---|---|
| App Store Connect API key (`.p8`) | iOS tools | No |
| Google Play service account JSON | Android tools | No |
| `EAS_WEBHOOK_SECRET` | Verify EAS webhook signatures | You create it when registering the webhook |
| `GITHUB_WEBHOOK_SECRET` | Verify GitHub webhook signatures | You create it in GitHub webhook settings |

## Mental model

```
EAS/GitHub webhook  →  notification only ("build finished")
Store credentials →  permission to manage App Store / Play Console
```

Both are useful together:

1. EAS finishes a build and sends a webhook.
2. Your agent calls `list_pending_webhooks`.
3. The agent uses **pre-configured** Apple/Google credentials to release via MCP tools.

## Apple App Store Connect

1. App Store Connect → Users and Access → Integrations → App Store Connect API.
2. Generate an API key with appropriate role (Admin or App Manager for releases).
3. Download the `.p8` file once.

```env
APPLE_KEY_ID=ABC1234DEF
APPLE_ISSUER_ID=00000000-0000-0000-0000-000000000000
APPLE_PRIVATE_KEY_PATH=/secure/path/AuthKey_ABC1234DEF.p8
```

Alternative for containers:

```env
APPLE_PRIVATE_KEY_BASE64=<base64-encoded .p8 contents>
```

## Google Play Console

1. Google Cloud Console → IAM → Service Accounts → Create.
2. Create a JSON key for the service account.
3. Play Console → Settings → API access → Link project → Grant access to the app.

```env
GOOGLE_SERVICE_ACCOUNT_KEY_PATH=/secure/path/service-account.json
```

Alternative:

```env
GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
```

## EAS project mapping

EAS webhooks include an Expo `projectName`, not your App Store Connect app ID or Android package name.

Configure mappings so webhook events include `mappedTargets`:

```env
EAS_PROJECT_MAPPINGS=[
  {
    "projectName": "my-expo-app",
    "iosAppId": "1234567890",
    "androidPackageName": "com.example.myapp"
  }
]
```

After mapping, `list_pending_webhooks` returns:

```json
{
  "mappedTargets": {
    "appleAppId": "1234567890",
    "googlePackageName": "com.example.myapp"
  }
}
```

## Security recommendations

- Never commit `.env`, `.p8`, or service account JSON files.
- Use secret managers in production (1Password, Doppler, cloud provider secrets).
- Keep `WEBHOOK_REQUIRE_SECRETS=true` in production.
- Use `MCP_TOOLSET=release` or `readonly` to limit agent capabilities.
- Destructive tools require `confirm: true` on every call.

## Minimum configs by use case

### iOS release agent (local stdio)

```env
APPLE_KEY_ID=...
APPLE_ISSUER_ID=...
APPLE_PRIVATE_KEY_PATH=...
MCP_TRANSPORT=stdio
MCP_TOOLSET=release
```

### Remote HTTP server with webhooks

```env
MCP_TRANSPORT=http
MCP_PORT=3000
APPLE_KEY_ID=...
GOOGLE_SERVICE_ACCOUNT_KEY_PATH=...
EAS_WEBHOOK_SECRET=...
GITHUB_WEBHOOK_SECRET=...
WEBHOOK_STORAGE_PATH=.data/webhooks.json
```

### Read-only status dashboard agent

```env
MCP_TOOLSET=readonly
```
