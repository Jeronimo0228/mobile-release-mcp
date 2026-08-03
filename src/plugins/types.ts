/**
 * StorePilot plugin contract (v1.0).
 * Plugins can register supplemental MCP tools or release hooks.
 */

export interface StorePilotPluginContext {
  projectId?: string;
  appleAppId?: string;
  googlePackageName?: string;
}

export interface StorePilotPluginHook {
  name: string;
  beforeReleaseIntent?: (
    intent: string,
    ctx: StorePilotPluginContext,
  ) => Promise<{ allow: boolean; reason?: string }>;
  afterReleaseIntent?: (
    intent: string,
    ctx: StorePilotPluginContext,
    result: unknown,
  ) => Promise<void>;
}

export interface StorePilotPlugin {
  name: string;
  version: string;
  description?: string;
  hooks?: StorePilotPluginHook;
}

const registry: StorePilotPlugin[] = [];

export function registerPlugin(plugin: StorePilotPlugin): void {
  if (registry.some((p) => p.name === plugin.name)) {
    throw new Error(`Plugin already registered: ${plugin.name}`);
  }
  registry.push(plugin);
}

export function listPlugins(): StorePilotPlugin[] {
  return [...registry];
}

export async function runBeforeReleaseIntentHooks(
  intent: string,
  ctx: StorePilotPluginContext,
): Promise<{ allow: boolean; reasons: string[] }> {
  const reasons: string[] = [];
  for (const plugin of registry) {
    const hook = plugin.hooks?.beforeReleaseIntent;
    if (!hook) continue;
    const result = await hook(intent, ctx);
    if (!result.allow) {
      reasons.push(result.reason ?? `Blocked by plugin ${plugin.name}`);
    }
  }
  return { allow: reasons.length === 0, reasons };
}
